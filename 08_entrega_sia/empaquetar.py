# -*- coding: utf-8 -*-
"""Arma el paquete de entrega para el SIA: un ZIP limpio, para entregarlo en memoria USB, con la herramienta, el inicio de
sesión, las capas para GeoServer y los documentos de instalación. No lleva pruebas, demostraciones, borradores ni archivos
de trabajo.

Construye en una carpeta temporal, con los parámetros de la instalación (claves de los mapas de fondo y direcciones de la
sesión) tomados de las variables de entorno o de 02_fuente/claves.local.json; así docs/ y el repositorio no cambian.
La sesión va encendida por omisión (/acceso/calles/ y /api/calles/salir); --sin-sesion arma la herramienta sin login.

Uso:  python 08_entrega_sia/empaquetar.py [--sin-sesion]
Sale: _local/entrega/modelo-priorizacion-reforestacion_vX.Y_AAAAMMDD.zip   (no se publica)
      LEEME.md, VERSION.txt, MANIFIESTO.sha256, sitio/, login/, capas_geoserver/ y documentos/

Los documentos Markdown pierden, al empaquetarse, lo que va entre <!-- solo-repositorio --> y <!-- /solo-repositorio -->
(instrucciones para quien mantiene el repositorio). Requiere únicamente Python 3.
"""
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import zipfile

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
DOCUMENTOS = ['INSTALACION.md', 'nginx_calles_prioritarias.conf.ejemplo', 'LISTA_DE_VERIFICACION.md', 'SESION_Y_LOGIN.md']
CAPAS = ['frentes_reforestacion', 'vialidades_primarias_reforestacion', 'colonias_reforestacion']
SOLO_REPO = re.compile(r'<!-- solo-repositorio -->.*?<!-- /solo-repositorio -->\n?', re.S)

if '--sin-sesion' not in sys.argv:
    os.environ.setdefault('SIA_SESION_INICIO', '/acceso/calles/')
    os.environ.setdefault('SIA_SESION_CIERRE', '/api/calles/salir')

suma = lambda ruta: hashlib.sha256(open(ruta, 'rb').read()).hexdigest()


def copia_doc(origen, destino):
    """copia un documento sin las partes que solo sirven en el repositorio"""
    t = open(origen, encoding='utf-8').read()
    if origen.endswith('.md'):
        t = SOLO_REPO.sub('', t)
        if 'solo-repositorio' in t:
            sys.exit('ERROR: marca «solo-repositorio» sin cerrar en ' + origen)
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    open(destino, 'w', encoding='utf-8', newline='\n').write(t)


def manifiesto(carpeta):
    lineas = []
    for d, _, archivos in sorted(os.walk(carpeta)):
        for a in sorted(archivos):
            ruta = os.path.join(d, a)
            lineas.append('%s  %s' % (suma(ruta), os.path.relpath(ruta, carpeta).replace(os.sep, '/')))
    return lineas


