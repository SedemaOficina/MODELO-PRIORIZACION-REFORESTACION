// Auditoría de contraste del MAPA: cada par se mide sobre el fondo real donde aparece.
// Lee los colores directamente de 02_fuente/css/*.css y 02_fuente/js/*.js (nunca de una lista escrita a mano): si un color cambia
// en el código, la auditoría cambia sola. Si un color deja de estar donde este programa lo busca, se detiene y dice cuál.
//
// Uso:
//   node herramientas/contraste.mjs                     imprime la tabla y el resumen
//   node herramientas/contraste.mjs --md RUTA.md        además escribe la auditoría en Markdown
//   node herramientas/contraste.mjs --html RUTA.html    además escribe la versión HTML (autocontenida)
//   node herramientas/contraste.mjs --json              imprime los pares en JSON
// La usa 04_pruebas/prueba_contraste.js (mismo cálculo).
//
// Mínimos (WCAG 2.2): texto 4.5:1 (1.4.3); líneas, puntos, aros, contornos y foco 3:1 (1.4.11).
// Luminancia relativa de WCAG 2.2 (umbral 0.04045). Lo que se dibuja con transparencia se compone sobre su fondo antes de medir,
// en el mismo espacio de color en que lo mezclan el navegador y deck.gl (sRGB, sin linealizar).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TEXTO = 4.5, NO_TEXTO = 3;
const RAIZ_DEF = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Pares exigidos que hoy no cumplen y esperan la decisión de Liber: [id, dónde]. La prueba (04_pruebas/prueba_contraste.js) los lista como
// aviso; cualquier otro par exigido que no cumpla la hace fallar. Si uno de estos llega a cumplir, la prueba avisa para quitarlo de aquí.
// «dónde» acompaña al id para que un cambio de numeración no esconda un par: si no coinciden, la prueba falla.
// Para rehacer la lista después de una decisión: node herramientas/contraste.mjs --pendientes
export const PENDIENTES_CONOCIDOS = [
  ["MN03", "Línea de prioridad Media (frentes de manzana; también vialidades primarias con Gobierno Central) sobre el suelo del fondo «Calles», desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras»)"],
  ["MN08", "Línea de prioridad Media (frentes de manzana; también vialidades primarias con Gobierno Central) sobre una manzana del fondo «Calles», desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras»)"],
  ["MN13", "Línea de prioridad Media (frentes de manzana; también vialidades primarias con Gobierno Central) sobre «Sin fondo», desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras»)"],
  ["MN18", "Línea Media sobre el relleno de colonia que menos contrasta (fondo «Calles», relleno al 14 %), desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras»)"],
  ["MN23", "Línea Media sobre el relleno de colonia que menos contrasta («Sin fondo», relleno al 14 %), desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras»)"],
];

