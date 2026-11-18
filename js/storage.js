// Pohrana u localStorage pod jednim ključem (spec, odjeljak 13).

import { todayKey } from './util.js';

const KEY = 'bmkviz.v1';
export const SCHEMA = 1;

const DEFAULT_SETTINGS = {
  course: 'biomehanika',
  dailyGoal: 10,
  displayMode: 'auto', // auto | mc | fill
  theme: 'system',
  vibration: true,
  quiz: null, // zadnji odabir u kvizu
};

let state = null;
let timer = null;
let memoryOnly = false; // true ako localStorage nije dostupan

function freshState() {
  return { schema: SCHEMA, settings: { ...DEFAULT_SETTINGS }, courses: {} };
}

// Migracije po broju sheme. Za buduće sheme: if (s.schema === 1) { …; s.schema = 2; }
function migrate(s) {
  if (!s || typeof s !== 'object' || typeof s.schema !== 'number') return freshState();
  s.settings = { ...DEFAULT_SETTINGS, ...(s.settings || {}) };
  s.courses = s.courses && typeof s.courses === 'object' ? s.courses : {};
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
  return c;
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
