// Navigacija, ekrani i inicijalizacija. Početna = popis kolegija; ostali ekrani rade za odabrani kolegij.

import * as storage from './storage.js';
import { loadCourses, loadCourse } from './content.js';
import { initQuiz, showQuiz } from './quiz.js';
import { initExam, showExam } from './exam.js';
import { renderSettings, resetSettingsUi, applyTheme } from './settings.js';
import { initPlan, renderPlan, resetPlanForm, todayCardHtml, todayTask, taskText, quizPreset } from './plan.js';
import { initZoom } from './zoom.js';
import { esc, daysUntil, plural } from './util.js';
import { streakInfo, globalStreakInfo, renderStats } from './stats.js';

const SUPPORTED = new Set(['mc', 'fill']);

// Odabrani kolegij. Isti objekt dijele quiz/exam/plan; pri prelasku se mijenja sadržaj, ne objekt.
const ctx = { courseId: null, course: null, questions: [], courses: [], go };
let loaded = [];   // [{ entry, courseId, course, questions, error }] redom iz courses.json
const root = () => document.getElementById('screen');

const isReady = (c) => !c.error && c.questions.some((q) => SUPPORTED.has(q.type));
const loadedById = (id) => loaded.find((c) => c.courseId === id);

function selectCourse(id) {
  const c = loadedById(id);
  if (!c || !isReady(c)) return false;
  if (ctx.courseId !== id) {
    Object.assign(ctx, { courseId: c.courseId, course: c.course, questions: c.questions });
    storage.courseData(id);
    initQuiz(ctx);
    initExam(ctx);
    initPlan(ctx);
    resetPlanForm();
  }
  if (storage.settings().lastCourse !== id) {
    storage.settings().lastCourse = id;
    storage.save();
  }
  return true;
}

function fmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${Number(d)}.${Number(m)}.${y}.`;
}

function examDateOf(c) {
  // Postavka korisnika, inače zadano iz course.json. Ne stvara zapis u pohrani.
  return c.course ? storage.examConfig(c.course).examDate : null;
}

function examText(iso) {
  if (!iso) return '📅 <strong>Postavi datum ispita</strong>';
  const left = daysUntil(iso);
  if (left > 0) return `Ispit za <strong>${left}</strong> ${plural(left, 'dan', 'dana', 'dana')} (${fmtDate(iso)})`;
  return left === 0 ? '<strong>Ispit je danas!</strong>' : 'Datum ispita je prošao.';
}

function setHeader(name) {
  const bar = document.querySelector('.appbar');
  const onList = name === 'home' || !ctx.course;
  bar.hidden = onList;
  if (!onList) bar.querySelector('.appbar-title').textContent = ctx.course.name;
  const tab = name === 'course' || name === 'plan' ? 'home' : name;
  document.querySelectorAll('.tabbar button').forEach((b) => {
    const on = b.dataset.screen === tab;
    b.classList.toggle('on', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
}

function go(name, arg) {
  // Ekrani kolegija bez odabranog kolegija (npr. nijedan nema pitanja) → popis kolegija.
  if (name !== 'home' && !ctx.course) name = 'home';
  const el = root();
  el.onclick = el.onsubmit = el.onchange = null;
  setHeader(name);
  SCREENS[name](el, arg);
  window.scrollTo(0, 0);
}

// ---------- Početna: popis kolegija ----------

function courseCardHtml(c) {
  const name = esc(c.course?.name || c.entry.name || c.courseId);
  if (c.error) {
    return `<div class="course-card disabled"><span class="cc-head"><span class="cc-name">${name}</span>
      <span class="badge bad">Greška</span></span>
      <span class="muted small">Sadržaj se nije mogao učitati: ${esc(c.error)}</span></div>`;
  }
  const date = examDateOf(c);
  if (!isReady(c)) {
    return `<div class="course-card disabled" aria-disabled="true"><span class="cc-head"><span class="cc-name">${name}</span>
      <span class="badge prep">U pripremi</span></span>
      ${date ? `<span class="muted small">${examText(date)}</span>` : ''}
      <span class="muted small">Pitanja još nisu dodana.</span></div>`;
  }
  const cd = storage.courseData(c.courseId);
  const goal = cd.settings.dailyGoal;
  const today = storage.dayStats(c.courseId);
  const pct = Math.min(100, Math.round((today.answered / goal) * 100));
  const t = todayTask(c);
  let plan = 'Plan učenja nije napravljen.';
  if (t?.done) plan = 'Datum ispita iz plana je prošao.';
  else if (t?.task) plan = `Danas: ${esc(taskText(t.task, c))}`;
  const st = streakInfo(c.courseId);
  return `<button type="button" class="course-card ${c.courseId === ctx.courseId ? 'last' : ''}" data-course="${esc(c.courseId)}">
      <span class="cc-head"><span class="cc-name">${name}</span><span class="cc-go" aria-hidden="true">›</span></span>
      <span class="small">${examText(date)}</span>
      <span class="row-between small"><span>Danas odgovoreno${st.current ? ` · 🔥 ${st.current}` : ''}</span><strong class="nums">${today.answered}/${goal}${today.answered >= goal ? ' ✓' : ''}</strong></span>
      <span class="progress" aria-hidden="true"><span style="width:${pct}%"></span></span>
      <span class="muted small">${plan}</span>
      ${cd.activeExam ? '<span class="warn-text small">⏱️ Započeti ispit čeka nastavak</span>' : ''}
    </button>`;
}

function renderCourseList(el) {
  const ready = loaded.filter(isReady);
  const st = globalStreakInfo(ready.map((c) => c.courseId));
  const streakText = st.current ? `${st.current} ${plural(st.current, 'dan', 'dana', 'dana')} zaredom` : 'Kreni danas!';
  el.innerHTML = `
    <h1>Kviz</h1>
    <section class="card">
      <div class="streak-row">
        <span class="flame ${st.current ? 'lit' : ''}" aria-hidden="true">🔥</span>
        <div class="streak-text">
          <strong class="streak-num">${streakText}</strong>
          <span class="muted small">Najdulji niz: ${st.longest} · ${st.todayCounted ? 'Današnji dan se broji.' : 'Dan se broji kad u bilo kojem kolegiju ispuniš dnevni cilj.'}</span>
        </div>
      </div>
    </section>
    <h2>Kolegiji</h2>
    <div class="course-list">${loaded.map(courseCardHtml).join('')}</div>`;
  el.onclick = (e) => {
    const b = e.target.closest('button[data-course]');
    if (b && selectCourse(b.dataset.course)) go('course');
  };
}

// ---------- Početna kolegija ----------

function renderCourseHome(el) {
  const st = streakInfo(ctx.courseId);
  const goal = st.goal;
  const today = storage.dayStats(ctx.courseId);
  const pct = Math.min(100, Math.round((today.answered / goal) * 100));
  const total = ctx.questions.length;
  const real = ctx.questions.filter((q) => q.real_exam).length;
  const streakText = st.current
    ? `${st.current} ${plural(st.current, 'dan', 'dana', 'dana')} zaredom`
    : 'Kreni danas!';
  const streakHint = st.todayCounted
    ? 'Današnji dan se broji.'
    : st.current
      ? `Odgovori na još ${goal - today.answered} da niz ne pukne.`
      : `Odgovori na ${goal} pitanja danas i niz počinje.`;

  el.innerHTML = `
    <section class="card">
      <div class="streak-row">
        <span class="flame ${st.current ? 'lit' : ''}" aria-hidden="true">🔥</span>
        <div class="streak-text">
          <strong class="streak-num">${streakText}</strong>
          <span class="muted small">Najdulji niz: ${st.longest} · ${streakHint}</span>
        </div>
      </div>
      <div class="row-between">
        <span>Danas odgovoreno</span>
        <strong class="today-count">${today.answered}/${goal}</strong>
      </div>
      <div class="progress big" aria-hidden="true"><div style="width:${pct}%"></div></div>
      <p class="muted small">${today.answered >= goal ? '✓ Dnevni cilj ispunjen.' : `Još ${goal - today.answered} do dnevnog cilja.`}
        ${today.answered ? ` Točno: ${today.correct}.` : ''}</p>
    </section>
    ${storage.courseData(ctx.courseId).activeExam ? '<button type="button" class="btn primary big" data-act="exam">⏱️ Nastavi započeti ispit</button>' : ''}
    ${examDateOf(ctx)
      ? `<p class="muted center">${examText(examDateOf(ctx))}</p>`
      : '<button type="button" class="btn ghost" data-act="setdate">📅 Postavi datum ispita</button>'}
    ${todayCardHtml(today.answered)}
    <button type="button" class="btn primary big" data-act="quick">⚡ Brzi kviz · 10</button>
    ${real ? '<button type="button" class="btn big" data-act="real">🎯 Samo ispitna pitanja</button>' : ''}
    <button type="button" class="btn ghost" data-act="pick">Odaberi poglavlja</button>
    <p class="muted small center">U bazi: ${total} ${plural(total, 'pitanje', 'pitanja', 'pitanja')}${real ? ` (${real} s kolokvija)` : ''}</p>`;

  el.onclick = (e) => {
    const act = e.target.closest('button')?.dataset.act;
    if (act === 'quick') go('quiz', { size: 10 });
    else if (act === 'real') go('quiz', { size: 10, realOnly: true });
    else if (act === 'pick') go('quiz');
    else if (act === 'exam') go('exam');
    else if (act === 'plan') go('plan');
    else if (act === 'setdate') go('settings', 'exam');
    else if (act === 'plan-go') { const t = todayTask(); if (t?.task) go('quiz', quizPreset(t.task)); }
    else if (act === 'plan-exam') go('exam', { duration: 30 });
  };
}

const SCREENS = {
  home: renderCourseList,
  course: renderCourseHome,
  quiz: (el, preset) => showQuiz(el, preset),
  exam: (el, arg) => showExam(el, arg),
  plan: (el) => { resetPlanForm(); renderPlan(el); },
  stats: (el) => renderStats(el, ctx),
  settings: (el, focus) => { resetSettingsUi(); renderSettings(el, ctx, focus); },
};

function showError(err) {
  const fileHint = location.protocol === 'file:'
    ? '<p>Aplikacija je otvorena izravno iz datoteke. Pokreni lokalni server (<code>python -m http.server 8000</code>) i otvori <code>http://localhost:8000</code>.</p>'
    : '';
  root().innerHTML = `<h1>Greška</h1><section class="card"><p>Sadržaj se nije mogao učitati.</p>${fileHint}
    <p class="muted small">${esc(err?.message || err)}</p></section>`;
}

async function init() {
  storage.load();
  applyTheme();
  initZoom();
  window.kvizMath?.observe(document.body); // formule na svim ekranima
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
  let started = false;
  document.querySelector('.tabbar').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-screen]');
    if (b && started) go(b.dataset.screen);
  });
  document.querySelector('.appbar .back').addEventListener('click', () => { if (started) go('home'); });
  try {
    const entries = await loadCourses();
    ctx.courses = entries;
    // Kolegij koji se ne može učitati ne ruši ostale (kartica pokaže grešku).
    loaded = await Promise.all(entries.map((entry) => loadCourse(entry)
      .then(({ course, questions }) => ({ entry, courseId: entry.id, course, questions, error: null }))
      .catch((e) => {
        console.error('Kolegij se nije učitao', entry.id, e);
        return { entry, courseId: entry.id, course: null, questions: [], error: e?.message || String(e) };
      })));
    const last = storage.settings().lastCourse;
    const first = loaded.find((c) => c.courseId === last && isReady(c)) || loaded.find(isReady);
    if (first) selectCourse(first.courseId);
    started = true;
    go('home');
  } catch (e) {
    console.error(e);
    showError(e);
  }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('Service worker nije registriran', e));
  }
}

init();
