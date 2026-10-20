// C2 · Reevaluación del hallazgo C1 del 24 sep («la respuesta queda fuera de la vista»): posición de las pestañas, de la primera cifra
// del Resumen y del primer renglón de «Dónde empezar» al elegir alcaldía, colonia y calle, en 1440×900 y 390×844. Uso: node c2_pliegue.js
const C = require('./comun_f3');
(async () => { const srv = await C.servidor(); const browser = await C.lanzar(); const out = [];
  for (const [vpn, vp] of [['esc', C.ESC], ['tel', C.TEL]]) for (const [n, q, pre] of [['alcaldia', '?modo=ligero&a=007', null], ['colonia', '?modo=ligero&c=672', null], ['colonia_filtros', '?modo=ligero&c=672&b=sin&e=cv', null], ['gc_alcaldia', '?modo=ligero&r=gc&a=012', null]]) {
    const { ctx, page } = await C.abrir(browser, srv.url, { vp, query: q });
    const pos = async () => page.evaluate(() => { const t = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? Math.round(r.top) : null; }; return { pestanas: t('.tabs'), lista1: t('#ini-list li'), kpis: t('#kpis'), alto: innerHeight, pie: t('#panel-actions') }; });
    const a = await pos(); await C.clic(page, '#tab-res'); await C.esperar(page, 1200); const b = await pos();
    const r = { vp: vpn, caso: n, pestanasTop: a.pestanas, primerRenglonTop: a.lista1, kpisTop: b.kpis, altoVentana: a.alto, pieTop: a.pie, kpisVisibles: b.kpis !== null && b.kpis + 60 < (b.pie || a.alto), primerRenglonVisible: a.lista1 !== null && a.lista1 + 40 < (a.pie || a.alto) };
    out.push(r); console.log(JSON.stringify(r)); await C.captura(page, `c2_pliegue_${vpn}_${n}`); await ctx.close(); }
  await C.guardarJSON('c2_pliegue.json', out); await browser.close(); srv.close(); })().catch(e => { console.error(e); process.exit(1); });
