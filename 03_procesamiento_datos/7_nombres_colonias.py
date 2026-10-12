# -*- coding: utf-8 -*-
"""Nombres de colonia para mostrar. El catálogo trae los nombres sin acentos («Villa Coyoacan», «Ampliacion del Gas»), con abreviaturas
(«Ampl», «U H», «Ejto»), siglas en minúsculas («Ctm») y mayúsculas raras («Seccion Xvi», «De La CanDelaria»). Aquí:
  - acentos solo de palabras que siempre los llevan (lista ACENTOS, revisada a mano; no se adivinan);
  - abreviaturas claras desarrolladas (ABREV) y siglas en mayúsculas (SIGLAS), también con letras separadas («C T M» → «CTM»);
  - ordinales con su terminación en minúscula («2Da» → «2da») y números romanos en mayúsculas («Xvi» → «XVI»);
  - artículos y preposiciones en minúscula dentro del nombre; una letra sola entre nombres es una inicial («Luis E Rodriguez» → «Luis E. Rodríguez»);
  - CORRECCIONES: nombres que la regla deja mal, puestos a mano.
El nombre original del catálogo no se pierde: la herramienta lo conserva y lo entrega en los Excel (columna colonia_catalogo) y en la capa
de GeoServer. La búsqueda no distingue acentos y también reconoce el nombre original.

Lee intermedios/meta.json; escribe 02_fuente/datos/nombres_colonias.json ({id: nombre limpio}, solo los que cambian) y la lista completa
de cambios en _local/revision_nombres_colonias.csv para revisarla. Uso: python 03_procesamiento_datos/7_nombres_colonias.py
"""
import csv
import json
import os
import re
import unicodedata

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
plano = lambda t: ''.join(ch for ch in unicodedata.normalize('NFD', t.lower()) if unicodedata.category(ch) != 'Mn' or ch == '̃')

ACENTOS = {plano(w): w for w in '''Sección Aragón María Juárez López Ampliación Culhuacán Ticomán Coyoacán Millán Rincón Águilas Concepción
Sánchez Agustín Gómez Asunción Simón Capulín Estación Sebastián Lucía Alemán Mirón Tizapán Zapotitlán Jardín Martín Tomás Serdán Domínguez
Constitución Río Ríos González Pantitlán Tomatlán Belén Américas Aviación Rodríguez Zimbrón Liberación García Hernández Pavón Obregón Panteón
Batán Revolución Redención Suárez Valentín Farías Cárdenas Matías Gutiérrez Clavería Ferrería Educación Fortín Integración Inguarán Edén
Sifón Escuadrón Albán Generación Renovación Magón Ramón Subestación Martínez Emancipación Herón Unión Zenón Esperón Zacatón Chávez Tórtolas
Echeverría Jazmín Ánimas Letrán Algarín Escandón Irrigación Elías Joaquín Pérez Aarón Gráficas Damián Asociación Orquídeas Cuautitlán
Macías Chavarría Rubén Batallón División Bahía Penitenciaría Abdías Peñón Ángel Ángeles Álvaro Agrícola México José Jesús Andrés Lázaro
Bartolomé Hipódromo Periférico Politécnico Ejército Héroes Árbol Árboles Olímpica Anáhuac Tláhuac Cuauhtémoc Eléctrica República Pacífico
Atlántico Tecnológico Petróleos Nápoles Álamos Álamo Córdoba Mérida Querétaro Michoacán Yucatán León Médico Médica Vértiz Ramírez Héctor
Víctor Félix Óscar Raúl Iván Darío Inés Fátima Mónica Verónica Mártires Ébano Ícaro Íñigo Ixtlahuacán Xicoténcatl Paraíso Ávila Ángulo
Aztlán Teotihuacán Cristóbal Ángela Rosalía Cañada Pólvora Prolongación Tránsito Corazón Chimalcóyotl Bolívar Polvorín Nezahualcóyotl
Púlpito Época Diálogo Tepozán Zapotlán Nicolás Capultitlán Tecoloxtitlán Miacatlán Coactetlán Xicalhuacán Aztahuacán Triángulo
Mediterráneo Fraternidad Habitacional Fraccionamiento Pirámide Pirámides Pensión Pensiones Química Químicos Volcán Volcanes Montaña Ecológico
Ecológica Económica Económico Práctica Técnica Técnico Católica Histórico Histórica Sinaí Jerusalén Belém Tepeyác Guadalupana Ermita
Díaz Vázquez Velázquez Jiménez Fernández Benítez Méndez Núñez Ordóñez Ibáñez Gálvez Galván Sáenz Álvarez Márquez Muñoz Peña Vélez Andrés
Cortés Durán Guzmán Beltrán Garcés Ruán Corazón Artículo Sagrado Tláloc Ajusco'''.split()}
ACENTOS.pop(plano('Tepeyác'))   # se escribe sin acento
ABREV = {'ampl': 'Ampliación', 'amp': 'Ampliación', 'fracc': 'Fraccionamiento', 'fed': 'Federal', 'sn': 'San', 'ejto': 'Ejército',
         'ote': 'Oriente', 'pte': 'Poniente', 'prol': 'Prolongación', 'sta': 'Santa', 'sto': 'Santo', 'secc': 'Sección', 'hab': 'Habitacional',
         'gral': 'General', 'art': 'Artículo', 'lic': 'Licenciado', 'ing': 'Ingeniero', 'prof': 'Profesor', 'cd': 'Ciudad', 'pblo': 'Pueblo', 'bo': 'Barrio'}
