# -*- coding: utf-8 -*-
"""Fondo propio del mapa (opción «Calles» del panel de capas): manzanas del Catastro de la CDMX, parques y jardines del Inventario de
Áreas Verdes 2017 de SEDEMA, áreas naturales protegidas y áreas de valor ambiental oficiales, y cuerpos de agua de SEDEMA. Sin teselas de
terceros ni claves: los archivos se alojan con el sitio y se piden solo al encender el fondo (las manzanas, por alcaldía, al acercarse).

Insumos en insumos/fondo/ (copia local, no se publica; sumas en SUMAS_INSUMOS.md):
  Catastro_CDMX_Manzanas.zip                         manzanas del Catastro (shapefile dentro del zip)
  Inventario de Áreas Verdes 2017.*                  SEDEMA; solo lo que a la vista es un espacio verde (ver SUBCAT y CATEG)
  Cuerpos de agua, canales, y tanque regulador.*     SEDEMA; claves 3, 4 y 5 (la figura de clave 0 es el resto de la ciudad)
  anp_ava_geometrias.geojson                         las 66 ANP y AVA oficiales (decretos, CONANP y SEDEMA)
Las alcaldías para repartir las manzanas salen de intermedios/meta.json (las mismas de la herramienta).

Sale en 02_fuente/datos/fondo/ (gzip de enteros variables con signo; coordenadas en 1/ESCALA de grado, en diferencias):
  fondo_mz_<clave>.bin   manzanas de cada alcaldía: [n polígonos [n anillos [n vértices [dx dy]]]]
  fondo_base.bin         tres listas seguidas con el mismo formato: parques y jardines, agua, ANP y AVA
  SUMAS.json             SHA-256 de cada archivo (construir.py los compara)
Requiere numpy, pyshp, shapely y pyproj (requirements.txt). Uso: python 03_procesamiento_datos/6_fondo.py
"""
import gzip
import hashlib
import io
import json
import os
import zipfile

import numpy as np
import shapefile
from pyproj import Transformer
from shapely import Point, Polygon, STRtree

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
INS = os.path.join(AQUI, 'insumos', 'fondo')
SALIDA = os.path.join(RAIZ, '02_fuente', 'datos', 'fondo')
ESCALA = 200_000             # 1/200,000 de grado = 0.55 m, menor que la simplificación; FONDO_ESCALA en 04_mapa_capas.js
KX, KY = 105000.0, 110700.0  # metros por grado en la CDMX (para simplificar y medir en metros)
SUBCAT = {'Parques', 'Arboledas', 'Alamedas', 'Jardines públicos'}   # el inventario también cuenta escuelas, panteones, camellones, plazas…
CATEG = {'Áreas con vegetación reminisciente', 'Vivero', 'Forestación urbana'}


def lector(ruta, cod='latin-1'):
    """(registros, anillos de cada figura en lon/lat) de un .shp suelto o del primero dentro de un .zip"""
    if ruta.endswith('.zip'):
        z = zipfile.ZipFile(ruta)
        s = [n for n in z.namelist() if n.lower().endswith('.shp')][0]
        b = s[:-4]
        r = shapefile.Reader(shp=io.BytesIO(z.read(s)), dbf=io.BytesIO(z.read(b + '.dbf')), shx=io.BytesIO(z.read(b + '.shx')),
                             encoding='latin-1', encodingErrors='replace')
        prj = z.read(b + '.prj').decode('latin-1')
    else:
        r = shapefile.Reader(ruta, encoding=cod, encodingErrors='replace')
        prj = open(ruta[:-4] + '.prj', encoding='latin-1').read()
    T = Transformer.from_crs(prj, 'EPSG:4326', always_xy=True)
    regs, figs = [], []
    for k in range(len(r)):
        try:
            s = r.shape(k)
        except shapefile.ShapefileException:
            continue   # figuras vacías
        if not s.points:
            continue
        partes = list(s.parts) + [len(s.points)]
        xy = np.array(s.points, float)
        lon, lat = T.transform(xy[:, 0], xy[:, 1])
        figs.append([np.c_[lon[a:b], lat[a:b]] for a, b in zip(partes[:-1], partes[1:]) if b - a >= 4])
        regs.append(r.record(k))
    return regs, figs


def poligonos(anillos):
    """anillos de una figura de shapefile -> polígonos con sus huecos (exterior en el sentido del reloj; cada hueco va con el exterior anterior)"""
    out = []
    for a in anillos:
        x, y = a[:, 0], a[:, 1]
        if np.sum(x[:-1] * y[1:] - x[1:] * y[:-1]) + x[-1] * y[0] - x[0] * y[-1] < 0 or not out:
            out.append([a])
        else:
            out[-1].append(a)
    return out


