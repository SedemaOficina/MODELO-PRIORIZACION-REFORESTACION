// C4 · Matriz de estados: Atiende × ámbito × Banqueta × Espacio × pestaña, y Atrás, recarga, enlace compartido y dos pestañas.
// Para cada combinación anota qué dicen el título, el resumen del mapa, las cifras, la lista y las descargas, y revisa si cada cifra
// declara territorio, filtro y responsable. Uso: node c4_estados.js   → c4_matriz.json, c4_navegacion.json, capturas/c4_*.png
const C = require('./comun_f3');
const AMB = { ciudad: null, alcaldia: 'Iztapalapa', colonia: 'santa cruz meyehualco', avenida: 'calzada ignacio zaragoza' };
(async () => {
  const srv = await C.servidor(); const browser = await C.lanzar(); const filas = [];
  const foto = page => page.evaluate(() => { const T = s => { const e = document.querySelector(s); return e && !e.closest('[hidden]') ? e.innerText.replace(/\s+/g, ' ').trim() : null; };
    return { url: location.search, titulo: T('#scope-title'), mapsum: T('#mapsum'), kpis: T('#kpis'), kpis2: T('#kpis2'), cab: T('#res-cab'), sub: T('#res-sub'), cab2: T('#res-cab2'), sub2: T('#res-sub2'),
      reparto: T('#reparto table'), repartoNota: T('#reparto .note'), iniTitulo: document.getElementById('ini-title').textContent.trim(), iniConteo: T('#ini-count'), iniNota: T('#ini-note'), lista1: T('#ini-list li'),
      actMain: T('#act-main'), actHint: T('#act-hint'), dlStatus: T('#dl-status'), verInfo: T('#ver-info-t'), legScope: T('#lg-scope'), espAviso: T('#esp-aviso'),
      banqFila: !document.getElementById('banq-row').hidden, espFila: !document.getElementById('esp-row').hidden }; });
  // ---------- matriz (escritorio, sin mapa) ----------
  if (!process.env.SOLO_NAV) for (const resp of ['alc', 'gc', 'both']) for (const amb of Object.keys(AMB)) {
    if (resp === 'gc' && amb === 'colonia') continue; if (resp === 'alc' && amb === 'avenida') continue;
    for (const banq of ['todas', 'sin']) for (const esp of ['', 'cv']) {
      if (resp === 'gc' && banq !== 'todas') continue;   // la fila no existe con Gobierno Central
      const q = new URLSearchParams({ modo: 'ligero' }); if (resp !== 'alc') q.set('r', resp); if (banq !== 'todas') q.set('b', banq); if (esp) q.set('e', esp);
      const { ctx, page } = await C.abrir(browser, srv.url, { vp: C.ESC, query: '?' + q.toString() });
      if (amb === 'alcaldia') { await page.selectOption('#alc', { label: AMB.alcaldia }); await C.esperar(page, 1200); }
      if (amb === 'colonia') await C.omni(page, AMB.colonia, 0, 'Col');
      if (amb === 'avenida') { await page.selectOption('#alc', { label: 'Iztapalapa' }); await C.esperar(page, 800); await C.omni(page, AMB.avenida, 0, 'Av'); }
      await C.esperar(page, 800);
      const f = { resp, amb, banq, esp, ini: await foto(page) };
      await C.clic(page, '#tab-res'); await C.esperar(page, 2500); f.res = await foto(page);
      await C.clic(page, '#tab-dl'); await C.esperar(page, 500); f.dl = await foto(page);
      f.errores = page.errores; filas.push(f); console.log(resp, amb, banq, esp, '·', f.res.kpis && f.res.kpis.slice(0, 80));
      await ctx.close();
    }
  }
  if (!process.env.SOLO_NAV) await C.guardarJSON('c4_matriz.json', filas);
  // ---------- navegación ----------
  const nav = {};
  for (const [vpn, vp] of [['esc', C.ESC], ['tel', C.TEL]]) {
    const n = nav[vpn] = {};
    const { ctx, page } = await C.abrir(browser, srv.url, { vp });
    const est = async () => { const f = await foto(page); return { url: f.url, titulo: f.titulo, mapsum: f.mapsum, iniTitulo: f.iniTitulo, iniConteo: f.iniConteo,
      orden: await page.$eval('#ini-orden', s => s.value), pestana: await page.$eval('.tabs [aria-selected=true]', b => b.textContent).catch(() => null), calle: await C.texto(page, '#cr-rest'), banq: await page.$eval('button[data-banq][aria-pressed=true]', b => b.dataset.banq),
      pantalla: await page.evaluate(() => document.body.classList.contains('ver-mapa') ? 'mapa' : 'info'), ficha: await page.evaluate(() => !document.getElementById('card').hidden) }; };
    n.pasos = [];
    const paso = async (accion, fn) => { await fn(); await C.esperar(page, 1200); const e = await est(); n.pasos.push({ accion, ...e }); console.log(vpn, accion, JSON.stringify(e).slice(0, 220)); };
    await paso('Elegir Iztapalapa', () => page.selectOption('#alc', { label: 'Iztapalapa' }));
    await paso('Buscar y elegir la colonia Santa Cruz Meyehualco', () => C.omni(page, 'santa cruz meyehualco', 0, 'Col'));
    await paso('Banqueta «Sin»', () => C.clic(page, 'button[data-banq="sin"]'));
    await paso('Mostrar «Calles · más cepas vacantes»', async () => { await page.selectOption('#ini-orden', 'cv'); await C.esperar(page, 3000); });
    await paso('Pestaña Resumen', () => C.clic(page, '#tab-res'));
    await paso('Pestaña Dónde empezar y elegir la primera calle', async () => { await C.clic(page, '#tab-ini'); await page.$eval('#ini-list li[role=button]', li => li.click()); });
    await paso('Elegir el primer tramo (abre la ficha del frente)', () => page.$eval('#tramos li[role=button]', li => li.click()).catch(() => {}));
    n.urlAntesDeRecargar = page.url();
    for (let k = 1; k <= 3; k++) await paso(`Atrás ${k}`, () => page.goBack().catch(() => {}));
    await ctx.close();
    // recarga y enlace compartido: el mismo estado completo y luego recargar / abrir la dirección en otro navegador
    { const { ctx, page } = await C.abrir(browser, srv.url, { vp });
      await page.selectOption('#alc', { label: 'Iztapalapa' }); await C.esperar(page, 1000); await C.omni(page, 'santa cruz meyehualco', 0, 'Col');
      await C.clic(page, 'button[data-banq="sin"]'); await page.selectOption('#ini-orden', 'cv'); await C.esperar(page, 3000);
      await page.$eval('#ini-list li[role=button]', li => li.click()); await C.esperar(page, 1200); if (vpn === 'tel') await C.clic(page, '#ver-info');
      await C.clic(page, '#tab-res'); await C.esperar(page, 1000);
      const antes = { url: page.url(), titulo: await C.texto(page, '#scope-title'), calle: await C.texto(page, '#cr-rest'), orden: await page.$eval('#ini-orden', s => s.value), pestana: await page.$eval('.tabs [aria-selected=true]', b => b.textContent) };
      await C.captura(page, `c4_${vpn}_antes_de_recargar`);
      await page.reload(); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await C.esperar(page, 2500);
      const trasRecarga = { url: page.url(), titulo: await C.texto(page, '#scope-title'), calle: await C.texto(page, '#cr-rest'), orden: await page.$eval('#ini-orden', s => s.value), pestana: await page.$eval('.tabs [aria-selected=true]', b => b.textContent), banq: await page.$eval('button[data-banq][aria-pressed=true]', b => b.dataset.banq) };
      await C.captura(page, `c4_${vpn}_tras_recargar`);
      const url = antes.url; await ctx.close();
      // otra persona (otro navegador, cuya última consulta fue Tlalpan con Gobierno Central) abre el enlace
      const ctx2 = await browser.newContext({ viewport: vp, locale: 'es-MX', serviceWorkers: 'block' });
      await ctx2.addInitScript(() => { window.SIA_PRUEBA = true; try { localStorage.setItem('cp_inicio', '012'); localStorage.setItem('cp_red', 'gc'); localStorage.setItem('cp_recorrido', 'visto'); } catch (e) {} });
      const p2 = await ctx2.newPage(); await p2.goto(url); await p2.waitForSelector('#loader[hidden]', { state: 'attached' }); await C.esperar(p2, 2500);
      const compartido = { url: p2.url(), titulo: await C.texto(p2, '#scope-title'), calle: await C.texto(p2, '#cr-rest'), orden: await p2.$eval('#ini-orden', s => s.value), pestana: await p2.$eval('.tabs [aria-selected=true]', b => b.textContent), banq: await p2.$eval('button[data-banq][aria-pressed=true]', b => b.dataset.banq), resp: await p2.evaluate(() => document.body.dataset.resp) };
      // enlace de toda la ciudad con solo el filtro (?b=sin): la persona que lo abre tenía Tlalpan
      const p3 = await ctx2.newPage(); await p3.goto(srv.url + '?modo=ligero&b=sin#nomap'); await p3.waitForSelector('#loader[hidden]', { state: 'attached' }); await C.esperar(p3, 2500);
      const soloFiltro = { enviado: '?b=sin (toda la ciudad, sin banqueta)', abre: p3.url(), titulo: await C.texto(p3, '#scope-title'), resp: await p3.evaluate(() => document.body.dataset.resp), banqFila: await p3.evaluate(() => !document.getElementById('banq-row').hidden) };
      await C.captura(p3, `c4_${vpn}_enlace_solo_filtro`);
      await ctx2.close();
      Object.assign(n, { antes, trasRecarga, compartido, soloFiltro }); }
    // dos pestañas del mismo navegador
    { const ctx = await browser.newContext({ viewport: vp, locale: 'es-MX', serviceWorkers: 'block' });
      await ctx.addInitScript(() => { window.SIA_PRUEBA = true; try { if (!localStorage.getItem('cp_inicio')) { localStorage.setItem('cp_inicio', 'ciudad'); localStorage.setItem('cp_recorrido', 'visto'); } } catch (e) {} });
      const { page: A } = await C.abrir(browser, srv.url, { ctx, vp }); const { page: B } = await C.abrir(browser, srv.url, { ctx, vp });
      await A.selectOption('#alc', { label: 'Iztapalapa' }); await C.esperar(A, 1000); await A.$eval('#cr-city', b => b.click()); await C.esperar(A, 1000);   // A queda en toda la ciudad, Alcaldías
      const aAntes = { url: A.url(), titulo: await C.texto(A, '#scope-title'), resp: await A.evaluate(() => document.body.dataset.resp) };
      await B.$eval('button[data-resp="gc"]', b => b.click()); await C.esperar(B, 600); await B.$eval('button[data-resp="alc"]', b => b.click()); await C.esperar(B, 600);
      await B.selectOption('#alc', { label: 'Coyoacán' }); await C.esperar(B, 1200);
      const bEstado = { url: B.url(), titulo: await C.texto(B, '#scope-title'), resp: await B.evaluate(() => document.body.dataset.resp) };
      await A.reload(); await A.waitForSelector('#loader[hidden]', { state: 'attached' }); await C.esperar(A, 2500);
      const aTras = { url: A.url(), titulo: await C.texto(A, '#scope-title'), resp: await A.evaluate(() => document.body.dataset.resp) };
      await C.captura(A, `c4_${vpn}_dos_pestanas_A_tras_recargar`);
      n.dosPestanas = { aAntes, bEstado, aTrasRecargar: aTras }; await ctx.close(); }
  }
  await C.guardarJSON('c4_navegacion.json', nav); await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
