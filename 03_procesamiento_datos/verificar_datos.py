# -*- coding: utf-8 -*-
"""Verifica que los datos de la herramienta sean los registrados.

Compara el CONTENIDO descomprimido de 02_fuente/datos/*.bin con las sumas de 02_fuente/datos/SUMAS.json. Se compara el
contenido y no el archivo porque la compresión gzip depende de la biblioteca zlib de cada equipo: el mismo contenido
puede dar bytes distintos en otro equipo sin que los datos hayan cambiado.

Además comprueba la coherencia interna: número de frentes y de partes de vialidad declarados, enlaces de los frentes de
Gobierno Central a una parte existente y cuadre de kilómetros por prioridad entre los frentes y los resúmenes.

Espacios para plantar (02_fuente/datos/inventario/, de 9_inventario_espacios.py): cada archivo es el registrado en su SUMAS.json,
sus puntos por tipo y alcaldía son las cifras de control de RESUMEN.json, cada frente asignado existe y el inventario se asignó con
el mismo data.bin (si no, hay que volver a correr 9_inventario_espacios.py). El archivo del filtro «Espacio» y del orden por cepas
(espacios_frentes.bin: puntos de cada tipo de cada frente) es el registrado, trae las cifras de control de RESUMEN.json y coincide con un recálculo propio desde
los puntos de los archivos por alcaldía. El de las vialidades primarias (espacios_vp.bin, v1.24: puntos de cada tipo de cada parte de
vialidad) es el registrado, trae sus cifras de control y coincide con un recálculo propio con la regla del Gobierno Central: un punto en
un frente a cargo del Gobierno Central cuenta para la parte de vialidad de ese frente; un punto sin frente, para la parte del camellón
que trae su archivo; los de los frentes de las alcaldías, para ninguna.

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
gc_bits = bytearray(N)   # 1 = a cargo del Gobierno Central (para las cifras del filtro «Espacio»)
vp_de = [-1] * N         # parte de vialidad primaria de cada frente (para las cifras del filtro «Espacio» del Gobierno Central)
for k in range(N):
    mun, prio, name, tipo, col, ln, flags, vp = (rv() for _ in range(8))
    gc_bits[k] = (flags >> 6) & 1
    vp_de[k] = vp - 1
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

# ---------- espacios para plantar (inventario de arbolado; 9_inventario_espacios.py) ----------
# Capa de oportunidad encima del modelo: sus archivos los escribe ese script con su SUMAS.json y su RESUMEN.json (cifras de control).
# Se revisa que cada archivo sea el registrado, que sus puntos por tipo y alcaldía sean los del resumen, que cada frente asignado
# exista y que se hayan asignado con estos mismos frentes (si data.bin cambió, hay que volver a correr el script).
INV = os.path.join(DATOS, 'inventario')
aviso_inv = []
if not os.path.isfile(os.path.join(INV, 'RESUMEN.json')) or not os.path.isfile(os.path.join(INV, 'SUMAS.json')):
    aviso_inv.append('falta 02_fuente/datos/inventario/ (RESUMEN.json y SUMAS.json): correr 03_procesamiento_datos/9_inventario_espacios.py')
else:
    RES = json.load(open(os.path.join(INV, 'RESUMEN.json'), encoding='utf-8'))
    SUM_INV = json.load(open(os.path.join(INV, 'SUMAS.json'), encoding='utf-8'))
    malos, cuenta, fr_mal, fuera = [], [0, 0, 0], 0, 0
    cnt_pt = {}   # puntos de cada tipo por frente, recalculados desde los puntos (para revisar espacios_frentes.bin)
    cnt_vp, cam_mal, cam = {}, 0, [0, 0, 0]   # puntos de cada tipo por parte de vialidad primaria (para revisar espacios_vp.bin)
    for cve in META['muns']:
        n = 'inv_%s.bin' % cve
        ruta = os.path.join(INV, n)
        if not os.path.isfile(ruta) or hashlib.sha256(open(ruta, 'rb').read()).hexdigest() != SUM_INV.get(n):
            malos.append(n)
            continue
        rv = lector(gzip.decompress(open(ruta, 'rb').read()))
        formato, npt = rv(), rv()
        c, x, y, fr = [0, 0, 0], 0, 0, 0
        for _ in range(npt):
            x += rv(); y += rv(); tipo = rv(); fr += rv(); rv(); rv(); rv()
            camellon = rv() - 1 if formato >= 2 else -1   # formato 2: parte de vialidad + 1 de un punto del camellón
            c[tipo] += 1
            if fr > 0:
                cnt_pt.setdefault(fr - 1, [0, 0, 0])[tipo] += 1
            # regla del Gobierno Central: por su frente (si es del Gobierno Central) o, sin frente, por el camellón
            parte = vp_de[fr - 1] if fr > 0 and 0 < fr <= N and gc_bits[fr - 1] else camellon if fr == 0 else -1
            cam_mal += (camellon >= 0 and fr != 0) or camellon >= NV
            if fr == 0 and 0 <= camellon < NV:
                cam[tipo] += 1
            if 0 <= parte < NV:
                cnt_vp.setdefault(parte, [0, 0, 0])[tipo] += 1
            fr_mal += not (0 <= fr <= N)
            fuera += not (-99.4 * 200000 < x < -98.9 * 200000 and 19.0 * 200000 < y < 19.65 * 200000)
        if rv.resto() or formato != RES.get('formato') or c != RES['por_alcaldia'][cve]['puntos']:
            malos.append(n)
        cuenta = [a + b for a, b in zip(cuenta, c)]
    EF = RES.get('frentes_con_espacio') or {}
    nef = EF.get('archivo', 'espacios_frentes.bin')
    EV = RES.get('vialidades_con_espacio') or {}
    nev = EV.get('archivo', 'espacios_vp.bin')
    ok('inventario: cada archivo es el registrado y trae los puntos por tipo de su resumen', not malos and set(SUM_INV) == {'inv_%s.bin' % c for c in META['muns']} | {nef, nev}, ', '.join(malos) or '%d alcaldías' % (len(SUM_INV) - 2))
    ok('inventario: puntos por tipo = cifras de control (cepas vacantes, tocones, árboles muertos)', cuenta == RES['puntos_por_tipo'], cuenta)
    ok('inventario: cada punto con frente apunta a un frente que existe y queda dentro de la ciudad', fr_mal == 0 and fuera == 0, '%d frentes inexistentes · %d fuera' % (fr_mal, fuera))
    # filtro «Espacio» y orden por cepas: índices crecientes de frentes que existen, puntos por tipo (al menos uno), cifras de control y recálculo desde los puntos
    ruta = os.path.join(INV, nef)
    if not EF or not os.path.isfile(ruta) or hashlib.sha256(open(ruta, 'rb').read()).hexdigest() != SUM_INV.get(nef):
        ok('filtro «Espacio»: %s es el registrado y RESUMEN.json trae sus cifras de control' % nef, False, 'correr 03_procesamiento_datos/9_inventario_espacios.py')
    else:
        rv = lector(gzip.decompress(open(ruta, 'rb').read()))
        formato, nfr = rv(), rv()
        cnt, f, orden = {}, -1, True
        for _ in range(nfr):
            d, c = rv(), [rv(), rv(), rv()]
            orden = orden and d > 0 and min(c) >= 0 and max(c) > 0
            f += d
            cnt[f] = c
        gc = set(i for i in range(N) if gc_bits[i])
        por_tipo = [sum(1 for c in cnt.values() if c[t]) for t in range(3)]
        alc_tipo = [sum(1 for k, c in cnt.items() if c[t] and k not in gc) for t in range(3)]
        pts = [sum(c[t] for c in cnt.values()) for t in range(3)]
        pts_alc = [sum(c[t] for k, c in cnt.items() if k not in gc) for t in range(3)]
        pts_inv = [sum(c[t] for c in cnt_pt.values()) for t in range(3)]
        ok('filtro «Espacio»: %s se lee completo, en orden y con frentes que existen' % nef, not rv.resto() and formato == EF.get('formato') and orden and nfr == EF.get('frentes') and (not cnt or max(cnt) < N), '%d frentes · formato %d' % (nfr, formato))
        ok('filtro «Espacio»: frentes con cada tipo = cifras de control (cepa vacante, tocón, árbol muerto; total y a cargo de las alcaldías)', por_tipo == EF.get('por_tipo') and alc_tipo == EF.get('alcaldia_por_tipo'), '%s · alcaldías %s' % (por_tipo, alc_tipo))
        ok('orden por cepas: puntos de cada tipo asignados a frentes = cifras de control = puntos con frente de los archivos por alcaldía', pts == EF.get('puntos_por_tipo') == pts_inv and pts_alc == EF.get('puntos_alcaldia_por_tipo'), '%s · alcaldías %s' % (pts, pts_alc))
        ok('filtro «Espacio» y orden por cepas: los puntos de cada tipo de cada frente = recálculo desde los puntos de los archivos por alcaldía', cnt == cnt_pt, '%d frentes' % len(cnt_pt))
    # Gobierno Central: puntos de cada tipo por parte de vialidad primaria (por su frente o en el camellón) = recálculo desde los puntos
    ruta = os.path.join(INV, nev)
    if not EV or not os.path.isfile(ruta) or hashlib.sha256(open(ruta, 'rb').read()).hexdigest() != SUM_INV.get(nev):
        ok('vialidades primarias: %s es el registrado y RESUMEN.json trae sus cifras de control' % nev, False, 'correr 03_procesamiento_datos/9_inventario_espacios.py')
    else:
        rv = lector(gzip.decompress(open(ruta, 'rb').read()))
        formato, nvp = rv(), rv()
        cv_, v, orden = {}, -1, True
        for _ in range(nvp):
            d, c = rv(), [rv(), rv(), rv()]
            orden = orden and d > 0 and min(c) >= 0 and max(c) > 0
            v += d
            cv_[v] = c
        ok('vialidades primarias: %s se lee completo, en orden y con partes que existen' % nev, not rv.resto() and formato == EV.get('formato') and orden and nvp == EV.get('partes') and (not cv_ or max(cv_) < NV), '%d partes · formato %d' % (nvp, formato))
        ok('vialidades primarias: los puntos del camellón no tienen frente y apuntan a una parte que existe', cam_mal == 0, '%d mal' % cam_mal)
        ok('vialidades primarias: partes con cada tipo y puntos de cada tipo (por su frente y en el camellón) = cifras de control',
           [sum(1 for c in cv_.values() if c[t]) for t in range(3)] == EV.get('por_tipo') and [sum(c[t] for c in cv_.values()) for t in range(3)] == EV.get('puntos_por_tipo')
           and cam == EV.get('puntos_camellon') and [a - b for a, b in zip(EV.get('puntos_por_tipo', []), cam)] == EV.get('puntos_por_frente') and sum(cam) == EV.get('sin_frente_recuperados'),
           'puntos %s · camellón %s' % (EV.get('puntos_por_tipo'), cam))
        ok('vialidades primarias: los puntos de cada tipo de cada parte = recálculo desde los puntos (por su frente del Gobierno Central o por el camellón)', cv_ == cnt_vp, '%d partes' % len(cnt_vp))
    if RES.get('vp_sha256') != actual['vp.bin']:
        aviso_inv.append('el inventario se asignó con otras vialidades primarias (vp.bin cambió): volver a correr 03_procesamiento_datos/9_inventario_espacios.py')
    if RES.get('frentes_sha256') != actual['data.bin']:
        aviso_inv.append('el inventario se asignó con otros frentes (data.bin cambió): volver a correr 03_procesamiento_datos/9_inventario_espacios.py')

# ---------- sumas del contenido ----------
if '--actualizar' in sys.argv:
    for a in aviso_inv:
        print('AVISO ' + a)
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
for a in aviso_inv:
    ok('inventario de arbolado al día con los frentes', False, a)
if not aviso_inv:
    ok('inventario de arbolado al día con los frentes (se asignó con este mismo data.bin)', True)
print('\n[datos] %d falla(s)' % len(fallas))
sys.exit(1 if fallas else 0)
