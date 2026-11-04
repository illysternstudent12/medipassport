"""Generate the home-screen app icons (PNG) from the MediPassport mark.
Run from the project root:  python tools/make_icons.py   (needs Pillow)"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "assets" / "icons"
CREAM, BLACK, MINT, PEACH = (251, 243, 235), (0, 0, 0), (193, 222, 186), (231, 196, 177)


def mark(size, maskable=False):
    s = size * 4  # supersample
    im = Image.new("RGB", (s, s), CREAM if maskable else BLACK)
    d = ImageDraw.Draw(im)
    c = s / 2
    r = s * (0.36 if maskable else 0.5)  # maskable keeps the mark inside the safe zone
    if maskable:
        d.ellipse([c - r, c - r, c + r, c + r], fill=BLACK)
    k = r / 16  # the 32-unit favicon drawing, scaled
    for dx, dy, rx, ry in ((0, -6.4, 3.7, 5.4), (0, 6.4, 3.7, 5.4), (-6.4, 0, 5.4, 3.7), (6.4, 0, 5.4, 3.7)):
        x, y = c + dx * k, c + dy * k
        d.ellipse([x - rx * k, y - ry * k, x + rx * k, y + ry * k], fill=MINT)
    d.ellipse([c - 2.4 * k, c - 2.4 * k, c + 2.4 * k, c + 2.4 * k], fill=PEACH)
    return im.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    mark(192, True).save(OUT / "icon-192.png")
    mark(512, True).save(OUT / "icon-512.png")
    mark(512, True).save(OUT / "icon-maskable-512.png")
    mark(180, True).save(OUT / "apple-touch-icon.png")
    print(sorted(p.name for p in OUT.iterdir()))
