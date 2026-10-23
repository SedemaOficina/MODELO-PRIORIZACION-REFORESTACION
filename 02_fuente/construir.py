# -*- coding: utf-8 -*-
"""Arma la herramienta "Modelo de priorización de reforestación urbana" a partir de sus piezas.

Piezas (todas en esta carpeta; ver ARQUITECTURA.md en la raíz):
  plantilla.html   estructura de la página (sin estilos ni código)
  css/*.css        estilos, en orden de aplicación (01_variables … 10_dos_pantallas)
  js/*.js          lógica, un archivo por tema, en orden de ejecución (01_utilidades … 17_recorrido);
                   se unen en un solo app.js dentro de una función asíncrona
  datos/*.bin      frentes, catálogos y vialidades primarias (varint + gzip)
  datos/nombres_colonias.json   nombre para mostrar de cada colonia que lo cambia (03_procesamiento_datos/7_nombres_colonias.py)
  datos/fondo/     fondo propio del mapa (opción «Calles»): manzanas por alcaldía, parques, agua, ANP y AVA
                   (de 03_procesamiento_datos/6_fondo.py); se piden solo al encender ese fondo
  datos/inventario/ espacios para plantar del inventario de arbolado (cepas vacantes, tocones y árboles muertos), por alcaldía
                   (de 03_procesamiento_datos/9_inventario_espacios.py); se piden al acercar el mapa. Con ellos,
                   espacios_frentes.bin: cuántos puntos de cada tipo tiene cada frente (filtro «Espacio» y orden por cepas de
                   «Dónde empezar»; se pide al usarlos) y espacios_vp.bin: lo mismo para cada parte de vialidad primaria del
                   Gobierno Central (por su frente o en el camellón; se pide junto con el anterior)
  img/             logotipo y lámina de la metodología
  libs/            deck.gl, pako, jsPDF y SheetJS (copias locales sin modificar, con LICENCIAS.md y el texto de cada licencia)
  fuentes/         tipografías Cabin y Roboto (woff2 variables, subconjunto latino) con su licencia OFL;
                   se sirven desde el propio sitio: la página no pide nada a terceros para arrancar

Salidas:
  ../docs/                               sitio para GitHub Pages y el SIA: página, estilos, código,
                                         datos, librerías e imágenes en archivos aparte
  ../_local/priorizacion_reforestacion.html     un solo archivo para abrir con doble clic, con librerías, tipografías y datos
                                         incrustados: no pide nada a terceros (no se publica)
  ../05_documentacion/cifras_de_la_construccion.md   tamaños y conteos medidos en esta construcción

Uso:  python 02_fuente/construir.py
"""
import base64
import gzip
import hashlib
import json
import os
import sys
import time
import zlib

FUENTE = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(FUENTE)
DOCS = os.path.join(RAIZ, 'docs')

# Esqueleto de página completa con idioma y la instrucción de no
# aparecer en buscadores. Para permitir la difusión, dejar ROBOTS = ''.
ROBOTS = '<meta name="robots" content="noindex, nofollow">'
ESQUELETO = ('<!doctype html><html lang="es-MX"><head><meta charset="utf-8">'
             '<meta name="viewport" content="width=device-width,initial-scale=1">'
             '{CABEZA}</head><body>\n')
# Librerías: en el arranque (deck, pako) y bajo demanda (Excel y fichas PDF). Todas salen de libs/, en el sitio y en el archivo único.
LIBS_ARRANQUE = ('deck.js', 'pako.js')
LIBS_DEMANDA = ('xlsx.js', 'jspdf.js')
IMAGENES = {'img/logo_institucional.png': 'image/png', 'img/composicion_frentes_manzana.jpg': 'image/jpeg'}
DATOS = ('meta', 'data', 'vp')
# Tipografías servidas desde el sitio (familia -> archivo en fuentes/). Peso variable de 400 a 700.
FUENTES = {'Cabin': 'cabin.woff2', 'Roboto': 'roboto.woff2'}
# Clave (API key) de ArcGIS Location Platform para el fondo satelital de Esri. Vacía = World Imagery y nombres de
# vías (World_Transportation) desde services.arcgisonline.com, sin clave (pendiente de regularizar con cuenta de Esri).
# La clave queda visible en la página (es normal en mapas web): restringirla al dominio del sitio en el panel de Esri.
ESRI_KEY = ''
# Las claves NO se escriben en este archivo, que es público. Se toman, en este orden, de las variables de
# entorno SIA_ESRI_KEY o del archivo 02_fuente/claves.local.json (no se publica; ver .gitignore):
#   {"ESRI_KEY": "…"}
# Al construir con claves, estas quedan en docs/config.js: son visibles para quien abra la página (es lo normal en mapas web),
# así que deben restringirse al dominio del sitio en el panel de cada proveedor.
_claves = {}
if os.path.isfile(os.path.join(FUENTE, 'claves.local.json')):
    # utf-8-sig: el Bloc de notas y PowerShell 5.1 guardan con marca BOM al inicio
    try:
        _claves = json.load(open(os.path.join(FUENTE, 'claves.local.json'), encoding='utf-8-sig'))
    except ValueError as e:
        print('ERROR: 02_fuente/claves.local.json no es un JSON válido (%s).\nDebe verse así: {"ESRI_KEY": "…"}\nNo se escribió nada.' % e)
        sys.exit(1)
