// B2 · Lee lo que muestra la pantalla (pestaña Resumen) para una lista de consultas dadas por la dirección.
// Uso: node b2_leer_pantalla.js <carpeta docs> <salida.json> "<consulta1>" "<consulta2>" ...
// No usa lib_pruebas.js: servidor y lectura propios. Playwright se toma de la copia (PW_DIR).
const http = require('http'), fs = require('fs'), path = require('path');
const PW = process.env.PW_DIR || 'X:/r1/node_modules/playwright';
const { chromium } = require(PW);
const [DOCS, SALIDA, ...CONSULTAS] = process.argv.slice(2);
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.bin': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { let rel = decodeURIComponent(q.url.split('?')[0]); if (rel.endsWith('/')) rel += 'index.html';
  const p = path.join(DOCS, rel); if (!p.startsWith(path.resolve(DOCS)) || !fs.existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': TIPOS[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const res = [];
  for (const c of CONSULTAS) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-MX', serviceWorkers: 'block' });
    await ctx.addInitScript(() => { window.SIA_PRUEBA = true; try { localStorage.setItem('cp_inicio', 'ciudad'); localStorage.setItem('cp_recorrido', 'visto'); } catch (e) {} });
    const page = await ctx.newPage(); const err = []; page.on('pageerror', e => err.push(e.message));
    await page.goto(base + '?modo=ligero' + (c ? '&' + c : '') + '#nomap'); await page.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 300000 });
    // espera a que el filtro «Espacio» (carga diferida) quede aplicado: la dirección lo conserva y el aviso de carga desaparece
    for (let k = 0; k < 60; k++) { const listo = await page.evaluate(() => !document.querySelector('.esp-cargando, [data-cargando="1"]')); if (listo) break; await page.waitForTimeout(250); }
    await page.waitForTimeout(1500);
    await page.evaluate(() => { const t = document.getElementById('tab-res'); if (t) t.click(); }); await page.waitForTimeout(400);
    const e = await page.evaluate(() => { const T = s => { const x = document.querySelector(s); return x ? x.innerText.replace(/\s+/g, ' ').trim() : null; };
      return { url: location.search, titulo: T('#scope-title'), kpis: [...document.querySelectorAll('.kpi')].filter(k => k.offsetParent).map(k => k.innerText.replace(/\s+/g, ' ').trim()),
        mapsum: T('#mapsum'), resumen: (document.getElementById('tab-res-panel') || document.querySelector('[role=tabpanel]:not([hidden])') || document.body).innerText.replace(/\s+/g, ' ').trim().slice(0, 4000),
        kpib: [...document.querySelectorAll('.kpi')].filter(k => k.offsetParent).map(k => { let s = k; while (s && s.previousElementSibling === null && s.parentElement) s = s.parentElement; let h = k.closest('section,.bloque,.rblock,div[id]'); return (h ? (h.id || h.className) : '') + ' :: ' + k.innerText.replace(/\s+/g, ' ').trim(); }),
        tabla: [...document.querySelectorAll('table.reparto tr')].map(tr => [...tr.children].map(x => x.innerText.trim()).join(' | ')),
        equiv: (document.body.textContent.replace(/s+/g, ' ').match(/Equivalen a [^.]*\./g) || []),
        esp: [...document.querySelectorAll('button[data-esp]')].map(b => b.dataset.esp + '=' + b.getAttribute('aria-pressed')), banq: [...document.querySelectorAll('button[data-banq]')].map(b => b.dataset.banq + '=' + b.getAttribute('aria-pressed')) }; });
    e.consulta = c; e.errores = err; res.push(e); console.log(c, '→', e.titulo, '|', e.kpis.join(' || ').slice(0, 300));
    await ctx.close();
  }
  fs.writeFileSync(SALIDA, JSON.stringify(res, null, 1)); await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(2); });
