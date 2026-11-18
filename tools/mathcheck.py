r"""Provjera formula u pitanjima (spec, odjeljci 4 i 16). Koristi ga tools/validate.py.

1. lint(text): zapis izvan $...$ (x_i, x^2, 10^5, ², ₂, grčka slova, ·, ×, √, kemijske formule),
   neuravnoteženi $ i zagrade, ___ ili % unutar formule, decimalni zarez bez {,}.
2. render_all(items): svaki tekst s formulom renderira se u Chromeu bez prozora (headless)
   istim kodom kao aplikacija (vendor/katex + js/math.js, throwOnError) i vraća greške.
"""
import html
import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Formula u tekstu: $$...$$ (zasebni redak) ili $...$ (u retku).
MATH_RE = re.compile(r"\$\$(.+?)\$\$|\$(.+?)\$", re.S)

ELEMENTS = set("""H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As
Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pt Au Hg Pb Bi U""".split())

OUTSIDE_RULES = [
    (re.compile(r"[A-Za-z0-9)\]}]_(?!_)[A-Za-z0-9{(]"), "indeks (x_i) izvan $...$"),
    (re.compile(r"[A-Za-z0-9)\]}]\^|\^[A-Za-z0-9{(\-−]"), "eksponent (x^2, 10^5) izvan $...$"),
    (re.compile(r"[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿ₀₁₂₃₄₅₆₇₈₉₊₋₌]"), "Unicode indeks/eksponent (², ₂) – piši kao LaTeX u $...$"),
    (re.compile(r"[\u0391-\u03A9\u03B1-\u03C9\u00B5\u03D1\u03D5\u03F5]"), "grčko slovo izvan $...$ (piši $\\rho$, $\\mu$ …)"),
    (re.compile(r"[·×]"), "znak množenja izvan $...$ (piši $\\cdot$)"),
    (re.compile(r"[√∫∑∂]"), "matematički znak izvan $...$"),
    (re.compile(r"\\[a-zA-Z]"), "LaTeX naredba izvan $...$"),
]

# Kemijske formule izvan \ce{}: spoj s barem dva simbola elementa i brojkom (H2O, CO2, CaCO3)
# ili ion s nabojem (Ca2+, Na+, Cl-, H+).
CHEM_TOKEN = re.compile(r"(?<![\w$\\])((?:[A-Z][a-z]?\d*)+)(\d*[+\-−])?(?![\w])")
SIMPLE_MOLECULES = {"O2", "N2", "H2", "Cl2", "CO", "NO"}
# Oznake enzima, gena i kratice koje nisu kemijske formule (CYP2C19, FMO3, UGT1A6 …).
LABEL_RE = re.compile(
    r"^(CYP|FMO|UGT|SULT|NAT|GST|MAO|DAO|PAO|ALDH|ADH|AKR|CBR|AZOR|NQO|XOR|XO|XDH|AO|CES|EPHX|"
    r"POR|PGHS|NAPQI|NAPSQI|PAPS|GSH|ATP|ADP|NADPH|NADH|NADP|FAD|FADH|FMN|DNA|RNA|THF|AMACR|DPYD|"
    r"PBP|BLA|NNK|NNAL|THC|TMA|TMAO|LAAM|MIST|AUC|ADME|COMT|HNMT|TMT|NMT|TPMT|SET|HAT|PAH|PBDE)[0-9A-Z]*$"
)


def split_math(text):
    """Vrati (tekst izvan formula, [formule])."""
    parts, maths, pos = [], [], 0
    for m in MATH_RE.finditer(text):
        parts.append(text[pos:m.start()])
        maths.append(m.group(1) if m.group(1) is not None else m.group(2))
        parts.append(" ")
        pos = m.end()
    parts.append(text[pos:])
    return "".join(parts), maths


def _chem_outside(outside):
    found = []
    for m in CHEM_TOKEN.finditer(outside):
        body, charge = m.group(1), m.group(2)
        if LABEL_RE.match(body):
            continue
        syms = re.findall(r"[A-Z][a-z]?\d*", body)
        names = [re.sub(r"\d", "", x) for x in syms]
        if not all(n in ELEMENTS for n in names):
            continue
        has_digit = any(c.isdigit() for c in body)
        if (len(syms) >= 2 and has_digit) or body in SIMPLE_MOLECULES:
            found.append(body + (charge or ""))  # spoj: H2O, CO2, CaCO3
        elif charge and (charge == "+" or has_digit or body in ANIONS):
            found.append(body + charge)  # ion: Ca2+, Na+, H+, Cl-
    return found


ANIONS = {"Cl", "F", "I", "Br", "OH"}


def _balanced(s):
    depth = 0
    i = 0
    while i < len(s):
        c = s[i]
        if c == "\\":
            i += 2
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth < 0:
                return False
        i += 1
    return depth == 0


