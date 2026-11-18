// Ekran Kviz: odabir, pitanje, povratna informacija, sažetak (spec, odjeljak 6).

import { esc, shuffle, formatDuration, vibrate, plural } from './util.js';
import { courseData, settings, save, addToDay } from './storage.js';
import { gradeFill, isNumericAnswer } from './grading.js';
import {
  chooseMode, pickQuestions, applyAnswer, applyRating, markSeen, getRecord, isHardOrDangerous,
} from './scheduler.js';

let ctx = null;      // { courseId, course, questions, go }
let session = null;  // aktivna sesija
let setup = null;    // trenutni odabir na ekranu postavljanja

export function initQuiz(c) {
  ctx = c;
}

const SUPPORTED = new Set(['mc', 'fill']);
const usable = () => ctx.questions.filter((q) => SUPPORTED.has(q.type));
const allChapterIds = () => ctx.course.chapters.map((c) => c.id);

function defaultSetup() {
  const saved = settings().quiz;
  const valid = new Set(allChapterIds());
  const chapters = saved?.chapters?.filter((c) => valid.has(c));
  return {
    chapters: chapters && chapters.length ? chapters : allChapterIds(),
    realOnly: !!saved?.realOnly,
    numbersOnly: !!saved?.numbersOnly,
    hardOnly: !!saved?.hardOnly,
    size: [5, 10, 20].includes(saved?.size) ? saved.size : 10,
  };
}

function filterPool(o) {
  const cd = courseData(ctx.courseId);
  const chapters = new Set(o.chapters);
  return usable().filter((q) =>
    chapters.has(q.chapter) &&
    (!o.realOnly || q.real_exam) &&
    (!o.numbersOnly || q.tags?.some((t) => t === 'brojka' || t === 'formula')) &&
    (!o.hardOnly || isHardOrDangerous(cd.questions[q.id]))
  );
}

// ---------- ulaz s drugih ekrana ----------

export function showQuiz(root, preset) {
  if (preset) {
    const o = { ...defaultSetup(), chapters: allChapterIds(), realOnly: false, numbersOnly: false, hardOnly: false, ...preset };
    if (startSession(o)) return renderQuestion(root);
    setup = o;
  }
  if (session && !session.finished) return renderQuestion(root);
  renderSetup(root);
}

// ---------- postavljanje ----------

