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
3. **03 + 04** – hidroksilacije sp3 C-atoma, N-/O-/S-dealkilacija, oksidativna deaminacija (gotovo, 38 + 26 pitanja)
4. **06 FMO i oksidacija N- i S-atoma** – trimetilamin, cimetidin, sulindak (gotovo, 38 pitanja)
5. **08 Redukcije** – varfarin, metadon, prontosil, nitro- i azo-redukcija (gotovo, 30 pitanja)
6. **09 Hidrolize** – esteri, amidi, kokain, penicilini (gotovo, 33 pitanja)
7. **07 Peroksidaze i molibden hidroksilaze** – paracetamol/NAPQI, XOR i AO (gotovo, 40 pitanja)
8. **05 Hidroksilacije sp2 i sp C-atoma** – arenoksidi, MBI (gotovo, 38 pitanja)
9. **01 Uvod** – ADME, lipofilnost, lokalizacija enzima (gotovo, 40 pitanja)
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

## Slike – obrađena poglavlja

Dodavanje slika u objašnjenja i pitanja prema pravilima u `docs/app-spec.md`, odjeljak 16 („Slike”); počinje kad je cijela Biomehanika gotova. Obrađuju se samo poglavlja koja već imaju pitanja, skupine od 5–8 poglavlja po sesiji, redom iz odjeljka 4; pitanja iz `00-primjeri.json` uz poglavlje na koje se odnose.

| skupina | poglavlja | stanje |
|---|---|---|
| 1 | 02, 03, 04, 06, 08 | **gotovo** (0.9.6): u pitanju / u objašnjenju – 02: 0/11 (+ primjeri 0/4), 03: 0/13 (+ primjeri 0/3), 04: 0/11 (+ primjeri 0/4), 06: 0/8 (+ primjeri 0/4), 08: 1/17 (+ primjeri 0/6) |
| 2 | 09, 07, 05, 01 | **gotovo** (0.9.7): u pitanju / u objašnjenju – 09: 0/14 (+ primjeri 0/3), 07: 0/23 (+ primjeri 0/2), 05: 0/23, 01: 0/4 (+ primjeri 0/1) |

**Sva poglavlja s pitanjima su obrađena** (0.9.7): 103 slike, 1 pitanje sa slikom u pitanju i 151 sa slikom u objašnjenju (od 356). Nova poglavlja (II. faza) dobivaju slike odmah pri generiranju pitanja, prema app-spec odjeljku 16.

## 7. Vremenski plan

Određuje se kad bude poznat datum ispita (korisnik ga upisuje u aplikaciji).

## 8. Odluke o sadržaju

