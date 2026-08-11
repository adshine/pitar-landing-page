#!/usr/bin/env python3
"""Annotate subtle per-frame changes in the first three seconds of the Gleb orb reference."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROI = (485, 300, 985, 800)
ORB_CENTRE = (250, 250)
ORB_RADIUS = 218


def luminance(image: np.ndarray) -> np.ndarray:
    rgb = image[..., :3].astype(np.float32)
    return rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722


def connected_boxes(mask: np.ndarray, minimum_pixels: int = 10) -> list[tuple[int, int, int, int, int]]:
    height, width = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    boxes: list[tuple[int, int, int, int, int]] = []
    for y in range(height):
        for x in range(width):
            if not mask[y, x] or seen[y, x]:
                continue
            stack = [(x, y)]
            seen[y, x] = True
            xs: list[int] = []
            ys: list[int] = []
            while stack:
                px, py = stack.pop()
                xs.append(px)
                ys.append(py)
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    if 0 <= nx < width and 0 <= ny < height and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((nx, ny))
            if len(xs) >= minimum_pixels:
                boxes.append((min(xs), min(ys), max(xs) + 1, max(ys) + 1, len(xs)))
    return sorted(boxes, key=lambda box: box[4], reverse=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("frames", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--fps", type=float, default=10.0)
    parser.add_argument("--stable-through", type=float, default=1.9)
    args = parser.parse_args()

    args.output.mkdir(parents=True, exist_ok=True)
    annotated_dir = args.output / "annotated"
    annotated_dir.mkdir(exist_ok=True)
    frame_paths = sorted(args.frames.glob("*.png"))
    if len(frame_paths) < 2:
        raise SystemExit("Need at least two extracted PNG frames")

    yy, xx = np.mgrid[0:500, 0:500]
    radius = np.sqrt((xx - ORB_CENTRE[0]) ** 2 + (yy - ORB_CENTRE[1]) ** 2)
    orb_mask = radius <= ORB_RADIUS
    readout_mask = (np.abs(xx - ORB_CENTRE[0]) < 72) & (np.abs(yy - ORB_CENTRE[1]) < 105)
    analysis_mask = orb_mask & ~readout_mask
    shell_mask = (radius >= ORB_RADIUS - 34) & (radius <= ORB_RADIUS + 4)
    interior_mask = radius < ORB_RADIUS - 34
    upper_lobe_mask = interior_mask & (yy < ORB_CENTRE[1] - 35)
    left_caustic_mask = interior_mask & (xx < ORB_CENTRE[0] - 45) & (yy > ORB_CENTRE[1] - 95) & (yy < ORB_CENTRE[1] + 65)

    previous_luma: np.ndarray | None = None
    rows: list[dict[str, float | int]] = []
    annotated: list[Image.Image] = []

    stable_paths = frame_paths[: int(round(args.stable_through * args.fps)) + 1]
    for index, path in enumerate(stable_paths):
        full = Image.open(path).convert("RGB")
        crop = full.crop(ROI)
        array = np.asarray(crop)
        luma = luminance(array)
        delta = np.zeros_like(luma) if previous_luma is None else np.abs(luma - previous_luma)
        changed = (delta >= 5.0) & analysis_mask
        boxes = connected_boxes(changed, minimum_pixels=12)[:8]

        weights = np.where(changed, delta, 0.0)
        weight_sum = float(weights.sum())
        centroid_x = float((weights * xx).sum() / weight_sum) if weight_sum else float(ORB_CENTRE[0])
        centroid_y = float((weights * yy).sum() / weight_sum) if weight_sum else float(ORB_CENTRE[1])

        shell_delta = float(delta[shell_mask].mean())
        interior_delta = float(delta[interior_mask].mean())
        upper_lobe_delta = float(delta[upper_lobe_mask].mean())
        left_caustic_delta = float(delta[left_caustic_mask].mean())
        changed_fraction = float(changed.sum() / orb_mask.sum())
        silhouette_band = luma[(radius >= ORB_RADIUS - 2) & (radius <= ORB_RADIUS + 2)]

        rows.append({
            "frame": index,
            "time_seconds": round(index / args.fps, 3),
            "changed_fraction": round(changed_fraction, 6),
            "mean_shell_delta": round(shell_delta, 4),
            "mean_interior_delta": round(interior_delta, 4),
            "mean_upper_lobe_delta": round(upper_lobe_delta, 4),
            "mean_left_caustic_delta": round(left_caustic_delta, 4),
            "change_centroid_x": round(centroid_x, 2),
            "change_centroid_y": round(centroid_y, 2),
            "silhouette_band_mean": round(float(silhouette_band.mean()), 4),
            "silhouette_band_std": round(float(silhouette_band.std()), 4),
        })

        panel = crop.copy()
        draw = ImageDraw.Draw(panel, "RGBA")
        draw.ellipse((ORB_CENTRE[0] - ORB_RADIUS, ORB_CENTRE[1] - ORB_RADIUS,
                      ORB_CENTRE[0] + ORB_RADIUS, ORB_CENTRE[1] + ORB_RADIUS),
                     outline=(0, 215, 255, 190), width=2)
        for x0, y0, x1, y1, pixels in boxes:
            draw.rectangle((x0, y0, x1, y1), outline=(255, 70, 70, 220), width=2)
            draw.text((x0 + 3, y0 + 3), f"Δ {pixels}px", fill=(255, 110, 110, 255), font=ImageFont.load_default())
        draw.line((centroid_x - 8, centroid_y, centroid_x + 8, centroid_y), fill=(255, 220, 0, 230), width=2)
        draw.line((centroid_x, centroid_y - 8, centroid_x, centroid_y + 8), fill=(255, 220, 0, 230), width=2)
        draw.rectangle((0, 0, 500, 34), fill=(0, 0, 0, 190))
        draw.text((10, 9),
                  f"t={index / args.fps:0.1f}s  changed={changed_fraction * 100:0.2f}%  shellΔ={shell_delta:0.2f}  innerΔ={interior_delta:0.2f}",
                  fill=(255, 255, 255, 255), font=ImageFont.load_default())
        panel.save(annotated_dir / f"frame-{index:03d}.png")
        annotated.append(panel)
        previous_luma = luma

    with (args.output / "motion_metrics.csv").open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    summary = {
        "frames": len(rows),
        "fps": args.fps,
        "roi": ROI,
        "orbCentre": ORB_CENTRE,
        "orbRadius": ORB_RADIUS,
        "meanChangedFraction": float(np.mean([row["changed_fraction"] for row in rows[1:]])),
        "meanShellDelta": float(np.mean([row["mean_shell_delta"] for row in rows[1:]])),
        "meanInteriorDelta": float(np.mean([row["mean_interior_delta"] for row in rows[1:]])),
        "meanUpperLobeDelta": float(np.mean([row["mean_upper_lobe_delta"] for row in rows[1:]])),
        "meanLeftCausticDelta": float(np.mean([row["mean_left_caustic_delta"] for row in rows[1:]])),
        "silhouetteBandMeanRange": [
            float(min(row["silhouette_band_mean"] for row in rows)),
            float(max(row["silhouette_band_mean"] for row in rows)),
        ],
        "interpretation": "Red boxes are per-frame pixel changes after excluding the animated central readout. Cyan circle is the fixed orb boundary. Yellow cross is the weighted change centroid. Frames after the fixed-orb interval are excluded because they begin the unwanted morph.",
    }
    (args.output / "motion_summary.json").write_text(json.dumps(summary, indent=2) + "\n")

    columns = 5
    rows_count = (len(annotated) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * 500, rows_count * 500), "black")
    for index, panel in enumerate(annotated):
        sheet.paste(panel, ((index % columns) * 500, (index // columns) * 500))
    sheet.save(args.output / "annotated_contact_sheet.png")


if __name__ == "__main__":
    main()
