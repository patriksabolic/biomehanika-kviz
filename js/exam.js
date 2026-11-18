// Ispitni mod (spec, odjeljak 8): postavke, sastav, odbrojavanje, predaja, bodovanje, ocjena, pregled.

import { esc, shuffle, formatDuration, vibrate, plural, todayKey } from './util.js';
import { courseData, settings, save, flush, addToDay } from './storage.js';
import { gradeFill, isNumericAnswer } from './grading.js';
import { applyAnswer, markSeen, getRecord, isDual } from './scheduler.js';
import { pickerHtml, pickerClick, countByChapter } from './picker.js';

const DURATIONS = [15, 30, 45, 60];
const SUPPORTED = new Set(['mc', 'fill']); // image-label/order/match dolaze u M5
const REAL_SHARE = 0.3;
export const GRADE_NAMES = { 1: 'nedovoljan', 2: 'dovoljan', 3: 'dobar', 4: 'vrlo dobar', 5: 'izvrstan' };

let ctx = null;
let qById = null;
let setup = null;    // odabir na ekranu postavljanja
let exam = null;     // aktivni ispit (kopija se drži u courseData().activeExam)
let result = null;   // zadnji završeni ispit za prikaz
let timerId = null;
let confirming = false;

const root = () => document.getElementById('screen');
const usable = () => ctx.questions.filter((q) => SUPPORTED.has(q.type));
const allChapterIds = () => ctx.course.chapters.map((c) => c.id);
const suggestedCount = (min) => Math.round(min * 0.8);

// ---------- ocjena ----------

export function thresholds(course = ctx.course) {
  return settings().grading || course.grading;
}

export function gradeFor(pct, thr) {
  for (const g of [5, 4, 3, 2]) if (pct >= Number(thr[g])) return g;
  return 1;
}

const fmtPct = (x) => `${String(Math.round(x * 10) / 10).replace('.', ',')} %`;

function fmtDate(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getDate()}.${d.getMonth() + 1}. ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ---------- inicijalizacija i nastavak prekinutog ispita ----------

export function initExam(c) {
  ctx = c;
  qById = new Map(ctx.questions.map((q) => [q.id, q]));
  const saved = courseData(ctx.courseId).activeExam;
  if (!saved) return;
  const items = saved.items.filter((it) => qById.has(it.id));
  if (!items.length) {
    delete courseData(ctx.courseId).activeExam;
    save();
    return;
  }
  exam = saved;
  exam.items = items;
  exam.shownAt = null; // vrijeme dok je aplikacija bila zatvorena ne broji se pitanju
  exam.queue = exam.queue.filter((i) => i < items.length);
  if (Date.now() >= exam.endAt) finish();
  else startTimer();
}

function persist() {
  courseData(ctx.courseId).activeExam = exam;
  save();
}

// ---------- ulaz ----------

export function showExam(el, preset) {
  confirming = false;
  if (exam) return renderRun(el);
  if (preset?.duration) {
    result = null;
    setup = { ...defaultSetup(), chapters: allChapterIds(), duration: preset.duration, n: suggestedCount(preset.duration) };
  }
  if (result) return renderResult(el);
  renderSetup(el);
}

// ---------- postavljanje ----------

function defaultSetup() {
  const saved = settings().exam;
  const valid = new Set(allChapterIds());
  const chapters = saved?.chapters?.filter((c) => valid.has(c));
  const def = settings().examDuration || ctx.course.exam?.durationMin || 45;
  const duration = DURATIONS.includes(def) ? def : 45;
  return { chapters: chapters && chapters.length ? chapters : allChapterIds(), duration, n: suggestedCount(duration) };
}

function poolFor(chapters) {
  const set = new Set(chapters);
  return usable().filter((q) => set.has(q.chapter));
}