function renderSetup(root) {
  setup ||= defaultSetup();
  const sel = new Set(setup.chapters);
  const counts = {};
  for (const q of usable()) counts[q.chapter] = (counts[q.chapter] || 0) + 1;
  const poolSize = filterPool(setup).length;
  const allOn = allChapterIds().every((c) => sel.has(c));

  const areas = ctx.course.areas.map((a) => {
    const on = a.chapters.filter((c) => sel.has(c)).length;
    const state = on === a.chapters.length ? 'on' : on ? 'part' : '';
    const n = a.chapters.reduce((s, c) => s + (counts[c] || 0), 0);
    const chips = a.chapters.map((cid) => {
      const ch = ctx.course.chapterById[cid];
      const cnt = counts[cid] || 0;
      return `<button type="button" class="chip-btn ${sel.has(cid) ? 'on' : ''} ${cnt ? '' : 'empty'}" data-ch="${cid}" aria-pressed="${sel.has(cid)}">
        ${esc(cid)} ${esc(ch.title)} <span class="cnt">${cnt}</span></button>`;
    }).join('');
    return `<div class="area">
      <button type="button" class="area-btn ${state}" data-area="${a.id}" aria-pressed="${state === 'on'}">
        <span class="check" aria-hidden="true">${state === 'on' ? '✓' : state === 'part' ? '–' : ''}</span>
        <span class="area-name">${esc(a.name)}</span><span class="cnt">${n}</span>
      </button>
      <div class="chips">${chips}</div>
    </div>`;
  }).join('');

  const toggle = (key, label) => `<label class="toggle">
      <input type="checkbox" data-filter="${key}" ${setup[key] ? 'checked' : ''}><span>${label}</span></label>`;
  const sizes = [5, 10, 20].map((n) =>
    `<button type="button" class="seg ${setup.size === n ? 'on' : ''}" data-size="${n}" aria-pressed="${setup.size === n}">${n}</button>`
  ).join('');
  const toStart = Math.min(setup.size, poolSize);

  root.innerHTML = `
    <h1>Kviz</h1>
    <section class="card">
      <div class="row-between">
        <h2>Područja i poglavlja</h2>
        <button type="button" class="link" data-act="all">${allOn ? 'Poništi sve' : 'Sva'}</button>
      </div>
      <p class="muted small">Dodirni područje za sva njegova poglavlja ili pojedino poglavlje. Broj = pitanja.</p>
      <div class="areas">${areas}</div>
    </section>
    <section class="card">
      <h2>Filtri</h2>
      ${toggle('realOnly', 'Samo ispitna pitanja')}
      ${toggle('numbersOnly', 'Samo brojke i formule')}
      ${toggle('hardOnly', 'Samo teška i opasna')}
    </section>
    <section class="card">
      <h2>Broj pitanja</h2>
      <div class="segmented">${sizes}</div>
    </section>
    <div class="sticky-start">
      <p class="muted small center">U odabiru: ${poolSize} ${plural(poolSize, 'pitanje', 'pitanja', 'pitanja')}</p>
      <button type="button" class="btn primary big" data-act="start" ${poolSize ? '' : 'disabled'}>
        ${poolSize ? `Kreni · ${toStart} ${plural(toStart, 'pitanje', 'pitanja', 'pitanja')}` : 'Nema pitanja za ovaj odabir'}
      </button>
    </div>`;

  root.onclick = (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.ch) {
      sel.has(t.dataset.ch) ? sel.delete(t.dataset.ch) : sel.add(t.dataset.ch);
    } else if (t.dataset.area) {
      const chs = ctx.course.areaById[t.dataset.area].chapters;
      const allSel = chs.every((c) => sel.has(c));
      chs.forEach((c) => (allSel ? sel.delete(c) : sel.add(c)));
    } else if (t.dataset.size) {
      setup.size = Number(t.dataset.size);
    } else if (t.dataset.act === 'all') {
      if (allOn) sel.clear(); else allChapterIds().forEach((c) => sel.add(c));
    } else if (t.dataset.act === 'start') {
      settings().quiz = { ...setup };
      save();
      if (startSession({ ...setup })) renderQuestion(root);
      return;
    } else {
      return;
    }
    setup.chapters = [...sel];
    renderSetup(root);
  };
  root.onchange = (e) => {
    const f = e.target.dataset?.filter;
    if (!f) return;
    setup[f] = e.target.checked;
    renderSetup(root);
  };
}

// ---------- sesija ----------

function startSession(opts) {
  const cd = courseData(ctx.courseId);
  const picked = pickQuestions(filterPool(opts), opts.size, cd);
  if (!picked.length) return false;
  session = { opts, items: picked.map((q) => ({ q })), i: 0, finished: false };
  prepareItem();
  return true;
}

function prepareItem() {
  const cd = courseData(ctx.courseId);
  const item = session.items[session.i];
  const q = item.q;
  item.mode = chooseMode(q, cd.questions[q.id], settings().displayMode);
  item.options = item.mode === 'mc' ? shuffle([q.answer, ...q.distractors]) : null;
  item.start = Date.now();
  markSeen(cd, q.id);
  save();
}

function promptHtml(text) {
  return esc(text).replace(/_{3,}/g, '<span class="blank" aria-label="praznina">______</span>');
}

function imgHtml(path, alt) {
  return path ? `<img class="qimg" src="${esc(ctx.course.base + path)}" alt="${esc(alt)}" loading="lazy">` : '';
}

