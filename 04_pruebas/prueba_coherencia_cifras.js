// Bloque F1-B1 · Coherencia de cifras entre pantalla, descargas y fichas (hallazgos H-010, H-011, H-012, H-013, H-020).
// Compara lo que muestra la pantalla contra el contenido real de cada archivo y contra un recálculo independiente (C_lib.js).
// Uso: DOCS=/ruta/a/docs node prueba_coherencia_cifras.js   · termina con código ≠ 0 si algo falla.
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const L = require('./lib_pruebas.js');
const SAL = process.env.SALIDA || fs.mkdtempSync(path.join(os.tmpdir(), 'coh-'));
const ok = L.Registro('coherencia de cifras'); const D = L.decodificar(); const M = D.META, VPC = M.vp;
// lee un .xlsx con openpyxl y devuelve {datos:[[...]], dic:[[...]]}
const xlsx = ruta => JSON.parse(cp.execFileSync(L.PY, ['-c', `
import openpyxl, json, sys
wb = openpyxl.load_workbook(sys.argv[1], read_only=True)
print(json.dumps({'datos': [list(r) for r in wb['Datos'].iter_rows(values_only=True)], 'dic': [list(r) for r in wb['Diccionario'].iter_rows(values_only=True)]}, default=str))`, ruta], { maxBuffer: 1 << 28 }).toString());
const dicVal = (x, k) => (x.dic.find(r => r[0] === k) || [])[1];
const num = t => +String(t).replace(/[^\d.]/g, '');

