// Filtro «Espacio»: deja solo los frentes de las alcaldías con al menos un punto del inventario de arbolado (cepa vacante, tocón o árbol
// muerto) de los tipos elegidos. Comprueba el archivo de tipos por frente contra un recálculo propio desde los puntos publicados, y que
// cifras, «Dónde empezar», Excel, GeoJSON, KML y ficha digan lo mismo que un recálculo propio con cada combinación de tipos, solo y con
// «Con banqueta»; que con el filtro apagado todo quede igual; la dirección (e=), «Reiniciar», Gobierno Central, el aviso del inventario
// en curso, el celular de 390 px y la accesibilidad de las casillas.
// Orden «más cepas vacantes» de «Dónde empezar» (mismo archivo, que desde la v1.23 trae cuántos puntos de cada tipo tiene cada frente):
// colonias de Tláhuac y de la ciudad, también con «Con banqueta», y calles de una colonia = recálculo propio; número en cada renglón, ceros
// al final, nota del corte solo con ese orden, carga diferida con aviso (la lista no se vacía), falla de la carga, Gobierno Central, archivo
// único sin la opción y celular de 390 px.
// Uso: node 04_pruebas/prueba_filtro_espacio.js   · termina con código ≠ 0 si algo falla.
const fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib'), cp = require('child_process');
const L = require('./lib_pruebas.js');
const SAL = process.env.SALIDA || fs.mkdtempSync(path.join(os.tmpdir(), 'esp-'));
const ok = L.Registro('filtro de espacio');
const D = L.decodificar(); const M = D.META;
// los nombres de colonia que la herramienta muestra (los que cambia 03_procesamiento_datos/7_nombres_colonias.py, en config.js)
{ const m = fs.readFileSync(path.join(L.DOCS, 'config.js'), 'utf8').match(/window\.SIA_NOMBRES_COL = (\{.*?\});\n/);
  if (m) for (const [k, n] of Object.entries(JSON.parse(m[1]))) { const c = M.colonias[+k]; if (c && c.n) c.n = n; } }
const RAIZ = path.join(__dirname, '..');
const RES = JSON.parse(fs.readFileSync(path.join(RAIZ, '02_fuente', 'datos', 'inventario', 'RESUMEN.json'), 'utf8'));
const TLA = M.munNames.indexOf('Tláhuac'), IZT = M.munNames.indexOf('Iztapalapa');
const COD = ['cv', 'to', 'am'], NOM = ['cepa vacante', 'tocón', 'árbol muerto'];
const codigo = m => COD.filter((_, t) => m & (1 << t)).join(',');
const lista = m => { const n = NOM.filter((_, t) => m & (1 << t)); return n.length < 2 ? n.join('') : n.slice(0, -1).join(', ') + ' o ' + n[n.length - 1]; };
const xlsx = ruta => JSON.parse(cp.execFileSync(L.PY, ['-c', `
import openpyxl, json, sys
wb = openpyxl.load_workbook(sys.argv[1], read_only=True)
print(json.dumps({'datos': [list(r) for r in wb['Datos'].iter_rows(values_only=True)], 'dic': [list(r) for r in wb['Diccionario'].iter_rows(values_only=True)]}, default=str))`, ruta], { maxBuffer: 1 << 28 }).toString());

// ---------- decodificadores propios (independientes de la aplicación) ----------
const enteros = raw => { let rp = 0; const rv = () => { let res = 0, sh = 0, b; do { b = raw[rp++]; res += (b & 0x7f) * Math.pow(2, sh); sh += 7; } while (b & 0x80); return (res % 2) ? -((res + 1) / 2) : res / 2; }; rv.fin = () => rp === raw.length; return rv; };
// espacios_frentes.bin (formato 2): por frente, índice en diferencias y puntos de cada tipo (cepas vacantes, tocones, árboles muertos)
function leeEspacios() { const rv = enteros(zlib.gunzipSync(fs.readFileSync(path.join(L.DOCS, 'datos', 'inventario', RES.frentes_con_espacio.archivo))));
  const formato = rv(), n = rv(), B = new Uint8Array(D.N), CV = new Uint32Array(D.N), CNT = new Map(); let f = -1, orden = true;
  for (let k = 0; k < n; k++) { const d = rv(), c = [rv(), rv(), rv()]; orden = orden && d > 0 && Math.min(...c) >= 0 && Math.max(...c) > 0; f += d;
    if (f < D.N) { B[f] = (c[0] ? 1 : 0) | (c[1] ? 2 : 0) | (c[2] ? 4 : 0); CV[f] = c[0]; CNT.set(f, c); } }
  return { formato, n, B, CV, CNT, completo: rv.fin(), orden, ultimo: f }; }
function desdePuntos() { const B = new Uint8Array(D.N), CNT = new Map(), pts = [0, 0, 0];
  for (const cve of M.muns) { const rv = enteros(zlib.gunzipSync(fs.readFileSync(path.join(L.DOCS, 'datos', 'inventario', `inv_${cve}.bin`))));
    const formato = rv(), n = rv(); let fr = 0; for (let i = 0; i < n; i++) { rv(); rv(); const t = rv(); fr += rv(); rv(); rv(); rv(); if (formato >= 2) rv();   // formato 2: parte de vialidad del camellón
      if (fr > 0) { B[fr - 1] |= 1 << t; const c = CNT.get(fr - 1) || [0, 0, 0]; c[t]++; CNT.set(fr - 1, c); pts[t]++; } } }
  return { B, CNT, pts }; }
// recálculo: frentes prioritarios a cargo de la alcaldía en un territorio, con al menos un punto de los tipos elegidos (m = 0: sin filtro)
function calc(B, terr, m, banq = 'todas') { const r = { km: 0, n: 0, ids: new Set(), col: new Map() };
  for (let i = 0; i < D.N; i++) { const f = D.F[i]; if (f.gc || f.prio < L.PRIO_MIN || !terr(f)) continue; if (m && !(B[i] & m)) continue;
    if (banq !== 'todas' && (banq === 'con') !== (((f.flags >> 3) & 7) === 0)) continue;
    r.km += f.len / 1000; r.n++; r.ids.add(i); if (f.col) r.col.set(f.col, (r.col.get(f.col) || 0) + f.len / 1000); }
  return r; }
