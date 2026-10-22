// Consistencia automática (auditoría del 19 oct 2026, A5 y sección 12), sin navegador: corre en las rápidas y en GitHub.
// - ids repetidos en la plantilla, en docs/index.html y en las pantallas de acceso, e ids que el programa escribe y ya usa la plantilla;
// - ningún style="…" ni setAttribute('style') (la política de seguridad de contenido no deja estilos en línea: se usa data-st);
// - términos retirados en lo que lee la persona (C5-02: «Gobierno de la Ciudad» solo en el fundamento legal y el logotipo);
// - claves, llaves y direcciones internas en los archivos del repositorio (lo que revisaría gitleaks en docs/, y más);
// - clases de la hoja de estilos que nadie usa.
// Uso: node 04_pruebas/prueba_consistencia.js
const path = require('path'), fs = require('fs'), cp = require('child_process');
const RAIZ = path.join(__dirname, '..'), F = path.join(RAIZ, '02_fuente');
const r = []; const ok = (n, cond, det = '') => { r.push([!!cond, n, det]); console.log(`${cond ? 'OK   ' : 'FALLA'} ${n}${det ? ' · ' + det : ''}`); return !!cond; };
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), 'utf8');
const lista = (a, n = 8) => a.length > n ? a.slice(0, n).join(' · ') + ` · y ${a.length - n} más` : a.join(' · ');
// quita comentarios: los de bloque y los de línea que empiezan tras un espacio o al inicio (no corta «https://» dentro de un texto)
const sinComentariosJS = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
const sinComentariosHTML = t => t.replace(/<!--[\s\S]*?-->/g, '');

const MODULOS = fs.readdirSync(path.join(F, 'js')).filter(a => a.endsWith('.js')).sort();
const js = Object.fromEntries(MODULOS.map(a => [a, sinComentariosJS(leer('02_fuente', 'js', a))]));
const plantilla = sinComentariosHTML(leer('02_fuente', 'plantilla.html'));
const ACCESO = ['08_entrega_sia/login/acceso/index.html', '08_entrega_sia/login/acceso/admin/index.html'].filter(a => fs.existsSync(path.join(RAIZ, a)));
const PUBLICADO = ['docs/index.html', 'docs/app.js', 'docs/config.js', 'docs/sw.js'];
const veces = a => a.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map());

