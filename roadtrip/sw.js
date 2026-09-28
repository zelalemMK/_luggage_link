// Caches the app shell so it opens with no signal. Map tiles, routing and searches still need a connection.
const CACHE = 'cheaptrip-v1';
const SHELL = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'calc.js',
  'manifest.webmanifest',
  'icon.svg',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Network first for the shell (so updates land), cache as fallback; everything else goes straight to the network.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const isShell = SHELL.some((p) => new URL(p, self.registration.scope).href === url.href);
  if (e.request.method !== 'GET' || !isShell) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request)),
  );
});
