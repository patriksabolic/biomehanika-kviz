"""PDF prezentacije → tekst i slike (spec, odjeljak 17).

Pokretanje iz mape projekta:  python tools/extract_pdf.py --course <id>
                              npr. python tools/extract_pdf.py --course biomehanika
Treba paket PyMuPDF:          python -m pip install pymupdf

Za svaki PDF u content/source/<id>/pdf/ (naziv počinje brojem poglavlja, npr. "7_Kosti 1.pdf"):
  - content/source/<id>/text/<nn>.md     tekst po slajdu, naslov "## Slajd N"
  - content/source/<id>/img-raw/<nn>/    ugrađene slike (s<N>-<k>.<ext>) + render svakog slajda
                                         na 150 dpi (slajd-<N>.png) kao rezerva
Opcija --no-images preskače slike (brže, samo tekst).
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
    import pymupdf as fitz  # PyMuPDF
except ImportError:
    print("Nedostaje paket PyMuPDF. Instaliraj ga naredbom:  python -m pip install pymupdf")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
# Postavlja main() prema --course.
PDF_DIR = TEXT_DIR = IMG_DIR = None
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
    global PDF_DIR, TEXT_DIR, IMG_DIR
    try:
        courses = json.loads((ROOT / "content" / "courses.json").read_text(encoding="utf-8"))
    except Exception as e:
        print(f"Ne mogu pročitati content/courses.json: {e}")
        return 1
    ids = [c["id"] for c in courses]
    ap = argparse.ArgumentParser(description="PDF prezentacije → tekst i slike.")
    ap.add_argument("--course", required=True, choices=ids, help="id kolegija iz content/courses.json")
    ap.add_argument("--no-images", action="store_true", help="samo tekst, bez slika")
    args = ap.parse_args()
    with_images = not args.no_images
    src = ROOT / "content" / "source" / args.course
    PDF_DIR, TEXT_DIR, IMG_DIR = src / "pdf", src / "text", src / "img-raw"
    entry = next(c for c in courses if c["id"] == args.course)
    try:
        course = json.loads((ROOT / entry["path"][2:] / "course.json").read_text(encoding="utf-8"))
        expected = [c["id"] for c in course.get("chapters", [])]
    except Exception:
        expected = []
    TEXT_DIR.mkdir(parents=True, exist_ok=True)
    pdfs = sorted(PDF_DIR.glob("*.pdf"), key=lambda p: (chapter_id(p) or "99", p.name))
    if not pdfs:
        print(f"Nema PDF-ova u {PDF_DIR}")
        return 1
    done = set()
    for p in pdfs:
        nn = chapter_id(p)
        if not nn:
            print(f"PRESKAČEM (naziv ne počinje brojem poglavlja, npr. \"3_Naslov.pdf\"): {p.name}")
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
    # Ako course.json još nema poglavlja (novi kolegij), ne javlja se što nedostaje.
    missing = [nn for nn in expected if nn not in done]
    print(f"\nGotovo: {len(done)} poglavlja u {TEXT_DIR.relative_to(ROOT)}")
    if missing:
        print("Nedostaju poglavlja: " + ", ".join(missing))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
