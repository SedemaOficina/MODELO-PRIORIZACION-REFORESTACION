// B1 · ¿«Cómo llegar» y «Street View» abren otra pestaña? Para no tocar Google se cambia su href por una página local antes del clic.
const C = require('./comun.js'); const { L } = C; const E = require('./estados.js');
(async () => { const srv = await L.servidor(0); const b = await L.lanzar(); const est = E.ESTADOS.find(e => e.id === 'ficha-calle');
  for (let rep = 1; rep <= 2; rep++) for (const an of [C.ANCHOS[1], C.ANCHOS[5]]) { const ctx = await C.contexto(b, an); const p = await C.pagina(ctx, srv.url + '?modo=ligero'); await est.prep(p); await p.waitForTimeout(600);
    const info = await p.$$eval('#card a.fa', (as, u) => as.map(a => { const h = a.href; a.href = u + 'img/logo_institucional.png?' + encodeURIComponent(a.innerText.trim()); return { t: a.innerText.trim(), target: a.target, rel: a.rel, google: /google\.com\/maps/.test(h) }; }), srv.url);
    for (const t of ['Cómo llegar', 'Street View']) { const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), p.click(`#card a.fa:has-text("${t}")`)]); console.log(rep, an.n, t, JSON.stringify(info.find(i => i.t.includes(t.split(' ')[0]))), 'ventana nueva:', !!pop); if (pop) await pop.close(); }
    await ctx.close(); }
  await b.close(); srv.close(); })();