export function examHistoryHtml() {
  const exams = courseData(ctx.courseId).exams;
  if (!exams.length) return '<p class="muted small">Još nema riješenih ispita.</p>';
  const last3 = exams.slice(-3);
  const avg = last3.reduce((s, e) => s + e.score, 0) / last3.length;
  const est = gradeFor(avg, thresholds());
  const rows = [...exams].reverse().slice(0, 20).map((e) => `<li>
      <span>${fmtDate(e.date)} <span class="muted small">· ${e.n} pit. · ${e.duration} min</span></span>
      <span class="nums"><span class="grade-chip g${e.grade}">${e.grade}</span> ${fmtPct(e.score)}</span></li>`).join('');
  return `<div class="hl"><span class="hl-label">Procjena ocjene (prosjek zadnja ${last3.length} ${plural(last3.length, 'ispita', 'ispita', 'ispita')})</span>
      <span class="hl-name">${GRADE_NAMES[est]} (${est})</span><span class="hl-val">${fmtPct(avg)}</span></div>
    <ul class="list">${rows}</ul>`;
}

function renderSetup(el) {
  setup ||= defaultSetup();
  const sel = new Set(setup.chapters);
  const pool = poolFor(setup.chapters);
  const counts = countByChapter(usable());
  const allOn = allChapterIds().every((c) => sel.has(c));
  const n = Math.min(setup.n, pool.length);
  const realIn = pool.filter((q) => q.real_exam).length;
  const thr = thresholds();

  el.innerHTML = `
    <h1>Ispit</h1>
    <p class="muted small">Probni ispit: bez povratne informacije do kraja, nadopunjavanje gdje je moguće, ocjena po pragovima.</p>
    <section class="card">
      <h2>Trajanje</h2>
      <div class="segmented">${DURATIONS.map((d) => `<button type="button" class="seg ${setup.duration === d ? 'on' : ''}" data-dur="${d}" aria-pressed="${setup.duration === d}">${d} min</button>`).join('')}</div>
    </section>
    <section class="card">
      <h2>Broj pitanja</h2>
      <div class="stepper">
        <button type="button" class="seg" data-step="-5" aria-label="5 manje">−5</button>
        <button type="button" class="seg" data-step="-1" aria-label="1 manje">−1</button>
        <strong class="step-val">${n}</strong>
        <button type="button" class="seg" data-step="1" aria-label="1 više">+1</button>
        <button type="button" class="seg" data-step="5" aria-label="5 više">+5</button>
      </div>
      <p class="muted small">Predloženo za ${setup.duration} min: ${suggestedCount(setup.duration)}
        ${setup.n !== suggestedCount(setup.duration) ? '· <button type="button" class="link small" data-act="suggest">vrati predloženo</button>' : ''}
        ${pool.length < setup.n ? `<br>U odabiru je samo ${pool.length} ${plural(pool.length, 'pitanje', 'pitanja', 'pitanja')}.` : ''}</p>
    </section>
    <section class="card">
      <div class="row-between">
        <h2>Poglavlja</h2>
        <button type="button" class="link" data-act="all">${allOn ? 'Poništi sve' : 'Sva'}</button>
      </div>
      <div class="areas">${pickerHtml(ctx.course, sel, counts)}</div>
    </section>
    <section class="card">
      <h2>Povijest ispita</h2>
      ${examHistoryHtml()}
    </section>
    <div class="sticky-start">
      <p class="muted small center">Pragovi: 2 ≥ ${thr[2]} % · 3 ≥ ${thr[3]} % · 4 ≥ ${thr[4]} % · 5 ≥ ${thr[5]} % · s kolokvija u odabiru: ${realIn}</p>
      <button type="button" class="btn primary big" data-act="start" ${n ? '' : 'disabled'}>
        ${n ? `Započni ispit · ${n} ${plural(n, 'pitanje', 'pitanja', 'pitanja')} · ${setup.duration} min` : 'Nema pitanja za ovaj odabir'}</button>
    </div>`;

  el.onsubmit = null;
  el.onchange = null;
  el.onclick = (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (pickerClick(t, ctx.course, sel)) {
      setup.chapters = [...sel];
    } else if (t.dataset.dur) {
      setup.duration = Number(t.dataset.dur);
      setup.n = suggestedCount(setup.duration);
    } else if (t.dataset.step) {
      const max = Math.max(1, pool.length);
      setup.n = Math.max(1, Math.min(max, Math.min(setup.n, max) + Number(t.dataset.step)));
    } else if (t.dataset.act === 'suggest') {
      setup.n = suggestedCount(setup.duration);
    } else if (t.dataset.act === 'all') {
      setup.chapters = allOn ? [] : allChapterIds();
    } else if (t.dataset.act === 'start') {
      settings().exam = { chapters: setup.chapters };
      startExam(el, n);
      return;
    } else {
      return;
    }
    renderSetup(el);
  };
}

