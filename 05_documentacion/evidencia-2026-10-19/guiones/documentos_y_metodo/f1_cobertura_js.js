// F1 · Cobertura de funciones de docs/app.js en un recorrido amplio (Chromium, V8). Lista las funciones con nombre que no corrieron.
// Uso: node f1_cobertura_js.js RUTA_A_LA_COPIA   → f1_cobertura_js.json en esta carpeta
const path = require('path'), fs = require('fs'); const RAIZ = process.argv[2]; const L = require(path.join(RAIZ, '04_pruebas', 'lib_pruebas.js'));
(async () => {
  const s = await L.servidor(0, path.join(RAIZ, 'docs')); const b = await L.lanzar();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, serviceWorkers: 'block', geolocation: { latitude: 19.356, longitude: -99.056, accuracy: 30 }, permissions: ['geolocation'] });
  await ctx.addInitScript(() => { window.SIA_PRUEBA = true; });
  const page = await ctx.newPage(); page.setDefaultTimeout(240000); await page.route(u => !u.hostname.includes('localhost'), r => r.abort());
  const cdp = await ctx.newCDPSession(page); await cdp.send('Profiler.enable'); await cdp.send('Profiler.startPreciseCoverage', { callCount: true, detailed: false });
  const pasos = []; const paso = async (n, f) => { try { await f(); pasos.push([n, 'ok']); } catch (e) { pasos.push([n, 'error: ' + e.message.slice(0, 120)]); } await page.waitForTimeout(400); };
  const clic = sel => page.$eval(sel, x => x.click());
  await page.goto(s.url + '?modo=ligero'); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(1500);
  await paso('entrada: calles y colonias, Iztapalapa', async () => { await clic('.entrada-red[data-red="alc"]'); await page.waitForTimeout(300); await page.evaluate(() => [...document.querySelectorAll('.entrada-op')].find(b => b.textContent === 'Iztapalapa').click()); await page.waitForTimeout(3000); });
  await paso('salir del recorrido si arrancó', async () => { const x = await page.$('.rec-salir'); if (x) await x.click(); });
  for (const v of ['cv', 'pob', 'calles', 'callescv', 'kmp']) await paso('Mostrar ' + v, async () => { await clic('#tab-ini'); await page.selectOption('#ini-orden', v); await page.waitForTimeout(2500); });
  await paso('ver 10 más', () => clic('#ini-mas'));
  await paso('elegir calle de la lista', async () => { await page.selectOption('#ini-orden', 'calles'); await page.waitForTimeout(500); await clic('#ini-list li[role=button]'); await page.waitForTimeout(1500); });
  await paso('tramo', () => clic('#tramos li'));
  await paso('Resumen', () => clic('#tab-res')); await paso('Descargas', () => clic('#tab-dl'));
  for (const id of ['#dl-calle', '#dl-ficha-calle', '#dl-frentes', '#dl-calles', '#dl-ficha-alc', '#dl-kml', '#dl-geojson']) await paso('descarga ' + id, async () => { const d = page.waitForEvent('download', { timeout: 120000 }).catch(() => null); await clic(id); await d; });
  await paso('colonia por buscador', () => L.elegir(page, 'santa cruz meyehualco'));
  await paso('ficha colonia', async () => { const d = page.waitForEvent('download', { timeout: 120000 }).catch(() => null); await clic('#dl-ficha'); await d; });
  await paso('banqueta con/sin/todas', async () => { for (const k of ['con', 'sin', 'todas']) { await clic(`button[data-banq="${k}"]`); await page.waitForTimeout(800); } });
  await paso('espacio cepa+tocón y apagar', async () => { for (const k of [0, 1, 1, 0]) { await clic(`button[data-esp="${k}"]`); await page.waitForTimeout(1500); } });
  await paso('Gobierno Central', async () => { await L.ponResp(page, 'gc'); await page.waitForTimeout(1500); });
  await paso('avenida por buscador', () => L.elegir(page, 'calzada ignacio zaragoza'));
  for (const id of ['#dl-tramos', '#dl-avenidas', '#dl-ficha-av']) await paso('descarga ' + id, async () => { const d = page.waitForEvent('download', { timeout: 120000 }).catch(() => null); await clic(id); await d; });
  await paso('las dos redes', async () => { await L.ponResp(page, 'both'); await page.waitForTimeout(1500); });
  await paso('coordenadas', async () => { await L.buscar(page, '19.3000, -99.1019'); await page.$eval('#omni-list li.opt', x => x.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))); await page.waitForTimeout(2000); });
  await paso('Mi ubicación', async () => { await clic('#zloc'); await page.waitForTimeout(3000); });
  await paso('capas, fondo y opacidad', async () => { await clic('#zcapas'); for (const f of ['no', 'sat', 'calles']) { await clic(`button[data-fondo="${f}"]`); await page.waitForTimeout(800); } await page.$eval('#op-prio', e => { e.value = 50; e.dispatchEvent(new Event('input')); }); await L.ponPrio(page, [1, 0, 1, 1, 1]); await L.ponPrio(page, [1, 1, 1, 1, 1]); });
  await paso('inventario de cerca', async () => { await page.evaluate(() => window.__MAPA.ir({ longitude: -99.056, latitude: 19.356, zoom: 16.5 }, 0)); await page.waitForTimeout(6000); });
  await paso('ayuda y recorrido', async () => { await page.$eval('#open-info, #info-btn', x => x.click()); await page.waitForTimeout(800); const r = await page.$('.rec-btn, [data-rec], #rec-abrir'); if (r) { await r.click(); await page.waitForTimeout(800); for (let k = 0; k < 15; k++) { const sg = await page.$('.rec-sig'); if (!sg) break; await sg.click(); await page.waitForTimeout(600); } } });
  await paso('Reiniciar', () => clic('#reset-all'));
  await paso('celular', async () => { await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(1000); await L.elegir(page, 'Tláhuac'); await clic('#ver-mapa'); await page.waitForTimeout(800); await clic('#ver-info'); });
  const { result } = await cdp.send('Profiler.takePreciseCoverage');
  const app = result.find(r => /\/app\.js/.test(r.url)); const src = fs.readFileSync(path.join(RAIZ, 'docs', 'app.js'), 'utf8');
  const nunca = [], todas = new Set();
  for (const f of app.functions) { if (!f.functionName) continue; todas.add(f.functionName); if (f.ranges[0].count === 0) nunca.push(f.functionName); }
  const sinCorrer = [...new Set(nunca)].filter(n => !app.functions.some(f => f.functionName === n && f.ranges[0].count > 0));
  const refs = n => (src.match(new RegExp('(?<![\w$.])' + n.replace(/\$/g, '\$') + '(?![\w$])', 'g')) || []).length;
  fs.writeFileSync(path.join(__dirname, 'f1_cobertura_js.json'), JSON.stringify({ pasos, funciones_con_nombre: todas.size, sin_correr: sinCorrer.length, lista: sinCorrer.map(n => [n, refs(n)]) }, null, 1));
  console.log('pasos', pasos.filter(p => p[1] !== 'ok')); console.log('funciones con nombre', todas.size, 'sin correr', sinCorrer.length);
  await ctx.close(); await b.close(); s.close(); })().catch(e => { console.error(e); process.exit(1); });
