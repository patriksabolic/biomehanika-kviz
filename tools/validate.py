"""Provjera svih JSON datoteka s pitanjima (spec, odjeljak 17).

Pokretanje iz mape projekta:
  python tools/validate.py                        svi kolegiji iz content/courses.json
  python tools/validate.py --course biomehanika   samo jedan kolegij
Izlazni kod 0 = sve u redu, 1 = ima grešaka.
ID-ovi pitanja moraju biti jedinstveni u cijeloj aplikaciji, pa se i s --course
provjerava sukob ID-ova i prefiksa s ostalim kolegijima.
"""
import argparse
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
CONTENT = ROOT / "content"

TYPES = {"mc", "fill", "image-label", "order", "match"}
MODES = {"mc", "fill"}
TAGS = {"brojka", "formula", "definicija", "podjela", "funkcija", "povijest", "skica", "racun", "usporedba"}
REQUIRED = ["id", "chapter", "type", "prompt", "explanation", "image", "explanation_image", "source", "tags", "real_exam"]
COURSE_ID_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
PREFIX_RE = re.compile(r"^[a-z]{2,4}$")

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
    s = s.replace("µ", "μ")
    s = re.sub(r"[^\w\s.,\-/%]|_", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"(\d),(\d)", r"\1.\2", s)
    return s


def course_dir_of(entry):
    path = str(entry.get("path", ""))
    if not path.startswith("./content/"):
        return None
    return ROOT / path[2:]


def read_course(entry):
    d = course_dir_of(entry)
    if d is None:
        return None
    try:
        return json.loads((d / "course.json").read_text(encoding="utf-8"))
    except Exception:
        return None


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


def check_image(where, field, value, course_dir):
    if value is None:
        return
    if not isinstance(value, str) or not value:
        err(where, f"'{field}' mora biti null ili putanja")
        return
    if not (course_dir / value).is_file():
        err(where, f"slika ne postoji: {value}")


def check_question(q, where, chapters, file_name, cfg):
    prefix, id_re, course_dir = cfg["prefix"], cfg["id_re"], cfg["dir"]
    if not isinstance(q, dict):
        err(where, "pitanje nije objekt")
        return None
    for f in REQUIRED:
        if f not in q:
            err(where, f"nedostaje polje '{f}'")
    qid = q.get("id")
    if not isinstance(qid, str) or not id_re.match(qid):
        err(where, f"neispravan id '{qid}' (oblik {prefix}-<nn>-<nnn> ili {prefix}-k-<nnn>)")
    where = f"{cfg['id']}/{file_name} [{qid}]"

    ch = q.get("chapter")
    if ch not in chapters:
        err(where, f"poglavlje '{ch}' ne postoji u course.json")
    elif isinstance(qid, str) and id_re.match(qid) and qid.split("-")[1] not in ("k", ch):
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

    check_image(where, "image", q.get("image"), course_dir)
    check_image(where, "explanation_image", q.get("explanation_image"), course_dir)

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


def check_course_json(cid, course, entry):
    label = f"[{cid}] course.json"
    if course.get("id") != cid:
        err(label, f"id '{course.get('id')}' nije jednak id-u u courses.json '{cid}'")
    if course.get("name") != entry.get("name"):
        warn(label, "naziv se razlikuje od naziva u courses.json")
    exam_date = course.get("examDate")
    if exam_date is not None and not (isinstance(exam_date, str) and re.match(r"^\d{4}-\d{2}-\d{2}$", exam_date)):
        err(label, "'examDate' mora biti GGGG-MM-DD ili null")
    grading = course.get("grading")
    if not isinstance(grading, dict) or not all(str(g) in grading for g in (2, 3, 4, 5)):
        err(label, "'grading' mora imati pragove za ocjene 2, 3, 4 i 5")
    chapters = {c.get("id"): c for c in course.get("chapters", [])}
    areas = {a.get("id"): a for a in course.get("areas", [])}
    for c in chapters.values():
        if not re.match(r"^\d{2}$", str(c.get("id"))):
            err(label, f"id poglavlja '{c.get('id')}' mora biti dvoznamenkast (01, 02 …)")
        if c.get("area") not in areas:
            err(label, f"poglavlje {c.get('id')} ima nepostojeće područje '{c.get('area')}'")
    in_areas = [ch for a in areas.values() for ch in a.get("chapters", [])]
    if sorted(in_areas) != sorted(chapters):
        err(label, "popisi poglavlja u 'areas' i 'chapters' se ne poklapaju")
    for a in areas.values():
        for ch in a.get("chapters", []):
            if ch in chapters and chapters[ch].get("area") != a.get("id"):
                err(label, f"poglavlje {ch} je u području {a.get('id')}, a ima area '{chapters[ch].get('area')}'")
    return chapters