// ---------- sastav ispita ----------

// Proporcionalno broju pitanja po poglavlju (najveći ostatak), ≥ 30 % s kolokvija ako ih ima dovoljno.
export function compose(pool, n) {
  n = Math.min(n, pool.length);
  const groups = {};
  for (const q of shuffle(pool)) (groups[q.chapter] ||= []).push(q);
  const ids = Object.keys(groups);
  const quota = {};
  let used = 0;
  const rema = [];
  for (const c of ids) {
    const raw = (n * groups[c].length) / pool.length;
    quota[c] = Math.floor(raw);
    used += quota[c];
    rema.push({ c, r: raw - quota[c] + Math.random() * 1e-6 });
  }
  rema.sort((a, b) => b.r - a.r);
  for (let i = 0; used < n; i++, used++) quota[rema[i % rema.length].c]++;

  // Unutar poglavlja najprije pitanja s kolokvija do udjela od 30 %, zatim ostala.
  const picked = [];
  for (const c of ids) {
    const g = groups[c];
    const real = g.filter((q) => q.real_exam);
    const other = g.filter((q) => !q.real_exam);
    const wantReal = Math.min(real.length, Math.round(quota[c] * REAL_SHARE));
    const take = [...real.slice(0, wantReal), ...other, ...real.slice(wantReal)].slice(0, quota[c]);
    picked.push(...take);
  }

  // Ako ukupno još nema 30 % s kolokvija, zamijeni neka obična pitanja (najprije iz istog poglavlja).
  const target = Math.min(Math.ceil(n * REAL_SHARE), pool.filter((q) => q.real_exam).length);
  let realCount = picked.filter((q) => q.real_exam).length;
  if (realCount < target) {
    const inExam = new Set(picked);
    for (const u of shuffle(pool.filter((q) => q.real_exam && !inExam.has(q)))) {
      if (realCount >= target) break;
      let idx = picked.findIndex((p) => !p.real_exam && p.chapter === u.chapter);
      if (idx < 0) idx = picked.findIndex((p) => !p.real_exam);
      if (idx < 0) break;
      picked[idx] = u;
      realCount++;
    }
  }
  return shuffle(picked);
}

// Pitanja s nadopunjavanjem u modes uvijek kao nadopunjavanje (kao na pravom ispitu).
const examMode = (q) => (q.modes?.includes('fill') ? 'fill' : q.type);

function startExam(el, n) {
  const qs = compose(poolFor(setup.chapters), n);
  if (!qs.length) return;
  const now = Date.now();
  exam = {
    startedAt: now,
    endAt: now + setup.duration * 60000,
    duration: setup.duration,
    items: qs.map((q) => {
      const mode = examMode(q);
      return { id: q.id, mode, options: mode === 'mc' ? shuffle([q.answer, ...q.distractors]) : null, input: null, seconds: 0, shown: false };
    }),
    queue: qs.map((_, i) => i),
  };
  result = null;
  persist();
  startTimer();
  renderRun(el);
  window.scrollTo(0, 0);
}

// ---------- tijek ispita ----------

function startTimer() {
  clearInterval(timerId);
  timerId = setInterval(tick, 1000);
}

function remainingSec() {
  return Math.max(0, Math.ceil((exam.endAt - Date.now()) / 1000));
}

function tick() {
  if (!exam) { clearInterval(timerId); return; }
  const rem = remainingSec();
  const t = document.getElementById('exam-timer');
  if (t) {
    t.textContent = formatDuration(rem);
    t.classList.toggle('low', rem <= 300);
  }
  if (rem <= 0) {
    const visible = !!document.querySelector('.exam-run');
    finish();
    if (visible) renderResult(root(), true);
  }
}

// Vrijeme provedeno na trenutnom pitanju (zbraja se pri odlasku s pitanja).
function leaveCurrent() {
  const it = exam.items[exam.queue[0]];
  if (it && exam.shownAt) it.seconds += Math.min(600, Math.round((Date.now() - exam.shownAt) / 1000));
  exam.shownAt = null;
}

function answeredCount() {
  return exam.items.filter((it) => it.input !== null && it.input !== '').length;
}

