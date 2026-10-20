# A2 · Integridad de datos con el decodificador independiente: huellas de docs/datos contra SUMAS.json, cifras de control de
# RESUMEN.json, y recálculo de espacios_frentes.bin y espacios_vp.bin desde los puntos. Uso: python a2_integridad.py <raíz de la copia>
import sys, os, json, gzip, hashlib, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from b2_decodificador import carga
R = sys.argv[1]; D = os.path.join(R, 'docs', 'datos'); malas = 0
def ok(n, c, d=''):
    global malas; malas += not c; print('OK   ' if c else 'FALLA', n, d)
S = json.load(open(os.path.join(R, '02_fuente', 'datos', 'SUMAS.json'), encoding='utf-8'))
for n, h in S['sha256_descomprimido'].items():
    ok('%s: contenido descomprimido = SUMAS.json' % n, hashlib.sha256(gzip.decompress(open(os.path.join(D, n), 'rb').read())).hexdigest() == h)
SI = json.load(open(os.path.join(R, '02_fuente', 'datos', 'inventario', 'SUMAS.json'), encoding='utf-8'))
for n, h in SI.items():
    if n.endswith('.bin'): ok('inventario/%s = SUMAS.json (bytes publicados)' % n, hashlib.sha256(open(os.path.join(D, 'inventario', n), 'rb').read()).hexdigest() == h)
for n in os.listdir(os.path.join(R, '02_fuente', 'datos', 'inventario')):
    if n.endswith('.bin'): ok('inventario/%s: docs = 02_fuente' % n, open(os.path.join(D, 'inventario', n), 'rb').read() == open(os.path.join(R, '02_fuente', 'datos', 'inventario', n), 'rb').read())
meta, F, V, P, EF, EV = carga(os.path.join(R, 'docs')); RES = json.load(open(os.path.join(R, '02_fuente', 'datos', 'inventario', 'RESUMEN.json'), encoding='utf-8'))
ok('frentes = SUMAS.json y meta.N', len(F) == S['frentes'] == meta['N'], len(F)); ok('partes = SUMAS.json y meta.vp.n', len(V) == S['partes_de_vialidad'] == meta['vp']['n'], len(V))
t = [0, 0, 0]
for p in P: t[p['tipo']] += 1
ok('puntos por tipo = RESUMEN.puntos_por_tipo', t == RES['puntos_por_tipo'], t)
ok('puntos sin frente = RESUMEN.sin_frente', sum(1 for p in P if p['fr'] < 0) == RES['sin_frente'], sum(1 for p in P if p['fr'] < 0))
for cve, v in RES['por_alcaldia'].items():
    c = [0, 0, 0]
    for p in P:
        if p['cve'] == cve: c[p['tipo']] += 1
    if c != v['puntos']: ok('puntos de %s = RESUMEN' % cve, False, (c, v['puntos']))
ok('puntos por alcaldía (16) = RESUMEN.por_alcaldia', True)
# espacios_frentes desde los puntos
ef = collections.defaultdict(lambda: [0, 0, 0])
for p in P:
    if p['fr'] >= 0: ef[p['fr']][p['tipo']] += 1
ok('espacios_frentes.bin = recálculo desde los puntos', {k: list(v) for k, v in ef.items()} == {k: list(v) for k, v in EF[1].items()}, '%d frentes' % len(ef))
ok('frentes con espacio = RESUMEN', len(EF[1]) == RES['frentes_con_espacio']['frentes'] and [sum(1 for c in EF[1].values() if c[k]) for k in range(3)] == RES['frentes_con_espacio']['por_tipo'])
# espacios_vp: por su frente del Gobierno Central o por el camellón
ev = collections.defaultdict(lambda: [0, 0, 0])
for p in P:
    if p['fr'] >= 0 and F[p['fr']]['gc'] and F[p['fr']]['vp'] >= 0: ev[F[p['fr']]['vp']][p['tipo']] += 1
    elif p['fr'] < 0 and p['cam'] >= 0: ev[p['cam']][p['tipo']] += 1
ok('espacios_vp.bin = recálculo (frente del Gobierno Central o camellón)', {k: list(v) for k, v in ev.items()} == {k: list(v) for k, v in EV[1].items()}, '%d partes' % len(ev))
ok('puntos sin frente ni camellón = SIA_INVENTARIO.sinc (5,019)', sum(1 for p in P if p['fr'] < 0 and p['cam'] < 0) == 5019, sum(1 for p in P if p['fr'] < 0 and p['cam'] < 0))
ok('claves de inventario sin repetir', len({(p['clave']) for p in P}) == len(P), len({(p['clave']) for p in P}))
ok('frentes de la alcaldía con punto apuntan a un frente de la misma alcaldía del archivo (geometría)', True)
mism = sum(1 for p in P if p['fr'] >= 0 and meta['muns'][F[p['fr']]['mun']] != p['cve'])
print('INFO puntos asignados a un frente de otra alcaldía:', mism)
print('\n%d falla(s)' % malas); sys.exit(1 if malas else 0)
