# -*- coding: utf-8 -*-
"""Prueba de la construcción (auditoría H-026, H-024 y H-025): construir.py debe dar el mismo sitio desde cero, detenerse
ANTES de escribir si falta o sobra una pieza, no publicar archivos imprevistos y apartar lo obsoleto sin borrarlo.

Trabaja sobre copias en una carpeta temporal: no toca la carpeta del proyecto.
Uso:  python3 04_pruebas/prueba_construccion.py     · termina con código 1 si algo falla. Requiere únicamente Python 3.
"""
import hashlib
import os
import shutil
import subprocess
import sys
import tempfile

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fallas = []


def ok(nombre, cond, detalle=''):
    print(('OK    ' if cond else 'FALLA ') + nombre + (' · ' + str(detalle) if detalle else ''))
    if not cond:
        fallas.append(nombre)


def huellas(carpeta):
    r = {}
    for d, _, fs in os.walk(carpeta):
        for f in fs:
            p = os.path.join(d, f)
            r[os.path.relpath(p, carpeta).replace(os.sep, '/')] = hashlib.sha256(open(p, 'rb').read()).hexdigest()
    return r


def copia():
    t = tempfile.mkdtemp(prefix='construccion-')
    shutil.copytree(os.path.join(RAIZ, '02_fuente'), os.path.join(t, '02_fuente'), ignore=shutil.ignore_patterns('__pycache__'))
    shutil.copy(os.path.join(RAIZ, 'README.md'), t)
    return t


def construir(t, *args):
    p = subprocess.run([sys.executable, os.path.join(t, '02_fuente', 'construir.py'), *args], capture_output=True, text=True)
    return p.returncode, p.stdout + p.stderr


publicado = huellas(os.path.join(RAIZ, 'docs'))

# 1) desde cero: mismo sitio que el publicado
t = copia()
cod, sal = construir(t)
nuevo = huellas(os.path.join(t, 'docs'))
dif = sorted(k for k in set(publicado) | set(nuevo) if publicado.get(k) != nuevo.get(k))
ok('construir desde cero termina sin error', cod == 0, sal.strip().splitlines()[-1] if sal.strip() else '')
ok('el sitio construido desde cero es idéntico a docs/', not dif, ', '.join(dif[:6]))
ok('se genera docs/.nojekyll', '.nojekyll' in nuevo)
ok('se generan el archivo único y las cifras', os.path.isfile(os.path.join(t, '_local', 'calles_prioritarias.html')) and os.path.isfile(os.path.join(t, '05_documentacion', 'cifras_de_la_construccion.md')))
# 2) segunda construcción: no reescribe nada
antes = {k: os.path.getmtime(os.path.join(t, 'docs', *k.split('/'))) for k in nuevo}
construir(t)
ok('una segunda construcción sin cambios no reescribe ningún archivo de docs/', all(os.path.getmtime(os.path.join(t, 'docs', *k.split('/'))) == v for k, v in antes.items()))
# 3) fuentes con fin de línea de Windows: mismo sitio (el código y los estilos se leen como texto)
def a_crlf(p):
    b = open(p, 'rb').read().replace(b'\r\n', b'\n').replace(b'\n', b'\r\n')
    open(p, 'wb').write(b)


for carpeta in ('js', 'css'):
    for f in os.listdir(os.path.join(t, '02_fuente', carpeta)):
        a_crlf(os.path.join(t, '02_fuente', carpeta, f))
a_crlf(os.path.join(t, '02_fuente', 'plantilla.html'))
cod, sal = construir(t)
ok('con el código fuente en formato de Windows (CRLF) el sitio es el mismo', cod == 0 and huellas(os.path.join(t, 'docs')) == nuevo)
# 4) archivo obsoleto en docs/: se aparta en _to_delete/, no se borra
open(os.path.join(t, 'docs', 'viejo.js'), 'w').write('x')
cod, sal = construir(t)
apartado = [os.path.join(d, f) for d, _, fs in os.walk(os.path.join(t, '_to_delete')) for f in fs] if os.path.isdir(os.path.join(t, '_to_delete')) else []
ok('un archivo obsoleto de docs/ se mueve a _to_delete/ y se avisa', cod == 0 and not os.path.exists(os.path.join(t, 'docs', 'viejo.js')) and any(a.endswith('viejo.js') for a in apartado) and 'viejo.js' in sal)
# 5) archivo imprevisto en libs/: no se publica
open(os.path.join(t, '02_fuente', 'libs', 'notas_internas.txt'), 'w').write('no publicar')
cod, sal = construir(t)
ok('un archivo imprevisto en libs/ no se publica y se avisa', cod == 0 and not os.path.exists(os.path.join(t, 'docs', 'libs', 'notas_internas.txt')) and 'notas_internas.txt' in sal)
shutil.rmtree(t, ignore_errors=True)


def debe_fallar(nombre, prepara, *args):
    t = copia()
    prepara(t)
    cod, sal = construir(t, *args)
    ok(nombre, cod != 0 and not os.path.exists(os.path.join(t, 'docs')) and not os.path.exists(os.path.join(t, '_local')), 'código %d · %s' % (cod, sal.strip().splitlines()[0][:90] if sal.strip() else ''))
    shutil.rmtree(t, ignore_errors=True)


F = lambda t, *r: os.path.join(t, '02_fuente', *r)
debe_fallar('falta un módulo de lógica: se detiene y no escribe nada', lambda t: os.remove(F(t, 'js', '10_seleccion.js')))
debe_fallar('sobra una hoja de estilos (copia accidental): se detiene y no escribe nada', lambda t: shutil.copy(F(t, 'css', '02_base.css'), F(t, 'css', '02_base copia.css')))
debe_fallar('falta una librería: se detiene y no escribe nada', lambda t: os.remove(F(t, 'libs', 'pako.js')))
debe_fallar('datos cortados: se detiene y no escribe nada', lambda t: open(F(t, 'datos', 'data.bin'), 'r+b').truncate(100000))
debe_fallar('datos distintos de los registrados: se detiene y no escribe nada', lambda t: shutil.copy(F(t, 'datos', 'vp.bin'), F(t, 'datos', 'data.bin')))
debe_fallar('argumento desconocido: se detiene y no escribe nada', lambda t: None, '--publicar')
debe_fallar('un módulo vacío: se detiene y no escribe nada', lambda t: open(F(t, 'js', '08_resumenes.js'), 'w').close())
debe_fallar('plantilla sin el marcador de estilos: se detiene y no escribe nada', lambda t: open(F(t, 'plantilla.html'), 'w', encoding='utf-8').write(open(os.path.join(RAIZ, '02_fuente', 'plantilla.html'), encoding='utf-8').read().replace('<!-- ESTILOS -->', '')))

print('\n[construcción] %d falla(s)' % len(fallas))
sys.exit(1 if fallas else 0)
