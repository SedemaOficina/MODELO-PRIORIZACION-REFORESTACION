// Bloque F1-B6 · Teléfono y rendimiento (H-040, H-045, H-053, H-055, H-056, H-057).
// GPS impreciso y respuesta tardía, Excel grande sin congelar la página, avance de la carga, modo ligero,
// teléfono en horizontal y uso sin conexión después de la primera visita.
// Uso: node 04_pruebas/prueba_telefono_y_sin_conexion.js   · termina con código ≠ 0 si algo falla.
const fs = require('fs'), path = require('path'), os = require('os');
const L = require('./lib_pruebas.js');
const SAL = process.env.SALIDA || fs.mkdtempSync(path.join(os.tmpdir(), 'tel-'));
const ok = L.Registro('teléfono y sin conexión'); const D = L.decodificar(); const M = D.META;

(async () => {
  const srv = await L.servidor(0); const browser = await L.lanzar(); const U = srv.url + '?modo=ligero#nomap'; const errores = [];
  const izt = M.munNames.indexOf('Iztapalapa'), coy = M.munNames.indexOf('Coyoacán');
  const GPS = { latitude: 19.3560, longitude: -99.0560 };   // colonia Vicente Guerrero, Iztapalapa

  // ---------- H-053 · avance de la carga ----------
  { const html = fs.readFileSync(path.join(L.DOCS, 'index.html'), 'utf8');
    ok('H-053 la barra de carga se mueve desde el primer momento y se anuncia el tamaño', /class="bar indet"/.test(html) && /Descargando la herramienta y sus datos \(\d+ MB la primera vez\)/.test(html));
    ok('H-053 el vigía advierte la duración con conexión lenta', /Con esta conexión la primera carga puede tardar/.test(fs.readFileSync(path.join(L.DOCS, 'config.js'), 'utf8'))); }

  // ---------- H-040 · GPS impreciso ----------
  { const { page, ctx } = await L.abrir(browser, U, { geolocation: { ...GPS, accuracy: 5000 }, permissions: ['geolocation'] }, errores);
    await page.$eval('#zloc', b => b.click()); await page.waitForFunction(() => /aproximada|Estás en/.test(document.getElementById('card').innerText), null, { timeout: 30000 }); await page.waitForTimeout(500);
    const e = await L.estado(page);
    ok('H-040 con ±5,000 m no se afirma colonia ni «Junto a ti», ni se cambia la consulta', /Tu ubicación es aproximada/.test(e.card || '') && !/Junto a ti|Estás en/.test(e.card || '') && e.alcSel === '' && /Ciudad de México/.test(e.titulo), `${(e.card || '').slice(0, 150)} · alc «${e.alcSel}»`);
    await ctx.close(); }
  // ---------- H-040 · GPS preciso, respuesta tardía y cancelar ----------
  { const { page, ctx } = await L.abrir(browser, U, { geolocation: { ...GPS, accuracy: 12 }, permissions: ['geolocation'] }, errores);
    // la respuesta del GPS se retrasa 2.5 s para poder hacer otra consulta mientras tanto
    await page.evaluate(() => { const g = navigator.geolocation, o = g.getCurrentPosition.bind(g); g.getCurrentPosition = (a, b, c) => setTimeout(() => o(a, b, c), 2500); });
    await page.$eval('#zloc', b => b.click()); await page.waitForTimeout(300);
    const cancelar = await page.$('#loc-cancel');
    await page.selectOption('#alc', String(coy)); await page.waitForTimeout(4000); let e = await L.estado(page);
    ok('H-040 mientras busca hay botón «Cancelar»', !!cancelar);
    ok('H-040 una respuesta tardía del GPS no sustituye la consulta hecha mientras tanto', e.alcSel === String(coy) && /Coyoac/.test(e.titulo), e.titulo);
    await page.$eval('#zloc', b => b.click()); await page.waitForFunction(() => /Estás en/.test(document.getElementById('card').innerText), null, { timeout: 30000 }); await page.waitForTimeout(500); e = await L.estado(page);
    ok('H-040 con ±12 m sí se indica la colonia y se consulta', /Estás en Vicente Guerrero/.test(e.card || '') && e.alcSel === String(izt), `${(e.card || '').slice(0, 90)} · ${e.titulo}`);
    await ctx.close(); }

  // ---------- H-045 · Excel grande fuera del hilo principal ----------
  { const { page, ctx } = await L.abrir(browser, U + '', {}, errores); await page.selectOption('#alc', String(izt)); await page.waitForTimeout(600);
    await page.click('#tab-dl'); const esp = page.waitForEvent('download', { timeout: 240000 });
    const r = await page.evaluate(async () => { document.getElementById('dl-frentes').click(); await new Promise(q => setTimeout(q, 50)); const txt = document.getElementById('dl-status').textContent;
      // mientras se arma el archivo, la página debe seguir atendiendo: se cuentan los ciclos de 50 ms que logran ejecutarse en 3 s
      let n = 0; const t0 = performance.now(); let peor = 0, ant = t0; await new Promise(fin => { const id = setInterval(() => { const a = performance.now(); peor = Math.max(peor, a - ant); ant = a; n++; if (a - t0 > 3000) { clearInterval(id); fin(); } }, 50); });
      return { txt, n, peor: Math.round(peor) }; });
    const d = await esp; const ruta = path.join(SAL, d.suggestedFilename()); await d.saveAs(ruta); const kb = Math.round(fs.statSync(ruta).size / 1024);
    ok('H-045 se avisa del tamaño antes de entregar un archivo grande', /archivo grande: 56,267 renglones/.test(r.txt), r.txt);
    ok('H-045 la página sigue respondiendo mientras se arma el Excel (ninguna pausa mayor de 1.5 s)', r.peor < 1500 && r.n > 20, `peor pausa ${r.peor} ms · ${r.n} ciclos en 3 s · archivo ${kb} KB`);
    ok('H-045 el archivo se entrega completo', kb > 5000 && /\.xlsx$/.test(d.suggestedFilename()), `${kb} KB`);
    await ctx.close(); }
  { const { page, ctx } = await L.abrir(browser, U, { viewport: { width: 390, height: 844 } }, errores);
    await page.evaluate(i => { const s = document.getElementById('alc'); s.value = String(i); s.dispatchEvent(new Event('change')); }, izt); await page.waitForTimeout(700); const e = await L.estado(page);
    ok('H-045 en teléfono, con un listado grande, el botón principal ofrece el resumen por calle', e.actMain.target === 'dl-calles' && /resumen por calle/i.test(e.actMain.txt) && /pestaña Descargas/.test(e.actHint || ''), `${e.actMain.txt} · ${e.actHint}`);
    await ctx.close(); }

  // ---------- H-055 · modo ligero ----------
  { const { page, ctx } = await L.abrir(browser, U, {}, errores);
    const r = await page.evaluate(() => ({ etq: !!document.querySelector('.etq-ligero'), nota: document.getElementById('lvl-note').textContent, dib: !!document.getElementById('dibujando') }));
    ok('H-055 modo ligero: etiqueta fija, nota en el panel de capas y aviso «Dibujando calles…» disponible', r.etq && /Modo ligero/.test(r.nota) && r.dib, JSON.stringify(r));
    await ctx.close(); }
  { const ctx = await browser.newContext({ serviceWorkers: 'block', locale: 'es-MX', viewport: { width: 1440, height: 900 } }); await L.sinEntrada(ctx); const page = await ctx.newPage();   // sin la bandera de prueba: detección real (dibujo por software)
    await page.goto(srv.url + '#nomap'); await page.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 300000 }); await page.waitForTimeout(1500);
    const a1 = await page.$('.aviso-ligero:not(.aviso-error)'); if (a1) await page.$eval('.aviso-ligero:not(.aviso-error) button', b => b.click());
    await page.reload(); await page.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 300000 }); await page.waitForTimeout(1500);
    const a2 = await page.$('.aviso-ligero:not(.aviso-error)'); const lig = await page.evaluate(() => document.body.classList.contains('modo-ligero'));
    ok('H-055 el aviso de modo ligero, una vez cerrado, no reaparece al recargar', !lig || (!!a1 && !a2), `modo ligero ${lig} · aviso antes ${!!a1} · después ${!!a2}`);
    await ctx.close(); }

  // ---------- H-056 · teléfono en horizontal ----------
  { const { page, ctx } = await L.abrir(browser, U, { viewport: { width: 844, height: 390 } }, errores);
    const g = await page.evaluate(() => { const r = s => { const e = document.querySelector(s); const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, vis: getComputedStyle(e).display !== 'none' }; };
      const cruza = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      const p = r('.panel'), m = r('#map'), t = r('.toolbar');
      return { panel: Math.round(p.w), mapa: [Math.round(m.w), Math.round(m.h)], desborde: document.documentElement.scrollWidth - innerWidth, tbPanel: cruza(t, p), hoja: getComputedStyle(document.getElementById('sheet')).display, leyenda: document.querySelector('.legend').classList.contains('open') }; });
    ok('H-056 en 844 × 390 la herramienta usa panel lateral angosto y el mapa ocupa todo el alto', g.panel <= 310 && g.mapa[0] >= 520 && g.mapa[1] >= 380 && g.desborde <= 0 && !g.tbPanel && g.hoja === 'none' && !g.leyenda, JSON.stringify(g));
    await page.screenshot({ path: path.join(SAL, 'horizontal_844x390.png') }); await ctx.close(); }
  { const { page, ctx } = await L.abrir(browser, U, { viewport: { width: 390, height: 844 } }, errores);
    await page.focus('#omni'); await page.waitForTimeout(300);
    const r = await page.evaluate(() => ({ cab: getComputedStyle(document.querySelector('.panel-head')).display, pie: getComputedStyle(document.getElementById('panel-actions')).display, hoja: getComputedStyle(document.getElementById('sheet')).display, desborde: document.documentElement.scrollWidth - innerWidth }));
    ok('H-056 en teléfono vertical sigue la hoja inferior y, al enfocar el buscador, se libera espacio', r.hoja !== 'none' && r.cab === 'none' && r.pie === 'none' && r.desborde <= 0, JSON.stringify(r));
    await ctx.close(); }

  // ---------- H-057 · sin conexión después de la primera visita ----------
  { const ctx = await browser.newContext({ acceptDownloads: true, locale: 'es-MX', viewport: { width: 1440, height: 900 } }); await L.sinEntrada(ctx); await ctx.addInitScript(() => { window.SIA_PRUEBA = true; }); const page = await ctx.newPage();
    await page.goto(U); await page.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 300000 });
    const pre = await page.evaluate(async () => { await navigator.serviceWorker.ready; for (let k = 0; k < 120; k++) { const ks = await caches.keys(); if (ks.length) { const c = await caches.open(ks[0]); const n = (await c.keys()).length; if (n >= 16) return { cache: ks[0], n }; } await new Promise(r => setTimeout(r, 500)); } const ks = await caches.keys(); return { cache: ks[0] || null, n: ks[0] ? (await (await caches.open(ks[0])).keys()).length : 0 }; });
    ok('H-057 el proceso de servicio guarda los archivos de la herramienta', !!pre.cache && pre.n >= 16, JSON.stringify(pre));
    await ctx.setOffline(true); let cargo = true;
    try { await page.reload(); await page.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 120000 }); await page.waitForTimeout(600); } catch (e) { cargo = false; }
    ok('H-057 sin conexión, la herramienta vuelve a abrir', cargo && /Ciudad de México/.test((await L.estado(page)).titulo));
    if (cargo) { await page.selectOption('#alc', String(coy)); await page.waitForTimeout(500);
      const d1 = await L.descargar(page, '#dl-calles', SAL); ok('H-057 sin conexión se entrega Excel (no CSV)', !!d1 && /\.xlsx$/.test(d1.nombre), d1 && d1.nombre);
      const d2 = await L.descargar(page, '#dl-ficha-alc', SAL); ok('H-057 sin conexión se genera la ficha PDF', !!d2 && /\.pdf$/.test(d2.nombre) && d2.bytes > 20000, d2 && d2.nombre); }
    const sw = fs.readFileSync(path.join(L.DOCS, 'sw.js'), 'utf8');
    ok('H-057 el proceso de servicio no guarda respuestas con error ni redirigidas (convive con el login)', /r\.ok && !r\.redirected && r\.type === 'basic'/.test(sw));
    await ctx.close(); }

  ok('sin errores de JavaScript durante la prueba', errores.length === 0, errores.slice(0, 3).join(' | '));
  await browser.close(); srv.close(); process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
