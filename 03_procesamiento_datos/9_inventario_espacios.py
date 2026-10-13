# -*- coding: utf-8 -*-
"""Espacios para plantar: cepas vacantes, tocones y árboles muertos del inventario de arbolado (CIGA-UNAM y SEDEMA).

Es una capa de oportunidad ENCIMA del modelo de priorización: no cambia ninguna prioridad, cifra, lista ni descarga. Cada punto se
asigna al frente de manzana más cercano (a DIST m o menos) de los datos publicados (02_fuente/datos/data.bin), para heredar calle,
colonia, alcaldía y prioridad. Los árboles vivos no se publican: solo cuentan para el avance del inventario en cada alcaldía.

Insumo (no se copia al repositorio; solo se lee): el CSV del inventario, con las columnas
  fid, idc, uuid, lat, lng, registro, alcaldia, uga, pano_id, pano_date, pano_url, geom
Ruta: variable de entorno INVENTARIO_ARBOLADO_CSV; por omisión, la copia de la carpeta hermana
  ../adopta-un-arbol/00_insumos/arbolado/arbolado_cdmx_sep.csv
El corte se toma de INVENTARIO_CORTE (por omisión CORTE, abajo): se muestra en la herramienta.

Sale en 02_fuente/datos/inventario/ (construir.py lo publica en docs/datos/inventario/):
  inv_<clave de alcaldía>.bin   puntos de cada alcaldía (la alcaldía es la que contiene el punto, como el fondo propio): gzip de
                                enteros variables con signo en zigzag (el mismo formato de datos/fondo/):
                                  FORMATO, n, y por punto (ordenados por clave del inventario):
                                  dx, dy      coordenadas en 1/ESCALA de grado, en diferencias respecto al punto anterior
                                  tipo        0 cepa vacante, 1 tocón, 2 árbol muerto
                                  dfr         frente asignado + 1 (0 = sin frente a DIST m), en diferencias
                                  dpre, duga, dnum   clave del inventario AAA-000-0000 (letras como número en base 26, uga y
                                              consecutivo), en diferencias
  espacios_frentes.bin          para el filtro «Espacio» y el orden «más cepas vacantes» de «Dónde empezar»: cuántos puntos de cada
                                tipo tiene asignados cada frente de manzana (todos los frentes). Mismo formato: FORMATO_FR (2), n (frentes
                                con al menos un punto) y, por frente, en orden de índice:
                                  dfr         índice del frente en data.bin, en diferencias respecto al anterior (el primero, respecto a -1)
                                  cv, to, am  puntos asignados de cada tipo: cepas vacantes, tocones y árboles muertos (al menos uno > 0)
                                (el formato 1, hasta la v1.22, traía solo los tipos en bits)
  SUMAS.json                    SHA-256 de cada archivo (construir.py los compara)
  RESUMEN.json                  corte, cifras de control (puntos por tipo y alcaldía; las revisa verificar_datos.py), avance del
                                inventario por alcaldía (registros totales, árboles vivos incluidos), distancias y la huella del
                                contenido de data.bin con que se asignaron los frentes (si data.bin cambia, hay que volver a correr esto);
                                en «frentes_con_espacio», las cifras de control de espacios_frentes.bin (frentes con cada tipo, en total
                                y a cargo de las alcaldías, y puntos de cada tipo asignados a frentes, en total y a cargo de las alcaldías)

Cuando llegue el inventario completo: reemplazar el CSV (mismo nombre o ruta en INVENTARIO_ARBOLADO_CSV), ajustar INVENTARIO_CORTE,
correr este script, luego python 03_procesamiento_datos/verificar_datos.py y python 02_fuente/construir.py.
Requiere numpy y shapely 2 (requirements.txt). Uso: python 03_procesamiento_datos/9_inventario_espacios.py
"""
import csv
import gzip
import hashlib
import json
import os
import re
import sys
import time
import unicodedata

