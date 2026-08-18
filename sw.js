const CACHE_NAME = 'budget-app-v1';
const ASSETS = [
  'index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'css/variables.css',
  'css/styles.css',
  'css/header.css',
  'css/sidebar.css',
  'css/dashboard.css',
  'css/transactions.css',
  'css/categories.css',
  'css/reports.css',
  'css/settings.css',
  'css/colorPicker.css',
  'css/debts.css',
  'app.js',
  'routes.js',
  'storage.js',
  'modal.js',
  'toast.js',
  'colorPicker.js',
  'dateHelpers.js',
  'dashboard.js',
  'transactions.js',
  'categories.js',
  'debts.js',
  'reports.js',
  'settings.js',
  'templates/dashboard.html',
  'templates/transactions.html',
  'templates/categories.html',
  'templates/debts.html',
  'templates/reports.html',
  'templates/settings.html',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Кэширование ресурсов');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, cloned));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cached => cached || fetch(request))
  );
});