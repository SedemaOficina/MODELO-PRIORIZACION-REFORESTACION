"""Decodifica el bloque data-b64 del artefacto v6 (varint zigzag + gzip) a arreglos numpy."""
import base64, gzip, re, json, numpy as np, time

SC = '/tmp/claude-0/-home-claude/dd9ce749-5a99-545b-9acc-0332c785cc1e/scratchpad/'
html = open(SC + 'v6.html').read()
m = re.search(r'<script id="data-b64" type="text/plain">([^<]+)</script>', html)
raw = gzip.decompress(base64.b64decode(m.group(1)))
print('raw bytes', len(raw))

# varint decode vectorizado: separar todos los varints del stream
t = time.time()
b = np.frombuffer(raw, dtype=np.uint8)
ends = np.flatnonzero((b & 0x80) == 0)              # último byte de cada varint
starts = np.concatenate(([0], ends[:-1] + 1))
nvar = len(ends)
lens = ends - starts + 1
print('varints', nvar, 'max len', lens.max())
vals = np.zeros(nvar, dtype=np.int64)
maxlen = int(lens.max())
for k in range(maxlen):
    idx = np.flatnonzero(lens > k)
    vals[idx] += (b[starts[idx] + k].astype(np.int64) & 0x7f) << (7 * k)
# zigzag
z = vals
vals = np.where(z % 2 == 1, -((z + 1) // 2), z // 2)
print('decoded in', round(time.time() - t, 1), 's')

# recorrer estructura
p = 0
N = int(vals[p]); p += 1
mun = np.zeros(N, np.int32); prio = np.zeros(N, np.int32); name = np.zeros(N, np.int32); tipo = np.zeros(N, np.int32)
col = np.zeros(N, np.int32); ln = np.zeros(N, np.int32); flags = np.zeros(N, np.int32); nv = np.zeros(N, np.int32)
start = np.zeros(N + 1, np.int64)
# Necesitamos avanzar feature por feature porque nv es variable
vcount = 0
dx_list = []  # guardaremos los deltas crudos
t = time.time()
for i in range(N):
    mun[i], prio[i], name[i], tipo[i], col[i], ln[i], flags[i] = vals[p:p + 7]; p += 7
    n = int(vals[p]); p += 1
    nv[i] = n; start[i] = vcount
    vcount += n; p += 2 * n
start[N] = vcount
print('features', N, 'vertices', vcount, 'parsed in', round(time.time() - t, 1), 's; consumed', p, 'of', nvar)
# extraer deltas: posiciones de los deltas en vals
# reconstruir índices: para cada feature, sus 2n deltas comienzan después de 8 campos
hdr = np.full(N, 8, np.int64)
featstart = np.concatenate(([1], 1 + np.cumsum(hdr + 2 * nv.astype(np.int64))[:-1]))
delta_idx = np.concatenate([np.arange(featstart[i] + 8, featstart[i] + 8 + 2 * nv[i]) for i in range(N)])
d = vals[delta_idx].reshape(-1, 2)
xy = np.cumsum(d, axis=0)  # coordenadas acumuladas globales (el encoder usa px,py globales)
Q = 100000
lon = xy[:, 0] / Q; lat = xy[:, 1] / Q
print('lon range', lon.min(), lon.max(), 'lat range', lat.min(), lat.max())
np.savez_compressed(SC + 'frentes.npz', mun=mun, prio=prio, name=name, tipo=tipo, col=col, ln=ln, flags=flags, start=start, lon=lon, lat=lat)
print('saved')
