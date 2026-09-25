// Prueba integral del sitio (docs/) en escritorio y teléfono.
// Uso:  node 04_pruebas/prueba_sitio.js          (requiere Node 18+ y Playwright: npm i playwright)
// Levanta un servidor local sobre docs/, recorre los flujos principales y termina con código 1 si algo falla.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const DOCS = path.join(__dirname, '..', 'docs');
const SALIDA = path.join(__dirname, 'capturas'); fs.mkdirSync(SALIDA, { recursive: true });
const PUERTO = 8790, URL = `http://localhost:${PUERTO}/`;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.bin': 'application/octet-stream' };
const servidor = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]); if (rel.endsWith('/')) rel += 'index.html';
  const ruta = path.join(DOCS, rel);
  if (!ruta.startsWith(DOCS) || !fs.existsSync(ruta)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(ruta)] || 'application/octet-stream' }); fs.createReadStream(ruta).pipe(res);
});

const resultados = []; const ok = (nombre, cond, detalle = '') => { resultados.push([cond, nombre, detalle]); console.log(`${cond ? 'OK   ' : 'FALLA'} ${nombre}${detalle ? ' · ' + detalle : ''}`); };
const sinFuentes = r => r.fulfill({ status: 200, body: '', contentType: 'text/css' });   // Google Fonts no es necesario para probar
const GPS = { latitude: 19.3560, longitude: -99.0560, accuracy: 12 };                    // colonia Vicente Guerrero, Iztapalapa

