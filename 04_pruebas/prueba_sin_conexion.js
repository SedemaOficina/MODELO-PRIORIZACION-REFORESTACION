// Sin conexión y peso (v1.41, bloque 5 de la auditoría del 19 de octubre de 2026). La red se corta en el servidor (deja de responder),
// no con setOffline de Playwright, que no corta los pedidos del proceso de servicio (A1-03). Revisa:
//  1) peso de la primera visita en teléfono con el proceso de servicio: cada archivo se pide una sola vez y el total, comprimido como lo
//     entrega GitHub Pages, cabe en el presupuesto de 6.5 MB (B6-02);
//  2) sin red: la herramienta abre, el inventario de arbolado se dibuja y el filtro «Espacio» funciona (decisión 7), y salen el Excel y la
//     ficha PDF. Control: si se quita data.bin de la copia, sin red ya no abre (así se sabe que la prueba usa la copia y no la red);
//  3) ciclo de versión (B6-01): se publica una versión nueva y la red falla de tres maneras (A: no falla; B: la página nueva llega pero
//     sw.js no; C: data.bin se corta mientras se guarda la versión nueva). Después, sin red, la herramienta abre completa y sin errores;
//  4) precarga (B8-01): data, meta y vp se piden una sola vez al abrir, en Chromium y en WebKit (este, solo si ya está instalado).
// Uso: node 04_pruebas/prueba_sin_conexion.js   (PARTES=1,3,4 por omisión; la 2 va dentro de la 1)
const L = require('./lib_pruebas.js'); const fs = require('fs'), path = require('path'), os = require('os'), http = require('http'), zlib = require('zlib');
const ok = L.Registro('sin conexión'); const D = L.decodificar(); const M = D.META;
const SAL = fs.mkdtempSync(path.join(os.tmpdir(), 'sinred-'));
const PARTES = (process.env.PARTES || '1,3,4').split(',');
const MB = 1048576, PRESUPUESTO = 6.5 * MB;
const SW = fs.readFileSync(path.join(L.DOCS, 'sw.js'), 'utf8');
const PRE = JSON.parse(SW.match(/const PRE = (\[.*\]);/)[1]), CACHE = SW.match(/const CACHE = '([^']+)'/)[1];
const IZT = M.munNames.indexOf('Iztapalapa');
const BORDE = { longitude: -99.0915, latitude: 19.3745 };   // Iztapalapa, junto a Iztacalco y Benito Juárez
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };

// Servidor como GitHub Pages: comprime el texto (html, js, css), no los .bin (ya van en gzip) ni las tipografías, deja guardar 10 min y
// responde 304 (sin cuerpo; no cuenta como pedido) cuando el navegador ya tiene el archivo y lo revalida.
// S.caido corta toda conexión (sin red); S.falla(rel) corta solo esa dirección; S.raiz cambia de versión publicada.
function servidor(raiz) {
  const S = { raiz, caido: false, falla: null, pedidos: [], bytes: 0, caidos: 0 };
  S.srv = http.createServer((req, res) => {
    if (S.caido) { S.caidos++; req.socket.destroy(); return; }
    let rel = decodeURIComponent(req.url.split('?')[0]); if (rel.endsWith('/')) rel += 'index.html';
    if (S.falla && S.falla(rel)) { if (S.falla.codigo) { res.writeHead(S.falla.codigo); return res.end(); } req.socket.destroy(); return; }
    const ruta = path.join(S.raiz, rel); if (!ruta.startsWith(S.raiz) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) { res.writeHead(404); return res.end(); }
    const st = fs.statSync(ruta), etag = `"${st.size}-${Math.round(st.mtimeMs)}"`; if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ETag: etag }); return res.end(); }
    const ext = path.extname(ruta); let cuerpo = fs.readFileSync(ruta); const h = { 'Content-Type': TIPOS[ext] || 'application/octet-stream', 'Cache-Control': 'max-age=600', ETag: etag };
    if (/^\.(html|js|css|md|txt)$/.test(ext) && /gzip/.test(req.headers['accept-encoding'] || '')) { cuerpo = zlib.gzipSync(cuerpo); h['Content-Encoding'] = 'gzip'; }
    h['Content-Length'] = cuerpo.length; S.pedidos.push(rel); S.bytes += cuerpo.length; res.writeHead(200, h); res.end(cuerpo); });
  return new Promise(r => S.srv.listen(0, () => { S.url = `http://localhost:${S.srv.address().port}/`; r(S); })); }
