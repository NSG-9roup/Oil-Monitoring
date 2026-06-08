const CACHE_NAME = 'oiltrack-cache-v1'
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/nav logo.webp',
  '/teks logo.webp',
  '/header.png',
  '/footer.png'
]

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static assets')
      return cache.addAll(ASSETS_TO_CACHE)
    })
  )
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache')
            return caches.delete(cache)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch event (Network first falling back to cache for static resources)
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return

  // Do not intercept chrome-extension or other non-http schemes
  if (!event.request.url.startsWith(self.location.origin)) return

  // Bypass Auth/API routes
  if (event.request.url.includes('/api/') || event.request.url.includes('/auth/')) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache static files dynamically
        if (
          response.status === 200 &&
          (event.request.url.includes('.js') ||
            event.request.url.includes('.css') ||
            event.request.url.includes('.png') ||
            event.request.url.includes('.webp') ||
            event.request.url.includes('.woff'))
        ) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          // Optional: Return a offline page fallback if needed
        })
      })
  )
})
