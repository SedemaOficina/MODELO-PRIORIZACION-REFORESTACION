// Estados de la herramienta que recorren los guiones del frente 2. Cada estado parte de un contexto limpio.
// prep(page, C, extra) deja la pantalla en el estado; devuelve true si lo alcanzó. op: opciones del contexto (entrada, sesion, geo).
const C = require('./comun.js'); const { L } = C;
const esTel = page => page.evaluate(() => { const b = document.getElementById('ver-mapa'); return !!b && getComputedStyle(b).display !== 'none' && b.getBoundingClientRect().width > 0; });
async function aMapa(page) { if (await esTel(page)) { await page.$eval('#ver-mapa', b => b.click()); await page.waitForTimeout(700); } }
async function aInfo(page) { const v = await page.$('#ver-info'); if (v && await v.isVisible() && await page.evaluate(() => document.body.classList.contains('ver-mapa') || document.body.dataset.pantalla === 'mapa')) { await v.click(); await page.waitForTimeout(600); } }
const tab = (page, id) => page.$eval('#' + id, b => b.click()).then(() => page.waitForTimeout(500));
// un tramo de vialidad primaria Muy Alta (para su ficha) y una cepa de Iztapalapa: se calculan una vez
let VPI = null;
function vpMuyAlta() { if (VPI !== null) return VPI; const D = L.decodificar(); const i = D.VP.findIndex(v => v.prio === 4 && v.pts.length >= 4); VPI = i; return i; }
const IZT = { longitude: -99.0685, latitude: 19.3745 };   // Iztapalapa centro (Vicente Guerrero)
const ESTADOS = [
  { id: 'entrada-p1', q: '', op: { entrada: true }, prep: async p => p.isVisible('#entrada') },
  { id: 'entrada-p2', q: '', op: { entrada: true }, prep: async p => { await p.click('.entrada-red[data-red="alc"]'); await p.waitForTimeout(500); return p.isVisible('#entrada-p2'); } },
  { id: 'ciudad-dondeempezar', q: '', prep: async p => { await tab(p, 'tab-ini'); return true; } },
  { id: 'ciudad-resumen', q: '', prep: async p => { await tab(p, 'tab-res'); return true; } },
  { id: 'ciudad-descargas', q: '', prep: async p => { await tab(p, 'tab-dl'); return true; } },
  { id: 'alcaldia-dondeempezar', q: 'a=007', prep: async p => { await tab(p, 'tab-ini'); return /Iztapalapa/.test(await p.textContent('#scope-title')); } },
  { id: 'alcaldia-resumen', q: 'a=007', prep: async p => { await tab(p, 'tab-res'); return true; } },
  { id: 'alcaldia-descargas', q: 'a=007', prep: async p => { await tab(p, 'tab-dl'); return true; } },
  { id: 'gc-resumen', q: 'r=gc', prep: async p => { await tab(p, 'tab-res'); return true; } },
  { id: 'buscador-resultados', q: '', prep: async p => { await p.click('#omni'); await p.fill('#omni', 'zaragoza'); await p.waitForTimeout(800); return (await p.$$('#omni-list li.opt')).length > 0; } },
  { id: 'calle-tramos', q: '', prep: async p => { const ok = await L.elegirTipo(p, 'zaragoza (juan bautista)', 'Calle'); await p.waitForTimeout(800); await aInfo(p); await tab(p, 'tab-ini'); return ok && p.isVisible('#tramos'); } },
  { id: 'ficha-calle', q: '', prep: async p => { await L.elegirTipo(p, 'zaragoza (juan bautista)', 'Calle'); await p.waitForTimeout(800); await aInfo(p); await tab(p, 'tab-ini');
      const li = await p.$('#tramos li[role=button]'); if (!li) return false; await li.click(); await p.waitForTimeout(1500); return p.isVisible('#card'); } },
  { id: 'ficha-avenida', q: 'r=both', nota: 'abre la ficha con el gancho de prueba __INV.fichaVP', prep: async p => { const i = vpMuyAlta(); await aMapa(p); await p.evaluate(i => window.__INV.fichaVP(i), i); await p.waitForTimeout(1200); return p.isVisible('#card'); } },
  { id: 'ficha-espacio', q: '', nota: 'clic real sobre una cepa del mapa (zoom 16.6, modo ligero)', prep: async p => { await aMapa(p);
      await p.evaluate(v => window.__MAPA.ir({ ...v, zoom: 16.6 }, 0), IZT);
      if (!await C.hasta(p, () => window.__INV.cargadas().includes('007') && window.__INV.pendientes() === 0 && window.__INV.capas().some(c => c.id === 'inv-cepa') && document.getElementById('dibujando').hidden, null, 90000)) return false;
      await p.waitForTimeout(1500);
      const pt = await p.evaluate(() => { const c = document.getElementById('map').getBoundingClientRect(); const P = window.__INV.puntos('007').map(q => ({ ...q, px: window.__INV.px(q.lon, q.lat) }));
        const libre = q => { const e = document.elementFromPoint(c.left + q.px[0], c.top + q.px[1]); return !!e && e.tagName === 'CANVAS'; };
        const vis = P.filter(q => q.px[0] > 30 && q.px[0] < c.width - 30 && q.px[1] > 60 && q.px[1] < c.height - 60 && libre(q));
        const sola = q => !vis.some(r => r !== q && Math.hypot(r.px[0] - q.px[0], r.px[1] - q.px[1]) < 14);
        const cand = vis.filter(q => sola(q)).sort((a, b) => Math.hypot(a.px[0] - c.width / 2, a.px[1] - c.height / 2) - Math.hypot(b.px[0] - c.width / 2, b.px[1] - c.height / 2));
        return cand.length ? { x: c.left + cand[0].px[0], y: c.top + cand[0].px[1] } : null; });
      if (!pt) return false; await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(1500);
      return p.evaluate(() => !document.getElementById('card').hidden && /cepa|toc[oó]n|muerto/i.test(document.getElementById('card').innerText)); } },
  { id: 'mapa-capas', q: '', prep: async p => { await aMapa(p); const ab = await p.evaluate(() => document.querySelector('.legend').classList.contains('open')); if (!ab) await p.$eval('#zcapas', b => b.click()); await p.waitForTimeout(600);
      return p.evaluate(() => document.querySelector('.legend').classList.contains('open')); } },
  { id: 'mapa', q: '', prep: async p => { await aMapa(p); return true; } },
  { id: 'ayuda', q: '', prep: async p => { await p.$eval('#open-info', b => b.click()); await p.waitForTimeout(600); return p.isVisible('#info-modal'); } },
  { id: 'mi-cuenta', q: '', op: { sesion: true }, prep: async p => { if (!await p.isVisible('#cuenta-btn')) { await aInfo(p); } await p.click('#cuenta-btn'); await p.waitForTimeout(400); return p.isVisible('#cuenta-menu'); } },
  { id: 'mi-ubicacion', q: '', op: { geo: { latitude: 19.3745, longitude: -99.0685, accuracy: 15 } }, prep: async p => { await aMapa(p); await p.$eval('#zloc', b => b.click()); await p.waitForTimeout(3000); return p.isVisible('#card'); } },
];
// recorrido guiado: se abre desde «Cómo funciona»; avanzar(p) pasa al siguiente globo
async function abreRecorrido(p) { await p.$eval('#open-info', b => b.click()); await p.waitForTimeout(500); await p.$eval('#rec-abrir', b => b.click()); await p.waitForTimeout(1200); return !!await p.$('.rec-globo'); }
async function pasoRecorrido(p) { return p.evaluate(() => { const g = document.querySelector('.rec-globo'); if (!g) return null; return { paso: g.querySelector('.rec-paso').textContent, titulo: g.querySelector('h3').textContent, sig: (g.querySelector('.rec-sig') || {}).textContent }; }); }
async function avanzaRecorrido(p) { await p.$eval('.rec-sig', b => b.click()); await p.waitForTimeout(1000); }
module.exports = { ESTADOS, esTel, aMapa, aInfo, tab, abreRecorrido, pasoRecorrido, avanzaRecorrido, IZT };
