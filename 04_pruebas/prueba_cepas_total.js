// Orden por cepas vacantes con el total de cualquier prioridad (v1.27; antes, v1.25, órdenes «(prioritarias)» y «(todas)») y columnas de
// espacios para plantar en las descargas (v1.25).
// Comprueba, contra un recálculo propio desde docs/datos (data.bin, vp.bin, espacios_frentes.bin y espacios_vp.bin, con decodificadores
// propios):
//  · «Mostrar» con opciones cortas y un solo orden por cepas: colonias, calles de la alcaldía, calles de una colonia y avenidas del Gobierno
//    Central; sin los órdenes «(todas)», el porcentaje ni «sin arbolado y con banqueta»;
//  · colonias de Tláhuac y de la ciudad, calles de la alcaldía y de una colonia, avenidas de Iztapalapa y de la ciudad: ordenadas por las
//    cepas de los frentes o tramos prioritarios; cada renglón con ese número y el total de cualquier prioridad («48 cepas vacantes · 62 en
//    total», «sin cepas en lo prioritario · 128 en total»); lo que no tiene km prioritarios pero sí cepas, al final; también con «Con
//    banqueta» y con el filtro «Espacio»; nota del corte; carga diferida con aviso, falla y reintento; la avenida 5 de Mayo (128 cepas en
//    partes no prioritarias) donde le corresponde;
//  · columnas cepas_vacantes, tocones y arboles_muertos en el Excel de frentes de una colonia y de la calle consultada (frente por frente y
//    en total), en el de tramos de Iztapalapa y en los resúmenes por calle y por avenida (sumas), declaradas en el Diccionario (con corte,
//    fuente y regla); las mismas propiedades en el GeoJSON y el KML;
//  · sin conexión al inventario, la descarga sale sin las columnas, el Diccionario y el GeoJSON lo dicen y la pantalla lo avisa;
//  · contra la versión anterior (v1.26, tomada de Git; REF_ANTERIOR=<commit>, por omisión 6935635; REF_ANTERIOR=no la omite y la prueba falla, porque no se verificó): las cifras,
//    listas y órdenes que siguen (km prioritarios, habitantes, calles, avenidas; por cepas, lo que ya listaba y en el mismo orden) y los
//    Excel y el GeoJSON, iguales;
//  · celular de 390 px: las opciones caben enteras en el selector y la lista no desborda; sin errores de JavaScript.
// Uso: node 04_pruebas/prueba_cepas_total.js   · termina con código ≠ 0 si algo falla.
const fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib'), cp = require('child_process');
const L = require('./lib_pruebas.js');
const SAL = process.env.SALIDA || fs.mkdtempSync(path.join(os.tmpdir(), 'cepast-'));
// lo que baja la versión anterior va en su propia carpeta: con el mismo nombre de archivo, el segundo reemplazaría al primero y se
// compararía el archivo nuevo consigo mismo (así pasó hasta la v1.39)
const SAL_ANT = path.join(SAL, 'version_anterior'); fs.mkdirSync(SAL_ANT, { recursive: true });
const ok = L.Registro('orden por cepas con su total y columnas de espacios');
const D = L.decodificar(); const M = D.META;
// los nombres de colonia que la herramienta muestra (los que cambia 03_procesamiento_datos/7_nombres_colonias.py, en config.js)
{ const m = fs.readFileSync(path.join(L.DOCS, 'config.js'), 'utf8').match(/window\.SIA_NOMBRES_COL = (\{.*?\});\n/);
  if (m) for (const [k, n] of Object.entries(JSON.parse(m[1]))) { const c = M.colonias[+k]; if (c && c.n) { c.cat = c.n; c.n = n; } } }
const RAIZ = path.join(__dirname, '..');
const RES = JSON.parse(fs.readFileSync(path.join(RAIZ, '02_fuente', 'datos', 'inventario', 'RESUMEN.json'), 'utf8'));
const TLA = M.munNames.indexOf('Tláhuac'), IZT = M.munNames.indexOf('Iztapalapa');
const COLS3 = ['cepas_vacantes', 'tocones', 'arboles_muertos'], FILA = 'Espacios para plantar (inventario de arbolado)';
const FUENTE = 'Inventario de arbolado de la Ciudad de México, CIGA-UNAM y SEDEMA; en curso';
const xlsx = ruta => JSON.parse(cp.execFileSync(L.PY, ['-c', `
import openpyxl, json, sys
wb = openpyxl.load_workbook(sys.argv[1], read_only=True)
print(json.dumps({'datos': [list(r) for r in wb['Datos'].iter_rows(values_only=True)], 'dic': [list(r) for r in wb['Diccionario'].iter_rows(values_only=True)]}, default=str))`, ruta], { maxBuffer: 1 << 28 }).toString());

// ---------- decodificadores propios (independientes de la aplicación) ----------
const enteros = raw => { let rp = 0; const rv = () => { let res = 0, sh = 0, b; do { b = raw[rp++]; res += (b & 0x7f) * Math.pow(2, sh); sh += 7; } while (b & 0x80); return (res % 2) ? -((res + 1) / 2) : res / 2; }; rv.fin = () => rp === raw.length; return rv; };
// espacios_frentes.bin y espacios_vp.bin: por registro, índice en diferencias y puntos de cada tipo; B = tipos en bits (el filtro «Espacio»)
function leeConteos(nombre, max) { const rv = enteros(zlib.gunzipSync(fs.readFileSync(path.join(L.DOCS, 'datos', 'inventario', nombre))));
  rv(); const n = rv(), B = new Uint8Array(max), CNT = new Map(); let f = -1;
  for (let k = 0; k < n; k++) { f += rv(); const c = [rv(), rv(), rv()]; B[f] = (c[0] ? 1 : 0) | (c[1] ? 2 : 0) | (c[2] ? 4 : 0); CNT.set(f, c); }
  return { B, CNT, completo: rv.fin() }; }
const EF = leeConteos(RES.frentes_con_espacio.archivo, D.N), EV = leeConteos(RES.vialidades_con_espacio.archivo, D.NV);
const cF = i => EF.CNT.get(i) || [0, 0, 0], cV = i => EV.CNT.get(i) || [0, 0, 0];
const suma = (ids, de) => ids.reduce((a, i) => { const c = de(i); return [a[0] + c[0], a[1] + c[1], a[2] + c[2]]; }, [0, 0, 0]);

