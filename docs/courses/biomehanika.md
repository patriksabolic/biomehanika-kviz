# Kolegij: Biomehanika

Mjerodavno za sadržaj kolegija Biomehanika (poglavlja, područja, ispit, redoslijed generiranja, odluke o sadržaju). Opća pravila aplikacije, format pitanja i pravila generiranja su u `docs/app-spec.md`. Izmjene o sadržaju ovog kolegija upisuju se ovdje (odjeljak 7 "Odluke o sadržaju").

## 1. Osnovni podaci

| | |
|---|---|
| id kolegija | `biomehanika` |
| prefiks ID-a pitanja | `bm` (npr. `bm-09-004`, kolokvij `bm-k-021`) |
| sadržaj u aplikaciji | `content/biomehanika/` (`course.json`, `questions/`, `img/`) |
| izvorni materijali | `content/source/biomehanika/` (u `.gitignore`) |
| ispit | **8.12.2026**, ciljana ocjena **dobar (3)**, ~15 min dnevno – postavlja se u aplikaciji; `course.json` ima `examDate: "2026-12-08"` samo kao zadanu vrijednost |
| zadani pragovi | 2 ≥ 50 %, 3 ≥ 62 %, 4 ≥ 75 %, 5 ≥ 88 % |
| zadano trajanje ispita | 45 min (stvarno trajanje nepoznato, 30–60 min) |
| na ispitu | sva poglavlja 01–35 |
| ocjena kolegija | kolokvij 80 %, programski zadatak 20 % (1_Uvod_2026.pdf, slajd 2) |

## 2. Izvorni materijali

```
content/source/biomehanika/
  pdf/                   prezentacije 1–35 (naziv počinje brojem poglavlja, npr. "7_Kosti 1.pdf")
  text/                  <nn>.md – tekst izvučen iz PDF-ova (python tools/extract_pdf.py --course biomehanika)
  img-raw/               slike izvučene iz PDF-ova
  skripta.md             studentska skripta (tekst)
  pitanja-kolokvija.md   stvarna ispitna pitanja (tekst) → questions/00-kolokvij.json
```

## 3. Područja i poglavlja

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

Pitanja s kolokvija (`00-kolokvij.json`, izvor `pitanja-kolokvija.md`) nemaju vlastito poglavlje: svako dobiva `chapter` stvarnog poglavlja na koje se odnosi (npr. "206 kostiju" → "07") i `real_exam: true`. `bm-k-0nn` odgovara stavci nn iz `pitanja-kolokvija.md`; dodatne varijante (jedna stavka → više pitanja) imaju `bm-k-101` naviše.

## 4. Redoslijed generiranja

Prioritet prema zastupljenosti na kolokviju: 00 kolokvij → 07, 08, 09 → 04, 05, 06 → 12, 13, 14 → 17, 18, 19, 20 → 22, 23, 24 → 01, 02, 03 → 15, 16, 10, 11 → 21, 25, 26 → 27, 28 → 29, 35 → 30, 31, 32, 33, 34.

Stanje (0.6.0): sva poglavlja 01–35 i kolokvij imaju pitanja (984 pitanja, 63 s kolokvija). Daljnji rad: ispravci iz "Prijava", tipovi `image-label`/`order`/`match`, sažeci poglavlja (`content/biomehanika/summaries/<nn>.md`).

## Slike – obrađena poglavlja

Dodavanje slika u objašnjenja i pitanja prema pravilima u `docs/app-spec.md`, odjeljak 16 („Slike”). Skupine od 5–8 poglavlja po sesiji, redom iz odjeljka 4; kolokvij pitanja obrađuju se uz poglavlje na koje se odnose.

