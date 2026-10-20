// D4 · Primera visita CON service worker (serviceWorkers:'allow'), como la de una persona real: ¿cuánto se descarga en total y qué se
// descarga dos veces? El service worker (docs/sw.js) precarga su lista con fetch(u, {cache:'reload'}), que no usa la caché HTTP.
// Bytes contados en el propio servidor (las peticiones del service worker no salen en la sesión CDP de la página).
// Teléfono 390×844; red y CPU por CDP sobre la página (la emulación de red de la página no se aplica al service worker: ver nota en la salida).
// Uso: node d4_sw.js → d4_sw.json
const fs = require('fs'), path = require('path');
const L = require('./d4_lib.js');
const CORRIDAS = +(process.env.CORRIDAS || 2);
const ESC = [{ red: 'sin limitar', cpu: 1 }, { red: '3G', cpu: 4 }];
(async () => {
  const srv = await L.servidor(); const browser = await L.lanzar(); const out = { chromium: browser.version(), fecha: new Date().toISOString(), runs: [] };
  for (const esc of ESC) for (let k = 0; k < CORRIDAS; k++) {
    const ctx = await browser.newContext({ ...L.TEL, serviceWorkers: 'allow' });
    await ctx.addInitScript(L.INIT, { prueba: false });
    await ctx.addInitScript(() => { try { localStorage.setItem('cp_recorrido', 'visto'); localStorage.setItem('cp_inicio', '007'); localStorage.setItem('cp_red', 'alc'); } catch (e) {} });
    const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable');
    if (L.REDES[esc.red]) await cdp.send('Network.emulateNetworkConditions', L.REDES[esc.red]); await cdp.send('Emulation.setCPUThrottlingRate', { rate: esc.cpu });
    srv.log.length = 0; const w0 = Date.now();
    const log = []; const orig = srv.log.push.bind(srv.log); srv.log.push = x => { log.push({ ...x, ms: Date.now() - w0 }); return orig(x); };
    await page.goto(srv.url, { waitUntil: 'commit' });
    await page.waitForFunction(() => window.__D4 && window.__D4.listo !== null, null, { timeout: 240000, polling: 200 });
    const listo = await page.evaluate(() => Math.round(window.__D4.listo));
    const swListo = await page.evaluate(() => new Promise(res => { const t = setTimeout(() => res(null), 180000); navigator.serviceWorker.ready.then(() => { clearTimeout(t); res(Math.round(performance.now())); }); }));
    await page.waitForTimeout(3000);
    srv.log.push = orig;
    const porUrl = {}; for (const x of log) { const u = x.url.split('?')[0]; porUrl[u] = porUrl[u] || { veces: 0, bytes: 0 }; porUrl[u].veces++; porUrl[u].bytes += x.bytes; }
    const dobles = Object.entries(porUrl).filter(([, v]) => v.veces > 1).map(([u, v]) => ({ url: u, veces: v.veces, bytes: v.bytes }));
    const r = { red: esc.red, cpu: esc.cpu, corrida: k + 1, listoMs: listo, swActivoMs: swListo, totalBytesServidor: log.reduce((a, x) => a + x.bytes, 0), peticiones: log.length, dobles, bytesDobles: dobles.reduce((a, d) => a + d.bytes / d.veces * (d.veces - 1), 0), log };
    out.runs.push(r);
    console.log(`${esc.red} × CPU ${esc.cpu} #${k + 1}: listo ${listo} ms · SW activo ${swListo} ms · ${log.length} peticiones · ${r.totalBytesServidor} B en total · repetidas: ${dobles.map(d => d.url + ' ×' + d.veces).join(', ')} (${Math.round(r.bytesDobles)} B de más)`);
    fs.writeFileSync(path.join(L.E, 'd4_sw.json'), JSON.stringify(out, null, 1));
    await ctx.close();
  }
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
