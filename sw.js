// Service worker — offline support for the training plan
// Strategy: app shell cached (cache-first), plan-data.json network-first so updates show.
const CACHE = 'hm-plan-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Plan data: network-first (so edits to plan-data.json show up), fall back to cache offline.
  if (url.pathname.endsWith('plan-data.json')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./plan-data.json', copy));
        return res;
      }).catch(() => caches.match('./plan-data.json'))
    );
    return;
  }

  // Everything else: cache-first, fall back to network.
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      // cache same-origin GETs opportunistically
      if (e.request.method === 'GET' && url.origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
