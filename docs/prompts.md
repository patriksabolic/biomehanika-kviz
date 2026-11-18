# Prompti za Claude Code sesije

Kopiraj cijeli blok i zalijepi u Claude Code. Jedan prompt = jedna sesija.

## Sesija 1 – faza M1 (osnovna aplikacija + kolokvij pitanja)

```
Pročitaj CLAUDE.md i docs/app-spec.md u cijelosti. Zatim napravi fazu M1 iz specifikacije (odjeljak 18):

1. Struktura projekta: index.html, manifest.json, sw.js, version.json, css/app.css, js/*.js, icons/ (napravi jednostavne PNG ikone 192 i 512 Pythonom ili kao SVG→PNG, bez instaliranja novih paketa ako je moguće).
2. content/courses.json i content/biomehanika/course.json s 35 poglavlja i 11 područja točno prema odjeljku 3 spec-a (zadani datum ispita 2026-12-08, pragovi 50/62/75/88, trajanje ispita 45 min).
3. Pretvori content/source/pitanja-kolokvija.md u content/biomehanika/questions/00-kolokvij.json prema odjeljku 4 i 16 spec-a: svako pitanje dobiva stvarno poglavlje, real_exam: true, praznina na ključnom pojmu, 3 distraktora, accepted varijante i objašnjenje (koristi content/source/skripta.md kao izvor objašnjenja; ako skripta nema objašnjenje, napiši kratko objašnjenje samo iz onoga što piše u pitanju i označi source "Pitanja s kolokvija"). Stavke "napiši formulu", "skiciraj", "postavi jednadžbu" i dva računska zadatka pretvori u fill/mc pitanja o ključnim svojstvima (npr. elementi Hillovog modela, oblik jednadžbe Donskog i Zaciorskog, formula E = a·ρ^p).
4. Ekran Kviz: odabir poglavlja/područja, sesija od 10 pitanja, tipovi mc i fill, trenutna povratna informacija s objašnjenjem i izvorom, gumbi Lako/Srednje/Teško, "Ne znam", "Ipak točno", "Prijavi grešku", spremanje u localStorage (ključ bmkviz.v1). Početna s brzim startom i brojačem odgovorenih pitanja danas. Ostali ekrani (Ispit, Statistika, Postavke) mogu biti prazni s natpisom "Uskoro".
5. tools/validate.py prema odjeljku 17 i pokreni ga dok ne prođe bez grešaka.
6. .gitignore (content/source/ je već u njemu – provjeri), git init, grana main, prvi commit.

Prije nego kreneš, napiši mi plan u 5 točaka. Ne instaliraj ništa bez pitanja. Kad završiš, pokreni lokalni server i napiši mi točno kako testirati u Chromeu na računalu (korak po korak, ja sam početnik).
```

## Sesija 1b – povezivanje s GitHubom (nakon što je repozitorij napravljen na github.com)

```
Napravio sam prazan javni repozitorij na GitHubu: https://github.com/KORISNICKO_IME/biomehanika-kviz (bez README-a). Poveži lokalni projekt s njim i pošalji sve na granu main. Ako se otvori prozor za prijavu na GitHub, reci mi što da kliknem. Nakon toga mi korak po korak objasni kako na github.com uključiti GitHub Pages za ovaj repozitorij (Settings → Pages) i koji će link aplikacija imati.
```

## Sesija 2 – faza M2 (pametni odabir, streak, prva poglavlja iz PDF-ova)

```
Pročitaj CLAUDE.md i docs/app-spec.md. Radimo fazu M2:

1. tools/extract_pdf.py prema odjeljku 17 (treba paket pymupdf – reci mi točnu naredbu za instalaciju i pričekaj da je pokrenem i potvrdim). Pokreni ga nad content/source/pdf/ i provjeri da su nastale datoteke content/source/text/01.md … 35.md.
2. scheduler.js prema odjeljku 7 (prioritet, težinski odabir, progresija mc→fill prema odjeljku 6) i poveži ga s kvizom.
3. Streak i dnevni cilj prema odjeljku 9 (Početna: plamen, broj dana, napredak danas).
4. Osnovna statistika prema odjeljku 10: točnost i pokrivenost po području i poglavlju, najslabije/najjače.
5. Generiraj pitanja za poglavlja 07, 08 i 09 prema odjeljku 16 spec-a (15–25 po poglavlju) u questions/07.json, 08.json, 09.json. Izvor: content/source/text/07.md itd. + skripta.md. Pokreni validate.py.
6. Podigni verziju, commit, i reci mi kako testirati.

Prvo plan u 5 točaka, pa radi.
```

## Sesija 3 – faza M3 (ispitni mod)

```
Pročitaj CLAUDE.md i docs/app-spec.md. Radimo fazu M3: ispitni mod prema odjeljku 8 (trajanje, broj pitanja, sastav, nadopunjavanje kao zadani oblik, odbrojavanje, bez povratne informacije do kraja, bodovanje, ocjena po pragovima, pregled netočnih, povijest ispita), ekran Postavke prema odjeljku 12 (pragovi, dnevni cilj, način prikaza, tema, vibracija, export/import, reset, Prijave). Zatim generiraj pitanja za poglavlja 04, 05, 06 i 12, 13, 14 prema odjeljku 16 i pokreni validate.py. Podigni verziju, commit, upute za test.
```

## Sesija 4 – faza M4 (plan učenja + puna statistika)

```
Pročitaj CLAUDE.md i docs/app-spec.md. Radimo fazu M4: plan učenja prema odjeljku 11 (ekran Plan, kartica "Danas" na Početnoj s gumbom Kreni, ponovni izračun svaki dan, upozorenje na zaostatak) i puna statistika prema odjeljku 10 (najteža/najlakša/opasna pitanja, trend 14 dana, kalendar aktivnosti 8 tjedana, povijest ispita i procjena ocjene, zanimljivosti). Zatim generiraj pitanja za poglavlja 17, 18, 19, 20 i 22, 23, 24. validate.py, verzija, commit, upute za test.
```

## Predložak – generiranje pitanja za daljnja poglavlja (faza M5)

```
Pročitaj CLAUDE.md i odjeljak 16 u docs/app-spec.md. Generiraj pitanja za poglavlja XX, YY i ZZ iz content/source/text/ (i skripta.md gdje postoji) u content/biomehanika/questions/. Pokrij sve brojeve, formule, definicije i podjele iz tih poglavlja. Gdje je slika bitna (dijagram, građa), kopiraj je iz content/source/img-raw/ u content/biomehanika/img/ (max 1200 px širine) i referenciraj. Pokreni tools/validate.py i ispiši broj pitanja po poglavlju. Podigni verziju sadržaja u version.json i napravi commit.
```

Redoslijed za M5 (nakon 07–09, 04–06, 12–14, 17–20, 22–24): 01, 02, 03 → 15, 16, 10, 11 → 21, 25, 26 → 27, 28 → 29, 35 → 30, 31, 32, 33, 34.

## Predložak – ispravci iz aplikacije ("Prijave")

```
U aplikaciji sam prijavio greške i "Ipak točno" odgovore. Evo popisa (kopirano iz Postavke → Prijave):

<zalijepi tekst>

Za svaku stavku: ispravi pitanje ili dodaj upis u accepted, ne mijenjaj ID. Pokreni validate.py, podigni verziju sadržaja, commit.
```
