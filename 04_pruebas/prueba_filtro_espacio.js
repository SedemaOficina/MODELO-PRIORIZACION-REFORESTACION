// Filtro «Espacio»: deja solo los frentes de las alcaldías con al menos un punto del inventario de arbolado (cepa vacante, tocón o árbol
// muerto) de los tipos elegidos. Comprueba el archivo de tipos por frente contra un recálculo propio desde los puntos publicados, y que
// cifras, «Dónde empezar», Excel, GeoJSON, KML y ficha digan lo mismo que un recálculo propio con cada combinación de tipos, solo y con
// «Con banqueta»; que con el filtro apagado todo quede igual; la dirección (e=), «Reiniciar», Gobierno Central, el aviso del inventario
// en curso, el celular de 390 px y la accesibilidad de las casillas.
// Uso: node 04_pruebas/prueba_filtro_espacio.js   · termina con código ≠ 0 si algo falla.
const fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib'), cp = require('child_process');
const L = require('./lib_pruebas.js');
const SAL = process.env.SALIDA || fs.mkdtempSync(path.join(os.tmpdir(), 'esp-'));
const ok = L.Registro('filtro de espacio');
const D = L.decodificar(); const M = D.META;
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
function leeEspacios() { const rv = enteros(zlib.gunzipSync(fs.readFileSync(path.join(L.DOCS, 'datos', 'inventario', RES.frentes_con_espacio.archivo))));
  const formato = rv(), n = rv(), B = new Uint8Array(D.N); let f = -1, orden = true;
  for (let k = 0; k < n; k++) { const d = rv(), b = rv(); orden = orden && d > 0 && b >= 1 && b <= 7; f += d; if (f < D.N) B[f] = b; }
  return { formato, n, B, completo: rv.fin(), orden, ultimo: f }; }
function desdePuntos() { const B = new Uint8Array(D.N);
  for (const cve of M.muns) { const rv = enteros(zlib.gunzipSync(fs.readFileSync(path.join(L.DOCS, 'datos', 'inventario', `inv_${cve}.bin`))));
    rv(); const n = rv(); let fr = 0; for (let i = 0; i < n; i++) { rv(); rv(); const t = rv(); fr += rv(); rv(); rv(); rv(); if (fr > 0) B[fr - 1] |= 1 << t; } }
  return B; }
// recálculo: frentes prioritarios a cargo de la alcaldía en un territorio, con al menos un punto de los tipos elegidos (m = 0: sin filtro)
function calc(B, terr, m, banq = 'todas') { const r = { km: 0, n: 0, ids: new Set(), col: new Map() };
  for (let i = 0; i < D.N; i++) { const f = D.F[i]; if (f.gc || f.prio < L.PRIO_MIN || !terr(f)) continue; if (m && !(B[i] & m)) continue;
    if (banq !== 'todas' && (banq === 'con') !== (((f.flags >> 3) & 7) === 0)) continue;
    r.km += f.len / 1000; r.n++; r.ids.add(i); if (f.col) r.col.set(f.col, (r.col.get(f.col) || 0) + f.len / 1000); }
  return r; }
const kpi = (e, exp) => e.kpis.length > 0 && e.kpis[0].v.replace(/\s+/g, '').startsWith(L.kmTxt(exp.km)) && (exp.n >= 10000 || L.numEs(e.kpis[2].v) === exp.n);

