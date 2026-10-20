// B1 · Presiona cada control visible en cada estado y anota si cambia algo: cambios en el DOM (MutationObserver), dirección,
// descarga, ventana nueva o diálogo. Cada control se prueba desde el estado limpio (se recarga). Los controles repetidos entre
// estados se prueban una vez por ancho; de cada lista, solo los dos primeros renglones.
// Uso: node botones.js [390,1440] [estado,...]. Mapa sin dibujar (#nomap con SIA_PRUEBA) salvo en los estados que lo necesitan.
// Escribe botones_<ancho>.json.
const C = require('./comun.js'); const { L } = C; const E = require('./estados.js');
const ANCHOS = C.ANCHOS.filter(a => (process.argv[2] || '390,1440').split(',').includes(a.n));
const FE = (process.argv[3] || '').split(',').filter(Boolean);
const ESTADOS = E.ESTADOS.filter(e => !FE.length || FE.includes(e.id)).filter(e => e.id !== 'mi-ubicacion');   // la ubicación se prueba en campo.js
const CON_MAPA = new Set(['ficha-espacio']);
const enumera = () => { const SEL = 'button, a[href], input:not([type=hidden]), select, summary, [role=button], [role=tab], [role=option], [role=menuitem]';
  const vis = e => { if (e.closest('[hidden],[inert]') || e.disabled) return false; for (let a = e; a; a = a.parentElement) { const s = getComputedStyle(a); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !(e.closest('details:not([open])') && !e.matches('summary')); };
  const ruta = e => { const p = []; for (let x = e; x && x !== document.body; x = x.parentElement) { if (x.id) { p.unshift('#' + CSS.escape(x.id)); break; } const i = [...x.parentElement.children].indexOf(x) + 1; p.unshift(x.tagName.toLowerCase() + ':nth-child(' + i + ')'); } return (p[0] && p[0].startsWith('#') ? '' : 'body > ') + p.join(' > '); };
  const out = []; const porLista = new Map();
  for (const e of document.querySelectorAll(SEL)) { if (!vis(e)) continue;
    const lista = e.closest('ul,ol,[role=listbox]'); if (lista && e.matches('li,[role=option]')) { const n = porLista.get(lista) || 0; if (n >= 2) continue; porLista.set(lista, n + 1); }
    const txt = (e.getAttribute('aria-label') || e.innerText || e.value || e.title || '').replace(/\s+/g, ' ').trim().slice(0, 50);
    const datos = Object.entries(e.dataset).filter(([k]) => k !== 'st' && k !== 'auditoria').map(([k, v]) => k + '=' + v).join(',');
    out.push({ sel: ruta(e), clave: e.id ? '#' + e.id : e.tagName.toLowerCase() + '|' + txt + '|' + datos + (lista && e.matches('li') ? '|' + (lista.id || lista.className) : ''), tipo: e.tagName.toLowerCase() + (e.type ? ':' + e.type : '') + (e.getAttribute('role') ? '[' + e.getAttribute('role') + ']' : ''), txt }); }
  return out; };
const vigila = () => { window.__mut = 0; if (window.__obs) window.__obs.disconnect(); window.__obs = new MutationObserver(ms => { window.__mut += ms.length; }); window.__obs.observe(document, { subtree: true, childList: true, attributes: true, characterData: true }); };
(async () => {
  const srv = await L.servidor(0); const browser = await L.lanzar();
  for (const ancho of ANCHOS) { const hechos = new Map(); const filas = [];
    for (const est of ESTADOS) {
      const url = srv.url + '?modo=ligero' + (est.q ? '&' + est.q : '') + (CON_MAPA.has(est.id) ? '' : '#nomap');
      const abre = async () => { const ctx = await C.contexto(browser, ancho, est.op || {}); const reg = { consola: [], http: [] }; const page = await C.pagina(ctx, url, reg); const ok = await est.prep(page).catch(() => false); await page.waitForTimeout(400); return { ctx, page, ok, reg }; };
      let { ctx, page, ok } = await abre(); if (!ok) { console.log(ancho.n, est.id, 'NO SE ALCANZÓ EL ESTADO'); await ctx.close(); continue; }
      const ctrls = await page.evaluate(enumera); await ctx.close();
      let probados = 0;
      for (const c of ctrls) { if (hechos.has(c.clave)) continue; probados++;
        ({ ctx, page } = await abre()); const ev = { descarga: null, ventana: false, dialogo: null };
        page.on('download', d => { ev.descarga = d.suggestedFilename(); }); ctx.on('page', p => { ev.ventana = true; p.close().catch(() => {}); }); page.on('dialog', d => { ev.dialogo = d.message().slice(0, 80); d.dismiss().catch(() => {}); });
        await page.evaluate(vigila); await page.waitForTimeout(700); const ruido = await page.evaluate(() => window.__mut);
        const antes = await page.evaluate(() => ({ url: location.href, foco: document.activeElement && (document.activeElement.id || document.activeElement.tagName) }));
        await page.evaluate(() => { window.__mut = 0; });
        let accion = 'clic', tapado = null;
        try { const h = await page.$(c.sel); if (!h) { accion = 'no encontrado'; }
          else if (c.tipo.startsWith('select')) { const v = await h.evaluate(s => { const o = [...s.options].find(o => !o.selected && !o.disabled && o.value !== s.value); return o ? o.value : null; }); if (v !== null) await h.selectOption(v); accion = 'elegir opción'; }
          else if (/input:(search|text)/.test(c.tipo)) { await h.click({ timeout: 4000 }); await page.keyboard.type('a'); accion = 'escribir'; }
          else if (c.tipo === 'input:range') { await h.focus(); await page.keyboard.press('ArrowLeft'); accion = 'flecha'; }
          else { try { await h.click({ timeout: 4000 }); } catch (e) { tapado = (e.message.match(/<[^>]+> (intercepts|from) [^\n]*/) || [e.message.split('\n')[0]])[0].slice(0, 160); await h.evaluate(x => x.click()); accion = 'clic por programa (el ratón no llega)'; } } }
        catch (e) { accion = 'error: ' + e.message.split('\n')[0].slice(0, 120); }
        await page.waitForTimeout(1200);
        const despues = await page.evaluate(() => ({ url: location.href, mut: window.__mut })).catch(() => ({ url: 'navegó', mut: -1 }));
        const efecto = despues.mut > ruido * 2 || despues.url !== antes.url || !!ev.descarga || ev.ventana || !!ev.dialogo;
        const f = { estado: est.id, ...c, accion, ruido, mutaciones: despues.mut, url: despues.url !== antes.url ? despues.url.replace(/^https?:\/\/[^/]+/, '') : '', ...ev, tapado, efecto };
        filas.push(f); hechos.set(c.clave, f);
        if (!efecto || tapado || accion.startsWith('error') || accion === 'no encontrado') console.log(`${ancho.n} ${est.id} · ${c.tipo} «${c.txt}» · ${accion}${tapado ? ' · TAPADO ' + tapado : ''} · mutaciones ${despues.mut} (ruido ${ruido})${efecto ? '' : ' · SIN EFECTO'}`);
        await ctx.close(); }
      console.log(`${ancho.n} ${est.id}: ${ctrls.length} controles, ${probados} nuevos probados`);
      C.guardaJSON(`botones_${ancho.n}.json`, filas);
    }
    const sin = filas.filter(f => !f.efecto); console.log(`${ancho.n}: ${filas.length} controles probados · sin efecto ${sin.length} · tapados ${filas.filter(f => f.tapado).length}`);
  }
  await browser.close(); srv.close();
})();
