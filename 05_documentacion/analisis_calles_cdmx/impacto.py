"""Impacto y reglas de prioridad por tramo. Solo lectura."""
import sys, json, collections, random, re, unicodedata
import numpy as np, shapely, pyogrio, shapefile
from shapely import STRtree
from pyproj import Transformer
SC, GPKG, RES = sys.argv[1].rstrip('/\\') + '/', sys.argv[2], sys.argv[3]
META = json.load(open(SC + 'intermedios/meta.json', encoding='utf-8'))
fr = dict(np.load(SC + 'intermedios/frentes.npz')); cr = dict(np.load(SC + 'intermedios/cruce.npz')); r = dict(np.load(RES))
N = len(fr['mun']); km = fr['ln'] / 1000; prio = fr['prio']; best = r['best']; side = r['side']
PRIO = META['prio']; PRIO_MIN = 2
to_utm = Transformer.from_crs('EPSG:4326', 'EPSG:32614', always_xy=True)
cols = ['clave', 'cve_mun', 'nombre', 'llave', 'red_vial', 'tipo_via', 'atiende', 'certeza', 'largo_m', 'factor_km', 'sin_nombre']
mt, _, geom, f = pyogrio.raw.read(GPKG, layer='calles', columns=cols)
T = {c: (np.asarray(f[i], float) if c in ('largo_m', 'factor_km') else np.array(['' if v is None else str(v) for v in f[i]])) for i, c in enumerate(mt['fields'])}
tg = shapely.transform(shapely.from_wkb(geom), lambda xy: np.column_stack(to_utm.transform(xy[:, 0], xy[:, 1])))
NT = len(tg); kmT = T['largo_m'] * T['factor_km'] / 1000
gcT = T['atiende'] == 'Gobierno de CDMX'
tipos = META['tipos']; rasgo = fr['tipo'] == tipos.index('Rasgo')
con = best >= 0
def k(x): return f'{x:,.1f}'

# ---------- VP (capa actual de vialidades primarias) por parte, como el paso 3 ----------
rd = shapefile.Reader(SC + 'insumos/VP_REFORESTACION/PRIMARIAS_REFORESTACION.shp', encoding='utf-8')
fl = [x[0] for x in rd.fields[1:]]
vp_xy, vp_pr = [], []
for sr in rd.iterShapeRecords():
    a = dict(zip(fl, sr.record)); pts = sr.shape.points; parts = list(sr.shape.parts) + [len(pts)]
    for q in range(len(parts) - 1):
        p = np.array(pts[parts[q]:parts[q + 1]], float)
        if len(p) < 2: continue
        vp_xy.append(p); vp_pr.append(PRIO.index(a['ref_sedema']))
vp_pr = np.array(vp_pr); vpg = np.array([shapely.LineString(p) for p in vp_xy])
vp_km = shapely.length(vpg) / 1000
print('partes VP', len(vpg), 'km', k(vp_km.sum()), ' parte mayor del cruce:', int(cr['gcvp'].max()))
# prioridad efectiva hoy (prioFr): la del frente, o la de su parte de VP si es de Gobierno Central
gc = cr['gc'] == 1
pr_hoy = np.where(gc, vp_pr[np.clip(cr['gcvp'], 0, None)], prio)
esP = pr_hoy >= PRIO_MIN

print('\n== 1. Quién atiende: hoy (cruce con VP) contra la capa nueva (atiende del tramo) ==')
nuevo_gc = np.zeros(N, bool); nuevo_gc[con] = gcT[best[con]]
otro = np.zeros(N, bool); otro[con] = ~np.char.startswith(T['atiende'][best[con]].astype(str), 'Alcald') & ~gcT[best[con]]
for nom, m in [('GC hoy y GC nuevo', gc & nuevo_gc), ('GC hoy -> alcaldía/otro', gc & con & ~nuevo_gc), ('GC hoy, sin tramo', gc & ~con),
               ('alcaldía hoy -> GC nuevo', ~gc & nuevo_gc), ('alcaldía hoy y nuevo', ~gc & con & ~nuevo_gc & ~otro),
               ('alcaldía hoy -> Federal/concesión/particular', ~gc & otro), ('alcaldía hoy, sin tramo', ~gc & ~con)]:
    print(f'  {nom:45} frentes {m.sum():7,}  km {k(km[m].sum()):>9}  km prioritarios {k(km[m & esP].sum()):>9}')
