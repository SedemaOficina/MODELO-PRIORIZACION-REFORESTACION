// Biblioteca común de las pruebas que comparan cifras.
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
// «prioritario» = Muy Alta, Alta y Media (clase ≥ 2); mismo umbral que PRIO_MIN de la herramienta
const PRIO_MIN = 2;
// ---- cálculo independiente de resúmenes (no usa META.summ ni funciones de la app) ----
function resumenFrentes(D, { mun = null, col = null, gc = 0 } = {}) {
  const s = { n: [0, 0, 0, 0, 0], m: [0, 0, 0, 0, 0] };
  for (const f of D.F) { if (f.gc !== gc) continue; if (mun !== null && f.mun !== mun) continue; if (col !== null && f.col !== col) continue; s.n[f.prio]++; s.m[f.prio] += f.len; }
  s.km = s.m.map(x => x / 1000); s.kmp = s.km.slice(PRIO_MIN).reduce((a, b) => a + b, 0); s.kmt = s.km.reduce((a, b) => a + b, 0); s.np = s.n.slice(PRIO_MIN).reduce((a, b) => a + b, 0); s.nt = s.n.reduce((a, b) => a + b, 0); return s;
}
function resumenVP(D, { mun = null, av = null } = {}) {
  const s = { n: [0, 0, 0, 0, 0], m: [0, 0, 0, 0, 0], recs: new Set(), recsp: new Set() };
  for (const v of D.VP) { if (mun !== null && v.mun !== mun) continue; if (av !== null && v.nom !== av) continue; s.n[v.prio]++; s.m[v.prio] += v.len; s.recs.add(v.rec); if (v.prio >= PRIO_MIN) s.recsp.add(v.rec); }
  s.km = s.m.map(x => x / 1000); s.kmp = s.km.slice(PRIO_MIN).reduce((a, b) => a + b, 0); s.kmt = s.km.reduce((a, b) => a + b, 0); s.np = s.n.slice(PRIO_MIN).reduce((a, b) => a + b, 0); s.nt = s.n.reduce((a, b) => a + b, 0); return s;
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
// La primera visita pregunta el territorio. Las pruebas parten de «toda la ciudad», como una visita que ya eligió;
// `entrada: true` en abrir() deja la primera visita tal cual.
// También marca como visto el recorrido guiado, para que no tape lo que revisan las pruebas; prueba_recorrido.js lo pide.
const sinEntrada = ctx => ctx.addInitScript(() => { try { if (!sessionStorage.getItem('cp_p')) { localStorage.setItem('cp_inicio', 'ciudad'); localStorage.setItem('cp_recorrido', 'visto'); sessionStorage.setItem('cp_p', '1'); } } catch (e) {} });
// Vigía (solo en las pruebas): cuenta los temporizadores cortos que la herramienta deja pendientes (setTimeout de 1.5 s o menos),
// para que quieto() espere a que termine lo que programó en lugar de un tiempo fijo (A1-04 de la auditoría del 19 oct 2026).
const vigia = ctx => ctx.addInitScript(() => { const p = new Set(), st = window.setTimeout, ct = window.clearTimeout;
  window.setTimeout = function (f, ms, ...a) { const id = st.call(window, function () { p.delete(id); if (typeof f === 'function') return f.apply(this, a); }, ms);
    if ((+ms || 0) <= 1500) p.add(id); return id; };
  window.clearTimeout = id => { p.delete(id); ct.call(window, id); }; window.__pendientes = () => p.size; });
// Espera a que la herramienta quede quieta: sin temporizadores cortos pendientes, sin transiciones ni animaciones de CSS en curso (las
// que no se repiten sin fin) y con dos cuadros dibujados después. Si la página no tiene vigía (no se abrió con abrir() ni con vigia()),
// espera lo de antes. No falla si algo se repite sin parar: sigue tras `tope` ms.
async function quieto(page, tope = 10000) {
  if (!(await page.evaluate(() => typeof window.__pendientes === 'function').catch(() => false))) return page.waitForTimeout(500);
  const calma = () => window.__pendientes() === 0 && !document.getAnimations().some(a => a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations !== Infinity);
  for (let i = 0; i < 3; i++) {
    await page.waitForFunction(calma, null, { timeout: tope, polling: 25 }).catch(() => {});
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    if (await page.evaluate(calma)) return;
  }
}
async function abrir(browser, url, opciones = {}, errores = []) {
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 }, locale: 'es-MX', serviceWorkers: 'block', ...Object.fromEntries(Object.entries(opciones).filter(([k]) => !['entrada', 'recorrido', 'preparar'].includes(k))) });
  await ctx.addInitScript(() => { window.SIA_PRUEBA = true; }); await vigia(ctx);
  if (opciones.recorrido) await ctx.addInitScript(() => { window.SIA_RECORRIDO = true; });   // el recorrido guiado arranca solo, como en una primera visita
  // Las pruebas parten de «toda la ciudad», como una visita que ya eligió territorio; `entrada: true` deja la primera visita tal cual.
  if (!opciones.entrada) await sinEntrada(ctx);
  if (opciones.preparar) await opciones.preparar(ctx);   // lo que la prueba necesite antes de cargar (sesión simulada, rutas…)
  const page = await ctx.newPage(); page.setDefaultTimeout(+process.env.T_ESPERA || 300000);
  page.on('pageerror', e => errores.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errores.push('console: ' + m.text()); });
  await page.route(u => u.hostname.startsWith('fonts.'), r => r.fulfill({ status: 200, body: '', contentType: 'text/css' }));
  await page.goto(url); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await quieto(page);
  // las pruebas leen las cifras de la pestaña Resumen; la pestaña inicial («Dónde empezar») tiene su propia prueba
  if (!opciones.entrada) await page.evaluate(() => { const t = document.getElementById('tab-res'); if (t) t.click(); });
  return { ctx, page };
}
// fotografía del estado visible de la interfaz; la lista es la de «Dónde empezar» (#ini-list), con su título, su conteo y su filtro (#q)
const estado = page => page.evaluate(() => {
  const T = s => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; };
  const vis = e => !!e && !e.hidden && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
  // v1.40: los botones de «Descargas» van en bloques por red (.dl-grupo); un bloque oculto oculta sus botones
  const btn = id => { const e = document.getElementById(id); return e ? { visible: vis(e) && !e.closest('.dl-grupo[hidden]'), disabled: e.disabled, txt: e.innerText.replace(/\s+/g, ' ').trim() } : null; };
  const dl = {}; ['dl-frentes', 'dl-calles', 'dl-tramos', 'dl-avenidas', 'dl-calle', 'dl-ficha-calle', 'dl-ficha-vpalc', 'dl-ficha-av', 'dl-ficha-alc', 'dl-ficha'].forEach(i => dl[i] = btn(i));
  const kpis = [...document.querySelectorAll('#kpis .kpi')].map(k => ({ v: k.querySelector('.v').innerText.replace(/\s+/g, ' ').trim(), l: k.querySelector('.l').innerText.replace(/\s+/g, ' ').trim() }));
  const barras = sel => [...document.querySelectorAll(sel + ' .val')].map((v, i) => ({ lab: document.querySelectorAll(sel + ' .lab')[i].innerText.trim(), val: v.innerText.replace(/\s+/g, ' ').trim(), ancho: document.querySelectorAll(sel + ' .fill')[i].style.width }));
  const card = document.getElementById('card');
  return {
    resp: document.body.dataset.resp, titulo: T('#scope-title'), alcSel: document.getElementById('alc').value, crumb: T('#crumb'), crRest: T('#cr-rest'),
    kpis, kpisTxt: T('#kpis'), caps: [...document.querySelectorAll('#kpis .cap')].map(e => e.innerText.replace(/\s+/g, ' ').trim()), pob: vis(document.getElementById('pobbox')) ? T('#pobbox') : null,
    barsTitle: T('#bars-title'), bars: barras('#bars'), bars2Vis: vis(document.getElementById('bars2')), bars2Title: T('#bars2-title'), bars2: barras('#bars2-rows'), nota: T('#bars-note'),
    alcinfo: vis(document.getElementById('alcinfo')) ? T('#alcinfo') : null, colinfo: vis(document.getElementById('colinfo')) ? T('#colinfo') : null, avinfo: vis(document.getElementById('avinfo')) ? T('#avinfo') : null,
    mapsum: T('#mapsum'), listTitle: document.getElementById('ini-title').textContent.replace(/\s+/g, ' ').trim(), listCount: T('#ini-count'), q: document.getElementById('q').value,
    lista: [...document.querySelectorAll('#ini-list li')].map(li => ({ t: li.innerText.replace(/\s+/g, ' ').trim(), act: li.classList.contains('active'), empty: li.classList.contains('empty') })),
    card: card && !card.hidden ? card.innerText.replace(/\s+/g, ' ').trim() : null,
    dl, dlStatus: T('#dl-status'), actMain: { ...btn('act-main'), target: document.getElementById('act-main').dataset.target }, actFicha: { ...btn('act-ficha'), target: document.getElementById('act-ficha').dataset.target }, actHint: vis(document.getElementById('act-hint')) ? T('#act-hint') : null,
    leyenda: [...document.querySelectorAll('#legend-rows .row')].map(r => ({ t: r.innerText.replace(/\s+/g, ' ').trim(), on: r.getAttribute('aria-checked') })), lgScope: T('#lg-scope'), legendVp: T('#legend-vp'),
    capas: Object.fromEntries([...document.querySelectorAll('.seg.lvl button')].map(b => [b.dataset.lvl, b.hidden ? 'oculta' : b.getAttribute('aria-pressed')])),
    fondo: (document.querySelector('.seg.fondo button[aria-pressed="true"]') || {}).dataset?.fondo, attrib: T('#attrib'), fondoNota: vis(document.getElementById('fondo-note')) ? T('#fondo-note') : null,
    escala: T('#scalebar'), modoLigero: document.body.classList.contains('modo-ligero'), url: location.href, histLen: history.length,
    panelTxt: document.querySelector('.panel') ? document.querySelector('.panel').innerText : document.body.innerText,
  };
});
// Para comparar con una versión anterior lo que no cambió en la v1.27: el Resumen se reordenó en bloques (rótulos de las cifras, encabezados,
// población y títulos de las barras son otros; las cifras, no) y el orden por cepas dice además el total de cualquier prioridad y lista al
// final lo que no tiene km prioritarios. comparable() deja las cifras del Resumen sin sus rótulos y los renglones sin ese total.
const ROTULOS_V127 = ['kpisTxt', 'caps', 'pob', 'barsTitle', 'bars2Title'];
const sinTotal = t => String(t).replace(/ · [\d,]+ en total/, '').replace(/sin cepas en lo prioritario/, 'sin cepas registradas');
// En la v1.37 cambiaron a propósito tres textos: el conteo de la lista y la leyenda terminan con el filtro activo («· sin banqueta o por
// verificar», «· con cepa vacante»), y la nota del Resumen dice «Además, …» con la regla del Gobierno Central (prioridad del tramo; la revisa
// prueba_cifras_gobierno_central.js) y «1 frente» en singular. comparable() los deja como antes para comparar lo demás.
const sinFiltroAlFinal = t => t == null ? t : String(t).replace(/( · (con banqueta|sin banqueta o por verificar|con (cepa vacante|tocón|árbol muerto)[^·]*))+$/, '');
const notaComparable = t => t == null ? t : String(t).replace(/ ?Además, [\d,]+ km de frentes sobre vialidades primarias[^.]*\) quedan a cargo del Gobierno Central y no se cuentan aquí\./, '')
  .replace(/\b(\d[\d,]*) frentes? \(/g, '$1 frentes (').replace(/ que pasan los filtros no tienen/, ' no tienen');
// En la v1.40 la pestaña «Descargas» se ordenó por red: los botones tienen otros nombres, en toda la ciudad el bloque de la alcaldía ya no
// se muestra con sus botones deshabilitados (se ofrece «Las 16 alcaldías») y el aviso de toda la ciudad dice otra cosa. Se compara qué
// botones se pueden usar (visibles y habilitados), no su texto.
const dlComparable = dl => Object.fromEntries(Object.entries(dl || {}).map(([k, v]) => [k, v && v.visible && !v.disabled]));
const DL_STATUS_V140 = ['Para la lista de calles de una alcaldía, elígela arriba.', 'Selecciona una alcaldía para descargar su listado.'];
function comparable(e) { const c = { ...e }; for (const k of ROTULOS_V127) delete c[k];
  c.kpis = (e.kpis || []).map(k => k.v); c.lista = (e.lista || []).map(l => ({ ...l, t: sinTotal(l.t) }));
  c.listCount = sinFiltroAlFinal(e.listCount); c.lgScope = sinFiltroAlFinal(e.lgScope); c.nota = notaComparable(e.nota);
  c.dl = dlComparable(e.dl); c.dlStatus = e.dlStatus == null ? e.dlStatus : e.dlStatus.replace(...DL_STATUS_V140); return c; }
// También en la v1.40, los archivos: el nombre dice lo mismo que su botón, las fuentes nombran el inventario y dos textos del diccionario
// dicen «Frente por frente» y «lista». Las listas de calles y de avenidas siguen el orden de «Mostrar», sin renglones sin km prioritarios,
// y llevan cepas_vacantes_prioritario (C1-01; prueba_descargas.js las compara con la pantalla): contra una versión anterior se comparan
// sus renglones con km prioritarios, como conjunto. nombreAntes, excelAntes y textoAntes llevan lo nuevo a la forma anterior.
const NOMBRES_V140 = [[/^frente_por_frente_calle_/, 'frentes_calle_'], [/^frente_por_frente_/, 'frentes_prioritarios_'], [/^lista_de_calles_/, 'resumen_calles_prioritarias_'],
  [/^tramo_por_tramo_/, 'tramos_prioritarios_'], [/^lista_de_avenidas_/, 'resumen_avenidas_prioritarias_'], [/^mapa_vialidades_primarias_prioritarias_/, 'calles_prioritarias_mapa_vialidades_primarias_'],
  [/^mapa_calles_prioritarias_/, 'calles_prioritarias_mapa_'], [/^mapa_calles_y_vialidades_primarias_/, 'calles_prioritarias_mapa_']];
const nombreAntes = n => { if (n == null) return n; const r = NOMBRES_V140.find(([re]) => re.test(n)); return r ? n.replace(r[0], r[1]) : n; };
// el nombre de la versión anterior y el de la nueva, sin la fecha (las dos descargas pueden quedar a ambos lados de la medianoche)
const mismoNombre = (antes, nuevo) => antes != null && nuevo != null && antes.replace(/_\d{8}\./, '.') === nombreAntes(nuevo).replace(/_\d{8}\./, '.');
// Y lo que la v1.37 cambió en las descargas del Gobierno Central (B2-02), que hasta la v1.39 no se notó porque el archivo de la versión
// anterior se guardaba en la misma carpeta que el nuevo, con el mismo nombre, y se comparaba el nuevo consigo mismo: dos renglones del
// diccionario cambiaron de nombre y de regla (su cifra la revisa prueba_descargas.js contra el Resumen) y la ficha de vialidades dice
// «km sobre tramos prioritarios». excelAntes quita esos renglones de los dos lados; textoAntes deja la frase de la ficha sin la cifra.
const DIC_GC_V137 = ['Prioritario del ámbito, km de frente a cargo del Gobierno Central', 'Km de frente a cargo del Gobierno Central sobre tramos prioritarios (sin filtro de banqueta; el espacio, por su tramo)',
  'Equivalente prioritario (Muy Alta, Alta y Media) en km de frente de manzana', 'Equivalente en km de frente de manzana de los tramos prioritarios (Muy Alta, Alta y Media)'];
// v1.42 (C5-02): «Gobierno de la Ciudad (de México)» pasó a «Gobierno Central» en los textos de la herramienta
const textoAntes = t => typeof t !== 'string' ? t : t.replace(/Gobierno de la Ciudad( de México)?/g, 'Gobierno Central').replace(/\(aceras con manzana enfrente\), [\d,.]+ km (sobre tramos prioritarios|prioritarios)\./g, '(aceras con manzana enfrente), N km prioritarios.').replace(/ Espacios para plantar \(cepas vacantes, tocones y árboles muertos\): [^.]*\./g, '')
  .replace(/Excel «Frente por frente»/g, 'Excel de frentes').replace('no incluidos en esta lista', 'no incluidos en este resumen');
function excelAntes(X, lista) { let datos = X.datos || [], dic = (X.dic || []).filter(r => !DIC_GC_V137.includes(r[0])).map(r => r.map(textoAntes));
  if (lista) { const h = datos[0] || [], k = h.indexOf('cepas_vacantes_prioritario'), iK = h.indexOf('km_prioritario'); const sin = r => k < 0 ? r : r.filter((_, j) => j !== k);
    datos = [sin(h), ...datos.slice(1).filter(r => r[iK] > 0).map(sin).map(r => JSON.stringify(r)).sort().map(r => JSON.parse(r))];
    dic = dic.filter(r => !['Orden', 'cepas_vacantes_prioritario', 'Contenido', 'Registros'].includes(r[0])); }
  return { ...X, datos, dic }; }
const MALOS = /\bNaN\b|undefined|Infinity|\bnull\b|(^|[\s(])-0(?![\d.,])|\[object/;
const negativos = t => (String(t).match(/(^|[\s(])[-−]\d[\d,.]*\s*(km|m|%|hab|frentes|tramos)/g) || []);
async function buscar(page, q, espera) { await page.fill('#omni', ''); await page.fill('#omni', q); await (espera === undefined ? quieto(page) : page.waitForTimeout(espera)); return page.$$eval('#omni-list li', ls => ls.map(l => ({ c: l.className, t: l.innerText.replace(/\s+/g, ' ').trim() }))); }
async function elegir(page, q, n = 0) { await buscar(page, q); const o = await page.$$('#omni-list li.opt'); if (!o[n]) return false; await o[n].dispatchEvent('mousedown'); await quieto(page); return true; }
const clic = (page, sel) => page.$eval(sel, b => b.click()).then(() => quieto(page));
// El mismo botón no acepta otro clic hasta 1.5 s después de entregar (GEN_PAUSA de 12_fichas_pdf.js, contra el doble clic): si se vuelve
// a pedir el mismo archivo antes, se espera lo que falta de esa pausa (medida desde que llegó la descarga anterior, que es después).
const ULT_DESCARGA = new WeakMap(), GEN_PAUSA = 1500;
async function descargar(page, sel, dir, t = 90000) {
  const u = ULT_DESCARGA.get(page); if (u && u.sel === sel) { const falta = u.t + GEN_PAUSA + 100 - Date.now(); if (falta > 0) await page.waitForTimeout(falta); }
  const t0 = Date.now(); const [d] = await Promise.all([page.waitForEvent('download', { timeout: t }).catch(() => null), page.$eval(sel, b => b.click())]);
  if (!d) return null; ULT_DESCARGA.set(page, { sel, t: Date.now() }); const nombre = d.suggestedFilename(); const ruta = path.join(dir, nombre); await d.saveAs(ruta); return { nombre, ruta, ms: Date.now() - t0, bytes: fs.statSync(ruta).size };
}

// ---- manejo de controles (compartido por las pruebas) ----
const RSP = { alc: ['alc'], gc: ['gc'], both: ['alc', 'gc'] };
async function ponResp(page, v) { const act = async () => page.$$eval('button[data-resp]', bs => Object.fromEntries(bs.map(b => [b.dataset.resp, b.getAttribute('aria-pressed') === 'true'])));
  let a = await act(); for (const k of ['alc', 'gc']) if (RSP[v].includes(k) && !a[k]) await clic(page, `button[data-resp="${k}"]`);
  a = await act(); for (const k of ['alc', 'gc']) if (!RSP[v].includes(k) && a[k]) await clic(page, `button[data-resp="${k}"]`); }
async function ponPrio(page, quiero) {   // quiero: arreglo de 5 en el orden de la leyenda (Muy Alta … Muy Baja)
  const filas = await page.$$('#legend-rows .row'); for (let i = 0; i < 5; i++) { const esta = (await filas[i].getAttribute('aria-checked')) === 'true'; if (esta !== !!quiero[i]) { await filas[i].evaluate(r => r.click()); await quieto(page); } } }
async function elegirTipo(page, q, tipo, debe = '') { await buscar(page, q); const ops = await page.$$('#omni-list li.opt');
  for (const o of ops) { const t = await o.innerText(); if (t.trim().startsWith(tipo) && t.includes(debe)) { await o.dispatchEvent('mousedown'); await quieto(page); return true; } } return false; }
function Registro(nombre) {
  const r = []; const ok = (n, cond, det = '') => { r.push([!!cond, n, det]); console.log(`${cond ? 'OK   ' : 'FALLA'} ${n}${det ? ' · ' + det : ''}`); return !!cond; };
  ok.fin = () => { const f = r.filter(x => !x[0]); console.log(`\n[${nombre}] ${r.length - f.length} de ${r.length} verificaciones correctas; ${f.length} fallas`); if (f.length) { console.log('Fallas:'); f.forEach(x => console.log('  - ' + x[1] + (x[2] ? ' · ' + x[2] : ''))); } return f.length; };
  ok.todos = r; return ok;
}
module.exports = { PRIO_MIN, sinEntrada, vigia, quieto, PY, DOCS, servidor, decodificar, norm, resumenFrentes, resumenVP, kmTxt, kmUn, numEs, lanzar, abrir, estado, comparable, sinTotal, nombreAntes, mismoNombre, textoAntes, excelAntes, MALOS, negativos, buscar, elegir, clic, descargar, Registro, ponResp, ponPrio, elegirTipo, f0, f1, fN };