// ---------------------------------------------------------------- color
const h2 = v => Math.round(v).toString(16).padStart(2, '0').toUpperCase();
export const hex = c => '#' + c.rgb.map(h2).join('');
export function rgbDe(s) {
  s = String(s).trim();
  let m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) { let h = m[1]; if (h.length === 3) h = h.split('').map(x => x + x).join(''); return { rgb: [0, 2, 4].map(k => parseInt(h.slice(k, k + 2), 16)), a: 1 }; }
  m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (m) return { rgb: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] };
  if (/^white$/i.test(s)) return { rgb: [255, 255, 255], a: 1 };
  throw new Error('color que no se sabe leer: ' + s);
}
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
export const lum = rgb => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
export const razon = (a, b) => { const x = lum(a.rgb || a), y = lum(b.rgb || b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const pct = a => Math.round(a * 100) + ' %';
// color con nombre: n = variable o literal de donde sale; rgb; a = transparencia con que se dibuja
const C = (n, rgb, a = 1) => ({ n, rgb: rgb.slice(0, 3), a });
// compone fg (con su transparencia a) sobre bg opaco; el resultado se redondea como el que pinta la pantalla (y coincide con el hex que se muestra)
export function sobre(fg, bg, a = fg.a, nombre) {
  const rgb = fg.rgb.map((v, k) => Math.round(v * a + bg.rgb[k] * (1 - a)));   // en pantalla se pinta con valores enteros de 0 a 255
  return C(nombre || (a < 1 ? `${fg.n} al ${pct(a)} sobre ${bg.n}` : fg.n), rgb, 1);
}
const conA = (c, a, n) => ({ ...c, a, n: n || c.n });
// oscurece (hacia negro, mismo tono) hasta llegar al mínimo contra todos los fondos dados
function oscurecerHasta(fg, fondos, min) {
  for (let k = 1; k >= 0; k -= 0.005) { const c = C(fg.n, fg.rgb.map(v => Math.round(v * k))); if (fondos.every(b => razon(c, b) >= min)) return c; }
  return C(fg.n, [0, 0, 0]);
}
function aclararHasta(fg, fondos, min) {
  for (let k = 0; k <= 1; k += 0.005) { const c = C(fg.n, fg.rgb.map(v => Math.round(v + (255 - v) * k))); if (fondos.every(b => razon(c, b) >= min)) return c; }
  return C(fg.n, [255, 255, 255]);
}
// menor transparencia con la que fg sobre bg llega al mínimo
function alfaMinimo(fg, bg, min) { for (let a = 0.3; a <= 1.0001; a += 0.01) if (razon(sobre(fg, bg, a), bg) >= min) return Math.min(1, a); return 1; }
const r2 = r => Math.floor(r * 100) / 100;   // se trunca: 4.499 no se muestra como 4.50
export const fmtR = r => r2(r).toFixed(2) + ':1';
const yLista = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];   // «Muy Baja, Baja y Media»

// ---------------------------------------------------------------- lectura de las fuentes
function leer(raiz, rel) { const p = path.join(raiz, rel); if (!fs.existsSync(p)) throw new Error('no existe ' + rel); return fs.readFileSync(p, 'utf8'); }

// CSS: reglas en el orden en que construir.py las concatena (alfabético), con su @media
function reglasCSS(raiz) {
  const dir = path.join(raiz, '02_fuente', 'css'); const archivos = fs.readdirSync(dir).filter(f => f.endsWith('.css')).sort();
  const out = [];
  for (const f of archivos) {
    const s = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const parse = (t, media) => { let i = 0;
      while (i < t.length) { const a = t.indexOf('{', i); if (a < 0) break; const pre = t.slice(i, a).trim(); let d = 1, j = a + 1;
        while (j < t.length && d) { if (t[j] === '{') d++; else if (t[j] === '}') d--; j++; }
        const cuerpo = t.slice(a + 1, j - 1);
        if (pre.startsWith('@media')) parse(cuerpo, pre);
        else if (!pre.startsWith('@')) {
          const decl = new Map(); for (const d2 of cuerpo.split(';')) { const k = d2.indexOf(':'); if (k > 0) decl.set(d2.slice(0, k).trim(), d2.slice(k + 1).replace(/!important/, '').trim()); }
          out.push({ sels: pre.split(',').map(x => x.trim().replace(/\s+/g, ' ')), decl, media, archivo: 'css/' + f }); }
        i = j; } };
    parse(s, null);
  }
  return out;
}

export function leerFuentes(raiz = RAIZ_DEF) {
  const R = reglasCSS(raiz);
  // variables de :root fuera de @media; la última gana (como en la hoja concatenada). Se guarda cada definición para avisar de las repetidas.
  const V = new Map(), historia = new Map();
  for (const r of R) if (!r.media && r.sels.includes(':root')) for (const [k, v] of r.decl) if (k.startsWith('--')) {
    V.set(k, v); if (!historia.has(k)) historia.set(k, []); historia.get(k).push({ v, archivo: r.archivo }); }
  const resolver = v => { let s = v, n = 0; while (/var\(/.test(s) && n++ < 10) s = s.replace(/var\((--[\w-]+)\s*(?:,\s*([^)]+))?\)/g, (_, k, f) => V.has(k) ? V.get(k) : (f || '')); return s; };
  const variable = k => { if (!V.has(k)) throw new Error(`la variable ${k} no está en 02_fuente/css`); const c = rgbDe(resolver(V.get(k))); return C(k, c.rgb, c.a); };
  // propiedad de una regla CSS: la última declaración de ese selector exacto (con media: dentro de una @media que contenga ese texto)
  const redefinidos = new Map();   // selector y propiedad declarados más de una vez con valores distintos (gana el último)
  const regla = (sel, prop, media = null) => { let hall = null; const todas = [];
    for (const r of R) if (r.sels.includes(sel) && (media ? (r.media || '').includes(media) : !r.media) && r.decl.has(prop)) { hall = { v: r.decl.get(prop), archivo: r.archivo }; todas.push(hall); }
    if (new Set(todas.map(x => x.v.replace(/\s+/g, ''))).size > 1) redefinidos.set(`${sel} { ${prop} }`, todas);
    if (!hall) throw new Error(`no se encontró «${prop}» de «${sel}» en 02_fuente/css${media ? ' (' + media + ')' : ''}`); return hall; };
  // color dentro de un valor CSS (border, outline, box-shadow, color-mix…): el nombre es la variable, si la hay
  const colorCSS = (sel, prop, media) => { const { v } = regla(sel, prop, media);
    const mix = v.match(/color-mix\(\s*in srgb\s*,\s*(var\((--[\w-]+)\)|#[0-9a-f]+)\s+([\d.]+)%\s*,\s*transparent\s*\)/i);
    if (mix) { const base = mix[2] ? variable(mix[2]) : C(mix[1], rgbDe(mix[1]).rgb); return conA(base, +mix[3] / 100, `${base.n} al ${mix[3]} %`); }
    const vr = v.match(/var\((--[\w-]+)\)/); if (vr) return variable(vr[1]);
    const lit = v.match(/#[0-9a-f]{3,6}\b|rgba?\([^)]*\)|\bwhite\b/i); if (!lit) throw new Error(`«${prop}» de «${sel}» no trae un color: ${v}`);
    const c = rgbDe(lit[0]); return C(lit[0], c.rgb, c.a); };
  const numCSS = (sel, prop, media) => { const v = parseFloat(regla(sel, prop, media).v); if (!Number.isFinite(v)) throw new Error(`«${prop}» de «${sel}» no es un número`); return v; };

  // JS: cada valor con la expresión de dónde sale
  const js = {}; const tomar = (arch, re, que) => { const t = js[arch] || (js[arch] = leer(raiz, '02_fuente/js/' + arch)); const m = t.match(re);
    if (!m) throw new Error(`no se encontró ${que} en 02_fuente/js/${arch} (¿cambió el código? actualizar herramientas/contraste.mjs)`); return m; };
  const nums = m => m.slice(1).map(Number);
  // tokens del mapa: readTokens() de 03_estado.js (T.x = hex(css('--y')))
  const TK = {}; { const cuerpo = tomar('03_estado.js', /function readTokens\(\)\{([\s\S]*?)\n\}/, 'readTokens()')[1];
    for (const m of cuerpo.matchAll(/T\.(\w+)\s*=\s*(?:hex\()?css\('(--[\w-]+)'\)/g)) TK[m[1]] = m[2];
    if (!/T\.prio\s*=\s*PRIO_VARS/.test(cuerpo)) throw new Error('T.prio ya no sale de PRIO_VARS en readTokens()');
    TK.prio = tomar('01_utilidades.js', /const PRIO_VARS\s*=\s*\[([^\]]+)\]/, 'PRIO_VARS')[1].match(/--[\w-]+/g);
    TK.inv = tomar('03_estado.js', /T\.inv\s*=\s*\[([^\]]+)\]/, 'T.inv')[1].match(/--[\w-]+/g); }
  const T = k => { if (!TK[k]) throw new Error(`T.${k} no está en readTokens()`); return variable(TK[k]); };
  const tk = expr => { const m = String(expr).match(/^T\.(\w+)$/); if (!m) throw new Error('se esperaba T.algo: ' + expr); return T(m[1]); };

  const F = {};
  F.prio = TK.prio.map(variable);                      // rampa --p0 Muy Baja … --p4 Muy Alta
  F.inv = TK.inv.map(variable);                        // cepa, tocón, árbol muerto
  F.suelo = colorCSS('body.fondo-propio .mapwrap', 'background');   // fondo «Calles»: suelo (la calle es el hueco entre manzanas)
  F.sinfondo = colorCSS('.mapwrap', 'background');                  // «Sin fondo» (y debajo del satélite)
  F.manzana = T('manzana'); F.verde = T('fverde'); F.agua = T('fagua');
  // ANP y AVA: misma capa de color que parques y jardines (fondoPropio en 04_mapa_capas.js)
  F.protegida = tk(tomar('04_mapa_capas.js', /\['fondo-protegida',\s*FONDO\.base\.protegida,\s*(T\.\w+)\]/, 'color de ANP y AVA (fondoPropio)')[1]);
  F.protegidaMismoVerde = F.protegida.n === F.verde.n;
  // nombres del mapa (04_mapa_capas.js; letra y halo en 04_nombres_mapa.js)
  { const m = tomar('04_mapa_capas.js', /id:'alc-labels'[\s\S]*?getColor:(T\.\w+)[\s\S]*?outlineColor:hex\((T\.\w+)\)/, 'color y halo de alc-labels');
    F.lblAlc = tk(m[1]); F.haloAlc = tk(m[2]); }
  { const m = tomar('04_mapa_capas.js', /id:'col-labels'[\s\S]*?getColor:(T\.\w+)[\s\S]*?outlineColor:hex\((T\.\w+)\)/, 'color y halo de col-labels');
    F.lblCol = tk(m[1]); F.haloCol = tk(m[2]); }
  { const m = tomar('04_mapa_capas.js', /id:'st-labels'[\s\S]*?getColor:\[\.\.\.(T\.\w+)\.slice\(0,3\),(\d+)\][\s\S]*?outlineColor:\[\.\.\.(T\.\w+)\.slice\(0,3\),(\d+)\]/, 'color y halo de st-labels');
    F.lblCalle = conA(tk(m[1]), +m[2] / 255); F.haloCalle = conA(tk(m[3]), +m[4] / 255); }
  F.etqContorno = +tomar('04_nombres_mapa.js', /ETQ_CONTORNO\s*=\s*([\d.]+)/, 'ETQ_CONTORNO')[1];
  F.etqRadio = +tomar('04_nombres_mapa.js', /ETQ_LETRA\s*=\s*\{[^}]*radius:([\d.]+)/, 'radius de ETQ_LETRA')[1];
  F.etqTam = +tomar('04_nombres_mapa.js', /ETQ_TAM\s*=\s*([\d.]+)/, 'ETQ_TAM')[1];
  // rellenos de colonia y alcaldía (transparencias escritas en getFillColor)
  // desde la v1.30 el relleno es igual de tenue con «Calles» y con «Sin fondo» (calles = sinf)
  { const m = tomar('04_mapa_capas.js', /id:'col-fill'[\s\S]*?selCol!==null\? \(d\.i===selCol\? \(frVisibles\(\)\? (\d+) : (\d+)\) : \(frVisibles\(\)\? (\d+) : (\d+)\)\) : \(colOnly\(\)\? (\d+) : (\d+)\)\]/, 'transparencias de col-fill');
    const [selFr, selSolo, otrasFr, otrasSolo, soloCol, tenue] = nums(m); F.aCol = { selFr, selSolo, otrasFr, otrasSolo, soloCol, calles: tenue, sinf: tenue }; }
  { const m = tomar('04_mapa_capas.js', /id:'alcaldias'[\s\S]*?\(sel===null \|\| d\.i===sel\)\? (\d+) : (\d+)/, 'transparencias de alcaldias'); F.aAlc = { todas: +m[1], otras: +m[2] }; }
  // líneas de prioridad: transparencia por vértice (03_estado.js) × opacidad de la capa (opPrio)
  { const m = tomar('03_estado.js', /function buildColors\(\)\{[\s\S]*?enAmbito\(i\)\? (\d+) : (\d+)/, 'transparencia de los frentes (buildColors)'); F.aFr = { dentro: +m[1], fuera: +m[2] }; }
  { const m = tomar('03_estado.js', /const c = ctx\? (T\.\w+) : T\.prio\[VP\.prio\[i\]\];[\s\S]*?const a = ctx\? (\d+) : \(inS\? (\d+) : (\d+)\)/, 'color y transparencia de las vialidades (buildVP)');
    F.vpGris = tk(m[1]); F.aVP = { ctx: +m[2], dentro: +m[3], fuera: +m[4] }; }
  F.opPrio = +tomar('03_estado.js', /let opPrio\s*=\s*([\d.]+)/, 'opPrio')[1];
  F.opPrioMin = +tomar('07_leyenda_y_capas.js', /opPrio = Math\.min\(1, Math\.max\(([\d.]+),/, 'mínimo de opPrio')[1];
  F.anchoFr = tomar('04_mapa_capas.js', /id:'fronts'[\s\S]*?getWidth:([\d.]+), widthMinPixels:([\d.]+), widthMaxPixels:([\d.]+)/, 'grosor de los frentes').slice(1).map(Number);
  // límites y lo elegido
  { const m = tomar('04_mapa_capas.js', /id:'alc', data:ALC_PARTS[\s\S]*?getLineColor:(T\.\w+)/, 'límite de alcaldía'); F.limAlc = tk(m[1]); }
  // límite de colonia: su capa (hasta el cierre del PathLayer) y su opacidad, si la tiene
  { const m = tomar('04_mapa_capas.js', /id:'cols'[^\n]*?getColor:(T\.\w+)[^\n]*?\}\)\);/, 'límite de colonia'); F.limCol = tk(m[1]); const op = m[0].match(/opacity:([\d.]+)/); F.aLimCol = op ? +op[1] : 1; }
  // contorno de la alcaldía o colonia elegida: contornoElegido() con su franja blanca debajo
  { const m = tomar('04_mapa_capas.js', /const contornoElegido = [\s\S]*?id:id\+'-franja'[^\n]*?getLineColor:(T\.\w+)[\s\S]*?\{id, data[^\n]*?getLineColor:(T\.\w+)/, 'contornoElegido()');
    F.selFranja = tk(m[1]); F.sel = tk(m[2]);
    for (const id of ['alc-sel', 'col-sel']) tomar('04_mapa_capas.js', new RegExp(`contornoElegido\\('${id}'`), `contornoElegido('${id}', …)`);
    F.franjaPx = +tomar('04_mapa_capas.js', /const FRANJA_PX\s*=\s*([\d.]+)/, 'FRANJA_PX')[1]; }
  // resalte de la calle y la avenida consultadas: resalte() (franja, halo, filete y, bajo las clases claras, filete oscuro)
  { const t = tomar('04_mapa_capas.js', /function resalte\(id[\s\S]*?return L; \}/, 'resalte()')[0];
    const g = (re, q) => { const m = t.match(re); if (!m) throw new Error('no se encontró ' + q + ' en resalte() de 04_mapa_capas.js'); return tk(m[1]); };
    if (/getColor:color[^}]*opacity/.test(t)) throw new Error('el resalte ya no es opaco: medirlo con su opacidad en contraste.mjs');
    F.rsFranja = g(/capa\('-franja', d, m\.franja, (T\.\w+)\)/, 'la franja'); F.rsHalo = g(/capa\('', d, m\.halo, (T\.\w+)\)/, 'el halo');
    F.rsFilete = g(/capa\('-filete', d, m\.filete, (T\.\w+)\)/, 'el filete'); F.rsOscuro = g(/capa\('-oscuro', [^;]*?m\.oscuro, (T\.\w+)\)/, 'el filete oscuro');
    for (const q of ["resalte('hl'", "resalte('av-halo'"]) if (!js['04_mapa_capas.js'].includes(q)) throw new Error(`la calle o la avenida ya no usan resalte(): falta ${q} en 04_mapa_capas.js`);
    // clases claras: las que no llegan a cierta razón contra un color (03_estado.js); llevan el filete oscuro
    const c = tomar('03_estado.js', /T\.prioClara = T\.prio\.map\(c=> \(lum\((T\.\w+)\)\+0\.05\)\/\(lum\(c\)\+0\.05\) < ([\d.]+)\)/, 'T.prioClara');
    F.claraRef = tk(c[1]); F.claraMin = +c[2]; }
  // filete de las clases claras (las mismas de T.prioClara): fileteBajo() de 04_mapa_capas.js, desde el zoom FILETE_Z, FILETE_PX a cada lado
  { const m = tomar('04_mapa_capas.js', /const FILETE_Z = ([\d.]+), FILETE_PX = ([\d.]+);/, 'FILETE_Z y FILETE_PX'); F.fileteZ = +m[1]; F.filetePx = +m[2];
    F.filete = tk(tomar('04_mapa_capas.js', /function fileteDatos\([\s\S]*?const g = (T\.\w+);/, 'el color del filete (fileteDatos)')[1]);
    tomar('04_mapa_capas.js', /'vs:DECKGL_FILTER_SIZE'[^\n]*FILETE_PX/, 'el ensanche del filete (FileteExt)');
    tomar('04_mapa_capas.js', /fileteDatos\(clave[\s\S]*?T\.prioClara\[clase\(k\)\]/, 'que el filete lleve solo las clases de T.prioClara');
    for (const q of ["fileteBajo(fr, 'frSub'", "fileteBajo(fr, 'fr'", "fileteBajo(vias, 'vp'"]) if (!js['04_mapa_capas.js'].includes(q)) throw new Error(`los frentes o las vialidades ya no llevan filete: falta ${q} en 04_mapa_capas.js`);
    if (!/fileteBajo\(fr, 'frSub', [^;]*?, z>=FILETE_Z\) : fileteBajo\(fr, 'fr', [^;]*?, z>=FILETE_Z && !modoLigero\)/.test(js['04_mapa_capas.js']) || !/fileteBajo\(vias, 'vp', [^;]*?resp!=='alc' && z>=FILETE_Z\)/.test(js['04_mapa_capas.js']))
      throw new Error('el filete de los frentes o de las vialidades ya no depende de FILETE_Z: revisar contraste.mjs');
    const cortes = tomar('06_mapa_interaccion.js', /const ZOOM_CORTES = \[([^\]]+)\]/, 'ZOOM_CORTES')[1].split(',').map(Number);
    if (!cortes.includes(F.fileteZ)) throw new Error(`FILETE_Z (${F.fileteZ}) no está en ZOOM_CORTES (06_mapa_interaccion.js): el filete no aparecería ni se quitaría al cruzarlo`); }
  // inventario (05_inventario.js)
  { const m = tomar('05_inventario.js', /blanco = \[(\d+),(\d+),(\d+),(\d+)\]/, 'contorno blanco del inventario'); const n = nums(m); F.invContorno = C(`blanco [${n.slice(0, 3)}] (escrito en 05_inventario.js)`, n.slice(0, 3), n[3] / 255); }
  { const m = tomar('05_inventario.js', /id:'inv-muerto-x'[\s\S]*?getColor:\[(\d+),(\d+),(\d+),(\d+)\]/, '× del árbol muerto'); const n = nums(m); F.invX = C(`× [${n.slice(0, 3)}] (escrito en 05_inventario.js)`, n.slice(0, 3), n[3] / 255); }
  { const t = tomar('05_inventario.js', /function invCapas\(\)[\s\S]*?return L; \}/, 'invCapas()')[0];
    const g = (re, q) => { const m = t.match(re); if (!m) throw new Error('no se encontró ' + q + ' en invCapas()'); return nums(m); };
    F.invGeo = { cepaR: g(/'inv-cepa', D\[0\], \{getRadius:([\d.]+)/, 'radio de la cepa')[0], cepaHalo: g(/'inv-cepa-halo'[^}]*getLineWidth:([\d.]+)/, 'halo de la cepa')[0], cepaAro: g(/'inv-cepa', D\[0\][^}]*getLineWidth:([\d.]+)/, 'aro de la cepa')[0],
      toconContorno: g(/'inv-tocon'[^}]*getLineWidth:([\d.]+)/, 'contorno del tocón')[0], muertoContorno: g(/'inv-muerto', D\[2\][^}]*getLineWidth:([\d.]+)/, 'contorno del árbol muerto')[0] }; }
  // marcadores
  { const m = tomar('04_mapa_capas.js', /id:'pto-buscado'[\s\S]*?getFillColor:hex\(css\('(--[\w-]+)'\)\)[\s\S]*?getLineColor:(T\.\w+)[\s\S]*?getLineWidth:([\d.]+)/, 'punto buscado');
    F.pto = variable(m[1]); F.ptoContorno = tk(m[2]); F.ptoAncho = +m[3]; }
  F.loc = variable(tomar('03_estado.js', /const LOC_BLUE = hex\(css\('(--[\w-]+)'\)\)/, 'LOC_BLUE')[1]);
  { const m = tomar('04_mapa_capas.js', /id:'loc-acc'[\s\S]*?getFillColor:\[\.\.\.LOC_BLUE,(\d+)\][\s\S]*?getLineColor:\[\.\.\.LOC_BLUE,(\d+)\]/, 'círculo de precisión'); F.aLocAcc = { relleno: +m[1], borde: +m[2] }; }
  { const m = tomar('04_mapa_capas.js', /id:'loc-dot'[\s\S]*?getLineColor:(T\.\w+)[\s\S]*?getLineWidth:([\d.]+)/, 'contorno de Mi ubicación');
    F.locContorno = tk(m[1]); F.locAncho = +m[2]; }
  // satélite: teselas con opacidad op sobre el fondo del mapa (--ground)
  { const m = tomar('04_mapa_capas.js', /sat: ESRI_KEY[\s\S]*?op:([\d.]+)[\s\S]*?op:([\d.]+)/, 'opacidad del satélite'); F.opSat = Math.min(+m[1], +m[2]); }
  F.satOscuro = sobre(C('imagen negra', [0, 0, 0]), F.sinfondo, F.opSat, `satélite, extremo oscuro (negro al ${pct(F.opSat)} sobre ${F.sinfondo.n})`);
  F.satClaro = sobre(C('imagen blanca', [255, 255, 255]), F.sinfondo, F.opSat, `satélite, extremo claro (blanco al ${pct(F.opSat)} sobre ${F.sinfondo.n})`);

  // interfaz sobre el mapa (CSS)
  const U = {};
  U.body = colorCSS('body', 'color');                  // color heredado del texto
  U.panel = variable('--panel'); U.panel2 = variable('--panel-2'); U.blanco = C('#fff', [255, 255, 255]);
  U.ink = variable('--ink'); U.ink2 = variable('--ink-2'); U.ink3 = variable('--ink-3'); U.guinda = variable('--guinda'); U.guindaInk = variable('--guinda-ink');
  U.mapsumBg = colorCSS('.mapsum', 'background');
  U.mapsumB = colorCSS('.mapsum .scope b', 'color'); U.mapsumSpan = colorCSS('.mapsum .scope span', 'color');
  U.mapsumStB = colorCSS('.mapsum .st b', 'color'); U.mapsumSmall = colorCSS('.mapsum .st small', 'color');
  U.legendBg = colorCSS('.legend', 'background'); U.lgTit = colorCSS('.legend .lg-tit', 'color'); U.lgCap = colorCSS('.legend .lg-cap', 'color');
  U.lgNote = colorCSS('.legend .lg-note', 'color'); U.lgKm = colorCSS('.legend .lg-km', 'color'); U.lgWarn = colorCSS('#lg-filter-note.warn', 'color');
  U.rowOff = colorCSS('.legend .row.off', 'color'); U.rowOffKm = colorCSS('.legend .row.off .lg-km', 'color');
  if (R.some(r => r.sels.some(s => s === '.legend .row.off') && r.decl.has('opacity'))) throw new Error('el renglón apagado de la leyenda volvió a llevar opacity: medir el texto compuesto en contraste.mjs');
  U.pill = colorCSS('.seg button', 'color'); U.pillBg = colorCSS('.seg.pills button', 'background');
  U.pillOn = colorCSS('.seg.pills button[aria-pressed="true"]', 'color'); U.pillOnBg = colorCSS('.seg.pills button[aria-pressed="true"]', 'background');
  U.lgCbBorde = colorCSS('.legend .row .lg-cb', 'border-color'); U.lgCbOn = colorCSS('#legend-rows .row[aria-checked="true"] .lg-cb', 'background');
  U.muestraBorde = colorCSS('.legend .row i', 'box-shadow');
  U.invCb = colorCSS('.inv-cb', 'color'); U.invN = colorCSS('.inv-n', 'color');
  U.leymini = colorCSS('.leymini', 'color'); U.leyminiBg = colorCSS('.leymini', 'background'); U.leyminiBorde = colorCSS('.leymini i', 'box-shadow');
  U.cardBg = colorCSS('.card', 'background'); U.cardSub = colorCSS('.card .sub', 'color'); U.cardDt = colorCSS('.card dt', 'color');
  U.cardDdSmall = colorCSS('.card dd small', 'color'); U.pillCard = colorCSS('.pill', 'color'); U.pillCardBg = colorCSS('.pill', 'background');
  U.cardnote = colorCSS('.cardnote', 'color'); U.empty = colorCSS('.card .empty-note', 'color'); U.emptyBg = colorCSS('.card .empty-note', 'background');
  U.cardClose = colorCSS('.card .close', 'color'); U.autoria = colorCSS('.autoria', 'color'); U.fa = colorCSS('.card .fa', 'color'); U.faIcono = colorCSS('.card .fa svg', 'stroke');
  U.locM = colorCSS('.card .loc-list .m', 'color'); U.locFollow = colorCSS('.card #loc-follow[aria-pressed="true"]', 'color'); U.locHereBg = colorCSS('.card .loc-here', 'background');
  U.attrib = colorCSS('.attrib', 'color'); U.attribBg = colorCSS('.attrib', 'background');
  U.etq = colorCSS('.etq-ligero', 'color'); U.etqBg = colorCSS('.etq-ligero', 'background');
  U.dib = colorCSS('.dibujando', 'color'); U.dibBg = colorCSS('.dibujando', 'background');
  U.aviso = colorCSS('.aviso-ligero', 'color'); U.avisoBg = colorCSS('.aviso-ligero', 'background'); U.avisoB = colorCSS('.aviso-ligero b', 'color');
  U.avisoX = colorCSS('.aviso-ligero button', 'color'); U.recarga = colorCSS('.aviso-error .recarga', 'color');
  U.tool = colorCSS('.tool', 'color'); U.toolBg = colorCSS('.tool', 'background'); U.toolHover = colorCSS('.tool:hover', 'color');
  U.zlocOn = colorCSS('#zloc.on', 'color'); U.zlocFollow = colorCSS('#zloc.follow', 'color'); U.zlocFollowBg = colorCSS('#zloc.follow', 'background');
  U.toggle = colorCSS('.panel-toggle', 'color');
  U.vista = colorCSS('.btn-vista', 'color', 'max-width:860px'); U.vistaBg = colorCSS('.btn-vista', 'background', 'max-width:860px');
  U.vistaT = numCSS('#ver-info-t', 'opacity', 'max-width:860px'); U.vistaFoco = colorCSS('.btn-vista:focus-visible', 'outline', 'max-width:860px');
  U.tip = colorCSS('.tip', 'color'); U.tipBg = colorCSS('.tip', 'background'); U.tipM = colorCSS('.tip .m', 'color');
  U.escala = colorCSS('.scalebar', 'color'); U.escalaBg = colorCSS('.scalebar', 'background'); U.escalaBarra = colorCSS('.scalebar i', 'border');
  // chips de los filtros «Atiende», «Banqueta» y «Espacio» (panel): mismo estilo en las tres filas desde la v1.30
  U.chipBg = colorCSS('.chip', 'background'); U.chipBorde = colorCSS('.chip', 'border-color'); U.chipCasilla = colorCSS('.chip i', 'border-color');
  U.chipOnBg = colorCSS('.resp-row .chip[aria-pressed="true"]', 'background'); U.chipOnBorde = colorCSS('.resp-row .chip[aria-pressed="true"]', 'border-color');
  U.chipOn = colorCSS('.chip[aria-pressed="true"]', 'color'); U.chipOnIcono = colorCSS('.chip[aria-pressed="true"] i', 'background'); U.chipOnMarca = colorCSS('.chip[aria-pressed="true"] i::after', 'background');
  U.foco = colorCSS(':focus-visible', 'outline'); U.focoHalo = colorCSS(':focus-visible', 'box-shadow');

  return { F, U, variable, historia, TK, js, R, redefinidos };
}

