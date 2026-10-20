// Descarga los archivos de la herramienta en varios estados y guarda junto a ellos lo que dice la pantalla (lista de «Dónde empezar»).
// Uso: node descargas_app.js <docs> <carpeta de salida> <estados.json>
// estados.json: [{"q":"a=007&b=con&e=cv", "orden":"callescv", "botones":["dl-frentes","dl-calles",...]}]
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium } = require(path.join('X:/r7/node_modules/playwright'));
const [DOCS, OUT, LISTA] = process.argv.slice(2);
const TIP = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.bin': 'application/octet-stream', '.json': 'application/json', '.woff2': 'font/woff2' };
function servidor() { const s = http.createServer((q, r) => { let rel = decodeURIComponent(q.url.split('?')[0]); if (rel.endsWith('/')) rel += 'index.html'; const p = path.join(DOCS, rel);
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TIP[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  return new Promise(ok => s.listen(0, '127.0.0.1', () => { s.url = `http://127.0.0.1:${s.address().port}/`; ok(s); })); }
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await servidor(); const br = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-MX', serviceWorkers: 'block', acceptDownloads: true });
  await ctx.addInitScript(() => { window.SIA_PRUEBA = true; try { localStorage.setItem('cp_inicio', 'ciudad'); localStorage.setItem('cp_recorrido', 'visto'); } catch (e) {} });
  const page = await ctx.newPage(); page.setDefaultTimeout(240000); const errores = []; page.on('pageerror', e => errores.push(e.message));
  await page.goto(srv.url + '?modo=ligero#nomap'); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(800);
  const estados = JSON.parse(fs.readFileSync(LISTA, 'utf8')); const res = [];
  for (const [n, s] of estados.entries()) {
    await page.evaluate(q => { history.pushState({}, '', location.pathname + '?modo=ligero' + (q ? '&' + q : '') + '#nomap'); dispatchEvent(new PopStateEvent('popstate', { state: null })); }, s.q);
    await page.waitForTimeout(500);
    await page.waitForFunction(() => { const a = document.getElementById('esp-aviso'); return !(a && /Cargando/.test(a.textContent)); }, null, { timeout: 60000 }).catch(() => {});
    if (s.orden) { await page.evaluate(() => document.getElementById('tab-ini').click()); await page.selectOption('#ini-orden', s.orden); await page.waitForTimeout(500);
      await page.waitForFunction(() => { const a = document.getElementById('ini-carga'); return !a || a.hidden; }, null, { timeout: 60000 }).catch(() => {}); await page.waitForTimeout(300);
      for (let k = 0; k < (s.mas || 0); k++) { const v = await page.$('#ini-mas:not([hidden])'); if (!v) break; await v.click(); await page.waitForTimeout(150); } }
    const pantalla = await page.evaluate(() => ({ iniTitle: document.getElementById('ini-title').innerText, iniCount: document.getElementById('ini-count').innerText,
      orden: document.getElementById('ini-orden').value, lista: [...document.querySelectorAll('#ini-list li')].map(li => li.innerText.replace(/\s+/g, ' ').trim()),
      calle: (document.querySelector('#ini-list li.active') || {}).innerText || null }));
    const archivos = [];
    for (const b of s.botones || []) {
      const st = await page.evaluate(id => { const e = document.getElementById(id); return e ? (e.hidden ? 'oculto' : e.disabled ? 'apagado' : 'activo') : 'no existe'; }, b);
      if (st !== 'activo') { archivos.push({ boton: b, estado: st }); continue; }
      const t0 = Date.now();
      const [d] = await Promise.all([page.waitForEvent('download', { timeout: 240000 }).catch(() => null), page.evaluate(id => document.getElementById(id).click(), b)]);
      if (!d) { archivos.push({ boton: b, estado: 'sin descarga', status: await page.$eval('#dl-status', e => e.innerText) }); continue; }
      const nombre = `${String(n).padStart(2, '0')}_${d.suggestedFilename()}`; await d.saveAs(path.join(OUT, nombre));
      await page.waitForFunction(() => !document.body.classList.contains('generando'), null, { timeout: 60000 }).catch(() => {});
      archivos.push({ boton: b, archivo: nombre, ms: Date.now() - t0, status: await page.$eval('#dl-status', e => e.innerText) });
    }
    res.push({ ...s, pantalla, archivos });
    console.log(n, s.q, archivos.map(a => a.archivo || a.estado).join(' '));
  }
  fs.writeFileSync(path.join(OUT, 'indice.json'), JSON.stringify({ errores, res }, null, 1));
  await br.close(); srv.close(); }
main().catch(e => { console.error(e); process.exit(1); });
