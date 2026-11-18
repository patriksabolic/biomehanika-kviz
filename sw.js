// Service worker: offline rad (spec, odjeljak 14).
// PRI SVAKOM DEPLOYU podigni VERSION (mora biti isto kao "version" u version.json).
const VERSION = '0.6.0';
const CACHE = `bmkviz-${VERSION}`;

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './js/app.js',
  './js/util.js',
  './js/storage.js',
  './js/content.js',
  './js/grading.js',
  './js/scheduler.js',
  './js/quiz.js',
  './js/stats.js',
  './js/picker.js',
  './js/exam.js',
  './js/settings.js',
  './js/plan.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

const CONTENT = [
  './version.json',
  './content/courses.json',
  './content/biomehanika/course.json',
  './content/biokemija-lijekova/course.json',
  './content/biomehanika/questions/00-kolokvij.json',
  './content/biomehanika/questions/01.json',
  './content/biomehanika/questions/02.json',
  './content/biomehanika/questions/03.json',
  './content/biomehanika/questions/04.json',
  './content/biomehanika/questions/05.json',
  './content/biomehanika/questions/06.json',
  './content/biomehanika/questions/07.json',
  './content/biomehanika/questions/08.json',
  './content/biomehanika/questions/09.json',
  './content/biomehanika/questions/10.json',
  './content/biomehanika/questions/11.json',
  './content/biomehanika/questions/12.json',
  './content/biomehanika/questions/13.json',
  './content/biomehanika/questions/14.json',
  './content/biomehanika/questions/15.json',
  './content/biomehanika/questions/16.json',
  './content/biomehanika/questions/17.json',
  './content/biomehanika/questions/18.json',
  './content/biomehanika/questions/19.json',
  './content/biomehanika/questions/20.json',
  './content/biomehanika/questions/21.json',
  './content/biomehanika/questions/22.json',
  './content/biomehanika/questions/23.json',
  './content/biomehanika/questions/24.json',
  './content/biomehanika/questions/25.json',
  './content/biomehanika/questions/26.json',
  './content/biomehanika/questions/27.json',
  './content/biomehanika/questions/28.json',
  './content/biomehanika/questions/29.json',
  './content/biomehanika/questions/30.json',
  './content/biomehanika/questions/31.json',
  './content/biomehanika/questions/32.json',
  './content/biomehanika/questions/33.json',
  './content/biomehanika/questions/34.json',
  './content/biomehanika/questions/35.json',
  './content/biomehanika/img/02-1.png',
  './content/biomehanika/img/03-1.png',
  './content/biomehanika/img/03-2.png',
  './content/biomehanika/img/06-1.png',
  './content/biomehanika/img/08-1.png',
  './content/biomehanika/img/10-1.png',
  './content/biomehanika/img/11-1.png',
  './content/biomehanika/img/13-1.png',
  './content/biomehanika/img/14-1.png',
  './content/biomehanika/img/15-1.png',
  './content/biomehanika/img/15-2.png',
  './content/biomehanika/img/16-1.png',
  './content/biomehanika/img/21-1.png',
  './content/biomehanika/img/22-1.png',
  './content/biomehanika/img/23-1.png',
  './content/biomehanika/img/25-1.png',
  './content/biomehanika/img/26-1.png',
  './content/biomehanika/img/26-2.png',
  './content/biomehanika/img/27-1.png',
  './content/biomehanika/img/27-2.png',
  './content/biomehanika/img/27-3.png',
  './content/biomehanika/img/30-1.png',
  './content/biomehanika/img/31-1.png',
  './content/biomehanika/img/32-1.png',
  './content/biomehanika/img/34-1.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    // cache: 'reload' = mimo HTTP cachea preglednika, da nova verzija ne spremi stare datoteke.
    caches.open(CACHE)
      .then((c) => c.addAll([...SHELL, ...CONTENT].map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('bmkviz-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// content/** i version.json: prvo mreža, ako nema mreže – cache.
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request, { cache: 'no-cache' }); // provjeri na serveru je li sadržaj nov
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (e) {
    const hit = await cache.match(request, { ignoreSearch: true });
    if (hit) return hit;
    throw e;
  }
}

// App shell: prvo cache, inače mreža.
async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const isContent = url.pathname.includes('/content/') || url.pathname.endsWith('/version.json');
  event.respondWith(isContent ? networkFirst(request) : cacheFirst(request));
});