// ---------------------------------------------------------------- pares
// tipo: texto | linea | punto | aro | foco (decide la muestra del HTML). exige: false = informativo.
// opciones(g): g = renglones pendientes del mismo grupo; cada opción da su razón para cada renglón, en el mismo orden.
const opF = (t, c, extra = '') => ({ t, f: p => razon(c, p.bg), extra });   // otro primer plano contra el fondo de cada renglón
const opB = (t, c, extra = '') => ({ t, f: p => razon(p.fg, c), extra });   // otro fondo (o franja) contra el primer plano de cada renglón
const opR = (t, f, extra = '') => ({ t, f, extra });                        // cálculo propio por renglón
const actual = t => opR(t, p => p.razon);
export function auditar(raiz = RAIZ_DEF) {
  const S = leerFuentes(raiz); const { F, U } = S;
  const P = [];
  const NOM = ['Muy Baja', 'Baja', 'Media', 'Alta', 'Muy Alta'];
  const par = (id, tipo, fg, bg, donde, o = {}) => {
    const min = o.min || (tipo === 'texto' ? TEXTO : NO_TEXTO); const r = razon(fg, bg); const exige = o.exige !== false;
    P.push({ id, tipo, fg, bg, razon: r, min, exige, resultado: !exige ? 'Informativo' : r >= min ? 'Cumple' : 'Pendiente de decisión', donde, grupo: o.grupo || id, opciones: o.opciones || null }); };
  const B4 = [['suelo', F.suelo], ['manzana', F.manzana], ['verde (parques, ANP y AVA)', F.verde], ['agua', F.agua]];
  const B5 = [...B4, ['«Sin fondo»', F.sinfondo]];
  // relleno de colonia de una clase, con su transparencia real y la opacidad de la capa (opPrio), sobre su fondo
  const relleno = (k, alfa, base) => sobre(F.prio[k], base, (alfa / 255) * F.opPrio, `relleno de colonia ${F.prio[k].n} (${NOM[k]}) al ${pct((alfa / 255) * F.opPrio)} sobre ${base.n}`);
  const peor = (fg, fondos) => fondos.reduce((m, b) => (!m || razon(fg, b) < razon(fg, m)) ? b : m, null);

  // ===== MC · texto =====
  // 1. nombres del mapa: alcaldía y colonia (mismo color y halo) y calle
  const lbl = F.lblCol; const halo = F.haloCol;
  if (F.lblAlc.n !== lbl.n || F.haloAlc.n !== halo.n) throw new Error('los nombres de alcaldía y de colonia ya no comparten color y halo: separar sus renglones en contraste.mjs');
  const grosorHalo = (F.etqContorno / F.etqRadio * 0.75 * F.etqTam / 64 * F.etqRadio).toFixed(1);
  const opNombre = g => [opF(`Usar ${U.ink.n} para los nombres de alcaldía y colonia`, U.ink), opF(`Oscurecer ${lbl.n} hasta ${hex(oscurecerHasta(lbl, g.map(p => p.bg), TEXTO))}`, oscurecerHasta(lbl, g.map(p => p.bg), TEXTO)),
    opR(`Dejarlo así: el nombre queda rodeado por su halo (MC01: ${fmtR(razon(lbl, halo))})`, p => p.razon)];
  par('MC01', 'texto', lbl, halo, `Nombres de alcaldía y de colonia sobre su halo (contorno de ${grosorHalo} px a ${F.etqTam} px de letra; es lo que los sostiene sobre la rampa, los rellenos y el satélite)`);
  par('MC02', 'texto', lbl, F.suelo, 'Nombres de alcaldía y de colonia sobre el suelo del fondo «Calles»', { grupo: 'nombre', opciones: opNombre });
  par('MC03', 'texto', lbl, F.manzana, 'Nombres de alcaldía y de colonia sobre una manzana del fondo «Calles»', { grupo: 'nombre', opciones: opNombre });
  par('MC04', 'texto', lbl, F.verde, 'Nombres de alcaldía y de colonia sobre parques, jardines, ANP y AVA', { grupo: 'nombre', opciones: opNombre });
  par('MC05', 'texto', lbl, F.agua, 'Nombres de alcaldía y de colonia sobre cuerpos de agua', { grupo: 'nombre', opciones: opNombre });
  par('MC06', 'texto', lbl, F.sinfondo, 'Nombres de alcaldía y de colonia con «Sin fondo»', { grupo: 'nombre', opciones: opNombre });
  const calleSobre = b => sobre(F.lblCalle, b, F.lblCalle.a, `${F.lblCalle.n} al ${pct(F.lblCalle.a)}`);
  const haloCalleSobre = b => sobre(F.haloCalle, b, F.haloCalle.a, `halo ${F.haloCalle.n} al ${pct(F.haloCalle.a)} sobre ${b.n}`);
  par('MC07', 'texto', calleSobre(F.suelo), haloCalleSobre(F.suelo), 'Nombre de calle y de vialidad primaria sobre su halo blanco, en el suelo');
  par('MC08', 'texto', calleSobre(F.manzana), F.manzana, 'Nombre de calle sobre una manzana (sin contar el halo)');
  par('MC09', 'texto', calleSobre(F.verde), F.verde, 'Nombre de calle sobre parques, jardines, ANP y AVA (sin contar el halo)');
  par('MC10', 'texto', calleSobre(F.agua), F.agua, 'Nombre de calle sobre agua (sin contar el halo)');
  par('MC11', 'texto', calleSobre(F.sinfondo), F.sinfondo, 'Nombre de calle con «Sin fondo» (sin contar el halo)');
  // 7. satélite: contra el halo
  par('MC12', 'texto', lbl, halo, 'Satélite: nombres de alcaldía y de colonia sobre su halo opaco (la imagen no se transparenta en el halo)');
  par('MC13', 'texto', calleSobre(F.satOscuro), haloCalleSobre(F.satOscuro), `Satélite: nombre de calle sobre su halo, que es blanco al ${pct(F.haloCalle.a)} y deja pasar la imagen (peor caso: imagen negra)`);
  // 6. textos de la interfaz del mapa
  const ui = [
    ['MC14', U.mapsumB, U.mapsumBg, 'Resumen del mapa (#mapsum): nombre del ámbito'],
    ['MC15', U.mapsumSpan, U.mapsumBg, 'Resumen del mapa: rótulo en mayúsculas («Resumen», «Colonia»…)'],
    ['MC16', U.mapsumStB, U.mapsumBg, 'Resumen del mapa: cifras'],
    ['MC17', U.mapsumSmall, U.mapsumBg, 'Resumen del mapa: texto bajo las cifras'],
    ['MC18', U.lgTit, U.legendBg, 'Panel de capas: título «Capas y prioridad»'],
    ['MC19', U.lgCap, U.legendBg, 'Panel de capas: rótulos de sección («Ver en el mapa», «Mapa de fondo»…)'],
    ['MC20', U.lgNote, U.legendBg, 'Panel de capas: notas'],
    ['MC21', U.body, U.legendBg, 'Leyenda: nombre de cada prioridad (renglón encendido)'],
    ['MC22', U.lgKm, U.legendBg, 'Leyenda: km de cada prioridad'],
    ['MC24', U.lgWarn, U.legendBg, 'Leyenda: aviso «Ninguna prioridad está visible»'],
    ['MC25', U.pill, U.pillBg, 'Panel de capas: píldoras sin marcar (Alcaldías, Colonias, Calles; Sin fondo, Calles, Satélite)'],
    ['MC26', U.pillOn, U.pillOnBg, 'Panel de capas: píldora marcada'],
    ['MC27', U.invCb, U.legendBg, 'Espacios para plantar: nombre de cada casilla'],
    ['MC28', U.invN, U.legendBg, 'Espacios para plantar: conteo de cada casilla'],
    ['MC29', U.leymini, U.leyminiBg, 'Leyenda compacta: «Muy Alta» y «Muy Baja»'],
    ['MC30', U.body, U.cardBg, 'Ficha (#card): título y valores'],
    ['MC31', U.cardSub, U.cardBg, 'Ficha: subtítulo'],
    ['MC32', U.cardDt, U.cardBg, 'Ficha: etiquetas grises de cada dato (dt)'],
    ['MC33', U.cardDdSmall, U.cardBg, 'Ficha: aclaraciones pequeñas junto a un valor'],
    ['MC34', U.pillCard, U.pillCardBg, 'Ficha: píldora de prioridad («PRIORIDAD MUY ALTA»)'],
    ['MC35', U.cardnote, U.cardBg, 'Ficha: nota al pie'],
    ['MC36', U.empty, U.emptyBg, 'Ficha: nota destacada (fondo gris)'],
    ['MC37', U.autoria, U.cardBg, 'Ficha: autoría'],
    ['MC38', U.fa, U.cardBg, 'Ficha: botones «Cómo llegar», «Street View»…'],
    ['MC39', U.cardClose, U.cardBg, 'Ficha: × para cerrar'],
    ['MC40', U.locM, U.cardBg, 'Ficha de Mi ubicación: texto gris de los tramos cercanos'],
    ['MC41', U.locFollow, U.cardBg, 'Ficha de Mi ubicación: «Seguirme» encendido (justo en el mínimo)'],
    ['MC42', U.body, U.locHereBg, 'Ficha de Mi ubicación: «Estás en…»'],
    ['MC43', U.attrib, sobre(U.attribBg, F.sinfondo), 'Crédito (#attrib) con «Sin fondo», y su enlace (hereda el color, subrayado)'],
    ['MC44', U.attrib, sobre(U.attribBg, F.satOscuro), 'Crédito del satélite y su enlace «Esri» (peor caso: imagen negra bajo el fondo translúcido)'],
    ['MC45', U.etq, U.etqBg, 'Etiqueta «Modo ligero»'],
    ['MC46', U.dib, U.dibBg, 'Aviso «Dibujando calles…»'],
    ['MC47', U.aviso, U.avisoBg, 'Avisos sobre el mapa (modo ligero y errores): texto'],
    ['MC48', U.avisoB, U.avisoBg, 'Avisos sobre el mapa: texto en negritas'],
    ['MC49', U.recarga, U.avisoBg, 'Aviso de error: botón «Recargar la página»'],
    ['MC50', U.avisoX, U.avisoBg, 'Avisos sobre el mapa: × para cerrar'],
    ['MC51', U.tool, U.toolBg, 'Botones del mapa (+, −, ?, casa, capas, Mi ubicación)'],
    ['MC52', U.toolHover, U.toolBg, 'Botones del mapa al pasar el ratón'],
    ['MC53', U.toggle, U.toolBg, 'Botón para ocultar el panel'],
    ['MC54', U.vista, U.vistaBg, 'Celular: «Volver a la información» (blanco sobre guinda)'],
    ['MC55', sobre(U.vista, U.vistaBg, U.vistaT, `${U.vista.n} al ${pct(U.vistaT)}`), U.vistaBg, 'Celular: lugar consultado bajo «Volver a la información»'],
    ['MC56', U.tip, U.tipBg, 'Descripción emergente al pasar el ratón'],
    ['MC57', U.tipM, U.tipBg, 'Descripción emergente: texto gris'],
    ['MC58', U.escala, sobre(U.escalaBg, F.satOscuro), 'Barra de escala: texto (peor caso: satélite negro bajo su fondo translúcido)'],
  ];
  for (const [id, fg, bg, d] of ui) par(id, 'texto', fg, bg, d, { opciones: g => [opF(`Usar ${U.ink2.n}`, U.ink2), opF(`Usar ${U.ink.n}`, U.ink),
    opF(`Oscurecer hasta ${hex(oscurecerHasta(fg, g.map(p => p.bg), TEXTO))}`, oscurecerHasta(fg, g.map(p => p.bg), TEXTO))] });
  // renglón apagado de la leyenda: el texto cambia de color, sin opacity (solo la muestra de color se atenúa)
  par('MC23', 'texto', U.rowOff, U.legendBg, 'Leyenda: nombre de una prioridad apagada (casilla sin marcar; sigue siendo un control que se puede volver a encender)');
  par('MC59', 'texto', U.rowOffKm, U.legendBg, 'Leyenda: km de una prioridad apagada');
  // filtros del panel (heredan el color del texto: button{color:inherit})
  par('MC60', 'texto', U.body, U.chipBg, 'Filtros «Atiende», «Banqueta» y «Espacio»: texto de un chip sin elegir');
  par('MC61', 'texto', U.chipOn, U.chipOnBg, 'Filtros «Atiende», «Banqueta» y «Espacio»: texto del chip elegido (blanco sobre guinda)');
  P.sort((a, b) => a.id.localeCompare(b.id));

  // ===== MN · no texto =====
  let n = 0; const mn = () => 'MN' + String(++n).padStart(2, '0');
  const aFr = (F.aFr.dentro / 255) * F.opPrio;
  const linea = k => conA(F.prio[k], aFr, `${F.prio[k].n} ${NOM[k]}${aFr < 1 ? ' al ' + pct(aFr) : ''}`);
  const otraVia = 'la prioridad se lee también en la leyenda (muestra y nombre), la descripción al pasar el ratón, la ficha del frente y «Dónde empezar»; el grosor no la distingue (todas las líneas de frente miden lo mismo)';
  const opLinea = k => g => { const osc = oscurecerHasta(F.prio[k], g.map(p => p.bg), NO_TEXTO);
    return [opF(`Oscurecer ${F.prio[k].n} hasta ${hex(osc)} (cambia la rampa en todo: mapa, leyenda, barras y fichas PDF; se pierde el paso claro → oscuro)`, osc),
      opF(`Filete de 1 px en ${U.ink3.n} ${hex(U.ink3)} a cada lado de las líneas de esta clase (la línea conserva su color)`, U.ink3),
      actual(`Dejarlo así y documentarlo: ${otraVia}`)]; };
  // 2. rampa sobre suelo, manzana, sin fondo y rellenos. Las clases claras (T.prioClara: las que no llegan a 3:1 contra el blanco) llevan filete
  // desde el zoom F.fileteZ: ahí se mide la línea contra su filete; el filete contra cada fondo va en los pares «Filete de las clases claras»
  // (al final de MN) y la línea sin filete, por debajo de ese zoom, en los informativos.
  const clara = k => razon(F.prio[k], F.claraRef) < F.claraMin;
  const filSobre = b => sobre(conA(F.filete, aFr), b, aFr, aFr < 1 ? `filete ${F.filete.n} al ${pct(aFr)} sobre ${b.n}` : F.filete.n);   // el filete lleva la transparencia de su línea
  const conFil = `desde el zoom ${F.fileteZ}, contra su filete ${F.filete.n} de ${F.filetePx} px a cada lado`;
  const opFilete = k => () => { const osc = oscurecerHasta(F.filete, [F.prio[k]], NO_TEXTO);
    return [opB(`Filete en ${U.ink.n} ${hex(U.ink)} (el del filete oscuro de la calle consultada; contra los fondos claros, de ${fmtR(Math.min(...B5.map(([, b]) => razon(U.ink, b))))} en adelante)`, U.ink),
      opB(`Oscurecer ${F.filete.n} hasta ${hex(osc)} (contra los fondos claros, de ${fmtR(Math.min(...B5.map(([, b]) => razon(osc, b))))} en adelante)`, osc),
      actual(`Dejarlo así: el filete es lo que separa la línea del fondo (pares «Filete de las clases claras», todos de 3:1 o más); ${otraVia}`)]; };
  const rampa = (k, b, donde) => {
    if (!clara(k)) return par(mn(), 'linea', sobre(linea(k), b), b, donde, { grupo: 'rampa' + k, opciones: opLinea(k) });
    const fb = filSobre(b); par(mn(), 'linea', sobre(linea(k), fb), fb, `${donde}, ${conFil} (el filete contra el fondo, en los pares «Filete de las clases claras»)`, { grupo: 'filete' + k, opciones: opFilete(k) }); };
  const bases = [['el suelo del fondo «Calles»', F.suelo], ['una manzana del fondo «Calles»', F.manzana], ['«Sin fondo»', F.sinfondo]];
  for (const [txt, b] of bases) for (let k = 0; k < 5; k++)
    rampa(k, b, `Línea de prioridad ${NOM[k]} (frentes de manzana; también vialidades primarias con Gobierno Central) sobre ${txt}`);
  // rellenos de colonia: el que menos contrasta con la línea o, en las clases claras, con su filete
  const rellenosCalles = [0, 1, 2, 3, 4].map(j => relleno(j, F.aCol.calles, F.suelo)), rellenosSinf = [0, 1, 2, 3, 4].map(j => relleno(j, F.aCol.sinf, F.sinfondo));
  const peorRelleno = (k, base, rellenos) => clara(k) ? peor(filSobre(base), rellenos) : peor(sobre(linea(k), base), rellenos);
  for (let k = 0; k < 5; k++) rampa(k, peorRelleno(k, F.suelo, rellenosCalles), `Línea ${NOM[k]} sobre el relleno de colonia que menos contrasta (fondo «Calles», relleno al ${pct(F.aCol.calles / 255 * F.opPrio)})`);
  // con «Sin fondo» el relleno de colonia es igual de tenue que con «Calles» (v1.30): lo que quede abajo es de la misma clase de la rampa
  for (let k = 0; k < 5; k++) rampa(k, peorRelleno(k, F.sinfondo, rellenosSinf), `Línea ${NOM[k]} sobre el relleno de colonia que menos contrasta («Sin fondo», relleno al ${pct(F.aCol.sinf / 255 * F.opPrio)})`);
  // vialidades primarias en gris (modo Alcaldías)
  const vpG = conA(F.vpGris, F.aVP.ctx / 255 * F.opPrio, `${F.vpGris.n} al ${pct(F.aVP.ctx / 255 * F.opPrio)}`);
  for (const [txt, b] of [['el suelo', F.suelo], ['una manzana', F.manzana], ['«Sin fondo»', F.sinfondo]])
    par(mn(), 'linea', sobre(vpG, b), b, `Vialidades primarias en gris (contexto con «Alcaldías») sobre ${txt}`, { grupo: 'vpgris', opciones: () => [
      opF(`Dibujarlas opacas (hoy al ${pct(F.aVP.ctx / 255)})`, F.vpGris), opF(`Usar ${U.ink3.n} ${hex(U.ink3)} opaco`, U.ink3),
      actual('Dejarlo así: son contexto (las atiende el Gobierno Central) y en la leyenda se dice que van en gris')] });
  // 3. límites
  for (const [txt, b] of B5) par(mn(), 'linea', F.limAlc, b, `Límite de alcaldía (${F.limAlc.n}, 1 a 1.5 px) sobre ${txt}`, { grupo: 'limalc', opciones: g => {
    const osc = oscurecerHasta(F.limAlc, g.map(p => p.bg), NO_TEXTO);
    return [opF(`Oscurecer ${F.limAlc.n} hasta ${hex(osc)}`, osc), opF(`Usar ${U.ink3.n} ${hex(U.ink3)}`, U.ink3),
      actual('Dejarlo así: el límite de alcaldía es contexto; el nombre de la alcaldía y el contorno de la elegida (MN39 a MN43) sí cumplen')]; } });
  const limCol = F.aLimCol < 1 ? conA(F.limCol, F.aLimCol, `${F.limCol.n} al ${pct(F.aLimCol)}`) : F.limCol;
  for (const [txt, b] of B5) par(mn(), 'linea', sobre(limCol, b), b, `Límite de colonia (${F.limCol.n}, 0.7 a 1 px${F.aLimCol < 1 ? ', opacidad ' + F.aLimCol : ''}) sobre ${txt}`, { grupo: 'limcol', opciones: g => {
    const osc = oscurecerHasta(F.limCol, g.map(p => p.bg), NO_TEXTO);
    return [opF(`Oscurecer ${F.limCol.n} hasta ${hex(osc)} y dibujarlo opaco (se vería tan fuerte como el de alcaldía)`, osc), opF(`Usar el gris del límite de alcaldía (${F.limAlc.n} ${hex(F.limAlc)}) opaco`, F.limAlc),
      actual('Dejarlo así: el límite de colonia es contexto; la colonia se reconoce por su nombre, su relleno y, al elegirla, por su contorno (MN39 a MN49)')]; } });
  // contorno de la colonia o alcaldía elegida (va encima de las líneas de prioridad)
  for (const [txt, b] of B5) par(mn(), 'linea', F.sel, b, `Contorno de la colonia o alcaldía elegida (${F.sel.n}, 2.2 a 4 px) sobre ${txt}`);
  // donde cruza una línea de prioridad, el contorno va sobre su franja blanca (contornoElegido en 04_mapa_capas.js)
  for (let k = 0; k < 5; k++) par(mn(), 'linea', F.sel, F.selFranja, `Contorno de la colonia o alcaldía elegida donde cruza una línea ${NOM[k]}: contra su franja blanca de ${F.franjaPx} px (${F.selFranja.n})`);
  { const rel = [0, 1, 2, 3, 4].map(j => relleno(j, F.aCol.selFr, F.suelo)); const p = peor(F.sel, rel);
    par(mn(), 'linea', F.sel, p, `Contorno de la colonia elegida sobre su propio relleno (al ${pct(F.aCol.selFr / 255)}), el que menos contrasta`); }
  // calle y avenida consultadas: resalte() de 04_mapa_capas.js. De fuera hacia dentro: franja (F.rsFranja), halo (F.rsHalo), filete (F.rsFilete),
  // filete oscuro (F.rsOscuro) solo bajo las clases claras y, al centro, la prioridad. Todo opaco.
  for (const [txt, b] of B5) par(mn(), 'linea', F.rsHalo, b, `Calle consultada: halo ${F.rsHalo.n} sobre ${txt}`);
  for (let k = 0; k < 5; k++) par(mn(), 'linea', F.rsHalo, F.rsFranja, `Calle consultada: halo junto a una línea ${NOM[k]} vecina: contra la franja ${F.rsFranja.n} que los separa`);
  par(mn(), 'linea', F.rsFilete, F.rsHalo, `Calle consultada: filete ${F.rsFilete.n} sobre el halo ${F.rsHalo.n}`);
  for (let k = 0; k < 5; k++) { const fil = clara(k) ? F.rsOscuro : F.rsFilete;
    par(mn(), 'linea', F.prio[k], fil, `Calle o avenida consultada: prioridad ${NOM[k]} al centro, sobre el filete ${clara(k) ? `oscuro (${F.rsOscuro.n}, que va sobre el filete ${F.rsFilete.n}: ${fmtR(razon(F.rsOscuro, F.rsFilete))})` : F.rsFilete.n}`); }
  // avenida resaltada (Gobierno Central): el mismo resalte, más ancho
  for (const txt of ['toda la ciudad', 'con alcaldía elegida']) par(mn(), 'linea', F.rsHalo, F.suelo, `Avenida consultada (Gobierno Central, ${txt}): halo ${F.rsHalo.n} sobre el suelo`);
  // 4. inventario: el símbolo contra su contorno blanco (compuesto sobre cada fondo); el contorno lo rodea siempre
  const SIM = [['Cepa vacante (anillo)', 'aro', F.inv[0]], ['Tocón (círculo)', 'punto', F.inv[1]], ['Árbol muerto (círculo con ×)', 'punto', F.inv[2]]];
  const fondosSim = [...B4, ...[0, 1, 2, 3, 4].map(k => [`la línea ${NOM[k]}`, sobre(linea(k), F.suelo)])];
  for (const [nom, tipo, c] of SIM) for (const [txt, b] of fondosSim) {
    const cont = sobre(F.invContorno, b, F.invContorno.a, `contorno ${F.invContorno.n} al ${pct(F.invContorno.a)} sobre ${b.n}`);
    par(mn(), tipo, c, cont, `${nom} sobre ${txt}: contra su contorno blanco (el símbolo directo sobre el fondo: ${fmtR(razon(c, b))})`); }
  for (const [nom, tipo, c] of SIM) par(mn(), tipo, c, conA(F.invContorno, 1, F.invContorno.n), `${nom} contra el contorno blanco mismo`);
  par(mn(), 'texto', F.invX, F.inv[2], 'Árbol muerto: la × blanca sobre el círculo gris (símbolo, no texto)', { min: NO_TEXTO });
  par(mn(), 'aro', F.inv[0], sobre(F.invContorno, F.satOscuro), 'Satélite: cepa vacante contra su contorno blanco (peor caso: imagen negra)');
  par(mn(), 'punto', sobre(F.invContorno, F.satOscuro), F.satOscuro, 'Satélite: contorno blanco de los símbolos del inventario sobre la imagen (peor caso: imagen negra)');
  // 5. marcadores
  par(mn(), 'punto', F.loc, F.locContorno, `Mi ubicación: punto ${F.loc.n} contra su contorno blanco de ${F.locAncho} px (justo en el mínimo de texto; para un punto basta 3:1)`);
  par(mn(), 'punto', F.locContorno, F.satOscuro, 'Satélite: contorno blanco de Mi ubicación sobre la imagen (peor caso: imagen negra)');
  par(mn(), 'punto', F.pto, F.ptoContorno, `Punto buscado por coordenadas: ${F.pto.n} contra su contorno blanco de ${F.ptoAncho} px`);
  par(mn(), 'punto', F.ptoContorno, F.satOscuro, 'Satélite: contorno blanco del punto buscado sobre la imagen (peor caso: imagen negra)');
  par(mn(), 'foco', U.foco, U.focoHalo, `Anillo de foco del teclado (${U.foco.n}, 3 px) contra su halo blanco de 2 px`);
  for (const [txt, b] of [['el suelo del fondo «Calles»', F.suelo], ['«Sin fondo»', F.sinfondo], ['una manzana', F.manzana], ['el panel blanco', U.panel]]) par(mn(), 'foco', U.foco, b, `Anillo de foco sobre ${txt}`);
  par(mn(), 'foco', U.vistaFoco, F.suelo, `Celular: foco de «Volver a la información» (${U.vistaFoco.n}) sobre el suelo del mapa`);
  par(mn(), 'foco', U.vistaFoco, F.sinfondo, 'Celular: foco de «Volver a la información» sobre «Sin fondo»');
  // controles de la interfaz del mapa (no texto)
  par(mn(), 'linea', U.lgCbBorde, U.legendBg, `Leyenda: borde de la casilla sin marcar (${U.lgCbBorde.n})`);
  par(mn(), 'punto', U.lgCbOn, U.legendBg, 'Leyenda: casilla marcada');
  par(mn(), 'linea', U.faIcono, U.cardBg, 'Ficha: íconos de «Cómo llegar», «Street View»…');
  par(mn(), 'punto', U.zlocOn, U.toolBg, 'Botón Mi ubicación encendido: ícono azul');
  par(mn(), 'punto', U.zlocFollow, U.zlocFollowBg, 'Botón Mi ubicación en «Seguirme»: ícono blanco sobre azul');
  par(mn(), 'linea', U.escalaBarra, sobre(U.escalaBg, F.satOscuro), 'Barra de escala: trazo (peor caso: satélite negro bajo su fondo translúcido)');
  // muestra Muy Baja de la leyenda: el borde interior (inset) es lo que la separa del panel
  const bordeMuestra = sobre(U.muestraBorde, F.prio[0], U.muestraBorde.a, `borde ${U.muestraBorde.n} sobre ${F.prio[0].n}`);
  par(mn(), 'linea', bordeMuestra, U.legendBg, 'Leyenda: borde de la muestra Muy Baja (lo que la separa del panel)');
  const bordeMini = sobre(U.leyminiBorde, F.prio[0], U.leyminiBorde.a, `borde ${U.leyminiBorde.n} sobre ${F.prio[0].n}`);
  par(mn(), 'linea', bordeMini, U.leyminiBg, 'Leyenda compacta: borde de la muestra Muy Baja');
  // chips de los filtros del panel: lo que los separa del panel y el icono (casilla ☐/☑ en «Atiende» y «Espacio», radio ○/◉ en «Banqueta»)
  par(mn(), 'linea', U.chipBorde, U.panel, `Filtros: borde de un chip sin elegir (${U.chipBorde.n}) sobre el panel`);
  par(mn(), 'linea', U.chipCasilla, U.chipBg, `Filtros: borde de la casilla o del círculo de un chip sin elegir (${U.chipCasilla.n})`);
  par(mn(), 'punto', U.chipOnBg, U.panel, 'Filtros: relleno del chip elegido sobre el panel');
  par(mn(), 'linea', U.chipOnBorde, U.panel, 'Filtros: borde del chip elegido sobre el panel');
  par(mn(), 'punto', U.chipOnIcono, U.chipOnBg, 'Filtros: casilla o círculo blanco del chip elegido sobre el guinda');
  par(mn(), 'punto', U.chipOnMarca, U.chipOnIcono, 'Filtros: palomita o punto guinda dentro de la casilla o el círculo blanco');
  // filete de las clases claras contra cada fondo (desde el zoom F.fileteZ); al final de MN para no mover la numeración anterior
  const fondosFilete = [...B5, ['el relleno de colonia que menos contrasta (fondo «Calles»)', peor(filSobre(F.suelo), rellenosCalles)], ['el relleno de colonia que menos contrasta («Sin fondo»)', peor(filSobre(F.sinfondo), rellenosSinf)]];
  for (const [txt, b] of fondosFilete) par(mn(), 'linea', filSobre(b), b, `Filete de las clases claras (${F.filete.n}, ${F.filetePx} px a cada lado de las líneas ${yLista(NOM.filter((_, k) => clara(k)))}, desde el zoom ${F.fileteZ}) sobre ${txt}`);

  // ===== MI · informativos =====
  let m = 0; const mi = () => 'MI' + String(++m).padStart(2, '0'); const inf = (tipo, fg, bg, d) => par(mi(), tipo, fg, bg, d, { exige: false });
  inf('punto', F.manzana, F.suelo, 'Fondo «Calles»: manzana contra suelo (suave a propósito)');
  inf('punto', F.verde, F.suelo, 'Fondo «Calles»: verde contra suelo');
  inf('punto', F.agua, F.suelo, 'Fondo «Calles»: agua contra suelo');
  inf('punto', F.verde, F.manzana, 'Fondo «Calles»: verde contra manzana');
  inf('punto', F.agua, F.manzana, 'Fondo «Calles»: agua contra manzana');
  for (let k = 0; k < 4; k++) inf('linea', F.prio[k], F.prio[k + 1], `Rampa: ${NOM[k]} contra ${NOM[k + 1]} (clases vecinas)`);
  for (let k = 0; k < 5; k++) inf('texto', lbl, relleno(k, F.aCol.calles, F.suelo), `Nombre de colonia sobre el relleno ${NOM[k]} (fondo «Calles», al ${pct(F.aCol.calles / 255)}); lo sostiene el halo (MC01)`);
  for (let k = 0; k < 5; k++) inf('texto', lbl, relleno(k, F.aCol.sinf, F.sinfondo), `Nombre de colonia sobre el relleno ${NOM[k]} («Sin fondo», al ${pct(F.aCol.sinf / 255)}); lo sostiene el halo (MC01)`);
  inf('texto', lbl, relleno(4, F.aCol.soloCol, F.sinfondo), `Nombre de colonia con solo colonias (relleno Muy Alta al ${pct(F.aCol.soloCol / 255)}); lo sostiene el halo (MC01)`);
  inf('texto', lbl, relleno(4, F.aCol.selSolo, F.sinfondo), `Nombre de la colonia elegida sin calles (relleno Muy Alta al ${pct(F.aCol.selSolo / 255)}); lo sostiene el halo (MC01)`);
  inf('texto', lbl, sobre(F.prio[4], F.suelo, F.aAlc.todas / 255 * F.opPrio, `relleno de alcaldía ${F.prio[4].n} al ${pct(F.aAlc.todas / 255)}`), 'Nombre de alcaldía sobre el relleno de alcaldía Muy Alta (capa «Alcaldías»); lo sostiene el halo (MC01)');
  inf('texto', lbl, F.satOscuro, 'Satélite: nombre de colonia directo sobre la imagen, sin halo (peor caso: negra); el fondo varía');
  inf('texto', lbl, F.satClaro, 'Satélite: nombre de colonia directo sobre la imagen, sin halo (imagen blanca)');
  for (let k = 0; k < 5; k++) { const a = razon(linea(k), F.satOscuro), b = razon(linea(k), F.satClaro); const bg = a < b ? F.satOscuro : F.satClaro;
    inf('linea', sobre(linea(k), bg), bg, `Satélite: línea ${NOM[k]}, sin halo; varía con la imagen: de ${fmtR(Math.min(a, b))} a ${fmtR(Math.max(a, b))} entre imagen negra y blanca`); }
  inf('linea', sobre(conA(F.prio[4], F.aFr.fuera / 255 * F.opPrio), F.suelo), F.suelo, `Frente fuera del ámbito consultado (al ${pct(F.aFr.fuera / 255)}, atenuado a propósito), clase Muy Alta`);
  inf('linea', sobre(conA(F.prio[4], F.opPrioMin), F.suelo), F.suelo, `Línea Muy Alta con la opacidad de la prioridad al mínimo (${pct(F.opPrioMin)}), que elige la persona`);
  inf('linea', sobre(conA(F.vpGris, F.aVP.fuera / 255), F.suelo), F.suelo, `Vialidad primaria fuera del ámbito (al ${pct(F.aVP.fuera / 255)}) con el gris de contexto`);
  { const p = F.prio.reduce((a, c) => razon(F.limAlc, c) < razon(F.limAlc, a) ? c : a); inf('linea', F.limAlc, p, `Límite de alcaldía junto a la línea que menos contrasta (${p.n}); las líneas de prioridad se dibujan encima del límite`); }
  { const lc = sobre(limCol, F.suelo); const p = F.prio.reduce((a, c) => razon(lc, c) < razon(lc, a) ? c : a); inf('linea', lc, p, `Límite de colonia junto a la línea que menos contrasta (${p.n}); las líneas se dibujan encima`); }
  inf('aro', F.inv[0], F.prio[2], 'Cepa vacante directo sobre la clase Media, sin contorno');
  inf('punto', F.inv[1], F.prio[2], 'Tocón directo sobre la clase Media, sin contorno');
  inf('punto', F.inv[2], F.prio[4], 'Árbol muerto directo sobre la clase Muy Alta, sin contorno');
  inf('aro', F.inv[0], F.inv[1], 'Entre símbolos: cepa contra tocón (además, anillo hueco contra círculo lleno)');
  inf('aro', F.inv[0], F.inv[2], 'Entre símbolos: cepa contra árbol muerto (además, anillo hueco contra círculo con ×)');
  inf('punto', F.inv[1], F.inv[2], 'Entre símbolos: tocón contra árbol muerto (los distingue la × y el tamaño, no el color)');
  inf('punto', sobre(conA(F.loc, F.aLocAcc.relleno / 255), F.suelo), F.suelo, `Mi ubicación: círculo de precisión, relleno al ${pct(F.aLocAcc.relleno / 255)}`);
  inf('linea', sobre(conA(F.loc, F.aLocAcc.borde / 255), F.suelo), F.suelo, `Mi ubicación: borde del círculo de precisión al ${pct(F.aLocAcc.borde / 255)}`);
  inf('punto', F.loc, F.prio[4], 'Mi ubicación: punto azul junto a una línea Muy Alta (el contorno blanco va de por medio)');
  inf('foco', U.foco, F.prio[4], 'Anillo de foco junto a una línea Muy Alta (el halo blanco va de por medio)');
  inf('foco', U.foco, F.satOscuro, 'Anillo de foco sobre el satélite (peor caso: imagen negra; el halo blanco va de por medio)');
  for (let k = 0; k < 5; k++) inf('punto', F.prio[k], U.legendBg, `Leyenda: muestra ${NOM[k]} contra el panel (sin su borde)`);
  inf('linea', U.vistaFoco, U.vistaBg, 'Celular: foco de «Volver a la información» contra el botón guinda (hay 2 px de mapa en medio)');
  // por qué llevan franja blanca el contorno de lo elegido y el resalte de lo consultado (v1.30)
  inf('linea', F.sel, F.prio[4], 'Contorno de lo elegido directo sobre una línea Muy Alta, sin su franja blanca');
  for (let k = 0; k < 5; k++) inf('linea', F.rsHalo, sobre(linea(k), F.suelo), `Calle consultada: halo ${F.rsHalo.n} directo contra una línea ${NOM[k]} vecina, sin la franja blanca`);
  // clases claras por debajo del zoom del filete: sin filete, a propósito (v1.31)
  const sinFilete = k => [...bases, ['el relleno de colonia que menos contrasta (fondo «Calles»)', peor(sobre(linea(k), F.suelo), rellenosCalles)], ['el relleno de colonia que menos contrasta («Sin fondo»)', peor(sobre(linea(k), F.sinfondo), rellenosSinf)]]
    .map(([t, b]) => ({ t, b, r: razon(sobre(linea(k), b), b) })).sort((a, b) => a.r - b.r);
  for (let k = 0; k < 5; k++) if (clara(k)) { const s = sinFilete(k), m0 = s[0];
    inf('linea', sobre(linea(k), m0.b), m0.b, `Línea ${NOM[k]} por debajo del zoom ${F.fileteZ}: va sin filete, a propósito, para que a escala de ciudad se lea la rampa (con filete, las zonas claras se ven grises); de ${fmtR(m0.r)} a ${fmtR(s[s.length - 1].r)} sobre los fondos claros, el más bajo sobre ${m0.t}`); }

  const pend = P.filter(p => p.resultado === 'Pendiente de decisión');
  return { pares: P, pendientes: pend, fuentes: S, notas: notas(S) };
}

