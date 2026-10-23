// Работа без интернета: сначала сеть (всегда свежая версия), при отсутствии сети — сохранённая копия.
const CACHE = 'sp-calc-v2.34';
const CORE = [
  './', './index.html', './orders.html', './uni.html', './uni2.html', './zebra.html', './zebra2.html', './mesh.html', './plisse.html', './vert.html', './horiz.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-64.png',
  './logo_sp-removebg-preview.png', './shema_uni-removebg-preview.png'
];

self.addEventListener('install', e => {
  // cache: 'reload' — берём свежие файлы с сайта, а не из кеша браузера
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    // no-cache: каждый раз сверяемся с сайтом (GitHub Pages разрешает браузеру держать файлы 10 минут)
    fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