SIGLAS = {s.lower(): s for s in 'CTM CROC IMSS ISSSTE FOVISSSTE INFONAVIT FIVIDESU ISSFAM UNAM IPN CFE SCT SME SNTE STUNAM FOVI INVI DDF CNC CNOP'.split()}
SIGLAS['pemex'] = 'Pemex'
PREP = {'de', 'del', 'y', 'en', 'al', 'a'}
ART = {'la', 'las', 'los', 'el'}
ROMANO = re.compile(r'^(?=[ivxl]{2,}$)(x{0,3})(ix|iv|v?i{0,3})$', re.I)
ORDINAL = re.compile(r'^(\d+)(ra|da|do|er|to|ta|va|vo|na|no|mo|ma|o|a)$', re.I)
CORRECCIONES = {}   # nombre original del catálogo → nombre para mostrar, cuando la regla lo deja mal


def palabra(p, inicio, previa, siguiente):
    base = p.lower()
    if base in SIGLAS:
        return SIGLAS[base]
    if base in ABREV:
        return ABREV[base]
    m = ORDINAL.match(p)
    if m and (len(m.group(2)) > 1 or re.match(r'[A-Za-zÁÉÍÓÚÑáéíóúñ]', siguiente)):
        return m.group(1) + m.group(2).lower()
    if m:
        return p.upper()
    if ROMANO.match(base):
        return base.upper()
    if len(base) == 1 and base.isalpha():
        # «e» es conjunción solo antes de «i» o «hi» («Rosa e Isabel»); otra letra sola entre palabras es una inicial
        if not inicio and base == 'e' and re.match(r'h?i', siguiente.lower()):
            return 'e'
        if not siguiente or not re.match(r'[A-Za-zÁÉÍÓÚÑáéíóúñ]', siguiente):
            return base.upper()
        if not inicio and base in ('y', 'a', 'o'):
            return base
        return base.upper() + '.'
    if not inicio and base in PREP:
        return base
    if not inicio and base in ART and previa in ('de', 'del', 'en'):
        return base
    if plano(p) in ACENTOS:
        return ACENTOS[plano(p)]
    return p[:1].upper() + p[1:].lower()


def limpia(n):
    if not n:
        return n
    if n in CORRECCIONES:
        return CORRECCIONES[n]
    s = re.sub(r'\bU\s*\.?\s*H(ab)?\b\.?', 'U. H.', n.strip())
    s = re.sub(r'\b([A-Za-z])((?:\s+[A-Za-z]\b){1,4})', lambda m: (m.group(0).replace(' ', '') if m.group(0).replace(' ', '').lower() in SIGLAS else m.group(0)), s)
    partes = re.split(r'(\s+|[()\-,/]+)', s)
    palabras = [i for i, t in enumerate(partes) if t and not re.fullmatch(r'\s+|[()\-,/]+', t)]
    out, inicio, previa = [], True, ''
    for k, t in enumerate(partes):
        if not t:
            continue
        if re.fullmatch(r'\s+|[()\-,/]+', t):
            out.append(t)
            inicio = inicio or '(' in t
            continue
        if t in ('U.', 'H.') or not re.search(r'[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]', t) or (re.search(r'\d', t) and not ORDINAL.match(t.rstrip('.'))):
            out.append(t)
            inicio = False
            previa = t.lower()
            continue
        sig = next((partes[j] for j in palabras if j > k), '')
        q = t.rstrip('.')
        r = palabra(q, inicio, previa, sig)
        out.append(r if r.endswith('.') else r + t[len(q):])
        inicio = False
        previa = q.lower()
    s = re.sub(r'\s+', ' ', ''.join(out)).strip()
    return re.sub(r'\s*-?\(\s*', ' (', re.sub(r'\s+\)', ')', s)).strip()


if __name__ == '__main__':
    meta = json.load(open(os.path.join(AQUI, 'intermedios', 'meta.json'), encoding='utf-8'))
    muns = {m: n for m, n in zip(meta['muns'], meta['munNames'])} if 'munNames' in meta else {}
    cambios, filas = {}, []
    for i, c in enumerate(meta['colonias']):
        if not c or not c.get('n'):
            continue
        nuevo = limpia(c['n'])
        if nuevo != c['n']:
            cambios[str(i)] = nuevo
            filas.append([i, muns.get(c.get('m'), c.get('m', '')), c['n'], nuevo])
    salida = os.path.join(RAIZ, '02_fuente', 'datos', 'nombres_colonias.json')
    json.dump(cambios, open(salida, 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, indent=0, sort_keys=True)
    os.makedirs(os.path.join(RAIZ, '_local'), exist_ok=True)
    with open(os.path.join(RAIZ, '_local', 'revision_nombres_colonias.csv'), 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f)
        w.writerow(['id_colonia', 'alcaldia', 'nombre_catalogo', 'nombre_para_mostrar'])
        w.writerows(filas)
    distintos = len({r[2] for r in filas})
    print('%d de %d colonias cambian de nombre para mostrar (%d nombres distintos) → %s' % (len(cambios), sum(1 for c in meta['colonias'] if c and c.get('n')), distintos, os.path.relpath(salida, RAIZ)))
    print('lista para revisar: _local/revision_nombres_colonias.csv')
