// A6 · Clases e identificadores de la hoja de estilos que no aparecen en la plantilla, el JS ni construir.py.
// Uso: node clases_sin_uso.js   (lee r2/02_fuente). Escribe clases_sin_uso.json.
const C = require('./comun.js'); const { fs, path } = C; const F = path.join(C.R2, '02_fuente');
const css = fs.readdirSync(path.join(F, 'css')).sort().map(f => ({ f, t: fs.readFileSync(path.join(F, 'css', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/url\([^)]*\)/g, '') }));
const fuentes = [fs.readFileSync(path.join(F, 'plantilla.html'), 'utf8'), fs.readFileSync(path.join(F, 'construir.py'), 'utf8'), ...fs.readdirSync(path.join(F, 'js')).map(f => fs.readFileSync(path.join(F, 'js', f), 'utf8'))].join('\n');
const clases = new Map(), ids = new Map();
for (const { f, t } of css) { const sels = t.replace(/\{[^{}]*\}/g, '{}').replace(/@media[^{]*\{/g, '');   // solo selectores
  for (const m of sels.matchAll(/\.([a-zA-Z_][\w-]*)/g)) { if (/^\d/.test(m[1])) continue; if (!clases.has(m[1])) clases.set(m[1], new Set()); clases.get(m[1]).add(f); }
  for (const m of sels.matchAll(/#([a-zA-Z_][\w-]*)/g)) { if (!ids.has(m[1])) ids.set(m[1], new Set()); ids.get(m[1]).add(f); } }
const usado = n => new RegExp('(^|[^\w-])' + n.replace(/[-]/g, '\-') + '($|[^\w-])').test(fuentes);
const sinUso = [...clases].filter(([n]) => !usado(n)).map(([n, fs]) => ({ clase: n, en: [...fs] }));
const idsSinUso = [...ids].filter(([n]) => !usado(n)).map(([n, fs]) => ({ id: n, en: [...fs] }));
const out = { clases: clases.size, ids: ids.size, sinUso, idsSinUso }; C.guardaJSON('clases_sin_uso.json', out);
console.log(`clases en CSS: ${clases.size} · sin referencia: ${sinUso.length}`); sinUso.forEach(x => console.log('  .' + x.clase + '  (' + x.en.join(', ') + ')'));
console.log(`ids en CSS: ${ids.size} · sin referencia: ${idsSinUso.length}`); idsSinUso.forEach(x => console.log('  #' + x.id + '  (' + x.en.join(', ') + ')'));
