// Navigacija, ekrani i inicijalizacija.

import * as storage from './storage.js';
import { loadCourses, loadCourse } from './content.js';
import { initQuiz, showQuiz } from './quiz.js';
import { initExam, showExam } from './exam.js';
import { renderSettings, resetSettingsUi, applyTheme } from './settings.js';
import { initPlan, renderPlan, resetPlanForm, todayCardHtml, todayTask, quizPreset } from './plan.js';
import { esc, daysUntil, plural } from './util.js';
import { streakInfo, renderStats } from './stats.js';

let ctx = null;
const root = () => document.getElementById('screen');

function go(name, arg) {
  const el = root();
  el.onclick = el.onsubmit = el.onchange = null;
  document.querySelectorAll('.tabbar button').forEach((b) => {
    const on = b.dataset.screen === name;
    b.classList.toggle('on', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  SCREENS[name](el, arg);
  window.scrollTo(0, 0);
}

function renderHome(el) {
  const st = streakInfo(ctx.courseId);
  const goal = st.goal;
  const today = storage.dayStats(ctx.courseId);
  const pct = Math.min(100, Math.round((today.answered / goal) * 100));
  const examDate = storage.courseData(ctx.courseId).plan?.examDate || ctx.course.examDate;
  const left = daysUntil(examDate);
  const total = ctx.questions.length;
  const real = ctx.questions.filter((q) => q.real_exam).length;
  const [y, m, d] = examDate.split('-');
  const examText = left > 0
    ? `Ispit za <strong>${left}</strong> ${plural(left, 'dan', 'dana', 'dana')} (${Number(d)}.${Number(m)}.${y}.)`
    : left === 0 ? '<strong>Ispit je danas!</strong>' : 'Datum ispita je prošao.';
  const streakText = st.current
    ? `${st.current} ${plural(st.current, 'dan', 'dana', 'dana')} zaredom`
    : 'Kreni danas!';
  const streakHint = st.todayCounted
    ? 'Današnji dan se broji.'
    : st.current
      ? `Odgovori na još ${goal - today.answered} da niz ne pukne.`
      : `Odgovori na ${goal} pitanja danas i niz počinje.`;

  el.innerHTML = `
    <h1>${esc(ctx.course.name)} kviz</h1>
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
    <p class="muted center">${examText}</p>
    ${todayCardHtml(today.answered)}
    <button type="button" class="btn primary big" data-act="quick">⚡ Brzi kviz · 10</button>
    <button type="button" class="btn big" data-act="real">🎯 Samo ispitna pitanja</button>
    <button type="button" class="btn ghost" data-act="pick">Odaberi poglavlja</button>
    <p class="muted small center">U bazi: ${total} ${plural(total, 'pitanje', 'pitanja', 'pitanja')} (${real} s kolokvija)</p>`;

  el.onclick = (e) => {
    const act = e.target.closest('button')?.dataset.act;
    if (act === 'quick') go('quiz', { size: 10 });
    else if (act === 'real') go('quiz', { size: 10, realOnly: true });
    else if (act === 'pick') go('quiz');
    else if (act === 'exam') go('exam');
    else if (act === 'plan') go('plan');
    else if (act === 'plan-go') { const t = todayTask(); if (t?.task) go('quiz', quizPreset(t.task)); }
    else if (act === 'plan-exam') go('exam', { duration: 30 });
  };
}

const SCREENS = {
  home: renderHome,
  quiz: (el, preset) => showQuiz(el, preset),
  exam: (el, arg) => showExam(el, arg),
  plan: (el) => { resetPlanForm(); renderPlan(el); },
  stats: (el) => renderStats(el, ctx),
  settings: (el) => { resetSettingsUi(); renderSettings(el, ctx); },
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
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
  document.querySelector('.tabbar').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-screen]');
    if (b && ctx) go(b.dataset.screen);
  });
  try {
    const courses = await loadCourses();
    const entry = courses.find((c) => c.id === storage.settings().course) || courses[0];
    const { course, questions } = await loadCourse(entry);
    ctx = { courseId: course.id, course, questions, courses, go };
    storage.courseData(course.id);
    initQuiz(ctx);
    initExam(ctx);
    initPlan(ctx);
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
