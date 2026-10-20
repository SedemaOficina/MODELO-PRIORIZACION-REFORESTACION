// C3 · Carga de la interfaz: palabras, controles, botones, pestañas y pantallas por estado, en 390×844 y 1440×900, con captura de cada uno.
// Uso: node c3_carga.js   (sirve r3/docs; escribe c3_carga.json y capturas/c3_*.png)
const C = require('./comun_f3');
(async () => {
  const srv = await C.servidor(); const base = srv.url; const browser = await C.lanzar(); const filas = [];
  for (const [vpn, vp] of [['tel', C.TEL], ['esc', C.ESC]]) {
    const tel = vpn === 'tel';
    const reg = async (page, nombre) => { const m = await C.medir(page, nombre); m.captura = await C.captura(page, `c3_${vpn}_${nombre}`); m.vp = vpn; filas.push(m); console.log(vpn, nombre, JSON.stringify(m)); };
    // primera visita: entrada en dos pasos y primer paso del recorrido
    { const { ctx, page } = await C.abrir(browser, base, { vp, primera: true });
      await reg(page, '01_entrada_paso1');
      await C.clic(page, '.entrada-red[data-red="alc"]'); await reg(page, '02_entrada_paso2');
      await page.$$eval('.entrada-op', bs => bs.find(b => b.textContent === 'Iztapalapa').click()); await C.esperar(page, 2500);
      if (await page.$('.rec-globo')) { await reg(page, '03_recorrido_paso1'); }
      await ctx.close(); }
    const { ctx, page } = await C.abrir(browser, base, { vp });
    const tabs = async (pref) => { for (const t of ['ini', 'res', 'dl']) { await C.clic(page, '#tab-' + t); await C.esperar(page, 600); await reg(page, `${pref}_${t}`); } await C.clic(page, '#tab-ini'); };
    await tabs('04_ciudad_alc');
    await C.omni(page, 'iztapalapa', 0, 'Alc'); await C.esperar(page, 800); await tabs('05_iztapalapa');
    await C.omni(page, 'santa cruz meyehualco', 0, 'Col'); await C.esperar(page, 800); await tabs('06_colonia_meyehualco');
    // calle consultada: la primera de la lista de calles de la colonia
    await page.$eval('#ini-list li[role=button]', li => li.click()); await C.esperar(page, 1200);
    if (tel) { await C.clic(page, '#ver-info'); }
    await reg(page, '07_colonia_calle_consultada');
    // ficha de un frente: al elegir un tramo se abre la de su frente de mayor prioridad
    const tr = await page.$('#tramos li[role=button]'); if (tr) { await tr.evaluate(li => li.click()); await C.esperar(page, 1200); await reg(page, '08_ficha_frente'); }
    if (tel) { const b = await page.$('#card .close'); if (b) await b.evaluate(x => x.click()); await C.clic(page, '#ver-info'); }
    // Gobierno Central en Tlalpan
    await page.$eval('#cr-city', b => b.click()); await C.esperar(page, 800);
    await C.clic(page, 'button[data-resp="gc"]'); await C.clic(page, 'button[data-resp="alc"]');
    await page.selectOption('#alc', { label: 'Tlalpan' }); await C.esperar(page, 1500); await tabs('09_gc_tlalpan');
    // las dos redes en toda la ciudad
    await page.$eval('#cr-city', b => b.click()); await C.esperar(page, 800); await C.clic(page, 'button[data-resp="alc"]'); await C.esperar(page, 1200);
    await C.clic(page, '#tab-res'); await C.esperar(page, 2500); await reg(page, '10_ambas_ciudad_res'); await C.clic(page, '#tab-ini');
    // ayuda «Cómo funciona»
    await C.clic(page, '#open-info'); await C.esperar(page, 600); await reg(page, '11_ayuda');
    await C.clic(page, '#info-close'); await C.esperar(page, 600);
    // mapa en el celular (pantalla del mapa) y panel de capas
    if (tel) { await C.clic(page, '#ver-mapa'); await reg(page, '12_mapa'); await C.clic(page, '#zcapas'); await reg(page, '13_capas'); }
    else { await C.clic(page, '#zcapas'); await reg(page, '13_capas'); }
    await ctx.close();
  }
  await C.guardarJSON('c3_carga.json', filas);
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
