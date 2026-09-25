"""Recompone la lámina de frentes de manzana sin el mapa de la derecha."""
from PIL import Image, ImageDraw, ImageFont
import numpy as np

import os
SC = os.path.dirname(os.path.abspath(__file__)) + os.sep          # esta carpeta
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + os.sep
im = Image.open(SC + 'insumos/slide_orig.jpg').convert('RGB')
a = np.asarray(im).astype(int)
H, W = a.shape[:2]

# --- detectar fotos (regiones con color/oscuridad frente al fondo crema) ---
lum = a.mean(2)
sat = a.max(2) - a.min(2)
mask = (lum < 205) | (sat > 45)
band = mask[195:610, 0:820]
cols = band.sum(0)
runs, cur = [], None
for x in range(len(cols)):
    if cols[x] > 200:
        cur = x if cur is None else cur
    elif cur is not None:
        if x - cur > 100: runs.append((cur, x))
        cur = None
print('columnas de fotos:', runs)
photos = []
for x0, x1 in runs[:2]:
    rows = mask[150:650, x0:x1].sum(1)
    ys = [y for y in range(len(rows)) if rows[y] > (x1 - x0) * 0.5]
    y0, y1 = 150 + ys[0], 150 + ys[-1] + 1
    photos.append((x0, y0, x1, y1))
print('fotos:', photos, [(p[2]-p[0], p[3]-p[1]) for p in photos])

# --- logo ---
lg = mask[15:100, 0:470]
ys = [y for y in range(lg.shape[0]) if lg[y].sum() > 2]
xs = [x for x in range(lg.shape[1]) if lg[:, x].sum() > 2]
logo_box = (max(0, xs[0] - 4), 15 + ys[0] - 4, xs[-1] + 5, 15 + ys[-1] + 5)
print('logo:', logo_box)
logo = im.crop(logo_box)
# recorta el fondo claro del logo para que se integre en cualquier lienzo
la = np.asarray(logo).astype(float)
llum = la.mean(2)
alpha = np.clip((246 - llum) / 46.0, 0, 1)
logo = Image.merge('RGBA', (*logo.split(), Image.fromarray((alpha * 255).astype('uint8'))))

# --- colores de referencia ---
title_px = a[108:172, 100:670][mask[108:172, 100:670]]
text_px = a[645:750, 60:560][mask[645:750, 60:560]]
print('color título', title_px.mean(0).round(), 'color texto', text_px.mean(0).round())
TITLE_C = tuple(int(v) for v in np.percentile(title_px, 20, axis=0))
TEXT_C = tuple(int(v) for v in np.percentile(text_px, 20, axis=0))
div = a[620:790, 585:596]
dm = (div.max(2) - div.min(2)) > 60
DIV_C = tuple(int(v) for v in div[dm].mean(0)) if dm.any() else (157, 33, 72)
print('TITLE', TITLE_C, 'TEXT', TEXT_C, 'DIV', DIV_C)

# --- fondo: crema del propio material, sin repeticiones visibles ---
patch = im.crop((880, 700, 1400, 812))
NW, NH = 880, 800
base = tuple(int(v) for v in np.median(np.asarray(patch).reshape(-1, 3), axis=0))
print('fondo base', base)
from PIL import ImageFilter
wash = patch.resize((NW, NH), Image.LANCZOS).filter(ImageFilter.GaussianBlur(22))
canvas = Image.blend(Image.new('RGB', (NW, NH), base), wash, 0.45)
d = ImageDraw.Draw(canvas)

FB = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'
FR = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
f_title = ImageFont.truetype(FB, 31)
f_text = ImageFont.truetype(FR, 20)

# logo arriba a la izquierda
canvas.paste(logo, (22, 24), logo)

# título centrado
title = ['Categorización por % de área arbolada en', 'Frente de Manzana']
y = 108
for ln in title:
    d.text((NW / 2, y), ln, font=f_title, fill=TITLE_C, anchor='ma')
    y += 38

# fotos centradas, tamaño original
ph_h = min(p[3]-p[1] for p in photos)
pa, pb = [im.crop((p[0], p[1], p[2], p[1]+ph_h)) for p in photos]
gap = 36
total = pa.width + gap + pb.width
x0 = (NW - total) // 2
py = 196
canvas.paste(pa, (x0, py))
canvas.paste(pb, (x0 + pa.width + gap, py))
photo_bottom = py + max(pa.height, pb.height)

# textos en dos columnas con filete punteado
t1 = ['Se procedió a conjugar el grado de cobertura de área',
      'verde en los frentes de manzana, con el nivel de',
      'priorización obtenido en las Unidades de Planeación',
      'Ambiental']
t2 = ['Nivel máximo de', 'desagregación para priorizar', 'la implementación al interior', 'de las colonias']
ty = photo_bottom + 44
div_x = int(NW * 0.615)
c1 = div_x // 2
c2 = div_x + (NW - div_x) // 2
for i, ln in enumerate(t1):
    d.text((c1, ty + i * 28), ln, font=f_text, fill=TEXT_C, anchor='ma')
for i, ln in enumerate(t2):
    d.text((c2, ty + i * 28), ln, font=f_text, fill=TEXT_C, anchor='ma')
# filete punteado
yy = ty - 26
while yy < ty + 4 * 28 + 26:
    d.line([(div_x, yy), (div_x, yy + 11)], fill=DIV_C, width=5)
    yy += 26

canvas.save(RAIZ + '06_entregables/composicion_frentes_manzana.png')
print('guardado', canvas.size)

# --- versión con fondo transparente ---
tr = Image.new('RGBA', (NW, NH), (0, 0, 0, 0))
td = ImageDraw.Draw(tr)
tr.paste(logo, (22, 24), logo)
y = 108
for ln in title:
    td.text((NW / 2, y), ln, font=f_title, fill=TITLE_C + (255,), anchor='ma')
    y += 38
tr.paste(pa, (x0, py)); tr.paste(pb, (x0 + pa.width + gap, py))
for i, ln in enumerate(t1):
    td.text((c1, ty + i * 28), ln, font=f_text, fill=TEXT_C + (255,), anchor='ma')
for i, ln in enumerate(t2):
    td.text((c2, ty + i * 28), ln, font=f_text, fill=TEXT_C + (255,), anchor='ma')
yy = ty - 26
while yy < ty + 4 * 28 + 26:
    td.line([(div_x, yy), (div_x, yy + 11)], fill=DIV_C + (255,), width=5)
    yy += 26
tr.crop((0, 0, NW, ty + 4 * 28 + 40)).save(RAIZ + '06_entregables/composicion_frentes_manzana_transparente.png')
print('transparente ok')
