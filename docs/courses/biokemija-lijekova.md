# Kolegij: Biokemija lijekova

Mjerodavno za sadržaj kolegija Biokemija lijekova. Opća pravila aplikacije, format pitanja i pravila generiranja su u `docs/app-spec.md`. Stanje: **u izradi** – poglavlja 01–09 (I. faza metabolizma) i pitanja iz primjera ispita; materijali za II. fazu (konjugacije) još nisu dostupni.

## 1. Osnovni podaci

| | |
|---|---|
| id kolegija | `biokemija-lijekova` |
| prefiks ID-a pitanja | `bl` (npr. `bl-03-001`, stvarna ispitna pitanja `bl-k-001`) |
| sadržaj u aplikaciji | `content/biokemija-lijekova/` (`course.json`, `questions/`, `img/`) |
| izvorni materijali | `content/source/biokemija-lijekova/` (u `.gitignore`) |
| ispit | datum, ciljanu ocjenu, minute dnevno, trajanje i pragove postavlja korisnik u aplikaciji (Postavke kolegija / Plan); `course.json` ih nema, pa vrijede opće zadane vrijednosti (pragovi 50/62/75/88 %, 45 min, ocjena 3, 15 min dnevno) |
| nastavnica | prof. dr. sc. Monika Barbarić, Zavod za farmaceutsku kemiju (1 Uvod.pdf, slajd 1) |

## 2. Izvorni materijali

```
content/source/biokemija-lijekova/
  pdf/        prezentacije 1–9 (naziv počinje brojem poglavlja i razmakom, npr. "3 Hidoksilacije sp3 C-atoma_1. dio.pdf")
  primjeri/   "BKL - ispiti i parcijalni 2022.pdf" – studentski zapis ispitnih pitanja (prije 2022.)
  primjeri.md prijepis tog zapisa u čisti tekst (izrađeno u ovoj fazi)
  text/       <nn>.md – tekst po slajdu (python tools/extract_pdf.py --course biokemija-lijekova)
  img-raw/    slike i renderi slajdova (150 dpi) po poglavljima
```

**ID poglavlja uzima se iz broja u nazivu PDF-a i nikad se ne prenumerira.** Nove prezentacije dobivaju svoj broj (npr. „10 Konjugacije.pdf” → poglavlje `10`), pa se postojeći ID-ovi pitanja ne mijenjaju. Ako prezentacija nema broj u nazivu, ID je kratki slug naziva.

## 3. Područja i poglavlja

Područja (`areas`):

| id | naziv | poglavlja |
|---|---|---|
| uvod | Uvod, ADME i sudbina lijeka | 01 |
| cyp | Citokrom P450 | 02 |
| oks-c | Oksidacije C-atoma i dealkilacije | 03, 04, 05 |
| oks-ns | FMO i oksidacija N- i S-atoma | 06 |
| peroksidaze | Peroksidaze i molibden hidroksilaze | 07 |
| redukcije | Redukcije | 08 |
| hidrolize | Hidrolize i ostale reakcije I. faze | 09 |

Poglavlja (`chapters`):

01 Uvod · 02 Citokrom P450 · 03 Hidroksilacije sp3 C-atoma – 1. dio · 04 Hidroksilacije sp3 C-atoma – 2. dio · 05 Hidroksilacije sp2 i sp C-atoma · 06 FMO i oksidacija N- i S-atoma · 07 Peroksidaze i molibden hidroksilaze · 08 Redukcije · 09 Hidrolize

Kad stignu prezentacije o II. fazi, predviđena su nova područja (konjugacije: glukuronidacija, sulfokonjugacija, konjugacija s glutationom, acetilacija, metilacija, konjugacija s aminokiselinama) i poglavlja s brojevima iz naziva novih PDF-ova.

Pitanja iz primjera ispita (`00-primjeri.json`) nemaju vlastito poglavlje: svako dobiva `chapter` stvarnog poglavlja na koje se odnosi i `real_exam: true`. `bl-k-0nn` odgovara redoslijedu stavki u `primjeri.md`.

## 4. Redoslijed generiranja

Prioritet prema zastupljenosti u primjerima ispitnih pitanja:

