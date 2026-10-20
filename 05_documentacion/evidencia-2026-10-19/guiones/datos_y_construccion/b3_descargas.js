// B2/B3 · Para cada consulta, pide cada descarga visible y guarda el archivo; mide el tiempo y cuántos ciclos de 50 ms
// logra correr la página mientras arma el archivo (si baja de ~50 % la pantalla se congela).
// Uso: node b3_descargas.js <docs> <carpeta salida> "<consulta>" ... (ancho opcional: ANCHO=390 para celular)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PW_DIR || 'X:/r1/node_modules/playwright');
const [DOCS, SAL, ...CONSULTAS] = process.argv.slice(2); fs.mkdirSync(SAL, { recursive: true });
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.bin': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { let rel = decodeURIComponent(q.url.split('?')[0]); if (rel.endsWith('/')) rel += 'index.html';
  const p = path.join(DOCS, rel); if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TIPOS[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
const BOTONES = ['dl-frentes', 'dl-calles', 'dl-tramos', 'dl-avenidas', 'dl-calle', 'dl-ficha-calle', 'dl-ficha-vpalc', 'dl-ficha-av', 'dl-ficha-alc', 'dl-ficha', 'dl-kml', 'dl-geojson'];
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const res = [];
  const ancho = +process.env.ANCHO || 1440;
  for (const c of CONSULTAS) {
    const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: ancho, height: ancho < 800 ? 844 : 900 }, isMobile: ancho < 800, hasTouch: ancho < 800, locale: 'es-MX', serviceWorkers: 'block' });
    await ctx.addInitScript(() => { window.SIA_PRUEBA = true; try { localStorage.setItem('cp_inicio', 'ciudad'); localStorage.setItem('cp_recorrido', 'visto'); } catch (e) {} });
    const page = await ctx.newPage(); const err = []; page.on('pageerror', e => err.push(e.message)); page.on('console', m => { if (m.type() === 'error') err.push(m.text()); });
    await page.goto(base + '?modo=ligero&' + c + '#nomap'); await page.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 300000 }); await page.waitForTimeout(2500);
    const vis = await page.evaluate(ids => ids.filter(i => { const b = document.getElementById(i); return b && !b.hidden && !b.disabled; }), BOTONES);
    const dir = path.join(SAL, c.replace(/[^a-z0-9=,]+/gi, '_')); fs.mkdirSync(dir, { recursive: true });
    for (const id of vis) {
      await page.evaluate(() => { window.__ticks = 0; window.__tk = setInterval(() => window.__ticks++, 50); });
      const t0 = Date.now();
      const [d] = await Promise.all([page.waitForEvent('download', { timeout: 240000 }).catch(() => null), page.evaluate(i => document.getElementById(i).click(), id)]);
      const ms = Date.now() - t0; const ticks = await page.evaluate(() => { clearInterval(window.__tk); return window.__ticks; });
      const st = await page.evaluate(() => (document.getElementById('dl-status') || {}).innerText || '');
      if (!d) { res.push({ consulta: c, id, nombre: null, ms, ticks, estado: st }); console.log(c, id, 'SIN DESCARGA', st); continue; }
      const nombre = d.suggestedFilename(); const ruta = path.join(dir, nombre); await d.saveAs(ruta);
      const r = { consulta: c, id, nombre, ruta, bytes: fs.statSync(ruta).size, ms, ticks, esperados: Math.round(ms / 50), estado: st }; res.push(r);
      console.log(c, id, nombre, r.bytes, 'B', ms, 'ms', 'ciclos', ticks, '/', r.esperados); await page.waitForTimeout(800);
    }
    res.push({ consulta: c, errores: err });
    await ctx.close();
  }
  fs.writeFileSync(path.join(SAL, 'descargas.json'), JSON.stringify(res, null, 1)); await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(2); });