// ---------- recálculos propios ----------
const pasaB = (f, banq) => banq === 'todas' || (banq === 'con') === (((f.flags >> 3) & 7) === 0);
const pasa = (i, f, banq, m) => pasaB(f, banq) && (!m || (EF.B[i] & m));
// el orden por cepas: por las de lo prioritario (cv); con el mismo número, por km prioritarios (y, en calles y avenidas, por km en total);
// lo que no tiene km prioritarios pero sí cepas, al final, por su total (cvt). soloPrio = lo que listaba la v1.26 (solo con km prioritarios)
const ordena = (a, b, km) => b.cv - a.cv || b.kmp - a.kmp || (a.kmp ? 0 : b.cvt - a.cvt) || (km ? b.km - a.km : 0);
function colCepas(mun, { banq = 'todas', m = 0 } = {}) { const S = new Map();
  for (let i = 0; i < D.N; i++) { const f = D.F[i]; if (!f.col || f.gc || !pasa(i, f, banq, m)) continue; let s = S.get(f.col); if (!s) { s = { kmp: 0, cv: 0, cvt: 0 }; S.set(f.col, s); }
    const c = cF(i)[0]; s.cvt += c; if (f.prio >= L.PRIO_MIN) { s.kmp += f.len / 1000; s.cv += c; } }
  const cve = mun === null ? null : M.muns[mun], out = [];
  for (let c = 1; c < M.colonias.length; c++) { const k = M.colonias[c]; if (!k.n || (cve && k.m !== cve)) continue; const s = S.get(c);
    if (s && (s.kmp > 0 || s.cvt > 0)) out.push({ c, n: k.n, cv: s.cv, cvt: s.cvt, kmp: s.kmp }); }
  return out.sort((a, b) => ordena(a, b, false)); }
const generico = nm => { const n = L.norm(nm); return n === '' || n === 'sin referencia' || n === 'sin nombre' || n.startsWith('ninguno') || / ninguno$/.test(n) || n.startsWith('manzana o edificacion'); };
// calles (cada una dentro de su colonia) por cepas vacantes de sus frentes del ámbito; ids: sus frentes
function callesCepas(terr, { banq = 'todas', m = 0, soloPrio = false } = {}) { const S = new Map();
  for (let i = 0; i < D.N; i++) { const f = D.F[i]; if (f.gc || !terr(f) || !pasa(i, f, banq, m) || generico(M.names[f.name])) continue; const key = f.name * 4096 + f.col; let s = S.get(key); if (!s) { s = { nid: f.name, col: f.col, km: 0, kmp: 0, cv: 0, cvt: 0, ids: [] }; S.set(key, s); }
    const c = cF(i)[0]; s.ids.push(i); s.km += f.len / 1000; s.cvt += c; if (f.prio >= L.PRIO_MIN) { s.kmp += f.len / 1000; s.cv += c; } }
  return [...S.values()].filter(s => (soloPrio ? s.kmp > 0 : s.kmp > 0 || s.cvt > 0) && M.names[s.nid]).map(s => ({ n: M.names[s.nid], ...s })).sort((a, b) => ordena(a, b, true)); }
// avenidas del Gobierno Central por cepas vacantes de sus partes del ámbito (por sus frentes y en el camellón)
function avCepas(mun, { m = 0 } = {}) { const S = new Map();
  D.VP.forEach((v, i) => { if ((mun !== null && v.mun !== mun) || (m && !(EV.B[i] & m))) return; let s = S.get(v.nom); if (!s) { s = { a: v.nom, km: 0, kmp: 0, cv: 0, cvt: 0, muns: new Set() }; S.set(v.nom, s); }
    const c = cV(i)[0]; s.km += v.len / 1000; s.cvt += c; s.muns.add(v.mun); if (v.prio >= L.PRIO_MIN) { s.kmp += v.len / 1000; s.cv += c; } });
  return [...S.values()].filter(s => s.kmp > 0 || s.cvt > 0).map(s => ({ ...s, n: M.vp.nomenclat[s.a] })).sort((a, b) => ordena(a, b, true)); }
// lo que dice el renglón: las cepas de lo prioritario y el total de cualquier prioridad
const fN = L.fN.format;
const cepasTxt = (cv, cvt) => cv ? `${fN(cv)} cepa${cv === 1 ? '' : 's'} vacante${cv === 1 ? '' : 's'}${cvt && cvt !== cv ? ` · ${fN(cvt)} en total` : ''}` : cvt ? `sin cepas en lo prioritario · ${fN(cvt)} en total` : 'sin cepas registradas';
const cepasDe = t => { const m = t.match(/(?:^|\s)(\d[\d,]* cepas? vacantes?(?: · [\d,]+ en total)?|sin cepas en lo prioritario · [\d,]+ en total|sin cepas registradas)/); return m ? m[1].trim() : ''; };
// renglones contra el recálculo: nombre, cepas con su total y km prioritarios (aunque sean 0), en el mismo orden
function compara(filas, exp, sufijo = 'de frente prioritario') { const malas = [];
  filas.forEach((r, k) => { const e = exp[k], t = L.norm(r.t);
    // la pantalla junta los espacios (algunos nombres traen espacios no separables)
    const por = !e ? 'sobra' : !t.includes(L.norm(e.n).replace(/\s+/g, ' ').trim()) ? 'nombre' : cepasDe(r.t) !== cepasTxt(e.cv, e.cvt) ? `cepas «${cepasDe(r.t)}»` : !t.includes(`${L.kmTxt(e.kmp)} ${L.kmUn(e.kmp)} ${sufijo}`) ? 'km' : '';
    if (por) malas.push(`${k + 1} (${por}): «${r.t.slice(0, 150)}» vs ${e ? `${e.n} ${cepasTxt(e.cv, e.cvt)} ${L.kmTxt(e.kmp)} ${L.kmUn(e.kmp)}` : '—'}`); });
  return malas; }
// primero lo que tiene cepas en lo prioritario; después, lo que no (con «sin cepas…»), y al final lo que no tiene km prioritarios
const ceros = (filas, exp) => { const c0 = exp.findIndex(x => !x.cv), s0 = exp.findIndex(x => !x.kmp);
  return (c0 < 0 || filas.slice(c0).every(r => /^sin cepas/.test(cepasDe(r.t)))) && filas.slice(0, c0 < 0 ? filas.length : c0).every(r => /^\d/.test(cepasDe(r.t))) && (s0 < 0 || exp.slice(s0).every(x => !x.kmp)); };
const NOTA = que => `Cuenta solo lo inventariado hasta ${RES.corte} (inventario en curso): ${que} con 0 puede no estar inventariada todavía.`;
const OPS_ALC = 'kmp=Colonias · más km prioritarios|cv=Colonias · más cepas vacantes|pob=Colonias · más habitantes|calles=Calles · más km prioritarios|callescv=Calles · más cepas vacantes';

