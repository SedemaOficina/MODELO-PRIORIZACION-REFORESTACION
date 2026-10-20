// D4 · 1b y 2 · Primera carga y tiempo hasta que se puede usar, en teléfono simulado (390×844, DPR 3, isMobile, hasTouch).
// Cada corrida: contexto NUEVO (sin caché HTTP, sin service worker: serviceWorkers:'block'), red y CPU emuladas por CDP.
// Sitio real con mapa: SIN window.SIA_PRUEBA y sin #nomap. localStorage: cp_recorrido='visto' (no arranca el recorrido guiado);
// en «regreso», además cp_inicio='007' (Iztapalapa) y cp_red='alc'.
// Mide: FCP (paint), «listo» (instante en que la app pone SIA_LISTO = #loader hidden), ventana de entrada (aparece / responde a un toque),
// tareas largas (bloqueo del hilo principal), peticiones con bytes transferidos (CDP encodedDataLength) hasta listo + 3 s,
// y en «regreso» el tiempo del toque en «Ver el mapa» al siguiente cuadro.
// Uso: node d4_carga.js [filtro-de-escenario] [archivo-salida.json]   (por omisión todo → d4_carga.json)
const fs = require('fs'), path = require('path');
const L = require('./d4_lib.js');
const FILTRO = process.argv[2] || '', SALIDA = path.join(L.E, process.argv[3] || 'd4_carga.json');
const CORRIDAS = +(process.env.CORRIDAS || 2);
const MATRIZ = [['3G', 4], ['3G', 6], ['4G lenta', 4], ['4G lenta', 6], ['sin limitar', 1]];
const ESC = [];
for (const [red, cpu] of MATRIZ) ESC.push({ id: `primera|${red}|cpu${cpu}`, red, cpu, inicio: null });
for (const [red, cpu] of MATRIZ) ESC.push({ id: `regreso007|${red}|cpu${cpu}`, red, cpu, inicio: '007' });
ESC.push({ id: 'regreso007|sin limitar|cpu1|modo=completo', red: 'sin limitar', cpu: 1, inicio: '007', modo: 'completo' });
ESC.push({ id: 'regreso007|3G|cpu4|modo=completo', red: '3G', cpu: 4, inicio: '007', modo: 'completo' });
ESC.push({ id: 'regreso007|3G|cpu4|con caché HTTP', red: '3G', cpu: 4, inicio: '007', caliente: true });

async function corrida(browser, srv, esc) {
  const ctx = await browser.newContext({ ...L.TEL, serviceWorkers: 'block' });
  await ctx.addInitScript(L.INIT, { prueba: false });
  await ctx.addInitScript(ini => { try { localStorage.setItem('cp_recorrido', 'visto'); if (ini) { localStorage.setItem('cp_inicio', ini); localStorage.setItem('cp_red', 'alc'); } } catch (e) {} }, esc.inicio);
  const page = await ctx.newPage(); const errores = [];
  page.on('pageerror', e => errores.push(e.message)); page.on('console', m => { if (m.type() === 'error') errores.push('console: ' + m.text()); });
  const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable');
  let red = L.redCDP(cdp);
  const url = srv.url + (esc.modo ? '?modo=' + esc.modo : '');
  if (esc.caliente) {   // primera visita sin limitar para llenar la caché HTTP; la medida es la segunda navegación (misma pestaña)
    await page.goto(url); await page.waitForFunction(() => window.__D4 && window.__D4.listo !== null, null, { timeout: 240000, polling: 200 }); await page.waitForTimeout(3000);
    red.length = 0; }
  const R = L.REDES[esc.red]; if (R) await cdp.send('Network.emulateNetworkConditions', R);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: esc.cpu });
  const t0 = Date.now(), c0 = L.cpuFoto();
  await page.goto(url, { waitUntil: 'commit', timeout: 240000 });
  let listoOk = true;
  try { await page.waitForFunction(() => window.__D4 && window.__D4.listo !== null, null, { timeout: 240000, polling: 200 }); } catch (e) { listoOk = false; }
  const tListoNode = Date.now() - t0;
  const r = { id: esc.id, listoOk, tListoNodeMs: tListoNode, cargaMaquinaPct: L.cpuOcupado(c0) };   // % de CPU de toda la máquina mientras cargaba
  // ventana de entrada (primera visita) o Iztapalapa abierta (regreso)
  const est = await page.evaluate(() => ({ entradaVisible: !document.getElementById('entrada').hidden, titulo: (document.getElementById('scope-title') || {}).textContent, alc: document.getElementById('alc').value,
    ligero: document.body.classList.contains('modo-ligero'), sinMapa: document.body.classList.contains('sin-mapa'), avisoLigero: !!document.querySelector('.aviso-ligero'), conex: !!document.querySelector('#loader .conex') }));
  Object.assign(r, est);
  // respuesta a un toque: en la entrada, «Alcaldías» (paso 1 → paso 2); en el regreso, «Ver el mapa»
  const sel = est.entradaVisible ? '.entrada-red[data-red="alc"]' : '#ver-mapa';
  await page.evaluate(s => { const b = document.querySelector(s); window.__D4.toque = null;
    b.addEventListener('click', e => { const h = performance.now(); window.__D4.toque = { ts: Math.round(e.timeStamp), h: Math.round(h) }; requestAnimationFrame(() => requestAnimationFrame(() => { window.__D4.toque.cuadro = Math.round(performance.now()); })); }, { capture: true, once: true }); }, sel);
  const bb = await page.locator(sel).boundingBox();
  const tq0 = Date.now(); await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
  try { await page.waitForFunction(() => window.__D4.toque && window.__D4.toque.cuadro, null, { timeout: 60000, polling: 50 }); } catch (e) {}
  r.toque = { control: sel, nodeMs: Date.now() - tq0, ...(await page.evaluate(() => window.__D4.toque)) };
  if (est.entradaVisible) r.toque.paso2Visible = await page.evaluate(() => !document.getElementById('entrada-p2').hidden);
  await page.waitForTimeout(9000);   // ventana para ver si el hilo principal queda libre (5 s sin tareas largas)
  const m = await page.evaluate(() => { const p = performance.getEntriesByType('paint'); const n = performance.getEntriesByType('navigation')[0] || {};
    return { fcp: Math.round((p.find(e => e.name === 'first-contentful-paint') || {}).startTime || 0) || null, fp: Math.round((p.find(e => e.name === 'first-paint') || {}).startTime || 0) || null,
      listo: Math.round(window.__D4.listo), entrada: window.__D4.entrada && Math.round(window.__D4.entrada), dcl: Math.round(n.domContentLoadedEventEnd || 0), load: Math.round(n.loadEventEnd || 0), lt: window.__D4.lt, ahora: Math.round(performance.now()) }; });
  Object.assign(r, { fcpMs: m.fcp, fpMs: m.fp, listoMs: m.listo, entradaMs: m.entrada, dclMs: m.dcl, loadMs: m.load });
  r.bloqueo = { hastaFCP: L.bloqueo(m.lt, 0, m.fcp || 0), fcpAListo: L.bloqueo(m.lt, m.fcp || 0, m.listo), listoMas3s: L.bloqueo(m.lt, m.listo, m.listo + 3000), listoAlFin: L.bloqueo(m.lt, m.listo, m.ahora + 1), total: L.bloqueo(m.lt, 0, m.ahora + 1) };
  r.tareasLargas = m.lt; r.ttiAproxMs = L.tti(m.lt, m.listo, m.ahora); r.observadoHastaMs = m.ahora;
  // red
  const t0n = red.length ? Math.min(...red.map(x => x.ini)) : 0;
  r.peticiones = red.map(x => ({ url: L.corto(x.url), tipo: x.tipo, estado: x.estado, enc: x.enc, cc: x.cc, deCache: !!x.deCache, bytes: x.bytes ?? null, iniMs: Math.round((x.ini - t0n) * 1000), finMs: x.fin ? Math.round((x.fin - t0n) * 1000) : null, falla: x.falla }));
  r.externas = r.peticiones.filter(x => /^https?:/.test(x.url) && !/^data:|^blob:/.test(x.url)).map(x => x.url);
  r.primeraCarga = r.peticiones.filter(x => x.iniMs <= m.listo + 3000 && !/^data:/.test(x.url));   // hasta listo + 3 s (tiempo de CDP ≈ tiempo de la página)
  r.totalBytes = r.primeraCarga.reduce((a, x) => a + (x.bytes || 0), 0); r.despues = r.peticiones.filter(x => x.iniMs > m.listo + 3000).map(x => x.url);
  r.errores = errores;
  await ctx.close();
  return r;
}

