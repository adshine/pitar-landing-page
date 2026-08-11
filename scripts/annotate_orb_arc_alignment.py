#!/usr/bin/env python3
"""Annotate the measured orb rim, cyan arc, and lower dotted circumference."""

from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
NORMALIZED = "--normalized" in sys.argv
SOURCE = ROOT / ("public/orb-assets/gleb-light-atlas-normalized.png" if NORMALIZED else "output/gleb-full-resolution-analysis/frames/frame-001.png")
OUT = ROOT / ("output/gleb-motion-analysis/traced-lighting/orb-arc-alignment-normalized.png" if NORMALIZED else "output/gleb-motion-analysis/traced-lighting/orb-arc-alignment-annotated.png")
CROP = (0, 0, 400, 400) if NORMALIZED else (520, 380, 920, 780)
CENTER = np.array([200.0, 200.0])
OUTER_RADIUS = 194.0
DOTTED_RADIUS = 194.0 if NORMALIZED else 180.0


def main() -> None:
    image = Image.open(SOURCE).convert("RGB").crop(CROP)
    pixels = np.asarray(image)
    yy, xx = np.mgrid[: image.height, : image.width]
    radial = np.hypot(xx - CENTER[0], yy - CENTER[1])

    # Keep annotations tied to observed pixels; no smoothing or resizing.
    cyan = (
        (pixels[..., 2] > 70)
        & (pixels[..., 1] > 50)
        & (pixels[..., 2] > pixels[..., 0] * 1.25)
        & (radial > 175)
        & (radial < 205)
    )
    dots = (
        (pixels.min(axis=2) > 45)
        & (radial > 175)
        & (radial < 205)
        & (yy > 235)
    )

    annotated = image.copy()
    draw = ImageDraw.Draw(annotated)
    # 20px grid makes the coordinate relationship inspectable without hiding data.
    for value in range(0, 401, 20):
        draw.line((value, 0, value, 399), fill=(0, 105, 70), width=1)
        draw.line((0, value, 399, value), fill=(0, 105, 70), width=1)
    outer_bbox = (
        CENTER[0] - OUTER_RADIUS,
        CENTER[1] - OUTER_RADIUS,
        CENTER[0] + OUTER_RADIUS,
        CENTER[1] + OUTER_RADIUS,
    )
    dotted_bbox = (
        CENTER[0] - DOTTED_RADIUS,
        CENTER[1] - DOTTED_RADIUS,
        CENTER[0] + DOTTED_RADIUS,
        CENTER[1] + DOTTED_RADIUS,
    )
    # Outer rim and dotted track are intentionally separate measured paths.
    # The yellow guide follows the actual dotted track; the outer rim is gray.
    draw.ellipse(outer_bbox, outline=(170, 170, 170), width=1)
    draw.ellipse(dotted_bbox, outline=(255, 205, 0), width=1)
    draw.ellipse((197, 197, 203, 203), fill=(255, 205, 0))
    for mask, colour in ((cyan, (0, 255, 255)), (dots, (255, 80, 0))):
        ys, xs = np.where(mask)
        for px, py in zip(xs.tolist(), ys.tolist()):
            draw.point((px, py), fill=colour)
    draw.line((200, 200, 200 + OUTER_RADIUS, 200), fill=(170, 170, 170), width=1)
    draw.text((8, 8), "NORMALIZED ARC ALIGNMENT | centre=(200,200)" if NORMALIZED else "MEASURED ARC ALIGNMENT | centre=(200,200)", fill=(255, 255, 0))
    draw.text((8, 24), "GRAY rim=194px | YELLOW dotted guide=194px | ORANGE dots | CYAN=blue arc" if NORMALIZED else "GRAY rim=194px | YELLOW dotted guide=180px | ORANGE dots | CYAN=blue arc", fill=(255, 255, 0))
    annotated.save(OUT)
    print({"output": str(OUT), "cyan_pixels": int(cyan.sum()), "dotted_arc_pixels": int(dots.sum()), "center": CENTER.tolist(), "outer_radius_px": OUTER_RADIUS, "dotted_radius_px": DOTTED_RADIUS})


if __name__ == "__main__":
    main()
