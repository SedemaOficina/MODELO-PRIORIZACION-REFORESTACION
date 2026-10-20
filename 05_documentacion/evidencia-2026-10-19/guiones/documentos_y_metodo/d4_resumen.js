// D4 · resumen de d4_carga.json (y d4_pesos_disco.json): tablas de tiempos con las corridas y la mediana, y pesos de la primera carga por tipo.
// «finTareaListo» = fin de la tarea larga dentro de la cual la app marca SIA_LISTO (#loader hidden): antes de ese instante la página
// no puede pintar ni responder, aunque el atributo ya esté puesto. Uso: node d4_resumen.js [d4_carga.json] → d4_resumen.json
const fs = require('fs'), path = require('path');
const L = require('./d4_lib.js');
const J = JSON.parse(fs.readFileSync(path.join(L.E, process.argv[2] || 'd4_carga.json'), 'utf8'));
const D = JSON.parse(fs.readFileSync(path.join(L.E, 'd4_pesos_disco.json'), 'utf8'));
const disco = Object.fromEntries(D.archivos.map(a => [a.archivo, a]));
const finTarea = (lt, t) => { const x = lt.find(([s, d]) => s <= t && t <= s + d); return x ? x[0] + x[1] : t; };
const out = { chromium: J.chromium, tiempos: [], primeraCarga: null };
console.log('escenario | FCP (r1, r2, med) | listo | fin tarea de listo | entrada visible | toque→cuadro (Node) | TBT FCP→listo | TBT listo→fin obs. | TTI aprox | carga máquina');
for (const [id, e] of Object.entries(J.escenarios)) {
  const rr = e.runs.map(r => ({ fcp: r.fcpMs, listo: r.listoMs, finListo: finTarea(r.tareasLargas, r.listoMs), entrada: r.entradaMs, toque: r.toque && r.toque.nodeMs, tbt1: r.bloqueo.fcpAListo.tbtMs, tbt2: r.bloqueo.listoAlFin ? r.bloqueo.listoAlFin.tbtMs : null, tti: r.ttiAproxMs, obs: r.observadoHastaMs, maq: r.cargaMaquinaPct, ligero: r.ligero, titulo: (r.titulo || '').trim(), bytes: r.totalBytes, nPet: r.primeraCarga ? r.primeraCarga.length : null, maxLT: r.bloqueo.total.maxMs }));
  const col = k => [...rr.map(r => r[k]), L.mediana(rr.map(r => r[k]))];
  const fila = { id, fcpMs: col('fcp'), listoMs: col('listo'), finTareaListoMs: col('finListo'), entradaMs: col('entrada'), toqueNodeMs: col('toque'), tbtFcpListoMs: col('tbt1'), tbtListoFinMs: col('tbt2'), ttiAproxMs: col('tti'), tareaMasLargaMs: col('maxLT'), observadoHastaMs: rr.map(r => r.obs), cargaMaquinaPct: rr.map(r => r.maq), ligero: rr.map(r => r.ligero), titulo: rr.map(r => r.titulo), bytes: rr.map(r => r.bytes) };
  out.tiempos.push(fila);
  const f = a => a.map(x => x == null ? '—' : x).join(', ');
  console.log(`${id} | ${f(fila.fcpMs)} | ${f(fila.listoMs)} | ${f(fila.finTareaListoMs)} | ${f(fila.entradaMs)} | ${f(fila.toqueNodeMs)} | ${f(fila.tbtFcpListoMs)} | ${f(fila.tbtListoFinMs)} | ${f(fila.ttiAproxMs)} | ${f(fila.cargaMaquinaPct)}% · ligero ${f(fila.ligero)} · ${fila.titulo[0]}`);
}
// primera carga por tipo (corrida sin limitar × CPU 1, primera visita, corrida 1)
const ref = (J.escenarios['primera|sin limitar|cpu1'] || Object.values(J.escenarios)[0]).runs[0];
const porTipo = {}; let tot = 0, totGz = 0, totBr = 0, totDisco = 0;
for (const p of ref.primeraCarga) { const a = p.url.split('?')[0], d = disco[a] || disco[a === '' ? 'index.html' : a];
  const t = p.tipo || 'Other'; porTipo[t] = porTipo[t] || { n: 0, bytes: 0 }; porTipo[t].n++; porTipo[t].bytes += p.bytes || 0; tot += p.bytes || 0;
  if (d) { totDisco += d.disco; totGz += typeof d.gzip9 === 'number' ? d.gzip9 : d.disco; totBr += typeof d.brotli11 === 'number' ? d.brotli11 : d.disco; } }
out.primeraCarga = { escenario: 'primera|sin limitar|cpu1 corrida 1', porTipo, transferido: tot, discoMismosArchivos: totDisco, siTodoGzip9: totGz, siTodoBrotli11: totBr,
  archivos: ref.primeraCarga.map(p => { const a = p.url.split('?')[0] || 'index.html'; const d = disco[a] || {}; return { url: p.url, tipo: p.tipo, transferido: p.bytes, enc: p.enc, disco: d.disco, gzip9: d.gzip9, brotli11: d.brotli11, cache: p.cc, iniMs: p.iniMs, finMs: p.finMs }; }).sort((a, b) => (b.transferido || 0) - (a.transferido || 0)) };
console.log('\nPrimera carga (sin limitar, CPU 1):', JSON.stringify(porTipo), 'total transferido', tot, '· disco', totDisco, '· gzip9', totGz, '· brotli11', totBr);
for (const a of out.primeraCarga.archivos) console.log('  ', String(a.url).padEnd(45), a.tipo, a.transferido, a.enc || '-', 'disco', a.disco, 'gz9', a.gzip9, 'br11', a.brotli11, a.cache, `${a.iniMs}→${a.finMs} ms`);
fs.writeFileSync(path.join(L.E, 'd4_resumen.json'), JSON.stringify(out, null, 1));
