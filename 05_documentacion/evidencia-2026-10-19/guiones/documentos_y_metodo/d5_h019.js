// D5 · Estado de H-019: frentes prioritarios a cargo del Gobierno Central cuyo tramo de vialidad primaria no es prioritario
// (no aparecen en el Excel de frentes de la alcaldía ni en el de tramos prioritarios). Uso: node d5_h019.js RUTA/docs
const L = require('X:/r6/04_pruebas/lib_pruebas.js'); const D = L.decodificar(process.argv[2]);
let n = 0, km = 0, inv = 0, kmInv = 0, sinVp = 0; const porMun = {};
for (const f of D.F) { if (!f.gc) continue; const vp = f.vp >= 0 ? D.VP[f.vp] : null; if (!vp) { sinVp++; continue; }
  if (f.prio >= L.PRIO_MIN && vp.prio < L.PRIO_MIN) { n++; km += f.len; const m = D.META.munNames[f.mun]; porMun[m] = (porMun[m] || 0) + f.len / 1000; }
  if (f.prio < L.PRIO_MIN && vp.prio >= L.PRIO_MIN) { inv++; kmInv += f.len; } }
console.log(JSON.stringify({ frentes_prioritarios_en_tramo_no_prioritario: n, km: +(km / 1000).toFixed(1), inverso_frentes: inv, inverso_km: +(kmInv / 1000).toFixed(1), frentes_gc_sin_tramo: sinVp,
  top_alcaldias_km: Object.entries(porMun).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => [k, +v.toFixed(1)]) }, null, 1));
