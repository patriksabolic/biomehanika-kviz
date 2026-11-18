"""Provjera svih JSON datoteka s pitanjima (spec, odjeljak 17).

Pokretanje iz mape projekta:  python tools/validate.py
Izlazni kod 0 = sve u redu, 1 = ima grešaka.
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = Path(__file__).resolve().parent.parent
COURSE_DIR = ROOT / "content" / "biomehanika"
QUESTIONS_DIR = COURSE_DIR / "questions"

TYPES = {"mc", "fill", "image-label", "order", "match"}
MODES = {"mc", "fill"}
TAGS = {"brojka", "formula", "definicija", "podjela", "funkcija", "povijest", "skica", "racun", "usporedba"}
ID_RE = re.compile(r"^bm-(\d{2}|k)-\d{3}$")
REQUIRED = ["id", "chapter", "type", "prompt", "explanation", "image", "explanation_image", "source", "tags", "real_exam"]

errors = []
warnings = []


def err(where, msg):
    errors.append(f"{where}: {msg}")


def warn(where, msg):
    warnings.append(f"{where}: {msg}")


def normalize(s):
    """Isto kao normalize() u js/grading.js (spec, odjeljak 5)."""
    s = str(s).lower().strip()
    for a, b in (("đ", "d"), ("č", "c"), ("ć", "c"), ("š", "s"), ("ž", "z")):
        s = s.replace(a, b)
    s = re.sub(r"[–—−]", "-", s)
    s = re.sub(r"[^\w\s.,\-/%]|_", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"(\d),(\d)", r"\1.\2", s)
    return s


def check_answer_block(where, answer, accepted, distractors):
    if not isinstance(answer, str) or not answer.strip():
        err(where, "'answer' je prazan")
        return
    if not isinstance(accepted, list) or not all(isinstance(a, str) and a.strip() for a in accepted):
        err(where, "'accepted' mora biti popis nepraznih tekstova")
        accepted = []
    elif answer not in accepted:
        err(where, f"'accepted' ne sadrži answer '{answer}'")
    if not isinstance(distractors, list) or len(distractors) != 3:
        err(where, "'distractors' mora imati točno 3 stavke")
        return
    if not all(isinstance(d, str) and d.strip() for d in distractors):
        err(where, "distraktor je prazan")
        return
    nd = [normalize(d) for d in distractors]
    if len(set(nd)) != 3:
        err(where, "distraktori se ponavljaju")
    correct = {normalize(answer)} | {normalize(a) for a in accepted}
    for d, n in zip(distractors, nd):
        if n in correct:
            err(where, f"distraktor '{d}' jednak je točnom odgovoru")


def check_image(where, field, value):
    if value is None:
        return
    if not isinstance(value, str) or not value:
        err(where, f"'{field}' mora biti null ili putanja")
        return
    if not (COURSE_DIR / value).is_file():
        err(where, f"slika ne postoji: {value}")


def check_question(q, where, chapters, file_name):
    if not isinstance(q, dict):
        err(where, "pitanje nije objekt")
        return None
    for f in REQUIRED:
        if f not in q:
            err(where, f"nedostaje polje '{f}'")
    qid = q.get("id")
    if not isinstance(qid, str) or not ID_RE.match(qid):
        err(where, f"neispravan id '{qid}' (oblik bm-<nn>-<nnn> ili bm-k-<nnn>)")
    where = f"{file_name} [{qid}]"

    ch = q.get("chapter")
    if ch not in chapters:
        err(where, f"poglavlje '{ch}' ne postoji u course.json")
    elif isinstance(qid, str) and ID_RE.match(qid) and not qid.startswith("bm-k-") and qid[3:5] != ch:
        warn(where, f"id ne odgovara poglavlju {ch}")

    qtype = q.get("type")
    if qtype not in TYPES:
        err(where, f"nepoznat type '{qtype}'")

    prompt = q.get("prompt")
    if not isinstance(prompt, str) or not prompt.strip():
        err(where, "'prompt' je prazan")
        prompt = ""

    if qtype in ("mc", "fill"):
        modes = q.get("modes")
        if not isinstance(modes, list) or not modes or not set(modes) <= MODES or len(set(modes)) != len(modes):
            err(where, f"neispravan 'modes' {modes}")
        else:
            if qtype not in modes:
                err(where, f"type '{qtype}' nije u modes {modes}")
            if "fill" in modes and "___" not in prompt:
                err(where, "pitanje s 'fill' u modes nema prazninu ___ u promptu")
        check_answer_block(where, q.get("answer"), q.get("accepted"), q.get("distractors"))
    elif qtype == "image-label":
        if not q.get("image"):
            err(where, "image-label mora imati 'image'")
        labels = q.get("labels")
        if not isinstance(labels, list) or not labels:
            err(where, "image-label mora imati popis 'labels'")
        else:
            ns = []
            for i, lab in enumerate(labels):
                lw = f"{where} oznaka {i + 1}"
                if not isinstance(lab, dict):
                    err(lw, "oznaka nije objekt")
                    continue
                ns.append(lab.get("n"))
                for c in ("x", "y"):
                    v = lab.get(c)
                    if not isinstance(v, (int, float)) or not 0 <= v <= 100:
                        err(lw, f"'{c}' mora biti postotak 0–100")
                check_answer_block(lw, lab.get("answer"), lab.get("accepted"), lab.get("distractors"))
            if len(set(ns)) != len(ns):
                err(where, "brojevi oznaka 'n' se ponavljaju")
    elif qtype == "order":
        items = q.get("items")
        if not isinstance(items, list) or len(items) < 2 or not all(isinstance(i, str) and i.strip() for i in items):
            err(where, "order mora imati 'items' s barem 2 stavke")
    elif qtype == "match":
        pairs = q.get("pairs")
        if not isinstance(pairs, list) or len(pairs) < 2 or not all(
            isinstance(p, dict) and str(p.get("left", "")).strip() and str(p.get("right", "")).strip() for p in pairs
        ):
            err(where, "match mora imati 'pairs' s barem 2 para {left, right}")

    expl = q.get("explanation")
    if not isinstance(expl, str) or len(expl.strip()) < 10 or not re.search(r"[.!?]", expl):
        err(where, "'explanation' mora imati barem jednu rečenicu")

    check_image(where, "image", q.get("image"))
    check_image(where, "explanation_image", q.get("explanation_image"))

    src = q.get("source")
    if not isinstance(src, str) or not src.strip():
        err(where, "'source' je prazan")

    tags = q.get("tags")
    if not isinstance(tags, list) or not tags:
        err(where, "'tags' mora biti neprazan popis")
    else:
        bad = [t for t in tags if t not in TAGS]
        if bad:
            err(where, f"nepoznate oznake {bad}")

    re_ = q.get("real_exam")
    if not isinstance(re_, bool):
        err(where, "'real_exam' mora biti true/false")
    elif file_name.startswith("00-") and not re_:
        err(where, "pitanja s kolokvija moraju imati real_exam: true")
    elif not file_name.startswith("00-") and re_:
        warn(where, "real_exam: true izvan datoteke s kolokvija")
    return qid


def main():
    course_path = COURSE_DIR / "course.json"
    try:
        course = json.loads(course_path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"GREŠKA: ne mogu pročitati {course_path}: {e}")
        return 1

    chapters = {c["id"]: c for c in course.get("chapters", [])}
    areas = {a["id"]: a for a in course.get("areas", [])}
    if len(chapters) != 35:
        err("course.json", f"očekivano 35 poglavlja, ima {len(chapters)}")
    for c in chapters.values():
        if c.get("area") not in areas:
            err("course.json", f"poglavlje {c['id']} ima nepostojeće područje '{c.get('area')}'")
    in_areas = [ch for a in areas.values() for ch in a.get("chapters", [])]
    if sorted(in_areas) != sorted(chapters):
        err("course.json", "popisi poglavlja u 'areas' i 'chapters' se ne poklapaju")
    for a in areas.values():
        for ch in a.get("chapters", []):
            if ch in chapters and chapters[ch].get("area") != a["id"]:
                err("course.json", f"poglavlje {ch} je u području {a['id']}, a ima area '{chapters[ch].get('area')}'")

    listed = course.get("questionFiles", [])
    files = sorted(p for p in QUESTIONS_DIR.glob("*.json"))
    for name in listed:
        if not (QUESTIONS_DIR / name).is_file():
            err("course.json", f"questionFiles navodi nepostojeću datoteku {name}")
    for p in files:
        if p.name not in listed:
            err("course.json", f"datoteka {p.name} nije navedena u questionFiles (app je neće učitati)")

    seen_ids = {}
    per_chapter = Counter()
    real = 0
    total = 0
    for p in files:
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except Exception as e:
            err(p.name, f"neispravan JSON: {e}")
            continue
        if not isinstance(data, list):
            err(p.name, "datoteka mora sadržavati JSON polje (popis pitanja)")
            continue
        for i, q in enumerate(data):
            qid = check_question(q, f"{p.name} #{i + 1}", chapters, p.name)
            if qid is None:
                continue
            if qid in seen_ids:
                err(p.name, f"id {qid} već postoji u {seen_ids[qid]}")
            seen_ids[qid] = p.name
            total += 1
            if isinstance(q.get("chapter"), str):
                per_chapter[q["chapter"]] += 1
            if q.get("real_exam") is True:
                real += 1

    print("Pitanja po poglavlju:")
    for cid in sorted(chapters):
        n = per_chapter.get(cid, 0)
        if n:
            print(f"  {cid} {chapters[cid]['title']}: {n}")
    empty = [cid for cid in sorted(chapters) if not per_chapter.get(cid)]
    if empty:
        print(f"  bez pitanja: {', '.join(empty)}")
    print(f"Ukupno: {total} pitanja ({real} s kolokvija) u {len(files)} datoteka.")

    for w in warnings:
        print(f"UPOZORENJE  {w}")
    for e in errors:
        print(f"GREŠKA      {e}")
    if errors:
        print(f"\nNeuspjeh: {len(errors)} grešaka.")
        return 1
    print("\nSve u redu – nema grešaka.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
