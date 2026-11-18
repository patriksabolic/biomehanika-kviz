# Kviz

Osobna PWA aplikacija za vježbanje gradiva više kolegija (kviz, ispitni mod, statistika, plan učenja). Kolegiji: Biomehanika, Biokemija lijekova (u pripremi).

- Specifikacija aplikacije: `docs/app-spec.md`
- Sadržaj i odluke po kolegiju: `docs/courses/<id>.md`
- Upute za Claude Code: `CLAUDE.md`
- Prompti po sesijama: `docs/prompts.md`
- Lokalni test: `python -m http.server 8000` → http://localhost:8000
- Provjera pitanja: `python tools/validate.py` (svi kolegiji) ili `python tools/validate.py --course <id>`
- Izvorni materijali kolegija su u `content/source/<id>/` i ne idu na GitHub (`.gitignore`).
