// D4 · Peso y velocidad · biblioteca común de los guiones de medición (solo lee R/docs; no modifica nada).
// Servidor local que imita a un servidor real: gzip (nivel 6, precomprimido al arrancar) para html/js/css/json/svg/txt/md
// según Accept-Encoding; .bin, .woff2, .png y .jpg tal cual (los .bin ya son gzip por dentro: no se recomprimen, como dice el
// ejemplo de nginx de 08_entrega_sia). Cabeceras de caché como el ejemplo de nginx: con ?v= → immutable 1 año; sin ?v= → no-cache.
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const R = process.env.COPIA || 'X:/r6';
const DOCS = path.join(R, 'docs');
const E = __dirname;
const { chromium } = require(R + '/node_modules/playwright');

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.bin': 'application/octet-stream' };
const TEXTO = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt', '.md']);
const GZ = new Map();   // ruta → Buffer gzip nivel 6
function servidor({ gzip = true, cache = true } = {}) {
  const s = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]); if (rel.endsWith('/')) rel += 'index.html';
    const ruta = path.join(DOCS, rel);
    if (!ruta.startsWith(DOCS) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) { res.writeHead(404); return res.end(); }
    const ext = path.extname(ruta); const h = { 'Content-Type': TIPOS[ext] || 'application/octet-stream' };
    if (cache) { const conV = /[?&]v=/.test(req.url) && !/index\.html$|\/$/.test(rel) && !/sw\.js$/.test(rel); h['Cache-Control'] = conV ? 'public, max-age=31536000, immutable' : 'no-cache'; }
    let cuerpo = fs.readFileSync(ruta);
    if (gzip && TEXTO.has(ext) && cuerpo.length >= 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
      if (!GZ.has(ruta)) GZ.set(ruta, zlib.gzipSync(cuerpo, { level: 6 }));
      cuerpo = GZ.get(ruta); h['Content-Encoding'] = 'gzip'; h['Vary'] = 'Accept-Encoding'; }
    h['Content-Length'] = cuerpo.length; res.writeHead(200, h); res.end(cuerpo);
    s.log.push({ url: req.url, bytes: cuerpo.length, enc: h['Content-Encoding'] || '' });
  });
  s.log = [];
  if (gzip) (function rec(d) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) rec(p); else if (TEXTO.has(path.extname(p))) GZ.set(p, zlib.gzipSync(fs.readFileSync(p), { level: 6 })); } })(DOCS);   // precomprimido: el servidor no tarda en la primera petición
  return new Promise(r => s.listen(0, '127.0.0.1', () => { s.url = `http://localhost:${s.address().port}/`; r(s); }));
}
// Chromium de Playwright 1.56 (ya instalado). Mismas banderas de WebGL que 04_pruebas/lib_pruebas.js (SwiftShader).
// Todo nombre que no sea localhost se resuelve como inexistente: ninguna petición sale a internet, sin interceptar
// (interceptar con route() desactiva la caché HTTP y añade retardo).
async function lanzar() {
  return chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost'] });
}
const TEL = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'es-MX' };
const REDES = {
  '3G': { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 },
  '4G lenta': { offline: false, latency: 100, downloadThroughput: 4e6 / 8, uploadThroughput: 1.5e6 / 8 },
  'sin limitar': null };