function renderRun(el) {
  const total = exam.items.length;
  const done = answeredCount();
  const rem = remainingSec();
  const bar = `
    <div class="exam-bar">
      <span id="exam-timer" class="timer ${rem <= 300 ? 'low' : ''}" aria-label="Preostalo vrijeme">${formatDuration(rem)}</span>
      <span class="muted small">Odgovoreno ${done}/${total}</span>
      <button type="button" class="btn small-btn submit-btn" data-act="submit">Predaj</button>
    </div>
    <div class="progress" aria-hidden="true"><div style="width:${(done / total) * 100}%"></div></div>`;

  const confirmBox = confirming ? `
    <section class="card confirm">
      <p><strong>Predati ispit?</strong> ${total - done ? `Neodgovoreno: ${total - done} (računaju se kao netočna).` : 'Odgovorio si na sva pitanja.'}</p>
      <button type="button" class="btn primary" data-act="submit-yes">Da, predaj</button>
      <button type="button" class="btn" data-act="submit-no">Nastavi ispit</button>
      <button type="button" class="link small" data-act="abandon">Odustani od ispita (ne sprema se)</button>
    </section>` : '';

  if (!exam.queue.length) {
    el.innerHTML = `<div class="exam-run">${bar}
      <section class="card center"><p class="soon">Sva pitanja su odgovorena</p>
        <p class="muted small">Predaj ispit da vidiš rezultat.</p></section>
      ${confirmBox || '<button type="button" class="btn primary big" data-act="submit-yes">Predaj ispit</button>'}</div>`;
    bindRun(el);
    return;
  }

  const it = exam.items[exam.queue[0]];
  const q = qById.get(it.id);
  const ch = ctx.course.chapterById[q.chapter];
  it.shown = true;
  exam.shownAt ||= Date.now();
  const position = total - exam.queue.length + 1;

  let answerArea;
  if (it.mode === 'mc') {
    answerArea = `<div class="options">${it.options.map((opt, idx) => `
      <button type="button" class="opt ${exam.pick === idx ? 'selected' : ''}" data-opt="${idx}" aria-pressed="${exam.pick === idx}">
        <span class="opt-text">${esc(opt)}</span><span class="opt-icon" aria-hidden="true">${exam.pick === idx ? '●' : ''}</span></button>`).join('')}</div>
      <button type="button" class="btn primary" data-act="next" ${exam.pick === undefined || exam.pick === null ? 'disabled' : ''}>Dalje</button>`;
  } else {
    answerArea = `<form class="fill-form" data-form="fill" autocomplete="off">
        <input id="fill-input" class="fill-input" type="text" enterkeyhint="next"
          inputmode="${isNumericAnswer(q) ? 'decimal' : 'text'}" autocapitalize="off" autocorrect="off" spellcheck="false"
          placeholder="Upiši odgovor" aria-label="Odgovor">
        <button type="submit" class="btn primary">Dalje</button>
      </form>`;
  }

  el.innerHTML = `<div class="exam-run">${bar}
    ${confirmBox}
    <div class="qhead">
      <span class="qnum">${Math.min(position, total)}/${total}</span>
      <span class="chip">${esc(q.chapter)} ${esc(ch?.title || '')}</span>
    </div>
    <p class="prompt">${esc(q.prompt).replace(/_{3,}/g, '<span class="blank" aria-label="praznina">______</span>')}</p>
    ${q.image ? `<img class="qimg" src="${esc(ctx.course.base + q.image)}" alt="Slika uz pitanje">` : ''}
    ${answerArea}
    ${exam.queue.length > 1 ? '<button type="button" class="btn ghost" data-act="skip">Preskoči (vrati na kraj)</button>' : ''}
  </div>`;

  if (it.mode === 'fill' && !confirming) {
    setTimeout(() => el.querySelector('#fill-input')?.focus({ preventScroll: true }), 50);
  }
  bindRun(el);
}

