// Arranque sin terceros (auditoría H-002): la página debe cargar y funcionar sin pedir nada fuera de su propio origen,
// y las tipografías Cabin y Roboto deben venir del sitio. Termina con código ≠ 0 si algo falla.
// Uso: node 04_pruebas/prueba_sin_terceros.js   (CAPTURA=ruta.png guarda una captura)
const L = require('./lib_pruebas.js');
const ok = L.Registro('arranque sin terceros');
(async () => {
  const srv = await L.servidor(0); const browser = await L.lanzar(); const errores = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-MX' }); const page = await ctx.newPage(); page.setDefaultTimeout(300000);
  page.on('pageerror', e => errores.push(e.message));
  const externas = []; const propias = [];
  await page.route('**/*', r => { const u = new URL(r.request().url());
    if (u.hostname === 'localhost' || u.protocol === 'data:' || u.protocol === 'blob:') { propias.push(u.pathname); return r.continue(); }
    externas.push(u.href); return r.abort(); });   // todo dominio externo queda bloqueado
  const t0 = Date.now(); await page.goto(srv.url + '?modo=ligero');
  const pintado = await page.evaluate(() => new Promise(res => new PerformanceObserver(l => { const e = l.getEntriesByName('first-contentful-paint')[0]; if (e) res(e.startTime); }).observe({ type: 'paint', buffered: true })));
  await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(800);
  ok('la página arranca con todos los dominios externos bloqueados', true, `${((Date.now() - t0) / 1000).toFixed(1)} s`);
  ok('ninguna solicitud a terceros durante el arranque', externas.length === 0, externas.slice(0, 3).join(' | '));
  ok('primer contenido visible en menos de 3 s', pintado < 3000, `${Math.round(pintado)} ms`);
  ok('las tipografías se piden al propio sitio', ['cabin.woff2', 'roboto.woff2'].every(a => propias.some(p => p.endsWith('/fuentes/' + a))));
  const f = await page.evaluate(async () => { await document.fonts.ready;
    const cargadas = [...document.fonts].filter(x => x.status === 'loaded').map(x => x.family.replace(/"/g, ''));
    const usa = s => getComputedStyle(document.querySelector(s)).fontFamily;
    return { cargadas, h1: usa('.panel-head h1'), cuerpo: usa('body'), c600: document.fonts.check('600 14px Cabin'), r400: document.fonts.check('400 14px Roboto') }; });
  ok('Cabin y Roboto quedaron cargadas', f.cargadas.includes('Cabin') && f.cargadas.includes('Roboto') && f.c600 && f.r400, f.cargadas.join(', '));
  ok('títulos en Cabin y cuerpo en Roboto', /^Cabin/.test(f.h1) && /Roboto/.test(f.cuerpo), `${f.h1} · ${f.cuerpo}`);
  const html = await page.content();
  ok('la página no enlaza hojas ni código de otros dominios', !/<(link|script)[^>]+(href|src)="https?:\/\//.test(html));
  // uso básico sin terceros: elegir alcaldía y abrir la ayuda
  await page.selectOption('#alc', '5'); await page.waitForTimeout(600);
  ok('la consulta de una alcaldía funciona sin terceros', (await page.$eval('#scope-title', e => e.innerText)).length > 0 && externas.length === 0);
  if (process.env.CAPTURA) await page.screenshot({ path: process.env.CAPTURA });
  ok('sin errores de JavaScript', errores.length === 0, errores.slice(0, 2).join(' | '));
  await ctx.close();
  // ---- versión de un solo archivo (auditoría H-058 y H-095): se abre con doble clic y no pide nada a terceros, ni para Excel ni para fichas ----
  const path = require('path'), fs = require('fs'); const unico = path.join(L.DOCS, '..', '_local', 'calles_prioritarias.html');
  if (!fs.existsSync(unico)) ok('existe _local/calles_prioritarias.html (se genera al construir)', false);
  else {
    const c2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-MX', acceptDownloads: true }); const p2 = await c2.newPage(); p2.setDefaultTimeout(300000);
    const err2 = [], ext2 = []; p2.on('pageerror', e => err2.push(e.message));
    await p2.route('**/*', r => { const u = new URL(r.request().url()); if (u.protocol === 'file:' || u.protocol === 'data:' || u.protocol === 'blob:') return r.continue(); ext2.push(u.href); return r.abort(); });
    await p2.goto('file://' + unico + '?modo=ligero'); await p2.waitForSelector('#loader[hidden]', { state: 'attached' }); await p2.waitForTimeout(800);
    const enl = await p2.$$eval('script[src], link[href]', els => els.map(e => e.src || e.href).filter(u => /^https?:/.test(u)));
    ok('archivo único: no enlaza código ni hojas de otros dominios', enl.length === 0, enl.slice(0, 3).join(' | '));
    ok('archivo único: arranca con todo dominio externo bloqueado', await p2.evaluate(() => !!window.deck && !!window.pako));
    await p2.selectOption('#alc', '5'); await p2.waitForTimeout(600);
    const baja = async sel => { const [d] = await Promise.all([p2.waitForEvent('download', { timeout: 120000 }).catch(() => null), p2.$eval(sel, b => b.click())]); return d ? d.suggestedFilename() : ''; };
    const x = await baja('#dl-calles'); ok('archivo único: entrega Excel sin conexión', /\.xlsx$/.test(x), x);
    const f = await baja('#dl-ficha-alc'); ok('archivo único: entrega la ficha PDF sin conexión', /\.pdf$/.test(f), f);
    ok('archivo único: ninguna solicitud a terceros', ext2.length === 0, ext2.slice(0, 3).join(' | '));
    ok('archivo único: sin errores de JavaScript', err2.length === 0, err2.slice(0, 2).join(' | '));
    await c2.close();
  }
  await browser.close(); srv.close(); process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