// Se inyecta antes que nada: instante en que la app marca SIA_LISTO (= #loader hidden, misma línea de 06_mapa_interaccion.js),
// tareas largas (PerformanceObserver longtask) y momento en que aparece la ventana de entrada.
const INIT = ({ prueba }) => {
  if (prueba) window.SIA_PRUEBA = true;
  window.__D4 = { lt: [], listo: null, entrada: null };
  let v; Object.defineProperty(window, 'SIA_LISTO', { configurable: true, get() { return v; }, set(x) { v = x; if (x && window.__D4.listo === null) window.__D4.listo = performance.now(); } });
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__D4.lt.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  const mo = new MutationObserver(() => { const en = document.getElementById('entrada'); if (en && !en.hidden && window.__D4.entrada === null) window.__D4.entrada = performance.now(); });
  document.addEventListener('DOMContentLoaded', () => { const en = document.getElementById('entrada'); if (en) mo.observe(en, { attributes: true, attributeFilter: ['hidden'] }); });
};
// Registro de red por CDP: inicio, fin, bytes transferidos (encodedDataLength), tipo, estado, si vino de caché, codificación
function redCDP(cdp) {
  const R = new Map(); const lista = [];
  cdp.on('Network.requestWillBeSent', e => { const r = { id: e.requestId, url: e.request.url, tipo: e.type, ini: e.timestamp, wall: Date.now() }; R.set(e.requestId, r); lista.push(r); });
  cdp.on('Network.responseReceived', e => { const r = R.get(e.requestId); if (!r) return; r.estado = e.response.status; r.mime = e.response.mimeType; r.tipo = e.type || r.tipo;
    r.enc = (e.response.headers['content-encoding'] || e.response.headers['Content-Encoding'] || ''); r.cc = e.response.headers['cache-control'] || e.response.headers['Cache-Control'] || '';
    r.deCache = !!(e.response.fromDiskCache || e.response.fromMemoryCache || e.response.fromServiceWorker || e.response.fromPrefetchCache); });
  cdp.on('Network.requestServedFromCache', e => { const r = R.get(e.requestId); if (r) r.deCache = true; });
  cdp.on('Network.loadingFinished', e => { const r = R.get(e.requestId); if (!r) return; r.fin = e.timestamp; r.bytes = e.encodedDataLength; r.wallFin = Date.now(); });
  cdp.on('Network.loadingFailed', e => { const r = R.get(e.requestId); if (!r) return; r.fin = e.timestamp; r.falla = e.errorText; r.bytes = 0; r.wallFin = Date.now(); });
  return lista;
}
const corto = u => { try { const x = new URL(u); return x.hostname === 'localhost' ? x.pathname.slice(1) + x.search : u; } catch (e) { return u; } };
// Interactividad aproximada (estilo TTI): fin de la última tarea larga después de `desde` que va seguida de `quieto` ms sin tareas largas
function tti(lt, desde, fin, quieto = 5000) { let t = desde; const xs = lt.filter(([s, d]) => s + d > desde).sort((a, b) => a[0] - b[0]);
  for (const [s, d] of xs) { if (s - t >= quieto) return t; t = Math.max(t, s + d); } return fin - t >= quieto ? t : null; }
// Carga de la máquina (todos los núcleos, incluye otros procesos y este mismo navegador) entre dos instantes
const os = require('os');
const cpuFoto = () => os.cpus().map(c => c.times);
const cpuOcupado = (a, b = cpuFoto()) => { let o = 0, t = 0; b.forEach((x, i) => { const y = a[i]; const tot = (x.user + x.nice + x.sys + x.idle + x.irq) - (y.user + y.nice + y.sys + y.idle + y.irq); t += tot; o += tot - (x.idle - y.idle); }); return Math.round(100 * o / t); };
const mediana = a => { const s = a.filter(x => x != null).slice().sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
// Bloqueo del hilo principal: suma de (duración − 50 ms) de las tareas largas que empiezan en [desde, hasta)
const bloqueo = (lt, desde, hasta) => { const t = lt.filter(([s]) => s >= desde && s < hasta); return { n: t.length, totalMs: t.reduce((a, [, d]) => a + d, 0), tbtMs: t.reduce((a, [, d]) => a + Math.max(0, d - 50), 0), maxMs: t.reduce((a, [, d]) => Math.max(a, d), 0) }; };
module.exports = { cpuFoto, cpuOcupado, tti, R, DOCS, E, chromium, servidor, lanzar, TEL, REDES, INIT, redCDP, corto, mediana, bloqueo, TEXTO };