import numpy as np
import shapely
from shapely import LineString, Polygon, STRtree

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
DATOS = os.path.join(RAIZ, '02_fuente', 'datos')
SALIDA = os.path.join(DATOS, 'inventario')
CSV_OMISION = os.path.join(os.path.dirname(RAIZ), 'adopta-un-arbol', '00_insumos', 'arbolado', 'arbolado_cdmx_sep.csv')
CSV_RUTA = os.environ.get('INVENTARIO_ARBOLADO_CSV') or CSV_OMISION
CORTE = os.environ.get('INVENTARIO_CORTE') or 'septiembre de 2026'
FUENTE = 'Inventario de arbolado de la Ciudad de México (CIGA-UNAM y SEDEMA)'
FORMATO = 1
FORMATO_FR = 2                    # espacios_frentes.bin: puntos por tipo de cada frente (1, hasta la v1.22: solo los tipos en bits)
ARCHIVO_FR = 'espacios_frentes.bin'
DIST = 20.0                       # metros: más lejos, el punto queda sin frente
ESCALA = 200_000                  # 1/200,000 de grado ≈ 0.55 m (la misma de datos/fondo/; INV_ESCALA en 05_inventario.js)
Q = 100000.0                      # coordenadas de data.bin en 1/100,000 de grado (CONTRATO_DE_DATOS.md)
KX, KY = 111320 * np.cos(np.radians(19.4)), 110540.0   # metros por grado en la CDMX (los de 8_asignar_sin_colonia.py)
CAMPOS = 8                        # alcaldía, prioridad, nombre, tipo, colonia, longitud, banderas, vp+1
PRIO_MIN = 2                      # «prioritario» = Muy Alta, Alta y Media (PRIO_MIN en 02_fuente/js/01_utilidades.js)
TIPOS = {'Cepa Vacante': 0, 'Tocón': 1, 'Árbol Muerto': 2}
NOMBRE_TIPO = ['Cepa vacante', 'Tocón', 'Árbol muerto']
VIVO = 'Árbol'
CLAVE = re.compile(r'([A-Z]{3})-(\d{3})-(\d{1,6})$')


def alto(msg):
    print('ERROR: ' + msg + '\nNo se escribió nada.')
    sys.exit(1)


def lee_enteros(b):
    out, v, sh = [], 0, 0
    for c in b:
        v |= (c & 0x7f) << sh
        if c & 0x80:
            sh += 7
            continue
        out.append(v >> 1 if not v & 1 else -((v + 1) >> 1))
        v = sh = 0
    return out


class Escritor:
    def __init__(self):
        self.b = bytearray()

    def v(self, n):
        n = 2 * n if n >= 0 else -2 * n - 1
        while True:
            c = n & 0x7f
            n >>= 7
            if n:
                self.b.append(c | 0x80)
            else:
                self.b.append(c)
                return

    def guarda(self, nombre):
        datos = gzip.compress(bytes(self.b), 9, mtime=0)
        return nombre, datos


sin_acento = lambda s: unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower().strip()
letras_num = lambda s: (ord(s[0]) - 65) * 676 + (ord(s[1]) - 65) * 26 + (ord(s[2]) - 65)

# ---------- insumo ----------
if not os.path.isfile(CSV_RUTA):
    alto('no se encontró el inventario de arbolado:\n  %s\nIndica su ruta en la variable de entorno INVENTARIO_ARBOLADO_CSV o ponlo en esa carpeta. '
         'El archivo no se copia al repositorio.' % CSV_RUTA)
t0 = time.time()
print('inventario:', CSV_RUTA)
h = hashlib.sha256()
with open(CSV_RUTA, 'rb') as f:
    for bloque in iter(lambda: f.read(1 << 22), b''):
        h.update(bloque)
CSV_SHA = h.hexdigest()

META = json.loads(gzip.decompress(open(os.path.join(DATOS, 'meta.bin'), 'rb').read()).decode('utf-8'))
cve_de_nombre = {sin_acento(n): c for n, c in zip(META['munNames'], META['muns'])}

