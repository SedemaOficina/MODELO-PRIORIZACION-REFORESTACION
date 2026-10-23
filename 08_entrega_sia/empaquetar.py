# -*- coding: utf-8 -*-
"""Arma el paquete de entrega para el SIA: un ZIP limpio, para entregarlo por enlace de descarga, con la herramienta, el inicio de
sesión, las capas para GeoServer y los documentos de instalación. No lleva pruebas, demostraciones, borradores ni archivos
de trabajo.

Construye en una carpeta temporal, con los parámetros de la instalación (claves de los mapas de fondo y direcciones de la
sesión) tomados de las variables de entorno o de 02_fuente/claves.local.json; así docs/ y el repositorio no cambian.
La sesión va encendida por omisión (acceso en /priorizacion-reforestacion/acceso/, cierre en /priorizacion-reforestacion/api/salir
y registro de usos en /priorizacion-reforestacion/api/uso); --sin-sesion arma la herramienta sin login.

Uso:  python 08_entrega_sia/empaquetar.py [--sin-sesion] [--revisar]
      --revisar arma y revisa el paquete en la carpeta temporal, pero no escribe el ZIP (para comprobar antes de entregar).
Sale: _local/entrega/modelo-priorizacion-reforestacion_vX.Y_AAAAMMDD.zip y su .zip.sha256   (no se publican; viajan SIEMPRE juntos)
      Dentro: LEEME.md, VERSION.txt, MANIFIESTO.sha256, sitio/, login/, capas_geoserver/ y documentos/.
      MANIFIESTO.sha256 trae la suma de CADA archivo del paquete (salvo él mismo), con rutas relativas a la raíz del
      paquete: se comprueba con «sha256sum -c MANIFIESTO.sha256» desde esa carpeta.

Antes de cerrar el ZIP revisa cada archivo: solo pasan las extensiones previstas para su carpeta (CABEN), nada oculto,
ni variables de entorno, llaves, SQL fuera de login/backend/db/, datos o respaldos, ni contraseñas escritas (SECRETOS).
Si algo no pasa, termina con error, dice qué archivo y por qué, y no deja ZIP.

Los documentos Markdown pierden, al empaquetarse, lo que va entre <!-- solo-repositorio --> y <!-- /solo-repositorio -->
(instrucciones para quien mantiene el repositorio).

Lo versionado (público en GitHub) nombra la infraestructura del SIA con textos genéricos; el paquete, que es para el SIA, lleva
sus nombres reales, tomados de 08_entrega_sia/nombres_sia.local.json (no se publica). Sin ese archivo, el paquete sale con los
textos genéricos y se avisa. Requiere únicamente Python 3.
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
DOCUMENTOS = ['INSTALACION.md', 'nginx_priorizacion_reforestacion.conf.ejemplo', 'LISTA_DE_VERIFICACION.md', 'SESION_Y_LOGIN.md', 'CONTRATO_DE_DATOS.md']
CAPAS = ['frentes_reforestacion', 'vialidades_primarias_reforestacion', 'colonias_reforestacion']
NOMBRES = os.path.join(AQUI, 'nombres_sia.local.json')   # [[texto genérico, texto real], …] en «reemplazos»
SOLO_REPO = re.compile(r'<!-- solo-repositorio -->.*?<!-- /solo-repositorio -->\n?', re.S)
REVISAR = '--revisar' in sys.argv

# Lista blanca: qué extensiones caben en cada carpeta del paquete (rutas dentro del paquete). Una carpeta que no esté aquí
# no viaja. El SQL solo cabe en login/backend/db/priorizacion_reforestacion/; sitio/.nojekyll es el único archivo oculto.
CABEN = {
    '': {'.md', '.txt'},                                                    # LEEME.md y VERSION.txt
    'sitio': {'.html', '.js', '.css'},
    'sitio/datos': {'.bin'}, 'sitio/datos/fondo': {'.bin'}, 'sitio/datos/inventario': {'.bin'},
    'sitio/libs': {'.js', '.txt', '.md'},                                   # librerías y sus licencias
    'sitio/fuentes': {'.woff2', '.txt'},
    'sitio/img': {'.png', '.jpg'},
    'login': {'.md'},
    'login/acceso': {'.html'}, 'login/acceso/admin': {'.html'},
    'login/acceso/recursos': {'.js', '.css', '.woff2', '.png', '.txt'},
    'login/backend/src/modulos/priorizacion-reforestacion': {'.ts'},
    'login/backend/db/priorizacion_reforestacion': {'.sql'},
    'login/backend/herramientas/priorizacion-reforestacion': {'.ts'},
    'capas_geoserver': {'.gpkg', '.sld', '.md', '.sha256'},
    'documentos': {'.md', '.ejemplo'},
}
OCULTOS_PERMITIDOS = {'sitio/.nojekyll'}
BINARIOS = {'.bin', '.gpkg', '.png', '.jpg', '.woff2'}                     # no se buscan contraseñas dentro
# Búsqueda de secretos en el contenido de los archivos de texto. Los valores de ejemplo («…», <valor>, $VARIABLE) no cuentan.
SECRETOS = [
    (re.compile(r'-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----'), 'trae una llave privada'),
    (re.compile(r'(?:^|\s)(?:export\s+)?[A-Z0-9_]*(?:PASSWORD|PASSWD|PASS|PWD|SECRET|TOKEN|API_?KEY)[A-Z0-9_]*\s*=\s*'
                r'(?!process\.env)(?:"[^"\n]{4,}"|\'[^\'\n]{4,}\'|(?![<$…*{%])[^\s"\'`;,(){}<>]{4,}(?=\s|$))', re.M),
     'trae una contraseña o clave escrita (NOMBRE=valor)'),
    (re.compile(r'\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp)://[^\s:/@"\']+:(?![<$…*{%])[^\s@"\']{3,}@', re.I),
     'trae una dirección de base de datos con contraseña'),
]
ENCABEZADO_CONTRASENAS = re.compile(r'contrase|password|passwd', re.I)
TRABAJO = re.compile(r'(pruebas|demo|borrador|privacidad/|\.test\.js|node_modules|_local|\.py$|\.docx$)')

if '--sin-sesion' not in sys.argv:
    os.environ.setdefault('SIA_SESION_INICIO', '/priorizacion-reforestacion/acceso/')
    os.environ.setdefault('SIA_SESION_CIERRE', '/priorizacion-reforestacion/api/salir')
    os.environ.setdefault('SIA_SESION_USO', '/priorizacion-reforestacion/api/uso')

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


def pon_nombres(carpeta):
    """cambia en los archivos de texto del paquete cada texto genérico por el real (nombres_sia.local.json); dice qué hizo"""
    if not os.path.exists(NOMBRES):
        return 'no (falta 08_entrega_sia/nombres_sia.local.json: van los textos genéricos)'
    pares = json.load(open(NOMBRES, encoding='utf-8'))['reemplazos']
    usados, archivos = [0] * len(pares), 0
    for d, _, aa in os.walk(carpeta):
        for a in aa:
            if os.path.splitext(a)[1].lower() in BINARIOS:
                continue
            ruta = os.path.join(d, a)
            txt = open(ruta, encoding='utf-8', newline='').read()
            nuevo = txt
            for k, (generico, real) in enumerate(pares):
                for fin in ('\n', '\r\n'):   # el texto puede tener varias líneas y el archivo, fin de línea de Windows
                    g = generico.replace('\n', fin)
                    usados[k] += nuevo.count(g)
                    nuevo = nuevo.replace(g, real.replace('\n', fin))
            if nuevo != txt:
                open(ruta, 'w', encoding='utf-8', newline='').write(nuevo)
                archivos += 1
    sobran = [pares[k][0] for k, u in enumerate(usados) if not u]
    if sobran:
        sys.exit('ERROR: nombres_sia.local.json trae textos genéricos que ya no están en el paquete (¿cambió la redacción?): '
                 + ' | '.join(sobran))
    return 'sí (%d textos en %d archivos)' % (sum(usados), archivos)


def manifiesto(carpeta):
    lineas = []
    for d, _, archivos in sorted(os.walk(carpeta)):
        for a in sorted(archivos):
            ruta = os.path.join(d, a)
            lineas.append('%s  %s' % (suma(ruta), os.path.relpath(ruta, carpeta).replace(os.sep, '/')))
    return lineas


def motivos(r, ruta):
    """por qué el archivo r (ruta dentro del paquete) no debe viajar al SIA; lista vacía si puede"""
    carpeta, nombre = r.rsplit('/', 1) if '/' in r else ('', r)
    ext, bajo = os.path.splitext(nombre)[1].lower(), nombre.lower()
    m = []
    if bajo.startswith('.env') or bajo.endswith('.env'):
        m.append('archivo de variables de entorno (suele traer contraseñas)')
    elif bajo == 'claves.local.json':
        m.append('claves locales de los mapas de fondo')
    elif ext in ('.pem', '.key', '.p12', '.pfx', '.jks', '.keystore', '.crt', '.cer', '.der') or bajo.startswith(('id_rsa', 'id_ed25519')):
        m.append('llave o certificado')
    elif ext == '.sql' and carpeta != 'login/backend/db/priorizacion_reforestacion':
        m.append('SQL fuera de login/backend/db/priorizacion_reforestacion/ (puede ser un volcado de la base)')
    elif ext in ('.csv', '.tsv', '.xlsx', '.xls', '.ods', '.dump', '.backup', '.bak', '.sqlite', '.sqlite3', '.db', '.zip', '.rar', '.7z'):
        m.append('datos, respaldo o comprimido (puede traer datos personales)')
    elif any(p.startswith('.') for p in r.split('/')) and r not in OCULTOS_PERMITIDOS:
        m.append('archivo o carpeta oculta')
    elif TRABAJO.search(r):
        m.append('archivo de trabajo (pruebas, demostración, borrador o programa del repositorio)')
    elif carpeta not in CABEN:
        m.append('carpeta no prevista en el paquete')
    elif ext not in CABEN[carpeta] and r not in OCULTOS_PERMITIDOS:
        m.append('extensión «%s» no prevista en %s/' % (ext or '(sin extensión)', carpeta or 'la raíz'))
    if ext not in BINARIOS:   # búsqueda de secretos en el contenido
        texto = open(ruta, encoding='utf-8', errors='replace').read()
        m += [por for patron, por in SECRETOS if patron.search(texto)]
        if ext in ('.csv', '.tsv', '.txt', ''):
            primera = next((l for l in texto.split('\n') if l.strip()), '')
            if re.search(r'[,;\t]', primera) and ENCABEZADO_CONTRASENAS.search(primera):
                m.append('parece una lista de cuentas con contraseñas (por su encabezado)')
    return m


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

    # 1. la herramienta, solo con los archivos que le corresponden
    shutil.copytree(os.path.join(t, 'docs'), os.path.join(base, 'sitio'))
    lineas = manifiesto(os.path.join(base, 'sitio'))
    ajenos = [l.split('  ')[1] for l in lineas if not re.match(r'^(index\.html|app\.js|estilos\.css|config\.js|sw\.js|\.nojekyll|datos/|libs/|fuentes/|img/)', l.split('  ')[1])]
    if ajenos:
        sys.exit('ERROR: el sitio trae archivos que no se esperaban: ' + ', '.join(ajenos))
    # el inventario de arbolado va completo: los archivos por alcaldía (capa «Espacios para plantar») y los del filtro «Espacio»
    # (frentes de manzana y, desde la v1.24, vialidades primarias del Gobierno Central)
    inv = json.load(open(os.path.join(t, '02_fuente', 'datos', 'inventario', 'SUMAS.json'), encoding='utf-8'))
    en_sitio = {l.split('  ')[1] for l in lineas}
    faltan = [n for n in sorted(inv) if 'datos/inventario/' + n not in en_sitio] + [n for n in ('espacios_frentes.bin', 'espacios_vp.bin') if n not in inv]
    if faltan:
        sys.exit('ERROR: al sitio le faltan archivos del inventario de arbolado: ' + ', '.join(faltan))

    # 2. inicio de sesión: pantalla de acceso y, con la estructura del repositorio sia-backend, el módulo (src/modulos/),
    #    su SQL (db/) y la herramienta de la primera cuenta (herramientas/). Sin pruebas, demostraciones ni package.json:
    #    el módulo vive dentro de sia-backend y usa sus dependencias. src/comun/ NO va: en sia-backend se usa el del SIA.
    L = os.path.join(AQUI, 'login')
    shutil.copytree(os.path.join(L, 'acceso'), os.path.join(base, 'login', 'acceso'))
    for parte in (('src', 'modulos', 'priorizacion-reforestacion'), ('db', 'priorizacion_reforestacion'), ('herramientas', 'priorizacion-reforestacion')):
        shutil.copytree(os.path.join(L, 'backend', *parte), os.path.join(base, 'login', 'backend', *parte))
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
        'Archivos del sitio: %d\nClave de Esri incluida: %s\nInicio de sesión: %s\n'
        % (version, fecha, time.strftime('%Y-%m-%d %H:%M'), corte, len(lineas), con('SIA_ESRI_KEY'),
           ('acceso en %s, cierre en %s, registro de usos en %s' % (sesion['inicio'], sesion['cierre'], sesion.get('uso') or '(por omisión)'))
           if sesion.get('inicio') else 'no'))

    # 4 bis. nombres reales de la infraestructura del SIA en lugar de los textos genéricos de lo versionado (F4-02)
    nombres = pon_nombres(base)

    # 5. revisión de cada archivo, antes de cerrar nada: lista blanca por carpeta y búsqueda de secretos (ver motivos()).
    #    Se reportan TODOS los que no pasan, no solo el primero; el ZIP no se escribe.
    todo = sorted(os.path.relpath(os.path.join(d, a), base).replace(os.sep, '/') for d, _, aa in os.walk(base) for a in aa)
    malos = [(r, motivos(r, os.path.join(base, r))) for r in todo]
    malos = [(r, m) for r, m in malos if m]
    if malos:
        sys.exit('ERROR: no se armó el paquete; %d archivo(s) no deben viajar al SIA (rutas dentro del paquete; login/ y '
                 'capas_geoserver/ salen de 08_entrega_sia/):\n%s\nQuitarlos (o moverlos a _to_delete/) y volver a correr.'
                 % (len(malos), '\n'.join('  - %s: %s' % (r, '; '.join(m)) for r, m in malos)))
    if REVISAR:
        cuenta = {}
        for r in todo:
            k = r.split('/')[0] if '/' in r else 'raíz'
            cuenta[k] = cuenta.get(k, 0) + 1
        print('revisión correcta: %d archivos (%s); sin archivos ajenos ni secretos. No se escribió el ZIP (--revisar).'
              % (len(todo), ', '.join('%s %d' % kv for kv in sorted(cuenta.items()))))
        print('nombres del SIA: ' + nombres)
        sys.exit(0)

    # 6. manifiesto de TODO el paquete (salvo él mismo), con rutas relativas a su raíz: «sha256sum -c MANIFIESTO.sha256»
    general = manifiesto(base)
    open(os.path.join(base, 'MANIFIESTO.sha256'), 'w', encoding='utf-8', newline='\n').write('\n'.join(general) + '\n')
    todo.append('MANIFIESTO.sha256')
    salida = os.path.join(RAIZ, '_local', 'entrega')
    os.makedirs(salida, exist_ok=True)
    destino = os.path.join(salida, nombre + '.zip')
    # se escribe con otro nombre y se renombra al final: si algo falla a medio camino, no queda un ZIP a medias
    parcial = destino + '.parcial'
    try:
        with zipfile.ZipFile(parcial, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
            for r in sorted(todo):
                z.write(os.path.join(base, r), nombre + '/' + r)
        os.replace(parcial, destino)
    finally:
        if os.path.exists(parcial):
            os.remove(parcial)
finally:
    shutil.rmtree(t, ignore_errors=True)
# la suma del ZIP va en un archivo aparte, junto a él (dentro cambiaría el ZIP); formato de sha256sum -c
open(destino + '.sha256', 'w', encoding='utf-8', newline='\n').write('%s  %s\n' % (suma(destino), os.path.basename(destino)))
print('paquete: %s (%.1f MB, %d archivos; %d del sitio; MANIFIESTO.sha256 con %d sumas)'
      % (os.path.relpath(destino, RAIZ), os.path.getsize(destino) / 1048576, len(todo), len(lineas), len(general)))
print('suma del paquete: %s (también en %s.sha256)' % (suma(destino), os.path.basename(destino)))
print('Entregar SIEMPRE juntos, en el mismo enlace: %s y %s.sha256' % (os.path.basename(destino), os.path.basename(destino)))
print('versión %s · clave Esri: %s · sesión: %s · nombres del SIA: %s' % (version, con('SIA_ESRI_KEY'), sesion.get('inicio') or 'no', nombres))
