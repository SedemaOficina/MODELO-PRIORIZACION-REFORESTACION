# «Prioritario» del Gobierno Central: clase de la vialidad (km sobre el eje) contra clase del frente (km de frente de la equivalencia)
import sys; sys.path.insert(0, sys.argv[1])
import datos_indep as D
from collections import defaultdict
d = D.carga('X:/r7/docs'); F, V, M = d['F'], d['V'], d['M']
av = defaultdict(lambda: dict(kmp_eje=0, km_eje=0, fr=0, frp_clase_frente=0, frp_clase_via=0))
for v in V:
    a = av[v['nom']]; a['km_eje'] += v['len']/1000
    if v['prio'] >= 2: a['kmp_eje'] += v['len']/1000
for f in F:
    if not f['gc'] or f['vp'] < 0: continue
    a = av[V[f['vp']]['nom']]; a['fr'] += f['len']/1000
    if f['prio'] >= 2: a['frp_clase_frente'] += f['len']/1000
    if V[f['vp']]['prio'] >= 2: a['frp_clase_via'] += f['len']/1000
cero = [(k, x) for k, x in av.items() if x['kmp_eje'] == 0 and x['frp_clase_frente'] > 0.5]
cero.sort(key=lambda t: -t[1]['frp_clase_frente'])
print('avenidas con 0 km prioritarios sobre el eje y km de frente «prioritarios» en la equivalencia:', len(cero))
for k, x in cero[:8]: print(' ', k, M['vp']['nomenclat'][k], {a: round(b, 2) for a, b in x.items()})
tot = lambda key: round(sum(x[key] for x in av.values()), 2)
print('ciudad: km de frente GC', tot('fr'), '| prioritarios por clase del frente', tot('frp_clase_frente'), '| por clase de la vialidad', tot('frp_clase_via'))