function renderQuestion(root) {
  const item = session.items[session.i];
  const q = item.q;
  const n = session.items.length;
  const ch = ctx.course.chapterById[q.chapter];
  const done = !!item.answered;

  let answerArea = '';
  if (item.mode === 'mc') {
    answerArea = `<div class="options">${item.options.map((opt, idx) => {
      let cls = '';
      let icon = '';
      if (done) {
        if (opt === q.answer) { cls = 'correct'; icon = '✓'; }
        else if (opt === item.input) { cls = 'wrong'; icon = '✗'; }
        else cls = 'dim';
      }
      return `<button type="button" class="opt ${cls}" data-opt="${idx}" ${done ? 'disabled' : ''}>
        <span class="opt-text">${esc(opt)}</span><span class="opt-icon" aria-hidden="true">${icon}</span></button>`;
    }).join('')}</div>`;
  } else {
    const numeric = isNumericAnswer(q);
    const cls = done ? (item.correct ? 'correct' : 'wrong') : '';
    answerArea = `<form class="fill-form" data-form="fill" autocomplete="off">
        <input id="fill-input" class="fill-input ${cls}" type="text" enterkeyhint="done"
          inputmode="${numeric ? 'decimal' : 'text'}" autocapitalize="off" autocorrect="off" spellcheck="false"
          placeholder="Upiši odgovor" aria-label="Odgovor" value="${esc(item.input || '')}" ${done ? 'disabled' : ''}>
        ${done ? '' : '<button type="submit" class="btn primary">Potvrdi</button>'}
      </form>`;
  }

  root.innerHTML = `
    <div class="qhead">
      <span class="qnum">${session.i + 1}/${n}</span>
      <span class="chip">${esc(q.chapter)} ${esc(ch?.title || '')}</span>
      ${q.real_exam ? '<span class="badge">Ispitno</span>' : ''}
      <button type="button" class="link end" data-act="end">Završi</button>
    </div>
    <div class="progress" aria-hidden="true"><div style="width:${(session.i / n) * 100}%"></div></div>
    <p class="prompt">${promptHtml(q.prompt)}</p>
    ${imgHtml(q.image, 'Slika uz pitanje')}
    ${item.mode === 'mc' && !done ? '<p class="muted small">Odaberi jedan odgovor.</p>' : ''}
    ${answerArea}
    ${done ? '' : '<button type="button" class="btn ghost" data-act="dontknow">Ne znam</button>'}
    ${done ? feedbackHtml(item) : ''}`;

  if (!done && item.mode === 'fill') {
    const input = root.querySelector('#fill-input');
    // Fokus bez skrolanja stranice; na mobitelu otvara tipkovnicu.
    setTimeout(() => input?.focus({ preventScroll: true }), 50);
  }
  if (done && item.scrollToFeedback) {
    item.scrollToFeedback = false;
    root.querySelector('.feedback')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  root.onsubmit = (e) => {
    e.preventDefault();
    if (item.answered) return;
    const value = root.querySelector('#fill-input').value;
    if (!value.trim()) return;
    answer(root, value.trim(), gradeFill(value, q));
  };
  root.onchange = null;
  root.onclick = (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.opt !== undefined && !item.answered) {
      const opt = item.options[Number(t.dataset.opt)];
      answer(root, opt, opt === q.answer);
    } else if (t.dataset.act === 'dontknow') {
      answer(root, '', false, true);
    } else if (t.dataset.act === 'override') {
      override(root);
    } else if (t.dataset.act === 'report') {
      item.reportOpen = !item.reportOpen;
      renderQuestion(root);
      root.querySelector('#report-text')?.focus();
    } else if (t.dataset.act === 'report-send') {
      sendReport(root);
    } else if (t.dataset.rate) {
      rate(root, t.dataset.rate);
    } else if (t.dataset.act === 'end') {
      endEarly(root);
    }
  };
}

function feedbackHtml(item) {
  const q = item.q;
  const ok = item.correct;
  const canOverride = !ok && item.mode === 'fill' && item.input && !item.dontKnow;
  const report = item.reported
    ? '<p class="ok-text small">Hvala, prijava je spremljena.</p>'
    : item.reportOpen
      ? `<div class="report-box">
          <label for="report-text" class="small">Što nije u redu s ovim pitanjem?</label>
          <textarea id="report-text" rows="3" placeholder="npr. krivi broj, nejasno pitanje, treba prihvatiti …"></textarea>
          <button type="button" class="btn small-btn" data-act="report-send">Spremi prijavu</button>
        </div>`
      : '';
  return `
    <section class="feedback ${ok ? 'ok' : 'bad'}" aria-live="polite">
      <div class="fb-title">${ok ? '✓ Točno' : item.dontKnow ? '✗ Ne znam' : '✗ Netočno'}${item.overridden ? ' <span class="small">(ipak točno)</span>' : ''}</div>
      <div class="fb-answer">Točan odgovor: <strong>${esc(q.answer)}</strong></div>
      ${!ok && item.input ? `<div class="fb-yours">Tvoj odgovor: ${esc(item.input)}</div>` : ''}
      ${canOverride ? '<button type="button" class="btn small-btn" data-act="override">Ipak točno</button>' : ''}
      <p class="expl">${esc(q.explanation)}</p>
      ${imgHtml(q.explanation_image, 'Slika uz objašnjenje')}
      <p class="src">Izvor: ${esc(q.source)}</p>
      <button type="button" class="link small" data-act="report">Prijavi grešku</button>
      ${report}
    </section>
    <p class="rate-label">Kako ti je bilo?</p>
    <div class="rate">
      <button type="button" class="btn rate-easy" data-rate="lako">Lako</button>
      <button type="button" class="btn rate-mid" data-rate="srednje">Srednje</button>
      <button type="button" class="btn rate-hard" data-rate="tesko">Teško</button>
    </div>`;
}