(async () => {
  // ---------- 1) datos: el archivo de tipos por frente ----------
  const E = leeEspacios(), P = desdePuntos(), C = RES.frentes_con_espacio;
  const porTipo = [0, 1, 2].map(t => E.B.reduce((s, b) => s + (b >> t & 1), 0)), alcTipo = [0, 1, 2].map(t => E.B.reduce((s, b, i) => s + (!D.F[i].gc && (b >> t & 1)), 0));
  ok('espacios_frentes.bin se lee completo, en orden y con frentes que existen', E.completo && E.orden && E.formato === C.formato && E.n === C.frentes && E.ultimo < D.N, `${E.n} frentes · ${fs.statSync(path.join(L.DOCS, 'datos', 'inventario', C.archivo)).size} bytes`);
  ok('frentes con cada tipo = cifras de control de RESUMEN.json (total y a cargo de las alcaldías)', porTipo.join() === C.por_tipo.join() && alcTipo.join() === C.alcaldia_por_tipo.join(), `cepa ${porTipo[0]} · tocón ${porTipo[1]} · muerto ${porTipo[2]} · alcaldías ${alcTipo.join(' · ')}`);
  ok('los tipos de cada frente = recálculo propio desde los puntos de los archivos por alcaldía', E.B.every((b, i) => b === P[i]));
  const B = E.B;

  const srv = await L.servidor(0); const browser = await L.lanzar(); const errores = []; const base = srv.url + '?modo=ligero';
  const ir = async (page, q) => { await page.goto(base + q + '#nomap'); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(700); await page.evaluate(() => { const t = document.getElementById('tab-res'); if (t) t.click(); }); };
  const pedidos = [];
  const { page, ctx } = await L.abrir(browser, base + '#nomap', {}, errores);
  page.on('request', r => { if (r.url().includes('espacios_frentes')) pedidos.push(r.url()); });
  const casillas = () => page.$$eval('button[data-esp]', bs => bs.map(b => b.getAttribute('aria-pressed') === 'true'));
  const aviso = () => page.$eval('#esp-aviso', x => ({ vis: !x.hidden && x.offsetParent !== null, t: x.textContent }));
  const clicEsp = async t => { await page.$eval(`button[data-esp="${t}"]`, b => b.click()); await page.waitForFunction(() => window.__INV.esp().filtro === window.__INV.esp().casillas, null, { timeout: 60000 }); await page.waitForTimeout(400); };

  // ---------- 2) apagado: abre sin filtro, sin pedir el archivo; con las casillas se recorren las siete combinaciones (Tláhuac) ----------
  await ir(page, `&a=${M.muns[TLA]}`); const e0 = await L.estado(page);
  const fila = await page.evaluate(() => ({ vis: !document.getElementById('esp-row').hidden, lab: document.getElementById('esp-label').textContent }));
  ok('la fila «Espacio» se ve debajo de «Banqueta» y abre con las tres casillas apagadas, sin pedir el archivo', fila.vis && fila.lab === 'Espacio' && (await casillas()).every(v => !v) && pedidos.length === 0 && await page.evaluate(() => { const b = document.getElementById('banq-row').getBoundingClientRect(), e = document.getElementById('esp-row').getBoundingClientRect(); return e.top >= b.bottom - 1; }));
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
  await page.$eval('button[data-esp="0"]', b => b.click()); await page.waitForTimeout(800);
  { const x = await L.descargar(page, '#dl-frentes', SAL, 240000); const X = x ? xlsx(x.ruta) : { datos: [], dic: [] };
    ok('apagado, el Excel de la colonia trae todos sus frentes prioritarios, sin el filtro en el nombre ni en el diccionario', !!x && X.datos.length - 1 === RC0.n && !/_con_/.test(x.nombre) && !X.dic.some(r => r[0] === 'Filtro «Espacio»') && !/inventario/.test((X.dic.find(r => r[0] === 'Ámbito consultado') || [])[1] || ''), `${X.datos.length - 1} vs ${RC0.n} · ${x && x.nombre}`); }

  // ---------- 6) «Reiniciar», Gobierno Central y las dos redes ----------
  await ir(page, `&a=${M.muns[TLA]}&b=con&e=cv,am`);
  await page.$eval('#reset-all', b => b.click()); await page.waitForTimeout(900); e = await L.estado(page);
  ok('«Reiniciar» apaga los dos filtros: casillas de espacio apagadas, banqueta en «Todas», sin aviso y sin «e=» ni «b=» en la dirección', (await casillas()).every(v => !v) && !(await aviso()).vis && !/[?&][eb]=/.test(e.url) && await page.evaluate(() => window.__INV.esp().filtro === 0 && document.querySelector('button[data-banq="todas"]').getAttribute('aria-pressed') === 'true'), e.url.replace(srv.url, ''));
  await ir(page, `&r=gc&a=${M.muns[IZT]}&e=cv`);
  ok('con Gobierno Central la fila «Espacio» y su aviso no se muestran, y la dirección no lleva el filtro', await page.evaluate(() => document.getElementById('esp-row').hidden && document.getElementById('esp-aviso').hidden) && !/[?&]e=/.test(page.url()));
  await ir(page, `&r=both&a=${M.muns[IZT]}&e=cv`); e = await L.estado(page);
  { const exp = calc(B, f => f.mun === IZT, 1);
    ok('con las dos redes la fila se ve y el filtro acota los frentes de la alcaldía, como la banqueta', await page.evaluate(() => !document.getElementById('esp-row').hidden) && e.mapsum.includes(`${L.kmTxt(exp.km)} km de frente prioritarios · a cargo de la Alcaldía · con cepa vacante`), e.mapsum); }

  // ---------- 7) teclado ----------
  await ir(page, `&a=${M.muns[TLA]}`);
  await page.focus('button[data-esp="1"]'); await page.keyboard.press('Space'); await page.waitForFunction(() => window.__INV.esp().filtro === 2, null, { timeout: 60000 }).catch(() => {});
  ok('con el teclado (barra espaciadora) se prende una casilla', (await casillas()).join() === 'false,true,false' && await page.evaluate(() => window.__INV.esp().filtro === 2));
  await ctx.close();

  // ---------- 8) celular de 390 × 844 ----------
  { const { page: m, ctx: mc } = await L.abrir(browser, base + `&a=${M.muns[TLA]}&e=cv,to,am#nomap`, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, errores);
    await m.evaluate(() => { const t = document.getElementById('tab-ini'); if (t) t.click(); }); await m.waitForTimeout(400);
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

  ok('sin errores de JavaScript durante la prueba', errores.length === 0, errores.slice(0, 2).join(' | '));
  console.log(`\nCifras de control · frentes con cepa vacante ${porTipo[0]}, con tocón ${porTipo[1]}, con árbol muerto ${porTipo[2]} (a cargo de las alcaldías: ${alcTipo.join(', ')})`);
  console.log('Km prioritarios de Tláhuac: sin filtro ' + T0.km.toFixed(1) + ' · ' + Object.entries(cifrasTla).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(' · '));
  console.log('Km prioritarios de Iztapalapa: ' + Object.entries(cifrasIzt).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(' · '));
  await browser.close(); srv.close(); process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
