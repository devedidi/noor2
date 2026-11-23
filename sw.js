const SHELL = 'noor-shell-v2';
const RUNTIME = 'noor-runtime-v2';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks =>
      Promise.all(
        ks.filter(k => ![SHELL, RUNTIME].includes(k)).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isApi = url.hostname === 'api.alquran.cloud';
  const isAudioHost = url.hostname === 'cdn.islamic.network' || url.hostname.endsWith('mp3quran.net');
  const isMedia = isAudioHost ||
    url.hostname === 'static.qurancdn.com' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com';

  // الصوت والـ API: network-first مع رجوع للكاش (أفضل للتلاوة المتتالية)
  if (isApi || isAudioHost) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(RUNTIME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./')))
    );
    return;
  }

  // باقي الوسائط: cache-first
  if (isMedia) {
    e.respondWith(
      caches.open(RUNTIME).then(async c => {
        const hit = await c.match(e.request);
        if (hit) return hit;
        try {
          const res = await fetch(e.request);
          if (res && res.ok) c.put(e.request, res.clone());
          return res;
        } catch (err) {
          return hit || Response.error();
        }
      })
    );
    return;
  }

  // غلاف التطبيق: network-first
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(SHELL).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./')))
    );
  }
});
