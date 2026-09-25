# -*- coding: utf-8 -*-
"""Arma la herramienta "Calles prioritarias para reforestar" a partir de sus piezas.

Piezas (todas en esta carpeta; ver ARQUITECTURA.md en la raíz):
  plantilla.html   estructura de la página (sin estilos ni código)
  css/*.css        estilos, en orden de aplicación (01_variables … 06_mi_ubicacion)
  js/*.js          lógica, un archivo por tema, en orden de ejecución (01_utilidades … 16_arranque);
                   se unen en un solo app.js dentro de una función asíncrona
  datos/*.bin      frentes, catálogos y vialidades primarias (varint + gzip)
  img/             logotipo y lámina de la metodología
  libs/            deck.gl, pako, jsPDF y SheetJS (copias locales, con LICENCIAS.md)

Salidas:
  ../docs/                               sitio para GitHub Pages y el SIA: página, estilos, código,
                                         datos, librerías e imágenes en archivos aparte
  ../_local/calles_prioritarias.html     un solo archivo para abrir con doble clic (no se publica)
  --artefacto RUTA                       fragmento para el artefacto de Claude (sin esqueleto)

Uso:  python3 02_fuente/construir.py [--artefacto RUTA]
"""
import base64
import hashlib
import json
import os
import sys

FUENTE = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(FUENTE)
DOCS = os.path.join(RAIZ, 'docs')

# Esqueleto de página completa (el mismo que agrega el artefacto) más idioma y la instrucción de no
# aparecer en buscadores. Para permitir la difusión, dejar ROBOTS = ''.
ROBOTS = '<meta name="robots" content="noindex, nofollow">'
ESQUELETO = ('<!doctype html><html lang="es"><head><meta charset=utf8>'
             '<meta name=viewport content="width=device-width,initial-scale=1">'
             '<style>:root{color-scheme:light}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;'
             'background:#faf9f5;color:#141413}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style>'
             '{CABEZA}</head><body>\n')
CDN = {'deck.js': 'https://cdn.jsdelivr.net/npm/deck.gl@9.4.0/dist.min.js',
       'pako.js': 'https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako_inflate.min.js'}
IMAGENES = {'img/logo_sedema_reforestacion.png': 'image/png', 'img/composicion_frentes_manzana.jpg': 'image/jpeg'}
DATOS = ('meta', 'data', 'vp')


def leer(rel, binario=False):
    ruta = os.path.join(FUENTE, *rel.split('/'))
    return open(ruta, 'rb').read() if binario else open(ruta, encoding='utf-8').read()


def huella(b):
    return hashlib.sha1(b).hexdigest()[:10]


def poner(rel, contenido):
    """Escribe un archivo del sitio solo si cambió (así Git no ve cambios falsos)."""
    if isinstance(contenido, str):
        contenido = contenido.encode('utf-8')
    ruta = os.path.join(DOCS, *rel.split('/'))
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    if os.path.exists(ruta) and open(ruta, 'rb').read() == contenido:
        return
    open(ruta, 'wb').write(contenido)


AVISO = 'Generado por 02_fuente/construir.py a partir de 02_fuente/%s. No editar aquí.'
# La lógica corre dentro de una función asíncrona (los datos se esperan con await); si algo falla al
# cargar, el cargador muestra el error en lugar del mapa.
APERTURA = "(async function(){\n'use strict';\n"
CIERRE = ("})().catch(err=>{ console.error(err); const l=document.getElementById('loader'); l.hidden=false; "
          "l.querySelector('div').innerHTML = `<div class=\"cabin\" style=\"font-weight:600;font-size:16px\">No fue posible cargar el mapa</div>"
          "<div style=\"font-size:12px;margin-top:6px;max-width:320px\">${(err && err.message)||err}. Recarga la página; si persiste, "
          "avisa al Sistema de Información Ambiental.</div>`; });\n")


def unir(carpeta, extension):
    nombres = sorted(n for n in os.listdir(os.path.join(FUENTE, carpeta)) if n.endswith(extension))
    return ''.join(leer(carpeta + '/' + n).rstrip('\n') + '\n\n' for n in nombres).rstrip('\n') + '\n'


