const CACHE_NAME = 'scoutpro-cache-v1';
const urlsToCache = ['/', '/index.html'];

self.addEventListener('install', (event) => {
    // 1. Forțează noul Service Worker să se instaleze imediat, fără să aștepte
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
});

// 2. NOU: Evenimentul 'activate' preia controlul instantaneu asupra tuturor tab-urilor deschise
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => response || fetch(event.request))
    );
});