| skupina | poglavlja | stanje |
|---|---|---|
| 1 | 07, 08, 09, 04, 05, 06 | **gotovo** (0.9.0): u pitanju / u objašnjenju – 07: 0/5, 08: 0/9 (+ kolokvij 0/3), 09: 0/4 (+ kolokvij 0/2), 04: 0/2, 05: 0/11, 06: 1/6 |
| 2 | 12, 13, 14, 17, 18, 19, 20 | **gotovo** (0.9.1): u pitanju / u objašnjenju – 12: 0/0 (samo tekst), 13: 2/12, 14: 0/13 (+ kolokvij 0/2), 17: 0/2, 18: 0/11, 19: 0/3 (+ kolokvij 0/3), 20: 1/16 |
| 3 | 22, 23, 24, 01, 02, 03 | **gotovo** (0.9.2): u pitanju / u objašnjenju – 22: 0/7 (+ kolokvij 0/1), 23: 2/6 (+ kolokvij 0/1), 24: 0/7, 01: 0/4, 02: 0/2 (+ kolokvij 0/2), 03: 0/4 |
| 4 | 15, 16, 10, 11, 21, 25, 26 | **gotovo** (0.9.3): u pitanju / u objašnjenju – 15: 0/19 (+ kolokvij 0/1), 16: 0/11 (+ kolokvij 0/1), 10: 0/5, 11: 0/11, 21: 0/5, 25: 0/11, 26: 0/7 |
| 5 | 27, 28, 29, 35, 30 | **sljedeća** |
| 6 | 31, 32, 33, 34 | čeka |

Nakon Biomehanike slijedi Biokemija lijekova (`docs/courses/biokemija-lijekova.md`).

## 5. Faze izrade (povijest)

Aplikacija je nastala uz ovaj kolegij (faze M1–M5 u `docs/app-spec.md`, odjeljak 18). Sadržaj po fazama: M1 kolokvij pitanja; M2 poglavlja 07–09; M3 04–06 i 12–14; M4 17–20 i 22–24; M5 ostala poglavlja redom iz odjeljka 4.

## 6. Vremenski plan (orijentacijski, do ispita 8.12.)

- 18.–19.11.: GitHub račun, sesija 1 (M1), app na telefonu – učenje počinje s kolokvij pitanjima.
- 20.–22.11.: M2 i M3 + pitanja za kosti i tkivo.
- 23.–30.11.: po jedna sesija dnevno (20–30 min) za sadržaj preostalih poglavlja + M4.
- 1.–7.12.: samo učenje po planu + probni ispiti. 8.12. ispit.

## 7. Odluke o sadržaju

