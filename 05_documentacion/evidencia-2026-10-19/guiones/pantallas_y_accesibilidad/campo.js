// B6 · Teléfono en campo: ubicación negada y sin respuesta, peso de la primera visita (con el proceso de servicio) y lo que funciona
// sin red después de una visita (inventario, filtro «Espacio», fondo de manzanas). Uso: node campo.js. Escribe campo.json y capturas campo_*.png.
const C = require('./comun.js'); const { L, path, fs } = C; const http = require('http');
const DOCS = path.resolve(process.env.DOCS); const S = { caido: false, bytes: [], };
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const srv = http.createServer((req, res) => { if (S.caido) { req.socket.destroy(); return; } let rel = decodeURIComponent(req.url.split('?')[0]); if (rel.endsWith('/')) rel += 'index.html';
  const ruta = path.join(DOCS, rel); if (!ruta.startsWith(DOCS) || !fs.existsSync(ruta)) { res.writeHead(404); return res.end(); }
  const st = fs.statSync(ruta); S.bytes.push({ u: req.url, b: st.size, sw: /ServiceWorker/i.test(req.headers['service-worker'] || '') || req.headers['sec-fetch-dest'] === 'serviceworker', dest: req.headers['sec-fetch-dest'] || '' });
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(ruta)] || 'application/octet-stream', 'Content-Length': st.size }); fs.createReadStream(ruta).pipe(res); });
const out = []; const log = (n, ok, det) => { out.push({ n, ok, det }); console.log(`${ok === null ? 'INFO ' : ok ? 'OK   ' : 'FALLA'} ${n} · ${typeof det === 'string' ? det : JSON.stringify(det)}`); };
const TEL = C.ANCHOS[1];
(async () => {
  await new Promise(r => srv.listen(0, r)); const U = `http://localhost:${srv.address().port}/`; const browser = await L.lanzar();
  // 1) ubicación negada (dos veces)
  for (let r = 1; r <= 2; r++) { const ctx = await C.contexto(browser, TEL, {}); await ctx.clearPermissions();
    const p = await C.pagina(ctx, U + '?modo=ligero'); await p.$eval('#ver-mapa', b => b.click()); await p.waitForTimeout(500);
    await p.evaluate(() => { navigator.geolocation.getCurrentPosition = (ok, err) => setTimeout(() => err({ code: 1, message: 'User denied Geolocation', PERMISSION_DENIED: 1 }), 50); navigator.geolocation.watchPosition = (ok, err) => { setTimeout(() => err({ code: 1, message: 'User denied Geolocation', PERMISSION_DENIED: 1 }), 50); return 1; }; });
    await p.$eval('#zloc', b => b.click()); await p.waitForTimeout(1500);
    const v = await p.evaluate(() => { const vis = e => e && !e.hidden && getComputedStyle(e).display !== 'none'; const t = [...document.querySelectorAll('#card, .aviso-mapa, [role=alert], [role=status], .toast, #loc-msg')].filter(vis).map(e => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean); return { textos: t.slice(0, 4), pulsado: document.getElementById('zloc').getAttribute('aria-pressed'), ocupado: document.getElementById('zloc').classList.contains('busy') }; });
    await p.screenshot({ path: path.join(C.CAP, `campo_ubicacion_negada_${r}.png`) });
    log(`ubicación negada (rep ${r}): hay un mensaje claro y el botón no queda «buscando»`, v.textos.some(t => /ubicaci|permis/i.test(t)) && !v.ocupado, v); await ctx.close(); }
  // 2) el GPS no responde nunca
  { const ctx = await C.contexto(browser, TEL, { geo: { latitude: 19.3745, longitude: -99.0685, accuracy: 15 } }); const p = await C.pagina(ctx, U + '?modo=ligero');
    await p.$eval('#ver-mapa', b => b.click()); await p.waitForTimeout(500);
    await p.evaluate(() => { navigator.geolocation.getCurrentPosition = () => {}; navigator.geolocation.watchPosition = () => 1; });
    await p.$eval('#zloc', b => b.click()); const t0 = Date.now(); let v;
    for (let k = 0; k < 40; k++) { await p.waitForTimeout(1000); v = await p.evaluate(() => ({ ocupado: document.getElementById('zloc').classList.contains('busy') || document.getElementById('zloc').getAttribute('aria-busy') === 'true', card: !document.getElementById('card').hidden ? document.getElementById('card').innerText.replace(/\s+/g, ' ').slice(0, 200) : null, cancelar: [...document.querySelectorAll('button')].some(b => /Cancelar/.test(b.innerText) && b.offsetParent) })); if (!v.ocupado && k > 2) break; }
    await p.screenshot({ path: path.join(C.CAP, 'campo_gps_sin_respuesta.png') });
    log('GPS sin respuesta: se avisa o se puede cancelar', v.cancelar || /no fue posible|tard|intent/i.test(v.card || ''), { ...v, segundos: Math.round((Date.now() - t0) / 1000) }); await ctx.close(); }
  // 3) primera visita en teléfono con el proceso de servicio: bytes descargados
  { S.bytes = []; const ctx = await C.contexto(browser, TEL, { sw: true }); const p = await C.pagina(ctx, U);
    await p.evaluate(async () => { await navigator.serviceWorker.ready; for (let k = 0; k < 120; k++) { const ks = await caches.keys(); if (ks.length && (await (await caches.open(ks[0])).keys()).length >= 17) return; await new Promise(r => setTimeout(r, 500)); } });
    await p.waitForTimeout(1500);
    const total = S.bytes.reduce((s, x) => s + x.b, 0); const porUrl = {}; for (const x of S.bytes) { const k = x.u.split('?')[0]; porUrl[k] = (porUrl[k] || 0) + 1; }
    const dobles = Object.entries(porUrl).filter(([, n]) => n > 1).map(([u, n]) => u + ' ×' + n); const bytesDobles = S.bytes.filter(x => porUrl[x.u.split('?')[0]] > 1).reduce((s, x) => s + x.b, 0) / 2;
    log('primera visita en teléfono: bytes que pide el navegador (página + copia sin conexión)', null, { MB: +(total / 1048576).toFixed(2), pedidos: S.bytes.length, pedidosDoblesMB: +(bytesDobles / 1048576).toFixed(2), dobles });
    // 4) sin red después de esa visita: inventario, filtro «Espacio» y manzanas del fondo
    S.caido = true; const q = await ctx.newPage(); const errs = []; q.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 120)));
    let cargo = true; try { await q.goto(U + '?a=007', { timeout: 30000 }); await q.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 60000 }); } catch (e) { cargo = false; }
    log('sin red: la herramienta abre (Iztapalapa)', cargo, '');
    if (cargo) { await q.waitForTimeout(800); await q.$eval('#ver-mapa', b => b.click()).catch(() => {}); await q.waitForTimeout(500);
      await q.evaluate(() => window.__INV ? 0 : 0);
      await q.evaluate(() => { const e = document.getElementById('zin'); for (let k = 0; k < 6; k++) e.click(); }); await q.waitForTimeout(6000);
      await q.$eval('#zcapas', b => b.click()).catch(() => {}); await q.waitForTimeout(800);
      const inv = await q.evaluate(() => { const e = document.getElementById('inv-sec'); const f = document.getElementById('inv-falla'); return { seccion: e ? e.innerText.replace(/\s+/g, ' ').slice(0, 300) : null, falla: f && !f.hidden ? f.innerText : null }; });
      await q.screenshot({ path: path.join(C.CAP, 'campo_sin_red_inventario.png') });
      log('sin red: la capa «Espacios para plantar» dice que no pudo cargar', !!inv.falla, inv);
      await q.$eval('#zcapas', b => b.click()).catch(() => {}); await q.$eval('#ver-info', b => b.click()).catch(() => {}); await q.waitForTimeout(500);
      await q.$eval('#esp-row button', b => b.click()).catch(e => errs.push('esp ' + e.message)); await q.waitForTimeout(2500);
      const esp = await q.evaluate(() => { const a = document.getElementById('esp-aviso'); return { aviso: a && !a.hidden ? a.innerText.replace(/\s+/g, ' ') : null, url: location.search, titulo: document.getElementById('scope-title').innerText }; });
      await q.screenshot({ path: path.join(C.CAP, 'campo_sin_red_filtro_espacio.png') });
      log('sin red: el filtro «Espacio» avisa que no hay datos del inventario', !!esp.aviso && /conexi|carg|no fue posible/i.test(esp.aviso), esp);
      log('sin red: errores de consola', null, errs.slice(0, 6)); }
    S.caido = false; await ctx.close(); }
  C.guardaJSON('campo.json', out); await browser.close(); srv.close();
})();
