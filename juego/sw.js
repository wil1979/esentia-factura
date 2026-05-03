self.addEventListener('install', e => {
    e.waitUntil(
        caches.open('ruleta-cache').then(cache => {
            return cache.addAll([
                '/',
                '/juego/index.html'
            ]);
        })
    );
});