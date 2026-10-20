// F1 · Pasos que se rompen con «Atrás» o al recargar, y preferencias que no persisten.
// Uso: node f1_atras_recarga.js RUTA_A_LA_COPIA   (usa 04_pruebas/lib_pruebas.js de esa copia; abre ?modo=ligero#nomap)
// Cada caso se corre en un contexto nuevo (estado limpio). Imprime JSON con lo observado.
const path = require('path'); const RAIZ = process.argv[2]; const L = require(path.join(RAIZ, '04_pruebas', 'lib_pruebas.js'));
const DOCS = path.join(RAIZ, 'docs');
(async () => {
  const s = await L.servidor(0, DOCS); const b = await L.lanzar(); const out = {}; const URL0 = s.url + '?modo=ligero#nomap';
  const T = (p, sel) => p.$eval(sel, e => e.innerText.replace(/\s+/g, ' ').trim()).catch(() => null);
  const vis = (p, sel) => p.$eval(sel, e => !e.hidden && getComputedStyle(e).display !== 'none').catch(() => false);
  const recargar = async p => { await p.reload(); await p.waitForSelector('#loader[hidden]', { state: 'attached' }); await p.waitForTimeout(1200); };
  const calle = async p => ({ titulo: await T(p, '#scope-title'), url: await p.evaluate(() => location.search), tramos: await vis(p, '#tramos'), dlCalle: await vis(p, '#dl-calle'), activa: await T(p, '#ini-list li.active .n') });
  // A. calle consultada y recarga (escritorio)
  { const { ctx, page } = await L.abrir(b, URL0); await L.elegir(page, 'Iztapalapa'); await page.$eval('#tab-ini', x => x.click());
    await page.selectOption('#ini-orden', 'calles'); await page.waitForTimeout(500); await page.$eval('#ini-list li[role=button]', x => x.click()); await page.waitForTimeout(800);
    const antes = await calle(page); await recargar(page); const despues = await calle(page); out.A_calle_recarga = { antes, despues }; await ctx.close(); }
  // B. «Mostrar» y pestaña activa, recarga
  { const { ctx, page } = await L.abrir(b, URL0); await L.elegir(page, 'Iztapalapa'); await page.$eval('#tab-ini', x => x.click());
    await page.selectOption('#ini-orden', 'pob'); await page.waitForTimeout(500); const antes = { orden: await page.$eval('#ini-orden', e => e.value), titulo: await T(page, '#ini-count') };
    await page.$eval('#tab-dl', x => x.click()); await page.waitForTimeout(300); antes.tab = await page.evaluate(() => [...document.querySelectorAll('[role=tab]')].filter(t => t.getAttribute('aria-selected') === 'true').map(t => t.id).join());
    await recargar(page); const despues = { orden: await page.$eval('#ini-orden', e => e.value), titulo: await T(page, '#ini-count'), tab: await page.evaluate(() => [...document.querySelectorAll('[role=tab]')].filter(t => t.getAttribute('aria-selected') === 'true').map(t => t.id).join()) };
    out.B_mostrar_y_pestana_recarga = { antes, despues }; await ctx.close(); }
  // C. fondo, opacidad y prioridades visibles, recarga
  { const { ctx, page } = await L.abrir(b, URL0); await page.route(u => !u.hostname.includes('localhost'), r => r.abort());
    await page.$eval('button[data-fondo="no"]', x => x.click()); await page.$eval('#op-prio', e => { e.value = 40; e.dispatchEvent(new Event('input')); }); await L.ponPrio(page, [1, 1, 0, 0, 0]);
    const lee = () => page.evaluate(() => ({ fondo: (document.querySelector('.seg.fondo button[aria-pressed="true"]') || {}).dataset?.fondo, opacidad: document.getElementById('op-prio').value, prioridades: [...document.querySelectorAll('#legend-rows .row')].map(r => r.getAttribute('aria-checked')).join() }));
    const antes = await lee(); await recargar(page); out.C_preferencias_recarga = { antes, despues: await lee() }; await ctx.close(); }
  // D. celular: elegir una calle de la lista lleva al mapa; «Atrás» regresa a la información con la calle
  { const { ctx, page } = await L.abrir(b, URL0, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); await L.elegir(page, 'Iztapalapa');
    await page.$eval('#tab-ini', x => x.click()); await page.selectOption('#ini-orden', 'calles'); await page.waitForTimeout(500); await page.$eval('#ini-list li[role=button]', x => x.click()); await page.waitForTimeout(800);
    const enMapa = await page.evaluate(() => document.body.classList.contains('ver-mapa')); const hist = await page.evaluate(() => history.length);
    await page.goBack(); await page.waitForTimeout(1000); const tras = { verMapa: await page.evaluate(() => document.body.classList.contains('ver-mapa')), ...(await calle(page)) };
    await recargar(page); const recarga = { verMapa: await page.evaluate(() => document.body.classList.contains('ver-mapa')), ...(await calle(page)) };
    out.D_celular_atras_y_recarga = { enMapa, hist, tras, recarga }; await ctx.close(); }
  // E. filtro de banqueta: Atrás deshace el filtro y las cifras vuelven
  { const { ctx, page } = await L.abrir(b, URL0); await L.elegir(page, 'Tláhuac'); const k0 = await T(page, '#kpis .kpi .v');
    await page.$eval('button[data-banq="con"]', x => x.click()); await page.waitForTimeout(800); const k1 = await T(page, '#kpis .kpi .v'), u1 = await page.evaluate(() => location.search);
    await page.goBack(); await page.waitForTimeout(1000); const k2 = await T(page, '#kpis .kpi .v'), u2 = await page.evaluate(() => location.search), b2 = await page.$eval('button[data-banq="todas"]', e => e.getAttribute('aria-pressed'));
    out.E_banqueta_atras = { k0, k1, u1, k2, u2, todasPresionado: b2 }; await ctx.close(); }
  // F. enlace con solo un filtro (?b=con) y una alcaldía recordada: ¿qué abre?
  { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' }); await ctx.addInitScript(() => { window.SIA_PRUEBA = true; try { if (!sessionStorage.getItem('x')) { localStorage.setItem('cp_inicio', '007'); localStorage.setItem('cp_red', 'alc'); localStorage.setItem('cp_recorrido', 'visto'); sessionStorage.setItem('x', '1'); } } catch (e) {} });
    const page = await ctx.newPage(); await page.goto(s.url + '?modo=ligero&b=con#nomap'); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(1200);
    out.F_enlace_solo_filtro = { titulo: await T(page, '#scope-title'), url: await page.evaluate(() => location.search), banq: await page.$eval('button[data-banq="con"]', e => e.getAttribute('aria-pressed')), recordado: await page.evaluate(() => localStorage.getItem('cp_inicio')) }; await ctx.close(); }
  console.log(JSON.stringify(out, null, 1)); await b.close(); s.close();
})().catch(e => { console.error(e); process.exit(1); });
