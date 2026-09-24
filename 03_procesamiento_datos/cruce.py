"""Cruce frentes de manzana (INEGI/SEDEMA) vs vialidades primarias (Gobierno Central)."""
import json, re, unicodedata, collections, time
import numpy as np, shapefile, shapely
from shapely import STRtree
from pyproj import Transformer

SC = '/tmp/claude-0/-home-claude/dd9ce749-5a99-545b-9acc-0332c785cc1e/scratchpad/'
META = json.load(open(SC + 'meta.json'))
fr = dict(np.load(SC + 'frentes.npz'))
N = len(fr['mun']); start = fr['start']; lon = fr['lon']; lat = fr['lat']

to_utm = Transformer.from_crs('EPSG:4326', 'EPSG:32614', always_xy=True)
to_wgs = Transformer.from_crs('EPSG:32614', 'EPSG:4326', always_xy=True)
fx, fy = to_utm.transform(lon, lat)
fxy = np.column_stack([fx, fy])
# índice de feature por vértice
vidx = np.repeat(np.arange(N), np.diff(start))
frentes = shapely.linestrings(fxy, indices=vidx)
print('frentes geoms', len(frentes))

# ---- vialidades primarias ----
r = shapefile.Reader(SC + 'vp/VP_REFORESTACION/PRIMARIAS_REFORESTACION.shp', encoding='utf-8')
fields = [f[0] for f in r.fields[1:]]
VP = []  # partes explotadas
seg_xy = []; seg_part = []
for rec_i, sr in enumerate(r.iterShapeRecords()):
    rec = dict(zip(fields, sr.record)); pts = sr.shape.points; parts = list(sr.shape.parts) + [len(pts)]
    for pi in range(len(parts) - 1):
        p = np.array(pts[parts[pi]:parts[pi + 1]], dtype=float)
        if len(p) < 2: continue
        L = float(np.sum(np.hypot(np.diff(p[:, 0]), np.diff(p[:, 1]))))
        VP.append({'rec': rec_i, 'attr': rec, 'xy': p, 'len': L})
print('vp parts', len(VP))
# longitud geométrica vs long_vp
geo = sum(v['len'] for v in VP) / 1000; att = sum(v['attr']['long_vp'] for v in VP if True)
print('km geom', round(geo, 1))
# segmentos de 2 puntos para el índice
segs = []; seg_owner = []
for k, v in enumerate(VP):
    p = v['xy']
    for q in range(len(p) - 1):
        segs.append(shapely.LineString([p[q], p[q + 1]])); seg_owner.append(k)
seg_owner = np.array(seg_owner)
tree = STRtree(segs)
print('segments', len(segs))

# ---- candidatos espaciales ----
t = time.time()
pairs = tree.query(frentes, predicate='dwithin', distance=60)
print('pairs', pairs.shape[1], 'in', round(time.time() - t, 1), 's')
fi = pairs[0]; si = pairs[1]
t=time.time(); segarr = np.array(segs, dtype=object); dist = shapely.distance(frentes[fi], segarr[si]); print('dist in', round(time.time()-t,1),'s')
# ángulo: dirección del frente (primer→último vértice) vs segmento
def dirs(xy_a, xy_b):
    d = xy_b - xy_a; ang = np.degrees(np.arctan2(d[:, 1], d[:, 0])) % 180; return ang
fa = fxy[start[fi]]; fb = fxy[start[fi + 1] - 1]
fang = dirs(fa, fb)
sc = np.array([[s.coords[0], s.coords[1]] for s in segs])
sang = dirs(sc[si, 0], sc[si, 1])
dang = np.abs(fang - sang); dang = np.minimum(dang, 180 - dang)

# ---- nombres ----
def norm(s):
    s = unicodedata.normalize('NFD', str(s or '')).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'[^a-z0-9 ]+', ' ', s)
    return s
