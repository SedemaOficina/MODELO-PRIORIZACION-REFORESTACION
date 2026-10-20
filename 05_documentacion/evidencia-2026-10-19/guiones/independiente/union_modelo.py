# Une cada frente de la herramienta con su registro del insumo del modelo (primer y último vértice) y compara:
# prioridad del frente, pr_sdm_hx (calificación de zona del modelo) contra la «prioridad de la colonia» que muestra la herramienta,
# y ARBOLES_D (INEGI) contra «sin arbolado» de la herramienta.
import sys, gzip, json; sys.path.insert(0, sys.argv[1])
import numpy as np, shapefile, pyproj, datos_indep as D
from collections import Counter
docs = 'X:/r7/docs'
a = D.ints(D.rd(docs + '/datos/data.bin')); p = 0; N = a[p]; p += 1; px = py = 0; ext = []; F = []
for i in range(N):
    mun, prio, name, tipo, col, ln, fl, vp = a[p:p+8]; p += 8; nv = a[p]; p += 1; pts = []
    for k in range(nv): px += a[p]; py += a[p+1]; p += 2; pts.append((px, py))
    ext.append((pts[0][0], pts[0][1], pts[-1][0], pts[-1][1])); F.append((prio, col, fl & 7, (fl >> 6) & 1))
M = json.loads(D.rd(docs + '/datos/meta.bin').decode('utf8')); Q = M['Q']
r = shapefile.Reader('X:/hallazgos/indep/insumo_frentes/shp_frentes_manzanasv/shp_frentes_manzanasv/frentes_manzanas_verdes', encoding='utf-8', encodingErrors='replace')
tr = pyproj.Transformer.from_crs(pyproj.CRS.from_wkt(open('X:/hallazgos/indep/insumo_frentes/shp_frentes_manzanasv/shp_frentes_manzanasv/frentes_manzanas_verdes.prj').read()), 'EPSG:4326', always_xy=True)
idx = {}; rec = []
for k, s in enumerate(r.iterShapeRecords(fields=['prio_fm', 'pr_sdm_hx', 'cat_pndvi', 'ARBOLES_D', 'S_CONSERVA', 'CLAVE'])):
    pts = s.shape.points; lo, la = tr.transform([pts[0][0], pts[-1][0]], [pts[0][1], pts[-1][1]])
    key = (round(lo[0]*Q), round(la[0]*Q), round(lo[1]*Q), round(la[1]*Q)); idx.setdefault(key, []).append(k); rec.append(s.record)
usado = set(); une = [-1]*N
for i in range(N):
    c = [k for k in idx.get(ext[i], []) if k not in usado]; c2 = [k for k in c if int(rec[k]['prio_fm']) - 1 == F[i][0]] or c
    if c2: une[i] = c2[0]; usado.add(c2[0])
print('frentes unidos', sum(1 for x in une if x >= 0), 'de', N)
ok = [i for i in range(N) if une[i] >= 0]
print('misma prioridad', sum(1 for i in ok if int(rec[une[i]]['prio_fm']) - 1 == F[i][0]))
# prioridad de la colonia que muestra la herramienta contra pr_sdm_hx del modelo (escala 1 a 5 contra 0 a 4)
t = Counter((M['colonias'][F[i][1]]['p'] if F[i][1] else None, int(rec[une[i]]['pr_sdm_hx'])) for i in ok)
igual = sum(n for (pc, hx), n in t.items() if pc is not None and pc + 1 == hx)
print('frentes cuya «prioridad de colonia» (herramienta) = calificación de zona del modelo (pr_sdm_hx):', igual, 'de', len(ok), f'({100*igual/len(ok):.1f} %)')
# colonias: ¿cuántas tienen frentes con más de una calificación de zona?
from collections import defaultdict
cz = defaultdict(Counter)
for i in ok:
    if F[i][1]: cz[F[i][1]][int(rec[une[i]]['pr_sdm_hx'])] += 1
print('colonias con frentes de más de una calificación de zona del modelo:', sum(1 for v in cz.values() if len(v) > 1), 'de', len(cz))
dist = Counter(); 
for c, v in cz.items():
    pc = M['colonias'][c]['p']; moda = v.most_common(1)[0][0]; dist[(pc + 1 if pc is not None and pc >= 0 else None) == moda] += 1
print('colonias cuya prioridad mostrada = la calificación de zona más frecuente de sus frentes:', dict(dist))
# «sin arbolado» de la herramienta (bits 0-2 = 1) contra ARBOLES_D y contra la clase de verdor del modelo (cat_pndvi)
sa = [i for i in ok if F[i][2] == 1]
print('«sin arbolado» (herramienta):', len(sa), '· ARBOLES_D:', Counter(rec[une[i]]['ARBOLES_D'] for i in sa).most_common(3))
print('   su clase de verdor del modelo (cat_pndvi 1 = más verde ... 5 = menos verde):', sorted(Counter(int(rec[une[i]]['cat_pndvi']) for i in sa).items()))
# prioridad = clase de (cat_pndvi + pr_sdm_hx)/2 ?
def clase(n): return 1 if n <= 1.5 else 2 if n <= 2 else 3 if n <= 3 else 4 if n <= 3.5 else 5
reg = sum(1 for i in ok if clase((int(rec[une[i]]['cat_pndvi']) + int(rec[une[i]]['pr_sdm_hx']))/2) - 1 == F[i][0])
print('prioridad del frente = clase de (verdor + zona)/2:', reg, 'de', len(ok))
print('suelo de conservación (S_CONSERVA=1) en la herramienta:', sum(1 for i in ok if int(float(rec[une[i]]['S_CONSERVA'])) == 1))
