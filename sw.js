/* FlowDesk GRM service worker: caches the app shell so the app opens with no network.
   Data lives in IndexedDB inside index.html; API calls are never cached here.
   Bump SHELL_VERSION on every deploy that changes index.html. */
const SHELL_VERSION = 'flowdesk-shell-2.0.0';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API and other origins go straight to the network

  // Navigations: serve the cached shell instantly, refresh it in the background.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.open(SHELL_VERSION).then(async (cache) => {
        const cached = await cache.match('./index.html');
        const network = fetch(req).then((res) => {
          if (res && res.ok) cache.put('./index.html', res.clone());
          return res;
        }).catch(() => null);
        if (cached) { event.waitUntil(network); return cached; }
        const res = await network;
        return res || new Response('<h1>Offline</h1><p>Open FlowDesk once with a connection to install it.</p>', { headers: { 'Content-Type': 'text/html' } });
      })
    );
    return;
  }

  // Static shell assets: cache first, then network (and cache what we fetch).
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => cached || fetch(req).then((res) => {
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(SHELL_VERSION).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});
