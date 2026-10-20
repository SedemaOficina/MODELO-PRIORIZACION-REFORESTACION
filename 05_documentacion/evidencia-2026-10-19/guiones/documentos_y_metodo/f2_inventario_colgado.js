// F2 · Si espacios_frentes.bin no responde (señal que se queda colgada), ¿llega el Excel? ¿qué dice la pantalla?
// Uso: node f2_inventario_colgado.js RUTA_A_LA_COPIA [segundos_de_espera]
const path = require('path'); const RAIZ = process.argv[2]; const SEG = +(process.argv[3] || 60);
const L = require(path.join(RAIZ, '04_pruebas', 'lib_pruebas.js')); const DOCS = path.join(RAIZ, 'docs');
(async () => {
  const s = await L.servidor(0, DOCS); const b = await L.lanzar(); const { ctx, page } = await L.abrir(b, s.url + '?modo=ligero#nomap');
  await page.route(/espacios_(frentes|vp)\.bin/, () => {});   // nunca responde
  await L.elegir(page, 'Milpa Alta'); await page.waitForTimeout(800);
  let llego = null; page.on('download', d => { llego = { t: Date.now(), nombre: d.suggestedFilename() }; });
  const t0 = Date.now(); await page.$eval('#dl-frentes', x => x.click());
  const muestras = []; for (let k = 0; k < SEG / 10; k++) { await page.waitForTimeout(10000); muestras.push({ s: (Date.now() - t0) / 1000 | 0, estado: await page.$eval('#dl-status', e => e.textContent.trim()), botonDeshabilitado: await page.$eval('#dl-frentes', e => e.disabled) }); if (llego) break; }
  // segundo intento del mismo botón
  await page.$eval('#dl-frentes', x => x.click()); await page.waitForTimeout(3000);
  console.log(JSON.stringify({ espera_s: SEG, descarga: llego && { ...llego, s: (llego.t - t0) / 1000 }, muestras, tras_segundo_clic: await page.$eval('#dl-status', e => e.textContent.trim()) }, null, 1));
  await ctx.close(); await b.close(); s.close(); })().catch(e => { console.error(e); process.exit(1); });
