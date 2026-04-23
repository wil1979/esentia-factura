// sw.js - Versión Robusta
const CACHE_NAME = 'esentia-app-v2'; // Cambié versión para forzar actualización
const ASSETS = [
  '/',
  '/index.html',
  '/esentia-optimizado.css',
  '/app.js',
  '/manifest.json'
  // ❌ QUITA AQUÍ cualquier archivo que no exista, como '/images/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cacheamos uno por uno para que si uno falla, no detenga a los demás
      return Promise.all(
        ASSETS.map((url) => 
          fetch(url)
            .then((response) => {
              if (response.ok) {
                return cache.put(url, response);
              }
              // Si falla uno, lo logueamos pero no rompemos la promesa
              console.warn(`⚠️ No se pudo cachear: ${url}`);
            })
            .catch((err) => console.warn(`Error cachear ${url}:`, err))
        )
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});