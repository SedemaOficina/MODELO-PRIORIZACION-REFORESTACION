// D4 · 2c · Lo que se pide después de abrir: inventario al acercarse (zoom 16.3 en Iztapalapa), Excel de frentes de Iztapalapa,
// ficha PDF de la alcaldía y filtro «Espacio» (espacios_frentes.bin + espacios_vp.bin). Teléfono 390×844, 3G × CPU 4 desde el inicio.
// AQUÍ SÍ se define window.SIA_PRUEBA = true (sin #nomap): hace falta window.__MAPA.ir() para llevar el mapa a un zoom y punto exactos
// y window.__INV para saber cuándo la capa del inventario ya tiene sus puntos. Con SIA_PRUEBA el recorrido guiado no arranca.
// Contexto nuevo por corrida (sin caché, serviceWorkers:'block'). Bytes: CDP de la página + registro del propio servidor (cubre el worker del Excel).
// Uso: node d4_inventario.js → d4_inventario.json
const fs = require('fs'), path = require('path');
const L = require('./d4_lib.js');
const CORRIDAS = +(process.env.CORRIDAS || 2), RED = process.env.RED || '3G', CPU = +(process.env.CPU || 4);
const IZTAPALAPA = { longitude: -99.0565, latitude: 19.3445 };   // mismo punto que 04_pruebas/prueba_inventario_espacios.js
const espera = (pg, f, arg, t = 180000) => pg.waitForFunction(f, arg, { timeout: t, polling: 50 }).then(() => true, () => false);