- 18.11.2026 (0.6.0): Kolegij dodan u `content/courses.json` s id-om `biokemija-lijekova` i prefiksom `bl`; `course.json` je prazan (bez poglavlja, područja i pitanja), pa kartica na Početnoj pokazuje "U pripremi". Napravljene su mape `content/source/biokemija-lijekova/pdf/` i `primjeri/`.
- 18.11.2026 (0.7.0): Podatke o ispitu (datum, ciljana ocjena, minute dnevno, trajanje, pragovi) bira korisnik u aplikaciji; iz `course.json` uklonjeni su `examDate: null`, `grading` i `exam` (bile su privremene vrijednosti).
- 18.11.2026 (0.8.0, poglavlja i primjeri): Poglavlja 01–09 i 7 područja prema dostupnim prezentacijama. **ID poglavlja = broj iz naziva PDF-a** (bez prenumeriranja), pa se nova poglavlja mogu dodati bez promjene postojećih ID-ova pitanja. Naslovi poglavlja ispravljaju tipfeler iz naziva datoteke („Hidoksilacije” → „Hidroksilacije”), dok `source` zadržava točan naziv datoteke.
- 18.11.2026 (0.8.0, primjeri): Studentski zapis ispita prepisan je u `content/source/biokemija-lijekova/primjeri.md`. Svaka stavka provjerena je u prezentacijama; u `00-primjeri.json` ušlo je 33 pitanja (`real_exam: true`), a nepokrivene stavke popisane su u odjeljku 6. Razlike u odnosu na zapis: (a) **ksantin → mokraćna kiselina** katalizira XOR, a ne „XOR i AO” (07, slajd 16); AO s XOR-om oksidira alopurinol. (b) **Kloramfenikol**: toksični metaboliti nastaju i redukcijom nitro-skupine i oksidativnom dehalogenacijom (04, slajd 29), pa tvrdnja da oksidacija ne daje toksičan produkt nije točna. (c) Podatak „90 % ksenobiotika” nije na slajdu 16 prezentacije 02, pa o tom postotku nema pitanja; pitanja se odnose na najveći doprinos (CYP3A4/5) i na izražen polimorfizam (CYP2C19, CYP2D6). (d) **Penicilin**: zapis navodi „amidaza”, prezentacija (09, slajd 24) penicilin-acilazu i $\beta$-laktamazu (produkt: peniciloinska kiselina).
- 18.11.2026 (0.8.0, poglavlje 02): 40 pitanja za Citokrom P450. Poglavlje ima više od 25 pitanja jer je opsežno (36 slajdova) i puno brojeva (udjeli enzima, granice sličnosti slijeda, koraci katalitičkog ciklusa, uvjeti centrifugiranja). Velik dio slajdova (8–18, 20–24, 27, 30–32, 34) nema tekstualni sloj, pa je sadržaj očitan s renderiranih slajdova u `img-raw/02/`. Udjeli enzima u jetri i crijevu navedeni su kao približni (na slajdu 12 piše da ovise o populaciji, uzorcima i metodi). Pitanja ne ponavljaju činjenice koje su već u `00-primjeri.json` (Soretova vrpca, 450 nm, polimorfizam CYP2C19/CYP2D6, najveći udio CYP3A4/5, sudbina drugog atoma kisika, adrenodoksin).
- 19.11.2026 (0.8.1, poglavlja 03 i 04): 38 pitanja za 03 (hidroksilacije sp3 C-atoma, oksidacija alkohola i aldehida, N-dealkilacija) i 26 za 04 (oksidativna deaminacija, MAO/DAO/PAO, O- i S-dealkilacija, oksidativno cijepanje estera, dehalogenacija). Poglavlje 03 ima više od 25 pitanja jer je opsežno (48 slajdova, tri cjeline: alkoholi/aldehidi, hidroksilacije i dealkilacije). Pitanja ne ponavljaju činjenice iz `00-primjeri.json` (($\omega-1$)-položaj kod kraćih lanaca, kotinin iz C-atoma, karbinolamin i produkti N-dealkilacije, kodein → morfin, fenetidin, kloramfenikol i redukcija nitro-skupine, fenil-2-propanon). Slajdovi 11 (03) te 8, 9, 12 i 15 (04) nemaju tekstualni sloj, pa su očitani s rendera u `img-raw/`.
- 19.11.2026 (0.8.2, poglavlje 06): 38 pitanja za FMO i oksidaciju N- i S-atoma. Poglavlje ima više od 25 pitanja jer obuhvaća dvije cjeline (FMO enzimi i oksigenacija heteroatoma) na 44 slajda, s mnogo podjela (tipovi amina, produkti oksidacije sumpora) i primjera lijekova. Pitanja ne ponavljaju činjenice iz `00-primjeri.json` (isti izvor kisika kod FMO i CYP, trimetilamin → N-oksid, puni naziv flavin-monooksigenaze, cimetidin i FMO3, kotinin). Slajdovi 14, 17, 26 i 44 su samo slike, pa su očitani s rendera u `img-raw/06/`.
- 19.11.2026 (0.8.3, poglavlje 08): 30 pitanja za Redukcije (jedno- i dvoelektronska redukcija, karbonili i kinoni, nitro- i azo-spojevi, N-oksidi, disulfidi i sulfoksidi, reduktivna dehalogenacija). Pitanja ne ponavljaju činjenice iz `00-primjeri.json` (metadol, aktivni sulfid sulindaka, 4 elektrona za azo-skupinu, sulfanilamid iz prontosila, CBR1/AKR1C3 kod varfarina). Slajdovi 6, 7, 8, 16, 21, 23, 26 i 35 su samo slike, pa su očitani s rendera u `img-raw/08/`; podatak o ukupno 6 elektrona za nitro-redukciju i o enzimima po staničnim odjeljcima (mARC, POR, NQO1) nalazi se samo na tim slikama.
- 19.11.2026 (0.8.7, poglavlje 01): 40 pitanja za Uvod (osnovni pojmovi, ADME(T), farmakokinetika i farmakodinamika, apsorpcija i učinak prvog prolaza, biološke barijere, lipofilnost i log P/log D, distribucija, ishodi metabolizma, MIST i prag od 10 % AUC-a, lokalizacija enzima te ekskrecija). Poglavlje ima više od 25 pitanja jer uvod pokriva cijeli ADME(T) ciklus (31 slajd). Pitanja ne ponavljaju dvije činjenice iz `00-primjeri.json` (mogućnost štetnih metabolita i jezgrina ovojnica kao mjesto enzima). Slajdovi 7, 9, 13, 27, 28 i 29 su samo slike, pa su usporedba PK i PD, obrambeni mehanizmi, presistemska eliminacija i bioraspoloživost, algoritam MIST, mjesta metabolizma u tijelu i lokalizacija enzima u stanici očitani s rendera u `img-raw/01/`. Time su sva poglavlja prve prezentacijske cjeline (I. faza metabolizma) pokrivena; II. faza čeka materijale.
- 19.11.2026 (0.8.6, poglavlje 05): 38 pitanja za Hidroksilacije sp2 i sp C-atoma (arenoksid i njegovi metabolički putevi, NIH-pomak, epoksid-hidrolaza i konjugacija s glutationom, regioselektivnost i utjecaj supstituenata, lijekovi amfetamin, propranolol, fenobarbital, estradiol i karbamazepin te oksidacija alkina i inhibicija temeljena na mehanizmu). Poglavlje ima više od 25 pitanja jer objedinjuje dvije cjeline iz iste prezentacije ($sp^2$ i $sp$ C-atom, 31 slajd). U `00-primjeri.json` nema nijednog pitanja iz ovog poglavlja, pa preklapanja nema. Slajdovi 5, 13 i 22 su samo slike, pa su shema metaboličkih puteva arenoksida, primjer 4-deutero-anisola i mehanizam epoksidacije dvostruke veze očitani s rendera u `img-raw/05/`.
- 19.11.2026 (0.8.5, poglavlje 07): 40 pitanja za Peroksidaze i molibden hidroksilaze (vrste hemskih peroksidaza PGHS/COX, MPO, LPO i TPO, mehanizam preko spojeva I i II, fenoksil i semikinonski radikali, kinoni i oksidativni stres, zaštitni mehanizmi, molibden hidroksilaze AO i XOR te lijekovi aciklovir, alopurinol i 6-merkaptopurin). Poglavlje ima više od 25 pitanja jer objedinjuje dvije velike skupine enzima (19 slajdova, od kojih su 4 velike sheme). Pitanja ne ponavljaju dvije činjenice već pokrivene u `00-primjeri.json` (enzim koji oksidira ksantin u mokraćnu kiselinu i nastanak NAPQI-ja). Slajdovi 3, 11, 15 i 16 su samo slike, pa su reakcije peroksidaza, antioksidativna obrana, usporedba AO/XOR i shema purina očitani s rendera u `img-raw/07/`.
- 19.11.2026 (0.8.4, poglavlje 09): 33 pitanja za Hidrolize (CES enzimi, hidroliza estera i amida, fosfatni i nitratni esteri, epoksidi, peptidi, glukuronidi te manje zastupljene reakcije I. faze). Poglavlje ima više od 25 pitanja jer uz hidrolize obuhvaća i ciklizaciju, kondenzaciju i dekarboksilaciju (37 slajdova). Pitanja ne ponavljaju činjenice iz `00-primjeri.json` (elektronski i sterički čimbenici brzine hidrolize, peniciloinska kiselina, kokaetilen). Slajd 6 (građa i distribucija CES) je samo slika, pa su katalitička trijada Ser–His–Glu, acil-enzim i raspodjela CES1/CES2 očitani s rendera u `img-raw/09/`.
- 18.11.2026 (0.8.0, alati): `extract_pdf.py` prepoznaje i nazive s razmakom iza broja („1 Uvod.pdf”), ne samo s podvlakom. `mathcheck.py` ne prijavljuje oznake enzima i gena (CYP2C19, FMO3, UGT1A6, NADPH …) kao kemijske formule izvan `\ce{}`.
- 19.11.2026 (0.9.6, slike – skupina 1): Slike za 02, 03, 04, 06 i 08 i njihova pitanja iz primjera. Sve strukture i sheme su izrezi sa slajdova; PubChem nije bio potreban (nijedno pitanje ne traži strukturu koje nema na slajdu). Sheme reakcija preširoke za mobitel složene su od dva ili više izreza istog slajda jedan ispod drugog (npr. nitro-redukcija u 6 koraka, 08/16), bez promjene sadržaja; ponegdje su strelice s oznakama enzima prekrivene, a nazivi spojeva ostaju. Slika u pitanju samo bl-08-019 (sulfasalazin bez produkata – pitanje traži produkte). Slike koje pokazuju naziv traženog spoja (npr. klordiazepoksid, prontosil → sulfanilamid, azo-redukcija s 4e⁻) samo su u objašnjenju. Bez slike (atomi i natpisi ~4–8 px i u uskom izrezu): ciklus FMO (06/8), sulindak (06/37), metamfetamin (06/24), enzimi po odjeljcima (08/6), dehalogenacija (08/35), metronidazol i nitrofural (08/21), smještaj CYP (02/14), tablica sustava (02/33), metanol, etilen-glikol i etanol (03/12–14), nikotin → kotinin (03/48), pregled enzima (04/2).
- 19.11.2026 (0.9.7, slike – skupina 2): Slike za 01, 05, 07 i 09 i njihova pitanja iz primjera; time su sva poglavlja s pitanjima obrađena. Sve su u objašnjenjima, jer sheme pokazuju tražene produkte i enzime. Bez slike (natpisi ~3–7 px i u uskom izrezu ili samo ponavljaju tekst): infografike Uvoda (01/7, 9, 13, 25, 28 i cijeli algoritam MIST 01/27), propranolol (05/18), PGHS/COX i MPO panel (07/3), aciklovir (07/17), infografika CES (09/6). Dimer paracetamola (07/9) namjerno nije u izrezu, jer bi u složenoj slici stajao ispod NAPQI, a nastaje iz radikala NAPSQI.
