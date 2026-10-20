// D4 · 1a · Peso en disco de cada archivo de R/docs (recursivo), gzip -9 y brotli calidad 11 (zlib de Node).
// .bin y .woff2 ya vienen comprimidos: su columna comprimida es «no aplica»; aun así se anota cuánto ganaría recomprimirlos (recomp_*)
// para comprobar que no conviene. Uso: node d4_pesos_disco.js → d4_pesos_disco.json
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const { DOCS, E } = require('./d4_lib.js');
const ya = f => /\.(bin|woff2)$/.test(f), img = f => /\.(png|jpg)$/.test(f);
const filas = [];
(function rec(d) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) rec(p); else {
  const b = fs.readFileSync(p), rel = path.relative(DOCS, p).replace(/\\/g, '/');
  const gz = zlib.gzipSync(b, { level: 9 }).length, br = zlib.brotliCompressSync(b, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: b.length } }).length;
  const f = { archivo: rel, disco: b.length };
  if (ya(rel)) { f.gzip9 = 'no aplica (ya comprimido)'; f.brotli11 = 'no aplica (ya comprimido)'; f.recomp_gzip9 = gz; f.recomp_brotli11 = br; f.firma_gzip = b[0] === 0x1f && b[1] === 0x8b; }
  else { f.gzip9 = gz; f.brotli11 = br; if (img(rel)) f.nota = 'imagen: ya comprimida por su formato'; }
  filas.push(f); } } })(DOCS);
filas.sort((a, b) => b.disco - a.disco);
const tot = { disco: filas.reduce((a, f) => a + f.disco, 0) };
fs.writeFileSync(path.join(E, 'd4_pesos_disco.json'), JSON.stringify({ fecha: new Date().toISOString(), docs: DOCS, total: tot, archivos: filas }, null, 1));
const kb = n => typeof n === 'number' ? (n / 1024).toFixed(1) : n;
console.log('archivo'.padEnd(42), 'disco KB'.padStart(10), 'gzip9 KB'.padStart(10), 'br11 KB'.padStart(10), ' recomp gz/br KB');
for (const f of filas) console.log(f.archivo.padEnd(42), kb(f.disco).padStart(10), String(typeof f.gzip9 === 'number' ? kb(f.gzip9) : 'n/a').padStart(10), String(typeof f.brotli11 === 'number' ? kb(f.brotli11) : 'n/a').padStart(10), f.recomp_gzip9 ? ` ${kb(f.recomp_gzip9)}/${kb(f.recomp_brotli11)}` : '');
console.log('total disco', tot.disco, 'bytes en', filas.length, 'archivos');
