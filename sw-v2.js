const CACHE_NAME = 'budget-app-v2';
const ASSETS = [
  '/BudgetTest/',
  '/BudgetTest/index.html',
  '/BudgetTest/manifest.json',
  '/BudgetTest/icons/icon-192.png',
  '/BudgetTest/icons/icon-512.png',
  '/BudgetTest/css/variables.css',
  '/BudgetTest/css/styles.css',
  '/BudgetTest/css/header.css',
  '/BudgetTest/css/sidebar.css',
  '/BudgetTest/css/dashboard.css',
  '/BudgetTest/css/transactions.css',
  '/BudgetTest/css/categories.css',
  '/BudgetTest/css/reports.css',
  '/BudgetTest/css/settings.css',
  '/BudgetTest/css/colorPicker.css',
  '/BudgetTest/css/debts.css',
  '/BudgetTest/js/app.js',
  '/BudgetTest/js/routes.js',
  '/BudgetTest/js/storage.js',
  '/BudgetTest/js/modal.js',
  '/BudgetTest/js/toast.js',
  '/BudgetTest/js/colorPicker.js',
  '/BudgetTest/js/dateHelpers.js',
  '/BudgetTest/js/dashboard.js',
  '/BudgetTest/js/transactions.js',
  '/BudgetTest/js/categories.js',
  '/BudgetTest/js/debts.js',
  '/BudgetTest/js/reports.js',
  '/BudgetTest/js/settings.js',
  '/BudgetTest/templates/dashboard.html',
  '/BudgetTest/templates/transactions.html',
  '/BudgetTest/templates/categories.html',
  '/BudgetTest/templates/debts.html',
  '/BudgetTest/templates/reports.html',
  '/BudgetTest/templates/settings.html',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Кэширование ресурсов v2');
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

  // Стратегия: Сначала из кэша, если нет — запрос в сеть
  event.respondWith(
    caches.match(request)
      .then(cached => cached || fetch(request))
  );
});