ESRI_KEY = os.environ.get('SIA_ESRI_KEY') or _claves.get('ESRI_KEY') or ESRI_KEY
# Sesión: direcciones del inicio y del cierre de sesión cuando la herramienta se instala detrás de un
# login. Vacías = sin sesión (GitHub Pages). También se pueden dar con SIA_SESION_INICIO y SIA_SESION_CIERRE o en claves.local.json.
SESION = {'inicio': os.environ.get('SIA_SESION_INICIO') or _claves.get('SESION_INICIO') or '',
          'cierre': os.environ.get('SIA_SESION_CIERRE') or _claves.get('SESION_CIERRE') or '',
          'uso': os.environ.get('SIA_SESION_USO') or _claves.get('SESION_USO') or ''}   # registro de usos; vacío = /priorizacion-reforestacion/api/uso si hay sesión
# Versión de la herramienta y corte de los datos. Se muestran en el panel, las fichas PDF y el diccionario de los Excel.
# Actualizar VERSION y ACTUALIZACION (fecha de la versión) en cada publicación, y CORTE_DATOS cuando cambien los datos de 02_fuente/datos/.
VERSION = '1.50'
ACTUALIZACION = '23 de octubre de 2026'
CORTE_DATOS = 'modelo de priorización de noviembre de 2025; vialidades primarias de agosto de 2026'


def leer(rel, binario=False):
    ruta = os.path.join(FUENTE, *rel.split('/'))
    return open(ruta, 'rb').read() if binario else open(ruta, encoding='utf-8').read()


def huella(b):
    return hashlib.sha1(b).hexdigest()[:10]


SALIDA = {}   # archivos del sitio (ruta relativa a docs/ -> bytes). Se escriben al final, cuando todo se armó sin errores.


def poner(rel, contenido):
    """Anota un archivo del sitio. Nada se escribe hasta el final: un error a media construcción no deja docs/ a medias."""
    SALIDA[rel] = contenido.encode('utf-8') if isinstance(contenido, str) else contenido


def falla(mensaje):
    print('ERROR: ' + mensaje + '\nNo se escribió nada.')
    sys.exit(1)


# ---------- piezas esperadas: si falta o sobra una, la construcción se detiene antes de escribir ----------
JS_ESPERADOS = ['01_utilidades.js', '02_datos.js', '03_estado.js', '04_mapa_capas.js', '04_nombres_mapa.js', '05_inventario.js', '05_mapa_tarjetas.js', '06_mapa_interaccion.js',
                '07_leyenda_y_capas.js', '08_resumenes.js', '09_listados.js', '09_tramos.js', '10_seleccion.js', '11_descargas.js',
                '12_fichas_pdf.js', '13_interfaz.js', '14_buscador.js', '15_mi_ubicacion.js', '16_arranque.js', '17_recorrido.js']
CSS_ESPERADOS = ['01_variables.css', '02_base.css', '03_controles.css', '04_pantalla_y_leyenda.css', '05_panel_y_hoja_inferior.css',
                 '06_mi_ubicacion.css', '07_accesibilidad.css', '08_orientacion.css', '09_recorrido.css', '10_dos_pantallas.css', '11_inventario.css']
# Lo único de libs/ y fuentes/ que se publica. Un archivo que no esté aquí no llega a docs/.
LIBS_PUBLICADAS = ['deck.js', 'pako.js', 'jspdf.js', 'xlsx.js', 'excel_worker.js', 'LICENCIAS.md',
                   'LICENCIA_deck.gl.txt', 'LICENCIA_pako.txt', 'LICENCIA_jspdf.txt', 'LICENCIA_xlsx.txt']
FUENTES_PUBLICADAS = ['cabin.woff2', 'roboto.woff2', 'OFL_Cabin.txt', 'OFL_Roboto.txt']
if sys.argv[1:]:
    falla('uso: python 02_fuente/construir.py   (no recibe argumentos)')
for carpeta, ext, esperados in (('js', '.js', JS_ESPERADOS), ('css', '.css', CSS_ESPERADOS)):
    hay = sorted(n for n in os.listdir(os.path.join(FUENTE, carpeta)) if n.endswith(ext))
    faltan, sobran = [n for n in esperados if n not in hay], [n for n in hay if n not in esperados]
    vacios = [n for n in esperados if n in hay and os.path.getsize(os.path.join(FUENTE, carpeta, n)) < 40]
    if vacios:
        falla('%s/ trae piezas vacías: %s.' % (carpeta, ', '.join(vacios)))
    if faltan or sobran:
        falla('%s/ no trae las piezas esperadas.%s%s\nSi el cambio es intencional, actualizar la lista en construir.py.'
              % (carpeta, ' Faltan: ' + ', '.join(faltan) + '.' if faltan else '', ' Sobran: ' + ', '.join(sobran) + '.' if sobran else ''))
for carpeta, esperados in (('libs', LIBS_PUBLICADAS), ('fuentes', FUENTES_PUBLICADAS), ('datos', ['%s.bin' % n for n in DATOS])):
    faltan = [n for n in esperados if not os.path.isfile(os.path.join(FUENTE, carpeta, n))]
    if faltan:
        falla('%s/ no trae: %s.' % (carpeta, ', '.join(faltan)))
    extra = sorted(n for n in os.listdir(os.path.join(FUENTE, carpeta)) if n not in esperados and n not in ('SUMAS.json', 'fondo', 'inventario', 'nombres_colonias.json'))
    if extra:
        print('AVISO: %s/ trae archivos que no se publican: %s.' % (carpeta, ', '.join(extra)))
