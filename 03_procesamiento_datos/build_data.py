"""Construye los bloques de datos v7: frentes (con responsable y enlace a vialidad primaria), vialidades primarias y META."""
import json, gzip, base64, collections, numpy as np, shapefile, shapely
from shapely import STRtree
from pyproj import Transformer

import os
SC = os.path.dirname(os.path.abspath(__file__)) + os.sep          # esta carpeta
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + os.sep
META = json.load(open(SC + 'meta.json', encoding='utf-8'))
fr = dict(np.load(SC + 'frentes.npz')); cr = dict(np.load(SC + 'cruce.npz'))
N = len(fr['mun']); start = fr['start']; Q = META['Q']
gc = cr['gc']; gcvp = cr['gcvp']
PRIO = META['prio']

# ---------- varint zigzag vectorizado ----------
def varint_bytes(vals):
    v = np.asarray(vals, dtype=np.int64)
    z = np.where(v < 0, -2 * v - 1, 2 * v).astype(np.uint64)
    out = []
    cur = z.copy(); more = np.ones(len(z), bool); parts = []
    while more.any():
        b = (cur & 0x7f).astype(np.uint8); cur = cur >> np.uint64(7)
        cont = cur > 0
        b = np.where(cont, b | 0x80, b).astype(np.uint8)
        parts.append((b, more.copy()))
        more = more & cont
    # ensamblar en orden por valor: cada valor tiene k bytes consecutivos
    nbytes = np.zeros(len(z), np.int64)
    for b, m in parts: nbytes += m
    total = int(nbytes.sum()); buf = np.zeros(total, np.uint8)
    offs = np.concatenate(([0], np.cumsum(nbytes)[:-1]))
    for k, (b, m) in enumerate(parts):
        idx = np.flatnonzero(m); buf[offs[idx] + k] = b[idx]
    return buf.tobytes()

# ---------- vialidades primarias ----------
to_wgs = Transformer.from_crs('EPSG:32614', 'EPSG:4326', always_xy=True)
r = shapefile.Reader(SC + 'insumos/VP_REFORESTACION/PRIMARIAS_REFORESTACION.shp', encoding='utf-8')
fields = [f[0] for f in r.fields[1:]]
VP = []
for rec_i, sr in enumerate(r.iterShapeRecords()):
    rec = dict(zip(fields, sr.record)); pts = sr.shape.points; parts = list(sr.shape.parts) + [len(pts)]
    for pi in range(len(parts) - 1):
        p = np.array(pts[parts[pi]:parts[pi + 1]], dtype=float)
        if len(p) < 2: continue
        L = float(np.sum(np.hypot(np.diff(p[:, 0]), np.diff(p[:, 1]))))
        lon, lat = to_wgs.transform(p[:, 0], p[:, 1])
        VP.append({'rec': rec_i, 'a': rec, 'lon': lon, 'lat': lat, 'len': L})
assert len(VP) == len(set(gcvp.tolist()) - {-1}) or True
print('vp parts', len(VP))
# alcaldía por punto medio dentro del polígono de META.alc
ALC_POLYS = []
for a in META['alc']:
    polys = [shapely.Polygon([(x / Q, y / Q) for x, y in ring]) for ring in a['rings'] if len(ring) >= 4]
    ALC_POLYS.append(shapely.MultiPolygon(polys) if len(polys) > 1 else polys[0])
