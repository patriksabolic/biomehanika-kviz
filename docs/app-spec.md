# Specifikacija: Biomehanika kviz (PWA)

Verzija 1.0 · 18.11.2026 · Mjerodavan dokument za izradu aplikacije. Izmjene se upisuju ovdje (odjeljak 20 "Odluke"), ne "usput" u kodu.

## 1. Cilj i okvir

- Korisnik: jedan student (Patrik). Ispit iz Biomehanike **8.12.2026**, ciljana ocjena **dobar (3)**, raspoloživo **~15 min dnevno** za učenje. Telefon: Samsung Galaxy S25 Ultra, Chrome. Korisnik nije programer.
- Aplikacija: **PWA** – čisti HTML/CSS/JS, bez Node.js-a, bez build alata, bez backenda. Hosting: GitHub Pages. Radi **offline**. Svi podaci korisnika su **lokalno** (localStorage) uz export/import JSON datoteke.
- Više kolegija: struktura od početka podržava više kolegija (`content/courses.json`); isporučuje se samo Biomehanika.
- **Sve ocjenjuje aplikacija automatski.** Nema samoocjenjivanja. Ispitni zadaci tipa "skiciraj" pretvaraju se u oblike koje app može ocijeniti (označi na slici, poredaj, spoji, zaokruži).
- Jezik: sučelje i sadržaj na hrvatskom (s dijakriticima); nazivi u kodu na engleskom.

## 2. Struktura projekta

```
biomehanika-kviz/
  index.html                 jedna stranica, "ekrani" se izmjenjuju JS-om
  manifest.json
  sw.js                      service worker (offline)
  version.json               { "version": "0.1.0", "content": "2026-11-18" }
  css/app.css
  js/
    app.js                   navigacija, ekrani, inicijalizacija
    storage.js               localStorage, export/import, migracije
    content.js               učitavanje courses.json / course.json / pitanja
    grading.js               normalizacija i ocjenjivanje upisanih odgovora
    scheduler.js             prioritet i odabir pitanja, progresija mc→fill
    quiz.js                  vježbanje
    exam.js                  ispitni mod
    plan.js                  plan učenja
    stats.js                 statistika (crtanje bez vanjskih biblioteka)
  icons/                     icon-192.png, icon-512.png (jednostavna ikona sa slovom)
  content/
    courses.json             popis kolegija
    biomehanika/
      course.json            poglavlja, područja, zadane postavke ispita
      questions/             00-kolokvij.json, 01.json … 35.json
      img/                   slike za pitanja i objašnjenja (<nn>-<k>.png, max 1200 px širine)
      summaries/             (faza M5) sažeci poglavlja, <nn>.md
    source/                  IZVORNI MATERIJALI – u .gitignore, NE ide na GitHub
      pdf/                   prezentacije 1–35 (kopira korisnik)
      text/                  <nn>.md – tekst izvučen iz PDF-ova (tools/extract_pdf.py)
      img-raw/               slike izvučene iz PDF-ova
      skripta.md             studentska skripta (tekst)
      pitanja-kolokvija.md   stvarna ispitna pitanja (tekst)
  tools/
    extract_pdf.py           PDF → text/<nn>.md + img-raw/ (PyMuPDF)
    validate.py              provjera svih JSON datoteka s pitanjima
  docs/
    app-spec.md              ovaj dokument
    prompts.md               prompti za Claude Code sesije
  CLAUDE.md
  .gitignore
  README.md
```

Vanjske biblioteke: samo ako su nužne, i tada kopirane u `vendor/` (ne CDN), da sve radi offline. Zadano: nijedna.

## 3. Kolegij, područja i poglavlja

`content/courses.json`:

```json
[{ "id": "biomehanika", "name": "Biomehanika", "path": "./content/biomehanika/" }]
```

`content/biomehanika/course.json` sadrži: `id`, `name`, `examDate` (zadano "2026-12-08"), `grading` (zadani pragovi, odjeljak 8), `exam` (zadano trajanje 45 min), `areas[]`, `chapters[]`.

Područja (`areas`):

| id | naziv | poglavlja |
|---|---|---|
| uvod | Uvod, povijest i modeli tijela | 01, 02, 03 |
| tkivo | Vezivno tkivo i mehanička svojstva | 04, 05, 06 |
| kosti | Kosti, skele i osteosinteza | 07, 08, 09, 10, 11 |
| zglobovi | Hrskavica i zglobovi | 12, 13, 14 |
| kraljeznica | Kralježnica | 15 |
| meko | Meko tkivo i krvne žile | 16 |
| misici | Mišići | 17, 18, 19, 20 |
| organi | Organi: disanje, uho, oko, krv, mjehur | 21, 22, 23, 24, 25, 26 |
| dentalna | Dentalna biomehanika | 27, 28 |
| bionika | Biomehatronika i bionika | 29, 35 |
| zivcani | Živčani sustav | 30, 31, 32, 33, 34 |

Poglavlja (`chapters`): `{ "id": "07", "title": "Kosti 1", "area": "kosti", "source": "7_Kosti 1.pdf" }` – naslovi prema nazivima PDF-ova:

