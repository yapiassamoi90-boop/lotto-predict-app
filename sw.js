Const CACHE_NAME = 'loto590-hybrid-v4';
Const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

Self.addEventListener('install', (event) => {
    Event.waitUntil(
        Caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

Self.addEventListener('activate', (event) => {
    Event.waitUntil(
        Caches.keys().then((keys) =>
            Promise.all(
                Keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        )
    );
});

Self.addEventListener('fetch', (event) => {
    Event.respondWith(
        Caches.match(event.request).then((response) => {
            Return response || fetch(event.request);
        })
    );
});
