// F2 · Si inv_007.bin falla una vez (corte de señal), ¿la capa «Espacios para plantar» se vuelve a pedir al recuperar la red?
// Uso: node f2_inventario_sin_reintento.js RUTA_A_LA_COPIA
const path = require('path'); const RAIZ = process.argv[2]; const L = require(path.join(RAIZ, '04_pruebas', 'lib_pruebas.js'));
(async () => {
  const s = await L.servidor(0, path.join(RAIZ, 'docs')); const b = await L.lanzar(); const { ctx, page } = await L.abrir(b, s.url + '?modo=ligero');
  let falla = true, pedidos = 0; await page.route(/inv_007\.bin/, r => { pedidos++; return falla ? r.abort('internetdisconnected') : r.continue(); });
  await L.elegir(page, 'Iztapalapa'); await page.evaluate(() => window.__MAPA.ir({ longitude: -99.0565, latitude: 19.3445, zoom: 16.5 }, 0)); await page.waitForTimeout(5000);
  const tras_falla = await page.evaluate(() => ({ cargadas: window.__INV.cargadas(), fallas: window.__INV.fallas(), aviso: (document.getElementById('inv-falla') || {}).textContent }));
  falla = false; // la red vuelve
  for (const dx of [0.004, -0.004, 0.002]) { await page.evaluate(d => window.__MAPA.ir({ longitude: -99.0565 + d, latitude: 19.3445, zoom: 16.8 }, 0), dx); await page.waitForTimeout(3000); }
  const tras_volver = await page.evaluate(() => ({ cargadas: window.__INV.cargadas(), fallas: window.__INV.fallas(), capas: window.__INV.capas() }));
  console.log(JSON.stringify({ pedidos_de_inv_007: pedidos, tras_falla, tras_volver }, null, 1)); await ctx.close(); await b.close(); s.close(); })().catch(e => { console.error(e); process.exit(1); });
