# B2 · Recálculo independiente de las cifras del Resumen para una consulta (r, a, c, b, e), desde los datos crudos.
# Reglas tomadas de ARQUITECTURA.md §5 y §7 y de la metodología, no del código.
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from b2_decodificador import carga
TIPO = {'cv': 0, 'to': 1, 'am': 2}

def consulta(D, r='alc', a=None, c=None, b='todas', e=()):
    meta, F, V, P, EF, EV = D
    mun = meta['muns'].index(a) if a else None
    tipos = [TIPO[t] for t in e]
    efc, evc = EF[1], EV[1]
    def terr(f): return (f['col'] == c) if c is not None else (mun is None or f['mun'] == mun)
    def banq(f): return b == 'todas' or ((b == 'con') == (f['banq'] == 0))
    def esp(i): return not tipos or any(efc.get(i, (0, 0, 0))[t] for t in tipos)
    def espvp(k): return not tipos or (k >= 0 and any(evc.get(k, (0, 0, 0))[t] for t in tipos))
    out = {}
    if r in ('alc', 'both'):
        km = [0.0] * 5; n = [0] * 5; sa = 0.0; cv = [0, 0, 0]
        for i, f in enumerate(F):
            if f['gc'] or not terr(f) or not banq(f) or not esp(i): continue
            km[f['prio']] += f['len'] / 1000; n[f['prio']] += 1
            if f['prio'] >= 2 and f['arb'] == 1: sa += f['len'] / 1000
            for t in range(3): cv[t] += efc.get(i, (0, 0, 0))[t]
        out['alc'] = dict(kmp=sum(km[2:]), kmt=sum(km), np=sum(n[2:]), nt=sum(n), km=km, sa=sa, pct=100 * sum(km[2:]) / sum(km) if sum(km) else 0, esp=cv)
        # columna «Gobierno Central» de la tabla de comparación: sus frentes de manzana en el territorio, con los mismos filtros
        g = [0.0] * 5; g2 = [0.0] * 5
        for i, f in enumerate(F):
            if not f['gc'] or not terr(f): continue
            if banq(f) and esp(i): g[f['prio']] += f['len'] / 1000            # por el frente (como las alcaldías)
            if espvp(f['vp']): g2[f['prio']] += f['len'] / 1000               # por la parte de vialidad (regla del Gobierno Central)
        out['gc_frente_por_frente'] = dict(kmp=sum(g[2:]), kmt=sum(g))
        out['gc_frente_por_parte'] = dict(kmp=sum(g2[2:]), kmt=sum(g2))
    if r in ('gc', 'both') or True:
        km = [0.0] * 5; n = [0] * 5; cvv = [0, 0, 0]
        for k, v in enumerate(V):
            if (mun is not None and v['mun'] != mun) or not espvp(k): continue
            km[v['prio']] += v['len'] / 1000; n[v['prio']] += 1
            for t in range(3): cvv[t] += evc.get(k, (0, 0, 0))[t]
        out['gc'] = dict(kmp=sum(km[2:]), kmt=sum(km), np=sum(n[2:]), nt=sum(n), km=km, pct=100 * sum(km[2:]) / sum(km) if sum(km) else 0, esp=cvv)
    return out

if __name__ == '__main__':
    D = carga(sys.argv[1])
    print(json.dumps(consulta(D, e=('cv',)), indent=0)[:2000])