01 Uvod · 02 Povijest · 03 Mačka · 04 Vezivno tkivo · 05 Mehanička svojstva · 06 Naprezanja u Ahilovoj tetivi · 07 Kosti 1 · 08 Kosti 2 · 09 Zbita i spužvasta kost · 10 Skele · 11 Osteosinteza · 12 Hrskavica · 13 Zglobovi · 14 Koljeni zglob · 15 Biomehanika kralježnice · 16 Meko tkivo · 17 Mišići · 18 Mehanizam kontrakcije mišića · 19 Procjena mišićne sile · 20 Procjena mišićne sile – nastavak · 21 Sustav organa za disanje · 22 Biomehanika srednjeg uha · 23 Biomehanika ovojnice oka · 24 Naprezanje ovojnice oka · 25 Membranska naprezanja crvenih krvnih stanica · 26 Biomehanika mokraćnog mjehura · 27 Dentalna biomehanika · 28 Dentalna biomehanika – ortodoncija · 29 Biomehatronika · 30 Živčani sustav · 31 Leđna moždina · 32 Neuroni · 33 Osjetila · 34 Elektrofiziologija · 35 Bionika

Pitanja s kolokvija (datoteka `00-kolokvij.json`) **nemaju vlastito poglavlje**: svako dobiva `chapter` stvarnog poglavlja na koje se odnosi (npr. "206 kostiju" → "07") i `real_exam: true`. Tako statistika po poglavljima uključuje i njih.

## 4. Format pitanja

Svaka datoteka u `questions/` je JSON polje pitanja (flat array). Polja:

| polje | tip | opis |
|---|---|---|
| id | string | jedinstven i **trajan** (napredak korisnika vezan je uz ID; nikad se ne mijenja ni ne reciklira). Oblik `bm-<nn>-<nnn>`, npr. `bm-09-004`; kolokvij: `bm-k-001`. |
| chapter | string | "01"–"35" |
| type | string | `mc` · `fill` · `image-label` · `order` · `match` |
| modes | string[] | u kojim se oblicima pitanje smije prikazati: `["mc","fill"]` (zadano za pojam/broj), `["mc"]` (konceptualno pitanje bez smislenog upisa). Samo za type mc/fill. |
| prompt | string | tekst pitanja; kod nadopunjavanja praznina je `___` |
| answer | string | kanonski točan odgovor (≤ 3 riječi ili broj) |
| accepted | string[] | prihvaćene varijante (sinonimi, kratice, s/bez jedinice, jednina/množina, latinski/hrvatski) – uvijek sadrži i `answer` |
| distractors | string[] | točno 3 netočna odgovora za prikaz kao zaokruživanje |
| explanation | string | 2–5 rečenica: zašto je to tako (fizikalna intuicija, mehanizam), vlastitim riječima |
| image | string\|null | slika uz pitanje, npr. `img/09-2.png` |
| explanation_image | string\|null | slika uz objašnjenje |
| source | string | npr. `"9_Zbita i spužvasta kost.pdf, slajd 5"` ili `"Pitanja s kolokvija"` |
| tags | string[] | iz popisa: `brojka`, `formula`, `definicija`, `podjela`, `funkcija`, `povijest`, `skica`, `racun`, `usporedba` |
| real_exam | bool | true samo za pitanja iz "Pitanja s kolokvija" |

Dodatna polja po tipu:

- `image-label`: `image` obavezna; `labels: [{ "n": 1, "x": 42.0, "y": 18.5, "answer": "...", "accepted": [...], "distractors": [...] }]` – `x`,`y` su postoci širine/visine slike; app crta numerirane kružiće. Ocjenjuje se po oznaci; pitanje je točno ako su sve oznake točne (u ispitu: razlomak bodova).
- `order`: `items: ["…", "…", "…"]` u točnom redoslijedu; app ih izmiješa, korisnik ih dodiruje redom. Točno samo ako je cijeli redoslijed točan.
- `match`: `pairs: [{ "left": "…", "right": "…" }]`; app prikaže lijeve i izmiješane desne; točno ako su svi parovi točni.

Faza M1 implementira `mc` i `fill`; `image-label`, `order`, `match` u fazi M5 (validator ih poznaje od početka).

Primjeri:

