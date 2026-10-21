// Filtro «Espacio» y orden por cepas vacantes para las vialidades primarias del Gobierno Central (v1.24).
// Regla: un punto del inventario de arbolado asignado a un frente de manzana a cargo del Gobierno Central cuenta para la parte de vialidad
// de ese frente; un punto sin frente (a más de 20 m de todos), para la parte cuyo eje esté a 25 m o menos, la más cercana (camellón); los de
// los frentes de las alcaldías no se mueven.
// Comprueba, contra un recálculo propio desde docs/datos (inv_<cve>.bin + data.bin + vp.bin, con una rejilla de segmentos propia para la
// regla del camellón):
//  · el archivo espacios_vp.bin y sus cifras de control;
//  · Gobierno Central en la ciudad y en Iztapalapa con cada combinación del filtro (km de vialidad prioritaria y tramos), la etiqueta, el
//    resumen del mapa, el aviso del inventario en curso y «e=» en la dirección con «r=gc»;
//  · Excel de tramos y de avenidas, GeoJSON, KML, ficha de vialidades y ficha de avenida con el filtro (solo esas partes, y lo declaran);
//  · «Avenidas con más cepas vacantes» (número, ceros al final, nota del corte, carga diferida con aviso, falla y reintento);
//  · ficha de un tramo con sus conteos y ficha de un punto del camellón;
//  · las dos redes, «Reiniciar», celular de 390 px y sin errores de JavaScript.
// Además compara contra la versión anterior (v1.23, tomada de Git; REF_ANTERIOR=<commit> para otra, REF_ANTERIOR=no para omitirlo, y entonces la prueba falla):
// con el filtro apagado todo queda igual, y con «Alcaldías» el filtro y el orden por cepas dan exactamente las mismas cifras; los puntos del
// inventario conservan su frente. Desde la v1.27, del Resumen se comparan las cifras sin sus rótulos y, en el orden por cepas, lo que la v1.23
// ya listaba (L.comparable).
// Uso: node 04_pruebas/prueba_espacio_gobierno_central.js   · termina con código ≠ 0 si algo falla.
const fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib'), cp = require('child_process');
const L = require('./lib_pruebas.js');
const SAL = process.env.SALIDA || fs.mkdtempSync(path.join(os.tmpdir(), 'espgc-'));
// lo que baja la versión anterior va en su propia carpeta: con el mismo nombre de archivo, el segundo reemplazaría al primero y se
// compararía el archivo nuevo consigo mismo (así pasó hasta la v1.39)
const SAL_ANT = path.join(SAL, 'version_anterior'); fs.mkdirSync(SAL_ANT, { recursive: true });
const ok = L.Registro('espacio gobierno central');
const D = L.decodificar(); const M = D.META;
const RAIZ = path.join(__dirname, '..');
const RES = JSON.parse(fs.readFileSync(path.join(RAIZ, '02_fuente', 'datos', 'inventario', 'RESUMEN.json'), 'utf8'));
const EV = RES.vialidades_con_espacio;
const IZT = M.munNames.indexOf('Iztapalapa'), TLA = M.munNames.indexOf('Tláhuac'), AO = M.munNames.indexOf('Álvaro Obregón');
const COD = ['cv', 'to', 'am'], NOM = ['cepa vacante', 'tocón', 'árbol muerto'];
const codigo = m => COD.filter((_, t) => m & (1 << t)).join(',');
const lista = m => { const n = NOM.filter((_, t) => m & (1 << t)); return n.length < 2 ? n.join('') : n.slice(0, -1).join(', ') + ' o ' + n[n.length - 1]; };
const slugEsp = m => '_con_' + ['cepa_vacante', 'tocon', 'arbol_muerto'].filter((_, t) => m & (1 << t)).join('_');
const ESC = 200000, KX = 111320 * Math.cos(19.4 * Math.PI / 180), KY = 110540;
const xlsx = ruta => JSON.parse(cp.execFileSync(L.PY, ['-c', `
import openpyxl, json, sys
wb = openpyxl.load_workbook(sys.argv[1], read_only=True)
print(json.dumps({'datos': [list(r) for r in wb['Datos'].iter_rows(values_only=True)], 'dic': [list(r) for r in wb['Diccionario'].iter_rows(values_only=True)]}, default=str))`, ruta], { maxBuffer: 1 << 28 }).toString());
const pdf = ruta => cp.execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', ruta, '-']).toString().replace(/\s+/g, ' ');

// ---------- decodificadores propios (independientes de la aplicación) ----------
const enteros = raw => { let rp = 0; const rv = () => { let res = 0, sh = 0, b; do { b = raw[rp++]; res += (b & 0x7f) * Math.pow(2, sh); sh += 7; } while (b & 0x80); return (res % 2) ? -((res + 1) / 2) : res / 2; }; rv.fin = () => rp === raw.length; return rv; };
// puntos de inv_<cve>.bin (formato 2: al final, la parte de vialidad + 1 de un punto del camellón); docs = carpeta del sitio
function leeInv(docs, cve) { const rv = enteros(zlib.gunzipSync(fs.readFileSync(path.join(docs, 'datos', 'inventario', `inv_${cve}.bin`))));
  const formato = rv(), n = rv(), P = []; let x = 0, y = 0, fr = 0, pre = 0, uga = 0, num = 0;
  for (let i = 0; i < n; i++) { x += rv(); y += rv(); const t = rv(); fr += rv(); pre += rv(); uga += rv(); num += rv(); const vp = formato >= 2 ? rv() - 1 : -1;
    P.push({ x, y, t, fr: fr - 1, vp, clave: pre * 1e10 + uga * 1e6 + num, cve }); }
  return { formato, P, completo: rv.fin() }; }
// archivo de puntos por tipo (espacios_vp.bin o espacios_frentes.bin): por registro, índice en diferencias y tres conteos
function leeConteos(nombre, max) { const rv = enteros(zlib.gunzipSync(fs.readFileSync(path.join(L.DOCS, 'datos', 'inventario', nombre))));
  const formato = rv(), n = rv(), B = new Uint8Array(max), CNT = new Map(); let f = -1, orden = true;
  for (let k = 0; k < n; k++) { const d = rv(), c = [rv(), rv(), rv()]; orden = orden && d > 0 && Math.min(...c) >= 0 && Math.max(...c) > 0; f += d;
    if (f < max) { B[f] = (c[0] ? 1 : 0) | (c[1] ? 2 : 0) | (c[2] ? 4 : 0); CNT.set(f, c); } }
  return { formato, n, B, CNT, completo: rv.fin(), orden, ultimo: f }; }

// ---------- recálculos propios ----------
// tramos de vialidad primaria: km y tramos (id_tramo) en un territorio, con el filtro m (0 = sin filtro)
function vpCalc(BV, m, terr) { const r = { km: [0, 0, 0, 0, 0], recs: new Set(), recsp: new Set(), partes: [], partesP: [] };
  D.VP.forEach((v, i) => { if (!terr(v) || (m && !(BV[i] & m))) return; r.km[v.prio] += v.len / 1000; r.recs.add(v.rec); r.partes.push(i); if (v.prio >= L.PRIO_MIN) { r.recsp.add(v.rec); r.partesP.push(i); } });
  r.kmp = r.km.slice(L.PRIO_MIN).reduce((a, b) => a + b, 0); r.kmt = r.km.reduce((a, b) => a + b, 0); return r; }
