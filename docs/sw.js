// Generado por 02_fuente/construir.py a partir de 02_fuente/construir.py. No editar aquí.
const CACHE = 'calles-7f9223f574';
const PRE = ["./", "config.js?v=b34f613f36", "app.js?v=7658036666", "estilos.css?v=0bff053fc8", "libs/deck.js?v=39eac2ebde", "libs/pako.js?v=f0b2d4965e", "libs/xlsx.js", "libs/jspdf.js", "libs/excel_worker.js", "datos/data.bin?v=0d38f09868", "datos/meta.bin?v=256168c7a0", "datos/vp.bin?v=953fb39b79", "fuentes/cabin.woff2?v=51380ccf10", "fuentes/roboto.woff2?v=0722b859b4", "img/logo_sedema_reforestacion.png?v=5f36e23ee5", "img/composicion_frentes_manzana.jpg?v=fc3c72613c"];
const sirve = r => r && r.ok && !r.redirected && r.type === 'basic';
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => Promise.all(PRE.map(u => fetch(u, {cache: 'reload'}).then(r => sirve(r) ? c.put(u, r) : null).catch(() => null)))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('calles-') && k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', e => { const q = e.request; if (q.method !== 'GET' || new URL(q.url).origin !== location.origin) return;
  if (q.mode === 'navigate') { e.respondWith(fetch(q).then(r => { if (sirve(r)) { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./', cp)); } return r; }).catch(() => caches.open(CACHE).then(c => c.match('./')).then(m => m || Response.error()))); return; }
  e.respondWith(caches.open(CACHE).then(c => c.match(q)).then(m => m || fetch(q))); });
