# Kviz (repozitorij biomehanika-kviz) – upute za Claude Code

## Kontekst
- Korisnik (Patrik) **nije programer** i prvi put koristi Claude Code. Komuniciraj na **hrvatskom**, kratko i konkretno. Svaki korak koji on mora napraviti sam (naredba, klik, kopiranje datoteke) napiši točno i objasni jednom rečenicom što radi.
- Računalo: Windows 11 Pro, PowerShell 5.1, VS Code, Python 3.14 (`python`), Git 2.56. **Node.js NIJE instaliran i ne instalira se.** Nema build alata, nema npm-a.
- Cilj: PWA kviz aplikacija za više kolegija (popis u `content/courses.json`; trenutno Biomehanika i Biokemija lijekova). **Mjerodavno je: `docs/app-spec.md` (opći dio: aplikacija, format pitanja, algoritmi, pravila generiranja) i `docs/courses/<id>.md` (poglavlja, područja, ispit, izvori, redoslijed generiranja i odluke o sadržaju tog kolegija).** Ako misliš da nešto treba drukčije, predloži i pitaj; ne uvodi tiho odstupanja. Ako nešto promijenimo, dopiši odluku: o aplikaciji u odjeljak 20 spec-a, o sadržaju kolegija u odluke u `docs/courses/<id>.md`.
- Kad radiš na sadržaju, uvijek znaj o kojem je kolegiju riječ (id iz `content/courses.json`); ako iz zadatka nije jasno, pitaj.
- Prompti za pojedine sesije su u `docs/prompts.md`.

## Tehnička pravila
- Čisti HTML/CSS/JS (ES2020+), bez frameworka, bez bundlera. Vanjske biblioteke samo ako su nužne, i tada kopirane lokalno u `vendor/` (ne CDN), da app radi offline. Zadano: nijedna.
- Sve putanje relativne (`./`) – app se poslužuje s GitHub Pages pod `/biomehanika-kviz/`.
- Podaci korisnika u `localStorage` pod jednim ključem (`bmkviz.v1`) s brojem sheme i migracijom; napredak, plan, statistika, prijave i postavke ispita su po kolegiju (`courses.<id>`). Napredak je vezan uz ID pitanja: **ID-ovi i format pitanja postojećih pitanja se ne mijenjaju, kao ni id kolegija.**
- ID pitanja: `<prefiks>-<nn>-<nnn>` (kolokvij `<prefiks>-k-<nnn>`), prefiks je `idPrefix` iz `content/<id>/course.json` (Biomehanika `bm`, Biokemija lijekova `bl`). ID-ovi su jedinstveni u cijeloj aplikaciji.
- Mobile-first za Samsung Galaxy S25 Ultra (~412 CSS px širine), veliki gumbi, sistemski font, tamna tema. Sve oznake na hrvatskom s dijakriticima (č, ć, š, ž, đ). Datoteke spremaj kao UTF-8.
- Python samo za alate u `tools/`. Jedini očekivani paket: `pymupdf` – **pitaj prije instalacije**.
- `content/source/<id>/` su izvorni materijali kolegija (pdf/, text/, img-raw/, primjeri/ …): čitaj ih, ne mijenjaj ih; u `.gitignore` su i ne idu na GitHub.
- Alati primaju kolegij: `python tools/extract_pdf.py --course <id>`, `python tools/validate.py --course <id>` (bez argumenta provjerava sve kolegije).
- Nakon svake promjene sadržaja pitanja pokreni `python tools/validate.py` i ispravi greške prije commita.
- Nova datoteka pitanja ili slika: upiši je u `questionFiles` u `course.json` i u popis `CONTENT` u `sw.js`.
- Pri svakom deployu podigni verziju u `version.json` i naziv cachea u `sw.js`.

## Način rada
- Radi po fazama iz spec-a (odjeljak 18); sadržaj kolegija po redoslijedu iz `docs/courses/<id>.md`. Na početku sesije napiši plan u 3–5 točaka, pa radi. Na kraju: točne upute kako testirati, pa `git commit` s jasnom porukom na hrvatskom. `git push` samo uz korisnikov OK.
- Git: grana `main` (`git branch -M main` ako treba). Nikad `--force`.
- Lokalni test: pokreni `python -m http.server 8000` u mapi projekta i reci korisniku da otvori `http://localhost:8000` u Chromeu, F12 → ikona mobitela.
- Kad generiraš pitanja: isključivo iz `content/source/<id>/` prema odjeljku 16 spec-a i `docs/courses/<id>.md`. Ne izmišljaj brojeve, formule ni tvrdnje. Uz svako pitanje izvor (datoteka + slajd). Stvarna ispitna pitanja (npr. `pitanja-kolokvija.md` kod Biomehanike) imaju `real_exam: true` – smisao im se ne mijenja.
- Kad nešto ne radi: traži od korisnika točnu poruku greške (copy-paste) prije nagađanja. Jedan korak po poruci kad on mora nešto instalirati ili konfigurirati.
- Pokreni samo naredbe koje rade u PowerShellu 5.1 na Windowsima (bez `&&` lančanja – koristi `;` ili zasebne naredbe).
