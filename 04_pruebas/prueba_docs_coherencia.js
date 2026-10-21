// Coherencia de los documentos (auditoría del 19 de octubre de 2026, bloque 3: D1-01 a D1-05, G1-01 y G2-01). No abre el navegador:
// corre en las rápidas. Revisa los documentos versionados (sin _local/, _to_delete/, node_modules/, docs/, la bitácora, que es historia,
// ni el informe de la auditoría y su evidencia, que citan a propósito los textos viejos):
//  1. ninguna afirmación de que la Unidad de Transparencia aprobó algo sin el número de oficio en el mismo renglón;
//  2. los avisos de privacidad no citan el «21 Ter» (ley abrogada); el integral y su página traen «Transferencias» y «ARCOP», sin
//     «derechos ARCO» a secas;
//  3. en 08_entrega_sia/, ninguna de las cifras o frases de la v1.0 que ya no son ciertas (D1-03);
//  4. el número de pruebas que dice 04_pruebas/LEEME.md = el de correr_todas.js, por grupo; cada prueba tiene su renglón en la tabla;
//     CLAUDE.md dice la misma duración, y README, ARQUITECTURA y la verificación de GitHub no repiten el número ni la duración;
//  5. ningún «python3 archivo.py» en los documentos de este equipo (en Windows es «python»), salvo la lista blanca de instrucciones
//     para Linux;
//  6. 05_documentacion/componentes_compartidos.md existe, tiene un renglón por cada librería de 02_fuente/libs/LICENCIAS.md (con su
//     versión) y no trae direcciones IP.
// Uso: node 04_pruebas/prueba_docs_coherencia.js [RAÍZ]   · RAÍZ, por omisión la del repositorio; otra carpeta (por ejemplo, una
//      versión anterior sacada con «git archive») sirve para comprobar que la prueba falla contra ella. Código ≠ 0 si algo falla.
const path = require('path'), fs = require('fs');
const RAIZ = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const r = []; const ok = (n, cond, det = '') => { r.push([!!cond, n, det]); console.log(`${cond ? 'OK   ' : 'FALLA'} ${n}${det ? ' · ' + det : ''}`); return !!cond; };
const leer = rel => { const p = path.join(RAIZ, rel); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').replace(/\r/g, '') : null; };
const ESTE = '04_pruebas/prueba_docs_coherencia.js';

// ---------- documentos que se revisan ----------
const FUERA_CARPETAS = new Set(['.git', 'node_modules', '_local', '_to_delete', 'docs', '07_versiones', 'capturas', '__pycache__', 'insumos', 'intermedios']);
const FUERA_RUTAS = [/^05_documentacion\/bitacora\//, /^05_documentacion\/AUDITORIA-[^/]*\.md$/, /^05_documentacion\/evidencia-[^/]*\//,
  /^02_fuente\/libs\//, /^02_fuente\/datos\//, new RegExp('^' + ESTE.replace(/\./g, '\\.') + '$')];
const EXT = new Set(['.md', '.html', '.txt', '.py', '.js', '.mjs', '.ts', '.ejemplo', '.yml', '.sql']);
function recorrer(dir, rel = '') {
  let sal = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const r2 = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) { if (!FUERA_CARPETAS.has(e.name)) sal = sal.concat(recorrer(path.join(dir, e.name), r2)); continue; }
    if (EXT.has(path.extname(e.name).toLowerCase()) && !FUERA_RUTAS.some(x => x.test(r2))) sal.push(r2);
  }
  return sal;
}
const DOCS = recorrer(RAIZ).sort();
const TEXTO = new Map(DOCS.map(d => [d, leer(d)]));
ok('hay documentos que revisar', DOCS.length > 20 && TEXTO.has('README.md'), `${DOCS.length} archivos en ${RAIZ}`);
// renglones que cumplen una expresión, como «archivo:línea»
function buscar(re, filtro = () => true, excepto = () => false) {
  const sal = [];
  for (const [d, t] of TEXTO) { if (!filtro(d)) continue; t.split('\n').forEach((l, i) => { if (re.test(l) && !excepto(l, d)) sal.push(`${d}:${i + 1}`); }); }
  return sal;
}

