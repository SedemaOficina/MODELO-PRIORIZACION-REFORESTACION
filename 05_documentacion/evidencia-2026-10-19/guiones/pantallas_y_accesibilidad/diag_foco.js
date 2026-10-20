// Diagnóstico de foco: adónde va el tabulador fuera de la entrada y de la ayuda; capas con Esc; foco tras elegir en el buscador (teléfono).
const C = require('./comun.js'); const { L } = C;
const d = p => p.evaluate(() => { const e = document.activeElement; return e === document.body ? '(body)' : e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + ' «' + (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').slice(0, 30) + '»' + (e.closest('[inert]') ? ' [INERTE]' : ''); });
(async () => { const srv = await L.servidor(0); const b = await L.lanzar();
  for (const an of [C.ANCHOS[5], C.ANCHOS[1]]) {
    let ctx = await C.contexto(b, an, { entrada: true }); let p = await C.pagina(ctx, srv.url + '?modo=ligero');
    const s = []; for (let k = 0; k < 14; k++) { await p.keyboard.press('Tab'); s.push(await d(p)); } console.log(an.n, 'ENTRADA', s.join(' → '));
    console.log(an.n, 'inert de .app con entrada abierta:', await p.evaluate(() => [...document.querySelectorAll('.app,#panel,.panel,.mapwrap')].map(e => (e.id || e.className) + ':' + e.inert).join(' ')));
    await ctx.close();
    ctx = await C.contexto(b, an, {}); p = await C.pagina(ctx, srv.url + '?modo=ligero');
    await p.$eval('#open-info', x => x.click()); await p.waitForTimeout(600); await p.focus('#info-close');
    const t = []; for (let k = 0; k < 40; k++) { await p.keyboard.press('Tab'); t.push(await d(p)); } console.log(an.n, 'AYUDA', t.filter(x => !/info|rec-abrir|«/.test('') ).join(' → ').slice(0, 2500));
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    // capas
    if (an.n === '390') { await p.$eval('#ver-mapa', x => x.click()); await p.waitForTimeout(600); }
    const ab = await p.evaluate(() => document.querySelector('.legend').classList.contains('open')); console.log(an.n, 'capas abierta al inicio:', ab);
    if (ab) { await p.focus('#zcapas'); await p.keyboard.press('Enter'); await p.waitForTimeout(400); }
    await p.focus('#zcapas'); await p.keyboard.press('Enter'); await p.waitForTimeout(500); console.log(an.n, 'tras Entrar abierta:', await p.evaluate(() => document.querySelector('.legend').classList.contains('open')), 'foco', await d(p));
    const u = []; for (let k = 0; k < 6; k++) { await p.keyboard.press('Tab'); u.push(await d(p)); } console.log(an.n, 'TAB desde capas:', u.join(' → '));
    await p.keyboard.press('Escape'); await p.waitForTimeout(500); console.log(an.n, 'tras Esc abierta:', await p.evaluate(() => document.querySelector('.legend').classList.contains('open')), 'foco', await d(p));
    await p.focus('#zcapas'); await p.keyboard.press('Escape'); await p.waitForTimeout(500); console.log(an.n, 'Esc con foco en #zcapas → abierta:', await p.evaluate(() => document.querySelector('.legend').classList.contains('open')), 'foco', await d(p));
    await ctx.close();
    // buscador → foco (dos veces)
    for (let r = 0; r < 2; r++) { ctx = await C.contexto(b, an, {}); p = await C.pagina(ctx, srv.url + '?modo=ligero');
      await p.focus('#omni'); await p.keyboard.type('zaragoza (juan', { delay: 30 }); await p.waitForTimeout(900); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
      console.log(an.n, 'BUSCADOR rep', r + 1, 'foco:', await d(p), 'pantalla mapa:', await p.evaluate(() => document.body.classList.contains('ver-mapa')), 'sr:', await p.textContent('#sr-estado'));
      await ctx.close(); }
  }
  await b.close(); srv.close(); })();
