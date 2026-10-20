// B6 · Peso de la primera visita en teléfono, con y sin el proceso de servicio (bytes servidos por un servidor propio). Uso: node peso.js
const C = require('./comun.js'); const { L, path, fs } = C; const http = require('http'); const DOCS = path.resolve(process.env.DOCS);
let B = []; const srv = http.createServer((req, res) => { let rel = decodeURIComponent(req.url.split('?')[0]); if (rel.endsWith('/')) rel += 'index.html'; const ruta = path.join(DOCS, rel);
  if (!fs.existsSync(ruta)) { res.writeHead(404); return res.end(); } const st = fs.statSync(ruta); B.push({ u: req.url.split('?')[0], b: st.size });
  res.writeHead(200, { 'Content-Type': rel.endsWith('.html') ? 'text/html; charset=utf-8' : rel.endsWith('.js') ? 'application/javascript' : rel.endsWith('.css') ? 'text/css' : 'application/octet-stream', 'Content-Length': st.size }); fs.createReadStream(ruta).pipe(res); });
(async () => { await new Promise(r => srv.listen(0, r)); const U = `http://localhost:${srv.address().port}/`; const b = await L.lanzar();
  for (const sw of [false, true, true]) { B = []; const ctx = await C.contexto(b, C.ANCHOS[1], { sw }); const p = await C.pagina(ctx, U);
    if (sw) await p.evaluate(async () => { await navigator.serviceWorker.ready; for (let k = 0; k < 120; k++) { const ks = await caches.keys(); if (ks.length && (await (await caches.open(ks[0])).keys()).length >= 17) return; await new Promise(r => setTimeout(r, 500)); } });
    await p.waitForTimeout(2000); const t = B.reduce((s, x) => s + x.b, 0); const top = {}; B.forEach(x => top[x.u] = (top[x.u] || 0) + x.b);
    console.log(sw ? 'CON proceso de servicio' : 'SIN proceso de servicio', (t / 1048576).toFixed(2), 'MB en', B.length, 'pedidos ·', Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([u, v]) => u + ' ' + (v / 1048576).toFixed(2)).join(', ')); await ctx.close(); }
  await b.close(); srv.close(); })();
