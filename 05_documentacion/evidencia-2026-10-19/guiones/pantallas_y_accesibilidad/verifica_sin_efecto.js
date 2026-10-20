// B1 · Repite con el mapa dibujado (sin #nomap) los controles que botones.js marcó «sin efecto» y mide su efecto real:
// zoom del mapa, ventana nueva, aria-pressed, casillas y capas de deck.gl. Uso: node verifica_sin_efecto.js
const C = require('./comun.js'); const { L } = C; const E = require('./estados.js');
(async () => { const srv = await L.servidor(0); const b = await L.lanzar();
  for (let rep = 1; rep <= 2; rep++) for (const an of [C.ANCHOS[1], C.ANCHOS[5]]) {
    const est = E.ESTADOS.find(e => e.id === 'ficha-calle'); let ctx = await C.contexto(b, an); let p = await C.pagina(ctx, srv.url + '?modo=ligero'); await est.prep(p); await p.waitForTimeout(800);
    for (const id of ['#zin', '#zout']) { const z0 = await p.evaluate(() => window.__MAPA.vista().zoom); let r = 'clic'; try { await p.click(id, { timeout: 4000 }); } catch (e) { r = 'el ratón no llega: ' + (e.message.match(/<[^>]+> intercepts[^\n]*/) || ['?'])[0].slice(0, 120); await p.$eval(id, x => x.click()); } await p.waitForTimeout(800); const z1 = await p.evaluate(() => window.__MAPA.vista().zoom); console.log(rep, an.n, id, r, 'zoom', z0.toFixed(2), '→', z1.toFixed(2)); }
    for (const t of ['Cómo llegar', 'Street View']) { const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), p.click(`#card a.fa:has-text("${t}")`, { timeout: 4000 }).catch(e => console.log('   clic falló', e.message.split('\n')[0]))]); console.log(rep, an.n, t, 'ventana nueva:', !!pop, pop ? pop.url().slice(0, 60) : ''); if (pop) await pop.close(); }
    await ctx.close();
    const e2 = E.ESTADOS.find(e => e.id === 'mapa-capas'); ctx = await C.contexto(b, an); p = await C.pagina(ctx, srv.url + '?modo=ligero'); await e2.prep(p); await p.waitForTimeout(800);
    const capas = () => p.evaluate(() => window.__MAPA.capas().join(','));
    const btn = '#legend-body button:has-text("Colonias")'; const a0 = await p.getAttribute(btn, 'aria-pressed'), c0 = await capas(); await p.click(btn); await p.waitForTimeout(800);
    console.log(rep, an.n, 'Colonias aria-pressed', a0, '→', await p.getAttribute(btn, 'aria-pressed'), '· capas cambian:', c0 !== await capas());
    const cb = '#inv-sec input[data-inv="0"]'; const k0 = await p.isChecked(cb); await p.click(cb); await p.waitForTimeout(500); console.log(rep, an.n, 'casilla cepas', k0, '→', await p.isChecked(cb));
    await ctx.close(); }
  await b.close(); srv.close(); })();
