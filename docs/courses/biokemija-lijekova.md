# Kolegij: Biokemija lijekova

Mjerodavno za sadržaj kolegija Biokemija lijekova. Opća pravila aplikacije, format pitanja i pravila generiranja su u `docs/app-spec.md`. Stanje: **u pripremi** – kolegij je upisan u aplikaciju, ali još nema poglavlja ni pitanja.

## 1. Osnovni podaci

| | |
|---|---|
| id kolegija | `biokemija-lijekova` |
| prefiks ID-a pitanja | `bl` (npr. `bl-03-001`, stvarna ispitna pitanja `bl-k-001`) |
| sadržaj u aplikaciji | `content/biokemija-lijekova/` (`course.json`, `questions/`, `img/`) |
| izvorni materijali | `content/source/biokemija-lijekova/` (u `.gitignore`) |
| ispit | datum, ciljanu ocjenu, minute dnevno, trajanje i pragove postavlja korisnik u aplikaciji (Postavke kolegija / Plan); `course.json` ih nema, pa vrijede opće zadane vrijednosti (pragovi 50/62/75/88 %, 45 min, ocjena 3, 15 min dnevno) |

## 2. Izvorni materijali

```
content/source/biokemija-lijekova/
  pdf/        prezentacije (korisnik kopira; naziv počinje brojem poglavlja, npr. "3_Naslov.pdf")
  primjeri/   primjeri ispitnih pitanja / stari ispiti
  text/       nastaje s: python tools/extract_pdf.py --course biokemija-lijekova
  img-raw/    nastaje s istim alatom
```

## 3. Područja i poglavlja

Određuju se nakon pregleda materijala (sesija "Priprema novog kolegija" u `docs/prompts.md`).

## 4. Redoslijed generiranja

Određuje se nakon pregleda materijala (prioritet prema zastupljenosti u primjerima ispitnih pitanja).

## 5. Vremenski plan

Određuje se kad bude poznat datum ispita.

## 6. Odluke o sadržaju

- 18.11.2026 (0.6.0): Kolegij dodan u `content/courses.json` s id-om `biokemija-lijekova` i prefiksom `bl`; `course.json` je prazan (bez poglavlja, područja i pitanja), pa kartica na Početnoj pokazuje "U pripremi". Napravljene su mape `content/source/biokemija-lijekova/pdf/` i `primjeri/`.
- 18.11.2026 (0.7.0): Podatke o ispitu (datum, ciljana ocjena, minute dnevno, trajanje, pragovi) bira korisnik u aplikaciji; iz `course.json` uklonjeni su `examDate: null`, `grading` i `exam` (bile su privremene vrijednosti).
