# D5 · Campos del insumo del modelo (frentes_manzanas_verdes.dbf) y relación entre componentes y prioridad final.
# Uso: python -I d5_campos.py RUTA/frentes_manzanas_verdes.dbf
import sys, collections, shapefile
r = shapefile.Reader(dbf=open(sys.argv[1], 'rb'))
campos = [f[0] for f in r.fields[1:]]; print('campos', campos, 'n', len(r))
recs = r.records(); idx = {c: i for i, c in enumerate(campos)}
for c in campos:
    vals = collections.Counter(rec[idx[c]] for rec in recs)
    print(c, len(vals), list(vals.most_common(8)))
