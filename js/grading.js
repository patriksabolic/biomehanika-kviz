// Normalizacija i ocjenjivanje upisanih odgovora (spec, odjeljak 5).

const DIACRITICS = { 'đ': 'd', 'č': 'c', 'ć': 'c', 'š': 's', 'ž': 'z' };

export function normalize(s) {
  return String(s ?? '')
    .toLowerCase()
    .trim()
    .replace(/[đčćšž]/g, (c) => DIACRITICS[c])
    .replace(/[–—−]/g, '-') // en/em crtica i minus kao obična crtica (raspon 3–4 % = 3-4 %)
    .replace(/[^\p{L}\p{N}\s.,\-/%]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(\d),(\d)/g, '$1.$2');
}

const SUPERSCRIPT = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };

// Broj na početku, iza njega smije biti samo jedinica (bez znamenki).
// Podržava decimalni zarez, razmak kao tisućice (600 000) i znanstveni zapis:
// 6 × 10^5, 6x10^5, 6·10⁵, 6*10^5, 6e5.
export function parseNumber(s) {
  const t = String(s ?? '')
    .toLowerCase()
    .trim()
    .replace(/10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, e) => '10^' + [...e].map((c) => SUPERSCRIPT[c]).join(''))
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/(\d) (?=\d{3}(?!\d))/g, '$1')
    .replace(/−/g, '-')
    .replace(/^10\s*\^\s*(-?\d+)/, '1e$1'); // samo potencija: 10^-8 = 1e-8
  const m = /^(-?\d+(?:\.\d+)?)\s*(?:[x×·*]\s*10\s*\^\s*(-?\d+)|e([-+]?\d+))?\s*([^\d]*)$/u.exec(t);
  if (!m) return null;
  // Iza broja smije biti jedinica, ne formula (npr. 2π/λ nije broj 2).
  if (/[π()√+=·×*]/u.test(m[4])) return null;
  const exp = m[2] ?? m[3];
  const value = parseFloat(m[1]) * (exp !== undefined ? 10 ** Number(exp) : 1);
  return Number.isFinite(value) ? value : null;
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

export function isNumericAnswer(q) {
  return parseNumber(q.answer) !== null;
}

// Pravila (spec, odjeljak 5) + zaštita: upis jednak netočnom ponuđenom odgovoru (distraktoru)
// nikad nije točan, a tipfeler se ne priznaje ako je upis jednako blizu ili bliži distraktoru.
export function gradeFill(input, q) {
  const u = normalize(input);
  if (!u) return false;
  const targets = [q.answer, ...(q.accepted || [])];
  const distractors = (q.distractors || []).map(normalize);
  if (targets.some((x) => normalize(x) === u)) return true;
  if (distractors.includes(u)) return false;

  const un = parseNumber(input);
  const numericQ = parseNumber(q.answer) !== null; // brojčana tolerancija samo kad je točan odgovor broj
  let bestTypo = Infinity;
  for (const x of targets) {
    const xn = normalize(x);
    const num = parseNumber(x);
    if (num !== null) {
      if (numericQ && un !== null && Math.abs(un - num) <= 0.01 * Math.abs(num)) return true;
      continue; // brojčani odgovori nemaju toleranciju za tipfelere
    }
    if (/\d/.test(xn)) continue; // ni odgovori sa znamenkama (npr. 2/3, 27-67 %)
    const max = xn.length >= 10 ? 2 : xn.length >= 6 ? 1 : 0;
    const d = max ? levenshtein(u, xn) : Infinity;
    if (d <= max) bestTypo = Math.min(bestTypo, d);
  }
  if (bestTypo === Infinity) return false;
  return !distractors.some((dn) => levenshtein(u, dn) <= bestTypo);
}
