// Celular en dos pantallas: la información y el mapa se cambian con un botón, el panel sale hacia la izquierda y el mapa no cambia de
// tamaño; la pantalla que no se ve queda inerte; el botón de abajo dice lo que se verá; qué acción lleva a qué pantalla; nada se desborda
// ni queda encimado con el botón de abajo. En 360, 390 y 430 px de ancho; en 1440 × 900 la computadora no cambia. Con WebKit, si está
// instalado, una revisión básica en 390 px.
// Uso: node 04_pruebas/prueba_dos_pantallas.js   · termina con código ≠ 0 si algo falla.
const L = require('./lib_pruebas.js');
const ok = L.Registro('dos pantallas en el celular');
let webkit = null; try { ({ webkit } = require('playwright')); if (!require('fs').existsSync(webkit.executablePath())) webkit = null; } catch (e) { webkit = null; }

const estado = page => page.evaluate(() => { const b = document.body, p = document.querySelector('.panel'), m = document.querySelector('.mapwrap'), r = document.getElementById('map').getBoundingClientRect();
  return { info: b.classList.contains('ver-info'), mapa: b.classList.contains('ver-mapa'), panelInerte: p.inert, mapaInerte: m.inert, panelVis: getComputedStyle(p).visibility,
    rect: [r.x, r.y, r.width, r.height].map(Math.round).join(','), rotulo: document.getElementById('ver-info-t').textContent, desborde: document.documentElement.scrollWidth - innerWidth }; });
// cuántas veces el foco cae dentro de un contenedor al tabular
async function focoEn(page, sel, n = 25) { let dentro = 0;
  for (let k = 0; k < n; k++){ await page.keyboard.press('Tab'); if (await page.evaluate(s => !!document.activeElement && document.querySelector(s).contains(document.activeElement), sel)) dentro++; }
  return dentro; }
// elementos visibles sobre el mapa que se enciman con el botón de abajo
const encimados = page => page.evaluate(() => { const b = document.getElementById('ver-info').getBoundingClientRect(); const out = [];
  for (const el of document.querySelectorAll('.mapwrap > *, .card, .legend, .leymini, .scalebar, .attrib, .aviso-ligero')){ if (el.id === 'ver-info' || el.id === 'map' || el.id === 'loader') continue;
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || el.hidden) continue; const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    if (r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top) out.push((el.id || el.className) + ' ' + Math.round(r.top) + '-' + Math.round(r.bottom)); }
  return out; });

