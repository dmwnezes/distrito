// Deixa o jogo funcionando offline depois da primeira visita ao site.
const CACHE = 'distrito-v1';
const FILES = ['./', 'index.html', 'css/style.css', 'manifest.webmanifest', 'icon.png', 'icon192.png',
  'js/util.js', 'js/data.js', 'js/sprites.js', 'js/world.js', 'js/render.js', 'js/sim.js', 'js/audio.js', 'js/save.js', 'js/ui.js', 'js/main.js'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
// rede primeiro (pega atualizações), cache se estiver sem internet
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
