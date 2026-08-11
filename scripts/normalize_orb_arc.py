#!/usr/bin/env python3
"""Create a display atlas with the measured dotted track on the outer rim."""

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/orb-assets/gleb-light-atlas.png"
OUTPUT = ROOT / "public/orb-assets/gleb-light-atlas-normalized.png"
DOT_OUTPUT = ROOT / "public/orb-assets/gleb-static-dots.png"
GRID = (5, 4)
CENTER = np.array([200.0, 200.0])
SOURCE_RADIUS = 180.0
TARGET_RADIUS = 194.0
# 25 dot centres traced from frame-001 at the original 180px track.
DOT_ANGLES = np.array(
    [33.3, 38.1, 42.5, 47.2, 51.7, 56.5, 60.9, 65.7, 70.3, 74.9,
     79.4, 84.3, 88.7, 93.5, 98.0, 102.8, 107.4, 112.2, 116.7,
     121.4, 126.0, 130.5, 135.2, 139.7, 144.4], dtype=np.float32
)


def blend(dst: np.ndarray, src: np.ndarray, alpha: float) -> np.ndarray:
    return np.rint(dst.astype(np.float32) * (1.0 - alpha) + src.astype(np.float32) * alpha).astype(np.uint8)


def normalize_tile(tile: np.ndarray) -> np.ndarray:
    out = tile.copy()
    yy, xx = np.mgrid[:400, :400]
    radial = np.hypot(xx - CENTER[0], yy - CENTER[1])
    angle_field = np.degrees(np.arctan2(yy - CENTER[1], xx - CENTER[0])) % 360
    # The source contains more than one lower dotted/speckled band. Remove the
    # complete lower guide region so the live shader receives exactly one dot
    # source: the static overlay created below.
    old_track = (radial >= 172) & (radial <= 199) & (angle_field >= 25) & (angle_field <= 150)
    for py, px in np.argwhere(old_track):
        angle = np.arctan2(py - CENTER[1], px - CENTER[0])
        radius = radial[py, px]
        inner_r = 165.0
        outer_r = 201.0
        inner_x = int(round(CENTER[0] + inner_r * np.cos(angle)))
        inner_y = int(round(CENTER[1] + inner_r * np.sin(angle)))
        outer_x = int(round(CENTER[0] + outer_r * np.cos(angle)))
        outer_y = int(round(CENTER[1] + outer_r * np.sin(angle)))
        if 0 <= inner_x < 400 and 0 <= inner_y < 400 and 0 <= outer_x < 400 and 0 <= outer_y < 400:
            mix_amount = float(np.clip((radius - 172.0) / 27.0, 0.0, 1.0))
            out[py, px, :3] = blend(tile[inner_y, inner_x, :3], tile[outer_y, outer_x, :3], mix_amount)
    # Shift the observed cyan segment's centreline onto the same 194px path.
    # It is already close to the rim, so this is a restrained ~1.4px radial
    # correction rather than a redraw.
    degrees = angle_field
    cyan = (
        (tile[..., 2] > 70)
        & (tile[..., 1] > 50)
        & (tile[..., 2] > tile[..., 0] * 1.25)
        & (radial > 188)
        & (radial < 198)
        & (degrees > 120)
        & (degrees < 170)
    )
    cyan_pixels = np.argwhere(cyan)
    # Clear the old cyan samples before placing the shifted segment.
    for py, px in cyan_pixels:
        angle = np.arctan2(py - CENTER[1], px - CENTER[0])
        radius = radial[py, px]
        inner_x = int(round(CENTER[0] + (radius - 5) * np.cos(angle)))
        inner_y = int(round(CENTER[1] + (radius - 5) * np.sin(angle)))
        outer_x = int(round(CENTER[0] + (radius + 5) * np.cos(angle)))
        outer_y = int(round(CENTER[1] + (radius + 5) * np.sin(angle)))
        if 0 <= inner_x < 400 and 0 <= inner_y < 400 and 0 <= outer_x < 400 and 0 <= outer_y < 400:
            background = ((tile[inner_y, inner_x, :3].astype(np.float32) + tile[outer_y, outer_x, :3].astype(np.float32)) * .5).astype(np.uint8)
            out[py, px, :3] = background
    for py, px in cyan_pixels:
        angle = np.arctan2(py - CENTER[1], px - CENTER[0])
        radius = radial[py, px]
        target_radius = radius + 1.4
        tx = int(round(CENTER[0] + target_radius * np.cos(angle)))
        ty = int(round(CENTER[1] + target_radius * np.sin(angle)))
        if 0 <= tx < 400 and 0 <= ty < 400:
            out[ty, tx, :3] = blend(out[ty, tx, :3], tile[py, px, :3], .9)
    return out


def static_dots(tile: np.ndarray) -> np.ndarray:
    """Extract one static dot ring; it must not be interpolated with uTime."""
    overlay = np.zeros((400, 400, 4), dtype=np.uint8)
    for degrees in DOT_ANGLES:
        radians = np.deg2rad(degrees)
        source_xy = np.rint(CENTER + SOURCE_RADIUS * np.array([np.cos(radians), np.sin(radians)])).astype(int)
        target_xy = np.rint(CENTER + TARGET_RADIUS * np.array([np.cos(radians), np.sin(radians)])).astype(int)
        sx, sy = source_xy.tolist()
        tx, ty = target_xy.tolist()
        dot_colour = tile[sy, sx, :3]
        overlay[ty, tx, :3] = dot_colour
        overlay[ty, tx, 3] = 235
    return overlay


def main() -> None:
    atlas = np.asarray(Image.open(SOURCE).convert("RGBA"))
    normalized = atlas.copy()
    for row in range(GRID[1]):
        for column in range(GRID[0]):
            y0, y1 = row * 400, (row + 1) * 400
            x0, x1 = column * 400, (column + 1) * 400
            normalized[y0:y1, x0:x1] = normalize_tile(atlas[y0:y1, x0:x1])
    Image.fromarray(normalized, "RGBA").save(OUTPUT, optimize=True)
    Image.fromarray(static_dots(atlas[:400, :400]), "RGBA").save(DOT_OUTPUT, optimize=True)
    print({"source": str(SOURCE), "output": str(OUTPUT), "static_dots": str(DOT_OUTPUT), "dot_count": len(DOT_ANGLES), "source_radius_px": SOURCE_RADIUS, "target_radius_px": TARGET_RADIUS})


if __name__ == "__main__":
    main()
