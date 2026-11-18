// Streak, dnevni cilj (spec, odjeljak 9) i osnovna statistika (odjeljak 10).

import { esc, todayKey, plural } from './util.js';
import { courseData, getState, save } from './storage.js';
import { examHistoryHtml } from './exam.js';

const MIN_ANSWERS = 5; // za "najslabije/najjače"

function shiftDay(key, delta) {
  const [y, m, d] = key.split('-').map(Number);
  return todayKey(new Date(y, m - 1, d + delta));
}

// Niz uzastopnih brojanih dana koji završava danas ili jučer + najdulji niz iz povijesti.
// counted(k): broji li se dan k; keys: svi dani s odgovorima; best: zapamćeni maksimum.
function runInfo(counted, keys, best) {
  const today = todayKey();
  let day = counted(today) ? today : shiftDay(today, -1);
  let current = 0;
  while (counted(day)) {
    current++;
    day = shiftDay(day, -1);
  }
  // Najdulji niz: iz povijesti dana, uz zapamćeni maksimum (ne smanjuje se ako se promijeni cilj).
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const k of [...new Set(keys)].sort()) {
    if (!counted(k)) { run = 0; prev = k; continue; }
    run = prev && shiftDay(prev, 1) === k && run ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = k;
  }
  return { current, longest: Math.max(longest, current, best || 0), todayCounted: counted(today) };
}

// Streak kolegija = uzastopni dani u kojima je tom kolegiju odgovoreno ≥ njegov dnevni cilj.
export function streakInfo(courseId) {
  const cd = courseData(courseId);
  const goal = cd.settings.dailyGoal;
  const r = runInfo((k) => (cd.days[k]?.answered || 0) >= goal, Object.keys(cd.days), cd.bestStreak);
  if (r.longest !== cd.bestStreak) { cd.bestStreak = r.longest; save(); }
  return { ...r, todayAnswered: cd.days[todayKey()]?.answered || 0, goal };
}

// Zajednički streak (Početna): dan se broji ako je bilo kojem kolegiju ispunjen njegov dnevni cilj.
export function globalStreakInfo(courseIds) {
  const cds = courseIds.map((id) => courseData(id));
  const counted = (k) => cds.some((cd) => (cd.days[k]?.answered || 0) >= cd.settings.dailyGoal);
  const state = getState();
  const r = runInfo(counted, cds.flatMap((cd) => Object.keys(cd.days)), state.bestStreak);
  if (r.longest !== state.bestStreak) { state.bestStreak = r.longest; save(); }
  return r;
}

// "Naučeno": razina 1 i cstreak ≥ 2, ili za pitanja samo-mc cstreak ≥ 3.
export function isLearned(q, rec) {
  if (!rec) return false;
  const dual = q.modes?.includes('mc') && q.modes?.includes('fill');
  return dual ? rec.level === 1 && rec.cstreak >= 2 : rec.cstreak >= 3;
}

function aggregate(questions, cd, keyOf) {
  const groups = {};
  for (const q of questions) {
    const g = (groups[keyOf(q)] ||= { total: 0, seen: 0, answered: 0, correct: 0, learned: 0 });
    const rec = cd.questions[q.id];
    g.total++;
    if (rec?.answered) g.seen++;
    g.answered += rec?.answered || 0;
    g.correct += rec?.correct || 0;
    if (isLearned(q, rec)) g.learned++;
  }
  for (const g of Object.values(groups)) {
    g.accuracy = g.answered ? g.correct / g.answered : null;
    g.coverage = g.total ? g.seen / g.total : 0;
    g.learnedPct = g.total ? g.learned / g.total : 0;
  }
  return groups;
}

