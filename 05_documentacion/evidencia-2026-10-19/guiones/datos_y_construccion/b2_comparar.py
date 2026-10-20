# B2 · Compara lo leído en pantalla (b2_leer_pantalla.js) con el recálculo independiente (b2_recalculo.py).
# Uso: python b2_comparar.py <docs> <pantalla.json>   → imprime una tabla y sale con 1 si hay diferencias.
import sys, os, json, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from b2_decodificador import carga
from b2_recalculo import consulta
from urllib.parse import parse_qs

def fmt0(v): return '{:,.0f}'.format(v)
def fmt1(v): s = '{:,.1f}'.format(v); return s[:-2] if s.endswith('.0') else s
def km(v):   # regla documentada: ≥10 km sin decimales, 1–10 un decimal, <1 km en metros
    if v >= 10: return fmt0(v) + 'km'
    if v >= 1: return fmt1(v) + 'km'
    return (fmt0(max(1, round(v * 1000))) + 'm') if v > 0 else '0km'
def num(v): return fmt0(v) if v < 10000 else fmt1(v / 1000) + 'mil'
def pct(v): return fmt1(round(v, 1)) + '%'
def kmtab(v): return '<1' if 0 < v < 0.5 else fmt0(v)

D = carga(sys.argv[1]); pant = json.load(open(sys.argv[2], encoding='utf-8')); malas = 0; filas = []
for e in pant:
    q = {k: v[0] for k, v in parse_qs(e['consulta']).items()}
    r = q.get('r', 'alc'); a = q.get('a'); c = int(q['c']) if 'c' in q else None; b = q.get('b', 'todas'); es = tuple(q['e'].split(',')) if 'e' in q else ()
    X = consulta(D, r, a, c, b, es)
    if c is not None and r != 'alc':   # con colonia, el bloque del Gobierno Central: ¿colonia o alcaldía?
        mun_col = D[0]['colonias'][c]['m']; X['gc_alcaldia_de_la_colonia'] = consulta(D, 'gc', mun_col, None, b, es)['gc']
    k = e['kpis']; esper = []; i = 0
    if r in ('alc', 'both'):
        A = X['alc']; esper += [(km(A['kmp']) + ' km prioritarios', 'alc km prioritarios'), (pct(A['pct']) + ' de ' + km(A['kmt']).replace('km', ' km').replace('m', ' m') if False else None, None)]
        obs = k[0:3]; i = 3
        exp = [km(A['kmp']), pct(A['pct']) + ' de ' + km(A['kmt']), num(A['np']) + ' frentes prioritarios']
        filas.append((e['consulta'], 'Alcaldías', obs, exp))
    if r in ('gc', 'both'):
        G = X['gc'] if c is None else X['gc_alcaldia_de_la_colonia']
        recs = None
        meta, F, V, P, EF, EV = D
        TIPO = {'cv': 0, 'to': 1, 'am': 2}; t = [TIPO[x] for x in es]
        mun = meta['muns'].index(a) if a else (meta['muns'].index(meta['colonias'][c]['m']) if c is not None else None)
        sel = [kk for kk, v in enumerate(V) if (mun is None or v['mun'] == mun) and (not t or any(EV[1].get(kk, (0, 0, 0))[x] for x in t))]
        rp = len({V[kk]['rec'] for kk in sel if V[kk]['prio'] >= 2}); rt = len({V[kk]['rec'] for kk in sel})
        obs = k[i:i+3]
        exp = [km(G['kmp']), pct(G['pct']) + ' de ' + km(G['kmt']), '%s de %s tramos prioritarios' % (fmt0(rp), fmt0(rt))]
        filas.append((e['consulta'], 'Gobierno Central', obs, exp))
    # tabla de comparación (si se ve)
    if r != 'gc' and e.get('tabla'):
        T = {row.split(' | ')[0]: row.split(' | ')[1:] for row in e['tabla'] if ' | ' in row}
        A = X['alc']; GF = X['gc_frente_por_frente']
        gvp = X['gc']['esp'] if c is None else None
        expT = {'Prioritario': [kmtab(A['kmp']), kmtab(GF['kmp'])], 'Todos los frentes': [kmtab(A['kmt']), kmtab(GF['kmt'])], 'De lo prioritario, sin arbolado': [kmtab(A['sa'])],
                'Cepas vacantes': [fmt0(A['esp'][0])] + ([fmt0(gvp[0])] if gvp else []), 'Tocones': [fmt0(A['esp'][1])] + ([fmt0(gvp[1])] if gvp else []), 'Árboles muertos': [fmt0(A['esp'][2])] + ([fmt0(gvp[2])] if gvp else [])}
        obsT = {kk: T.get(kk, [])[:len(v)] for kk, v in expT.items()}
        filas.append((e['consulta'], 'Tabla comparación', obsT, expT))
    if e.get('equiv') and False: filas.append((e['consulta'], 'Equivalencia GC (texto)', e['equiv'][:1], 'por parte: %s total, %s prioritarios · por frente: %s / %s' % (kmtab(X['gc_frente_por_parte']['kmt']) if 'gc_frente_por_parte' in X else '?', kmtab(X['gc_frente_por_parte']['kmp']) if 'gc_frente_por_parte' in X else '?', kmtab(X['gc_frente_por_frente']['kmt']) if 'gc_frente_por_frente' in X else '?', kmtab(X['gc_frente_por_frente']['kmp']) if 'gc_frente_por_frente' in X else '?')))
    if e.get('equiv') and r != 'gc' and e.get('tabla'):
        m = re.search(r'Equivalen a ([\d,\.]+) (km|m) de frente.*?, ([\d,\.]+) (km|m) prioritario', e['equiv'][0])
        T = {row.split(' | ')[0]: row.split(' | ')[1:] for row in e['tabla'] if ' | ' in row}
        if m: filas.append((e['consulta'], 'GC km de frente: «Equivalen a» contra la tabla', {'equivalencia (bloque GC)': [m.group(1) + m.group(2), m.group(3) + m.group(4)], 'tabla, columna GC': [T.get('Todos los frentes', ['?','?'])[1] + 'km', T.get('Prioritario', ['?','?'])[1] + 'km']}, None))
for cons, bloque, obs, exp in filas:
    if isinstance(obs, list) and isinstance(exp, list):
        o = [re.sub(r'\s+', '', x.split(' km prioritarios')[0] if 'km prioritarios' in x else x).replace('(inventariodearbolado)', '') for x in obs]
        ee = [re.sub(r'\s+', '', x) for x in exp]
        bien = all(ee[j] in o[j] for j in range(len(ee))) if len(o) == len(ee) else False
    elif isinstance(obs, dict) and exp is not None:
        bien = all(obs[kk] == vv for kk, vv in exp.items())
    elif exp is None and isinstance(obs, dict):
        v = list(obs.values()); bien = v[0] == v[1] if len(v) == 2 else None
    else:
        bien = None
    if bien is False: malas += 1
    print('%-6s %-34s %-24s pantalla=%s | recálculo=%s' % ({True: 'IGUAL', False: 'DIFIERE', None: 'VER'}[bien], cons or '(ciudad)', bloque, json.dumps(obs, ensure_ascii=False)[:260], json.dumps(exp, ensure_ascii=False)[:260]))
print('\n%d bloque(s) con diferencias' % malas); sys.exit(1 if malas else 0)
