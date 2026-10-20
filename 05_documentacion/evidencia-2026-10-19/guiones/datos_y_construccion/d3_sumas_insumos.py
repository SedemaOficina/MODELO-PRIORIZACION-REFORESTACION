# D3 · Compara cada archivo que nombra 03_procesamiento_datos/SUMAS_INSUMOS.md con su SHA-256 registrado (los que existan en la copia).
import re, hashlib, os, sys
base = sys.argv[1]; md = open(os.path.join(base, 'SUMAS_INSUMOS.md'), encoding='utf-8').read()
for linea in md.splitlines():
    if not linea.startswith('|') or '---' in linea: continue
    rutas = re.findall(r'`((?:insumos|intermedios|07_versiones)/[^`]+)`', linea); hx = re.findall(r'`([0-9a-f]{64})`', linea)
    if not rutas: continue
    ruta = rutas[0]; esperado = hx[-1] if hx else None
    p = os.path.join(base, ruta) if not ruta.startswith('07_') else os.path.join(base, '..', ruta)
    if not os.path.isfile(p): print('NO ESTÁ EN LA COPIA  ', ruta); continue
    h = hashlib.sha256(open(p, 'rb').read()).hexdigest()
    if esperado is None: print('SIN SUMA REGISTRADA   ', ruta, '· actual', h[:16] + '…'); continue
    if len(hx) > 1 and 'rar' in linea and not ruta.endswith('.rar'): esperado = hx[0] if False else hx[-1]
    print('IGUAL                ' if h == esperado else 'DISTINTA             ', ruta, '' if h == esperado else '· registrada %s… actual %s…' % (esperado[:16], h[:16]))
