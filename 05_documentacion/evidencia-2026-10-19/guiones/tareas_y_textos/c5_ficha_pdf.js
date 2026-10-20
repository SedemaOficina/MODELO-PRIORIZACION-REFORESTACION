// C5 · ¿La ficha PDF trae las cepas vacantes, tocones y árboles muertos que promete el recorrido guiado (paso «Tu lista de campo»)?
// Descarga la ficha de una colonia y de una alcaldía; luego: pdftotext descargas/ficha_*.pdf - | grep -ci cepa
const C = require('./comun_f3');
(async () => { const srv = await C.servidor(); const browser = await C.lanzar();
  const { ctx, page } = await C.abrir(browser, srv.url, { vp: C.ESC, query: '?modo=ligero&a=007' });
  console.log((await C.L.descargar(page, '#act-ficha', C.DESC)).nombre);
  await C.omni(page, 'santa cruz meyehualco', 0, 'Col'); console.log((await C.L.descargar(page, '#act-ficha', C.DESC)).nombre);
  console.log('recorrido:', await page.evaluate(() => 0));
  await ctx.close(); await browser.close(); srv.close(); })().catch(e => { console.error(e); process.exit(1); });
