// Pohrana u localStorage pod jednim ključem (spec, odjeljak 13).

import { todayKey } from './util.js';

const KEY = 'bmkviz.v1';
export const SCHEMA = 3;

// Zajedničke postavke aplikacije.
const DEFAULT_SETTINGS = {
  lastCourse: null,    // zadnji odabrani kolegij (id)
  displayMode: 'auto', // auto | mc | fill
  theme: 'system',
  vibration: true,
};

// Postavke po kolegiju (courses.<id>.settings).
// Podatke o ispitu bira korisnik; null = zadana vrijednost iz course.json (ako je ima), inače APP_DEFAULTS.
const DEFAULT_COURSE_SETTINGS = {
  dailyGoal: 10,
  examDate: null,      // "GGGG-MM-DD"
  targetGrade: null,   // 2–5
  minutesPerDay: null, // minuta učenja dnevno (plan)
  grading: null,       // { "2": 50, "3": 62, "4": 75, "5": 88 }
  examDuration: null,  // trajanje ispita (min)
  quiz: null,         // zadnji odabir u kvizu
  exam: null,         // zadnji odabir u ispitu
};
// Shema 1 imala je samo ove postavke (premještaju se u kolegij pri migraciji 1 → 2).
const COURSE_SETTING_KEYS = ['dailyGoal', 'grading', 'examDuration', 'quiz', 'exam'];

// Zadano kad ni korisnik ni course.json nemaju vrijednost.
export const APP_DEFAULTS = {
  targetGrade: 3,
  minutesPerDay: 15,
  grading: { 2: 50, 3: 62, 4: 75, 5: 88 },
  examDuration: 45,
};

let state = null;
let timer = null;
let memoryOnly = false; // true ako localStorage nije dostupan

function freshState() {
  return { schema: SCHEMA, settings: { ...DEFAULT_SETTINGS }, courses: {} };
}

// Migracije po broju sheme. Za buduće sheme: if (s.schema === 3) { …; s.schema = 4; }
function migrate(s) {
  if (!s || typeof s !== 'object' || typeof s.schema !== 'number') return freshState();
  s.settings = s.settings && typeof s.settings === 'object' ? s.settings : {};
  s.courses = s.courses && typeof s.courses === 'object' ? s.courses : {};
  if (s.schema === 1) {
    // Shema 1 → 2 (više kolegija): dnevni cilj, pragovi, trajanje ispita i zadnji odabiri
    // kviza/ispita prelaze u postavke kolegija koji je bio odabran; settings.course → lastCourse.
    const cid = s.settings.course || 'biomehanika';
    const c = (s.courses[cid] ||= {});
    c.settings = { ...(c.settings || {}) };
    for (const k of COURSE_SETTING_KEYS) {
      if (k in s.settings) c.settings[k] = s.settings[k];
      delete s.settings[k];
    }
    s.settings.lastCourse = cid;
    delete s.settings.course;
    s.schema = 2;
  }
  if (s.schema === 2) {
    // Shema 2 → 3: datum ispita, ciljana ocjena i minute dnevno postaju postavke kolegija.
    // Postojeći plan se ne mijenja; njegove vrijednosti postaju korisnikove postavke.
    for (const c of Object.values(s.courses)) {
      if (!c || typeof c !== 'object' || !c.plan) continue;
      c.settings = { ...(c.settings || {}) };
      if (c.settings.examDate == null && c.plan.examDate) c.settings.examDate = c.plan.examDate;
      if (c.settings.targetGrade == null && c.plan.targetGrade) c.settings.targetGrade = c.plan.targetGrade;
      if (c.settings.minutesPerDay == null && c.plan.minutesPerDay) c.settings.minutesPerDay = c.plan.minutesPerDay;
    }
    s.schema = 3;
  }
  s.settings = { ...DEFAULT_SETTINGS, ...s.settings };
  return s;
}

export function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch (e) {
    console.warn('localStorage nije dostupan, napredak se neće spremati.', e);
    memoryOnly = true;
  }
  try {
    state = migrate(raw ? JSON.parse(raw) : null);
  } catch (e) {
    // Oštećeni podaci: sačuvaj kopiju da se ne izgube, pa kreni ispočetka.
    console.error('Spremljeni podaci su oštećeni, kopija je u bmkviz.v1.corrupt', e);
    try { localStorage.setItem(KEY + '.corrupt', raw); } catch { /* ništa */ }
    state = freshState();
  }
  return state;
}

export function getState() {
  return state || load();
}

export function settings() {
  return getState().settings;
}

export function courseData(courseId) {
  const s = getState();
  const c = (s.courses[courseId] ||= {});
  c.questions ||= {};
  c.exams ||= [];
  c.days ||= {};
  c.reports ||= [];
  c.overrides ||= [];
  if (!('plan' in c)) c.plan = null;
  c.settings = { ...DEFAULT_COURSE_SETTINGS, ...(c.settings || {}) };
  return c;
}

