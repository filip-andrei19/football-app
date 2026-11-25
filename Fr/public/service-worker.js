// Versiunea 3.23 - Update PWA, Fix Cache (/assets/ exclus) & Notificări personalizate cu sunet

const CACHE_NAME = 'scoutpro-cache-v3.23';
const urlsToCache = ['/', '/index.html'];

self.addEventListener('install', (event) => {
    // Aplicația așteaptă confirmarea utilizatorului din bannerul de update
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

self.addEventListener('push', function (event) {
    if (!event.data) return;

    const data = event.data.json();
    const fixtureId = data.data?.fixtureId;

    const options = {
        body: data.body,
        icon: '/icon-192.png',          // Logo-ul aplicației tale în stânga
        badge: '/icon-192.png',         // Iconița mică din bara de sus (Android)
        vibrate: [200, 100, 200],       // Vibrație scurtă, curată
        silent: false,                  // Forțează redarea sunetului de sistem
        renotify: true,                 // Redă sunetul din nou chiar dacă e același meci
        tag: fixtureId ? `match-${fixtureId}` : 'romania-scout-alert',
        data: data.data
    };

    event.waitUntil(
        Promise.all([
            self.registration.showNotification(data.title || 'România Scout', options),
            // Dacă aplicația e deschisă într-un tab, îi spunem să redea și sunetul custom
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
                windowClients.forEach((client) => {
                    client.postMessage({ type: 'PLAY_NOTIF_SOUND' });
                });
            })
        ])
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const fixtureId = event.notification.data?.fixtureId;
    const urlToOpen = fixtureId ? `/?matchId=${fixtureId}` : '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
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