// frentes a cargo de la alcaldía (con las dos redes)
function frCalc(BF, m, terr) { let km = 0, n = 0; D.F.forEach((f, i) => { if (f.gc || f.prio < L.PRIO_MIN || !terr(f) || (m && !(BF[i] & m))) return; km += f.len / 1000; n++; }); return { km, n }; }
// avenidas por cepas vacantes de sus partes prioritarias en el ámbito (con el filtro m); con el mismo número, por km prioritarios y km
// (v1.27) cvt: las cepas de todas sus partes, el total que acompaña al renglón; las avenidas sin km prioritarios con cepas van al final, por ese total
function avCepas(BV, CNT, m, mun) { const S = new Map();
  D.VP.forEach((v, i) => { if ((mun !== null && v.mun !== mun) || (m && !(BV[i] & m))) return; let s = S.get(v.nom); if (!s) { s = { a: v.nom, km: 0, kmp: 0, cv: 0, cvt: 0, recs: new Set(), recsp: new Set() }; S.set(v.nom, s); }
    const c = (CNT.get(i) || [0])[0]; s.km += v.len / 1000; s.cvt += c; s.recs.add(v.rec); if (v.prio >= L.PRIO_MIN) { s.kmp += v.len / 1000; s.recsp.add(v.rec); s.cv += c; } });
  return [...S.values()].filter(s => s.kmp > 0 || s.cvt > 0).map(s => ({ ...s, n: M.vp.nomenclat[s.a] })).sort((a, b) => b.cv - a.cv || b.kmp - a.kmp || (a.kmp ? 0 : b.cvt - a.cvt) || b.km - a.km); }
const cepasTxt = (cv, cvt) => cv ? `${L.fN.format(cv)} cepa${cv === 1 ? '' : 's'} vacante${cv === 1 ? '' : 's'}${cvt && cvt !== cv ? ` · ${L.fN.format(cvt)} en total` : ''}` : cvt ? `sin cepas en lo prioritario · ${L.fN.format(cvt)} en total` : 'sin cepas registradas';
const cepasDe = t => { const m = t.match(/(?:^|\s)(\d[\d,]* cepas? vacantes?(?: · [\d,]+ en total)?|sin cepas en lo prioritario · [\d,]+ en total|sin cepas registradas)/); return m ? m[1].trim() : ''; };
function comparaAv(filas, exp) { const malas = [];
  filas.forEach((r, k) => { const e = exp[k], t = L.norm(r.t);
    if (!e || !t.includes(L.norm(e.n)) || cepasDe(r.t) !== cepasTxt(e.cv, e.cvt) || !t.includes(`${L.kmTxt(e.kmp)} ${L.kmUn(e.kmp)} prioritarios`)) malas.push(`${k + 1}: «${r.t.slice(0, 90)}» vs ${e ? `${e.n} ${cepasTxt(e.cv, e.cvt)} ${L.kmTxt(e.kmp)}` : '—'}`); });
  return malas; }
const kpiVP = (kp, exp) => kp.length > 0 && kp[0].v.replace(/\s+/g, '').startsWith(L.kmTxt(exp.kmp)) && (exp.recsp.size >= 10000 || L.numEs(kp[2].v) === exp.recsp.size);
// las tres cifras de la ficha (km prioritarios, porcentaje y tramos prioritarios) salen seguidas en el texto del PDF
const kpiPdf = (t, e) => new RegExp(`${L.kmTxt(e.kmp)} ${L.kmUn(e.kmp)} [\\d.,]+ % ${L.fN.format(e.recsp.size)} `).test(t) && t.includes(`tramos prioritarios, de los ${L.fN.format(e.recs.size)} tramos`);
const NOTA_AV = `Cuenta solo lo inventariado hasta ${RES.corte} (inventario en curso): una avenida con 0 puede no estar inventariada todavía.`;

// distancia (m) de un punto a una polilínea en grados (en metros con KX, KY, como 9_inventario_espacios.py)
function distLinea(px, py, pts) { if (pts.length < 4) return Math.hypot(px - pts[0] * KX, py - pts[1] * KY); let d = Infinity;
  for (let k = 0; k + 3 < pts.length; k += 2) { const ax = pts[k] * KX, ay = pts[k + 1] * KY, dx = pts[k + 2] * KX - ax, dy = pts[k + 3] * KY - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1))); d = Math.min(d, Math.hypot(px - ax - t * dx, py - ay - t * dy)); }
  return d; }

// lo que la v1.25 agregó a las descargas (las columnas y propiedades de espacios para plantar, al final, y su renglón del diccionario) se
// quita para comparar con la versión anterior; lo demás debe ser idéntico (lo revisa también prueba_cepas_total.js contra la v1.24)
const COLS_ESP = ['cepas_vacantes', 'tocones', 'arboles_muertos'], FILA_ESP = 'Espacios para plantar (inventario de arbolado)';
const sinFecha = X => { const k = (X.datos[0] || []).indexOf(COLS_ESP[0]);
  return { datos: k < 0 ? X.datos : X.datos.map(r => r.slice(0, k)), dic: X.dic.filter(r => !['Fecha de generación', 'Versión de la herramienta', 'Última actualización de la herramienta', 'Archivo', FILA_ESP].includes(r[0]) && !COLS_ESP.includes(r[0])) }; };
