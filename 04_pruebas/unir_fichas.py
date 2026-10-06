# -*- coding: utf-8 -*-
"""Une el lote de fichas de las alcaldías en un solo PDF y lo empaca en un zip para entregar.

Uso:  python 04_pruebas/unir_fichas.py CARPETA      (la que escribió generar_fichas_alcaldias.js)
Sale: CARPETA/00_todas_las_fichas.pdf y CARPETA.zip. Requiere pypdf (pip install pypdf==6.19.0).
"""
import os
import sys
import zipfile

from pypdf import PdfWriter

if len(sys.argv) != 2 or not os.path.isdir(sys.argv[1]):
    sys.exit('uso: python 04_pruebas/unir_fichas.py CARPETA')
base = os.path.abspath(sys.argv[1])
pdfs = [os.path.join(d, f) for d in sorted(os.path.join(base, x) for x in os.listdir(base) if os.path.isdir(os.path.join(base, x)))
        for f in sorted(os.listdir(d)) if f.endswith('.pdf')]
w = PdfWriter()
for p in pdfs:
    w.append(p)
w.add_metadata({'/Title': 'Fichas de las 16 alcaldías · Modelo de priorización de reforestación urbana',
                '/Author': 'Secretaría del Medio Ambiente de la Ciudad de México · SIA'})
w.compress_identical_objects()   # las fichas comparten tipografías e imágenes: así no se repiten 48 veces
todas = os.path.join(base, '00_todas_las_fichas.pdf')
with open(todas, 'wb') as f:
    w.write(f)
with zipfile.ZipFile(base + '.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for d, _, fs in os.walk(base):
        for f in sorted(fs):
            z.write(os.path.join(d, f), os.path.relpath(os.path.join(d, f), os.path.dirname(base)))
print('%d fichas · %s (%.1f MB) · %s (%.1f MB)' % (len(pdfs), os.path.basename(todas), os.path.getsize(todas) / 1048576,
                                               os.path.basename(base) + '.zip', os.path.getsize(base + '.zip') / 1048576))