```json
[
  {
    "id": "bm-k-021",
    "chapter": "13",
    "type": "fill",
    "modes": ["mc", "fill"],
    "prompt": "Trenje u zglobovima iznosi otprilike ___.",
    "answer": "0,002",
    "accepted": ["0,002", "0.002", "0,002 (koeficijent trenja)"],
    "distractors": ["0,02", "0,2", "0,0002"],
    "explanation": "Zglobna hrskavica je porozna i natopljena sinovijalnom tekućinom koja omogućuje hidrodinamičko podmazivanje: pri gibanju se između površina stvara tanki sloj tekućine pa se krute površine gotovo ne dodiruju. Zato je koeficijent trenja u zglobu reda veličine tisućinke, znatno manji nego kod klizanja leda po ledu.",
    "image": null,
    "explanation_image": null,
    "source": "Pitanja s kolokvija; 12_Hrskavica.pdf",
    "tags": ["brojka"],
    "real_exam": true
  },
  {
    "id": "bm-09-003",
    "chapter": "09",
    "type": "mc",
    "modes": ["mc"],
    "prompt": "Koji dio spužvaste kosti je odgovoran za ovisnost krutosti o brzini deformacije te za relaksaciju i puzanje?",
    "answer": "viskozni dio",
    "accepted": ["viskozni dio", "viskozna komponenta"],
    "distractors": ["kristali hidroksiapatita", "kolagena vlakna", "orijentacija trabekula"],
    "explanation": "Spužvasta kost je viskoelastična: elastični dio (hidroksiapatit i kolagen) daje krutost, a viskozni dio troši energiju i reagira na brzinu opterećenja. Zato brže opterećenje daje veću krutost, a dugotrajno konstantno opterećenje izaziva puzanje.",
    "image": null,
    "explanation_image": null,
    "source": "9_Zbita i spužvasta kost.pdf, slajd 11",
    "tags": ["definicija"],
    "real_exam": false
  }
]
```

## 5. Ocjenjivanje upisanih odgovora (fill)

`normalize(s)`: mala slova → trim → đ→d, č→c, ć→c, š→s, ž→z → ukloni interpunkciju osim `. , - / %` → višestruke razmake u jedan → zarez između znamenki u točku.

Odgovor je točan ako vrijedi bilo što od:

1. `normalize(upis)` jednak `normalize(x)` za bilo koji `x` iz `[answer, ...accepted]`;
2. **brojčano**: i upis i `x` se parsiraju kao broj (jedinica iza broja se ignorira) i `|upis − x| ≤ 1 % · |x|`;
3. **tipfeler** (samo za ne-brojčane odgovore): Levenshteinova udaljenost ≤ 1 za riječi od ≥ 6 znakova, ≤ 2 za ≥ 10 znakova, prema bilo kojem `x`.

Gumbi nakon otkrivanja rješenja: **"Ipak točno"** (označi kao točno i zapiše `{id, upis, datum}` u `overrides` – kasnije se dodaje u `accepted`) i **"Ne znam"** prije odgovora (broji se kao netočno i odmah pokaže rješenje).

## 6. Kviz (vježbanje)

Tijek: Početna → Kviz → odabir poglavlja/područja (više odabira, "Sva") + filtri (**samo ispitna pitanja**, **samo brojke i formule**, **samo teška i opasna**) + veličina sesije (5/10/20, zadano 10) → pitanje → odgovor → **odmah** povratna informacija (zeleno/crveno + ikona, točan odgovor, objašnjenje, slika, izvor) → gumbi **Lako / Srednje / Teško** → sljedeće. Kraj sesije: sažetak (x/y, vrijeme, po poglavljima), gumbi "Još 10" i "Natrag".

- `mc` prikaz: 4 opcije (answer + 3 distraktora), izmiješane.
- `fill` prikaz: tekstualno polje, Enter potvrđuje; `inputmode="decimal"` kad je odgovor broj.
- **Progresija mc → fill** (ako `modes` sadrži oba): po pitanju se pamti `level` 0 (zaokruživanje) / 1 (nadopunjavanje). Promocija 0→1: 2 uzastopna točna odgovora na razini 0. Democija 1→0: 2 uzastopna netočna na razini 1. Postavka "Način prikaza": Automatski (zadano) / Uvijek zaokruživanje / Uvijek nadopunjavanje.
- Objašnjenje se prikazuje uvijek (i kad je točno). U njemu je i link **"Prijavi grešku"** → kratki tekst → sprema se u `reports`.
- Mjeri se vrijeme po pitanju (sekunde).

## 7. Algoritam odabira pitanja (scheduler)

Zapis po pitanju (u localStorage): `{ seen, answered, correct, cstreak, wstreak, lastResult, lastRating, lastSeen, level, ratings: {lako, srednje, tesko}, history: [zadnjih 10: {date, result, mode, seconds}] }`.

Prioritet:

```
priority(q):
  if nikad viđeno:            p = 3.0
  else:
    p = 1.0
    lastRating teško:         p += 3.0
    lastRating srednje:       p += 1.0
    lastRating lako:          p -= 0.5
    lastResult netočno:       p += 2.0
    wstreak >= 2:             p += 1.0
    cstreak >= 3 i lastRating lako:  p = 0.2      (naučeno)
    dana od lastSeen:         p += min(dana, 7) * 0.3
    odgovoreno danas i točno: p *= 0.1            (cooldown)
  real_exam:                  p += 1.0
  točnost područja < 60 %:    p *= 1.3
  return max(p, 0.05)
```

Odabir: težinski slučajni odabir bez vraćanja iz skupa pitanja koji prolazi filtre. Ako je u skupu ≥ 3 poglavlja, najviše 50 % sesije iz istog poglavlja. Pitanje se ne ponavlja unutar sesije (osim ako je skup manji od sesije).

## 8. Ispitni mod

