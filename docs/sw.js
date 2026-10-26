// Generado por 02_fuente/construir.py a partir de 02_fuente/construir.py. No editar aquí.
const CACHE = 'calles-44c61b9b23';
const PRE = ["./", "config.js?v=5fecc413f5", "app.js?v=6d53e7c980", "estilos.css?v=72aa418984", "libs/deck.js?v=39eac2ebde", "libs/pako.js?v=f0b2d4965e", "libs/xlsx.js?v=56e27b479a", "libs/jspdf.js?v=5aaf5dee4f", "libs/excel_worker.js?v=f5508c5d90&x=56e27b479a", "datos/calles.bin?v=1a419445f9", "datos/data.bin?v=d7dd0a6e94", "datos/meta.bin?v=256168c7a0", "datos/vp.bin?v=953fb39b79", "datos/fondo/fondo_base.bin?v=859291d53d", "datos/inventario/espacios_frentes.bin?v=e3a1475aef", "datos/inventario/espacios_vp.bin?v=e5bc242153", "datos/inventario/inv_002.bin?v=a8440fad9b", "datos/inventario/inv_003.bin?v=3fd23e072c", "datos/inventario/inv_004.bin?v=a8c2a5e450", "datos/inventario/inv_005.bin?v=22b31ac5c8", "datos/inventario/inv_006.bin?v=eede794969", "datos/inventario/inv_007.bin?v=40b47a9856", "datos/inventario/inv_008.bin?v=9e60623b3b", "datos/inventario/inv_009.bin?v=29e12c7c70", "datos/inventario/inv_010.bin?v=d91d310844", "datos/inventario/inv_011.bin?v=9414648401", "datos/inventario/inv_012.bin?v=3043e57d7a", "datos/inventario/inv_013.bin?v=19a29b1e7e", "datos/inventario/inv_014.bin?v=980c663972", "datos/inventario/inv_015.bin?v=9f9e93bb9d", "datos/inventario/inv_016.bin?v=4e331ebdd3", "datos/inventario/inv_017.bin?v=3754a76fdb", "fuentes/cabin.woff2?v=51380ccf10", "fuentes/roboto.woff2?v=0722b859b4", "img/logo_institucional.png?v=a79d63f8b4", "img/composicion_frentes_manzana.jpg?v=fc3c72613c"];
const sirve = r => r && r.ok && !r.redirected && r.type === 'basic';
// Todo o nada: si un archivo no llega, la copia nueva se borra y la instalación falla, así sigue la versión anterior con su copia completa.
// Los archivos llevan su huella en la dirección: se toman de la caché del navegador si la página ya los bajó; la página, que no la lleva, se
// revalida con el servidor.
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => Promise.all(PRE.map(u => fetch(u, {cache: u === './' ? 'no-cache' : 'default'})
  .then(r => { if (!sirve(r)) throw new Error(u + ': ' + r.status); return c.put(u, r); }))))
  .then(() => self.skipWaiting(), err => caches.delete(CACHE).then(() => { throw err; }))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('calles-') && k !== CACHE).map(k => caches.delete(k))))));
// La página se pide a la red y, sin red, sale la de la copia. La de la red no se guarda: la copia queda como se instaló, con su página y sus
// archivos de la misma versión (una página nueva en la copia vieja pediría archivos que no están en ella).
self.addEventListener('fetch', e => { const q = e.request; if (q.method !== 'GET' || new URL(q.url).origin !== location.origin) return;
  if (q.mode === 'navigate') { e.respondWith(fetch(q).catch(() => caches.open(CACHE).then(c => c.match('./')).then(m => m || Response.error()))); return; }
  e.respondWith(caches.open(CACHE).then(c => c.match(q)).then(m => m || fetch(q))); });