m_ = gc & con & ~nuevo_gc
print('  GC hoy que dejan de serlo, por atiende y red vial:', collections.Counter(zip(T['atiende'][best[m_]], T['red_vial'][best[m_]])).most_common(6))
print('    km por red vial:', {rv: k(km[m_][T['red_vial'][best[m_]] == rv].sum()) for rv in ('primaria', 'secundaria', 'carretera o camino')})
print('  atiende de los frentes que pasan a otro:', collections.Counter(T['atiende'][best[~gc & otro]].tolist()).most_common(5))
print('  km de frentes GC hoy', k(km[gc].sum()), ' GC con la capa', k(km[nuevo_gc].sum()))

print('\n== 2. Nombres ==')
def norm(s):
    s = unicodedata.normalize('NFD', str(s or '')).encode('ascii', 'ignore').decode().lower()
    return ' '.join(re.sub(r'[^a-z0-9 ]+', ' ', s).split())
names = META['names']
idx = np.where(con & ~rasgo)[0]
fn = np.array([norm(names[fr['name'][i]]) for i in idx]); tn = np.array([norm(x) for x in T['nombre'][best[idx]]])
igual = fn == tn
print(f'  frentes (sin Rasgo) con tramo: {len(idx):,}; nombre idéntico al normalizar: {igual.mean():.1%}; coinciden por palabras: {r["nm"][idx].mean():.1%}')
random.seed(3)
dif = idx[~igual & r['nm'][idx]]
print('  ejemplos de cambio de escritura (misma calle):')
for i in random.sample(list(dif), 8): print(f'    {names[fr["name"][i]]!r:40} -> {T["nombre"][best[i]]!r}')
dist_ = idx[~r['nm'][idx]]
print('  ejemplos de nombre distinto (sin coincidencia de palabras):')
for i in random.sample(list(dist_), 8): print(f'    {names[fr["name"][i]]!r:40} -> {T["nombre"][best[i]]!r}  ({r["dist"][i]:.0f} m)')

print('\n== 3. Tramos con frentes ==')
cnt = np.bincount(best[con], minlength=NT)
lados = np.zeros((NT, 2), int)
np.add.at(lados, (best[con], (side[con] > 0).astype(int)), 1)
t_con = cnt > 0
print(f'  tramos con al menos un frente: {t_con.sum():,} de {NT:,} ({kmT[t_con].sum() / kmT.sum():.1%} de los km)')
print(f'  con frentes de los dos lados: {((lados[:, 0] > 0) & (lados[:, 1] > 0)).sum():,}; de un solo lado: {(t_con & ((lados[:, 0] == 0) | (lados[:, 1] == 0))).sum():,}')
print('  tramos sin frente por red vial:', collections.Counter(T['red_vial'][~t_con].tolist()))

print('\n== 4. Prioridad por tramo (tramos de alcaldía) ==')
# por tramo: largo de frente por clase y por lado
kc = np.zeros((NT, 5)); np.add.at(kc, (best[con], pr_hoy[con]), km[con])
kl = np.zeros((NT, 2, 5)); np.add.at(kl, (best[con], (side[con] > 0).astype(int), pr_hoy[con]), km[con])
mx = np.where(t_con, np.array([max([p for p in range(5) if kc[t, p] > 0], default=-1) for t in range(NT)]), -1)
pond = np.where(t_con, kc.argmax(1), -1)                      # la clase con más km de frente
prom = np.where(t_con, np.rint((kc * np.arange(5)).sum(1) / np.maximum(kc.sum(1), 1e-9)).astype(int), -1)
alc = t_con & ~gcT
desac = np.zeros(NT, bool)
dos = (kl[:, 0].sum(1) > 0) & (kl[:, 1].sum(1) > 0)
la = kl[:, 0].argmax(1); lb = kl[:, 1].argmax(1)
desac = dos & ((la >= PRIO_MIN) != (lb >= PRIO_MIN))
print(f'  tramos con los dos lados: {(alc & dos).sum():,}; un lado prioritario y el otro no: {(alc & desac).sum():,} ({(alc & desac).sum() / max((alc & dos).sum(), 1):.1%})')
base = km[con & ~nuevo_gc & esP].sum()
print(f'  hoy: km de frente prioritarios en esos tramos {k(base)} (cuenta las dos aceras)')
for nom, cl in [('la mayor de sus frentes', mx), ('la de más km de frente', pond), ('promedio redondeado', prom)]:
    sel = alc & (cl >= PRIO_MIN)
    print(f'  regla «{nom}»: tramos prioritarios {sel.sum():,}, km de calle {k(kmT[sel].sum())}; por clase:',
          [f'{PRIO[p]} {k(kmT[alc & (cl == p)].sum())}' for p in range(4, -1, -1)])
