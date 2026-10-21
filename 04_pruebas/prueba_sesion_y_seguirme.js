// Funciones que no tenían ninguna prueba (A1-02 de la auditoría del 19 oct 2026), con la sesión del SIA simulada (SIA_SESION) donde hace falta:
// 1) registro de usos: qué envía cada aviso de consulta y de descarga, que no anota toda la ciudad, que espera 1.5 s a que la persona se
//    detenga (solo anota el último de varios cambios seguidos), que no repite el mismo ámbito y que sin sesión no envía nada;
// 2) «Seguirme mientras camino»: con un GPS simulado que se mueve, la consulta sigue a la persona de colonia en colonia; al elegir otra a
//    mano deja de moverla; «Dejar de seguirme» suelta el GPS; y nada de eso se anota en el registro de usos;
// 3) proceso de servicio con sesión: detrás del inicio de sesión no se instala la copia sin conexión, y si quedó una de antes se retira
//    (una copia local abriría la herramienta sin sesión).
// Uso: node 04_pruebas/prueba_sesion_y_seguirme.js
const path = require('path'), fs = require('fs');
const L = require('./lib_pruebas.js');
const ok = L.Registro('sesión, registro de usos y Seguirme');
const SAL = path.join(__dirname, 'capturas', 'sesion_y_seguirme'); fs.mkdirSync(SAL, { recursive: true });
const SESION = { inicio: '/acceso/', cierre: '/api/salir', uso: '/api/uso' };
const GPS = { latitude: 19.3560, longitude: -99.0560, accuracy: 10 };   // colonia Vicente Guerrero, Iztapalapa (la de prueba_sitio.js)
// sesión simulada (como la escribe construir.py en config.js; config.js ya no puede cambiarla) y servidor de sesión falso que anota los avisos
const preparar = (avisos, sesion = true) => async ctx => {
  if (sesion) await ctx.addInitScript(s => { Object.defineProperty(window, 'SIA_SESION', { value: s, writable: false, configurable: false }); }, SESION);
  await ctx.route(/\/api\//, async r => { const q = r.request(); if (/\/api\/uso$/.test(q.url())) { let d = null; try { d = JSON.parse(q.postData() || 'null'); } catch (e) {}
    avisos.push({ t: Date.now(), d }); } await r.fulfill({ status: 204, body: '' }); }); };
const consultas = a => a.filter(x => x.d && x.d.evento === 'consulta');
// para comprobar que algo NO se envía hace falta dejar pasar el tiempo en que sí se enviaría (1.5 s), con margen
const SIN_AVISO = 2500;
// el aviso sale con sendBeacon y llega al servidor falso un momento después: se espera a que llegue (hasta 5 s)
const ALC = (page, nombre) => page.$eval('#alc', (s, n) => [...s.options].find(o => o.textContent.trim() === n).value, nombre);
// elige una colonia en el buscador sin esperar a que la herramienta termine (como quien toca una y luego otra)
const colonia = async (page, q, alc = 'Iztapalapa') => { await page.fill('#omni', ''); await page.fill('#omni', q);
  for (const o of await page.$$('#omni-list li.opt')) { const t = await o.innerText(); if (t.trim().startsWith('Col') && t.includes(alc)) { await o.dispatchEvent('mousedown'); return true; } } return false; };
const ambito = page => page.evaluate(() => window.__UBIC.ambito());
const hasta = async (cond, ms = 5000) => { const t = Date.now(); while (!cond() && Date.now() - t < ms) await new Promise(r => setTimeout(r, 50)); };

