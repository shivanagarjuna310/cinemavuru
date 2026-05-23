// public/sw.js
// Service Worker for CinemaVuru PWA
// Caches key assets so the app loads fast even on slow connections

const CACHE_NAME = 'cinemavuru-v1'

// These files get cached immediately when PWA is installed
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// ── Install: cache static assets ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// ── Activate: clean up old caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

// ── Fetch: Network first, fallback to cache ──
// This means users always get fresh content when online
// But if offline, they still see cached pages
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return

  // Skip Supabase API calls — always need fresh data
  if (event.request.url.includes('supabase.co')) return

  // Skip Razorpay/Cashfree — payment must be live
  if (event.request.url.includes('razorpay') || event.request.url.includes('cashfree')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache a copy of successful responses
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone)
          })
        }
        return response
      })
      .catch(() => {
        // Network failed — try cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached
          // If nothing cached, return offline page for navigation
          if (event.request.mode === 'navigate') {
            return caches.match('/')
          }
        })
      })
  )
})