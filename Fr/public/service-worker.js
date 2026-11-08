// Versiunea 2.36 - Update PWA cu notificare personalizată & Web Push (Modern Arena)

const CACHE_NAME = 'scoutpro-cache-v2.36'; // Nume nou pentru noul cache
const urlsToCache = ['/', '/index.html'];

self.addEventListener('install', (event) => {
    // Nu mai forțăm instalarea instantanee (am scos self.skipWaiting de aici).
    // Aplicația va aștepta confirmarea utilizatorului din bannerul personalizat.
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
});

// Ascultăm comanda trimisă de la butonul de update (suportă și obiect și string)
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING' || (event.data && event.data.type === 'SKIP_WAITING')) {
        self.skipWaiting();
    }
});

// Evenimentul 'activate' șterge cache-ul vechi când primește permisiunea
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Ștergem orice cache care nu este cel actual (v2.22)
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

// ==========================================
// NOU: LOGICA PENTRU NOTIFICĂRI WEB PUSH (BACKGROUND)
// ==========================================

// Ascultăm evenimentele 'push' trimise de la serverul backend
self.addEventListener('push', function(event) {
    if (event.data) {
        const data = event.data.json();
        
        const options = {
            body: data.body,
            icon: data.icon || '/icon-192.png', // Asigură-te că ai o iconiță validă
            badge: '/icon-192.png',
            vibrate: [200, 100, 200, 100, 200],
            data: data.data // ex: { fixtureId: 12345 }
        };

        // Afișăm notificarea direct din sistemul de operare
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// Ascultăm acțiunea de click pe notificare (chiar și când aplicația e închisă)
self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    const fixtureId = event.notification.data?.fixtureId;
    // Construim URL-ul dorit (poți ajusta dacă folosești alt format de rutare)
    const urlToOpen = fixtureId ? `/?matchId=${fixtureId}` : '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            // Dacă aplicația e deja deschisă într-un tab, îl focalizăm și îi trimitem meciul
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.postMessage({ type: 'NAVIGATE_TO_MATCH', fixtureId: fixtureId });
                    return client.focus();
                }
            }
            // Dacă aplicația este închisă de tot, o deschidem
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});