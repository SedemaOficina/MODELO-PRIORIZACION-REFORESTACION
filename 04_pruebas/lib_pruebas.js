// Biblioteca común de las pruebas que comparan cifras (auditoría integral del 2 de octubre de 2026).
// Decodificador PROPIO e independiente de la aplicación: lee docs/datos/*.bin (gzip + varint zigzag) con Node.
// Variables de entorno: DOCS (carpeta docs/ a probar; por omisión ../docs), PW_CHROME (ejecutable de Chromium).
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('playwright-core')); }

const PY = process.platform === 'win32' ? 'python' : 'python3';   // en Windows «python3» es un acceso directo a la tienda, no Python
const DOCS = process.env.DOCS || [path.join(__dirname, '..', 'docs'), path.join(process.cwd(), 'docs')].find(p => fs.existsSync(p));
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.bin': 'application/octet-stream' };
function servidor(puerto, docs = DOCS) {
  const s = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]); if (rel.endsWith('/')) rel += 'index.html';
    const ruta = path.join(docs, rel);
    if (!ruta.startsWith(docs) || !fs.existsSync(ruta)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(ruta)] || 'application/octet-stream' }); fs.createReadStream(ruta).pipe(res);
  });
  return new Promise(r => s.listen(puerto || 0, () => { s.url = `http://localhost:${s.address().port}/`; r(s); }));   // puerto 0 = uno libre
}
function lector(raw) { let rp = 0; return () => { let res = 0, shift = 0, b; do { b = raw[rp++]; res += (b & 0x7f) * Math.pow(2, shift); shift += 7; } while (b & 0x80); return (res % 2) ? -((res + 1) / 2) : res / 2; }; }
function decodificar(docs = DOCS) {
  const META = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(docs, 'datos', 'meta.bin'))).toString('utf8'));
  const Q = META.Q;
  let rv = lector(zlib.gunzipSync(fs.readFileSync(path.join(docs, 'datos', 'data.bin'))));
  const N = rv(); const F = []; let px = 0, py = 0;
  for (let i = 0; i < N; i++) {
    const f = { mun: rv(), prio: rv(), name: rv(), tipo: rv(), col: rv(), len: rv(), flags: rv(), vp: rv() - 1 }; f.gc = (f.flags >> 6) & 1;
    const nv = rv(); let first = null, last = null; f.nv = nv; f.pts = [];
    for (let k = 0; k < nv; k++) { px += rv(); py += rv(); f.pts.push(px / Q, py / Q); }
    F.push(f);
  }
  rv = lector(zlib.gunzipSync(fs.readFileSync(path.join(docs, 'datos', 'vp.bin'))));
  const NV = rv(); const VP = []; px = 0; py = 0;
  for (let i = 0; i < NV; i++) {
    const v = { nom: rv(), nombre: rv(), tipo: rv(), car: rv(), circ: rv(), alct: rv(), mun: rv(), prio: rv(), len: rv(), clave: rv(), rec: rv() };
    const nv = rv(); v.pts = []; for (let k = 0; k < nv; k++) { px += rv(); py += rv(); v.pts.push(px / Q, py / Q); }
    VP.push(v);
  }
  return { META, F, VP, N, NV };
}
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// ---- cálculo independiente de resúmenes (no usa META.summ ni funciones de la app) ----
function resumenFrentes(D, { mun = null, col = null, gc = 0 } = {}) {
  const s = { n: [0, 0, 0, 0, 0], m: [0, 0, 0, 0, 0] };
  for (const f of D.F) { if (f.gc !== gc) continue; if (mun !== null && f.mun !== mun) continue; if (col !== null && f.col !== col) continue; s.n[f.prio]++; s.m[f.prio] += f.len; }
  s.km = s.m.map(x => x / 1000); s.kmp = s.km[3] + s.km[4]; s.kmt = s.km.reduce((a, b) => a + b, 0); s.np = s.n[3] + s.n[4]; s.nt = s.n.reduce((a, b) => a + b, 0); return s;
}
function resumenVP(D, { mun = null, av = null } = {}) {
  const s = { n: [0, 0, 0, 0, 0], m: [0, 0, 0, 0, 0], recs: new Set(), recsp: new Set() };
  for (const v of D.VP) { if (mun !== null && v.mun !== mun) continue; if (av !== null && v.nom !== av) continue; s.n[v.prio]++; s.m[v.prio] += v.len; s.recs.add(v.rec); if (v.prio >= 3) s.recsp.add(v.rec); }
  s.km = s.m.map(x => x / 1000); s.kmp = s.km[3] + s.km[4]; s.kmt = s.km.reduce((a, b) => a + b, 0); s.np = s.n[3] + s.n[4]; s.nt = s.n.reduce((a, b) => a + b, 0); return s;
}
// formatos tal como los debe mostrar la interfaz (regla documentada: ≥10 km sin decimales, 1–10 un decimal, <1 km en metros)
const f0 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }), f1 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }), fN = new Intl.NumberFormat('es-MX');
const kmTxt = v => v >= 10 ? f0.format(v) : v >= 1 ? f1.format(v) : v > 0 ? fN.format(Math.max(1, Math.round(v * 1000))) : '0';
const kmUn = v => (v > 0 && v < 1) ? 'm' : 'km';
const numEs = t => { const m = String(t).replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : NaN; };