// ---------- 1. aprobaciones de la Unidad de Transparencia sin número de oficio (D1-01) ----------
const APROBADO = /aprobad[oa]s?\s+por\s+la\s+(Unidad\s+de\s+Transparencia|UT)\b|Transparencia\s*\(\s*aprob|Unidad\s+de\s+Transparencia\s+(ya\s+)?(lo\s+|la\s+|los\s+)?aprob[óo]/i;
const CON_OFICIO = /oficio\s*(n[úu]m(ero)?\.?|no\.?)?\s*[:#]?\s*[A-Z0-9/.-]*\d/i;
const sinOficio = buscar(APROBADO, () => true, l => CON_OFICIO.test(l));
ok('ninguna aprobación de la Unidad de Transparencia sin número de oficio', sinOficio.length === 0, sinOficio.join(', '));

// ---------- 2. avisos de privacidad (G1-01) ----------
const AVISOS = DOCS.filter(d => /^08_entrega_sia\/login\/privacidad\/[^/]+\.md$/.test(d)).concat(['08_entrega_sia/login/acceso/aviso-de-privacidad.html']);
const terConCita = buscar(/21\s*Ter\b/i, d => AVISOS.includes(d));
ok('ningún aviso de privacidad cita el artículo 21 Ter (ley abrogada)', terConCita.length === 0, terConCita.join(', '));
for (const d of ['08_entrega_sia/login/privacidad/aviso_integral.md', '08_entrega_sia/login/acceso/aviso-de-privacidad.html']) {
  const t = leer(d);
  ok(`${d}: trae «Transferencias» y «ARCOP», sin «derechos ARCO» a secas`, !!t && /Transferencias/.test(t) && /ARCOP/.test(t) && !/derechos\s+ARCO(?![A-Za-z])/i.test(t),
    !t ? 'no existe' : ['Transferencias', 'ARCOP'].filter(x => !t.includes(x)).map(x => 'falta ' + x).concat(/derechos\s+ARCO(?![A-Za-z])/i.test(t) ? ['dice «derechos ARCO»'] : []).join(', '));
}

// ---------- 3. cifras y frases de la v1.0 en los documentos de entrega (D1-03) ----------
const VIEJAS = [
  [/\b8 MB\b/, '«8 MB» (el sitio pesa más: ver cifras_de_la_construccion.md)'],
  [/\b40 MB\b/, '«40 MB» por cinco versiones'],
  [/tres archivos de datos/i, '«tres archivos de datos» (también el fondo y el inventario)'],
  [/\b14 archivos\b/, '«14 archivos» al abrir'],
  [/\b12 de 12\b/, '«12 de 12» funciones'],
  [/\b5 de 5\b/, '«5 de 5» pruebas del módulo'],
  [/trae la clave del mapa/i, '«trae la clave del mapa» (no la trae)'],
  [/no envía nada al servidor/i, '«no envía nada al servidor» (con sesión envía el registro de usos)'],
  [/15 puntos \(19 con login\)/i, '«15 puntos (19 con login)»'],
  [/Estado de preparación \([^)]*versión 1\.0\)/i, '«Estado de preparación (… versión 1.0)»'],
  [/red y filtro de banqueta\)/i, 'el registro de consultas sin el filtro «Espacio»'],
  [/Prueba de uso con .*alcald[íi]as/i, 'la prueba con alcaldías (descartada)'],
  [/pide a terceros las teselas del mapa de fondo/i, '«las teselas del mapa de fondo» («Calles» es propio; solo el satélite)'],
];
for (const [re, que] of VIEJAS) {
  const hay = buscar(re, d => d.startsWith('08_entrega_sia/'));
  ok(`08_entrega_sia/ sin ${que}`, hay.length === 0, hay.join(', '));
}

