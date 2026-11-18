// Plan učenja (spec, odjeljak 11): raspored poglavlja po danima, dnevni ponovni izračun, zaostatak.

import { esc, todayKey, plural } from './util.js';
import { courseData, save } from './storage.js';
import { isLearned } from './stats.js';

export const LEARNED_TARGET = { 2: 0.5, 3: 0.65, 4: 0.8, 5: 0.9 };
const PROCESSED_SHARE = 0.8; // poglavlje je "obrađeno" kad je viđeno ≥ 80 % njegovih pitanja
const WEEKDAYS = ['Ne', 'Po', 'Ut', 'Sr', 'Če', 'Pe', 'Su']; // getDay(): 0 = nedjelja
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MINUTES = [10, 15, 20, 30, 45];

let ctx = null;
let form = null; // uređivanje postavki plana

export function initPlan(c) {
  ctx = c;
}

// ---------- datumi ----------

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return todayKey(d);
}

function fmtDay(key) {
  const d = parseKey(key);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.`;
}

// Dani učenja od `from` (uključivo) do dana prije ispita, bez neradnih dana.
function studyDates(from, examDate, daysOff) {
  const out = [];
  const off = new Set(daysOff || []);
  for (let k = from; k < examDate; k = addDays(k, 1)) {
    if (!off.has(parseKey(k).getDay())) out.push(k);
  }
  return out;
}

// ---------- stanje poglavlja ----------

function chapterInfo() {
  const cd = courseData(ctx.courseId);
  const info = {};
  for (const q of ctx.questions) {
    const c = (info[q.chapter] ||= { id: q.chapter, total: 0, seen: 0, real: 0 });
    c.total++;
    if (cd.questions[q.id]?.answered) c.seen++;
    if (q.real_exam) c.real++;
  }
  for (const c of Object.values(info)) {
    c.unseen = c.total - c.seen;
    c.processed = c.seen >= Math.ceil(c.total * PROCESSED_SHARE);
  }
  return info;
}

const courseOrder = () => ctx.course.chapters.map((c) => c.id);

// Poglavlja po redu kolegija rasporedi na `days` dana tako da zbroj težina po danu bude
// što ravnomjerniji (pohlepno, redoslijed se čuva). Unutar dana prvo poglavlja s ispitnim pitanjima.
export function distribute(chapters, days) {
  const out = Array.from({ length: days }, () => []);
  if (!days) return out;
  const n = chapters.length;
  let left = chapters.reduce((s, c) => s + c.weight, 0);
  let i = 0;
  for (let d = 0; d < days && i < n; d++) {
    const daysLeft = days - d;
    if (daysLeft === 1) {
      while (i < n) out[d].push(chapters[i++]);
      break;
    }
    const target = left / daysLeft;
    let sum = 0;
    while (i < n) {
      const w = chapters[i].weight;
      // Dodaj sljedeće poglavlje samo ako dan time dolazi bliže prosjeku (prvo poglavlje uvijek).
      if (sum > 0 && Math.abs(sum + w - target) >= Math.abs(sum - target)) break;
      out[d].push(chapters[i]);
      sum += w;
      i++;
      if (n - i <= daysLeft - 1) break; // ostavi poglavlja za preostale dane
    }
    left -= sum;
  }
  return out.map((day) => [...day].sort((a, b) => (b.real > 0) - (a.real > 0)));
}

// ---------- izrada i dnevni izračun ----------

export function perDayOf(plan) {
  return Math.max(1, Math.round(plan.minutesPerDay / 0.75));
}

export function createPlan({ examDate, targetGrade, minutesPerDay, daysOff }) {
  const today = todayKey();
  const dates = studyDates(today, examDate, daysOff);
  const reviewDays = Math.min(dates.length, Math.max(2, Math.round(dates.length * 0.25)));
  const learnDates = dates.slice(0, dates.length - reviewDays);
  const info = chapterInfo();
  const chapters = courseOrder().filter((id) => info[id]).map((id) => ({ ...info[id], weight: info[id].total }));
  const parts = distribute(chapters, learnDates.length);
  const baseline = {};
  learnDates.forEach((k, i) => { baseline[k] = parts[i].map((c) => c.id); });
  const plan = {
    examDate, targetGrade, minutesPerDay, daysOff,
    generatedAt: new Date().toISOString(),
    reviewFrom: dates[dates.length - reviewDays] || examDate,
    baseline,
    today: null,
  };
  courseData(ctx.courseId).plan = plan;
  save();
  return plan;
}

// Raspored od danas do ispita prema trenutnom stanju (neobrađena poglavlja na preostale dane učenja).
export function computeSchedule(plan) {
  const today = todayKey();
  const dates = studyDates(today, plan.examDate, plan.daysOff);
  const learnDates = dates.filter((k) => k < plan.reviewFrom);
  const reviewDates = dates.filter((k) => k >= plan.reviewFrom);
  const info = chapterInfo();
  const order = courseOrder().filter((id) => info[id]);
  // Zaostatak: poglavlja koja su po prvotnom planu trebala biti obrađena prije danas.
  const backlog = [...new Set(Object.entries(plan.baseline || {})
    .filter(([k]) => k < today).flatMap(([, ids]) => ids))]
    .filter((id) => info[id] && !info[id].processed);
  // Neobrađena poglavlja: najprije zaostala, zatim ostala po redu kolegija.
  const late = new Set(backlog);
  const remaining = [...backlog, ...order.filter((id) => !info[id].processed && !late.has(id))]
    .map((id) => ({ ...info[id], weight: Math.max(1, info[id].unseen) }));
  const parts = distribute(remaining, learnDates.length);
  const perDay = perDayOf(plan);
  const unseenLeft = remaining.reduce((s, c) => s + c.unseen, 0);
  // Potrebno dnevno da se do početka ponavljanja vide sva preostala pitanja (70 % dana su nova pitanja).
  const needed = learnDates.length ? Math.ceil(unseenLeft / learnDates.length / 0.7) : 0;
  const behind = backlog.length > 0; // zaostatak = poglavlja iz prošlih dana plana nisu obrađena
  // Veći dnevni broj samo kod zaostatka (spec, odjeljak 11); najviše 3 × perDay.
  const learnN = behind ? Math.min(perDay * 3, Math.max(perDay, needed)) : perDay;

  const days = [];
  learnDates.forEach((k, i) => days.push({ date: k, type: 'learn', chapters: parts[i].map((c) => c.id), n: learnN }));
  reviewDates.forEach((k, i) => days.push({ date: k, type: 'review', chapters: [], n: perDay, mockExam: (i + 1) % 3 === 0 }));
  // Dan učenja bez poglavlja (sve obrađeno) postaje ponavljanje.
  for (const d of days) if (d.type === 'learn' && !d.chapters.length) { d.type = 'review'; d.n = perDay; }
  return { days, backlog, behind, needed, perDay, unseenLeft, info, isStudyDay: dates[0] === today };
}

// Današnji zadatak se "zamrzne" za cijeli dan (ne mijenja se dok ga rješavaš); novi dan = novi izračun.
export function todayTask() {
  const plan = courseData(ctx.courseId)?.plan;
  if (!plan) return null;
  const today = todayKey();
  if (today >= plan.examDate) return { plan, done: true };
  if (plan.today?.date !== today) {
    const s = computeSchedule(plan);
    const first = s.isStudyDay ? s.days[0] : null;
    plan.today = first
      ? { date: today, type: first.type, chapters: first.chapters, n: first.n, mockExam: !!first.mockExam, behind: s.behind, backlog: s.backlog, raised: first.n > s.perDay }
      : { date: today, type: 'off', chapters: [], n: 0, behind: s.behind, backlog: s.backlog };
    save();
  }
  return { plan, task: plan.today };
}

export function taskText(task) {
  if (task.type === 'off') return 'Danas je slobodan dan prema planu.';
  const names = task.type === 'learn'
    ? task.chapters.map((id) => `${id} ${ctx.course.chapterById[id]?.title || ''}`).join(', ')
    : 'ponavljanje svih poglavlja';
  return `${names} · ${task.n} ${plural(task.n, 'pitanje', 'pitanja', 'pitanja')} · ~${Math.round(task.n * 0.75)} min`;
}

// Postavke kviza za današnji zadatak (quiz.js ih prima kao preset).
export function quizPreset(task) {
  if (task.type === 'learn') return { plan: { chapters: task.chapters, n: task.n } };
  return { size: task.n || 20 };
}

// Kartica "Danas" za Početnu.
export function todayCardHtml(todayAnswered) {
  const t = todayTask();
  if (!t) {
    return `<section class="card plan-card">
      <h2>Plan učenja</h2>
      <p class="muted small">Napravi plan pa ti aplikacija svaki dan kaže što učiti do ispita.</p>
      <button type="button" class="btn" data-act="plan">📅 Napravi plan</button></section>`;
  }
  if (t.done) {
    return `<section class="card plan-card"><h2>Plan učenja</h2><p class="muted small">Datum ispita iz plana je prošao.</p>
      <button type="button" class="btn ghost" data-act="plan">Uredi plan</button></section>`;
  }
  const task = t.task;
  const pct = task.n ? Math.min(100, Math.round((todayAnswered / task.n) * 100)) : 0;
  return `<section class="card plan-card">
    <div class="row-between"><h2>Danas${task.type === 'review' ? ' · ponavljanje' : ''}</h2>
      <button type="button" class="link small" data-act="plan">Plan</button></div>
    ${task.behind ? `<p class="warn-text small">⚠️ Kasniš s planom (${task.backlog.length} ${plural(task.backlog.length, 'poglavlje', 'poglavlja', 'poglavlja')} iz prošlih dana) – današnji broj pitanja je povećan.</p>` : ''}
    <p>${esc(taskText(task))}</p>
    ${task.n ? `<div class="progress" aria-hidden="true"><div style="width:${pct}%"></div></div>
      <p class="muted small">Danas odgovoreno ${todayAnswered}/${task.n}</p>
      <button type="button" class="btn primary big" data-act="plan-go">▶ Kreni</button>` : ''}
    ${task.mockExam ? '<button type="button" class="btn" data-act="plan-exam">⏱️ Probni ispit · 30 min</button>' : ''}
  </section>`;
}

// ---------- ekran Plan ----------

function formDefaults() {
  const p = courseData(ctx.courseId).plan;
  return {
    examDate: p?.examDate || ctx.course.examDate,
    targetGrade: p?.targetGrade || 3,
    minutesPerDay: p?.minutesPerDay || 15,
    daysOff: [...(p?.daysOff || [])],
  };
}

function areaProgressHtml(plan) {
  const cd = courseData(ctx.courseId);
  const target = LEARNED_TARGET[plan.targetGrade] || 0.65;
  return ctx.course.areas.map((a) => {
    const qs = ctx.questions.filter((q) => a.chapters.includes(q.chapter));
    if (!qs.length) return '';
    const learned = qs.filter((q) => isLearned(q, cd.questions[q.id])).length / qs.length;
    const ok = learned >= target;
    return `<li class="area-goal"><span>${esc(a.name)}</span>
      <span class="nums ${ok ? 'good' : ''}">${ok ? '✓ ' : ''}${Math.round(learned * 100)} % / ${Math.round(target * 100)} %</span>
      <div class="goal-bar" aria-hidden="true"><div style="width:${Math.round(learned * 100)}%"></div><i style="left:${Math.round(target * 100)}%"></i></div></li>`;
  }).join('');
}

function formHtml() {
  const f = form;
  const off = new Set(f.daysOff);
  return `<section class="card">
      <h2>Postavke plana</h2>
      <label class="field"><span>Datum ispita</span><input type="date" class="select" data-f="examDate" value="${esc(f.examDate)}"></label>
      <p class="field-label">Ciljana ocjena</p>
      <div class="segmented">${[2, 3, 4, 5].map((g) => `<button type="button" class="seg ${f.targetGrade === g ? 'on' : ''}" data-grade="${g}" aria-pressed="${f.targetGrade === g}">${g}</button>`).join('')}</div>
      <p class="field-label">Minuta dnevno</p>
      <div class="segmented">${MINUTES.map((m) => `<button type="button" class="seg ${f.minutesPerDay === m ? 'on' : ''}" data-min="${m}" aria-pressed="${f.minutesPerDay === m}">${m}</button>`).join('')}</div>
      <p class="field-label">Neradni dani (opcionalno)</p>
      <div class="chips">${WEEK_ORDER.map((d) => `<button type="button" class="chip-btn ${off.has(d) ? 'on' : ''}" data-off="${d}" aria-pressed="${off.has(d)}">${WEEKDAYS[d]}</button>`).join('')}</div>
      <p class="muted small">≈ ${Math.round(f.minutesPerDay / 0.75)} pitanja dnevno (~45 s po pitanju).</p>
      <button type="button" class="btn primary" data-act="save">${courseData(ctx.courseId).plan ? 'Spremi i preračunaj plan' : 'Napravi plan'}</button>
      ${courseData(ctx.courseId).plan ? '<button type="button" class="btn ghost" data-act="cancel">Odustani</button>' : ''}
    </section>`;
}

export function renderPlan(el) {
  const plan = courseData(ctx.courseId).plan;
  if (!plan || form) {
    form ||= formDefaults();
    el.innerHTML = `<h1>Plan učenja</h1>${formHtml()}`;
  } else {
    const t = todayTask();
    const s = computeSchedule(plan);
    const learnLeft = s.days.filter((d) => d.type === 'learn').length;
    const reviewLeft = s.days.filter((d) => d.type === 'review').length;
    const rows = s.days.map((d, i) => {
      const isToday = i === 0 && s.isStudyDay;
      const task = isToday && t?.task ? t.task : d;
      const what = task.type === 'learn'
        ? task.chapters.map((id) => `${id} ${esc(ctx.course.chapterById[id]?.title || '')}`).join(', ')
        : `Ponavljanje${task.mockExam ? ' + probni ispit 30 min' : ''}`;
      return `<li class="plan-day ${isToday ? 'today' : ''} ${task.type}">
        <span class="pd-date">${isToday ? 'Danas' : fmtDay(d.date)}</span>
        <span class="pd-what">${what}</span>
        <span class="pd-n nums">${task.n}</span></li>`;
    }).join('');
    const backlogNames = s.backlog.map((id) => `${id} ${ctx.course.chapterById[id]?.title || ''}`).join(', ');
    el.innerHTML = `
      <h1>Plan učenja</h1>
      <section class="card">
        <p>Ispit <strong>${fmtDay(plan.examDate)}${parseKey(plan.examDate).getFullYear()}.</strong> · cilj ocjena <strong>${plan.targetGrade}</strong> · ${plan.minutesPerDay} min dnevno</p>
        <p class="muted small">Preostalo: ${learnLeft} ${plural(learnLeft, 'dan', 'dana', 'dana')} učenja + ${reviewLeft} ${plural(reviewLeft, 'dan', 'dana', 'dana')} ponavljanja · neviđenih pitanja ${s.unseenLeft}. Plan se preračunava svaki dan prema napretku.</p>
        ${s.behind ? `<p class="notice bad">⚠️ Kasniš s planom. Nisu obrađena: ${esc(backlogNames)}. Dnevni broj pitanja je povećan na ~${Math.min(s.perDay * 3, Math.max(s.perDay, s.needed))}.</p>` : ''}
        ${!s.behind && s.needed > s.perDay ? `<p class="muted small">ℹ️ Uz ${s.perDay} pitanja dnevno nećeš do ponavljanja vidjeti sva pitanja. Za sva bi trebalo ~${s.needed} dnevno (~${Math.round(s.needed * 0.75)} min) – po želji povećaj minute u postavkama plana.</p>` : ''}
        <button type="button" class="btn ghost" data-act="edit">Uredi postavke plana</button>
      </section>
      <section class="card">
        <h2>Raspored</h2>
        <p class="muted small">Dan učenja: 70 % novih pitanja iz zadanih poglavlja + 30 % ponavljanja. Broj desno = pitanja.</p>
        <ul class="list plan-list">${rows || '<li>Nema preostalih dana do ispita.</li>'}</ul>
      </section>
      <section class="card">
        <h2>Naučeno po području</h2>
        <p class="muted small">Naučeno / cilj za ocjenu ${plan.targetGrade}. Poglavlje je „obrađeno” kad vidiš ${Math.round(PROCESSED_SHARE * 100)} % njegovih pitanja.</p>
        <ul class="list">${areaProgressHtml(plan)}</ul>
      </section>`;
  }

  el.onsubmit = (e) => e.preventDefault();
  el.onchange = (e) => {
    if (e.target.dataset.f === 'examDate' && form) form.examDate = e.target.value;
  };
  el.onclick = (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.grade) form.targetGrade = Number(t.dataset.grade);
    else if (t.dataset.min) form.minutesPerDay = Number(t.dataset.min);
    else if (t.dataset.off !== undefined) {
      const d = Number(t.dataset.off);
      form.daysOff = form.daysOff.includes(d) ? form.daysOff.filter((x) => x !== d) : [...form.daysOff, d];
    } else if (t.dataset.act === 'save') {
      const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(form.examDate) && form.examDate > todayKey();
      if (!dateOk) { form.examDate = ctx.course.examDate; renderPlan(el); return; }
      if (form.daysOff.length >= 7) form.daysOff = [];
      createPlan(form);
      form = null;
      window.scrollTo(0, 0);
    } else if (t.dataset.act === 'cancel') form = null;
    else if (t.dataset.act === 'edit') form = formDefaults();
    else return;
    renderPlan(el);
  };
}

export function resetPlanForm() {
  form = null;
}
