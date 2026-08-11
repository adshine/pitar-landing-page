#!/usr/bin/env python3
"""Compare source, previous, and current orb lighting on one measured coordinate system."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

SOURCE_CROP = (520, 380, 920, 780)
CX = CY = 200
RADIUS = 194
CONTOUR_PERCENTILES = (50, 75, 90, 97, 99)
CONTOUR_COLOURS = (
    (0, 130, 255),
    (0, 230, 225),
    (70, 255, 90),
    (255, 215, 0),
    (255, 55, 35),
)


def srgb_to_linear(rgb: np.ndarray) -> np.ndarray:
    value = rgb.astype(np.float32) / 255.0
    return np.where(value <= 0.04045, value / 12.92, ((value + 0.055) / 1.055) ** 2.4)


def luminance(rgb: np.ndarray) -> np.ndarray:
    linear = srgb_to_linear(rgb)
    return np.einsum("hwc,c->hw", linear, np.array([0.2126, 0.7152, 0.0722], np.float32))


def load_orb(path: Path, source: bool) -> np.ndarray:
    image = Image.open(path).convert("RGB")
    if source and image.size != (400, 400):
        image = image.crop(SOURCE_CROP)
    if image.size != (400, 400):
        image = image.resize((400, 400), Image.Resampling.LANCZOS)
    return np.asarray(image)


def masks() -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    yy, xx = np.mgrid[:400, :400]
    dx = xx - CX
    dy = yy - CY
    radius = np.hypot(dx, dy)
    angle = (np.degrees(np.arctan2(dy, dx)) + 360.0) % 360.0
    orb = radius <= RADIUS

    ui = np.zeros_like(orb)
    ui[132:270, 164:244] = True  # speed digit and unit
    ui[178:226, 44:94] = True  # drive-mode glyph
    ui[194:208, 96:302] = True  # dotted centre axis
    ui |= (radius >= 178) & (radius <= 186) & (angle >= 28) & (angle <= 142)
    ui |= (radius >= 187) & (angle >= 165) & (angle <= 219)
    ui |= (radius >= 187) & (angle >= 144) & (angle <= 162)
    optical = orb & ~ui
    shell = optical & (radius >= 170) & (radius <= RADIUS)
    interior = optical & (radius < 150)
    return orb, optical, shell, interior


def boundary(mask: np.ndarray) -> np.ndarray:
    result = np.zeros_like(mask)
    result[1:] |= mask[1:] != mask[:-1]
    result[:-1] |= mask[:-1] != mask[1:]
    result[:, 1:] |= mask[:, 1:] != mask[:, :-1]
    result[:, :-1] |= mask[:, :-1] != mask[:, 1:]
    return result


def weighted_centroid(field: np.ndarray, region: np.ndarray, percentile: float) -> tuple[float, float]:
    threshold = float(np.percentile(field[region], percentile))
    weights = np.where(region, np.maximum(field - threshold, 0.0), 0.0)
    total = float(weights.sum())
    if total <= 1e-12:
        return float(CX), float(CY)
    yy, xx = np.mgrid[: field.shape[0], : field.shape[1]]
    return float((xx * weights).sum() / total), float((yy * weights).sum() / total)


def caustic_peak(field: np.ndarray) -> tuple[float, float]:
    region = field[165:235, 92:158]
    y, x = np.unravel_index(int(np.argmax(region)), region.shape)
    return float(x + 92), float(y + 165)


def radial_profile(field: np.ndarray, optical: np.ndarray) -> np.ndarray:
    yy, xx = np.mgrid[:400, :400]
    radius = np.rint(np.hypot(xx - CX, yy - CY)).astype(np.int16)
    profile = np.zeros(RADIUS + 1, np.float32)
    for r in range(RADIUS + 1):
        values = field[(radius == r) & optical]
        profile[r] = float(values.mean()) if values.size else (profile[r - 1] if r else 0.0)
    return profile


def angular_profile(field: np.ndarray, shell: np.ndarray) -> np.ndarray:
    yy, xx = np.mgrid[:400, :400]
    angle = np.rint((np.degrees(np.arctan2(yy - CY, xx - CX)) + 360.0) % 360.0).astype(np.int16) % 360
    profile = np.zeros(360, np.float32)
    for degree in range(360):
        values = field[(angle == degree) & shell]
        profile[degree] = float(values.mean()) if values.size else np.nan
    valid = np.flatnonzero(~np.isnan(profile))
    if valid.size:
        profile = np.interp(np.arange(360), valid, profile[valid], period=360).astype(np.float32)
    else:
        profile[:] = 0.0
    return profile


def global_ssim(reference: np.ndarray, render: np.ndarray, mask: np.ndarray) -> float:
    a = reference[mask]
    b = render[mask]
    mean_a = float(a.mean())
    mean_b = float(b.mean())
    var_a = float(a.var())
    var_b = float(b.var())
    covariance = float(np.mean((a - mean_a) * (b - mean_b)))
    return float(
        ((2 * mean_a * mean_b + 1e-4) * (2 * covariance + 9e-4))
        / ((mean_a * mean_a + mean_b * mean_b + 1e-4) * (var_a + var_b + 9e-4))
    )


def annotate_panel(
    rgb: np.ndarray,
    field: np.ndarray,
    optical: np.ndarray,
    contour_levels: np.ndarray,
    title: str,
    highlight: tuple[float, float],
    caustic: tuple[float, float],
    frame_note: str,
) -> Image.Image:
    base = Image.fromarray(rgb.copy())
    overlay = np.asarray(base).copy()
    for level, colour in zip(contour_levels, CONTOUR_COLOURS):
        edge = boundary(field >= float(level)) & optical
        overlay[edge] = colour
    image = Image.blend(base, Image.fromarray(overlay), 0.72)
    draw = ImageDraw.Draw(image, "RGBA")
    font = ImageFont.load_default()
    draw.ellipse((CX - RADIUS, CY - RADIUS, CX + RADIUS, CY + RADIUS), outline=(255, 225, 0, 235), width=1)
    hx, hy = highlight
    draw.line((hx - 8, hy, hx + 8, hy), fill=(0, 245, 255, 255), width=2)
    draw.line((hx, hy - 8, hx, hy + 8), fill=(0, 245, 255, 255), width=2)
    cx, cy = caustic
    draw.line((cx - 7, cy - 7, cx + 7, cy + 7), fill=(255, 45, 220, 255), width=2)
    draw.line((cx - 7, cy + 7, cx + 7, cy - 7), fill=(255, 45, 220, 255), width=2)
    draw.rectangle((0, 0, 400, 32), fill=(0, 0, 0, 210))
    draw.text((8, 5), title, fill=(255, 255, 255, 255), font=font)
    draw.text((8, 18), frame_note, fill=(210, 220, 225, 255), font=font)
    draw.text((245, 5), f"H=({hx:.1f},{hy:.1f})", fill=(0, 245, 255, 255), font=font)
    draw.text((245, 18), f"C=({cx:.1f},{cy:.1f})", fill=(255, 90, 225, 255), font=font)
    return image


def draw_falloff_chart(
    profiles: dict[str, np.ndarray],
    labels: dict[str, str],
    out: Path,
) -> None:
    width, height = 1200, 460
    image = Image.new("RGB", (width, height), (8, 10, 12))
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default()
    left, top, right, bottom = 70, 55, 1160, 390
    draw.rectangle((left, top, right, bottom), outline=(85, 92, 98), width=1)
    for index in range(6):
        y = top + index * (bottom - top) / 5
        draw.line((left, y, right, y), fill=(35, 40, 44), width=1)
        draw.text((12, y - 5), f"10^{(-index):d}", fill=(150, 160, 168), font=font)
    colours = {"source": (255, 220, 0), "previous": (0, 235, 170), "current": (255, 65, 55)}
    for name, values in profiles.items():
        log_values = np.clip(np.log10(np.maximum(values, 1e-5)), -5.0, 0.0)
        points = []
        for radius, value in enumerate(log_values):
            x = left + radius / RADIUS * (right - left)
            y = top + (-value / 5.0) * (bottom - top)
            points.append((x, y))
        draw.line(points, fill=colours[name], width=3)
    draw.text((left, 18), "TEMPORAL-MEAN RADIAL LUMINANCE FALLOFF (LINEAR REC.709, LOG SCALE)", fill="white", font=font)
    legend = f"Yellow={labels['source']}   Green={labels['previous']}   Red={labels['current']}   radius 0=center, 194=circumference"
    draw.text((left, 35), legend, fill=(200, 208, 214), font=font)
    draw.text((left, 410), "All samples use the same center (200,200), radius 194, and UI-exclusion mask.", fill=(170, 180, 188), font=font)
    image.save(out)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reference", action="append", required=True)
    parser.add_argument("--previous", action="append", required=True)
    parser.add_argument("--current", action="append", required=True)
    parser.add_argument("--source-label", default="SOURCE")
    parser.add_argument("--previous-label", default="PREVIOUS")
    parser.add_argument("--current-label", default="CURRENT")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    if not (len(args.reference) == len(args.previous) == len(args.current)):
        raise SystemExit("reference, previous, and current frame counts must match")

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    orb, optical, shell, interior = masks()
    series_paths = {
        "source": [Path(path) for path in args.reference],
        "previous": [Path(path) for path in args.previous],
        "current": [Path(path) for path in args.current],
    }
    series_rgb = {
        name: [load_orb(path, name == "source") for path in paths]
        for name, paths in series_paths.items()
    }
    series_lum = {name: [luminance(frame) for frame in frames] for name, frames in series_rgb.items()}
    labels = {
        "source": args.source_label,
        "previous": args.previous_label,
        "current": args.current_label,
    }

    sheet = Image.new("RGB", (400 * len(args.reference), 400 * 3), (0, 0, 0))
    records: list[dict[str, object]] = []
    radial_means: dict[str, list[np.ndarray]] = {name: [] for name in series_rgb}
    centroids: dict[str, list[tuple[float, float]]] = {name: [] for name in series_rgb}

    yy, xx = np.mgrid[:400, :400]
    highlight_region = optical & (yy < 158) & (xx > 118)

    for frame_index in range(len(args.reference)):
        reference_lum = series_lum["source"][frame_index]
        contour_levels = np.percentile(reference_lum[optical], CONTOUR_PERCENTILES)
        reference_radial = radial_profile(reference_lum, optical)
        reference_angular = angular_profile(reference_lum, shell)
        frame_record: dict[str, object] = {"frame_index": frame_index, "contour_levels": contour_levels.tolist(), "series": {}}

        for row, name in enumerate(("source", "previous", "current")):
            rgb = series_rgb[name][frame_index]
            field = series_lum[name][frame_index]
            highlight = weighted_centroid(field, highlight_region, 82)
            caustic = caustic_peak(field)
            radial = radial_profile(field, optical)
            angular = angular_profile(field, shell)
            radial_means[name].append(radial)
            centroids[name].append(highlight)
            note = f"frame {frame_index} / same 400x400 registration"
            panel = annotate_panel(rgb, field, optical, contour_levels, labels[name], highlight, caustic, note)
            sheet.paste(panel, (frame_index * 400, row * 400))

            result = {
                "highlight_centroid_xy": list(highlight),
                "caustic_peak_xy": list(caustic),
                "shell_mean_luminance": float(field[shell].mean()),
                "interior_mean_luminance": float(field[interior].mean()),
                "radial_profile_rmse_vs_source": float(np.sqrt(np.mean((radial - reference_radial) ** 2))),
                "angular_shell_rmse_vs_source": float(np.sqrt(np.mean((angular - reference_angular) ** 2))),
                "luminance_ssim_vs_source": global_ssim(reference_lum, field, orb),
                "highlight_displacement_vs_source_px": float(np.hypot(highlight[0] - centroids["source"][frame_index][0], highlight[1] - centroids["source"][frame_index][1])) if name != "source" else 0.0,
            }
            frame_record["series"][name] = result
        records.append(frame_record)

    sheet.save(out / "annotated-sequence.png")

    temporal: dict[str, object] = {}
    for name, frames in series_lum.items():
        deltas = []
        moving = []
        for earlier, later in zip(frames, frames[1:]):
            delta = np.abs(later - earlier)
            deltas.append(float(delta[optical].mean()))
            moving.append(float((delta[optical] > (1.0 / 255.0)).mean()))
        path = centroids[name]
        path_length = sum(float(np.hypot(b[0] - a[0], b[1] - a[1])) for a, b in zip(path, path[1:]))
        temporal[name] = {
            "mean_adjacent_luminance_delta": float(np.mean(deltas)) if deltas else 0.0,
            "mean_moving_pixel_fraction": float(np.mean(moving)) if moving else 0.0,
            "highlight_centroid_path_length_px": path_length,
        }

    mean_profiles = {name: np.mean(np.stack(values), axis=0) for name, values in radial_means.items()}
    draw_falloff_chart(mean_profiles, labels, out / "radial-falloff-comparison.png")
    summary = {
        "coordinate_system": {"dimensions": [400, 400], "centre_xy": [CX, CY], "radius_px": RADIUS},
        "colour_working_space": "linear sRGB / Rec.709 luminance",
        "display_labels": labels,
        "contours": list(CONTOUR_PERCENTILES),
        "markers": {"cyan_cross": "upper optical highlight centroid", "magenta_x": "left caustic peak", "yellow_circle": "measured orb circumference"},
        "frames": records,
        "temporal": temporal,
    }
    (out / "measurements.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
