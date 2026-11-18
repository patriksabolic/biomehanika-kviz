// Navigacija, ekrani i inicijalizacija.

import * as storage from './storage.js';
import { loadCourses, loadCourse, loadVersion } from './content.js';
import { initQuiz, showQuiz } from './quiz.js';
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
  const left = daysUntil(ctx.course.examDate);
  const total = ctx.questions.length;
  const real = ctx.questions.filter((q) => q.real_exam).length;
  const [y, m, d] = ctx.course.examDate.split('-');
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
    <p class="muted center">${examText}</p>
    <button type="button" class="btn primary big" data-act="quick">⚡ Brzi kviz · 10</button>
    <button type="button" class="btn big" data-act="real">🎯 Samo ispitna pitanja</button>
    <button type="button" class="btn ghost" data-act="pick">Odaberi poglavlja</button>
    <p class="muted small center">U bazi: ${total} ${plural(total, 'pitanje', 'pitanja', 'pitanja')} (${real} s kolokvija)</p>`;

  el.onclick = (e) => {
    const act = e.target.closest('button')?.dataset.act;
    if (act === 'quick') go('quiz', { size: 10 });
    else if (act === 'real') go('quiz', { size: 10, realOnly: true });
    else if (act === 'pick') go('quiz');
  };
}

function soon(title) {
  return (el) => {
    el.innerHTML = `<h1>${title}</h1><section class="card center"><p class="soon">Uskoro</p>
      <p class="muted small">Ovaj ekran dolazi u sljedećoj fazi izrade.</p></section>`;
  };
}

async function renderSettings(el) {
  const st = storage.settings();
  const modes = [['auto', 'Automatski'], ['mc', 'Uvijek zaokruživanje'], ['fill', 'Uvijek nadopunjavanje']];
  el.innerHTML = `
    <h1>Postavke</h1>
    <section class="card">
      <h2>Način prikaza</h2>
      <p class="muted small">Automatski: pitanje kreće kao zaokruživanje, a nakon 2 točna zaredom prelazi u nadopunjavanje (i natrag nakon 2 netočna).</p>
      ${modes.map(([v, label]) => `<label class="toggle"><input type="radio" name="displayMode" value="${v}" ${st.displayMode === v ? 'checked' : ''}><span>${label}</span></label>`).join('')}
    </section>
    <section class="card">
      <h2>Dnevni cilj</h2>
      <p class="muted small">Dan se broji u streak kad odgovoriš na barem ovoliko pitanja.</p>
      <div class="segmented">${[5, 10, 15, 20, 30].map((n) => `<button type="button" class="seg ${st.dailyGoal === n ? 'on' : ''}" data-goal="${n}" aria-pressed="${st.dailyGoal === n}">${n}</button>`).join('')}</div>
    </section>
    <section class="card center"><p class="muted small">Ostale postavke (pragovi ocjena, export/import, prijave …) dolaze u fazi M3.</p></section>
    <p class="muted small center" id="version"></p>`;
  el.onchange = (e) => {
    if (e.target.name === 'displayMode') { st.displayMode = e.target.value; storage.save(); }
  };
  el.onclick = (e) => {
    const g = e.target.closest('button')?.dataset.goal;
    if (g) { st.dailyGoal = Number(g); storage.save(); renderSettings(el); }
  };
  const v = await loadVersion();
  const vEl = el.querySelector('#version');
  if (v && vEl) vEl.textContent = `Verzija aplikacije ${v.version} · sadržaj ${v.content}`;
}

const SCREENS = {
  home: renderHome,
  quiz: (el, preset) => showQuiz(el, preset),
  exam: soon('Ispit'),
  stats: (el) => renderStats(el, ctx),
  settings: renderSettings,
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
  document.querySelector('.tabbar').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-screen]');
    if (b && ctx) go(b.dataset.screen);
  });
  try {
    const courses = await loadCourses();
    const entry = courses.find((c) => c.id === storage.settings().course) || courses[0];
    const { course, questions } = await loadCourse(entry);
    ctx = { courseId: course.id, course, questions, go };
    storage.courseData(course.id);
    initQuiz(ctx);
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
