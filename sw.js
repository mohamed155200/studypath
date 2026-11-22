// غيّر رقم الإصدار مع كل تحديث للتطبيق عشان الكاش القديم يتمسح
const C = 'studypath-v4';
const LOCAL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './favicon.png', './logo.png'];
const CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(C).then(async (c) => {
    await Promise.all(LOCAL.map((u) => c.add(u).catch(() => {})));
    await Promise.all(CDN.map((u) => c.add(new Request(u, { mode: 'no-cors' })).catch(() => {})));
  }));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then((hit) => {
    const net = fetch(e.request).then((r) => {
      if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(C).then((c) => c.put(e.request, cp)); }
      return r;
    }).catch(() => hit);
    return hit || net;
  }));
});