STOP = set('avenida av calzada calz eje vial boulevard blvd bulevar circuito viaducto anillo periferico prolongacion prol calle de del la el los las y lateral norte sur oriente poniente ote pte nte carretera autopista camino paseo via rapida acceso controlado radial ruta interior'.split())
def toks(s):
    return {t for t in norm(s).split() if t not in STOP and len(t) > 1}
def toks_full(s):
    return {t for t in norm(s).split() if len(t) > 1}
names = META['names']; tipos = META['tipos']
fr_toks = [toks(n) for n in names]
vp_toks = [(toks(v['attr']['NOMENCLAT']), toks(v['attr']['NOMBRE']), toks_full(v['attr']['NOMENCLAT']) | toks_full(v['attr']['NOMBRE'])) for v in VP]
def name_match(f, k):
    ft = fr_toks[fr['name'][f]]; a, b, full = vp_toks[k]
    if not ft: return False
    ff = toks_full(names[fr['name'][f]])
    for cand in (a, b):
        if cand and (cand <= ft or ft <= cand): return True
        if cand and len(cand & ft) / len(cand | ft) >= 0.5: return True
    # nombres tipo "Eje 3 Oriente" (todos tokens en STOP salvo el número): comparar completos
    if ff and full and ff == full: return True
    return False
t=time.time()
parallel = dang <= 30
keep = parallel & (dist <= 60)
fi, si, dist, dang = fi[keep], si[keep], dist[keep], dang[keep]
own = seg_owner[si]
print('pairs kept', len(fi), 'unique (f,part)', len(set(zip(fi.tolist(), own.tolist()))))
cache = {}
nm = np.zeros(len(fi), bool)
for j in range(len(fi)):
    key = (int(fi[j]), int(own[j]))
    v = cache.get(key)
    if v is None: v = name_match(*key); cache[key] = v
    nm[j] = v
print('names in', round(time.time()-t,1), 's')
print('name matches', nm.sum(), 'of', len(nm))

# ---- regla ----
parallel = dang <= 30
rule = (dist <= 18) | (nm & (dist <= 60))
# mejor candidato por frente: el más cercano que cumple
best = {}
for f, s, d, ok in zip(fi, si, dist, rule):
    if not ok: continue
    if f not in best or d < best[f][1]: best[f] = (int(seg_owner[s]), float(d))
gc = np.zeros(N, np.int32); gcvp = np.full(N, -1, np.int32)
for f, (k, d) in best.items(): gc[f] = 1; gcvp[f] = k
km = fr['ln'] / 1000
print('frentes GC', gc.sum(), 'km', round(km[gc == 1].sum(), 1), 'km prioritarios GC', round(km[(gc == 1) & (fr['prio'] >= 3)].sum(), 1))
# diagnóstico por regla
only_dist = (dist <= 18) & ~nm
print('  por distancia sin nombre:', len(set(fi[only_dist])), ' por nombre 30-60m:', len(set(fi[parallel & nm & (dist > 30) & (dist <= 60)])))
# cobertura de VP: partes con al menos un frente
cov = np.zeros(len(VP), bool); cov[[k for k, d in best.values()]] = True
kmvp = np.array([v['len'] for v in VP]) / 1000
print('VP partes con frente', cov.sum(), 'de', len(VP), '=', round(100 * kmvp[cov].sum() / kmvp.sum(), 1), '% de km')
# muestras de coincidencia y de no coincidencia de nombre (para calibrar)
import random; random.seed(1)
sample = random.sample(list(best.items()), 25)
for f, (k, d) in sample:
    print(f'  {tipos[fr["tipo"][f]]} {names[fr["name"][f]]!r:45} ↔ {VP[k]["attr"]["NOMENCLAT"]!r:40} [{VP[k]["attr"]["NOMBRE"]}] {d:.0f} m')
np.savez_compressed(SC + 'cruce.npz', gc=gc, gcvp=gcvp)
json.dump({'nvp': len(VP)}, open(SC + 'cruce_info.json', 'w'))