- Postavke prije starta: trajanje **15 / 30 / 45 / 60 min** (zadano 45), poglavlja (zadano sva), broj pitanja = `round(trajanje × 0.8)` (zadano 36; može se ručno promijeniti).
- Sastav: proporcionalno broju pitanja po poglavlju; ≥ 30 % `real_exam` pitanja ako ih ima dovoljno; sva pitanja s `fill` u `modes` prikazuju se kao **nadopunjavanje** (kao na pravom ispitu), ostala kao `mc`/`image-label`/`order`/`match`.
- Bez povratne informacije tijekom ispita; "Preskoči" vraća pitanje na kraj; odbrojavanje vidljivo; na 0 automatska predaja; ručna predaja uz potvrdu.
- Bodovanje: 1 bod po pitanju (`image-label`/`match`: razlomak), rezultat = bodovi / ukupno u %.
- **Pragovi ocjena** (zadano, podesivo u Postavkama): 5 ≥ 88 %, 4 ≥ 75 %, 3 ≥ 62 %, 2 ≥ 50 %, inače 1.
- Rezultat: %, ocjena, vrijeme, po područjima, popis netočnih s točnim odgovorom i objašnjenjem; "Ipak točno" dostupan i ovdje (ponovno izračuna).
- Sprema se u `exams[]`: `{ date, duration, n, score, grade, perArea, seconds }`. Ispitni odgovori ažuriraju i statistiku pitanja (bez ocjene težine).

## 9. Streak i dnevni cilj

- Dan = lokalni kalendarski dan. Dan se **broji** ako je odgovoreno ≥ `dailyGoal` pitanja (zadano **10**, podesivo), kviz i ispit zajedno.
- Streak = broj uzastopnih brojanih dana koji završava danas ili jučer. Na Početnoj: plamen + broj, napredak danas "7/10". Pamti se najdulji streak. Bez "zamrzavanja" u v1.

## 10. Statistika

- Po području i poglavlju: **točnost** (correct/answered), **pokrivenost** (seen/ukupno), **naučeno** (level 1 i cstreak ≥ 2, ili za mc-only: cstreak ≥ 3). "Najslabije" = najniža točnost uz ≥ 5 odgovora; "Najjače" = najviša.
- **Najteža pitanja**: top 10 po `2·(broj ocjena teško) + (broj netočnih)`. **Najlakša**: top 10 po `(broj ocjena lako) + cstreak`.
- **Opasna pitanja**: ocijenjena "lako", a kasnije odgovorena netočno.
- **Trend**: točnost po danu, zadnjih 14 dana (SVG/canvas, bez biblioteke).
- **Ispiti**: popis + **procjena ocjene** = prosjek % zadnja 3 ispita → ocjena po pragovima.
- **Kalendar aktivnosti**: zadnjih 8 tjedana, broj pitanja po danu (heatmap).
- **Zanimljivo**: ukupno pitanja, ukupno vrijeme, prosječno s/pitanje, najdulji streak, najbolji dan, najčešće promašena brojka/formula.

## 11. Plan učenja

Ulaz (ekran Plan): datum ispita (zadano 2026-12-08), ciljana ocjena 2–5 (zadano 3), minuta dnevno (zadano 15), neradni dani (dani u tjednu, opcionalno).

```
daysLeft      = dani do ispita (bez dana ispita, bez neradnih)
reviewDays    = max(2, round(daysLeft * 0.25))      zadnjih ~25 % dana
learnDays     = daysLeft - reviewDays
perDay        = round(minutaDnevno / 0.75)          ~45 s po pitanju → 15 min ≈ 20 pitanja
poglavlja po redu kolegija, težina = broj pitanja; pohlepno rasporedi na learnDays
  tako da je zbroj težina po danu što ravnomjerniji (prioritet: najprije područja
  s real_exam pitanjima ako su u istom danu)
dan učenja    = 70 % neviđena pitanja iz današnjih poglavlja + 30 % ponavljanje (scheduler)
dan ponavljanja = scheduler preko svih poglavlja, naglasak na najslabija područja;
  svaki 3. dan ponavljanja predlaže probni ispit od 30 min
cilj "naučeno" po području prema ocjeni: 2 → 50 %, 3 → 65 %, 4 → 80 %, 5 → 90 %
ponovni izračun svaki dan: preostala neobrađena poglavlja na preostale dane učenja;
  ako je korisnik u zaostatku, upozorenje + veći dnevni broj
```

Prikaz: popis dana s poglavljima i brojem pitanja; na Početnoj kartica "Danas: 07 Kosti 1, 08 Kosti 2 · 20 pitanja · ~15 min" s gumbom **Kreni** (pokreće kviz s tim postavkama). Napredak po području: naučeno % vs. cilj %.

## 12. Postavke

Odabir kolegija · pragovi ocjena · zadano trajanje ispita · dnevni cilj · način prikaza (auto/mc/fill) · tamna tema (zadano prati sustav) · vibracija na odgovor · **Export** (preuzmi `biomehanika-kviz-backup-GGGG-MM-DD.json`) · **Import** (odabir datoteke; zamijeni ili spoji) · Reset napretka (uz potvrdu) · **Prijave** (reports + overrides, gumb "Kopiraj" → tekst za zalijepiti u Claude Code) · verzija aplikacije i sadržaja.