(async () => {
  const srv = await L.servidor(0); const browser = await L.lanzar(); const errores = []; const base = srv.url + '?modo=ligero';
  try {
    // ---------- 1) registro de usos (computadora) ----------
    { const avisos = []; const { page, ctx } = await L.abrir(browser, base + '#nomap', { preparar: preparar(avisos) }, errores);
      await page.waitForTimeout(SIN_AVISO);
      ok('con sesión, abrir en toda la ciudad no se anota', avisos.length === 0, JSON.stringify(avisos.map(a => a.d)));
      const t0 = Date.now(); await page.selectOption('#alc', await ALC(page, 'Iztapalapa')); await L.quieto(page); await hasta(() => consultas(avisos).length >= 1);
      const c1 = consultas(avisos);
      ok('elegir una alcaldía se anota una vez, con su ámbito', c1.length === 1 && c1[0].d.alcaldia === 'Iztapalapa' && c1[0].d.red === 'alc' && c1[0].d.colonia === '' && c1[0].d.banqueta === 'todas',
        JSON.stringify(c1.map(a => a.d)));
      ok('el aviso sale cuando la persona se detiene (1.5 s), no al primer clic', c1.length === 1 && c1[0].t - t0 >= 1400, c1.length ? `${c1[0].t - t0} ms` : 'sin aviso');
      // dos colonias seguidas (antes de 1.5 s): solo se anota la última
      const t1 = Date.now(), ca = await colonia(page, 'Vicente Guerrero'), cb = await colonia(page, 'Santa Cruz Meyehualco'), entre = Date.now() - t1;
      await L.quieto(page); await hasta(() => consultas(avisos).length >= 2); const cbN = (await ambito(page)).colonia;
      const c2 = consultas(avisos).slice(1);
      ok('dos colonias elegidas seguidas: solo se anota la última', ca && cb && entre < 1400 && c2.length === 1 && c2[0].d.colonia === cbN && /Meyehualco/.test(cbN) && c2[0].d.alcaldia === 'Iztapalapa',
        `${entre} ms entre las dos · ${JSON.stringify(c2.map(a => a.d))}`);
      // cambiar la banqueta y regresarla antes de 1.5 s deja el mismo ámbito: no se repite
      await page.evaluate(() => { document.querySelector('[data-banq="con"]').click(); document.querySelector('[data-banq="todas"]').click(); }); await L.quieto(page); await page.waitForTimeout(SIN_AVISO);
      ok('volver al mismo ámbito no se anota otra vez', consultas(avisos).length === 2, JSON.stringify(consultas(avisos).slice(2).map(a => a.d)));
      await page.evaluate(() => document.querySelector('[data-banq="con"]').click()); await L.quieto(page); await hasta(() => consultas(avisos).length >= 3);
      const c3 = consultas(avisos).slice(2);
      ok('cambiar un filtro sí es otra consulta, y dice el filtro', c3.length === 1 && c3[0].d.banqueta === 'con' && c3[0].d.colonia === cbN, JSON.stringify(c3.map(a => a.d)));
      // descarga: tipo, nombre del archivo y ámbito
      await page.evaluate(() => document.getElementById('tab-dl') && document.getElementById('tab-dl').click());
      const antes = avisos.length; const d = await L.descargar(page, '#dl-frentes', SAL); await L.quieto(page); await hasta(() => avisos.slice(antes).some(a => a.d && a.d.evento === 'descarga'));
      const ds = avisos.slice(antes).filter(a => a.d && a.d.evento === 'descarga');
      ok('descargar el Excel de frentes se anota con su tipo, su nombre y su ámbito', !!d && ds.length === 1 && ds[0].d.tipo === 'excel_frentes' && ds[0].d.archivo === d.nombre && ds[0].d.colonia === cbN && ds[0].d.banqueta === 'con',
        `${d && d.nombre} · ${JSON.stringify(ds.map(a => a.d))}`);
      const campos = ['evento', 'red', 'alcaldia', 'colonia', 'avenida', 'calle', 'banqueta'];
      ok('cada aviso trae solo el ámbito y el archivo: nada de la persona ni de su ubicación', avisos.every(a => a.d && Object.keys(a.d).every(k => [...campos, 'espacio', 'tipo', 'archivo'].includes(k))),
        [...new Set(avisos.flatMap(a => Object.keys(a.d || {})))].join(', '));
      await ctx.close(); }

    // ---------- sin sesión no se envía nada ----------
    { const avisos = []; const { page, ctx } = await L.abrir(browser, base + '#nomap', { preparar: preparar(avisos, false) }, errores);
      await page.selectOption('#alc', await ALC(page, 'Iztapalapa')); await L.quieto(page); await L.elegirTipo(page, 'Tecpinco', 'Col', 'Iztapalapa');
      await L.descargar(page, '#dl-frentes', SAL); await page.waitForTimeout(SIN_AVISO);
      ok('sin sesión (GitHub Pages) no se envía ningún aviso, ni de consulta ni de descarga', avisos.length === 0, `${avisos.length} avisos`);
      await ctx.close(); }

    // ---------- 2) «Seguirme mientras camino» (teléfono, con sesión) ----------
    { const avisos = [];
      const { page, ctx } = await L.abrir(browser, base + '#nomap', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, geolocation: GPS, permissions: ['geolocation'], preparar: preparar(avisos) }, errores);
      // puntos de destino: caminando al este desde el GPS, la primera colonia distinta y, después, otra más
      const ruta = await page.evaluate(g => { const U = window.__UBIC, out = []; let ult = U.donde(g.longitude, g.latitude).col;
        for (let k = 1; k < 400 && out.length < 2; k++) { const lon = g.longitude + k * 0.0004, w = U.donde(lon, g.latitude);
          if (w.col !== null && w.col !== ult) { out.push({ lon, lat: g.latitude, n: w.colonia }); ult = w.col; k += 3; } }
        return { inicio: U.donde(g.longitude, g.latitude).colonia, out }; }, GPS);
      ok('control: hay dos colonias distintas caminando al este del GPS', ruta.out.length === 2, `${ruta.inicio} → ${ruta.out.map(x => x.n).join(' → ')}`);
      await page.$eval('#zloc', b => b.click());
      await page.waitForFunction(() => /Estás en/.test(document.getElementById('card').textContent), null, { timeout: 30000 }); await L.quieto(page);
      const ini = await page.evaluate(() => ({ col: window.__UBIC.ambito().colonia, h: document.querySelector('#card h3').textContent }));
      ok('Mi ubicación: elige la colonia donde está la persona', ini.col === ruta.inicio && ini.h.includes(ruta.inicio), JSON.stringify(ini));
      await page.$eval('#loc-follow', b => b.click()); await L.quieto(page);
      const sig = await page.evaluate(() => ({ boton: document.getElementById('zloc').classList.contains('follow') && document.getElementById('zloc').getAttribute('aria-pressed') === 'true',
        texto: (document.getElementById('loc-follow') || {}).textContent }));
      ok('«Seguirme mientras camino» se enciende: el botón lo dice y cambia a «Dejar de seguirme»', sig.boton && sig.texto === 'Dejar de seguirme', JSON.stringify(sig));
      // caminar: el GPS llega a otra colonia
      const [p1, p2] = ruta.out;
      await ctx.setGeolocation({ latitude: p1.lat, longitude: p1.lon, accuracy: 10 });
      const sigue = await page.waitForFunction(n => window.__UBIC.ambito().colonia === n, p1.n, { timeout: 20000 }).then(() => true, () => false); await L.quieto(page);
      const h1 = await page.$eval('#card h3', x => x.textContent).catch(() => '');
      ok('al caminar, la consulta sigue a la persona a la colonia siguiente y la ficha dice dónde está', sigue && h1.includes(p1.n.replace(/ \(.*\)$/, '')),   // la ficha dice el nombre sin «(CP …)» ni «(parte …)»
        `${p1.n} · ficha: ${h1}`);
      await page.waitForTimeout(SIN_AVISO);
      ok('lo que mueve «Seguirme» (y Mi ubicación) no se anota en el registro de usos', consultas(avisos).length === 0, JSON.stringify(consultas(avisos).map(a => a.d)));
      // elegir otra colonia a mano: se anota y el GPS deja de moverla
      await L.elegirTipo(page, 'Tecpinco', 'Col', 'Iztapalapa'); await L.quieto(page); await hasta(() => consultas(avisos).length >= 1);
      const manual = (await ambito(page)).colonia;
      ok('una colonia elegida a mano mientras se sigue sí se anota', consultas(avisos).length === 1 && consultas(avisos)[0].d.colonia === manual, JSON.stringify(consultas(avisos).map(a => a.d)));
      // con una ficha abierta el GPS tampoco cambia la colonia (para no cerrársela a quien la lee): se cierra, para que solo cuente la elección a mano
      const ficha = await page.evaluate(() => { const c = document.getElementById('card'); const x = c && !c.hidden && c.querySelector('.close'); if (x) x.click(); return !!x; }); await L.quieto(page);
      await ctx.setGeolocation({ latitude: p2.lat, longitude: p2.lon, accuracy: 10 }); await page.waitForTimeout(SIN_AVISO); await L.quieto(page);
      const quedo = (await ambito(page)).colonia;
      ok('después de elegir a mano, el GPS ya no cambia la consulta, aunque se cierre la ficha', quedo === manual, `${quedo} (el GPS está en ${p2.n}) · ficha cerrada: ${ficha}`);
      // dejar de seguir: se suelta el GPS
      await page.$eval('#zloc', b => b.click()); await L.quieto(page);
      const fin = await page.evaluate(() => ({ ...window.__UBIC.seguir(), boton: document.getElementById('zloc').classList.contains('follow'), pres: document.getElementById('zloc').getAttribute('aria-pressed') }));
      ok('tocar el botón otra vez deja de seguir y suelta el GPS', !fin.activo && !fin.gps && !fin.boton && fin.pres === 'false', JSON.stringify(fin));
      await ctx.close(); }

    // ---------- 3) proceso de servicio con sesión ----------
    { const avisos = []; const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' }); await L.sinEntrada(ctx);
      const page = await ctx.newPage(); page.setDefaultTimeout(300000);
      const copia = () => page.evaluate(async () => ({ registros: (await navigator.serviceWorker.getRegistrations()).length, cachés: (await caches.keys()).filter(k => k.startsWith('calles-')).length }));
      // sin sesión (GitHub Pages): se instala la copia sin conexión
      await page.goto(srv.url); await page.waitForSelector('#loader[hidden]', { state: 'attached' });
      await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistrations()).some(r => r.active) && (await caches.keys()).some(k => k.startsWith('calles-')), null, { timeout: 120000, polling: 500 });
      const a = await copia();
      ok('control: sin sesión se instala la copia sin conexión', a.registros === 1 && a.cachés >= 1, JSON.stringify(a));
      // la misma herramienta, ahora detrás del inicio de sesión: retira la copia que quedó
      await preparar(avisos)(ctx); await page.reload(); await page.waitForSelector('#loader[hidden]', { state: 'attached' });
      const retirada = await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistrations()).length === 0 && !(await caches.keys()).some(k => k.startsWith('calles-')), null, { timeout: 30000, polling: 250 })
        .then(() => true, () => false);
      ok('con sesión, la copia que quedó de antes se retira (proceso de servicio y caché)', retirada, JSON.stringify(await copia()));
      await page.reload(); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await L.quieto(page); await page.waitForTimeout(SIN_AVISO);
      const b = await copia();
      ok('con sesión, al volver a abrir no se instala otra copia', b.registros === 0 && b.cachés === 0, JSON.stringify(b));
      await ctx.close(); }
    { const avisos = []; const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' }); await L.sinEntrada(ctx); await preparar(avisos)(ctx);
      const page = await ctx.newPage(); page.setDefaultTimeout(300000);
      await page.goto(srv.url); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(SIN_AVISO);
      const c = await page.evaluate(async () => ({ registros: (await navigator.serviceWorker.getRegistrations()).length, cachés: (await caches.keys()).length }));
      ok('con sesión desde la primera visita: no se instala la copia sin conexión', c.registros === 0 && c.cachés === 0, JSON.stringify(c));
      await ctx.close(); }

    ok('sin errores en la página', errores.length === 0, errores.slice(0, 3).join(' | '));
  } catch (e) { ok('la prueba corre', false, e.stack || e.message); }
  await browser.close(); srv.close();
  process.exitCode = ok.fin() ? 1 : 0;
})();