// ---------------------------------------------------------------- notas: colores repetidos o definidos en dos lugares
function notas(S) {
  const out = []; const { historia, F, U } = S;
  for (const [k, h] of historia) { const vals = [...new Set(h.map(x => x.v.toLowerCase()))]; if (vals.length > 1)
    out.push(`La variable ${k} se define ${h.length} veces con valores distintos: ${h.map(x => `${x.v} en ${x.archivo}`).join('; ')}. Gana la última (${h[h.length - 1].v}); la de ${h[0].archivo} no tiene efecto y confunde a quien la lea ahí.`); }
  for (const [k, t] of S.redefinidos) out.push(`${k} se declara ${t.length} veces con valores distintos: ${t.map(x => `${x.v} en ${x.archivo}`).join('; ')}. Se mide el último, que es el que gana.`);
  // valores iguales con nombres distintos
  const porHex = new Map(); for (const [k] of historia) { try { const c = S.variable(k); const hx = hex(c); if (!porHex.has(hx)) porHex.set(hx, []); porHex.get(hx).push(k); } catch (e) { /* no es color */ } }
  for (const [hx, ks] of porHex) if (ks.length > 1) out.push(`Mismo color con dos nombres: ${ks.join(' y ')} (${hx}).`);
  // colores escritos a mano en el JS
  const vars = [...historia.keys()].map(k => { try { return S.variable(k); } catch (e) { return null; } }).filter(Boolean);
  for (const c of Object.values(F).filter(c => c && c.rgb && /escrito en 04_mapa_capas/.test(c.n))) { const igual = vars.find(v => hex(v) === hex(c));
    const cerca = vars.map(v => [v, Math.max(...v.rgb.map((x, i) => Math.abs(x - c.rgb[i])))]).filter(([, d]) => d > 0 && d <= 6).sort((a, b) => a[1] - b[1])[0];
    if (igual) out.push(`${c.n} = ${hex(c)} es el mismo valor que ${igual.n}, pero escrito a mano: si cambia ${igual.n}, este no cambia.`);
    else if (cerca) out.push(`${c.n} = ${hex(c)} casi igual a ${cerca[0].n} (${hex(cerca[0])}) pero distinto: probablemente quiso ser ${cerca[0].n}.`); }
  if (F.protegidaMismoVerde) out.push(`ANP y AVA se pintan con el mismo verde que parques y jardines (${F.verde.n} ${hex(F.verde)}): en el mapa no se distinguen entre sí.`);
  out.push(`Los nombres de alcaldía y colonia usan de halo ${F.haloCol.n} (${hex(F.haloCol)}), no el suelo del fondo «Calles» (${F.suelo.n} ${hex(F.suelo)}): sobre el suelo blanco el halo se ve como una sombra beige muy tenue.`);
  out.push(`Filete de las clases claras: se mide como se ve desde el zoom ${F.fileteZ}. Dos excepciones a propósito: por debajo de ese zoom no se dibuja (lectura de la rampa a escala de ciudad; ver los informativos «por debajo del zoom ${F.fileteZ}») y, en modo ligero (sin tarjeta gráfica), los frentes solo lo llevan con una alcaldía o colonia elegida, porque el de toda la ciudad hacía cada cuadro un 55 % más lento.`);
  out.push(`El satélite no tiene color propio: se mide contra sus extremos (imagen negra y blanca, al ${pct(F.opSat)} sobre ${F.sinfondo.n}).`);
  return out;
}

