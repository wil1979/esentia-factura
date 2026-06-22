// service-worker.js
const CACHE_NAME = 'esentia-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/icon-192.png',
  '/images/icon-512.png',
  // Agrega aquí tus CSS/JS críticos
];

// ✅ Instalar: Cachear assets estáticos
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ✅ Activar: Limpiar caches antiguos
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ✅ Fetch: Estrategia Cache-First para estáticos, Network-First para dinámicos
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Assets estáticos: Cache First
  if (ASSETS.some(a => url.pathname.endsWith(a) || url.pathname.includes(a))) {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request))
    );
    return;
  }

  // API/Firestore: Network First con fallback a cache
  if (request.url.includes('firestore') || request.url.includes('api')) {
    e.respondWith(
      fetch(request)
        .then(res => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, resClone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Default: Network First
  e.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ✅ Background Sync (opcional para formularios offline)
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-forms') {
    e.waitUntil(
      // Aquí iría la lógica para enviar formularios pendientes
      console.log('🔄 Sync de formularios ejecutado')
    );
  }
});