1. **00 primjeri** – pitanja iz zapisa ispita, provjerena u prezentacijama (gotovo, 33 pitanja)
2. **02 Citokrom P450** – mehanizam, Soretova vrpca, polimorfizmi, prijenos elektrona (gotovo, 40 pitanja)
3. **03 + 04** – hidroksilacije sp3 C-atoma, N-/O-/S-dealkilacija, oksidativna deaminacija (kodein, amfetamin, nikotin, kloramfenikol)
4. **06 FMO i oksidacija N- i S-atoma** – trimetilamin, cimetidin, sulindak
5. **08 Redukcije** – varfarin, metadon, prontosil, nitro- i azo-redukcija
6. **09 Hidrolize** – esteri, amidi, kokain, penicilini
7. **07 Peroksidaze i molibden hidroksilaze** – paracetamol/NAPQI, XOR i AO
8. **05 Hidroksilacije sp2 i sp C-atoma** – arenoksidi, MBI
9. **01 Uvod** – ADME, lipofilnost, lokalizacija enzima
10. Nova poglavlja (II. faza) čim stignu prezentacije

## 5. Posebnosti izvora

- **Primjeri su studentski zapis** starijih ispita (prije 2022.) i odgovori u njima mogu biti netočni. Svaka tvrdnja provjerava se u prezentacijama; prednost uvijek ima PDF, a razlika se opisuje u objašnjenju pitanja.
- **Kemijske strukture moraju biti točne.** Slika strukture uzima se izrezom sa slajda (render stranice 300 dpi, uski izrez samo strukture s nazivom ako je na slajdu, PNG, max 1200 px širine), izvor = datoteka + slajd. Ako spoj nije nacrtan ni na jednom slajdu, smije se uzeti 2D slika iz PubChema (pretraga po točnom nazivu, uz provjeru da se naziv ili sinonim CID-a podudara), izvor = „PubChem CID …”. Struktura se nikad ne crta sama ni iz SMILES-a napamet.
- Pitanja o strukturama (prepoznaj spoj, označi funkcionalnu skupinu) rade se kao tip `image-label`.
- Mnogi slajdovi su samo slika (sheme reakcija bez teksta), pa se sadržaj čita iz renderiranog slajda u `img-raw/<nn>/slajd-<N>.png`.

## 6. Čeka materijale

Primjeri ispitnih pitanja koji nisu pokriveni dostupnim prezentacijama; pitanja se rade kad stignu materijali:

**II. faza (konjugacije) – cijeli drugi parcijalni:**
- merkapturne kiseline i konjugacija s glutationom; merkaptopurat metilizocijanata
- acetil-CoA kao prenositelj acetilne skupine; mehanizam N-acetilacije (R-NH₂)
- PAPS i sulfokonjugacija (L-DOPA, alkoholi < 6 C-atoma, tioli, bisfenol A)
- glukuronidacija: O-glukuronidi vs. O-sulfokonjugati, glukuronid bilirubina i albumin, nikotin i N⁺-glukuronidi, glukozidacija
- acil-glukuronidi i njihove reakcije (hidroliza, transacilacija s GSH i proteinima, imunogenost)
- metilacija: S-adenozilmetionin, COMT, TMT, NMT, TPMT; histamin i HNMT; azatioprin; adrenalin iz noradrenalina
- acetilacija: izoniazid i spori acetilatori, prokainamid, aromatski amini (N- i O-acetilacija)
- konjugacija s aminokiselinama: ibuprofen i taurin, kiralna izomerizacija ibuprofena (AMACR), hipurna kiselina
- sinteza glutationa (2 mol ATP); tioli, sulfenske kiseline i miješani disulfidi
- NNK iz duhanskog dima i njegova toksikacija/detoksikacija
- simvastatin → alkil-epoksid i konjugacija s glutationom
- 5-metilkrizen (sulfokonjugacija, karbokation, adukti s DNA)
- tablica biotransformacije amfetamina s konjugacijama (UGT, acil-CoA-sintetaza, NAT)
- imunosne reakcije lijekova i metabolita (karbamazepin, dihidralazin, halotan, penicilin, prokainamid, propiltiouracil, sulfametoksazol)
- inter-individualne varijacije (utjecaj upale na razinu enzima)