// ---------------------------------------------------------------- salida
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const desc = c => `${c.n} ${hex(c)}`;
export function resumen(A) { const P = A.pares; const c = k => P.filter(p => p.resultado === k).length;
  return { total: P.length, cumple: c('Cumple'), pendiente: c('Pendiente de decisión'), informativo: c('Informativo'), exigidos: P.filter(p => p.exige).length }; }
// opciones de un grupo de pendientes: texto y razón resultante para cada renglón del grupo, en su orden
export function opcionesDe(g) { if (!g[0].opciones) return null; return g[0].opciones(g).map(o => ({ t: o.t, r: g.map(p => fmtR(o.f(p))).join(' / ') + (o.extra || '') })); }
function gruposPendientes(A) { const g = new Map(); for (const p of A.pendientes) { if (!g.has(p.grupo)) g.set(p.grupo, []); g.get(p.grupo).push(p); } return [...g.values()]; }
const CRITERIO = 'Cada par se mide sobre el fondo donde aparece en el mapa. Texto: 4.5:1; líneas, puntos, aros, contornos y foco: 3:1 (WCAG 2.2, criterios 1.4.3 y 1.4.11). La razón se calcula con la luminancia relativa de WCAG 2.2, y herramientas/contraste.mjs la calcula por su lado leyendo los colores de 02_fuente/css y 02_fuente/js. Lo que se dibuja con transparencia (opacidad de la capa, `opPrio`, rellenos con alfa, halos al 92 %) se compone sobre su fondo antes de medir; el hex que se muestra es el color ya compuesto. La opacidad de la prioridad se mide en su valor de inicio (100 %). «Pendiente de decisión» es un par que se exige, que hoy no cumple y que espera la decisión de Liber. «Informativo» es un par que no se exige pero conviene ver; las razones se truncan a dos decimales (4.499 se muestra 4.49).';