def validate_course(entry, cfg, seen_ids, report=True):
    """Provjeri jedan kolegij. Ako report=False, samo skuplja ID-ove (za sukobe s drugim kolegijima)."""
    cid = entry["id"]
    course = cfg["course"]
    course_dir = cfg["dir"]
    qdir = course_dir / "questions"
    if report:
        print(f"\n=== {course.get('name', cid)} ({cid}, prefiks {cfg['prefix']}) ===")
        chapters = check_course_json(cid, course, entry)
    else:
        chapters = {c.get("id"): c for c in course.get("chapters", [])}

    listed = course.get("questionFiles", [])
    files = sorted(qdir.glob("*.json")) if qdir.is_dir() else []
    if report:
        for name in listed:
            if not (qdir / name).is_file():
                err(f"[{cid}] course.json", f"questionFiles navodi nepostojeću datoteku {name}")
        for p in files:
            if p.name not in listed:
                err(f"[{cid}] course.json", f"datoteka {p.name} nije navedena u questionFiles (app je neće učitati)")

    per_chapter = Counter()
    real = 0
    total = 0
    for p in files:
        fname = f"{cid}/{p.name}"
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except Exception as e:
            if report:
                err(fname, f"neispravan JSON: {e}")
            continue
        if not isinstance(data, list):
            if report:
                err(fname, "datoteka mora sadržavati JSON polje (popis pitanja)")
            continue
        for i, q in enumerate(data):
            if report:
                qid = check_question(q, f"{fname} #{i + 1}", chapters, p.name, cfg)
            else:
                qid = q.get("id") if isinstance(q, dict) and isinstance(q.get("id"), str) else None
            if qid is None:
                continue
            if qid in seen_ids:
                err(fname, f"id {qid} već postoji u {seen_ids[qid]}")
            seen_ids[qid] = fname
            total += 1
            if isinstance(q.get("chapter"), str):
                per_chapter[q["chapter"]] += 1
            if q.get("real_exam") is True:
                real += 1

    if not report:
        return
    if not total:
        print("Još nema pitanja (u aplikaciji kartica pokazuje „U pripremi”).")
        return
    print("Pitanja po poglavlju:")
    for ch_id in sorted(chapters):
        n = per_chapter.get(ch_id, 0)
        if n:
            print(f"  {ch_id} {chapters[ch_id].get('title', '')}: {n}")
    empty = [ch_id for ch_id in sorted(chapters) if not per_chapter.get(ch_id)]
    if empty:
        print(f"  bez pitanja: {', '.join(empty)}")
    print(f"Ukupno: {total} pitanja ({real} s kolokvija) u {len(files)} datoteka.")


def main():
    ap = argparse.ArgumentParser(description="Provjera pitanja (spec, odjeljak 17).")
    ap.add_argument("--course", help="id kolegija iz content/courses.json (bez argumenta: svi kolegiji)")
    args = ap.parse_args()
    try:
        courses = json.loads((CONTENT / "courses.json").read_text(encoding="utf-8"))
    except Exception as e:
        print(f"GREŠKA: ne mogu pročitati content/courses.json: {e}")
        return 1
    if not isinstance(courses, list) or not all(isinstance(c, dict) for c in courses):
        print("GREŠKA: content/courses.json mora biti popis kolegija")
        return 1

    ids = [c.get("id") for c in courses]
    if args.course and args.course not in ids:
        print(f"GREŠKA: nepoznat kolegij '{args.course}'. Postoje: {', '.join(map(str, ids))}")
        return 1
    for dup in sorted({i for i in ids if ids.count(i) > 1}, key=str):
        err("courses.json", f"id kolegija '{dup}' se ponavlja")

    # Priprema svih kolegija (prefiksi se uvijek provjeravaju preko svih kolegija).
    cfgs = {}
    prefixes = {}
    for c in courses:
        cid = c.get("id")
        if not isinstance(cid, str) or not COURSE_ID_RE.match(cid):
            err("courses.json", f"id kolegija '{cid}' smije imati samo mala slova bez dijakritika, brojke i crticu")
            continue
        d = course_dir_of(c)
        if d is None:
            err("courses.json", f"kolegij {cid}: 'path' mora počinjati s ./content/")
            continue
        course = read_course(c)
        if course is None:
            err(f"[{cid}]", f"ne mogu pročitati {(d / 'course.json').relative_to(ROOT)}")
            continue
        prefix = course.get("idPrefix")
        if not isinstance(prefix, str) or not PREFIX_RE.match(prefix):
            err(f"[{cid}] course.json", f"'idPrefix' mora biti 2–4 mala slova, ima '{prefix}'")
            prefix = "??"
        elif prefix in prefixes:
            err(f"[{cid}] course.json", f"prefiks '{prefix}' već koristi kolegij {prefixes[prefix]}")
        else:
            prefixes[prefix] = cid
        cfgs[cid] = {
            "id": cid, "course": course, "dir": d, "prefix": prefix,
            "id_re": re.compile(rf"^{re.escape(prefix)}-(\d{{2}}|k)-\d{{3}}$"),
        }

    seen_ids = {}
    # Najprije ID-ovi ostalih kolegija (tiho), da se s --course otkriju sukobi s njima.
    if args.course:
        for c in courses:
            if c.get("id") in cfgs and c["id"] != args.course:
                validate_course(c, cfgs[c["id"]], seen_ids, report=False)
    for c in courses:
        if c.get("id") in cfgs and (not args.course or c["id"] == args.course):
            validate_course(c, cfgs[c["id"]], seen_ids)

    print()
    for w in warnings:
        print(f"UPOZORENJE  {w}")
    for e in errors:
        print(f"GREŠKA      {e}")
    if errors:
        print(f"\nNeuspjeh: {len(errors)} grešaka.")
        return 1
    print("Sve u redu – nema grešaka.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
