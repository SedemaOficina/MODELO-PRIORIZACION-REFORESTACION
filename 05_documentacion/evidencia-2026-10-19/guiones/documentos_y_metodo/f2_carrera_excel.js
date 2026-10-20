// F2 · Carrera: el Excel espera al inventario (deliverConEsp) y el diccionario se arma después con el estado del momento.
// Uso: node f2_carrera_excel.js RUTA_A_LA_COPIA [ms_de_retraso]
// Retrasa espacios_frentes.bin, pide el Excel de frentes de Milpa Alta y, mientras espera, cambia a Tláhuac.
// Imprime el nombre del archivo, los renglones de datos (alcaldía de cada renglón) y el «Ámbito consultado» del Diccionario.
const path = require('path'), fs = require('fs'), cp = require('child_process'); const RAIZ = process.argv[2]; const RET = +(process.argv[3] || 5000);
const L = require(path.join(RAIZ, '04_pruebas', 'lib_pruebas.js')); const DOCS = path.join(RAIZ, 'docs'); const DIR = path.join(__dirname, 'descargas'); fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const s = await L.servidor(0, DOCS); const b = await L.lanzar(); const { ctx, page } = await L.abrir(b, s.url + '?modo=ligero#nomap');
  await page.route(/espacios_(frentes|vp)\.bin/, async r => { await new Promise(x => setTimeout(x, RET)); await r.continue(); });
  await L.elegir(page, 'Milpa Alta'); await page.waitForTimeout(800);
  const pDesc = page.waitForEvent('download', { timeout: 120000 });
  await page.$eval('#dl-frentes', x => x.click()); await page.waitForTimeout(400);
  await L.elegir(page, 'Tláhuac'); const ahora = await page.$eval('#scope-title', e => e.innerText.trim());
  const d = await pDesc; const ruta = path.join(DIR, 'carrera_' + d.suggestedFilename()); await d.saveAs(ruta);
  const r = cp.spawnSync(L.PY, ['-I', path.join(__dirname, 'lee_excel.py'), ruta], { encoding: 'utf8' });
  console.log(JSON.stringify({ retraso_ms: RET, pantalla_al_terminar: ahora, archivo: d.suggestedFilename(), contenido: JSON.parse(r.stdout || '{}'), err: r.stderr.slice(0, 300) }, null, 1));
  await ctx.close(); await b.close(); s.close(); })().catch(e => { console.error(e); process.exit(1); });