puntos = []                       # (lon, lat, tipo, clave, alcaldía del inventario)
registros, por_tipo_csv, vistos = {}, {}, set()
duplicadas = 0
with open(CSV_RUTA, encoding='utf-8-sig', newline='') as f:
    r = csv.DictReader(f)
    faltan = {'idc', 'lat', 'lng', 'registro', 'alcaldia'} - set(r.fieldnames or [])
    if faltan:
        alto('el CSV no trae las columnas %s (trae: %s).' % (', '.join(sorted(faltan)), ', '.join(r.fieldnames or [])))
    for fila in r:
        nom = fila['alcaldia'].strip()
        cve = cve_de_nombre.get(sin_acento(nom))
        if cve is None:
            alto('alcaldía desconocida en el inventario: «%s» (renglón fid %s).' % (nom, fila.get('fid')))
        registros[cve] = registros.get(cve, 0) + 1
        reg = fila['registro'].strip()
        por_tipo_csv[reg] = por_tipo_csv.get(reg, 0) + 1
        if reg == VIVO:
            continue
        if reg not in TIPOS:
            alto('tipo de registro desconocido: «%s» (renglón fid %s). Se esperaban: %s, %s.' % (reg, fila.get('fid'), VIVO, ', '.join(TIPOS)))
        m = CLAVE.match(fila['idc'].strip())
        if not m:
            alto('la clave «%s» no tiene la forma AAA-000-0000 (renglón fid %s): hay que ajustar el formato de la clave en este script.' % (fila['idc'], fila.get('fid')))
        clave = (letras_num(m.group(1)), int(m.group(2)), int(m.group(3)))
        if clave in vistos:
            duplicadas += 1
            continue
        vistos.add(clave)
        try:
            lon, lat = float(fila['lng']), float(fila['lat'])
        except ValueError:
            alto('coordenadas no válidas en el renglón fid %s: %s, %s.' % (fila.get('fid'), fila['lat'], fila['lng']))
        if not (-99.4 < lon < -98.9 and 19.0 < lat < 19.65):
            alto('el punto %s queda fuera de la Ciudad de México (%s, %s).' % (fila['idc'], fila['lat'], fila['lng']))
        puntos.append((lon, lat, TIPOS[reg], clave, cve))
if not puntos:
    alto('el inventario no trae cepas vacantes, tocones ni árboles muertos.')
print('leído en %.0f s: %s registros; %s espacios (cepas, tocones y árboles muertos)%s'
      % (time.time() - t0, format(sum(registros.values()), ','), format(len(puntos), ','), '; %d claves repetidas se tomaron una vez' % duplicadas if duplicadas else ''))

# ---------- frentes de manzana de los datos publicados ----------
crudo = gzip.decompress(open(os.path.join(DATOS, 'data.bin'), 'rb').read())
FRENTES_SHA = hashlib.sha256(crudo).hexdigest()
vals = lee_enteros(crudo)
n = vals[0]
p, x, y = 1, 0, 0
lineas, prio, mun_fr, gc_fr = [], np.zeros(n, np.int8), np.zeros(n, np.int16), np.zeros(n, np.int8)
for k in range(n):
    A = vals[p:p + CAMPOS]
    nv = vals[p + CAMPOS]
    d = np.array(vals[p + CAMPOS + 1:p + CAMPOS + 1 + 2 * nv]).reshape(-1, 2)
    xy = np.cumsum(d, axis=0) + [x, y]
    x, y = int(xy[-1, 0]), int(xy[-1, 1])
    lineas.append(LineString(xy / Q * [KX, KY]) if nv >= 2 else shapely.Point(xy[0] / Q * [KX, KY]))
    prio[k], mun_fr[k], gc_fr[k] = A[1], A[0], (A[6] >> 6) & 1   # bandera bit 6: a cargo del Gobierno Central
    p += CAMPOS + 1 + 2 * nv
assert p == len(vals) and n == META['N'], 'data.bin no se leyó completo'
arbol = STRtree(lineas)

# ---------- asignación: el frente más cercano, a DIST m o menos (índice espacial) ----------
P = np.array([(a, b) for a, b, *_ in puntos])
geo = shapely.points(P[:, 0] * KX, P[:, 1] * KY)
par, dist = arbol.query_nearest(geo, max_distance=DIST, return_distance=True, all_matches=False)
frente = np.full(len(puntos), -1, np.int64)
distancia = np.full(len(puntos), np.nan)
frente[par[0]] = par[1]
distancia[par[0]] = dist
# distancia al frente más cercano de los que quedaron sin frente (solo para el reporte)
sin = np.where(frente < 0)[0]
lejos = arbol.query_nearest(geo[sin], return_distance=True, all_matches=False)[1] if len(sin) else np.array([])

# ---------- alcaldía que contiene cada punto (la del archivo), como el fondo propio ----------
ALC = [(a['cve'], Polygon(np.array(a['rings'][0]) / Q)) for a in META['alc']]
t_alc = STRtree([pg for _, pg in ALC])
pt_grado = shapely.points(P[:, 0], P[:, 1])
dentro = t_alc.query(pt_grado, predicate='within')
alc_pt = np.full(len(puntos), -1, np.int64)
alc_pt[dentro[0]] = dentro[1]
for i in np.where(alc_pt < 0)[0]:
    alc_pt[i] = int(t_alc.nearest(pt_grado[i]))
