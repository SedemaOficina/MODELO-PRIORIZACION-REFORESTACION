// C1 · ¿El Excel «Resumen por calle» trae el orden que la persona eligió en «Mostrar: Calles · más cepas vacantes»?
// Para cada alcaldía (con banqueta «Sin»), guarda la lista de pantalla (10 primeros) y descarga el Excel; c1_orden_excel.py los compara.
// Uso: node c1_orden_excel.js "Coyoacán,Tlalpan,Iztapalapa"   → c1_orden_excel.json y descargas/
const C = require('./comun_f3');
const ALCS = (process.argv[2] || 'Coyoacán,Tlalpan,Iztapalapa').split(',');
(async () => {
  const srv = await C.servidor(); const browser = await C.lanzar(); const out = [];
  for (const a of ALCS) {
    const { ctx, page } = await C.abrir(browser, srv.url, { vp: C.ESC });
    await page.selectOption('#alc', { label: a }); await C.esperar(page, 1500);
    await C.clic(page, 'button[data-banq="sin"]'); await C.esperar(page, 1200);
    await page.selectOption('#ini-orden', 'callescv'); await C.esperar(page, 4000);
    const lista = await page.$$eval('#ini-list li[role=button]', ls => ls.slice(0, 10).map(li => ({
      calle: [...li.querySelector('.n').childNodes].filter(n => !(n.classList && (n.classList.contains('pos') || n.classList.contains('dot')))).map(n => n.textContent).join('').trim(),
      colonia: (li.querySelector('.t') ? li.querySelector('.t').textContent : '').split(' · ')[0].trim(), k: li.querySelector('.k').innerText.replace(/\s+/g, ' ').trim() })));
    await C.clic(page, '#tab-dl'); const d = await C.L.descargar(page, '#dl-calles', C.DESC);
    out.push({ alcaldia: a, conteo: await C.texto(page, '#ini-count'), lista, excel: d && d.nombre }); console.log(a, d && d.nombre); await ctx.close();
  }
  await C.guardarJSON('c1_orden_excel.json', out); await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