(async () => {
  const srv = await L.servidor(); const browser = await L.lanzar(); const version = browser.version();
  console.log('Chromium', version, '· servidor', srv.url);
  const prev = fs.existsSync(SALIDA) ? JSON.parse(fs.readFileSync(SALIDA, 'utf8')) : { escenarios: {} };
  const out = { chromium: version, fecha: new Date().toISOString(), redes: L.REDES, telefono: L.TEL, escenarios: prev.escenarios || {} };
  for (const esc of ESC.filter(e => e.id.includes(FILTRO))) {
    const runs = [];
    for (let k = 0; k < CORRIDAS; k++) {
      const r = await corrida(browser, srv, esc); runs.push(r);
      console.log(`${esc.id} #${k + 1}: FCP ${r.fcpMs} ms · listo ${r.listoMs} ms (${r.listoOk ? 'ok' : 'NO LLEGÓ'}) · entrada ${r.entradaVisible ? 'sí ' + r.entradaMs : 'no'} · título «${(r.titulo || '').trim().slice(0, 40)}» · toque→cuadro ${r.toque && r.toque.cuadro ? r.toque.cuadro - r.toque.ts : '?'} ms (Node ${r.toque.nodeMs}) · TTI≈${r.ttiAproxMs} · TBT fcp→listo ${r.bloqueo.fcpAListo.tbtMs} / listo+3s ${r.bloqueo.listoMas3s.tbtMs} ms · ${r.peticiones.length} pet., ${r.totalBytes} B · máquina ${r.cargaMaquinaPct}% · ligero ${r.ligero} · errores ${r.errores.length}`);
    }
    out.escenarios[esc.id] = { runs, mediana: { fcpMs: L.mediana(runs.map(r => r.fcpMs)), listoMs: L.mediana(runs.map(r => r.listoMs)), entradaMs: L.mediana(runs.map(r => r.entradaMs)),
      toqueCuadroMs: L.mediana(runs.map(r => r.toque && r.toque.cuadro ? r.toque.cuadro - r.toque.ts : null)), tbtFcpListo: L.mediana(runs.map(r => r.bloqueo.fcpAListo.tbtMs)), tbtListo3s: L.mediana(runs.map(r => r.bloqueo.listoMas3s.tbtMs)), bytes: L.mediana(runs.map(r => r.totalBytes)), toqueNodeMs: L.mediana(runs.map(r => r.toque && r.toque.nodeMs)), ttiAproxMs: L.mediana(runs.map(r => r.ttiAproxMs)) } };
    fs.writeFileSync(SALIDA, JSON.stringify(out, null, 1));
  }
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