# Los datos deben ser los verificados: se compara el contenido descomprimido con datos/SUMAS.json,
# porque la compresión cambia de un equipo a otro aunque el contenido sea el mismo.
ruta_sumas = os.path.join(FUENTE, 'datos', 'SUMAS.json')
if not os.path.isfile(ruta_sumas):
    falla('falta datos/SUMAS.json: sin él no se puede comprobar que los datos sean los verificados. Recuperarlo de Git o, si los datos se regeneraron a propósito, correr 03_procesamiento_datos/verificar_datos.py --actualizar.')
sumas = json.load(open(ruta_sumas, encoding='utf-8'))['sha256_descomprimido']
N_FRENTES = json.load(open(ruta_sumas, encoding='utf-8'))['frentes']
N_PARTES = json.load(open(ruta_sumas, encoding='utf-8'))['partes_de_vialidad']
for n in DATOS:
    try:
        h = hashlib.sha256(gzip.decompress(open(os.path.join(FUENTE, 'datos', n + '.bin'), 'rb').read())).hexdigest()
    except Exception as e:
        falla('datos/%s.bin no se puede descomprimir (%s).' % (n, e))
    if h != sumas.get(n + '.bin'):
        falla('datos/%s.bin no coincide con datos/SUMAS.json. Si los datos se regeneraron a propósito, correr 03_procesamiento_datos/verificar_datos.py --actualizar.' % n)
# Nombres de colonia para mostrar (03_procesamiento_datos/7_nombres_colonias.py): {id: nombre}; la app conserva el del catálogo
try:
    NOMBRES_COL = json.load(open(os.path.join(FUENTE, 'datos', 'nombres_colonias.json'), encoding='utf-8'))
    assert isinstance(NOMBRES_COL, dict) and all(k.isdigit() and isinstance(v, str) and v.strip() for k, v in NOMBRES_COL.items())
except (OSError, ValueError, AssertionError) as e:
    falla('datos/nombres_colonias.json falta o no tiene la forma {"id": "nombre"} (%s). Regenerarlo con 03_procesamiento_datos/7_nombres_colonias.py.' % e)
# Fondo propio: cada archivo debe ser el que escribió 6_fondo.py (se compara el archivo tal cual, con su SUMAS.json)
ruta_fondo = os.path.join(FUENTE, 'datos', 'fondo')
if not os.path.isfile(os.path.join(ruta_fondo, 'SUMAS.json')):
    falla('falta datos/fondo/SUMAS.json: regenerar el fondo con 03_procesamiento_datos/6_fondo.py o recuperarlo de Git.')
FONDO_SUMAS = json.load(open(os.path.join(ruta_fondo, 'SUMAS.json'), encoding='utf-8'))
for n, h in FONDO_SUMAS.items():
    if not os.path.isfile(os.path.join(ruta_fondo, n)) or hashlib.sha256(open(os.path.join(ruta_fondo, n), 'rb').read()).hexdigest() != h:
        falla('datos/fondo/%s falta o no coincide con datos/fondo/SUMAS.json. Regenerar con 03_procesamiento_datos/6_fondo.py.' % n)
# Espacios para plantar (inventario de arbolado): cada archivo debe ser el que escribió 9_inventario_espacios.py, y el inventario debe
# haberse asignado con estos mismos frentes (cada punto guarda el índice de su frente en data.bin)
ruta_inv = os.path.join(FUENTE, 'datos', 'inventario')
try:
    INV_SUMAS = json.load(open(os.path.join(ruta_inv, 'SUMAS.json'), encoding='utf-8'))
    INV_RES = json.load(open(os.path.join(ruta_inv, 'RESUMEN.json'), encoding='utf-8'))
except (OSError, ValueError) as e:
    falla('falta o está dañado datos/inventario/SUMAS.json o RESUMEN.json (%s). Regenerar con 03_procesamiento_datos/9_inventario_espacios.py o recuperarlo de Git.' % e)
for n, h in INV_SUMAS.items():
    if not os.path.isfile(os.path.join(ruta_inv, n)) or hashlib.sha256(open(os.path.join(ruta_inv, n), 'rb').read()).hexdigest() != h:
        falla('datos/inventario/%s falta o no coincide con datos/inventario/SUMAS.json. Regenerar con 03_procesamiento_datos/9_inventario_espacios.py.' % n)
if INV_RES.get('frentes_sha256') != sumas.get('data.bin'):
    falla('el inventario de arbolado se asignó con otros frentes (data.bin cambió). Volver a correr 03_procesamiento_datos/9_inventario_espacios.py.')
if INV_RES.get('vp_sha256') != sumas.get('vp.bin'):
    falla('el inventario de arbolado se asignó con otras vialidades primarias (vp.bin cambió). Volver a correr 03_procesamiento_datos/9_inventario_espacios.py.')
# Filtro «Espacio» y orden por cepas: el archivo de puntos por tipo de cada frente debe estar registrado y traer las cifras de control
# de RESUMEN.json (frentes con cada tipo y puntos de cada tipo)
INV_FR = INV_RES.get('frentes_con_espacio') or {}
if not INV_FR.get('archivo') or INV_FR['archivo'] not in INV_SUMAS:
    falla('falta datos/inventario/espacios_frentes.bin (filtro «Espacio») o sus cifras en RESUMEN.json. Regenerar con 03_procesamiento_datos/9_inventario_espacios.py.')
def _enteros(b):
    v = sh = 0
    for c in b:
        v |= (c & 0x7f) << sh
        if c & 0x80:
            sh += 7
            continue
        yield v >> 1 if not v & 1 else -((v + 1) >> 1)
        v = sh = 0