// vacía la caché HTTP del navegador (no la copia del proceso de servicio): sin red, lo que abra tiene que salir de la copia
const sinCacheHttp = async p => { const c = await p.context().newCDPSession(p); await c.send('Network.clearBrowserCache'); await c.detach(); };
const cuenta = lista => lista.reduce((m, u) => (m[u] = (m[u] || 0) + 1, m), {});

// la «versión nueva»: la misma copia con config.js distinto (marca SIA_PRUEBA_VERSION), su huella nueva en index.html y en sw.js y otro
// nombre de copia, como lo dejaría construir.py
function versionNueva() {
  // copia archivo por archivo: fs.cpSync cierra Node 24 sin aviso en la carpeta de OneDrive
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-nueva-'));
  const copia = (de, a) => { fs.mkdirSync(a, { recursive: true }); for (const e of fs.readdirSync(de, { withFileTypes: true })) { const x = path.join(de, e.name), y = path.join(a, e.name); if (e.isDirectory()) copia(x, y); else fs.copyFileSync(x, y); } };
  copia(L.DOCS, dir);
  const cfg = path.join(dir, 'config.js'); fs.appendFileSync(cfg, "\nwindow.SIA_PRUEBA_VERSION = 'nueva';\n");
  const h = (SW.match(/"config\.js\?v=([0-9a-f]+)"/) || [])[1]; if (!h) throw new Error('sw.js sin config.js?v=');
  for (const f of ['index.html', 'sw.js']) { const p = path.join(dir, f); let t = fs.readFileSync(p, 'utf8'); if (!t.includes('config.js?v=' + h)) throw new Error(f + ' sin config.js?v=' + h);
    t = t.split('config.js?v=' + h).join('config.js?v=' + h + 'n'); if (f === 'sw.js') t = t.replace(`const CACHE = '${CACHE}'`, `const CACHE = '${CACHE}n'`); fs.writeFileSync(p, t); }
  return dir; }

const contextoSW = (b, op = {}) => b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'es-MX', serviceWorkers: 'allow', acceptDownloads: true, ...op })
  .then(async ctx => { await L.sinEntrada(ctx); await ctx.addInitScript(() => { window.SIA_PRUEBA = true; }); return ctx; });
// abre la página y espera a que cargue (o al aviso con «Reintentar»); devuelve también los errores de la página
async function abre(ctx, url, espera = 120000) { const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message));
  let fin = 'nada'; try { await p.goto(url, { timeout: 30000 });
    fin = await Promise.race([p.waitForSelector('#loader[hidden]', { state: 'attached', timeout: espera }).then(() => 'cargo'), p.waitForSelector('#loader .reintenta', { timeout: espera }).then(() => 'aviso')]); } catch (e) { fin = 'no abrió: ' + e.message.split('\n')[0]; }
  const est = await p.evaluate(async () => { const n = {}; for (const k of await caches.keys()) n[k] = (await (await caches.open(k)).keys()).length;
    return { version: window.SIA_PRUEBA_VERSION || 'vieja', caches: n, sw: navigator.serviceWorker.controller ? 'con' : 'sin' }; }).catch(e => ({ error: e.message.split('\n')[0] }));
  return { p, fin, err, est }; }
// espera a que la copia «nombre» tenga al menos n archivos y sea la única
async function esperaCopia(p, nombre, n) { for (let k = 0; k < 240; k++) { const r = await p.evaluate(async ([nm, n]) => { const ks = await caches.keys(); if (!ks.includes(nm)) return null;
    const c = (await (await caches.open(nm)).keys()).length; return c >= n && ks.length === 1 ? { nombre: nm, archivos: c } : null; }, [nombre, n]).catch(() => null); if (r) return r; await p.waitForTimeout(500); }
  return null; }
// que funcione: Excel de la lista de calles de Iztapalapa
async function funciona(p) { try { await p.selectOption('#alc', String(IZT)); await p.waitForTimeout(800); const d = await L.descargar(p, '#dl-calles', SAL, 60000); return d ? d.nombre : 'sin descarga'; } catch (e) { return 'error: ' + e.message.split('\n')[0]; } }

