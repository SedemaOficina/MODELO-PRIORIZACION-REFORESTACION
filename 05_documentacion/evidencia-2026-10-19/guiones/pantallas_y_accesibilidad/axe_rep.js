// B4 · Repite axe (WCAG 2.2 A y AA) en tres estados y detalla las «incompletas» (para revisión manual). Uso: node axe_rep.js
const C = require('./comun.js'); const { L } = C; const E = require('./estados.js');
(async () => { const srv = await L.servidor(0); const b = await L.lanzar();
  for (const [an, id] of [['1440', 'ficha-calle'], ['390', 'ciudad-dondeempezar'], ['1440', 'ayuda']]) {
    const est = E.ESTADOS.find(e => e.id === id); const ctx = await C.contexto(b, C.ANCHOS.find(a => a.n === an), est.op || {});
    const p = await C.pagina(ctx, srv.url + '?modo=ligero' + (est.q ? '&' + est.q : '')); await est.prep(p); await p.waitForTimeout(600);
    await p.addScriptTag({ path: C.AXE });
    const r = await p.evaluate(async () => { const x = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
      return { v: x.violations.map(v => v.id + ' ×' + v.nodes.length + ': ' + v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' ; ')), inc: x.incomplete.filter(v => v.id !== 'color-contrast').map(v => v.id + ' ×' + v.nodes.length + ': ' + v.nodes.slice(0, 4).map(n => n.target.join(' ') + ' [' + (n.any.concat(n.all, n.none)[0] || {}).message + ']').join(' ; ')), version: axe.version }; });
    console.log('==', an, id, 'axe', r.version); r.v.forEach(x => console.log('  VIOL', x.slice(0, 300))); r.inc.forEach(x => console.log('  INC ', x.slice(0, 400))); await ctx.close(); }
  await b.close(); srv.close(); })();