_e = list(_enteros(gzip.decompress(open(os.path.join(ruta_inv, INV_FR['archivo']), 'rb').read())))
_fr = [sum(1 for c in _e[3 + t::4] if c > 0) for t in range(3)]   # por frente: dfr, cepas, tocones, muertos
_pt = [sum(_e[3 + t::4]) for t in range(3)]
if (_e[0] != INV_FR.get('formato') or _e[1] != INV_FR.get('frentes') or len(_e) != 2 + 4 * _e[1] or _fr != INV_FR.get('por_tipo')
        or _pt != INV_FR.get('puntos_por_tipo') or sum(_e[2::4]) > N_FRENTES):
    falla('datos/inventario/%s no trae las cifras de control de RESUMEN.json. Regenerar con 03_procesamiento_datos/9_inventario_espacios.py.' % INV_FR['archivo'])
# Lo mismo para las vialidades primarias del Gobierno Central (espacios_vp.bin: por parte de vialidad, índice en diferencias y puntos de cada tipo)
INV_VP = INV_RES.get('vialidades_con_espacio') or {}
if not INV_VP.get('archivo') or INV_VP['archivo'] not in INV_SUMAS:
    falla('falta datos/inventario/espacios_vp.bin (filtro «Espacio» del Gobierno Central) o sus cifras en RESUMEN.json. Regenerar con 03_procesamiento_datos/9_inventario_espacios.py.')
_e = list(_enteros(gzip.decompress(open(os.path.join(ruta_inv, INV_VP['archivo']), 'rb').read())))
if (_e[0] != INV_VP.get('formato') or _e[1] != INV_VP.get('partes') or len(_e) != 2 + 4 * _e[1] or [sum(1 for c in _e[3 + t::4] if c > 0) for t in range(3)] != INV_VP.get('por_tipo')
        or [sum(_e[3 + t::4]) for t in range(3)] != INV_VP.get('puntos_por_tipo') or sum(_e[2::4]) > N_PARTES):
    falla('datos/inventario/%s no trae las cifras de control de RESUMEN.json. Regenerar con 03_procesamiento_datos/9_inventario_espacios.py.' % INV_VP['archivo'])


AVISO = 'Generado por 02_fuente/construir.py a partir de 02_fuente/%s. No editar aquí.'
# La lógica corre dentro de una función asíncrona (los datos se esperan con await); si algo falla al
# cargar, el cargador muestra el error en lugar del mapa.
APERTURA = "(async function(){\n'use strict';\n"
CIERRE = ("})().catch(err=>{ console.error(err); window.SIA_LISTO = true; const l=document.getElementById('loader'); l.hidden=false; const d=l.querySelector('div'); d.textContent='';"
          " const t=document.createElement('div'); t.className='cabin ld-tit'; t.textContent='No fue posible cargar la herramienta'; d.appendChild(t);"
          " const m=document.createElement('div'); m.className='ld-err'; m.setAttribute('role','alert');"
          " m.textContent=(err && err.sesion)? err.amable + ' ' : ((err && err.amable) || 'Ocurrió un error al preparar la herramienta.') + ' Si el problema continúa, avisa al Sistema de Información Ambiental.'; d.appendChild(m);"
          " if (err && err.sesion && window.SIA_SESION && window.SIA_SESION.inicio){ const a=document.createElement('a'); a.href=window.SIA_SESION.inicio; a.textContent='Iniciar sesión'; m.appendChild(a); }"
          ""
          " const b=document.createElement('button'); b.type='button'; b.className='reintenta'; b.textContent='Reintentar'; b.onclick=()=>location.reload(); d.appendChild(b); });\n")
# Vigilancia del arranque. Va en un archivo aparte de app.js para que funcione aunque app.js no llegue:
# avisa si un programa no se pudo descargar y ofrece reintentar cuando la carga tarda demasiado.
VIGIA = ("(function(){ function aviso(t){ if (window.SIA_LISTO) return; var l=document.getElementById('loader'); if(!l || l.querySelector('.lento')) return; var d=l.querySelector('div');"
         " var p=document.createElement('div'); p.className='lento'; p.setAttribute('role','alert'); p.textContent=t; d.appendChild(p);"
         " var b=document.createElement('button'); b.type='button'; b.className='reintenta'; b.textContent='Reintentar'; b.onclick=function(){ location.reload(); }; d.appendChild(b); }"
         " addEventListener('error', function(e){ var x=e.target; if (x && x.tagName==='SCRIPT' && !window.SIA_LISTO) aviso('No se pudo descargar una parte del programa ('+String(x.src||'').split('/').pop().split('?')[0]+'). Revisa tu conexión.'); }, true);"
         " var cx=navigator.connection; if (cx && (cx.saveData || /2g|3g/.test(cx.effectiveType||''))){ var l0=document.getElementById('loader'); if (l0){ var n0=document.createElement('div'); n0.className='conex'; n0.textContent='Con esta conexión la primera carga puede tardar más de un minuto.'; l0.querySelector('div').appendChild(n0); } }"
         " setTimeout(function(){ aviso('La carga está tardando más de lo normal. Puede ser una conexión lenta; si no avanza, vuelve a intentarlo.'); }, 45000); })();\n")

# Los tres archivos de datos se empiezan a pedir en config.js, el primer programa y el más chico, mientras bajan las librerías; 02_datos.js usa
# esas mismas respuestas. Así se piden una sola vez en todos los navegadores: WebKit (Safari) no aprovechaba <link rel="preload" as="fetch">
# y los pedía dos veces (B8-01).
PEDIDOS = ("(function(){ var D=window.SIA_DATOS; if (!D || !window.fetch) return; window.SIA_PEDIDOS={};"
           " ['meta.bin','data.bin','vp.bin'].forEach(function(n){ var p=fetch('datos/'+n+'?v='+D.v[n]); p['catch'](function(){}); window.SIA_PEDIDOS[n]=p; }); })();\n")