function bindRun(el) {
  el.onchange = null;
  el.onsubmit = (e) => {
    e.preventDefault();
    const v = el.querySelector('#fill-input')?.value.trim();
    if (!v) return; // prazan upis: koristi "Preskoči"
    commit(el, v);
  };
  el.onclick = (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.opt !== undefined) {
      exam.pick = Number(t.dataset.opt);
      renderRun(el);
    } else if (t.dataset.act === 'next' && exam.pick !== undefined && exam.pick !== null) {
      commit(el, exam.items[exam.queue[0]].options[exam.pick]);
    } else if (t.dataset.act === 'skip') {
      leaveCurrent();
      exam.pick = null;
      exam.queue.push(exam.queue.shift());
      persist();
      renderRun(el);
      window.scrollTo(0, 0);
    } else if (t.dataset.act === 'submit') {
      confirming = true;
      renderRun(el);
      window.scrollTo(0, 0);
    } else if (t.dataset.act === 'submit-no') {
      confirming = false;
      renderRun(el);
    } else if (t.dataset.act === 'submit-yes') {
      confirming = false;
      finish();
      renderResult(el, false);
    } else if (t.dataset.act === 'abandon') {
      confirming = false;
      clearInterval(timerId);
      exam = null;
      delete courseData(ctx.courseId).activeExam;
      flush();
      renderSetup(el);
    }
  };
}

function commit(el, input) {
  leaveCurrent();
  exam.items[exam.queue.shift()].input = input;
  exam.pick = null;
  vibrate(settings().vibration, 15);
  persist();
  renderRun(el);
  window.scrollTo(0, 0);
}

// ---------- predaja i bodovanje ----------

function scoreOf(items) {
  const n = items.length;
  const points = items.reduce((s, it) => s + it.points, 0);
  const perArea = {};
  for (const it of items) {
    const area = ctx.course.chapterById[it.q.chapter]?.area || '?';
    const a = (perArea[area] ||= { n: 0, points: 0 });
    a.n++;
    a.points += it.points;
  }
  const score = n ? Math.round((points / n) * 1000) / 10 : 0;
  return { n, points, score, grade: gradeFor(score, thresholds()), perArea };
}

function finish() {
  if (!exam) return;
  if (exam.queue.length) leaveCurrent();
  clearInterval(timerId);
  const cd = courseData(ctx.courseId);
  const end = Math.min(Date.now(), exam.endAt);
  const date = new Date(end).toISOString();
  const dayKey = todayKey(new Date(end));

  const items = exam.items.map((it) => {
    const q = qById.get(it.id);
    const answered = it.input !== null && it.input !== '';
    let correct = false;
    if (answered) correct = it.mode === 'mc' ? it.input === q.answer : gradeFill(it.input, q);
    return { ...it, q, answered, correct, points: correct ? 1 : 0 };
  });

  // Statistika pitanja (bez ocjene težine) i dnevni brojač – samo odgovorena pitanja.
  let answered = 0, correctN = 0, secs = 0;
  for (const it of items) {
    if (!it.shown && !it.answered) continue;
    markSeen(cd, it.id);
    if (!it.answered) continue;
    const rec = getRecord(cd, it.id);
    it.snapshot = JSON.parse(JSON.stringify(rec));
    applyAnswer(rec, { correct: it.correct, mode: it.mode, seconds: it.seconds, date, dual: isDual(it.q) });
    answered++;
    if (it.correct) correctN++;
    secs += it.seconds;
  }
  addToDay(ctx.courseId, { answered, correct: correctN, seconds: secs }, dayKey);

  const s = scoreOf(items);
  const record = {
    date, duration: exam.duration, n: s.n, score: s.score, grade: s.grade, perArea: s.perArea,
    seconds: Math.round((end - exam.startedAt) / 1000), points: s.points,
  };
  cd.exams.push(record);
  delete cd.activeExam;
  result = { record, items, dayKey, timeUp: Date.now() >= exam.endAt };
  exam = null;
  flush();
  vibrate(settings().vibration, [80, 60, 80]);
}

// "Ipak točno" u pregledu: zapis pitanja vraća se na stanje prije ispita i primjenjuje kao točan.
function override(idx) {
  const it = result.items[idx];
  if (it.correct || it.mode !== 'fill' || !it.answered) return;
  const cd = courseData(ctx.courseId);
  cd.questions[it.id] = JSON.parse(JSON.stringify(it.snapshot));
  applyAnswer(cd.questions[it.id], { correct: true, mode: it.mode, seconds: it.seconds, date: result.record.date, dual: isDual(it.q) });
  addToDay(ctx.courseId, { correct: 1 }, result.dayKey);
  cd.overrides.push({ id: it.id, input: it.input, date: new Date().toISOString() });
  it.correct = true;
  it.overridden = true;
  it.points = 1;
  const s = scoreOf(result.items);
  Object.assign(result.record, { score: s.score, grade: s.grade, perArea: s.perArea, points: s.points });
  const stored = cd.exams.find((e) => e.date === result.record.date);
  if (stored && stored !== result.record) Object.assign(stored, result.record);
  save();
}

