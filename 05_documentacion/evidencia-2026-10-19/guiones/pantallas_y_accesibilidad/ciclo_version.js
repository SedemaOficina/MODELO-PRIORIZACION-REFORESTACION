// B6 · Ciclo «abrir con red → nueva versión publicada → abrir sin red → regresar la red», con el proceso de servicio (docs/sw.js) activo.
// Versiones: ciclo_v136 (copia de r2/docs) y ciclo_raiz/docs (la misma fuente con VERSION = '1.37', construida aparte).
// Escenarios: A normal; B la red vuelve un momento (se baja la página nueva) pero sw.js nuevo no llega; C el sw.js nuevo llega pero
// data.bin falla durante su instalación (señal que se corta). Uso: node ciclo_version.js [A,B,C]. Escribe ciclo_version.json.
const C = require('./comun.js'); const { PW, path, fs } = C; const http = require('http');
const V = { '1.36': path.join(__dirname, 'ciclo_v136'), '1.37': path.join(__dirname, 'ciclo_raiz', 'docs') };
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const S = { raiz: V['1.36'], modo: 'normal', pedidos: [], duranteCaida: [], duranteOffline: [], offline: false };
// «Sin red» = el servidor corta toda conexión (MODO_RED=caido, por omisión). Con MODO_RED=offline se usa context.setOffline(true) de Playwright,
// como 04_pruebas/prueba_telefono_y_sin_conexion.js, y se cuenta lo que aun así llega al servidor.
const MODO_RED = process.env.MODO_RED || 'caido';
const sinRed = async (ctx, si) => { if (MODO_RED === 'offline') { S.offline = si; await ctx.setOffline(si); } else { if (si) { S.modoAntes = S.modo; S.modo = 'caido'; } else S.modo = S.modoAntes || 'normal'; } };
const srv = http.createServer((req, res) => { if (S.modo === 'caido') { S.duranteCaida.push(req.url); req.socket.destroy(); return; } if (S.offline) S.duranteOffline.push(req.url); let rel = decodeURIComponent(req.url.split('?')[0]); if (rel.endsWith('/')) rel += 'index.html'; S.pedidos.push(req.url);
  if (S.modo === 'sw404' && rel === '/sw.js') { res.writeHead(404); return res.end(); }
  if (S.modo === 'fallaDatos' && rel === '/datos/data.bin') { req.socket.destroy(); return; }
  const ruta = path.join(S.raiz, rel); if (!ruta.startsWith(S.raiz) || !fs.existsSync(ruta)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(ruta)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); fs.createReadStream(ruta).pipe(res); });
const out = []; const log = (esc, n, det) => { out.push({ esc, n, det }); console.log(`${esc} · ${n} · ${typeof det === 'string' ? det : JSON.stringify(det)}`); };
async function abre(ctx, url) { const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message)); p.on('console', m => m.type() === 'error' && err.push(m.text().slice(0, 160)));
  let cargo = true; try { await p.goto(url, { timeout: 30000 }); await p.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 60000 }); } catch (e) { cargo = false; err.push('NO CARGA: ' + e.message.split('\n')[0]); }
  const est = await p.evaluate(async () => { const ks = await caches.keys(); const n = {}; for (const k of ks) n[k] = (await (await caches.open(k)).keys()).length;
    const ld = document.getElementById('loader'); return { version: (window.SIA_VERSION || {}).v, cargador: ld ? (ld.hidden ? 'oculto' : ld.innerText.replace(/\s+/g, ' ').slice(0, 160)) : null, cachés: n,
      sw: navigator.serviceWorker.controller ? navigator.serviceWorker.controller.scriptURL.split('/').pop() : null }; }).catch(e => ({ error: e.message.split('\n')[0] }));
  return { p, cargo, err, est }; }