const kpi = (e, exp) => e.kpis.length > 0 && e.kpis[0].v.replace(/\s+/g, '').startsWith(L.kmTxt(exp.km)) && (exp.n >= 10000 || L.numEs(e.kpis[2].v) === exp.n);

// ---------- orden «más cepas vacantes»: recálculo propio ----------
const pasaB = (f, banq) => banq === 'todas' || (banq === 'con') === (((f.flags >> 3) & 7) === 0);
// colonias de una alcaldía (o de la ciudad) a cargo de la alcaldía, por cepas vacantes en sus frentes prioritarios y, con el mismo número,
// por km prioritarios; cvt: las de todos sus frentes (el total del renglón, v1.27); al final, las que no tienen km prioritarios pero sí cepas
// (cuenta todos los frentes de la colonia, como la lista de colonias). terr2 (opcional): solo esos frentes (el filtro «Espacio»)
const ordenCep = (a, b, km) => b.cv - a.cv || b.kmp - a.kmp || (a.kmp ? 0 : b.cvt - a.cvt) || (km ? b.km - a.km : 0);
function colCepas(CV, mun, banq = 'todas', terr2 = () => true) { const S = new Map();
  for (let i = 0; i < D.N; i++) { const f = D.F[i]; if (!f.col || f.gc || !pasaB(f, banq) || !terr2(i)) continue; let s = S.get(f.col); if (!s) { s = { kmp: 0, cv: 0, cvt: 0 }; S.set(f.col, s); }
    s.cvt += CV[i]; if (f.prio >= L.PRIO_MIN) { s.kmp += f.len / 1000; s.cv += CV[i]; } }
  const cve = mun === null ? null : M.muns[mun], out = [];
  for (let c = 1; c < M.colonias.length; c++) { const k = M.colonias[c]; if (!k.n || (cve && k.m !== cve)) continue; const s = S.get(c); if (s && (s.kmp > 0 || s.cvt > 0)) out.push({ c, n: k.n, cv: s.cv, cvt: s.cvt, kmp: s.kmp }); }
  return out.sort((a, b) => ordenCep(a, b, false)); }
// calles de una colonia con frente prioritario (sin los nombres genéricos de INEGI), por cepas vacantes en sus frentes prioritarios
const generico = nm => { const n = L.norm(nm); return n === '' || n === 'sin referencia' || n === 'sin nombre' || n.startsWith('ninguno') || / ninguno$/.test(n) || n.startsWith('manzana o edificacion'); };
// (terr: la colonia, o la alcaldía; en la alcaldía cada calle cuenta una vez en cada colonia por la que pasa)
function callesCepas(CV, terr) { const S = new Map();
  for (let i = 0; i < D.N; i++) { const f = D.F[i]; if (f.gc || !terr(f) || generico(M.names[f.name])) continue; const key = f.name * 4096 + f.col; let s = S.get(key); if (!s) { s = { nid: f.name, km: 0, kmp: 0, cv: 0, cvt: 0 }; S.set(key, s); }
    s.km += f.len / 1000; s.cvt += CV[i]; if (f.prio >= L.PRIO_MIN) { s.kmp += f.len / 1000; s.cv += CV[i]; } }
  return [...S.values()].filter(s => (s.kmp > 0 || s.cvt > 0) && M.names[s.nid]).map(s => ({ n: M.names[s.nid], ...s })).sort((a, b) => ordenCep(a, b, true)); }
// el renglón: las cepas de lo prioritario y el total de cualquier prioridad (v1.27)
const cepasTxt = (cv, cvt) => cv ? `${L.fN.format(cv)} cepa${cv === 1 ? '' : 's'} vacante${cv === 1 ? '' : 's'}${cvt && cvt !== cv ? ` · ${L.fN.format(cvt)} en total` : ''}` : cvt ? `sin cepas en lo prioritario · ${L.fN.format(cvt)} en total` : 'sin cepas registradas';
const cepasDe = t => { const m = t.match(/(?:^|\s)(\d[\d,]* cepas? vacantes?(?: · [\d,]+ en total)?|sin cepas en lo prioritario · [\d,]+ en total|sin cepas registradas)/); return m ? m[1].trim() : ''; };
// renglones contra el recálculo: nombre, número de cepas con su total y km prioritarios, en el mismo orden
function comparaFilas(filas, exp) { const malas = [];
  filas.forEach((r, k) => { const e = exp[k], t = L.norm(r.t);
    if (!e || !t.includes(L.norm(e.n)) || cepasDe(r.t) !== cepasTxt(e.cv, e.cvt) || !t.includes(`${L.kmTxt(e.kmp)} ${L.kmUn(e.kmp)} de frente prioritario`)) malas.push(`${k + 1}: «${r.t.slice(0, 90)}» vs ${e ? `${e.n} ${cepasTxt(e.cv, e.cvt)} ${L.kmTxt(e.kmp)}` : '—'}`); });
  return malas; }
const NOTA_COL = `Cuenta solo lo inventariado hasta ${RES.corte} (inventario en curso): una colonia con 0 puede no estar inventariada todavía.`;
const NOTA_CALLE = `Cuenta solo lo inventariado hasta ${RES.corte} (inventario en curso): una calle con 0 puede no estar inventariada todavía.`;

