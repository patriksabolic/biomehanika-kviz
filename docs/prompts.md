# Prompti za Claude Code sesije

Kopiraj cijeli blok i zalijepi u Claude Code. Jedan prompt = jedna sesija. Umjesto `<id>` upiši id kolegija iz `content/courses.json`:

| kolegij | id |
|---|---|
| Biomehanika | `biomehanika` |
| Biokemija lijekova | `biokemija-lijekova` |

Izvorni materijali kolegija idu u `content/source/<id>/` (prezentacije u `pdf/`, primjeri ispitnih pitanja u `primjeri/`).

## Priprema novog kolegija (nakon što su PDF-ovi i primjeri kopirani)

```
Pročitaj CLAUDE.md, docs/app-spec.md i docs/courses/<id>.md. Pripremamo kolegij <id>:

1. U content/source/<id>/pdf/ su prezentacije, u content/source/<id>/primjeri/ primjeri ispitnih pitanja. Ako nazivi PDF-ova ne počinju brojem poglavlja, predloži mi preimenovanje (ne mijenjaj ih sam). Zatim pokreni python tools/extract_pdf.py --course <id> (treba pymupdf – ako nije instaliran, reci mi točnu naredbu i pričekaj).
2. Pregledaj izvučeni tekst i primjere i predloži poglavlja (id 01, 02 …, naslov prema PDF-u) i 6–12 područja. Pričekaj moj OK.
3. Upiši poglavlja i područja u content/<id>/course.json (prefiks ID-a ostaje kakav jest). Datum ispita, ciljanu ocjenu, minute dnevno, pragove i trajanje postavljam ja u aplikaciji; u course.json ih upiši samo kao neobavezne zadane vrijednosti ako su poznati.
4. Dopuni docs/courses/<id>.md: osnovni podaci, popis izvora, područja i poglavlja, redoslijed generiranja (prioritet prema zastupljenosti u primjerima ispitnih pitanja) i odluke.
5. python tools/validate.py, podigni verziju, commit. Push tek uz moj OK.

Prvo plan u 5 točaka, pa radi.
```

## Stvarna ispitna pitanja i primjeri → 00-kolokvij.json

```
Pročitaj CLAUDE.md, odjeljke 4 i 16 u docs/app-spec.md i docs/courses/<id>.md. Pretvori stvarna ispitna pitanja iz content/source/<id>/primjeri/ u content/<id>/questions/00-kolokvij.json: svako pitanje dobiva stvarno poglavlje, real_exam: true, ID <prefiks>-k-<nnn> (prefiks iz course.json; 0nn = redni broj stavke, dodatne varijante od 101), prazninu na ključnom pojmu, 3 distraktora, accepted varijante, objašnjenje iz materijala kolegija i izvor. Stavke "napiši formulu / skiciraj / nacrtaj strukturu" pretvori u fill/mc pitanja o ključnim svojstvima. Primjeri koji nisu sa stvarnog ispita idu u stvarna poglavlja s real_exam: false. Upiši datoteku u questionFiles (course.json) i sw.js, pokreni python tools/validate.py --course <id>, upiši odluke u docs/courses/<id>.md, podigni verziju i napravi commit.
```

## Generiranje pitanja za poglavlja

```
Pročitaj CLAUDE.md, odjeljke 4 i 16 u docs/app-spec.md (i pravila zapisa formula: $...$, \ce{...}) i docs/courses/<id>.md. Generiraj pitanja za poglavlja XX, YY i ZZ kolegija <id> iz content/source/<id>/text/ (i ostalih izvora navedenih u docs/courses/<id>.md) u content/<id>/questions/<nn>.json. Pokrij sve brojeve, formule, definicije i podjele iz tih poglavlja. Gdje je slika bitna (dijagram, građa, strukturna formula), kopiraj je iz content/source/<id>/img-raw/ u content/<id>/img/ (max 1200 px širine) i referenciraj. Nove datoteke upiši u questionFiles (course.json) i u CONTENT u sw.js. Pokreni python tools/validate.py --course <id> i ispiši broj pitanja po poglavlju. Nejasnoće u materijalu upiši u odluke u docs/courses/<id>.md. Podigni verziju u version.json i sw.js i napravi commit.
```

Redoslijed poglavlja za pojedini kolegij je u `docs/courses/<id>.md` (odjeljak "Redoslijed generiranja").

## Ispravci iz aplikacije ("Prijave")

```
U aplikaciji sam prijavio greške i "Ipak točno" odgovore. Evo popisa (kopirano iz Postavke → Prijave; u prvom retku piše kolegij):

<zalijepi tekst>

Za svaku stavku: ispravi pitanje ili dodaj upis u accepted, ne mijenjaj ID. Pokreni python tools/validate.py, podigni verziju, commit.
```

## Provjera točnosti pitanja

```
Pročitaj CLAUDE.md, odjeljak 16 u docs/app-spec.md i docs/courses/<id>.md. Provjeri sva pitanja kolegija <id> (ili poglavlja XX–YY) prema izvornim materijalima u content/source/<id>/: točan odgovor, distraktori koji su prema materijalu također točni, objašnjenja s tvrdnjama kojih nema u materijalu, izvor i broj slajda. Ne mijenjaj ID-ove ni smisao stvarnih ispitnih pitanja. python tools/validate.py, odluke u docs/courses/<id>.md, verzija, commit.
```

## Izmjena aplikacije

```
Pročitaj CLAUDE.md i docs/app-spec.md. Želim ovu promjenu u aplikaciji: <opis>. Ako se kosi sa specifikacijom, predloži i pitaj. Upiši odluku u odjeljak 20 spec-a. Testiraj (python tools/validate.py, lokalno u Chromeu), podigni verziju, commit. Push tek uz moj OK.
```

## Povijest

Sesije M1–M5 (izrada aplikacije uz Biomehaniku) i povezivanje s GitHubom su gotove; njihovi prompti su u git povijesti ove datoteke (`git log -p docs/prompts.md`). Redoslijed sadržaja Biomehanike je u `docs/courses/biomehanika.md`.