cve_pt = [ALC[int(k)][0] for k in alc_pt]
distinta = sum(1 for i, pt in enumerate(puntos) if pt[4] != cve_pt[i])

# ---------- archivos por alcaldía ----------
archivos, control = {}, {}
for cve in META['muns']:
    idx = sorted((i for i in range(len(puntos)) if cve_pt[i] == cve), key=lambda i: puntos[i][3])
    e = Escritor()
    e.v(FORMATO)
    e.v(len(idx))
    X = Y = FR = PRE = UGA = NUM = 0
    cuenta = [0, 0, 0]
    for i in idx:
        lon, lat, tipo, (pre, uga, num), _ = puntos[i]
        qx, qy = int(round(lon * ESCALA)), int(round(lat * ESCALA))
        fr = int(frente[i]) + 1
        for v in (qx - X, qy - Y, tipo, fr - FR, pre - PRE, uga - UGA, num - NUM):
            e.v(v)
        X, Y, FR, PRE, UGA, NUM = qx, qy, fr, pre, uga, num
        cuenta[tipo] += 1
    nombre, datos = e.guarda('inv_%s.bin' % cve)
    archivos[nombre] = datos
    control[cve] = cuenta

# ---------- puntos por tipo de cada frente (filtro «Espacio» y orden por cepas): un renglón por frente con al menos un punto ----------
cuenta_fr = {}
for i, pt in enumerate(puntos):
    f = int(frente[i])
    if f >= 0:
        cuenta_fr.setdefault(f, [0, 0, 0])[pt[2]] += 1
e = Escritor()
e.v(FORMATO_FR)
e.v(len(cuenta_fr))
anterior = -1
for f in sorted(cuenta_fr):
    e.v(f - anterior)
    for c in cuenta_fr[f]:
        e.v(c)
    anterior = f
nombre, datos = e.guarda(ARCHIVO_FR)
archivos[nombre] = datos
fr_tipo = [sum(1 for c in cuenta_fr.values() if c[t]) for t in range(3)]
fr_tipo_alc = [sum(1 for f, c in cuenta_fr.items() if c[t] and not gc_fr[f]) for t in range(3)]
fr_alc = sum(1 for f in cuenta_fr if not gc_fr[f])
pt_tipo = [sum(c[t] for c in cuenta_fr.values()) for t in range(3)]                          # = puntos con frente de los inv_<cve>.bin
pt_tipo_alc = [sum(c[t] for f, c in cuenta_fr.items() if not gc_fr[f]) for t in range(3)]

# ---------- reporte ----------
nom = dict(zip(META['muns'], META['munNames']))
tipo_arr = np.array([pt[2] for pt in puntos])
con = frente >= 0
prio_pt = np.where(con, prio[np.maximum(frente, 0)], -1)
print('\nPuntos por tipo (de %s registros del inventario; %s árboles vivos no se publican):' % (format(sum(registros.values()), ','), format(por_tipo_csv.get(VIVO, 0), ',')))
for t, nt in enumerate(NOMBRE_TIPO):
    m = tipo_arr == t
    print('  %-14s %7s · con frente a ≤ %d m: %7s (%.1f %%) · en frentes prioritarios: %s'
          % (nt, format(int(m.sum()), ','), DIST, format(int((m & con).sum()), ','), 100 * (m & con).sum() / max(1, m.sum()), format(int((m & (prio_pt >= PRIO_MIN)).sum()), ',')))
print('  %-14s %7s · sin frente a ≤ %d m: %s (%.1f %%)' % ('total', format(len(puntos), ','), DIST, format(int((~con).sum()), ','), 100 * (~con).sum() / len(puntos)))
dd = distancia[con]
print('  distancia al frente asignado: mediana %.1f m · 75 %% a ≤ %.1f m · 90 %% a ≤ %.1f m' % tuple(np.percentile(dd, [50, 75, 90])))
if len(lejos):
    print('  los que quedaron sin frente están, en mediana, a %.0f m del frente más cercano' % np.median(lejos))
