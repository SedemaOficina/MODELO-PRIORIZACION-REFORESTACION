"""Análisis en solo lectura: frentes de manzana (modelo) contra tramos de calles-cdmx 1.0.0.
Uso: python cruce_calles.py <carpeta 03_procesamiento_datos> <calles_cdmx.gpkg> <salida.npz>
"""
import sys, json, re, unicodedata, time
import numpy as np, shapely, pyogrio
from shapely import STRtree
from pyproj import Transformer

SC, GPKG, OUT = sys.argv[1].rstrip('/\\') + '/', sys.argv[2], sys.argv[3]
META = json.load(open(SC + 'intermedios/meta.json', encoding='utf-8'))
fr = dict(np.load(SC + 'intermedios/frentes.npz')); cr = dict(np.load(SC + 'intermedios/cruce.npz'))
N = len(fr['mun']); start = fr['start']
to_utm = Transformer.from_crs('EPSG:4326', 'EPSG:32614', always_xy=True)
fx, fy = to_utm.transform(fr['lon'], fr['lat'])
fxy = np.column_stack([fx, fy])
frentes = shapely.linestrings(fxy, indices=np.repeat(np.arange(N), np.diff(start)))
mid = shapely.line_interpolate_point(frentes, 0.5, normalized=True)
# rumbo del frente alrededor de su punto medio (±5 m), no de punta a punta: los frentes en L o curvos
FL = shapely.length(frentes)
fa_ = shapely.line_interpolate_point(frentes, np.clip(FL / 2 - 5, 0, FL)); fb_ = shapely.line_interpolate_point(frentes, np.clip(FL / 2 + 5, 0, FL))
fang = np.degrees(np.arctan2(shapely.get_y(fb_) - shapely.get_y(fa_), shapely.get_x(fb_) - shapely.get_x(fa_))) % 180

# ---- tramos ----
t = time.time()
cols = ['clave', 'cve_mun', 'nombre', 'llave', 'llave_alterno', 'nombre_original', 'red_vial', 'tipo_via', 'atiende',
        'certeza', 'largo_m', 'factor_km', 'sin_nombre', 'entre_1', 'entre_2']
meta_, _, geom, fields = pyogrio.raw.read(GPKG, layer='calles', columns=cols)
T = {c: fields[i] for i, c in enumerate(meta_['fields'])}     # vienen en el orden de la capa, no en el de cols
print('llave de muestra', T['llave'][:3], T['nombre'][:3])
tg = shapely.from_wkb(geom)
tg = shapely.transform(tg, lambda xy: np.column_stack(to_utm.transform(xy[:, 0], xy[:, 1])))
NT = len(tg); print('tramos', NT, round(time.time() - t, 1), 's')
tree = STRtree(tg)

# ---- nombres ----
def norm(s):
    s = unicodedata.normalize('NFD', str(s or '')).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9ñ ]+', ' ', s)
STOP = set('avenida av calzada calz eje vial boulevard blvd bulevar circuito viaducto anillo periferico prolongacion prol calle de del la el los las y lateral carretera autopista camino paseo cerrada privada andador callejon retorno pasaje'.split())
def toks(s): return frozenset(t for t in norm(s).split() if t not in STOP and len(t) > 1)
names = META['names']
fr_t = [toks(n) for n in names]
tr_t = [(toks(a), toks(b), toks(c)) for a, b, c in zip(T['llave'], T['llave_alterno'], T['nombre_original'])]
def same(ft, tt):
    if not ft: return False
    for c in tt:
        if c and (c <= ft or ft <= c or len(c & ft) / len(c | ft) >= 0.5): return True
    return False

# ---- candidatos: tramos a 40 m del punto medio del frente ----
t = time.time()
pi, ti = tree.query(mid, predicate='dwithin', distance=40)
dist = shapely.distance(mid[pi], tg[ti])
# rumbo del tramo en el punto más cercano: segmento entre ±5 m alrededor de la proyección
pr = shapely.line_locate_point(tg[ti], mid[pi])
L = shapely.length(tg[ti])
a = shapely.line_interpolate_point(tg[ti], np.clip(pr - 5, 0, L)); b = shapely.line_interpolate_point(tg[ti], np.clip(pr + 5, 0, L))
ax, ay = shapely.get_x(a), shapely.get_y(a); bx, by = shapely.get_x(b), shapely.get_y(b)
tang = np.degrees(np.arctan2(by - ay, bx - ax)) % 180
dang = np.abs(fang[pi] - tang); dang = np.minimum(dang, 180 - dang)
# de qué lado del tramo queda el frente (producto cruz)
mx, my = shapely.get_x(mid[pi]), shapely.get_y(mid[pi])
side = np.sign((bx - ax) * (my - ay) - (by - ay) * (mx - ax)).astype(np.int8)
print('pares', len(pi), round(time.time() - t, 1), 's')
nm = np.array([same(fr_t[fr['name'][f]], tr_t[k]) for f, k in zip(pi, ti)])

# ---- elección: paralelo (≤30°); con nombre a ≤40 m, o sin nombre a ≤20 m; el más cercano ----
ok = (dang <= 30) & (nm | (dist <= 20))
score = dist - np.where(nm, 15, 0)        # el nombre pesa como 15 m
best = np.full(N, -1, np.int64); bd = np.full(N, np.inf); bnm = np.zeros(N, bool); bside = np.zeros(N, np.int8); bsc = np.full(N, np.inf)
for j in np.where(ok)[0]:
    f = pi[j]
    if score[j] < bsc[f]:
        bsc[f] = score[j]; best[f] = ti[j]; bd[f] = dist[j]; bnm[f] = nm[j]; bside[f] = side[j]
np.savez_compressed(OUT, best=best, dist=bd, nm=bnm, side=bside)
print('frentes con tramo', (best >= 0).sum(), 'de', N)