(async () => {
  const srv = await L.servidor(0); const browser = await L.lanzar(); const errores = [];
  const { page } = await L.abrir(browser, srv.url + '?modo=ligero#nomap', {}, errores);
  const baja = async id => { const d = await L.descargar(page, '#' + id, SAL); return d; };

  // ---------- H-011 · Tecpinco: catálogo en Iztapalapa, frentes en Tláhuac ----------
  const tec = M.colonias.findIndex(c => c && c.n === 'Tecpinco' && c.m === '007');
  const espT = D.F.filter(f => !f.gc && f.col === tec && f.prio >= 3);
  await L.elegirTipo(page, 'Tecpinco', 'Col', 'Iztapalapa'); await page.waitForTimeout(500);
  let e = await L.estado(page);
  ok('H-011 panel de Tecpinco = recálculo', num(e.kpis[2].v) === espT.length, `panel ${e.kpis[2].v} · recálculo ${espT.length}`);
  await L.clic(page, '#tab-list'); e = await L.estado(page);
  const filasLista = e.lista.filter(l => !l.empty).length;
  ok('H-011 el listado de la colonia ya no sale vacío', filasLista > 0, `${filasLista} calles · ${e.listCount}`);
  let d = await baja('dl-frentes'); let x = xlsx(d.ruta);
  ok('H-011 Excel de frentes: renglones = frentes prioritarios del panel', x.datos.length - 1 === espT.length, `${x.datos.length - 1} renglones · panel ${espT.length}`);
  const iAlc = x.datos[0].indexOf('alcaldia'), iLen = x.datos[0].indexOf('longitud_m');
  const alcs = [...new Set(x.datos.slice(1).map(r => r[iAlc]))];
  ok('H-011 la columna alcaldía dice la alcaldía real de cada frente', alcs.length === 1 && alcs[0] === 'Tláhuac', alcs.join(', '));
  const sumM = x.datos.slice(1).reduce((s, r) => s + r[iLen], 0);
  ok('H-011 suma de metros del Excel = recálculo', sumM === espT.reduce((s, f) => s + f.len, 0), `${sumM} m`);
  d = await baja('dl-calles'); x = xlsx(d.ruta);
  ok('H-011 resumen por calle de la colonia con renglones', x.datos.length > 1, `${x.datos.length - 1} renglones`);
  // todas las colonias con alcaldía discordante: frentes prioritarios del filtro único = los del resumen de colonia (comprobación de datos)
  // (la pantalla y el Excel usan ahora el mismo filtro; aquí se verifican tres colonias más en la interfaz)
  for (const nom of ['Santa Cecilia Tepetlapa', 'Arboledas']) {
    const ids = M.colonias.map((c, i) => [c, i]).filter(([c]) => c && c.n === nom).map(([, i]) => i);
    const id = ids.find(i => D.F.some(f => !f.gc && f.col === i && M.muns[f.mun] !== M.colonias[i].m)); if (id === undefined) { ok(`H-011 ${nom}: colonia discordante localizada`, false); continue; }
    const esp = D.F.filter(f => !f.gc && f.col === id && f.prio >= 3).length;
    await L.elegirTipo(page, nom, 'Col', M.munNames[M.muns.indexOf(M.colonias[id].m)]); await page.waitForTimeout(400);
    const dd = await baja('dl-frentes'); const xx = xlsx(dd.ruta); e = await L.estado(page);
    ok(`H-011 ${nom}: panel = Excel = recálculo`, num(e.kpis[2].v) === esp && xx.datos.length - 1 === esp, `panel ${e.kpis[2].v} · Excel ${xx.datos.length - 1} · recálculo ${esp}`);
  }

  // ---------- H-010 · la leyenda siempre lleva unidad ----------
  e = await L.estado(page);
  ok('H-010 leyenda de colonia con unidad en cada fila', e.leyenda.every(r => /\d (km|m)$/.test(r.t) || / 0 km$/.test(r.t)), e.leyenda.map(r => r.t).join(' | '));
  await L.clic(page, '#zcity'); await page.selectOption('#alc', String(M.munNames.indexOf('Iztapalapa'))); await page.waitForTimeout(500);
  e = await L.estado(page);
  ok('H-010 leyenda de alcaldía con unidad en cada fila', e.leyenda.every(r => /\d (km|m)$/.test(r.t)), e.leyenda.map(r => r.t).join(' | '));

  // ---------- H-012 · tramos: la pantalla cuenta id_tramo y el Excel lo declara ----------
  const izt = M.munNames.indexOf('Iztapalapa');
  await L.ponResp(page, 'gc'); await page.waitForTimeout(500); e = await L.estado(page);
  const vpI = D.VP.filter(v => v.mun === izt && v.prio >= 3); const recsI = new Set(vpI.map(v => v.rec)).size;
  ok('H-012 panel: tramos prioritarios = tramos distintos del recálculo', num(e.kpis[2].v) === recsI, `panel ${e.kpis[2].v} · recálculo ${recsI}`);
  d = await baja('dl-tramos'); x = xlsx(d.ruta);
  const iId = x.datos[0].indexOf('id_tramo');
  ok('H-012 Excel de tramos trae la columna id_tramo', iId === 0);
  ok('H-012 renglones del Excel = partes del recálculo', x.datos.length - 1 === vpI.length, `${x.datos.length - 1} · ${vpI.length}`);
  const distintos = new Set(x.datos.slice(1).map(r => r[iId])).size;
  ok('H-012 id_tramo distintos en el Excel = tramos del panel', distintos === recsI && distintos === num(e.kpis[2].v), `${distintos} · panel ${e.kpis[2].v}`);
  ok('H-012 el diccionario declara los tramos distintos', +dicVal(x, 'Tramos distintos (id_tramo)') === recsI, String(dicVal(x, 'Tramos distintos (id_tramo)')));
  ok('H-012 el diccionario explica la unidad del renglón', /parte de tramo/.test(dicVal(x, 'Contenido') || ''));
  ok('H-012 cada columna está en el diccionario', x.datos[0].every(c => x.dic.some(r => r[0] === c)), x.datos[0].filter(c => !x.dic.some(r => r[0] === c)).join(','));

  // ---------- H-013 · avenida acotada a alcaldía ----------
  const avId = VPC.nomenclat.findIndex(n => /Calzada General Ignacio Zaragoza/i.test(n));
  await L.elegirTipo(page, VPC.nomenclat[avId], 'Av'); await page.waitForTimeout(500);
  e = await L.estado(page);
  ok('H-013 la consulta quedó en avenida + alcaldía', e.alcSel === String(izt) && /Zaragoza/.test(e.titulo + e.mapsum), `${e.titulo} · alc ${e.alcSel}`);
  d = await baja('dl-avenidas'); x = xlsx(d.ruta);
  ok('H-013 resumen por avenida: solo la avenida consultada', x.datos.length - 1 === 1 && x.datos[1][0] === VPC.nomenclat[avId], `${x.datos.length - 1} renglones`);
  const vAI = D.VP.filter(v => v.mun === izt && v.nom === avId);
  ok('H-013 resumen por avenida: km de la avenida en la alcaldía = recálculo', Math.abs(x.datos[1][x.datos[0].indexOf('km_total')] - vAI.reduce((s, v) => s + v.len, 0) / 1000) < 0.006);
  ok('H-013 ámbito declarado = avenida · alcaldía', dicVal(x, 'Ámbito consultado') === `${VPC.nomenclat[avId]} · Iztapalapa`, dicVal(x, 'Ámbito consultado'));
  d = await baja('dl-tramos'); x = xlsx(d.ruta);
  ok('H-013 Excel de tramos de la avenida en la alcaldía: renglones = recálculo', x.datos.length - 1 === vAI.filter(v => v.prio >= 3).length, `${x.datos.length - 1}`);
  d = await baja('dl-ficha-av');
  ok('H-013 la ficha de avenida ya no lleva el nombre de la alcaldía', d && /_toda_la_ciudad(_\d{8})?\.pdf$/.test(d.nombre) && !/iztapalapa/.test(d.nombre), d && d.nombre);
  if (d) { const txt = cp.execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', d.ruta, '-']).toString();
    const vA = D.VP.filter(v => v.nom === avId); const kmI = vAI.reduce((s, v) => s + v.len, 0) / 1000, kmpI = vAI.filter(v => v.prio >= 3).reduce((s, v) => s + v.len, 0) / 1000;
    ok('H-013 la ficha declara que sus cifras son de la avenida completa', /avenida completa/.test(txt.replace(/\s+/g, ' ')));
    ok('H-013 la ficha da aparte las cifras de la alcaldía consultada', new RegExp(`En Iztapalapa: ${L.kmTxt(kmI)} ${L.kmUn(kmI)} de la avenida, ${L.kmTxt(kmpI)} ${L.kmUn(kmpI)} prioritarios`).test(txt.replace(/\s+/g, ' ')), `${L.kmTxt(kmI)} km · ${L.kmTxt(kmpI)} km prioritarios`);
    const kmpC = vA.filter(v => v.prio >= 3).reduce((s, v) => s + v.len, 0) / 1000;
    ok('H-013 cifra principal de la ficha = avenida completa (recálculo)', txt.includes(`${L.kmTxt(kmpC)} ${L.kmUn(kmpC)}`), `${L.kmTxt(kmpC)} km`); }
  // dos responsables + colonia: el Excel de tramos no declara la colonia
  await L.ponResp(page, 'both'); await L.clic(page, '#zcity'); await L.ponResp(page, 'both');
  const mey = M.colonias.findIndex(c => c && /Santa Cruz Meyehualco/i.test(c.n) && c.m === '007');
  await L.elegirTipo(page, M.colonias[mey].n, 'Col', 'Iztapalapa'); await page.waitForTimeout(400); await L.ponResp(page, 'both'); await page.waitForTimeout(400);
  e = await L.estado(page);
  if (e.dl['dl-tramos'].visible) { d = await baja('dl-tramos'); x = xlsx(d.ruta);
    ok('H-013 tramos con colonia elegida: el nombre no declara la colonia', !/meyehualco/.test(d.nombre), d.nombre);
    ok('H-013 tramos con colonia elegida: ámbito declarado = alcaldía', dicVal(x, 'Ámbito consultado') === 'Iztapalapa', dicVal(x, 'Ámbito consultado'));
    ok('H-013 tramos con colonia elegida: contenido = alcaldía', x.datos.length - 1 === vpI.length, `${x.datos.length - 1}`);
  } else ok('H-013 caso de dos responsables con colonia reproducido', false, 'el botón de tramos no se ofrece en este estado');

  // ---------- H-020 · calles homónimas ----------
  await L.ponResp(page, 'alc'); await L.clic(page, '#zcity'); await page.waitForTimeout(300);
  await L.buscar(page, 'Benito Juárez'); const ops = await page.$$('#omni-list li.opt');
  let hecho = false; for (const o of ops) { const t = await o.innerText(); if (t.trim().startsWith('Calle') && /calles con este nombre/.test(t)) { await o.dispatchEvent('mousedown'); hecho = true; break; } }
  await page.waitForTimeout(800); e = await L.estado(page);
  ok('H-020 se eligió el nombre repetido en el buscador', hecho);
  ok('H-020 nombre repetido: no se ofrece Excel ni ficha «de la calle»', !e.dl['dl-calle'].visible && !e.dl['dl-ficha-calle'].visible);
  ok('H-020 nombre repetido: aviso para elegir una calle', /Elige una en la lista/.test(e.dlStatus || ''), e.dlStatus);
  ok('H-020 la lista muestra las calles, cada una en su colonia', e.lista.filter(l => !l.empty).length > 1, e.listCount);
  // v17.17: sin alcaldía elegida, el nombre repetido se responde con un paso de ubicación (alcaldías y renglones sin cifras)
  const chips = await page.$$eval('#locchips button', bs => bs.map(b => b.textContent.replace(/\s+/g, ' ').trim()));
  const nTit = +((e.listTitle || '').replace(/,/g, '').match(/^(\d+) calles (se llaman|coinciden)/i) || [])[1];
  ok('v17.17 nombre repetido en toda la ciudad: se pregunta la alcaldía, con las que tienen esa calle', chips.length > 1 && chips.reduce((s, c) => s + +(c.match(/(\d+)$/) || [0, 0])[1], 0) === nTit, `${e.listTitle} · ${chips.slice(0, 4).join(' | ')}`);
  ok('v17.17 los renglones para ubicar no llevan cifras de prioridad', e.lista.filter(l => !l.empty).every(l => !/frentes prioritarios|Muy Alta|km/.test(l.t)), (e.lista[0] || {}).t);
  const li = (await page.$$('#results li:not(.empty)'))[0];
  await li.evaluate(n => n.click()); await page.waitForTimeout(900); e = await L.estado(page);
  const txtLi = (e.lista.find(l => l.act) || { t: '' }).t;
  ok('v17.17 al elegir, la consulta queda en la alcaldía de la calle y la calle resaltada', e.alcSel !== '' && txtLi.length > 0, `alc ${e.alcSel} · ${txtLi.slice(0, 90)}`);
  ok('H-020 al elegir una calle de la lista sí se ofrecen Excel y ficha', e.dl['dl-calle'].visible && e.dl['dl-ficha-calle'].visible, txtLi);
  d = await baja('dl-calle'); x = xlsx(d.ruta);
  const cols = new Set(x.datos.slice(1).map(r => r[x.datos[0].indexOf('colonia')]));
  ok('H-020 el Excel de la calle trae una sola colonia', cols.size === 1, [...cols].join(', '));
  const nFr = +(txtLi.match(/de (\d+) frentes/) || [])[1];
  ok('H-020 renglones del Excel de la calle = frentes que indica la lista', x.datos.length - 1 === nFr, `${x.datos.length - 1} · lista ${nFr}`);
  d = await baja('dl-ficha-calle');
  ok('H-020 la ficha de la calle pesa menos de 3 MB', d && d.bytes < 3e6, d && (d.bytes / 1e6).toFixed(2) + ' MB');

  // ---------- H-005 y H-068 · asignación preliminar, versión y corte de datos visibles ----------
  const cfg = await page.evaluate(() => window.SIA_VERSION);
  ok('H-068 la página conoce su versión y el corte de los datos', cfg && /^\d+\.\d+$/.test(cfg.v) && cfg.corte.length > 10, JSON.stringify(cfg));
  ok('H-068 versión y corte visibles en el panel', (await page.$eval('#ver-line', x => x.textContent)).includes('Versión ' + cfg.v));
  ok('H-005 aviso de asignación preliminar presente en el panel de capas', await page.$eval('#prelim-note', x => !x.hidden && getComputedStyle(x).display !== 'none' && /preliminar/.test(x.textContent)));
  ok('H-068 el diccionario del Excel trae versión y corte', dicVal(x, 'Versión de la herramienta') == cfg.v && dicVal(x, 'Corte de los datos') === cfg.corte, `${dicVal(x, 'Versión de la herramienta')} · ${dicVal(x, 'Corte de los datos')}`);
  ok('H-005 el diccionario del Excel declara la asignación preliminar', x.dic.some(r => /asignación de cada frente .* es preliminar/.test(String(r[0]))));
  if (d) { const t = cp.execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', d.ruta, '-']).toString().replace(/\s+/g, ' ');
    ok('H-005 y H-068 la ficha declara la asignación preliminar y la versión', /es preliminar/.test(t) && t.includes('Versión ' + cfg.v), t.slice(-160)); }
  await L.clic(page, '#zcity'); await page.selectOption('#alc', String(izt)); await page.waitForTimeout(400);
  for (const id of ['dl-ficha-alc']) { const f = await baja(id); const t = cp.execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', f.ruta, '-']).toString().replace(/\s+/g, ' ');
    ok(`H-005 y H-068 ${id}: asignación preliminar y versión en el pie`, /es preliminar/.test(t) && t.includes('Versión ' + cfg.v)); }

  // ---------- H-072, H-085, H-009 y H-017 · rótulos y cifras que salen de los datos ----------
  await L.ponResp(page, 'alc'); await L.clic(page, '#zcity'); await page.waitForTimeout(400); e = await L.estado(page);
  const kmpAlc = M.muns.map((m, i) => D.F.filter(f => !f.gc && f.mun === i && f.prio >= 3).reduce((t, f) => t + f.len, 0) / 1000);
  const totP = kmpAlc.reduce((a, b) => a + b, 0); const ord = kmpAlc.map((v, i) => [i, v]).sort((a, b) => b[1] - a[1]);
  const frase = `${M.munNames[ord[0][0]]} y ${M.munNames[ord[1][0]]} concentran ${L.f1.format(100 * (ord[0][1] + ord[1][1]) / totP)} %`;
  ok('H-085 las dos alcaldías con más km prioritarios se calculan de los datos', (e.nota || '').includes(frase), `${frase} · nota: ${(e.nota || '').slice(0, 160)}`);
  ok('H-017 la población se rotula como residente y no como atendida', /residen en colonias de prioridad Alta o Muy Alta/.test(e.pob || '') && /no equivale a población atendida/.test(e.pob || ''), e.pob);
  await page.selectOption('#alc', String(izt)); await page.waitForTimeout(500); e = await L.estado(page);
  const part = `${L.f1.format(100 * kmpAlc[izt] / totP)} % de los km prioritarios de la ciudad`;
  ok('H-072 el panel ya no ordena a la alcaldía por «lugar»', !/lugar de 16|º de 16/.test(e.panelTxt));
  ok('H-072 el panel da la participación de la alcaldía en los km prioritarios de la ciudad', (e.alcinfo || '').includes(part) && e.kpisTxt.includes(part), `${part} · ${(e.alcinfo || '').slice(0, 140)}`);
  const ay = await page.evaluate(() => ({ fr: document.getElementById('m-n-fr').textContent, alc: document.getElementById('m-n-alc').textContent, t: document.querySelector('.modal-card') ? document.querySelector('.modal-card').textContent : '' }));
  ok('H-085 la ayuda toma de los datos el total de frentes y los de alcaldías', num(ay.fr) === D.F.length && num(ay.alc) === D.F.filter(f => !f.gc).length, `${ay.fr} · ${ay.alc}`);
  ok('H-067 la ayuda nombra los controles como aparecen en pantalla', !/<b>Atribución<\/b>|casilla en Atribución/.test(await page.content()));
  const tec2 = M.colonias.findIndex(c => c && c.n === 'Tecpinco' && c.m === '007'); await L.elegirTipo(page, 'Tecpinco', 'Col', 'Iztapalapa'); await page.waitForTimeout(500); e = await L.estado(page);
  ok('H-009 el desarrollo social se rotula como de la unidad territorial', /de su unidad territorial/.test(e.colinfo || '') && /unidad territorial/.test(e.pob || ''), `${(e.colinfo || '').slice(0, 120)} · ${e.pob}`);

  // ---------- v17.15 · universo de intervención, reparto por responsable, calle por prioridad ----------
  // recálculo independiente: km de frente por responsable y prioridad; sin arbolado = (flags & 7) === 1; con banqueta = ((flags >> 3) & 7) === 0
  const rep = (filtro) => { const r = { km: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], sa: [0, 0], sb: [0, 0] };
    for (const f of D.F) { if (!filtro(f)) continue; r.km[f.gc][f.prio] += f.len / 1000; if (f.prio >= 2 && (f.flags & 7) === 1) { r.sa[f.gc] += f.len / 1000; if (((f.flags >> 3) & 7) === 0) r.sb[f.gc] += f.len / 1000; } } return r; };
  const u3 = a => a[2] + a[3] + a[4], k1 = v => L.f1.format(v);
  const cuadro = () => page.$$eval('#reparto table.reparto tbody tr', trs => trs.map(tr => [...tr.children].map(c => c.textContent.replace(/\s+/g, ' ').trim())));
  await L.ponResp(page, 'alc'); await L.clic(page, '#zcity'); await page.waitForTimeout(500);
  let R = rep(() => true), T = await cuadro();
  ok('v17.15 cuadro de reparto: nueve renglones (5 prioridades, total, universo y dos condiciones)', T.length === 9, String(T.length));
  ok('v17.15 ciudad: Muy Alta por responsable = recálculo', T[0] && T[0][1] === k1(R.km[0][4]) && T[0][2] === k1(R.km[1][4]) && T[0][3] === k1(R.km[0][4] + R.km[1][4]), (T[0] || []).join(' | '));
  const sm = a => a.reduce((x, y) => x + y, 0);
  ok('v17.15 ciudad: total por responsable = recálculo', T[5] && T[5][1] === k1(sm(R.km[0])) && T[5][2] === k1(sm(R.km[1])), (T[5] || []).join(' | '));
  ok('v17.15 ciudad: universo de intervención = Muy Alta + Alta + Media del recálculo', T[6] && T[6][1] === k1(u3(R.km[0])) && T[6][2] === k1(u3(R.km[1])) && T[6][3] === k1(u3(R.km[0]) + u3(R.km[1])), (T[6] || []).join(' | '));
  ok('v17.15 ciudad: sin arbolado, y sin arbolado con banqueta = recálculo', T[8] && T[7][1] === k1(R.sa[0]) && T[7][2] === k1(R.sa[1]) && T[8][1] === k1(R.sb[0]) && T[8][2] === k1(R.sb[1]), `${(T[7] || []).join(' | ')} · ${(T[8] || []).join(' | ')}`);
  let ub = await page.$eval('#univbox', x => x.hidden ? '' : x.textContent.replace(/\s+/g, ' '));
  ok('v17.15 ciudad: cifra del universo de intervención en el panel = recálculo', ub.includes(`${L.kmTxt(u3(R.km[0]))} ${L.kmUn(u3(R.km[0]))}`) && /Muy Alta, Alta y Media/.test(ub), ub.slice(0, 140));
  e = await L.estado(page);
  const pobU = M.colonias.filter(c => c && c.n && c.p >= 2 && M.muns.includes(c.m)).reduce((t, c) => t + (c.pob || 0), 0);
  ok('v17.15 población del universo de intervención (colonias Muy Alta, Alta y Media) = recálculo', (e.pob || '').includes(L.f1.format(pobU / 1e6) + ' millones de habitantes') && /prioridad Media/.test(e.pob || ''), (e.pob || '').slice(0, 260));
  await page.selectOption('#alc', String(izt)); await page.waitForTimeout(500);
  R = rep(f => f.mun === izt); T = await cuadro();
  ok('v17.15 alcaldía: universo y condiciones = recálculo', T[8] && T[6][1] === k1(u3(R.km[0])) && T[6][2] === k1(u3(R.km[1])) && T[8][1] === k1(R.sb[0]), `${(T[6] || []).join(' | ')} · ${(T[8] || []).join(' | ')}`);
  x = xlsx((await baja('dl-calles')).ruta);
  ok('v17.15 el diccionario del Excel trae el universo de intervención del ámbito', Math.abs(+dicVal(x, 'Universo de intervención del ámbito (Muy Alta, Alta y Media), km de frente a cargo de la alcaldía') - u3(R.km[0])) < 0.006 && Math.abs(+dicVal(x, 'De ese universo, km de frente sin arbolado y con banqueta (INEGI)') - R.sb[0]) < 0.006);
  { const h = x.datos[0], iu = h.indexOf('km_universo_intervencion'), im = h.indexOf('km_media'), ip = h.indexOf('km_prioritario');
    ok('v17.15 resumen por calle: km_universo_intervencion = km_prioritario + km_media en cada renglón', iu > 0 && im > 0 && x.datos.slice(1).every(r => Math.abs(r[iu] - r[ip] - r[im]) < 0.011) && h.every(c => x.dic.some(q => q[0] === c))); }
  { const f = await baja('dl-ficha-alc'); const t = cp.execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', f.ruta, '-']).toString().replace(/\s+/g, ' ');
    ok('v17.15 la ficha de alcaldía trae el universo de intervención = recálculo', t.includes(`Universo de intervención (Muy Alta, Alta y Media): ${L.kmTxt(u3(R.km[0]))} ${L.kmUn(u3(R.km[0]))}`) && /Versión/.test(t), (t.match(/Universo de intervención.{0,160}/) || [''])[0]); }
  await L.elegirTipo(page, 'Tecpinco', 'Col', 'Iztapalapa'); await page.waitForTimeout(500);
  R = rep(f => f.col === tec2); T = await cuadro();
  ok('v17.15 colonia: el cuadro usa el mismo territorio que el panel (manda la colonia)', T[5] && T[5][1] === k1(sm(R.km[0])) && T[6][1] === k1(u3(R.km[0])), `${(T[5] || []).join(' | ')} · ${(T[6] || []).join(' | ')}`);
  // con la colonia elegida, el listado es de calles
  await page.click('#tab-list'); await page.waitForTimeout(400);
  { const li = await page.$$eval('#results li', ls => ls.filter(l => l.querySelector('.desg')).map(l => ({ partes: [...l.querySelectorAll('.desg span')].map(s => s.textContent.trim()), pred: /Prioridad predominante/.test(l.textContent) })));
    ok('v17.15 el listado de calles desglosa cada calle por prioridad', li.length > 0 && li.every(l => l.partes.length >= 1 && l.partes.every(p => /^(Muy Alta|Alta|Media|Baja|Muy Baja) [\d.,]+ (km|m)$/.test(p))), JSON.stringify(li[0] || {}));
    ok('v17.15 las calles con más de una prioridad declaran la predominante', li.filter(l => l.partes.length > 1).every(l => l.pred)); }

  // ---------- v17.16 · tramos de la calle consultada ----------
  { const li0 = await page.$('#results li:not(.empty)'); const txt0 = (await li0.innerText()).replace(/\s+/g, ' '); await li0.click(); await page.waitForTimeout(700);
    const nFr0 = +(txt0.match(/de (\d+) frentes prioritarios/) || [])[1];
    const tr = await page.$eval('#tramos', b => b.hidden ? null : [...b.querySelectorAll('ol.tramos li')].map(l => l.textContent.replace(/\s+/g, ' ')));
    ok('v17.16 al elegir una calle se listan sus tramos', !!tr && tr.length > 0, tr ? `${tr.length} tramos · ${tr[0].slice(0, 110)}` : 'sin cuadro de tramos');
    const frT = (tr || []).reduce((s, t) => s + +((t.match(/(\d+) frentes?(?! de)/) || [])[1] || 0), 0);
    ok('v17.16 los tramos reúnen todos los frentes de la calle, sin repetir', frT === nFr0, `tramos ${frT} · lista ${nFr0}`);
    x = xlsx((await baja('dl-calle')).ruta); const h = x.datos[0], it = h.indexOf('tramo');
    ok('v17.16 el Excel de la calle numera el tramo de cada frente y lo define en el diccionario', it > 0 && x.datos.slice(1).every(r => +r[it] >= 1) && new Set(x.datos.slice(1).map(r => r[it])).size === (tr || []).length && +dicVal(x, 'Tramos de la calle') === (tr || []).length && h.every(c => x.dic.some(q => q[0] === c)));
    const f = await baja('dl-ficha-calle'); const t = cp.execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', f.ruta, '-']).toString().replace(/\s+/g, ' ');
    ok('v17.16 la ficha de la calle trae la tabla de tramos', /TRAMOS DE LA CALLE/.test(t) && /confirman en campo/.test(t)); }

  // ---------- v17.17 · filtro de alcaldía y búsqueda de calle con su lugar ----------
  await L.clic(page, '#zcity'); await page.waitForTimeout(400); await page.click('#tab-list'); await page.fill('#q', 'Ayuntamiento'); await page.waitForTimeout(500);
  { const ch = await page.$$('#locchips button'); let bi = null; for (const b of ch) if (/Iztapalapa/.test(await b.innerText())) bi = b;
    const nI = bi ? +((await bi.innerText()).match(/(\d+)\s*$/) || [])[1] : -1; const espI = new Set(D.F.filter(f => !f.gc && f.mun === izt && L.norm(M.names[f.name]).includes('ayuntamiento')).map(f => f.name * 4096 + f.col)).size;
    ok('v17.17 el conteo de la alcaldía en el filtro = recálculo', nI === espI, `filtro ${nI} · recálculo ${espI}`);
    if (bi) await bi.evaluate(b => b.click()); await page.waitForTimeout(700); e = await L.estado(page);
    ok('v17.17 al elegir la alcaldía, la lista queda en ella y conserva la búsqueda', e.alcSel === String(izt) && e.q === 'Ayuntamiento' && e.lista.filter(l => !l.empty).length === espI && /frentes prioritarios/.test(e.lista[0].t), `alc ${e.alcSel} · q ${e.q} · ${e.lista.filter(l => !l.empty).length} renglones`);
    ok('v17.17 con alcaldía elegida se ofrece buscar en otra alcaldía', /en otra alcaldía/.test(await page.$eval('#locchips', b => b.hidden ? '' : b.textContent))); }
  await L.clic(page, '#zcity'); await page.waitForTimeout(300);
  { const r = await L.buscar(page, 'ayuntamiento centro'); const op = r.find(o => /^Calle/.test(o.t) && /Centro/.test(o.t) && /Cuauht/.test(o.t));
    ok('v17.17 el buscador acepta la calle con su colonia («ayuntamiento centro»)', !!op, r.map(o => o.t).slice(0, 4).join(' | ')); }
  await page.fill('#omni', ''); await page.click('#tab-list'); await page.fill('#q', 'ayuntamiento centro'); await page.waitForTimeout(500); e = await L.estado(page);
  ok('v17.17 el filtro del listado acepta la calle con su colonia', e.lista.filter(l => !l.empty).length >= 1 && e.lista.filter(l => !l.empty).every(l => /Centro/i.test(l.t)), e.lista.slice(0, 3).map(l => l.t).join(' | '));
  await page.fill('#q', '');

  // ---------- v17.18 · H-018: km de vialidad (eje) y su equivalente en km de frente; H-071: banqueta como condición ----------
  await L.clic(page, '#zcity'); await page.waitForTimeout(300); await L.ponResp(page, 'gc'); await page.click('#tab-res'); await page.waitForTimeout(500);
  { const g = D.F.filter(f => f.gc); const kt = g.reduce((s, f) => s + f.len, 0) / 1000, kp = g.filter(f => f.prio >= 3).reduce((s, f) => s + f.len, 0) / 1000;
    const t = await page.$eval('#univbox', b => b.hidden ? '' : b.textContent.replace(/\s+/g, ' '));
    ok('v17.18 Gobierno Central, ciudad: equivalente en km de frente = recálculo', t.includes(`Equivalen a ${L.kmTxt(kt)} ${L.kmUn(kt)} de frente de manzana`) && t.includes(`${L.kmTxt(kp)} ${L.kmUn(kp)} prioritarios`) && /sobre el eje/.test(t), t.slice(-260));
    await page.selectOption('#alc', String(izt)); await page.waitForTimeout(500);
    const gi = g.filter(f => f.mun === izt); const ki = gi.reduce((s, f) => s + f.len, 0) / 1000;
    const ti = await page.$eval('#univbox', b => b.hidden ? '' : b.textContent.replace(/\s+/g, ' '));
    ok('v17.18 Gobierno Central, alcaldía: equivalente en km de frente = recálculo', ti.includes(`Equivalen a ${L.kmTxt(ki)} ${L.kmUn(ki)} de frente de manzana`), ti.slice(-200));
    x = xlsx((await baja('dl-tramos')).ruta);
    ok('v17.18 el Excel de tramos declara la unidad y el equivalente en km de frente', /sobre el eje/.test(dicVal(x, 'Unidad de las longitudes') || '') && Math.abs(+dicVal(x, 'Equivalente del ámbito en km de frente de manzana (aceras con manzana enfrente)') - ki) < 0.006);
    const f = await baja('dl-ficha-vpalc'); const tf = cp.execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', f.ruta, '-']).toString().replace(/\s+/g, ' ');
    ok('v17.18 la ficha de vialidades primarias declara la unidad y el equivalente', /se miden sobre el eje/.test(tf) && tf.includes(`Equivalen a ${L.kmTxt(ki)} ${L.kmUn(ki)} de frente de manzana`), (tf.match(/Los kilómetros de esta ficha.{0,200}/) || [''])[0]); }
  await L.ponResp(page, 'alc'); await page.waitForTimeout(300);
  { x = xlsx((await baja('dl-frentes')).ruta);
    ok('v17.18 H-071 el diccionario trata la banqueta como condición por verificar', /condición por verificar/.test((x.dic.find(r => r[0] === 'banqueta_inegi') || [])[1] || '')); }
  ok('v17.18 la ayuda explica las dos unidades', /No sumes? unidades distintas/.test(await page.content()));

  // ---------- v17.19 · bloque B: H-008, H-028, H-041, H-043, H-044, H-087, H-088, H-089 ----------
  const generico = n => { n = L.norm(n); return n === '' || n === 'sin referencia' || n === 'sin nombre' || n.startsWith('ninguno') || / ninguno$/.test(n) || n.startsWith('manzana o edificacion'); };
  await L.ponResp(page, 'alc'); await L.clic(page, '#zcity'); await page.waitForTimeout(300); await page.selectOption('#alc', String(izt)); await page.waitForTimeout(600); e = await L.estado(page);
  { const espI = D.F.map((f, i) => [f, i]).filter(([f]) => !f.gc && f.mun === izt && f.prio >= 3);
    d = await baja('dl-frentes'); x = xlsx(d.ruta); const h = x.datos[0], iv = h.indexOf('vialidad'), ii = h.indexOf('id_frente'), ila = h.indexOf('lat'), ilo = h.indexOf('lon'), ip = h.indexOf('poblacion_colonia');
    const nSn = espI.filter(([f]) => generico(M.names[f.name])).length;
    ok('v17.19 H-008 el Excel de frentes no usa nombres genéricos de INEGI como calle', x.datos.slice(1).every(r => !generico(r[iv]) ) && x.datos.slice(1).filter(r => r[iv] === 'Frente sin nombre de calle (INEGI)').length === nSn, `sin nombre ${nSn}`);
    ok('v17.19 H-008 el diccionario reporta los frentes sin nombre de calle', +dicVal(x, 'Frentes sin nombre de calle (INEGI) en este archivo') === nSn, String(dicVal(x, 'Frentes sin nombre de calle (INEGI) en este archivo')));
    const idsX = x.datos.slice(1).map(r => r[ii]);
    ok('v17.19 H-088 cada renglón trae un id_frente único que existe en los datos', ii === 0 && new Set(idsX).size === idsX.length && idsX.length === espI.length && idsX.every(i => D.F[i] && !D.F[i].gc && D.F[i].mun === izt));
    ok('v17.19 H-088 el nombre del archivo lleva la fecha AAAAMMDD', /_\d{8}\.xlsx$/.test(d.nombre), d.nombre);
    // punto a media longitud, recalculado de forma independiente
    const medio = pts => { const n = pts.length / 2, c = Math.cos(pts[1] * Math.PI / 180); let Lt = 0; const sg = []; for (let k = 0; k < n - 1; k++) { const dd = Math.hypot((pts[2 * k + 2] - pts[2 * k]) * c, pts[2 * k + 3] - pts[2 * k + 1]); sg.push(dd); Lt += dd; }
      if (!Lt) return [pts[0], pts[1]]; let hh = Lt / 2; for (let k = 0; k < n - 1; k++) { if (hh <= sg[k]) { const t = sg[k] ? hh / sg[k] : 0; return [pts[2 * k] + (pts[2 * k + 2] - pts[2 * k]) * t, pts[2 * k + 1] + (pts[2 * k + 3] - pts[2 * k + 1]) * t]; } hh -= sg[k]; } return [pts[2 * n - 2], pts[2 * n - 1]]; };
    const malos = x.datos.slice(1).filter(r => { const m = medio(D.F[r[ii]].pts); return Math.abs(m[0] - r[ilo]) > 2e-6 || Math.abs(m[1] - r[ila]) > 2e-6; }).length;
    ok('v17.19 H-089 las coordenadas del Excel son el punto a media longitud sobre la línea', malos === 0, `${malos} renglones fuera`);
    ok('v17.19 H-087 la predominante se expresa en km de frente', /de los km de frente de la alcaldía/.test(e.alcinfo || ''), (e.alcinfo || '').slice(0, 110));
    const kmMB = D.F.filter(f => !f.gc && f.mun === izt && f.prio === 0).reduce((s, f) => s + f.len, 0) / 1000; const bMB = (e.bars.find(b => b.lab === 'Muy Baja') || {}).val || '';
    ok('v17.19 H-087 las barras redondean una sola vez desde la suma exacta', bMB.startsWith(`${L.kmTxt(kmMB)} ${L.kmUn(kmMB)}`), `${bMB} · exacto ${kmMB.toFixed(3)}`); }
  // H-028 frentes sin colonia
  await L.clic(page, '#zcity'); await page.waitForTimeout(400); e = await L.estado(page);
  { const sc = D.F.filter(f => !f.gc && !f.col); ok('v17.19 H-028 el resumen de la ciudad reporta los frentes sin colonia = recálculo', (e.nota || '').includes(`${L.fN.format(sc.length)} frentes`) && /no tienen colonia asignada/.test(e.nota || ''), (e.nota || '').slice(-230));
    ok('v17.19 H-028 la página declara su cobertura (ámbito urbano)', /Cobertura: frentes de manzana del ámbito urbano/.test(e.panelTxt)); }
  // H-041 filtro de la leyenda
  { const n0 = await page.$eval('#lg-filter-note', n => n.textContent); await L.ponPrio(page, [0, 0, 0, 0, 0]); const n1 = await page.$eval('#lg-filter-note', n => n.textContent); await L.ponPrio(page, [1, 1, 1, 1, 1]);
    ok('v17.19 H-041 la leyenda declara que solo afecta al mapa y avisa si no queda prioridad visible', /solo cambian lo que se ve en el mapa/.test(n0) && /Ninguna prioridad está visible/.test(n1), n1); }
  // H-043 colonia sin frentes a cargo de la alcaldía
  { const conFr = new Set(D.F.filter(f => !f.gc).map(f => f.col)); const cid = M.colonias.findIndex((c, i) => i > 0 && c && c.n && !conFr.has(i) && M.colonias.filter(q => q && q.n === c.n).length === 1);
    const cn = M.colonias[cid]; const hecho2 = await L.elegirTipo(page, cn.n, 'Col'); await page.waitForTimeout(600); e = await L.estado(page);
    ok('v17.19 H-043 colonia sin frentes: descargas deshabilitadas con explicación', hecho2 && e.dl['dl-frentes'].disabled && e.dl['dl-calles'].disabled && e.dl['dl-ficha'].disabled && /no tiene frentes de manzana a cargo de la alcaldía/.test(e.dlStatus || ''), `${cn.n} · ${e.dlStatus}`); }
  // H-044 avenidas homónimas separadas
  await L.clic(page, '#zcity'); await page.waitForTimeout(300); await L.ponResp(page, 'gc');
  { const okAv = await L.elegirTipo(page, 'Avenida Chapultepec', 'Av'); await page.waitForTimeout(600); e = await L.estado(page);
    ok('v17.19 H-044 una avenida cuyo nombre reúne vialidades separadas lo advierte', okAv && /vialidades separadas entre sí/.test(e.avinfo || '') && /Xochimilco/.test(e.avinfo || ''), (e.avinfo || '').slice(-260)); }
  await L.ponResp(page, 'alc'); await L.clic(page, '#zcity'); await page.waitForTimeout(300);
  // H-087 la calle consultada aparece en la ruta y se puede soltar
  await L.elegirTipo(page, 'Tecpinco', 'Col', 'Iztapalapa'); await page.waitForTimeout(500); await page.click('#tab-list'); await page.waitForTimeout(300);
  { await (await page.$('#results li:not(.empty)')).evaluate(n => n.click()); await page.waitForTimeout(600); e = await L.estado(page);
    const tiene = /Quitar la calle|×/.test(await page.$eval('#cr-rest', r => r.innerHTML)) && (await page.$$('#cr-rest .cr-up[data-up="calle"]')).length === 1;
    await page.$eval('#cr-rest .cr-up[data-up="calle"]', b => b.click()); await page.waitForTimeout(400); const e2 = await L.estado(page);
    ok('v17.19 H-087 la calle consultada es un nivel de la ruta y se puede soltar', tiene && !e2.dl['dl-calle'].visible && e.dl['dl-calle'].visible, e.crRest); }

  ok('sin errores de JavaScript durante la prueba', errores.length === 0, errores.slice(0, 3).join(' | '));
  await browser.close(); srv.close();
  process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
