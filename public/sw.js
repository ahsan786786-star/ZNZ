/* Z&Z — service worker
   Makes the site installable as an app on Android / iPhone / desktop and keeps
   the shop usable on a weak connection.
   Rules:
     · pages + API  -> network first (always fresh prices / stock)
     · pictures, css, js, fonts -> cache first, refreshed in the background
*/
const CACHE = 'znz-v14';
const CORE = ['/', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;              /* never touch other domains */
  if (url.pathname.startsWith('/api/')) return;            /* always live data */
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/owner')) return;

  const isAsset = /\.(webp|png|jpe?g|gif|svg|avif|ico|css|js|woff2?|ttf|otf|mp4|webm)$/i.test(url.pathname);

  if (isAsset) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req).then((res) => {
          if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone())).catch(() => {});
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  /* pages: network first, cached copy when the connection is down */
  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone())).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match('/')))
  );
});