(async () => {
  // ---------- 1) datos: el archivo de tipos por frente ----------
  const E = leeEspacios(), P = desdePuntos(), C = RES.frentes_con_espacio;
  const porTipo = [0, 1, 2].map(t => E.B.reduce((s, b) => s + (b >> t & 1), 0)), alcTipo = [0, 1, 2].map(t => E.B.reduce((s, b, i) => s + (!D.F[i].gc && (b >> t & 1)), 0));
  ok('espacios_frentes.bin (formato 2: puntos de cada tipo por frente) se lee completo, en orden y con frentes que existen', E.completo && E.orden && E.formato === 2 && E.formato === C.formato && E.n === C.frentes && E.ultimo < D.N, `${E.n} frentes · ${fs.statSync(path.join(L.DOCS, 'datos', 'inventario', C.archivo)).size} bytes`);
  ok('frentes con cada tipo = cifras de control de RESUMEN.json (total y a cargo de las alcaldías)', porTipo.join() === C.por_tipo.join() && alcTipo.join() === C.alcaldia_por_tipo.join(), `cepa ${porTipo[0]} · tocón ${porTipo[1]} · muerto ${porTipo[2]} · alcaldías ${alcTipo.join(' · ')}`);
  ok('los tipos de cada frente = recálculo propio desde los puntos de los archivos por alcaldía (el filtro «Espacio» decide igual que en la v1.22)', E.B.every((b, i) => b === P.B[i]));
  ok('los puntos de cada tipo de cada frente = recálculo propio desde los puntos de los archivos por alcaldía', E.CNT.size === P.CNT.size && [...E.CNT].every(([f, c]) => (P.CNT.get(f) || []).join() === c.join()), `${E.CNT.size} frentes`);
  { const pts = [0, 1, 2].map(t => [...E.CNT.values()].reduce((s, c) => s + c[t], 0)), ptsAlc = [0, 1, 2].map(t => [...E.CNT].reduce((s, [f, c]) => s + (D.F[f].gc ? 0 : c[t]), 0));
    const cfg = JSON.parse((fs.readFileSync(path.join(L.DOCS, 'config.js'), 'utf8').match(/window\.SIA_INVENTARIO = (\{.*?\});\n/) || [])[1] || 'null');
    ok('puntos de cada tipo asignados a frentes = cifras de control (RESUMEN.json y config.js) = puntos con frente de los inv_<cve>.bin', pts.join() === C.puntos_por_tipo.join() && pts.join() === P.pts.join() && ptsAlc.join() === C.puntos_alcaldia_por_tipo.join() && !!cfg && cfg.fr.puntos.join() === pts.join() && cfg.fr.formato === 2,
      `cepas ${pts[0]} · tocones ${pts[1]} · muertos ${pts[2]} · a cargo de las alcaldías ${ptsAlc.join(' · ')}`); }
  const B = E.B, CV = E.CV;

  const srv = await L.servidor(0); const browser = await L.lanzar(); const errores = []; const base = srv.url + '?modo=ligero';
  // siempre se recarga la página: una dirección igual a la actual (la consulta ya anotada en el historial) solo cambiaría el ancla
  // ir: la consulta, en el Resumen (que pide el inventario para su comparación, v1.27); res = false: se queda en «Dónde empezar», sin bajar nada
  const ir = async (page, q, res = true) => { await page.goto('about:blank'); await page.goto(base + q + '#nomap'); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await L.quieto(page); if (res) await page.evaluate(() => { const t = document.getElementById('tab-res'); if (t) t.click(); }); };
  const pedidos = [];
  const { page, ctx } = await L.abrir(browser, base + '#nomap', {}, errores);
  page.on('request', r => { if (r.url().includes('espacios_frentes')) pedidos.push(r.url()); });
  const casillas = () => page.$$eval('button[data-esp]', bs => bs.map(b => b.getAttribute('aria-pressed') === 'true'));
  const aviso = () => page.$eval('#esp-aviso', x => ({ vis: !x.hidden && x.offsetParent !== null, t: x.textContent }));
  const clicEsp = async t => { await page.$eval(`button[data-esp="${t}"]`, b => b.click()); await page.waitForFunction(() => window.__INV.esp().filtro === window.__INV.esp().casillas, null, { timeout: 60000 }); await L.quieto(page); };

  // ---------- 2) apagado: abre sin filtro, sin pedir el archivo; con las casillas se recorren las siete combinaciones (Tláhuac) ----------
  await ir(page, `&a=${M.muns[TLA]}`, false);
  const fila = await page.evaluate(() => { const b = document.getElementById('banq-row').getBoundingClientRect(), e = document.getElementById('esp-row').getBoundingClientRect();
    return { vis: !document.getElementById('esp-row').hidden, lab: document.getElementById('esp-label').textContent, debajo: e.top >= b.bottom - 1 }; });
  const cas0 = await casillas();   // el detalle dice qué parte falló (antes fallaba de vez en cuando sin decir cuál)
  ok('la fila «Espacio» se ve debajo de «Banqueta» y abre con las tres casillas apagadas, sin pedir el archivo', fila.vis && fila.lab === 'Espacio' && fila.debajo && cas0.every(v => !v) && pedidos.length === 0,
    `${JSON.stringify(fila)} · casillas ${JSON.stringify(cas0)} · pedidos del archivo ${pedidos.length}`);
  await page.evaluate(() => document.getElementById('tab-res').click()); await page.waitForFunction(() => !/cargando/.test(document.getElementById('rp-esp').textContent), null, { timeout: 60000 }).catch(() => {});
  ok('al abrir el Resumen se pide el archivo una vez, para los espacios de su comparación; el filtro sigue apagado', pedidos.length === 1 && (await casillas()).every(v => !v) && await page.evaluate(() => window.__INV.esp().filtro === 0), `${pedidos.length} pedido(s)`);
  const e0 = await L.estado(page);
  const T0 = calc(B, f => f.mun === TLA, 0);
  ok('apagado: el km prioritario de Tláhuac es el de siempre y no hay aviso del inventario', kpi(e0, T0) && !(await aviso()).vis && !/inventario de arbolado/.test(e0.kpisTxt), `${e0.kpis[0].v} vs ${L.kmTxt(T0.km)}`);
  const cifrasTla = {};
  let quedo = 0; const malas = [];
  for (let m = 1; m <= 7; m++) {
    for (let t = 0; t < 3; t++) if (((m ^ quedo) >> t) & 1) await clicEsp(t);
    quedo = m; const e = await L.estado(page), exp = calc(B, f => f.mun === TLA, m); cifrasTla[codigo(m)] = exp.km;
    const bien = kpi(e, exp) && e.kpisTxt.includes(`solo frentes con ${lista(m)} (inventario de arbolado)`) && e.mapsum.includes(`· con ${lista(m)}`) && new URL(e.url).searchParams.get('e') === codigo(m) && (await casillas()).every((v, t) => v === !!(m & (1 << t)));
    if (!bien) malas.push(`${codigo(m)}: ${e.kpis[0] && e.kpis[0].v} vs ${L.kmTxt(exp.km)} · ${e.mapsum}`); }
  ok('Tláhuac: con cada una de las siete combinaciones de casillas, cifra, etiqueta, resumen del mapa y dirección = recálculo propio', malas.length === 0 && pedidos.length === 1, malas.join(' | ') || Object.entries(cifrasTla).map(([k, v]) => `${k} ${v.toFixed(1)} km`).join(' · '));
  { const a = await aviso(); ok('con el filtro activo se ve el aviso del inventario en curso, con el corte y los registros de la alcaldía', a.vis && a.t === `El filtro solo incluye lo inventariado hasta ${RES.corte} (inventario en curso); en esta alcaldía van ${L.fN.format(RES.por_alcaldia[M.muns[TLA]].registros)} registros.`, a.t); }
  // apagar todo deja la página como estaba
  for (let t = 0; t < 3; t++) await clicEsp(t);
  { const e = await L.estado(page); const igual = k => JSON.stringify(e[k]) === JSON.stringify(e0[k]);
    const dif = ['kpis', 'kpisTxt', 'bars', 'nota', 'mapsum', 'listTitle', 'listCount', 'lista', 'dl', 'dlStatus', 'leyenda', 'lgScope'].filter(k => !igual(k));
    ok('al apagar las tres casillas, cifras, barras, lista, leyenda y descargas quedan exactamente como antes, sin aviso y sin «e=» en la dirección', !dif.length && !(await aviso()).vis && !/[?&]e=/.test(e.url), dif.join(', ')); }

  // ---------- 3) «Dónde empezar» con «Cepa vacante» ----------
  await clicEsp(0);
  { // la lista cuenta las colonias de la alcaldía con km prioritarios en los frentes de la colonia (también los que el catálogo pone en otra alcaldía)
    const todas = new Map(); for (let i = 0; i < D.N; i++) { const f = D.F[i]; if (f.gc || f.prio < L.PRIO_MIN || !f.col || !(B[i] & 1)) continue; todas.set(f.col, (todas.get(f.col) || 0) + f.len / 1000); }
    const enLista = [...todas.entries()].filter(([c]) => M.colonias[c] && M.colonias[c].n && M.colonias[c].m === M.muns[TLA]).sort((a, b) => b[1] - a[1]);
    const e = await L.estado(page), primera = e.lista[0] ? L.norm(e.lista[0].t) : '';
    ok('«Dónde empezar» con «Cepa vacante»: número de colonias y la primera de la lista = recálculo propio', L.numEs(e.listCount) === enLista.length && primera.includes(L.norm(M.colonias[enLista[0][0]].n)) && primera.includes(L.kmTxt(enLista[0][1]) + ' km'), `${e.listCount} · recálculo ${enLista.length}, la primera ${M.colonias[enLista[0][0]].n} con ${enLista[0][1].toFixed(2)} km`); }
  { const des0 = await page.$eval('#univbox .univline.banq', x => x.innerText).catch(() => '');
    await clicEsp(0); const des1 = await page.$eval('#univbox .univline.banq', x => x.innerText).catch(() => ''); await clicEsp(0);
    ok('el desglose por banqueta del Resumen no se filtra (es el mismo con y sin «Espacio»)', des0 && des0 === des1, des0.slice(0, 80)); }

  // ---------- 4) Iztapalapa desde la dirección: cada tipo, los tres y combinado con «Con banqueta» ----------
  const cifrasIzt = {}; const malasI = [];
  for (const [q, m, banq] of [['e=cv', 1, 'todas'], ['e=to', 2, 'todas'], ['e=am', 4, 'todas'], ['e=cv,to,am', 7, 'todas'], ['e=cv&b=con', 1, 'con'], ['e=cv,to,am&b=con', 7, 'con'], ['', 0, 'todas']]) {
    await ir(page, `&a=${M.muns[IZT]}${q ? '&' + q : ''}`); const e = await L.estado(page), exp = calc(B, f => f.mun === IZT, m, banq); cifrasIzt[q || 'sin filtro'] = exp.km;
    const txt = banq === 'con' ? `solo frentes con banqueta (INEGI 2020) y con ${lista(m)} (inventario de arbolado)` : m ? `solo frentes con ${lista(m)} (inventario de arbolado)` : '';
    if (!kpi(e, exp) || (txt && !e.kpisTxt.includes(txt)) || (!m && /inventario/.test(e.kpisTxt)) || (await casillas()).some((v, t) => v !== !!(m & (1 << t))) || (m && !e.mapsum.includes((banq === 'con' ? '· con banqueta ' : '') + `· con ${lista(m)}`)))
      malasI.push(`${q}: ${e.kpis[0] && e.kpis[0].v} vs ${L.kmTxt(exp.km)} · ${e.kpisTxt.slice(0, 160)}`); }
  ok('Iztapalapa: un enlace con «e=» abre con el filtro; cifras y etiquetas = recálculo propio, también combinado con «Con banqueta»', malasI.length === 0, malasI.join(' | ') || Object.entries(cifrasIzt).map(([k, v]) => `${k} ${v.toFixed(1)} km`).join(' · '));
  // un código desconocido se ignora sin romper la página
  await ir(page, `&a=${M.muns[IZT]}&e=xx,cv,zz`); let e = await L.estado(page);
  ok('un código desconocido en «e=» se ignora (e=xx,cv,zz abre con «Cepa vacante»)', kpi(e, calc(B, f => f.mun === IZT, 1)) && (await casillas()).join() === 'true,false,false', e.kpis[0] && e.kpis[0].v);
  await ir(page, `&a=${M.muns[IZT]}&e=zz`); e = await L.estado(page);
  ok('«e=» sin ningún código conocido abre sin filtro', kpi(e, calc(B, f => f.mun === IZT, 0)) && (await casillas()).every(v => !v) && !/[?&]e=/.test(e.url), e.url.replace(srv.url, ''));

  // ---------- 5) colonia con «Cepa vacante»: Excel, GeoJSON, KML y ficha ----------
  const exT = calc(B, f => f.mun === TLA, 1); const COL = [...exT.col.entries()].filter(([c]) => M.colonias[c] && M.colonias[c].n).sort((a, b) => b[1] - a[1])[0][0];
  const RC = calc(B, f => f.col === COL, 1), RC0 = calc(B, f => f.col === COL, 0);
  await ir(page, `&c=${COL}&e=cv`);
  { const x = await L.descargar(page, '#dl-frentes', SAL, 240000); const X = x ? xlsx(x.ruta) : { datos: [], dic: [] };
    const ids = new Set(X.datos.slice(1).map(r => +r[0])); const amb = (X.dic.find(r => r[0] === 'Ámbito consultado') || [])[1] || '', fil = (X.dic.find(r => r[0] === 'Filtro «Espacio»') || [])[1] || '';
    ok('Excel de frentes de una colonia con «Cepa vacante»: solo los frentes del recálculo, con el filtro en el nombre, en el ámbito y en su renglón del diccionario', !!x && ids.size === RC.n && [...RC.ids].every(i => ids.has(i)) && x.nombre.includes('_con_cepa_vacante') && /solo frentes con cepa vacante \(inventario de arbolado\)/.test(amb) && fil.includes(`corte: ${RES.corte}`) && /en curso/.test(fil),
      `${ids.size} vs ${RC.n} (de ${RC0.n} sin filtro) · ${x && x.nombre} · ${amb}`); }
  { const g = await L.descargar(page, '#dl-geojson', SAL); const J = g ? JSON.parse(fs.readFileSync(g.ruta, 'utf8')) : { features: [] };
    ok('GeoJSON de la colonia con «Cepa vacante»: solo esos frentes, y lo declara', J.features.length === RC.n && J.features.every(f => RC.ids.has(f.properties.id_frente)) && /solo frentes con cepa vacante/.test(J.name || '') && (J.descripcion || '').includes(`corte: ${RES.corte}`) && g.nombre.includes('_con_cepa_vacante'), `${J.features.length} vs ${RC.n} · ${g && g.nombre}`);
    const k = await L.descargar(page, '#dl-kml', SAL); const K = k ? fs.readFileSync(k.ruta, 'utf8') : '';
    ok('KML de la colonia con «Cepa vacante»: solo esos frentes, y lo declara', (K.match(/<Placemark>/g) || []).length === RC.n && /<name>[^<]*solo frentes con cepa vacante/.test(K) && k.nombre.includes('_con_cepa_vacante'), `${(K.match(/<Placemark>/g) || []).length} vs ${RC.n} · ${k && k.nombre}`); }
  { const p = await L.descargar(page, '#dl-ficha', SAL, 180000);
    const t = p ? cp.execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', p.ruta, '-']).toString().replace(/\s+/g, ' ') : '';
    ok('la ficha de la colonia con «Cepa vacante» lo declara y trae el desglose por banqueta completo', !!p && p.nombre.includes('_con_cepa_vacante') && /Solo con cepa vacante/.test(t) && /Consulta filtrada: solo frentes con cepa vacante/.test(t) && t.includes(`corte: ${RES.corte}`) && /reconocimiento en sitio/.test(t), p && p.nombre); }
  // apagado, el Excel de la misma colonia es el de siempre
  await page.$eval('button[data-esp="0"]', b => b.click()); await L.quieto(page);
  { const x = await L.descargar(page, '#dl-frentes', SAL, 240000); const X = x ? xlsx(x.ruta) : { datos: [], dic: [] };
    ok('apagado, el Excel de la colonia trae todos sus frentes prioritarios, sin el filtro en el nombre ni en el diccionario', !!x && X.datos.length - 1 === RC0.n && !/_con_/.test(x.nombre) && !X.dic.some(r => r[0] === 'Filtro «Espacio»') && !/inventario/.test((X.dic.find(r => r[0] === 'Ámbito consultado') || [])[1] || ''), `${X.datos.length - 1} vs ${RC0.n} · ${x && x.nombre}`); }

  // ---------- 6) «Reiniciar», Gobierno Central y las dos redes ----------
  await ir(page, `&a=${M.muns[TLA]}&b=con&e=cv,am`);
  await page.$eval('#reset-all', b => b.click()); await L.quieto(page); e = await L.estado(page);
  ok('«Reiniciar» apaga los dos filtros: casillas de espacio apagadas, banqueta en «Todas», sin aviso y sin «e=» ni «b=» en la dirección', (await casillas()).every(v => !v) && !(await aviso()).vis && !/[?&][eb]=/.test(e.url) && await page.evaluate(() => window.__INV.esp().filtro === 0 && document.querySelector('button[data-banq="todas"]').getAttribute('aria-pressed') === 'true'), e.url.replace(srv.url, ''));
  await ir(page, `&r=gc&a=${M.muns[IZT]}&e=cv`);
  // desde la v1.24 el filtro aplica también al Gobierno Central (sus cifras las revisa prueba_espacio_gobierno_central.js); la banqueta no
  ok('con Gobierno Central la fila «Espacio» y su aviso se muestran, la de banqueta no, y la dirección conserva el filtro', await page.evaluate(() => !document.getElementById('esp-row').hidden && !document.getElementById('esp-aviso').hidden && document.getElementById('banq-row').hidden) && new URL(page.url()).searchParams.get('e') === 'cv');
  await ir(page, `&r=both&a=${M.muns[IZT]}&e=cv`); e = await L.estado(page);
  { const exp = calc(B, f => f.mun === IZT, 1);
    ok('con las dos redes la fila se ve y el filtro acota los frentes de la alcaldía, como la banqueta', await page.evaluate(() => !document.getElementById('esp-row').hidden) && e.mapsum.includes(`${L.kmTxt(exp.km)} km de frente prioritarios · a cargo de la Alcaldía · con cepa vacante`), e.mapsum); }

  // ---------- 7) teclado ----------
  await ir(page, `&a=${M.muns[TLA]}`);
  await page.focus('button[data-esp="1"]'); await page.keyboard.press('Space'); await page.waitForFunction(() => window.__INV.esp().filtro === 2, null, { timeout: 60000 }).catch(() => {});
  ok('con el teclado (barra espaciadora) se prende una casilla', (await casillas()).join() === 'false,true,false' && await page.evaluate(() => window.__INV.esp().filtro === 2));

  // ---------- 9) orden «más cepas vacantes» de «Dónde empezar» ----------
  const tabIni = p => p.evaluate(() => document.getElementById('tab-ini').click()).then(() => L.quieto(p));
  const verTodo = async p => { for (let k = 0; k < 400 && await p.$eval('#ini-mas', x => !x.hidden); k++) await p.$eval('#ini-mas', b => b.click()); return (await L.estado(p)).lista; };
  const orden = async (p, v) => { await p.selectOption('#ini-orden', v); await p.waitForFunction(v2 => window.__INV.esp().orden === v2 && window.__INV.esp().pendiente === null, v, { timeout: 60000 }); await L.quieto(p); };
  const opciones = p => p.$$eval('#ini-orden option', o => o.map(x => x.value + '=' + x.textContent));
  const nota = p => p.$eval('#ini-note', x => x.textContent.replace(/\s+/g, ' '));
  const carga = p => p.$eval('#ini-carga', x => ({ vis: !x.hidden && x.offsetParent !== null, t: x.textContent, warn: x.classList.contains('warn') }));
  const top = {};
  // carga diferida: el archivo se pide solo al elegir el orden; mientras llega (aquí se retrasa 2.5 s), aviso y la lista anterior
  const RUTA = '**/espacios_frentes.bin*';
  await ctx.route(RUTA, async r => { await new Promise(s => setTimeout(s, 2500)); await r.continue().catch(() => {}); });
  pedidos.length = 0; await ir(page, `&a=${M.muns[TLA]}`, false); await tabIni(page);
  { const ops = await opciones(page), antes = await L.estado(page);
    ok('alcaldía: «Mostrar» ofrece «Colonias · más cepas vacantes» y «Calles · más cepas vacantes», sin bajar nada al abrir «Dónde empezar»', ops.includes('cv=Colonias · más cepas vacantes') && ops.includes('callescv=Calles · más cepas vacantes') && pedidos.length === 0, ops.map(o => o.split('=')[0]).join(', '));
    await page.selectOption('#ini-orden', 'cv'); await L.quieto(page);
    const a = await carga(page), d = await L.estado(page), sv = await page.$eval('#ini-orden', s => s.value);
    ok('mientras baja el archivo: aviso breve, el selector dice lo pedido y la lista sigue con el orden anterior y sus cifras reales (no se vacía ni muestra cepas)', a.vis && !a.warn && a.t === 'Cargando las cepas vacantes del inventario de arbolado…' && sv === 'cv' && antes.lista.length === 10 && JSON.stringify(d.lista) === JSON.stringify(antes.lista) && d.listCount === antes.listCount && !d.lista.some(l => /cepa/.test(l.t)) && pedidos.length === 1, `${a.t} · ${d.listCount}`);
    await page.waitForFunction(() => window.__INV.esp().orden === 'cv', null, { timeout: 60000 }); await L.quieto(page);
    ok('al llegar el archivo, el aviso se quita y la lista se ordena por cepas', !(await carga(page)).vis && /por cepas vacantes en frentes prioritarios/.test((await L.estado(page)).listCount)); }
  await ctx.unroute(RUTA);
  // Tláhuac: toda la lista contra el recálculo; ceros al final
  { const exp = colCepas(CV, TLA), filas = await verTodo(page), e = await L.estado(page), malas = comparaFilas(filas, exp), c0 = exp.findIndex(x => !x.cv);
    const empates = exp.filter((x, k) => k && x.cv === exp[k - 1].cv && x.cv > 0).length;
    top.tla = exp.slice(0, 5);
    ok('Tláhuac por cepas vacantes: todas las colonias, en orden (con el mismo número, por km prioritarios) y con su número = recálculo propio', !malas.length && filas.length === exp.length && L.numEs(e.listCount) === exp.length && e.listTitle === 'Colonias de Tláhuac por atender primero',
      malas.slice(0, 3).join(' | ') || `${exp.length} colonias · ${empates} empates resueltos por km · ${exp.slice(0, 5).map(x => `${x.n} ${x.cv}`).join(', ')}`);
    ok('Tláhuac: las colonias sin cepas en lo prioritario van al final y lo dicen («sin cepas…»)', c0 > 0 && filas.slice(c0).every(r => /^sin cepas/.test(cepasDe(r.t))) && filas.slice(0, c0).every(r => /^\d/.test(cepasDe(r.t))), `${exp.length - c0} sin cepas en lo prioritario, desde el renglón ${c0 + 1}`); }
  { const n1 = await nota(page); await orden(page, 'kmp'); const n0 = await nota(page);
    ok('la nota del corte («Cuenta solo lo inventariado hasta …») aparece solo con el orden por cepas', n1.includes(NOTA_COL) && !n0.includes('inventariado') && !(await L.estado(page)).lista.some(l => /cepa/.test(l.t)), n1.slice(0, 120)); }
  // calles de la alcaldía por cepas
  { await orden(page, 'callescv'); const exp = callesCepas(CV, f => f.mun === TLA), e = await L.estado(page), malas = comparaFilas(e.lista, exp);
    ok('Tláhuac, «Calles con más cepas vacantes»: las 10 primeras y el número de calles = recálculo propio (cada calle en su colonia)', !malas.length && e.lista.length === 10 && L.numEs(e.listCount) === exp.length && (await nota(page)).includes(NOTA_CALLE), malas.slice(0, 2).join(' | ') || `${exp.length} calles · ${exp.slice(0, 3).map(x => `${x.n} ${x.cv}`).join(', ')}`); }
  // una colonia elegida desde la lista por cepas: sus calles, por cepas (el orden se conserva)
  const COLC = colCepas(CV, TLA)[0].c;
  { await orden(page, 'cv'); await page.$eval('#ini-list li', li => li.click()); await L.quieto(page); await tabIni(page);
    const ops = await opciones(page), sv = await page.$eval('#ini-orden', s => s.value), exp = callesCepas(CV, f => f.col === COLC), filas = await verTodo(page), e = await L.estado(page), malas = comparaFilas(filas, exp);
    ok(`colonia ${M.colonias[COLC].n} elegida desde la lista por cepas: el selector ofrece km prioritarios y cepas, y sigue en cepas`, ops.join('|') === 'calles=Calles · más km prioritarios|cv=Calles · más cepas vacantes' && sv === 'cv' && new URL(e.url).searchParams.get('c') === String(COLC), `${ops.join(' | ')} · ${sv}`);
    ok('las calles de la colonia por cepas vacantes: todas, en orden y con su número = recálculo propio; nota del corte', !malas.length && filas.length === exp.length && L.numEs(e.listCount) === exp.length && /por cepas vacantes/.test(e.listCount) && (await nota(page)).includes(NOTA_CALLE),
      malas.slice(0, 3).join(' | ') || `${exp.length} calles · ${exp.slice(0, 3).map(x => `${x.n} ${x.cv}`).join(', ')}`); }
  // una colonia abierta desde la dirección: lo predeterminado son los km prioritarios
  { await ir(page, `&c=${COLC}`); await tabIni(page); const sv = await page.$eval('#ini-orden', s => s.value), e = await L.estado(page);
    await orden(page, 'cv'); const e2 = await L.estado(page), exp = callesCepas(CV, f => f.col === COLC);
    ok('colonia abierta desde la dirección: el orden predeterminado son los km prioritarios; al elegir cepas, la lista = recálculo propio', sv === 'calles' && !e.lista.some(l => /cepa/.test(l.t)) && !comparaFilas(e2.lista, exp).length && (await nota(page)).includes(NOTA_CALLE), `${sv} → cv`); }
  // toda la ciudad
  { await ir(page, '&r=alc'); await tabIni(page); const ops = await opciones(page); await orden(page, 'cv');   // r=alc: toda la ciudad, no la última alcaldía recordada
    const exp = colCepas(CV, null), e = await L.estado(page), malas = comparaFilas(e.lista, exp); top.cdmx = exp.slice(0, 5);
    ok('toda la ciudad por cepas vacantes: las 10 primeras colonias y el número de colonias = recálculo propio; sin «Calles…» por cepas (no hay lista de calles de la ciudad)', !malas.length && e.lista.length === 10 && L.numEs(e.listCount) === exp.length && !ops.some(o => o.startsWith('callescv=')) && (await nota(page)).includes(NOTA_COL),
      malas.slice(0, 2).join(' | ') || `${exp.length} colonias · ${exp.slice(0, 5).map(x => `${x.n} ${x.cv}`).join(', ')}`); }
  // combinado con «Con banqueta» y con el filtro «Espacio»
  { await ir(page, `&a=${M.muns[TLA]}&b=con`); await tabIni(page); await orden(page, 'cv');
    const exp = colCepas(CV, TLA, 'con'), e = await L.estado(page), malas = comparaFilas(e.lista, exp);
    ok('Tláhuac con «Con banqueta», por cepas vacantes: las 10 primeras y el número de colonias = recálculo propio (solo frentes con banqueta)', !malas.length && L.numEs(e.listCount) === exp.length && exp[0].cv !== colCepas(CV, TLA)[0].cv, malas.slice(0, 2).join(' | ') || `${exp.length} colonias · ${exp.slice(0, 3).map(x => `${x.n} ${x.cv}`).join(', ')}`); }
  { await ir(page, `&a=${M.muns[TLA]}&e=to`); await tabIni(page); await orden(page, 'cv');
    const e = await L.estado(page);
    // con «Tocón», solo cuentan los frentes con tocón: el recálculo usa solo esos frentes
    const exp2 = colCepas(CV, TLA, 'todas', i => B[i] & 2), malas = comparaFilas(e.lista, exp2);
    ok('Tláhuac con el filtro «Tocón», por cepas vacantes: solo cuentan los frentes con tocón (enAmbito) = recálculo propio', !malas.length && L.numEs(e.listCount) === exp2.length, malas.slice(0, 2).join(' | ') || `${exp2.length} colonias · ${exp2.slice(0, 3).map(x => `${x.n} ${x.cv}`).join(', ')}`); }
  // si la carga falla: mensaje, el selector vuelve al orden anterior y la lista queda como estaba; elegirlo otra vez lo vuelve a intentar
  { await ctx.route(RUTA, r => r.abort()); await ir(page, `&a=${M.muns[TLA]}`); await tabIni(page); const antes = await L.estado(page);
    await page.selectOption('#ini-orden', 'cv'); await page.waitForFunction(() => document.getElementById('ini-carga').classList.contains('warn'), null, { timeout: 60000 }).catch(() => {});
    const a = await carga(page), d = await L.estado(page), sv = await page.$eval('#ini-orden', s => s.value);
    ok('si el archivo no llega: mensaje claro, el selector vuelve a km prioritarios y la lista queda como estaba', a.vis && a.warn && /No fue posible cargar las cepas vacantes/.test(a.t) && sv === 'kmp' && JSON.stringify(d.lista) === JSON.stringify(antes.lista), `${a.t} · ${sv}`);
    await ctx.unroute(RUTA); await orden(page, 'cv');
    ok('al elegir otra vez el orden, se vuelve a pedir el archivo y la lista se ordena por cepas', !(await carga(page)).vis && !comparaFilas((await L.estado(page)).lista, colCepas(CV, TLA)).length); }
  // Gobierno Central: no se ofrecen las colonias por cepas, sino las avenidas (v1.24); con las dos redes, las colonias (cuenta solo los frentes a cargo de la alcaldía)
  { await ir(page, `&r=gc&a=${M.muns[IZT]}`); await tabIni(page); const g = await opciones(page);
    await ir(page, `&r=both&a=${M.muns[IZT]}`); await tabIni(page); const b2 = await opciones(page);
    ok('Gobierno Central: «Mostrar» no ofrece las colonias ni las calles por cepas, sí las avenidas; con las dos redes, las colonias y las calles', g.join('|') === 'av=Avenidas · más km prioritarios|avcv=Avenidas · más cepas vacantes' && b2.join('|') === 'kmp=Colonias · más km prioritarios|cv=Colonias · más cepas vacantes|pob=Colonias · más habitantes|calles=Calles · más km prioritarios|callescv=Calles · más cepas vacantes', `${g.map(o => o.split('=')[0]).join(',')} · ${b2.map(o => o.split('=')[0]).join(',')}`); }
  await ctx.close();

  // ---------- 8) celular de 390 × 844 ----------
  { const { page: m, ctx: mc } = await L.abrir(browser, base + `&a=${M.muns[TLA]}&e=cv,to,am#nomap`, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, errores);
    await m.evaluate(() => { const t = document.getElementById('tab-ini'); if (t) t.click(); }); await L.quieto(m);
    const r = await m.evaluate(() => { const q = document.querySelector('.query').getBoundingClientRect(), g = document.querySelector('#esp-row .chips');
      const ch = [...document.querySelectorAll('button[data-esp]')].map(b => { const c = b.getBoundingClientRect(), t = b.querySelector('b'); return { h: Math.round(c.height), l: c.left, r: c.right, top: Math.round(c.top), corta: t.scrollWidth > t.clientWidth + 1, pres: b.getAttribute('aria-pressed') }; });
      const enc = ch.some((a, i) => ch.some((b, j) => j > i && a.l < b.r - 1 && b.l < a.r - 1 && Math.abs(a.top - b.top) < 20));
      const at = [...document.querySelectorAll('button[data-resp]')].map(b => Math.round(b.getBoundingClientRect().height));
      return { ch, enc, at, renglones: new Set(ch.map(c => c.top)).size, dentro: ch.every(c => c.l >= q.left - 0.5 && c.r <= q.right + 0.5), desborde: document.documentElement.scrollWidth - innerWidth,
        grupo: g.getAttribute('role') === 'group' && document.getElementById(g.getAttribute('aria-labelledby')).textContent === 'Espacio', aviso: !document.getElementById('esp-aviso').hidden && document.getElementById('esp-aviso').getBoundingClientRect().right <= innerWidth }; });
    ok('celular: las tres casillas caben (en uno o dos renglones) sin cortarse, encimarse ni desbordar la página', r.ch.length === 3 && r.renglones <= 2 && !r.enc && r.dentro && r.ch.every(c => !c.corta) && r.desborde <= 0, `${r.renglones} renglón(es) · ${JSON.stringify(r.ch.map(c => [c.h, Math.round(c.l), Math.round(c.r)]))}`);
    ok('celular: casillas de 44 px de alto o más, con aria-pressed y etiqueta de grupo «Espacio», como «Atiende»', r.ch.every(c => c.h >= 44 && c.pres === 'true') && r.grupo, `espacio ${r.ch.map(c => c.h).join('/')} px · atiende ${r.at.join('/')} px`);
    ok('celular: el aviso del inventario se ve y no se sale de la pantalla', r.aviso);
    await mc.close(); }
  // orden por cepas en el celular: colonias de la alcaldía y calles de una colonia
  const mide = p => p.evaluate(() => { const det = document.querySelector('#ini-note details.mas'), w = innerWidth;
    const ks = [...document.querySelectorAll('#ini-list li .k')].map(k => ({ r: k.getBoundingClientRect().right, corta: k.scrollWidth > k.clientWidth + 1 }));
    const lis = [...document.querySelectorAll('#ini-list li')].map(li => li.getBoundingClientRect().right), s = document.getElementById('ini-orden').getBoundingClientRect();
    return { plegada: !!det && !det.open && det.textContent.includes('inventariado'), desborde: document.documentElement.scrollWidth - w, cabe: lis.length > 0 && Math.max(...lis) <= w + 0.5 && ks.every(k => k.r <= w + 0.5 && !k.corta) && s.right <= w + 0.5, n: lis.length }; });
  for (const [q, que] of [[`&a=${M.muns[TLA]}`, 'colonias de Tláhuac'], [`&c=${COLC}`, `calles de ${M.colonias[COLC].n}`]]) {
    const { page: m, ctx: mc } = await L.abrir(browser, base + q + '#nomap', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, errores);
    await tabIni(m); await orden(m, 'cv'); const r = await mide(m);
    ok(`celular de 390 px, ${que} por cepas: la nota del corte queda plegada en «Más detalles», y lista, números y selector caben sin desbordar`, r.plegada && r.desborde <= 0 && r.cabe, JSON.stringify(r));
    await mc.close(); }
  // el archivo único no trae el inventario: no ofrece el orden por cepas
  { const unico = path.join(L.DOCS, '..', '_local', 'priorizacion_reforestacion.html');
    if (!fs.existsSync(unico)) ok('existe _local/priorizacion_reforestacion.html (se genera al construir)', false);
    else { const c2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-MX' }); await L.sinEntrada(c2); await L.vigia(c2); const p2 = await c2.newPage(); p2.setDefaultTimeout(300000);
      p2.on('pageerror', e => errores.push('archivo único: ' + e.message));
      const abre = async q => { await p2.goto(require('url').pathToFileURL(unico).href + '?modo=ligero' + q); await p2.waitForSelector('#loader[hidden]', { state: 'attached' }); await L.quieto(p2); await tabIni(p2); };
      await abre(`&a=${M.muns[TLA]}`); const o1 = await opciones(p2);
      await abre(`&c=${COLC}`); const o2 = await opciones(p2), caja = await p2.$eval('#ini-orden-box', b => b.hidden);
      ok('archivo único (sin inventario): «Mostrar» no ofrece el orden por cepas en la alcaldía, y en una colonia no hay selector', o1.length > 0 && !o1.some(o => /cepas/.test(o)) && caja && o2.every(o => !/cepas/.test(o)), o1.map(o => o.split('=')[0]).join(','));
      await c2.close(); } }

  ok('sin errores de JavaScript durante la prueba', errores.length === 0, errores.slice(0, 2).join(' | '));
  console.log(`\nCifras de control · frentes con cepa vacante ${porTipo[0]}, con tocón ${porTipo[1]}, con árbol muerto ${porTipo[2]} (a cargo de las alcaldías: ${alcTipo.join(', ')})`);
  console.log('Km prioritarios de Tláhuac: sin filtro ' + T0.km.toFixed(1) + ' · ' + Object.entries(cifrasTla).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(' · '));
  console.log('Km prioritarios de Iztapalapa: ' + Object.entries(cifrasIzt).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(' · '));
  console.log('Colonias con más cepas vacantes en frentes prioritarios · ciudad: ' + (top.cdmx || []).map(x => `${x.n} (${M.munNames[M.muns.indexOf(M.colonias[x.c].m)]}) ${x.cv}`).join(' · '));
  console.log('Colonias con más cepas vacantes en frentes prioritarios · Tláhuac: ' + (top.tla || []).map(x => `${x.n} ${x.cv}`).join(' · '));
  await browser.close(); srv.close(); process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
