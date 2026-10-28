const CACHE_NAME = 'finowork-pwa-v1';
const PRECACHE_URLS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Solo interceptar peticiones GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // No interceptar peticiones a la API
  if (url.pathname.startsWith('/auth') ||
      url.pathname.startsWith('/users') ||
      url.pathname.startsWith('/products') ||
      url.pathname.startsWith('/orders') ||
      url.pathname.startsWith('/raw-materials') ||
      url.pathname.startsWith('/production') ||
      url.pathname.startsWith('/dashboard') ||
      url.pathname.startsWith('/settings') ||
      url.pathname.startsWith('/reservations') ||
      url.pathname.startsWith('/superadmin') ||
      url.pathname.startsWith('/public')) {
    return;
  }

  // Navegación (HTML): Network first con fallback a cache de index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Assets estáticos (JS, CSS, imágenes): Cache first o Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // En offline para peticiones de imagen u otros recursos retorna null o vacío
      });
    })
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'FinoWork';
  const options = {
    body: data.body || 'Tienes una nueva notificación.',
    icon: data.icon || '/assets/logo-192.png',
    badge: data.badge || '/favicon-32.png',
    data: {
      url: (data.data && data.data.url) || data.url || '/',
    },
    vibrate: [200, 100, 200],
    tag: data.data?.type || 'finowork-notification',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
