// C1 · Tareas completas del personal, con conteo de acciones (toques, selecciones, escritura y desplazamientos) y captura de cada paso.
// Tarea A (alcaldía): las 10 calles prioritarias SIN banqueta con más cepas vacantes en una colonia de Iztapalapa, descargadas en Excel.
// Tarea B (Gobierno Central): km prioritarios de vialidades primarias de Tlalpan con tocones.
// Tarea C (mando): cifras de toda la ciudad para un informe.
// Uso: node c1_tareas.js [tel|esc] [colonia]   → c1_tareas_<vp>.json, capturas/c1_*.png, descargas/
const C = require('./comun_f3');
const VP = process.argv[2] === 'esc' ? 'esc' : 'tel'; const COL = process.argv[3] || 'santa cruz meyehualco';
(async () => {
  const srv = await C.servidor(); const browser = await C.lanzar(); const vp = VP === 'tel' ? C.TEL : C.ESC; const out = { vp: VP, tareas: {} };
  const tarea = (k) => { const t = { pasos: [], acciones: 0 }; out.tareas[k] = t;
    t.paso = async (page, accion, n, fn, op = {}) => { if (fn) await fn(); await C.esperar(page, op.espera || 700); t.acciones += n;
      const enVista = await page.evaluate(sel => { const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; };
        return Object.fromEntries(sel.map(s => [s, vis(document.querySelector(s))])); }, ['#banq-row', '#esp-row', '#esp-aviso', '#ini-list', '#kpis', '#act-main', '#scope-title']);
      const cap = await C.captura(page, `c1_${VP}_${k}_${String(t.pasos.length + 1).padStart(2, '0')}`);
      t.pasos.push({ n: t.pasos.length + 1, accion, acciones: n, acumulado: t.acciones, enVista, cap }); console.log(k, t.pasos.length, accion, '·', t.acciones); };
    return t; };
  const desliza = async (page, sel) => { const v = await page.$eval(sel, e => { const r = e.getBoundingClientRect(); return r.top < 0 || r.bottom > innerHeight; }); if (v) { await page.$eval(sel, e => e.scrollIntoView({ block: 'center' })); return 1; } return 0; };

  // ---------- Tarea A ----------
  { const t = tarea('A'); const { ctx, page } = await C.abrir(browser, srv.url, { vp });
    await t.paso(page, 'Buscar la colonia (tocar el buscador, escribir, elegir la sugerencia)', 3, () => C.omni(page, COL, 0, 'Col'));
    let d = await desliza(page, '#banq-row'); await t.paso(page, `Banqueta: «Sin»${d ? ' (antes, deslizar hacia arriba)' : ''}`, 1 + d, () => C.clic(page, 'button[data-banq="sin"]'));
    d = await desliza(page, '#ini-orden'); await t.paso(page, `Mostrar: «Calles · más cepas vacantes» (abrir y elegir)${d ? ' (deslizar)' : ''}`, 2 + d, () => page.selectOption('#ini-orden', 'cv'), { espera: 3500 });
    const lista = await page.$$eval('#ini-list li[role=button]', ls => ls.slice(0, 10).map(li => ({ calle: [...li.querySelector('.n').childNodes].filter(n => !(n.classList && (n.classList.contains('pos') || n.classList.contains('dot')))).map(n => n.textContent).join('').trim(), html: li.querySelector('.n').innerHTML.slice(0, 200), k: li.querySelector('.k').innerText.replace(/\s+/g, ' ').trim(), t: li.querySelector('.t') ? li.querySelector('.t').innerText.replace(/\s+/g, ' ').trim() : '' })));
    t.listaPantalla = lista; t.titulo = await C.texto(page, '#ini-title'); t.conteo = await C.texto(page, '#ini-count'); t.nota = await C.texto(page, '#ini-note');
    t.filtroVisibleJuntoALista = await page.evaluate(() => { const l = document.getElementById('ini-list').getBoundingClientRect(), b = document.getElementById('banq-row').getBoundingClientRect(); return { banqTop: Math.round(b.top), listaTop: Math.round(l.top), distancia: Math.round(l.top - b.bottom) }; });
    t.textoTarjetaArriba = await C.texto(page, '#act-main'); t.pista = await C.texto(page, '#act-hint');
    // la descarga: la pestaña Descargas y «Resumen por calle (Excel)»
    d = await desliza(page, '#tab-dl'); await t.paso(page, `Pestaña «Descargas»${d ? ' (deslizar)' : ''}`, 1 + d, () => C.clic(page, '#tab-dl'));
    t.botonesDescargas = await page.$$eval('#tp-dl .btns button', bs => bs.filter(b => !b.hidden && b.offsetParent).map(b => b.innerText.replace(/\s+/g, ' ').trim()));
    let arch = null; await t.paso(page, '«Resumen por calle (Excel)»', 1, async () => { arch = await C.L.descargar(page, '#dl-calles', C.DESC); }, { espera: 1500 });
    t.archivoCalles = arch && arch.nombre;
    let arch2 = null; await t.paso(page, '«Descargar frentes prioritarios (Excel)» (barra de abajo), por comparación', 1, async () => { arch2 = await C.L.descargar(page, '#dl-frentes', C.DESC); }, { espera: 1500 });
    t.archivoFrentes = arch2 && arch2.nombre; t.estadoDescargas = await C.texto(page, '#dl-status'); t.errores = page.errores;
    await ctx.close(); }

  // ---------- Tarea B ----------
  { const t = tarea('B'); const { ctx, page } = await C.abrir(browser, srv.url, { vp });
    await t.paso(page, 'Atiende: tocar «Gobierno Central» (se marcan las dos)', 1, () => C.clic(page, 'button[data-resp="gc"]'));
    await t.paso(page, 'Atiende: tocar «Alcaldías» para dejar solo Gobierno Central', 1, () => C.clic(page, 'button[data-resp="alc"]'));
    let d = await desliza(page, '#alc'); await t.paso(page, `Elegir Tlalpan en el selector de alcaldía (abrir y elegir)${d ? ' (deslizar)' : ''}`, 2 + d, () => page.selectOption('#alc', { label: 'Tlalpan' }), { espera: 1500 });
    d = await desliza(page, '#esp-row'); await t.paso(page, `Espacio: «Tocón»${d ? ' (deslizar hacia arriba)' : ''}`, 1 + d, () => C.clic(page, 'button[data-esp="1"]'), { espera: 3500 });
    t.avisoEspacio = await C.texto(page, '#esp-aviso');
    d = await desliza(page, '#tab-res'); await t.paso(page, `Pestaña «Resumen»${d ? ' (deslizar)' : ''}`, 1 + d, () => C.clic(page, '#tab-res'), { espera: 1500 });
    t.kpis = await page.$$eval('#kpis .kpi', ks => ks.map(k => k.innerText.replace(/\s+/g, ' ').trim())); t.cabecera = await C.texto(page, '#res-cab'); t.sub = await C.texto(page, '#res-sub');
    t.notaBarras = await C.texto(page, '#bars-note'); t.mapsum = await C.texto(page, '#mapsum'); t.titulo = await C.texto(page, '#scope-title');
    t.avisoEnCursoEnVista = await page.evaluate(() => { const e = document.getElementById('esp-aviso'); const r = e.getBoundingClientRect(); return !e.hidden && r.bottom > 0 && r.top < innerHeight; });
    t.notaEnCursoAbierta = await page.evaluate(() => { const d = document.querySelector('#bars-note details'); return d ? d.open : null; });
    t.url = page.url(); t.errores = page.errores; await ctx.close(); }

  // ---------- Tarea C ----------
  { const t = tarea('C'); const { ctx, page } = await C.abrir(browser, srv.url, { vp });
    await t.paso(page, 'Atiende: tocar «Gobierno Central» (las dos redes)', 1, () => C.clic(page, 'button[data-resp="gc"]'), { espera: 1200 });
    let d = await desliza(page, '#tab-res'); await t.paso(page, `Pestaña «Resumen»${d ? ' (deslizar)' : ''}`, 1 + d, () => C.clic(page, '#tab-res'), { espera: 3000 });
    t.resumen = await page.$eval('#tp-res', e => e.innerText.replace(/\n+/g, ' | ').replace(/\s+/g, ' ').trim());
    t.cifrasEnResumen = (t.resumen.match(/\d[\d,.]*/g) || []).length;
    t.pantallasResumen = await page.evaluate(() => { const s = [document.querySelector('.panel-body'), document.querySelector('.panel')].find(e => e && e.scrollHeight > e.clientHeight + 4); return s ? +(s.scrollHeight / s.clientHeight).toFixed(2) : 1; });
    await C.captura(page, `c1_${VP}_C_resumen_completo`, { completa: true });
    d = await desliza(page, '#tab-dl'); await t.paso(page, `Pestaña «Descargas» (¿hay un archivo de la ciudad?)${d ? ' (deslizar)' : ''}`, 1 + d, () => C.clic(page, '#tab-dl'));
    t.descargasCiudad = await page.$$eval('#tp-dl button.btn', bs => bs.filter(b => !b.hidden).map(b => ({ t: b.innerText.replace(/\s+/g, ' ').trim(), activo: !b.disabled, visible: !!b.offsetParent })));
    t.estadoDescargas = await C.texto(page, '#dl-status');
    await C.clic(page, '#tab-ini'); await page.selectOption('#ini-orden', 'alc').catch(() => {}); await C.esperar(page, 800);
    t.listaAlcaldias = await C.texto(page, '#ini-list'); t.verMas = await C.texto(page, '#ini-mas');
    t.errores = page.errores; await ctx.close(); }

  // ---------- primera visita: cuánto cuesta llegar a la herramienta ----------
  { const { ctx, page } = await C.abrir(browser, srv.url, { vp, primera: true });
    const p = { entrada: await page.evaluate(() => !document.getElementById('entrada').hidden) };
    await C.clic(page, '.entrada-red[data-red="alc"]'); await page.$$eval('.entrada-op', bs => bs.find(b => b.textContent === 'Iztapalapa').click()); await C.esperar(page, 2500);
    p.recorrido = await page.evaluate(() => { const g = document.querySelector('.rec-globo'); return g ? g.querySelector('.rec-paso').textContent : null; });
    out.primeraVisita = p; await ctx.close(); }
  await C.guardarJSON(`c1_tareas_${VP}.json`, out); await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
