// C5 · Inventario de TODOS los textos para personas: plantilla, mensajes generados en JS (pantalla, avisos, errores, Excel, PDF, KML),
// vigía de carga (construir.py), módulo de acceso y administración (08_entrega_sia/login) y avisos de privacidad.
// Salida: c5_textos.csv (texto, archivo:línea, pantalla, origen) y c5_analisis.json (trato tú/usted, formatos, vocabulario, tecnicismos).
// Uso: node c5_textos.js
const fs = require('fs'), path = require('path');
const C = { R3: process.env.R3 || path.resolve(__dirname, '..', '..', 'r3') };
const espree = require(path.join(C.R3, 'node_modules', 'espree'));
const R = C.R3, filas = [];
const rel = f => path.relative(R, f).replace(/\\/g, '/');
const esTexto = s => { s = String(s).replace(/«[^»]*»/g, ' ').trim(); if (s.length < 3) return false;
  if (/^[#.\[]?[a-z0-9_-]+([.#\[][^ ]*)?$/i.test(s) && !/[áéíóúñ¿¡]/i.test(s)) return false;          // id, clase o selector
  if (/^(https?:|data:|blob:|\/|\.\/)/.test(s)) return false; if (/^[\w-]+:[\w-]+;?$/.test(s)) return false;  // url o propiedad CSS
  if (/[{};]\s*$/.test(s) && /[:=]/.test(s) && !/[áéíóúñ]/i.test(s)) return false;
  const pal = s.match(/[A-Za-zÁÉÍÓÚáéíóúÑñü]{2,}/g) || []; if (!pal.length) return false;
  if (pal.length === 1 && !/[A-ZÁÉÍÓÚÑ]/.test(s[0]) && !/[áéíóúñ]/i.test(s)) return false;          // palabra clave interna
  if (/^(application|text|image)\//.test(s) || /^[a-z]+(_[a-z0-9]+)+$/.test(s)) return false;        // tipos MIME y nombres de campo
  if (/^(Datos|Diccionario)$/.test(s)) return true;
  return /[a-záéíóúñ]/.test(s); };
const PANT = f => { const b = path.basename(f);
  const M = { '01_utilidades.js': 'Errores y avisos generales', '02_datos.js': 'Carga de datos (errores)', '03_estado.js': 'Filtros (rótulos)', '04_mapa_capas.js': 'Mapa: fondos y atribución', '04_nombres_mapa.js': 'Mapa: nombres',
    '05_inventario.js': 'Espacios para plantar (capa, ficha, avisos)', '05_mapa_tarjetas.js': 'Ficha del mapa (frente, tramo, colonia)', '06_mapa_interaccion.js': 'Mapa: avisos de modo ligero y errores', '07_leyenda_y_capas.js': 'Panel de capas y filtros',
    '08_resumenes.js': 'Resumen (cifras, notas, comparación)', '09_listados.js': 'Dónde empezar (lista)', '09_tramos.js': 'Tramos de la calle', '10_seleccion.js': 'Recuadros del ámbito y Descargas (estado)', '11_descargas.js': 'Descargas: Excel, CSV, diccionario, KML y GeoJSON',
    '12_fichas_pdf.js': 'Fichas PDF', '13_interfaz.js': 'Ayuda, entrada, pie de descargas, ruta', '14_buscador.js': 'Buscador', '15_mi_ubicacion.js': 'Mi ubicación y punto buscado', '16_arranque.js': 'Arranque (errores)', '17_recorrido.js': 'Recorrido guiado',
    'construir.py': 'Cargador: vigía de carga (config.js) y sw.js', 'acceso.js': 'Acceso (inicio de sesión)', 'admin.js': 'Administración de cuentas', 'rutas.ts': 'Acceso: mensajes del servidor', 'contrasenas.ts': 'Acceso: reglas de contraseña',
    'masiva.ts': 'Administración: alta masiva', 'alcaldias.ts': 'Administración: alcaldías', 'aviso_integral.md': 'Aviso de privacidad integral', 'aviso_simplificado.md': 'Aviso de privacidad simplificado', 'aviso-de-privacidad.html': 'Aviso de privacidad (página)',
    'index.html': f.includes('admin') ? 'Administración de cuentas (página)' : 'Acceso (página)', 'excel_worker.js': 'Excel en proceso auxiliar' };
  return M[b] || b; };
const add = (texto, f, linea, origen, pantalla) => { texto = String(texto).replace(/\s+/g, ' ').trim(); if (!esTexto(texto)) return; filas.push({ texto, ubicacion: `${rel(f)}:${linea}`, pantalla: pantalla || PANT(f), origen }); };

// ---- JavaScript con espree (cadenas y plantillas; ${…} se escribe «…») ----
function deJS(f) { const src = fs.readFileSync(f, 'utf8'); let ast;
  for (const st of ['module', 'script']) { try { ast = espree.parse(src, { ecmaVersion: 'latest', sourceType: st, loc: true, range: true, ecmaFeatures: { globalReturn: st === 'script' } }); break; } catch (e) { ast = null; } }
  if (!ast) return deTS(f, 'JS sin analizar');
  const visita = (n, padre) => { if (!n || typeof n.type !== 'string') return;
    if (n.type === 'Literal' && typeof n.value === 'string') { if (!(padre && (padre.type === 'ImportDeclaration' || (padre.type === 'Property' && padre.key === n)))) add(n.value, f, n.loc.start.line, 'cadena JS'); }
    if (n.type === 'TemplateLiteral') { const t = n.quasis.map((q, k) => q.value.cooked + (k < n.expressions.length ? '«' + src.slice(...n.expressions[k].range).slice(0, 40) + '»' : '')).join(''); add(t, f, n.loc.start.line, 'plantilla JS'); }
    for (const k of Object.keys(n)) { if (k === 'parent' || k === 'loc' || k === 'range') continue; const v = n[k]; if (Array.isArray(v)) v.forEach(x => visita(x, n)); else if (v && typeof v.type === 'string') visita(v, n); } };
  visita(ast, null); }
// ---- TypeScript o JS que espree no lee: lexer simple de cadenas, sin comentarios ----
function deTS(f, origen = 'cadena TS') { const s = fs.readFileSync(f, 'utf8'); let i = 0, linea = 1;
  while (i < s.length) { const c = s[i];
    if (c === '\n') { linea++; i++; continue; }
    if (c === '/' && s[i + 1] === '/') { while (i < s.length && s[i] !== '\n') i++; continue; }
    if (c === '/' && s[i + 1] === '*') { i += 2; while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) { if (s[i] === '\n') linea++; i++; } i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') { const l0 = linea; let j = i + 1, t = '', prof = 0;
      while (j < s.length) { const d = s[j]; if (d === '\\') { t += s[j + 1]; j += 2; continue; } if (d === '\n') linea++;
        if (c === '`' && d === '$' && s[j + 1] === '{') { prof = 1; j += 2; t += '«'; while (j < s.length && prof) { if (s[j] === '{') prof++; else if (s[j] === '}') prof--; if (s[j] === '\n') linea++; j++; } t += '»'; continue; }
        if (d === c) break; t += d; j++; }
      add(t, f, l0, origen); i = j + 1; continue; }
    i++; } }
// ---- HTML: texto entre etiquetas y atributos que ve o escucha la persona ----
function deHTML(f, pantallaDe) { const s = fs.readFileSync(f, 'utf8'); const linea = k => s.slice(0, k).split('\n').length;
  const re = /<(script|style)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->|<([a-zA-Z][\w-]*)([^>]*)>|([^<]+)/g; let m;
  while ((m = re.exec(s))) {
    if (m[2]) { const at = m[3]; const ra = /(title|aria-label|placeholder|alt|data-eleg|data-nombre|content|value)="([^"]*)"/g; let a;
      while ((a = ra.exec(at))) { if (a[1] === 'content' && !/description/.test(at)) continue; if (a[1] === 'value' && m[2] !== 'input') continue; add(a[2].replace(/&amp;/g, '&'), f, linea(m.index), 'atributo ' + a[1], pantallaDe(linea(m.index))); } }
    else if (m[4]) add(m[4].replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'), f, linea(m.index), 'texto HTML', pantallaDe(linea(m.index))); } }
// ---- Markdown: cada renglón con texto ----
function deMD(f) { fs.readFileSync(f, 'utf8').split('\n').forEach((l, k) => { const t = l.replace(/^[#>*\-\d.\s|]+/, '').replace(/\*\*/g, ''); if (t.trim()) add(t, f, k + 1, 'Markdown'); }); }
// ---- Python: cadenas que terminan en la página (vigía de carga y sw.js) ----
function dePY(f) { const s = fs.readFileSync(f, 'utf8').split('\n'); s.forEach((l, k) => { const m = l.match(/aviso\('([^']+)'|p\.textContent='([^']+)'|n0\.textContent='([^']+)'|textContent='([^']+)'/g); if (m) m.forEach(x => add(x.replace(/^[^']*'|'$/g, ''), f, k + 1, 'cadena en config.js')); }); }

const P = p => path.join(R, p);
// plantilla: pantallas por rangos de renglones
const plantillaPant = l => l <= 25 ? 'Encabezado' : l <= 59 ? 'Panel: consulta (buscador, filtros, ruta)' : l <= 88 ? 'Panel: Dónde empezar' : l <= 111 ? 'Panel: Resumen' : l <= 138 ? 'Panel: Descargas y fuentes' : l <= 147 ? 'Panel: pie de descargas' : l <= 207 ? 'Mapa: herramientas y panel de capas' : l <= 235 ? 'Entrada (primera visita)' : 'Ayuda «Cómo funciona» y metodología';
deHTML(P('02_fuente/plantilla.html'), plantillaPant);
for (const f of fs.readdirSync(P('02_fuente/js')).sort()) deJS(P('02_fuente/js/' + f));
if (fs.existsSync(P('02_fuente/libs/excel_worker.js'))) deJS(P('02_fuente/libs/excel_worker.js'));
dePY(P('02_fuente/construir.py'));
const L = P('08_entrega_sia/login');
deHTML(path.join(L, 'acceso/index.html'), () => 'Acceso (página)'); deHTML(path.join(L, 'acceso/admin/index.html'), () => 'Administración de cuentas (página)'); deHTML(path.join(L, 'acceso/aviso-de-privacidad.html'), () => 'Aviso de privacidad (página)');
deJS(path.join(L, 'acceso/recursos/acceso.js')); deJS(path.join(L, 'acceso/recursos/admin.js'));
for (const f of ['rutas.ts', 'contrasenas.ts', 'masiva.ts', 'alcaldias.ts']) deTS(path.join(L, 'backend/src/modulos/priorizacion-reforestacion', f));
for (const f of ['aviso_integral.md', 'aviso_simplificado.md']) deMD(path.join(L, 'privacidad', f));

// ---- CSV ----
const csv = v => '"' + String(v).replace(/"/g, '""') + '"';
fs.writeFileSync(path.join(__dirname, 'c5_textos.csv'), '﻿' + ['texto,ubicacion,pantalla,origen', ...filas.map(r => [r.texto, r.ubicacion, r.pantalla, r.origen].map(csv).join(','))].join('\r\n'));

// ---- análisis ----
const LIM = '(?:(?<![\\p{L}\\p{N}])(?=[\\p{L}\\p{N}])|(?<=[\\p{L}\\p{N}])(?![\\p{L}\\p{N}]))';   // límite de palabra que entiende acentos y ñ
const B = re => new RegExp(re.source.split('\\b').join(LIM), re.flags.replace('u', '') + 'u');
const cuenta = (re, filtro = () => true) => filas.filter(filtro).filter(r => B(re).test(r.texto));
const TU = /\b(quieres|puedes|tienes|elige|selecciona|escribe|busca|toca|pega|activa|revisa|recarga|abre|usa|vuelve|intenta|prueba|confirma|empieza|marca|desliza|descarga lo|decide|filtra|cambia|ingresa|consulta tu|tu|tus|te|ti|contigo|estás|ábrelo|actívalo|haz)\b/i;
const USTED = /\b(usted|ustedes|quiere|puede usted|elija|seleccione|escriba|busque|toque|pegue|active|revise|recargue|abra|use|vuelva|intente|pruebe|confirme|ingrese|consulte|cambie|haga|espere|comuníquese|contacte|verifique|solicite|introduzca|capture|registre|pulse|presione|indique|inicie|cierre|asigne|descargue|lea)\b/i;
const ambos = filas.filter(r => !/^use strict$/.test(r.texto) && !/r\.use\(/.test(r.texto)).map(r => ({ ...r, tu: B(TU).test(r.texto), usted: B(USTED).test(r.texto) }));
const usted = ambos.filter(r => r.usted).map(r => r.ubicacion + ' · ' + r.texto.slice(0, 140));
const grupo = r => r.pantalla.startsWith('Aviso de privacidad') ? 'avisos de privacidad' : /Acceso|Administración/.test(r.pantalla) ? 'acceso y administración' : /Excel|PDF|Fichas|KML/.test(r.pantalla) ? 'documentos generados' : 'herramienta';
const trato = {}; for (const r of ambos) { const g = grupo(r); trato[g] = trato[g] || { textos: 0, tu: 0, usted: 0, ejemplosUsted: [], ejemplosTu: [] }; const t = trato[g]; t.textos++;
  if (r.tu) { t.tu++; if (t.ejemplosTu.length < 6) t.ejemplosTu.push(r.ubicacion + ' · ' + r.texto.slice(0, 90)); } if (r.usted) { t.usted++; if (t.ejemplosUsted.length < 12) t.ejemplosUsted.push(r.ubicacion + ' · ' + r.texto.slice(0, 90)); } }
const VOC = { 'Gobierno Central': /Gobierno Central|Gob\. Central/, 'Gobierno de la Ciudad': /Gobierno de la Ciudad/, 'frente (de manzana)': /\bfrentes?\b/i, 'tramo': /\btramos?\b/i, 'avenida': /\bavenidas?\b/i, 'vialidad primaria': /vialidad(es)? primaria/i,
  'calle': /\bcalles?\b/i, 'ámbito': /\bámbito\b/i, 'territorio': /\bterritorio\b/i, 'consulta (sust.)': /\bconsulta(da|s)?\b/i, 'Resultados': /\bResultados\b/, 'listado': /\blistados?\b/i, 'lista': /\blistas?\b/i, 'ficha': /\bfichas?\b/i, 'tarjeta': /\btarjetas?\b/i,
  'celular': /\bcelular\b/i, 'teléfono': /\bteléfono\b/i, 'computadora': /\bcomputadora\b/i, 'prioritario': /\bprioritari[oa]s?\b/i, 'Muy Alta, Alta y Media': /Muy Alta, Alta (y|o) Media/, 'cepa vacante': /cepas? vacantes?/i, 'espacio para plantar': /espacios? para plantar/i,
  'sin dato / por verificar': /por verificar|sin dato/i, 'Alcaldía (may.)': /\bAlcaldía\b/, 'alcaldía (min.)': /\balcaldía\b/, 'km de frente': /km de frente/i, 'km de vialidad / sobre el eje': /km de vialidad|sobre el eje/i, 'Street View': /Street View/, 'Mi ubicación': /Mi ubicación/ };
const vocabulario = Object.fromEntries(Object.entries(VOC).map(([k, re]) => [k, cuenta(re).length]));
const TEC = /\b(WGS84|EPSG|RFC 7946|GeoJSON|KML|SIG|WebGL|aceleración (gráfica|por hardware)|proceso auxiliar|librería|programa que arma|componente del mapa|SwiftShader|caché|navegador|NOMENCLAT|id_frente|id_tramo|NBI|IDS|INEGI|CONAPO|EVALÚA|CIGA-UNAM|varint|gzip|base64|JSON|HTTP|401|403|token|sesión vencida|unidad territorial)\b/;
const tecnicismos = {}; for (const r of filas) { const m = r.texto.match(new RegExp(TEC.source, 'g')); if (m) for (const x of m) { tecnicismos[x] = tecnicismos[x] || { n: 0, ej: [] }; tecnicismos[x].n++; if (tecnicismos[x].ej.length < 3) tecnicismos[x].ej.push(r.ubicacion); } }
const fechas = { 'AAAAMMDD (nombres de archivo)': cuenta(/AAAAMMDD|_\d{8}/).length, 'día de mes de año': cuenta(/\d{1,2} de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) de \d{4}/).length,
  'mes abreviado (nov. 2025, ago. 2026)': cuenta(/\b(ene|feb|mar|abr|may|jun|jul|ago|sep|sept|oct|nov|dic)\. \d{4}/).length, 'mes de año (septiembre de 2026)': cuenta(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) de \d{4}/).length,
  'dd/mm/aaaa': cuenta(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/).length, 'toLocaleDateString / toLocaleString': cuenta(/toLocale/).length };
const numeros = { 'porcentaje con espacio («12 %»)': cuenta(/\d %/).length, 'porcentaje sin espacio («12%»)': cuenta(/\d%/).length, 'mil abreviado («248.3 mil»)': cuenta(/\bmil\b/).length, 'M de millones («1.5 M»)': cuenta(/\d M\b|' M'/).length };
const internos = cuenta(/\b(resp|sel|selCol|selAv|ESP_\w+|INV\.\w+|filtroEsp|filtroBanq|undefined|null|NaN|tab-\w+|cp_\w+|SIA_\w+|deck\.gl|jsPDF|SheetJS|pako)\b/).map(r => r.ubicacion + ' · ' + r.texto.slice(0, 100));
const resultados = cuenta(/\bResultados\b/).map(r => r.ubicacion + ' · ' + r.texto);
const signos = filas.filter(r => /\?/.test(r.texto) && !/¿/.test(r.texto) && /[a-z]\?/.test(r.texto)).map(r => r.ubicacion + ' · ' + r.texto.slice(0, 90));
const dobleEspacio = filas.filter(r => / ,|\s\.(?!\d)|\.\./.test(r.texto) && !/\.\.\.|…/.test(r.texto)).map(r => r.ubicacion + ' · ' + r.texto.slice(0, 90));
fs.writeFileSync(path.join(__dirname, 'c5_analisis.json'), JSON.stringify({ total: filas.length, usted, porGrupo: Object.fromEntries(Object.entries(trato).map(([k, v]) => [k, v])), vocabulario, tecnicismos, fechas, numeros, internos, resultados, signosSinApertura: signos, puntuacion: dobleEspacio.slice(0, 40) }, null, 1));
console.log('textos:', filas.length); console.log(JSON.stringify(trato, null, 1)); console.log(vocabulario); console.log(fechas, numeros);
