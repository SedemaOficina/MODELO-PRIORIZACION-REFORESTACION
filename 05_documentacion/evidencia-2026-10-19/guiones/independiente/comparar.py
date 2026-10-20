# Recalcula de forma independiente (datos_indep.py) las cifras de cada estado y las compara con lo que mostro la herramienta (estado_app.js).
# Uso: python -I comparar.py <carpeta de guiones> <estados.json> <salida.txt>
import sys, json, re; sys.path.insert(0, sys.argv[1])
import datos_indep as D
d = D.carga('X:/r7/docs'); F, V, M, EF, EV = d['F'], d['V'], d['M'], d['EF'], d['EV']
MUN = {'ciudad': None, 'iztapalapa': M['muns'].index('007'), 'coyoacan': M['muns'].index('003'), 'tlalpan': M['muns'].index('012')}
BIT = {'cv': 1, 'to': 2, 'am': 4}
def mask(e): return sum(BIT[x] for x in e.split(',') if x) if e else 0
def tipos(cnt): return (1 if cnt[0] else 0) | (2 if cnt[1] else 0) | (4 if cnt[2] else 0)
def pasaE(i, m): return m == 0 or (i in EF and tipos(EF[i]) & m)
def pasaEV(j, m): return m == 0 or (j >= 0 and j in EV and tipos(EV[j]) & m)
def pasaB(f, b): return b == 'todas' or ((f['banq'] == 0) == (b == 'con'))
def esperado(s, col):
    m = mask(s['e']); mun = MUN.get(s['t']); c = col if s['t'] == 'colonia' else None
    if c is not None: mun = M['muns'].index(M['colonias'][c]['m'])
    terr = (lambda f: f['col'] == c) if c is not None else (lambda f: mun is None or f['mun'] == mun)
    R = {}
    A = [f for f in F if not f['gc'] and terr(f) and pasaB(f, s['b']) and pasaE(f['i'], m)]
    R['alc'] = dict(kmp=sum(f['len'] for f in A if f['prio'] >= 2)/1000, tot=sum(f['len'] for f in A)/1000, np=sum(1 for f in A if f['prio'] >= 2),
                    sa=sum(f['len'] for f in A if f['prio'] >= 2 and f['arb'] == 1)/1000,
                    esp=[sum(EF.get(f['i'], (0, 0, 0))[k] for f in A) for k in range(3)])
    P = [v for v in V if (mun is None or v['mun'] == mun) and pasaEV(v['i'], m)]
    R['gc'] = dict(kmp=sum(v['len'] for v in P if v['prio'] >= 2)/1000, tot=sum(v['len'] for v in P)/1000,
                   recsp=len({v['rec'] for v in P if v['prio'] >= 2}), recs=len({v['rec'] for v in P}),
                   esp=[sum(EV.get(v['i'], (0, 0, 0))[k] for v in P) for k in range(3)])
    # Gobierno Central en km de frente: regla documentada (sin banqueta; Espacio por la parte de vialidad) y la de la tabla (repStat)
    Gdoc = [f for f in F if f['gc'] and terr(f) and pasaEV(f['vp'], m)]
    Gtab = [f for f in F if f['gc'] and terr(f) and pasaB(f, s['b']) and pasaE(f['i'], m)]
    for k, G in (('gcf_doc', Gdoc), ('gcf_tab', Gtab)):
        R[k] = dict(kmp=sum(f['len'] for f in G if f['prio'] >= 2)/1000, tot=sum(f['len'] for f in G)/1000, sa=sum(f['len'] for f in G if f['prio'] >= 2 and f['arb'] == 1)/1000,
                    kmp_vp=sum(f['len'] for f in G if f['vp'] >= 0 and V[f['vp']]['prio'] >= 2)/1000, esp=[sum(EF.get(f['i'], (0, 0, 0))[k2] for f in G) for k2 in range(3)])
    return R
num = lambda t: float(t.replace(',', ''))
def kmde(v, u): return num(v)/1000 if u == 'm' else num(v)
def cerca(a, b, tol): return abs(a-b) <= tol
def tolkm(v): return 0.5 if v >= 10 else 0.05 if v >= 1 else 0.0005
out = []; dif = 0
def chk(s, nombre, app, exp, tol):
    global dif
    ok = app is not None and cerca(app, exp, tol)
    if not ok: dif += 1; out.append(f"DIF {s['q'] or '(ciudad)'} | {nombre}: pantalla {app} | recalculo {round(exp, 3)}")
