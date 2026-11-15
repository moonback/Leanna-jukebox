/* Leanna Jukebox — cache hors ligne de l'application et des miniatures déjà consultées. */
const VERSION = 'leanna-jukebox-v1';
const SHELL_CACHE = VERSION + '-shell';
const RUNTIME_CACHE = VERSION + '-runtime';
const THUMB_CACHE = VERSION + '-youtube-thumbnails';
const MAX_RUNTIME_ENTRIES = 120;
const MAX_THUMBNAILS = 80;

// Généré par Vite à partir des fichiers réels du build (chunks JS/CSS et médias).
try { importScripts('./precache-manifest.js'); } catch { /* mode développement ou build ancien */ }

function shellUrls() {
  const base = self.registration.scope;
  return [
    base,
    new URL('index.html', base).href,
    new URL('manifest.webmanifest', base).href,
    new URL('icons/icon-192.svg', base).href,
    new URL('icons/icon-512.svg', base).href,
  ];
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll([
        ...shellUrls(),
        ...(self.LEANNA_PRECACHE_URLS || []).map((url) => new URL(url, self.registration.scope).href),
      ]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith('leanna-jukebox-') && ![SHELL_CACHE, RUNTIME_CACHE, THUMB_CACHE].includes(name))
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function cacheResponse(cacheName, request, response, limit) {
  if (response && (response.ok || response.type === 'opaque')) {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    await trimCache(cacheName, limit);
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    if (url.hostname === 'img.youtube.com' && request.destination === 'image') {
      event.respondWith((async () => {
        const cache = await caches.open(THUMB_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          return await cacheResponse(THUMB_CACHE, request, response, MAX_THUMBNAILS);
        } catch {
          return new Response('', { status: 503, statusText: 'Image indisponible hors ligne' });
        }
      })());
    }
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        await cacheResponse(SHELL_CACHE, new URL('index.html', self.registration.scope).href, response, 10);
        return response;
      } catch {
        return (await caches.match(new URL('index.html', self.registration.scope).href))
          || (await caches.match(self.registration.scope));
      }
    })());
    return;
  }

  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/')) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      return await cacheResponse(RUNTIME_CACHE, request, response, MAX_RUNTIME_ENTRIES);
    } catch {
      if (request.destination === 'image') {
        return new Response('', { status: 503, statusText: 'Image indisponible hors ligne' });
      }
      throw new Error('Ressource indisponible hors ligne');
    }
  })());
});