def unir(carpeta, extension):
    nombres = sorted(n for n in os.listdir(os.path.join(FUENTE, carpeta)) if n.endswith(extension))
    return ''.join(leer(carpeta + '/' + n).rstrip('\n') + '\n\n' for n in nombres).rstrip('\n') + '\n'


def css_fuentes(direccion):
    """Reglas @font-face; direccion(archivo) devuelve la dirección de cada tipografía."""
    return ''.join("@font-face{font-family:%s;font-style:normal;font-weight:400 700;font-display:swap;src:url(%s) format('woff2')}\n"
                   % (fam, direccion(arch)) for fam, arch in FUENTES.items())


plantilla = leer('plantilla.html')
# Lo que la plantilla trae antes del marcador de estilos (<title>, <meta>) va en <head>, no en <body>.
if plantilla.count('<!-- ESTILOS -->') != 1:
    falla('plantilla.html debe tener exactamente un marcador <!-- ESTILOS -->.')
CABEZA_PL, plantilla = plantilla.split('<!-- ESTILOS -->')
CABEZA_PL = CABEZA_PL.strip().replace('\n', '')
assert CABEZA_PL.startswith('<title>') and '<div' not in CABEZA_PL, 'antes de <!-- ESTILOS --> solo van <title> y <meta>'
plantilla = '<!-- ESTILOS -->' + plantilla
# Ningún recurso de terceros en la ruta de arranque: la plantilla no puede enlazar hojas ni código externos.
assert 'fonts.googleapis' not in plantilla and 'fonts.gstatic' not in plantilla, 'la plantilla no debe pedir tipografías a terceros'
estilos = '/* ' + AVISO % 'css/' + ' */\n' + unir('css', '.css')
app = '// ' + AVISO % 'js/' + '\n' + APERTURA + unir('js', '.js') + CIERRE
for img in IMAGENES:
    assert ('src="%s"' % img) in plantilla, 'la plantilla no usa ' + img

# ---------- 1) versión en un solo archivo: estilos, tipografías, imágenes, datos y librerías incrustados ----------
# No pide nada a terceros: sirve en redes que bloquean dominios externos.
incrustadas = css_fuentes(lambda a: 'data:font/woff2;base64,' + base64.b64encode(leer('fuentes/' + a, True)).decode())
ESTILOS_UNICO = '<style>\n' + incrustadas + estilos + '</style>'
cuerpo = plantilla.replace('<!-- ESTILOS -->', '')
for img, tipo in IMAGENES.items():
    cuerpo = cuerpo.replace('src="%s"' % img, 'src="data:%s;base64,%s"' % (tipo, base64.b64encode(leer(img, True)).decode()))
cuerpo += '<script>' + VIGIA + '</script>\n'
for k in LIBS_ARRANQUE:
    codigo = leer('libs/' + k)
    assert '</script' not in codigo.lower(), k + ' no puede incrustarse tal cual'
    cuerpo += '<script>' + codigo + '</script>\n'
cuerpo += ''.join('<script id="lib-%s-b64" type="text/plain">%s</script>\n' % (k, base64.b64encode(leer('libs/' + k, True)).decode()) for k in LIBS_DEMANDA)
cuerpo += ''.join('<script id="%s-b64" type="text/plain">%s</script>\n' % (n, base64.b64encode(leer('datos/%s.bin' % n, True)).decode()) for n in DATOS)
cuerpo += '<script>window.SIA_NOMBRES_COL = %s;window.SIA_ESRI_KEY = %s;window.SIA_VERSION = %s;</script>\n' % (json.dumps(NOMBRES_COL, ensure_ascii=False), json.dumps(ESRI_KEY), json.dumps({'v': VERSION, 'fecha': ACTUALIZACION, 'corte': CORTE_DATOS}, ensure_ascii=False))
cuerpo += '<script>\n' + app + '</script>\n'
unico = ESQUELETO.replace('{CABEZA}', ROBOTS + CABEZA_PL + ESTILOS_UNICO) + cuerpo + '</body></html>\n'

# ---------- 2) sitio: cada pieza en su archivo, con huella ?v= para la caché del navegador ----------
# crc: CRC-32 del contenido ya descomprimido. La página lo compara solo si un intermediario de la red le entrega el archivo sin comprimir
# (B5-04): así nota si además lo alteró. Comprimido, gzip ya trae su propia comprobación.
crc = lambda b: zlib.crc32(gzip.decompress(b))
ver, ver_crc = {}, {}
for n in DATOS:
    b = leer('datos/%s.bin' % n, True)
    poner('datos/%s.bin' % n, b)
    ver[n + '.bin'] = huella(b)
    ver_crc[n + '.bin'] = crc(b)
total = sum(len(leer('datos/%s.bin' % n, True)) for n in DATOS)
fondo_ver = {}
for n in sorted(FONDO_SUMAS):
    b = leer('datos/fondo/' + n, True)
    poner('datos/fondo/' + n, b)
    fondo_ver[n] = huella(b)
inv_ver, inv_crc = {}, {}
for n in sorted(INV_SUMAS):
    b = leer('datos/inventario/' + n, True)
    poner('datos/inventario/' + n, b)
    inv_ver[n] = huella(b)
    inv_crc[n] = crc(b)
