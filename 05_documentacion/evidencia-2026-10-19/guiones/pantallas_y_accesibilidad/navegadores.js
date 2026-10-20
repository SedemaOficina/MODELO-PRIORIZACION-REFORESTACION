// B8 · Recorrido básico en Chromium y WebKit (Firefox no arranca en este equipo: ver motores.js) y fechas con reloj simulado.
// Recorrido: entrada (paso 1 y 2) → búsqueda de una calle → ficha de un tramo → Excel de la calle → ficha PDF de la calle.
// Fechas: Excel de la alcaldía y ficha PDF de la alcaldía con el reloj fijo (ctx.clock.setFixedTime) en varias fechas y zonas horarias.
// Uso: node navegadores.js [chromium,webkit] [flujo,fechas]. Escribe navegadores.json y descargas en descargas_b8/.
const C = require('./comun.js'); const { L, PW, path, fs } = C; const { execFileSync } = require('child_process');
const MOTORES = (process.argv[2] || 'chromium,webkit').split(','), QUE = (process.argv[3] || 'flujo,fechas').split(',');
const SAL = path.join(__dirname, 'descargas_b8'); fs.mkdirSync(SAL, { recursive: true });
const WEBKIT = path.join(process.env.LOCALAPPDATA, 'ms-playwright', 'webkit-2359', 'Playwright.exe');
const lanza = m => m === 'webkit' ? PW.webkit.launch({ executablePath: WEBKIT }) : L.lanzar();
const out = []; const log = (m, n, ok, det) => { out.push({ motor: m, n, ok, det }); console.log(`${m.padEnd(8)} ${ok === null ? 'INFO ' : ok ? 'OK   ' : 'FALLA'} ${n}${det !== undefined ? ' · ' + (typeof det === 'string' ? det : JSON.stringify(det)) : ''}`); };
const PDFTXT = ['C:/Program Files/Git/mingw64/bin/pdftotext.exe', 'pdftotext'].find(p => { try { execFileSync(p, ['-v'], { stdio: 'ignore' }); return true; } catch (e) { return e.status !== undefined && e.code !== 'ENOENT'; } });
const pdfTexto = f => { try { return execFileSync(PDFTXT, ['-enc', 'UTF-8', f, '-'], { encoding: 'utf8' }); } catch (e) { return 'ERROR ' + e.message; } };
const xlsxTexto = f => { try { return execFileSync('python', ['-I', '-c', 'import sys,openpyxl\nwb=openpyxl.load_workbook(sys.argv[1])\nfor ws in wb:\n  for r in ws.iter_rows(values_only=True):\n    print(" | ".join(str(c) for c in r if c is not None))\nprint("CREADO", wb.properties.created)', f], { encoding: 'utf8' }); } catch (e) { return 'ERROR ' + e.message; } };
async function baja(page, sel, nombre) { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }).catch(() => null), page.$eval(sel, b => b.click())]); if (!d) return null;
  const r = path.join(SAL, nombre + '__' + d.suggestedFilename()); await d.saveAs(r); return { nombre: d.suggestedFilename(), ruta: r, bytes: fs.statSync(r).size }; }