# conservar por lado: km de acera = km de calle de cada lado con frentes
acera = np.zeros(NT)
for s_ in (0, 1):
    cl = kl[:, s_].argmax(1); has = kl[:, s_].sum(1) > 0
    acera += np.where(alc & has & (cl >= PRIO_MIN), kmT, 0)
print(f'  regla «por acera» (cada lado con su prioridad): km de acera prioritarios {k(acera.sum())}')

print('\n== 5. Prioridad de los tramos de Gobierno de CDMX desde la capa VP ==')
vtree = STRtree(vpg)
g = np.where(gcT)[0]
step = 10.0
L = shapely.length(tg[g]); n = np.maximum((L // step).astype(int), 1)
own = np.repeat(np.arange(len(g)), n); off = (np.concatenate([np.arange(c) for c in n]) + 0.5) * step
off = np.minimum(off, np.repeat(L, n))
pts = shapely.line_interpolate_point(tg[g][own], off)
pi, vi = vtree.query(pts, predicate='dwithin', distance=20)
dd = shapely.distance(pts[pi], vpg[vi])
o = np.lexsort((dd, pi)); pi, vi = pi[o], vi[o]; first = np.r_[True, pi[1:] != pi[:-1]]
pp = np.full(len(pts), -1); pp[pi[first]] = vp_pr[vi[first]]
votos = np.zeros((len(g), 5)); okp = pp >= 0
np.add.at(votos, (own[okp], pp[okp]), 1)
cub = votos.sum(1) / n
tprio = np.where(votos.sum(1) > 0, votos.argmax(1), -1)
kmg = kmT[g]
print(f'  tramos de Gobierno de CDMX: {len(g):,}, {k(kmg.sum())} km')
print(f'  con prioridad de la capa VP (algún punto a ≤20 m): {(tprio >= 0).sum():,}, {k(kmg[tprio >= 0].sum())} km; cubiertos en más de la mitad: {k(kmg[cub > .5].sum())} km')
print(f'  sin VP cerca (nuevos para el modelo): {(tprio < 0).sum():,}, {k(kmg[tprio < 0].sum())} km; por red vial:',
      collections.Counter(T['red_vial'][g][tprio < 0].tolist()))
print('  km por prioridad VP:', [f'{PRIO[p]} {k(kmg[tprio == p].sum())}' for p in range(4, -1, -1)])
# los mismos tramos con la prioridad de sus frentes (modelo del SIA)
# con la prioridad propia del frente (modelo del SIA), no la de VP que hoy usa prioFr
kr = np.zeros((NT, 5)); np.add.at(kr, (best[con], prio[con]), km[con])
pf = np.where(t_con[g], kr[g].argmax(1), -1)
both = (tprio >= 0) & (pf >= 0)
print(f'  con prioridad de VP y de frentes a la vez: {both.sum():,}; coinciden en prioritario sí/no: {((tprio[both] >= PRIO_MIN) == (pf[both] >= PRIO_MIN)).mean():.1%}')
# VP que la capa nueva no tiene como Gobierno de CDMX
ppt = np.concatenate([shapely.line_interpolate_point(v, np.arange(0, shapely.length(v), step)) for v in vpg])
pown = np.concatenate([np.full(len(np.arange(0, shapely.length(v), step)), j) for j, v in enumerate(vpg)])
gtree = STRtree(tg[g])
near = np.zeros(len(ppt), bool); near[np.unique(gtree.query(ppt, predicate='dwithin', distance=20)[0])] = True
cov_vp = np.bincount(pown, weights=near, minlength=len(vpg)) / np.maximum(np.bincount(pown, minlength=len(vpg)), 1)
print(f'  km de VP que quedan junto a un tramo de Gobierno de CDMX: {k(vp_km[cov_vp > .5].sum())} de {k(vp_km.sum())}')
