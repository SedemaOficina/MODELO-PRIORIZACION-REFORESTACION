# D3 · Recuenta el CSV del inventario (solo lectura): registros por alcaldía y tipo, y fechas de las imágenes (pano_date)
# de las que salen los puntos; compara con RESUMEN.json. Uso: python d3_inventario.py <csv> <RESUMEN.json>
import csv, json, sys, collections
res = json.load(open(sys.argv[2], encoding='utf-8'))
reg = collections.Counter(); tipo = collections.Counter(); alc_t = collections.Counter(); fechas = collections.Counter(); fechas_rel = collections.Counter(); sin_fecha = 0
REL = {'Cepa Vacante': 0, 'Tocón': 1, 'Árbol Muerto': 2}
with open(sys.argv[1], encoding='utf-8', newline='') as f:
    for r in csv.DictReader(f):
        reg[r['alcaldia']] += 1; tipo[r['registro']] += 1; fechas[r['pano_date'][:4]] += 1
        if r['registro'] in REL:
            alc_t[(r['alcaldia'], REL[r['registro']])] += 1; fechas_rel[r['pano_date'][:4] if r['pano_date'][:2] in ('19','20') else 'sin fecha'] += 1
print('registros por tipo (CSV):', dict(tipo)); print('registros por tipo (RESUMEN):', res['registros_por_tipo'])
print('\nalcaldía | registros CSV | RESUMEN | cv,to,am CSV | RESUMEN puntos | sin frente (RESUMEN)')
nom = {v['nombre']: k for k, v in res['por_alcaldia'].items()}
for n, k in sorted(nom.items(), key=lambda x: x[1]):
    v = res['por_alcaldia'][k]; c = [alc_t[(n, t)] for t in range(3)]
    print('%s %-24s %7d %7d %-20s %-20s %5d (%.1f %%)' % (k, n, reg.get(n, 0), v['registros'], c, v['puntos'], v['sin_frente'], 100 * v['sin_frente'] / max(1, sum(v['puntos']))))
otras = [k for k in reg if k not in nom]; print('\nalcaldías del CSV que no están en RESUMEN:', otras, [reg[k] for k in otras])
print('\nfechas de imagen de los registros (año):', sorted(fechas.items()))
tot = sum(fechas_rel.values()); print('fechas de imagen de cepas, tocones y árboles muertos (año):', sorted(fechas_rel.items())); viejos = sum(v for k, v in fechas_rel.items() if k != 'sin fecha' and k < '2022'); print('anteriores a 2022: %d de %d (%.1f %%); sin fecha: %d (%.1f %%)' % (viejos, tot, 100*viejos/tot, fechas_rel['sin fecha'], 100*fechas_rel['sin fecha']/tot))
print('rango:', min(k for k in fechas_rel if k != 'sin fecha'), '→', max(k for k in fechas_rel if k != 'sin fecha'))