- 18.11.2026: sva poglavlja 1–35 na ispitu; 11 područja; ciljana ocjena 3; zadano trajanje ispita 45 min (stvarno 30–60 min); zadani pragovi 50/62/75/88 %.
- 18.11.2026 (M1): Poglavlja kolokvij pitanja i nazivi PDF-ova u `course.json` određeni su bez PDF-ova – provjeriti u M2 nakon `extract_pdf.py`. Elementi Hillovog modela (bm-k-043, bm-k-111) i značenje varijabli M/h, ρ nisu doslovno u skripti – provjeriti u prezentacijama 01 i 19.
- 18.11.2026 (M2): Nazivi PDF-ova u `course.json` usklađeni sa stvarnim datotekama. Poglavlja kolokvij pitanja provjerena u izvučenom tekstu i ispravljena gdje je činjenica u drugom poglavlju (bm-k-001 → 02, bm-k-012 → 07, bm-k-021 → 12, bm-k-028/029 → 04, bm-k-038/039 → 17, bm-k-041 → 16, bm-k-047 → 23); ID-ovi i smisao nepromijenjeni. Gdje se kolokvij razlikuje od prezentacije, `answer` ostaje iz kolokvija, a vrijednost iz prezentacije dodana je u `accepted` i objašnjenje: elastin 6 → **0,6 MPa** (04, slajd 13), trenje 0,002 → 0,0026 (12, slajd 5), tetiva 100 → 50–100 MPa (04, slajd 12).
- 18.11.2026 (M2, 0.2.1): Elastin (bm-k-031): točan odgovor je **0,6 MPa** (4_Vezivno tkivo, slajd 13; 5_Mehanička svojstva, tablica: 6 × 10⁵ Pa); "6 MPa" iz bilježaka s kolokvija uklonjen iz `accepted` i sada je distraktor.
- 18.11.2026 (M3, sadržaj): Pitanja za 04, 05, 06, 12, 13, 14. Tablica u 05 (jedini slajd): σmax Ahilove tetive tumači se u MPa (56 / 44 MPa), u skladu s 6_Naprezanja u Ahilovoj tetivi (σdop = 56 MPa) i 4_Vezivno tkivo (50–100 MPa), iako zaglavlje tablice glasi "10⁷ Nm⁻²"; εmax i Fmax iz tablice nemaju jasnu jedinicu – za εmax nema pitanja, Fmax (2000) je bez jedinice. Podaci iz tablice koji su već u 04 (abduktin, rezilin, istežljivost kolagena) nisu ponovljeni u 05.
- 18.11.2026 (0.4.1, provjera slajdova): Na slajdu 20/2 "sin α²" znači sin²α; omjer F_per/F_paral = 2L·sin α·√(n² − sin²α)/(n·y). A, F_n i n na tom slajdu nisu definirani, pa nema pitanja o njihovu značenju. Na slajdu 22/16 Λ i λ su ista veličina (valna duljina); x je u legendi "fazni pomak" (taj je odgovor točan), a fizikalno je položaj; ρ0 i ω nisu u legendi. Na slajdu 23/6 kota 24 mm je ukupna duljina oka, a e = 4,7 mm udaljenost središta dviju sfera (jednako razlici projekcija polumjera R_B i R_R iz 24); Ø11 i Ø12 nisu objašnjeni, pa nema pitanja o njima. Poglavlja 20, 22 i 23 zbog toga imaju više od 25 pitanja.
- 18.11.2026 (0.4.2, sadržaj): Pitanja za 01, 02 i 03. Gradivo skripte „Uvod, mjerni sustavi i modeli” (ELITE, Kistler, Xsens, TEKSCAN, inercijski i žičani modeli) ide u 01, a „Dinamika sustava krutih i čvrstih tijela” (direktna/inverzna metoda, L = T – V) u 03, u skladu s poglavljima postojećih kolokvij pitanja (bm-k-010 → 03). Poglavlja 01 i 02 imaju više od 25 pitanja jer su obuhvaćeni svi brojevi i godine sa slajdova. Na slajdu 02/12 piše „William Harley” (poznatiji kao Harvey), a na 02/11 „De Motu Animalum” – oba zapisa prihvaćaju se kao točni.
- 18.11.2026 (0.4.3, sadržaj): Pitanja za 10, 11, 15 i 16. Dijagram tlakova na disk (15, slajd 14) nema oznaku jedinice uz stupce; vrijednosti se tumače u kPa prema oznaci granice hidracije/dehidracije (80 kPa). Poluraspad kolagena u krvožilnom sustavu (16, slajd 7) naveden je bez jedinice (15–90), pa o tom broju nema pitanja; tablica svojstava ligamenata koljena (16, slajd 11) nema jasne pripadnosti stupaca, pa o njoj nema pitanja. Poglavlje 16 ima više od 25 pitanja jer je opsežno (34 slajda, mnogo brojeva i podjela).
- 18.11.2026 (0.4.4, sadržaj): Pitanja za 21, 25 i 26. Na slajdu 25/6 u tablici za 131 mosmol piše površina „1.45 µm²”, a na slici „145 µ²” – uzeto je 145 µm² (tipfeler u tablici). „Cassanijeve krivulje” sa slajda 25/8 u pitanjima su Cassinijeve krivulje. Na slajdu 26/13 σ praznog mjehura je 0,000909 N/mm², a N/h = 0,004/4,2 daje 0,000952 N/mm² – o toj vrijednosti nema pitanja, pitanje je samo o N_ϑ = −0,004 N/mm. Na slajdu 26/12 „polumjer punog mjehura R2” odnosi se na prazan mjehur. U 26 (3. model) δ je debljina stijenke prema slici na slajdu 8. Poglavlja 21 i 25 imaju više od 25 pitanja jer su obuhvaćeni računski primjer (Reynoldsov broj) i tablica dimenzija eritrocita.
- 18.11.2026 (0.4.5, sadržaj): Pitanja za 27 i 28. Na slajdu 28/9 HU-rasponi za meka tkiva (−200 do +804), masno tkivo (−140 do −1220) i pluća (−1200 do −1800) izgledaju pogrešno prepisano, pa se pitanja odnose samo na vodu (0 HU), zrak (−1000 HU) i raspone modela zuba (1200–3071) i kosti (226–3071). Na slajdu 27/23 dimenzije krune očnjaka su nejasno označene (11,1 mm „duljina krune (meziodistalni promjer)”), pa se pita samo ukupna duljina 25,5 mm. Tablice broja čvorova i elemenata (27/27, 28/16) nisu zasebna pitanja, spominju se u objašnjenjima. Poglavlje 27 ima više od 25 pitanja jer je opsežno (57 slajdova).
- 18.11.2026 (0.4.6, sadržaj): Pitanja za 29 i 35 (izvor samo prezentacije, skripta ih ne pokriva). Slajd 35/35 sadrži primjere ispitnih pitanja; dva koja još nisu bila pokrivena dodana su u stvarna poglavlja s novim ID-ovima: bm-04-026 (kolagen ≈ 2500 × modul elastina) i bm-10-024 (koštana skela); `real_exam: false`, jer nisu s kolokvija. Ostali primjeri (kut otvaranja, Hillov model, limbus, patela) već su pokriveni. Na slajdu 35/7 vlačna čvrstoća paukove mreže je 150 MPa, a na 35/25 naprezanje u vlačnom pokusu 1338 MPa – pitanja to razdvajaju po slajdu. Slajd 35/34 (datumi i bodovanje za 2025.) nije korišten. Slike na 29 i 35 su fotografije bez tekstualnog sadržaja potrebnog za pitanja, pa nisu kopirane. Poglavlje 35 ima više od 25 pitanja jer sadrži mnogo primjera s brojevima.
- 18.11.2026 (0.5.0, sadržaj): Pitanja za 30, 31, 32, 33 i 34 – time sva poglavlja 01–35 imaju pitanja. Prezentacija 30 (73 slajda) je skenirana, bez tekstualnog sloja; tekst je prepisan sa slika slajdova (prijepis nije spremljen u `content/source/`), a brojke su provjerene na slikama. Razlike između predavanja: leđna moždina u 30 (slajd 47) 40–50 cm, do 2. slabinskog kralješka, a u 31 (slajd 3) 43 cm, do 1. lumbalnog kralješka – pitanja navode o kojem je predavanju riječ. U 33 je 125 milijuna fotoreceptora (slajd 22), a zbroj 120 milijuna štapića i 6 milijuna čunjića (slajd 23) je 126 milijuna – oba broja preuzeta su kako piše. Na 32/4 „1011 neurona” čita se kao 10¹¹, a na 32/5 promjer aksona je 0,5–20 µm (provjereno na slici). Na 31/5 popis razina ozljede leđne moždine ima mnogo stavki; pitanja pokrivaju C1–C5, T9–T11 i S3–S5.
- 18.11.2026 (0.5.1, završna provjera): Pitanja kojima slika uz pitanje prikazuje sam odgovor (tablica eritrocita, dijagram tlakova na disk, Pauwelsovi kutovi, osnovni cistometrogram, dišni putovi, homunkulus, akcijski potencijal) dobila su tu sliku kao `explanation_image` umjesto `image` (bm-11-006…008, bm-15-023…027, bm-21-003/004, bm-25-015…018, bm-26-007, bm-30-019, bm-34-020); slike uz koje se pitanje izričito odnosi na očitavanje dijagrama (npr. 08-1) ostaju. Iz teksta pitanja uklonjeni su dijelovi koji otkrivaju odgovor (bm-10-010, bm-10-012, bm-18-011, bm-28-006, bm-34-006). bm-30-031: distraktor „43 cm” (podatak iz predavanja 31, unutar točnog raspona 40–50 cm) zamijenjen je s „70-80 cm”.
- 18.11.2026 (0.6.0, više kolegija): Izvorni materijali premješteni su u `content/source/biomehanika/` (pdf, text, img-raw, skripta.md, pitanja-kolokvija.md). `course.json` dobiva `idPrefix: "bm"`. ID-ovi, sadržaj pitanja i napredak nepromijenjeni.
- 19.11.2026 (0.9.0, slike – skupina 1): Slike za 04–09 i njihova kolokvij pitanja. Bez slike su ostali slajdovi s natuknicama, fotografije bez sadržaja za pitanje i slike kojima tekst ni uskim izrezom nije čitljiv na 412 px (lubanja 07/6, tenisači 08/15, graf $E(
ho)$ 09/13, krajnji stupci tablice 05/1 za Fmax i lig. nuchae). bm-06-001: dosadašnja slika u pitanju (`06-1.png`) pokazivala je oznaku „Talus”, a to je odgovor – u pitanju je sada isti crtež s prekrivenom oznakom (`06-model-stopala-bez-oznake.png`), a `06-1.png` je u objašnjenju. Tablica svojstava femura (09/8) izrezana je kao stupac svojstava + stupac „čovjek” (dva izreza istog slajda jedan do drugog, sadržaj nepromijenjen), jer cijela tablica na mobitelu ima tekst ~8 px, a pitanja se odnose samo na čovjeka. Za građu duge kosti u 07 koristi se slika iz 08 (slajd 5, hrvatski natpisi, čitljivija od engleske sa 07/5). Tekst pitanja nije mijenjan.
- 19.11.2026 (0.9.1, slike – skupina 2): Slike za 13, 14 i 17–20 i njihova kolokvij pitanja; prezentacija 12 (Hrskavica) nema nijednu sliku ni crtež, pa ni pitanja iz nje ne dobivaju sliku. Dosadašnje `13-1.png` i `14-1.png` bile su cijeli slajdovi s natpisima od ~3–4 px na mobitelu; zamijenjene su uskim izrezima (vrste zglobova po jedna ploča s natpisom; krakovi sila pri ustajanju) i obrisane. bm-13-006 i bm-13-009 dobile su sliku u pitanju (rame s prekrivenom oznakom konveksnog tijela; ručni zglob bez teksta), a tekst im je usklađen sa slikom („na slici”). Hillov model (19/3, hrvatske oznake) koristi se i u 20 umjesto engleske verzije sa 20/4. bm-20-026 ima skicu paralelnog i perastog mišića u pitanju (na njoj su samo oznake $x$, $y$, $L$, $lpha$); bm-20-027 (pita za $L$) ima je samo u objašnjenju. Bez slike: sarkomera 17/19, presjek mišića 17/8, tablica 20/2 i grafičko rješenje 14/8 (natpisi presitni).
- 19.11.2026 (0.9.2, slike – skupina 3): Slike za 01–03 i 22–24 i njihova kolokvij pitanja. Pitanja iz skripte (dio 01 i 03, kolokvij 01) nemaju slike jer gradivo nije na slajdovima. `02-1.png` (isti sadržaj kao novi izrez sa slajda 02/4, ali manja i s ostatkom oznake σ) zamijenjena je i obrisana; engleski natpisi na fotografiji femura u toj slici su sitni, ali pitanju nisu potrebni (bit je crtež trajektorija). Skica geometrije oka (23/6): bm-23-026 (pita ukupnu duljinu) ima u pitanju sliku s prekrivenom kotom 24, a bm-23-027 (pita značenje kote 4,7) ima u pitanju `23-1.png` – kota 4,7 je vidljiva jer se pita njezino značenje, a ne iznos; ista slika u objašnjenju je za to pitanje uklonjena da se ne prikazuje dvaput. Bez slike: graf tehnološkog razvoja prije 1900 (01/5), tablice fizikalnih karakteristika uha (22/11) i sheme oka 23/8, 10, 16, 18 i 23 (natpisi presitni).
- 19.11.2026 (0.9.3, slike – skupina 4): Slike za 10, 11, 15, 16, 21, 25 i 26 i njihova kolokvij pitanja. Nečitljive ili loše izrezane stare slike zamijenjene su i obrisane: `11-1.png` (odrezan potpis), `15-1.png` (dijagram tlakova, brojevi ~5 px), `15-2.png` (285 px široka), `25-1.png` (tablice ~5 px; sada po jedan crtež stanice za 300, 217 i 131 mosmol). Dijagram tlakova na disk (15/14) složen je od dvaju izreza istog slajda jedan ispod drugog (lijevih pet i desna tri stupca), jer bi u jednom redu brojevi bili ~5 px. `10-1.png` je u bm-10-018 premještena u objašnjenje (na njoj piše 55 % i 80 %, a to je odgovor); bm-11-004 i bm-11-005 nemaju više sliku u pitanju (pitanja je ne trebaju, a crte kutova upućuju na odgovor) – slika Pauwelsove klasifikacije je u objašnjenju. Za Hillov model u 26 koristi se `19-hillov-model.png`.
