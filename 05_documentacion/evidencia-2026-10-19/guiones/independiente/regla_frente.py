# ¿Con qué regla sale la prioridad de cada frente? Cruce de la prioridad del frente con la prioridad de su colonia y el campo de arbolado (bits 0-2)
import sys; sys.path.insert(0, sys.argv[1])
import datos_indep as D
from collections import Counter, defaultdict
d = D.carga('X:/r7/docs'); F, M = d['F'], d['M']
C = M['colonias']; ARB = {0: 'Dispone', 1: 'No dispone', 2: 'Conj. hab.', 3: 'No aplica', 4: 'No especif.'}
t = defaultdict(Counter)
for f in F: t[(C[f['col']]['p'] if f['col'] else -9, f['arb'])][f['prio']] += 1
print('prioridad de colonia | arbolado (INEGI) -> distribución de la prioridad del frente (0 Muy Baja ... 4 Muy Alta)')
det = 0; tot = 0
for k in sorted(t):
    c = t[k]; n = sum(c.values()); top = c.most_common(1)[0]; det += top[1]; tot += n
    print(f'  col {k[0]:>2} | {ARB[k[1]]:<12} n={n:>6} ', dict(sorted(c.items())))
print(f'frentes explicados por la combinación (colonia, arbolado INEGI): {det} de {tot} = {100*det/tot:.2f} %')
print('frentes con arbolado (bits 0-2):', dict(Counter(f['arb'] for f in F)))