// lo principal, calculado de los mismos pares (para el arranque del documento)
export function hallazgos(A) {
  const P = A.pares, by = id => P.find(p => p.id === id), F = A.fuentes.F;
  const NOM = ['Muy Baja', 'Baja', 'Media', 'Alta', 'Muy Alta'];
  // rampa: clases con filete (las claras), su informativo sin filete, la línea contra su filete y el filete contra los fondos
  const conFil = NOM.filter(nm => P.some(p => p.donde.startsWith(`Línea de prioridad ${nm} (`) && p.donde.includes(', desde el zoom ')));
  const sinFil = NOM.filter(nm => !conFil.includes(nm));
  const infSin = nm => P.find(p => p.donde.startsWith(`Línea ${nm} por debajo del zoom `));
  const rangoSin = nm => { const m = (infSin(nm) || { donde: '' }).donde.match(/de ([\d.]+:1) a ([\d.]+:1) sobre los fondos claros/); return m ? `${m[1]} a ${m[2]}` : '¿?'; };
  const contraFil = nm => P.find(p => p.donde.startsWith(`Línea de prioridad ${nm} (`) && p.donde.includes(', desde el zoom '));
  const filFondos = P.filter(p => p.donde.startsWith('Filete de las clases claras'));
  const malFil = conFil.filter(nm => contraFil(nm).resultado !== 'Cumple');
  const malSin = sinFil.filter(nm => P.some(p => p.donde.startsWith(`Línea de prioridad ${nm} (`) && p.resultado !== 'Cumple'));
  const mc = P.filter(p => p.id.startsWith('MC')), mcMal = mc.filter(p => p.resultado !== 'Cumple');
  const inv = P.filter(p => /^(Cepa vacante|Tocón|Árbol muerto)/.test(p.donde) && p.exige), invMin = inv.reduce((m, p) => p.razon < m.razon ? p : m, inv[0]);
  const entre = P.filter(p => p.donde.startsWith('Entre símbolos'));
  const L = [];
  L.push(`Rampa de prioridad (frentes y, con Gobierno Central, vialidades primarias): ${yLista(conFil)} no llegan a 3:1 sobre ningún fondo claro (${conFil.map(nm => `${nm} ${rangoSin(nm)}`).join('; ')}). Desde el zoom ${F.fileteZ} llevan un filete ${F.filete.n} de ${F.filetePx} px a cada lado, que contra los fondos da de ${fmtR(Math.min(...filFondos.map(p => p.razon)))} a ${fmtR(Math.max(...filFondos.map(p => p.razon)))}; la línea contra su filete: ${yLista(conFil.map(nm => `${nm} ${fmtR(contraFil(nm).razon)}`))}${malFil.length ? ` (${malFil.join(' y ')} no llega${malFil.length > 1 ? 'n' : ''} a 3:1: pendiente de decisión)` : ''}. Por debajo del zoom ${F.fileteZ} van sin filete, a propósito, para que a escala de ciudad se lea la rampa. ${sinFil.join(' y ')} no llevan filete y ${malSin.length ? `no siempre cumplen (${malSin.join(', ')})` : 'cumplen'}${(() => { const r = P.filter(p => /^Línea (Alta|Muy Alta) sobre el relleno/.test(p.donde) && p.resultado !== 'Cumple'); return r.length ? `, salvo ${r.map(p => `${p.donde.split(' sobre')[0].replace('Línea ', '')} sobre el relleno de colonia con «Sin fondo» (${p.id}, ${fmtR(p.razon)})`).join(' y ')}` : ''; })()}. La prioridad no depende solo del color de la línea: la dicen la leyenda (muestra y nombre), la descripción al pasar el ratón, la ficha del frente y «Dónde empezar». El grosor no la distingue: todos los frentes miden ${F.anchoFr[0]} m (de ${F.anchoFr[1]} a ${F.anchoFr[2]} px), sin importar la clase.`);
  L.push(`Nombres del mapa: ${mc.filter(p => /^(Nombres|Nombre de calle|Satélite: nombre)/.test(p.donde)).every(p => p.resultado === 'Cumple') ? 'cumplen' : 'no todos cumplen'} sobre suelo, manzana, verde, agua y «Sin fondo», y contra su halo (${fmtR(by('MC01').razon)} los de alcaldía y colonia; ${fmtR(by('MC07').razon)} los de calle). Sobre los rellenos fuertes y el satélite los sostiene el halo (ver MI).`);
  L.push(`Textos (nombres del mapa e interfaz sobre el mapa): ${mcMal.length ? `${mc.length - mcMal.length} de ${mc.length} cumplen; no cumple ${mcMal.map(p => `${p.id} (${p.donde.split(':')[0]}, ${fmtR(p.razon)})`).join(', ')}` : 'todos los textos cumplen'}.${by('MC41').razon < 4.6 ? ` «Seguirme» encendido (${fmtR(by('MC41').razon)}) queda justo en el mínimo: cualquier cambio de --loc lo tira.` : ''}`);
  L.push(`Inventario: los tres símbolos cumplen contra su contorno blanco sobre todos los fondos y las cinco clases (el más bajo, ${invMin.id}, ${fmtR(invMin.razon)}). Entre ellos el color casi no los separa (${entre.map(p => fmtR(p.razon)).join(', ')}): los distingue la forma (anillo hueco, círculo lleno, círculo con ×).`);
  const cuenta = re => { const g = P.filter(p => p.exige && re.test(p.donde)); const b = g.filter(p => p.resultado === 'Cumple').length; return `${b} de ${g.length}`; };
  L.push(`Límites y resaltados (cumplen / medidos): límite de alcaldía ${cuenta(/^Límite de alcaldía/)}; límite de colonia ${cuenta(/^Límite de colonia/)}; vialidades primarias en gris ${cuenta(/^Vialidades primarias en gris/)}; contorno de la colonia o alcaldía elegida ${cuenta(/^Contorno de la colonia/)} (sobre una franja blanca de ${F.franjaPx} px donde cruza las líneas); calle consultada ${cuenta(/^Calle (o avenida )?consultada/)}; avenida consultada ${cuenta(/^Avenida consultada/)}. El resalte de la calle o avenida consultada va, de fuera hacia dentro, en franja ${F.rsFranja.n}, halo ${F.rsHalo.n}, filete ${F.rsFilete.n} y, bajo las clases claras, filete ${F.rsOscuro.n}: el halo directo contra una línea Alta vecina daría ${fmtR(razon(F.rsHalo, F.prio[3]))}.`);
  return L;
}

