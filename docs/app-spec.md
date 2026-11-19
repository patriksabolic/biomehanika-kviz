# Specifikacija: Kviz (PWA za više kolegija)

Verzija 2.0 · 18.11.2026 · Mjerodavan dokument za izradu aplikacije. Izmjene se upisuju ovdje (odjeljak 20 "Odluke"), ne "usput" u kodu.

Ovaj dokument je **opći dio**: aplikacija, format pitanja, algoritmi i pravila generiranja – vrijedi za sve kolegije. Sve o sadržaju pojedinog kolegija (poglavlja, područja, ispit, izvori, redoslijed generiranja, odluke o sadržaju) je u `docs/courses/<id>.md`:

| kolegij | id | prefiks | dokument |
|---|---|---|---|
| Biomehanika | `biomehanika` | `bm` | `docs/courses/biomehanika.md` |
| Biokemija lijekova | `biokemija-lijekova` | `bl` | `docs/courses/biokemija-lijekova.md` |

## 1. Cilj i okvir

- Korisnik: jedan student (Patrik). Telefon: Samsung Galaxy S25 Ultra, Chrome. Korisnik nije programer. Datum ispita, ciljanu ocjenu, minute dnevno, trajanje ispita i pragove ocjena korisnik postavlja **u aplikaciji**, za svaki kolegij posebno (odjeljak 12).
- Aplikacija: **PWA** – čisti HTML/CSS/JS, bez Node.js-a, bez build alata, bez backenda. Hosting: GitHub Pages. Radi **offline**. Svi podaci korisnika su **lokalno** (localStorage) uz export/import JSON datoteke.
- **Više kolegija**: popis u `content/courses.json`; svaki kolegij ima svoju mapu sadržaja, svoj prefiks ID-a pitanja i vlastiti napredak, plan, statistiku, postavke ispita i prijave (odjeljak 3).
- **Sve ocjenjuje aplikacija automatski.** Nema samoocjenjivanja. Ispitni zadaci tipa "skiciraj" pretvaraju se u oblike koje app može ocijeniti (označi na slici, poredaj, spoji, zaokruži).
- Jezik: sučelje i sadržaj na hrvatskom (s dijakriticima); nazivi u kodu na engleskom.

## 2. Struktura projekta

```
biomehanika-kviz/            (naziv repozitorija ostaje; aplikacija se zove "Kviz")
  index.html                 jedna stranica, "ekrani" se izmjenjuju JS-om
  manifest.json
  sw.js                      service worker (offline)
  version.json               { "version": "0.7.0", "content": "2026-11-18" }
  css/app.css
  js/
    app.js                   navigacija, popis kolegija, ekrani, inicijalizacija
    storage.js               localStorage, export/import, migracije
    content.js               učitavanje courses.json / course.json / pitanja
    grading.js               normalizacija i ocjenjivanje upisanih odgovora
    scheduler.js             prioritet i odabir pitanja, progresija mc→fill
    picker.js                odabir područja/poglavlja (Kviz i Ispit)
    quiz.js                  vježbanje
    exam.js                  ispitni mod
    plan.js                  plan učenja
    stats.js                 statistika, streak (crtanje bez vanjskih biblioteka)
    settings.js              postavke
    util.js                  pomoćne funkcije
    math.js                  prikaz formula (KaTeX), klasična skripta: window.kvizMath
    zoom.js                  slika preko cijelog zaslona sa zumiranjem
  vendor/katex/              KaTeX 0.19.1 (katex.min.js/.css, fonts/*.woff2, contrib/auto-render, contrib/mhchem)
  icons/                     icon-192.png, icon-512.png
  content/
    courses.json             popis kolegija
    <id>/                    jedan kolegij, npr. biomehanika/
      course.json            prefiks ID-a, poglavlja, područja, zadane postavke ispita
      questions/             00-kolokvij.json, 01.json … <nn>.json
      img/                   slike za pitanja i objašnjenja (<nn>-<k>.png, max 1200 px širine)
      summaries/             (opcionalno) sažeci poglavlja, <nn>.md
    source/                  IZVORNI MATERIJALI – u .gitignore, NE ide na GitHub
      <id>/
        pdf/                 prezentacije (kopira korisnik; naziv počinje brojem poglavlja)
        text/                <nn>.md – tekst izvučen iz PDF-ova (tools/extract_pdf.py --course <id>)
        img-raw/             slike izvučene iz PDF-ova
        primjeri/            primjeri ispitnih pitanja / stari ispiti (ako postoje)
        …                    ostalo po kolegiju (npr. skripta.md) – popis u docs/courses/<id>.md
  tools/
    extract_pdf.py           PDF → text/<nn>.md + img-raw/ (PyMuPDF), --course <id>
    validate.py              provjera pitanja; bez argumenta svi kolegiji, --course <id> jedan
    mathcheck.py             provjera formula (zapis + render u Chromeu bez prozora), koristi ga validate.py
    make_icons.py            ikone bez vanjskih paketa
  docs/
    app-spec.md              ovaj dokument (opći dio)
    courses/<id>.md          sadržaj i odluke po kolegiju
    prompts.md               prompti za Claude Code sesije
  CLAUDE.md
  .gitignore
  README.md
```

Vanjske biblioteke: samo ako su nužne, i tada kopirane u `vendor/` (ne CDN), da sve radi offline. Jedina: **KaTeX 0.19.1** s dodatkom mhchem (MIT licenca), službeno izdanje `katex.tar.gz` s GitHuba (`github.com/KaTeX/KaTeX/releases/tag/v0.19.1`); kopirani su samo `katex.min.js`, `katex.min.css`, fontovi `.woff2` (Chrome koristi samo njih), `contrib/auto-render.min.js` i `contrib/mhchem.min.js`.

## 3. Kolegiji

`content/courses.json` – redoslijed je redoslijed kartica na Početnoj:

```json
[
  { "id": "biomehanika", "name": "Biomehanika", "path": "./content/biomehanika/" },
  { "id": "biokemija-lijekova", "name": "Biokemija lijekova", "path": "./content/biokemija-lijekova/" }
]
```

- `id` kolegija: mala slova bez dijakritika, brojke i crtica, bez razmaka (npr. `biokemija-lijekova`). Isti id koriste mapa `content/<id>/`, mapa `content/source/<id>/`, `docs/courses/<id>.md` i ključ u pohrani (`courses.<id>`). **Id se nakon prvog korištenja ne mijenja** (napredak je vezan uz njega).
- `content/<id>/course.json` sadrži: `id`, `name`, **`idPrefix`** (2–4 mala slova, jedinstven među kolegijima, npr. `bm`), neobavezne zadane vrijednosti ispita `examDate` (`"GGGG-MM-DD"`), `targetGrade` (2–5), `minutesPerDay`, `grading` (pragovi, odjeljak 8) i `exam` (`{ "durationMin": 45 }`) – korisnik ih mijenja u aplikaciji, a bez njih vrijede opće zadane vrijednosti (bez datuma, ocjena 3, 15 min, pragovi 50/62/75/88 %, 45 min), `questionFiles` (popis datoteka u `questions/`, jer statički hosting ne može izlistati mapu), `areas[]`, `chapters[]`.
- Područja: `{ "id": "kosti", "name": "Kosti, skele i osteosinteza", "chapters": ["07", "08"] }`. Poglavlja: `{ "id": "07", "title": "Kosti 1", "area": "kosti", "source": "7_Kosti 1.pdf" }`; id poglavlja je dvoznamenkast (`01`, `02` …), svako poglavlje je u točno jednom području.
- Pitanja s kolokvija / starih ispita (datoteka `00-kolokvij.json`) nemaju vlastito poglavlje: svako dobiva `chapter` stvarnog poglavlja na koje se odnosi i `real_exam: true`. Tako statistika po poglavljima uključuje i njih.
- **Kolegij bez pitanja** (`questionFiles: []`, prazni `areas`/`chapters`) prikazuje se na Početnoj kao kartica **"U pripremi"**, ne može se otvoriti i ništa se ne ruši. Kolegij koji se ne može učitati prikazuje karticu s greškom, ostali rade.
- Dodavanje kolegija: upis u `courses.json` → `content/<id>/course.json` (prazan, s prefiksom) → mape `content/source/<id>/pdf/` i `primjeri/` → `docs/courses/<id>.md` → `sw.js` (course.json u popis) → `python tools/validate.py`. Poglavlja, područja i pitanja dodaju se kasnije prema `docs/courses/<id>.md` (predložak u `docs/prompts.md`).

## 4. Format pitanja

Svaka datoteka u `questions/` je JSON polje pitanja (flat array). Polja:

| polje | tip | opis |
|---|---|---|
| id | string | jedinstven **u cijeloj aplikaciji** i **trajan** (napredak korisnika vezan je uz ID; nikad se ne mijenja ni ne reciklira). Oblik `<prefiks>-<nn>-<nnn>`, npr. `bm-09-004`; kolokvij: `<prefiks>-k-<nnn>`, npr. `bm-k-001`. `<prefiks>-k-0nn` odgovara stavci nn izvornog popisa ispitnih pitanja; dodatne varijante iste stavke imaju `<prefiks>-k-101` naviše. |
| chapter | string | id poglavlja iz `course.json` ("01", "02" …) |
| type | string | `mc` · `fill` · `image-label` · `order` · `match` |
| modes | string[] | u kojim se oblicima pitanje smije prikazati: `["mc","fill"]` (zadano za pojam/broj), `["mc"]` (konceptualno pitanje bez smislenog upisa). Samo za type mc/fill. |
| prompt | string | tekst pitanja; kod nadopunjavanja praznina je `___` |
| answer | string | kanonski točan odgovor (≤ 3 riječi ili broj) |
| accepted | string[] | prihvaćene varijante (sinonimi, kratice, s/bez jedinice, jednina/množina, latinski/hrvatski) – uvijek sadrži i `answer` |
| distractors | string[] | točno 3 netočna odgovora za prikaz kao zaokruživanje |
| explanation | string | 2–5 rečenica: zašto je to tako (mehanizam, intuicija), vlastitim riječima |
| image | string\|null | slika uz pitanje, npr. `img/09-2.png` (relativno prema mapi kolegija) |
| explanation_image | string\|null | slika uz objašnjenje |
| source | string | npr. `"9_Zbita i spužvasta kost.pdf, slajd 5"` ili `"Pitanja s kolokvija"` |
| tags | string[] | iz popisa: `brojka`, `formula`, `definicija`, `podjela`, `funkcija`, `povijest`, `skica`, `racun`, `usporedba` |
| real_exam | bool | true samo za stvarna ispitna pitanja (datoteka `00-kolokvij.json`) |

### Formule, indeksi i kemijske oznake (KaTeX + mhchem)

Aplikacija prikazuje formule KaTeX-om (`vendor/katex/`, s dodatkom mhchem) u pitanju, ponuđenim odgovorima, objašnjenju, pregledu ispita i statistici. Pravila zapisa u `prompt`, `answer`, `distractors`, `explanation` (i u `labels`, `items`, `pairs`):

