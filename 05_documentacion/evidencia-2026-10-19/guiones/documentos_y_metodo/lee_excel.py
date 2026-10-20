# Lee un Excel de la herramienta (rutas largas de Windows incluidas): renglones por alcaldía y renglones clave del Diccionario.
# Uso: python -I lee_excel.py ARCHIVO.xlsx
import sys, os, io, json, collections, openpyxl
B = chr(92); p = os.path.abspath(sys.argv[1])
if os.name == 'nt' and not p.startswith(B + B + '?'): p = B + B + '?' + B + p.replace('/', B)
wb = openpyxl.load_workbook(io.BytesIO(open(p, 'rb').read()), read_only=True)
rows = list(wb['Datos'].iter_rows(values_only=True)); i = rows[0].index('alcaldia') if 'alcaldia' in rows[0] else None
d = {r[0]: r[1] for r in wb['Diccionario'].iter_rows(values_only=True) if r and r[0]}
print(json.dumps({'renglones_por_alcaldia': collections.Counter(r[i] for r in rows[1:]) if i is not None else None,
  'ambito_consultado': d.get('Ámbito consultado'), 'registros': d.get('Registros'),
  'extra': {k: v for k, v in d.items() if isinstance(k, str) and ('prioritario' in k.lower() or 'Espacios' in k)}}, ensure_ascii=False, default=str))
