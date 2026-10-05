# -*- coding: utf-8 -*-
"""Genera acceso/aviso-de-privacidad.html a partir de privacidad/aviso_integral.md (Markdown sencillo: títulos, listas, tablas).
Uso: python 08_entrega_sia/login/generar_aviso_html.py   · Requiere únicamente Python 3."""
import html
import os
import re

AQUI = os.path.dirname(os.path.abspath(__file__))
md = open(os.path.join(AQUI, 'privacidad', 'aviso_integral.md'), encoding='utf-8').read()


def inl(t):
    t = html.escape(t, quote=False)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    return re.sub(r'`([^`]+)`', r'<code>\1</code>', t)


out, i, L = [], 0, md.split('\n')
while i < len(L):
    l = L[i]
    if l.startswith('# '): out.append('<h1>%s</h1>' % inl(l[2:]))
    elif l.startswith('## '): out.append('<p class="eyebrow">%s</p>' % inl(l[3:]))
    elif l.startswith('### '): out.append('<h2>%s</h2>' % inl(l[4:]))
    elif l.startswith('> '): out.append('<p class="aviso alerta">%s</p>' % inl(l[2:]))
    elif re.match(r'^(- |\d+\. )', l):
        tag = 'ol' if re.match(r'^\d+\. ', l) else 'ul'; items = []
        while i < len(L) and re.match(r'^(- |\d+\. )', L[i]):
            items.append(re.sub(r'^(- |\d+\. )', '', L[i])); i += 1
        out.append('<%s>%s</%s>' % (tag, ''.join('<li>%s</li>' % inl(x) for x in items), tag)); continue
    elif l.startswith('|'):
        rows = []
        while i < len(L) and L[i].startswith('|'):
            rows.append([c.strip() for c in L[i].strip('|').split('|')]); i += 1
        out.append('<div class="tabla-envoltura"><table><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (
            ''.join('<th scope="col">%s</th>' % inl(c) for c in rows[0]),
            ''.join('<tr>%s</tr>' % ''.join('<td>%s</td>' % inl(c) for c in r) for r in rows[2:]))); continue
    elif l.strip(): out.append('<p>%s</p>' % inl(l))
    i += 1
pagina = '''<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Aviso de privacidad · Calles prioritarias para reforestar</title>
<link rel="stylesheet" href="recursos/estilos.css">
</head>
<body class="acceso">
<!-- Generado desde ../privacidad/aviso_integral.md con generar_aviso_html.py: editar allá y regenerar. -->
<main class="tarjeta documento" id="principal">
  <img class="logo" src="recursos/logo.png" alt="Gobierno de la Ciudad de México · Secretaría del Medio Ambiente · Reforestación Urbana">
  %s
  <p class="pie"><a href="./">Volver a iniciar sesión</a></p>
</main>
</body>
</html>
''' % '\n  '.join(out)
open(os.path.join(AQUI, 'acceso', 'aviso-de-privacidad.html'), 'w', encoding='utf-8', newline='\n').write(pagina)
print('acceso/aviso-de-privacidad.html: %d bloques' % len(out))