// la versión anterior, tal como se publicó (docs/ de ese commit), en una carpeta temporal
function docsDe(ref) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-ant-'));
  const git = (...a) => cp.execFileSync('git', ['-C', RAIZ, ...a], { maxBuffer: 1 << 30 });
  for (const f of git('ls-tree', '-r', '--name-only', ref, 'docs').toString().split('\n').filter(Boolean)) {
    const dest = path.join(dir, f.replace(/^docs\//, '')); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, git('show', `${ref}:${f}`)); }
  return dir; }
const sinFecha = X => X.dic.filter(r => !['Fecha de generación', 'Versión de la herramienta', 'Última actualización de la herramienta', 'Archivo'].includes(r[0]));
const geoSinVer = txt => { const J = JSON.parse(txt); J.descripcion = String(J.descripcion || '').replace(/Versión \d+\.\d+[^.]*\./g, 'Versión X.'); return JSON.stringify(J); };

(async () => {
  ok('espacios_frentes.bin y espacios_vp.bin se leen completos (decodificador propio)', EF.completo && EV.completo, `${EF.CNT.size} frentes · ${EV.CNT.size} partes`);
  const srv = await L.servidor(0); const browser = await L.lanzar(); const errores = []; const base = srv.url + '?modo=ligero';
  const { page, ctx } = await L.abrir(browser, base + '#nomap', {}, errores);
  // ir: abre la consulta y pasa al Resumen (que pide el inventario para su comparación); irIni: directo a «Dónde empezar», sin bajar nada
  const ir = async (p, q, res = true) => { await p.goto('about:blank'); await p.goto(base + q + '#nomap'); await p.waitForSelector('#loader[hidden]', { state: 'attached' }); await p.waitForTimeout(700); if (res) await p.evaluate(() => { const t = document.getElementById('tab-res'); if (t) t.click(); }); };
  const irIni = (p, q) => ir(p, q, false);
  const tabIni = p => p.evaluate(() => document.getElementById('tab-ini').click()).then(() => p.waitForTimeout(200));
  const verTodo = async p => { for (let k = 0; k < 600 && await p.$eval('#ini-mas', x => !x.hidden); k++) await p.$eval('#ini-mas', b => b.click()); return (await L.estado(p)).lista; };
  const orden = async (p, v) => { await p.selectOption('#ini-orden', v); await p.waitForFunction(v2 => window.__INV.esp().orden === v2 && window.__INV.esp().pendiente === null, v, { timeout: 60000 }); await p.waitForTimeout(200); };
  const opciones = p => p.$$eval('#ini-orden option', o => o.map(x => x.value + '=' + x.textContent));
  const nota = p => p.$eval('#ini-note', x => x.textContent.replace(/\s+/g, ' '));
  const carga = p => p.$eval('#ini-carga', x => ({ vis: !x.hidden && x.offsetParent !== null, t: x.textContent, warn: x.classList.contains('warn') }));
  const top = {};

  // ---------- 1) opciones de «Mostrar» y carga diferida ----------
  const RF = '**/espacios_frentes.bin*', RV = '**/espacios_vp.bin*';
  await ctx.route(RF, async r => { await new Promise(s => setTimeout(s, 2500)); await r.continue().catch(() => {}); });
  await irIni(page, `&a=${M.muns[TLA]}`); await tabIni(page);
  { const ops = await opciones(page), antes = await L.estado(page);
    ok('alcaldía: «Mostrar» ofrece cinco opciones cortas, un solo orden por cepas de colonias y uno de calles (sin «(todas)», porcentaje ni «sin arbolado y con banqueta»)', ops.join('|') === OPS_ALC, ops.join(' | '));
    await page.selectOption('#ini-orden', 'cv'); await page.waitForTimeout(300);
    const a = await carga(page), d = await L.estado(page), sv = await page.$eval('#ini-orden', s => s.value);
    ok('por cepas la primera vez: aviso mientras baja el archivo, el selector dice lo pedido y la lista sigue con el orden anterior', a.vis && !a.warn && a.t === 'Cargando las cepas vacantes del inventario de arbolado…' && sv === 'cv' && JSON.stringify(d.lista) === JSON.stringify(antes.lista) && !d.lista.some(l => /cepa/.test(l.t)), a.t);
    await page.waitForFunction(() => window.__INV.esp().orden === 'cv', null, { timeout: 60000 }); await page.waitForTimeout(300);
    ok('al llegar, el aviso se quita y la lista se ordena por cepas en frentes prioritarios', !(await carga(page)).vis && /por cepas vacantes en frentes prioritarios$/.test((await L.estado(page)).listCount), (await L.estado(page)).listCount); }
  await ctx.unroute(RF);

  // ---------- 2) colonias de Tláhuac y de la ciudad ----------
  { const exp = colCepas(TLA), filas = await verTodo(page), e = await L.estado(page), malas = compara(filas, exp), sinKm = exp.filter(x => x.kmp === 0 && x.cvt > 0);
    top.tla = exp.slice(0, 5);
    ok('Tláhuac por cepas: todas las colonias, en orden (con el mismo número, por km prioritarios), con «N cepas vacantes · M en total» y sus km prioritarios = recálculo propio', !malas.length && filas.length === exp.length && L.numEs(e.listCount) === exp.length && e.listTitle === 'Colonias de Tláhuac por atender primero',
      malas.slice(0, 3).join(' | ') || `${exp.length} colonias · ${exp.slice(0, 5).map(x => `${x.n} ${x.cv}/${x.cvt}`).join(', ')}`);
    const n = await nota(page);
    ok('Tláhuac: las colonias sin cepas en lo prioritario van al final; «Más detalles» explica el total y trae la nota del corte', ceros(filas, exp) && n.includes(NOTA('una colonia')) && n.includes('«En total» suma las cepas vacantes de todos sus frentes, de cualquier prioridad'), `${exp.filter(x => !x.cv).length} sin cepas en lo prioritario · ${sinKm.length} sin km prioritarios`); }
  { await irIni(page, '&r=alc'); await tabIni(page); await orden(page, 'cv');
    const exp = colCepas(null), filas = await verTodo(page), malas = compara(filas, exp); top.cdmx = exp.slice(0, 5);
    const sinKm = exp.filter(x => x.kmp === 0 && x.cvt > 0), k0 = exp.findIndex(x => x.kmp === 0);
    ok('toda la ciudad por cepas: todas las colonias = recálculo propio; las que no tienen km prioritarios pero sí cepas, al final, con «sin cepas en lo prioritario · M en total» y «0 km de frente prioritario»', !malas.length && filas.length === exp.length && ceros(filas, exp) && sinKm.length > 0
      && filas.slice(k0).every(r => /^sin cepas en lo prioritario · [\d,]+ en total$/.test(cepasDe(r.t)) && r.t.includes('0 km de frente prioritario')),
      malas.slice(0, 2).join(' | ') || `${exp.length} colonias (${sinKm.length} sin km prioritarios, desde el lugar ${k0 + 1}) · ${exp.slice(0, 5).map(x => `${x.n} ${x.cv}`).join(', ')}`); }

  // ---------- 3) calles de la alcaldía y de una colonia ----------
  let COLC = null;
  { await irIni(page, `&a=${M.muns[TLA]}`); await tabIni(page); await orden(page, 'callescv');
    const exp = callesCepas(f => f.mun === TLA), e = await L.estado(page), malas = compara(e.lista, exp);
    ok('Tláhuac, calles por cepas: las 10 primeras y el número de calles = recálculo propio (también las que solo tienen cepas en frentes no prioritarios); nota del corte', !malas.length && e.lista.length === 10 && L.numEs(e.listCount) === exp.length && (await nota(page)).includes(NOTA('una calle')), malas.slice(0, 2).join(' | ') || `${exp.length} calles · ${exp.slice(0, 3).map(x => `${x.n} ${x.cv}/${x.cvt}`).join(', ')}`); }
  { await orden(page, 'cv'); COLC = colCepas(TLA)[0].c; await page.$eval('#ini-list li', li => li.click()); await page.waitForTimeout(1200); await tabIni(page);
    const ops = await opciones(page), sv = await page.$eval('#ini-orden', s => s.value), exp = callesCepas(f => f.col === COLC), filas = await verTodo(page), e = await L.estado(page), malas = compara(filas, exp);
    ok(`colonia ${M.colonias[COLC].n} elegida desde la lista: el selector ofrece calles por km y por cepas, y sigue en cepas`, ops.join('|') === 'calles=Calles · más km prioritarios|cv=Calles · más cepas vacantes' && sv === 'cv' && new URL(e.url).searchParams.get('c') === String(COLC), `${ops.join(' | ')} · ${sv}`);
    ok('calles de la colonia por cepas: todas, en orden, con su número y su total = recálculo propio; lo que no tiene cepas en lo prioritario, al final', !malas.length && filas.length === exp.length && L.numEs(e.listCount) === exp.length && ceros(filas, exp),
      malas.slice(0, 3).join(' | ') || `${exp.length} calles · ${exp.slice(0, 3).map(x => `${x.n} ${x.cv}/${x.cvt}`).join(', ')}`); }

  // ---------- 4) con «Con banqueta» y con el filtro «Espacio» ----------
  { await irIni(page, `&a=${M.muns[TLA]}&b=con`); await tabIni(page); await orden(page, 'cv');
    const exp = colCepas(TLA, { banq: 'con' }), filas = await verTodo(page), malas = compara(filas, exp);
    ok('Tláhuac con «Con banqueta», colonias por cepas: todas = recálculo propio (solo frentes con banqueta, también en el total)', !malas.length && filas.length === exp.length && exp[0].cvt !== colCepas(TLA)[0].cvt, malas.slice(0, 2).join(' | ') || `${exp.length} colonias · ${exp.slice(0, 3).map(x => `${x.n} ${x.cv}/${x.cvt}`).join(', ')}`); }
  { await irIni(page, `&a=${M.muns[TLA]}&e=to`); await tabIni(page); await orden(page, 'cv');
    const exp = colCepas(TLA, { m: 2 }), filas = await verTodo(page), malas = compara(filas, exp);
    ok('Tláhuac con el filtro «Tocón», colonias por cepas: solo cuentan los frentes con tocón = recálculo propio', !malas.length && filas.length === exp.length, malas.slice(0, 2).join(' | ') || `${exp.length} colonias · ${exp.slice(0, 3).map(x => `${x.n} ${x.cv}/${x.cvt}`).join(', ')}`);
    await orden(page, 'callescv'); const exp2 = callesCepas(f => f.mun === TLA, { m: 2 }), e = await L.estado(page), malas2 = compara(e.lista, exp2);
    ok('Tláhuac con «Tocón», calles por cepas = recálculo propio', !malas2.length && L.numEs(e.listCount) === exp2.length, malas2.slice(0, 2).join(' | ') || `${exp2.length} calles`); }
  { await irIni(page, `&c=${COLC}&b=con`); await tabIni(page); await orden(page, 'cv');
    const exp = callesCepas(f => f.col === COLC, { banq: 'con' }), filas = await verTodo(page), malas = compara(filas, exp);
    ok('una colonia con «Con banqueta», calles por cepas = recálculo propio', !malas.length && filas.length === exp.length, malas.slice(0, 2).join(' | ') || `${exp.length} calles`); }

  // ---------- 5) avenidas del Gobierno Central ----------
  const CM = avCepas(null).find(x => x.n === '5 de Mayo');
  await irIni(page, `&r=gc&a=${M.muns[IZT]}`); await tabIni(page);
  { const ops = await opciones(page);
    ok('Gobierno Central en una alcaldía: «Mostrar» ofrece avenidas por km y por cepas', ops.join('|') === 'av=Avenidas · más km prioritarios|avcv=Avenidas · más cepas vacantes', ops.join(' | '));
    await orden(page, 'avcv'); const exp = avCepas(IZT), filas = await verTodo(page), e = await L.estado(page), malas = compara(filas, exp, 'prioritarios');
    top.izt = exp.slice(0, 5);
    ok('Iztapalapa, avenidas por cepas: todas, en orden, con su número y su total = recálculo propio (por sus frentes del Gobierno Central y en el camellón)', !malas.length && filas.length === exp.length && L.numEs(e.listCount) === exp.length && /por cepas vacantes en tramos prioritarios$/.test(e.listCount),
      malas.slice(0, 3).join(' | ') || `${exp.length} avenidas · ${exp.slice(0, 5).map(x => `${x.n} ${x.cv}/${x.cvt}`).join(', ')}`);
    ok('Iztapalapa: las avenidas sin cepas en lo prioritario, al final; nota del corte y del total', ceros(filas, exp) && (await nota(page)).includes(NOTA('una avenida')) && (await nota(page)).includes('de todos sus tramos, de cualquier prioridad'), `${exp.filter(x => !x.cv).length} sin cepas en lo prioritario`); }
  { await irIni(page, '&r=gc'); await tabIni(page); const ops = await opciones(page); await orden(page, 'avcv');
    const exp = avCepas(null), filas = await verTodo(page), malas = compara(filas, exp, 'prioritarios'); top.cdmx_av = exp.slice(0, 5);
    const k = exp.findIndex(x => x.n === '5 de Mayo'), fila = filas[k] || { t: '' };
    ok('toda la ciudad, avenidas por cepas: todas = recálculo propio; «Alcaldías» sigue al final del selector', !malas.length && filas.length === exp.length && ops.map(o => o.split('=')[0]).join() === 'av,avcv,alc' && ops[2] === 'alc=Alcaldías · más km prioritarios', malas.slice(0, 2).join(' | ') || `${exp.length} avenidas · ${exp.slice(0, 5).map(x => `${x.n} ${x.cv}`).join(', ')}`);
    ok('la avenida 5 de Mayo (128 cepas, en partes no prioritarias) aparece en su lugar, al final, con «sin cepas en lo prioritario · 128 en total»', !!CM && CM.cvt === 128 && CM.cv === 0 && k >= 0 && fila.t.startsWith(String(k + 1)) && L.norm(fila.t).includes('5 de mayo') && cepasDe(fila.t) === 'sin cepas en lo prioritario · 128 en total',
      CM ? `lugar ${k + 1} de ${exp.length} · ${fila.t.slice(0, 110)} · alcaldía ${[...CM.muns].map(m => M.munNames[m]).join(', ')}` : 'no está en los datos');
    if (CM) { const mun = [...CM.muns][0]; await irIni(page, `&r=gc&a=${M.muns[mun]}`); await tabIni(page); await orden(page, 'avcv'); const ex2 = avCepas(mun), f2 = await verTodo(page), k2 = ex2.findIndex(x => x.n === '5 de Mayo');
      ok(`en ${M.munNames[mun]}, avenidas por cepas = recálculo propio, con la 5 de Mayo en su lugar`, !compara(f2, ex2, 'prioritarios').length && k2 >= 0 && cepasDe(f2[k2].t) === cepasTxt(ex2[k2].cv, ex2[k2].cvt), `lugar ${k2 + 1}: ${f2[k2] && f2[k2].t.slice(0, 80)}`); } }
  { await irIni(page, `&r=gc&a=${M.muns[IZT]}&e=to`); await tabIni(page); await orden(page, 'avcv');
    const exp = avCepas(IZT, { m: 2 }), filas = await verTodo(page), malas = compara(filas, exp, 'prioritarios');
    ok('Iztapalapa con el filtro «Tocón», avenidas por cepas: solo cuentan los tramos con tocón = recálculo propio', !malas.length && filas.length === exp.length, malas.slice(0, 2).join(' | ') || `${exp.length} avenidas`); }
  // falla de la carga: mensaje, el selector vuelve y la lista queda; elegirlo otra vez lo vuelve a intentar
  { await ctx.route(RV, r => r.abort()); await irIni(page, `&r=gc&a=${M.muns[IZT]}`); await tabIni(page); const antes = await L.estado(page);
    await page.selectOption('#ini-orden', 'avcv'); await page.waitForFunction(() => document.getElementById('ini-carga').classList.contains('warn'), null, { timeout: 60000 }).catch(() => {});
    const a = await carga(page), d = await L.estado(page), sv = await page.$eval('#ini-orden', s => s.value);
    ok('si el archivo no llega: mensaje claro, el selector vuelve a km prioritarios y la lista queda como estaba', a.vis && a.warn && /No fue posible cargar las cepas vacantes/.test(a.t) && sv === 'av' && JSON.stringify(d.lista) === JSON.stringify(antes.lista), `${a.t} · ${sv}`);
    await ctx.unroute(RV); await orden(page, 'avcv');
    ok('al elegir otra vez el orden, se vuelve a pedir y la lista se ordena', !(await carga(page)).vis && !compara((await L.estado(page)).lista, avCepas(IZT), 'prioritarios').length); }

  // ---------- 6) Excel: columnas de espacios para plantar ----------
  const dic = (X, k) => (X.dic.find(r => r[0] === k) || [])[1] || '';
  const declara = (X, que) => COLS3.every(c => X.dic.some(r => r[0] === c && /inventario de arbolado/.test(r[1] || '') && (que ? (r[1] || '').includes(que) : true))) && dic(X, FILA).includes(FUENTE) && dic(X, FILA).includes(`Corte: ${RES.corte}`) && dic(X, FILA).includes(`frente de manzana a ${Math.round(RES.distancia_max_m)} m o menos`) && dic(X, FILA).includes('25 m o menos del eje') && X.datos[0].every(c => X.dic.some(r => r[0] === c));
  const al3 = (X) => { const h = X.datos[0] || []; return COLS3.every((c, k) => h[h.length - 3 + k] === c); };
  const COLX = COLC;
  await ir(page, `&c=${COLX}`);
  { const x = await L.descargar(page, '#dl-frentes', SAL, 240000); const X = x ? xlsx(x.ruta) : { datos: [[]], dic: [] }; const h = X.datos[0], iI = h.indexOf('id_frente'), iC = h.indexOf(COLS3[0]);
    const filas = X.datos.slice(1), malas = filas.filter(r => cF(+r[iI]).join() !== r.slice(iC, iC + 3).join()), tot = suma(filas.map(r => +r[iI]), cF), totX = [0, 1, 2].map(t => filas.reduce((s, r) => s + r[iC + t], 0));
    const ids = D.F.map((f, i) => i).filter(i => !D.F[i].gc && D.F[i].col === COLX && D.F[i].prio >= L.PRIO_MIN), totR = suma(ids, cF);
    if (x) fs.copyFileSync(x.ruta, path.join(SAL, 'ejemplo_colonia.xlsx'));
    ok(`Excel de frentes de ${M.colonias[COLX].n}: tres columnas al final (cepas_vacantes, tocones, arboles_muertos) = recálculo propio frente por frente`, !!x && al3(X) && filas.length === ids.length && !malas.length, `${filas.length} frentes · ${malas.length} distintos · ${x && x.nombre}`);
    ok('Excel de frentes de la colonia: la suma de cada columna = recálculo propio', totX.join() === tot.join() && totX.join() === totR.join(), `cepas ${totX[0]} · tocones ${totX[1]} · muertos ${totX[2]}`);
    ok('Excel de frentes: el Diccionario declara las tres columnas, con la fuente, el corte y la regla de asignación (20 m; camellón a 25 m del eje)', declara(X, 'en este frente de manzana (puntos a 20 m o menos del frente)'), dic(X, FILA).slice(0, 160)); }
  // calle consultada: la primera calle de la colonia
  { await tabIni(page); await orden(page, 'calles'); await page.$eval('#ini-list li', li => li.click()); await page.waitForTimeout(1500);
    const x = await L.descargar(page, '#dl-calle', SAL, 240000); const X = x ? xlsx(x.ruta) : { datos: [[]], dic: [] }; const h = X.datos[0], iI = h.indexOf('id_frente'), iC = h.indexOf(COLS3[0]);
    const filas = X.datos.slice(1), malas = filas.filter(r => cF(+r[iI]).join() !== r.slice(iC, iC + 3).join());
    const nid = filas.length ? D.F[+filas[0][iI]].name : -1, ids = D.F.map((f, i) => i).filter(i => !D.F[i].gc && D.F[i].col === COLX && D.F[i].name === nid);
    ok('Excel de la calle consultada: las tres columnas al final = recálculo propio frente por frente (todas las prioridades), y el Diccionario las declara', !!x && al3(X) && filas.length === ids.length && !malas.length && declara(X, 'en este frente de manzana (puntos a 20 m o menos del frente)'), `${x && x.nombre} · ${filas.length} frentes · suma ${suma(ids, cF).join('/')}`); }
  // resumen por calle de Tláhuac: suma de todos los frentes de cada calle en el ámbito
  await ir(page, `&a=${M.muns[TLA]}`);
  { const x = await L.descargar(page, '#dl-calles', SAL, 240000); const X = x ? xlsx(x.ruta) : { datos: [[]], dic: [] }; const h = X.datos[0], iV = h.indexOf('vialidad'), iCo = h.indexOf('colonia'), iK = h.indexOf('km_total'), iC = h.indexOf(COLS3[0]);
    const exp = callesCepas(f => f.mun === TLA, { soloPrio: true }).map(s => `${s.n}|${s.col ? M.colonias[s.col].n : 'Colonia no identificada'}|${(+s.km.toFixed(2))}|${suma(s.ids, cF).join('|')}`).sort();
    const rec = X.datos.slice(1).map(r => `${r[iV]}|${r[iCo]}|${r[iK]}|${r.slice(iC, iC + 3).join('|')}`).sort();
    ok('resumen por calle de Tláhuac: las tres columnas al final = suma de todos los frentes de cada calle en el ámbito (recálculo propio), y el Diccionario las declara', !!x && al3(X) && rec.length === exp.length && rec.every((r, k) => r === exp[k]) && declara(X, 'de cualquier prioridad'),
      `${rec.length} calles vs ${exp.length} · ${rec.find((r, k) => r !== exp[k]) || ''}`); }
  // tramos y avenidas del Gobierno Central en Iztapalapa
  await ir(page, `&r=gc&a=${M.muns[IZT]}`);
  { const x = await L.descargar(page, '#dl-tramos', SAL, 240000); const X = x ? xlsx(x.ruta) : { datos: [[]], dic: [] }; const h = X.datos[0], iR = h.indexOf('id_tramo'), iL = h.indexOf('longitud_m'), iC = h.indexOf(COLS3[0]);
    const partes = D.VP.map((v, i) => i).filter(i => D.VP[i].mun === IZT && D.VP[i].prio >= L.PRIO_MIN);
    const exp = partes.map(i => `${D.VP[i].rec}|${D.VP[i].len}|${cV(i).join('|')}`).sort(), rec = X.datos.slice(1).map(r => `${r[iR]}|${r[iL]}|${r.slice(iC, iC + 3).join('|')}`).sort();
    const tot = [0, 1, 2].map(t => X.datos.slice(1).reduce((s, r) => s + r[iC + t], 0));
    ok('Excel de tramos de Iztapalapa: tres columnas al final = recálculo propio parte por parte (por sus frentes del Gobierno Central y en el camellón)', !!x && al3(X) && rec.length === exp.length && rec.every((r, k) => r === exp[k]), `${rec.length} partes · ${rec.find((r, k) => r !== exp[k]) || ''}`);
    ok('Excel de tramos: la suma de cada columna = recálculo propio, y el Diccionario las declara (con el camellón)', tot.join() === suma(partes, cV).join() && declara(X, 'camellón'), `cepas ${tot[0]} · tocones ${tot[1]} · muertos ${tot[2]}`); }
  { const x = await L.descargar(page, '#dl-avenidas', SAL, 240000); const X = x ? xlsx(x.ruta) : { datos: [[]], dic: [] }; const h = X.datos[0], iV = h.indexOf('vialidad'), iC = h.indexOf(COLS3[0]);
    const S = new Map(); D.VP.forEach((v, i) => { if (v.mun !== IZT) return; const s = S.get(v.nom) || [0, 0, 0]; const c = cV(i); S.set(v.nom, [s[0] + c[0], s[1] + c[1], s[2] + c[2]]); });
    // v1.40: la lista trae las avenidas de «Mostrar» por km, las que tienen km prioritarios en el ámbito
    const conP = new Set(D.VP.filter(v => v.mun === IZT && v.prio >= L.PRIO_MIN).map(v => v.nom));
    const exp = [...S].filter(([a]) => conP.has(a)).map(([a, c]) => `${M.vp.nomenclat[a]}|${c.join('|')}`).sort(), rec = X.datos.slice(1).map(r => `${r[iV] ?? ''}|${r.slice(iC, iC + 3).join('|')}`).sort();   // un nombre vacío llega como celda vacía
    ok('resumen por avenida de Iztapalapa: las tres columnas = suma de todas sus partes en el ámbito (recálculo propio), y el Diccionario las declara', !!x && al3(X) && rec.length === exp.length && rec.every((r, k) => r === exp[k]) && declara(X, 'de cualquier prioridad'), `${rec.length} avenidas · ${rec.find((r, k) => r !== exp[k]) || ''}`); }

  // ---------- 7) GeoJSON y KML ----------
  await ir(page, `&c=${COLX}`);
  { const g = await L.descargar(page, '#dl-geojson', SAL); const J = g ? JSON.parse(fs.readFileSync(g.ruta, 'utf8')) : { features: [] };
    const malas = J.features.filter(f => cF(f.properties.id_frente).join() !== COLS3.map(c => f.properties[c]).join());
    ok('GeoJSON de la colonia: propiedades cepas_vacantes, tocones y arboles_muertos = recálculo propio en cada frente, y la descripción las explica', J.features.length > 0 && !malas.length && J.features.every(f => Object.keys(f.properties).slice(-3).join() === COLS3.join()) && (J.descripcion || '').includes('Propiedades cepas_vacantes') && (J.descripcion || '').includes(RES.corte), `${J.features.length} frentes · ${malas.length} distintos`);
    const k = await L.descargar(page, '#dl-kml', SAL); const K = k ? fs.readFileSync(k.ruta, 'utf8') : '';
    const pms = K.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [], dato = (p, n) => ((p.match(new RegExp(`<Data name="${n}"><value>([^<]*)</value>`)) || [])[1]);
    const malK = pms.filter(p => cF(+dato(p, 'id_frente')).join() !== COLS3.map(c => dato(p, c)).join());
    ok('KML de la colonia: los mismos datos en cada línea', pms.length === J.features.length && !malK.length && /Propiedades cepas_vacantes/.test(K), `${pms.length} líneas · ${malK.length} distintas`); }
  await ir(page, `&r=gc&a=${M.muns[IZT]}`);
  { const g = await L.descargar(page, '#dl-geojson', SAL); const J = g ? JSON.parse(fs.readFileSync(g.ruta, 'utf8')) : { features: [] };
    const partes = D.VP.map((v, i) => i).filter(i => D.VP[i].mun === IZT && D.VP[i].prio >= L.PRIO_MIN);
    const exp = partes.map(i => `${D.VP[i].rec}|${D.VP[i].len}|${cV(i).join('|')}`).sort(), rec = J.features.map(f => `${f.properties.id_tramo}|${f.properties.longitud_m}|${COLS3.map(c => f.properties[c]).join('|')}`).sort();
    ok('GeoJSON de tramos de Iztapalapa: las mismas propiedades = recálculo propio parte por parte', rec.length === exp.length && rec.every((r, k) => r === exp[k]), `${rec.length} partes`); }
  await ctx.close();

  // ---------- 8) sin conexión al inventario: la descarga sale sin las columnas y lo dice ----------
  { const { page: p, ctx: c } = await L.abrir(browser, base + `&c=${COLX}#nomap`, {}, errores); await c.route('**/espacios_*.bin*', r => r.abort());
    const x = await L.descargar(p, '#dl-frentes', SAL, 240000); const X = x ? xlsx(x.ruta) : { datos: [[]], dic: [] }; const st = await p.$eval('#dl-status', e => e.textContent);
    ok('sin el inventario, el Excel de frentes sale sin las columnas, el Diccionario dice «No se pudo cargar el inventario: sin columnas de espacios» y la pantalla lo avisa', !!x && !COLS3.some(k => X.datos[0].includes(k)) && X.datos[0][X.datos[0].length - 1] === 'lon' && dic(X, FILA) === 'No se pudo cargar el inventario: sin columnas de espacios' && !X.dic.some(r => COLS3.includes(r[0])) && /^Descargado/.test(st) && /sin las columnas de espacios para plantar/.test(st) && X.datos.length - 1 === D.F.filter(f => !f.gc && f.col === COLX && f.prio >= L.PRIO_MIN).length,
      `${X.datos[0].slice(-2).join(',')} · ${st}`);
    const g = await L.descargar(p, '#dl-geojson', SAL); const J = g ? JSON.parse(fs.readFileSync(g.ruta, 'utf8')) : { features: [{ properties: {} }] };
    ok('sin el inventario, el GeoJSON sale sin esas propiedades y lo dice', J.features.length > 0 && J.features.every(f => !COLS3.some(k => k in f.properties)) && /No se pudo cargar el inventario: sin propiedades de espacios/.test(J.descripcion || ''), (J.descripcion || '').slice(-120));
    await p.goto(base + `&r=gc&a=${M.muns[IZT]}#nomap`); await p.waitForSelector('#loader[hidden]', { state: 'attached' }); await p.waitForTimeout(700);
    const t = await L.descargar(p, '#dl-tramos', SAL, 240000); const T = t ? xlsx(t.ruta) : { datos: [[]], dic: [] };
    ok('sin el inventario, el Excel de tramos también sale, sin las columnas y lo dice', !!t && !COLS3.some(k => T.datos[0].includes(k)) && dic(T, FILA) === 'No se pudo cargar el inventario: sin columnas de espacios', t && t.nombre);
    await c.close(); }

  // ---------- 9) celular de 390 × 844 ----------
  const mide = p => p.evaluate(() => { const s = document.getElementById('ini-orden'), cs = getComputedStyle(s), c = document.createElement('canvas').getContext('2d'); c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const disp = s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 22, w = innerWidth;   // 22 px: la flecha del selector
    const ops = [...s.options].map(o => ({ v: o.value, t: o.textContent, a: Math.round(c.measureText(o.textContent).width) }));
    const ks = [...document.querySelectorAll('#ini-list li .k')].map(k => ({ r: k.getBoundingClientRect().right, corta: k.scrollWidth > k.clientWidth + 1 }));
    const lis = [...document.querySelectorAll('#ini-list li')].map(li => li.getBoundingClientRect().right), det = document.querySelector('#ini-note details.mas');
    return { disp, ops, letra: parseFloat(cs.fontSize), desborde: document.documentElement.scrollWidth - w, cabe: lis.length > 0 && Math.max(...lis) <= w + 0.5 && ks.every(k => k.r <= w + 0.5 && !k.corta) && s.getBoundingClientRect().right <= w + 0.5, plegada: !!det && !det.open }; });
  for (const [q, v, que] of [[`&a=${M.muns[TLA]}`, 'cv', 'colonias de Tláhuac'], [`&c=${COLX}`, 'cv', 'calles de una colonia'], [`&r=gc&a=${M.muns[IZT]}`, 'avcv', 'avenidas de Iztapalapa']]) {
    const { page: m, ctx: mc } = await L.abrir(browser, base + q + '#nomap', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, errores);
    await tabIni(m); await orden(m, v); const r = await mide(m);
    ok(`celular de 390 px, ${que} por cepas: todas las opciones caben enteras en el selector (letra de ${r.letra} px), la nota queda plegada y la lista (con «· M en total») no desborda`, r.ops.length >= 2 && r.ops.every(o => o.a <= r.disp) && r.letra >= 14 && r.plegada && r.desborde <= 0 && r.cabe, `${r.ops.map(o => `${o.t} ${o.a}`).join(' · ')} ≤ ${r.disp} px · desborde ${r.desborde}`);
    await mc.close(); }

  // ---------- 10) lo que ya existía, igual que en la versión anterior (v1.26) ----------
  const REF = process.env.REF_ANTERIOR || '6935635';   // v1.26
  // REF_ANTERIOR=no acorta la prueba mientras se trabaja, pero lo que no se comparó no cuenta como aprobado (A1-04): la prueba falla
  if (REF === 'no') ok('comparación con la versión anterior', false, 'no se verificó: REF_ANTERIOR=no');
  else {
    let ANT = null; try { ANT = docsDe(REF); } catch (e) { ok(`se obtiene docs/ de la versión anterior (${REF}) desde Git`, false, String(e.message || e).slice(0, 160)); }
    if (ANT) {
      const sAnt = await L.servidor(0, ANT); const errAnt = [];
      const pA = await L.abrir(browser, sAnt.url + '?modo=ligero#nomap', {}, errAnt), pN = await L.abrir(browser, base + '#nomap', {}, errores);
      const irA = async (p, url) => { await p.goto('about:blank'); await p.goto(url); await p.waitForSelector('#loader[hidden]', { state: 'attached' }); await p.waitForTimeout(700); await p.evaluate(() => { const t = document.getElementById('tab-res'); if (t) t.click(); }); };
      // las cifras del Resumen sin sus rótulos (cambiaron a propósito), listas, leyenda, descargas, capas; por cepas, lo que la v1.26 listaba
      const CAMPOS = ['titulo', 'kpis', 'bars', 'bars2Vis', 'bars2', 'nota', 'alcinfo', 'colinfo', 'avinfo', 'mapsum', 'listTitle', 'listCount', 'lista', 'dl', 'dlStatus', 'leyenda', 'lgScope', 'legendVp', 'capas'];
      const quitaVer = s => String(s).replace(/Versión \d+\.\d+[^.]*\./g, 'Versión X.').replace(/_\d{8}\./g, '.');
      const ambas = async (q, accion) => { await irA(pA.page, sAnt.url + '?modo=ligero' + q + '#nomap'); await irA(pN.page, base + q + '#nomap'); if (accion) { await accion(pA.page); await accion(pN.page); } };
      const compara2 = async (q, accion, cepas) => { await ambas(q, accion); const a = L.comparable(await L.estado(pA.page)), b = L.comparable(await L.estado(pN.page));
        if (cepas) b.lista = b.lista.slice(0, a.lista.length);   // por cepas, la v1.27 agrega al final lo que no tiene km prioritarios
        return CAMPOS.filter(k => !(cepas && k === 'listCount') && quitaVer(JSON.stringify(a[k])) !== quitaVer(JSON.stringify(b[k]))); };
      const ordenaV = v => async p => { await tabIni(p); await p.selectOption('#ini-orden', v); if (/cv$/.test(v)) await p.waitForFunction(v2 => window.__INV.esp().orden === v2 && window.__INV.esp().pendiente === null, v, { timeout: 60000 }); await p.waitForTimeout(300); await verTodo(p); };
      const casos = [['&r=alc', 'ciudad'], [`&a=${M.muns[TLA]}`, 'Tláhuac'], [`&c=${COLX}`, 'colonia'], [`&a=${M.muns[IZT]}&e=cv&b=con`, 'Iztapalapa con filtros'], [`&r=gc&a=${M.muns[IZT]}`, 'GC Iztapalapa'], ['&r=gc', 'GC ciudad'], [`&r=both&a=${M.muns[IZT]}`, 'dos redes']];
      const difA = []; for (const [q, n] of casos) { const d = await compara2(q); if (d.length) difA.push(`${n}: ${d.join(', ')}`); }
      ok(`pantalla, cifras y listas iguales que en ${REF} (${casos.length} consultas; del Resumen, las cifras sin sus rótulos)`, !difA.length, difA.join(' | '));
      const ordenes = [['&r=alc', 'colonias de la ciudad por cepas', 'cv', 1], [`&a=${M.muns[TLA]}`, 'colonias de Tláhuac por cepas', 'cv', 1], [`&a=${M.muns[TLA]}`, 'calles de Tláhuac por cepas', 'callescv', 1], [`&a=${M.muns[TLA]}&b=con`, 'colonias de Tláhuac con banqueta por cepas', 'cv', 1],
        [`&a=${M.muns[TLA]}&e=to`, 'colonias de Tláhuac con tocón por cepas', 'cv', 1], [`&c=${COLX}`, 'calles de una colonia por cepas', 'cv', 1], [`&r=gc&a=${M.muns[IZT]}`, 'avenidas de Iztapalapa por cepas', 'avcv', 1], ['&r=gc', 'avenidas de la ciudad por cepas', 'avcv', 1],
        [`&a=${M.muns[TLA]}`, 'colonias de Tláhuac por km', 'kmp'], [`&a=${M.muns[TLA]}`, 'colonias de Tláhuac por habitantes', 'pob'], [`&a=${M.muns[TLA]}`, 'calles de Tláhuac por km', 'calles'], [`&r=gc&a=${M.muns[IZT]}`, 'avenidas de Iztapalapa por km', 'av'], ['&r=alc', 'alcaldías', 'alc']];
      const difO = []; for (const [q, n, v, cep] of ordenes) { const d = await compara2(q, ordenaV(v), !!cep); if (d.length) difO.push(`${n}: ${d.join(', ')}`); }
      ok(`los órdenes que siguen (por km, habitantes y alcaldías iguales; por cepas, lo que ya listaba, en el mismo orden y con sus cifras) iguales que en ${REF} (${ordenes.length} listas completas)`, !difO.length, difO.join(' | '));
      // descargas: iguales, columnas de espacios incluidas
      const difD = [];
      const xl = async (q, id) => { await ambas(q); const a = await L.descargar(pA.page, id, SAL_ANT, 240000), b = await L.descargar(pN.page, id, SAL, 240000);
        // v1.40: nombres, textos y las listas en el orden de «Mostrar» (lib_pruebas: nombreAntes, excelAntes)
        const lst = id === '#dl-calles' || id === '#dl-avenidas';
        if (!a || !b || !L.mismoNombre(a.nombre, b.nombre)) { difD.push(`${q} ${id} (nombre: ${a && a.nombre} · ${b && b.nombre})`); return; } const A = L.excelAntes(xlsx(a.ruta), lst), B = L.excelAntes(xlsx(b.ruta), lst);
        const dA = quitaVer(JSON.stringify(sinFecha(A))), dB = quitaVer(JSON.stringify(sinFecha(B))); let k = 0; while (k < dA.length && dA[k] === dB[k]) k++;
        if (JSON.stringify(A.datos) !== JSON.stringify(B.datos)) difD.push(`${q} ${id} (renglones)`); else if (dA !== dB) difD.push(`${q} ${id} (diccionario: «${dA.slice(k, k + 80)}» · «${dB.slice(k, k + 80)}»)`); };
      await xl(`&c=${COLX}`, '#dl-frentes'); await xl(`&c=${COLX}&e=cv`, '#dl-frentes'); await xl(`&a=${M.muns[TLA]}`, '#dl-calles'); await xl(`&r=gc&a=${M.muns[IZT]}`, '#dl-tramos'); await xl(`&r=gc&a=${M.muns[IZT]}`, '#dl-avenidas'); await xl(`&r=gc&a=${M.muns[IZT]}&e=to`, '#dl-tramos');
      for (const q of [`&c=${COLX}`, `&r=gc&a=${M.muns[IZT]}`]) { await ambas(q); const a = await L.descargar(pA.page, '#dl-geojson', SAL_ANT), b = await L.descargar(pN.page, '#dl-geojson', SAL);
        if (!a || !b || !L.mismoNombre(a.nombre, b.nombre) || geoSinVer(L.textoAntes(fs.readFileSync(a.ruta, 'utf8'))) !== geoSinVer(L.textoAntes(fs.readFileSync(b.ruta, 'utf8')))) difD.push(`${q} geojson`); }
      ok(`Excel (frentes, calles, tramos y avenidas) y GeoJSON iguales que en ${REF} (renglones, columnas, orden y diccionario)`, !difD.length, difD.join(' | '));
      ok(`la versión anterior (${REF}) abrió sin errores de JavaScript`, !errAnt.length, errAnt.slice(0, 2).join(' | '));
      await pA.ctx.close(); await pN.ctx.close(); sAnt.close();
      try { fs.rmSync(ANT, { recursive: true, force: true }); } catch (e) {}
    }
  }

  ok('sin errores de JavaScript durante la prueba', errores.length === 0, errores.slice(0, 2).join(' | '));
  const col = x => `${x.n} (${M.munNames[M.muns.indexOf(M.colonias[x.c].m)]}) ${x.cv} · ${x.cvt} en total`;
  console.log('\nColonias con más cepas vacantes en frentes prioritarios · ciudad: ' + (top.cdmx || []).map(col).join(' · '));
  console.log('Colonias con más cepas vacantes en frentes prioritarios · Tláhuac: ' + (top.tla || []).map(x => `${x.n} ${x.cv} · ${x.cvt} en total`).join(' · '));
  console.log('Avenidas con más cepas vacantes en tramos prioritarios · ciudad: ' + (top.cdmx_av || []).map(x => `${x.n} ${x.cv} · ${x.cvt} en total`).join(' · '));
  console.log('Avenidas con más cepas vacantes en tramos prioritarios · Iztapalapa: ' + (top.izt || []).map(x => `${x.n} ${x.cv} · ${x.cvt} en total`).join(' · '));
  console.log(`Ejemplo de Excel de colonia: ${path.join(SAL, 'ejemplo_colonia.xlsx')}`);
  await browser.close(); srv.close(); process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
