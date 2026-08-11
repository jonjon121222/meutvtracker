// ATUALIZADO: Versão v7 para forçar o download dos novos arquivos separados
const CACHE_NAME = 'meutvtime-v70-cache-v2'; // NOME ATUALIZADO PARA v2
const urlsToCache = [
    './',
    './index.html',
    './style.css',       // CSS adicionado
    './script.js',       // JavaScript adicionado
    './tailwindcss.js',
    './localforage.min.js',
    './manifest.json'
];

self.addEventListener('install', event => {
    self.skipWaiting(); 
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    if (event.request.url.startsWith('chrome-extension://')) return;

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then(networkResponse => {
                if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
                    return networkResponse;
                }

                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    if(event.request.method === 'GET') {
                        cache.put(event.request, responseToCache);
                    }
                });

                return networkResponse;
            }).catch(() => {
                if (event.request.destination === 'image') {
                    return caches.match('https://via.placeholder.com/400x600?text=Capa');
                }
            });
        })
    );
});