print('  puntos cuya alcaldía en el inventario no es la que los contiene: %d' % distinta)
print('\n%-24s %9s %7s %7s %7s %10s %7s' % ('Alcaldía', 'registros', 'cepas', 'tocones', 'muertos', 'sin frente', 'KB'))
filas = []
for cve in sorted(META['muns'], key=lambda c: nom[c]):
    m = np.array([c == cve for c in cve_pt])
    c = control[cve]
    kb = len(archivos['inv_%s.bin' % cve]) / 1024
    print('%-24s %9s %7s %7s %7s %10s %7.0f' % (nom[cve], format(registros.get(cve, 0), ','), format(c[0], ','), format(c[1], ','), format(c[2], ','), format(int((m & ~con).sum()), ','), kb))
total_bytes = sum(len(b) for b in archivos.values())
print('%-24s %9s %7s %7s %7s %10s %7.0f' % ('Total', format(sum(registros.values()), ','), *[format(sum(control[c][t] for c in control), ',') for t in range(3)], format(int((~con).sum()), ','), sum(len(b) for k, b in archivos.items() if k != ARCHIVO_FR) / 1024))
print('\nFiltro «Espacio» y orden por cepas (%s, %.1f KB): %s frentes con al menos un punto (%s a cargo de las alcaldías)'
      % (ARCHIVO_FR, len(archivos[ARCHIVO_FR]) / 1024, format(len(cuenta_fr), ','), format(fr_alc, ',')))
for t, nt in enumerate(NOMBRE_TIPO):
    print('  frentes con %-14s %7s · a cargo de las alcaldías: %7s · puntos: %7s (a cargo de las alcaldías: %7s)'
          % (nt.lower(), format(fr_tipo[t], ','), format(fr_tipo_alc[t], ','), format(pt_tipo[t], ','), format(pt_tipo_alc[t], ',')))

# ---------- escritura: hasta aquí nada se había escrito ----------
os.makedirs(SALIDA, exist_ok=True)
for nombre, datos in archivos.items():
    ruta = os.path.join(SALIDA, nombre)
    if not (os.path.exists(ruta) and open(ruta, 'rb').read() == datos):
        open(ruta, 'wb').write(datos)
sumas = {nombre: hashlib.sha256(datos).hexdigest() for nombre, datos in sorted(archivos.items())}
json.dump(sumas, open(os.path.join(SALIDA, 'SUMAS.json'), 'w', encoding='utf-8', newline='\n'), indent=1)
resumen = {
    'nota': 'Lo escribe 03_procesamiento_datos/9_inventario_espacios.py. Cifras de control que revisa verificar_datos.py; construir.py publica corte y avance.',
    'fuente': FUENTE, 'corte': CORTE,
    'insumo': {'archivo': os.path.basename(CSV_RUTA), 'sha256': CSV_SHA, 'bytes': os.path.getsize(CSV_RUTA)},
    'frentes_sha256': FRENTES_SHA, 'formato': FORMATO, 'escala': ESCALA, 'distancia_max_m': DIST,
    'tipos': NOMBRE_TIPO,
    'registros_por_tipo': {k: por_tipo_csv[k] for k in sorted(por_tipo_csv)},
    'puntos_por_tipo': [int((tipo_arr == t).sum()) for t in range(3)],
    'sin_frente': int((~con).sum()),
    'frentes_con_espacio': {'archivo': ARCHIVO_FR, 'formato': FORMATO_FR, 'frentes': len(cuenta_fr), 'por_tipo': fr_tipo,
                            'frentes_alcaldia': fr_alc, 'alcaldia_por_tipo': fr_tipo_alc,
                            'puntos_por_tipo': pt_tipo, 'puntos_alcaldia_por_tipo': pt_tipo_alc},
    'claves_repetidas': duplicadas,
    'distancia_m': {'mediana': round(float(np.percentile(dd, 50)), 2), 'p75': round(float(np.percentile(dd, 75)), 2), 'p90': round(float(np.percentile(dd, 90)), 2)},
    'por_alcaldia': {cve: {'nombre': nom[cve], 'registros': registros.get(cve, 0), 'puntos': control[cve],
                           'sin_frente': int(sum(1 for i in range(len(puntos)) if cve_pt[i] == cve and frente[i] < 0))} for cve in META['muns']},
}
open(os.path.join(SALIDA, 'RESUMEN.json'), 'w', encoding='utf-8', newline='\n').write(json.dumps(resumen, ensure_ascii=False, indent=1) + '\n')
print('\n%d archivos, %.0f KB en total → %s (%.0f s)' % (len(archivos), total_bytes / 1024, os.path.relpath(SALIDA, RAIZ), time.time() - t0))
print('Siguiente: python 03_procesamiento_datos/verificar_datos.py y python 02_fuente/construir.py')