def lint(text):
    """Greške u zapisu formula jednog teksta (prompt, answer, distraktor, objašnjenje)."""
    problems = []
    if not isinstance(text, str) or not text:
        return problems
    # Neuravnoteženi $: nakon uklanjanja svih formula ne smije ostati nijedan $.
    outside, maths = split_math(text)
    if "$" in outside:
        problems.append("neuravnotežen $ (formula nije zatvorena)")
        outside = outside.replace("$", " ")
    for rx, msg in OUTSIDE_RULES:
        m = rx.search(outside.replace("___", " "))
        if m:
            problems.append(f"{msg}: „{outside[max(0, m.start() - 12):m.end() + 12].strip()}”")
    chem = _chem_outside(outside)
    if chem:
        problems.append(f"kemijska oznaka izvan $\\ce{{...}}$: {', '.join(sorted(set(chem)))}")
    for f in maths:
        if not f.strip():
            problems.append("prazna formula $$")
        if not _balanced(f):
            problems.append(f"neuravnotežene vitičaste zagrade u ${f}$")
        if "___" in f:
            problems.append(f"praznina ___ unutar formule ${f}$ (stavi je izvan $...$)")
        if re.search(r"(?<!\\)%", f):
            problems.append(f"% unutar formule mora biti \\% (inače je komentar): ${f}$")
        if re.search(r"(?<!\{)\d,\d", f):
            problems.append(f"decimalni zarez u formuli piši kao {{,}}: ${f}$")
        if re.search(r"[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻₀₁₂₃₄₅₆₇₈₉·×]", f):
            problems.append(f"Unicode znak u formuli (piši ^{{2}}, _{{2}}, \\cdot): ${f}$")
    return problems


def find_chrome():
    cands = [
        os.environ.get("CHROME_PATH", ""),
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ]
    for c in cands:
        if c and Path(c).is_file():
            return c
    for name in ("chrome", "google-chrome", "chromium", "msedge"):
        p = shutil.which(name)
        if p:
            return p
    return None


PAGE = """<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="{base}vendor/katex/katex.min.css">
<script src="{base}vendor/katex/katex.min.js"></script>
<script src="{base}vendor/katex/contrib/mhchem.min.js"></script>
<script src="{base}vendor/katex/contrib/auto-render.min.js"></script>
<script src="{base}js/math.js"></script>
</head><body><div id="work"></div><pre id="out">NIJE_ZAVRSENO</pre>
<script id="data" type="application/json">{data}</script>
<script>
(function () {{
  var items = JSON.parse(document.getElementById('data').textContent);
  var out = [];
  var work = document.getElementById('work');
  var ok = !!(window.katex && window.renderMathInElement && window.kvizMath);
  if (!ok) {{ document.getElementById('out').textContent = JSON.stringify({{fatal: 'KaTeX se nije učitao'}}); return; }}
  items.forEach(function (it) {{
    var div = document.createElement('div');
    div.textContent = it.text;
    work.appendChild(div);
    var errs = [];
    try {{
      window.kvizMath.render(div, function (msg, e) {{ errs.push((e && e.message) || String(msg)); }});
    }} catch (e) {{ errs.push(String(e && e.message || e)); }}
    // Tekst koji je ostao izvan formula ne smije sadržavati $ ni LaTeX naredbe.
    var walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT);
    var n, left = '';
    while ((n = walker.nextNode())) {{ if (!n.parentElement.closest('.katex')) left += n.nodeValue; }}
    if (left.indexOf('$') >= 0) errs.push('ostao je znak $ (neuravnotežena formula)');
    if (/\\\\[a-zA-Z]/.test(left)) errs.push('LaTeX naredba izvan formule');
    var count = div.querySelectorAll('.katex').length;
    if (!count) errs.push('nijedna formula nije prikazana');
    if (div.querySelector('.katex-error')) errs.push('KaTeX greška u prikazu');
    out.push({{ key: it.key, errors: errs, count: count }});
    work.removeChild(div);
  }});
  document.getElementById('out').textContent = JSON.stringify({{ results: out, katex: window.katex.version }});
}})();
</script></body></html>"""


def render_all(items, chrome):
    """items: [{key, text}] → (rezultati, verzija KaTeX-a). Baca RuntimeError ako Chrome ne uspije."""
    base = ROOT.as_uri() + "/"
    data = json.dumps(items, ensure_ascii=False).replace("</", "<\\/")
    tmp = Path(tempfile.mkdtemp(prefix="kviz-math-"))
    try:
        page = tmp / "check.html"
        page.write_text(PAGE.format(base=base, data=data), encoding="utf-8")
        profile = tmp / "profile"
        cmd = [chrome, "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
               "--allow-file-access-from-files", f"--user-data-dir={profile}", "--virtual-time-budget=20000",
               "--dump-dom", page.as_uri()]
        res = subprocess.run(cmd, capture_output=True, timeout=180)
        dom = res.stdout.decode("utf-8", "replace")
        m = re.search(r'<pre id="out">(.*?)</pre>', dom, re.S)
        if not m:
            raise RuntimeError(f"Chrome nije vratio rezultat (izlazni kod {res.returncode}).")
        txt = html.unescape(m.group(1))
        if txt == "NIJE_ZAVRSENO":
            raise RuntimeError("provjera u Chromeu nije završila")
        obj = json.loads(txt)
        if "fatal" in obj:
            raise RuntimeError(obj["fatal"])
        return obj["results"], obj.get("katex")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