// ---------- rezultat ----------

function renderResult(el, timeUpNow) {
  const r = result.record;
  const thr = thresholds();
  const wrong = result.items.map((it, i) => ({ it, i })).filter(({ it }) => !it.correct);
  const ok = r.grade >= 2;

  const areaRows = ctx.course.areas.filter((a) => r.perArea[a.id]).map((a) => {
    const v = r.perArea[a.id];
    const p = v.n ? v.points / v.n : 0;
    return `<li><span>${esc(a.name)}</span><span class="nums ${p >= 0.75 ? 'good' : p >= thr[2] / 100 ? 'mid' : 'low'}">${v.points}/${v.n}</span></li>`;
  }).join('');

  const wrongRows = wrong.map(({ it, i }) => `
    <section class="card review">
      <div class="qhead"><span class="chip">${esc(it.q.chapter)} ${esc(ctx.course.chapterById[it.q.chapter]?.title || '')}</span>
        ${it.q.real_exam ? '<span class="badge">Ispitno</span>' : ''}</div>
      <p class="review-prompt">${esc(it.q.prompt)}</p>
      <p class="fb-yours bad-text">✗ ${it.answered ? `Tvoj odgovor: ${esc(it.input)}` : 'Bez odgovora'}</p>
      <p class="fb-answer ok-text">✓ Točno: <strong>${esc(it.q.answer)}</strong></p>
      ${it.mode === 'fill' && it.answered ? `<button type="button" class="btn small-btn" data-override="${i}">Ipak točno</button>` : ''}
      <p class="expl">${esc(it.q.explanation)}</p>
      <p class="src">Izvor: ${esc(it.q.source)}</p>
    </section>`).join('');

  const overridden = result.items.filter((it) => it.overridden).length;

  el.innerHTML = `
    <h1>Rezultat ispita</h1>
    ${timeUpNow || result.timeUp ? '<p class="warn-text center">⏱️ Vrijeme je isteklo – ispit je automatski predan.</p>' : ''}
    <section class="card center result ${ok ? 'pass' : 'fail'}">
      <div class="grade-big g${r.grade}">${r.grade}</div>
      <div class="grade-name">${GRADE_NAMES[r.grade]}</div>
      <div class="score">${fmtPct(r.score)}</div>
      <div class="muted">${String(r.points).replace('.', ',')}/${r.n} bodova · vrijeme ${formatDuration(r.seconds)} od ${r.duration}:00</div>
      ${overridden ? `<p class="muted small">Uključeno „Ipak točno”: ${overridden}</p>` : ''}
      <p class="muted small">Pragovi: 2 ≥ ${thr[2]} % · 3 ≥ ${thr[3]} % · 4 ≥ ${thr[4]} % · 5 ≥ ${thr[5]} %</p>
    </section>
    <section class="card">
      <h2>Po područjima</h2>
      <ul class="list">${areaRows}</ul>
    </section>
    <h2>${wrong.length ? `Netočno i neodgovoreno (${wrong.length})` : 'Sve točno! 🎉'}</h2>
    ${wrongRows}
    <button type="button" class="btn primary big" data-act="new">Novi ispit</button>
    <button type="button" class="btn" data-act="home">Početna</button>`;

  el.onsubmit = null;
  el.onchange = null;
  el.onclick = (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.override !== undefined) {
      const y = window.scrollY;
      override(Number(t.dataset.override));
      renderResult(el, false);
      window.scrollTo(0, y);
    } else if (t.dataset.act === 'new') {
      result = null;
      renderSetup(el);
      window.scrollTo(0, 0);
    } else if (t.dataset.act === 'home') {
      result = null;
      ctx.go('home');
    }
  };
  if (timeUpNow !== undefined) window.scrollTo(0, 0);
}