function answer(root, input, correct, dontKnow = false) {
  const cd = courseData(ctx.courseId);
  const item = session.items[session.i];
  const rec = getRecord(cd, item.q.id);
  item.snapshot = JSON.parse(JSON.stringify(rec));
  item.seconds = Math.min(600, Math.round((Date.now() - item.start) / 1000));
  item.date = new Date().toISOString();
  item.answered = true;
  item.correct = correct;
  item.input = input;
  item.dontKnow = dontKnow;
  item.scrollToFeedback = true;
  applyAnswer(rec, { correct, mode: item.mode, seconds: item.seconds, date: item.date });
  addToDay(ctx.courseId, { answered: 1, correct: correct ? 1 : 0, seconds: item.seconds });
  vibrate(settings().vibration, correct ? 30 : [60, 60, 60]);
  save();
  renderQuestion(root);
}

// "Ipak točno": vrati zapis na stanje prije odgovora pa ga ponovno primijeni kao točan.
function override(root) {
  const cd = courseData(ctx.courseId);
  const item = session.items[session.i];
  cd.questions[item.q.id] = JSON.parse(JSON.stringify(item.snapshot));
  applyAnswer(cd.questions[item.q.id], { correct: true, mode: item.mode, seconds: item.seconds, date: item.date });
  addToDay(ctx.courseId, { correct: 1 });
  cd.overrides.push({ id: item.q.id, input: item.input, date: item.date });
  item.correct = true;
  item.overridden = true;
  save();
  renderQuestion(root);
}

function sendReport(root) {
  const item = session.items[session.i];
  const text = root.querySelector('#report-text')?.value.trim();
  if (!text) return;
  courseData(ctx.courseId).reports.push({
    id: item.q.id, text, input: item.input || '', date: new Date().toISOString(),
  });
  item.reported = true;
  item.reportOpen = false;
  save();
  renderQuestion(root);
}

function rate(root, rating) {
  const cd = courseData(ctx.courseId);
  applyRating(getRecord(cd, session.items[session.i].q.id), rating);
  save();
  next(root);
}

function next(root) {
  session.i++;
  if (session.i >= session.items.length) {
    session.finished = true;
    renderSummary(root);
  } else {
    prepareItem();
    renderQuestion(root);
    window.scrollTo(0, 0);
  }
}

function endEarly(root) {
  const answered = session.items.filter((it) => it.answered);
  if (!answered.length) {
    session = null;
    renderSetup(root);
    return;
  }
  session.items = answered;
  session.finished = true;
  renderSummary(root);
}

// ---------- sažetak ----------

function renderSummary(root) {
  const items = session.items.filter((it) => it.answered);
  const correct = items.filter((it) => it.correct).length;
  const seconds = items.reduce((s, it) => s + (it.seconds || 0), 0);
  const pct = items.length ? Math.round((correct / items.length) * 100) : 0;
  const byCh = {};
  for (const it of items) {
    const c = (byCh[it.q.chapter] ||= { n: 0, ok: 0 });
    c.n++;
    if (it.correct) c.ok++;
  }
  const rows = Object.keys(byCh).sort().map((cid) => {
    const c = byCh[cid];
    const ch = ctx.course.chapterById[cid];
    return `<li><span>${esc(cid)} ${esc(ch?.title || '')}</span><span class="${c.ok === c.n ? 'ok-text' : ''}">${c.ok}/${c.n}</span></li>`;
  }).join('');
  const size = session.opts.size;

  root.innerHTML = `
    <h1>Kraj sesije</h1>
    <section class="card center">
      <div class="score">${correct}/${items.length}</div>
      <div class="muted">${pct} % točno · vrijeme ${formatDuration(seconds)}</div>
    </section>
    <section class="card">
      <h2>Po poglavljima</h2>
      <ul class="list">${rows}</ul>
    </section>
    <button type="button" class="btn primary big" data-act="again">Još ${size}</button>
    <button type="button" class="btn" data-act="back">Natrag</button>`;

  root.onsubmit = null;
  root.onchange = null;
  root.onclick = (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.act === 'again') {
      const opts = session.opts;
      if (startSession(opts)) { renderQuestion(root); window.scrollTo(0, 0); }
      else { session = null; renderSetup(root); }
    } else if (t.dataset.act === 'back') {
      session = null;
      ctx.go('home');
    }
  };
}