- Matematika u `$...$` (u retku) ili `$$...$$` (zasebni redak, samo za dulje formule u objašnjenju). U JSON-u se `\` piše kao `\\`, npr. `"$\\sigma = F/A$"`.
- Kemija preko `\ce{...}` unutar `$...$`: `$\ce{H2O}$`, `$\ce{CO2}$`, `$\ce{Ca^2+}$`, `$\ce{CH3COOH + H2O <=> CH3COO- + H3O+}$`.
- Indeksi i eksponenti uvijek kao LaTeX: m_i → `$m_i$`, B0 → `$B_0$`, 10^5 / 10⁵ → `$10^{5}$`, cm² → `$\text{cm}^{2}$`. Unicode indeksi/eksponenti (², ₂, ⁻) i grčka slova izvan formule nisu dopušteni.
- Decimalni zarez u formuli kao `{,}`: `$0{,}6\,\text{MPa}$`. Množenje `\cdot`. Jedinice i riječi u formuli `\text{...}`, između broja i jedinice `\,`. Postotak u formuli `\%`. Grčka slova `\rho`, `\sigma`, `\mu`, `\omega` … (i u riječima: `$\gamma$-zračenje`, `$30\,\mu\text{m}$`).
- Praznina `___` je uvijek izvan formule: `$m_i = B_0 + B_1 \cdot M + B_2 \cdot$ ___`.
- Formula se ne koristi za običan broj s jedinicom bez indeksa/eksponenta/grčkog slova ("0,6 MPa" ostaje tekst). Anatomske oznake (C1–C7, L5, Th12) nisu indeksi i ostaju tekst.
- `answer` i distraktori smiju sadržavati LaTeX (isti oblik za sve opcije, da oblik ne otkriva odgovor). **`accepted` sadrži samo oblike koji se mogu utipkati na mobitelu** (npr. `"H2O"`, `"6 x 10^5 Pa"`, `"rho"`) – bez `$` i `\`. Kad `answer` ima formulu, `accepted` ne mora sadržavati `answer`, ali kod `fill` mora imati barem jedan tipkani oblik. Ako odgovor nema smislen tipkani oblik, pitanje je samo `mc` (`type: "mc"`, `modes: ["mc"]`).
- Ocjenjivanje upisa uspoređuje upis s `accepted` i s `answer`/distraktorima pretvorenim u običan tekst (`plainText` u `js/grading.js`: `$6 \cdot 10^{5}\,\text{Pa}$` → `6 · 10^5 Pa`).

Dodatna polja po tipu:

- `image-label`: `image` obavezna; `labels: [{ "n": 1, "x": 42.0, "y": 18.5, "answer": "...", "accepted": [...], "distractors": [...] }]` – `x`,`y` su postoci širine/visine slike; app crta numerirane kružiće. Ocjenjuje se po oznaci; pitanje je točno ako su sve oznake točne (u ispitu: razlomak bodova).
- `order`: `items: ["…", "…", "…"]` u točnom redoslijedu; app ih izmiješa, korisnik ih dodiruje redom. Točno samo ako je cijeli redoslijed točan.
- `match`: `pairs: [{ "left": "…", "right": "…" }]`; app prikaže lijeve i izmiješane desne; točno ako su svi parovi točni.

Aplikacija trenutno prikazuje `mc` i `fill`; `image-label`, `order`, `match` validator poznaje, a prikaz dolazi kasnije (faza M5).

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

Dopune (odluke u odjeljku 20): znanstveni zapis i razmak kao tisućice; upis jednak distraktoru nikad nije točan; tipfeler se ne priznaje ako je upis jednako blizu ili bliži distraktoru i ne primjenjuje se na odgovore sa znamenkama; crtice (–, —, −) → "-"; brojčana tolerancija samo kad je i `answer` broj, iza broja ne smije biti formula; µ i μ su isti znak.

Gumbi nakon otkrivanja rješenja: **"Ipak točno"** (označi kao točno i zapiše `{id, upis, datum}` u `overrides` – kasnije se dodaje u `accepted`) i **"Ne znam"** prije odgovora (broji se kao netočno i odmah pokaže rješenje).

## 6. Kviz (vježbanje)

Tijek: Početna (popis kolegija) → kolegij → Kviz → odabir poglavlja/područja (više odabira, "Sva") + filtri (**samo ispitna pitanja**, **samo brojke i formule**, **samo teška i opasna**) + veličina sesije (5/10/20, zadano 10) → pitanje → odgovor → **odmah** povratna informacija (zeleno/crveno + ikona, točan odgovor, objašnjenje, slika, izvor) → gumbi **Lako / Srednje / Teško** → sljedeće. Kraj sesije: sažetak (x/y, vrijeme, po poglavljima), gumbi "Još 10" i "Natrag". Sve se odnosi na odabrani kolegij.

- `mc` prikaz: 4 opcije (answer + 3 distraktora), izmiješane.
- `fill` prikaz: tekstualno polje, Enter potvrđuje; `inputmode="decimal"` kad je odgovor broj.
- **Progresija mc → fill** (ako `modes` sadrži oba): po pitanju se pamti `level` 0 (zaokruživanje) / 1 (nadopunjavanje). Promocija 0→1: 2 uzastopna točna odgovora na razini 0. Democija 1→0: 2 uzastopna netočna na razini 1. Postavka "Način prikaza": Automatski (zadano) / Uvijek zaokruživanje / Uvijek nadopunjavanje.
- Objašnjenje se prikazuje uvijek (i kad je točno). U njemu je i link **"Prijavi grešku"** → kratki tekst → sprema se u `reports` kolegija.
- Mjeri se vrijeme po pitanju (sekunde).

## 7. Algoritam odabira pitanja (scheduler)

Zapis po pitanju (u localStorage, unutar kolegija): `{ seen, answered, correct, cstreak, wstreak, lastResult, lastRating, lastSeen, level, levelRun, ratings: {lako, srednje, tesko}, history: [zadnjih 10: {date, result, mode, seconds}] }`.

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

- Postavke prije starta: trajanje **15 / 30 / 45 / 60 min** (zadano iz postavki kolegija, inače `course.json`), poglavlja (zadano sva), broj pitanja = `round(trajanje × 0.8)` (može se ručno promijeniti).
- Sastav: proporcionalno broju pitanja po poglavlju; ≥ 30 % `real_exam` pitanja ako ih ima dovoljno; sva pitanja s `fill` u `modes` prikazuju se kao **nadopunjavanje** (kao na pravom ispitu), ostala kao `mc`/`image-label`/`order`/`match`.
- Bez povratne informacije tijekom ispita; "Preskoči" vraća pitanje na kraj; odbrojavanje vidljivo; na 0 automatska predaja; ručna predaja uz potvrdu.
- Bodovanje: 1 bod po pitanju (`image-label`/`match`: razlomak), rezultat = bodovi / ukupno u %.
- **Pragovi ocjena** po kolegiju (zadano iz `course.json`, podesivo u Postavkama kolegija), npr. 5 ≥ 88 %, 4 ≥ 75 %, 3 ≥ 62 %, 2 ≥ 50 %, inače 1.
- Rezultat: %, ocjena, vrijeme, po područjima, popis netočnih s točnim odgovorom i objašnjenjem; "Ipak točno" dostupan i ovdje (ponovno izračuna).
- Sprema se u `exams[]` kolegija: `{ date, duration, n, score, grade, perArea, seconds, points }`. Ispitni odgovori ažuriraju i statistiku pitanja (bez ocjene težine).

## 9. Streak i dnevni cilj

- Dan = lokalni kalendarski dan.
- **Po kolegiju**: dnevni cilj (`dailyGoal`, zadano **10**, podesivo u Postavkama kolegija) i streak su zasebni za svaki kolegij. Dan se kolegiju **broji** ako je u tom kolegiju odgovoreno ≥ njegov `dailyGoal` pitanja, kviz i ispit zajedno. Streak kolegija = broj uzastopnih brojanih dana koji završava danas ili jučer; pamti se najdulji (`bestStreak` kolegija). Prikaz: Početna kolegija (plamen, broj, napredak danas "7/10") i Statistika.
- **Zajednički streak** (Početna – popis kolegija): dan se broji ako je **bilo kojem** kolegiju taj dan ispunjen njegov dnevni cilj. Najdulji zajednički niz pamti se u `bestStreak` na vrhu pohrane.
- Bez "zamrzavanja" u v1.

## 10. Statistika

Sve po odabranom kolegiju.

- Po području i poglavlju: **točnost** (correct/answered), **pokrivenost** (seen/ukupno), **naučeno** (level 1 i cstreak ≥ 2, ili za mc-only: cstreak ≥ 3). "Najslabije" = najniža točnost uz ≥ 5 odgovora; "Najjače" = najviša.
- **Najteža pitanja**: top 10 po `2·(broj ocjena teško) + (broj netočnih)`. **Najlakša**: top 10 po `(broj ocjena lako) + cstreak`.
- **Opasna pitanja**: ocijenjena "lako", a kasnije odgovorena netočno.
- **Trend**: točnost po danu, zadnjih 14 dana (SVG, bez biblioteke).
- **Ispiti**: popis + **procjena ocjene** = prosjek % zadnja 3 ispita → ocjena po pragovima kolegija.
- **Kalendar aktivnosti**: zadnjih 8 tjedana, broj pitanja po danu (heatmap, nijanse prema dnevnom cilju kolegija).
- **Zanimljivo**: ukupno pitanja, ukupno vrijeme, prosječno s/pitanje, najdulji streak, najbolji dan, najčešće promašena brojka/formula.

## 11. Plan učenja

Po kolegiju. Ulaz (ekran Plan, otvara se s Početne kolegija): datum ispita, ciljana ocjena 2–5, minuta dnevno – to su **iste postavke kolegija kao u Postavkama** (odjeljak 12; zadano iz `course.json`, inače bez datuma, 3, 15) – i neradni dani (dani u tjednu, opcionalno, dio plana). Bez datuma ispita plan se ne može napraviti: ekran Plan prvo traži datum. Kviz i ispit rade i bez datuma.

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

Prikaz: popis dana s poglavljima i brojem pitanja; na Početnoj kolegija kartica "Danas: 07 Kosti 1, 08 Kosti 2 · 20 pitanja · ~15 min" s gumbom **Kreni** (pokreće kviz s tim postavkama); kartica kolegija na popisu kolegija prikazuje isti današnji zadatak. Napredak po području: naučeno % vs. cilj %.

## 12. Postavke

Ekran Postavke ima dva dijela:

- **Kolegij: <naziv>** (odabrani kolegij): **Ispit** (datum ispita, ciljana ocjena, minuta dnevno; promjena datuma ili minuta preračunava postojeći plan, promjena ocjene samo cilj) · pragovi ocjena · zadano trajanje ispita · dnevni cilj · **Prijave** (reports + overrides, gumb "Kopiraj" → tekst za zalijepiti u Claude Code; tekst navodi naziv i id kolegija) · Reset napretka kolegija (uz potvrdu).
- **Aplikacija** (zajedničko): način prikaza (auto/mc/fill) · tema (prati sustav/tamna/svijetla) · vibracija na odgovor · **Export** (preuzmi `kviz-backup-GGGG-MM-DD.json`, svi kolegiji) · **Import** (odabir datoteke; spoji ili zamijeni) · verzija aplikacije i sadržaja.

Kolegij se ne bira u Postavkama, nego dodirom kartice na Početnoj.

## 13. Pohrana

localStorage ključ `bmkviz.v1` (ostaje zbog postojećih podataka) → jedan JSON objekt, shema **3**:

```
{ schema: 3,
  settings: { lastCourse, displayMode, theme, vibration },          zajedničko
  bestStreak,                                                       najdulji zajednički streak
  courses: { "<id>": {
    settings: { dailyGoal, examDate, targetGrade, minutesPerDay,
                grading, examDuration, quiz, exam },                postavke kolegija (null = zadano)
    questions: { "<id pitanja>": zapis iz odjeljka 7 },
    exams: [], activeExam, days: { "2026-11-18": { answered, correct, seconds } },
    bestStreak, reports: [], overrides: [],
    plan: { examDate, targetGrade, minutesPerDay, daysOff, generatedAt, reviewFrom, baseline, today } } } }
