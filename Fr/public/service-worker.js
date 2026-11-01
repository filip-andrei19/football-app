// Versiunea 2.3 - Update PWA cu notificare personalizată (Modern Arena)

const CACHE_NAME = 'scoutpro-cache-v2.3'; // Nume nou pentru noul cache
const urlsToCache = ['/', '/index.html'];

self.addEventListener('install', (event) => {
    // Nu mai forțăm instalarea instantanee (am scos self.skipWaiting de aici).
    // Aplicația va aștepta confirmarea utilizatorului din bannerul personalizat.
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
});

// NOU: Ascultăm comanda trimisă de la butonul tău personalizat (din App.tsx)
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Evenimentul 'activate' șterge cache-ul vechi când primește permisiunea
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Ștergem orice cache care nu este cel actual (v2.1)
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