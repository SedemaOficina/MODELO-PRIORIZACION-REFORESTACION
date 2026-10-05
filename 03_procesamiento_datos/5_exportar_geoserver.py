# -*- coding: utf-8 -*-
"""Exporta las capas de la herramienta para publicarlas en el GeoServer del SIA, como capas nuevas.

Escribe en 08_entrega_sia/capas_geoserver/ tres GeoPackage en WGS 84 (EPSG:4326), con índice espacial:
  frentes_reforestacion.gpkg                 372,534 frentes: geometría ORIGINAL del modelo (nov. 2025) + lo que calcula la herramienta
  vialidades_primarias_reforestacion.gpkg    la capa VP_REFORESTACION con su prioridad
  colonias_reforestacion.gpkg                2,243 colonias (polígonos SIMPLIFICADOS de la herramienta) con prioridad y km
y MANIFIESTO.sha256. Los estilos (*.sld) y el LEEME.md de esa carpeta se escriben a mano y se versionan.

Lee: 02_fuente/datos/*.bin (los datos publicados), insumos/originales/shp_frentes_manzanasv.rar (geometría y CVEFT de los frentes;
se extrae con tar en una carpeta temporal) e insumos/VP_REFORESTACION/.
Requiere: numpy, pyshp, shapely, pyproj (requirements.txt) y pyogrio (escribe GeoPackage).
Uso:  python 03_procesamiento_datos/5_exportar_geoserver.py
"""
import gzip
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time

import numpy as np
import pyogrio
import shapefile
import shapely
from pyproj import CRS, Transformer

SC = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(SC)
DATOS = os.path.join(RAIZ, '02_fuente', 'datos')
SAL = os.path.join(RAIZ, '08_entrega_sia', 'capas_geoserver')
PRIO = ['Muy Baja', 'Baja', 'Media', 'Alta', 'Muy Alta']
t0 = time.time()


def paso(txt):
    print('[%5.1f s] %s' % (time.time() - t0, txt), flush=True)