export function computeStats(ctx) {
  const cd = courseData(ctx.courseId);
  const qs = ctx.questions;
  const byChapter = aggregate(qs, cd, (q) => q.chapter);
  const byArea = aggregate(qs, cd, (q) => ctx.course.chapterById[q.chapter]?.area);
  const total = aggregate(qs, cd, () => 'all').all || { total: 0, seen: 0, answered: 0, correct: 0, learned: 0, accuracy: null, coverage: 0 };
  const rank = (groups, nameOf) => {
    const list = Object.entries(groups)
      .filter(([, g]) => g.answered >= MIN_ANSWERS)
      .map(([id, g]) => ({ id, name: nameOf(id), ...g }))
      .sort((a, b) => a.accuracy - b.accuracy);
    return { weakest: list[0] || null, strongest: list.length > 1 ? list[list.length - 1] : null };
  };
  return {
    total, byChapter, byArea,
    areas: rank(byArea, (id) => ctx.course.areaById[id]?.name || id),
    chapters: rank(byChapter, (id) => `${id} ${ctx.course.chapterById[id]?.title || ''}`),
  };
}

const pct = (x) => (x === null || x === undefined ? '–' : `${Math.round(x * 100)} %`);

function bar(value, cls = '') {
  const w = Math.round((value || 0) * 100);
  return `<div class="mini-bar ${cls}" aria-hidden="true"><div style="width:${w}%"></div></div>`;
}

function accClass(acc) {
  if (acc === null) return '';
  return acc >= 0.75 ? 'good' : acc >= 0.6 ? 'mid' : 'low';
}

export function renderStats(root, ctx) {
  const s = computeStats(ctx);
  const cd = courseData(ctx.courseId);
  const lists = questionLists(ctx, cd);
  const st = streakInfo(ctx.courseId);
  const highlight = (label, item, icon) => item
    ? `<div class="hl"><span class="hl-label">${icon} ${label}</span><span class="hl-name">${esc(item.name)}</span>
        <span class="hl-val ${accClass(item.accuracy)}">${pct(item.accuracy)}</span></div>`
    : '';
  const hasRank = s.areas.weakest || s.chapters.weakest;

  const areaRows = ctx.course.areas.map((a) => {
    const g = s.byArea[a.id];
    const chRows = a.chapters.map((cid) => {
      const c = s.byChapter[cid];
      const title = ctx.course.chapterById[cid]?.title || '';
      if (!c) return `<li class="ch-row empty"><span>${cid} ${esc(title)}</span><span class="muted small">nema pitanja</span></li>`;
      return `<li class="ch-row"><span>${cid} ${esc(title)}</span>
        <span class="nums"><span class="${accClass(c.accuracy)}">${pct(c.accuracy)}</span> · ${c.seen}/${c.total}</span></li>`;
    }).join('');
    if (!g) {
      return `<details class="area-stat"><summary><span class="area-name">${esc(a.name)}</span>
        <span class="muted small">nema pitanja</span></summary><ul class="list">${chRows}</ul></details>`;
    }
    return `<details class="area-stat"><summary>
        <span class="area-name">${esc(a.name)}</span>
        <span class="nums"><span class="${accClass(g.accuracy)}">${pct(g.accuracy)}</span></span>
        <span class="bars">${bar(g.coverage)}<span class="muted small">viđeno ${g.seen}/${g.total} · naučeno ${g.learned}</span></span>
      </summary><ul class="list">${chRows}</ul></details>`;
  }).join('');

  root.innerHTML = `
    <h1>Statistika</h1>
    <section class="card stat-grid">
      <div><div class="big-num">${pct(s.total.accuracy)}</div><div class="muted small">točnost</div></div>
      <div><div class="big-num">${s.total.seen}/${s.total.total}</div><div class="muted small">viđeno pitanja</div></div>
      <div><div class="big-num">${s.total.learned}</div><div class="muted small">naučeno</div></div>
      <div><div class="big-num">🔥 ${st.current}</div><div class="muted small">streak (najdulji ${st.longest})</div></div>
    </section>
    <section class="card">
      <h2>Najslabije i najjače</h2>
      ${hasRank ? `
        ${highlight('Najslabije područje', s.areas.weakest, '⚠️')}
        ${highlight('Najjače područje', s.areas.strongest, '💪')}
        ${highlight('Najslabije poglavlje', s.chapters.weakest, '⚠️')}
        ${highlight('Najjače poglavlje', s.chapters.strongest, '💪')}`
      : `<p class="muted small">Pojavit će se kad područje ili poglavlje ima barem ${MIN_ANSWERS} odgovora.</p>`}
    </section>
    <section class="card">
      <h2>Po područjima</h2>
      <p class="muted small">Točnost = točni / odgovoreni. Dodirni područje za poglavlja (točnost · viđeno/ukupno).</p>
      ${areaRows}
    </section>
    <section class="card">
      <h2>Trend točnosti · 14 dana</h2>
      ${trendHtml(cd)}
    </section>
    <section class="card">
      <h2>Aktivnost · 8 tjedana</h2>
      ${heatmapHtml(cd)}
    </section>
    <section class="card">
      <h2>Ispiti i procjena ocjene</h2>
      ${examHistoryHtml()}
    </section>
    ${questionListHtml('Najteža pitanja', 'Teško ocijenjena i često promašena.', lists.hardest, (x) => `${x.rec.ratings?.tesko || 0}× teško · ${x.wrong}× netočno`)}
    ${questionListHtml('Opasna pitanja', 'Ocijenio si ih „lako”, a zadnji odgovor je bio netočan.', lists.dangerous, (x) => `${x.wrong}× netočno`)}
    ${questionListHtml('Najlakša pitanja', 'Lako ocijenjena i točna zaredom.', lists.easiest, (x) => `${x.rec.ratings?.lako || 0}× lako · ${x.rec.cstreak} zaredom`)}
    <section class="card">
      <h2>Zanimljivo</h2>
      ${funHtml(cd, st, ctx)}
    </section>`;

  // Dodir na stupac/dan prikaže vrijednost ispod grafa.
  root.onclick = (e) => {
    const el = e.target.closest('[data-tip]');
    const out = el && root.querySelector(`#${el.dataset.out}`);
    if (!out) return;
    root.querySelectorAll('.tip.sel').forEach((b) => b.classList.remove('sel'));
    el.classList.add('sel');
    out.textContent = el.dataset.tip;
  };
}

