// Normalizacija i ocjenjivanje upisanih odgovora (spec, odjeljak 5).

const DIACRITICS = { 'đ': 'd', 'č': 'c', 'ć': 'c', 'š': 's', 'ž': 'z' };

export function normalize(s) {
  return String(s ?? '')
    .toLowerCase()
    .trim()
    .replace(/[đčćšž]/g, (c) => DIACRITICS[c])
    .replace(/[^\p{L}\p{N}\s.,\-/%]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(\d),(\d)/g, '$1.$2');
}

// Broj na početku, iza njega smije biti samo jedinica (bez znamenki).
export function parseNumber(s) {
  const m = /^(-?\d+(?:\.\d+)?)\s*([^\d]*)$/u.exec(normalize(s));
  return m ? parseFloat(m[1]) : null;
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

export function gradeFill(input, q) {
  const u = normalize(input);
  if (!u) return false;
  const targets = [q.answer, ...(q.accepted || [])];
  const un = parseNumber(input);
  for (const x of targets) {
    const xn = normalize(x);
    if (u === xn) return true;
    const num = parseNumber(x);
    if (num !== null) {
      if (un !== null && Math.abs(un - num) <= 0.01 * Math.abs(num)) return true;
      continue; // brojčani odgovori nemaju toleranciju za tipfelere
    }
    const max = xn.length >= 10 ? 2 : xn.length >= 6 ? 1 : 0;
    if (max && levenshtein(u, xn) <= max) return true;
  }
  return false;
}