(async () => {
  const browser = await L.lanzar();

  // ---------- 1) peso de la primera visita con el proceso de servicio ----------
  // (con la dirección del sitio tal cual, como la abre la gente: la copia guarda la página con esa dirección y la revalida sin volver a bajarla)
  if (PARTES.includes('1')) { const S = await servidor(L.DOCS); const ctx = await contextoSW(browser); const a = await abre(ctx, S.url);
    const copia = await esperaCopia(a.p, CACHE, PRE.length); await a.p.waitForTimeout(3000);
    const veces = cuenta(S.pedidos), dobles = Object.entries(veces).filter(([u, n]) => n > 1 && u !== '/sw.js').map(([u, n]) => `${u} ×${n}`);
    ok('primera visita: la herramienta abre y guarda su copia para usarse sin conexión', a.fin === 'cargo' && !!copia, `${a.fin} · ${JSON.stringify(copia)} de ${PRE.length}`);
    ok('primera visita: cada archivo se pide una sola vez (la copia aprovecha lo que ya bajó la página)', !dobles.length, dobles.join(', ') || `${S.pedidos.length} pedidos`);
    ok(`primera visita con la copia sin conexión: ${(PRESUPUESTO / MB).toFixed(1)} MB o menos, comprimido como en GitHub Pages`, S.bytes <= PRESUPUESTO, `${(S.bytes / MB).toFixed(2)} MB en ${S.pedidos.length} pedidos`);
    const txtCarga = fs.readFileSync(path.join(L.DOCS, 'index.html'), 'utf8').match(/Descargando la herramienta y sus datos \((\d+) MB la primera vez\)/);
    ok('el cargador anuncia lo que se baja la primera vez (a 1 MB)', !!txtCarga && Math.abs(+txtCarga[1] - S.bytes / MB) <= 1, `anuncia ${txtCarga && txtCarga[1]} MB; se bajaron ${(S.bytes / MB).toFixed(2)} MB`);

    // ---------- 2) sin red ----------
    await sinCacheHttp(a.p); await a.p.close(); S.caido = true; S.caidos = 0;
    const b = await abre(ctx, S.url + '?modo=ligero');
    ok('sin red: la herramienta abre desde la copia', b.fin === 'cargo' && !b.err.length, `${b.fin} · ${b.err.slice(0, 2).join(' | ')}`);
    if (b.fin === 'cargo') {
      await b.p.evaluate(v => window.__MAPA.ir({ ...v, zoom: 16.4 }, 0), BORDE);
      await b.p.waitForFunction(() => window.__INV.pendientes() === 0 && (window.__INV.cargadas().length + window.__INV.fallas().length) > 0, null, { timeout: 60000 }).catch(() => {});
      const inv = await b.p.evaluate(() => ({ cargadas: window.__INV.cargadas(), fallas: window.__INV.fallas(), capas: window.__INV.capas().map(c => c.n) }));
      ok('sin red: el inventario de arbolado se dibuja (espacios para plantar)', inv.cargadas.includes('007') && !inv.fallas.length && inv.capas.some(n => n > 0), JSON.stringify(inv));
      await b.p.evaluate(() => document.getElementById('tab-res').click()); await b.p.waitForTimeout(300);
      await b.p.$eval('button[data-esp="0"]', x => x.click());
      await b.p.waitForFunction(() => window.__INV.esp().cargado || /No fue posible/.test(document.getElementById('esp-aviso').textContent), null, { timeout: 30000 }).catch(() => {});
      const esp = await b.p.evaluate(() => ({ ...window.__INV.esp(), aviso: document.getElementById('esp-aviso').textContent }));
      ok('sin red: el filtro «Espacio» funciona', esp.cargado && esp.filtro, `${esp.cargado} · ${esp.aviso.slice(0, 120)}`);
      await b.p.$eval('button[data-esp="0"]', x => x.click()); await b.p.waitForTimeout(300);
      const x = await funciona(b.p); ok('sin red: sale el Excel (no CSV)', /\.xlsx$/.test(x), x);
      const f = await L.descargar(b.p, '#dl-ficha-alc', SAL, 60000).catch(() => null); ok('sin red: sale la ficha PDF', !!f && /\.pdf$/.test(f.nombre) && f.bytes > 20000, f && f.nombre);
    }
    ok('sin red: los pedidos sí llegaban al servidor y se cortaron (la prueba no usa setOffline)', S.caidos > 0 || b.fin === 'cargo', `${S.caidos} pedidos cortados`);
    await b.p.close();
    // control: sin data.bin en la copia, sin red no puede abrir
    { const d = await abre(ctx, S.url + '?modo=ligero', 5000); await d.p.evaluate(async () => { for (const k of await caches.keys()) { const c = await caches.open(k); for (const q of await c.keys()) if (/data\.bin/.test(q.url)) await c.delete(q); } }).catch(() => {}); await sinCacheHttp(d.p); await d.p.close();
      const e = await abre(ctx, S.url + '?modo=ligero', 30000);
      ok('control: si se quita data.bin de la copia, sin red no abre (la prueba sí depende de la copia)', e.fin !== 'cargo', e.fin); await e.p.close(); }
    await ctx.close(); S.srv.close(); }

  // ---------- 3) ciclo de versión ----------
  const NUEVA = PARTES.includes('3') ? versionNueva() : null;
  for (const esc of NUEVA ? ['A', 'B', 'C'] : []) {
    const S = await servidor(L.DOCS); const ctx = await contextoSW(browser); const U = S.url + '?modo=ligero';
    const a = await abre(ctx, U); const c1 = await esperaCopia(a.p, CACHE, PRE.length); await a.p.close();
    S.raiz = NUEVA;   // se publica la versión nueva
    if (esc === 'B') { S.falla = rel => rel === '/sw.js'; S.falla.codigo = 404; }
    if (esc === 'C') { S.falla = rel => rel === '/datos/data.bin'; const q = await ctx.newPage(); await sinCacheHttp(q); await q.close(); }   // que data.bin tenga que pedirse al servidor
    const b = await abre(ctx, U); const c2 = esc === 'A' ? await esperaCopia(b.p, CACHE + 'n', PRE.length) : (await b.p.waitForTimeout(6000), null); await b.p.close();
    { const q = await ctx.newPage(); await sinCacheHttp(q); await q.close(); }
    S.falla = null; S.caido = true;
    const c = await abre(ctx, U); const x = c.fin === 'cargo' ? await funciona(c.p) : 'no cargó';
    const desc = { A: 'normal', B: 'la página nueva llega pero sw.js no', C: 'data.bin se corta mientras se guarda la versión nueva' }[esc];
    ok(`ciclo de versión ${esc} (${desc}): después, sin red, la herramienta abre completa y funciona`, !!c1 && c.fin === 'cargo' && !c.err.length && /\.xlsx$/.test(x) && (esc !== 'A' || c.est.version === 'nueva'),
      `copia 1 ${!!c1} · ${esc === 'A' ? 'copia nueva ' + !!c2 + ' · ' : ''}${c.fin} · versión ${c.est.version} · copias ${JSON.stringify(c.est.caches)} · Excel ${x} · ${c.err.slice(0, 2).join(' | ')}`);
    await c.p.close();
    if (esc === 'C') {   // al volver la red, la versión nueva se guarda completa
      S.caido = false; const d = await abre(ctx, U); const c4 = await esperaCopia(d.p, CACHE + 'n', PRE.length); await d.p.close();
      ok('ciclo de versión C: al volver la red, la versión nueva se guarda completa y reemplaza a la anterior', !!c4, JSON.stringify(c4)); }
    await ctx.close(); S.srv.close(); }
  if (NUEVA) try { fs.rmSync(NUEVA, { recursive: true, force: true }); } catch (e) {}
  await browser.close();

  // ---------- 4) precarga: data, meta y vp una sola vez ----------
  const PW = require('playwright');
  const motores = [['Chromium', () => L.lanzar()], ['WebKit', async () => { try { return await PW.webkit.launch(); } catch (e) {
    const p = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'webkit-2359', 'Playwright.exe'); if (fs.existsSync(p)) return PW.webkit.launch({ executablePath: p }); return null; } }]];
  for (const [nombre, lanza] of PARTES.includes('4') ? motores : []) { const b = await lanza(); if (!b) { console.log(`OMITIDA precarga en ${nombre}: no está instalado (no se descarga)`); continue; }
    const S = await servidor(L.DOCS); const ctx = await b.newContext({ serviceWorkers: 'block', locale: 'es-MX', viewport: { width: 1440, height: 900 } }); await L.sinEntrada(ctx);
    const p = await ctx.newPage(); await p.goto(S.url + '?modo=ligero').catch(() => {}); await p.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 120000 }).catch(() => {}); await p.waitForTimeout(3000);
    const v = cuenta(S.pedidos.filter(u => /^\/datos\/(data|meta|vp)\.bin$/.test(u)));
    ok(`precarga en ${nombre}: data, meta y vp se piden una sola vez`, ['data', 'meta', 'vp'].every(n => v[`/datos/${n}.bin`] === 1), JSON.stringify(v));
    await b.close(); S.srv.close(); }

  process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
