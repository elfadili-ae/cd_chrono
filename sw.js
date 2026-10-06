// Service worker — Course de Durée
// Met en cache l'application pour un fonctionnement 100% hors-ligne après la première visite.

const CACHE_NAME = 'course-duree-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

// Ressources externes (police + librairie PDF) mises en cache dès l'installation
// pour que l'export PDF fonctionne aussi hors-ligne après la première visite en ligne.
const EXTERNAL_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Les fichiers locaux doivent réussir ; les ressources externes sont "best effort"
      // (si le premier lancement est hors-ligne, l'app shell marche quand même).
      return cache.addAll(APP_SHELL).then(() =>
        Promise.allSettled(
          EXTERNAL_ASSETS.map((url) =>
            fetch(url, { mode: 'cors' })
              .then((resp) => resp.ok && cache.put(url, resp))
              .catch(() => {})
          )
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Stratégie : cache d'abord, puis réseau (et on met à jour le cache en arrière-plan)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached); // hors-ligne : on retombe sur le cache

      return cached || networkFetch;
    })
  );
});