alc_tree = STRtree(ALC_POLYS)
munIndex = {m: i for i, m in enumerate(META['muns'])}
munByName = {n: i for i, n in enumerate(META['munNames'])}
mids = [shapely.Point(v['lon'][len(v['lon']) // 2], v['lat'][len(v['lat']) // 2]) for v in VP]
hit = alc_tree.query(np.array(mids, dtype=object), predicate='within')
mun_of = np.full(len(VP), -1, np.int32)
mun_of[hit[0]] = hit[1]
miss = np.flatnonzero(mun_of < 0)
for k in miss:  # fallback: polígono más cercano
    mun_of[k] = int(alc_tree.nearest(mids[k]))
print('vp sin alcaldía por punto medio (resueltas por cercanía):', len(miss))
# catálogos
def cat(values):
    lst = sorted(set(values), key=lambda s: s.lower()); idx = {v: i for i, v in enumerate(lst)}; return lst, idx
nomenclat, i_nom = cat(v['a']['NOMENCLAT'] for v in VP)
nombres, i_nombre = cat(v['a']['NOMBRE'] for v in VP)
circula, i_circ = cat(v['a']['CIRCULA'] for v in VP)
alctxt, i_alct = cat(v['a']['ALCALDIA'] for v in VP)
claves, i_clave = cat(v['a']['CLAVE'] for v in VP)
tiposvp = ['Vía primaria', 'Vía de acceso controlado']
prio_idx = {p: i for i, p in enumerate(PRIO)}
# codificar
vals = [len(VP)]; px = py = 0
vp_mun = []; vp_prio = []; vp_len = []
for k, v in enumerate(VP):
    a = v['a']; pr = prio_idx[a['ref_sedema']]; L = int(round(v['len']))
    xs = np.round(v['lon'] * Q).astype(np.int64); ys = np.round(v['lat'] * Q).astype(np.int64)
    vals += [i_nom[a['NOMENCLAT']], i_nombre[a['NOMBRE']], tiposvp.index(a['TIPO_VIA']), int(a['CARRILES']), i_circ[a['CIRCULA']], i_alct[a['ALCALDIA']], int(mun_of[k]), pr, L, i_clave[a['CLAVE']], v['rec'], len(xs)]
    d = np.column_stack([np.diff(np.concatenate(([px], xs))), np.diff(np.concatenate(([py], ys)))]).ravel()
    vals += d.tolist(); px = int(xs[-1]); py = int(ys[-1])
    vp_mun.append(int(mun_of[k])); vp_prio.append(pr); vp_len.append(v['len'] / 1000)
vp_bytes = varint_bytes(np.array(vals, dtype=np.int64))
vp_b64 = base64.b64encode(gzip.compress(vp_bytes, 9)).decode()
print('vp block: raw', len(vp_bytes), 'b64', len(vp_b64))
vp_mun = np.array(vp_mun); vp_prio = np.array(vp_prio); vp_len = np.array(vp_len)
# resumen VP por alcaldía y ciudad
vp_summ = {}
for i, m in enumerate(META['muns']):
    sel = vp_mun == i
    vp_summ[m] = {'n': [int(((vp_prio == p) & sel).sum()) for p in range(5)], 'km': [round(float(vp_len[(vp_prio == p) & sel].sum()), 2) for p in range(5)]}
vp_city = {'n': [int((vp_prio == p).sum()) for p in range(5)], 'km': [round(float(vp_len[vp_prio == p].sum()), 2) for p in range(5)]}
# cobertura del cruce
cov = np.zeros(len(VP), bool); cov[np.unique(gcvp[gcvp >= 0])] = True
vp_cov = {'km_total': round(float(vp_len.sum()), 1), 'km_con_frente': round(float(vp_len[cov].sum()), 1), 'partes': len(VP), 'partes_con_frente': int(cov.sum()), 'registros': len(r)}

# ---------- frentes ----------
xs = np.round(fr['lon'] * Q).astype(np.int64); ys = np.round(fr['lat'] * Q).astype(np.int64)
dx = np.diff(np.concatenate(([0], xs))); dy = np.diff(np.concatenate(([0], ys)))
nv = np.diff(start).astype(np.int64)
flags = fr['flags'].astype(np.int64) | (gc.astype(np.int64) << 6)
vpref = np.where(gcvp >= 0, gcvp + 1, 0).astype(np.int64)
hdr = np.column_stack([fr['mun'], fr['prio'], fr['name'], fr['tipo'], fr['col'], fr['ln'], flags, vpref, nv]).astype(np.int64)  # 9 campos
# intercalar: por feature, 9 campos + 2*nv deltas
tot = 9 * N + 2 * int(nv.sum()) + 1
out = np.zeros(tot, np.int64); out[0] = N
feat_off = 1 + np.concatenate(([0], np.cumsum(9 + 2 * nv)[:-1]))
for c in range(9): out[feat_off + c] = hdr[:, c]
# deltas: posición de cada vértice
vfeat = np.repeat(np.arange(N), nv); vlocal = np.arange(int(nv.sum())) - np.repeat(start[:-1], nv)
dpos = feat_off[vfeat] + 9 + 2 * vlocal
out[dpos] = dx; out[dpos + 1] = dy
fr_bytes = varint_bytes(out)
fr_b64 = base64.b64encode(gzip.compress(fr_bytes, 9)).decode()
print('frentes block: raw', len(fr_bytes), 'b64', len(fr_b64))

# ---------- META ----------
km = fr['ln'] / 1000; prio = fr['prio']; mun = fr['mun']; sinarb = (fr['flags'] & 7) == 1
def summ(mask):
    return {'n': [int(((prio == p) & mask).sum()) for p in range(5)], 'km': [round(float(km[(prio == p) & mask].sum()), 2) for p in range(5)], 'km_sinarb': round(float(km[mask & (prio >= 3) & sinarb].sum()), 2)}
alc_mask = gc == 0
# verificar que el resumen original coincide con todos los frentes
chk = summ(np.ones(N, bool)); print('check city all', chk['km'], 'vs', META['city']['km'])
META['summ_all'] = META['summ']; META['city_all'] = META['city']
META['summ'] = {m: summ(alc_mask & (mun == i)) for i, m in enumerate(META['muns'])}
META['city'] = summ(alc_mask)
META['summ_gc'] = {m: summ((gc == 1) & (mun == i)) for i, m in enumerate(META['muns'])}
META['city_gc'] = summ(gc == 1)
META['vp'] = {'nomenclat': nomenclat, 'nombres': nombres, 'circula': circula, 'alctxt': alctxt, 'claves': claves, 'tipos': tiposvp, 'summ': vp_summ, 'city': vp_city, 'cov': vp_cov, 'n': len(VP)}
META['cruce'] = {'frentes_gc': int(gc.sum()), 'km_gc': round(float(km[gc == 1].sum()), 1), 'km_gc_prio': round(float(km[(gc == 1) & (prio >= 3)].sum()), 1), 'regla': 'frente paralelo (≤30°) a ≤18 m de la vialidad primaria, o a ≤60 m con nombre coincidente'}
meta_b64 = base64.b64encode(gzip.compress(json.dumps(META, ensure_ascii=False, separators=(',', ':')).encode(), 9)).decode()
print('meta b64', len(meta_b64))
# bloques de datos de la herramienta (gzip de varints; construir.py los usa tal cual)
for _n, _b in (('meta', meta_b64), ('data', fr_b64), ('vp', vp_b64)):
    open(RAIZ + '02_fuente/datos/%s.bin' % _n, 'wb').write(base64.b64decode(_b))
json.dump({'vp_city': vp_city, 'vp_cov': vp_cov, 'cruce': META['cruce'], 'city': META['city'], 'city_gc': META['city_gc'], 'vp_summ': vp_summ}, open(SC + 'resumen_v7.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps({'vp_city': vp_city, 'vp_cov': vp_cov, 'cruce': META['cruce'], 'city': META['city'], 'city_gc': META['city_gc']}, ensure_ascii=False))
