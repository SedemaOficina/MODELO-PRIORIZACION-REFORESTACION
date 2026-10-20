// C6 · Sistema visual: inventario de formas de botón, chip, pestaña y control (estilo calculado) y de colores con significado,
// con la diferencia de color (CIEDE2000) entre los colores de acción y la rampa de prioridad. Uso: node c6_visual.js → c6_visual.json
const C = require('./comun_f3');
const hex = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
function lab(rgb) { const f = c => { c /= 255; return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92; }; const [r, g, b] = rgb.map(f);
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, y = r * 0.2126 + g * 0.7152 + b * 0.0722, z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const t = v => v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116; [x, y, z] = [t(x), t(y), t(z)]; return [116 * y - 16, 500 * (x - y), 200 * (y - z)]; }
function de2000(a, b) { const [L1, a1, b1] = lab(a), [L2, a2, b2] = lab(b); const rad = Math.PI / 180, C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7))), a1p = a1 * (1 + G), a2p = a2 * (1 + G), C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h = (bb, ap) => { const v = Math.atan2(bb, ap) / rad; return v < 0 ? v + 360 : v; }, h1 = h(b1, a1p), h2 = h(b2, a2p);
  const dL = L2 - L1, dC = C2p - C1p; let dh = h2 - h1; if (C1p * C2p === 0) dh = 0; else if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin(dh / 2 * rad);
  const Lm = (L1 + L2) / 2, Cpm = (C1p + C2p) / 2; let hm = h1 + h2; if (C1p * C2p !== 0) hm = Math.abs(h1 - h2) > 180 ? (h1 + h2 + 360) / 2 : (h1 + h2) / 2;
  const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
  const SL = 1 + 0.015 * (Lm - 50) ** 2 / Math.sqrt(20 + (Lm - 50) ** 2), SC = 1 + 0.045 * Cpm, SH = 1 + 0.015 * Cpm * T, RT = -2 * Math.sqrt(Cpm ** 7 / (Cpm ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hm - 275) / 25) ** 2)) * rad);
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH)); }
(async () => {
  const srv = await C.servidor(); const browser = await C.lanzar(); const formas = new Map(); const usos = {};
  const recoge = async (page, estado) => { const r = await page.evaluate(() => {
    const vis = e => { const s = getComputedStyle(e), q = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && q.width > 0 && q.height > 0 && !e.closest('[hidden]'); };
    return [...document.querySelectorAll('button, [role=button], [role=tab], summary, select, input[type=search], a.fa, .linkbtn, .lchip, .entrada-op, .entrada-red')].filter(vis).map(e => { const s = getComputedStyle(e), q = e.getBoundingClientRect();
      const tipo = e.getAttribute('role') === 'tab' ? 'pestaña' : e.tagName === 'SUMMARY' ? 'plegable' : e.tagName === 'SELECT' ? 'selector' : e.tagName === 'INPUT' ? 'campo' : e.tagName === 'LI' ? 'renglón' : 'botón';
      return { tipo, clase: (e.className && e.className.baseVal === undefined ? e.className : '') || e.id || e.tagName, txt: (e.innerText || e.value || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 30),
        forma: [Math.round(parseFloat(s.borderTopLeftRadius)) >= Math.round(q.height / 2) - 1 ? 'píldora' : 'r' + Math.round(parseFloat(s.borderTopLeftRadius)), s.backgroundColor, s.borderTopStyle === 'none' || parseFloat(s.borderTopWidth) === 0 ? 'sin borde' : s.borderTopColor, s.color, s.fontWeight, s.textTransform, s.textDecorationLine].join(' · '),
        alto: Math.round(q.height), pulsado: e.getAttribute('aria-pressed') || e.getAttribute('aria-selected') || '' }; }); });
    for (const x of r) { const k = x.tipo + ' | ' + x.forma; const f = formas.get(k) || { tipo: x.tipo, forma: x.forma, n: 0, altos: new Set(), ejemplos: new Set(), estados: new Set() };
      f.n++; f.altos.add(x.alto); if (f.ejemplos.size < 5) f.ejemplos.add(x.clase.split(' ')[0] + ' «' + x.txt + '»' + (x.pulsado ? ' [' + x.pulsado + ']' : '')); f.estados.add(estado); formas.set(k, f); } };
  for (const [vpn, vp] of [['esc', C.ESC], ['tel', C.TEL]]) {
    const { ctx, page } = await C.abrir(browser, srv.url, { vp, query: '?modo=ligero&r=both&a=007&b=sin&e=cv' });
    await recoge(page, vpn + ' alcaldía con filtros'); await C.clic(page, '#tab-dl'); await recoge(page, vpn + ' descargas'); await C.clic(page, '#tab-ini');
    await page.$eval('#ini-list li[role=button]', li => li.click()); await C.esperar(page, 1200); await recoge(page, vpn + ' colonia');
    if (vpn === 'tel') await C.clic(page, '#ver-mapa'); await C.clic(page, '#zcapas'); await recoge(page, vpn + ' capas'); await C.clic(page, '#zcapas');
    if (vpn === 'tel') await C.clic(page, '#ver-info'); await C.clic(page, '#open-info'); await recoge(page, vpn + ' ayuda'); await ctx.close();
    const { ctx: c2, page: p2 } = await C.abrir(browser, srv.url, { vp, primera: true }); await recoge(p2, vpn + ' entrada'); await c2.close();
  }
  // colores con significado (01_variables.css) y su distancia a la rampa de prioridad
  const COL = { guinda: '#9D2148', 'guinda-ink': '#7E1A3A', dorado: '#B28E5C', 'dorado-soft': '#EBDDC6', focus: '#5A1029', loc: '#1A73E8', 'inv-cepa': '#1B8A3C', 'inv-tocon': '#7A5534', 'inv-muerto': '#3C4043' };
  const RAMPA = { 'p4 Muy Alta': '#7F1D12', 'p3 Alta': '#C2421B', 'p2 Media': '#E88A2E', 'p1 Baja': '#F4C56E', 'p0 Muy Baja': '#F9E7BF' };
  const distancias = Object.entries(COL).map(([k, v]) => ({ color: k, hex: v, ...Object.fromEntries(Object.entries(RAMPA).map(([r, h]) => [r, +de2000(hex(v), hex(h)).toFixed(1)])) }));
  const vecinas = Object.entries(RAMPA).slice(0, 4).map(([r, h], i) => { const [r2, h2] = Object.entries(RAMPA)[i + 1]; return { par: r + ' / ' + r2, de2000: +de2000(hex(h), hex(h2)).toFixed(1) }; });
  const res = { formas: [...formas.values()].map(f => ({ ...f, altos: [...f.altos].sort((a, b) => a - b), ejemplos: [...f.ejemplos], estados: [...f.estados] })).sort((a, b) => a.tipo.localeCompare(b.tipo) || b.n - a.n), distancias, vecinas };
  await C.guardarJSON('c6_visual.json', res);
  console.log('formas distintas por tipo:', Object.entries(res.formas.reduce((t, f) => (t[f.tipo] = (t[f.tipo] || 0) + 1, t), {})));
  console.table(distancias); console.table(vecinas);
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
