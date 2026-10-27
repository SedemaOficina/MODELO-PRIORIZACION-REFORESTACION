# -*- coding: utf-8 -*-
"""Publica el paquete de entrega en el repositorio PRIVADO del SIA: SedemaOficina/modelo-priorizacion-reforestacion-sia.

El SIA recibe cada entrega como una etiqueta «entrega-AAAA-MM-DD» de ese repositorio, igual que el tablero de Categorías
(decisión de Liber del 26 oct 2026): clona, cambia a la etiqueta, comprueba MANIFIESTO.sha256 y copia. El repositorio de
desarrollo (este) es público y no lleva los nombres reales del SIA; el paquete sí, por eso va en uno privado.

Uso:  python 08_entrega_sia/publicar_entrega.py [ZIP]      (por omisión, el ZIP más reciente de _local/entrega/)
  1. Comprueba el ZIP contra su .sha256 y, ya descomprimido, contra MANIFIESTO.sha256.
  2. Deja en el clon del repositorio privado (_local/repo_sia/, se clona si no está) exactamente el contenido del paquete:
     lo de la entrega anterior que ya no viene se quita (queda en el historial de ese repositorio).
  3. .gitattributes «* -text»: Git no cambia ningún fin de línea, así las sumas del manifiesto valen al bajarlo en Linux.
  4. Commit «Entrega AAAA-MM-DD · vX.Y.Z» y etiqueta entrega-AAAA-MM-DD (con b, c… si ya hubo otra ese día).
NO hace Push: lo hace quien entrega, después de revisar: git -C _local/repo_sia push origin main <etiqueta>
"""
import hashlib, os, re, shutil, subprocess, sys, tempfile, zipfile

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTREGA = os.path.join(RAIZ, '_local', 'entrega')
CLON = os.path.join(RAIZ, '_local', 'repo_sia')
REMOTO = 'https://github.com/SedemaOficina/modelo-priorizacion-reforestacion-sia.git'

def suma(ruta):
    h = hashlib.sha256()
    with open(ruta, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()

def git(*args, salida=False):
    p = subprocess.run(['git', '-C', CLON] + list(args), capture_output=True, text=True, encoding='utf-8')
    if p.returncode: sys.exit('ERROR: git %s\n%s' % (' '.join(args), p.stderr.strip()))
    return p.stdout.strip() if salida else None

# el más reciente por fecha del archivo, no por nombre: «v1.0.0» va antes que «v1.53» en orden alfabético
zips = sorted((os.path.join(ENTREGA, a) for a in os.listdir(ENTREGA) if a.endswith('.zip')), key=os.path.getmtime) if os.path.isdir(ENTREGA) else []
ZIP = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else (zips[-1] if zips else None)
if not ZIP or not os.path.exists(ZIP): sys.exit('ERROR: no hay paquete; primero: python 08_entrega_sia/empaquetar.py')
m = re.search(r'_v(\d+(?:\.\d+)+)_(\d{4})(\d{2})(\d{2})\.zip$', ZIP)
if not m: sys.exit('ERROR: el nombre del ZIP no es el de empaquetar.py: ' + os.path.basename(ZIP))
version, fecha = m.group(1), '%s-%s-%s' % m.group(2, 3, 4)

# 1. el ZIP contra su .sha256 y, descomprimido, contra su manifiesto
esperada = open(ZIP + '.sha256', encoding='utf-8').read().split()[0]
if suma(ZIP) != esperada: sys.exit('ERROR: el ZIP no coincide con su .sha256')
tmp = tempfile.mkdtemp(prefix='entrega-sia-')
try:
    zipfile.ZipFile(ZIP).extractall(tmp)
    (raiz,) = [os.path.join(tmp, a) for a in os.listdir(tmp)]
    lineas = [l for l in open(os.path.join(raiz, 'MANIFIESTO.sha256'), encoding='utf-8').read().split('\n') if l.strip()]
    malos = [r for s, r in (l.split('  ', 1) for l in lineas) if suma(os.path.join(raiz, r)) != s]
    if malos: sys.exit('ERROR: no coinciden con MANIFIESTO.sha256: ' + ', '.join(malos[:5]))

    # 2. el clon, con exactamente el contenido del paquete
    if not os.path.isdir(os.path.join(CLON, '.git')):
        subprocess.run(['git', 'clone', '-q', REMOTO, CLON], check=True)
    if subprocess.run(['git', '-C', CLON, 'rev-parse', '--verify', '-q', 'HEAD'], capture_output=True).returncode:
        git('symbolic-ref', 'HEAD', 'refs/heads/main')   # repositorio vacío: la primera entrega va en «main»
    for a in os.listdir(CLON):
        if a != '.git':
            p = os.path.join(CLON, a); shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
    for a in os.listdir(raiz):
        o = os.path.join(raiz, a); shutil.copytree(o, os.path.join(CLON, a)) if os.path.isdir(o) else shutil.copy2(o, CLON)
    # 3. sin conversión de fines de línea
    open(os.path.join(CLON, '.gitattributes'), 'w', encoding='utf-8', newline='\n').write('* -text\n')

    # 4. commit y etiqueta
    git('add', '-A')
    if not git('status', '--porcelain', salida=True): sys.exit('Nada que entregar: el repositorio ya tiene este contenido.')
    etiquetas = set(git('tag', '--list', salida=True).split())
    etiqueta = 'entrega-' + fecha
    for letra in 'bcdefghij':
        if etiqueta not in etiquetas: break
        etiqueta = 'entrega-%s%s' % (fecha, letra)
    git('commit', '-q', '-m', 'Entrega %s · v%s' % (fecha, version), '-m', 'Paquete %s (sha256 %s). Comprobar con: sha256sum -c MANIFIESTO.sha256'
        % (os.path.basename(ZIP), esperada))
    git('tag', '-a', etiqueta, '-m', 'Entrega %s · v%s' % (fecha, version))
    print('listo: %s · v%s · %d archivos comprobados · commit %s' % (etiqueta, version, len(lineas), git('rev-parse', '--short', 'HEAD', salida=True)))
    print('para publicarla: git -C _local/repo_sia push origin main %s' % etiqueta)
finally:
    shutil.rmtree(tmp, ignore_errors=True)
