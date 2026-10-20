// C4 · La tabla «Alcaldía y Gobierno Central» del Resumen con los filtros: ¿la columna del Gobierno Central sigue la regla de su red?
// Compara, en Iztapalapa con las dos redes, la tabla con Banqueta «Todas» y «Sin» y con Espacio «Cepa vacante», contra el bloque
// «Gobierno Central» y su «Equivalencia en km de frente». Uso: node c4_comparacion.js → c4_comparacion.json y capturas/c4_comparacion_*.png
const C = require('./comun_f3');
(async () => {
  const srv = await C.servidor(); const browser = await C.lanzar(); const out = [];
  for (const [n, q] of [['todas', ''], ['sin', '&b=sin'], ['cv', '&e=cv'], ['sin_cv', '&b=sin&e=cv']]) {
    const { ctx, page } = await C.abrir(browser, srv.url, { vp: C.ESC, query: '?modo=ligero&r=both&a=007' + q });
    await C.clic(page, '#tab-res'); await C.esperar(page, 3000);
    await page.$$eval('details', ds => ds.forEach(d => d.open = true)); await C.esperar(page, 300);
    const r = await page.evaluate(() => { const T = s => (document.querySelector(s) || {}).innerText || ''; const fila = (tb, lab) => { const tr = [...document.querySelectorAll('#reparto tr')].find(t => t.querySelector('th') && t.querySelector('th').textContent.trim() === lab); return tr ? [...tr.querySelectorAll('td')].map(td => td.textContent.trim()) : null; };
      return { kpisGC: T('#kpis2').replace(/\s+/g, ' '), equivalencia: T('#univbox2').replace(/\s+/g, ' ').slice(0, 400), prioritario: fila(0, 'Prioritario'), todos: fila(0, 'Todos los frentes'), cepas: fila(0, 'Cepas vacantes'), tocones: fila(0, 'Tocones'), nota: T('#reparto .note').replace(/\s+/g, ' ') }; });
    r.caso = n; out.push(r); console.log(n, JSON.stringify(r).slice(0, 600));
    await (await page.$('#reparto')).screenshot({ path: require('path').join(C.CAP, `c4_comparacion_${n}.png`) });
    await ctx.close();
  }
  await C.guardarJSON('c4_comparacion.json', out); await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