(async () => {
  await new Promise(r => servidor.listen(PUERTO, r));
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const errores = [];
  const abrir = async (opciones) => {
    const ctx = await browser.newContext({ acceptDownloads: true, ...opciones }); const page = await ctx.newPage(); page.setDefaultTimeout(180000);
    page.on('pageerror', e => errores.push(e.message)); await page.route(u => u.hostname.startsWith('fonts.'), sinFuentes);
    const t0 = Date.now(); await page.goto(URL); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(1500);
    return { ctx, page, seg: (Date.now() - t0) / 1000 };
  };
  const texto = (page, sel) => page.$eval(sel, e => e.innerText.replace(/\s+/g, ' ').trim()).catch(() => '');
  const buscar = async (page, q) => { await page.fill('#omni', ''); await page.fill('#omni', q); await page.waitForTimeout(900); };
  const descarga = async (page, sel) => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }).catch(() => null), page.$eval(sel, b => b.click())]); if (!d) return ''; await d.saveAs(path.join(SALIDA, d.suggestedFilename())); return d.suggestedFilename(); };

  // ---------- escritorio ----------
  const { page, ctx, seg } = await abrir({ viewport: { width: 1440, height: 900 }, geolocation: GPS, permissions: ['geolocation'] });
  ok('carga en escritorio', true, `${seg.toFixed(0)} s (con GPU simulada)`);
  ok('sin aceleración gráfica entra en modo ligero y avisa', await page.evaluate(() => document.body.classList.contains('modo-ligero') && !!document.querySelector('.aviso-ligero:not([hidden])')));
  const e0 = await texto(page, '#scalebar'); await page.$eval('#zin', b => b.click()); await page.waitForTimeout(1500);
  ok('botón + acerca el mapa', (await texto(page, '#scalebar')) !== e0, `${e0} → ${await texto(page, '#scalebar')}`);
  await page.$eval('#zout', b => b.click()); await page.waitForTimeout(1500);
  await buscar(page, 'calz zaragoza');
  ok('buscador reconoce abreviaturas', (await texto(page, '#omni-list li.opt')).includes('Zaragoza'), (await texto(page, '#omni-list li.opt')).slice(0, 70));
  await buscar(page, 'iztapalapa'); await page.keyboard.press('Enter'); await page.waitForTimeout(5000);
  ok('elegir alcaldía', (await texto(page, '#scope-title')).includes('Iztapalapa'), await texto(page, '#scope-title'));
  await page.$eval('#tab-list', b => b.click()); await page.waitForTimeout(800);
  ok('listado de calles', (await texto(page, '#tp-list')).includes('km'));
  ok('Excel de frentes prioritarios', (await descarga(page, '#act-main')).endsWith('.xlsx'));
  ok('ficha PDF de alcaldía', (await descarga(page, '#act-ficha')).endsWith('.pdf'));
  await buscar(page, 'santa cruz meyehualco'); await page.keyboard.press('Enter'); await page.waitForTimeout(5000);
  ok('elegir colonia', (await texto(page, '#scope-title')).toLowerCase().includes('meyehualco'), await texto(page, '#scope-title'));
  ok('ficha PDF de colonia', (await descarga(page, '#act-ficha')).endsWith('.pdf'));
  await page.$eval('button[data-resp="gc"]', b => b.click()); await page.$eval('button[data-resp="alc"]', b => b.click()); await page.waitForTimeout(4000);
  ok('modo Gobierno Central', (await page.$eval('#act-main', b => b.innerText)).includes('tramos'), await page.$eval('#act-main', b => b.innerText));
  ok('Excel de tramos prioritarios', (await descarga(page, '#act-main')).endsWith('.xlsx'));
  await page.$eval('button[data-resp="alc"]', b => b.click()); await page.$eval('button[data-resp="gc"]', b => b.click()); await page.waitForTimeout(3000);
  await page.$eval('#cr-city', b => b.click()); await page.waitForTimeout(4000);
  ok('volver a toda la ciudad', (await texto(page, '#scope-title')).includes('Ciudad'), await texto(page, '#scope-title'));
  await page.$eval('#zloc', b => b.click()); await page.waitForFunction(() => /Estás/.test(document.querySelector('#card').innerText), null, { timeout: 60000 }).catch(() => {});
  const tarjeta = await texto(page, '#card');
  ok('Mi ubicación reconoce la colonia', tarjeta.includes('Vicente Guerrero'), tarjeta.slice(0, 90));
  ok('Mi ubicación lista calles cercanas', (await page.$$('#card .loc-list button')).length > 0);
  await page.$eval('#open-info', b => b.click()); await page.waitForTimeout(1200);
  ok('ayuda y metodología', (await texto(page, '.howto')).length > 50 && await page.$eval('img[src^="img/composicion"]', i => i.complete && i.naturalWidth > 0));
  await page.$eval('.modal-card', c => c.scrollTop = 99999); await page.waitForTimeout(300);
  const cierre = await page.evaluate(() => { const r = document.getElementById('info-close').getBoundingClientRect(); const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return el && el.id === 'info-close'; });
  await page.$eval('#info-close', b => b.click()); await page.waitForTimeout(800);
  ok('la ayuda se cierra aunque se haya bajado hasta el final', cierre && await page.$eval('#info-modal', m => m.hidden));
  await buscar(page, 'iztapalapa'); await page.keyboard.press('Enter'); await page.waitForTimeout(4000);
  const escala = await texto(page, '#scalebar'); await page.$eval('#zcity', b => b.click()); await page.waitForTimeout(2500);
  ok('botón "toda la ciudad" aleja el mapa sin cambiar la consulta', (await texto(page, '#scalebar')) !== escala && (await texto(page, '#scope-title')).includes('Iztapalapa'), `${escala} → ${await texto(page, '#scalebar')}`);
  await page.screenshot({ path: path.join(SALIDA, 'escritorio.png') }); await ctx.close();

  // ---------- teléfono ----------
  const m = await abrir({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const ancho = await m.page.evaluate(() => document.documentElement.scrollWidth);
  ok('teléfono sin desborde horizontal', ancho <= 390, `${ancho} px`);
  ok('teléfono abre con la hoja mínima', await m.page.evaluate(() => document.body.classList.contains('sheet-peek')));
  await m.page.tap('#omni'); await m.page.fill('#omni', 'coyoacan'); await m.page.waitForTimeout(900); await m.page.keyboard.press('Enter'); await m.page.waitForTimeout(5000);
  ok('teléfono: elegir alcaldía', (await texto(m.page, '#scope-title')).includes('Coyoacán'));
  await m.page.screenshot({ path: path.join(SALIDA, 'telefono.png') }); await m.ctx.close();

  ok('sin errores de JavaScript', errores.length === 0, errores.join(' | '));
  await browser.close(); servidor.close();
  const fallas = resultados.filter(r => !r[0]).length;
  console.log(`\n${resultados.length - fallas} de ${resultados.length} pruebas correctas`);
  process.exit(fallas ? 1 : 0);
})().catch(e => { console.error('La prueba se detuvo:', e.message); servidor.close(); process.exit(1); });