const geoSinEsp = t => { const J = JSON.parse(t); J.descripcion = String(J.descripcion || '').replace(/ (Propiedades cepas_vacantes|No se pudo cargar el inventario|Esta copia \(archivo único\)).*$/, ''); for (const f of J.features) for (const c of COLS_ESP) delete f.properties[c]; return JSON.stringify(J); };
// la versión anterior, tal como se publicó (docs/ de ese commit), en una carpeta temporal
function docsDe(ref) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-ant-'));
  const git = (...a) => cp.execFileSync('git', ['-C', RAIZ, ...a], { maxBuffer: 1 << 30 });
  for (const f of git('ls-tree', '-r', '--name-only', ref, 'docs').toString().split('\n').filter(Boolean)) {
    const dest = path.join(dir, f.replace(/^docs\//, '')); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, git('show', `${ref}:${f}`)); }
  return dir; }

(async () => {
  // ---------- 1) datos: espacios_vp.bin contra un recálculo propio con la regla ----------
  const INV = Object.fromEntries(M.muns.map(c => [c, leeInv(L.DOCS, c)])), todos = M.muns.flatMap(c => INV[c].P);
  const E = leeConteos(EV.archivo, D.NV), EF = leeConteos(RES.frentes_con_espacio.archivo, D.N);
  const BV = E.B, CNT = E.CNT, BF = EF.B;
  ok('espacios_vp.bin se lee completo, en orden y con partes de vialidad que existen; los inv_<cve>.bin, en formato 2', E.completo && E.orden && E.formato === EV.formato && E.n === EV.partes && E.ultimo < D.NV && M.muns.every(c => INV[c].completo && INV[c].formato === 2),
    `${E.n} partes · ${fs.statSync(path.join(L.DOCS, 'datos', 'inventario', EV.archivo)).size} bytes`);
  const cfg = JSON.parse((fs.readFileSync(path.join(L.DOCS, 'config.js'), 'utf8').match(/window\.SIA_INVENTARIO = (\{.*?\});\n/) || [])[1] || 'null');
  const partesTipo = [0, 1, 2].map(t => [...CNT.values()].filter(c => c[t]).length), ptsTipo = [0, 1, 2].map(t => [...CNT.values()].reduce((s, c) => s + c[t], 0));
  ok('partes con cada tipo y puntos de cada tipo = cifras de control (RESUMEN.json y config.js)', partesTipo.join() === EV.por_tipo.join() && ptsTipo.join() === EV.puntos_por_tipo.join() && !!cfg && cfg.vp.puntos.join() === ptsTipo.join() && cfg.vp.n === E.n && cfg.vp.dist === 25,
    `partes: cepa ${partesTipo[0]} · tocón ${partesTipo[1]} · muerto ${partesTipo[2]} · puntos ${ptsTipo.join(' · ')}`);
  // regla: por su frente (si es del Gobierno Central) o, sin frente, por el camellón; los de los frentes de las alcaldías, a ninguna
  const R = new Map(), porFrente = [0, 0, 0], cam = [0, 0, 0]; let malCam = 0;
  for (const p of todos) { let v = -1;
    if (p.fr >= 0) { if (p.vp >= 0) malCam++; const f = D.F[p.fr]; if (f.gc && f.vp >= 0) { v = f.vp; porFrente[p.t]++; } }
    else if (p.vp >= 0) { v = p.vp; cam[p.t]++; }
    if (v >= 0) { const c = R.get(v) || [0, 0, 0]; c[p.t]++; R.set(v, c); } }
  ok('los puntos de cada tipo de cada parte = recálculo propio con la regla (por su frente del Gobierno Central o en el camellón)', R.size === CNT.size && [...CNT].every(([v, c]) => (R.get(v) || []).join() === c.join()) && malCam === 0,
    `${R.size} partes · por su frente ${porFrente.join(' · ')} · camellón ${cam.join(' · ')}`);
  ok('puntos recuperados por el camellón = cifras de control, y salen de los que quedaron sin frente', cam.join() === EV.puntos_camellon.join() && porFrente.join() === EV.puntos_por_frente.join() && cam.reduce((a, b) => a + b, 0) === EV.sin_frente_recuperados && EV.sin_frente_recuperados <= RES.sin_frente && todos.filter(p => p.fr < 0).length === RES.sin_frente,
    `${EV.sin_frente_recuperados} de ${RES.sin_frente} sin frente`);
  // la regla del camellón con una rejilla propia de segmentos (celdas de 50 m): el asignado está a 25 m o menos y es el más cercano; los
  // que quedaron sin parte no tienen ninguna a 25 m (tolerancia de 0.5 m por el redondeo de las coordenadas guardadas)
  { const CEL = 50, G = new Map(), sin = todos.filter(p => p.fr < 0); const key = (i, j) => i * 100000 + j;
    D.VP.forEach((v, i) => { const P = v.pts; for (let k = 0; k + 1 < P.length; k += 2) { const ax = P[k] * KX, ay = P[k + 1] * KY, bx = (P[k + 2] ?? P[k]) * KX, by = (P[k + 3] ?? P[k + 1]) * KY;
      for (let gi = Math.floor(Math.min(ax, bx) / CEL); gi <= Math.floor(Math.max(ax, bx) / CEL); gi++) for (let gj = Math.floor(Math.min(ay, by) / CEL); gj <= Math.floor(Math.max(ay, by) / CEL); gj++) { const kk = key(gi, gj); let a = G.get(kk); if (!a) { a = new Set(); G.set(kk, a); } a.add(i); } } });
    let malos = 0, lejos = 0, dmax = 0; const ej = [];
    for (const p of sin) { const px = p.x / ESC * KX, py = p.y / ESC * KY, gi = Math.floor(px / CEL), gj = Math.floor(py / CEL), cand = new Set();
      for (let a = gi - 1; a <= gi + 1; a++) for (let b = gj - 1; b <= gj + 1; b++) for (const i of (G.get(key(a, b)) || [])) cand.add(i);
      let dmin = Infinity, dAsig = Infinity; for (const i of cand) { const d = distLinea(px, py, D.VP[i].pts); if (d < dmin) dmin = d; if (i === p.vp) dAsig = d; }
      if (p.vp >= 0) { dmax = Math.max(dmax, dAsig); if (!(dAsig <= EV.distancia_camellon_m + 0.5 && dAsig <= dmin + 0.5)) { malos++; if (ej.length < 3) ej.push(`${p.clave} a ${dAsig.toFixed(1)} m (mín. ${dmin.toFixed(1)})`); } }
      else if (dmin <= EV.distancia_camellon_m - 0.5) { lejos++; if (ej.length < 3) ej.push(`${p.clave} sin parte y una a ${dmin.toFixed(1)} m`); } }
    ok('camellón (rejilla propia): cada punto sin frente asignado a una parte está a 25 m o menos de su eje y es la más cercana; los demás no tienen ninguna a 25 m', malos === 0 && lejos === 0, ej.join(' | ') || `${sin.length} sin frente · máximo ${dmax.toFixed(1)} m`); }

  const srv = await L.servidor(0); const browser = await L.lanzar(); const errores = []; const base = srv.url + '?modo=ligero';
  const pedidos = [];
  const { page, ctx } = await L.abrir(browser, base + '#nomap', {}, errores);
  page.on('request', r => { if (/espacios_(vp|frentes)\.bin/.test(r.url())) pedidos.push(r.url()); });
  // ir: la consulta, en el Resumen (que pide el inventario para su comparación, v1.27); res = false: se queda en «Dónde empezar», sin bajar nada
  // No espera un tiempo fijo: con «e=» la consulta se aplica cuando llega el inventario, y con el equipo cargado 700 ms no alcanzaban.
  // Espera a que la red (body.dataset.resp) y el filtro de espacio (aplicado y en las casillas) sean los de la dirección.
  const ir = async (p, q, res = true) => { const u = new URLSearchParams(q.replace(/^&/, ''));
    const red = u.get('r') === 'gc' ? 'gc' : u.get('r') === 'both' ? 'both' : 'alc', m = String(u.get('e') || '').split(',').reduce((s, k) => COD.includes(k) ? s | (1 << COD.indexOf(k)) : s, 0);
    await p.goto('about:blank'); await p.goto(base + q + '#nomap'); await p.waitForSelector('#loader[hidden]', { state: 'attached' });
    await p.waitForFunction(([red, m]) => document.body.dataset.resp === red && !!window.__INV && window.__INV.esp().filtro === m && window.__INV.esp().casillas === m, [red, m], { timeout: 60000 });
    await p.waitForTimeout(150); if (res) await p.evaluate(() => { const t = document.getElementById('tab-res'); if (t) t.click(); }); };
  const casillas = () => page.$$eval('button[data-esp]', bs => bs.map(b => b.getAttribute('aria-pressed') === 'true'));
  const aviso = () => page.$eval('#esp-aviso', x => ({ vis: !x.hidden && x.offsetParent !== null, t: x.textContent }));
  const clicEsp = async t => { await page.$eval(`button[data-esp="${t}"]`, b => b.click()); await page.waitForFunction(() => window.__INV.esp().filtro === window.__INV.esp().casillas, null, { timeout: 60000 }); await page.waitForTimeout(400); };
  const kpis2 = p => p.$$eval('#kpis2 .kpi', ks => ks.map(k => ({ v: k.querySelector('.v').innerText.replace(/\s+/g, ' ').trim(), l: k.querySelector('.l').innerText.replace(/\s+/g, ' ').trim() })));

  // ---------- 2) toda la ciudad con «r=gc» y cada combinación desde la dirección ----------
  const enCiudad = () => true, enIzt = v => v.mun === IZT;
  const cifras = { ciudad: {}, izt: {} }; const malasC = [];
  for (let m = 0; m <= 7; m++) {
    await ir(page, `&r=gc${m ? '&e=' + codigo(m) : ''}`); const e = await L.estado(page), exp = vpCalc(BV, m, enCiudad); cifras.ciudad[m ? codigo(m) : 'sin filtro'] = exp;
    const bien = kpiVP(e.kpis, exp) && (m ? e.kpisTxt.includes(`solo tramos con ${lista(m)} (inventario de arbolado)`) && e.mapsum.includes(`· con ${lista(m)}`) && new URL(e.url).searchParams.get('e') === codigo(m) && new URL(e.url).searchParams.get('r') === 'gc' && (await aviso()).vis
      : !/inventario/.test(e.kpisTxt) && !(await aviso()).vis) && (await casillas()).every((v, t) => v === !!(m & (1 << t)));
    if (!bien) malasC.push(`${codigo(m) || 'sin'}: ${e.kpis[0] && e.kpis[0].v} / ${e.kpis[2] && e.kpis[2].v} vs ${L.kmTxt(exp.kmp)} / ${exp.recsp.size} · ${e.mapsum}`); }
  ok('Gobierno Central en toda la ciudad, «r=gc&e=…» con cada combinación: km de vialidad prioritaria, tramos prioritarios, etiqueta, resumen del mapa, aviso y dirección = recálculo propio', malasC.length === 0,
    malasC.join(' | ') || Object.entries(cifras.ciudad).map(([k, v]) => `${k} ${v.kmp.toFixed(1)} km/${v.recsp.size}`).join(' · '));
  { const sinF = cifras.ciudad['sin filtro'], est = L.resumenVP(D);
    ok('sin filtro, la ciudad del Gobierno Central es la de siempre (resumen de todas las partes)', Math.abs(sinF.kmp - est.kmp) < 1e-6 && sinF.recsp.size === est.recsp.size, `${est.kmp.toFixed(1)} km · ${est.recsp.size} tramos`); }

  // ---------- 3) Iztapalapa: las siete combinaciones con las casillas, y al apagarlas todo como antes ----------
  await ir(page, `&r=gc&a=${M.muns[IZT]}`); const e0 = await L.estado(page);
  ok('Gobierno Central: la fila «Espacio» se ve (la de banqueta no) y abre apagada', await page.evaluate(() => !document.getElementById('esp-row').hidden && document.getElementById('banq-row').hidden) && (await casillas()).every(v => !v) && !(await aviso()).vis);
  cifras.izt['sin filtro'] = vpCalc(BV, 0, enIzt);
  let quedo = 0; const malasI = [];
  for (let m = 1; m <= 7; m++) {
    for (let t = 0; t < 3; t++) if (((m ^ quedo) >> t) & 1) await clicEsp(t);
    quedo = m; const e = await L.estado(page), exp = vpCalc(BV, m, enIzt); cifras.izt[codigo(m)] = exp;
    const a = await aviso();
    const bien = kpiVP(e.kpis, exp) && e.kpisTxt.includes(`solo tramos con ${lista(m)} (inventario de arbolado)`) && e.mapsum.includes(`· con ${lista(m)}`) && new URL(e.url).searchParams.get('e') === codigo(m) && new URL(e.url).searchParams.get('r') === 'gc'
      && a.vis && a.t === `El filtro solo incluye lo inventariado hasta ${RES.corte} (inventario en curso); en esta alcaldía van ${L.fN.format(RES.por_alcaldia[M.muns[IZT]].registros)} registros.` && e.nota.includes('Cifras de arriba con el filtro «Espacio»') && e.nota.includes('camellón');
    if (!bien) malasI.push(`${codigo(m)}: ${e.kpis[0] && e.kpis[0].v} / ${e.kpis[2] && e.kpis[2].v} vs ${L.kmTxt(exp.kmp)} / ${exp.recsp.size} · ${a.t}`); }
  ok('Gobierno Central en Iztapalapa, con las casillas en las siete combinaciones: km, tramos, etiqueta, resumen del mapa, nota, aviso del inventario en curso y «e=» con «r=gc» = recálculo propio', malasI.length === 0,
    malasI.join(' | ') || Object.entries(cifras.izt).map(([k, v]) => `${k} ${v.kmp.toFixed(1)} km/${v.recsp.size}`).join(' · '));
  { // barras por prioridad con «Cepa vacante» (la leyenda dice los mismos km)
    for (let t = 0; t < 3; t++) if (((7 ^ 1) >> t) & 1) await clicEsp(t);
    const e = await L.estado(page), exp = cifras.izt.cv, malas = [];
    e.bars.forEach(b => { const k = M.prio.indexOf(b.lab); if (k < 0 || !b.val.startsWith(`${L.kmTxt(exp.km[k])} ${L.kmUn(exp.km[k])}`)) malas.push(`${b.lab}: ${b.val} vs ${exp.km[k].toFixed(2)}`); });
    ok('Iztapalapa con «Cepa vacante»: barras por prioridad = recálculo propio', e.bars.length === 5 && !malas.length, malas.join(' | ') || e.bars.map(b => b.val.split(' ')[0]).join(' · '));
    await clicEsp(0); const e2 = await L.estado(page); const igual = k => JSON.stringify(e2[k]) === JSON.stringify(e0[k]);
    const dif = ['kpis', 'kpisTxt', 'bars', 'nota', 'mapsum', 'listTitle', 'listCount', 'lista', 'dl', 'dlStatus', 'leyenda', 'lgScope', 'alcinfo'].filter(k => !igual(k));
    ok('al apagar las casillas, el Gobierno Central de Iztapalapa queda exactamente como antes, sin aviso y sin «e=»', !dif.length && !(await aviso()).vis && !/[?&]e=/.test(e2.url), dif.join(', ')); }

  // ---------- 4) descargas con «Cepa vacante» (Iztapalapa): tramos, avenidas, GeoJSON, KML y ficha de vialidades ----------
  await ir(page, `&r=gc&a=${M.muns[IZT]}&e=cv`); const ex = cifras.izt.cv;
  { const x = await L.descargar(page, '#dl-tramos', SAL, 240000); const X = x ? xlsx(x.ruta) : { datos: [], dic: [] }; const col = X.datos[0] || [];
    const filas = X.datos.slice(1), iR = col.indexOf('id_tramo'), iL = col.indexOf('longitud_m');
    const dic = k => (X.dic.find(r => r[0] === k) || [])[1] || '';
    const esperado = ex.partesP.map(i => `${D.VP[i].rec}|${D.VP[i].len}`).sort().join(), recibido = filas.map(r => `${r[iR]}|${r[iL]}`).sort().join();
    const kmX = filas.reduce((s, r) => s + r[iL], 0) / 1000;
    ok('Excel de tramos de Iztapalapa con «Cepa vacante»: solo esas partes, y lo declara (nombre, ámbito y renglón «Filtro «Espacio»» con la regla y el corte)', !!x && esperado === recibido && x.nombre.includes('_con_cepa_vacante') && dic('Ámbito consultado').includes('solo tramos con cepa vacante (inventario de arbolado)') && dic('Filtro «Espacio»').includes('camellón') && dic('Filtro «Espacio»').includes(`corte: ${RES.corte}`),
      `${filas.length} renglones vs ${ex.partesP.length} · ${x && x.nombre}`);
    ok('Excel de tramos: los tramos distintos y los km = las cifras de la pantalla', +dic('Tramos distintos (id_tramo)') === ex.recsp.size && Math.abs(kmX - ex.kmp) < 0.001, `${dic('Tramos distintos (id_tramo)')} tramos · ${kmX.toFixed(2)} km`); }
  { const x = await L.descargar(page, '#dl-avenidas', SAL, 240000); const X = x ? xlsx(x.ruta) : { datos: [], dic: [] }; const col = X.datos[0] || [];
    const kmp = X.datos.slice(1).reduce((s, r) => s + r[col.indexOf('km_prioritario')], 0), kmt = X.datos.slice(1).reduce((s, r) => s + r[col.indexOf('km_total')], 0);
    // v1.40: la lista trae las avenidas de «Mostrar» (las que tienen km prioritarios que pasan el filtro), con todos sus km que lo pasan
    const avP = new Set(ex.partesP.map(i => D.VP[i].nom)), kmtL = ex.partes.filter(i => avP.has(D.VP[i].nom)).reduce((s, i) => s + D.VP[i].len / 1000, 0);
    ok('Excel de avenidas con «Cepa vacante»: sus km prioritarios y totales suman los del recálculo, y lo declara', !!x && Math.abs(kmp - ex.kmp) < 0.05 && Math.abs(kmt - kmtL) < 0.05 && x.nombre.includes('_con_cepa_vacante') && X.dic.some(r => r[0] === 'Filtro «Espacio»'), `${kmp.toFixed(2)} vs ${ex.kmp.toFixed(2)} · ${kmt.toFixed(2)} vs ${kmtL.toFixed(2)} · ${x && x.nombre}`); }
  { const g = await L.descargar(page, '#dl-geojson', SAL); const J = g ? JSON.parse(fs.readFileSync(g.ruta, 'utf8')) : { features: [] };
    ok('GeoJSON con «Cepa vacante»: solo esas partes, y lo declara', J.features.length === ex.partesP.length && J.features.every(f => f.properties.quien_atiende === 'Gobierno Central') && /solo tramos con cepa vacante/.test(J.name || '') && (J.descripcion || '').includes('camellón') && g.nombre.includes('_con_cepa_vacante'), `${J.features.length} vs ${ex.partesP.length} · ${g && g.nombre}`);
    const k = await L.descargar(page, '#dl-kml', SAL); const K = k ? fs.readFileSync(k.ruta, 'utf8') : '';
    ok('KML con «Cepa vacante»: solo esas partes, y lo declara', (K.match(/<Placemark>/g) || []).length === ex.partesP.length && /<name>[^<]*solo tramos con cepa vacante/.test(K) && k.nombre.includes('_con_cepa_vacante'), `${(K.match(/<Placemark>/g) || []).length} vs ${ex.partesP.length}`); }
  { const p = await L.descargar(page, '#dl-ficha-vpalc', SAL, 180000); const t = p ? pdf(p.ruta) : '';
    ok('ficha de vialidades primarias de Iztapalapa con «Cepa vacante»: lo declara y sus cifras = recálculo propio', !!p && p.nombre.includes('_con_cepa_vacante') && /Solo tramos con cepa vacante/.test(t) && /Consulta filtrada: solo tramos con cepa vacante/.test(t) && t.includes(`corte: ${RES.corte}`) && kpiPdf(t, ex),
      `${p && p.nombre} · ${L.kmTxt(ex.kmp)} km · ${ex.recsp.size} de ${ex.recs.size}`); }
  // ficha de avenida (toda la ciudad) con «Cepa vacante»: la avenida con más cepas en tramos prioritarios de Iztapalapa
  const AVI = avCepas(BV, CNT, 0, IZT)[0].a;
  { await ir(page, `&r=gc&v=${AVI}&e=cv`); const exA = vpCalc(BV, 1, v => v.nom === AVI); const e = await L.estado(page);
    ok(`avenida ${M.vp.nomenclat[AVI]} con «Cepa vacante»: cifras = recálculo propio (toda la avenida)`, kpiVP(e.kpis, exA) && e.kpisTxt.includes('solo tramos con cepa vacante'), `${e.kpis[0] && e.kpis[0].v} vs ${L.kmTxt(exA.kmp)} · ${exA.recsp.size}`);
    const p = await L.descargar(page, '#dl-ficha-av', SAL, 180000); const t = p ? pdf(p.ruta) : '';
    ok('ficha de avenida con «Cepa vacante»: lo declara y sus cifras = recálculo propio', !!p && p.nombre.includes('_con_cepa_vacante') && /Consulta filtrada: solo tramos con cepa vacante/.test(t) && kpiPdf(t, exA), p && p.nombre);
    const x = await L.descargar(page, '#dl-tramos', SAL, 240000); const X = x ? xlsx(x.ruta) : { datos: [] };
    ok('Excel de tramos de la avenida con «Cepa vacante»: solo sus partes prioritarias que pasan', X.datos.length - 1 === exA.partesP.length && x.nombre.includes('_con_cepa_vacante'), `${X.datos.length - 1} vs ${exA.partesP.length}`); }

  // ---------- 5) apagado: las descargas del Gobierno Central de Iztapalapa traen todo ----------
  await ir(page, `&r=gc&a=${M.muns[IZT]}`);
  { const est = vpCalc(BV, 0, enIzt), e = await L.estado(page), x = await L.descargar(page, '#dl-tramos', SAL, 240000); const X = x ? xlsx(x.ruta) : { datos: [], dic: [] };
    ok('apagado: cifras y Excel de tramos de Iztapalapa con todas sus partes prioritarias, sin el filtro en el nombre ni en el diccionario', kpiVP(e.kpis, est) && X.datos.length - 1 === est.partesP.length && !/_con_/.test(x.nombre) && !X.dic.some(r => r[0] === 'Filtro «Espacio»'), `${X.datos.length - 1} vs ${est.partesP.length}`); }

  // ---------- 6) «Avenidas con más cepas vacantes» ----------
  const tabIni = p => p.evaluate(() => document.getElementById('tab-ini').click()).then(() => p.waitForTimeout(200));
  const verTodo = async p => { for (let k = 0; k < 400 && await p.$eval('#ini-mas', x => !x.hidden); k++) await p.$eval('#ini-mas', b => b.click()); return (await L.estado(p)).lista; };
  const orden = async (p, v) => { await p.selectOption('#ini-orden', v); await p.waitForFunction(v2 => window.__INV.esp().orden === v2 && window.__INV.esp().pendiente === null, v, { timeout: 60000 }); await p.waitForTimeout(200); };
  const opciones = p => p.$$eval('#ini-orden option', o => o.map(x => x.value + '=' + x.textContent));
  const nota = p => p.$eval('#ini-note', x => x.textContent.replace(/\s+/g, ' '));
  const carga = p => p.$eval('#ini-carga', x => ({ vis: !x.hidden && x.offsetParent !== null, t: x.textContent, warn: x.classList.contains('warn') }));
  const RUTA = '**/espacios_vp.bin*'; const top = {};
  // carga diferida (el archivo se retrasa 2.5 s): aviso, el selector dice lo pedido y la lista no se vacía
  await ctx.route(RUTA, async r => { await new Promise(s => setTimeout(s, 2500)); await r.continue().catch(() => {}); });
  pedidos.length = 0; await ir(page, `&r=gc&a=${M.muns[IZT]}`, false); await tabIni(page);
  { const ops = await opciones(page), antes = await L.estado(page);
    ok('Gobierno Central en una alcaldía: «Mostrar» ofrece «Avenidas · más km prioritarios» y «Avenidas · más cepas vacantes», sin bajar nada al abrir «Dónde empezar»', ops.join('|') === 'av=Avenidas · más km prioritarios|avcv=Avenidas · más cepas vacantes' && pedidos.length === 0, ops.join(' | '));
    await page.selectOption('#ini-orden', 'avcv'); await page.waitForTimeout(300);
    const a = await carga(page), d = await L.estado(page), sv = await page.$eval('#ini-orden', s => s.value);
    ok('mientras baja el archivo: aviso, el selector dice lo pedido y la lista sigue con el orden anterior', a.vis && !a.warn && a.t === 'Cargando las cepas vacantes del inventario de arbolado…' && sv === 'avcv' && JSON.stringify(d.lista) === JSON.stringify(antes.lista) && !d.lista.some(l => /cepa/.test(l.t)), a.t);
    await page.waitForFunction(() => window.__INV.esp().orden === 'avcv', null, { timeout: 60000 }); await page.waitForTimeout(300);
    ok('al llegar, el aviso se quita y la lista se ordena por cepas', !(await carga(page)).vis && /por cepas vacantes en tramos prioritarios/.test((await L.estado(page)).listCount)); }
  await ctx.unroute(RUTA);
  { const exp = avCepas(BV, CNT, 0, IZT), filas = await verTodo(page), e = await L.estado(page), malas = comparaAv(filas, exp), c0 = exp.findIndex(x => !x.cv);
    top.izt = exp.slice(0, 5);
    ok('Iztapalapa, avenidas por cepas vacantes: todas, en orden (con el mismo número, por km prioritarios) y con su número = recálculo propio', !malas.length && filas.length === exp.length && L.numEs(e.listCount) === exp.length && filas.every((r, k) => r.t.startsWith(String(k + 1))),
      malas.slice(0, 3).join(' | ') || `${exp.length} avenidas · ${exp.slice(0, 3).map(x => `${x.n} ${x.cv}`).join(', ')}`);
    ok('Iztapalapa: las avenidas sin cepas en lo prioritario van al final y lo dicen («sin cepas…»); nota del corte en «Más detalles»', (c0 < 0 || (c0 > 0 && filas.slice(c0).every(r => /^sin cepas/.test(cepasDe(r.t))))) && filas.slice(0, c0 < 0 ? filas.length : c0).every(r => /^\d/.test(cepasDe(r.t))) && (await nota(page)).includes(NOTA_AV),
      c0 < 0 ? 'todas tienen cepas' : `${exp.length - c0} sin cepas, desde el renglón ${c0 + 1}`); }
  { await orden(page, 'av'); ok('la nota del corte aparece solo con el orden por cepas', !(await nota(page)).includes('inventariado') && !(await L.estado(page)).lista.some(l => /cepa/.test(l.t))); }
  // toda la ciudad, y con el filtro «Tocón»
  { await ir(page, '&r=gc'); await tabIni(page); const ops = await opciones(page); await orden(page, 'avcv');
    const exp = avCepas(BV, CNT, 0, null), e = await L.estado(page), malas = comparaAv(e.lista, exp); top.cdmx = exp.slice(0, 5);
    ok('toda la ciudad, avenidas por cepas vacantes: las 10 primeras y el número de avenidas = recálculo propio; la vista «Alcaldías» no se ordena por cepas', !malas.length && e.lista.length === 10 && L.numEs(e.listCount) === exp.length && ops.map(o => o.split('=')[0]).join() === 'av,avcv,alc',
      malas.slice(0, 2).join(' | ') || `${exp.length} avenidas · ${exp.slice(0, 5).map(x => `${x.n} ${x.cv}`).join(', ')}`); }
  { await ir(page, `&r=gc&a=${M.muns[IZT]}&e=to`); await tabIni(page); await orden(page, 'avcv');
    const exp = avCepas(BV, CNT, 2, IZT), filas = await verTodo(page), malas = comparaAv(filas, exp);
    ok('Iztapalapa con el filtro «Tocón», por cepas vacantes: solo cuentan los tramos con tocón = recálculo propio', !malas.length && filas.length === exp.length, malas.slice(0, 2).join(' | ') || `${exp.length} avenidas · ${exp.slice(0, 3).map(x => `${x.n} ${x.cv}`).join(', ')}`); }
  // si la carga falla: mensaje, el selector vuelve y la lista queda; elegirlo otra vez lo vuelve a intentar
  { await ctx.route(RUTA, r => r.abort()); await ir(page, `&r=gc&a=${M.muns[IZT]}`); await tabIni(page); const antes = await L.estado(page);
    await page.selectOption('#ini-orden', 'avcv'); await page.waitForFunction(() => document.getElementById('ini-carga').classList.contains('warn'), null, { timeout: 60000 }).catch(() => {});
    const a = await carga(page), d = await L.estado(page), sv = await page.$eval('#ini-orden', s => s.value);
    ok('si el archivo no llega: mensaje claro, el selector vuelve a km prioritarios y la lista queda como estaba', a.vis && a.warn && /No fue posible cargar las cepas vacantes/.test(a.t) && sv === 'av' && JSON.stringify(d.lista) === JSON.stringify(antes.lista), `${a.t} · ${sv}`);
    await ctx.unroute(RUTA); await orden(page, 'avcv');
    ok('al elegir otra vez el orden, se vuelve a pedir y la lista se ordena por cepas', !(await carga(page)).vis && !comparaAv((await L.estado(page)).lista, avCepas(BV, CNT, 0, IZT)).length); }

  // ---------- 7) fichas: un tramo con sus conteos y un punto del camellón ----------
  { const conPuntos = [...CNT.entries()].filter(([i]) => D.VP[i].mun === IZT).sort((a, b) => b[1][0] - a[1][0] || a[0] - b[0])[0], sinPuntos = D.VP.findIndex((v, i) => v.mun === IZT && !CNT.has(i));
    const tipoTxt = (n, t) => `${L.fN.format(n)} ${n === 1 ? ['cepa vacante', 'tocón', 'árbol muerto'][t] : ['cepas vacantes', 'tocones', 'árboles muertos'][t]}`;
    await ir(page, `&r=gc&a=${M.muns[IZT]}`);
    const ficha = async i => { await page.evaluate(i2 => window.__INV.fichaVP(i2), i); await page.waitForFunction(() => { const d = document.getElementById('card-esp'); return d && !/Cargando/.test(d.textContent); }, null, { timeout: 60000 }).catch(() => {}); return page.$eval('#card', c => c.innerText.replace(/\s+/g, ' ')); };
    const t1 = await ficha(conPuntos[0]), esp = conPuntos[1].map((n, t) => tipoTxt(n, t)).join(' · ');
    ok('ficha de un tramo: dice cuántas cepas vacantes, tocones y árboles muertos tiene (aunque el archivo llegue después de abrirla)', t1.includes('Espacios para plantar') && t1.includes(esp) && t1.includes('en sus frentes y en el camellón'), `parte ${conPuntos[0]} (${M.vp.nomenclat[D.VP[conPuntos[0]].nom]}): ${esp}`);
    const t2 = await ficha(sinPuntos);
    ok('ficha de un tramo sin puntos: «Ninguno registrado» con el corte', t2.includes(`Ninguno registrado hasta ${RES.corte}`), t2.slice(0, 160));
    await page.keyboard.press('Escape');
    // punto del camellón (Iztapalapa): su avenida, «a cargo del Gobierno Central», prioridad del tramo
    const pc = INV[M.muns[IZT]].P.find(p => p.fr < 0 && p.vp >= 0), pg = INV[M.muns[IZT]].P.find(p => p.fr >= 0 && D.F[p.fr].gc && D.F[p.fr].vp >= 0);
    const r = await page.evaluate(async () => { const P = await window.__INV.lee('007'); const out = {};
      for (const [k, f] of [['cam', p => p.fr < 0 && p.vp >= 0], ['gc', null]]) { const p = k === 'cam' ? P.find(f) : P.find(q => q.fr >= 0 && window.__INV.esGC(q.fr)); if (!p) continue; window.__INV.ficha(p); out[k] = { t: document.getElementById('card').innerText.replace(/\s+/g, ' '), clave: p.clave }; }
      return out; }).catch(e => ({ error: String(e) }));
    const av = M.vp.nomenclat[D.VP[pc.vp].nom], prio = M.prio[D.VP[pc.vp].prio];
    ok('ficha de un punto del camellón: «Camellón o vialidad primaria: <avenida> · a cargo del Gobierno Central», con la prioridad del tramo', !!r.cam && r.cam.t.includes(`Camellón o vialidad primaria: ${av} · a cargo del Gobierno Central`) && r.cam.t.includes('Prioridad del tramo de vialidad primaria') && r.cam.t.includes(prio) && /Quién atiende Gobierno Central/.test(r.cam.t),
      r.cam ? `${r.cam.clave} · ${r.cam.t.slice(0, 150)}` : JSON.stringify(r));
    const avg = pg ? M.vp.nomenclat[D.VP[D.F[pg.fr].vp].nom] : '—';
    ok('ficha de un punto en un frente del Gobierno Central: «Gobierno Central · sobre <avenida>»', !!r.gc && /Quién atiende Gobierno Central · sobre /.test(r.gc.t), r.gc ? r.gc.t.slice(0, 160) : `(esperada sobre ${avg})`); }

  // ---------- 8) las dos redes ----------
  await ir(page, `&r=both&a=${M.muns[IZT]}&e=cv`);
  { const e = await L.estado(page), k2 = await kpis2(page), fr = frCalc(BF, 1, f => f.mun === IZT), vp = cifras.izt.cv;
    const ms = await page.$eval('#mapsum', x => x.textContent.replace(/\s+/g, ' '));   // con las dos redes, la cifra del Gobierno Central es opcional en pantallas medianas
    ok('con las dos redes y «Cepa vacante»: frentes de la alcaldía y vialidades del Gobierno Central = recálculo propio, y las dos lo declaran', e.kpis[0].v.replace(/\s+/g, '').startsWith(L.kmTxt(fr.km)) && kpiVP(k2, vp) && e.kpisTxt.includes('solo frentes con cepa vacante') && k2[0].l.includes('solo tramos con cepa vacante')
      && ms.includes('a cargo de la Alcaldía · con cepa vacante') && ms.includes('a cargo del Gob. Central · con cepa vacante'), `${e.kpis[0].v} vs ${L.kmTxt(fr.km)} · ${k2[0] && k2[0].v} vs ${L.kmTxt(vp.kmp)}`);
    const g = await L.descargar(page, '#dl-geojson', SAL); const J = g ? JSON.parse(fs.readFileSync(g.ruta, 'utf8')) : { features: [] };
    const nFr = J.features.filter(f => f.properties.quien_atiende === 'Alcaldía').length, nVp = J.features.filter(f => f.properties.quien_atiende === 'Gobierno Central').length;
    ok('GeoJSON con las dos redes y «Cepa vacante»: frentes y tramos filtrados, y declara los dos', nFr === fr.n && nVp === vp.partesP.length && /solo frentes con cepa vacante/.test(J.name) && /solo tramos con cepa vacante/.test(J.name), `${nFr} frentes vs ${fr.n} · ${nVp} tramos vs ${vp.partesP.length}`); }

  // ---------- 9) «Reiniciar» desde el Gobierno Central con el filtro ----------
  await ir(page, `&r=gc&a=${M.muns[IZT]}&e=cv,am`);
  await page.$eval('#reset-all', b => b.click()); await page.waitForTimeout(900);
  { const e = await L.estado(page);
    ok('«Reiniciar» desde el Gobierno Central apaga el filtro: casillas apagadas, sin aviso y sin «e=» en la dirección', (await casillas()).every(v => !v) && !(await aviso()).vis && !/[?&]e=/.test(e.url) && await page.evaluate(() => window.__INV.esp().filtro === 0), e.url.replace(srv.url, '')); }
  await ctx.close();

  // ---------- 10) celular de 390 × 844 ----------
  { const { page: m, ctx: mc } = await L.abrir(browser, base + `&r=gc&a=${M.muns[IZT]}&e=cv,to,am#nomap`, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, errores);
    await m.evaluate(() => { const t = document.getElementById('tab-ini'); if (t) t.click(); }); await m.waitForTimeout(400);
    const r = await m.evaluate(() => { const q = document.querySelector('.query').getBoundingClientRect();
      const ch = [...document.querySelectorAll('button[data-esp]')].map(b => { const c = b.getBoundingClientRect(), t = b.querySelector('b'); return { h: Math.round(c.height), l: c.left, r: c.right, top: Math.round(c.top), corta: t.scrollWidth > t.clientWidth + 1 }; });
      const enc = ch.some((a, i) => ch.some((b, j) => j > i && a.l < b.r - 1 && b.l < a.r - 1 && Math.abs(a.top - b.top) < 20));
      const av = document.getElementById('esp-aviso').getBoundingClientRect();
      return { ch, enc, dentro: ch.every(c => c.l >= q.left - 0.5 && c.r <= q.right + 0.5), desborde: document.documentElement.scrollWidth - innerWidth, aviso: !document.getElementById('esp-aviso').hidden && av.right <= innerWidth && av.left >= 0, banq: document.getElementById('banq-row').hidden }; });
    ok('celular, Gobierno Central con el filtro: casillas de 44 px que caben sin encimarse, aviso dentro de la pantalla, sin la fila de banqueta y sin desborde', r.ch.length === 3 && r.ch.every(c => c.h >= 44 && !c.corta) && !r.enc && r.dentro && r.aviso && r.banq && r.desborde <= 0, JSON.stringify(r.ch.map(c => [c.h, Math.round(c.l), Math.round(c.r)])) + ` · desborde ${r.desborde}`);
    await orden(m, 'avcv');
    const s = await m.evaluate(() => { const det = document.querySelector('#ini-note details.mas'), w = innerWidth;
      const ks = [...document.querySelectorAll('#ini-list li .k')].map(k => ({ r: k.getBoundingClientRect().right, corta: k.scrollWidth > k.clientWidth + 1 }));
      const lis = [...document.querySelectorAll('#ini-list li')].map(li => li.getBoundingClientRect().right), sel = document.getElementById('ini-orden').getBoundingClientRect();
      return { plegada: !!det && !det.open && det.textContent.includes('inventariado'), desborde: document.documentElement.scrollWidth - w, cabe: lis.length > 0 && Math.max(...lis) <= w + 0.5 && ks.every(k => k.r <= w + 0.5 && !k.corta) && sel.right <= w + 0.5, n: lis.length }; });
    ok('celular de 390 px, avenidas por cepas: la nota del corte queda plegada y lista, números y selector caben sin desbordar', s.plegada && s.desborde <= 0 && s.cabe, JSON.stringify(s));
    await mc.close(); }

  // ---------- 11) comparación con la versión anterior (v1.23) ----------
  const REF = process.env.REF_ANTERIOR || '67668b9';
  // REF_ANTERIOR=no acorta la prueba mientras se trabaja, pero lo que no se comparó no cuenta como aprobado (A1-04): la prueba falla
  if (REF === 'no') ok('comparación con la versión anterior', false, 'no se verificó: REF_ANTERIOR=no');
  else {
    let ANT = null; try { ANT = docsDe(REF); } catch (e) { ok(`se obtiene docs/ de la versión anterior (${REF}) desde Git`, false, String(e.message || e).slice(0, 160)); }
    if (ANT) {
      // los puntos del inventario conservan coordenadas, tipo, clave y frente asignado
      { const malos = []; for (const cve of M.muns) { const a = leeInv(ANT, cve).P, b = INV[cve].P;
          if (a.length !== b.length || a.some((p, k) => p.x !== b[k].x || p.y !== b[k].y || p.t !== b[k].t || p.fr !== b[k].fr || p.clave !== b[k].clave)) malos.push(cve); }
        const fA = fs.readFileSync(path.join(ANT, 'datos', 'inventario', RES.frentes_con_espacio.archivo)), fB = fs.readFileSync(path.join(L.DOCS, 'datos', 'inventario', RES.frentes_con_espacio.archivo));
        ok(`los puntos del inventario conservan coordenadas, tipo, clave y frente asignado, y espacios_frentes.bin es el mismo que en ${REF}`, !malos.length && zlib.gunzipSync(fA).equals(zlib.gunzipSync(fB)), malos.join(', ') || `${todos.length} puntos`); }
      const sAnt = await L.servidor(0, ANT); const errAnt = [];
      const pA = await L.abrir(browser, sAnt.url + '?modo=ligero#nomap', {}, errAnt), pN = await L.abrir(browser, base + '#nomap', {}, errores);
      const irA = async (p, url) => { await p.goto('about:blank'); await p.goto(url); await p.waitForSelector('#loader[hidden]', { state: 'attached' }); await p.waitForTimeout(700); await p.evaluate(() => { const t = document.getElementById('tab-res'); if (t) t.click(); }); };
      // v1.27: del Resumen se comparan las cifras sin sus rótulos (cambiaron a propósito); en el orden por cepas, lo que la versión anterior
      // listaba, en el mismo orden y con sus cifras (la v1.27 agrega el total de cada renglón y, al final, lo que no tiene km prioritarios)
      const CAMPOS = ['titulo', 'kpis', 'bars', 'bars2Vis', 'bars2', 'nota', 'alcinfo', 'colinfo', 'avinfo', 'mapsum', 'listTitle', 'listCount', 'lista', 'dl', 'dlStatus', 'leyenda', 'lgScope', 'legendVp', 'capas'];
      const quitaVer = s => String(s).replace(/Versión \d+\.\d+[^.]*\./g, 'Versión X.').replace(/_\d{8}\./g, '.');
      const compara = async (q, accion, cepas) => { await irA(pA.page, sAnt.url + '?modo=ligero' + q + '#nomap'); await irA(pN.page, base + q + '#nomap');
        if (accion) { await accion(pA.page); await accion(pN.page); }
        const a = L.comparable(await L.estado(pA.page)), b = L.comparable(await L.estado(pN.page)); if (cepas) b.lista = b.lista.slice(0, a.lista.length);
        return CAMPOS.filter(k => !(cepas && k === 'listCount') && quitaVer(JSON.stringify(a[k])) !== quitaVer(JSON.stringify(b[k]))); };
      const AV = AVI, COLT = (() => { const S = new Map(); D.F.forEach((f, i) => { if (!f.gc && f.mun === TLA && f.col && f.prio >= L.PRIO_MIN && (BF[i] & 1)) S.set(f.col, (S.get(f.col) || 0) + f.len); }); return [...S].sort((a, b) => b[1] - a[1])[0][0]; })();
      // con el filtro apagado: Gobierno Central, las dos redes y alcaldías
      const apagado = [['&r=gc', 'GC ciudad'], [`&r=gc&a=${M.muns[IZT]}`, 'GC Iztapalapa'], [`&r=gc&a=${M.muns[AO]}`, 'GC Álvaro Obregón'], [`&r=gc&v=${AV}`, 'GC avenida'], [`&r=gc&a=${M.muns[IZT]}&v=${AV}`, 'GC avenida en Iztapalapa'],
        [`&r=both&a=${M.muns[IZT]}`, 'dos redes Iztapalapa'], [`&a=${M.muns[TLA]}`, 'Tláhuac'], [`&c=${COLT}`, 'colonia'], ['&r=alc', 'ciudad']];
      const difA = []; for (const [q, n] of apagado) { const d = await compara(q); if (d.length) difA.push(`${n}: ${d.join(', ')}`); }
      const tabI = async p => { await p.evaluate(() => document.getElementById('tab-ini').click()); await p.waitForTimeout(200); };
      for (const [q, n, v] of [['&r=gc', 'GC ciudad, «Alcaldías»', 'alc']]) {
        const d = await compara(q, async p => { await tabI(p); await p.selectOption('#ini-orden', v); await p.waitForTimeout(300); }); if (d.length) difA.push(`${n}: ${d.join(', ')}`); }
      ok(`con el filtro apagado, pantalla y listas iguales que en ${REF} (Gobierno Central, las dos redes y alcaldías; ${apagado.length + 1} consultas)`, !difA.length, difA.join(' | '));
      // descargas con el filtro apagado: Excel de tramos y de avenidas, GeoJSON y ficha de vialidades (Gobierno Central, Iztapalapa)
      { await irA(pA.page, sAnt.url + `?modo=ligero&r=gc&a=${M.muns[IZT]}#nomap`); await irA(pN.page, base + `&r=gc&a=${M.muns[IZT]}#nomap`); const difD = [];
        for (const id of ['#dl-tramos', '#dl-avenidas']) { const a = await L.descargar(pA.page, id, SAL_ANT, 240000), b = await L.descargar(pN.page, id, SAL, 240000);
          const lst = id === '#dl-avenidas';   // v1.40: nombres, textos y la lista en el orden de «Mostrar» (lib_pruebas: nombreAntes, excelAntes)
          if (!a || !b || !L.mismoNombre(a.nombre, b.nombre) || JSON.stringify(sinFecha(L.excelAntes(xlsx(a.ruta), lst))) !== JSON.stringify(sinFecha(L.excelAntes(xlsx(b.ruta), lst)))) difD.push(id); }
        { const a = await L.descargar(pA.page, '#dl-geojson', SAL_ANT), b = await L.descargar(pN.page, '#dl-geojson', SAL); if (!a || !b || !L.mismoNombre(a.nombre, b.nombre) || quitaVer(geoSinEsp(fs.readFileSync(a.ruta, 'utf8'))) !== quitaVer(geoSinEsp(L.textoAntes(fs.readFileSync(b.ruta, 'utf8'))))) difD.push('geojson'); }
        { const a = await L.descargar(pA.page, '#dl-ficha-vpalc', SAL_ANT, 180000), b = await L.descargar(pN.page, '#dl-ficha-vpalc', SAL, 180000); if (!a || !b || !L.mismoNombre(a.nombre, b.nombre) || quitaVer(L.textoAntes(pdf(a.ruta))) !== quitaVer(L.textoAntes(pdf(b.ruta)))) difD.push('ficha de vialidades'); }
        ok(`con el filtro apagado, Excel de tramos y de avenidas, GeoJSON y ficha de vialidades iguales que en ${REF}`, !difD.length, difD.join(', ')); }
      // con «Alcaldías»: el filtro y el orden por cepas dan lo mismo
      const conFiltro = [[`&a=${M.muns[TLA]}&e=cv`, 'Tláhuac cepa'], [`&a=${M.muns[TLA]}&e=cv,to,am`, 'Tláhuac los tres'], [`&a=${M.muns[IZT]}&e=cv&b=con`, 'Iztapalapa cepa y banqueta'], [`&c=${COLT}&e=to`, 'colonia tocón'], ['&r=alc&e=am', 'ciudad árbol muerto']];
      const difF = []; for (const [q, n] of conFiltro) { const d = await compara(q); if (d.length) difF.push(`${n}: ${d.join(', ')}`); }
      ok(`con «Alcaldías», las cifras, listas y descargas visibles con el filtro «Espacio» iguales que en ${REF} (${conFiltro.length} consultas)`, !difF.length, difF.join(' | '));
      const ordena = v => async p => { await tabI(p); await p.selectOption('#ini-orden', v); await p.waitForFunction(v2 => window.__INV.esp().orden === v2 && window.__INV.esp().pendiente === null, v, { timeout: 60000 }); await p.waitForTimeout(300); await verTodo(p); };
      const difO = [];
      for (const [q, n, v] of [[`&a=${M.muns[TLA]}`, 'colonias de Tláhuac', 'cv'], [`&a=${M.muns[TLA]}`, 'calles de Tláhuac', 'callescv'], [`&a=${M.muns[IZT]}&e=to`, 'colonias de Iztapalapa con tocón', 'cv'], ['&r=alc', 'colonias de la ciudad', 'cv'], [`&c=${COLT}`, 'calles de una colonia', 'cv']]) {
        const d = await compara(q, ordena(v), true); if (d.length) difO.push(`${n}: ${d.join(', ')}`); }
      ok(`con «Alcaldías», el orden por cepas vacantes (listas completas) igual que en ${REF}`, !difO.length, difO.join(' | '));
      { await irA(pA.page, sAnt.url + `?modo=ligero&c=${COLT}&e=cv#nomap`); await irA(pN.page, base + `&c=${COLT}&e=cv#nomap`);
        const a = await L.descargar(pA.page, '#dl-frentes', SAL_ANT, 240000), b = await L.descargar(pN.page, '#dl-frentes', SAL, 240000);
        ok(`con «Alcaldías» y «Cepa vacante», el Excel de frentes de una colonia igual que en ${REF}`, !!a && !!b && L.mismoNombre(a.nombre, b.nombre) && JSON.stringify(sinFecha(L.excelAntes(xlsx(a.ruta)))) === JSON.stringify(sinFecha(L.excelAntes(xlsx(b.ruta)))), a && a.nombre); }
      ok(`la versión anterior (${REF}) abrió sin errores de JavaScript`, !errAnt.length, errAnt.slice(0, 2).join(' | '));
      await pA.ctx.close(); await pN.ctx.close(); sAnt.close();
      try { fs.rmSync(ANT, { recursive: true, force: true }); } catch (e) {}
    }
  }

  ok('sin errores de JavaScript durante la prueba', errores.length === 0, errores.slice(0, 2).join(' | '));
  const kmTr = c => `${c.kmp.toFixed(1)} km / ${c.recsp.size} tramos`;
  console.log(`\nVialidades primarias · puntos por tipo: ${EV.puntos_por_tipo.join(' · ')} (por su frente ${EV.puntos_por_frente.join(' · ')}; camellón ${EV.puntos_camellon.join(' · ')}); recuperados por el camellón: ${EV.sin_frente_recuperados} de ${RES.sin_frente}`);
  console.log('Gobierno Central, Iztapalapa: ' + Object.entries(cifras.izt).map(([k, v]) => `${k} ${kmTr(v)}`).join(' · '));
  console.log('Gobierno Central, ciudad: ' + Object.entries(cifras.ciudad).map(([k, v]) => `${k} ${kmTr(v)}`).join(' · '));
  console.log('Avenidas con más cepas vacantes en tramos prioritarios · ciudad: ' + (top.cdmx || []).map(x => `${x.n} ${x.cv}`).join(' · '));
  console.log('Avenidas con más cepas vacantes en tramos prioritarios · Iztapalapa: ' + (top.izt || []).map(x => `${x.n} ${x.cv}`).join(' · '));
  await browser.close(); srv.close(); process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
