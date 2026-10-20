# D5 · Regla del frente en el insumo del modelo y sensibilidad de su ponderación.
# Uso: python -I d5_sensibilidad.py RUTA/frentes_manzanas_verdes.dbf
# Lee pr_sdm_hx (prioridad del hexágono/colonia, 0-5), cat_pndvi (verdor del frente, 1-5), ndc_3, prio_fm, LON_FM (km), ARBOLES, S_CONSERVA.
import sys, collections, json, shapefile
r = shapefile.Reader(dbf=open(sys.argv[1], 'rb')); campos = [f[0] for f in r.fields[1:]]; ix = {c: i for i, c in enumerate(campos)}
H, C, S, P, L, A, SC = [], [], [], [], [], [], []
for rec in r.iterRecords(fields=['pr_sdm_hx', 'cat_pndvi', 'ndc_3', 'prio_fm', 'LON_FM', 'ARBOLES', 'S_CONSERVA']):
    d = rec.as_dict(); H.append(d['pr_sdm_hx']); C.append(d['cat_pndvi']); S.append(d['ndc_3']); P.append(int(d['prio_fm'])); L.append(d['LON_FM']); A.append(d['ARBOLES']); SC.append(d['S_CONSERVA'])
n = len(H); out = {'frentes': n}
out['ndc3_es_promedio'] = sum(1 for i in range(n) if abs(S[i] - (H[i] + C[i]) / 2) < 1e-9)
tabla = collections.defaultdict(collections.Counter)
for i in range(n): tabla[S[i]][P[i]] += 1
out['ndc3_a_prio_fm'] = {str(k): dict(v) for k, v in sorted(tabla.items())}
# cortes inferidos: el menor ndc_3 de cada clase
cortes = {}
for k, v in tabla.items():
    for p in v: cortes[p] = min(cortes.get(p, 9), k)
out['cortes_inferidos_min_ndc3_por_clase'] = dict(sorted(cortes.items()))
def clase(s):
    c = 1
    for p in sorted(cortes):
        if s >= cortes[p] - 1e-9: c = p
    return c
out['reproduce_prio_fm'] = sum(1 for i in range(n) if clase(S[i]) == P[i])
km = lambda cl: sum(L[i] for i in range(n) if cl[i] >= 3)   # prio_fm 3,4,5 = Media, Alta, Muy Alta (prioritario)
base = km(P); out['km_prioritarios_base'] = round(base, 1); out['km_total'] = round(sum(L), 1)
sens = {}
for w in [1/3, 0.4, 0.5, 0.6, 2/3]:
    cl = [clase(w * H[i] + (1 - w) * C[i]) for i in range(n)]
    k = km(cl); cambia = sum(1 for i in range(n) if cl[i] != P[i])
    sens[f'peso_hexagono_{w:.2f}'] = {'km_prioritarios': round(k, 1), 'cambio_pct': round(100 * (k - base) / base, 1), 'frentes_que_cambian_de_clase': cambia}
out['sensibilidad_peso_hexagono_vs_verdor'] = sens
# concordancia colonia/hexágono vs frente (H-016)
out['prio_fm_igual_a_pr_sdm_hx'] = round(100 * sum(1 for i in range(n) if int(H[i]) == P[i]) / n, 1)
out['pr_sdm_hx_0'] = {'frentes': sum(1 for h in H if h == 0), 'clases': dict(collections.Counter(P[i] for i in range(n) if H[i] == 0))}
# «sin arbolado» de la herramienta = ARBOLES de INEGI (3 = No dispone) frente al verdor del modelo (cat_pndvi)
ct = collections.defaultdict(collections.Counter)
for i in range(n): ct[A[i]][int(C[i])] += 1
out['ARBOLES_inegi_x_cat_pndvi'] = {k: dict(sorted(v.items())) for k, v in ct.items()}
out['suelo_conservacion'] = {'frentes': sum(1 for s in SC if s == 1), 'km': round(sum(L[i] for i in range(n) if SC[i] == 1), 1), 'km_prioritarios': round(sum(L[i] for i in range(n) if SC[i] == 1 and P[i] >= 3), 1)}
print(json.dumps(out, ensure_ascii=False, indent=1))
