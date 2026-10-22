// Accesibilidad con axe y foco (bloque 8 de la auditoría del 19 oct 2026: B4-01 a B4-06, B1-02, E3-01):
// 1) axe-core (WCAG 2.2 A y AA) sin ninguna violación en las pantallas principales, en computadora (1440) y celular (390), y en las
//    pantallas de acceso del inicio de sesión;
// 2) foco y anuncios en el celular: tras elegir una calle el foco no queda perdido (B4-01) y el anuncio dice la calle (B4-05); con la entrada
//    o la ayuda abiertas el tabulador no sale de la ventana (B4-04); Esc en la ficha regresa a la información y al renglón de origen (B4-06);
// 3) celular en horizontal: los controles táctiles miden 44 px o más (B1-02);
// 4) buscador: un texto pegado de 2,000 caracteres no congela la página y solo signos no da resultados al azar (E3-01).
// Uso: node 04_pruebas/prueba_axe_y_foco.js
const path = require('path'), fs = require('fs'), url = require('url');
const L = require('./lib_pruebas.js');
const ok = L.Registro('axe y foco');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const ETIQUETAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const ANCHOS = [['computadora', { viewport: { width: 1440, height: 900 } }], ['celular', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]];
const SESION = { inicio: '/acceso/', cierre: '/api/salir', uso: '/api/uso' };
const conSesion = async ctx => { await ctx.addInitScript(s => { Object.defineProperty(window, 'SIA_SESION', { value: s, writable: false, configurable: false }); }, SESION);
  await ctx.route(/\/api\//, r => r.fulfill({ status: 204, body: '' })); };
const esCelular = p => p.evaluate(() => { const b = document.getElementById('ver-mapa'); return !!b && getComputedStyle(b).display !== 'none' && b.getBoundingClientRect().width > 0; });
const aMapa = async p => { if (await esCelular(p)) { await p.$eval('#ver-mapa', b => b.click()); await L.quieto(p); } };
const pestana = async (p, id) => { await p.$eval('#' + id, b => b.click()); await L.quieto(p); };
async function axe(page) { await page.evaluate(AXE);
  return page.evaluate(async t => { const r = await window.axe.run(document, { runOnly: { type: 'tag', values: t } });
    return r.violations.map(v => `${v.id} ×${v.nodes.length}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' ; ')}`); }, ETIQUETAS); }

// pantallas: [nombre, dirección, opciones de abrir(), preparación]; la preparación devuelve true si llegó al estado
const ESTADOS = [
  ['entrada, paso 1', '', { entrada: true }, p => p.isVisible('#entrada')],
  ['entrada, paso 2', '', { entrada: true }, async p => { await p.$eval('.entrada-red[data-red="alc"]', b => b.click()); await L.quieto(p); return p.isVisible('#entrada-p2'); }],
  ['ciudad, Dónde empezar', '', {}, async p => { await pestana(p, 'tab-ini'); return true; }],
  ['ciudad, Resumen', '', {}, async p => { await pestana(p, 'tab-res'); return true; }],
  ['ciudad, Descargas', '', {}, async p => { await pestana(p, 'tab-dl'); return true; }],
  ['alcaldía, Dónde empezar', 'a=007', {}, async p => { await pestana(p, 'tab-ini'); return /Iztapalapa/.test(await p.textContent('#scope-title')); }],
  ['alcaldía, Resumen', 'a=007', {}, async p => { await pestana(p, 'tab-res'); return true; }],
  ['alcaldía, Descargas', 'a=007', {}, async p => { await pestana(p, 'tab-dl'); return true; }],
  ['Gobierno Central, Resumen', 'r=gc', {}, async p => { await pestana(p, 'tab-res'); return true; }],
  ['«Las dos» con filtros', 'r=both&a=007&b=con&e=cv', {}, async p => { await pestana(p, 'tab-ini'); return true; }],
  ['buscador con resultados', '', {}, async p => { await p.fill('#omni', 'zaragoza'); await L.quieto(p); return (await p.$$('#omni-list li.opt')).length > 0; }],
  ['calle y sus tramos', '', {}, async p => { const e = await L.elegirTipo(p, 'zaragoza (juan bautista)', 'Calle'); if (await p.isVisible('#ver-info')) await p.$eval('#ver-info', b => b.click());
    await pestana(p, 'tab-ini'); return e && p.isVisible('#tramos'); }],
  ['ficha de un tramo', '', {}, async p => { await L.elegirTipo(p, 'zaragoza (juan bautista)', 'Calle'); if (await p.isVisible('#ver-info')) await p.$eval('#ver-info', b => b.click());
    await pestana(p, 'tab-ini'); const t = await p.$('#tramos li'); if (!t) return false; await t.evaluate(li => (li.querySelector('button') || li).click()); await L.quieto(p); return p.isVisible('#card'); }],
  // con el mapa dibujado (sin #nomap): el inventario se pide al acercar
  ['ficha de un espacio para plantar', 'a=007', { conMapa: true }, async p => { await aMapa(p); await p.evaluate(() => window.__MAPA.ir({ longitude: -99.0685, latitude: 19.3745, zoom: 16.4 }, 0));
    await p.waitForFunction(() => window.__INV.cargadas().includes('007') && window.__INV.pendientes() === 0, null, { timeout: 90000 }).catch(() => {});
    const n = await p.evaluate(() => { const q = window.__INV.puntos('007'); if (q.length) window.__INV.ficha(q[0]); return q.length; }); await L.quieto(p); return n > 0 && p.isVisible('#card'); }],
  ['mapa con capas', '', {}, async p => { await aMapa(p); if (!await p.evaluate(() => document.querySelector('.legend').classList.contains('open'))) await p.$eval('#zcapas', b => b.click()); await L.quieto(p);
    return p.evaluate(() => document.querySelector('.legend').classList.contains('open')); }],
  ['ayuda', '', {}, async p => { await p.$eval('#open-info', b => b.click()); await L.quieto(p); return p.isVisible('#info-modal'); }],
  ['Mi cuenta', '', { preparar: conSesion }, async p => { if (!await p.isVisible('#cuenta-btn') && await p.isVisible('#ver-info')) await p.$eval('#ver-info', b => b.click());
    await p.$eval('#cuenta-btn', b => b.click()); await L.quieto(p); return p.isVisible('#cuenta-menu'); }],
  ['Mi ubicación', '', { geolocation: { latitude: 19.3560, longitude: -99.0560, accuracy: 15 }, permissions: ['geolocation'] }, async p => { await aMapa(p); await p.$eval('#zloc', b => b.click());
    await p.waitForFunction(() => /Estás en/.test(document.getElementById('card').textContent), null, { timeout: 30000 }).catch(() => {}); await L.quieto(p); return p.isVisible('#card'); }],
  ['recorrido guiado', '', {}, async p => { await p.$eval('#open-info', b => b.click()); await L.quieto(p); await p.$eval('#rec-abrir', b => b.click()); await L.quieto(p);
    await p.$eval('.rec-sig', b => b.click()); await L.quieto(p); return !!await p.$('.rec-globo'); }],
];

(async () => {
  const srv = await L.servidor(0); const browser = await L.lanzar(); const errores = []; const base = srv.url + '?modo=ligero';
  try {
    // ---------- 1) axe ----------
    for (const [ancho, op] of ANCHOS) for (const [nombre, q, opE, prep] of ESTADOS) {
      const { conMapa, ...opA } = opE; const { page, ctx } = await L.abrir(browser, base + (q ? '&' + q : '') + (conMapa ? '' : '#nomap'), { ...op, ...opA }, errores);
      let llego = false, v = null; try { llego = await prep(page); if (llego) v = await axe(page); } catch (e) { v = ['la prueba no llegó: ' + String(e.message).split('\n')[0]]; }
      ok(`axe, ${ancho}, ${nombre}: ninguna violación de WCAG 2.2 AA`, llego && v && v.length === 0, !llego ? 'no se llegó a la pantalla' : v.join(' | '));
      await ctx.close(); }
    // pantallas de acceso (archivos estáticos del módulo de sesión)
    for (const a of ['index.html', 'admin/index.html', 'aviso-de-privacidad.html', 'sin-servicio.html']) for (const [ancho, op] of ANCHOS) {
      const ctx = await browser.newContext(op); const page = await ctx.newPage();
      await page.goto(url.pathToFileURL(path.join(__dirname, '..', '08_entrega_sia', 'login', 'acceso', ...a.split('/'))).href); await page.waitForLoadState('load');
      const v = await axe(page); ok(`axe, ${ancho}, acceso/${a}: ninguna violación de WCAG 2.2 AA`, v.length === 0, v.join(' | ')); await ctx.close(); }

    // ---------- 2) foco y anuncios en el celular ----------
    const CEL = ANCHOS[1][1];
    { const { page, ctx } = await L.abrir(browser, base + '#nomap', CEL, errores);
      await L.elegirTipo(page, 'zaragoza (juan bautista)', 'Calle');
      const f = await page.evaluate(() => { const a = document.activeElement; return { tag: a ? a.tagName : null, id: a && a.id, texto: a ? (a.innerText || a.getAttribute('aria-label') || '').trim().slice(0, 40) : '', inerte: !!(a && a.closest('[inert]')) }; });
      ok('celular: tras elegir una calle, el foco no queda en la página ni dentro de algo inerte (B4-01)', f.tag && f.tag !== 'BODY' && !f.inerte, JSON.stringify(f));
      const sr = await page.$eval('#sr-estado', x => x.textContent);
      ok('al elegir una calle, el anuncio para lectores de pantalla dice la calle (B4-05)', /Zaragoza/i.test(sr), sr.slice(0, 120));
      // Esc en la ficha abierta desde un tramo: regresa a la información y al renglón de origen (B4-06, decisión de Liber)
      if (await page.isVisible('#ver-info')) await page.$eval('#ver-info', b => b.click()); await pestana(page, 'tab-ini');
      const fila = await page.$('#tramos li'); const b = fila && await fila.$('button');
      if (b) { await b.focus(); await page.keyboard.press('Enter'); await L.quieto(page); }
      const abierta = await page.isVisible('#card');
      await page.keyboard.press('Escape'); await L.quieto(page);
      const e = await page.evaluate(() => { const a = document.activeElement; return { pantalla: document.body.dataset.pantalla || (document.body.classList.contains('ver-mapa') ? 'mapa' : 'info'),
        enTramos: !!(a && a.closest('#tramos li')), activo: !!(a && a.closest('#tramos li.active')), id: a && (a.id || a.tagName) }; });
      ok('celular: Esc en la ficha de un tramo regresa a la información y al renglón de origen (B4-06)', !!b && abierta && e.pantalla !== 'mapa' && e.enTramos, JSON.stringify({ boton: !!b, abierta, ...e }));
      await ctx.close(); }
    // el tabulador no sale de la entrada ni de la ayuda (B4-04)
    for (const [cual, opE, abre, sel] of [['la entrada', { entrada: true }, null, '#entrada'], ['la ayuda', {}, p => p.$eval('#open-info', b => b.click()), '#info-modal']]) for (const [ancho, op] of ANCHOS) {
      const { page, ctx } = await L.abrir(browser, base + '#nomap', { ...op, ...opE }, errores); if (abre) { await abre(page); await L.quieto(page); }
      const fuera = []; for (let k = 0; k < 40; k++) { await page.keyboard.press('Tab');
        const a = await page.evaluate(s => { const a = document.activeElement; if (!a || a === document.body) return null; return a.closest(s) ? null : (a.className || a.tagName) + ' «' + (a.innerText || '').trim().slice(0, 30) + '»'; }, sel); if (a) fuera.push(a); }
      ok(`${ancho}: con ${cual} abierta, 40 tabuladores no pasan por nada fuera de ella (B4-04)`, fuera.length === 0, [...new Set(fuera)].join(' · '));
      await ctx.close(); }

    // ---------- 3) celular en horizontal: objetivos táctiles de 44 px (B1-02) ----------
    { const { page, ctx } = await L.abrir(browser, base + '&a=007#nomap', { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }, errores);
      const chicos = async () => page.evaluate(() => [...document.querySelectorAll('.tool, .tabs button, .chip, .crumb select, .ini-orden select, .card .close, #ver-mapa, #ver-info')]
        .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; })
        .map(e => { const r = e.getBoundingClientRect(); return { s: (e.id ? '#' + e.id : e.className.split(' ')[0]) || e.tagName, h: Math.round(Math.min(r.width, r.height)) }; }).filter(x => x.h < 44));
      const c1 = await chicos(); await aMapa(page); const c2 = await chicos();
      const todos = [...c1, ...c2]; ok('celular en horizontal (844 × 390): botones, pestañas, chips y selectores miden 44 px o más (B1-02)', todos.length === 0, todos.slice(0, 8).map(x => `${x.s} ${x.h}`).join(' · '));
      await ctx.close(); }

    // ---------- 4) buscador (E3-01) ----------
    { const { page, ctx } = await L.abrir(browser, base + '#nomap', {}, errores);
      const largo = Array.from({ length: 300 }, (_, k) => ['calle', 'colonia', 'avenida', 'iztapalapa', 'norte', 'reforma'][k % 6] + k).join(' ').slice(0, 2000);
      const ms = await page.evaluate(t => { const i = document.getElementById('omni'); const t0 = performance.now(); i.value = t; i.dispatchEvent(new Event('input', { bubbles: true })); return Math.round(performance.now() - t0); }, largo);
      await L.quieto(page); const aviso = await page.$eval('#omni-list', x => x.innerText.replace(/\s+/g, ' ').trim());
      ok('buscador: un texto pegado de 2,000 caracteres responde en menos de 300 ms y pide escribir solo el nombre (E3-01)', ms < 300 && /solo el nombre/i.test(aviso), `${ms} ms · «${aviso.slice(0, 80)}»`);
      await L.buscar(page, '%%%%$$$$####'); const sig = await page.evaluate(() => ({ opciones: document.querySelectorAll('#omni-list li.opt').length, texto: document.getElementById('omni-list').innerText.replace(/\s+/g, ' ').trim() }));
      ok('buscador: solo signos no da resultados al azar (E3-01)', sig.opciones === 0, `${sig.opciones} opciones · «${sig.texto.slice(0, 80)}»`);
      await ctx.close(); }

    ok('sin errores en la página', errores.length === 0, errores.slice(0, 3).join(' | '));
  } catch (e) { ok('la prueba corre', false, e.stack || e.message); }
  await browser.close(); srv.close(); process.exitCode = ok.fin() ? 1 : 0;
})();
