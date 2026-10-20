# Uso: python -I html_a_texto.py ENTRADA.html SALIDA.txt
# Convierte un HTML a texto plano (sin estilos ni programas) para leerlo o compararlo.
import re, html, sys, os
lp = lambda p: ('\\\\?\\' + os.path.abspath(p)) if os.name == 'nt' else p   # rutas de más de 260 caracteres en Windows
t = open(lp(sys.argv[1]), encoding='utf-8').read()
t = re.sub(r'<style.*?</style>', '', t, flags=re.S)
t = re.sub(r'<script.*?</script>', '', t, flags=re.S)
t = re.sub(r'<(br|/p|/li|/h[1-6]|/tr|/div|/td|/th)[^>]*>', '\n', t)
t = re.sub(r'<[^>]+>', ' ', t)
t = html.unescape(t)
t = re.sub(r'[ \t]+', ' ', t)
t = re.sub(r'\n\s*\n+', '\n', t)
open(lp(sys.argv[2]), 'w', encoding='utf-8').write(t)
print(len(t), 'caracteres')
