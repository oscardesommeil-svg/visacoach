"""Génère les icônes PWA de VisaCoach (à exécuter une fois).

Produit, dans frontend/public/ :
  - icons/icon-{size}.png  (toutes les tailles du manifest)
  - apple-touch-icon.png   (180x180)
  - favicon.ico            (multi-tailles)
  - screenshots/home.png   (capture placeholder 390x844)

Design : carré bleu #1434A4 arrondi + coche blanche (cohérent avec favicon.svg).
Dépendance : Pillow  ->  pip install Pillow
"""

import os

from PIL import Image, ImageDraw

BLUE = "#1434A4"
GOLD = "#F7B731"
WHITE = "#FFFFFF"

SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

# frontend/public, quel que soit le répertoire d'exécution.
ROOT = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(ROOT, "..", "frontend", "public")
ICONS_DIR = os.path.join(PUBLIC, "icons")
SHOTS_DIR = os.path.join(PUBLIC, "screenshots")


def make_icon(size: int) -> Image.Image:
    """Carré bleu arrondi avec une coche blanche centrée."""
    # Supersampling x4 pour des bords lisses.
    scale = 4
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    radius = int(s * 0.22)
    draw.rounded_rectangle([0, 0, s - 1, s - 1], radius=radius, fill=BLUE)

    # Coche blanche : points du favicon.svg (grille 64) remis à l'échelle.
    pts = [(20, 33), (28, 41), (44, 23)]
    scaled = [(x / 64 * s, y / 64 * s) for (x, y) in pts]
    width = max(2, int(s * 0.085))
    draw.line(scaled, fill=WHITE, width=width, joint="curve")
    # Embouts arrondis.
    r = width / 2
    for (x, y) in (scaled[0], scaled[-1]):
        draw.ellipse([x - r, y - r, x + r, y + r], fill=WHITE)

    return img.resize((size, size), Image.LANCZOS)


def make_screenshot() -> Image.Image:
    """Capture placeholder 390x844 évoquant la page d'accueil."""
    w, h = 390, 844
    img = Image.new("RGB", (w, h), WHITE)
    draw = ImageDraw.Draw(img)
    # En-tête bleu
    draw.rectangle([0, 0, w, 64], fill=BLUE)
    # Hero bleu
    draw.rectangle([0, 64, w, 360], fill=BLUE)
    # Bouton or (CTA)
    draw.rounded_rectangle([28, 280, 230, 324], radius=10, fill=GOLD)
    # Carte score blanche
    draw.rounded_rectangle([28, 120, 362, 250], radius=14, fill=WHITE)
    draw.rounded_rectangle([48, 210, 342, 226], radius=8, fill=GOLD)
    # Lignes de contenu grises
    grey = (221, 227, 245)
    for i in range(4):
        y = 410 + i * 70
        draw.rounded_rectangle([28, y, 362, y + 48], radius=10, fill=grey)
    return img


def main() -> None:
    os.makedirs(ICONS_DIR, exist_ok=True)
    os.makedirs(SHOTS_DIR, exist_ok=True)

    for size in SIZES:
        icon = make_icon(size)
        icon.save(os.path.join(ICONS_DIR, f"icon-{size}x{size}.png"))
        print(f"OK  icon-{size}x{size}.png")

    # apple-touch-icon (180x180)
    make_icon(180).save(os.path.join(PUBLIC, "apple-touch-icon.png"))
    print("OK  apple-touch-icon.png")

    # favicon.ico multi-tailles
    make_icon(64).save(
        os.path.join(PUBLIC, "favicon.ico"),
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
    )
    print("OK  favicon.ico")

    # screenshot
    make_screenshot().save(os.path.join(SHOTS_DIR, "home.png"))
    print("OK  screenshots/home.png")

    print("Toutes les icônes PWA sont générées !")


if __name__ == "__main__":
    main()
