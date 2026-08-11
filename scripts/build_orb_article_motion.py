#!/usr/bin/env python3
"""Build the two-second article clip with a clean 0–10 km/h readout.

The source video supplies the measured orb/reflection animation. Its baked-in
speed readout is removed with a feathered, frame-local dark plate, then a new
readout is rendered independently so the optical field and interface do not
fight each other.
"""

from __future__ import annotations

import argparse
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


WIDTH = 720
HEIGHT = 720
FPS = 30
FRAME_COUNT = 60
NUMBER_CENTER = (360, 371)
UNIT_CENTER = (360, 462)
FONT_NUMBER = Path("/Library/Fonts/SF-Pro-Display-Regular.otf")
FONT_UNIT = Path("/Library/Fonts/SF-Pro-Text-Regular.otf")


def decode_frames(path: Path) -> list[Image.Image]:
    command = [
        "ffmpeg", "-v", "error", "-i", str(path),
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
    ]
    process = subprocess.Popen(command, stdout=subprocess.PIPE)
    assert process.stdout is not None
    frame_bytes = WIDTH * HEIGHT * 3
    frames: list[Image.Image] = []
    while len(frames) < FRAME_COUNT:
        payload = process.stdout.read(frame_bytes)
        if len(payload) != frame_bytes:
            break
        frames.append(Image.frombytes("RGB", (WIDTH, HEIGHT), payload))
    process.wait()
    if not frames:
        raise RuntimeError(f"No frames decoded from {path}")
    while len(frames) < FRAME_COUNT:
        frames.append(frames[len(frames) % len(frames)].copy())
    return frames[:FRAME_COUNT]


def smoothstep(edge0: float, edge1: float, value: np.ndarray) -> np.ndarray:
    t = np.clip((value - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def remove_baked_readout(frame: Image.Image) -> Image.Image:
    """Cover only the central UI while retaining the surrounding orb image."""
    source = np.asarray(frame).astype(np.float32)
    yy, xx = np.mgrid[0:HEIGHT, 0:WIDTH]

    # Sample dark interior pixels around the readout instead of assuming black.
    sample_regions = np.concatenate([
        source[252:284, 290:430].reshape(-1, 3),
        source[500:530, 290:430].reshape(-1, 3),
        source[320:474, 250:278].reshape(-1, 3),
        source[320:474, 442:470].reshape(-1, 3),
    ])
    sample_regions = sample_regions[np.max(sample_regions, axis=1) < 45]
    plate_colour = np.percentile(sample_regions, 46, axis=0) if len(sample_regions) else np.array([2, 3, 7])

    # A small vertical lighting drift keeps the replacement plate from reading
    # as a flat black sticker on top of the glass.
    vertical = np.clip((yy - 280) / 230, 0.0, 1.0)[..., None]
    plate = plate_colour[None, None, :] * (1.08 - vertical * 0.16)

    radius = np.sqrt(((xx - 360) / 118.0) ** 2 + ((yy - 396) / 154.0) ** 2)
    alpha = 1.0 - smoothstep(0.74, 1.0, radius)
    # Guarantee full removal across the brightest glyph cores.
    core = (((xx - 360) / 84.0) ** 2 + ((yy - 396) / 132.0) ** 2) <= 1.0
    alpha[core] = 1.0
    alpha = alpha[..., None]

    clean = source * (1.0 - alpha) + plate * alpha
    return Image.fromarray(np.clip(clean, 0, 255).astype(np.uint8), "RGB")


def text_layer(
    text: str,
    font: ImageFont.FreeTypeFont,
    center: tuple[int, int],
    opacity: float = 1.0,
    y_offset: float = 0.0,
    fill: tuple[int, int, int] = (244, 245, 246),
) -> Image.Image:
    scale = 4
    layer = Image.new("RGBA", (WIDTH * scale, HEIGHT * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    cx, cy = center
    draw.text(
        (cx * scale, (cy + y_offset) * scale),
        text,
        font=font,
        anchor="mm",
        fill=(*fill, round(255 * opacity)),
        stroke_width=0,
    )
    return layer.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)


def compose_readout(frame: Image.Image, index: int) -> Image.Image:
    canvas = frame.convert("RGBA")
    number_font = ImageFont.truetype(str(FONT_NUMBER), 132 * 4)
    unit_font = ImageFont.truetype(str(FONT_UNIT), 29 * 4)

    value = min(10, index // 5)
    phase = index % 5

    # Keep one legible value on screen at all times. Each new integer settles
    # upward over two frames; no outgoing digit is layered behind it.
    if value > 0 and phase < 2:
        progress = (phase + 1) / 2.0
        eased = progress * progress * (3.0 - 2.0 * progress)
        canvas = Image.alpha_composite(
            canvas,
            text_layer(str(value), number_font, NUMBER_CENTER, 0.72 + eased * 0.28, 10.0 * (1.0 - eased)),
        )
    else:
        canvas = Image.alpha_composite(canvas, text_layer(str(value), number_font, NUMBER_CENTER))

    # Stable unit label: low contrast and independent of the digit transition.
    canvas = Image.alpha_composite(
        canvas,
        text_layer("km/h", unit_font, UNIT_CENTER, 0.72, fill=(152, 157, 162)),
    )
    return canvas.convert("RGB")


def encode(frames: list[Image.Image], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="orb-article-motion-") as tmp_dir:
        tmp = Path(tmp_dir)
        for index, frame in enumerate(frames):
            frame.save(tmp / f"frame-{index:03d}.png", compress_level=2)
        command = [
            "ffmpeg", "-y", "-v", "error",
            "-framerate", str(FPS),
            "-i", str(tmp / "frame-%03d.png"),
            "-t", "2",
            "-c:v", "libx264",
            "-preset", "slow",
            "-crf", "14",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            str(output),
        ]
        subprocess.run(command, check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--poster", type=Path)
    args = parser.parse_args()

    frames = decode_frames(args.source)
    finished = [compose_readout(remove_baked_readout(frame), index) for index, frame in enumerate(frames)]
    encode(finished, args.output)
    if args.poster:
        args.poster.parent.mkdir(parents=True, exist_ok=True)
        finished[-1].save(args.poster, compress_level=2)


if __name__ == "__main__":
    main()
