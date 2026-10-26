# -*- coding: utf-8 -*-
"""Liga cada frente de manzana con su tramo de la capa de calles de la CDMX (calles-cdmx 1.0.0, SEDEMA con INEGI 2025).

De la capa se toman, para mostrar: el nombre homologado de la calle y las calles de las dos esquinas de cada tramo («entre A y B»).
No cambia ningún dato del modelo: ni prioridad, ni quién atiende, ni longitudes. data.bin, meta.bin y vp.bin
quedan igual; todo va en un archivo aparte, 02_fuente/datos/calles.bin, que la herramienta lee al abrir.

Regla del enlace (calibrada en 05_documentacion/analisis_calles_cdmx/ANALISIS.md):
  - desde el punto medio del frente, el tramo a 40 m o menos y casi paralelo (30° o menos);
  - con el mismo nombre, hasta 40 m; sin coincidencia de nombre, hasta 20 m. Entre candidatos, el nombre pesa como 15 m;
  - el frente toma el tramo solo si los nombres coinciden o si su nombre de 2020 era «Sin Referencia», «Ninguno» o vacío. Si no,
    se queda sin tramo y con su nombre de 2020: puede ser otra calle (una esquina) o una calle que cambió de nombre.
Los frentes sin tramo conservan su nombre de 2020 con su tipo al inicio («Cerrada Pinos»), como escribe la capa los suyos.

calles.bin (gzip de enteros varint en zigzag, como los demás; formato en ARQUITECTURA.md, sección 7):
  encabezado (formato, N, nombres, anteriores, tramos, alias y las dos memorias de la codificación); los textos, letra por letra;
  el tramo de cada frente; el nombre y las dos esquinas de cada tramo (la esquina 1 es la del poniente o, si la calle corre de
  norte a sur, la del sur); el nombre de cada frente sin tramo; y los alias (nombre nuevo, nombre anterior) para que el buscador
  encuentre también el de 2020. Tramos y nombres se escriben como «el mismo de hace poco» cuando se puede: así pesa la mitad.

Escribe 02_fuente/datos/calles.bin, 02_fuente/datos/calles_resumen.json (cifras de control y huellas que revisa construir.py) y
_local/ligar_calles_revision.csv (cada frente cuyo nombre cambia de palabras o que se quedó sin tramo). Después: reconstruir.
La capa se lee en su lugar, sin copiarla: CALLES_CDMX_GPKG o, por omisión, la carpeta hermana calles-cdmx.
Requiere numpy, shapely, pyproj y pyogrio. Uso: python 03_procesamiento_datos/10_ligar_calles.py
"""
import csv
import gzip
import hashlib
import json
import os
import re
import sys
import unicodedata

import numpy as np
import pyogrio
import shapely
from pyproj import Transformer
from shapely import STRtree

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
DATOS = os.path.join(RAIZ, '02_fuente', 'datos')
GPKG = os.environ.get('CALLES_CDMX_GPKG') or os.path.join(os.path.dirname(RAIZ), 'calles-cdmx', 'salidas', 'entrega', 'calles-cdmx-1.0.0', 'datos', 'calles_cdmx.gpkg')
VERSION_CAPA = '1.0.0'
TRAMOS_CAPA = 178771              # conteo de control de la capa 1.0.0 (su LEEME.md)
FORMATO = 1
RECIENTES_TR, RECIENTES_NOM = 8, 16     # memoria de la codificación de calles.bin; van en su encabezado
D_NOMBRE, D_SIN_NOMBRE, ANG, PESO_NOMBRE = 40.0, 20.0, 30.0, 15.0   # metros y grados

if not os.path.isfile(GPKG):
    sys.exit('ERROR: no se encontró la capa de calles en %s. Dar su ruta en CALLES_CDMX_GPKG. No se escribió nada.' % GPKG)