```

Spremanje nakon svakog odgovora (debounce 300 ms). Migracije po `schema`:

- **1 → 2**: `settings.dailyGoal`, `grading`, `examDuration`, `quiz`, `exam` premještaju se u `courses.<settings.course>.settings` (zadano `biomehanika`); `settings.course` → `settings.lastCourse`. Napredak, ispiti, plan i prijave ostaju gdje jesu.
- **2 → 3**: kolegij s planom dobiva `settings.examDate`, `targetGrade` i `minutesPerDay` iz svog plana (ako ih još nema); plan i sve ostalo ostaje nepromijenjeno.

Export = cijeli objekt. Import prihvaća shemu ≤ trenutne i migrira je ("Spoji": napredak po pitanju s novijim `lastSeen`, ispiti/prijave unija, dan s većim brojem odgovora, postavke ostaju trenutne; "Zamijeni": sve, i postavke).

## 14. PWA i deploy

- `manifest.json`: name **"Kviz"**, short_name "Kviz", `start_url: "./"`, `scope: "./"`, `display: "standalone"`, ikone 192 i 512.
- `sw.js`: naziv cachea `bmkviz-<version>` iz `version.json`. App shell (index, css, js, manifest, ikone, `vendor/katex/` s fontovima): **cache-first**. `content/**`: **network-first s cache fallbackom** (nova pitanja stižu kad ima mreže, offline radi staro). Popis `CONTENT` sadrži `course.json`, sve datoteke pitanja i slike **svih kolegija**. Na `activate` briše stare cacheve. **Pri svakom deployu Claude Code podigne verziju** u `version.json` i `sw.js`.
- Sve putanje relativne (`./`), jer GitHub Pages poslužuje pod `/biomehanika-kviz/` (repozitorij i link ostaju isti).
- Lokalno testiranje: `python -m http.server 8000` u mapi projekta → `http://localhost:8000` u Chromeu (F12 → ikona mobitela, 412×915).
- Deploy: push na granu `main`, GitHub Pages iz root-a. URL `https://<korisnik>.github.io/biomehanika-kviz/`.
- Instalacija na telefon: Chrome → izbornik ⋮ → "Dodaj na početni zaslon" / "Instaliraj aplikaciju".

## 15. Sučelje

- **Početna = popis kolegija**: kartica zajedničkog streaka (odjeljak 9) i kartice kolegija redom iz `courses.json`. Kartica: naziv, dana do ispita (postavka kolegija, inače zadano iz `course.json`; bez datuma piše **"Postavi datum ispita"**), napredak danas (odgovoreno/dnevni cilj + traka, streak kolegija), današnji plan, oznaka započetog ispita. Kolegij bez pitanja: "U pripremi", ne može se otvoriti. Dodir kartice otvara **Početnu kolegija** (streak kolegija, današnji plan s gumbom Kreni, brzi start "Brzi kviz 10", "Samo ispitna pitanja", odabir poglavlja).
- **Zaglavlje** (na svim ekranima osim popisa kolegija): "‹ Kolegiji" (povratak na popis) i naziv odabranog kolegija.
- Donja navigacija: **Početna** (popis kolegija) · **Kviz** · **Ispit** · **Statistika** · **Postavke**. Kviz, Ispit, Statistika i Plan rade za odabrani kolegij. Aplikacija pamti zadnji odabrani kolegij (`settings.lastCourse`) i nakon ponovnog pokretanja; pri pokretanju se prikazuje popis kolegija.
- Mobile-first za širinu ~412 CSS px; min. 48 px dodirne površine; font ≥ 16 px; visok kontrast; točno/netočno označeno bojom **i** ikonom; tamna tema; CSS varijable; bez vanjskih fontova (sistemski font).
- Sve oznake na hrvatskom s dijakriticima.
- **Formule** (KaTeX, odjeljak 4) prikazuju se svugdje gdje se prikazuje tekst pitanja: pitanje, ponuđeni odgovori, objašnjenje, pregled ispita, statistika (`window.kvizMath.observe` na cijeloj stranici). Ne prikazuju se u poljima za upis i u tekstu prijava (kopira se izvorni zapis).
- **Slike** u pitanjima i objašnjenjima su uvijek na bijeloj podlozi s malim rubom (i u tamnoj temi). Dodir slike otvara je preko cijelog zaslona: dva prsta zumiranje (do 6×), jedan prst pomicanje zumirane slike, dvostruki dodir 2,5× / natrag, ✕ ili tipka Natrag zatvara.

## 16. Generiranje pitanja (pravila za Claude Code)

- Izvori: samo `content/source/<id>/` – `text/<nn>.md` (tekst po slajdu, naslov `## Slajd N`), primjeri ispitnih pitanja u `primjeri/` i ostali materijali navedeni u `docs/courses/<id>.md` (npr. skripta, pitanja s kolokvija). **Samo iz njih** – ništa se ne izmišlja; ako nečega nema u materijalu, pitanje se ne radi.
- Po poglavlju **15–25 pitanja** (kratka poglavlja ≥ 8). Obvezno pokriti: **sve brojeve** (vrijednosti, postotke, brojnosti), **sve formule** (nadopuni član; što označava veličina; jedinica), definicije, podjele, funkcije/uloge, "prvi / najveći / najmanji", usporedbe A vs. B.
- Tekst pitanja: jedna činjenica po pitanju; jasno; bez "što NIJE", bez "sve navedeno"/"ništa od navedenog". Kod nadopunjavanja praznina je na ključnom pojmu; odgovor ≤ 3 riječi ili broj. Tekst pitanja ne smije otkrivati odgovor.
- Distraktori: iste vrste kao odgovor (brojevi sličnog reda veličine iz kolegija, susjedni pojmovi, bliske podjele), uvjerljivi, međusobno isključivi, nisu varijante točnog odgovora i prema materijalu nisu također točni.
- `accepted`: sinonimi, kratice, s/bez jedinice, jednina/množina, latinski i hrvatski naziv.
- Objašnjenje: 2–5 rečenica, **zašto** (mehanizam, intuicija), vlastitim riječima, spominje broj/formulu; ne prepisuje slajd i ne dodaje tvrdnje kojih nema u materijalu. Izvor s brojem slajda.
- Slike: kad je slika bitna (dijagram, građa, strukturna formula) kopirati iz `content/source/<id>/img-raw/` u `content/<id>/img/<nn>-<k>.png` (max 1200 px) i referencirati. Slika koja prikazuje sam odgovor ide u `explanation_image`, ne u `image`. Ispitni zadaci "skiciraj"/"nacrtaj" → `image-label` (ili `order`/`match`) + nekoliko `mc` pitanja o ključnim svojstvima skice.
- Stvarna ispitna pitanja (kolokvij, stari ispiti): `00-kolokvij.json`, prompt = izvorna rečenica s prazninom na ključnom pojmu, `real_exam: true`, stvarno poglavlje, izvorni smisao se ne mijenja. Za stavke "napiši formulu / skiciraj / postavi jednadžbu" napraviti fill/mc/image-label varijante. Primjeri pitanja koji nisu sa stvarnog ispita (npr. s predavanja) idu u stvarna poglavlja s `real_exam: false`.
- Formule, indeksi, eksponenti, grčka slova i kemijske oznake **uvijek u LaTeX zapisu** prema odjeljku 4 (npr. `$E = a \cdot \rho^{p}$`, `$\sigma = F/A$`, `$\ce{CO2}$`, `$0{,}6\,\text{MPa}$`), uz značenje i jedinicu svake veličine. `accepted` samo tipkani oblici (bez `$` i `\`).
- Nove datoteke pitanja upisati u `questionFiles` u `course.json`, a datoteke i slike u `CONTENT` u `sw.js`.
- Nakon generiranja: `python tools/validate.py --course <id>` (ili bez argumenta za sve) mora proći bez grešaka. Nejasnoće u materijalu i odstupanja upisuju se u odluke u `docs/courses/<id>.md`.
- **Redoslijed generiranja** po kolegiju je u `docs/courses/<id>.md`.

## 17. Alati (Python)

- `tools/extract_pdf.py --course <id> [--no-images]` (PyMuPDF, `pip install pymupdf` – pitati korisnika prije instalacije): za svaki PDF u `content/source/<id>/pdf/` (naziv počinje brojem poglavlja) → `content/source/<id>/text/<nn>.md` (po stranici `## Slajd N` + tekst) i slike u `content/source/<id>/img-raw/<nn>/` (ugrađene slike + render stranice 150 dpi kao rezerva). Javlja poglavlja iz `course.json` za koja nema PDF-a.
- `tools/validate.py [--course <id>]`: bez argumenta provjerava sve kolegije iz `courses.json`, s `--course` jedan (sukobi ID-ova i prefiksa s ostalim kolegijima provjeravaju se uvijek). Provjere: id kolegija i `idPrefix` valjani i jedinstveni; `course.json` (područja ↔ poglavlja, `examDate`, `grading`, `questionFiles` ↔ datoteke); ID-ovi pitanja jedinstveni u cijeloj aplikaciji i oblika `<prefiks>-<nn>-<nnn>` / `<prefiks>-k-<nnn>`; `chapter` postoji u course.json; `type` i `modes` valjani; `answer` neprazan; točno 3 distraktora; distraktori ≠ answer (normalizirano); `accepted` sadrži `answer`; slike postoje; `explanation` ≥ 1 rečenica; `source` neprazan; `tags` iz popisa. **Formule** (`tools/mathcheck.py`): greška ako je izvan `$...$` ostao zapis poput `x_i`, `x^2`, `10^5`, Unicode indeks/eksponent, grčko slovo, `·`/`×`, LaTeX naredba ili kemijska formula (H2O, Ca2+); ako `$` ili `{}` nisu uravnoteženi; ako je `___`, `%` (bez `\`) ili decimalni zarez bez `{,}` unutar formule; ako `accepted` sadrži `$` ili `\`. Zatim se **svaki tekst s formulom renderira u Chromeu bez prozora** (headless, KaTeX s `throwOnError`, isti `js/math.js` kao app) i svaka greška se ispisuje; `--no-browser` preskače taj korak. Ispisuje broj pitanja po poglavlju i ukupno po kolegiju; kolegij bez pitanja nije greška.

## 18. Faze izrade

| faza | sadržaj | gotovo kad |
|---|---|---|
| **M1** | struktura, index/manifest/sw, Kviz s `mc` i `fill`, povratna informacija + objašnjenje, Lako/Srednje/Teško, filtar po poglavljima, localStorage, course.json, `00-kolokvij.json`, validate.py, git init | radi lokalno u Chromeu, zatim na GitHub Pages i instalirano na telefonu |
| **M2** | scheduler (prioritet), progresija mc→fill, streak i dnevni cilj, osnovna statistika, extract_pdf.py + prva poglavlja | kviz bira pametno, streak se broji |
| **M3** | ispitni mod, pragovi ocjena, povijest ispita, Postavke, export/import | probni ispit s ocjenom radi |
| **M4** | plan učenja + puna statistika (heatmap, opasna pitanja, procjena ocjene, trend) | Početna prikazuje današnji plan |
| **M5** | pitanja za sva preostala poglavlja (3–5 po sesiji), tipovi `image-label`/`order`/`match`, sažeci poglavlja | validator zelen za sva poglavlja |
| **K** (0.6.0) | više kolegija: popis kolegija, zaglavlje, postavke i streak po kolegiju, shema 2, `--course` u alatima, dokumentacija po kolegiju | Biomehanika radi kao prije, novi kolegij "U pripremi" |

M1–M5 su napravljene uz Biomehaniku. Za novi kolegij sadržaj nastaje po predlošcima u `docs/prompts.md` (priprema kolegija → kolokvij/primjeri → poglavlja redom iz `docs/courses/<id>.md`).

Svaka faza završava: `python tools/validate.py` → upute za test → commit (poruka na hrvatskom) → push → provjera na telefonu.

## 19. Vremenski plan

Po kolegiju, u `docs/courses/<id>.md`.

## 20. Odluke

Opće odluke o aplikaciji. Odluke o sadržaju pojedinog kolegija su u `docs/courses/<id>.md`.

- 18.11.2026: PWA umjesto native aplikacije; podaci samo lokalno uz export; ocjenjivanje upisanih odgovora automatski uz "Ipak točno"; zaokruživanje → nadopunjavanje progresijom; sva pitanja ulaze bez prethodnog odobravanja, ispravci kroz "Prijavi grešku"; dnevni cilj zadano 10 pitanja.
- 18.11.2026 (M1): `course.json` dobiva polje `questionFiles` (popis datoteka u `questions/`), jer statički hosting ne može izlistati mapu; validator javlja grešku ako datoteka postoji, a nije navedena. Dodatne varijante kolokvij pitanja (jedna stavka → više pitanja) imaju ID-ove `<prefiks>-k-101` naviše; `<prefiks>-k-0nn` odgovara stavci nn izvornog popisa. Dodan alat `tools/make_icons.py` (ikone bez vanjskih paketa).
- 18.11.2026 (M2): Ako je skup pitanja manji od sesije, pitanja se ponavljaju (ne dvaput zaredom). Progresija mc→fill broji uzastopne odgovore po razini pitanja (polje `levelRun`), neovisno o prikazanom obliku. Najdulji streak pamti se u `bestStreak`.
- 18.11.2026 (M2, 0.2.1): Ocjenjivanje (dopuna odjeljka 5): `parseNumber` prepoznaje znanstveni zapis (6 × 10^5, 6x10^5, 6·10⁵, 6e5) i razmak kao tisućice (600 000); upis jednak distraktoru nikad nije točan; tipfeler se ne priznaje ako je upis jednako blizu ili bliži distraktoru; tipfeler se ne primjenjuje na odgovore sa znamenkama. Git autor: GitHub noreply adresa.
- 18.11.2026 (M3, 0.3.0): Ispitni mod u `js/exam.js`, Postavke u `js/settings.js`, odabir poglavlja zajednički za Kviz i Ispit (`js/picker.js`). Započeti ispit sprema se u `courses.<id>.activeExam` (nastavlja se nakon zatvaranja aplikacije; ako je vrijeme isteklo, automatski se predaje). Broj pitanja u ispitu mijenja se gumbima ±1/±5. Sastav: kvote po poglavlju metodom najvećeg ostatka; unutar poglavlja ~30 % s kolokvija, zatim globalna dopuna zamjenom do ≥ 30 %. Pitanja se u ispitu biraju nasumično (ne scheduler), da probni ispit bude nepristran. Neodgovorena pitanja su 0 bodova i ne ulaze u statistiku pitanja. Zapis u `exams[]` ima i polje `points`. Na ekranu Ispit prikazuje se povijest i procjena ocjene (prosjek zadnja 3). Postavke: pragovi i zadano trajanje (null = vrijednosti iz course.json); tema Prati sustav/Tamna/Svijetla (`data-theme` na `<html>`); Import nudi "Spoji" (napredak po pitanju s novijim `lastSeen`, ispiti/prijave unija, dan s većim brojem odgovora) ili "Zamijeni"; Reset briše napredak, a postavke i prijave ostaju; Prijave imaju i "Obriši prijave". Ocjenjivanje (dopuna odjeljka 5): en/em crtica i minus (–, —, −) normaliziraju se u "-", da raspon "3–4 %" ne postane "34 %".
- 18.11.2026 (M4, 0.4.0): Plan učenja u `js/plan.js`. Poglavlje je **obrađeno** kad je viđeno ≥ 80 % njegovih pitanja. Plan pamti i `reviewFrom` (prvi dan ponavljanja, fiksan od izrade plana), `baseline` (prvotni raspored datum → poglavlja) i `today` (današnji zadatak, "zamrzne" se za cijeli dan; novi dan = novi izračun). **Zaostatak** = poglavlja koja su po prvotnom rasporedu trebala biti obrađena prije danas, a nisu; ta poglavlja idu na početak preostalog rasporeda. Dnevni broj na danima učenja = perDay; samo kod zaostatka povećava se na broj potreban da se do ponavljanja vide sva neviđena pitanja (uz 70 % novih), najviše 3 × perDay. Ako ni bez zaostatka perDay nije dovoljan za sva pitanja, ekran Plan to prikazuje kao napomenu s preporučenim brojem minuta. Težina poglavlja pri preračunu = broj neviđenih pitanja. Dan učenja bez poglavlja postaje dan ponavljanja. Neradni dani su dani u tjednu. Datum ispita na Početnoj uzima se iz plana ako postoji. Gumb Kreni na danu učenja pokreće kviz 70 % neviđenih iz današnjih poglavlja + 30 % ponavljanja (scheduler preko viđenih), manjak se dopuni iz današnjih poglavlja; na danu ponavljanja običan kviz preko svih poglavlja; svaki 3. dan ponavljanja gumb "Probni ispit · 30 min".
- 18.11.2026 (M4, statistika): Trend = stupci točnosti po danu (boja po pragovima 75 % / 60 %, uz legendu i tablicu), kalendar = heatmap 8 tjedana (pon–ned) s nijansama prema dnevnom cilju; dodir na stupac/dan prikazuje vrijednost. "Opasna" = barem jednom ocijenjeno "lako" i zadnji odgovor netočan. Liste pitanja su sklopive. Povijest ispita i procjena ocjene dijele prikaz s ekranom Ispit.
- 18.11.2026 (0.4.1): Ocjenjivanje (dopuna odjeljka 5): brojčana tolerancija primjenjuje se samo kad je i `answer` broj; iza broja ne smije biti formula (π, zagrade, √, +, =, ·, ×), npr. "2π/λ" nije broj 2; zapis "10^-8" čita se kao 1e-8. Poglavlje smije imati više od 25 pitanja kad materijal ima mnogo brojeva i podjela (razlog se upisuje u odluke kolegija).
- 18.11.2026 (0.5.1): Slika uz pitanje koja prikazuje sam odgovor ide u `explanation_image`; tekst pitanja ne smije otkrivati odgovor. Ocjenjivanje (dopuna odjeljka 5): znak mikro (µ, U+00B5) i grčko mi (μ, U+03BC) smatraju se istim znakom. Vibracija se ne poziva prije prvog dodira (Chrome to blokira i javlja grešku u konzoli). Service worker pri instalaciji dohvaća datoteke mimo HTTP cachea preglednika (`cache: 'reload'`), jer je nova verzija inače mogla spremiti stare JS datoteke; `content/**` se dohvaća s `cache: 'no-cache'`.
- 18.11.2026 (0.6.0, više kolegija): Aplikacija podržava više kolegija; drugi kolegij je **Biokemija lijekova** (id `biokemija-lijekova`, prefiks `bl`), zasad bez pitanja ("U pripremi"). Specifikacija je podijeljena na opći dio (ovaj dokument) i `docs/courses/<id>.md`; izvorni materijali su u `content/source/<id>/` (Biomehanika premještena u `content/source/biomehanika/`). Svaki kolegij ima `idPrefix` u `course.json`; ID-ovi su jedinstveni u cijeloj aplikaciji (provjerava `validate.py`). `extract_pdf.py` traži `--course <id>`; `validate.py` bez argumenta provjerava sve kolegije. **Po kolegiju**: streak i dnevni cilj (dan se broji kad je tom kolegiju odgovoreno ≥ njegov cilj), plan učenja, postavke ispita (datum, pragovi, trajanje), statistika, prijave, zadnji odabir poglavlja u Kvizu i Ispitu. **Zajedničko**: način prikaza, tema, vibracija, export/import. Početna je popis kolegija (kartice: naziv, dana do ispita, napredak danas, današnji plan) sa **zajedničkim streakom**, u kojem se dan broji ako je bilo kojem kolegiju ispunjen dnevni cilj. Dodir kartice otvara Početnu kolegija; zaglavlje pokazuje naziv kolegija i "‹ Kolegiji". Aplikacija pamti zadnji odabrani kolegij; odabir kolegija uklonjen je iz Postavki. Pohrana: shema 2 s migracijom iz sheme 1 (odjeljak 13); ključ `bmkviz.v1` i prefiks cachea `bmkviz-` ostaju. Započeti ispit jednog kolegija pri prelasku na drugi ostaje spremljen i nastavlja se (ili predaje ako je vrijeme isteklo) kad se kolegij ponovno otvori. `course.json` smije imati `examDate: null` (plan tada traži upis datuma). Export se zove `kviz-backup-GGGG-MM-DD.json`. Ime aplikacije u manifestu i naslovu je **"Kviz"**; repozitorij `biomehanika-kviz` i link ostaju isti.
- 19.11.2026 (0.8.8, duge formule): Formula u retku (`$...$`) ne može se prelomiti ako je mhchem jednadžba ili dugi izraz, pa je probijala okvir kartice. `js/math.js` nakon prikaza provjerava prelijeva li se okvir oko formule (`scrollWidth > clientWidth`) i takvu formulu stavlja u `<span class="math-scroll">`, koji se može pomicati vodoravno (css `.math-scroll`). Kratke formule ostaju netaknute, pa se poravnanje u retku ne mijenja. Vrijedi za sve ekrane i oba kolegija; tekst pitanja se ne mijenja zbog duljine formule.
- 18.11.2026 (0.8.0, alati): `extract_pdf.py` prepoznaje broj poglavlja i kad iza njega slijedi razmak ili točka („1 Uvod.pdf”), ne samo podvlaka. `mathcheck.py` ne prijavljuje oznake enzima, gena i kratica (CYP2C19, FMO3, UGT1A6, NADPH, NAPQI …) kao kemijsku formulu izvan `\ce{...}`; prave kemijske oznake (CO, H2O, Ca2+) i dalje moraju biti u `$\ce{...}$`. Kemijske strukture u pitanjima uzimaju se **isključivo** izrezom sa slajda kolegija (render 300 dpi, PNG, max 1200 px, izvor = datoteka + slajd); ako spoj nije nacrtan ni na jednom slajdu, dopuštena je 2D slika iz PubChema (izvor = „PubChem CID …”). Struktura se nikad ne crta sama ni iz SMILES-a napamet.
- 18.11.2026 (0.7.0): **Formule**: KaTeX 0.19.1 + mhchem lokalno u `vendor/katex/` (bez npm-a, sve u cacheu service workera). Zapis u pitanjima: matematika `$...$`/`$$...$$`, kemija `\ce{...}`, indeksi/eksponenti/grčka slova/množenje samo kao LaTeX, decimalni zarez `{,}` (odjeljak 4). `answer` i distraktori smiju imati LaTeX, `accepted` samo tipkane oblike; ocjenjivanje upisa koristi `plainText()` (LaTeX → običan tekst) za `answer` i distraktore. Formule se prikazuju automatski (MutationObserver na `document.body`); neispravna formula ostaje kao tekst. `validate.py` provjerava zapis i renderira svako pitanje s formulom u Chromeu bez prozora. Sva postojeća pitanja Biomehanike pretvorena su u taj zapis (ID-ovi nepromijenjeni). **Slike**: bijela podloga s malim rubom u obje teme; dodir otvara prikaz preko cijelog zaslona sa zumiranjem (`js/zoom.js`), tipka Natrag ga zatvara. **Podaci o ispitu** (datum, ciljana ocjena, minute dnevno, trajanje, pragovi) su postavke kolegija u aplikaciji (Postavke → Ispit, i ekran Plan); `course.json` ih smije imati samo kao neobavezne zadane vrijednosti. Kolegij bez datuma: kartica "Postavi datum ispita", Plan traži datum prije izrade, kviz i ispit rade. Pohrana: shema 3 (migracija prenosi datum, ocjenu i minute iz postojećeg plana u postavke; plan ostaje netaknut).