// Postavke jednog kolegija: dnevni cilj, pragovi, trajanje ispita, zadnji odabiri.
export function courseSettings(courseId) {
  return courseData(courseId).settings;
}

// Podaci o ispitu kolegija: korisnikova postavka → zadano iz course.json → APP_DEFAULTS.
// Ne stvara zapis u pohrani (kolegij "U pripremi" ostaje bez zapisa).
export function examConfig(course) {
  const cs = getState().courses[course.id]?.settings || {};
  const validDate = (d) => (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
  return {
    examDate: validDate(cs.examDate) || validDate(course.examDate),
    targetGrade: cs.targetGrade || course.targetGrade || APP_DEFAULTS.targetGrade,
    minutesPerDay: cs.minutesPerDay || course.minutesPerDay || APP_DEFAULTS.minutesPerDay,
    grading: cs.grading || course.grading || APP_DEFAULTS.grading,
    examDuration: cs.examDuration || course.exam?.durationMin || APP_DEFAULTS.examDuration,
    gradingCustom: !!cs.grading,
  };
}

// ---------- export / import / reset (spec, odjeljak 12) ----------

export function exportJSON() {
  flush();
  return JSON.stringify(getState(), null, 1);
}

// Provjeri i pripremi uvezeni objekt; baca grešku s porukom na hrvatskom.
export function parseImport(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error('Datoteka nije ispravan JSON.');
  }
  if (!obj || typeof obj !== 'object' || typeof obj.schema !== 'number' || typeof obj.courses !== 'object') {
    throw new Error('Ovo nije sigurnosna kopija Kviza.');
  }
  if (obj.schema > SCHEMA) throw new Error('Kopija je iz novije verzije aplikacije. Prvo osvježi aplikaciju.');
  return migrate(obj);
}

export function replaceState(obj) {
  state = migrate(obj);
  flush();
}

function mergeCourse(cur, imp) {
  const out = { ...cur };
  out.questions = { ...(cur.questions || {}) };
  for (const [id, rec] of Object.entries(imp.questions || {})) {
    const mine = out.questions[id];
    // Zadrži zapis koji je zadnji viđen (noviji napredak).
    if (!mine || String(rec.lastSeen || '') > String(mine.lastSeen || '')) out.questions[id] = rec;
  }
  const byKey = (list, key) => {
    const m = new Map();
    for (const x of list) m.set(key(x), x);
    return [...m.values()];
  };
  out.exams = byKey([...(cur.exams || []), ...(imp.exams || [])], (e) => e.date)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  out.reports = byKey([...(cur.reports || []), ...(imp.reports || [])], (r) => `${r.id}|${r.date}`);
  out.overrides = byKey([...(cur.overrides || []), ...(imp.overrides || [])], (r) => `${r.id}|${r.date}`);
  out.days = { ...(cur.days || {}) };
  for (const [k, d] of Object.entries(imp.days || {})) {
    // Isti dan na dva uređaja ne možemo razdvojiti – uzmi veći zapis.
    if (!out.days[k] || (d.answered || 0) > (out.days[k].answered || 0)) out.days[k] = d;
  }
  out.bestStreak = Math.max(cur.bestStreak || 0, imp.bestStreak || 0);
  out.plan = cur.plan || imp.plan || null;
  out.settings = cur.settings || imp.settings; // postavke ostaju trenutne
  return out;
}

// Spoji: postavke ostaju trenutne, napredak se spaja.
export function mergeState(obj) {
  const s = getState();
  for (const [cid, imp] of Object.entries(obj.courses || {})) {
    s.courses[cid] = s.courses[cid] ? mergeCourse(s.courses[cid], imp) : imp;
  }
  s.bestStreak = Math.max(s.bestStreak || 0, obj.bestStreak || 0);
  flush();
}

// Briše napredak kolegija (pitanja, ispiti, dani, streak, plan). Postavke i prijave ostaju.
// Najdulji zajednički streak (state.bestStreak) ostaje.
export function resetProgress(courseId) {
  const c = courseData(courseId);
  c.questions = {};
  c.exams = [];
  c.days = {};
  c.bestStreak = 0;
  c.plan = null;
  delete c.activeExam;
  flush();
}

export function flush() {
  clearTimeout(timer);
  timer = null;
  if (memoryOnly || !state) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Spremanje nije uspjelo', e);
  }
}

// Spremanje s odgodom od 300 ms (više brzih promjena = jedno spremanje).
export function save() {
  clearTimeout(timer);
  timer = setTimeout(flush, 300);
}

addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush();
});

export function dayStats(courseId, key = todayKey()) {
  return courseData(courseId).days[key] || { answered: 0, correct: 0, seconds: 0 };
}

export function addToDay(courseId, { answered = 0, correct = 0, seconds = 0 }, key = todayKey()) {
  const days = courseData(courseId).days;
  const d = (days[key] ||= { answered: 0, correct: 0, seconds: 0 });
  d.answered += answered;
  d.correct += correct;
  d.seconds += seconds;
}
