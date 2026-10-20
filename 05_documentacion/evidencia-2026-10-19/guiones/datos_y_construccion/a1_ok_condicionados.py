# A1 · Busca bloques «if (…) { … ok(…) … }» sin «else» que también llame a ok(): si la condición es falsa, esas
# comprobaciones no corren y la prueba no lo dice. Heurística (llaves sin cadenas ni comentarios); revisar cada caso.
import re, sys, glob, os
carpeta = sys.argv[1]
for ruta in sorted(glob.glob(os.path.join(carpeta, '*.js'))):
    t = open(ruta, encoding='utf-8').read()
    for m in re.finditer(r'\bif\s*\(', t):
        i = m.end(); prof = 1
        while i < len(t) and prof:
            prof += {'(': 1, ')': -1}.get(t[i], 0); i += 1
        cond = t[m.end():i-1]
        j = i
        while j < len(t) and t[j] in ' \t': j += 1
        if j >= len(t) or t[j] != '{': continue
        k = j + 1; prof = 1
        while k < len(t) and prof:
            prof += {'{': 1, '}': -1}.get(t[k], 0); k += 1
        cuerpo = t[j:k]
        if not re.search(r'\bok\(', cuerpo): continue
        resto = t[k:k+40].lstrip()
        if resto.startswith('else'): continue
        if re.match(r'\s*!', cond) and re.search(r"ok\([^)]*,\s*false", cuerpo): continue
        n = len(re.findall(r'\bok\(', cuerpo)); linea = t.count('\n', 0, m.start()) + 1
        print('%s:%d  if (%s)  → %d comprobación(es) sin else' % (os.path.basename(ruta), linea, cond.strip()[:90], n))
