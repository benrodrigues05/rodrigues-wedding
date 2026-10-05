"""Put a photo inside the embroidered arch and write site/assets/hero-arch.webp.

    python3 -m pip install numpy pillow        # once
    python3 tools/make_hero.py                 # uses tools/source/couple.jpg
    python3 tools/make_hero.py path/to/photo.jpg --span 225 1040

--span is the left and right edge of the couple in the photo, in the photo's
own pixels, so they end up centred in the arch. The photo is scaled so its
full height fills the opening; portrait photos work best.
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "source"
OUT = HERE.parent / "site" / "assets" / "hero-arch.webp"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("photo", nargs="?", default=str(SOURCE / "couple.jpg"))
    ap.add_argument("--span", nargs=2, type=int, default=[225, 1040], metavar=("LEFT", "RIGHT"))
    args = ap.parse_args()

    frame = Image.open(SOURCE / "arch-frame.png").convert("RGBA")
    W, H = frame.size
    window = np.load(SOURCE / "arch-window.npz")["window"]

    # Fill each row between its outermost opening pixels so the photo also runs
    # behind the pearl wisteria, then tuck it ~8px under the stonework.
    filled = np.zeros_like(window)
    for y in range(H):
        xs = np.where(window[y])[0]
        if len(xs):
            filled[y, xs.min(): xs.max() + 1] = True
    mask = Image.fromarray((filled * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(17))
    mask = np.array(mask) > 127

    ys, xs = np.where(window)
    wx0, wx1, wy0, wy1 = xs.min(), xs.max(), ys.min(), ys.max()
    photo = Image.open(args.photo).convert("RGB")
    scale = (wy1 - wy0 + 1) / photo.height
    photo = photo.resize((round(photo.width * scale), round(photo.height * scale)), Image.LANCZOS)
    centre = (args.span[0] + args.span[1]) / 2 * scale
    left = round((wx0 + wx1) / 2 - centre)

    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.paste(photo, (left, wy0))
    alpha = np.where(mask, np.array(layer.getchannel("A")), 0).astype(np.uint8)
    layer.putalpha(Image.fromarray(alpha))
    hero = Image.alpha_composite(layer, frame)

    hero = hero.resize((1000, round(H * 1000 / W)), Image.LANCZOS)
    box = np.where(np.array(hero.getchannel("A")) > 10)
    y0, y1, x0, x1 = box[0].min(), box[0].max(), box[1].min(), box[1].max()
    hero = hero.crop((max(x0 - 4, 0), max(y0 - 4, 0), min(x1 + 5, hero.width), min(y1 + 5, hero.height)))
    hero.save(OUT, "WEBP", quality=80, method=6)
    print(f"wrote {OUT} ({hero.width}x{hero.height}); index.html expects 974x1499")


if __name__ == "__main__":
    main()