async function corrida(browser, srv, k) {
  const ctx = await browser.newContext({ ...L.TEL, serviceWorkers: 'block', acceptDownloads: true });
  await ctx.addInitScript(L.INIT, { prueba: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('cp_recorrido', 'visto'); localStorage.setItem('cp_inicio', '007'); localStorage.setItem('cp_red', 'alc'); } catch (e) {} });
  const page = await ctx.newPage(); const errores = []; page.on('pageerror', e => errores.push(e.message));
  const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable'); const red = L.redCDP(cdp);
  await cdp.send('Network.emulateNetworkConditions', L.REDES[RED]); await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const r = { corrida: k + 1, red: RED, cpu: CPU };
  await page.goto(srv.url, { waitUntil: 'commit' });
  await espera(page, () => window.__D4 && window.__D4.listo !== null && window.__INV && window.__MAPA);
  r.listoMs = await page.evaluate(() => Math.round(window.__D4.listo)); r.titulo = await page.evaluate(() => document.getElementById('scope-title').textContent.trim());
  await page.waitForTimeout(8000);   // que termine de asentarse la carga
  await page.touchscreen.tap(...await page.locator('#ver-mapa').boundingBox().then(b => [b.x + b.width / 2, b.y + b.height / 2])); await page.waitForTimeout(3000);
  await page.evaluate(() => { const b = document.querySelector('.aviso-ligero:not(.aviso-error) button'); if (b) b.click(); });
  r.ligero = await page.evaluate(() => window.__MAPA.ligero()); r.zInv = await page.evaluate(() => window.__INV.z()); r.vistaAntes = await page.evaluate(() => window.__MAPA.vista());
  await page.waitForTimeout(3000);
  // ---- acercar ----
  const lt0 = await page.evaluate(() => window.__D4.lt.length); const n0 = red.length, s0 = srv.log.length;
  const w0 = Date.now();
  const p0 = await page.evaluate(v => { const t = performance.now(); window.__MAPA.ir({ ...v, zoom: 16.3 }, 0); return t; }, IZTAPALAPA);
  const llego = await espera(page, () => window.__INV.cargadas().includes('007') && window.__INV.pendientes() === 0 && window.__INV.capas().some(c => c.id === 'inv-cepa' && c.n > 0), null, 120000);
  const pCapa = await page.evaluate(() => new Promise(res => { const t = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => res([t, performance.now()]))); }));
  const wDib = Date.now();
  await page.waitForTimeout(6000);
  const pet = red.slice(n0).filter(x => !/^data:/.test(x.url));
  const inv = pet.find(x => /inv_007\.bin/.test(x.url));
  r.acercar = { llego, capas: await page.evaluate(() => window.__INV.capas()), cargadas: await page.evaluate(() => window.__INV.cargadas()),
    inv007: inv ? { bytes: inv.bytes, pedidoTrasZoomMs: inv.wall - w0, llegadaTrasZoomMs: inv.wallFin - w0, duracionRedMs: Math.round((inv.fin - inv.ini) * 1000) } : null,
    capaConPuntosTrasZoomMs: Math.round(pCapa[0] - p0), dibujadoTrasZoomMs: Math.round(pCapa[1] - p0), dibujadoNodeMs: wDib - w0,
    peticiones: pet.map(x => ({ url: L.corto(x.url), bytes: x.bytes, iniTrasZoomMs: x.wall - w0, finTrasZoomMs: x.wallFin ? x.wallFin - w0 : null })),
    bytesTotal: pet.reduce((a, x) => a + (x.bytes || 0), 0),
    tareasLargas: (await page.evaluate(n => window.__D4.lt.slice(n), lt0)).map(([s, d]) => [Math.round(s - p0), d]) };
  r.acercar.bloqueo = L.bloqueo(r.acercar.tareasLargas, 0, 1e9);
  // ---- de vuelta a la información: Excel de frentes prioritarios de Iztapalapa ----
  await page.touchscreen.tap(...await page.locator('#ver-info').boundingBox().then(b => [b.x + b.width / 2, b.y + b.height / 2])); await page.waitForTimeout(2000);
  async function descarga(sel, etiqueta) { const s1 = srv.log.length, n1 = red.length; const w = Date.now();
    const [d] = await Promise.all([page.waitForEvent('download', { timeout: 240000 }).catch(() => null), page.$eval(sel, b => b.click())]);
    const ms = Date.now() - w; let bytes = null, nombre = null; if (d) { nombre = d.suggestedFilename(); try { bytes = fs.statSync(await d.path()).size; } catch (e) {} }
    await page.waitForTimeout(1500);
    return { etiqueta, control: sel, ms, archivo: nombre, bytesArchivo: bytes, servidor: srv.log.slice(s1).map(x => ({ url: x.url, bytes: x.bytes, enc: x.enc })), paginaCDP: red.slice(n1).filter(x => !/^data:/.test(x.url)).map(x => ({ url: L.corto(x.url), bytes: x.bytes })) }; }
  r.excel = await descarga('#dl-frentes', 'Excel de frentes prioritarios de Iztapalapa');
  r.ficha = await page.evaluate(() => !document.getElementById('dl-ficha-alc').hidden) ? await descarga('#dl-ficha-alc', 'Ficha PDF de Iztapalapa') : { nota: '#dl-ficha-alc oculto' };
  // ---- filtro «Espacio: Cepa vacante» → espacios_frentes.bin y espacios_vp.bin ----
  { const s1 = srv.log.length, n1 = red.length, w = Date.now();
    await page.$eval('button[data-esp="0"]', b => b.click());
    const ok = await espera(page, () => document.querySelector('button[data-esp="0"]').getAttribute('aria-pressed') === 'true' && !document.body.classList.contains('cargando'), null, 120000);
    await page.waitForTimeout(4000);
    const pet2 = red.slice(n1).filter(x => /espacios_/.test(x.url));
    r.espacio = { ok, peticiones: pet2.map(x => ({ url: L.corto(x.url), bytes: x.bytes, llegadaMs: x.wallFin ? x.wallFin - w : null })), servidor: srv.log.slice(s1).map(x => ({ url: x.url, bytes: x.bytes })) }; }
  r.errores = errores; r.servidorTodo = srv.log.splice(0).map(x => ({ url: x.url, bytes: x.bytes, enc: x.enc }));
  await ctx.close(); return r;
}
(async () => {
  const srv = await L.servidor(); const browser = await L.lanzar(); const out = { chromium: browser.version(), fecha: new Date().toISOString(), punto: IZTAPALAPA, zoom: 16.3, runs: [] };
  for (let k = 0; k < CORRIDAS; k++) { const c0 = L.cpuFoto(); const r = await corrida(browser, srv, k); r.cargaMaquinaPct = L.cpuOcupado(c0); out.runs.push(r);
    const a = r.acercar; console.log(`#${k + 1} listo ${r.listoMs} · ligero ${r.ligero} (zInv ${r.zInv}) · inv_007 ${a.inv007 && a.inv007.bytes} B pedido +${a.inv007 && a.inv007.pedidoTrasZoomMs} ms, llegó +${a.inv007 && a.inv007.llegadaTrasZoomMs} ms · capa con puntos +${a.capaConPuntosTrasZoomMs} · dibujada +${a.dibujadoTrasZoomMs} ms · ${a.bytesTotal} B tras zoom (${a.peticiones.map(p => p.url.split('?')[0].split('/').pop() + ' ' + p.bytes).join(', ')}) · TBT ${a.bloqueo.tbtMs}`);
    console.log(`   Excel ${r.excel.ms} ms ${r.excel.archivo} ${r.excel.bytesArchivo} B · servidor: ${r.excel.servidor.map(x => x.url.split('?')[0] + ' ' + x.bytes).join(', ')}`);
    console.log(`   Ficha ${r.ficha.ms} ms ${r.ficha.archivo} · servidor: ${(r.ficha.servidor || []).map(x => x.url.split('?')[0] + ' ' + x.bytes).join(', ')}`);
    console.log(`   Espacio ${r.espacio.ok} · ${r.espacio.peticiones.map(p => p.url.split('?')[0] + ' ' + p.bytes + ' B +' + p.llegadaMs + ' ms').join(', ')} · máquina ${r.cargaMaquinaPct}% · errores ${r.errores.length}`);
    fs.writeFileSync(path.join(L.E, 'd4_inventario.json'), JSON.stringify(out, null, 1)); }
  out.mediana = { inv007LlegadaMs: L.mediana(out.runs.map(r => r.acercar.inv007 && r.acercar.inv007.llegadaTrasZoomMs)), dibujadoMs: L.mediana(out.runs.map(r => r.acercar.dibujadoTrasZoomMs)), bytesTrasZoom: L.mediana(out.runs.map(r => r.acercar.bytesTotal)), excelMs: L.mediana(out.runs.map(r => r.excel.ms)), fichaMs: L.mediana(out.runs.map(r => r.ficha.ms)) };
  console.log('medianas', JSON.stringify(out.mediana));
  fs.writeFileSync(path.join(L.E, 'd4_inventario.json'), JSON.stringify(out, null, 1));
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