# ---------- frentes: geometría y nombres de 2020 (los del modelo, no los ya ligados: así el paso se puede volver a correr) ----------
META = json.load(open(os.path.join(AQUI, 'intermedios', 'meta.json'), encoding='utf-8'))
fr = dict(np.load(os.path.join(AQUI, 'intermedios', 'frentes.npz')))
N = len(fr['mun']); start = fr['start']
data_crudo = gzip.decompress(open(os.path.join(DATOS, 'data.bin'), 'rb').read())
data_sha = hashlib.sha256(data_crudo).hexdigest()
n_data = 0
for k, c in enumerate(data_crudo):   # el primer entero de data.bin es el número de frentes
    n_data |= (c & 0x7f) << (7 * k)
    if not c & 0x80:
        break
if n_data >> 1 != N:
    sys.exit('ERROR: data.bin tiene %d frentes y intermedios/frentes.npz %d. No se escribió nada.' % (n_data >> 1, N))
to_utm = Transformer.from_crs('EPSG:4326', 'EPSG:32614', always_xy=True)
fx, fy = to_utm.transform(fr['lon'], fr['lat'])
frentes = shapely.linestrings(np.column_stack([fx, fy]), indices=np.repeat(np.arange(N), np.diff(start)))
FL = shapely.length(frentes)
mid = shapely.line_interpolate_point(frentes, FL / 2)
# rumbo alrededor del punto medio (±5 m): los frentes en L o curvos no se miden de punta a punta
pa = shapely.line_interpolate_point(frentes, np.clip(FL / 2 - 5, 0, FL)); pb = shapely.line_interpolate_point(frentes, np.clip(FL / 2 + 5, 0, FL))
fang = np.degrees(np.arctan2(shapely.get_y(pb) - shapely.get_y(pa), shapely.get_x(pb) - shapely.get_x(pa))) % 180

# ---------- tramos de la capa ----------
CAMPOS = ['clave', 'nombre', 'nombre_principal', 'nombre_alterno', 'tipo_original', 'nombre_original', 'entre_1', 'entre_2']
info, _, geom, campos = pyogrio.raw.read(GPKG, layer='calles', columns=CAMPOS)
T = {c: campos[k] for k, c in enumerate(info['fields'])}   # vienen en el orden de la capa, no en el de CAMPOS
NT = len(geom)
if NT != TRAMOS_CAPA:
    sys.exit('ERROR: la capa trae %d tramos y la versión %s trae %d. Revisar la versión y VERSION_CAPA. No se escribió nada.' % (NT, VERSION_CAPA, TRAMOS_CAPA))
texto = lambda v: '' if v is None else str(v).strip()
tg = shapely.transform(shapely.from_wkb(geom), lambda xy: np.column_stack(to_utm.transform(xy[:, 0], xy[:, 1])))
arbol = STRtree(tg)


def norm(s):
    s = unicodedata.normalize('NFD', texto(s)).encode('ascii', 'ignore').decode().lower()
    return ' '.join(re.sub(r'[^a-z0-9 ]+', ' ', s).split())


GENERICOS = set('avenida av calzada calz eje vial boulevard blvd bulevar circuito viaducto anillo periferico prolongacion prol calle de del la el los las y lateral carretera autopista camino paseo cerrada privada andador callejon retorno pasaje'.split())
palabras = lambda s: frozenset(t for t in norm(s).split() if t not in GENERICOS)   # sin quitar las de una letra: «Calle 6», «Andador F»
# los mismos nombres de relleno que 02_fuente/js/09_listados.js (PLACEHOLDER)
relleno = lambda n: (lambda x: x in ('', 'sin referencia', 'sin nombre') or x.startswith('ninguno') or x.endswith(' ninguno') or x.startswith('manzana o edificacion'))(norm(n))
# Lo que distingue a dos calles con las mismas palabras: «Cerrada Progreso» no es «Calle Progreso», «Segunda Tláloc» no es «Tláloc»
# y «Paseo de la Loma 2» no es «Paseo la Loma». Deben coincidir el tipo menor, los ordinales y los números
MENORES = {'cerrada', 'privada', 'andador', 'callejon', 'retorno', 'pasaje', 'peatonal', 'prolongacion'}
ORDINALES = set('primera primer primero segunda segundo tercera tercer tercero cuarta cuarto quinta quinto sexta sexto septima septimo octava octavo novena noveno decima decimo'.split())