# lo que la página necesita sin descargar nada: huella de cada archivo, corte, puntos por tipo de cada alcaldía (los que contiene) y
# registros del inventario por alcaldía (árboles vivos incluidos: dicen cuánto se ha avanzado)
INVENTARIO = {'v': inv_ver, 'crc': inv_crc, 'corte': INV_RES['corte'], 'fuente': INV_RES['fuente'], 'dist': INV_RES['distancia_max_m'],
              'n': {c: a['puntos'] for c, a in INV_RES['por_alcaldia'].items()}, 'avance': {c: a['registros'] for c, a in INV_RES['por_alcaldia'].items()},
              # filtro «Espacio» y orden por cepas: archivo de puntos por tipo de cada frente y sus cifras de control (frentes con cada
              # tipo y puntos de cada tipo; 05_inventario.js las comprueba al leerlo)
              'fr': {'archivo': INV_FR['archivo'], 'formato': INV_FR['formato'], 'n': INV_FR['frentes'], 'tipos': INV_FR['por_tipo'],
                     'puntos': INV_FR['puntos_por_tipo']},
              # lo mismo para las partes de vialidad primaria del Gobierno Central (espacios_vp.bin), con la distancia del camellón
              'vp': {'archivo': INV_VP['archivo'], 'formato': INV_VP['formato'], 'n': INV_VP['partes'], 'tipos': INV_VP['por_tipo'],
                     'puntos': INV_VP['puntos_por_tipo'], 'dist': INV_VP['distancia_camellon_m']},
              # puntos que no cuentan para nadie (sin frente a 20 m ni vialidad primaria a 25 m): la nota de la comparación del Resumen
              'sinc': INV_RES['sin_frente'] - INV_VP['sin_frente_recuperados']}
lver = {}
for lib in LIBS_PUBLICADAS:
    b = leer('libs/' + lib, True)
    poner('libs/' + lib, b)
    lver[lib] = huella(b)
for img in IMAGENES:
    poner(img, leer(img, True))
fver = {}
for arch in FUENTES_PUBLICADAS:
    b = leer('fuentes/' + arch, True)
    poner('fuentes/' + arch, b)
    fver[arch] = huella(b)
estilos = css_fuentes(lambda a: 'fuentes/%s?v=%s' % (a, fver[a])) + estilos
config = 'window.SIA_LIBS = "libs/";\nwindow.SIA_LIBS_V = ' + json.dumps({l: lver[l] for l in ('xlsx.js', 'jspdf.js', 'excel_worker.js')}) + ';\nwindow.SIA_SESION = ' + json.dumps(SESION) + ';\nwindow.SIA_DATOS = %s;\nwindow.SIA_FONDO = %s;\nwindow.SIA_INVENTARIO = %s;\nwindow.SIA_NOMBRES_COL = %s;\nwindow.SIA_ESRI_KEY = %s;\nwindow.SIA_VERSION = %s;\n' % (json.dumps({'v': ver, 'crc': ver_crc, 'total': total}), json.dumps(fondo_ver), json.dumps(INVENTARIO, ensure_ascii=False, separators=(',', ':')), json.dumps(NOMBRES_COL, ensure_ascii=False, separators=(',', ':')), json.dumps(ESRI_KEY), json.dumps({'v': VERSION, 'fecha': ACTUALIZACION, 'corte': CORTE_DATOS}, ensure_ascii=False)) + VIGIA + PEDIDOS
poner('config.js', config)
poner('estilos.css', estilos)
poner('app.js', app)

v = lambda b: huella(b.encode('utf-8') if isinstance(b, str) else b)
HOJA = '<link rel="stylesheet" href="estilos.css?v=%s">' % v(estilos)
sitio = plantilla.replace('<!-- ESTILOS -->', '')
for img in IMAGENES:
    sitio = sitio.replace('src="%s"' % img, 'src="%s?v=%s"' % (img, v(leer(img, True))))
sitio = sitio.replace('<img src="img/composicion_frentes_manzana.jpg', '<img loading="lazy" src="img/composicion_frentes_manzana.jpg')
assert sitio.count('Descomprimiendo datos…</div>') == 1
# Lo que baja la primera visita, como lo entrega el servidor (el texto comprimido; los .bin, las tipografías y las imágenes tal cual),
# incluida la copia para usarse sin conexión (proceso de servicio, abajo): es la cifra que anuncia el cargador (B6-02).
gz = lambda b: len(gzip.compress(b.encode('utf-8') if isinstance(b, str) else b, 6))
primera = (gz(sitio) + gz(config) + gz(app) + gz(estilos) + sum(gz(leer('libs/' + l, True)) for l in ('deck.js', 'pako.js', 'xlsx.js', 'jspdf.js', 'excel_worker.js'))
           + total + len(SALIDA['datos/fondo/fondo_base.bin']) + sum(len(SALIDA['datos/inventario/' + n]) for n in inv_ver)
           + sum(len(SALIDA['fuentes/' + a]) for a in FUENTES.values()) + sum(len(SALIDA[img]) for img in IMAGENES))
sitio = sitio.replace('Descomprimiendo datos…</div>', 'Descargando la herramienta y sus datos (%.0f MB la primera vez)…</div>' % (primera / 1048576))
sitio += ('<script src="config.js?v=%s"></script>\n' % v(config)
          + '<script src="libs/deck.js?v=%s"></script>\n' % lver['deck.js']
          + '<script src="libs/pako.js?v=%s"></script>\n' % lver['pako.js']
          + '<script src="app.js?v=%s"></script>\n' % v(app))