// ---------- 4. número y duración de las pruebas: una sola cifra, en 04_pruebas/LEEME.md (D1-02) ----------
const correr = leer('04_pruebas/correr_todas.js') || '', leeme = leer('04_pruebas/LEEME.md') || '';
const bloque = (t, ini, fin) => { const i = t.indexOf(ini); if (i < 0) return ''; const j = t.indexOf(fin, i); return t.slice(i, j < 0 ? undefined : j); };
const rap = bloque(correr, 'const RAPIDAS = [', '\n];').split('\n').filter(l => /^\s*\[\s*'/.test(l));
const nav = (bloque(correr, 'const NAVEGADOR = [', ']').match(/'prueba_[\w]+\.js'/g) || []).map(s => s.slice(1, -1));
ok('correr_todas.js: se leen los dos grupos de pruebas', rap.length > 0 && nav.length > 0, `${rap.length} rápidas · ${nav.length} de navegador`);
const nRap = (leeme.match(/\*\*(\d+) verificaciones rápidas\*\*/) || [])[1], nNav = (leeme.match(/\*\*(\d+) pruebas de navegador\*\*/) || [])[1];
ok('04_pruebas/LEEME.md dice cuántas verificaciones rápidas hay, igual que correr_todas.js', +nRap === rap.length, `LEEME: ${nRap ?? 'no lo dice'} · correr_todas.js: ${rap.length}`);
ok('04_pruebas/LEEME.md dice cuántas pruebas de navegador hay, igual que correr_todas.js', +nNav === nav.length, `LEEME: ${nNav ?? 'no lo dice'} · correr_todas.js: ${nav.length}`);
const tabla = leeme.split('\n').filter(l => l.startsWith('|')).join('\n');
const nombresRap = rap.map(l => /ESLint/.test(l) ? 'ESLint' : ((l.match(/\['([^']+\.(?:py|js))'\]/) || [])[1] || '').split('/').pop());
const sinRenglon = nombresRap.concat(nav).filter(n => !n || !tabla.includes(n));
ok('cada prueba de correr_todas.js tiene su renglón en la tabla de 04_pruebas/LEEME.md', sinRenglon.length === 0, sinRenglon.join(', '));
const minLeeme = (leeme.match(/correr_todas\.js\s+todo[^\n]*?unos (\d+) minutos/) || [])[1];
const minClaude = ((leer('CLAUDE.md') || '').match(/Todas \(unos (\d+) minutos/) || [])[1];
ok('la duración de la serie completa está en 04_pruebas/LEEME.md y CLAUDE.md dice la misma', !!minLeeme && minLeeme === minClaude, `LEEME: ${minLeeme ?? '—'} min · CLAUDE.md: ${minClaude ?? '—'} min`);
// los demás documentos remiten al LEEME: ni el número de pruebas ni la duración de la serie (las filas de versiones del README son historia)
const NUM = '(\\d+|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciséis|diecisiete|dieciocho|diecinueve|veinte)';
const REMITEN = ['README.md', 'ARQUITECTURA.md', 'CLAUDE.md', '05_documentacion/verificacion_automatica_github.md', '04_pruebas/correr_todas.js'];
const repiten = buscar(new RegExp(`\\b${NUM}\\s+pruebas(\\s+de\\s+navegador)?\\b|correr_todas\\.js[^\\n]*\\bunos\\s+\\d+\\s+minutos`, 'i'), d => REMITEN.includes(d),
  (l, d) => (d === 'README.md' && /^\|\s*\d+(\.\d+)?( a [\d.]+)?\s*\|/.test(l)) || (d === 'CLAUDE.md' && /^- Todas \(unos \d+ minutos/.test(l)));
ok('README, ARQUITECTURA, CLAUDE.md, la verificación de GitHub y correr_todas.js no repiten el número ni la duración de las pruebas', repiten.length === 0, repiten.join(', '));

// ---------- 5. python3 en los documentos de este equipo (D1-05) ----------
// Lista blanca: instrucciones que corren en Linux, donde «python3» es el nombre correcto.
const LINUX = new Set(['05_documentacion/verificacion_automatica_github.md']);   // GitHub Actions corre en ubuntu-latest
const py3 = buscar(/\bpython3\s+[\w./\\-]+\.py\b/, d => !LINUX.has(d));
ok('ningún «python3 archivo.py» en los documentos de este equipo (en Windows es «python»)', py3.length === 0, py3.join(', '));

// ---------- 6. registro de componentes compartidos (G2-01) ----------
const comp = leer('05_documentacion/componentes_compartidos.md'), lic = leer('02_fuente/libs/LICENCIAS.md') || '';
const libs = lic.split('\n').filter(l => /^\|\s*`[^`]+`\s*\|/.test(l) && !/SHA-256|^\|\s*Archivo/.test(l)).map(l => l.split('|').map(c => c.trim()))
  .filter(c => c.length > 4 && !/^[0-9a-f]{20,}/.test(c[3].replace(/`/g, ''))).map(c => ({ nombre: c[2].split(/[\s(]/)[0], version: /^\d+\.\d+/.test(c[3]) ? c[3] : '' }));
ok('02_fuente/libs/LICENCIAS.md: se leen sus librerías', libs.length >= 4, libs.map(l => l.nombre + (l.version ? ' ' + l.version : '')).join(', '));
if (!ok('existe 05_documentacion/componentes_compartidos.md', !!comp)) { /* sin archivo, lo demás no se puede revisar */ }
else {
  const filas = comp.split('\n').filter(l => /^\|\s*[A-Z]+-\d+\s*\|/.test(l));
  const faltan = libs.filter(l => !filas.some(f => f.includes(l.nombre) && (!l.version || f.includes(l.version)))).map(l => l.nombre + (l.version ? ' ' + l.version : ''));
  ok('componentes_compartidos.md tiene un renglón por cada librería de LICENCIAS.md, con su versión', faltan.length === 0, faltan.length ? 'faltan: ' + faltan.join(', ') : `${filas.length} renglones`);
  const ips = comp.match(/\b\d{1,3}(\.\d{1,3}){3}\b/g) || [];
  ok('componentes_compartidos.md no trae direcciones IP (es público)', ips.length === 0, ips.join(', '));
}

const f = r.filter(x => !x[0]); console.log(`\n[documentos] ${r.length - f.length} de ${r.length} verificaciones correctas; ${f.length} fallas`);
if (f.length) { console.log('Fallas:'); f.forEach(x => console.log('  - ' + x[1] + (x[2] ? ' · ' + x[2] : ''))); }
process.exitCode = f.length ? 1 : 0;
