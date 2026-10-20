# Regla real de la prioridad del frente en el insumo del modelo (frentes_manzanas_verdes.dbf, nov. 2025)
import sys; sys.path.insert(0, sys.argv[1])
import dbf, datos_indep as D
from collections import Counter, defaultdict
P = 'X:/hallazgos/indep/insumo_frentes/shp_frentes_manzanasv/shp_frentes_manzanasv/frentes_manzanas_verdes.dbf'
Q = ['CVE_MUN', 'ARBOLES_D', 'S_CONSERVA', 'pr_sdm_hx', 'ndc_3', 'p_ndvi', 'cat_pndvi', 'prio_fm', 'PRIORIDAD', 'CLAVE']
R = list(dbf.filas(P, Q, 'latin1'))
f = lambda x: float(x) if x else None
print('registros', len(R))
print('prio_fm por ndc_3:', sorted(Counter((f(r['ndc_3']), f(r['prio_fm'])) for r in R).items()))
print('cat_pndvi por rango de p_ndvi:')
g = defaultdict(lambda: [1e9, -1e9, 0])
for r in R:
    c = f(r['cat_pndvi']); p = f(r['p_ndvi']); x = g[c]; x[0] = min(x[0], p); x[1] = max(x[1], p); x[2] += 1
for c in sorted(g): print('   cat', c, 'p_ndvi de', round(g[c][0], 2), 'a', round(g[c][1], 2), 'n', g[c][2])
print('pr_sdm_hx:', sorted(Counter(f(r['pr_sdm_hx']) for r in R).items()))
print('S_CONSERVA:', Counter(r['S_CONSERVA'] for r in R).most_common(4))
print('ARBOLES_D (INEGI) contra cat_pndvi:', sorted(Counter((r['ARBOLES_D'], f(r['cat_pndvi'])) for r in R).items())[:30])
# ¿pr_sdm_hx es constante dentro de una «CLAVE»?
k = defaultdict(set)
for r in R: k[r['CLAVE']].add(f(r['pr_sdm_hx']))
print('CLAVE distintas', len(k), '· con más de un pr_sdm_hx', sum(1 for v in k.values() if len(v) > 1))
# comparación con la herramienta, en el mismo orden de registros
d = D.carga('X:/r7/docs'); F = d['F']; M = d['M']
nom = {'Muy Baja': 0, 'Baja': 1, 'Media': 2, 'Alta': 3, 'Muy Alta': 4}
igual = sum(1 for a, b in zip(R, F) if nom.get(a['PRIORIDAD']) == b['prio'])
print('misma prioridad registro a registro (mismo orden):', igual, 'de', len(F))
# pr_sdm_hx contra la prioridad de colonia de la herramienta (si el orden coincide)
t = Counter((f(a['pr_sdm_hx']), M['colonias'][b['col']]['p'] if b['col'] else None) for a, b in zip(R, F))
print('pr_sdm_hx contra prioridad de la colonia (herramienta):', sorted(t.items(), key=lambda x: (str(x[0][0]), str(x[0][1])))[:40])
