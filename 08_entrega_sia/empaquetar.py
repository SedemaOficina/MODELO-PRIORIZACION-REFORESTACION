# -*- coding: utf-8 -*-
"""Arma el paquete de entrega para el SIA: la carpeta del sitio, su manifiesto de sumas y los documentos de instalación.

Construye en una carpeta temporal, con los parámetros de la instalación (claves de los mapas de fondo y direcciones de la
sesión) tomados de las variables de entorno o de 02_fuente/claves.local.json; así docs/ y el repositorio no cambian.

Uso:  python3 08_entrega_sia/empaquetar.py
      SIA_SESION_INICIO=/acceso/calles SIA_SESION_CIERRE=/api/calles/salir python3 08_entrega_sia/empaquetar.py
Sale: _local/entrega/calles-prioritarias_vX.Y_AAAAMMDD.tar.gz   (no se publica): sitio/, documentos/, login/, MANIFIESTO.sha256 y VERSION.txt
Con login: SIA_SESION_INICIO=/acceso/calles/ SIA_SESION_CIERRE=/api/calles/salir python3 08_entrega_sia/empaquetar.py
Requiere únicamente Python 3.
"""
import hashlib
import os
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
DOCUMENTOS = ['LEEME.md', 'INSTALACION.md', 'nginx_calles_prioritarias.conf.ejemplo', 'LISTA_DE_VERIFICACION.md',
              'SESION_Y_LOGIN.md', 'CONTRATO_DE_DATOS.md', 'CIERRE_FASE_1.md']

# Permisos fijos en el paquete: armado en Windows quedaría con archivos y carpetas escribibles por cualquier usuario (0666/0777)
# y, al extraerlo como root, alguien podría cambiarlo entre la verificación de sumas y la copia. Dueño root, 0644 y 0755.
def permisos(info):
    info.uid = info.gid = 0
    info.uname = info.gname = 'root'
    info.mode = 0o755 if info.isdir() else 0o644
    return info


t = tempfile.mkdtemp(prefix='entrega-')
try:   # la carpeta temporal lleva una copia de 02_fuente (con claves.local.json, si existe): se borra aunque algo falle
    shutil.copytree(os.path.join(RAIZ, '02_fuente'), os.path.join(t, '02_fuente'), ignore=shutil.ignore_patterns('__pycache__'))
    shutil.copy(os.path.join(RAIZ, 'README.md'), t)
    p = subprocess.run([sys.executable, os.path.join(t, '02_fuente', 'construir.py')], capture_output=True, text=True)
    if p.returncode != 0:
        sys.exit('ERROR: la construcción falló; no se armó el paquete.\n' + p.stdout + p.stderr)
    fuente = open(os.path.join(RAIZ, '02_fuente', 'construir.py'), encoding='utf-8').read()
    version = re.search(r"^VERSION = '([^']+)'", fuente, re.M).group(1)
    corte = re.search(r"^CORTE_DATOS = '([^']+)'", fuente, re.M).group(1)
    nombre = 'calles-prioritarias_v%s_%s' % (version, time.strftime('%Y%m%d'))
    base = os.path.join(t, nombre)
    shutil.copytree(os.path.join(t, 'docs'), os.path.join(base, 'sitio'))
    os.makedirs(os.path.join(base, 'documentos'))
    for d in DOCUMENTOS:
        shutil.copy(os.path.join(AQUI, d), os.path.join(base, 'documentos', d))
    shutil.copy(os.path.join(RAIZ, 'ARQUITECTURA.md'), os.path.join(base, 'documentos', 'ARQUITECTURA.md'))
    # inicio de sesión y registro de usos (v17.37): pantalla de acceso, módulo del backend, esquema, avisos de privacidad (ver login/LEEME.md)
    shutil.copytree(os.path.join(AQUI, 'login'), os.path.join(base, 'login'), ignore=shutil.ignore_patterns('node_modules', '__pycache__', '*.log'))

    # manifiesto: suma de cada archivo del sitio, en el formato de sha256sum (se verifica con: cd sitio && sha256sum -c ../MANIFIESTO.sha256)
    lineas = []
    for carpeta, _, archivos in sorted(os.walk(os.path.join(base, 'sitio'))):
        for a in sorted(archivos):
            ruta = os.path.join(carpeta, a)
            lineas.append('%s  %s' % (hashlib.sha256(open(ruta, 'rb').read()).hexdigest(), os.path.relpath(ruta, os.path.join(base, 'sitio')).replace(os.sep, '/')))
    open(os.path.join(base, 'MANIFIESTO.sha256'), 'w', encoding='utf-8', newline='\n').write('\n'.join(lineas) + '\n')
    config = open(os.path.join(base, 'sitio', 'config.js'), encoding='utf-8').read()
    con = lambda clave: 'sí' if re.search(r'window\.%s = "[^"]+' % clave, config) else 'no'
    sesion = re.search(r'window\.SIA_SESION = (\{[^}]*\})', config).group(1)
    open(os.path.join(base, 'VERSION.txt'), 'w', encoding='utf-8', newline='\n').write(
        'Calles prioritarias para reforestar\nVersión: %s\nPaquete armado: %s\nCorte de los datos: %s\nArchivos del sitio: %d\n'
        'Clave de CARTO incluida: %s\nClave de Esri incluida: %s\nSesión: %s\n'
        % (version, time.strftime('%Y-%m-%d %H:%M'), corte, len(lineas), con('SIA_CARTO_KEY'), con('SIA_ESRI_KEY'), sesion))

    # comprobación: el manifiesto corresponde a lo empaquetado y no se coló nada ajeno al sitio
    ajenos = [l.split('  ')[1] for l in lineas if not re.match(r'^(index\.html|app\.js|estilos\.css|config\.js|sw\.js|\.nojekyll|datos/|libs/|fuentes/|img/)', l.split('  ')[1])]
    if ajenos:
        sys.exit('ERROR: el sitio trae archivos que no se esperaban: ' + ', '.join(ajenos))
    salida = os.path.join(RAIZ, '_local', 'entrega')
    os.makedirs(salida, exist_ok=True)
    destino = os.path.join(salida, nombre + '.tar.gz')
    with tarfile.open(destino, 'w:gz') as tar:
        tar.add(base, arcname=nombre, filter=permisos)
finally:
    shutil.rmtree(t, ignore_errors=True)
print('paquete: %s (%.1f MB, %d archivos del sitio)' % (os.path.relpath(destino, RAIZ), os.path.getsize(destino) / 1048576, len(lineas)))
print('suma del paquete (anotarla al entregar): ' + hashlib.sha256(open(destino, 'rb').read()).hexdigest())
print('versión %s · clave CARTO: %s · clave Esri: %s · sesión: %s' % (version, con('SIA_CARTO_KEY'), con('SIA_ESRI_KEY'), sesion))
