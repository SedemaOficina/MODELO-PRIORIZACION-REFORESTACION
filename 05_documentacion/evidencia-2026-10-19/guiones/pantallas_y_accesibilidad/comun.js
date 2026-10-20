// Auditoría 19 oct 2026 · Frente 2 · utilidades comunes de los guiones de la carpeta e2.
// Toman el sitio de la copia r2 (DOCS) y Playwright de r2/node_modules. Se pueden repetir: solo escriben en e2/.
// Variables: R2 (carpeta de la copia; por omisión ../../r2), DOCS (carpeta docs/ a servir).
const path = require('path'), fs = require('fs');
const R2 = process.env.R2 || path.join(__dirname, '..', '..', 'r2');
process.env.DOCS = process.env.DOCS || path.join(R2, 'docs');
const L = require(path.join(R2, '04_pruebas', 'lib_pruebas.js'));
const PW = require(path.join(R2, 'node_modules', 'playwright'));
const AXE = path.join(__dirname, '..', '..', 'herramientas', 'axe', 'node_modules', 'axe-core', 'axe.min.js');
const CAP = path.join(__dirname, 'capturas'); fs.mkdirSync(CAP, { recursive: true });

// Anchos del encargo. «zoom200» = ventana de 1440×900 al 200 %: 720×450 px CSS con densidad 2.
const ANCHOS = [
  { n: '360', viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { n: '390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { n: '430', viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { n: '844x390', viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { n: '768', viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { n: '1440', viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
  { n: 'zoom200', viewport: { width: 720, height: 450 }, isMobile: false, hasTouch: false, deviceScaleFactor: 2 },
];

// Contexto limpio. op.entrada: primera visita (sin territorio recordado). op.sesion: simula la sesión del SIA («Mi cuenta»).
async function contexto(browser, ancho, op = {}) {
  const { n, ...vp } = ancho;
  const ctx = await browser.newContext({ ...vp, locale: 'es-MX', timezoneId: op.tz || 'America/Mexico_City', acceptDownloads: true,
    serviceWorkers: op.sw ? 'allow' : 'block', ...(op.geo ? { geolocation: op.geo, permissions: ['geolocation'] } : {}), ...(op.ctx || {}) });
  await ctx.addInitScript(() => { window.SIA_PRUEBA = true; });
  if (op.recorrido) await ctx.addInitScript(() => { window.SIA_RECORRIDO = true; });
  if (!op.entrada) await L.sinEntrada(ctx);
  if (op.sesion) await ctx.addInitScript(() => { Object.defineProperty(window, 'SIA_SESION', { value: { inicio: '/acceso/', cierre: '/api/salir', uso: '/api/uso' }, writable: false, configurable: false }); });
  // nada sale a terceros (no se tocan servicios externos): se responde vacío
  await ctx.route(u => !/^(localhost|127\.0\.0\.1)$/.test(u.hostname), r => r.fulfill({ status: 204, body: '' }));
  return ctx;
}
// abre la página y registra errores de consola, de página y respuestas 4xx/5xx en reg
async function pagina(ctx, url, reg = { consola: [], http: [] }, antes = null) {
  const page = await ctx.newPage(); page.setDefaultTimeout(120000); if (antes) await antes(page);
  page.on('pageerror', e => reg.consola.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') reg.consola.push(m.type() + ': ' + m.text().slice(0, 300)); });
  page.on('response', r => { if (r.status() >= 400) reg.http.push(r.status() + ' ' + r.url().replace(/^https?:\/\/[^/]+/, '')); });
  page.on('requestfailed', r => { const f = r.failure(); if (f && !/ERR_ABORTED/.test(f.errorText)) reg.http.push('FALLÓ ' + r.url().replace(/^https?:\/\/[^/]+/, '') + ' ' + f.errorText); });
  await page.goto(url); await page.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 180000 }); await page.waitForTimeout(700);
  return page;
}
const espera = ms => new Promise(r => setTimeout(r, ms));
const hasta = async (page, f, arg, t = 30000) => { try { await page.waitForFunction(f, arg, { timeout: t }); return true; } catch (e) { return false; } };
function guardaJSON(nombre, obj) { fs.writeFileSync(path.join(__dirname, nombre), JSON.stringify(obj, null, 1)); }
module.exports = { R2, L, PW, AXE, CAP, ANCHOS, contexto, pagina, espera, hasta, guardaJSON, path, fs };
