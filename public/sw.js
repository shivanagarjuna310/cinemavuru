// public/sw.js
// Service Worker for CinemaVuru PWA
// Caches key assets so the app loads fast even on slow connections.

const CACHE_NAME = 'cinemavuru-v2'

// Cached immediately on install.
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// ── Install: cache static assets ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  )
  self.skipWaiting()
})

// ── Activate: clean up old caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

// ── Fetch: network-first, fall back to cache ──
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  // Only handle our own origin. YouTube embeds/thumbnails, Supabase, payment
  // gateways, analytics, etc. always go straight to the network (never cached).
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    fetch(req)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(req)
        if (cached) return cached
        // Offline navigation with nothing cached → the app shell.
        if (req.mode === 'navigate') return caches.match('/')
        return new Response('', { status: 504, statusText: 'Offline' })
      }),
  )
})
