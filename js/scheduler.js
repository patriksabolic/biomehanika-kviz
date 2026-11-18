// Zapis po pitanju, prioritet i odabir pitanja, oblik prikaza (spec, odjeljci 6 i 7).

export function newRecord() {
  return {
    seen: 0, answered: 0, correct: 0, cstreak: 0, wstreak: 0,
    lastResult: null, lastRating: null, lastSeen: null, level: 0, levelRun: 0,
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

export function applyAnswer(rec, { correct, mode, seconds, date, dual = false }) {
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

  // Progresija mc → fill (samo pitanja s oba oblika): 2 uzastopna točna na razini 0 → razina 1;
  // 2 uzastopna netočna na razini 1 → razina 0. Broji se po razini, ne po prikazanom obliku.
  if (dual) {
    rec.levelRun = (rec.level === 0) === correct ? (rec.levelRun || 0) + 1 : 0;
    if (rec.levelRun >= 2) {
      rec.level = rec.level === 0 ? 1 : 0;
      rec.levelRun = 0;
    }
  }
}

export function applyRating(rec, rating) {
  rec.lastRating = rating;
  rec.ratings[rating] = (rec.ratings[rating] || 0) + 1;
}

// ---------- prioritet (spec, odjeljak 7) ----------

const DAY_MS = 86400000;

function localDay(iso) {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Točnost po području: { areaId: correct/answered } (samo područja s odgovorima).
export function areaAccuracy(questions, cd, chapterById) {
  const acc = {};
  for (const q of questions) {
    const rec = cd.questions[q.id];
    if (!rec || !rec.answered) continue;
    const area = chapterById[q.chapter]?.area;
    const a = (acc[area] ||= { answered: 0, correct: 0 });
    a.answered += rec.answered;
    a.correct += rec.correct;
  }
  return Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, v.correct / v.answered]));
}

export function priority(q, rec, areaAcc, now = new Date()) {
  let p;
  if (!rec || !rec.answered) {
    p = 3.0;
  } else {
    p = 1.0;
    if (rec.lastRating === 'tesko') p += 3.0;
    else if (rec.lastRating === 'srednje') p += 1.0;
    else if (rec.lastRating === 'lako') p -= 0.5;
    if (rec.lastResult === false) p += 2.0;
    if (rec.wstreak >= 2) p += 1.0;
    if (rec.cstreak >= 3 && rec.lastRating === 'lako') p = 0.2;
    if (rec.lastSeen) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const days = Math.max(0, Math.round((today - localDay(rec.lastSeen)) / DAY_MS));
      p += Math.min(days, 7) * 0.3;
      if (days === 0 && rec.lastResult === true) p *= 0.1;
    }
  }
  if (q.real_exam) p += 1.0;
  const acc = areaAcc?.[q.areaId];
  if (acc !== undefined && acc < 0.6) p *= 1.3;
  return Math.max(p, 0.05);
}

function weightedIndex(weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

// Težinski slučajni odabir bez vraćanja. Ako su u skupu ≥ 3 poglavlja, najviše 50 % sesije
// iz istog poglavlja. Ako je skup manji od sesije, pitanja se ponavljaju (ne dvaput zaredom).
// questions: sva pitanja kolegija (za točnost po području); chapterById: iz course.json.
export function pickQuestions(pool, n, cd, chapterById, questions = pool) {
  if (!pool.length) return [];
  const areaAcc = areaAccuracy(questions, cd, chapterById);
  const weighted = pool.map((q) => ({
    q, w: priority({ ...q, areaId: chapterById[q.chapter]?.area }, cd.questions[q.id], areaAcc),
  }));
  const chapterCount = new Set(pool.map((q) => q.chapter)).size;
  const cap = chapterCount >= 3 ? Math.ceil(n * 0.5) : Infinity;
  const perChapter = {};
  const picked = [];
  let left = [...weighted];
  while (picked.length < Math.min(n, pool.length)) {
    let candidates = left.filter((x) => (perChapter[x.q.chapter] || 0) < cap);
    if (!candidates.length) candidates = left; // ograničenje se ne može poštovati
    const choice = candidates[weightedIndex(candidates.map((x) => x.w))];
    picked.push(choice.q);
    perChapter[choice.q.chapter] = (perChapter[choice.q.chapter] || 0) + 1;
    left = left.filter((x) => x !== choice);
  }
  // Skup manji od sesije: dopuni ponavljanjem (težinski), bez istog pitanja zaredom.
  while (picked.length < n && pool.length > 1) {
    const last = picked[picked.length - 1];
    const candidates = weighted.filter((x) => x.q !== last);
    picked.push(candidates[weightedIndex(candidates.map((x) => x.w))].q);
  }
  return picked;
}

export const isDual = (q) => Array.isArray(q.modes) && q.modes.includes('mc') && q.modes.includes('fill');
