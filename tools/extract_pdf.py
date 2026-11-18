"""PDF prezentacije → tekst i slike (spec, odjeljak 17).

Pokretanje iz mape projekta:  python tools/extract_pdf.py
Treba paket PyMuPDF:          python -m pip install pymupdf

Za svaki PDF u content/source/pdf/ (naziv počinje brojem poglavlja, npr. "7_Kosti 1.pdf"):
  - content/source/text/<nn>.md        tekst po slajdu, naslov "## Slajd N"
  - content/source/img-raw/<nn>/       ugrađene slike (s<N>-<k>.<ext>) + render svakog slajda
                                       na 150 dpi (slajd-<N>.png) kao rezerva
Opcija --no-images preskače slike (brže, samo tekst).
"""
import re
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

try:
    import pymupdf as fitz  # PyMuPDF
except ImportError:
    print("Nedostaje paket PyMuPDF. Instaliraj ga naredbom:  python -m pip install pymupdf")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "content" / "source"
PDF_DIR = SRC / "pdf"
TEXT_DIR = SRC / "text"
IMG_DIR = SRC / "img-raw"
MIN_IMG_SIDE = 80  # manje slike su obično ikone i ukrasi


def chapter_id(path):
    m = re.match(r"^(\d{1,2})_", path.name)
    return f"{int(m.group(1)):02d}" if m else None


def clean(text):
    text = text.replace("­", "").replace("\r", "")
    lines = [ln.rstrip() for ln in text.split("\n")]
    out = []
    for ln in lines:
        if not ln.strip():
            if out and out[-1] != "":
                out.append("")
            continue
        out.append(ln.strip())
    return "\n".join(out).strip()


def extract(pdf_path, nn, with_images):
    doc = fitz.open(pdf_path)
    parts = [f"# {nn} – {pdf_path.stem}", "", f"Izvor: {pdf_path.name} ({doc.page_count} slajdova)", ""]
    img_out = IMG_DIR / nn
    n_imgs = 0
    if with_images:
        img_out.mkdir(parents=True, exist_ok=True)
    for i, page in enumerate(doc, start=1):
        parts.append(f"## Slajd {i}")
        parts.append("")
        parts.append(clean(page.get_text("text")) or "(bez teksta)")
        parts.append("")
        if not with_images:
            continue
        seen = set()
        for k, info in enumerate(page.get_images(full=True), start=1):
            xref = info[0]
            if xref in seen:
                continue
            seen.add(xref)
            try:
                img = doc.extract_image(xref)
            except Exception:
                continue
            if min(img.get("width", 0), img.get("height", 0)) < MIN_IMG_SIDE:
                continue
            (img_out / f"s{i}-{k}.{img['ext']}").write_bytes(img["image"])
            n_imgs += 1
        page.get_pixmap(dpi=150).save(img_out / f"slajd-{i}.png")
    (TEXT_DIR / f"{nn}.md").write_text("\n".join(parts).rstrip() + "\n", encoding="utf-8")
    pages = doc.page_count
    doc.close()
    return pages, n_imgs


def main():
    with_images = "--no-images" not in sys.argv
    TEXT_DIR.mkdir(parents=True, exist_ok=True)
    pdfs = sorted(PDF_DIR.glob("*.pdf"), key=lambda p: (chapter_id(p) or "99", p.name))
    if not pdfs:
        print(f"Nema PDF-ova u {PDF_DIR}")
        return 1
    done = set()
    for p in pdfs:
        nn = chapter_id(p)
        if not nn:
            print(f"PRESKAČEM (naziv ne počinje brojem): {p.name}")
            continue
        if nn in done:
            print(f"UPOZORENJE: više PDF-ova za poglavlje {nn}, zadnji pobjeđuje: {p.name}")
        try:
            pages, imgs = extract(p, nn, with_images)
        except Exception as e:
            print(f"GREŠKA {p.name}: {e}")
            continue
        done.add(nn)
        print(f"{nn}  {pages:3d} slajdova  {imgs:3d} slika  ← {p.name}")
    missing = [f"{i:02d}" for i in range(1, 36) if f"{i:02d}" not in done]
    print(f"\nGotovo: {len(done)} poglavlja u {TEXT_DIR.relative_to(ROOT)}")
    if missing:
        print("Nedostaju poglavlja: " + ", ".join(missing))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