// ---------- ids ----------
const idsDe = t => [...t.matchAll(/\sid="([^"$]+)"/g)].map(m => m[1]);
for (const [nombre, t] of [['02_fuente/plantilla.html', plantilla], ['docs/index.html', sinComentariosHTML(leer('docs', 'index.html'))], ...ACCESO.map(a => [a, sinComentariosHTML(leer(a))])]) {
  const ids = idsDe(t), rep = [...veces(ids)].filter(([, n]) => n > 1).map(([id, n]) => `${id} ×${n}`);
  ok(`${nombre}: ningún id repetido`, ids.length > 0 && rep.length === 0, rep.length ? lista(rep) : `${ids.length} ids`);
}
{ // ids fijos que escribe el programa (id="…" en sus plantillas de texto, x.id = '…', id:'…' de un elemento): no deben chocar con la plantilla
  const dePlantilla = new Set(idsDe(plantilla)), choques = [];
  for (const [a, t] of Object.entries(js)) for (const m of t.matchAll(/(?:\sid="|\.id\s*=\s*['"])([A-Za-z][\w-]*)["']/g)) if (dePlantilla.has(m[1])) choques.push(`${m[1]} (${a})`);
  ok('el programa no crea elementos con un id que ya tiene la plantilla', choques.length === 0, lista(choques));
}

// ---------- estilos en línea ----------
{ const con = [];
  const revisa = (n, t) => { for (const re of [/\sstyle\s*=\s*["'{]/g, /setAttribute\(\s*['"]style['"]/g]) for (const m of t.matchAll(re)) con.push(`${n}:${t.slice(0, m.index).split('\n').length}`); };
  revisa('02_fuente/plantilla.html', plantilla); for (const [a, t] of Object.entries(js)) revisa('02_fuente/js/' + a, t);
  for (const a of [...PUBLICADO, ...ACCESO]) revisa(a, a.endsWith('.js') ? sinComentariosJS(leer(a)) : sinComentariosHTML(leer(a)));
  ok('sin style="…" ni setAttribute(\'style\') en la plantilla, los módulos, docs/ y las pantallas de acceso (se usa data-st)', con.length === 0, lista(con)); }

// ---------- términos retirados ----------
{ // lo que lee la persona: plantilla, módulos y pantallas de acceso, sin comentarios. El fundamento legal (con su tabla) y el
  // texto alternativo del logotipo pueden decir «Gobierno de la Ciudad» (decisión C5-02 de Liber)
  const sinFundamento = plantilla.replace(/<b>Fundamento\.<\/b>[\s\S]*?<\/table>/, '');
  ok('la plantilla tiene su fundamento legal (si cambia, revisar la excepción de «Gobierno de la Ciudad» de esta prueba)', sinFundamento !== plantilla);
  const textos = [['02_fuente/plantilla.html', sinFundamento], ...Object.entries(js).map(([a, t]) => ['02_fuente/js/' + a, t]), ...ACCESO.map(a => [a, sinComentariosHTML(leer(a))])]
    .map(([n, t]) => [n, t.replace(/alt="Gobierno de la Ciudad de México ·/g, 'alt="')]);
  const RETIRADOS = [
    [/Gobierno de la Ciudad/, '«Gobierno de la Ciudad» (se dice «Gobierno Central»; C5-02)'],
    [/\bsembrar\b/i, '«sembrar» (se dice «plantar»)'],
    [/derribo y reposición/i, '«derribo y reposición»'],
    [/universo de intervención/i, '«universo de intervención» (se dice «prioritario»)'],
    [/asignación preliminar/i, '«asignación preliminar»'],
    [/Sin o por verificar/, '«Sin o por verificar»'],
    [/\((?:prioritarias|todas)\)/, 'las opciones «(prioritarias)» y «(todas)» de «Mostrar» (retiradas en la v1.27)'],
    [/hoja mínima/i, '«hoja mínima» (retirada en la v1.11)'],
    [/\bCompartir\b/, '«Compartir» (se retiró el botón)'],
    [/tel[ée]fono/i, '«teléfono» (se dice «celular»; C5-04)'],
    [/\b(clases?|categorías?) (de prioridad|Muy Alta)/i, '«clase» ni «categoría» de prioridad (se dice «prioridad»; C5-04)'],
    [/\b(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\. \d{4}\b/, 'meses abreviados como «nov. 2025» (van completos; C5-04)'],
  ];
  for (const [re, nom] of RETIRADOS) { const donde = textos.filter(([, t]) => re.test(t)).map(([n]) => n);
    ok(`sin ${nom} en la herramienta`, donde.length === 0, lista(donde)); }
}

// ---------- colores en un solo lugar (A6-02): 01_variables.css; las demás hojas y la ficha PDF usan sus variables ----------
{ const con = [];
  for (const a of fs.readdirSync(path.join(F, 'css')).filter(x => x.endsWith('.css') && x !== '01_variables.css')) {
    const t = leer('02_fuente', 'css', a).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of t.matchAll(/#[0-9A-Fa-f]{3,8}\b|(?<![\w-])white(?![\w-])|rgba?\(\s*\d/g)) con.push(`css/${a}:${t.slice(0, m.index).split('\n').length} ${m[0]}`); }
  const pdf = js['12_fichas_pdf.js']; for (const m of pdf.matchAll(/\[\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\]|set(?:Fill|Draw|Text)Color\(\s*\d/g)) con.push(`js/12_fichas_pdf.js:${pdf.slice(0, m.index).split('\n').length} ${m[0]}`);
  ok('colores solo en 01_variables.css: ninguno escrito a mano en las demás hojas ni en la ficha PDF', con.length === 0, lista(con)); }

// ---------- el código no cuenta su historia (F1-01): la historia está en Git y en la bitácora ----------
{ const con = [];
  for (const [d, ext] of [['js', '.js'], ['css', '.css']]) for (const a of fs.readdirSync(path.join(F, d)).filter(x => x.endsWith(ext)))
    leer('02_fuente', d, a).split('\n').forEach((l, i) => { if (/\bv1\.\d+\b|\bv17\.\d+\b/.test(l)) con.push(`02_fuente/${d}/${a}:${i + 1}`); });
  leer('02_fuente', 'plantilla.html').split('\n').forEach((l, i) => { if (/\bv1\.\d+\b/.test(l)) con.push(`02_fuente/plantilla.html:${i + 1}`); });
  ok('sin números de versión («v1.24») en los comentarios del código', con.length === 0, lista(con)); }

// ---------- claves, llaves y direcciones internas ----------
{ let archivos;
  try { archivos = cp.execFileSync('git', ['ls-files', '-z'], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 26 }).split('\0').filter(Boolean); }
  catch (e) { const todo = d => fs.readdirSync(path.join(RAIZ, d), { withFileTypes: true }).flatMap(x => x.isDirectory() ? todo(path.join(d, x.name)) : [path.join(d, x.name)]);
    archivos = ['docs', '02_fuente', '05_documentacion', '08_entrega_sia'].flatMap(todo).map(a => a.split(path.sep).join('/')); }
  // binarios fuera; claves.local.json no se publica (está en .gitignore) y no debe revisarse aunque exista en este equipo
  archivos = archivos.filter(a => !/\.(bin|png|jpg|jpeg|gif|ico|woff2?|pdf|docx|xlsx|npz|npy|gpkg|zip|rar)$/i.test(a) && !/claves\.local\.json$/.test(a) && fs.existsSync(path.join(RAIZ, a)));
  const PATRONES = [
    [/AIza[0-9A-Za-z_-]{35}/, 'clave de Google'], [/AKIA[0-9A-Z]{16}/, 'clave de AWS'], [/\bAAP[KT][A-Za-z0-9_-]{40,}/, 'clave de ArcGIS (Esri)'],
    [/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----\s*\n[A-Za-z0-9+/=]{40,}/, 'llave privada'],
    [/\bgh[pousr]_[A-Za-z0-9]{36}\b/, 'token de GitHub'], [/\bxox[baprs]-[A-Za-z0-9-]{10,}/, 'token de Slack'],
    [/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, 'token JWT'],
    [/postgres(?:ql)?:\/\/[^:\s'"]+:[^@\s'"]{6,}@/, 'cadena de conexión con contraseña'],
  ];
  // direcciones internas: las de las pruebas del módulo de sesión son ficticias (simulan redes)
  const IP = /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/;
  const hallados = [], ips = [];
  for (const a of archivos) { let t = fs.readFileSync(path.join(RAIZ, a), 'utf8');
    t = t.replace(/data:[\w/+.-]+;base64,[A-Za-z0-9+/=]+/g, '');   // imágenes incrustadas: su base64 puede parecer una clave
    for (const [re, nom] of PATRONES) { const m = t.match(re); if (m) hallados.push(`${a}:${t.slice(0, m.index).split('\n').length} (${nom})`); }   // no se imprime el valor
    if (!/(^|\/)(pruebas|04_pruebas)\//.test(a) && !/(^|\/)libs\//.test(a)) { const m = t.match(IP); if (m) ips.push(`${a}:${t.slice(0, m.index).split('\n').length}`); } }
  ok(`ninguna clave, llave privada, token ni contraseña en los archivos del repositorio (${archivos.length} archivos de texto)`, archivos.length > 50 && hallados.length === 0, lista(hallados));
  ok('ninguna dirección IP interna en lo público (fuera de las pruebas)', ips.length === 0, lista(ips));
  // control: los patrones sí reconocen una clave con la forma de las reales (armada aquí, no está en ningún archivo)
  const muestra = 'AI' + 'za' + 'Sy' + 'X'.repeat(33);
  ok('control: el patrón de claves reconoce una clave de muestra', PATRONES.some(([re]) => re.test(`k = "${muestra}"`)));
  // nombres de la infraestructura del SIA (F4-02): lo público lleva textos genéricos; los reales, solo en el paquete. Se leen de
  // 08_entrega_sia/nombres_sia.local.json, que no se publica: en una copia de GitHub no existe y la revisión se omite
  const NOM = path.join(RAIZ, '08_entrega_sia', 'nombres_sia.local.json');
  if (fs.existsSync(NOM)) { const N = JSON.parse(fs.readFileSync(NOM, 'utf8')), con = [];
    const buscar = [...N.reemplazos.map(([, real]) => [real, null]), ...(N.vigilar || []).map(p => [p, new RegExp(`\\b${p}\\b`)])];
    for (const a of archivos.filter(x => !/nombres_sia\.local\.json$/.test(x))) { const t = fs.readFileSync(path.join(RAIZ, a), 'utf8').replace(/\r\n/g, '\n');
      buscar.forEach(([txt, re], k) => { const i = re ? t.search(re) : t.indexOf(txt); if (i >= 0) con.push(`${a}:${t.slice(0, i).split('\n').length} (nombre ${k + 1})`); }); }   // no se imprime el nombre
    ok(`ningún nombre de la infraestructura del SIA en lo público (${buscar.length} de nombres_sia.local.json)`, buscar.length > 0 && con.length === 0, lista(con));
  } else ok('nombres de la infraestructura del SIA: sin nombres_sia.local.json en esta copia, la revisión se omite', true);
}

// ---------- clases de la hoja de estilos sin uso ----------
{ const css = fs.readdirSync(path.join(F, 'css')).filter(a => a.endsWith('.css')).sort()
    .map(a => fs.readFileSync(path.join(F, 'css', a), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/url\([^)]*\)/g, ''));
  const fuentes = [leer('02_fuente', 'plantilla.html'), leer('02_fuente', 'construir.py'), ...MODULOS.map(a => leer('02_fuente', 'js', a))].join('\n');
  const clases = new Set();
  for (const t of css) { const sels = t.replace(/\{[^{}]*\}/g, '{}').replace(/@media[^{]*\{/g, '');   // solo los selectores
    for (const m of sels.matchAll(/\.([a-zA-Z_][\w-]*)/g)) clases.add(m[1]); }
  const sinUso = [...clases].filter(n => !new RegExp('(^|[^\\w-])' + n.replace(/-/g, '\\-') + '($|[^\\w-])').test(fuentes));
  ok(`toda clase de la hoja de estilos se usa en la plantilla, los módulos o construir.py (${clases.size} clases)`, clases.size > 50 && sinUso.length === 0, lista(sinUso.map(n => '.' + n)));
}

const f = r.filter(x => !x[0]); console.log(`\n[consistencia] ${r.length - f.length} de ${r.length} verificaciones correctas; ${f.length} fallas`);
if (f.length) { console.log('Fallas:'); f.forEach(x => console.log('  - ' + x[1] + (x[2] ? ' · ' + x[2] : ''))); }
process.exitCode = f.length ? 1 : 0;