export function markdown(A) {
  const s = resumen(A); const L = [];
  L.push('# Contraste medido sobre cada fondo real', '');
  L.push(`Mapa de la herramienta «Modelo de priorización de reforestación urbana». Generado con \`node herramientas/contraste.mjs --md\` (${new Date().toISOString().slice(0, 10)}); no editar a mano: si un color cambia en 02_fuente, se vuelve a generar.`, '');
  L.push(CRITERIO, '');
  L.push(`**${s.total} pares medidos: ${s.cumple} cumplen, ${s.pendiente} pendientes de decisión y ${s.informativo} informativos** (${s.exigidos} exigidos).`, '');
  L.push('Ids: MC = colores de texto (4.5:1); MN = no texto (3:1); MI = informativos.', '');
  L.push('## Lo principal', ''); for (const h of hallazgos(A)) L.push('- ' + h); L.push('');
  L.push('## Tabla', '', '| Id | Primer plano y fondo | Razón | Mínimo | Resultado | Dónde |', '|---|---|---|---|---|---|');
  for (const p of A.pares) L.push(`| ${p.id} | ${desc(p.fg).replace(/\|/g, '\\|')} sobre ${desc(p.bg).replace(/\|/g, '\\|')} | ${fmtR(p.razon)} | ${p.min}:1${p.exige ? '' : ' (ref.)'} | ${p.resultado} | ${p.donde.replace(/\|/g, '\\|')} |`);
  L.push('', '## Pendientes de decisión', '');
  if (!A.pendientes.length) L.push('Ninguno.');
  for (const g of gruposPendientes(A)) { const p0 = g[0];
    L.push(`### ${g.map(p => p.id).join(', ')}`, '');
    for (const p of g) L.push(`- ${p.id} · ${desc(p.fg)} sobre ${desc(p.bg)} · **${fmtR(p.razon)}** (mínimo ${p.min}:1) · ${p.donde}`);
    L.push('');
    const ops = opcionesDe(g);
    if (ops) { L.push('Opciones (razón resultante de cada renglón de arriba, en el mismo orden):', ''); ops.forEach((o, i) => L.push(`${i + 1}. ${o.t} → ${o.r}`)); L.push('', 'Decide Liber.', ''); }
    else L.push('Sin opciones preparadas en contraste.mjs. Decide Liber.', ''); }
  L.push('## Notas', ''); for (const n of A.notas) L.push('- ' + n);
  L.push('', '## Cómo se usa', '', '- `node herramientas/contraste.mjs` imprime la tabla; con `--md` y `--html` reescribe este documento y la versión HTML (`_local/auditoria_contraste_mapa.html`).', '- `04_pruebas/prueba_contraste.js` (en las rápidas) usa el mismo cálculo: falla si un par exigido que hoy cumple deja de cumplir; los pendientes de decisión solo se listan como aviso.', '');
  return L.join('\n');
}

