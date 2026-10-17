// Contraste del mapa: mismo cálculo que herramientas/contraste.mjs (lee los colores de 02_fuente/css y 02_fuente/js).
// Falla si un par exigido que hoy cumple deja de cumplir (texto 4.5:1; líneas, puntos, aros, contornos y foco 3:1, WCAG 2.2),
// si un color ya no está donde la auditoría lo busca, o si la lista de pendientes ya no corresponde a sus pares.
// Los «Pendiente de decisión» (PENDIENTES_CONOCIDOS en contraste.mjs) no la hacen fallar: se listan como aviso.
// No abre el navegador: corre en las rápidas. Uso: node 04_pruebas/prueba_contraste.js
const path = require('path'), fs = require('fs'), { pathToFileURL } = require('url');
const RAIZ = path.join(__dirname, '..');
const r = []; const ok = (n, cond, det = '') => { r.push([!!cond, n, det]); console.log(`${cond ? 'OK   ' : 'FALLA'} ${n}${det ? ' · ' + det : ''}`); return !!cond; };
const aviso = (n, det = '') => console.log(`AVISO ${n}${det ? ' · ' + det : ''}`);

(async () => {
  const M = await import(pathToFileURL(path.join(RAIZ, 'herramientas', 'contraste.mjs')).href);
  // la fórmula, contra valores conocidos de WCAG (independientes de la herramienta)
  const rz = (a, b) => M.razon(M.rgbDe(a), M.rgbDe(b));
  ok('fórmula de WCAG: negro sobre blanco da 21:1', Math.abs(rz('#000', '#fff') - 21) < 1e-9, rz('#000', '#fff').toFixed(4));
  ok('fórmula de WCAG: #767676 sobre blanco da 4.54:1 (el gris más claro que cumple 4.5:1)', M.fmtR(rz('#767676', '#fff')) === '4.54:1' && rz('#777777', '#fff') < 4.5, `${rz('#767676', '#fff').toFixed(3)} · #777777 ${rz('#777777', '#fff').toFixed(3)}`);
  ok('composición de transparencias: negro al 50 % sobre blanco da #808080', M.hex(M.sobre({ n: 'n', rgb: [0, 0, 0], a: 0.5 }, { n: 'b', rgb: [255, 255, 255], a: 1 })) === '#808080');

  let A;
  try { A = M.auditar(RAIZ); ok('la auditoría encuentra todos sus colores en 02_fuente', true, `${A.pares.length} pares`); }
  catch (e) { ok('la auditoría encuentra todos sus colores en 02_fuente', false, e.message); return fin(); }

  const porId = new Map(A.pares.map(p => [p.id, p]));
  ok('cada par tiene un id único', porId.size === A.pares.length);
  // la lista de pendientes corresponde a sus pares (si la numeración cambió, un par nuevo podría esconderse bajo un id viejo)
  const malos = M.PENDIENTES_CONOCIDOS.filter(([id, donde]) => !porId.has(id) || porId.get(id).donde !== donde);
  ok('PENDIENTES_CONOCIDOS corresponde a los pares de la auditoría', malos.length === 0, malos.map(([id]) => id).join(', ') + (malos.length ? ' · rehacer con node herramientas/contraste.mjs --pendientes' : ''));
  const malosAc = M.ACEPTADOS.filter(([id, donde]) => !porId.has(id) || porId.get(id).donde !== donde);
  ok('ACEPTADOS corresponde a los pares de la auditoría', malosAc.length === 0, malosAc.map(([id]) => id).join(', '));
  const conocidos = new Set([...M.PENDIENTES_CONOCIDOS, ...M.ACEPTADOS].map(([id]) => id));

  const exigidos = A.pares.filter(p => p.exige);
  const cumplen = exigidos.filter(p => p.razon >= p.min);
  const nuevos = exigidos.filter(p => p.razon < p.min && !conocidos.has(p.id));
  ok(`los pares exigidos que cumplen siguen cumpliendo (${cumplen.length} de ${exigidos.length})`, nuevos.length === 0,
    nuevos.map(p => `${p.id} ${M.fmtR(p.razon)} (mínimo ${p.min}:1) ${p.donde}`).join(' · '));
  for (const p of nuevos) console.log(`        ${p.id}: ${M.hex(p.fg)} sobre ${M.hex(p.bg)} · ${p.fg.n} sobre ${p.bg.n}`);

  // avisos: pendientes de decisión (no fallan) y pendientes que ya cumplen
  const pend = exigidos.filter(p => p.resultado === 'Pendiente de decisión');
  if (pend.length) { aviso(`${pend.length} pares pendientes de decisión (no hacen fallar la prueba)`);
    for (const p of pend) console.log(`        ${p.id} ${M.fmtR(p.razon).padStart(7)} · ${p.donde}`); }
  const yaCumplen = [...M.PENDIENTES_CONOCIDOS, ...M.ACEPTADOS].filter(([id]) => porId.has(id) && porId.get(id).resultado === 'Cumple').map(([id]) => id);
  if (yaCumplen.length) aviso('ya cumplen y pueden salir de PENDIENTES_CONOCIDOS', yaCumplen.join(', '));

  // la auditoría escrita en 05_documentacion, al día con los colores (aviso, no falla)
  const doc = path.join(RAIZ, '05_documentacion', 'auditoria_contraste_mapa.md');
  if (!fs.existsSync(doc)) aviso('no existe 05_documentacion/auditoria_contraste_mapa.md', 'node herramientas/contraste.mjs --md 05_documentacion/auditoria_contraste_mapa.md');
  else { const sinFecha = t => t.replace(/\r/g, '').replace(/\(\d{4}-\d{2}-\d{2}\)/g, '');
    if (sinFecha(fs.readFileSync(doc, 'utf8')) !== sinFecha(M.markdown(A))) aviso('05_documentacion/auditoria_contraste_mapa.md no está al día con los colores', 'node herramientas/contraste.mjs --md 05_documentacion/auditoria_contraste_mapa.md --html _local/auditoria_contraste_mapa.html'); }
  const s = M.resumen(A);
  console.log(`\n${s.total} pares: ${s.cumple} cumplen, ${s.aceptado} aceptados, ${s.pendiente} pendientes de decisión, ${s.informativo} informativos`);
  fin();
})().catch(e => { ok('la prueba corre', false, e.stack || e.message); fin(); });

function fin() { const f = r.filter(x => !x[0]); console.log(`\n[contraste] ${r.length - f.length} de ${r.length} verificaciones correctas; ${f.length} fallas`);
  if (f.length) { console.log('Fallas:'); f.forEach(x => console.log('  - ' + x[1] + (x[2] ? ' · ' + x[2] : ''))); } process.exitCode = f.length ? 1 : 0; }
