// B4 · Teclado de principio a fin, sin ratón: entrada (paso 1 y 2) → buscar una calle → abrir la ficha de un tramo → Excel.
// Además: foco visible en cada parada, foco devuelto al cerrar (ayuda, ficha, capas, entrada, recorrido), trampa de foco en ventanas,
// anuncios de #sr-estado, idioma, letra mínima y movimiento reducido. Uso: node teclado.js [390|1440] (por omisión los dos).
const C = require('./comun.js'); const { L } = C;
const ANCHOS = C.ANCHOS.filter(a => (process.argv[2] ? process.argv[2].split(',') : ['1440', '390']).includes(a.n));
const out = []; const log = (a, n, ok, det) => { out.push({ ancho: a, paso: n, ok, det }); console.log(`${a.padEnd(5)} ${ok ? 'OK   ' : 'FALLA'} ${n}${det ? ' · ' + (typeof det === 'string' ? det : JSON.stringify(det)) : ''}`); };
// descriptor del elemento enfocado y si su foco se ve (contorno o sombra distintos de los que tiene sin foco)
const foco = page => page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return { d: '(body)', visible: false };
  const s = getComputedStyle(e); const d = e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/)[0] : '') + ' «' + (e.getAttribute('aria-label') || e.innerText || e.value || '').replace(/\s+/g, ' ').trim().slice(0, 40) + '»';
  const ol = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0, sh = s.boxShadow && s.boxShadow !== 'none';
  const r = e.getBoundingClientRect(); const enVista = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  const tapado = (() => { const h = document.elementFromPoint(Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1), Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1)); return !!h && h !== e && !e.contains(h) && !h.contains(e); })();
  return { d, visible: ol || sh, outline: ol ? s.outlineWidth + ' ' + s.outlineStyle + ' ' + s.outlineColor : '', sombra: sh ? s.boxShadow.slice(0, 60) : '', enVista, tapado, fv: e.matches(':focus-visible') }; });
async function tabHasta(page, pred, max = 60, paradas = []) {
  for (let k = 0; k < max; k++) { await page.keyboard.press('Tab'); await page.waitForTimeout(90); const f = await foco(page); paradas.push(f); if (await page.evaluate(pred)) return { k: k + 1, f }; }
  return null; }
