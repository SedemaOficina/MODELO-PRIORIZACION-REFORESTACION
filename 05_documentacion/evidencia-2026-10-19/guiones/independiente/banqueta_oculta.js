// Banqueta «sin» elegida con Alcaldías y después solo Gobierno Central: ¿qué dice la pantalla y qué queda en la dirección?
// Uso: node banqueta_oculta.js <docs> <salida.json>
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium } = require(path.join('X:/r7/node_modules/playwright'));
const [DOCS, OUT] = process.argv.slice(2);
const TIP = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.bin': 'application/octet-stream', '.png': 'image/png', '.woff2': 'font/woff2' };
function servidor() { const s = http.createServer((q, r) => { let rel = decodeURIComponent(q.url.split('?')[0]); if (rel.endsWith('/')) rel += 'index.html'; const p = path.join(DOCS, rel);
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TIP[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  return new Promise(ok => s.listen(0, '127.0.0.1', () => { s.url = `http://127.0.0.1:${s.address().port}/`; ok(s); })); }
const lee = () => { document.querySelectorAll('details').forEach(d => d.open = true); const T = s => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; };
  return { url: location.search, banqVisible: !document.getElementById('banq-row').hidden, kpis: T('#kpis'), reparto: T('#reparto'), mapsum: T('#mapsum'),
    tabla: [...document.querySelectorAll('#reparto table.reparto tr')].map(tr => [...tr.children].map(c => c.innerText.trim()).join(' | ')) }; };
(async () => {
  const srv = await servidor(); const br = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const res = {};
  for (const vuelta of [1, 2]) {
    const ctx = await br.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-MX', serviceWorkers: 'block' });
    await ctx.addInitScript(() => { window.SIA_PRUEBA = true; try { localStorage.setItem('cp_inicio', 'ciudad'); localStorage.setItem('cp_recorrido', 'visto'); } catch (e) {} });
    const page = await ctx.newPage(); page.setDefaultTimeout(180000);
    await page.goto(srv.url + '?modo=ligero&a=007#nomap'); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(800);
    await page.evaluate(() => document.getElementById('tab-res').click());
    const r = {};
    await page.evaluate(() => document.querySelector('button[data-gc], button[data-resp="gc"]').click()); await page.waitForTimeout(500);   // las dos redes
    await page.evaluate(() => document.querySelector('button[data-resp="alc"]').click()); await page.waitForTimeout(600);   // solo Gobierno Central
    r.gc_sin_filtro = await page.evaluate(lee);
    await page.evaluate(() => document.querySelector('button[data-resp="alc"]').click()); await page.waitForTimeout(500);   // de nuevo las dos
    await page.evaluate(() => document.querySelector('button[data-resp="gc"]').click()); await page.waitForTimeout(500);   // solo alcaldías
    await page.evaluate(() => document.querySelector('button[data-banq="sin"]').click()); await page.waitForTimeout(600);
    r.alc_banqueta_sin = await page.evaluate(lee);
    await page.evaluate(() => document.querySelector('button[data-resp="gc"]').click()); await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelector('button[data-resp="alc"]').click()); await page.waitForTimeout(600);
    r.gc_tras_banqueta_sin = await page.evaluate(lee);
    await page.reload(); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(800); await page.evaluate(() => document.getElementById('tab-res').click()); await page.waitForTimeout(300);
    r.gc_tras_recargar = await page.evaluate(lee);
    await page.goto(srv.url + '?modo=ligero&r=gc&a=007&b=sin#nomap'); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(800); await page.evaluate(() => document.getElementById('tab-res').click()); await page.waitForTimeout(300);
    r.enlace_r_gc_b_sin = await page.evaluate(lee);
    res['vuelta' + vuelta] = r; await ctx.close();
  }
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1)); await br.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
