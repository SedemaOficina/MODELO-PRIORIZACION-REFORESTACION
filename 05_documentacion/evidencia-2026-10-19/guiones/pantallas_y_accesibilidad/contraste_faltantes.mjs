// A6 · Pares que herramientas/contraste.mjs no mide: capas nuevas sobre el satélite (extremos negro y blanco al 90 % sobre --ground,
// el mismo criterio de la herramienta). Usa sus funciones (razon, rgbDe). Uso: node contraste_faltantes.mjs
import { razon, rgbDe, fmtR } from 'file:///X:/r2/herramientas/contraste.mjs';
import fs from 'node:fs';
const css = fs.readFileSync('X:/r2/02_fuente/css/01_variables.css', 'utf8'); const v = n => rgbDe(css.match(new RegExp('--' + n + ':\s*(#[0-9A-Fa-f]{6})'))[1]);
const ground = v('ground'), mezcla = (c, a, b) => ({ rgb: c.rgb.map((x, k) => Math.round(x * a + b.rgb[k] * (1 - a))) });
const satN = mezcla({ rgb: [0, 0, 0] }, 0.9, ground), satB = mezcla({ rgb: [255, 255, 255] }, 0.9, ground);
const pares = [
  ['Filete de las clases claras (--ink-3) sobre satélite negro', v('ink-3'), satN, 3], ['Filete de las clases claras (--ink-3) sobre satélite blanco', v('ink-3'), satB, 3],
  ['Calle consultada: franja blanca exterior (--map-halo) sobre satélite negro', v('map-halo'), satN, 3], ['Calle consultada: franja blanca exterior sobre satélite blanco', v('map-halo'), satB, 3],
  ['Calle consultada: halo --guinda sobre satélite blanco (si la franja se pierde)', v('guinda'), satB, 3], ['Calle consultada: halo --guinda sobre satélite negro (sin franja)', v('guinda'), satN, 3],
  ['Tocón contra su contorno blanco sobre satélite negro', v('inv-tocon'), mezcla({ rgb: [255, 255, 255] }, 0.92, satN), 3], ['Árbol muerto contra su contorno blanco sobre satélite negro', v('inv-muerto'), mezcla({ rgb: [255, 255, 255] }, 0.92, satN), 3],
  ['Contorno blanco de los símbolos del inventario sobre satélite blanco', mezcla({ rgb: [255, 255, 255] }, 0.92, satB), satB, 3],
  ['Tocón directo sobre satélite blanco (el contorno no se distingue)', v('inv-tocon'), satB, 3], ['Cepa vacante directo sobre satélite blanco', v('inv-cepa'), satB, 3],
  ['Límite de colonia (--map-col) sobre satélite negro', v('map-col'), satN, 3], 
];
for (const [n, a, b, min] of pares) { const r = razon(a, b); console.log(`${r >= min ? 'Cumple ' : 'NO     '} ${fmtR(r).padStart(8)}  ${n}`); }
