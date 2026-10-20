# B2/D3 · Decodificador INDEPENDIENTE (Python, sin código de la herramienta ni de sus pruebas), escrito desde
# 08_entrega_sia/CONTRATO_DE_DATOS.md y ARQUITECTURA.md §7. Donde el contrato no alcanza (inventario) se anota.
import gzip, json, os, pickle, sys

def enteros(b):
    """varint con signo en zigzag → lista de enteros."""
    out = []; v = 0; s = 0
    for x in b:
        v |= (x & 0x7f) << s
        if x & 0x80: s += 7; continue
        out.append((v >> 1) ^ -(v & 1)); v = 0; s = 0
    return out

def carga(docs):
    cache = os.path.join(os.path.dirname(os.path.abspath(__file__)), '_cache_datos.pkl')
    if os.path.isfile(cache):
        return pickle.load(open(cache, 'rb'))
    D = os.path.join(docs, 'datos')
    meta = json.loads(gzip.decompress(open(os.path.join(D, 'meta.bin'), 'rb').read()).decode('utf-8'))
    a = enteros(gzip.decompress(open(os.path.join(D, 'data.bin'), 'rb').read())); p = 0
    N = a[p]; p += 1; F = []; x = y = 0
    for i in range(N):
        mun, prio, name, tipo, col, ln, flags, vp1, nv = a[p:p+9]; p += 9
        x0, y0 = x, y; xs = []
        for k in range(nv):
            x += a[p]; y += a[p+1]; p += 2; xs.append((x, y))
        F.append(dict(mun=mun, prio=prio, name=name, tipo=tipo, col=col, len=ln, flags=flags, vp=vp1-1, gc=(flags >> 6) & 1,
                      banq=(flags >> 3) & 7, arb=flags & 7, ini=xs[0], fin=xs[-1]))
    assert p == len(a), 'data.bin con bytes de más'
    a = enteros(gzip.decompress(open(os.path.join(D, 'vp.bin'), 'rb').read())); p = 0
    NV = a[p]; p += 1; V = []; x = y = 0
    for i in range(NV):
        nom, nombre, tipo, car, circ, alct, mun, prio, ln, clave, rec, nv = a[p:p+12]; p += 12
        for k in range(nv): x += a[p]; y += a[p+1]; p += 2
        V.append(dict(nom=nom, nombre=nombre, mun=mun, prio=prio, len=ln, rec=rec, clave=clave))
    assert p == len(a), 'vp.bin con bytes de más'
    # inventario: el contrato no dice que cada archivo empieza con (formato, número de puntos), que el frente va en
    # diferencias ni que la clave son tres enteros en diferencias; tampoco la escala (RESUMEN.json: escala 200000).
    I = os.path.join(D, 'inventario'); P = []
    for cve in meta['muns']:
        a = enteros(gzip.decompress(open(os.path.join(I, 'inv_%s.bin' % cve), 'rb').read())); p = 0
        formato, n = a[0], a[1]; p = 2; x = y = fr = c1 = c2 = c3 = 0
        for k in range(n):
            x += a[p]; y += a[p+1]; t = a[p+2]; fr += a[p+3]; c1 += a[p+4]; c2 += a[p+5]; c3 += a[p+6]; p += 7
            cam = -1
            if formato >= 2: cam = a[p] - 1; p += 1
            P.append(dict(cve=cve, x=x, y=y, tipo=t, fr=fr-1, cam=cam, clave=(c1, c2, c3)))
        assert p == len(a), 'inv_%s.bin con bytes de más' % cve
    def conteos(nombre, total):
        a = enteros(gzip.decompress(open(os.path.join(I, nombre), 'rb').read())); formato, n = a[0], a[1]; p = 2; i = -1; C = {}
        for k in range(n): i += a[p]; C[i] = a[p+1:p+4]; p += 4
        assert p == len(a); return formato, C
    EF = conteos('espacios_frentes.bin', N); EV = conteos('espacios_vp.bin', NV)
    R = (meta, F, V, P, EF, EV); pickle.dump(R, open(cache, 'wb')); return R

if __name__ == '__main__':
    meta, F, V, P, EF, EV = carga(sys.argv[1])
    print('frentes', len(F), 'partes', len(V), 'puntos', len(P), 'EF', EF[0], len(EF[1]), 'EV', EV[0], len(EV[1]))
    xs = [p['x'] for p in P]; ys = [p['y'] for p in P]
    print('coordenadas del inventario (crudas):', min(xs), max(xs), min(ys), max(ys))
