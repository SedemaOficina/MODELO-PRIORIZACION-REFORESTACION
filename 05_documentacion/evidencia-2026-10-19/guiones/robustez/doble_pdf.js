// Frente 5 · E3: segundo clic o toque que llega mientras se genera una ficha PDF (el hilo principal está ocupado).
// Uso: node doble_pdf.js <carpeta r5> [ronda]. Cuenta los archivos que llegan por cada par de clics.
const path = require('path');
const R5 = path.resolve(process.argv[2] || '.'); const RONDA = process.argv[3] || '1';
const L = require(path.join(R5, '04_pruebas', 'lib_pruebas.js')); const M = L.decodificar().META;
(async () => {
  const srv = await L.servidor(0); const b = await L.lanzar(); const U = srv.url + '?modo=ligero';
  const escenas = [['escritorio', {}, 'Iztapalapa', 600], ['escritorio', {}, 'Tláhuac', 400], ['teléfono', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 'Tláhuac', 300]];
  for (const [equipo, op, alc, ms] of escenas) for (const id of ['dl-ficha-alc', 'dl-frentes']) {
    const { page, ctx } = await L.abrir(b, `${U}&a=${M.muns[M.munNames.indexOf(alc)]}#nomap`, op); await page.click('#tab-dl');
    // primero una descarga para que la librería ya esté cargada (caso común: la segunda ficha del día)
    await L.descargar(page, '#' + id, path.join(__dirname, 'tmp'), 240000); await page.waitForTimeout(1500);
    const n = []; page.on('download', d => n.push(d.suggestedFilename()));
    const t0 = Date.now(); const pulsa = () => equipo === 'teléfono' ? page.tap('#' + id) : page.click('#' + id);
    await page.evaluate(() => { window.__t = []; document.addEventListener('click', e => { if (e.target.closest('#dl-ficha-alc,#dl-frentes')) window.__t.push([Math.round(performance.now()), document.getElementById('dl-status').textContent.slice(0, 30)]); }, true); });
    const p1 = pulsa(); await page.waitForTimeout(ms); const p2 = pulsa(); await Promise.all([p1, p2]);
    await page.waitForFunction(() => /^Descargado/.test(document.getElementById('dl-status').textContent), null, { timeout: 240000 }).catch(() => {}); await page.waitForTimeout(4000);
    const t = await page.evaluate(() => window.__t);
    console.log(`${n.length === 1 ? 'PASA ' : 'FALLA'} ${equipo} · ${alc} · ${id} · dos ${equipo === 'teléfono' ? 'toques' : 'clics'} con ${ms} ms entre ellos → ${n.length} archivo(s) · clics vistos por la página: ${JSON.stringify(t)}`);
    await ctx.close(); }
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(2); });