def distintivo(s):
    w = norm(s).split()
    return frozenset(t for t in w if t in MENORES), frozenset(t for t in w if t in ORDINALES or re.fullmatch(r'\d+[ao]?', t))


nombres20 = META['names']; tipos20 = META['tipos']
pal20 = [palabras(n) for n in nombres20]
# variantes del nombre de cada tramo: el principal (con su tipo), el alterno y el original de la fuente con su tipo
VARIANTES = list(zip(T['nombre_principal'], T['nombre_alterno'], [texto(a) + ' ' + texto(b) for a, b in zip(T['tipo_original'], T['nombre_original'])]))
palT = [tuple((palabras(v), distintivo(v)) for v in vs if texto(v)) for vs in VARIANTES]


def coincide(f, t):
    p = pal20[fr['name'][f]]
    if not p:
        return False
    d = distintivo(tipos20[fr['tipo'][f]] + ' ' + nombres20[fr['name'][f]])
    return any(c and dc == d and (c <= p or p <= c or len(c & p) / len(c | p) >= 0.5) for c, dc in palT[t])


# ---------- enlace frente → tramo ----------
pi, ti = arbol.query(mid, predicate='dwithin', distance=D_NOMBRE)
dist = shapely.distance(mid[pi], tg[ti])
pr = shapely.line_locate_point(tg[ti], mid[pi]); L = shapely.length(tg[ti])
a = shapely.line_interpolate_point(tg[ti], np.clip(pr - 5, 0, L)); b = shapely.line_interpolate_point(tg[ti], np.clip(pr + 5, 0, L))
tang = np.degrees(np.arctan2(shapely.get_y(b) - shapely.get_y(a), shapely.get_x(b) - shapely.get_x(a))) % 180
dang = np.abs(fang[pi] - tang); dang = np.minimum(dang, 180 - dang)
nm = np.array([coincide(f, t) for f, t in zip(pi, ti)], bool)
puntaje = np.where((dang <= ANG) & (nm | (dist <= D_SIN_NOMBRE)), dist - np.where(nm, PESO_NOMBRE, 0), np.inf)
orden = np.lexsort((puntaje, pi)); pi, ti, nm, puntaje = pi[orden], ti[orden], nm[orden], puntaje[orden]
primero = np.r_[True, pi[1:] != pi[:-1]] & np.isfinite(puntaje)
tramo = np.full(N, -1, np.int64); tramo[pi[primero]] = ti[primero]
mismo = np.zeros(N, bool); mismo[pi[primero]] = nm[primero]
cerca = tramo >= 0
es_relleno = np.array([relleno(nombres20[k]) for k in fr['name']])
ligado = cerca & (mismo | es_relleno)
tramo[~ligado] = -1

# ---------- nombres para mostrar ----------
NO_TIPO = {'—', 'Rasgo', 'Sin Referencia', ''}
# palabras con que ya empieza un nombre que trae su tipo («Andador 7», «Avenida Toluca»): no se le antepone otro
YA_TIPO = {norm(t).split()[0] for t in tipos20 if norm(t)} | GENERICOS - {'de', 'del', 'la', 'el', 'los', 'las', 'y', 'lateral', 'vial'}


def con_tipo(n, tp):
    """Nombre de 2020 con su tipo una sola vez al inicio («Pinos» + Cerrada = «Cerrada Pinos»), salvo nombres de relleno."""
    w = norm(n).split() or ['']
    if relleno(n) or tp in NO_TIPO or w[0] in YA_TIPO or MENORES & set(w):   # «Segunda Privada» ya dice su tipo
        return n
    return tp + ' ' + n


nuevo = [texto(T['nombre'][tramo[i]]) if ligado[i] else con_tipo(nombres20[fr['name'][i]], tipos20[fr['tipo'][i]]) for i in range(N)]
usados = np.unique(tramo[ligado])
# esquinas: la 1 al poniente (o al sur, si la calle corre de norte a sur)
p0, p1 = shapely.get_coordinates(shapely.get_point(tg[usados], 0)), shapely.get_coordinates(shapely.get_point(tg[usados], -1))
d = p1 - p0
voltea = np.where(np.abs(d[:, 0]) >= np.abs(d[:, 1]), d[:, 0] < 0, d[:, 1] < 0)
esq = {}
for t, v in zip(usados.tolist(), voltea.tolist()):
    e1, e2 = texto(T['entre_1'][t]), texto(T['entre_2'][t])
    esq[t] = (e2, e1) if v else (e1, e2)
