"""Diagnóstico de los frentes sin tramo."""
import sys, json, collections
import numpy as np, shapely, pyogrio
from shapely import STRtree
from pyproj import Transformer
SC, GPKG, RES = sys.argv[1].rstrip('/\\') + '/', sys.argv[2], sys.argv[3]
META = json.load(open(SC + 'intermedios/meta.json', encoding='utf-8'))
fr = dict(np.load(SC + 'intermedios/frentes.npz')); r = dict(np.load(RES))
N = len(fr['mun']); start = fr['start']
to_utm = Transformer.from_crs('EPSG:4326', 'EPSG:32614', always_xy=True)
fx, fy = to_utm.transform(fr['lon'], fr['lat']); fxy = np.column_stack([fx, fy])
frentes = shapely.linestrings(fxy, indices=np.repeat(np.arange(N), np.diff(start)))
_, _, geom, fields = pyogrio.raw.read(GPKG, layer='calles', columns=['nombre'])
tg = shapely.transform(shapely.from_wkb(geom), lambda xy: np.column_stack(to_utm.transform(xy[:, 0], xy[:, 1])))
tree = STRtree(tg)
km = fr['ln'] / 1000
sin = r['best'] < 0
print('sin tramo', sin.sum(), 'km', round(km[sin].sum(), 1), 'de', round(km.sum(), 1))
print('con tramo: dist p50/p90/p99', np.percentile(r['dist'][~sin], [50, 90, 99]).round(1), ' con nombre', r['nm'][~sin].mean().round(3))
nv = np.diff(start)
print('vértices: sin tramo media', nv[sin].mean().round(1), ' con tramo', nv[~sin].mean().round(1))
print('largo m: sin tramo p50', np.median(fr['ln'][sin]), ' con tramo', np.median(fr['ln'][~sin]))
# distancia del frente completo (no el punto medio) al tramo más cercano
idx = np.where(sin)[0]
ti, dd = tree.query_nearest(frentes[idx], return_distance=True, all_matches=False)
dd = np.asarray(dd)
print('sin tramo, distancia del frente al tramo más cercano: p10/50/90', np.percentile(dd, [10, 50, 90]).round(1))
for lim in (5, 10, 20, 40, 100):
    print(f'  a ≤{lim} m:', int((dd <= lim).sum()))
tipos = META['tipos']
rasgo = fr['tipo'] == tipos.index('Rasgo')
print('Rasgo: total', rasgo.sum(), 'km', round(km[rasgo].sum(), 1), ' sin tramo', (rasgo & sin).sum())
nr = ~rasgo
print('sin Rasgo: sin tramo', (nr & sin).sum(), 'km', round(km[nr & sin].sum(), 1), 'de', round(km[nr].sum(), 1),
      '=', round(100 * km[nr & sin].sum() / km[nr].sum(), 1), '%')
pri = fr['prio'] >= 2
print('km prioritarios sin tramo (sin Rasgo)', round(km[nr & sin & pri].sum(), 1), 'de', round(km[nr & pri].sum(), 1))
print('km prioritarios Rasgo', round(km[rasgo & pri].sum(), 1))
print('tipos sin tramo', collections.Counter(tipos[t] for t in fr['tipo'][sin]).most_common(8))
print('prioridad sin tramo', collections.Counter(META['prio'][p] for p in fr['prio'][sin]))
print('por alcaldía (% km sin tramo):')
for m, nmb in enumerate(META['munNames']):
    s = fr['mun'] == m
    print(f'  {nmb[:20]:20} {100 * km[s & sin].sum() / km[s].sum():5.1f}')