## 13. Pohrana

localStorage ključ `bmkviz.v1` → jedan JSON objekt:

```
{ schema: 1, settings: {...},
  courses: { biomehanika: {
    questions: { "<id>": zapis iz odjeljka 7 },
    exams: [], days: { "2026-11-18": { answered, correct, seconds } },
    reports: [], overrides: [], plan: { examDate, targetGrade, minutesPerDay, daysOff, generatedAt } } } }
```

Spremanje nakon svakog odgovora (debounce 300 ms). Migracije po `schema`. Export = cijeli objekt.

## 14. PWA i deploy

- `manifest.json`: name "Biomehanika kviz", short_name "Biomeh", `start_url: "./"`, `scope: "./"`, `display: "standalone"`, ikone 192 i 512.
- `sw.js`: naziv cachea `bmkviz-<version>` iz `version.json`. App shell (index, css, js, manifest, ikone): **cache-first**. `content/**`: **network-first s cache fallbackom** (nova pitanja stižu kad ima mreže, offline radi staro). Na `activate` briše stare cacheve. **Pri svakom deployu Claude Code podigne verziju** u `version.json` i `sw.js`.
- Sve putanje relativne (`./`), jer GitHub Pages poslužuje pod `/biomehanika-kviz/`.
- Lokalno testiranje: `python -m http.server 8000` u mapi projekta → `http://localhost:8000` u Chromeu (F12 → ikona mobitela, 412×915).
- Deploy: push na granu `main`, GitHub Pages iz root-a. URL `https://<korisnik>.github.io/biomehanika-kviz/`.
- Instalacija na telefon: Chrome → izbornik ⋮ → "Dodaj na početni zaslon" / "Instaliraj aplikaciju".

## 15. Sučelje

- Donja navigacija: **Početna** (streak, današnji plan, brzi start: "Brzi kviz 10", "Samo ispitna pitanja") · **Kviz** · **Ispit** · **Statistika** · **Postavke**. Plan učenja je ekran dostupan s Početne.
- Mobile-first za širinu ~412 CSS px; min. 48 px dodirne površine; font ≥ 16 px; visok kontrast; točno/netočno označeno bojom **i** ikonom; tamna tema; CSS varijable; bez vanjskih fontova (sistemski font).
- Sve oznake na hrvatskom s dijakriticima.

## 16. Generiranje pitanja (pravila za Claude Code)

- Izvori: `content/source/text/<nn>.md` (tekst po slajdu, naslov `## Slajd N`), `content/source/skripta.md`, `content/source/pitanja-kolokvija.md`. **Samo iz njih** – ništa se ne izmišlja; ako nečega nema u materijalu, pitanje se ne radi.
- Po poglavlju **15–25 pitanja** (kratka poglavlja ≥ 8). Obvezno pokriti: **sve brojeve** (vrijednosti, postotke, brojnosti), **sve formule** (nadopuni član; što označava veličina; jedinica), definicije, podjele, funkcije/uloge, "prvi / najveći / najmanji", usporedbe A vs. B.
- Tekst pitanja: jedna činjenica po pitanju; jasno; bez "što NIJE", bez "sve navedeno"/"ništa od navedenog". Kod nadopunjavanja praznina je na ključnom pojmu; odgovor ≤ 3 riječi ili broj.
- Distraktori: iste vrste kao odgovor (brojevi sličnog reda veličine iz kolegija, susjedni pojmovi, bliske podjele), uvjerljivi, međusobno isključivi, nisu varijante točnog odgovora.
- `accepted`: sinonimi, kratice, s/bez jedinice, jednina/množina, latinski i hrvatski naziv.
- Objašnjenje: 2–5 rečenica, **zašto** (mehanizam, fizikalna intuicija), vlastitim riječima, spominje broj/formulu; ne prepisuje slajd. Izvor s brojem slajda.
- Slike: kad je slika bitna (dijagram, građa) kopirati iz `img-raw/` u `img/<nn>-<k>.png` (max 1200 px) i referencirati. Ispitni zadaci "skiciraj"/"nacrtaj" → `image-label` (ili `order`/`match`) + nekoliko `mc` pitanja o ključnim svojstvima skice.
- Kolokvij pitanja: prompt = izvorna rečenica s prazninom na ključnom pojmu, `real_exam: true`, stvarno poglavlje, izvorni smisao se ne mijenja. Za stavke "napiši formulu / skiciraj / postavi jednadžbu" napraviti fill/mc/image-label varijante.
- Formule u tekstu čitljivo (npr. `E = a·ρ^p`, `σ = F/A`), uz značenje i jedinicu svake veličine.
- Nakon generiranja: `python tools/validate.py` mora proći bez grešaka.
- **Redoslijed generiranja** (prioritet prema zastupljenosti na kolokviju): 00 kolokvij → 07, 08, 09 → 04, 05, 06 → 12, 13, 14 → 17, 18, 19, 20 → 22, 23, 24 → 01, 02, 03 → 15, 16, 10, 11 → 21, 25, 26 → 27, 28 → 29, 35 → 30, 31, 32, 33, 34.

