// Versiunea 2.0 - Update Design Modern Arena (Forțează refresh la toți utilizatorii)

const CACHE_NAME = 'scoutpro-cache-v2.0'; // Nume nou pentru a invalida memoria veche a telefoanelor
const urlsToCache = ['/', '/index.html'];

self.addEventListener('install', (event) => {
    // 1. Forțează noul Service Worker să se instaleze imediat, fără să aștepte
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
});

// 2. Evenimentul 'activate' preia controlul și ȘTERGE memoria veche (VITAL pentru telefoane)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Dacă numele cache-ului vechi nu este cel actual (v2.0), îl ștergem definitiv
                    if (cacheName !== CACHE_NAME) {
                        console.log('Se șterge vechiul echipament (cache):', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Preia controlul instantaneu asupra tuturor tab-urilor deschise
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => response || fetch(event.request))
    );
});