catalogo = sorted(set(nuevo) | {e for par in esq.values() for e in par if e})
pos = {n: k for k, n in enumerate(catalogo)}
# tramos numerados en el orden en que aparecen sus frentes (las diferencias quedan chicas)
num, tr_orden = {}, []
for i in np.flatnonzero(ligado):
    t = int(tramo[i])
    if t not in num:
        num[t] = len(tr_orden); tr_orden.append(t)
fr_tramo = np.array([num[int(t)] + 1 if t >= 0 else 0 for t in tramo], np.int64)
sin_nombre = [pos[nuevo[i]] for i in np.flatnonzero(~ligado)]   # el frente ligado toma el nombre de su tramo
# alias para el buscador: nombre de 2020 cuyas palabras no están en el nuevo (calle que cambió de nombre o lo ganó)
alias = sorted({(pos[nuevo[i]], nombres20[fr['name'][i]]) for i in np.flatnonzero(ligado)
                if not es_relleno[i] and norm(nombres20[fr['name'][i]]) not in norm(nuevo[i])})
anteriores = sorted({n for _, n in alias}); pos_ant = {n: k for k, n in enumerate(anteriores)}


# ---------- escritura ----------
def varint(vals):
    out = bytearray()
    for v in vals:
        z = 2 * v if v >= 0 else -2 * v - 1
        while True:
            b = z & 0x7f; z >>= 7
            out.append(b | 0x80 if z else b)
            if not z:
                break
    return bytes(out)


def letras(s):
    return [len(s)] + [ord(c) for c in s]


vals = [FORMATO, N, len(catalogo), len(anteriores), len(tr_orden), len(alias), RECIENTES_TR, RECIENTES_NOM]
for s in catalogo + anteriores:
    if any(ord(c) > 0xffff for c in s):
        sys.exit('ERROR: el nombre %r trae un carácter fuera del plano básico. No se escribió nada.' % s)
    vals += letras(s)
# tramo de cada frente: 0 sin tramo, 1 el siguiente tramo nuevo, 2 + j el j-ésimo más reciente (de los últimos RECIENTES_TR);
# negativo, cuántos tramos atrás del siguiente nuevo
mx, rec = 0, []
for x in fr_tramo.tolist():
    if x == 0:
        vals.append(0); continue
    if x == mx + 1:
        vals.append(1); mx = x
    elif x in rec:
        vals.append(2 + rec.index(x)); rec.remove(x)
    else:
        vals.append(x - mx - 1)
    rec.insert(0, x); del rec[RECIENTES_TR:]
# nombre y esquinas de cada tramo: 0 ninguna, 1 + j el j-ésimo nombre más reciente (de los últimos RECIENTES_NOM), 1 + RECIENTES_NOM + k
# el nombre k del catálogo. Las calles de una manzana se nombran unas a otras: casi siempre es un nombre reciente
rec = []
for t in tr_orden:
    for x in (pos[texto(T['nombre'][t])],) + tuple(pos[e] if e else -1 for e in esq[t]):   # el tramo siempre trae nombre («» si no tiene)
        if x < 0:
            vals.append(0); continue
        if x in rec:
            vals.append(1 + rec.index(x)); rec.remove(x)
        else:
            vals.append(1 + RECIENTES_NOM + x)
        rec.insert(0, x); del rec[RECIENTES_NOM:]
vals += sin_nombre
for k, n in alias:
    vals += [k, pos_ant[n]]
crudo = varint(vals)
open(os.path.join(DATOS, 'calles.bin'), 'wb').write(gzip.compress(crudo, 9, mtime=0))