## 17. Alati (Python)

- `tools/extract_pdf.py` (PyMuPDF, `pip install pymupdf` – pitati korisnika prije instalacije): za svaki PDF u `content/source/pdf/` → `content/source/text/<nn>.md` (po stranici `## Slajd N` + tekst) i slike u `content/source/img-raw/<nn>/` (ugrađene slike + render stranice 150 dpi kao rezerva).
- `tools/validate.py`: jedinstveni ID-ovi i oblik ID-a; `chapter` postoji u course.json; `type` i `modes` valjani; `answer` neprazan; točno 3 distraktora; distraktori ≠ answer (normalizirano); `accepted` sadrži `answer`; slike postoje; `explanation` ≥ 1 rečenica; `source` neprazan; `tags` iz popisa. Ispisuje broj pitanja po poglavlju i ukupno.

## 18. Faze izrade

| faza | sadržaj | gotovo kad |
|---|---|---|
| **M1** | struktura, index/manifest/sw, Kviz s `mc` i `fill`, povratna informacija + objašnjenje, Lako/Srednje/Teško, filtar po poglavljima, localStorage, course.json, `00-kolokvij.json`, validate.py, git init | radi lokalno u Chromeu, zatim na GitHub Pages i instalirano na telefonu |
| **M2** | scheduler (prioritet), progresija mc→fill, streak i dnevni cilj, osnovna statistika, extract_pdf.py + pitanja za 07, 08, 09 | kviz bira pametno, streak se broji |
| **M3** | ispitni mod, pragovi ocjena, povijest ispita, Postavke, export/import | probni ispit s ocjenom radi |
| **M4** | plan učenja + puna statistika (heatmap, opasna pitanja, procjena ocjene, trend) | Početna prikazuje današnji plan |
| **M5** | pitanja za sva preostala poglavlja (3–5 po sesiji), tipovi `image-label`/`order`/`match`, sažeci poglavlja | validator zelen za sva poglavlja |

Svaka faza završava: `python tools/validate.py` → upute za test → commit (poruka na hrvatskom) → push → provjera na telefonu.

## 19. Vremenski plan (orijentacijski, do ispita 8.12.)

- 18.–19.11.: GitHub račun, sesija 1 (M1), app na telefonu – učenje počinje s kolokvij pitanjima.
- 20.–22.11.: M2 i M3 + pitanja za kosti i tkivo.
- 23.–30.11.: po jedna sesija dnevno (20–30 min) za sadržaj preostalih poglavlja + M4.
- 1.–7.12.: samo učenje po planu + probni ispiti. 8.12. ispit.

## 20. Odluke