async function esperaCache(p, nombre) { for (let k = 0; k < 120; k++) { const r = await p.evaluate(async n => { const ks = await caches.keys(); const k = ks.find(x => !n || x === n) ; if (!k) return null; return { k, n: (await (await caches.open(k)).keys()).length, ks }; }, nombre).catch(() => null); if (r && r.n >= 17 && (!nombre || r.ks.length === 1)) return r; await new Promise(r => setTimeout(r, 500)); } return null; }
async function prueba(p) { // ¿funciona? buscar y descargar el Excel de la alcaldía
  try { await p.evaluate(() => { const s = document.getElementById('alc'); s.value = [...s.options].filter(o => o.value)[12].value; s.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(800);
    await p.$eval('#tab-dl', b => b.click()); const [d] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }).catch(() => null), p.$eval('#dl-calles', b => b.click())]); return d ? d.suggestedFilename() : 'sin descarga'; } catch (e) { return 'error: ' + e.message.split('\n')[0]; } }
(async () => {
  await new Promise(r => srv.listen(0, r)); const U = `http://localhost:${srv.address().port}/?modo=ligero`;
  const browser = await C.L.lanzar(); const ESC = (process.argv[2] || 'A,B,C').split(',');
  const nombre136 = 'calles-' + fs.readFileSync(path.join(V['1.36'], 'sw.js'), 'utf8').match(/calles-([0-9a-f]+)/)[1], nombre137 = 'calles-' + fs.readFileSync(path.join(V['1.37'], 'sw.js'), 'utf8').match(/calles-([0-9a-f]+)/)[1];
  for (const esc of ESC) {
    S.raiz = V['1.36']; S.modo = 'normal';
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'es-MX', serviceWorkers: 'allow', acceptDownloads: true });
    await C.L.sinEntrada(ctx); const guardia = await ctx.newPage();   // mantiene vivo el contexto
    let a = await abre(ctx, U); const c1 = await esperaCache(a.p, nombre136); { const x = await abre(ctx, U); a.est = x.est; await x.p.close(); }
    log(esc, '1 con red, v1.36: se guarda la copia', { caché: c1, ...a.est, errores: a.err });
    await a.p.close();
    // se publica la v1.37
    S.raiz = V['1.37'];
    await sinRed(ctx, true); let b = await abre(ctx, U); const r2 = b.cargo ? await prueba(b.p) : 'no cargó';
    log(esc, '2 sin red tras publicar la v1.37: qué abre', { cargo: b.cargo, ...b.est, excel: r2, errores: b.err.slice(0, 3) }); await b.p.close();
    await sinRed(ctx, false);
    if (esc === 'B') S.modo = 'sw404'; if (esc === 'C') S.modo = 'fallaDatos';
    let c = await abre(ctx, U); await c.p.waitForTimeout(esc === 'A' ? 0 : 1000); const c3 = esc === 'B' ? null : await esperaCache(c.p, nombre137);
    log(esc, '3 regresa la red' + (esc === 'B' ? ' (sw.js nuevo no llega)' : esc === 'C' ? ' (data.bin se corta al instalar)' : ''), { cargo: c.cargo, ...c.est, cachéNueva: c3, errores: c.err.slice(0, 3) });
    await c.p.waitForTimeout(2500); const cach = await c.p.evaluate(async () => { const n = {}; for (const k of await caches.keys()) { const c = await caches.open(k); n[k] = (await c.keys()).map(r => r.url.split('/').pop()).filter(u => /^(\?|config|data|app|$)/.test(u) || u === ''); } return n; }).catch(e => e.message);
    log(esc, '3b cachés después de regresar la red', cach); await c.p.close();
    S.modo = 'normal';
    await sinRed(ctx, true); let d = await abre(ctx, U); const r4 = d.cargo ? await prueba(d.p) : 'no cargó';
    await d.p.screenshot({ path: path.join(C.CAP, `ciclo_${esc}_4_sin_red.png`) });
    log(esc, '4 sin red otra vez: qué abre', { cargo: d.cargo, ...d.est, excel: r4, errores: d.err.slice(0, 3) }); await d.p.close(); await sinRed(ctx, false);
    log(esc, 'pedidos que llegaron al servidor estando «sin red»', { conSetOffline: S.duranteOffline.splice(0).length, conServidorCaido: S.duranteCaida.splice(0).length });
    await ctx.close();
  }
  C.guardaJSON('ciclo_version_' + MODO_RED + '.json', out); await browser.close(); srv.close();
})();
