# Librerías de terceros

Copias locales, **sin modificar**, de las librerías que usa la herramienta. Todas son de código abierto y permiten su redistribución conservando su aviso de licencia; el texto completo de cada licencia va junto a la librería.

| Archivo | Librería | Versión | Licencia | Texto de la licencia | Para qué se usa |
|---|---|---|---|---|---|
| `deck.js` | deck.gl (vis.gl, OpenJS Foundation) | 9.4.0 | MIT | `LICENCIA_deck.gl.txt` | Dibujo del mapa (frentes, colonias, vialidades, etiquetas) |
| `pako.js` | pako (solo descompresión) | 2.1.0 | MIT y Zlib | `LICENCIA_pako.txt` | Descomprimir los datos en navegadores sin `DecompressionStream` |
| `jspdf.js` | jsPDF | 4.2.1 | MIT | `LICENCIA_jspdf.txt` | Fichas en PDF (se carga solo al pedir una ficha) |
| `xlsx.js` | SheetJS Community Edition | 0.20.3 | Apache 2.0 | `LICENCIA_xlsx.txt` | Descargas en Excel (se carga solo al pedir un Excel) |
| `../fuentes/cabin.woff2` | Cabin (The Cabin Project Authors) | variable 400–700, subconjunto latino | SIL Open Font License 1.1 | `../fuentes/OFL_Cabin.txt` | Títulos y cifras |
| `../fuentes/roboto.woff2` | Roboto (The Roboto Project Authors) | variable 400–700, subconjunto latino | SIL Open Font License 1.1 | `../fuentes/OFL_Roboto.txt` | Texto general |

`excel_worker.js` es código propio de la herramienta (arma los Excel grandes en un proceso auxiliar).

## Procedencia y huellas

Cada archivo es idéntico, byte a byte, al que distribuye el paquete oficial (verificado el 2 de octubre de 2026; jsPDF y SheetJS actualizados el 5 de octubre de 2026, v17.34). SheetJS ya no publica en npm desde la 0.18.5: sus versiones con las correcciones de seguridad se distribuyen solo desde su sitio oficial, `cdn.sheetjs.com`. Para comprobarlo: `sha256sum 02_fuente/libs/*.js`.

| Archivo | Paquete y ruta de origen | SHA-256 |
|---|---|---|
| `deck.js` | `deck.gl@9.4.0` · `dist.min.js` | `2eb6a1ae0d58604b1378682cd1136f8793478ba801e43dae48b3807e48758a6b` |
| `pako.js` | `pako@2.1.0` · `dist/pako_inflate.min.js` | `fa226c8e1e3556993260e6a5c1fe94e225da59b3418a06811fdc51d308f8bb43` |
| `jspdf.js` | `jspdf@4.2.1` (npm) · `dist/jspdf.umd.min.js` | `e6551fcdc32f09d6853b2c5126d18d01d9447e0da618a41a11ebeee0f6c20d54` |
| `xlsx.js` | `xlsx@0.20.3` (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`) · `dist/xlsx.full.min.js` | `cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41` |

Los textos de licencia son los archivos `LICENSE` de esos mismos paquetes.

## Alcance de este aviso

`deck.js` y `jspdf.js` son paquetes que reúnen, además, componentes de otros autores (por ejemplo, las librerías de vis.gl y `long.js` dentro de deck.gl). Sus avisos van dentro del propio archivo cuando el autor los incluyó; aquí se reproduce la licencia del paquete principal. No se hizo un inventario componente por componente.