- 18.11.2026: PWA umjesto native aplikacije; podaci samo lokalno uz export; ocjenjivanje upisanih odgovora automatski uz "Ipak točno"; zaokruživanje → nadopunjavanje progresijom; sva poglavlja 1–35 na ispitu; 11 područja; sve pitanja ulaze bez prethodnog odobravanja, ispravci kroz "Prijavi grešku"; streak = 10 pitanja dnevno; zadano trajanje ispita 45 min (stvarno trajanje nepoznato, 30–60 min); zadani pragovi 50/62/75/88 %.
- 18.11.2026 (M1): `course.json` dobiva polje `questionFiles` (popis datoteka u `questions/`), jer statički hosting ne može izlistati mapu; validator javlja grešku ako datoteka postoji, a nije navedena. Dodatne varijante kolokvij pitanja (jedna stavka → više pitanja) imaju ID-ove `bm-k-101` naviše; `bm-k-0nn` odgovara stavci nn iz `pitanja-kolokvija.md`. Dodan alat `tools/make_icons.py` (ikone bez vanjskih paketa). Poglavlja kolokvij pitanja i nazivi PDF-ova u `course.json` određeni su bez PDF-ova – provjeriti u M2 nakon `extract_pdf.py`. Elementi Hillovog modela (bm-k-043, bm-k-111) i značenje varijabli M/h, ρ nisu doslovno u skripti – provjeriti u prezentacijama 01 i 19.
- 18.11.2026 (M2): Nazivi PDF-ova u `course.json` usklađeni sa stvarnim datotekama. Poglavlja kolokvij pitanja provjerena u izvučenom tekstu i ispravljena gdje je činjenica u drugom poglavlju (bm-k-001 → 02, bm-k-012 → 07, bm-k-021 → 12, bm-k-028/029 → 04, bm-k-038/039 → 17, bm-k-041 → 16, bm-k-047 → 23); ID-ovi i smisao nepromijenjeni. Gdje se kolokvij razlikuje od prezentacije, `answer` ostaje iz kolokvija, a vrijednost iz prezentacije dodana je u `accepted` i objašnjenje: elastin 6 → **0,6 MPa** (04, slajd 13), trenje 0,002 → 0,0026 (12, slajd 5), tetiva 100 → 50–100 MPa (04, slajd 12). Ako je skup pitanja manji od sesije, pitanja se ponavljaju (ne dvaput zaredom). Progresija mc→fill broji uzastopne odgovore po razini pitanja (polje `levelRun`), neovisno o prikazanom obliku. Postavke u M2 imaju samo "Način prikaza" i "Dnevni cilj"; ostalo u M3. Najdulji streak pamti se u `bestStreak`.
- 18.11.2026 (M2, 0.2.1): Elastin (bm-k-031): točan odgovor je **0,6 MPa** (4_Vezivno tkivo, slajd 13; 5_Mehanička svojstva, tablica: 6 × 10⁵ Pa); "6 MPa" iz bilježaka s kolokvija uklonjen iz `accepted` i sada je distraktor. Ocjenjivanje (dopuna odjeljka 5): `parseNumber` prepoznaje znanstveni zapis (6 × 10^5, 6x10^5, 6·10⁵, 6e5) i razmak kao tisućice (600 000); upis jednak distraktoru nikad nije točan; tipfeler se ne priznaje ako je upis jednako blizu ili bliži distraktoru; tipfeler se ne primjenjuje na odgovore sa znamenkama. Git autor: GitHub noreply adresa.
- 18.11.2026 (M3, 0.3.0): Ispitni mod u `js/exam.js`, Postavke u `js/settings.js`, odabir poglavlja zajednički za Kviz i Ispit (`js/picker.js`). Započeti ispit sprema se u `courses.<id>.activeExam` (nastavlja se nakon zatvaranja aplikacije; ako je vrijeme isteklo, automatski se predaje). Broj pitanja u ispitu mijenja se gumbima ±1/±5. Sastav: kvote po poglavlju metodom najvećeg ostatka; unutar poglavlja ~30 % s kolokvija, zatim globalna dopuna zamjenom do ≥ 30 %. Pitanja se u ispitu biraju nasumično (ne scheduler), da probni ispit bude nepristran. Neodgovorena pitanja su 0 bodova i ne ulaze u statistiku pitanja. Zapis u `exams[]` ima i polje `points`. Na ekranu Ispit prikazuje se povijest i procjena ocjene (prosjek zadnja 3). Postavke: pragovi i zadano trajanje spremaju se u `settings.grading` / `settings.examDuration` (null = vrijednosti iz course.json); tema Prati sustav/Tamna/Svijetla (`data-theme` na `<html>`); Import nudi "Spoji" (napredak po pitanju s novijim `lastSeen`, ispiti/prijave unija, dan s većim brojem odgovora) ili "Zamijeni"; Reset briše napredak, a postavke i prijave ostaju; Prijave imaju i "Obriši prijave". Ocjenjivanje (dopuna odjeljka 5): en/em crtica i minus (–, —, −) normaliziraju se u "-", da raspon "3–4 %" ne postane "34 %".
- 18.11.2026 (M3, sadržaj): Pitanja za 04, 05, 06, 12, 13, 14. Tablica u 05 (jedini slajd): σmax Ahilove tetive tumači se u MPa (56 / 44 MPa), u skladu s 6_Naprezanja u Ahilovoj tetivi (σdop = 56 MPa) i 4_Vezivno tkivo (50–100 MPa), iako zaglavlje tablice glasi "10⁷ Nm⁻²"; εmax i Fmax iz tablice nemaju jasnu jedinicu – za εmax nema pitanja, Fmax (2000) je bez jedinice. Podaci iz tablice koji su već u 04 (abduktin, rezilin, istežljivost kolagena) nisu ponovljeni u 05.
- 18.11.2026 (M4, 0.4.0): Plan učenja u `js/plan.js`. Poglavlje je **obrađeno** kad je viđeno ≥ 80 % njegovih pitanja. Plan pamti i `reviewFrom` (prvi dan ponavljanja, fiksan od izrade plana), `baseline` (prvotni raspored datum → poglavlja) i `today` (današnji zadatak, "zamrzne" se za cijeli dan; novi dan = novi izračun). **Zaostatak** = poglavlja koja su po prvotnom rasporedu trebala biti obrađena prije danas, a nisu; ta poglavlja idu na početak preostalog rasporeda. Dnevni broj na danima učenja = perDay; samo kod zaostatka povećava se na broj potreban da se do ponavljanja vide sva neviđena pitanja (uz 70 % novih), najviše 3 × perDay. Ako ni bez zaostatka perDay nije dovoljan za sva pitanja, ekran Plan to prikazuje kao napomenu s preporučenim brojem minuta. Težina poglavlja pri preračunu = broj neviđenih pitanja. Dan učenja bez poglavlja postaje dan ponavljanja. Neradni dani su dani u tjednu. Datum ispita na Početnoj uzima se iz plana ako postoji. Gumb Kreni na danu učenja pokreće kviz 70 % neviđenih iz današnjih poglavlja + 30 % ponavljanja (scheduler preko viđenih), manjak se dopuni iz današnjih poglavlja; na danu ponavljanja običan kviz preko svih poglavlja; svaki 3. dan ponavljanja gumb "Probni ispit · 30 min".
- 18.11.2026 (M4, statistika): Trend = stupci točnosti po danu (boja po pragovima 75 % / 60 %, uz legendu i tablicu), kalendar = heatmap 8 tjedana (pon–ned) s nijansama prema dnevnom cilju; dodir na stupac/dan prikazuje vrijednost. "Opasna" = barem jednom ocijenjeno "lako" i zadnji odgovor netočan. Liste pitanja su sklopive. Povijest ispita i procjena ocjene dijele prikaz s ekranom Ispit.
- 18.11.2026 (0.4.1, provjera slajdova): Na slajdu 20/2 "sin α²" znači sin²α; omjer F_per/F_paral = 2L·sin α·√(n² − sin²α)/(n·y). A, F_n i n na tom slajdu nisu definirani, pa nema pitanja o njihovu značenju. Na slajdu 22/16 Λ i λ su ista veličina (valna duljina); x je u legendi "fazni pomak" (taj je odgovor točan), a fizikalno je položaj; ρ0 i ω nisu u legendi. Na slajdu 23/6 kota 24 mm je ukupna duljina oka, a e = 4,7 mm udaljenost središta dviju sfera (jednako razlici projekcija polumjera R_B i R_R iz 24); Ø11 i Ø12 nisu objašnjeni, pa nema pitanja o njima. Poglavlja 20, 22 i 23 zbog toga imaju više od 25 pitanja. Ocjenjivanje (dopuna odjeljka 5): brojčana tolerancija primjenjuje se samo kad je i `answer` broj; iza broja ne smije biti formula (π, zagrade, √, +, =, ·, ×), npr. "2π/λ" nije broj 2; zapis "10^-8" čita se kao 1e-8.
- 18.11.2026 (0.4.2, sadržaj): Pitanja za 01, 02 i 03. Gradivo skripte „Uvod, mjerni sustavi i modeli” (ELITE, Kistler, Xsens, TEKSCAN, inercijski i žičani modeli) ide u 01, a „Dinamika sustava krutih i čvrstih tijela” (direktna/inverzna metoda, L = T – V) u 03, u skladu s poglavljima postojećih kolokvij pitanja (bm-k-010 → 03). Poglavlja 01 i 02 imaju više od 25 pitanja jer su obuhvaćeni svi brojevi i godine sa slajdova. Na slajdu 02/12 piše „William Harley” (poznatiji kao Harvey), a na 02/11 „De Motu Animalum” – oba zapisa prihvaćaju se kao točni.
- 18.11.2026 (0.4.3, sadržaj): Pitanja za 10, 11, 15 i 16. Dijagram tlakova na disk (15, slajd 14) nema oznaku jedinice uz stupce; vrijednosti se tumače u kPa prema oznaci granice hidracije/dehidracije (80 kPa). Poluraspad kolagena u krvožilnom sustavu (16, slajd 7) naveden je bez jedinice (15–90), pa o tom broju nema pitanja; tablica svojstava ligamenata koljena (16, slajd 11) nema jasne pripadnosti stupaca, pa o njoj nema pitanja. Poglavlje 16 ima više od 25 pitanja jer je opsežno (34 slajda, mnogo brojeva i podjela).
- 18.11.2026 (0.4.4, sadržaj): Pitanja za 21, 25 i 26. Na slajdu 25/6 u tablici za 131 mosmol piše površina „1.45 µm²”, a na slici „145 µ²” – uzeto je 145 µm² (tipfeler u tablici). „Cassanijeve krivulje” sa slajda 25/8 u pitanjima su Cassinijeve krivulje. Na slajdu 26/13 σ praznog mjehura je 0,000909 N/mm², a N/h = 0,004/4,2 daje 0,000952 N/mm² – o toj vrijednosti nema pitanja, pitanje je samo o N_ϑ = −0,004 N/mm. Na slajdu 26/12 „polumjer punog mjehura R2” odnosi se na prazan mjehur. U 26 (3. model) δ je debljina stijenke prema slici na slajdu 8. Poglavlja 21 i 25 imaju više od 25 pitanja jer su obuhvaćeni računski primjer (Reynoldsov broj) i tablica dimenzija eritrocita.
- 18.11.2026 (0.4.5, sadržaj): Pitanja za 27 i 28. Na slajdu 28/9 HU-rasponi za meka tkiva (−200 do +804), masno tkivo (−140 do −1220) i pluća (−1200 do −1800) izgledaju pogrešno prepisano, pa se pitanja odnose samo na vodu (0 HU), zrak (−1000 HU) i rasponе modela zuba (1200–3071) i kosti (226–3071). Na slajdu 27/23 dimenzije krune očnjaka su nejasno označene (11,1 mm „duljina krune (meziodistalni promjer)”), pa se pita samo ukupna duljina 25,5 mm. Tablice broja čvorova i elemenata (27/27, 28/16) nisu zasebna pitanja, spominju se u objašnjenjima. Poglavlje 27 ima više od 25 pitanja jer je opsežno (57 slajdova).
