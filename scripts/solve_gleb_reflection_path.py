#!/usr/bin/env python3
"""Estimate the late Gleb orb camera and reflection path from every source frame.

Observed image measurements and inferred 3D quantities are kept separate. The
3D solve assumes a circular gauge under weak perspective and a mirror-like
spherical reflector, so its angles are useful reconstruction targets rather
than unique ground truth.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import label, sobel
from scipy.optimize import least_squares


FPS = 30.0
DEFAULT_START = 23.0
DEFAULT_END = 30.0
DEFAULT_CROP = (420, 380, 400, 400)
INITIAL_CIRCLE = np.array([220.0, 150.0, 195.0], np.float64)
ATLAS_GRID = (5, 4)
ATLAS_TILE = 400


@dataclass
class EllipseFit:
    cx: float
    cy: float
    rx: float
    ry: float
    theta: float
    residual_px: float
    point_count: int
    confidence: float

    def array(self) -> np.ndarray:
        return np.array([self.cx, self.cy, self.rx, self.ry, self.theta], np.float64)


def srgb_to_linear(rgb: np.ndarray) -> np.ndarray:
    value = rgb.astype(np.float32) / 255.0
    return np.where(value <= 0.04045, value / 12.92, ((value + 0.055) / 1.055) ** 2.4)


def rec709(linear_rgb: np.ndarray) -> np.ndarray:
    return np.einsum("hwc,c->hw", linear_rgb, np.array([0.2126, 0.7152, 0.0722], np.float32))


def ellipse_coordinates(shape: tuple[int, int], q: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    yy, xx = np.mgrid[: shape[0], : shape[1]]
    cosine = math.cos(float(q[4]))
    sine = math.sin(float(q[4]))
    dx = xx - q[0]
    dy = yy - q[1]
    local_x = cosine * dx + sine * dy
    local_y = -sine * dx + cosine * dy
    u = local_x / q[2]
    v = local_y / q[3]
    return u, v, np.hypot(u, v), (np.degrees(np.arctan2(v, u)) + 360.0) % 360.0


def ellipse_polyline(q: np.ndarray, samples: int = 720) -> list[tuple[float, float]]:
    angle = np.linspace(0.0, 2.0 * np.pi, samples + 1)
    local_x = q[2] * np.cos(angle)
    local_y = q[3] * np.sin(angle)
    cosine = math.cos(float(q[4]))
    sine = math.sin(float(q[4]))
    x = q[0] + cosine * local_x - sine * local_y
    y = q[1] + sine * local_x + cosine * local_y
    return list(zip(x.tolist(), y.tolist()))


def sample_edge_points(luminance: np.ndarray, q: np.ndarray, initial: bool = False) -> tuple[np.ndarray, np.ndarray]:
    gradient = np.hypot(sobel(luminance, axis=0), sobel(luminance, axis=1))
    yy, xx = np.mgrid[: luminance.shape[0], : luminance.shape[1]]
    if initial:
        cx, cy, radius = q
        distance = np.hypot(xx - cx, yy - cy)
        angle = (np.degrees(np.arctan2(yy - cy, xx - cx)) + 360.0) % 360.0
        band = (distance > radius - 28.0) & (distance < radius + 24.0)
        radial_coordinate = (distance - (radius - 28.0)) / 52.0
    else:
        _, _, rho, angle = ellipse_coordinates(luminance.shape, q)
        band = (rho > 0.84) & (rho < 1.15)
        radial_coordinate = (rho - 0.84) / 0.31
    # The lower-left label is excluded; right rim, top shell, and lower dots
    # provide enough independent evidence to constrain the conic.
    visible = ((angle < 145.0) | (angle > 230.0)) & (yy < luminance.shape[0] - 10)
    search = band & visible
    threshold = float(np.percentile(gradient[search], 80.0))
    candidates = search & (gradient >= threshold)
    points: list[tuple[float, float]] = []
    weights: list[float] = []
    for degree in range(0, 360, 2):
        if 145 <= degree <= 230:
            continue
        angular_delta = np.abs(((angle - degree + 180.0) % 360.0) - 180.0)
        ys, xs = np.where(candidates & (angular_delta < 1.15))
        if ys.size == 0:
            continue
        score = gradient[ys, xs] * (1.15 - 0.55 * np.abs(radial_coordinate[ys, xs] - 0.55))
        selected = int(np.argmax(score))
        y = int(ys[selected])
        x = int(xs[selected])
        points.append((float(x), float(y)))
        weights.append(float(gradient[y, x]))
    point_array = np.asarray(points, np.float64)
    weight_array = np.asarray(weights, np.float64)
    median_weight = max(float(np.median(weight_array)), 1e-8)
    return point_array, np.clip(weight_array / median_weight, 0.25, 4.0)


def ellipse_residual(q: np.ndarray, points: np.ndarray, weights: np.ndarray) -> np.ndarray:
    cosine = math.cos(float(q[4]))
    sine = math.sin(float(q[4]))
    dx = points[:, 0] - q[0]
    dy = points[:, 1] - q[1]
    local_x = cosine * dx + sine * dy
    local_y = -sine * dx + cosine * dy
    radial = np.sqrt((local_x / q[2]) ** 2 + (local_y / q[3]) ** 2)
    return np.sqrt(weights) * (radial - 1.0) * math.sqrt(float(q[2] * q[3]))


def initial_ellipse(luminance: np.ndarray) -> EllipseFit:
    points, weights = sample_edge_points(luminance, INITIAL_CIRCLE, initial=True)
    circle = INITIAL_CIRCLE.copy()

    def circle_residual(q: np.ndarray) -> np.ndarray:
        return np.sqrt(weights) * (np.hypot(points[:, 0] - q[0], points[:, 1] - q[1]) - q[2])

    circle_fit = least_squares(
        circle_residual,
        circle,
        loss="soft_l1",
        f_scale=1.5,
        bounds=([150.0, 80.0, 160.0], [285.0, 235.0, 235.0]),
        max_nfev=120,
    ).x
    start = np.array([circle_fit[0], circle_fit[1], circle_fit[2], circle_fit[2], 0.0], np.float64)
    fit = least_squares(
        lambda q: ellipse_residual(q, points, weights),
        start,
        loss="soft_l1",
        f_scale=1.5,
        bounds=([145.0, 50.0, 145.0, 155.0, -0.8], [300.0, 250.0, 245.0, 260.0, 0.8]),
        max_nfev=180,
    ).x
    residual = np.abs(ellipse_residual(fit, points, weights))
    median = float(np.median(residual))
    confidence = float(np.clip((len(points) / 120.0) * math.exp(-median / 5.0), 0.0, 1.0))
    return EllipseFit(*fit.tolist(), median, len(points), confidence)


def track_ellipse(luminance: np.ndarray, previous: EllipseFit) -> EllipseFit:
    start = previous.array()
    points, weights = sample_edge_points(luminance, start)

    def residual(q: np.ndarray) -> np.ndarray:
        data = ellipse_residual(q, points, weights)
        prior = np.array(
            [
                (q[0] - start[0]) / 2.5,
                (q[1] - start[1]) / 2.5,
                (q[2] - start[2]) / 3.0,
                (q[3] - start[3]) / 3.0,
                (q[4] - start[4]) / 0.025,
            ],
            np.float64,
        )
        return np.concatenate((data, prior))

    lower = start + np.array([-5.0, -5.0, -7.0, -7.0, -0.06])
    upper = start + np.array([5.0, 5.0, 7.0, 7.0, 0.06])
    fit = least_squares(
        residual,
        start,
        loss="soft_l1",
        f_scale=1.4,
        bounds=(lower, upper),
        max_nfev=90,
    ).x
    data_residual = np.abs(ellipse_residual(fit, points, weights))
    median = float(np.median(data_residual))
    confidence = float(np.clip((len(points) / 120.0) * math.exp(-median / 5.0), 0.0, 1.0))
    return EllipseFit(*fit.tolist(), median, len(points), confidence)


def connected_highlight(score: np.ndarray, candidate: np.ndarray) -> dict[str, object]:
    masked = np.where(candidate, score, 0.0)
    peak_y, peak_x = np.unravel_index(int(np.argmax(masked)), masked.shape)
    peak = float(masked[peak_y, peak_x])
    if peak <= 1e-12:
        return {"peak_xy": [None, None], "centroid_xy": [None, None], "softness_radius_px": None, "confidence": 0.0}
    yy, xx = np.mgrid[: score.shape[0], : score.shape[1]]
    local = (xx - peak_x) ** 2 + (yy - peak_y) ** 2 <= 24.0**2
    binary = candidate & local & (score >= peak * 0.20)
    labelled, _ = label(binary, structure=np.ones((3, 3), np.uint8))
    component_id = int(labelled[peak_y, peak_x])
    component = labelled == component_id if component_id else binary
    weights = np.where(component, score, 0.0)
    total = float(weights.sum())
    cx = float((xx * weights).sum() / total)
    cy = float((yy * weights).sum() / total)
    dx = xx - cx
    dy = yy - cy
    variance = float(((dx * dx + dy * dy) * weights).sum() / total)
    area = int(component.sum())
    background = float(np.median(score[candidate])) if np.any(candidate) else 0.0
    contrast = peak / max(background, 1e-7)
    confidence = float(np.clip((math.log10(max(contrast, 1.0)) / 3.0) * min(area / 18.0, 1.0), 0.0, 1.0))
    return {
        "peak_xy": [float(peak_x), float(peak_y)],
        "centroid_xy": [cx, cy],
        "softness_radius_px": math.sqrt(max(variance, 0.0)),
        "component_area_px": area,
        "peak_score": peak,
        "contrast_ratio": contrast,
        "confidence": confidence,
    }


def detect_cyan_highlight(linear_rgb: np.ndarray, luminance: np.ndarray, q: np.ndarray) -> dict[str, object]:
    u, v, rho, _ = ellipse_coordinates(luminance.shape, q)
    candidate = (rho < 0.92) & (v < -0.08) & (np.abs(u) < 0.72)
    cyan = np.maximum(np.minimum(linear_rgb[..., 1], linear_rgb[..., 2]) - linear_rgb[..., 0], 0.0)
    score = cyan * luminance
    result = connected_highlight(score, candidate)
    px, py = result["peak_xy"]
    if px is not None:
        result["peak_linear_rgb"] = linear_rgb[int(py), int(px)].astype(float).tolist()
        result["peak_luminance"] = float(luminance[int(py), int(px)])
        result["total_cyan_energy"] = float(score[candidate].sum())
    return result


def detect_silver_rim(linear_rgb: np.ndarray, luminance: np.ndarray, q: np.ndarray) -> dict[str, object]:
    u, v, rho, _ = ellipse_coordinates(luminance.shape, q)
    saturation = linear_rgb.max(axis=2) - linear_rgb.min(axis=2)
    candidate = (rho > 0.76) & (rho < 1.08) & (u > 0.48) & (v < 0.58)
    neutral = luminance * np.clip(1.0 - saturation * 2.0, 0.0, 1.0)
    threshold = float(np.percentile(neutral[candidate], 93.0))
    weights = np.where(candidate & (neutral >= threshold), neutral - threshold, 0.0)
    total = float(weights.sum())
    yy, xx = np.mgrid[: luminance.shape[0], : luminance.shape[1]]
    if total <= 1e-12:
        return {"centroid_xy": [None, None], "orientation_deg": None, "strength": 0.0, "confidence": 0.0}
    cx = float((xx * weights).sum() / total)
    cy = float((yy * weights).sum() / total)
    coords = np.column_stack((xx[weights > 0] - cx, yy[weights > 0] - cy))
    covariance = np.cov(coords.T, aweights=weights[weights > 0]) if len(coords) > 2 else np.eye(2)
    values, vectors = np.linalg.eigh(covariance)
    axis = vectors[:, int(np.argmax(values))]
    orientation = math.degrees(math.atan2(float(axis[1]), float(axis[0])))
    return {
        "centroid_xy": [cx, cy],
        "orientation_deg": orientation,
        "strength": total,
        "confidence": float(np.clip((weights > 0).sum() / 180.0, 0.0, 1.0)),
    }


def infer_reflection(q: np.ndarray, point_xy: list[float]) -> dict[str, object]:
    x, y = point_xy
    cosine = math.cos(float(q[4]))
    sine = math.sin(float(q[4]))
    dx = x - q[0]
    dy = y - q[1]
    u = (cosine * dx + sine * dy) / q[2]
    v_image = (-sine * dx + cosine * dy) / q[3]
    radial_squared = u * u + v_image * v_image
    if radial_squared >= 0.995:
        scale = math.sqrt(0.995 / radial_squared)
        u *= scale
        v_image *= scale
        radial_squared = u * u + v_image * v_image
    normal = np.array([u, -v_image, math.sqrt(max(1.0 - radial_squared, 0.0))], np.float64)
    view = np.array([0.0, 0.0, 1.0], np.float64)
    light = 2.0 * float(np.dot(normal, view)) * normal - view
    light /= np.linalg.norm(light)
    azimuth = math.degrees(math.atan2(float(light[0]), float(light[2])))
    elevation = math.degrees(math.atan2(float(light[1]), math.hypot(float(light[0]), float(light[2]))))
    return {
        "ellipse_uv": [u, v_image],
        "surface_normal_camera": normal.astype(float).tolist(),
        "light_direction_camera": light.astype(float).tolist(),
        "light_azimuth_deg": azimuth,
        "light_elevation_deg": elevation,
    }


def broad_atlas_highlight(rgb: np.ndarray) -> dict[str, object]:
    linear_rgb = srgb_to_linear(rgb)
    luminance = rec709(linear_rgb)
    yy, xx = np.mgrid[:400, :400]
    radius = np.hypot(xx - 200.0, yy - 200.0)
    ui = np.zeros((400, 400), bool)
    ui[132:270, 164:244] = True
    ui[178:226, 44:94] = True
    region = (radius <= 194.0) & (yy < 158) & (xx > 110) & ~ui
    threshold = float(np.percentile(luminance[region], 82.0))
    weights = np.where(region, np.maximum(luminance - threshold, 0.0), 0.0)
    total = float(weights.sum())
    cx = float((xx * weights).sum() / total)
    cy = float((yy * weights).sum() / total)
    q = np.array([200.0, 200.0, 194.0, 194.0, 0.0], np.float64)
    inferred = infer_reflection(q, [cx, cy])
    return {
        "centroid_xy": [cx, cy],
        "mean_upper_highlight_luminance": float(luminance[region].mean()),
        **inferred,
    }


def extract_frames(video: Path, directory: Path, start: float, end: float) -> list[Path]:
    command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        str(video),
        "-ss",
        f"{start:.6f}",
        "-t",
        f"{end - start:.6f}",
        str(directory / "frame-%04d.png"),
    ]
    subprocess.run(command, check=True)
    return sorted(directory.glob("frame-*.png"))


def draw_source_panel(rgb: np.ndarray, record: dict[str, object], label_text: str) -> Image.Image:
    image = Image.fromarray(rgb)
    draw = ImageDraw.Draw(image, "RGBA")
    font = ImageFont.load_default()
    q = np.array(record["observed"]["ellipse"]["parameters"], np.float64)
    draw.line(ellipse_polyline(q), fill=(255, 220, 0, 245), width=2)
    cx, cy = q[:2]
    hx, hy = record["observed"]["cyan_highlight"]["centroid_xy"]
    draw.line((cx, cy, hx, hy), fill=(0, 235, 255, 220), width=2)
    draw.line((hx - 7, hy, hx + 7, hy), fill=(0, 255, 255, 255), width=2)
    draw.line((hx, hy - 7, hx, hy + 7), fill=(0, 255, 255, 255), width=2)
    draw.rectangle((0, 0, 400, 42), fill=(0, 0, 0, 205))
    draw.text((7, 5), label_text, fill="white", font=font)
    inferred = record["inferred"]
    draw.text(
        (7, 20),
        f"light az={inferred['light_azimuth_deg']:.1f} el={inferred['light_elevation_deg']:.1f}  tilt={inferred['apparent_tilt_deg']:.1f}",
        fill=(0, 235, 255),
        font=font,
    )
    draw.text((7, 32), f"fit residual={record['observed']['ellipse']['residual_px']:.2f}px", fill=(255, 220, 0), font=font)
    return image


def draw_atlas_panel(rgb: np.ndarray, record: dict[str, object], label_text: str) -> Image.Image:
    image = Image.fromarray(rgb)
    draw = ImageDraw.Draw(image, "RGBA")
    font = ImageFont.load_default()
    draw.ellipse((6, 6, 394, 394), outline=(255, 220, 0, 240), width=2)
    hx, hy = record["centroid_xy"]
    draw.line((200, 200, hx, hy), fill=(255, 80, 220, 220), width=2)
    draw.line((hx - 7, hy, hx + 7, hy), fill=(255, 80, 220, 255), width=2)
    draw.line((hx, hy - 7, hx, hy + 7), fill=(255, 80, 220, 255), width=2)
    draw.rectangle((0, 0, 400, 34), fill=(0, 0, 0, 205))
    draw.text((7, 5), label_text, fill="white", font=font)
    draw.text((7, 19), f"light az={record['light_azimuth_deg']:.1f} el={record['light_elevation_deg']:.1f}", fill=(255, 80, 220), font=font)
    return image


def chart(records: list[dict[str, object]], atlas_records: list[dict[str, object]], out: Path) -> None:
    width, height = 1320, 760
    image = Image.new("RGB", (width, height), (8, 10, 12))
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default()
    left, right = 85, width - 35
    panels = [(65, 265), (305, 505), (545, 720)]
    times = np.array([r["time_seconds"] for r in records], np.float64)
    duration = max(float(times[-1] - times[0]), 1e-6)

    def x_for_time(time: float) -> float:
        return left + (time - times[0]) / duration * (right - left)

    def draw_series(values: list[float], panel: tuple[int, int], colour: tuple[int, int, int], value_range: tuple[float, float]) -> None:
        top, bottom = panel
        low, high = value_range
        points = []
        for time, value in zip(times, values):
            x = x_for_time(float(time))
            y = bottom - (float(value) - low) / max(high - low, 1e-6) * (bottom - top)
            points.append((x, y))
        draw.line(points, fill=colour, width=3)

    for top, bottom in panels:
        draw.rectangle((left, top, right, bottom), outline=(70, 78, 84), width=1)
        for division in range(1, 4):
            y = top + division * (bottom - top) / 4
            draw.line((left, y, right, y), fill=(30, 35, 39), width=1)

    center_x = [r["observed"]["ellipse"]["parameters"][0] for r in records]
    center_y = [r["observed"]["ellipse"]["parameters"][1] for r in records]
    draw_series(center_x, panels[0], (255, 210, 0), (min(center_x + center_y) - 5, max(center_x + center_y) + 5))
    draw_series(center_y, panels[0], (0, 220, 170), (min(center_x + center_y) - 5, max(center_x + center_y) + 5))
    draw.text((left, 42), "OBSERVED CAMERA REGISTRATION: ellipse centre x (yellow), y (green)", fill="white", font=font)

    azimuth = [r["inferred"]["light_azimuth_deg"] for r in records]
    elevation = [r["inferred"]["light_elevation_deg"] for r in records]
    angular_values = azimuth + elevation + [r["light_azimuth_deg"] for r in atlas_records] + [r["light_elevation_deg"] for r in atlas_records]
    angle_range = (min(angular_values) - 5, max(angular_values) + 5)
    draw_series(azimuth, panels[1], (0, 235, 255), angle_range)
    draw_series(elevation, panels[1], (80, 145, 255), angle_range)
    atlas_times = np.linspace(times[0], times[-1], len(atlas_records))
    for key, colour in (("light_azimuth_deg", (255, 70, 220)), ("light_elevation_deg", (255, 125, 75))):
        values = [r[key] for r in atlas_records]
        points = []
        for time, value in zip(atlas_times, values):
            x = x_for_time(float(time))
            y = panels[1][1] - (float(value) - angle_range[0]) / (angle_range[1] - angle_range[0]) * (panels[1][1] - panels[1][0])
            points.append((x, y))
        draw.line(points, fill=colour, width=2)
    draw.text((left, 282), "INFERRED LIGHT ANGLES: source az/el (cyan/blue), current atlas az/el (magenta/orange)", fill="white", font=font)

    intensity = [r["observed"]["cyan_highlight"].get("peak_luminance", 0.0) for r in records]
    softness = [r["observed"]["cyan_highlight"].get("softness_radius_px", 0.0) or 0.0 for r in records]
    draw_series(intensity, panels[2], (0, 240, 255), (0.0, max(intensity) * 1.05))
    softness_scaled = np.array(softness) / max(max(softness), 1e-6) * max(intensity)
    draw_series(softness_scaled.tolist(), panels[2], (170, 100, 255), (0.0, max(intensity) * 1.05))
    draw.text((left, 522), "OBSERVED CYAN KEY: peak linear luminance (cyan), normalized softness (violet)", fill="white", font=font)

    for second in range(math.ceil(times[0]), math.floor(times[-1]) + 1):
        x = x_for_time(float(second))
        draw.line((x, panels[0][0], x, panels[-1][1]), fill=(25, 29, 32), width=1)
        draw.text((x - 12, 730), f"{second}s", fill=(155, 165, 172), font=font)
    image.save(out)


def angular_distance(a: dict[str, object], b: dict[str, object]) -> float:
    va = np.array(a["light_direction_camera"], np.float64)
    vb = np.array(b["light_direction_camera"], np.float64)
    return math.degrees(math.acos(float(np.clip(np.dot(va, vb), -1.0, 1.0))))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--atlas", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--start", type=float, default=DEFAULT_START)
    parser.add_argument("--end", type=float, default=DEFAULT_END)
    parser.add_argument("--crop", default="420,380,400,400")
    args = parser.parse_args()

    video = Path(args.video)
    atlas_path = Path(args.atlas)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    crop = tuple(int(value) for value in args.crop.split(","))
    if len(crop) != 4:
        raise SystemExit("--crop must be x,y,width,height")

    x, y, width, height = crop
    frame_rgb: list[np.ndarray] = []
    source_width = source_height = 0
    with tempfile.TemporaryDirectory(prefix="gleb-reflection-") as temporary:
        frames = extract_frames(video, Path(temporary), args.start, args.end)
        if not frames:
            raise SystemExit("ffmpeg produced no frames")
        for frame_path in frames:
            full_frame = np.asarray(Image.open(frame_path).convert("RGB"))
            frame_height, frame_width = full_frame.shape[:2]
            if not source_width:
                source_width, source_height = frame_width, frame_height
                if (source_width, source_height) != (1440, 1080):
                    raise SystemExit(f"unexpected source resolution: {source_width}x{source_height}")
                if x < 0 or y < 0 or x + width > source_width or y + height > source_height:
                    raise SystemExit("--crop measurement ROI is outside the original video frame")
            elif (frame_width, frame_height) != (source_width, source_height):
                raise SystemExit("source frame dimensions changed during the analyzed interval")
            # Decode every original-resolution frame. The fixed ROI merely
            # selects orb measurements; it does not resize or resample pixels.
            frame_rgb.append(full_frame[y : y + height, x : x + width].copy())

    first_linear = srgb_to_linear(frame_rgb[0])
    ellipse = initial_ellipse(rec709(first_linear))
    records: list[dict[str, object]] = []
    for index, rgb in enumerate(frame_rgb):
        linear_rgb = srgb_to_linear(rgb)
        luminance = rec709(linear_rgb)
        if index:
            ellipse = track_ellipse(luminance, ellipse)
        q = ellipse.array()
        cyan = detect_cyan_highlight(linear_rgb, luminance, q)
        silver = detect_silver_rim(linear_rgb, luminance, q)
        inferred = infer_reflection(q, cyan["centroid_xy"])
        q_source = q.copy()
        q_source[0] += x
        q_source[1] += y
        cyan_source = [cyan["centroid_xy"][0] + x, cyan["centroid_xy"][1] + y]
        axis_ratio = min(ellipse.rx, ellipse.ry) / max(ellipse.rx, ellipse.ry)
        apparent_tilt = math.degrees(math.acos(float(np.clip(axis_ratio, 0.0, 1.0))))
        inference_confidence = float(min(0.65, ellipse.confidence * float(cyan["confidence"]) * 0.65))
        records.append(
            {
                "frame_index": index,
                "time_seconds": args.start + index / FPS,
                "observed": {
                    "ellipse": {
                        "parameters": q.astype(float).tolist(),
                        "parameters_source_xy": q_source.astype(float).tolist(),
                        "residual_px": ellipse.residual_px,
                        "point_count": ellipse.point_count,
                        "confidence": ellipse.confidence,
                    },
                    "cyan_highlight": cyan,
                    "cyan_highlight_source_xy": cyan_source,
                    "silver_environment_rim": silver,
                },
                "inferred": {
                    **inferred,
                    "apparent_tilt_deg": apparent_tilt,
                    "relative_scale": math.sqrt(ellipse.rx * ellipse.ry),
                    "confidence": inference_confidence,
                },
            }
        )

    baseline_scale = float(records[0]["inferred"]["relative_scale"])
    baseline_center = np.array(records[0]["observed"]["ellipse"]["parameters"][:2], np.float64)
    for record in records:
        center = np.array(record["observed"]["ellipse"]["parameters"][:2], np.float64)
        record["inferred"]["camera_translation_px"] = (center - baseline_center).astype(float).tolist()
        record["inferred"]["relative_scale"] = float(record["inferred"]["relative_scale"] / baseline_scale)

    atlas = np.asarray(Image.open(atlas_path).convert("RGB"))
    atlas_records: list[dict[str, object]] = []
    atlas_tiles: list[np.ndarray] = []
    for index in range(ATLAS_GRID[0] * ATLAS_GRID[1]):
        column = index % ATLAS_GRID[0]
        row = index // ATLAS_GRID[0]
        tile = atlas[row * ATLAS_TILE : (row + 1) * ATLAS_TILE, column * ATLAS_TILE : (column + 1) * ATLAS_TILE]
        atlas_tiles.append(tile)
        atlas_records.append({"frame_index": index, "time_seconds": index / 10.0, **broad_atlas_highlight(tile)})

    source_indices = np.linspace(0, len(records) - 1, len(atlas_records)).round().astype(int)
    angular_errors = [angular_distance(records[int(source_index)]["inferred"], atlas_record) for source_index, atlas_record in zip(source_indices, atlas_records)]
    camera_end = records[-1]["inferred"]["camera_translation_px"]
    azimuth = np.array([r["inferred"]["light_azimuth_deg"] for r in records])
    elevation = np.array([r["inferred"]["light_elevation_deg"] for r in records])
    tilt = np.array([r["inferred"]["apparent_tilt_deg"] for r in records])
    confidence = np.array([r["inferred"]["confidence"] for r in records])
    source_vectors = np.array([r["inferred"]["light_direction_camera"] for r in records])
    frame_angles = np.degrees(np.arccos(np.clip(np.einsum("ij,ij->i", source_vectors[:-1], source_vectors[1:]), -1.0, 1.0)))

    # The first six frames contain the 90 km/h transition and a large camera-
    # registration step. Preserve those measurements, but report the stable
    # blue-glass interval separately so that the reflection motion is not
    # conflated with that entrance movement.
    stable_start_time = min(args.start + 0.2, records[-1]["time_seconds"])
    stable_records = [record for record in records if record["time_seconds"] >= stable_start_time]
    stable_start_record = stable_records[0]
    stable_end_record = stable_records[-1]
    stable_start_cyan = np.array(stable_start_record["observed"]["cyan_highlight"]["centroid_xy"], np.float64)
    stable_end_cyan = np.array(stable_end_record["observed"]["cyan_highlight"]["centroid_xy"], np.float64)
    stable_start_center = np.array(stable_start_record["observed"]["ellipse"]["parameters"][:2], np.float64)
    stable_end_center = np.array(stable_end_record["observed"]["ellipse"]["parameters"][:2], np.float64)
    stable_raw_cyan_delta = stable_end_cyan - stable_start_cyan
    stable_camera_delta = stable_end_center - stable_start_center
    stable_registered_cyan_delta = stable_raw_cyan_delta - stable_camera_delta
    stable_uv_start = np.array(stable_start_record["inferred"]["ellipse_uv"], np.float64)
    stable_uv_end = np.array(stable_end_record["inferred"]["ellipse_uv"], np.float64)
    stable_vectors = np.array([record["inferred"]["light_direction_camera"] for record in stable_records])
    stable_frame_angles = np.degrees(
        np.arccos(np.clip(np.einsum("ij,ij->i", stable_vectors[:-1], stable_vectors[1:]), -1.0, 1.0))
    )
    stable_endpoint_angle = math.degrees(
        math.acos(float(np.clip(np.dot(stable_vectors[0], stable_vectors[-1]), -1.0, 1.0)))
    )

    summary = {
        "source": {
            "video": str(video),
            "resolution": [source_width, source_height],
            "fps": FPS,
            "interval_seconds": [args.start, args.end],
            "frame_count": len(records),
            "measurement_roi_xywh": list(crop),
            "decode_policy": "every frame decoded at original resolution; ROI selects orb pixels without resize or resampling",
        },
        "observed": {
            "ellipse_center_start_xy": records[0]["observed"]["ellipse"]["parameters"][:2],
            "ellipse_center_end_xy": records[-1]["observed"]["ellipse"]["parameters"][:2],
            "ellipse_center_start_source_xy": records[0]["observed"]["ellipse"]["parameters_source_xy"][:2],
            "ellipse_center_end_source_xy": records[-1]["observed"]["ellipse"]["parameters_source_xy"][:2],
            "ellipse_axes_start_rx_ry": records[0]["observed"]["ellipse"]["parameters"][2:4],
            "ellipse_axes_end_rx_ry": records[-1]["observed"]["ellipse"]["parameters"][2:4],
            "camera_translation_end_px": camera_end,
            "cyan_highlight_start_xy": records[0]["observed"]["cyan_highlight"]["centroid_xy"],
            "cyan_highlight_end_xy": records[-1]["observed"]["cyan_highlight"]["centroid_xy"],
            "cyan_highlight_start_source_xy": records[0]["observed"]["cyan_highlight_source_xy"],
            "cyan_highlight_end_source_xy": records[-1]["observed"]["cyan_highlight_source_xy"],
            "ellipse_fit_residual_median_px": float(np.median([r["observed"]["ellipse"]["residual_px"] for r in records])),
        },
        "inferred": {
            "apparent_tilt_range_deg": [float(tilt.min()), float(tilt.max())],
            "light_azimuth_range_deg": [float(azimuth.min()), float(azimuth.max())],
            "light_elevation_range_deg": [float(elevation.min()), float(elevation.max())],
            "light_start_azimuth_elevation_deg": [float(azimuth[0]), float(elevation[0])],
            "light_end_azimuth_elevation_deg": [float(azimuth[-1]), float(elevation[-1])],
            "mean_angular_velocity_deg_per_second": float(frame_angles.mean() * FPS),
            "median_confidence": float(np.median(confidence)),
            "confidence_cap_reason": "single-view rough black glass and environment reflections make the inverse-lighting solution non-unique",
        },
        "stable_blue_interval": {
            "interval_seconds": [stable_start_record["time_seconds"], stable_end_record["time_seconds"]],
            "observed_cyan_delta_px": stable_raw_cyan_delta.astype(float).tolist(),
            "observed_ellipse_center_delta_px": stable_camera_delta.astype(float).tolist(),
            "camera_translation_removed_cyan_delta_px": stable_registered_cyan_delta.astype(float).tolist(),
            "ellipse_normalized_highlight_uv_start": stable_uv_start.astype(float).tolist(),
            "ellipse_normalized_highlight_uv_end": stable_uv_end.astype(float).tolist(),
            "ellipse_normalized_highlight_uv_delta": (stable_uv_end - stable_uv_start).astype(float).tolist(),
            "inferred_light_endpoint_separation_deg": stable_endpoint_angle,
            "inferred_instantaneous_angular_speed_median_deg_per_second": float(np.median(stable_frame_angles) * FPS),
        },
        "current_render_comparison": {
            "atlas": str(atlas_path),
            "current_atlas_frame_count": len(atlas_records),
            "comparison_feature": "broad upper highlight centroid; the current atlas has no isolated cyan point-key equivalent",
            "direction_angular_rmse_deg": float(math.sqrt(float(np.mean(np.square(angular_errors))))),
            "direction_angular_error_range_deg": [float(min(angular_errors)), float(max(angular_errors))],
            "metric_interpretation": "structural direction mismatch proxy, not a one-to-one recovered-light error",
            "verdict": "current opening-state optical field does not reproduce the late cyan-key reflection path",
        },
        "assumptions": [
            "The visible gauge is circular before perspective, so ellipse axis ratio estimates apparent tilt under weak perspective.",
            "The cyan caustic centroid is treated as a mirror-like specular half-vector on a unit sphere.",
            "The camera view direction is orthographic and aligned with +Z in the normalized orb coordinate system.",
            "The silver right rim is an environment-strip reflection and is measured separately from the cyan key.",
        ],
        "equation": "L = normalize(2 * dot(N,V) * N - V), with V=(0,0,1)",
    }

    (out / "reflection-solve.json").write_text(json.dumps({"summary": summary, "frames": records, "current_atlas": atlas_records}, indent=2) + "\n")
    with (out / "reflection-path.csv").open("w", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(
            [
                "frame",
                "time_seconds",
                "ellipse_cx",
                "ellipse_cy",
                "ellipse_rx",
                "ellipse_ry",
                "ellipse_theta_rad",
                "ellipse_residual_px",
                "highlight_x",
                "highlight_y",
                "source_highlight_x",
                "source_highlight_y",
                "highlight_softness_px",
                "peak_linear_luminance",
                "light_azimuth_deg",
                "light_elevation_deg",
                "apparent_tilt_deg",
                "camera_dx_px",
                "camera_dy_px",
                "inference_confidence",
            ]
        )
        for record in records:
            q = record["observed"]["ellipse"]["parameters"]
            highlight = record["observed"]["cyan_highlight"]
            inferred = record["inferred"]
            writer.writerow(
                [
                    record["frame_index"],
                    record["time_seconds"],
                    *q,
                    record["observed"]["ellipse"]["residual_px"],
                    *highlight["centroid_xy"],
                    *record["observed"]["cyan_highlight_source_xy"],
                    highlight["softness_radius_px"],
                    highlight.get("peak_luminance", 0.0),
                    inferred["light_azimuth_deg"],
                    inferred["light_elevation_deg"],
                    inferred["apparent_tilt_deg"],
                    *inferred["camera_translation_px"],
                    inferred["confidence"],
                ]
            )

    source_key_indices = np.linspace(0, len(records) - 1, 6).round().astype(int)
    atlas_key_indices = np.linspace(0, len(atlas_records) - 1, 6).round().astype(int)
    sheet = Image.new("RGB", (400 * 6, 800), (0, 0, 0))
    for column, index in enumerate(source_key_indices):
        record = records[int(index)]
        panel = draw_source_panel(frame_rgb[int(index)], record, f"SOURCE t={record['time_seconds']:.2f}s")
        sheet.paste(panel, (column * 400, 0))
    for column, index in enumerate(atlas_key_indices):
        record = atlas_records[int(index)]
        panel = draw_atlas_panel(atlas_tiles[int(index)], record, f"CURRENT ATLAS t={record['time_seconds']:.2f}s")
        sheet.paste(panel, (column * 400, 400))
    sheet.save(out / "source-vs-current-angle-overlay.png")
    chart(records, atlas_records, out / "camera-and-light-path.png")

    readme = f"""# Gleb late-orb reflection solve

