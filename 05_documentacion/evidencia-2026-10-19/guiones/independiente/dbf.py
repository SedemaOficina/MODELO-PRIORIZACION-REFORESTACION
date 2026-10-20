# Lector mínimo de DBF (sin dependencias). campos(ruta) y filas(ruta, nombres)
import struct
def cabecera(p):
    f = open(p, 'rb'); h = f.read(32); n, hl, rl = struct.unpack('<IHH', h[4:12]); cs = []
    while True:
        d = f.read(32)
        if d[0] == 0x0D: break
        cs.append((d[:11].split(b'\0')[0].decode('latin1'), chr(d[11]), d[16], d[17]))
    return n, hl, rl, cs
def filas(p, quiero=None, enc='utf-8'):
    n, hl, rl, cs = cabecera(p); f = open(p, 'rb'); f.seek(hl)
    off = []; o = 1
    for c in cs: off.append((c[0], o, c[2])); o += c[2]
    for _ in range(n):
        r = f.read(rl)
        yield {k: r[a:a+l].decode(enc, 'replace').strip() for k, a, l in off if quiero is None or k in quiero}