def simplifica(pol, tol):
    """polígono [exterior, huecos…] en lon/lat -> anillos simplificados (tolerancia en metros), o None si queda de menos de 4 m²"""
    p = Polygon(pol[0] * [KX, KY], [h * [KX, KY] for h in pol[1:]]).simplify(tol, preserve_topology=True)
    if p.is_empty or p.area < 4 or p.geom_type != 'Polygon':
        return None
    return [np.array(p.exterior.coords)[:-1] / [KX, KY]] + [np.array(h.coords)[:-1] / [KX, KY] for h in p.interiors if Polygon(h).area >= 4]


class Escritor:
    def __init__(self):
        self.b = bytearray()
        self.x = self.y = 0

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

    def lista(self, pols):
        def rejilla(a):   # a la rejilla de ESCALA, sin vértices repetidos; None si quedan menos de 3
            q = np.round(np.asarray(a) * ESCALA).astype(np.int64)
            q = q[np.r_[True, np.any(q[1:] != q[:-1], axis=1)]]
            if len(q) > 1 and (q[0] == q[-1]).all():
                q = q[:-1]
            return q if len(q) >= 3 else None
        pols = [[r for r in rs if r is not None] for rs in ([rejilla(a) for a in p] for p in pols) if rs[0] is not None]
        self.v(len(pols))
        for p in pols:
            self.v(len(p))
            for a in p:
                self.v(len(a))
                for X, Y in a:
                    X, Y = int(X), int(Y)
                    self.v(X - self.x)
                    self.v(Y - self.y)
                    self.x, self.y = X, Y

    def guarda(self, nombre):
        datos = gzip.compress(bytes(self.b), 9, mtime=0)
        open(os.path.join(SALIDA, nombre), 'wb').write(datos)
        return nombre, hashlib.sha256(datos).hexdigest(), len(datos)


os.makedirs(SALIDA, exist_ok=True)
meta = json.load(open(os.path.join(AQUI, 'intermedios', 'meta.json'), encoding='utf-8'))
ALC = [(a['cve'], Polygon(np.array(a['rings'][0]) / 1e5)) for a in meta['alc']]
t_alc = STRtree([p for _, p in ALC])
sumas = {}

# manzanas de Catastro, repartidas por alcaldía según el centro de cada una
_, figs = lector(os.path.join(INS, 'Catastro_CDMX_Manzanas.zip'))
por_alc = {}
for anillos in figs:
    for pol in poligonos(anillos):
        s = simplifica(pol, .7)
        if s is None:
            continue
        c = Point(s[0].mean(0))
        i = t_alc.query(c, predicate='within')
        cve = ALC[int(i[0])][0] if len(i) else ALC[int(t_alc.nearest(c))][0]
        por_alc.setdefault(cve, []).append(s)
for cve, lista in sorted(por_alc.items()):
    e = Escritor()
    e.lista(lista)
    n, h, b = e.guarda('fondo_mz_%s.bin' % cve)
    sumas[n] = h
    print('manzanas', cve, len(lista), '%d KB' % (b // 1024))

# parques y jardines, agua, ANP y AVA
regs, figs = lector(os.path.join(INS, 'Inventario de Áreas Verdes 2017.shp'), 'utf-8')
verdes = [s for r, an in zip(regs, figs) if (r[2] or '').strip() in SUBCAT or (r[1] or '').strip() in CATEG
          for p in poligonos(an) if (s := simplifica(p, 1.0)) is not None]
regs, figs = lector(os.path.join(INS, 'Cuerpos de agua, canales, y tanque regulador.shp'))
agua = [s for r, an in zip(regs, figs) if int(r[1] or 0) in (3, 4, 5) for p in poligonos(an) if (s := simplifica(p, 1.0)) is not None]
protegidas = []
for f in json.load(open(os.path.join(INS, 'anp_ava_geometrias.geojson'), encoding='utf-8'))['features']:
    g = f['geometry']
    for anillos in ([g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']):   # GeoJSON: el primero es el exterior
        s = simplifica([np.array(a, float)[:-1] for a in anillos], 1.5)
        if s is not None:
            protegidas.append(s)
e = Escritor()
e.lista(verdes)
e.lista(agua)
e.lista(protegidas)
n, h, b = e.guarda('fondo_base.bin')
sumas[n] = h
print('parques y jardines', len(verdes), '· agua', len(agua), '· ANP y AVA', len(protegidas), '· %d KB' % (b // 1024))
json.dump(dict(sorted(sumas.items())), open(os.path.join(SALIDA, 'SUMAS.json'), 'w', encoding='utf-8'), indent=1)
print('total %.1f MB →' % (sum(os.path.getsize(os.path.join(SALIDA, f)) for f in sumas) / 1048576), SALIDA)
