const SHELL = 'noor-shell-v1', RUNTIME = 'noor-runtime-v1';
const ASSETS = ['./', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => ![SHELL, RUNTIME].includes(k)).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isApi = ['api.alquran.cloud', 'mp3quran.net'].includes(url.hostname);
  const isMedia = ['static.qurancdn.com', 'cdn.islamic.network', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname);

  if (isApi || isMedia) {
    // cache-first: يُحفظ كل ما تقرؤه للاستخدام دون اتصال
    e.respondWith(caches.open(RUNTIME).then(async c => {
      const hit = await c.match(e.request);
      const net = fetch(e.request).then(res => {
        if (res && res.ok) c.put(e.request, res.clone());
        return res;
      }).catch(() => hit);
      return hit || net;
    }));
  } else if (url.origin === location.origin) {
    // network-first لغلاف التطبيق مع عودة للذاكرة
    e.respondWith(fetch(e.request).then(res => {
      const cp = res.clone();
      caches.open(SHELL).then(c => c.put(e.request, cp));
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./'))));
  }
});