// ---------- puna statistika (spec, odjeljak 10) ----------

function dayLabel(key) {
  const [, m, d] = key.split('-').map(Number);
  return `${d}.${m}.`;
}

function roundedTop(x, yTop, w, h) {
  const r = Math.min(4, w / 2, h);
  const yb = yTop + h;
  return `M${x},${yb} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + w - r} Q${x + w},${yTop} ${x + w},${yTop + r} V${yb} Z`;
}

// Stupci = točnost po danu (zadnjih 14 dana). Dani bez odgovora: točka na osi.
function trendHtml(cd) {
  const today = todayKey();
  const data = Array.from({ length: 14 }, (_, i) => {
    const k = shiftDay(today, i - 13);
    const d = cd.days[k];
    return { k, n: d?.answered || 0, ok: d?.correct || 0, acc: d?.answered ? d.correct / d.answered : null };
  });
  if (!data.some((d) => d.n)) return '<p class="muted small">Još nema odgovora u zadnjih 14 dana.</p>';
  const W = 340, H = 150, L = 34, B = 22, T = 8;
  const plotW = W - L - 4, plotH = H - B - T;
  const step = plotW / 14;
  const bw = Math.max(6, step - 6);
  const y = (v) => T + plotH * (1 - v);
  const grid = [0, 0.5, 1].map((v) => `<line x1="${L}" x2="${W - 4}" y1="${y(v)}" y2="${y(v)}" class="grid"/>
    <text x="${L - 6}" y="${y(v) + 4}" class="axis" text-anchor="end">${v * 100} %</text>`).join('');
  const bars = data.map((d, i) => {
    const x = L + i * step + (step - bw) / 2;
    const tip = d.n ? `${dayLabel(d.k)}: ${Math.round(d.acc * 100)} % točno (${d.ok}/${d.n})` : `${dayLabel(d.k)}: bez odgovora`;
    const label = (i % 2 === 1) ? `<text x="${x + bw / 2}" y="${H - 6}" class="axis" text-anchor="middle">${i === 13 ? 'danas' : dayLabel(d.k)}</text>` : '';
    const mark = d.n
      ? `<path d="${roundedTop(x, y(d.acc), bw, Math.max(2, y(0) - y(d.acc)))}" class="bar ${d.acc >= 0.75 ? 'hi' : d.acc >= 0.6 ? 'mid' : 'lo'}"/>`
      : `<circle cx="${x + bw / 2}" cy="${y(0) - 2}" r="2" class="empty-dot"/>`;
    return `<g class="tip" data-tip="${esc(tip)}" data-out="trend-out" tabindex="0" role="img" aria-label="${esc(tip)}">
      <rect x="${L + i * step}" y="${T}" width="${step}" height="${plotH}" class="hit"/>${mark}<title>${esc(tip)}</title></g>${label}`;
  }).join('');
  const rows = data.filter((d) => d.n).map((d) => `<tr><td>${dayLabel(d.k)}</td><td>${d.ok}/${d.n}</td><td>${Math.round(d.acc * 100)} %</td></tr>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="group" aria-label="Točnost po danu, zadnjih 14 dana">${grid}${bars}</svg>
    <p class="chart-out muted small" id="trend-out" aria-live="polite">Dodirni stupac za detalje.</p>
    <p class="legend small"><span class="lg bar hi"></span>≥ 75 % <span class="lg bar mid"></span>60–74 % <span class="lg bar lo"></span>&lt; 60 %</p>
    <details class="table-view"><summary class="small">Tablica</summary>
      <table class="small"><tr><th>Dan</th><th>Točno</th><th>%</th></tr>${rows}</table></details>`;
}

const MONTHS = ['sij', 'velj', 'ožu', 'tra', 'svi', 'lip', 'srp', 'kol', 'ruj', 'lis', 'stu', 'pro'];

// Kalendar: stupci = tjedni (pon–ned), 8 tjedana; boja = broj odgovora tog dana prema dnevnom cilju.
function heatmapHtml(cd) {
  const today = todayKey();
  const [ty, tm, td] = today.split('-').map(Number);
  const dow = (new Date(ty, tm - 1, td).getDay() + 6) % 7; // 0 = ponedjeljak
  const start = shiftDay(today, -dow - 7 * 7);
  const goal = cd.settings.dailyGoal;
  const level = (n) => (n === 0 ? 0 : n < goal / 2 ? 1 : n < goal ? 2 : n < goal * 2 ? 3 : 4);
  const C = 15, G = 3, L = 22, T = 16;
  let cells = '';
  let total = 0;
  const months = [];
  for (let w = 0; w < 8; w++) {
    const wk = shiftDay(start, w * 7);
    const m = Number(wk.split('-')[1]);
    if (w === 0 || Number(shiftDay(start, (w - 1) * 7).split('-')[1]) !== m) {
      months.push(`<text x="${L + w * (C + G)}" y="11" class="axis">${MONTHS[m - 1]}</text>`);
    }
    for (let d = 0; d < 7; d++) {
      const k = shiftDay(start, w * 7 + d);
      if (k > today) continue;
      const n = cd.days[k]?.answered || 0;
      total += n;
      const tip = `${dayLabel(k)}: ${n} ${plural(n, 'pitanje', 'pitanja', 'pitanja')}`;
      cells += `<rect x="${L + w * (C + G)}" y="${T + d * (C + G)}" width="${C}" height="${C}" rx="3" class="tip hm l${level(n)} ${k === today ? 'today' : ''}" data-tip="${esc(tip)}" data-out="hm-out" tabindex="0" role="img" aria-label="${esc(tip)}"><title>${esc(tip)}</title></rect>`;
    }
  }
  const W = L + 8 * (C + G), H = T + 7 * (C + G);
  const dayNames = ['Po', '', 'Sr', '', 'Pe', '', 'Ne'].map((t, d) => (t ? `<text x="0" y="${T + d * (C + G) + 11}" class="axis">${t}</text>` : '')).join('');
  return `<svg class="chart heatmap" viewBox="0 0 ${W} ${H}" role="group" aria-label="Broj pitanja po danu, zadnjih 8 tjedana">${dayNames}${months.join('')}${cells}</svg>
    <p class="chart-out muted small" id="hm-out" aria-live="polite">Ukupno ${total} u 8 tjedana. Dodirni dan za detalje.</p>
    <p class="legend small">Manje <span class="lg hm l0"></span><span class="lg hm l1"></span><span class="lg hm l2"></span><span class="lg hm l3"></span><span class="lg hm l4"></span> Više · treća nijansa = dnevni cilj (${goal})</p>`;
}

function questionLists(ctx, cd) {
  const items = ctx.questions.map((q) => {
    const rec = cd.questions[q.id];
    return rec?.answered ? { q, rec, wrong: rec.answered - rec.correct } : null;
  }).filter(Boolean);
  const top = (arr, score) => arr.map((x) => ({ ...x, s: score(x) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 10);
  return {
    hardest: top(items, (x) => 2 * (x.rec.ratings?.tesko || 0) + x.wrong),
    easiest: top(items, (x) => (x.rec.ratings?.lako || 0) + x.rec.cstreak),
    dangerous: top(items.filter((x) => (x.rec.ratings?.lako || 0) > 0 && x.rec.lastResult === false), (x) => x.wrong || 1),
  };
}

function questionListHtml(title, hint, list, meta) {
  const body = list.length
    ? `<ol class="qlist">${list.map((x) => `<li><span class="ql-prompt">${esc(x.q.prompt)}</span>
        <span class="muted small">→ ${esc(x.q.answer)} · pogl. ${esc(x.q.chapter)} · ${meta(x)}</span></li>`).join('')}</ol>`
    : '<p class="muted small">Još nema takvih pitanja.</p>';
  return `<details class="card qcard"><summary><h2>${title} <span class="cnt">${list.length}</span></h2></summary><p class="muted small">${hint}</p>${body}</details>`;
}

function funHtml(cd, st, ctx) {
  const days = Object.entries(cd.days);
  const answered = days.reduce((s, [, d]) => s + (d.answered || 0), 0);
  const seconds = days.reduce((s, [, d]) => s + (d.seconds || 0), 0);
  const best = days.reduce((b, [k, d]) => (!b || d.answered > b[1].answered ? [k, d] : b), null);
  const missed = ctx.questions
    .filter((q) => q.tags?.some((t) => t === 'brojka' || t === 'formula'))
    .map((q) => ({ q, rec: cd.questions[q.id] }))
    .filter((x) => x.rec && x.rec.answered > x.rec.correct)
    .sort((a, b) => (b.rec.answered - b.rec.correct) - (a.rec.answered - a.rec.correct))[0];
  const h = Math.floor(seconds / 3600);
  const time = h ? `${h} h ${Math.round((seconds % 3600) / 60)} min` : `${Math.round(seconds / 60)} min`;
  const row = (label, value) => `<li><span>${label}</span><strong class="nums">${value}</strong></li>`;
  return `<ul class="list">
    ${row('Ukupno odgovora', answered)}
    ${row('Ukupno vrijeme', time)}
    ${row('Prosječno po pitanju', answered ? `${Math.round(seconds / answered)} s` : '–')}
    ${row('Najdulji streak', `${st.longest} ${plural(st.longest, 'dan', 'dana', 'dana')}`)}
    ${row('Najbolji dan', best && best[1].answered ? `${dayLabel(best[0])} · ${best[1].answered}` : '–')}
    ${row('Ispita riješeno', cd.exams.length)}
  </ul>
  ${missed ? `<p class="small"><span class="muted">Najčešće promašena brojka/formula (${missed.rec.answered - missed.rec.correct}×):</span><br>
    ${esc(missed.q.prompt)} → <strong>${esc(missed.q.answer)}</strong></p>` : ''}`;
}

