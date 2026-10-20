// C2 · Hallazgo I2 de la auditoría del 24 sep: tamaños de letra distintos y textos de menos de 12 px, y altura del encabezado (M2)
// y posición de cifras y descarga (C1 de esa auditoría) con una alcaldía elegida. Uso: node c2_tipografia.js → c2_tipografia.json
const C = require('./comun_f3');
(async () => { const srv = await C.servidor(); const browser = await C.lanzar(); const out = {};
  for (const [vpn, vp] of [['esc', C.ESC], ['tel', C.TEL]]) { const { ctx, page } = await C.abrir(browser, srv.url, { vp, query: '?modo=ligero&a=007' });
    const mide = () => page.evaluate(() => { const t = {}; let chicos = 0, ej = [];
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) { const p = n.parentElement; if (!p || !n.textContent.trim() || p.closest('[hidden],svg,.sr')) continue; const s = getComputedStyle(p); const r = p.getBoundingClientRect(); if (s.display === 'none' || s.visibility === 'hidden' || r.width === 0) continue;
        const fs = parseFloat(s.fontSize); t[fs] = (t[fs] || 0) + 1; if (fs < 12) { chicos++; if (ej.length < 8) ej.push(fs + 'px «' + n.textContent.trim().slice(0, 30) + '»'); } }
      const head = document.querySelector('.panel-head').getBoundingClientRect().height, kp = document.getElementById('mapsum').getBoundingClientRect(), am = document.getElementById('act-main').getBoundingClientRect();
      return { tamanos: Object.keys(t).map(Number).sort((a, b) => a - b), nTamanos: Object.keys(t).length, textosMenos12: chicos, ejemplos: ej, altoEncabezado: Math.round(head), cifrasMapaVisibles: kp.bottom <= innerHeight && kp.width > 0, descargaVisible: am.bottom <= innerHeight && am.top >= 0 && am.width > 0 }; });
    out[vpn + '_inicio'] = await mide(); await C.clic(page, '#tab-res'); await C.esperar(page, 1500);
    out[vpn + '_resumen'] = await mide(); out[vpn + '_resumen'].kpisVisiblesSinDesplazar = await page.$eval('#kpis', e => { const r = e.getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; });
    await ctx.close(); }
  await C.guardarJSON('c2_tipografia.json', out); console.log(JSON.stringify(out, null, 1)); await browser.close(); srv.close(); })().catch(e => { console.error(e); process.exit(1); });
