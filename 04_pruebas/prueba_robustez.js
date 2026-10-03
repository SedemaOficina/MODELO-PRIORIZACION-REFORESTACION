// Bloque F1-B4 · Errores y robustez (H-033, H-034, H-035, H-036, H-037, H-039, H-042, H-074, H-075, H-086, H-090).
// Provoca fallas de carga, catálogos con marcado, dobles clics y navegación con Atrás, y comprueba lo que ve la persona.
// Uso: node 04_pruebas/prueba_robustez.js   · termina con código ≠ 0 si algo falla.
const fs = require('fs'), path = require('path'), zlib = require('zlib'), os = require('os');
const L = require('./lib_pruebas.js');
const SAL = process.env.SALIDA || fs.mkdtempSync(path.join(os.tmpdir(), 'rob-'));
const ok = L.Registro('errores y robustez'); const D = L.decodificar(); const M = D.META;
const bin = n => fs.readFileSync(path.join(L.DOCS, 'datos', n));

(async () => {
  const srv = await L.servidor(0); const browser = await L.lanzar(); const U = srv.url + '?modo=ligero#nomap';
  // abre la página con una intervención en la red y devuelve lo que muestra el cargador cuando la carga falla
  const conFalla = async (prepara) => { const ctx = await browser.newContext({ serviceWorkers: 'block', locale: 'es-MX', viewport: { width: 1440, height: 900 } }); await ctx.addInitScript(() => { window.SIA_PRUEBA = true; });
    const page = await ctx.newPage(); await prepara(page); await page.goto(U); let t = '';
    try { await page.waitForSelector('#loader .reintenta', { timeout: 120000 }); t = await page.$eval('#loader', l => l.innerText.replace(/\s+/g, ' ')); } catch (e) { t = 'SIN AVISO: ' + await page.$eval('#loader', l => (l.hidden ? '[cargó] ' : '') + l.innerText.replace(/\s+/g, ' ')).catch(() => ''); }
    await ctx.close(); return t; };
  const tecnico = /incorrect header|unexpected end|invalid|undefined|TypeError|is not defined|network error|Failed to fetch/i;

  // ---------- H-033 y H-035 · fallas de carga ----------
  let t = await conFalla(p => p.route(/datos\/data\.bin/, r => { const raw = zlib.gunzipSync(bin('data.bin')); r.fulfill({ status: 200, contentType: 'application/octet-stream', body: zlib.gzipSync(raw.subarray(0, Math.floor(raw.length * 0.6))) }); }));
  ok('H-033 data.bin con contenido cortado al 60 %: no se acepta como carga completa', /incompleto/.test(t) && !/SIN AVISO/.test(t), t.slice(0, 200));
  t = await conFalla(p => p.route(/datos\/data\.bin/, r => { const b = bin('data.bin'); r.fulfill({ status: 200, contentType: 'application/octet-stream', body: b.subarray(0, Math.floor(b.length / 2)) }); }));
  ok('H-035 compresión truncada: mensaje en español, sin texto técnico, con Reintentar', /dañado o incompleto/.test(t) && /Reintentar/.test(t) && !tecnico.test(t), t.slice(0, 200));
  t = await conFalla(p => p.route(/datos\/vp\.bin/, r => r.fulfill({ status: 404, body: '' })));
  ok('H-035 archivo de datos que no existe: lo dice y ofrece reintentar', /No se encontró un archivo de datos/.test(t) && /Reintentar/.test(t) && !tecnico.test(t), t.slice(0, 200));
  t = await conFalla(p => p.route(/\/app\.js/, r => r.abort()));
  ok('H-035 app.js no llega: el cargador avisa y ofrece reintentar', /No se pudo descargar una parte del programa \(app\.js\)/.test(t) && /Reintentar/.test(t), t.slice(0, 200));
  t = await conFalla(p => p.route(/libs\/deck\.js/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '/* vacío */' })));
  ok('H-034 sin el componente del mapa: mensaje con los navegadores mínimos, no «deck is not defined»', /componente del mapa/.test(t) && /Chrome o Edge 80/.test(t) && !tecnico.test(t), t.slice(0, 220));

  // ---------- H-037 · catálogo con marcado ----------
  { const ctx = await browser.newContext({ serviceWorkers: 'block', locale: 'es-MX', viewport: { width: 1440, height: 900 } }); await ctx.addInitScript(() => { window.SIA_PRUEBA = true; }); const page = await ctx.newPage();
    const meta = JSON.parse(zlib.gunzipSync(bin('meta.bin')).toString('utf8')); const tec = meta.colonias.findIndex(c => c && c.n === 'Tecpinco');
    const malo = '<img src=x onerror="window.__inyectado=1">'; meta.colonias[tec].n = 'Tecpinco ' + malo; meta.colonias[tec].ut = 'UT ' + malo;
    const fr = D.F.find(f => !f.gc && f.col === tec && f.prio >= 3); meta.names[fr.name] = meta.names[fr.name] + ' ' + malo;
    await page.route(/datos\/meta\.bin/, r => r.fulfill({ status: 200, contentType: 'application/octet-stream', body: zlib.gzipSync(Buffer.from(JSON.stringify(meta))) }));
    await page.goto(U); await page.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 300000 }); await page.waitForTimeout(500);
    await L.elegirTipo(page, 'Tecpinco', 'Col'); await page.waitForTimeout(600); await page.click('#tab-list'); await page.waitForTimeout(400);
    const li = await page.$('#results li:not(.empty)'); if (li) await li.evaluate(n => n.click()); await page.waitForTimeout(500);
    const r = await page.evaluate(() => ({ iny: window.__inyectado, imgs: document.querySelectorAll('img[src="x"]').length, titulo: document.getElementById('scope-title').textContent }));
    ok('H-037 un nombre de catálogo con marcado no ejecuta código ni inserta elementos', r.iny === undefined && r.imgs === 0 && /Tecpinco/.test(r.titulo), JSON.stringify(r).slice(0, 160)); await ctx.close(); }

  // ---------- sesión normal ----------
  const errores = []; const { page } = await L.abrir(browser, U, {}, errores);
  const izt = M.munNames.indexOf('Iztapalapa'), cveI = M.muns[izt];
  // H-075 modo ligero: el listado depende de las casillas, no del zoom
  await page.selectOption('#alc', String(izt)); await page.waitForTimeout(600); let e = await L.estado(page);
  ok('H-075 en modo ligero, con una alcaldía elegida la pestaña lista calles', /Calles/.test(e.tabList || '') && /Calles con más km de frente prioritario/i.test(e.listTitle || ''), `${e.tabList} · ${e.listTitle}`);
  // H-042 la consulta queda en la dirección
  ok('H-042 la alcaldía queda en la dirección', new URL(page.url()).searchParams.get('a') === cveI, page.url());
  await L.elegirTipo(page, 'Tecpinco', 'Col', 'Iztapalapa'); await page.waitForTimeout(600); const tec = M.colonias.findIndex(c => c && c.n === 'Tecpinco');
  ok('H-042 la colonia queda en la dirección', new URL(page.url()).searchParams.get('c') === String(tec), page.url());
  const urlCol = page.url();
  await page.goBack(); await page.waitForTimeout(700); e = await L.estado(page);
  ok('H-042 Atrás regresa a la consulta anterior sin salir de la herramienta', e.alcSel === String(izt) && !/Tecpinco/.test(e.crRest || '') && /Iztapalapa/.test(e.titulo), `${e.titulo} · ${page.url()}`);
  await page.goForward(); await page.waitForTimeout(700); e = await L.estado(page);
  ok('H-042 Adelante vuelve a la colonia', /Tecpinco/.test(e.titulo), e.titulo);
  await page.goto(urlCol); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(800); e = await L.estado(page);
  ok('H-042 un enlace con la consulta la restaura al abrir (o al recargar)', /Tecpinco/.test(e.titulo) && e.alcSel !== '', `${e.titulo} · ${page.url()}`);
  // H-036 estado visible en el pie y un archivo por clic
  { await page.click('#tab-res'); let n = 0; const cuenta = () => { n++; }; page.on('download', cuenta);
    const durante = await page.$eval('#act-main', b => { b.click(); b.click(); b.click(); return document.getElementById('dl-status').textContent; });
    await page.waitForFunction(() => /Descargado|Guardado/.test(document.getElementById('act-status').textContent), null, { timeout: 120000 }); await page.waitForTimeout(1500);
    const fin = await page.$eval('#act-status', a => a.hidden ? '' : a.textContent); page.off('download', cuenta);
    ok('H-036 tres clics seguidos entregan un solo archivo', n === 1, `${n} archivos`);
    ok('H-036 el estado de la descarga se ve en el pie fijo, desde cualquier pestaña', /Preparando/.test(durante) && /Descargado/.test(fin), `${durante} → ${fin}`); }
  // H-074 la atribución del fondo sigue visible con una tarjeta abierta
  { await page.$eval('.seg.fondo button[data-fondo="calles"]', b => b.click()); await page.waitForTimeout(500);
    await L.clic(page, '#zcity'); await L.elegirTipo(page, 'Tecpinco', 'Col', 'Iztapalapa'); await page.waitForTimeout(600);
    const r = await page.evaluate(() => ({ tarjeta: !document.getElementById('card').hidden, disp: getComputedStyle(document.getElementById('attrib')).display, txt: document.getElementById('attrib').textContent }));
    ok('H-074 con tarjeta abierta, la atribución del mapa de fondo sigue visible', r.tarjeta && r.disp !== 'none' && /OpenStreetMap|CARTO/i.test(r.txt), JSON.stringify(r).slice(0, 160));
    await page.$eval('.seg.fondo button[data-fondo="no"]', b => b.click()); await page.waitForTimeout(300); }
  // H-039 buscador
  await L.clic(page, '#zcity'); await page.waitForTimeout(300);
  { let r = await L.buscar(page, 'los reyes coyoacan'); ok('H-039 «los reyes coyoacan» encuentra la colonia de esa alcaldía', r.some(o => /^Col/.test(o.t) && /Reyes/.test(o.t) && /Coyoac/.test(o.t)), r.slice(0, 3).map(o => o.t).join(' | '));
    r = await L.buscar(page, 'col. roma'); ok('H-039 «col. roma» ofrece las colonias Roma', r.filter(o => /^Col/.test(o.t) && /Roma/.test(o.t)).length >= 2, r.slice(0, 4).map(o => o.t).join(' | '));
    r = await L.buscar(page, 'sn juan de aragon'); ok('H-039 «sn» se entiende como «san»', r.some(o => /San Juan de Arag/i.test(o.t)), r.slice(0, 3).map(o => o.t).join(' | '));
    await L.buscar(page, 'los reyes'); const mas = await page.$('#omni-list li.mas'); const antes = (await page.$$('#omni-list li.opt')).length;
    if (mas) { await mas.dispatchEvent('mousedown'); await page.waitForTimeout(400); }
    const cols = (await page.$$eval('#omni-list li.opt', ls => ls.filter(l => l.innerText.trim().startsWith('Col')).length));
    ok('H-039 «ver todas» muestra las colonias que no cabían', !!mas && cols > 6, `colonias visibles ${cols} · opciones antes ${antes}`); await page.fill('#omni', ''); }
  // H-090 CSV de respaldo
  { const ctx2 = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: true, locale: 'es-MX', viewport: { width: 1440, height: 900 } }); await ctx2.addInitScript(() => { window.SIA_PRUEBA = true; }); const p2 = await ctx2.newPage();
    await p2.route(/libs\/xlsx\.js/, r => r.abort()); await p2.goto(srv.url + '?modo=ligero&a=' + cveI + '#nomap'); await p2.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 300000 }); await p2.waitForTimeout(600);
    const d = await L.descargar(p2, '#dl-calles', SAL); const txt = d ? fs.readFileSync(d.ruta, 'utf8') : '';
    ok('H-090 sin la librería de Excel se entrega CSV con saltos CRLF', !!d && /\.csv$/.test(d.nombre) && /\r\n/.test(txt) && !/[^\r]\n/.test(txt.slice(0, 5000)), d && d.nombre);
    ok('H-042 la dirección con ?a= abre directamente la alcaldía', (await L.estado(p2)).alcSel === String(izt)); await ctx2.close(); }
  // H-086 #nomap solo existe para las pruebas
  { const ctx3 = await browser.newContext({ serviceWorkers: 'block', locale: 'es-MX' }); const p3 = await ctx3.newPage(); const src = fs.readFileSync(path.join(L.DOCS, 'app.js'), 'utf8');
    ok('H-086 #nomap exige la bandera de prueba y el código no nombra el entorno de desarrollo', /window\.SIA_PRUEBA===true && location\.hash==='#nomap'/.test(src) && !/Dentro de Claude/.test(src) && /typeof claude !== 'undefined'/.test(src)); await ctx3.close(); }

  ok('sin errores de JavaScript durante la sesión normal', errores.length === 0, errores.slice(0, 3).join(' | '));
  await browser.close(); srv.close(); process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
