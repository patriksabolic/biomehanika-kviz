// Streak, dnevni cilj (spec, odjeljak 9) i osnovna statistika (odjeljak 10).

import { esc, todayKey } from './util.js';
import { courseData, settings, save } from './storage.js';

const MIN_ANSWERS = 5; // za "najslabije/najjače"

function shiftDay(key, delta) {
  const [y, m, d] = key.split('-').map(Number);
  return todayKey(new Date(y, m - 1, d + delta));
}

// Streak = uzastopni brojani dani (≥ dailyGoal odgovora) koji završavaju danas ili jučer.
export function streakInfo(courseId) {
  const cd = courseData(courseId);
  const goal = settings().dailyGoal;
  const counted = (k) => (cd.days[k]?.answered || 0) >= goal;
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
  for (const k of Object.keys(cd.days).sort()) {
    if (!counted(k)) { run = 0; prev = k; continue; }
    run = prev && shiftDay(prev, 1) === k && run ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = k;
  }
  longest = Math.max(longest, current, cd.bestStreak || 0);
  if (longest !== cd.bestStreak) { cd.bestStreak = longest; save(); }
  return { current, longest, todayAnswered: cd.days[today]?.answered || 0, goal, todayCounted: counted(today) };
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
    <p class="muted small center">Trend, kalendar aktivnosti, najteža pitanja i ispiti dolaze u fazi M4.</p>`;
}