# las tipografías se piden desde el primer momento; los datos, desde config.js (PEDIDOS)
precarga = ''.join('<link rel="preload" href="fuentes/%s?v=%s" as="font" type="font/woff2" crossorigin>' % (a, fver[a]) for a in FUENTES.values())
pagina = (ESQUELETO.replace('{CABEZA}', ROBOTS + CABEZA_PL + precarga + HOJA) + '<!-- ' + AVISO % 'plantilla.html, css/ y js/' + ' -->\n'
          + sitio + '</body></html>\n')
poner('index.html', pagina)

# ---------- proceso de servicio: la herramienta abre sin conexión después de la primera visita ----------
# Guarda solo archivos propios, por su dirección exacta (con huella). No guarda respuestas con error, redirigidas ni de otro origen,
# para convivir con el inicio de sesión del SIA (un 401 o un 302 nunca quedan en la caché).
# Desde la v1.41 (bloque 5 de la auditoría): guarda también el inventario de arbolado (unos 400 KB), para ver los espacios para plantar
# y usar el filtro «Espacio» en campo, sin señal.
PRE = (['./', 'config.js?v=%s' % v(config), 'app.js?v=%s' % v(app), 'estilos.css?v=%s' % v(estilos)]
       + ['libs/%s?v=%s' % (l, lver[l]) for l in ('deck.js', 'pako.js')]
       + ['libs/%s?v=%s' % (l, lver[l]) for l in ('xlsx.js', 'jspdf.js')] + ['libs/excel_worker.js?v=%s&x=%s' % (lver['excel_worker.js'], lver['xlsx.js'])]
       + ['datos/%s?v=%s' % (n, ver[n]) for n in sorted(ver)] + ['datos/fondo/fondo_base.bin?v=%s' % fondo_ver['fondo_base.bin']]   # el fondo «Calles» abre por omisión
       + ['datos/inventario/%s?v=%s' % (n, inv_ver[n]) for n in sorted(inv_ver)]
       + ['fuentes/%s?v=%s' % (a, fver[a]) for a in FUENTES.values()]
       + ['%s?v=%s' % (img, v(leer(img, True))) for img in IMAGENES])
SW = '''// %s
const CACHE = 'calles-%s';
const PRE = %s;
const sirve = r => r && r.ok && !r.redirected && r.type === 'basic';
// Todo o nada: si un archivo no llega, la copia nueva se borra y la instalación falla, así sigue la versión anterior con su copia completa.
// Los archivos llevan su huella en la dirección: se toman de la caché del navegador si la página ya los bajó; la página, que no la lleva, se
// revalida con el servidor.
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => Promise.all(PRE.map(u => fetch(u, {cache: u === './' ? 'no-cache' : 'default'})
  .then(r => { if (!sirve(r)) throw new Error(u + ': ' + r.status); return c.put(u, r); }))))
  .then(() => self.skipWaiting(), err => caches.delete(CACHE).then(() => { throw err; }))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('calles-') && k !== CACHE).map(k => caches.delete(k))))));
// La página se pide a la red y, sin red, sale la de la copia. La de la red no se guarda: la copia queda como se instaló, con su página y sus
// archivos de la misma versión (una página nueva en la copia vieja pediría archivos que no están en ella).
self.addEventListener('fetch', e => { const q = e.request; if (q.method !== 'GET' || new URL(q.url).origin !== location.origin) return;
  if (q.mode === 'navigate') { e.respondWith(fetch(q).catch(() => caches.open(CACHE).then(c => c.match('./')).then(m => m || Response.error()))); return; }
  e.respondWith(caches.open(CACHE).then(c => c.match(q)).then(m => m || fetch(q))); });
''' % (AVISO % 'construir.py', v(pagina + json.dumps(PRE)), json.dumps(PRE))
poner('sw.js', SW)
poner('.nojekyll', b'')   # GitHub Pages: publicar docs/ tal cual, sin pasarlo por Jekyll

# ---------- escritura: hasta aquí nada se había escrito ----------
for rel, contenido in SALIDA.items():
    ruta = os.path.join(DOCS, *rel.split('/'))
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    if not (os.path.exists(ruta) and open(ruta, 'rb').read() == contenido):   # solo lo que cambió: así Git no ve cambios falsos
        open(ruta, 'wb').write(contenido)
# Archivos de docs/ que ya no forman parte del sitio: no se borran, se apartan en _to_delete/ para revisarlos y eliminarlos a mano.
obsoletos = sorted(os.path.relpath(os.path.join(d, f), DOCS).replace(os.sep, '/') for d, _, fs in os.walk(DOCS) for f in fs)
obsoletos = [r for r in obsoletos if r not in SALIDA]
if obsoletos:
    aparte = os.path.join(RAIZ, '_to_delete', 'docs_obsoletos_' + time.strftime('%Y%m%d_%H%M%S'))
    for r in obsoletos:
        destino = os.path.join(aparte, *r.split('/'))
        os.makedirs(os.path.dirname(destino), exist_ok=True)
        os.replace(os.path.join(DOCS, *r.split('/')), destino)
    print('AVISO: %d archivo(s) de docs/ ya no pertenecen al sitio y se movieron a %s: %s' % (len(obsoletos), os.path.relpath(aparte, RAIZ), ', '.join(obsoletos)))
