# -*- coding: utf-8 -*-
"""Verifica que los datos de la herramienta sean los registrados (auditoría H-023 y H-024).

Compara el CONTENIDO descomprimido de 02_fuente/datos/*.bin con las sumas de 02_fuente/datos/SUMAS.json. Se compara el
contenido y no el archivo porque la compresión gzip depende de la biblioteca zlib de cada equipo: el mismo contenido
puede dar bytes distintos en otro equipo sin que los datos hayan cambiado.

Además comprueba la coherencia interna: número de frentes y de partes de vialidad declarados, enlaces de los frentes de
Gobierno Central a una parte existente y cuadre de kilómetros por prioridad entre los frentes y los resúmenes.

Uso:  python3 03_procesamiento_datos/verificar_datos.py               verifica; termina con código 1 si algo no coincide
      python3 03_procesamiento_datos/verificar_datos.py --actualizar  registra las sumas de los datos actuales (después de regenerarlos a propósito)
Requiere únicamente Python 3.
"""
import gzip
import hashlib
import json
import os
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATOS = os.path.join(RAIZ, '02_fuente', 'datos')
SUMAS = os.path.join(DATOS, 'SUMAS.json')
fallas = []


def ok(nombre, cond, detalle=''):
    print(('OK    ' if cond else 'FALLA ') + nombre + (' · ' + str(detalle) if detalle else ''))
    if not cond:
        fallas.append(nombre)


def lector(raw):
    pos = [0]

    def rv():
        res = shift = 0
        while True:
            b = raw[pos[0]]
            pos[0] += 1
            res |= (b & 0x7f) << shift
            shift += 7
            if not b & 0x80:
                return -((res + 1) >> 1) if res & 1 else res >> 1
    rv.resto = lambda: len(raw) - pos[0]
    return rv


crudo = {n: gzip.decompress(open(os.path.join(DATOS, n + '.bin'), 'rb').read()) for n in ('meta', 'data', 'vp')}
actual = {n + '.bin': hashlib.sha256(b).hexdigest() for n, b in crudo.items()}
META = json.loads(crudo['meta'].decode('utf-8'))

# ---------- coherencia interna ----------
rv = lector(crudo['data'])
N = rv()
km = [0.0] * 5
km_gc = [0.0] * 5
n_gc = 0
vp_max = -1
for _ in range(N):
    mun, prio, name, tipo, col, ln, flags, vp = (rv() for _ in range(8))
    nv = rv()
    for _ in range(2 * nv):
        rv()
    km[prio] += ln / 1000
    if (flags >> 6) & 1:
        n_gc += 1
        km_gc[prio] += ln / 1000
    vp_max = max(vp_max, vp - 1)
ok('data.bin trae los frentes que declara y no sobran bytes', N == META['N'] and rv.resto() == 0, '%d frentes' % N)
rv = lector(crudo['vp'])
NV = rv()
for _ in range(NV):
    for _ in range(11):
        rv()
    nv = rv()
    for _ in range(2 * nv):
        rv()
ok('vp.bin trae las partes que declara y no sobran bytes', NV == META['vp']['n'] and rv.resto() == 0, '%d partes' % NV)
ok('los frentes de Gobierno Central enlazan a una parte de vialidad que existe', vp_max < NV, 'mayor enlace %d de %d' % (vp_max, NV))
ok('frentes de Gobierno Central: el conteo coincide con el resumen', n_gc == META['cruce']['frentes_gc'], n_gc)
cerca = lambda a, b, tol=0.05: all(abs(x - y) <= tol for x, y in zip(a, b))
ok('km por prioridad de Gobierno Central = su resumen', cerca(km_gc, META['city_gc']['km']), [round(x, 2) for x in km_gc])
ok('km por prioridad de todos los frentes = alcaldías + Gobierno Central', cerca(km, [a + b for a, b in zip(META['city']['km'], META['city_gc']['km'])]), [round(x, 2) for x in km])
# city_all es el resumen original del modelo; difiere de la suma de frentes en décimas de km porque las longitudes se guardan en metros enteros.
# La herramienta usa la suma de frentes; aquí solo se vigila que la diferencia siga siendo de redondeo.
ok('el resumen original del modelo difiere de la suma de frentes solo por redondeo (≤ 0.2 km por clase)', cerca(km, META['city_all']['km'], 0.2), [round(x - y, 2) for x, y in zip(km, META['city_all']['km'])])

# ---------- sumas del contenido ----------
if '--actualizar' in sys.argv:
    if fallas:
        print('\nNo se registran las sumas: los datos no son coherentes.')
        sys.exit(1)
    registro = {'nota': 'SHA-256 del contenido descomprimido de cada archivo de datos. Lo escribe 03_procesamiento_datos/verificar_datos.py --actualizar; construir.py se detiene si los datos no coinciden.',
                'sha256_descomprimido': actual, 'frentes': N, 'partes_de_vialidad': NV}
    open(SUMAS, 'w', encoding='utf-8', newline='\n').write(json.dumps(registro, ensure_ascii=False, indent=2) + '\n')
    print('\nSumas registradas en 02_fuente/datos/SUMAS.json')
    sys.exit(0)
if not os.path.isfile(SUMAS):
    ok('existe 02_fuente/datos/SUMAS.json', False, 'correr con --actualizar')
else:
    reg = json.load(open(SUMAS, encoding='utf-8'))['sha256_descomprimido']
    for n in sorted(actual):
        ok('%s: el contenido es el registrado' % n, actual[n] == reg.get(n), actual[n][:16] + '…')
print('\n[datos] %d falla(s)' % len(fallas))
sys.exit(1 if fallas else 0)