**Ostalo:**
- nitrofural i njegova nitro-redukcija (prezentacija 08 obrađuje nitrofurantoin i metronidazol, ne nitrofural)
- cjelovit metabolizam kloramfenikola (glukuronidacija i acetilacija su II. faza)
- 5-fluorouracil i cirkadijalni ritam (DPYD) – nije ni u jednoj dostupnoj prezentaciji
- cijeli put metabolizma adrenalina od tirozina (COMT i MAO put)
- N-oksid diazepama kao metabolit diazepama – prezentacija 03 (slajd 45) navodi nordazepam, temazepam i oksazepam, N-oksid se ne spominje
- tvrdnja o određivanju metabolizma lijeka u koštanom tkivu
- ispitna stavka s imipraminom (zapis je nepotpun)

## 7. Vremenski plan

Određuje se kad bude poznat datum ispita (korisnik ga upisuje u aplikaciji).

## 8. Odluke o sadržaju

- 18.11.2026 (0.6.0): Kolegij dodan u `content/courses.json` s id-om `biokemija-lijekova` i prefiksom `bl`; `course.json` je prazan (bez poglavlja, područja i pitanja), pa kartica na Početnoj pokazuje "U pripremi". Napravljene su mape `content/source/biokemija-lijekova/pdf/` i `primjeri/`.
- 18.11.2026 (0.7.0): Podatke o ispitu (datum, ciljana ocjena, minute dnevno, trajanje, pragovi) bira korisnik u aplikaciji; iz `course.json` uklonjeni su `examDate: null`, `grading` i `exam` (bile su privremene vrijednosti).
- 18.11.2026 (0.8.0, poglavlja i primjeri): Poglavlja 01–09 i 7 područja prema dostupnim prezentacijama. **ID poglavlja = broj iz naziva PDF-a** (bez prenumeriranja), pa se nova poglavlja mogu dodati bez promjene postojećih ID-ova pitanja. Naslovi poglavlja ispravljaju tipfeler iz naziva datoteke („Hidoksilacije” → „Hidroksilacije”), dok `source` zadržava točan naziv datoteke.
- 18.11.2026 (0.8.0, primjeri): Studentski zapis ispita prepisan je u `content/source/biokemija-lijekova/primjeri.md`. Svaka stavka provjerena je u prezentacijama; u `00-primjeri.json` ušlo je 33 pitanja (`real_exam: true`), a nepokrivene stavke popisane su u odjeljku 6. Razlike u odnosu na zapis: (a) **ksantin → mokraćna kiselina** katalizira XOR, a ne „XOR i AO” (07, slajd 16); AO s XOR-om oksidira alopurinol. (b) **Kloramfenikol**: toksični metaboliti nastaju i redukcijom nitro-skupine i oksidativnom dehalogenacijom (04, slajd 29), pa tvrdnja da oksidacija ne daje toksičan produkt nije točna. (c) Podatak „90 % ksenobiotika” nije na slajdu 16 prezentacije 02, pa o tom postotku nema pitanja; pitanja se odnose na najveći doprinos (CYP3A4/5) i na izražen polimorfizam (CYP2C19, CYP2D6). (d) **Penicilin**: zapis navodi „amidaza”, prezentacija (09, slajd 24) penicilin-acilazu i $\beta$-laktamazu (produkt: peniciloinska kiselina).
- 18.11.2026 (0.8.0, poglavlje 02): 40 pitanja za Citokrom P450. Poglavlje ima više od 25 pitanja jer je opsežno (36 slajdova) i puno brojeva (udjeli enzima, granice sličnosti slijeda, koraci katalitičkog ciklusa, uvjeti centrifugiranja). Velik dio slajdova (8–18, 20–24, 27, 30–32, 34) nema tekstualni sloj, pa je sadržaj očitan s renderiranih slajdova u `img-raw/02/`. Udjeli enzima u jetri i crijevu navedeni su kao približni (na slajdu 12 piše da ovise o populaciji, uzorcima i metodi). Pitanja ne ponavljaju činjenice koje su već u `00-primjeri.json` (Soretova vrpca, 450 nm, polimorfizam CYP2C19/CYP2D6, najveći udio CYP3A4/5, sudbina drugog atoma kisika, adrenodoksin).
- 18.11.2026 (0.8.0, alati): `extract_pdf.py` prepoznaje i nazive s razmakom iza broja („1 Uvod.pdf”), ne samo s podvlakom. `mathcheck.py` ne prijavljuje oznake enzima i gena (CYP2C19, FMO3, UGT1A6, NADPH …) kao kemijske formule izvan `\ce{}`.
