// B1 + B4 (axe) + A6 (cobertura de CSS) · Barrido de pantallas y estados en los siete anchos.
// Uso: node barrido.js [ancho,...] [estado,...]      ej.: node barrido.js 390,1440 ayuda,ficha-calle
// Escribe barrido_<fecha>.json, capturas/<ancho>_<estado>.png (y _marcas.png si hay hallazgos) y cobertura_css.json.
// Mapa en ?modo=ligero (sin tarjeta gráfica, WebGL por software).
const C = require('./comun.js'); const { L } = C; const medir = require('./medir.js'); const E = require('./estados.js');
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const filtroA = (process.argv[2] || '').split(',').filter(Boolean), filtroE = (process.argv[3] || '').split(',').filter(Boolean);
const ANCHOS = C.ANCHOS.filter(a => !filtroA.length || filtroA.includes(a.n));
const ESTADOS = E.ESTADOS.filter(e => !filtroE.length || filtroE.includes(e.id));
const RECORRIDO = !filtroE.length || filtroE.includes('recorrido');
const salida = C.path.join(__dirname, process.env.SALIDA || 'barrido.json');
const res = []; const cobertura = new Map();   // url → {text, rangos[]}

async function marcas(page, m, archivo) {
  const cajas = [...m.tapados, ...m.cortados, ...m.chicos24].map(x => x.r || null).filter(Boolean);
  await page.evaluate(cs => { const d = document.createElement('div'); d.id = '__marcas'; d.setAttribute('aria-hidden', 'true'); Object.assign(d.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: 2147483647 });
    for (const [x, y, w, h] of cs) { const b = document.createElement('div'); Object.assign(b.style, { position: 'fixed', left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', outline: '3px solid #f0f', outlineOffset: '1px' }); d.appendChild(b); }
    document.body.appendChild(d); }, cajas);
  await page.screenshot({ path: archivo }); await page.evaluate(() => { const d = document.getElementById('__marcas'); if (d) d.remove(); });
}
async function enlaces(page) {
  return page.evaluate(async () => { const out = { internos: 0, rotos: [], anclas: 0, anclasRotas: [], externos: [] };
    for (const a of document.querySelectorAll('a[href]')) { const h = a.getAttribute('href'); if (!h || h.startsWith('javascript:')) continue;
      if (h.startsWith('#')) { if (h === '#') continue; out.anclas++; if (!document.getElementById(decodeURIComponent(h.slice(1)))) out.anclasRotas.push(h); continue; }
      let u; try { u = new URL(h, location.href); } catch (e) { out.rotos.push(h + ' (dirección inválida)'); continue; }
      if (u.origin !== location.origin) { if (!/^(mailto|tel):/.test(h)) out.externos.push(u.hostname); continue; }
      out.internos++; try { const r = await fetch(u.href, { method: 'GET' }); if (!r.ok) out.rotos.push(h + ' → ' + r.status); } catch (e) { out.rotos.push(h + ' → ' + e.message); } }
    out.externos = [...new Set(out.externos)]; return out; });
}
async function axe(page) {
  await page.addScriptTag({ path: C.AXE });
  return page.evaluate(async tags => { const r = await window.axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations', 'incomplete'] });
    return { violaciones: r.violations.map(v => ({ id: v.id, impacto: v.impact, n: v.nodes.length, nodos: v.nodes.slice(0, 4).map(n => n.target.join(' ') + ' :: ' + (n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 160)) })),
      incompletas: r.incomplete.map(v => ({ id: v.id, n: v.nodes.length })) }; }, AXE_TAGS);
}
async function juntaCobertura(page) { try { const cs = await page.coverage.stopCSSCoverage(); for (const c of cs) { if (!/estilos\.css/.test(c.url)) continue; const k = 'estilos.css';
  const x = cobertura.get(k) || { text: c.text, rangos: [] }; x.rangos.push(...c.ranges); cobertura.set(k, x); } } catch (e) {} }
async function captura(page, ancho, id, reg, extra = {}) {
  const m = await page.evaluate(medir); const f = C.path.join(C.CAP, `${ancho.n}_${id}.png`); await page.screenshot({ path: f });
  const hay = m.desborde > 0 || m.tapados.length || m.cortados.length || m.chicos24.length || m.encimados.length || m.textoCortado.length;
  if (hay) await marcas(page, m, f.replace(/\.png$/, '_marcas.png'));
  const fila = { ancho: ancho.n, estado: id, ...extra, ...m, consola: reg.consola.splice(0), http: reg.http.splice(0) };
  if (ancho.n === '390' || ancho.n === '1440') fila.axe = await axe(page).catch(e => ({ error: e.message }));
  fila.enlaces = await enlaces(page).catch(e => ({ error: e.message }));
  res.push(fila);
  console.log(`${ancho.n.padEnd(8)} ${id.padEnd(26)} desb ${m.desborde} · tap ${m.tapados.length} · cort ${m.cortados.length} · enc ${m.encimados.length} · <24 ${m.chicos24.length} · <44 ${m.chicos44.length} · txt ${m.textoCortado.length} · cons ${fila.consola.length} · http ${fila.http.length}` + (fila.axe && fila.axe.violaciones ? ` · axe ${fila.axe.violaciones.map(v => v.id + '×' + v.n).join(',') || 0}` : '') + (fila.enlaces.rotos && (fila.enlaces.rotos.length + fila.enlaces.anclasRotas.length) ? ' · ENLACES ROTOS' : ''));
  C.guardaJSON(C.path.basename(salida), res);
}
(async () => {
  const srv = await L.servidor(0); const browser = await L.lanzar();
  for (const ancho of ANCHOS) {
    for (const est of ESTADOS) {
      const reg = { consola: [], http: [] }; const ctx = await C.contexto(browser, ancho, est.op || {});
      try {
        const page = await C.pagina(ctx, srv.url + '?modo=ligero' + (est.q ? '&' + est.q : ''), reg, p => p.coverage.startCSSCoverage({ resetOnNavigation: false }));
        let alcanzado = false; try { alcanzado = await est.prep(page); } catch (e) { reg.consola.push('PREP: ' + e.message.split('\n')[0]); }
        await page.waitForTimeout(500);
        await captura(page, ancho, est.id, reg, { alcanzado, nota: est.nota || '' });
        await juntaCobertura(page);
      } catch (e) { res.push({ ancho: ancho.n, estado: est.id, error: e.message.split('\n')[0] }); console.log(ancho.n, est.id, 'ERROR', e.message.split('\n')[0]); }
      await ctx.close();
    }
    if (RECORRIDO) {   // cada paso del recorrido guiado
      const reg = { consola: [], http: [] }; const ctx = await C.contexto(browser, ancho, {});
      try {
        const page = await C.pagina(ctx, srv.url + '?modo=ligero', reg, p => p.coverage.startCSSCoverage({ resetOnNavigation: false }));
        if (await E.abreRecorrido(page)) for (let k = 0; k < 20; k++) {
          let p = await E.pasoRecorrido(page); if (!p) break;
          if (p.titulo === 'Espacios para plantar') { await page.waitForSelector('.rec-punto', { state: 'attached', timeout: 30000 }).catch(() => {}); await page.waitForTimeout(800); }
          const globo = await page.evaluate(() => { const g = document.querySelector('.rec-globo').getBoundingClientRect(); return { cabe: g.left >= 0 && g.top >= 0 && g.right <= innerWidth + .5 && g.bottom <= innerHeight + .5, r: [g.left, g.top, g.width, g.height].map(Math.round) }; });
          await captura(page, ancho, 'recorrido-' + String(k + 1).padStart(2, '0'), reg, { alcanzado: true, paso: p.paso, titulo: p.titulo, globo });
          if (p.sig === 'Terminar') break; await E.avanzaRecorrido(page); }
        await juntaCobertura(page);
      } catch (e) { res.push({ ancho: ancho.n, estado: 'recorrido', error: e.message.split('\n')[0] }); console.log(ancho.n, 'recorrido ERROR', e.message.split('\n')[0]); }
      await ctx.close();
    }
  }
  // cobertura de CSS: une los rangos usados en todos los estados y anchos
  const cob = {}; for (const [k, x] of cobertura) { const usado = new Uint8Array(x.text.length); for (const r of x.rangos) usado.fill(1, r.start, r.end);
    const sinUso = []; const re = /([^{}]+)\{[^{}]*\}/g; let m;   // reglas simples (fuera de @media se toman igual: el selector es lo que importa)
    while ((m = re.exec(x.text))) { const sel = m[1].trim(); if (!sel || sel.startsWith('@') || /^(from|to|\d+%)/.test(sel)) continue; const ini = m.index + m[0].indexOf(m[1]);
      let alguno = false; for (let i = ini; i < m.index + m[0].length; i++) if (usado[i]) { alguno = true; break; } if (!alguno) sinUso.push(sel.replace(/\s+/g, ' ').slice(0, 200)); }
    const n = usado.reduce((s, v) => s + v, 0); cob[k] = { bytes: x.text.length, usados: n, pct: +(100 * n / x.text.length).toFixed(1), reglasSinUso: sinUso.length, sinUso }; }
  C.guardaJSON(process.env.SALIDA_COB || 'cobertura_css.json', cob);
  console.log('cobertura CSS', JSON.stringify(Object.fromEntries(Object.entries(cob).map(([k, v]) => [k, { pct: v.pct, reglasSinUso: v.reglasSinUso }]))));
  await browser.close(); srv.close();
})();
