// Ekran Postavke (spec, odjeljak 12) i primjena teme.

import * as storage from './storage.js';
import { esc, todayKey, plural } from './util.js';
import { loadVersion } from './content.js';

const MODES = [['auto', 'Automatski'], ['mc', 'Uvijek zaokruživanje'], ['fill', 'Uvijek nadopunjavanje']];
const THEMES = [['system', 'Prati sustav'], ['dark', 'Tamna'], ['light', 'Svijetla']];
const GOALS = [5, 10, 15, 20, 30];
const DURATIONS = [15, 30, 45, 60];

let ui = { pendingImport: null, confirmReset: false, confirmClear: false, msg: null, thrError: null };

export function applyTheme() {
  const t = storage.settings().theme;
  const html = document.documentElement;
  if (t === 'dark' || t === 'light') html.dataset.theme = t; else delete html.dataset.theme;
  const dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121821' : '#f3f6fa');
}

function seg(list, current, attr, suffix = '') {
  return `<div class="segmented">${list.map((v) => `<button type="button" class="seg ${current === v ? 'on' : ''}" data-${attr}="${v}" aria-pressed="${current === v}">${v}${suffix}</button>`).join('')}</div>`;
}

function radios(name, list, current) {
  return list.map(([v, label]) => `<label class="toggle"><input type="radio" name="${name}" value="${v}" ${current === v ? 'checked' : ''}><span>${label}</span></label>`).join('');
}

function fmtDay(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '' : `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}.`;
}

// Tekst za zalijepiti u Claude Code (predložak "ispravci iz aplikacije" u docs/prompts.md).
export function reportsText(ctx) {
  const cd = storage.courseData(ctx.courseId);
  const byId = new Map(ctx.questions.map((q) => [q.id, q]));
  const lines = [`Prijave iz aplikacije – ${ctx.course.name} (kolegij ${ctx.courseId}, ${todayKey()})`, ''];
  lines.push(`Prijavljene greške (${cd.reports.length}):`);
  for (const r of cd.reports) {
    const q = byId.get(r.id);
    lines.push(`- ${r.id} (${fmtDay(r.date)}): "${r.text}"`);
    if (q) lines.push(`  pitanje: "${q.prompt}" | točan odgovor: "${q.answer}"${r.input ? ` | moj upis: "${r.input}"` : ''}`);
  }
  lines.push('', `"Ipak točno" – dodati u accepted (${cd.overrides.length}):`);
  for (const o of cd.overrides) {
    const q = byId.get(o.id);
    lines.push(`- ${o.id}: upis "${o.input}"${q ? ` | točan odgovor: "${q.answer}" | pitanje: "${q.prompt}"` : ''}`);
  }
  return lines.join('\n');
}

async function copyText(text, textarea) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    textarea.select();
    try { return document.execCommand('copy'); } catch { return false; }
  }
}

