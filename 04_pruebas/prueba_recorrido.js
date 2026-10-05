// v17.36 · Recorrido guiado: arranca solo en la primera visita (después de la entrada), una sola vez; se repite desde «Cómo funciona».
// Comprueba cada paso en escritorio y en teléfono: el globo cabe en la pantalla, el foco cae sobre el control que explica, el paso de
// banqueta y el de Street View (con la ficha de una calle real) están, y al salir la página queda como estaba.
// Uso: node 04_pruebas/prueba_recorrido.js   · termina con código ≠ 0 si algo falla.
const L = require('./lib_pruebas.js');
const ok = L.Registro('recorrido guiado');
const enPantalla = page => page.evaluate(() => { const g = document.querySelector('.rec-globo'); if (!g) return null;
  const r = g.getBoundingClientRect(), f = document.querySelector('.rec-foco'), fr = f && !f.hidden ? f.getBoundingClientRect() : null;
  return { paso: g.querySelector('.rec-paso').textContent, titulo: g.querySelector('h3').textContent, texto: g.querySelector('p').textContent,
    cabe: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5, foco: fr && { x: fr.left + fr.width / 2, y: fr.top + fr.height / 2, w: fr.width, h: fr.height },
    tapa: fr ? !(r.right < fr.left || r.left > fr.right || r.bottom < fr.top || r.top > fr.bottom) : false }; });
// ¿el centro del foco cae sobre el control esperado?
const focoSobre = (page, sel) => page.evaluate(sel => { const f = document.querySelector('.rec-foco'); if (!f || f.hidden) return false; const r = f.getBoundingClientRect();
  return [...document.querySelectorAll(sel)].some(e => { const q = e.getBoundingClientRect(); return q.width > 0 && Math.abs((q.left + q.width / 2) - (r.left + r.width / 2)) < 4 && Math.abs((q.top + q.height / 2) - (r.top + r.height / 2)) < 4; }); }, sel);
async function recorre(page, nombre) { const pasos = [];
  for (let k = 0; k < 20; k++) { await page.waitForTimeout(600); const p = await enPantalla(page); if (!p) break; pasos.push(p);
    if (/Banqueta/.test(p.titulo)) p.sobre = await focoSobre(page, '#banq-row');
    if (/Street View/.test(p.titulo)) { p.sobre = await focoSobre(page, '#card .field-acts a[href*="pano"]'); p.ficha = await page.evaluate(() => !document.getElementById('card').hidden); }
    const fin = await page.$eval('.rec-sig', b => b.textContent); await page.$eval('.rec-sig', b => b.click()); if (fin === 'Terminar') { await page.waitForTimeout(500); break; } }
  const malos = pasos.filter(p => !p.cabe).map(p => p.titulo);
  ok(`${nombre}: todos los globos caben en la pantalla`, pasos.length >= 8 && malos.length === 0, `${pasos.length} pasos${malos.length ? ' · no caben: ' + malos.join(', ') : ''}`);
  ok(`${nombre}: el globo no tapa el control que explica`, pasos.every(p => !p.tapa), pasos.filter(p => p.tapa).map(p => p.titulo).join(', '));
  const b = pasos.find(p => /Banqueta/.test(p.titulo)), s = pasos.find(p => /Street View/.test(p.titulo));
  ok(`${nombre}: el paso de banqueta ilumina la fila y explica el reconocimiento en sitio`, !!b && b.sobre && /reconocimiento en sitio/.test(b.texto), b && b.titulo);
  ok(`${nombre}: el paso de Street View abre la ficha de una calle e ilumina su botón de Street View`, !!s && s.ficha && s.sobre && /pre-?evalú|Antes de salir/i.test(s.titulo + s.texto), s && s.titulo);
  return pasos; }
const limpio = page => page.evaluate(() => ({ velo: !!document.querySelector('.rec-velo, .rec-foco, .rec-globo'), inerte: document.querySelector('.app').inert, ficha: !document.getElementById('card').hidden, visto: localStorage.getItem('cp_recorrido') }));

(async () => {
  const srv = await L.servidor(0); const browser = await L.lanzar(); const errores = []; const U = srv.url + '?modo=ligero#nomap';
  // ---------- 1) primera visita en escritorio: entrada y después el recorrido, solo ----------
  { const { page, ctx } = await L.abrir(browser, U, { entrada: true, recorrido: true }, errores);
    ok('primera visita: el recorrido espera a que termine la entrada', !(await page.$('.rec-globo')) && await page.evaluate(() => !document.getElementById('entrada').hidden));
    await page.$eval('.entrada-red[data-red="alc"]', b => b.click()); await page.waitForTimeout(300);
    await page.evaluate(() => [...document.querySelectorAll('#entrada-grid .entrada-op')].find(b => b.textContent === 'Iztapalapa').click()); await page.waitForTimeout(1800);
    const p0 = await enPantalla(page);
    ok('primera visita: al elegir la alcaldía arranca el recorrido en el paso 1', !!p0 && /^Paso 1 de \d+$/.test(p0.paso) && !p0.foco, p0 && p0.paso);
    const foco0 = await page.evaluate(() => document.activeElement && document.activeElement.id); ok('el foco del teclado queda en el título del globo', foco0 === 'rec-titulo', foco0);
    await recorre(page, 'escritorio');
    const z = await limpio(page);
    ok('al terminar se retira todo, la página deja de estar inerte, la ficha se cierra y queda anotado', !z.velo && !z.inerte && !z.ficha && z.visto === 'visto', JSON.stringify(z));
    await page.reload(); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(1800);
    ok('la siguiente visita no repite el recorrido', !(await page.$('.rec-globo')));
    // ---------- 2) manual, desde «Cómo funciona»; Esc sale ----------
    await page.$eval('#open-info', b => b.click()); await page.waitForTimeout(400);
    ok('«Cómo funciona» ofrece el recorrido guiado', await page.evaluate(() => { const b = document.getElementById('rec-abrir'); return !!b && b.getBoundingClientRect().height > 0; }));
    await page.$eval('#rec-abrir', b => b.click()); await page.waitForTimeout(1200);
    const m = await enPantalla(page); ok('desde «Cómo funciona» arranca en el paso 1, con la ayuda cerrada', !!m && /^Paso 1 /.test(m.paso) && await page.evaluate(() => document.getElementById('info-modal').hidden), m && m.paso);
    await page.$eval('.rec-sig', b => b.click()); await page.waitForTimeout(500); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(500);
    const m2 = await enPantalla(page); ok('con el teclado: las flechas avanzan', !!m2 && /^Paso 3 /.test(m2.paso), m2 && m2.paso);
    await page.keyboard.press('Escape'); await page.waitForTimeout(400); const z2 = await limpio(page);
    ok('Esc sale del recorrido y deja la página como estaba', !z2.velo && !z2.inerte, JSON.stringify(z2));
    await ctx.close(); }
  // ---------- 3) teléfono ----------
  { const { page, ctx } = await L.abrir(browser, U.replace('?', '?a=007&'), { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, errores);
    await page.evaluate(() => { document.getElementById('info-btn').click(); }); await page.waitForTimeout(400); await page.$eval('#rec-abrir', b => b.click()); await page.waitForTimeout(1200);
    await recorre(page, 'teléfono');
    const z = await limpio(page); ok('teléfono: al terminar no queda nada encima', !z.velo && !z.inerte, JSON.stringify(z));
    await ctx.close(); }
  ok('sin errores de JavaScript durante la prueba', errores.length === 0, errores.slice(0, 2).join(' | '));
  await browser.close(); srv.close(); process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
