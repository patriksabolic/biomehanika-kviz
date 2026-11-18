// Service worker: offline rad (spec, odjeljak 14).
// PRI SVAKOM DEPLOYU podigni VERSION (mora biti isto kao "version" u version.json).
const VERSION = '0.1.0';
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
  './icons/icon-192.png',
  './icons/icon-512.png',
];

const CONTENT = [
  './version.json',
  './content/courses.json',
  './content/biomehanika/course.json',
  './content/biomehanika/questions/00-kolokvij.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll([...SHELL, ...CONTENT])).then(() => self.skipWaiting())
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
    const res = await fetch(request);
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