(async () => {
  const srv = await L.servidor(0); const browser = await L.lanzar(); const errores = [];
  for (const ancho of [360, 390, 430]) {
    const t = `${ancho} px: `;
    const { page, ctx } = await L.abrir(browser, srv.url, { viewport: { width: ancho, height: 800 }, isMobile: true, hasTouch: true }, errores);
    await page.waitForFunction(() => window.SIA_LISTO, null, { timeout: 120000 }); await page.waitForTimeout(600);
    const a = await estado(page);
    ok(t + 'abre en la información, con el mapa inerte debajo y sin desbordarse', a.info && !a.mapa && a.mapaInerte && !a.panelInerte && a.desborde <= 0, JSON.stringify(a));
    ok(t + 'con la información a la vista, Tab no entra al mapa', (await focoEn(page, '.mapwrap')) === 0);
    await L.clic(page, '#ver-mapa'); await page.waitForTimeout(400);
    const b = await estado(page);
    ok(t + '«Ver el mapa»: el panel sale y queda inerte; el mapa no cambia de tamaño', b.mapa && b.panelInerte && b.panelVis === 'hidden' && !b.mapaInerte && b.rect === a.rect && b.desborde <= 0, `${a.rect} → ${b.rect} · ${b.panelVis}`);
    ok(t + 'el foco pasa al botón de regreso y Tab no entra al panel', await page.evaluate(() => document.activeElement.id === 'ver-info') && (await focoEn(page, '.panel')) === 0);
    const enc = await encimados(page);
    ok(t + 'nada queda encimado con el botón de abajo', enc.length === 0, enc.join(' | '));
    ok(t + 'el botón de abajo mide 44 px o más, dice «Volver a la información» y el lugar consultado', await page.evaluate(() => document.getElementById('ver-info').getBoundingClientRect().height >= 44 && /^Volver a la información/.test(document.getElementById('ver-info').textContent)) && b.rotulo === 'Ciudad de México', b.rotulo);
    await L.clic(page, '#ver-info'); await page.waitForTimeout(400);
    ok(t + 'el botón de abajo regresa a la información, con el foco en «Ver el mapa»', (await estado(page)).info && await page.evaluate(() => document.activeElement.id === 'ver-mapa'));
    if (ancho === 390) {
      // qué acción lleva a qué pantalla
      await L.elegirTipo(page, 'Iztapalapa', 'Alc'); await page.waitForTimeout(500);
      let e = await estado(page); ok(t + 'elegir una alcaldía se queda en la información; el botón dirá «Iztapalapa»', e.info && e.rotulo === 'Iztapalapa', JSON.stringify(e));
      // «Atiende» y «Banqueta»: las dos filas siempre a la vista, sin botón para desplegarlas
      const fl = () => page.evaluate(() => { const v = e => !!e && e.offsetParent !== null;
        return { atiende: v(document.querySelector('.resp-row')), banq: v(document.getElementById('banq-row')), desborde: document.documentElement.scrollWidth - innerWidth }; });
      let f = await fl();
      ok(t + '«Atiende» y «Banqueta» se ven siempre, sin botón para desplegarlas y sin desbordarse', f.atiende && f.banq && f.desborde <= 0 && !(await page.$('#filtros-btn')), JSON.stringify(f));
      await L.ponResp(page, 'gc'); await page.waitForTimeout(500); f = await fl();
      ok(t + 'con Gobierno Central la banqueta no aplica: sin su fila', f.atiende && !f.banq, JSON.stringify(f));
      await L.ponResp(page, 'alc'); await page.waitForTimeout(300);
      await L.elegirTipo(page, 'Progreso Tizapan', 'Col'); await page.waitForTimeout(500);
      e = await estado(page); ok(t + 'elegir una colonia se queda en la información; «Col. …»', e.info && /^Col\. Progreso Tizap/.test(e.rotulo), JSON.stringify(e));
      await L.clic(page, '#tab-ini'); const fila = await page.$('#ini-list li[tabindex]'); if (fila) { await fila.click(); await page.waitForTimeout(800); }
      e = await estado(page); ok(t + 'elegir una calle de la lista lleva al mapa; el botón dice su nombre', !!fila && e.mapa && !!e.rotulo && !/^Col\./.test(e.rotulo), JSON.stringify(e));
      await page.goBack(); await page.waitForTimeout(600);
      e = await estado(page); ok(t + '«atrás» del navegador desde el mapa regresa a la información', e.info, JSON.stringify(e));
      await page.fill('#omni', '19.300011294985545, -99.10193871074827'); await page.waitForTimeout(400); await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
      e = await estado(page); ok(t + 'coordenadas: llevan al mapa con la ficha del punto a la vista', e.mapa && await page.evaluate(() => { const c = document.getElementById('card'); return !c.hidden && getComputedStyle(c).visibility === 'visible'; }), JSON.stringify(e));
      const enc2 = await encimados(page); ok(t + 'con la ficha abierta, nada queda encimado con el botón de abajo', enc2.length === 0, enc2.join(' | '));
      await L.clic(page, '#ver-info'); await page.waitForTimeout(400);
      ok(t + 'con la información a la vista, la ficha del mapa se esconde', await page.evaluate(() => getComputedStyle(document.getElementById('card')).visibility === 'hidden'));
      // sugerencias del buscador: llegan hasta el borde visible y avisan que hay más abajo; el aviso se quita al llegar al final
      await page.fill('#omni', 'Real de los'); await page.waitForTimeout(500);
      const sug = await page.evaluate(async () => { const l = document.getElementById('omni-list'), a = l.classList.contains('hay-mas'), b = Math.round(innerHeight - l.getBoundingClientRect().bottom);
        l.scrollTop = l.scrollHeight; await new Promise(r => setTimeout(r, 150)); return { aviso: a, margen: b, alFinal: l.classList.contains('hay-mas') }; });
      ok(t + 'las sugerencias llegan al borde visible y avisan «Desliza para ver más»; al final ya no', sug.aviso && sug.margen >= 0 && sug.margen <= 12 && !sug.alFinal, JSON.stringify(sug));
      await page.fill('#omni', '');
      // satélite con la simbología abierta: el crédito de Esri no tapa su encabezado ni la × para cerrarla
      await L.clic(page, '#ver-mapa'); await page.waitForTimeout(400);
      const sat = await page.evaluate(async () => { const lg = document.getElementById('legend'); if (!lg.classList.contains('open')) document.getElementById('zcapas').click();
        await new Promise(r => setTimeout(r, 300)); const b = document.querySelector('.seg.fondo button[data-fondo="sat"]'); if (b) b.click(); await new Promise(r => setTimeout(r, 300));
        const h = document.getElementById('legend-toggle').getBoundingClientRect(), x = h.left + h.width / 2, y = h.top + h.height / 2, el = document.elementFromPoint(x, y);
        const r = { abierta: lg.classList.contains('open'), sat: document.body.classList.contains('fondo-sat'), arriba: el && lg.contains(el) };
        document.querySelector('.seg.fondo button[data-fondo="calles"]')?.click(); return r; });
      ok(t + 'con satélite y la simbología abierta, el crédito no tapa su encabezado ni la ×', sat.abierta && sat.sat && sat.arriba, JSON.stringify(sat));
      await L.clic(page, '#ver-info'); await page.waitForTimeout(400);
    }
    await ctx.close();
  }
  // computadora: no cambia nada
  { const { page, ctx } = await L.abrir(browser, srv.url, {}, errores);
    await page.waitForFunction(() => window.SIA_LISTO, null, { timeout: 120000 }); await page.waitForTimeout(500);
    const d = await page.evaluate(() => { const p = document.querySelector('.panel').getBoundingClientRect(), m = document.getElementById('map').getBoundingClientRect();
      return { botones: [...document.querySelectorAll('.btn-vista')].filter(b => getComputedStyle(b).display !== 'none').length, panel: Math.round(p.width), mapa: [Math.round(m.left), Math.round(m.width)],
        inerte: document.querySelector('.panel').inert || document.querySelector('.mapwrap').inert, desborde: document.documentElement.scrollWidth - innerWidth,
        filas: document.querySelector('.resp-row').offsetParent !== null && document.getElementById('banq-row').offsetParent !== null }; });
    ok('1440 px: la computadora no cambia (panel a la izquierda, mapa a su lado, sin botones de cambio ni pantallas inertes; «Atiende» y «Banqueta» en sus dos filas)', d.botones === 0 && d.panel === 392 && d.mapa[0] === 392 && d.mapa[1] === 1048 && !d.inerte && d.desborde <= 0 && d.filas, JSON.stringify(d));
    await ctx.close(); }
  if (webkit) { const wb = await webkit.launch(); const ctx = await wb.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true, locale: 'es-MX' });
    await ctx.addInitScript(() => { window.SIA_PRUEBA = true; }); await L.sinEntrada(ctx); const page = await ctx.newPage();
    await page.goto(srv.url); await page.waitForFunction(() => window.SIA_LISTO, null, { timeout: 120000 }); const a = await estado(page);
    await page.click('#ver-mapa'); await page.waitForTimeout(400); const b = await estado(page);
    ok('WebKit 390 px: abre en la información y cambia al mapa sin cambiarle el tamaño', a.info && b.mapa && a.rect === b.rect, `${a.rect} → ${b.rect}`);
    await wb.close(); }
  else console.log('(WebKit no está instalado: se omite la revisión en Safari)');
  ok('sin errores de JavaScript', errores.length === 0, errores.slice(0, 3).join(' | '));
  await browser.close(); srv.close(); process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