async function lanzar() {
  const op = { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] };
  if (process.env.PW_CHROME) op.executablePath = process.env.PW_CHROME;
  return chromium.launch(op);
}
// La primera visita pregunta el territorio (v17.28). Las pruebas parten de «toda la ciudad», como una visita que ya eligió;
// `entrada: true` en abrir() deja la primera visita tal cual.
// También marca como visto el recorrido guiado (v17.36), para que no tape lo que revisan las pruebas; prueba_recorrido.js lo pide.
const sinEntrada = ctx => ctx.addInitScript(() => { try { if (!sessionStorage.getItem('cp_p')) { localStorage.setItem('cp_inicio', 'ciudad'); localStorage.setItem('cp_recorrido', 'visto'); sessionStorage.setItem('cp_p', '1'); } } catch (e) {} });
async function abrir(browser, url, opciones = {}, errores = []) {
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 }, locale: 'es-MX', serviceWorkers: 'block', ...Object.fromEntries(Object.entries(opciones).filter(([k]) => k !== 'entrada' && k !== 'recorrido')) });
  await ctx.addInitScript(() => { window.SIA_PRUEBA = true; });
  if (opciones.recorrido) await ctx.addInitScript(() => { window.SIA_RECORRIDO = true; });   // el recorrido guiado arranca solo, como en una primera visita
  // Las pruebas parten de «toda la ciudad», como una visita que ya eligió territorio; `entrada: true` deja la primera visita tal cual.
  if (!opciones.entrada) await sinEntrada(ctx);
  const page = await ctx.newPage(); page.setDefaultTimeout(+process.env.T_ESPERA || 300000);
  page.on('pageerror', e => errores.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errores.push('console: ' + m.text()); });
  await page.route(u => u.hostname.startsWith('fonts.'), r => r.fulfill({ status: 200, body: '', contentType: 'text/css' }));
  await page.goto(url); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(600);
  // las pruebas heredadas leen las cifras de la pestaña Resumen; la pestaña inicial («Dónde empezar») tiene su propia prueba
  if (!opciones.entrada) await page.evaluate(() => { const t = document.getElementById('tab-res'); if (t) t.click(); });
  return { ctx, page };
}
// fotografía del estado visible de la interfaz
const estado = page => page.evaluate(() => {
  const T = s => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; };
  const vis = e => !!e && !e.hidden && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
  const btn = id => { const e = document.getElementById(id); return e ? { visible: vis(e), disabled: e.disabled, txt: e.innerText.replace(/\s+/g, ' ').trim() } : null; };
  const dl = {}; ['dl-frentes', 'dl-calles', 'dl-tramos', 'dl-avenidas', 'dl-calle', 'dl-ficha-calle', 'dl-ficha-vpalc', 'dl-ficha-av', 'dl-ficha-alc', 'dl-ficha'].forEach(i => dl[i] = btn(i));
  const kpis = [...document.querySelectorAll('#kpis .kpi')].map(k => ({ v: k.querySelector('.v').innerText.replace(/\s+/g, ' ').trim(), l: k.querySelector('.l').innerText.replace(/\s+/g, ' ').trim() }));
  const barras = sel => [...document.querySelectorAll(sel + ' .val')].map((v, i) => ({ lab: document.querySelectorAll(sel + ' .lab')[i].innerText.trim(), val: v.innerText.replace(/\s+/g, ' ').trim(), ancho: document.querySelectorAll(sel + ' .fill')[i].style.width }));
  const card = document.getElementById('card');
  return {
    resp: document.body.dataset.resp, titulo: T('#scope-title'), alcSel: document.getElementById('alc').value, crumb: T('#crumb'), crRest: T('#cr-rest'),
    kpis, kpisTxt: T('#kpis'), caps: [...document.querySelectorAll('#kpis .cap')].map(e => e.innerText.replace(/\s+/g, ' ').trim()), pob: vis(document.getElementById('pobbox')) ? T('#pobbox') : null,
    barsTitle: T('#bars-title'), bars: barras('#bars'), bars2Vis: vis(document.getElementById('bars2')), bars2Title: T('#bars2-title'), bars2: barras('#bars2-rows'), nota: T('#bars-note'),
    alcinfo: vis(document.getElementById('alcinfo')) ? T('#alcinfo') : null, colinfo: vis(document.getElementById('colinfo')) ? T('#colinfo') : null, avinfo: vis(document.getElementById('avinfo')) ? T('#avinfo') : null,
    mapsum: T('#mapsum'), tabList: T('#tab-list'), listTitle: T('#search-title'), listCount: T('#search-count'), q: document.getElementById('q').value,
    lista: [...document.querySelectorAll('#results li')].map(li => ({ t: li.innerText.replace(/\s+/g, ' ').trim(), act: li.classList.contains('active'), empty: li.classList.contains('empty') })),
    card: card && !card.hidden ? card.innerText.replace(/\s+/g, ' ').trim() : null,
    dl, dlStatus: T('#dl-status'), actMain: { ...btn('act-main'), target: document.getElementById('act-main').dataset.target }, actFicha: { ...btn('act-ficha'), target: document.getElementById('act-ficha').dataset.target }, actHint: vis(document.getElementById('act-hint')) ? T('#act-hint') : null,
    leyenda: [...document.querySelectorAll('#legend-rows .row')].map(r => ({ t: r.innerText.replace(/\s+/g, ' ').trim(), on: r.getAttribute('aria-checked') })), lgScope: T('#lg-scope'), legendVp: T('#legend-vp'),
    capas: Object.fromEntries([...document.querySelectorAll('.seg.lvl button')].map(b => [b.dataset.lvl, b.hidden ? 'oculta' : b.getAttribute('aria-pressed')])),
    fondo: (document.querySelector('.seg.fondo button[aria-pressed="true"]') || {}).dataset?.fondo, attrib: T('#attrib'), fondoNota: vis(document.getElementById('fondo-note')) ? T('#fondo-note') : null,
    escala: T('#scalebar'), modoLigero: document.body.classList.contains('modo-ligero'), url: location.href, histLen: history.length,
    panelTxt: document.querySelector('.panel') ? document.querySelector('.panel').innerText : document.body.innerText,
  };
});
const MALOS = /\bNaN\b|undefined|Infinity|\bnull\b|(^|[\s(])-0(?![\d.,])|\[object/;
const negativos = t => (String(t).match(/(^|[\s(])[-−]\d[\d,.]*\s*(km|m|%|hab|frentes|tramos)/g) || []);
async function buscar(page, q, espera = 500) { await page.fill('#omni', ''); await page.fill('#omni', q); await page.waitForTimeout(espera); return page.$$eval('#omni-list li', ls => ls.map(l => ({ c: l.className, t: l.innerText.replace(/\s+/g, ' ').trim() }))); }
async function elegir(page, q, n = 0) { await buscar(page, q); const o = await page.$$('#omni-list li.opt'); if (!o[n]) return false; await o[n].dispatchEvent('mousedown'); await page.waitForTimeout(500); return true; }
const clic = (page, sel) => page.$eval(sel, b => b.click()).then(() => page.waitForTimeout(350));
async function descargar(page, sel, dir, t = 90000) {
  const t0 = Date.now(); const [d] = await Promise.all([page.waitForEvent('download', { timeout: t }).catch(() => null), page.$eval(sel, b => b.click())]);
  if (!d) return null; const nombre = d.suggestedFilename(); const ruta = path.join(dir, nombre); await d.saveAs(ruta); return { nombre, ruta, ms: Date.now() - t0, bytes: fs.statSync(ruta).size };
}

// ---- manejo de controles (compartido por prueba_descargas.js y prueba_estado_vacio.js) ----
const RSP = { alc: ['alc'], gc: ['gc'], both: ['alc', 'gc'] };
async function ponResp(page, v) { const act = async () => page.$$eval('button[data-resp]', bs => Object.fromEntries(bs.map(b => [b.dataset.resp, b.getAttribute('aria-pressed') === 'true'])));
  let a = await act(); for (const k of ['alc', 'gc']) if (RSP[v].includes(k) && !a[k]) await clic(page, `button[data-resp="${k}"]`);
  a = await act(); for (const k of ['alc', 'gc']) if (!RSP[v].includes(k) && a[k]) await clic(page, `button[data-resp="${k}"]`); }
async function ponPrio(page, quiero) {   // quiero: arreglo de 5 en el orden de la leyenda (Muy Alta … Muy Baja)
  const filas = await page.$$('#legend-rows .row'); for (let i = 0; i < 5; i++) { const esta = (await filas[i].getAttribute('aria-checked')) === 'true'; if (esta !== !!quiero[i]) { await filas[i].evaluate(r => r.click()); await page.waitForTimeout(150); } } }
async function elegirTipo(page, q, tipo, debe = '') { await buscar(page, q); const ops = await page.$$('#omni-list li.opt');
  for (const o of ops) { const t = await o.innerText(); if (t.trim().startsWith(tipo) && t.includes(debe)) { await o.dispatchEvent('mousedown'); await page.waitForTimeout(400); return true; } } return false; }
function Registro(nombre) {
  const r = []; const ok = (n, cond, det = '') => { r.push([!!cond, n, det]); console.log(`${cond ? 'OK   ' : 'FALLA'} ${n}${det ? ' · ' + det : ''}`); return !!cond; };
  ok.fin = () => { const f = r.filter(x => !x[0]); console.log(`\n[${nombre}] ${r.length - f.length} de ${r.length} verificaciones correctas; ${f.length} fallas`); if (f.length) { console.log('Fallas:'); f.forEach(x => console.log('  - ' + x[1] + (x[2] ? ' · ' + x[2] : ''))); } return f.length; };
  ok.todos = r; return ok;
}
module.exports = { sinEntrada, PY, DOCS, servidor, decodificar, norm, resumenFrentes, resumenVP, kmTxt, kmUn, numEs, lanzar, abrir, estado, MALOS, negativos, buscar, elegir, clic, descargar, Registro, ponResp, ponPrio, elegirTipo, f0, f1, fN };
