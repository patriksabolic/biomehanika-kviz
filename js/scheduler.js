// Zapis po pitanju, odabir pitanja i oblik prikaza.
// M1: jednostavan odabir (prvo neviđena, pa ostala, nasumično).
// Prioritet prema odjeljku 7 spec-a dolazi u fazi M2.

import { shuffle } from './util.js';

export function newRecord() {
  return {
    seen: 0, answered: 0, correct: 0, cstreak: 0, wstreak: 0,
    lastResult: null, lastRating: null, lastSeen: null, level: 0,
    ratings: { lako: 0, srednje: 0, tesko: 0 },
    history: [],
  };
}

export function getRecord(cd, id) {
  return (cd.questions[id] ||= newRecord());
}

export function isHardOrDangerous(rec) {
  if (!rec) return false;
  const hard = rec.lastRating === 'tesko';
  const dangerous = rec.ratings?.lako > 0 && rec.lastResult === false;
  return hard || dangerous;
}

// mc ili fill: prema modes, postavci "Način prikaza" i razini pitanja.
export function chooseMode(q, rec, displayMode) {
  const modes = q.modes && q.modes.length ? q.modes : [q.type];
  if (modes.length === 1) return modes[0];
  if (displayMode === 'mc' || displayMode === 'fill') return displayMode;
  return rec && rec.level === 1 ? 'fill' : 'mc';
}

export function markSeen(cd, id) {
  getRecord(cd, id).seen++;
}

export function applyAnswer(rec, { correct, mode, seconds, date }) {
  rec.answered++;
  if (correct) {
    rec.correct++;
    rec.cstreak++;
    rec.wstreak = 0;
  } else {
    rec.cstreak = 0;
    rec.wstreak++;
  }
  rec.lastResult = correct;
  rec.lastSeen = date;
  rec.history.push({ date, result: correct, mode, seconds });
  if (rec.history.length > 10) rec.history.splice(0, rec.history.length - 10);

  // Progresija mc → fill: 2 uzastopna točna na razini 0 / 2 uzastopna netočna na razini 1.
  const last2 = rec.history.slice(-2);
  if (last2.length === 2) {
    if (rec.level === 0 && last2.every((h) => h.mode === 'mc' && h.result)) rec.level = 1;
    else if (rec.level === 1 && last2.every((h) => h.mode === 'fill' && !h.result)) rec.level = 0;
  }
}

export function applyRating(rec, rating) {
  rec.lastRating = rating;
  rec.ratings[rating] = (rec.ratings[rating] || 0) + 1;
}

// Odabir n pitanja: najprije neviđena, bez ponavljanja; ako su u skupu ≥ 3 poglavlja,
// najviše 50 % sesije iz istog poglavlja.
export function pickQuestions(pool, n, cd) {
  const unseen = shuffle(pool.filter((q) => !cd.questions[q.id]?.answered));
  const seen = shuffle(pool.filter((q) => cd.questions[q.id]?.answered));
  const ordered = [...unseen, ...seen];
  const size = Math.min(n, ordered.length);
  const chapterCount = new Set(pool.map((q) => q.chapter)).size;
  if (chapterCount < 3) return ordered.slice(0, size);

  const cap = Math.ceil(size * 0.5);
  const perChapter = {};
  const picked = [];
  const skipped = [];
  for (const q of ordered) {
    if (picked.length >= size) break;
    if ((perChapter[q.chapter] || 0) < cap) {
      picked.push(q);
      perChapter[q.chapter] = (perChapter[q.chapter] || 0) + 1;
    } else {
      skipped.push(q);
    }
  }
  while (picked.length < size && skipped.length) picked.push(skipped.shift());
  return shuffle(picked);
}