km = fr['ln'] / 1000
rasgo = fr['tipo'] == tipos20.index('Rasgo')
cambia = np.array([norm(nuevo[i]) != norm(nombres20[fr['name'][i]]) for i in range(N)])
resumen = {
    'nota': 'Lo escribe 03_procesamiento_datos/10_ligar_calles.py. construir.py comprueba que calles.bin sea este y que se haya ligado con este data.bin.',
    'capa': 'calles-cdmx %s (SEDEMA con INEGI, Marco Geoestadístico EI 2025)' % VERSION_CAPA,
    'capa_sha256': hashlib.sha256(open(GPKG, 'rb').read()).hexdigest(),
    'frentes_sha256': data_sha,
    'calles_sha256': hashlib.sha256(crudo).hexdigest(),
    'formato': FORMATO, 'frentes': N, 'tramos_de_la_capa': NT,
    'frentes_ligados': int(ligado.sum()), 'km_ligados': round(float(km[ligado].sum()), 1),
    'frentes_sin_tramo': int((~ligado).sum()), 'km_sin_tramo': round(float(km[~ligado].sum()), 1),
    'sin_tramo_por_ser_rasgo': int((~ligado & rasgo).sum()),
    'cerca_pero_con_otro_nombre': int((cerca & ~ligado).sum()),
    'tramos_usados': len(tr_orden), 'nombres': len(catalogo), 'alias': len(alias),
    'frentes_con_nombre_distinto': int(cambia.sum()),
    'regla': 'tramo a ≤%g m del punto medio del frente y ≤%g°; sin coincidencia de nombre, a ≤%g m; se liga si el nombre coincide o el de 2020 era de relleno' % (D_NOMBRE, ANG, D_SIN_NOMBRE),
}
open(os.path.join(DATOS, 'calles_resumen.json'), 'w', encoding='utf-8', newline='\n').write(json.dumps(resumen, ensure_ascii=False, indent=2) + '\n')

os.makedirs(os.path.join(RAIZ, '_local'), exist_ok=True)
with open(os.path.join(RAIZ, '_local', 'ligar_calles_revision.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f)
    w.writerow(['frente', 'clave_frente', 'nombre_2020', 'tipo_2020', 'resultado', 'nombre_nuevo', 'clave_tramo', 'tramo_cercano', 'alcaldia'])
    claves = np.load(os.path.join(AQUI, 'intermedios', 'clave_frente.npy')) if os.path.isfile(os.path.join(AQUI, 'intermedios', 'clave_frente.npy')) else None
    f_mejor, t_mejor = pi[primero], ti[primero]
    for i in range(N):
        n20 = nombres20[fr['name'][i]]
        if ligado[i] and norm(n20) in norm(nuevo[i]):
            continue
        res = 'ligado, nombre distinto' if ligado[i] else ('sin tramo, cerca de otra calle' if cerca[i] else 'sin tramo')
        cerca_t = texto(T['nombre'][t_mejor[np.searchsorted(f_mejor, i)]]) if cerca[i] and not ligado[i] else ''
        w.writerow([i, claves[i] if claves is not None else '', n20, tipos20[fr['tipo'][i]], res, nuevo[i], texto(T['clave'][tramo[i]]) if ligado[i] else '',
                    cerca_t, META['munNames'][fr['mun'][i]]])

print('Capa: %s, %d tramos' % (resumen['capa'], NT))
print('Frentes ligados a su tramo: %s de %s (%s km de %s)' % (format(resumen['frentes_ligados'], ','), format(N, ','), format(resumen['km_ligados'], ','), format(round(float(km.sum()), 1), ',')))
print('Sin tramo: %s frentes (%s son «Rasgo»: dan a un parque, río o vía; %s quedan junto a una calle con otro nombre)' % (
    format(resumen['frentes_sin_tramo'], ','), format(resumen['sin_tramo_por_ser_rasgo'], ','), format(resumen['cerca_pero_con_otro_nombre'], ',')))
print('Tramos usados: %s · nombres: %s · alias para el buscador: %s' % (format(len(tr_orden), ','), format(len(catalogo), ','), format(len(alias), ',')))
print('calles.bin: %.0f KB. Revisión en _local/ligar_calles_revision.csv. Después: python 02_fuente/construir.py' % (os.path.getsize(os.path.join(DATOS, 'calles.bin')) / 1024))
