const CACHE_NAME = 'budget-app-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/variables.css',
  '/css/styles.css',
  '/css/components/header.css',
  '/css/components/sidebar.css',
  '/css/components/dashboard.css',
  '/css/components/transactions.css',
  '/css/components/categories.css',
  '/css/components/reports.css',
  '/css/components/settings.css',
  '/css/components/colorPicker.css',
  '/css/components/debts.css',
  '/js/app.js',
  '/js/config/routes.js',
  '/js/data/storage.js',
  '/js/components/modal.js',
  '/js/components/toast.js',
  '/js/components/colorPicker.js',
  '/js/utils/dateHelpers.js',
  '/js/modules/dashboard.js',
  '/js/modules/transactions.js',
  '/js/modules/categories.js',
  '/js/modules/debts.js',
  '/js/modules/reports.js',
  '/js/modules/settings.js',
  '/templates/dashboard.html',
  '/templates/transactions.html',
  '/templates/categories.html',
  '/templates/debts.html',
  '/templates/reports.html',
  '/templates/settings.html',
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