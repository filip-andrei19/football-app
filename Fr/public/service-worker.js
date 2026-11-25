// Versiunea 3.22 - Update PWA cu notificare personalizată, Web Push & Fix Cache (/assets/ exclus)

const CACHE_NAME = 'scoutpro-cache-v3.22';
const urlsToCache = ['/', '/index.html'];

self.addEventListener('install', (event) => {
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
                    if (cacheName !== CACHE_NAME) {
                        console.log('Se șterge vechiul cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. Ignoră cererile care NU sunt GET sau sunt către API / Sentry / Extensii / Assets cu hash Vite
    if (
        event.request.method !== 'GET' ||
        url.hostname.includes('sentry.io') ||
        url.pathname.includes('/api/') ||
        url.pathname.includes('/assets/') ||
        url.protocol === 'chrome-extension:'
    ) {
        return;
    }

    // 2. Pentru pagini HTML, folosim "Network First"
    if (url.pathname.endsWith('.html') || url.pathname === '/') {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.ok) {
                        return caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, networkResponse.clone());
                            return networkResponse;
                        });
                    }
                    return networkResponse;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // 3. Pentru restul resurselor (imagini statice, manifest, iconițe)
    event.respondWith(
        caches.match(event.request).then((response) => response || fetch(event.request))
    );
});

// ==========================================
// LOGICA PENTRU NOTIFICĂRI WEB PUSH (BACKGROUND)
// ==========================================

self.addEventListener('push', function(event) {
    if (event.data) {
        const data = event.data.json();

        const options = {
            body: data.body,
            icon: data.icon || '/icon-192.png',
            badge: '/icon-192.png',
            vibrate: [200, 100, 200, 100, 200],
            data: data.data
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    const fixtureId = event.notification.data?.fixtureId;
    const urlToOpen = fixtureId ? `/?matchId=${fixtureId}` : '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.postMessage({ type: 'NAVIGATE_TO_MATCH', fixtureId: fixtureId });
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});