This analysis decodes every one of the {len(records)} original {source_width}x{source_height}
video frames from {args.start:.2f}s through {args.end:.2f}s at 30 fps without resizing or
resampling. A fixed {width}x{height} ROI selects only the orb pixels for measurement, while
both ROI-local and absolute source coordinates are preserved. Observed image measurements
are stored separately from inferred 3D quantities in `reflection-solve.json`.

The observed source gauge ellipse centre moved by ({camera_end[0]:.2f}, {camera_end[1]:.2f}) px.
Across the stable blue-glass interval, the cyan highlight moved by
({stable_raw_cyan_delta[0]:.2f}, {stable_raw_cyan_delta[1]:.2f}) px while the ellipse centre moved by
({stable_camera_delta[0]:.2f}, {stable_camera_delta[1]:.2f}) px, leaving a camera-translation-removed
highlight displacement of ({stable_registered_cyan_delta[0]:.2f}, {stable_registered_cyan_delta[1]:.2f}) px.
The inferred cyan-key direction moved from azimuth/elevation
({azimuth[0]:.2f}, {elevation[0]:.2f}) degrees to ({azimuth[-1]:.2f},
{elevation[-1]:.2f}) degrees. The current atlas differs from the time-normalized source
path by {summary['current_render_comparison']['direction_angular_rmse_deg']:.2f} degrees RMS when its
broad upper highlight is used as a proxy. The atlas has no isolated cyan point-key equivalent,
so this is a structural mismatch metric rather than an exact like-for-like lighting error.

The 3D direction is conditional, not unique ground truth: it assumes a circular gauge,
weak perspective, a unit sphere, an orthographic view vector, and a mirror-like cyan
specular point. The silver rim is treated as a separate environment-strip reflection.
"""
    (out / "README.md").write_text(readme)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