plantilla = leer('plantilla.html')
estilos = '/* ' + AVISO % 'css/' + ' */\n' + unir('css', '.css')
app = '// ' + AVISO % 'js/' + '\n' + APERTURA + unir('js', '.js') + CIERRE
assert plantilla.count('<!-- ESTILOS -->') == 1, 'la plantilla debe tener un solo marcador <!-- ESTILOS -->'
for img in IMAGENES:
    assert ('src="%s"' % img) in plantilla, 'la plantilla no usa ' + img

# ---------- 1) versión en un solo archivo: estilos, imágenes y datos incrustados; librerías del CDN ----------
cuerpo = plantilla.replace('<!-- ESTILOS -->', '<style>\n' + estilos + '</style>')
for img, tipo in IMAGENES.items():
    cuerpo = cuerpo.replace('src="%s"' % img, 'src="data:%s;base64,%s"' % (tipo, base64.b64encode(leer(img, True)).decode()))
cuerpo += ''.join('<script src="%s"></script>\n' % CDN[k] for k in ('deck.js', 'pako.js'))
cuerpo += ''.join('<script id="%s-b64" type="text/plain">%s</script>\n' % (n, base64.b64encode(leer('datos/%s.bin' % n, True)).decode()) for n in DATOS)
cuerpo += '<script>\n' + app + '</script>\n'
fragmento = cuerpo

os.makedirs(os.path.join(RAIZ, '_local'), exist_ok=True)
open(os.path.join(RAIZ, '_local', 'calles_prioritarias.html'), 'w', encoding='utf-8').write(
    ESQUELETO.replace('{CABEZA}', ROBOTS) + fragmento + '</body></html>\n')

# ---------- 2) sitio: cada pieza en su archivo, con huella ?v= para la caché del navegador ----------
ver = {}
for n in DATOS:
    b = leer('datos/%s.bin' % n, True)
    poner('datos/%s.bin' % n, b)
    ver[n + '.bin'] = huella(b)
total = sum(len(leer('datos/%s.bin' % n, True)) for n in DATOS)
lver = {}
for lib in sorted(os.listdir(os.path.join(FUENTE, 'libs'))):
    b = leer('libs/' + lib, True)
    poner('libs/' + lib, b)
    lver[lib] = huella(b)
for img in IMAGENES:
    poner(img, leer(img, True))
config = 'window.SIA_LIBS = "libs/";\nwindow.SIA_DATOS = %s;\n' % json.dumps({'v': ver, 'total': total})
poner('config.js', config)
poner('estilos.css', estilos)
poner('app.js', app)

v = lambda b: huella(b.encode('utf-8') if isinstance(b, str) else b)
sitio = plantilla.replace('<!-- ESTILOS -->', '<link rel="stylesheet" href="estilos.css?v=%s">' % v(estilos))
for img in IMAGENES:
    sitio = sitio.replace('src="%s"' % img, 'src="%s?v=%s"' % (img, v(leer(img, True))))
sitio = sitio.replace('<img src="img/composicion_frentes_manzana.jpg', '<img loading="lazy" src="img/composicion_frentes_manzana.jpg')
assert sitio.count('Descomprimiendo datos…</div>') == 1
sitio = sitio.replace('Descomprimiendo datos…</div>', 'Descargando la herramienta…</div>')
sitio += ('<script src="config.js?v=%s"></script>\n' % v(config)
          + '<script src="libs/deck.js?v=%s"></script>\n' % lver['deck.js']
          + '<script src="libs/pako.js?v=%s"></script>\n' % lver['pako.js']
          + '<script src="app.js?v=%s"></script>\n' % v(app))
# que el navegador empiece a bajar los datos desde el primer momento, en paralelo con las librerías
precarga = ''.join('<link rel="preload" href="datos/%s?v=%s" as="fetch" crossorigin>' % (n, ver[n]) for n in ('data.bin', 'meta.bin', 'vp.bin'))
pagina = (ESQUELETO.replace('{CABEZA}', ROBOTS + precarga) + '<!-- ' + AVISO % 'plantilla.html, css/ y js/' + ' -->\n'
          + sitio + '</body></html>\n')
poner('index.html', pagina)
print('sitio en docs/ (index.html %d KB; datos %.1f MB aparte)' % (len(pagina.encode()) // 1024, total / 1048576))

if '--artefacto' in sys.argv:
    ruta = sys.argv[sys.argv.index('--artefacto') + 1]
    open(ruta, 'w', encoding='utf-8').write(fragmento)
    print('fragmento para el artefacto en', ruta)
