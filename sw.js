/* Offline cache for the SiGMA target map. Stale-while-revalidate: opens instantly from cache,
   refreshes in the background, so a new index.html shows up on the next launch. */
const CACHE = 'sigma-map-20261016-1304';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon.svg', './apple-touch-icon.png',
              './icon-192.png', './icon-512.png', './icon-maskable-512.png', './favicon-32.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('sigma-map-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  const fonts = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  const photo = url.hostname === 'match.sigma.world' && url.pathname.startsWith('/storage/profile_photos/');
  if (!same && !fonts && !photo) return;              // job links etc. go straight to the network
  const key = same && req.mode === 'navigate' ? './index.html' : req;
  e.respondWith(caches.open(CACHE).then((cache) => cache.match(key, { ignoreSearch: same }).then((hit) => {
    const net = fetch(req).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(key, res.clone());
      return res;
    }).catch(() => hit);
    return hit || net;
  })));
});