data = json.load(open(sys.argv[2], encoding='utf8')); col = None
for s in data['res']:
    if s['t'] == 'colonia': col = int(re.search(r'c=(\d+)', s['q']).group(1))
    a = s['app']; E = esperado(s, col)
    if a['kpis'] and s['r'] != 'gc' and 'Sin frentes' not in a['kpis']:
        mm = re.match(r'([\d,.]+)(km|m)\b.*?([\d.,]+)% de ([\d.,]+) (km|m) ([\d,.]+)(mil)?', a['kpis'])
        if mm:
            chk(s, 'alc km prioritarios', kmde(mm.group(1), mm.group(2)), E['alc']['kmp'], tolkm(E['alc']['kmp']))
            chk(s, 'alc km total', kmde(mm.group(4), mm.group(5)), E['alc']['tot'], tolkm(E['alc']['tot']))
            npv = num(mm.group(6))*1000 if mm.group(7) else num(mm.group(6)); chk(s, 'alc frentes prioritarios', npv, E['alc']['np'], 50 if mm.group(7) else 0)
        else: out.append('NOPARSE kpis ' + a['kpis'])
    kg = a['kpis'] if s['r'] == 'gc' else a['kpis2'] if s['r'] == 'both' else None
    if kg:
        mm = re.match(r'([\d,.]+)(km|m)\b.*?([\d.,]+)% de ([\d.,]+) (km|m) ([\d,]+) de ([\d,]+) tramos', kg)
        if mm:
            chk(s, 'gc km prioritarios (eje)', kmde(mm.group(1), mm.group(2)), E['gc']['kmp'], tolkm(E['gc']['kmp']))
            chk(s, 'gc tramos prioritarios', num(mm.group(6)), E['gc']['recsp'], 0); chk(s, 'gc tramos', num(mm.group(7)), E['gc']['recs'], 0)
        else: out.append('NOPARSE kpis gc ' + kg)
    T = {r[0]: r[1:] for r in a['tabla'] if len(r) == 4}
    if T:
        cn = lambda x: 0.25 if x == '<1' else num(x)
        for fila, ka in (('Prioritario', 'kmp'), ('De lo prioritario, sin arbolado', 'sa'), ('Todos los frentes', 'tot')):
            if fila in T:
                chk(s, f'tabla Alcaldia | {fila}', cn(T[fila][0]), E['alc'][ka], 0.51)
                g = cn(T[fila][1])
                if not cerca(g, E['gcf_doc'][ka], 0.51):
                    dif += 1; out.append(f"DIF {s['q'] or '(ciudad)'} | tabla Gobierno Central | {fila}: pantalla {g} | regla documentada {round(E['gcf_doc'][ka],2)} | regla de la tabla {round(E['gcf_tab'][ka],2)}")
        for k, fila in enumerate(['Cepas vacantes', 'Tocones', 'Árboles muertos']):
            if fila in T and T[fila][0] not in ('cargando…',):
                chk(s, f'tabla espacios Alcaldia | {fila}', num(T[fila][0]), E['alc']['esp'][k], 0)
                gexp = E['gc']['esp'][k] if s['t'] != 'colonia' else E['gcf_doc']['esp'][k]
                g = num(T[fila][1])
                if g != gexp:
                    dif += 1; out.append(f"DIF {s['q'] or '(ciudad)'} | tabla espacios Gobierno Central | {fila}: pantalla {g} | regla documentada {gexp} | con banqueta y espacio por frente {E['gcf_tab']['esp'][k] if s['t']=='colonia' else '-'}")
    for u in (a.get('univ'), a.get('univ2')):
        if u and 'Equivalen a' in u:
            mm = re.search(r'Equivalen a ([\d,.]+) (km|m) de frente de manzana \(aceras con manzana enfrente\), ([\d,.]+) (km|m) prioritarios', u)
            if mm and T.get('Prioritario'):
                eq = kmde(mm.group(3), mm.group(4)); tab = (0.25 if T['Prioritario'][1] == '<1' else num(T['Prioritario'][1]))
                if abs(eq - tab) > 1: out.append(f"INCOHERENTE {s['q']}: Equivalen a ... {mm.group(3)} {mm.group(4)} prioritarios (bloque Gobierno Central) vs tabla Prioritario/Gobierno Central {T['Prioritario'][1]}")
out.insert(0, f'estados {len(data["res"])} | diferencias {dif} | errores de pagina {len(data["errores"])}')
open(sys.argv[3], 'w', encoding='utf8').write('\n'.join(out))