export function html(A) {
  const s = resumen(A);
  const muestra = p => { const f = hex(p.fg), b = hex(p.bg);
    if (p.tipo === 'texto') return `<span class="mu" style="background:${b};color:${f}">Aa</span>`;
    if (p.tipo === 'linea') return `<span class="mu" style="background:${b}"><i class="li" style="background:${f}"></i></span>`;
    if (p.tipo === 'aro') return `<span class="mu" style="background:${b}"><i class="aro" style="border-color:${f}"></i></span>`;
    if (p.tipo === 'foco') return `<span class="mu" style="background:${b}"><i class="fo" style="outline-color:${f}"></i></span>`;
    return `<span class="mu" style="background:${b}"><i class="pu" style="background:${f}"></i></span>`; };
  const cls = r => r === 'Cumple' ? 'ok' : r === 'Informativo' ? 'in' : 'pe';
  const filas = A.pares.map(p => `<tr class="${cls(p.resultado)}"><td class="id">${p.id}</td><td class="mc">${muestra(p)}</td><td class="pf"><b>${esc(p.fg.n)}</b> <code>${hex(p.fg)}</code><br>sobre <b>${esc(p.bg.n)}</b> <code>${hex(p.bg)}</code></td><td class="ra">${fmtR(p.razon)}</td><td class="mi">${p.min}:1${p.exige ? '' : ' <small>(ref.)</small>'}</td><td><span class="re ${cls(p.resultado)}">${p.resultado}</span></td><td class="do">${esc(p.donde)}</td></tr>`).join('\n');
  const pend = gruposPendientes(A).map(g => { const ops = opcionesDe(g);
    return `<section class="pd"><h3>${g.map(p => p.id).join(', ')}</h3><ul>${g.map(p => `<li>${muestra(p)}<span><b>${p.id} · ${fmtR(p.razon)}</b><br>${esc(p.donde)}</span></li>`).join('')}</ul>${ops ? `<ol>${ops.map(o => `<li>${esc(o.t)} → <b>${esc(o.r)}</b></li>`).join('')}</ol><p class="de">Decide Liber.</p>` : '<p class="de">Sin opciones preparadas. Decide Liber.</p>'}</section>`; }).join('\n');
  return `<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contraste del mapa</title>
<style>
:root{color-scheme:light dark;--bg:#FAF9F5;--tx:#24262A;--t2:#55585A;--ln:#E2DDD5;--cd:#FFFFFF;--ok:#1E6B36;--okb:#E3F1E6;--pe:#8A1C1C;--peb:#FBE7E5;--in:#4A4F55;--inb:#ECEDEE;--ac:#7E1A3A}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#17181A;--tx:#ECEAE5;--t2:#B9B6AF;--ln:#34363A;--cd:#202225;--ok:#8FD3A1;--okb:#1D3324;--pe:#F2A6A0;--peb:#3D1F1D;--in:#C4C7CB;--inb:#2C2E31;--ac:#E89BB3}}
:root[data-theme="dark"]{--bg:#17181A;--tx:#ECEAE5;--t2:#B9B6AF;--ln:#34363A;--cd:#202225;--ok:#8FD3A1;--okb:#1D3324;--pe:#F2A6A0;--peb:#3D1F1D;--in:#C4C7CB;--inb:#2C2E31;--ac:#E89BB3}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--tx);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:1280px;margin:0 auto;padding:24px 16px 48px}
h1{font-size:1.5rem;line-height:1.2;margin:0 0 8px;color:var(--ac)}
h2{font-size:1.15rem;margin:32px 0 10px}
h3{font-size:1rem;margin:0 0 6px}
p{margin:0 0 10px}
.cr{color:var(--t2);max-width:80ch}
.res{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 18px;padding:0;list-style:none}
.res button{font:inherit;border:1px solid var(--ln);background:var(--cd);color:var(--tx);border-radius:999px;padding:6px 12px;cursor:pointer;min-height:40px}
.res button[aria-pressed="true"]{border-color:var(--tx);box-shadow:inset 0 0 0 1px var(--tx)}
.res b{font-variant-numeric:tabular-nums}
table{width:100%;border-collapse:collapse;background:var(--cd);border:1px solid var(--ln);border-radius:8px;overflow:hidden}
th,td{text-align:left;vertical-align:top;padding:8px 10px;border-bottom:1px solid var(--ln);font-size:.875rem}
th{font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:var(--t2);background:var(--bg)}
td.id{font-weight:700;white-space:nowrap}
td.ra{font-variant-numeric:tabular-nums;font-weight:700;white-space:nowrap}
td.mi{white-space:nowrap;color:var(--t2)}
code{font-size:.8125rem}
.re{display:inline-block;padding:2px 8px;border-radius:999px;font-size:.75rem;font-weight:700;white-space:nowrap}
.re.ok{background:var(--okb);color:var(--ok)}.re.pe{background:var(--peb);color:var(--pe)}.re.in{background:var(--inb);color:var(--in)}
.mu{display:inline-grid;place-items:center;width:64px;height:40px;border-radius:6px;border:1px solid var(--ln);font:700 18px/1 Roboto,system-ui,sans-serif;vertical-align:middle;flex:none}
.mu .li{display:block;width:48px;height:4px;border-radius:2px}
.mu .pu{display:block;width:14px;height:14px;border-radius:50%}
.mu .aro{display:block;width:16px;height:16px;border-radius:50%;border:3px solid}
.mu .fo{display:block;width:30px;height:18px;border-radius:4px;outline:3px solid;outline-offset:2px}
.pd{background:var(--cd);border:1px solid var(--ln);border-left:4px solid var(--pe);border-radius:8px;padding:12px 14px;margin:0 0 12px}
.pd ul{list-style:none;margin:0 0 10px;padding:0}.pd ul li{display:flex;gap:10px;align-items:flex-start;margin:0 0 8px}.pd ul li span:last-child{min-width:0;flex:1}
.pd ol{margin:0 0 6px;padding-left:22px}.pd ol li{margin:0 0 4px}
.de{color:var(--t2);font-style:italic;margin:0}
.notas li{margin:0 0 6px}
.tema{float:right;font:inherit;border:1px solid var(--ln);background:var(--cd);color:var(--tx);border-radius:6px;padding:6px 10px;cursor:pointer;min-height:40px}
@media (max-width:760px){
  thead{display:none}
  table,tbody,tr,td{display:block;width:100%}
  table{border:0;background:transparent}
  tr{background:var(--cd);border:1px solid var(--ln);border-radius:8px;margin:0 0 10px;padding:10px 12px;display:grid;grid-template-columns:auto 1fr auto;gap:4px 10px;align-items:center}
  td{border:0;padding:0}
  td.id{grid-column:1}td.mc{grid-column:1;grid-row:2 / span 2}td.ra{grid-column:3;grid-row:1;text-align:right}
  td.mi{grid-column:3;grid-row:2;text-align:right}td:nth-child(6){grid-column:2;grid-row:1}
  td.pf{grid-column:2 / span 2;grid-row:3;overflow-wrap:anywhere}td.do{grid-column:1 / -1;grid-row:4;color:var(--t2)}
}
</style>
</head>
<body>
<main>
<button class="tema" type="button" id="tema" aria-label="Cambiar entre modo claro y oscuro">Claro / oscuro</button>
<h1>Contraste medido sobre cada fondo real</h1>
<p class="cr">Mapa del «Modelo de priorización de reforestación urbana». ${esc(CRITERIO)}</p>
<ul class="ha">${hallazgos(A).map(h => `<li>${esc(h)}</li>`).join("")}</ul>
<p><b>${s.total} pares medidos: ${s.cumple} cumplen, ${s.pendiente} pendientes de decisión y ${s.informativo} informativos.</b> Generado con <code>node herramientas/contraste.mjs --html</code> el ${new Date().toISOString().slice(0, 10)}. La muestra pinta cada par con los colores ya compuestos.</p>
<ul class="res" aria-label="Filtrar la tabla">
<li><button type="button" data-f="" aria-pressed="true">Todos <b>${s.total}</b></button></li>
<li><button type="button" data-f="ok" aria-pressed="false">Cumple <b>${s.cumple}</b></button></li>
<li><button type="button" data-f="pe" aria-pressed="false">Pendiente de decisión <b>${s.pendiente}</b></button></li>
<li><button type="button" data-f="in" aria-pressed="false">Informativo <b>${s.informativo}</b></button></li>
</ul>
<table>
<thead><tr><th>Id</th><th>Muestra</th><th>Primer plano y fondo</th><th>Razón</th><th>Mínimo</th><th>Resultado</th><th>Dónde</th></tr></thead>
<tbody>
${filas}
</tbody>
</table>
<h2>Pendientes de decisión</h2>
${pend || '<p>Ninguno.</p>'}
<h2>Notas</h2>
<ul class="notas">${A.notas.map(n => `<li>${esc(n)}</li>`).join('')}</ul>
</main>
<script>
document.querySelectorAll('.res button').forEach(function(b){b.addEventListener('click',function(){var f=b.getAttribute('data-f');
document.querySelectorAll('.res button').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});
document.querySelectorAll('tbody tr').forEach(function(tr){tr.hidden=!!f&&!tr.classList.contains(f);});});});
document.getElementById('tema').addEventListener('click',function(){var r=document.documentElement,o=r.getAttribute('data-theme');
var osc=o?o==='dark':matchMedia('(prefers-color-scheme: dark)').matches;r.setAttribute('data-theme',osc?'light':'dark');});
</script>
</body>
</html>
`;
}

export function tabla(A) {
  const s = resumen(A); const L = [];
  L.push(`Contraste del mapa · ${s.total} pares: ${s.cumple} cumplen, ${s.pendiente} pendientes de decisión, ${s.informativo} informativos`, '');
  for (const p of A.pares) L.push(`${p.id.padEnd(5)} ${fmtR(p.razon).padStart(8)}  ${(p.min + ':1').padEnd(6)} ${p.resultado.padEnd(22)} ${desc(p.fg)} sobre ${desc(p.bg)} · ${p.donde}`);
  if (A.pendientes.length) { L.push('', 'Pendientes de decisión:'); for (const g of gruposPendientes(A)) { L.push('  ' + g.map(p => `${p.id} ${fmtR(p.razon)}`).join(', ') + ' · ' + g[0].donde);
    const ops = opcionesDe(g) || []; ops.forEach((o, i) => L.push(`      ${i + 1}. ${o.t} → ${o.r}`)); } }
  L.push('', 'Notas:'); for (const n of A.notas) L.push('  - ' + n);
  return L.join('\n');
}

// ---------------------------------------------------------------- línea de órdenes
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2); const arg = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const A = auditar();
  if (args.includes('--pendientes')) { console.log(A.pendientes.map(p => '  [' + JSON.stringify(p.id) + ', ' + JSON.stringify(p.donde) + '],').join('\n')); process.exit(0); }
  if (args.includes('--json')) console.log(JSON.stringify(A.pares.map(p => ({ id: p.id, fg: desc(p.fg), bg: desc(p.bg), razon: +r2(p.razon).toFixed(2), min: p.min, resultado: p.resultado, donde: p.donde })), null, 1));
  else console.log(tabla(A));
  const md = arg('--md'), ht = arg('--html');
  if (md) { fs.writeFileSync(path.resolve(md), markdown(A)); console.log('\nEscrito ' + md); }
  if (ht) { fs.mkdirSync(path.dirname(path.resolve(ht)), { recursive: true }); fs.writeFileSync(path.resolve(ht), html(A)); console.log('Escrito ' + ht); }
}
