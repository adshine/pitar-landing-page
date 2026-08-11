#!/usr/bin/env python3
"""Measure the stable Gleb orb and build a reproducible Three.js light atlas."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
FRAME_DIR = ROOT / "output/gleb-full-resolution-analysis/frames"
OUT_DIR = ROOT / "output/gleb-motion-analysis/traced-lighting"
PUBLIC_DIR = ROOT / "public/orb-assets"

FRAME_COUNT = 20
GRID = (5, 4)
# Measured from the 1440x1080 source. This encloses the fixed 390px sphere.
CROP = (520, 380, 920, 780)
CENTER = np.array([200.0, 200.0])
# The bright rim, cyan arc, and lower dotted path share a measured radius of
# about 193-194px from the crop centre. The 194px fit excludes the surrounding
# dashboard falloff while keeping the observed paths circular.
RADIUS = 194.0


def circular_alpha(size: int) -> np.ndarray:
    yy, xx = np.mgrid[:size, :size]
    distance = np.sqrt((xx - CENTER[0]) ** 2 + (yy - CENTER[1]) ** 2)
    # Two-pixel antialiased boundary, measured independently of dashboard black.
    return np.clip((RADIUS + 1.5 - distance) / 3.0, 0.0, 1.0)


def srgb_to_linear(rgb: np.ndarray) -> np.ndarray:
    rgb = rgb / 255.0
    return np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)


def atlas_from_tiles(tiles: np.ndarray, mode: str) -> Image.Image:
    atlas = Image.new(mode, (GRID[0] * 400, GRID[1] * 400))
    for i, tile in enumerate(tiles):
        atlas.paste(Image.fromarray(tile, mode), ((i % GRID[0]) * 400, (i // GRID[0]) * 400))
    return atlas


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    frames = []
    source_indices = [1 + index * 3 for index in range(FRAME_COUNT)]
    for index in source_indices:
        image = Image.open(FRAME_DIR / f"frame-{index:03d}.png").convert("RGB")
        frames.append(np.asarray(image.crop(CROP), dtype=np.uint8))

    stack = np.stack(frames)
    linear_rgb = srgb_to_linear(stack.astype(np.float32))
    # Rec.709 relative luminance, calculated in linear light for every pixel.
    luminance = np.einsum("fhwc,c->fhw", linear_rgb, np.array([0.2126, 0.7152, 0.0722], np.float32))
    chroma = linear_rgb / np.maximum(luminance[..., None], 1e-5)
    temporal_delta = np.roll(luminance, -1, axis=0) - luminance
    temporal_mean = luminance.mean(axis=0)
    temporal_peak = luminance.max(axis=0)
    temporal_variance = luminance.var(axis=0)
    peak_frame = luminance.argmax(axis=0).astype(np.uint8)
    median = np.median(stack, axis=0)
    delta = np.mean(np.abs(stack.astype(np.float32) - median), axis=3)
    motion = np.max(delta, axis=0)
    alpha = circular_alpha(CROP[2] - CROP[0])

    atlas = Image.new("RGBA", (GRID[0] * 400, GRID[1] * 400), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        rgba = np.dstack((frame, np.rint(alpha * 255).astype(np.uint8)))
        atlas.paste(Image.fromarray(rgba, "RGBA"), ((i % GRID[0]) * 400, (i // GRID[0]) * 400))

    atlas_path = PUBLIC_DIR / "gleb-light-atlas.png"
    atlas.save(atlas_path, optimize=True)

    # The shader uses this independently from RGB so interpolation preserves
    # measured linear-light energy instead of merely blending display values.
    luminance_u8 = np.rint(np.clip(luminance, 0, 1) * 255).astype(np.uint8)
    luminance_atlas_path = PUBLIC_DIR / "gleb-luminance-atlas.png"
    atlas_from_tiles(luminance_u8, "L").save(luminance_atlas_path, optimize=True)

    # Lossless numerical dataset for analysis/rebuilding beyond the browser's
    # 8-bit texture path. Every value remains addressable by frame, y, and x.
    np.savez_compressed(
        OUT_DIR / "pixel-lighting-data.npz",
        linear_rgb=linear_rgb.astype(np.float16),
        luminance=luminance.astype(np.float16),
        chroma=chroma.astype(np.float16),
        temporal_delta=temporal_delta.astype(np.float16),
        temporal_mean=temporal_mean.astype(np.float16),
        temporal_peak=temporal_peak.astype(np.float16),
        temporal_variance=temporal_variance.astype(np.float16),
        peak_frame=peak_frame,
        alpha=alpha.astype(np.float16),
    )

    # Diagnostic: green means the source lighting changed during the stable loop.
    base = frames[0].copy()
    moving = (motion > 5.0) & (alpha > 0.05)
    overlay = base.astype(np.float32)
    overlay[moving] = overlay[moving] * 0.30 + np.array([0, 255, 80]) * 0.70
    diagnostic = Image.fromarray(np.clip(overlay, 0, 255).astype(np.uint8))
    draw = ImageDraw.Draw(diagnostic)
    draw.ellipse(
        (CENTER[0] - RADIUS, CENTER[1] - RADIUS, CENTER[0] + RADIUS, CENTER[1] + RADIUS),
        outline=(0, 255, 80),
        width=2,
    )
    diagnostic.save(OUT_DIR / "measured-motion-green.png")

    # Heat map makes sub-threshold motion visible without inventing geometry.
    normalized = np.clip(motion / max(float(np.percentile(motion[alpha > 0.05], 99)), 1.0), 0, 1)
    heat = np.zeros((400, 400, 3), dtype=np.uint8)
    heat[..., 0] = np.rint(normalized * 255).astype(np.uint8)
    heat[..., 1] = np.rint(np.sqrt(normalized) * 255).astype(np.uint8)
    heat[..., 2] = np.rint((1 - normalized) * 45).astype(np.uint8)
    heat[alpha <= 0.05] = 0
    Image.fromarray(heat).save(OUT_DIR / "motion-heatmap.png")

    def scalar_map(values: np.ndarray, percentile: float = 99.5) -> Image.Image:
        ceiling = max(float(np.percentile(values[alpha > 0.05], percentile)), 1e-6)
        normalized_map = np.clip(values / ceiling, 0, 1)
        output = np.zeros((400, 400, 3), dtype=np.uint8)
        output[..., 0] = np.rint(normalized_map * 255).astype(np.uint8)
        output[..., 1] = np.rint(np.sqrt(normalized_map) * 210).astype(np.uint8)
        output[..., 2] = np.rint((1.0 - normalized_map) * 30).astype(np.uint8)
        output[alpha <= 0.05] = 0
        return Image.fromarray(output)

    scalar_map(temporal_mean).save(OUT_DIR / "luminance-mean.png")
    scalar_map(temporal_peak).save(OUT_DIR / "luminance-peak.png")
    scalar_map(temporal_variance).save(OUT_DIR / "luminance-variance.png")
    phase = np.rint(peak_frame.astype(np.float32) / (FRAME_COUNT - 1) * 255).astype(np.uint8)
    phase_rgb = np.dstack((phase, 255 - phase, np.full_like(phase, 105)))
    phase_rgb[alpha <= 0.05] = 0
    Image.fromarray(phase_rgb).save(OUT_DIR / "luminance-peak-frame.png")

    diagnostics = [
        ("MEAN LUMINANCE", Image.open(OUT_DIR / "luminance-mean.png")),
        ("PEAK LUMINANCE", Image.open(OUT_DIR / "luminance-peak.png")),
        ("TEMPORAL VARIANCE", Image.open(OUT_DIR / "luminance-variance.png")),
        ("PEAK FRAME / PHASE", Image.open(OUT_DIR / "luminance-peak-frame.png")),
    ]
    sheet = Image.new("RGB", (800, 800), "black")
    for index, (label, panel) in enumerate(diagnostics):
        panel = panel.convert("RGB")
        panel_draw = ImageDraw.Draw(panel)
        panel_draw.rectangle((0, 0, 400, 28), fill=(0, 0, 0))
        panel_draw.text((10, 9), label, fill=(255, 255, 255))
        sheet.paste(panel, ((index % 2) * 400, (index // 2) * 400))
    sheet.save(OUT_DIR / "luminance-analysis-sheet.png")

    metadata = {
        "source_frames": [f"frame-{i:03d}.png" for i in source_indices],
        "source_crop_xyxy": CROP,
        "sphere_center_in_crop": CENTER.tolist(),
        "sphere_radius_px": RADIUS,
        "atlas_grid": GRID,
        "tile_size": 400,
        "loop_seconds": 2.0,
        "moving_pixel_fraction": float(np.mean(moving[alpha > 0.05])),
        "motion_threshold_rgb_delta": 5.0,
        "luminance_model": "linear-light Rec.709: 0.2126 R + 0.7152 G + 0.0722 B",
        "luminance_min": float(luminance[:, alpha > 0.05].min()),
        "luminance_max": float(luminance[:, alpha > 0.05].max()),
        "luminance_mean": float(luminance[:, alpha > 0.05].mean()),
        "luminance_p99": float(np.percentile(luminance[:, alpha > 0.05], 99)),
        "lighting_dataset": "pixel-lighting-data.npz",
        "dataset_axes": {"linear_rgb": "frame,y,x,channel", "luminance": "frame,y,x"},
    }
    (OUT_DIR / "measurements.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(json.dumps({"atlas": str(atlas_path), **metadata}, indent=2))


if __name__ == "__main__":
    main()
