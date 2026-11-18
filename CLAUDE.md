# biomehanika-kviz – upute za Claude Code

## Kontekst
- Korisnik (Patrik) **nije programer** i prvi put koristi Claude Code. Komuniciraj na **hrvatskom**, kratko i konkretno. Svaki korak koji on mora napraviti sam (naredba, klik, kopiranje datoteke) napiši točno i objasni jednom rečenicom što radi.
- Računalo: Windows 11 Pro, PowerShell 5.1, VS Code, Python 3.14 (`python`), Git 2.56. **Node.js NIJE instaliran i ne instalira se.** Nema build alata, nema npm-a.
- Cilj: PWA kviz aplikacija za kolegij Biomehanika (ispit 8.12.2026). **Specifikacija je `docs/app-spec.md` i ona je mjerodavna.** Ako misliš da nešto treba drukčije, predloži i pitaj; ne uvodi tiho odstupanja. Ako nešto promijenimo, dopiši odluku u odjeljak 20 spec-a.
- Prompti za pojedine sesije su u `docs/prompts.md`.

## Tehnička pravila
- Čisti HTML/CSS/JS (ES2020+), bez frameworka, bez bundlera. Vanjske biblioteke samo ako su nužne, i tada kopirane lokalno u `vendor/` (ne CDN), da app radi offline. Zadano: nijedna.
- Sve putanje relativne (`./`) – app se poslužuje s GitHub Pages pod `/biomehanika-kviz/`.
- Podaci korisnika u `localStorage` pod jednim ključem (`bmkviz.v1`) s brojem sheme i migracijom. Napredak je vezan uz ID pitanja: **ID-ovi i format pitanja postojećih pitanja se ne mijenjaju.**
- Mobile-first za Samsung Galaxy S25 Ultra (~412 CSS px širine), veliki gumbi, sistemski font, tamna tema. Sve oznake na hrvatskom s dijakriticima (č, ć, š, ž, đ). Datoteke spremaj kao UTF-8.
- Python samo za alate u `tools/`. Jedini očekivani paket: `pymupdf` – **pitaj prije instalacije**.
- `content/source/` su izvorni materijali kolegija: čitaj ih, ne mijenjaj ih; u `.gitignore` su i ne idu na GitHub.
- Nakon svake promjene sadržaja pitanja pokreni `python tools/validate.py` i ispravi greške prije commita.
- Pri svakom deployu podigni verziju u `version.json` i naziv cachea u `sw.js`.

## Način rada
- Radi po fazama iz spec-a (M1 → M5). Na početku sesije napiši plan u 3–5 točaka, pa radi. Na kraju: točne upute kako testirati, pa `git commit` s jasnom porukom na hrvatskom. `git push` samo uz korisnikov OK.
- Git: grana `main` (`git branch -M main` ako treba). Nikad `--force`.
- Lokalni test: pokreni `python -m http.server 8000` u mapi projekta i reci korisniku da otvori `http://localhost:8000` u Chromeu, F12 → ikona mobitela.
- Kad generiraš pitanja: isključivo iz `content/source/` prema odjeljku 16 spec-a. Ne izmišljaj brojeve, formule ni tvrdnje. Uz svako pitanje izvor (datoteka + slajd). Pitanja iz `pitanja-kolokvija.md` su stvarna ispitna pitanja (`real_exam: true`) – smisao im se ne mijenja.
- Kad nešto ne radi: traži od korisnika točnu poruku greške (copy-paste) prije nagađanja. Jedan korak po poruci kad on mora nešto instalirati ili konfigurirati.
- Pokreni samo naredbe koje rade u PowerShellu 5.1 na Windowsima (bez `&&` lančanja – koristi `;` ili zasebne naredbe).
