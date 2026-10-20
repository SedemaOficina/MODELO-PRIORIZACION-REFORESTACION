// B4 · Repeticiones: (a) teléfono: Esc en la ficha de un tramo, ¿adónde vuelve el foco?; (b) con la entrada o la ayuda abiertas, ¿se
// alcanza «Saltar a la respuesta» y qué hace?; (c) teléfono: foco tras elegir una calle en el buscador. Uso: node repro_foco.js
const C = require('./comun.js'); const { L } = C;
const d = p => p.evaluate(() => { const e = document.activeElement; return e === document.body ? '(body)' : e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + ' «' + (e.innerText || '').replace(/\s+/g, ' ').slice(0, 30) + '»'; });
(async () => { const srv = await L.servidor(0); const b = await L.lanzar();
  for (let r = 1; r <= 2; r++) {
    let ctx = await C.contexto(b, C.ANCHOS[1]); let p = await C.pagina(ctx, srv.url + '?modo=ligero');
    await L.elegirTipo(p, 'zaragoza (juan bautista)', 'Calle'); await p.waitForTimeout(1200); console.log(r, '(c) foco tras elegir la calle en el teléfono:', await d(p));
    await p.click('#ver-info'); await p.waitForTimeout(600); await p.$eval('#tab-ini', x => x.click()); await p.waitForTimeout(300);
    await p.focus('#tramos li[role=button]'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500); console.log(r, '(a) ficha abierta, foco:', await d(p));
    await p.keyboard.press('Escape'); await p.waitForTimeout(700); console.log(r, '(a) tras Esc, foco:', await d(p), '· pantalla:', await p.evaluate(() => document.body.classList.contains('ver-mapa') ? 'mapa' : 'información'));
    await ctx.close();
    ctx = await C.contexto(b, C.ANCHOS[5], { entrada: true }); p = await C.pagina(ctx, srv.url + '?modo=ligero');
    let k = 0; for (; k < 6; k++) { await p.keyboard.press('Tab'); if ((await d(p)).includes('salto')) break; }
    await p.keyboard.press('Enter'); await p.waitForTimeout(500);
    console.log(r, '(b) entrada abierta: «Saltar a la respuesta» alcanzable tras', k + 1, 'tabuladores; al activarlo el foco queda en', await d(p), '· entrada sigue abierta:', await p.isVisible('#entrada'), '· url', await p.evaluate(() => location.hash));
    await ctx.close(); }
  await b.close(); srv.close(); })();
