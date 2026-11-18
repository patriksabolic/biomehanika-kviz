// Odabir područja i poglavlja – zajednički za Kviz i Ispit.

import { esc } from './util.js';

// sel: Set id-ova poglavlja; counts: { chapterId: broj pitanja }
export function pickerHtml(course, sel, counts) {
  return course.areas.map((a) => {
    const on = a.chapters.filter((c) => sel.has(c)).length;
    const state = on === a.chapters.length ? 'on' : on ? 'part' : '';
    const n = a.chapters.reduce((s, c) => s + (counts[c] || 0), 0);
    const chips = a.chapters.map((cid) => {
      const ch = course.chapterById[cid];
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
}

// Obradi klik na poglavlje/područje. Vraća true ako je klik pripadao odabiru.
export function pickerClick(t, course, sel) {
  if (t.dataset.ch) {
    if (sel.has(t.dataset.ch)) sel.delete(t.dataset.ch); else sel.add(t.dataset.ch);
    return true;
  }
  if (t.dataset.area) {
    const chs = course.areaById[t.dataset.area].chapters;
    const allSel = chs.every((c) => sel.has(c));
    chs.forEach((c) => (allSel ? sel.delete(c) : sel.add(c)));
    return true;
  }
  return false;
}

export function countByChapter(questions) {
  const counts = {};
  for (const q of questions) counts[q.chapter] = (counts[q.chapter] || 0) + 1;
  return counts;
}
