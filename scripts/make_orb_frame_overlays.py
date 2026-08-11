#!/usr/bin/env python3
"""Create close-up reference/current overlays for exact orb timestamps."""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFont


ROOT = Path(__file__).resolve().parents[1]
REFERENCE_DIR = ROOT / "output/gleb-motion-analysis/frames"
CURRENT_DIR = ROOT / "output/orb-frame-match/current"
OUTPUT_DIR = ROOT / "output/orb-frame-match/overlays"
REFERENCE_ROI = (485, 300, 985, 800)
CURRENT_ROI = (834, 168, 1242, 576)
TIMES = ("0.0", "0.1", "0.2")


def labelled(image: Image.Image, label: str) -> Image.Image:
    panel = image.copy()
    draw = ImageDraw.Draw(panel, "RGBA")
    draw.rectangle((0, 0, panel.width, 34), fill=(0, 0, 0, 205))
    draw.text((12, 10), label, fill="white", font=ImageFont.load_default())
    return panel


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    rows: list[Image.Image] = []
    for index, timestamp in enumerate(TIMES, start=1):
        reference = Image.open(REFERENCE_DIR / f"frame-{index:03d}.png").convert("RGB").crop(REFERENCE_ROI)
        current = Image.open(CURRENT_DIR / f"full-{timestamp}.png").convert("RGB").crop(CURRENT_ROI).resize((500, 500), Image.Resampling.LANCZOS)

        overlay = Image.blend(reference, current, 0.5)
        reference_array = np.asarray(reference, dtype=np.int16)
        current_array = np.asarray(current, dtype=np.int16)
        delta = np.abs(reference_array - current_array).mean(axis=2)
        heat = np.zeros((500, 500, 3), dtype=np.uint8)
        heat[..., 0] = np.clip(delta * 3.2, 0, 255).astype(np.uint8)
        heat[..., 1] = np.clip((delta - 18) * 1.2, 0, 120).astype(np.uint8)
        heatmap = ImageEnhance.Contrast(Image.fromarray(heat)).enhance(1.25)

        panels = [
            labelled(reference, f"Gleb t={timestamp}s"),
            labelled(current, f"Pitar t={timestamp}s"),
            labelled(overlay, "50/50 alignment overlay"),
            labelled(heatmap, "pixel delta heatmap"),
        ]
        row = Image.new("RGB", (2000, 500), "black")
        for panel_index, panel in enumerate(panels):
            row.paste(panel, (panel_index * 500, 0))
        row.save(OUTPUT_DIR / f"comparison-{timestamp}.png")
        rows.append(row)

    sheet = Image.new("RGB", (2000, 1500), "black")
    for row_index, row in enumerate(rows):
        sheet.paste(row, (0, row_index * 500))
    sheet.save(OUTPUT_DIR / "first-three-frame-closeups.png")


if __name__ == "__main__":
    main()
