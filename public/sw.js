// Service Worker для LumberTrack AI PWA
const CACHE_NAME = 'lumbertrack-ai-v3';
const STATIC_CACHE_NAME = 'lumbertrack-ai-static-v3';
const DYNAMIC_CACHE_NAME = 'lumbertrack-ai-dynamic-v3';

// Файли для кешування при установке
// Примечание: Vite генерирует файлы с хешами в production, поэтому кешируем только базовые файлы
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  // Пропускаем не-GET запросы
  if (event.request.method !== 'GET') {
    return;
  }

  // Пропускаем запросы к внешним API (Google Sheets, Gemini API, Telegram)
  // Не перехватываем их вообще - пусть обрабатываются напрямую браузером
  try {
    const url = new URL(event.request.url);
    if (
      url.hostname.includes('script.google.com') ||
      url.hostname.includes('generativelanguage.googleapis.com') ||
      url.hostname.includes('api.telegram.org') ||
      url.hostname.includes('esm.sh') ||
      url.hostname.includes('cdn.tailwindcss.com')
    ) {
      // Для внешних API не перехватываем запрос - пусть обрабатывается напрямую
      // Это гарантирует, что ошибки сети будут правильно переданы в приложение
      return;
    }
  } catch (e) {
    // Если не удалось распарсить URL, пропускаем
    return;
  }

  // Для статических файлов используем стратегию Cache First
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // Если нет в кеше, делаем запрос
      return fetch(event.request).then((response) => {
        // Клонируем ответ перед кешированием
        const responseToCache = response.clone();

        // Кешируем только успешные ответы
        if (response.status === 200) {
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return response;
      }).catch(() => {
        // Если офлайн и нет в кеше, возвращаем базовую страницу
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

