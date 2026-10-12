# -*- coding: utf-8 -*-
"""Frentes sin colonia: los que están a no más de DIST m de una colonia de su misma alcaldía pasan a esa colonia (la más cercana).

En los datos de origen, 964 frentes a cargo de las alcaldías no tienen colonia (89.5 km, 41.1 km prioritarios): casi siempre quedan
justo fuera del polígono de su colonia, que está simplificado. Sin colonia no cuentan en el ranking ni en la ficha de ninguna colonia,
y sus calles no llevan nombre en el mapa. Los totales por alcaldía y de la ciudad no cambian: no dependen de la colonia.

Trabaja sobre los datos publicados (02_fuente/datos/data.bin) y cambia solo el campo «colonia» de esos frentes: no se regeneran los
pasos 1 a 4 (con otra versión de Shapely, 144 frentes de Gobierno Central enlazarían a la parte contigua de la vialidad; ver
SUMAS_INSUMOS.md). Los frentes de Gobierno Central no se tocan. Se puede volver a correr: lo ya asignado no se mueve.

Escribe data.bin y la lista de cada asignación en _local/asignacion_sin_colonia.csv. Después: python 03_procesamiento_datos/verificar_datos.py
--actualizar (sumas de los datos) y reconstruir. Requiere numpy y shapely. Uso: python 03_procesamiento_datos/8_asignar_sin_colonia.py
"""
import csv
import gzip
import json
import os

import numpy as np
from shapely import LineString, Polygon, STRtree

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
DATOS = os.path.join(RAIZ, '02_fuente', 'datos')
DIST = 30.0                       # metros
Q = 100000.0                      # coordenadas en 1/100,000 de grado (CONTRATO_DE_DATOS.md)
KX, KY = 111320 * np.cos(np.radians(19.4)), 110540.0   # metros por grado en la CDMX
CAMPOS = 8                        # alcaldía, prioridad, nombre, tipo, colonia, longitud, banderas, vp+1
COLONIA, BANDERAS, GC = 4, 6, 1 << 6
PRIO_MIN = 2                      # «prioritario» = Muy Alta, Alta y Media (PRIO_MIN en 02_fuente/js/01_utilidades.js)


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


def escribe_enteros(vals):
    b = bytearray()
    for v in vals:
        z = 2 * v if v >= 0 else -2 * v - 1
        while True:
            c = z & 0x7f
            z >>= 7
            if z:
                b.append(c | 0x80)
            else:
                b.append(c)
                break
    return bytes(b)


ruta = os.path.join(DATOS, 'data.bin')
vals = lee_enteros(gzip.decompress(open(ruta, 'rb').read()))
META = json.loads(gzip.decompress(open(os.path.join(DATOS, 'meta.bin'), 'rb').read()).decode('utf-8'))
NOMBRES_COL = json.load(open(os.path.join(DATOS, 'nombres_colonias.json'), encoding='utf-8'))
nom_col = lambda i: NOMBRES_COL.get(str(i), META['colonias'][i]['n'])

# colonias en metros, agrupadas por alcaldía
pol_col = {}
for c in META['cols']:
    m = META['colonias'][c['i']]['m']
    for r in c['rings']:
        p = Polygon(np.array(r) / Q * [KX, KY])
        if not p.is_valid:
            p = p.buffer(0)
        pol_col.setdefault(m, []).append((c['i'], p))
arbol = {m: (STRtree([p for _, p in L]), [i for i, _ in L]) for m, L in pol_col.items()}

# recorre los registros: posición del campo colonia y geometría de los frentes sin colonia
n = vals[0]
p, x, y = 1, 0, 0
cambios, filas, sin = [], [], 0
for k in range(n):
    A = vals[p:p + CAMPOS]
    nv = vals[p + CAMPOS]
    d = np.array(vals[p + CAMPOS + 1:p + CAMPOS + 1 + 2 * nv]).reshape(-1, 2)
    xy = np.cumsum(d, axis=0) + [x, y]
    x, y = int(xy[-1, 0]), int(xy[-1, 1])
    if A[COLONIA] == 0 and not A[BANDERAS] & GC:
        sin += 1
        cve = META['muns'][A[0]]
        if cve in arbol and nv >= 2:
            t, ids = arbol[cve]
            linea = LineString(xy / Q * [KX, KY])
            j = t.nearest(linea)
            dist = linea.distance(t.geometries[j])
            if dist <= DIST:
                col = ids[int(j)]
                cambios.append((p + COLONIA, col))
                filas.append([k, META['munNames'][A[0]], META['names'][A[2]], META['prio'][A[1]], A[5], round(dist, 1), col, nom_col(col), A[1] >= PRIO_MIN])
    p += CAMPOS + 1 + 2 * nv
assert p == len(vals), 'data.bin no se leyó completo'

for pos, col in cambios:
    vals[pos] = col
if cambios:
    open(ruta, 'wb').write(gzip.compress(escribe_enteros(vals), 9, mtime=0))
os.makedirs(os.path.join(RAIZ, '_local'), exist_ok=True)
with open(os.path.join(RAIZ, '_local', 'asignacion_sin_colonia.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f)
    w.writerow(['id_frente', 'alcaldia', 'calle', 'prioridad', 'longitud_m', 'distancia_a_la_colonia_m', 'id_colonia', 'colonia'])
    w.writerows([r[:-1] for r in filas])
prio = [r for r in filas if r[-1]]
print('frentes de alcaldía sin colonia: %d · asignados (≤ %d m): %d (%.1f km, %.1f km prioritarios) · siguen sin colonia: %d'
      % (sin, DIST, len(filas), sum(r[4] for r in filas) / 1000, sum(r[4] for r in prio) / 1000, sin - len(filas)))
print('lista: _local/asignacion_sin_colonia.csv' + ('' if cambios else ' (nada que cambiar)'))