# ---------- datos de la herramienta (formato en 08_entrega_sia/CONTRATO_DE_DATOS.md) ----------
def enteros(nombre):
    b = np.frombuffer(gzip.decompress(open(os.path.join(DATOS, nombre), 'rb').read()), dtype=np.uint8)
    fin = np.flatnonzero((b & 0x80) == 0); ini = np.concatenate(([0], fin[:-1] + 1)); lon = fin - ini + 1
    v = np.zeros(len(fin), dtype=np.int64)
    for k in range(int(lon.max())):
        i = np.flatnonzero(lon > k); v[i] += (b[ini[i] + k].astype(np.int64) & 0x7f) << (7 * k)
    return np.where(v % 2 == 1, -((v + 1) // 2), v // 2)


META = json.loads(gzip.decompress(open(os.path.join(DATOS, 'meta.bin'), 'rb').read()).decode('utf-8'))
Q = META['Q']


def registros(vals, ncampos):
    """Separa los registros de data.bin o vp.bin: devuelve (atributos [n × ncampos], primer y último vértice absolutos)."""
    n = int(vals[0]); p = 1; A = np.zeros((n, ncampos), np.int64); pri = np.zeros((n, 2), np.int64); ult = np.zeros((n, 2), np.int64)
    x = y = 0
    for i in range(n):
        A[i] = vals[p:p + ncampos]; nv = int(vals[p + ncampos]); d = vals[p + ncampos + 1:p + ncampos + 1 + 2 * nv].reshape(-1, 2)
        pri[i] = (x + d[0, 0], y + d[0, 1]); c = d.sum(axis=0); x += int(c[0]); y += int(c[1]); ult[i] = (x, y)
        p += ncampos + 1 + 2 * nv
    return A, pri, ult


paso('leyendo los datos de la herramienta')
FR, fr_pri, fr_ult = registros(enteros('data.bin'), 8)   # alcaldía, prioridad, nombre, tipo, colonia, longitud, banderas, vp+1
VPA, _, _ = registros(enteros('vp.bin'), 11)              # nomenclat, nombre, tipo, carriles, circula, alctxt, alcaldía, prioridad, longitud, clave, registro
N = len(FR); assert N == META['N'], 'data.bin no coincide con meta.bin'
VPC = META['vp']

# ---------- 1) frentes: geometría original del modelo + atributos de la herramienta ----------
paso('extrayendo el insumo del modelo')
tmp = tempfile.mkdtemp(prefix='modelo-')
try:
    rar = os.path.join(SC, 'insumos', 'originales', 'shp_frentes_manzanasv.rar')
    r = subprocess.run(['tar', '-xf', rar, '-C', tmp], capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit('ERROR: no se pudo extraer %s con tar (%s). Extráelo a mano en una carpeta y ajusta MODELO.' % (rar, r.stderr.strip()))
    MODELO = next(os.path.join(d, f[:-4]) for d, _, fs in os.walk(tmp) for f in fs if f.endswith('.shp'))
    rd = shapefile.Reader(MODELO, encoding='utf-8')
    a4326 = Transformer.from_crs(CRS.from_wkt(open(MODELO + '.prj').read()), 'EPSG:4326', always_xy=True)
    paso('leyendo %d frentes del modelo' % len(rd))
    campos = ['CVEFT', 'CVEGEO', 'CVE_MUN', 'NOMVIAL', 'TIPOVIAL', 'BANQUETA_D', 'ARBOLES_D', 'prio_fm']
    rec = rd.records(fields=campos)
    geoms = []; pri_m = np.zeros((len(rd), 2), np.int64); ult_m = np.zeros((len(rd), 2), np.int64)
    for k, s in enumerate(rd.iterShapes()):
        pts = np.asarray(s.points, float); lon, lat = a4326.transform(pts[:, 0], pts[:, 1]); xy = np.column_stack([lon, lat])
        partes = list(s.parts) + [len(pts)]
        geoms.append(shapely.MultiLineString([xy[partes[j]:partes[j + 1]] for j in range(len(partes) - 1)]))
        pri_m[k] = np.round(xy[0] * Q); ult_m[k] = np.round(xy[-1] * Q)
finally:
    shutil.rmtree(tmp, ignore_errors=True)

# empate frente por frente: primer y último vértice (en la herramienta, grados × Q redondeados); los empates se deciden por la prioridad
paso('empatando los frentes del modelo con los de la herramienta')
prio_m = np.array([int(x['prio_fm']) - 1 for x in rec])   # los campos se leen por nombre: pyshp los devuelve en el orden del archivo
idx = {}
for k in range(len(rec)):
    idx.setdefault((pri_m[k, 0], pri_m[k, 1], ult_m[k, 0], ult_m[k, 1]), []).append(k)
de_frente = np.full(N, -1, np.int64); usado = np.zeros(len(rec), bool)
for i in range(N):
    c = [k for k in idx.get((fr_pri[i, 0], fr_pri[i, 1], fr_ult[i, 0], fr_ult[i, 1]), []) if not usado[k]]
    c = [k for k in c if prio_m[k] == FR[i, 1]] or c
    if c: de_frente[i] = c[0]; usado[c[0]] = True
sin = int((de_frente < 0).sum())
if sin:
    sys.exit('ERROR: %d frentes de la herramienta no se encontraron en el modelo; no se escribió nada.' % sin)
assert (prio_m[de_frente] == FR[:, 1]).all(), 'la prioridad no coincide en algún frente'
paso('los %d frentes empatan y tienen la misma prioridad' % N)

GRUPO_B = {0: 'con banqueta', 1: 'sin banqueta'}
fr = {k: [] for k in ['clave_frente', 'cveft', 'cvegeo', 'cve_mun', 'alcaldia', 'colonia_id', 'colonia', 'cp', 'calle', 'tipo_vial', 'prioridad', 'clase_prioridad',
                      'prioritario', 'universo_intervencion', 'banqueta_inegi', 'grupo_banqueta', 'arbolado_inegi', 'sin_arbolado', 'responsable',
                      'vp_clave', 'longitud_m', 'id_herramienta']}
geo_fr = []
for i in range(N):
    k = int(de_frente[i]); r_ = rec[k]; a = FR[i]; b = (int(a[6]) >> 3) & 7; arb = int(a[6]) & 7; gc = (int(a[6]) >> 6) & 1
    col = META['colonias'][int(a[4])] if a[4] else None
    # CVEFT es el número del frente dentro de su manzana (solo 346 valores distintos): la clave única es CVEGEO + CVEFT
    fr['clave_frente'].append('%s_%03d' % (r_['CVEGEO'], int(r_['CVEFT']))); fr['cveft'].append(int(r_['CVEFT'])); fr['cvegeo'].append(r_['CVEGEO']); fr['cve_mun'].append(r_['CVE_MUN']); fr['alcaldia'].append(META['munNames'][int(a[0])])
    fr['colonia_id'].append(int(a[4]) if a[4] else None); fr['colonia'].append(col['n'] if col else None)
    fr['cp'].append(col['cp'].zfill(5) if col and col.get('cp') else None)
    fr['calle'].append(META['names'][int(a[2])] or None); fr['tipo_vial'].append(META['tipos'][int(a[3])] or None)
    fr['prioridad'].append(PRIO[int(a[1])]); fr['clase_prioridad'].append(int(a[1])); fr['prioritario'].append(int(a[1] >= 3)); fr['universo_intervencion'].append(int(a[1] >= 2))
    fr['banqueta_inegi'].append(META['disp'][b]); fr['grupo_banqueta'].append(GRUPO_B.get(b, 'por verificar'))
    fr['arbolado_inegi'].append(META['disp'][arb]); fr['sin_arbolado'].append(int(arb == 1))
    fr['responsable'].append('Gobierno Central' if gc else 'Alcaldía')
    fr['vp_clave'].append(VPC['claves'][int(VPA[int(a[7]) - 1, 9])] if a[7] else None)
    fr['longitud_m'].append(int(a[5])); fr['id_herramienta'].append(i)
    geo_fr.append(geoms[k])

os.makedirs(SAL, exist_ok=True)


def escribe(nombre, geo, campos, tipo):
    ruta = os.path.join(SAL, nombre + '.gpkg')
    if os.path.exists(ruta): os.remove(ruta)
    datos = []
    for k, v in campos.items():
        if all(x is None or isinstance(x, (int, np.integer)) for x in v) and any(x is not None for x in v):
            datos.append(np.array([np.nan if x is None else x for x in v], dtype=float) if any(x is None for x in v) else np.array(v, dtype=np.int64))
        elif all(x is None or isinstance(x, float) for x in v):
            datos.append(np.array([np.nan if x is None else x for x in v], dtype=float))
        else:
            datos.append(np.array(v, dtype=object))
    pyogrio.raw.write(ruta, np.array(shapely.to_wkb(geo), dtype=object), datos, list(campos), layer=nombre, driver='GPKG', crs='EPSG:4326',
                      geometry_type=tipo, encoding='UTF-8')
    paso('escrito %s.gpkg (%.1f MB, %d registros)' % (nombre, os.path.getsize(ruta) / 1048576, len(geo)))


escribe('frentes_reforestacion', geo_fr, fr, 'MultiLineString')
np.save(os.path.join(SC, 'intermedios', 'clave_frente.npy'), np.array(fr['clave_frente']))   # CVEGEO_CVEFT por frente de la herramienta, para llevar la clave a la herramienta después

# ---------- 2) vialidades primarias: la capa VP_REFORESTACION con su prioridad ----------
paso('vialidades primarias')
VPR = os.path.join(SC, 'insumos', 'VP_REFORESTACION', 'PRIMARIAS_REFORESTACION')
rv = shapefile.Reader(VPR, encoding='utf-8')
u4326 = Transformer.from_crs(CRS.from_wkt(open(VPR + '.prj').read()), 'EPSG:4326', always_xy=True)
vp = {k: [] for k in ['clave', 'nomenclat', 'red_vial', 'tipo_via', 'carriles', 'circulacion', 'alcaldia_capa', 'prioridad', 'clase_prioridad', 'prioritario', 'longitud_m', 'long_vp']}
geo_vp = []
for s, r_ in zip(rv.iterShapes(), rv.iterRecords()):
    pts = np.asarray(s.points, float); partes = list(s.parts) + [len(pts)]
    utm = [pts[partes[j]:partes[j + 1]] for j in range(len(partes) - 1)]
    lon, lat = u4326.transform(pts[:, 0], pts[:, 1]); xy = np.column_stack([lon, lat])
    geo_vp.append(shapely.MultiLineString([xy[partes[j]:partes[j + 1]] for j in range(len(partes) - 1)]))
    c = PRIO.index(r_['ref_sedema'])
    vp['clave'].append(r_['CLAVE']); vp['nomenclat'].append(r_['NOMENCLAT']); vp['red_vial'].append(r_['NOMBRE']); vp['tipo_via'].append(r_['TIPO_VIA'])
    vp['carriles'].append(int(r_['CARRILES'])); vp['circulacion'].append(r_['CIRCULA']); vp['alcaldia_capa'].append(r_['ALCALDIA'])
    vp['prioridad'].append(r_['ref_sedema']); vp['clase_prioridad'].append(c); vp['prioritario'].append(int(c >= 3))
    vp['longitud_m'].append(int(round(sum(shapely.length(shapely.linestrings(p)) for p in utm)))); vp['long_vp'].append(float(r_['long_vp']))
escribe('vialidades_primarias_reforestacion', geo_vp, vp, 'MultiLineString')

# ---------- 3) colonias: polígonos simplificados de la herramienta con prioridad y km prioritarios por banqueta ----------
paso('colonias')
km = {}
for i in range(N):
    a = FR[i]
    if not a[4] or (int(a[6]) >> 6) & 1 or a[1] < 3: continue
    b = (int(a[6]) >> 3) & 7; s = km.setdefault(int(a[4]), [0.0, 0.0, 0.0]); s[0 if b == 0 else 1 if b == 1 else 2] += a[5] / 1000
co = {k: [] for k in ['colonia_id', 'colonia', 'cp', 'cve_mun', 'alcaldia', 'prioridad', 'clase_prioridad', 'poblacion', 'desarrollo_social_ids',
                      'unidad_territorial', 'poblacion_pobreza_ut', 'km_prioritarios', 'km_prio_con_banqueta', 'km_prio_sin_banqueta', 'km_prio_por_verificar']}
geo_co = []
mun_nom = dict(zip(META['muns'], META['munNames']))
for c in META['cols']:
    i = c['i']; m = META['colonias'][i]
    anillos = [np.asarray(r_, float) / Q for r_ in c['rings'] if len(r_) >= 4]
    if not anillos: continue
    g = shapely.make_valid(shapely.multipolygons([shapely.polygons(r_) for r_ in anillos]))
    g = shapely.multipolygons(shapely.get_parts(g)[shapely.get_type_id(shapely.get_parts(g)) == 3]) if g.geom_type != 'MultiPolygon' else g
    s = km.get(i, [0.0, 0.0, 0.0]); p = m.get('p', -1)
    co['colonia_id'].append(i); co['colonia'].append(m['n']); co['cp'].append(m['cp'].zfill(5) if m.get('cp') else None); co['cve_mun'].append(m['m'])
    co['alcaldia'].append(mun_nom.get(m['m'])); co['prioridad'].append(PRIO[p] if p >= 0 else None); co['clase_prioridad'].append(p if p >= 0 else None)
    co['poblacion'].append(int(m.get('pob') or 0)); co['desarrollo_social_ids'].append(m.get('ids') or None); co['unidad_territorial'].append(m.get('ut') or None)
    co['poblacion_pobreza_ut'].append(int(m.get('nbi') or 0))
    co['km_prioritarios'].append(round(sum(s), 3)); co['km_prio_con_banqueta'].append(round(s[0], 3)); co['km_prio_sin_banqueta'].append(round(s[1], 3)); co['km_prio_por_verificar'].append(round(s[2], 3))
    geo_co.append(g)
escribe('colonias_reforestacion', geo_co, co, 'MultiPolygon')

# ---------- estilo incrustado para QGIS (tabla layer_styles): al abrir el GeoPackage, QGIS lo pinta con los colores de la herramienta ----------
# Los mismos colores que los .sld de GeoServer (02_fuente/css/01_variables.css, p0 a p4). Las prioridades altas se dibujan encima.
COLORES = [(249, 231, 191), (244, 197, 110), (232, 138, 46), (194, 66, 27), (127, 29, 18)]
import sqlite3


def qml(tipo, ancho):
    cats = ''.join('<category symbol="%d" value="%d" label="%s" render="true" type="integer"/>' % (k, k, PRIO[k]) for k in range(5))
    if tipo == 'line':
        capa = lambda c: ('<layer class="SimpleLine" pass="0" locked="0" enabled="1"><Option type="Map">'
                          '<Option value="%d,%d,%d,255" type="QString" name="line_color"/><Option value="solid" type="QString" name="line_style"/>'
                          '<Option value="%s" type="QString" name="line_width"/><Option value="MM" type="QString" name="line_width_unit"/>'
                          '<Option value="round" type="QString" name="capstyle"/><Option value="round" type="QString" name="joinstyle"/></Option></layer>') % (c + (ancho,))
    else:
        capa = lambda c: ('<layer class="SimpleFill" pass="0" locked="0" enabled="1"><Option type="Map">'
                          '<Option value="%d,%d,%d,153" type="QString" name="color"/><Option value="solid" type="QString" name="style"/>'
                          '<Option value="107,107,107,204" type="QString" name="outline_color"/><Option value="solid" type="QString" name="outline_style"/>'
                          '<Option value="0.2" type="QString" name="outline_width"/><Option value="MM" type="QString" name="outline_width_unit"/></Option></layer>') % c
    simbolos = ''.join('<symbol type="%s" name="%d" alpha="1" clip_to_extent="1" force_rhr="0" frame_rate="10" is_animated="0">%s</symbol>'
                       % ('line' if tipo == 'line' else 'fill', k, capa(COLORES[k])) for k in range(5))
    return ("<!DOCTYPE qgis PUBLIC 'http://mrcc.com/qgis.dtd' 'SYSTEM'>\n"
            '<qgis version="3.34.6-Prizren" styleCategories="Symbology">'
            '<renderer-v2 type="categorizedSymbol" attr="clase_prioridad" enableorderby="1" forceraster="0" symbollevels="0" referencescale="-1">'
            '<categories>%s</categories><symbols>%s</symbols>'
            '<orderby><orderByClause asc="1" nullsFirst="1">"clase_prioridad"</orderByClause></orderby></renderer-v2></qgis>') % (cats, simbolos)


def incrusta(nombre, tipo, ancho):
    con = sqlite3.connect(os.path.join(SAL, nombre + '.gpkg'))
    con.execute('CREATE TABLE IF NOT EXISTS layer_styles (id INTEGER PRIMARY KEY AUTOINCREMENT, f_table_catalog TEXT(256), f_table_schema TEXT(256), '
                'f_table_name TEXT(256), f_geometry_column TEXT(256), styleName TEXT(30), styleQML TEXT, styleSLD TEXT, useAsDefault BOOLEAN, '
                'description TEXT, owner TEXT(30), ui TEXT(30), update_time DATETIME DEFAULT CURRENT_TIMESTAMP)')
    con.execute("INSERT OR IGNORE INTO gpkg_contents (table_name, data_type, identifier, description) VALUES ('layer_styles', 'attributes', 'layer_styles', '')")
    con.execute('DELETE FROM layer_styles WHERE f_table_name = ?', (nombre,))
    ruta_sld = os.path.join(SAL, nombre + '.sld')
    sld = open(ruta_sld, encoding='utf-8').read() if os.path.exists(ruta_sld) else ''
    con.execute("INSERT INTO layer_styles (f_table_catalog, f_table_schema, f_table_name, f_geometry_column, styleName, styleQML, styleSLD, useAsDefault, description, owner) "
                "VALUES ('', '', ?, 'geom', ?, ?, ?, 1, 'Prioridad de reforestación con los colores de la herramienta Calles prioritarias para reforestar', 'SIA')",
                (nombre, nombre, qml(tipo, ancho), sld))
    con.commit(); con.close()


incrusta('frentes_reforestacion', 'line', '0.4')
incrusta('vialidades_primarias_reforestacion', 'line', '1.2')
incrusta('colonias_reforestacion', 'fill', None)
paso('estilo de QGIS incrustado en los tres GeoPackage')

# ---------- comprobaciones y manifiesto ----------
kmp = sum(l for l, p_, r_ in zip(fr['longitud_m'], fr['clase_prioridad'], fr['responsable']) if p_ >= 3 and r_ == 'Alcaldía') / 1000
print('km prioritarios a cargo de las alcaldías: %.1f · frentes de Gobierno Central: %d · vialidades: %d · colonias: %d'
      % (kmp, fr['responsable'].count('Gobierno Central'), len(geo_vp), len(geo_co)))
lineas = []
for f in sorted(os.listdir(SAL)):
    if f.endswith(('.gpkg', '.sld')):
        lineas.append('%s  %s' % (hashlib.sha256(open(os.path.join(SAL, f), 'rb').read()).hexdigest(), f))
open(os.path.join(SAL, 'MANIFIESTO.sha256'), 'w', encoding='utf-8', newline='\n').write('\n'.join(lineas) + '\n')
paso('listo: %s' % SAL)