os.makedirs(os.path.join(RAIZ, '_local'), exist_ok=True)
open(os.path.join(RAIZ, '_local', 'priorizacion_reforestacion.html'), 'w', encoding='utf-8').write(unico)
print('sitio en docs/ (index.html %d KB; datos %.1f MB aparte)' % (len(pagina.encode()) // 1024, total / 1048576))
# docs/ se publica tal cual en GitHub Pages: si lleva claves o sesión, se dice
if ESRI_KEY:
    print('AVISO: docs/config.js lleva la clave de Esri. Al hacer commit queda pública en GitHub y en su historial: '
          'confirmar que está restringida al dominio del sitio en el panel del proveedor.')
if SESION['inicio'] or SESION['cierre'] or SESION['uso']:
    print('AVISO: docs/ se construyó con direcciones de sesión (%s). Sirven para el SIA, no para GitHub Pages: '
          'para el SIA usar 08_entrega_sia/empaquetar.py y no hacer commit de este docs/.' % (SESION['inicio'] or SESION['cierre']))

# ---------- cifras de la documentación: se miden aquí para que README y ARQUITECTURA no las repitan a mano ----------
def tam(n):
    return '%.1f MB' % (n / 1048576) if n >= 1048576 else '%d KB' % round(n / 1024)


def pesa(rel):
    return len(SALIDA[rel])


cuenta = lambda carpeta, ext: len([n for n in os.listdir(os.path.join(FUENTE, carpeta)) if n.endswith(ext)])
peso_sitio = sum(len(b) for b in SALIDA.values())
arranque = ['index.html', 'estilos.css', 'config.js', 'app.js', 'libs/deck.js', 'libs/pako.js'] + ['datos/%s.bin' % n for n in DATOS] + ['fuentes/' + a for a in FUENTES.values()]
filas = [('Versión de la herramienta', VERSION), ('Corte de los datos', CORTE_DATOS),
         ('Módulos de lógica (`02_fuente/js/`)', cuenta('js', '.js')), ('Hojas de estilo (`02_fuente/css/`)', cuenta('css', '.css')),
         ('`docs/index.html`', tam(pesa('index.html'))), ('`docs/app.js`', tam(pesa('app.js'))), ('`docs/estilos.css`', tam(pesa('estilos.css'))),
         ('Datos (`docs/datos/*.bin`)', tam(total)), ('Librerías (`docs/libs/*.js`)', tam(sum(pesa('libs/' + l) for l in LIBS_PUBLICADAS if l.endswith('.js')))),
         ('Tipografías (`docs/fuentes/*.woff2`)', tam(sum(pesa('fuentes/' + a) for a in FUENTES.values()))),
         ('Sitio completo (`docs/`)', tam(peso_sitio)), ('Archivos que se piden al abrir, sin comprimir', tam(sum(pesa(a) for a in arranque))),
         ('Archivo único (`_local/priorizacion_reforestacion.html`)', tam(len(unico.encode('utf-8')))),
         ('Archivos que guarda el navegador para abrir sin conexión', len(PRE)),
         ('Fondo propio «Calles» (`docs/datos/fondo/`; es el fondo inicial: de lejos se pide `fondo_base.bin` y las manzanas, por alcaldía, al acercar)', tam(sum(len(SALIDA['datos/fondo/' + n]) for n in fondo_ver))),
         ('Espacios para plantar del inventario de arbolado (`docs/datos/inventario/inv_*.bin`, se piden al acercar el mapa)', '%s · %s puntos · corte: %s' % (tam(sum(len(SALIDA['datos/inventario/' + n]) for n in inv_ver if n not in (INV_FR['archivo'], INV_VP['archivo']))), format(sum(INV_RES['puntos_por_tipo']), ','), INV_RES['corte'])),
         ('Filtro «Espacio» y orden por cepas: puntos por tipo de cada frente (`docs/datos/inventario/%s`, se pide al usarlos)' % INV_FR['archivo'], '%s · %s frentes' % (tam(len(SALIDA['datos/inventario/' + INV_FR['archivo']])), format(INV_FR['frentes'], ','))),
         ('Filtro «Espacio» y orden por cepas del Gobierno Central: puntos por tipo de cada parte de vialidad primaria (`docs/datos/inventario/%s`, se pide junto con el anterior)' % INV_VP['archivo'], '%s · %s partes · %s puntos (%s del camellón)' % (tam(len(SALIDA['datos/inventario/' + INV_VP['archivo']])), format(INV_VP['partes'], ','), format(sum(INV_VP['puntos_por_tipo']), ','), format(INV_VP['sin_frente_recuperados'], ','))),
         ('Satélite (Esri)', 'con clave' if ESRI_KEY else 'sin clave')]
cifras = ('# Cifras de la construcción\n\nGenerado por 02_fuente/construir.py en cada construcción. No editar aquí.' + '\n\nMedidas al construir la versión %s. README y ARQUITECTURA remiten a esta tabla en lugar de repetir tamaños y conteos.\n\n' % VERSION
          + '| Concepto | Valor |\n|---|---|\n' + ''.join('| %s | %s |\n' % f for f in filas))
ruta_cifras = os.path.join(RAIZ, '05_documentacion', 'cifras_de_la_construccion.md')
os.makedirs(os.path.dirname(ruta_cifras), exist_ok=True)
if not (os.path.exists(ruta_cifras) and open(ruta_cifras, encoding='utf-8').read() == cifras):
    open(ruta_cifras, 'w', encoding='utf-8', newline='').write(cifras)
# El README debe nombrar la versión que se construye: si no, la construcción lo dice.
lee_readme = os.path.join(RAIZ, 'README.md')
if os.path.exists(lee_readme) and ('**v%s**' % VERSION) not in open(lee_readme, encoding='utf-8').read():
    print('AVISO: README.md no menciona la versión v%s como vigente; actualizarlo antes del commit.' % VERSION)
