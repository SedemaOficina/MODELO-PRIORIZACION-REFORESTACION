const path = require('path'); const R2 = path.join(__dirname, '..', '..', 'r2'); process.env.DOCS = process.env.DOCS || path.join(R2, 'docs');
const L = require(path.join(R2, '04_pruebas', 'lib_pruebas.js'));
(async () => {
  const srv = await L.servidor(0); const b = await L.lanzar();
  for (const q of ['?modo=ligero', '?modo=ligero#nomap']) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-MX', serviceWorkers: 'block' });
    await ctx.addInitScript(() => { window.SIA_PRUEBA = true; });
    const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message)); p.on('console', m => m.type() === 'error' && err.push(m.text()));
    const t0 = Date.now(); await p.goto(srv.url + q); await p.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 180000 });
    const t1 = Date.now() - t0; await p.waitForTimeout(1500);
    const ent = await p.evaluate(() => ({ entrada: !document.getElementById('entrada').hidden, ligero: document.body.classList.contains('modo-ligero') }));
    await p.screenshot({ path: path.join(__dirname, 'capturas', 'sondeo_' + (q.includes('nomap') ? 'nomap' : 'ligero') + '.png') });
    console.log(q, t1, 'ms', JSON.stringify(ent), err.slice(0, 3)); await ctx.close();
  }
  await b.close(); srv.close();
})();
