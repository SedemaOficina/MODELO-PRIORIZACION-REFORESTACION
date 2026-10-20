# Compara byte a byte varias carpetas docs/ (la primera es la referencia). Sale con 1 si hay diferencias.
import hashlib, os, sys
def huellas(c):
    r = {}
    for raiz, _, archivos in os.walk(c):
        for a in archivos:
            p = os.path.join(raiz, a)
            r[os.path.relpath(p, c).replace(os.sep, '/')] = hashlib.sha256(open(p, 'rb').read()).hexdigest()
    return r
ref = huellas(sys.argv[1]); mal = 0
print('referencia', sys.argv[1], len(ref), 'archivos')
for otra in sys.argv[2:]:
    h = huellas(otra)
    falta = sorted(set(ref) - set(h)); sobra = sorted(set(h) - set(ref)); dif = sorted(k for k in ref if k in h and ref[k] != h[k])
    print(otra, len(h), 'archivos · faltan', falta, '· sobran', sobra, '· distintos', dif)
    mal += len(falta) + len(sobra) + len(dif)
print('IDENTICOS' if not mal else 'DIFERENCIAS: %d' % mal)
sys.exit(1 if mal else 0)