async function flujo(browser, m) {
  for (const ancho of [C.ANCHOS[5], C.ANCHOS[1]]) { const a = ancho.n; const reg = { consola: [], http: [] };
    const op = m === 'webkit' ? { ...ancho, isMobile: false } : ancho;   // WebKit de Windows no emula isMobile
    const ctx = await C.contexto(browser, op, { entrada: true }); let page;
    try { page = await C.pagina(ctx, (await srvUrl()) + '?modo=ligero', reg); } catch (e) { log(m, `${a}: la herramienta abre`, false, e.message.split('\n')[0]); await ctx.close(); continue; }
    log(m, `${a}: la herramienta abre y pregunta el territorio`, await page.isVisible('#entrada'), await page.evaluate(() => ({ ligero: document.body.classList.contains('modo-ligero'), webgl: !!document.querySelector('canvas') })));
    await page.click('.entrada-red[data-red="alc"]'); await page.waitForTimeout(500);
    await page.click('#entrada-grid button:has-text("Tláhuac")'); await page.waitForTimeout(1500);
    log(m, `${a}: entrada paso 2 → Tláhuac`, /Tláhuac/.test(await page.textContent('#scope-title')), await page.textContent('#scope-title'));
    const okB = await L.elegirTipo(page, 'zaragoza (juan bautista)', 'Calle'); await page.waitForTimeout(1200);
    log(m, `${a}: búsqueda de la calle`, okB && /Nopalera/.test(await page.textContent('#scope-title')), await page.textContent('#scope-title'));
    if (await page.isVisible('#ver-info')) { await page.click('#ver-info'); await page.waitForTimeout(600); }
    await page.$eval('#tab-ini', b => b.click()); await page.waitForTimeout(400);
    const li = await page.$('#tramos li[role=button]'); if (li) { await li.click(); await page.waitForTimeout(1500); }
    const card = await page.evaluate(() => !document.getElementById('card').hidden ? document.getElementById('card').innerText.replace(/\s+/g, ' ').slice(0, 120) : null);
    log(m, `${a}: ficha del tramo`, !!card && /Zaragoza/i.test(card), card);
    await page.screenshot({ path: path.join(C.CAP, `b8_${m}_${a}_ficha.png`) });
    if (await page.isVisible('#ver-info')) { await page.click('#ver-info'); await page.waitForTimeout(600); }
    await page.$eval('#tab-dl', b => b.click()); await page.waitForTimeout(400);
    const x = await baja(page, '#dl-calle', `${m}_${a}`); const xt = x ? xlsxTexto(x.ruta) : '';
    log(m, `${a}: Excel de la calle`, !!x && /\.xlsx$/.test(x.nombre) && /Zaragoza/i.test(xt), x && { ...x, renglones: xt.split('\n').length });
    const pf = await baja(page, '#dl-ficha-calle', `${m}_${a}`); const pt = pf ? pdfTexto(pf.ruta) : '';
    log(m, `${a}: ficha PDF de la calle`, !!pf && /\.pdf$/.test(pf.nombre) && /Zaragoza/i.test(pt), pf && { ...pf, letras: pt.length });
    const malos = reg.consola.filter(c => !/Service Worker|GL Driver|WebGL|swiftshader/i.test(c));
    log(m, `${a}: sin errores de consola ni 4xx/5xx`, malos.length === 0 && reg.http.length === 0, [...malos, ...reg.http].slice(0, 5));
    await ctx.close(); }
}
let SRV = null; const srvUrl = async () => { if (!SRV) SRV = await L.servidor(0); return SRV.url; };
// fechas: [nombre, instante (ISO con zona), zona horaria del equipo]
const FECHAS = [
  ['CDMX 31 dic 23:59', '2026-12-31T23:59:00-06:00', 'America/Mexico_City'],
  ['CDMX 1 ene 00:00:30', '2027-01-01T00:00:30-06:00', 'America/Mexico_City'],
  ['CDMX lunes 2 nov 09:00', '2026-11-02T09:00:00-06:00', 'America/Mexico_City'],
  ['Tijuana, instante CDMX 31 dic 23:59', '2026-12-31T23:59:00-06:00', 'America/Tijuana'],
  ['Tijuana, instante CDMX 1 ene 01:30', '2027-01-01T01:30:00-06:00', 'America/Tijuana'],
  ['UTC, instante CDMX 31 dic 19:00', '2026-12-31T19:00:00-06:00', 'UTC'],
  ['Tijuana cambio de horario 1 nov 01:30', '2026-11-01T01:30:00-08:00', 'America/Tijuana'],
];
async function fechas(browser, m) {
  for (const [n, iso, tz] of FECHAS) {
    const ctx = await C.contexto(browser, C.ANCHOS[5], { tz }); await ctx.clock.setFixedTime(new Date(iso));
    try { const page = await C.pagina(ctx, (await srvUrl()) + '?modo=ligero&a=013');
      const local = await page.evaluate(() => ({ local: new Date().toString().slice(0, 33), hoy: new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) }));
      await page.$eval('#tab-dl', b => b.click()); await page.waitForTimeout(400);
      const x = await baja(page, '#dl-calles', `${m}_${n.replace(/\W+/g, '_')}`); const xt = x ? xlsxTexto(x.ruta) : '';
      const fx = (xt.match(/(\d{1,2} de [a-z]+ de \d{4})/) || [])[1], creado = (xt.match(/CREADO (.*)/) || [])[1];
      const pf = await baja(page, '#dl-ficha-alc', `${m}_${n.replace(/\W+/g, '_')}`); const pt = pf ? pdfTexto(pf.ruta) : '';
      const fp = (pt.match(/(\d{1,2} de [a-z]+ de \d{4})/) || [])[1];
      const sufX = x && (x.nombre.match(/_(\d{8})\.xlsx$/) || [])[1], sufP = pf && (pf.nombre.match(/_(\d{8})\.pdf$/) || [])[1];
      log(m, `fechas · ${n} (${tz})`, null, { equipo: local.local, nombreExcel: sufX, dentroExcel: fx, creadoExcel: creado, nombrePDF: sufP, dentroPDF: fp, coinciden: !!fx && !!fp && fx === fp && sufX === sufP });
    } catch (e) { log(m, `fechas · ${n}`, false, e.message.split('\n')[0]); }
    await ctx.close(); }
}
(async () => {
  for (const m of MOTORES) { let browser; try { browser = await lanza(m); } catch (e) { log(m, 'arranca', false, e.message.split('\n')[0]); continue; }
    log(m, 'arranca', true, browser.version());
    if (QUE.includes('flujo')) await flujo(browser, m).catch(e => log(m, 'flujo', false, e.message.split('\n')[0]));
    if (QUE.includes('fechas')) await fechas(browser, m).catch(e => log(m, 'fechas', false, e.message.split('\n')[0]));
    await browser.close(); }
  C.guardaJSON('navegadores.json', out); if (SRV) SRV.close();
})();
