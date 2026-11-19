"""Izrez slike sa slajda kolegija za pitanja i objašnjenja (spec, odjeljak 16 "Slike").

Treba paket PyMuPDF (python -m pip install pymupdf).

1) Pregled slajda s mrežom (da se odrede koordinate izreza), sprema se u zadanu datoteku:
   python tools/crop_slide.py --course biomehanika --chapter 07 --slide 5 --grid pregled.png

2) Izrez (koordinate su udjeli širine/visine slajda, 0–1: lijevo gore desno dolje):
   python tools/crop_slide.py --course biomehanika --chapter 07 --slide 5 \
       --box 0.05 0.20 0.60 0.95 --out 07-gradja-kosti
   --mask x0 y0 x1 y1   (više puta) prekrije dio slajda bijelim pravokutnikom
                        (npr. traženi pojam ili broj u slici uz pitanje)
   Rezultat: content/<id>/img/<out>.png, render 300 dpi, najviše 1200 px širine.

Alat ispisuje veličinu slike i procjenu veličine najsitnijeg teksta na mobitelu
(slika se na zaslonu širine 412 px prikazuje ~360 px široko). Ako je tekst sitniji
od ~9 px, izreži uže. Procjena vrijedi samo za tekst koji je na slajdu kao tekst,
ne za tekst unutar ugrađenih slika – njih treba pogledati.
"""
import argparse
import json
import re
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

try:
    import pymupdf as fitz
except ImportError:
    print("Nedostaje paket PyMuPDF. Instaliraj ga naredbom:  python -m pip install pymupdf")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
MAX_W = 1200
DPI = 300
PHONE_W = 360  # px širine slike na zaslonu od 412 px (rubovi kartice i slike)
MIN_TEXT_PX = 9


def find_pdf(course, chapter):
    pdf_dir = ROOT / "content" / "source" / course / "pdf"
    for p in sorted(pdf_dir.glob("*.pdf")):
        m = re.match(r"^(\d{1,2})(?=[ _.\-])", p.name)
        if m and f"{int(m.group(1)):02d}" == chapter:
            return p
    return None


def frac_rect(page, box):
    r = page.rect
    x0, y0, x1, y1 = box
    if not (0 <= x0 < x1 <= 1 and 0 <= y0 < y1 <= 1):
        raise ValueError(f"neispravan pravokutnik {box} (udjeli 0–1, lijevo < desno, gore < dolje)")
    return fitz.Rect(r.x0 + x0 * r.width, r.y0 + y0 * r.height, r.x0 + x1 * r.width, r.y0 + y1 * r.height)


def grid(page, out):
    r = page.rect
    shape = page.new_shape()
    for i in range(1, 20):
        f = i / 20
        major = i % 2 == 0
        shape.draw_line((r.x0 + f * r.width, r.y0), (r.x0 + f * r.width, r.y1))
        shape.finish(color=(1, 0, 0) if major else (1, 0.7, 0.7), width=0.6 if major else 0.3)
        shape.draw_line((r.x0, r.y0 + f * r.height), (r.x1, r.y0 + f * r.height))
        shape.finish(color=(1, 0, 0) if major else (1, 0.7, 0.7), width=0.6 if major else 0.3)
    shape.commit()
    for i in range(1, 10):
        f = i / 10
        page.insert_text((r.x0 + f * r.width + 1, r.y0 + 8), f"{f:.1f}", fontsize=7, color=(1, 0, 0))
        page.insert_text((r.x0 + 1, r.y0 + f * r.height - 1), f"{f:.1f}", fontsize=7, color=(1, 0, 0))
    page.get_pixmap(dpi=110).save(out)
    print(f"Pregled s mrežom: {out}  (crvene crte svakih 0,1, svijetle svakih 0,05)")


def smallest_text(page, clip, masks):
    sizes = []
    for b in page.get_text("dict", clip=clip).get("blocks", []):
        for ln in b.get("lines", []):
            for sp in ln.get("spans", []):
                if not sp.get("text", "").strip():
                    continue
                bb = fitz.Rect(sp["bbox"])
                if not bb.intersects(clip) or any(bb.intersects(m) for m in masks):
                    continue
                sizes.append(sp["size"])
    return min(sizes) if sizes else None


def main():
    ap = argparse.ArgumentParser(description="Izrez slike sa slajda (300 dpi, max 1200 px).")
    ap.add_argument("--course", required=True)
    ap.add_argument("--chapter", required=True, help="id poglavlja, npr. 07")
    ap.add_argument("--slide", required=True, type=int, help="broj slajda (od 1)")
    ap.add_argument("--grid", help="spremi pregled slajda s mrežom u ovu datoteku")
    ap.add_argument("--box", nargs=4, type=float, metavar=("X0", "Y0", "X1", "Y1"))
    ap.add_argument("--mask", nargs=4, type=float, action="append", default=[], metavar=("X0", "Y0", "X1", "Y1"))
    ap.add_argument("--out", help="naziv bez nastavka, npr. 07-gradja-kosti → img/07-gradja-kosti.png")
    ap.add_argument("--force", action="store_true", help="prepiši postojeću datoteku")
    a = ap.parse_args()

    courses = json.loads((ROOT / "content" / "courses.json").read_text(encoding="utf-8"))
    if a.course not in [c["id"] for c in courses]:
        print(f"Nepoznat kolegij: {a.course}")
        return 1
    pdf = find_pdf(a.course, a.chapter)
    if not pdf:
        print(f"Nema PDF-a za poglavlje {a.chapter}")
        return 1
    doc = fitz.open(pdf)
    if not 1 <= a.slide <= doc.page_count:
        print(f"{pdf.name} ima {doc.page_count} slajdova")
        return 1
    page = doc[a.slide - 1]

    if a.grid:
        grid(page, a.grid)
        return 0
    if not (a.box and a.out):
        print("Za izrez trebaju --box i --out (ili --grid za pregled).")
        return 1
    if not re.fullmatch(r"[0-9a-z][0-9a-z\-]*", a.out):
        print("--out: mala slova bez dijakritika, brojke i crtice, npr. 07-gradja-kosti")
        return 1
    out = ROOT / "content" / a.course / "img" / f"{a.out}.png"
    if out.exists() and not a.force:
        print(f"Već postoji: {out.relative_to(ROOT)} (--force za prepisivanje)")
        return 1
    clip = frac_rect(page, a.box)
    masks = [frac_rect(page, m) for m in a.mask]
    small = smallest_text(page, clip, masks)  # prije prekrivanja (tekst ostaje u sloju)
    if masks:
        shape = page.new_shape()
        for m in masks:
            shape.draw_rect(m)
            shape.finish(color=(1, 1, 1), fill=(1, 1, 1), width=0)
        shape.commit()
    zoom = min(DPI / 72, (MAX_W - 1) / clip.width)  # -1: zaokruživanje ne smije dati 1201 px
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), clip=clip, alpha=False)
    out.parent.mkdir(parents=True, exist_ok=True)
    pix.save(out)
    print(f"Spremljeno: {out.relative_to(ROOT)}  {pix.width}×{pix.height} px  ({zoom * 72:.0f} dpi)")
    print(f"Izvor: {pdf.name}, slajd {a.slide}")
    if small:
        px = small * PHONE_W / clip.width if pix.width >= PHONE_W else small * zoom
        flag = "  ← PREMALO, izreži uže" if px < MIN_TEXT_PX else ""
        print(f"Najsitniji tekst na mobitelu ≈ {px:.1f} px{flag}")
    else:
        print("Nema tekstualnog sloja u izrezu – čitljivost provjeri gledanjem slike.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
