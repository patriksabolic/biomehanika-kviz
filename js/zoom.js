// Slika preko cijelog zaslona sa zumiranjem (spec, odjeljak 15).
// Dodir slike s klasom .qimg otvara je; dva prsta = zumiranje, jedan prst = pomicanje
// zumirane slike, dvostruki dodir = 2,5× / natrag, ✕ ili tipka Natrag = zatvaranje.

const MAX = 6;
let box = null;   // overlay
let img = null;
let view = { s: 1, x: 0, y: 0 };
const pts = new Map(); // aktivni prsti: pointerId → {x, y}
let start = null;      // stanje na početku geste
let lastTap = 0;
let moved = false;

function apply() {
  img.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
}

function clamp() {
  view.s = Math.min(MAX, Math.max(1, view.s));
  if (view.s === 1) { view.x = 0; view.y = 0; return; }
  // Ne dopusti da slika pobjegne izvan zaslona.
  const w = img.offsetWidth * view.s, h = img.offsetHeight * view.s;
  const mx = Math.max(0, (w - innerWidth) / 2), my = Math.max(0, (h - innerHeight) / 2);
  view.x = Math.min(mx, Math.max(-mx, view.x));
  view.y = Math.min(my, Math.max(-my, view.y));
}

// Zumiraj na faktor s oko točke (cx, cy) zaslona.
function zoomAt(s, cx, cy, base = view) {
  const ox = cx - innerWidth / 2, oy = cy - innerHeight / 2;
  const k = s / base.s;
  view = { s, x: ox - (ox - base.x) * k, y: oy - (oy - base.y) * k };
  clamp();
  apply();
}

function gestureState() {
  const p = [...pts.values()];
  if (p.length >= 2) {
    const [a, b] = p;
    return { view: { ...view }, dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  }
  return { view: { ...view }, x: p[0].x, y: p[0].y };
}

function onDown(e) {
  if (e.target.closest('.zoom-close')) return;
  box.setPointerCapture?.(e.pointerId);
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  start = gestureState();
  if (pts.size === 1) moved = false;
}

function onMove(e) {
  if (!pts.has(e.pointerId)) return;
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const p = [...pts.values()];
  if (p.length >= 2 && start.dist) {
    const [a, b] = p;
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    const s = Math.min(MAX, Math.max(1, start.view.s * (dist / start.dist)));
    zoomAt(s, start.cx, start.cy, start.view);
    // pomicanje dva prsta zajedno
    view.x += (a.x + b.x) / 2 - start.cx;
    view.y += (a.y + b.y) / 2 - start.cy;
    clamp(); apply();
    moved = true;
  } else if (p.length === 1 && start.x !== undefined) {
    const dx = p[0].x - start.x, dy = p[0].y - start.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
    if (view.s > 1) {
      view.x = start.view.x + dx;
      view.y = start.view.y + dy;
      clamp(); apply();
    }
  }
}

function onUp(e) {
  if (!pts.has(e.pointerId)) return;
  pts.delete(e.pointerId);
  if (pts.size) { start = gestureState(); return; }
  if (moved) return;
  const now = Date.now();
  if (now - lastTap < 300) {
    lastTap = 0;
    if (view.s > 1) { view = { s: 1, x: 0, y: 0 }; apply(); } else zoomAt(2.5, e.clientX, e.clientY);
  } else {
    lastTap = now;
  }
}

function onWheel(e) {
  e.preventDefault();
  zoomAt(view.s * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX, e.clientY);
}

function close(fromHistory = false) {
  if (!box) return;
  box.remove();
  box = img = null;
  pts.clear();
  document.body.classList.remove('zoom-open');
  if (!fromHistory && history.state?.zoom) history.back();
}

function onPop() {
  if (box) close(true);
}

function onKey(e) {
  if (e.key === 'Escape' && box) close();
}

export function openZoom(src, alt) {
  close(true);
  box = document.createElement('div');
  box.className = 'zoom';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Slika preko cijelog zaslona');
  box.innerHTML = `<img class="zoom-img" alt=""><button type="button" class="zoom-close" aria-label="Zatvori sliku">✕</button>
    <p class="zoom-hint">Dva prsta: zumiranje · dvostruki dodir: 2,5×</p>`;
  img = box.querySelector('.zoom-img');
  img.src = src;
  img.alt = alt || '';
  view = { s: 1, x: 0, y: 0 };
  apply();
  box.addEventListener('pointerdown', onDown);
  box.addEventListener('pointermove', onMove);
  box.addEventListener('pointerup', onUp);
  box.addEventListener('pointercancel', onUp);
  box.addEventListener('wheel', onWheel, { passive: false });
  box.querySelector('.zoom-close').addEventListener('click', () => close());
  document.body.appendChild(box);
  document.body.classList.add('zoom-open');
  // Tipka Natrag na mobitelu zatvara sliku, ne aplikaciju.
  history.pushState({ zoom: true }, '');
  box.querySelector('.zoom-close').focus({ preventScroll: true });
}

// Jednom pri pokretanju: dodir bilo koje slike pitanja/objašnjenja otvara zoom.
export function initZoom() {
  document.addEventListener('click', (e) => {
    const t = e.target.closest('img.qimg');
    if (t) openZoom(t.currentSrc || t.src, t.alt);
  });
  addEventListener('popstate', onPop);
  addEventListener('keydown', onKey);
}
