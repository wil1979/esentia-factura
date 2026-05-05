const CACHE_NAME = 'ruleta-premios-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&display=swap',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore-compat.js'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache).catch(err => {
          console.log('Algunos recursos no pudieron ser cacheados:', err);
        });
      })
  );
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia: Network First, Fall back to Cache
self.addEventListener('fetch', event => {
  // No cachear solicitudes a Firebase
  if (event.request.url.includes('firebaseapp.com') || 
      event.request.url.includes('firestore.googleapis.com')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'Sin conexión a Firebase' }),
            { status: 503, statusText: 'Service Unavailable' }
          );
        })
    );
    return;
  }

  // Para otros recursos: Network First
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // No cachear respuestas no-OK
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Cachear respuesta exitosa
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // Si falla la red, usar cache
        return caches.match(event.request)
          .then(response => {
            return response || new Response(
              'Recurso no disponible offline',
              { status: 404, statusText: 'Not Found' }
            );
          });
      })
  );
});

// Sincronización en background (opcional)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-winners') {
    event.waitUntil(syncWinners());
  }
});

async function syncWinners() {
  try {
    // Sincronizar datos pendientes cuando se recupere la conexión
    console.log('Sincronizando ganadores...');
  } catch (error) {
    console.error('Error en sincronización:', error);
  }
}

// Notificaciones Push (opcional)
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Nueva notificación de Ruleta de Premios',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%230ea5e9" width="192" height="192"/><text x="50%" y="50%" font-size="120" fill="white" text-anchor="middle" dominant-baseline="middle">🎰</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect fill="%230ea5e9" width="96" height="96"/><text x="50%" y="50%" font-size="60" fill="white" text-anchor="middle" dominant-baseline="middle">🎰</text></svg>',
    tag: 'ruleta-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('Ruleta de Premios', options)
  );
});

// Manejo de clicks en notificaciones
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
