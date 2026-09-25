/*
 * GlobePen service worker.
 *
 * CACHING POLICY (school-management SaaS — tenant safety first):
 *   1. /api/* is NEVER intercepted. Every authenticated response (students,
 *      teachers, results, reports, registry, sessions) stays network-driven and
 *      can never leak between schools through this cache.
 *   2. Only same-origin static launch assets are cached (Vite-hashed files,
 *      fonts, icons). These are identical for every tenant.
 *   3. Navigation requests are network-first so users always get the newest
 *      shell when online; the cached shell + offline page are fallbacks only.
 *
 * Version bump: change SHELL_VERSION below whenever this file changes to force
 * every client to activate the new worker on its next visit.
 */
const SHELL_CACHE = 'globepen-shell-v1';
const ASSET_CACHE = 'globepen-assets-v1';
const OFFLINE_URL = '/offline.html';

// Cross-origin font hosts only; opaque font responses carry no school data.
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.add(OFFLINE_URL);
      // Deliberately no skipWaiting(): activation waits for the user consent
      // flow in the app so an in-progress form or session is never clobbered.
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('globepen-') && k !== SHELL_CACHE && k !== ASSET_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isCacheableAsset(url) {
  if (url.origin !== self.location.origin) {
    return FONT_HOSTS.includes(url.hostname) && /\.(woff2?|ttf)(\?|$)/.test(url.pathname);
  }
  if (url.pathname.startsWith('/api/')) return false;
  return (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(css|js|mjs|png|jpe?g|svg|webp|gif|ico|woff2?|ttf|webmanifest)$/.test(url.pathname)
  );
}

async function cacheFirst(req) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && (res.ok || res.type === 'opaque')) await cache.put(req, res.clone());
    return res;
  } catch (err) {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

async function networkFirst(req, cacheName, cacheKey) {
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(cacheKey || req, res.clone());
    }
    return res;
  } catch (err) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(cacheKey || req);
    if (cached) return cached;
    throw err;
  }
}

async function navigationHandler(req) {
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put('/index.html', fresh.clone());
    }
    return fresh;
  } catch (err) {
    const cache = await caches.open(SHELL_CACHE);
    const shell = (await cache.match('/index.html')) || (await cache.match(req));
    if (shell) return shell;
    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response('GlobePen is offline and no cached shell is available. Reconnect and reload.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // 1. Tenant-sensitive API traffic: never touched by the service worker.
  if (url.pathname.startsWith('/api/')) return;

  // 2. SPA navigation: network-first, cached shell/offline page as fallback.
  if (req.mode === 'navigate') {
    event.respondWith(navigationHandler(req));
    return;
  }

  // 3. The static manifest is re-fetched so platform identity never goes stale.
  if (url.pathname === '/manifest.webmanifest') {
    event.respondWith(
      networkFirst(url, SHELL_CACHE).catch(() =>
        caches.open(SHELL_CACHE).then((c) => c.match(url.toString()))
      )
    );
    return;
  }

  // 4. Static assets (hashed bundles, fonts, icons): cache-first.
  if (isCacheableAsset(url)) {
    event.respondWith(cacheFirst(req));
  }
});