(async () => {
  const srv = await L.servidor(0); const browser = await L.lanzar();
  for (const ancho of ANCHOS) {
    const a = ancho.n; const ctx = await C.contexto(browser, ancho, { entrada: true }); const reg = { consola: [], http: [] };
    const page = await C.pagina(ctx, srv.url + '?modo=ligero', reg); const paradas = [];
    log(a, 'idioma de la página', await page.evaluate(() => document.documentElement.lang) === 'es-MX', await page.evaluate(() => document.documentElement.lang));
    // --- entrada, paso 1
    const f0 = await foco(page); log(a, 'al abrir, el foco está dentro de la ventana de entrada', await page.evaluate(() => document.getElementById('entrada').contains(document.activeElement)), f0.d);
    // trampa: 25 tabuladores no salen de la ventana
    let fuera = 0; for (let k = 0; k < 25; k++) { await page.keyboard.press('Tab'); if (!await page.evaluate(() => document.getElementById('entrada').contains(document.activeElement))) fuera++; }
    log(a, 'la ventana de entrada retiene el foco (25 tabuladores)', fuera === 0, `${fuera} veces fuera`);
    const t1 = await tabHasta(page, () => document.activeElement && document.activeElement.dataset && document.activeElement.dataset.red === 'alc', 10, paradas);
    log(a, 'entrada paso 1: se llega a «Calles y colonias» con el tabulador y su foco se ve', !!t1 && t1.f.visible, t1 && t1.f);
    await page.keyboard.press('Enter'); await page.waitForTimeout(600);
    const f2 = await foco(page); log(a, 'entrada paso 2: el foco pasa a la pregunta del paso 2', /entrada-q|entrada/.test(f2.d) || await page.evaluate(() => document.getElementById('entrada-p2').contains(document.activeElement)), f2.d);
    const t2 = await tabHasta(page, () => /Tláhuac/.test((document.activeElement || {}).innerText || ''), 30, paradas);
    log(a, 'entrada paso 2: se llega a «Tláhuac» y su foco se ve', !!t2 && t2.f.visible, t2 && t2.f);
    await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
    const f3 = await foco(page); const cerrada = await page.evaluate(() => document.getElementById('entrada').hidden);
    log(a, 'al elegir, la entrada se cierra y el foco cae en un lugar útil (no en body)', cerrada && f3.d !== '(body)', f3.d);
    const sr1 = await page.textContent('#sr-estado'); log(a, 'se anuncia el ámbito elegido (#sr-estado)', /Tláhuac/.test(sr1 || ''), sr1);
    // --- ayuda: abrir con teclado, trampa, Esc y foco devuelto
    const ta = await tabHasta(page, () => (document.activeElement || {}).id === 'open-info', 40, paradas);
    if (ta) { await page.keyboard.press('Enter'); await page.waitForTimeout(600);
      const dentro = await page.evaluate(() => document.getElementById('info-modal').contains(document.activeElement)); log(a, 'ayuda: al abrir, el foco entra en la ventana', dentro, (await foco(page)).d);
      let f = 0; for (let k = 0; k < 40; k++) { await page.keyboard.press('Tab'); if (!await page.evaluate(() => document.getElementById('info-modal').contains(document.activeElement))) f++; }
      log(a, 'ayuda: retiene el foco (40 tabuladores)', f === 0, `${f} veces fuera`);
      await page.keyboard.press('Escape'); await page.waitForTimeout(500);
      log(a, 'ayuda: Esc cierra y el foco vuelve a «Cómo funciona»', await page.evaluate(() => document.getElementById('info-modal').hidden && document.activeElement.id === 'open-info'), (await foco(page)).d);
    } else log(a, 'ayuda: se llega a «Cómo funciona» con el tabulador', false);
    // --- recorrido guiado con teclado
    await page.focus('#open-info'); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
    const tr = await tabHasta(page, () => (document.activeElement || {}).id === 'rec-abrir', 40, paradas);
    if (tr) { await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
      const g = await page.evaluate(() => { const gl = document.querySelector('.rec-globo'); return !!gl && gl.contains(document.activeElement); }); log(a, 'recorrido: el foco entra en el globo', g, (await foco(page)).d);
      let f = 0; for (let k = 0; k < 15; k++) { await page.keyboard.press('Tab'); if (!await page.evaluate(() => { const gl = document.querySelector('.rec-globo'); return !!gl && gl.contains(document.activeElement); })) f++; }
      log(a, 'recorrido: el globo retiene el foco (15 tabuladores)', f === 0, `${f} veces fuera`);
      // avanzar con Entrar sobre «Siguiente» hasta el final
      let pasos = 0; for (let k = 0; k < 20; k++) { const s = await page.$('.rec-sig'); if (!s) break; await s.focus(); const t = await s.textContent(); await page.keyboard.press('Enter'); await page.waitForTimeout(900); pasos++; if (t === 'Terminar') break; }
      await page.waitForTimeout(500); const fin = await foco(page);
      log(a, 'recorrido: se recorre entero con Entrar y al terminar el foco no queda en body', !(await page.$('.rec-globo')) && fin.d !== '(body)', `${pasos} pasos · foco en ${fin.d}`);
    } else log(a, 'recorrido: se llega a «Ver el recorrido» con el tabulador', false);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    // --- buscar una calle con el teclado
    await page.evaluate(() => { if (document.body.classList.contains('ver-mapa')) document.getElementById('ver-info').focus(); });
    if (await page.evaluate(() => document.body.classList.contains('ver-mapa'))) { await page.keyboard.press('Enter'); await page.waitForTimeout(600); }
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    const tb = await tabHasta(page, () => (document.activeElement || {}).id === 'omni', 40, paradas);
    log(a, 'buscador: se llega con el tabulador y su foco se ve', !!tb && tb.f.visible, tb && `${tb.k} tabuladores · ${JSON.stringify(tb.f)}`);
    await page.keyboard.type('zaragoza (juan', { delay: 40 }); await page.waitForTimeout(900);
    const exp = await page.getAttribute('#omni', 'aria-expanded'); log(a, 'buscador: aria-expanded="true" con resultados', exp === 'true', exp);
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(150);
    const ad = await page.evaluate(() => { const i = document.getElementById('omni'); const id = i.getAttribute('aria-activedescendant'); const e = id && document.getElementById(id); return { id, txt: e ? e.innerText.replace(/\s+/g, ' ').slice(0, 60) : null, sel: e ? e.getAttribute('aria-selected') : null }; });
    log(a, 'buscador: la flecha marca una opción (aria-activedescendant)', !!ad.txt, ad);
    // bajar hasta la calle (no la avenida)
    for (let k = 0; k < 8; k++) { const t = await page.evaluate(() => { const id = document.getElementById('omni').getAttribute('aria-activedescendant'); const e = id && document.getElementById(id); return e ? e.innerText : ''; }); if (/^Calle/.test(t.trim())) break; await page.keyboard.press('ArrowDown'); await page.waitForTimeout(120); }
    await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
    const fb = await foco(page); const sr2 = await page.textContent('#sr-estado');
    log(a, 'buscador: al elegir, el foco pasa al título de la consulta (#scope-title)', /scope-title/.test(fb.d), fb.d);
    log(a, 'buscador: se anuncia la calle elegida', /Zaragoza/i.test(sr2 || ''), sr2);
    // --- tramos: con el tabulador hasta el primer tramo, Entrar abre la ficha
    if (await page.evaluate(() => document.body.classList.contains('ver-mapa'))) { await page.focus('#ver-info'); await page.keyboard.press('Enter'); await page.waitForTimeout(600); }
    const tt = await tabHasta(page, () => !!document.activeElement && !!document.activeElement.closest('#tramos') && document.activeElement.getAttribute('role') === 'button', 60, paradas);
    log(a, 'tramos: se llega al primer tramo con el tabulador y su foco se ve', !!tt && tt.f.visible, tt && `${tt.k} tabuladores · ${JSON.stringify(tt.f)}`);
    if (tt) { const origen = await page.evaluate(() => { document.activeElement.dataset.auditoria = 'origen'; return true; });
      await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
      const card = await page.evaluate(() => ({ abierta: !document.getElementById('card').hidden, foco: document.getElementById('card').contains(document.activeElement) || document.activeElement.id === 'card' }));
      log(a, 'ficha: Entrar en el tramo abre la ficha y el foco entra en ella', card.abierta && card.foco, { ...card, foco: (await foco(page)).d });
      // dentro de la ficha: sus controles se alcanzan con el tabulador
      const enFicha = []; for (let k = 0; k < 8; k++) { await page.keyboard.press('Tab'); await page.waitForTimeout(80); const f = await foco(page); enFicha.push(f.d.slice(0, 40) + (f.visible ? '' : ' (SIN FOCO VISIBLE)') + (f.tapado ? ' (TAPADO)' : '')); }
      log(a, 'ficha: recorrido con el tabulador desde la ficha (8 paradas)', true, enFicha.join(' | '));
      await page.keyboard.press('Escape'); await page.waitForTimeout(600);
      const vuelta = await page.evaluate(() => ({ cerrada: document.getElementById('card').hidden, origen: document.activeElement && document.activeElement.dataset.auditoria === 'origen', d: (document.activeElement.innerText || document.activeElement.id || '').slice(0, 40) }));
      log(a, 'ficha: Esc la cierra y el foco vuelve al tramo de origen', vuelta.cerrada && vuelta.origen, vuelta); }
    // --- descargas: pestaña y Excel de la calle con el teclado
    if (await page.evaluate(() => document.body.classList.contains('ver-mapa'))) { await page.focus('#ver-info'); await page.keyboard.press('Enter'); await page.waitForTimeout(600); }
    const td = await tabHasta(page, () => !!document.activeElement && document.activeElement.getAttribute('role') === 'tab', 60, paradas);
    if (td) { // patrón de pestañas: flechas entre pestañas
      await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250); const fl = await foco(page);
      log(a, 'pestañas: la flecha derecha mueve a la pestaña siguiente (patrón ARIA de pestañas)', /tab-res|tab-dl/.test(fl.d) && !/tab-ini/.test(fl.d), fl.d);
      for (let k = 0; k < 4 && !/tab-dl/.test((await foco(page)).d); k++) { await page.keyboard.press('Tab'); await page.waitForTimeout(80); }
      await page.keyboard.press('Enter'); await page.waitForTimeout(500);
      const sel = await page.getAttribute('#tab-dl', 'aria-selected'); log(a, 'pestañas: se abre «Descargas» con el teclado', sel === 'true', (await foco(page)).d);
      const tx = await tabHasta(page, () => (document.activeElement || {}).id === 'dl-calle', 20, paradas);
      log(a, 'descargas: se llega a «Excel de la calle» con el tabulador y su foco se ve', !!tx && tx.f.visible, tx && tx.f);
      if (tx) { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }).catch(() => null), page.keyboard.press('Enter')]);
        log(a, 'descargas: Entrar entrega el Excel', !!d && /\.xlsx$/.test(d.suggestedFilename()), d && d.suggestedFilename());
        const st = await page.textContent('#dl-status'); log(a, 'descargas: el estado de la descarga se anuncia (#dl-status, role=status)', !!st.trim(), st.trim().slice(0, 120)); }
    } else log(a, 'pestañas: se llega con el tabulador', false);
    // --- capas: abrir con teclado y Esc devuelve el foco
    if (await page.evaluate(() => !!document.getElementById('ver-mapa') && getComputedStyle(document.getElementById('ver-mapa')).display !== 'none')) { await page.focus('#ver-mapa'); await page.keyboard.press('Enter'); await page.waitForTimeout(700); }
    await page.focus('#zcapas'); const abierta0 = await page.evaluate(() => document.querySelector('.legend').classList.contains('open'));
    if (abierta0) { await page.keyboard.press('Enter'); await page.waitForTimeout(400); await page.focus('#zcapas'); }
    await page.keyboard.press('Enter'); await page.waitForTimeout(500);
    const capAb = await page.evaluate(() => document.querySelector('.legend').classList.contains('open')); await page.keyboard.press('Tab'); await page.waitForTimeout(100); const fc = await foco(page);
    await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    const capV = await page.evaluate(() => ({ cerrada: !document.querySelector('.legend').classList.contains('open'), foco: document.activeElement.id }));
    log(a, 'capas: Entrar abre, el tabulador entra al panel, Esc cierra y el foco vuelve a su botón', capAb && capV.cerrada && /zcapas|leymini/.test(capV.foco), { abre: capAb, siguiente: fc.d, ...capV });
    // --- foco visible: todas las paradas
    const sinFoco = paradas.filter(p => !p.visible && p.d !== '(body)'), tapados = paradas.filter(p => p.tapado), fueraV = paradas.filter(p => !p.enVista && p.d !== '(body)');
    log(a, `foco visible en todas las paradas del tabulador (${paradas.length})`, sinFoco.length === 0, [...new Set(sinFoco.map(p => p.d))].slice(0, 12).join(' | '));
    log(a, 'ninguna parada del tabulador queda tapada por otro elemento (WCAG 2.4.11)', tapados.length === 0, [...new Set(tapados.map(p => p.d))].slice(0, 12).join(' | '));
    log(a, 'ninguna parada del tabulador queda fuera de la pantalla', fueraV.length === 0, [...new Set(fueraV.map(p => p.d))].slice(0, 12).join(' | '));
    log(a, 'sin errores de consola ni respuestas 4xx/5xx', reg.consola.filter(c => !/Service Worker|GL Driver/.test(c)).length === 0 && reg.http.length === 0, [...reg.consola.filter(c => !/Service Worker|GL Driver/.test(c)), ...reg.http].slice(0, 4).join(' | '));
    await ctx.close();
  }
  // --- letra mínima y movimiento reducido (1440 y 390)
  for (const ancho of ANCHOS) { const a = ancho.n;
    const ctx = await C.contexto(browser, ancho, { ctx: { reducedMotion: 'reduce' } }); const page = await C.pagina(ctx, srv.url + '?modo=ligero&a=007');
    const tam = await page.evaluate(() => { const m = {}; for (const e of document.querySelectorAll('body *')) { if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue; const r = e.getBoundingClientRect(); if (r.width <= 2 || e.closest('[hidden]')) continue; const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden') continue; const f = parseFloat(s.fontSize); if (f < 12) m[e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '') + ' ' + f + 'px'] = (e.innerText || '').trim().slice(0, 30); } return m; });
    log(a, 'letra mínima: ningún texto visible menor de 12 px (0.75 rem)', Object.keys(tam).length === 0, tam);
    const mov = await page.evaluate(() => { const r = []; for (const e of document.querySelectorAll('*')) { const s = getComputedStyle(e); const d = parseFloat(s.transitionDuration) + parseFloat(s.animationDuration || 0); if (d > 0.011 && s.animationName !== 'none' || parseFloat(s.transitionDuration) > 0.011) r.push((e.id || e.className || e.tagName).toString().slice(0, 30) + ' ' + s.transitionDuration + '/' + s.animationName); } return r.slice(0, 10); });
    log(a, 'movimiento reducido: sin transiciones ni animaciones con prefers-reduced-motion', mov.length === 0, mov.join(' | '));
    await ctx.close(); }
  C.guardaJSON('teclado.json', out); await browser.close(); srv.close();
})();