function download(name, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function renderSettings(el, ctx) {
  const st = storage.settings();
  const cd = storage.courseData(ctx.courseId);
  const cs = cd.settings; // postavke kolegija
  const thr = cs.grading || ctx.course.grading;
  const custom = !!cs.grading;
  const dur = cs.examDuration || ctx.course.exam?.durationMin || 45;
  const nRep = cd.reports.length + cd.overrides.length;
  const answeredTotal = Object.values(cd.questions).reduce((s, r) => s + (r.answered || 0), 0);
  const pend = ui.pendingImport;

  const importBox = pend ? `
    <div class="confirm">
      <p class="small">Odabrana datoteka: <strong>${esc(pend.name)}</strong></p>
      <button type="button" class="btn primary" data-act="import-merge">Spoji s postojećim napretkom</button>
      <button type="button" class="btn" data-act="import-replace">Zamijeni sve (i postavke)</button>
      <button type="button" class="btn ghost" data-act="import-cancel">Odustani</button>
    </div>` : '';

  el.innerHTML = `
    <h1>Postavke</h1>
    ${ui.msg ? `<p class="notice ${ui.msg.bad ? 'bad' : ''}" role="status">${esc(ui.msg.text)}</p>` : ''}
    <h2 class="section-title">Kolegij: ${esc(ctx.course.name)}</h2>
    <p class="muted small">Ove postavke vrijede samo za ovaj kolegij. Drugi kolegij odaberi na Početnoj.</p>
    <section class="card">
      <h2>Pragovi ocjena</h2>
      <p class="muted small">Minimalni postotak za ocjenu u ispitu${custom ? ' (prilagođeno)' : ' (zadano)'}.</p>
      <div class="thr-grid">
        ${[2, 3, 4, 5].map((g) => `<label class="thr"><span>Ocjena ${g} ≥</span>
          <input type="number" inputmode="numeric" min="1" max="100" step="1" data-thr="${g}" value="${thr[g]}"><span>%</span></label>`).join('')}
      </div>
      ${ui.thrError ? `<p class="bad-text small">${esc(ui.thrError)}</p>` : ''}
      <button type="button" class="btn small-btn" data-act="thr-save">Spremi pragove</button>
      ${custom ? '<button type="button" class="link small" data-act="thr-reset">Vrati zadano</button>' : ''}
    </section>
    <section class="card">
      <h2>Zadano trajanje ispita</h2>
      ${seg(DURATIONS, dur, 'dur', ' min')}
    </section>
    <section class="card">
      <h2>Dnevni cilj</h2>
      <p class="muted small">Dan se broji u streak ovog kolegija kad u njemu odgovoriš na barem ovoliko pitanja (kviz i ispit zajedno).</p>
      ${seg(GOALS, cs.dailyGoal, 'goal')}
    </section>
    <section class="card">
      <h2>Prijave</h2>
      <p class="muted small">Prijavljene greške: ${cd.reports.length} · „Ipak točno”: ${cd.overrides.length}. Kopiraj tekst i zalijepi ga u Claude Code da se pitanja isprave.</p>
      ${nRep ? `
        <textarea class="report-out" rows="6" readonly>${esc(reportsText(ctx))}</textarea>
        <button type="button" class="btn primary" data-act="copy">📋 Kopiraj</button>
        ${ui.confirmClear
          ? `<div class="confirm"><p class="small">Obrisati sve prijave? Učini to tek nakon što su ispravci napravljeni.</p>
              <button type="button" class="btn danger" data-act="clear-yes">Da, obriši prijave</button>
              <button type="button" class="btn ghost" data-act="clear-no">Odustani</button></div>`
          : '<button type="button" class="link small" data-act="clear">Obriši prijave</button>'}`
        : '<p class="muted small">Nema prijava.</p>'}
    </section>
    <section class="card">
      <h2>Reset napretka</h2>
      <p class="muted small">Briše sve odgovore, ispite, streak i plan za ovaj kolegij (${answeredTotal} ${plural(answeredTotal, 'odgovor', 'odgovora', 'odgovora')}). Postavke i prijave ostaju.</p>
      ${ui.confirmReset
        ? `<div class="confirm"><p><strong>Sigurno?</strong> Ovo se ne može poništiti. Preporuka: prvo napravi Export.</p>
            <button type="button" class="btn danger" data-act="reset-yes">Da, obriši napredak</button>
            <button type="button" class="btn ghost" data-act="reset-no">Odustani</button></div>`
        : '<button type="button" class="btn danger-outline" data-act="reset">Resetiraj napredak</button>'}
    </section>
    <h2 class="section-title">Aplikacija</h2>
    <p class="muted small">Zajedničko za sve kolegije.</p>
    <section class="card">
      <h2>Način prikaza</h2>
      <p class="muted small">Automatski: pitanje kreće kao zaokruživanje, a nakon 2 točna zaredom prelazi u nadopunjavanje (i natrag nakon 2 netočna). Ispit uvijek koristi nadopunjavanje gdje je moguće.</p>
      ${radios('displayMode', MODES, st.displayMode)}
    </section>
    <section class="card">
      <h2>Tema</h2>
      ${radios('theme', THEMES, st.theme)}
    </section>
    <section class="card">
      <h2>Vibracija</h2>
      <label class="toggle"><input type="checkbox" data-set="vibration" ${st.vibration ? 'checked' : ''}><span>Vibracija na odgovor</span></label>
    </section>
    <section class="card">
      <h2>Sigurnosna kopija</h2>
      <p class="muted small">Napredak je spremljen samo na ovom uređaju. Export preuzima datoteku sa svim kolegijima koju možeš kasnije uvesti (npr. na novom mobitelu).</p>
      <button type="button" class="btn" data-act="export">⬇️ Export (preuzmi kopiju)</button>
      <label class="btn file-btn">⬆️ Import (odaberi datoteku)<input type="file" accept=".json,application/json" data-act="import-file" hidden></label>
      ${importBox}
    </section>
    <p class="muted small center" id="version"></p>`;

  const rerender = () => renderSettings(el, ctx);

  el.onsubmit = (e) => e.preventDefault();
  el.onchange = async (e) => {
    const t = e.target;
    if (t.name === 'displayMode') { st.displayMode = t.value; storage.save(); }
    else if (t.name === 'theme') { st.theme = t.value; storage.save(); applyTheme(); }
    else if (t.dataset.set === 'vibration') { st.vibration = t.checked; storage.save(); }
    else if (t.dataset.act === 'import-file' && t.files?.[0]) {
      const file = t.files[0];
      try {
        const data = storage.parseImport(await file.text());
        ui.pendingImport = { name: file.name, data };
        ui.msg = null;
      } catch (err) {
        ui.pendingImport = null;
        ui.msg = { text: `Import nije uspio: ${err.message}`, bad: true };
      }
      rerender();
    }
  };

  el.onclick = async (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    const act = t.dataset.act;
    ui.msg = null;
    if (t.dataset.goal) { cs.dailyGoal = Number(t.dataset.goal); storage.save(); }
    else if (t.dataset.dur) { cs.examDuration = Number(t.dataset.dur); storage.save(); }
    else if (act === 'thr-save') {
      const v = {};
      el.querySelectorAll('[data-thr]').forEach((i) => { v[i.dataset.thr] = Math.round(Number(i.value)); });
      const ok = [2, 3, 4, 5].every((g) => Number.isFinite(v[g]) && v[g] >= 1 && v[g] <= 100) && v[2] < v[3] && v[3] < v[4] && v[4] < v[5];
      if (!ok) {
        ui.thrError = 'Pragovi moraju biti između 1 i 100 i rasti od ocjene 2 do 5.';
      } else {
        ui.thrError = null;
        const def = ctx.course.grading;
        cs.grading = [2, 3, 4, 5].every((g) => v[g] === Number(def[g])) ? null : v;
        storage.save();
        ui.msg = { text: 'Pragovi spremljeni.' };
      }
    }
    else if (act === 'thr-reset') { cs.grading = null; ui.thrError = null; storage.save(); }
    else if (act === 'export') {
      download(`kviz-backup-${todayKey()}.json`, storage.exportJSON());
      ui.msg = { text: 'Kopija je preuzeta (mapa Preuzimanja / Downloads).' };
    }
    else if (act === 'import-merge' || act === 'import-replace') {
      if (act === 'import-merge') storage.mergeState(ui.pendingImport.data);
      else storage.replaceState(ui.pendingImport.data);
      ui.pendingImport = null;
      location.reload();
      return;
    }
    else if (act === 'import-cancel') { ui.pendingImport = null; }
    else if (act === 'copy') {
      const ok = await copyText(reportsText(ctx), el.querySelector('.report-out'));
      ui.msg = ok ? { text: 'Kopirano. Zalijepi u Claude Code.' } : { text: 'Kopiranje nije uspjelo – označi tekst i kopiraj ručno.', bad: true };
    }
    else if (act === 'clear') { ui.confirmClear = true; }
    else if (act === 'clear-no') { ui.confirmClear = false; }
    else if (act === 'clear-yes') { cd.reports = []; cd.overrides = []; ui.confirmClear = false; storage.flush(); ui.msg = { text: 'Prijave obrisane.' }; }
    else if (act === 'reset') { ui.confirmReset = true; }
    else if (act === 'reset-no') { ui.confirmReset = false; }
    else if (act === 'reset-yes') {
      storage.resetProgress(ctx.courseId);
      ui.confirmReset = false;
      location.reload();
      return;
    }
    else return;
    const y = window.scrollY;
    await rerender();
    window.scrollTo(0, y);
  };

  const v = await loadVersion();
  const vEl = el.querySelector('#version');
  if (v && vEl) vEl.textContent = `Verzija aplikacije ${v.version} · sadržaj ${v.content}`;
}

// Pri odlasku s ekrana zaboravi privremena stanja (potvrde, poruke).
export function resetSettingsUi() {
  ui = { pendingImport: null, confirmReset: false, confirmClear: false, msg: null, thrError: null };
}
