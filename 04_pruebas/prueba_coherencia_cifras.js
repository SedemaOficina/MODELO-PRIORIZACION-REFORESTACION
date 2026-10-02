// Bloque F1-B1 · Coherencia de cifras entre pantalla, descargas y fichas (hallazgos H-010, H-011, H-012, H-013, H-020).
// Compara lo que muestra la pantalla contra el contenido real de cada archivo y contra un recálculo independiente (C_lib.js).
// Uso: DOCS=/ruta/a/docs node prueba_coherencia_cifras.js   · termina con código ≠ 0 si algo falla.
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const L = require('./lib_pruebas.js');
const SAL = process.env.SALIDA || fs.mkdtempSync(path.join(os.tmpdir(), 'coh-'));
const ok = L.Registro('coherencia de cifras'); const D = L.decodificar(); const M = D.META, VPC = M.vp;
// lee un .xlsx con openpyxl y devuelve {datos:[[...]], dic:[[...]]}
const xlsx = ruta => JSON.parse(cp.execFileSync('python3', ['-c', `
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
  ok('H-013 la ficha de avenida ya no lleva el nombre de la alcaldía', d && /_toda_la_ciudad\.pdf$/.test(d.nombre) && !/iztapalapa/.test(d.nombre), d && d.nombre);
  if (d) { const txt = cp.execFileSync('pdftotext', ['-layout', d.ruta, '-']).toString();
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
  const li = (await page.$$('#results li:not(.empty)'))[0]; const txtLi = (await li.innerText()).replace(/\s+/g, ' ');
  await li.evaluate(n => n.click()); await page.waitForTimeout(700); e = await L.estado(page);
  ok('H-020 al elegir una calle de la lista sí se ofrecen Excel y ficha', e.dl['dl-calle'].visible && e.dl['dl-ficha-calle'].visible, txtLi);
  d = await baja('dl-calle'); x = xlsx(d.ruta);
  const cols = new Set(x.datos.slice(1).map(r => r[x.datos[0].indexOf('colonia')]));
  ok('H-020 el Excel de la calle trae una sola colonia', cols.size === 1, [...cols].join(', '));
  const nFr = +(txtLi.match(/de (\d+) frentes/) || [])[1];
  ok('H-020 renglones del Excel de la calle = frentes que indica la lista', x.datos.length - 1 === nFr, `${x.datos.length - 1} · lista ${nFr}`);
  d = await baja('dl-ficha-calle');
  ok('H-020 la ficha de la calle pesa menos de 3 MB', d && d.bytes < 3e6, d && (d.bytes / 1e6).toFixed(2) + ' MB');

  ok('sin errores de JavaScript durante la prueba', errores.length === 0, errores.slice(0, 3).join(' | '));
  await browser.close(); srv.close();
  process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