t = tempfile.mkdtemp(prefix='entrega-')
try:   # la carpeta temporal lleva una copia de 02_fuente (con claves.local.json, si existe): se borra aunque algo falle
    shutil.copytree(os.path.join(RAIZ, '02_fuente'), os.path.join(t, '02_fuente'), ignore=shutil.ignore_patterns('__pycache__'))
    shutil.copy(os.path.join(RAIZ, 'README.md'), t)
    p = subprocess.run([sys.executable, os.path.join(t, '02_fuente', 'construir.py')], capture_output=True, text=True)
    if p.returncode != 0:
        sys.exit('ERROR: la construcción falló; no se armó el paquete.\n' + p.stdout + p.stderr)
    fuente = open(os.path.join(RAIZ, '02_fuente', 'construir.py'), encoding='utf-8').read()
    version = re.search(r"^VERSION = '([^']+)'", fuente, re.M).group(1)
    fecha = re.search(r"^ACTUALIZACION = '([^']+)'", fuente, re.M).group(1)
    corte = re.search(r"^CORTE_DATOS = '([^']+)'", fuente, re.M).group(1)
    nombre = 'modelo-priorizacion-reforestacion_v%s_%s' % (version, time.strftime('%Y%m%d'))
    base = os.path.join(t, nombre)

    # 1. la herramienta y su manifiesto
    shutil.copytree(os.path.join(t, 'docs'), os.path.join(base, 'sitio'))
    lineas = manifiesto(os.path.join(base, 'sitio'))
    ajenos = [l.split('  ')[1] for l in lineas if not re.match(r'^(index\.html|app\.js|estilos\.css|config\.js|sw\.js|\.nojekyll|datos/|libs/|fuentes/|img/)', l.split('  ')[1])]
    if ajenos:
        sys.exit('ERROR: el sitio trae archivos que no se esperaban: ' + ', '.join(ajenos))
    open(os.path.join(base, 'MANIFIESTO.sha256'), 'w', encoding='utf-8', newline='\n').write('\n'.join(lineas) + '\n')

    # 2. inicio de sesión: pantalla de acceso, módulo del backend, esquema y scripts de administración (sin pruebas ni demostraciones)
    L = os.path.join(AQUI, 'login')
    shutil.copytree(os.path.join(L, 'acceso'), os.path.join(base, 'login', 'acceso'))
    shutil.copytree(os.path.join(L, 'backend', 'src'), os.path.join(base, 'login', 'backend', 'src'))
    shutil.copytree(os.path.join(L, 'backend', 'sql'), os.path.join(base, 'login', 'backend', 'sql'))
    os.makedirs(os.path.join(base, 'login', 'backend', 'scripts'))
    for s in ('crear_admin.js', 'alta_masiva.js'):
        shutil.copy(os.path.join(L, 'backend', 'scripts', s), os.path.join(base, 'login', 'backend', 'scripts', s))
    paq = json.load(open(os.path.join(L, 'backend', 'package.json'), encoding='utf-8'))
    paq.pop('devDependencies', None)
    paq['scripts'] = {k: v for k, v in paq.get('scripts', {}).items() if 'pruebas' not in v and 'demo' not in v}
    open(os.path.join(base, 'login', 'backend', 'package.json'), 'w', encoding='utf-8', newline='\n').write(json.dumps(paq, ensure_ascii=False, indent=2) + '\n')
    copia_doc(os.path.join(L, 'LEEME.md'), os.path.join(base, 'login', 'LEEME.md'))

    # 3. capas para GeoServer, comprobadas contra su manifiesto
    C = os.path.join(AQUI, 'capas_geoserver')
    esperadas = dict(l.split('  ')[::-1] for l in open(os.path.join(C, 'MANIFIESTO.sha256'), encoding='utf-8').read().split('\n') if l.strip())
    os.makedirs(os.path.join(base, 'capas_geoserver'))
    for c in CAPAS:
        for ext in ('.gpkg', '.sld'):
            origen = os.path.join(C, c + ext)
            if not os.path.exists(origen):
                sys.exit('ERROR: falta %s; regenerar con 03_procesamiento_datos/5_exportar_geoserver.py' % (c + ext))
            if esperadas.get(c + ext) != suma(origen):
                sys.exit('ERROR: %s no coincide con capas_geoserver/MANIFIESTO.sha256' % (c + ext))
            shutil.copy(origen, os.path.join(base, 'capas_geoserver'))
    shutil.copy(os.path.join(C, 'MANIFIESTO.sha256'), os.path.join(base, 'capas_geoserver'))
    copia_doc(os.path.join(C, 'LEEME.md'), os.path.join(base, 'capas_geoserver', 'LEEME.md'))

    # 4. documentos y portada
    for d in DOCUMENTOS:
        copia_doc(os.path.join(AQUI, d), os.path.join(base, 'documentos', d))
    copia_doc(os.path.join(AQUI, 'LEEME_PAQUETE.md'), os.path.join(base, 'LEEME.md'))
    config = open(os.path.join(base, 'sitio', 'config.js'), encoding='utf-8').read()
    con = lambda clave: 'sí' if re.search(r'window\.%s = "[^"]+' % clave, config) else 'no'
    sesion = json.loads(re.search(r'window\.SIA_SESION = (\{[^}]*\})', config).group(1))
    open(os.path.join(base, 'VERSION.txt'), 'w', encoding='utf-8', newline='\n').write(
        'Modelo de priorización de reforestación urbana\nVersión: %s\nÚltima actualización: %s\nPaquete armado: %s\nCorte de los datos: %s\n'
        'Archivos del sitio: %d\nClave de CARTO incluida: %s\nClave de Esri incluida: %s\nInicio de sesión: %s\n'
        % (version, fecha, time.strftime('%Y-%m-%d %H:%M'), corte, len(lineas), con('SIA_CARTO_KEY'), con('SIA_ESRI_KEY'),
           ('acceso en %s, cierre en %s' % (sesion['inicio'], sesion['cierre'])) if sesion.get('inicio') else 'no'))

    # 5. comprobación final: nada de trabajo ni de pruebas en el paquete
    todo = [os.path.relpath(os.path.join(d, a), base).replace(os.sep, '/') for d, _, aa in os.walk(base) for a in aa]
    prohibidos = [r for r in todo if re.search(r'(pruebas|demo|borrador|privacidad/|\.test\.js|node_modules|_local|\.py$|\.docx$|claves\.local)', r)]
    if prohibidos:
        sys.exit('ERROR: se colaron archivos de trabajo: ' + ', '.join(prohibidos))
    salida = os.path.join(RAIZ, '_local', 'entrega')
    os.makedirs(salida, exist_ok=True)
    destino = os.path.join(salida, nombre + '.zip')
    with zipfile.ZipFile(destino, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for r in sorted(todo):
            z.write(os.path.join(base, r), nombre + '/' + r)
finally:
    shutil.rmtree(t, ignore_errors=True)
print('paquete: %s (%.1f MB, %d archivos; %d del sitio)' % (os.path.relpath(destino, RAIZ), os.path.getsize(destino) / 1048576, len(todo), len(lineas)))
print('suma del paquete (anotarla al entregar): ' + suma(destino))
print('versión %s · clave CARTO: %s · clave Esri: %s · sesión: %s' % (version, con('SIA_CARTO_KEY'), con('SIA_ESRI_KEY'), sesion.get('inicio') or 'no'))
