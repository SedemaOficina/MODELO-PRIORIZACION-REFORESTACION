// F1 · Selectores CSS cuyas clases o identificadores no aparecen en ningún otro lugar del sitio construido.
// Uso: node css_sin_uso.js RUTA/docs   → imprime clase/id, regla y archivo fuente (02_fuente/css) donde está
const fs = require('fs'), path = require('path');
const docs = process.argv[2]; const css = fs.readFileSync(path.join(docs, 'estilos.css'), 'utf8');
const js = fs.readFileSync(path.join(docs, 'app.js'), 'utf8') + fs.readFileSync(path.join(docs, 'index.html'), 'utf8') + fs.readFileSync(path.join(docs, 'config.js'), 'utf8');
const sinCom = css.replace(/\/\*[\s\S]*?\*\//g, '');
const tokens = new Map();
// selectores: lo que va antes de cada «{» que no está dentro de @media(…)
for (const m of sinCom.matchAll(/([^{}]+)\{/g)) { const sel = m[1].trim(); if (sel.startsWith('@')) continue;
  for (const t of sel.matchAll(/([.#])([A-Za-z_][\w-]*)/g)) { const k = t[1] + t[2]; if (!tokens.has(k)) tokens.set(k, new Set()); tokens.get(k).add(sel.slice(0, 120)); } }
const fuente = path.join(docs, '..', '02_fuente', 'css'); const archivos = fs.readdirSync(fuente).map(f => [f, fs.readFileSync(path.join(fuente, f), 'utf8')]);
const res = [];
for (const [k, sels] of tokens) { const nombre = k.slice(1);
  // aparece como palabra en el programa o en la página (class="… nombre …", classList, id="nombre", $('nombre'), querySelector)
  const re = new RegExp('(^|[^\w-])' + nombre.replace(/[-]/g, '\-') + '(?![\w-])');
  if (re.test(js)) continue;
  const donde = archivos.filter(([f, t]) => new RegExp('[.#]' + nombre.replace(/[-]/g, '\-') + '(?![\w-])').test(t)).map(([f]) => f);
  res.push({ token: k, archivos: donde, reglas: [...sels].slice(0, 3) }); }
console.log(JSON.stringify({ total_tokens: tokens.size, sin_referencia: res.length, lista: res }, null, 1));
