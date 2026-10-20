// Frente 5 · B5 Robustez ante errores del sitio: lo que NO cubren prueba_robustez.js ni prueba_casos_limite.js.
// Datos .bin vacíos, truncados o con bytes cambiados (también el inventario), un inv_<cve>.bin que no llega, servidor lento,
// config.js ausente o con SIA_INVENTARIO raro y sw.js que falla.
// Uso: node sitio_b5.js <carpeta r5> [ronda]   · imprime PASA/FALLA por caso y deja capturas en ./capturas_b5_<ronda>/
const path = require('path'), fs = require('fs'), zlib = require('zlib');
const R5 = path.resolve(process.argv[2] || '.'); const RONDA = process.argv[3] || '1';
const L = require(path.join(R5, '04_pruebas', 'lib_pruebas.js'));
const CAP = path.join(__dirname, 'capturas_b5_' + RONDA); fs.mkdirSync(CAP, { recursive: true });
const bin = n => fs.readFileSync(path.join(L.DOCS, 'datos', n));
const res = []; const caso = (id, desc, obs, pasa) => { res.push({ id, desc, obs, pasa }); console.log(`${pasa ? 'PASA ' : 'FALLA'} ${id} · ${desc} · ${String(obs).replace(/\s+/g, ' ').slice(0, 260)}`); };
const TEC = /incorrect header|unexpected end|invalid|undefined|TypeError|is not defined|network error|Failed to fetch|Cannot read|null|NaN|\[object/i;
const espera = ms => new Promise(r => setTimeout(r, ms));
const flip = (b, desde, n = 24) => { const c = Buffer.from(b); for (let i = desde; i < desde + n && i < c.length; i++) c[i] ^= 0x5a; return c; };
const BORDE = { longitude: -99.0915, latitude: 19.3745 };   // Iztapalapa junto a Iztacalco y Benito Juárez

(async () => {
  const srv = await L.servidor(0); const browser = await L.lanzar(); const U = srv.url + '?modo=ligero';
  // contexto con intervención; espera a que cargue o a que aparezca el aviso con «Reintentar»
  async function abre(prep, url = U + '#nomap', op = {}) {
    const ctx = await browser.newContext({ serviceWorkers: op.sw ? 'allow' : 'block', acceptDownloads: true, locale: 'es-MX', viewport: { width: 1440, height: 900 } });
    await L.sinEntrada(ctx); await ctx.addInitScript(() => { window.SIA_PRUEBA = true; });
    const errores = []; const page = await ctx.newPage(); page.setDefaultTimeout(120000);
    page.on('pageerror', e => errores.push(e.message)); const consola = []; page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) consola.push(m.text()); });
    if (prep) await prep(page, ctx);
    const t0 = Date.now(); await page.goto(url);
    const fin = await Promise.race([page.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 150000 }).then(() => 'cargo'), page.waitForSelector('#loader .reintenta', { timeout: 150000 }).then(() => 'aviso')]).catch(() => 'nada');
    const txt = await page.$eval('#loader', l => l.hidden ? '' : l.innerText.replace(/\s+/g, ' ').trim()).catch(() => '');
    return { ctx, page, fin, txt, errores, consola, ms: Date.now() - t0 };
  }
  const cargaConFalla = async (id, desc, prep, quiere = /Reintentar/) => { const a = await abre(prep);
    await a.page.screenshot({ path: path.join(CAP, id + '.png') });
    caso(id, desc, `${a.fin} · «${a.txt.slice(0, 170)}»`, a.fin === 'aviso' && quiere.test(a.txt) && !TEC.test(a.txt)); await a.ctx.close(); return a; };

  // ======================= datos principales =======================
  await cargaConFalla('S-01', 'meta.bin vacío (0 bytes, 200): mensaje claro con Reintentar', p => p.route(/datos\/meta\.bin/, r => r.fulfill({ status: 200, contentType: 'application/octet-stream', body: Buffer.alloc(0) })));
  await cargaConFalla('S-02', 'data.bin vacío (0 bytes, 200): mensaje claro con Reintentar', p => p.route(/datos\/data\.bin/, r => r.fulfill({ status: 200, contentType: 'application/octet-stream', body: Buffer.alloc(0) })));
  await cargaConFalla('S-03', 'vp.bin con 24 bytes cambiados a la mitad del gzip', p => p.route(/datos\/vp\.bin/, r => { const b = bin('vp.bin'); r.fulfill({ status: 200, contentType: 'application/octet-stream', body: flip(b, b.length >> 1) }); }));
  await cargaConFalla('S-04', 'meta.bin con 24 bytes cambiados a la mitad del gzip', p => p.route(/datos\/meta\.bin/, r => { const b = bin('meta.bin'); r.fulfill({ status: 200, contentType: 'application/octet-stream', body: flip(b, b.length >> 1) }); }));
  await cargaConFalla('S-05', 'data.bin con la cabecera gzip dañada (primeros 2 bytes)', p => p.route(/datos\/data\.bin/, r => { const b = Buffer.from(bin('data.bin')); b[0] = 0; b[1] = 0; r.fulfill({ status: 200, contentType: 'application/octet-stream', body: b }); }));
  await cargaConFalla('S-06', 'meta.bin descomprimido por un intermediario y cortado (JSON incompleto)', p => p.route(/datos\/meta\.bin/, r => { const raw = zlib.gunzipSync(bin('meta.bin')); r.fulfill({ status: 200, contentType: 'application/octet-stream', body: raw.subarray(0, raw.length - 500) }); }));
  // data.bin descomprimido por un intermediario y con UN valor cambiado (la prioridad del primer frente): ¿se detecta?
  { const raw = Buffer.from(zlib.gunzipSync(bin('data.bin'))); let p = 0; const lee = () => { let r = 0, s = 0, b; do { b = raw[p++]; r += (b & 0x7f) * 2 ** s; s += 7; } while (b & 0x80); return r; };
    lee(); lee(); const pos = p; const antes = raw[pos]; raw[pos] = antes === 8 ? 0 : 8;   // prioridad del frente 0 (zigzag: 4 → 8)
    const D = L.decodificar(); const f0 = D.F[0]; const nueva = antes === 8 ? 0 : 4;
    const a = await abre(pg => pg.route(/datos\/data\.bin/, r => r.fulfill({ status: 200, contentType: 'application/octet-stream', body: raw })));
    let prio = null; if (a.fin === 'cargo') { await a.page.selectOption('#alc', String(f0.mun)); await a.page.waitForTimeout(800); prio = await a.page.evaluate(() => typeof window.__MAPA !== 'undefined'); }
    const est = a.fin === 'cargo' ? await L.estado(a.page) : null;
    caso('S-07', `data.bin entregado ya descomprimido con la prioridad de un frente cambiada (${f0.prio}→${nueva}): debe detectarse`, `${a.fin} · aviso=${!!a.txt} · ${est ? 'la página abrió normal y muestra cifras: ' + (est.kpis[0] || {}).v : ''}`, a.fin !== 'cargo'); await a.ctx.close(); }
  // falla pasajera: el primer pedido de data.bin responde 503 y el segundo bien → «Reintentar» recupera
  { let n = 0; const a = await abre(p => p.route(/datos\/data\.bin/, r => (n++ === 0 ? r.fulfill({ status: 503, body: '' }) : r.continue())));
    let ok2 = false; if (a.fin === 'aviso') { await a.page.click('#loader .reintenta'); ok2 = await a.page.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 150000 }).then(() => true).catch(() => false); }
    caso('S-08', 'data.bin con 503 pasajero: aviso y «Reintentar» recupera la herramienta', `${a.fin} «${a.txt.slice(0, 90)}» · tras Reintentar cargó=${ok2}`, a.fin === 'aviso' && ok2); await a.ctx.close(); }

  // ======================= servidor lento =======================
  { const a = await abre(p => p.route(/datos\/data\.bin/, async r => { await espera(10000); r.continue(); }));
    caso('S-09', 'data.bin tarda 10 s: termina de cargar sin aviso de error', `${a.fin} en ${(a.ms / 1000).toFixed(1)} s · errores JS ${a.errores.length}`, a.fin === 'cargo' && !a.errores.length); await a.ctx.close(); }
  { const a = await abre(p => p.route(/\/app\.js/, async r => { await espera(50000); r.continue(); }));
    const abrio = a.fin === 'cargo' || await a.page.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 60000 }).then(() => true).catch(() => false);
    const quedo = await a.page.evaluate(() => !!document.querySelector('#loader .lento') && !document.getElementById('loader').hidden);
    caso('S-10', 'app.js tarda 50 s: el vigía avisa (con «Reintentar») a los 45 s y la página termina de abrir sola', `${a.fin} a los ${(a.ms / 1000).toFixed(1)} s · después abrió=${abrio} · aviso de lentitud aún visible=${quedo}`, a.fin === 'aviso' && abrio && !quedo); await a.ctx.close(); }

  // ======================= config.js =======================
  await cargaConFalla('S-11', 'config.js no llega (404): mensaje claro, no pantalla en blanco', p => p.route(/\/config\.js/, r => r.fulfill({ status: 404, body: '' })), /config|configuración|Reintentar/);
  const cfg = fs.readFileSync(path.join(L.DOCS, 'config.js'), 'utf8');
  const conInv = v => p => p.route(/\/config\.js/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: cfg.replace(/window\.SIA_INVENTARIO = [^\n]*;/, 'window.SIA_INVENTARIO = ' + v + ';') }));
  const invRaro = async (id, v, desc) => { const a = await abre(conInv(v)); let extra = '';
    if (a.fin === 'cargo') { await a.page.click('#tab-res').catch(() => {}); await a.page.selectOption('#alc', '7').catch(() => {}); await a.page.waitForTimeout(800);
      await a.page.$eval('button[data-esp="0"]', b => b.click()).catch(e => { extra += ' clic: ' + e.message; }); await a.page.waitForTimeout(2500);
      extra += ' · aviso Espacio: «' + (await a.page.$eval('#esp-aviso', n => n.hidden ? '' : n.textContent).catch(() => '')) + '»'; }
    await a.page.screenshot({ path: path.join(CAP, id + '.png') });
    caso(id, desc, `${a.fin} «${a.txt.slice(0, 120)}» · errores JS ${a.errores.length}: ${a.errores.slice(0, 2).join(' | ').slice(0, 120)} · consola «${a.consola.join(' | ').slice(0, 120)}»${extra}`, a.fin === 'cargo' && a.errores.length === 0); await a.ctx.close(); };
  await invRaro('S-12', '{}', 'SIA_INVENTARIO = {} (objeto vacío): la herramienta abre y el inventario se declara no disponible');
  await invRaro('S-13', '"sin inventario"', 'SIA_INVENTARIO = "texto": la herramienta abre');
  await invRaro('S-14', JSON.stringify({ corte: 'x', v: {}, n: {}, avance: {} }), 'SIA_INVENTARIO sin fr ni vp: la herramienta abre y el filtro «Espacio» avisa');
  await invRaro('S-15', 'null', 'SIA_INVENTARIO = null: la herramienta abre sin inventario');

  // ======================= inventario por alcaldía =======================
  const invEscena = async (id, desc, prep, opt = {}) => {
    const a = await abre(prep, U, {}); if (a.fin !== 'cargo') { caso(id, desc, 'no cargó: ' + a.txt, false); await a.ctx.close(); return; }
    await a.page.waitForFunction(() => window.SIA_LISTO && window.__INV, null, { timeout: 60000 }).catch(() => {});
    await a.page.evaluate(v => window.__MAPA.ir({ ...v, zoom: 16.4 }, 0), BORDE);
    await a.page.waitForFunction(() => window.__INV.pendientes() === 0 && (window.__INV.cargadas().length + window.__INV.fallas().length) > 0, null, { timeout: 60000 }).catch(() => {});
    await a.page.waitForTimeout(1500);
    const e = await a.page.evaluate(() => ({ cargadas: window.__INV.cargadas(), fallas: window.__INV.fallas(), aviso: (n => n && !n.hidden ? n.textContent : '')(document.getElementById('inv-falla')), capas: window.__INV.capas() }));
    let reint = null;
    if (opt.reintento) { await a.page.unroute(/inventario\/inv_007/); await a.page.evaluate(v => window.__MAPA.ir({ ...v, zoom: 16.4 }, 0), { longitude: BORDE.longitude + 0.004, latitude: BORDE.latitude - 0.003 }); await a.page.waitForTimeout(4000);
      reint = await a.page.evaluate(() => ({ cargadas: window.__INV.cargadas(), fallas: window.__INV.fallas() })); }
    await a.page.screenshot({ path: path.join(CAP, id + '.png') });
    const ok = opt.juzga(e, a, reint);
    caso(id, desc, `cargadas ${e.cargadas.join(',')} · fallas ${e.fallas.join(',')} · aviso «${e.aviso}» · errores JS ${a.errores.length} ${a.errores.slice(0, 1).join('').slice(0, 100)}${reint ? ' · tras volver la red y mover el mapa: cargadas ' + reint.cargadas.join(',') + ' fallas ' + reint.fallas.join(',') : ''}`, ok);
    await a.ctx.close(); };
  const sinError = (e, a) => e.fallas.includes('007') && !!e.aviso && e.cargadas.length > 0 && a.errores.length === 0;
  await invEscena('S-16', 'inv_007.bin (Iztapalapa) responde 404 y las vecinas sí llegan: aviso y las demás se dibujan', p => p.route(/inventario\/inv_007/, r => r.fulfill({ status: 404, body: '' })), { juzga: sinError });
  await invEscena('S-17', 'inv_007.bin vacío (0 bytes)', p => p.route(/inventario\/inv_007/, r => r.fulfill({ status: 200, contentType: 'application/octet-stream', body: Buffer.alloc(0) })), { juzga: sinError });
  await invEscena('S-18', 'inv_007.bin truncado a la mitad', p => p.route(/inventario\/inv_007/, r => { const b = fs.readFileSync(path.join(L.DOCS, 'datos/inventario/inv_007.bin')); r.fulfill({ status: 200, contentType: 'application/octet-stream', body: b.subarray(0, b.length >> 1) }); }), { juzga: sinError });
  await invEscena('S-19', 'inv_007.bin con bytes cambiados (gzip)', p => p.route(/inventario\/inv_007/, r => { const b = fs.readFileSync(path.join(L.DOCS, 'datos/inventario/inv_007.bin')); r.fulfill({ status: 200, contentType: 'application/octet-stream', body: flip(b, b.length >> 1) }); }), { juzga: sinError });
  // descomprimido por un intermediario y con el tipo del primer punto cambiado a 9 (no existe)
  await invEscena('S-20', 'inv_007.bin ya descomprimido con un tipo de punto inexistente (9): no debe romper el mapa', p => p.route(/inventario\/inv_007/, r => { const raw = Buffer.from(zlib.gunzipSync(fs.readFileSync(path.join(L.DOCS, 'datos/inventario/inv_007.bin'))));
    let q = 0; const lee = () => { let v = 0, s = 0, b; do { b = raw[q++]; v += (b & 0x7f) * 2 ** s; s += 7; } while (b & 0x80); return v; }; lee(); lee(); lee(); lee(); raw[q] = 18; r.fulfill({ status: 200, contentType: 'application/octet-stream', body: raw }); }),
    { juzga: (e, a) => a.errores.length === 0 && (e.fallas.includes('007') || e.capas.length > 0) });
  await invEscena('S-21', 'inv_007.bin 404 y luego la red vuelve: al mover el mapa se vuelve a pedir', p => p.route(/inventario\/inv_007/, r => r.fulfill({ status: 404, body: '' })), { reintento: true, juzga: (e, a, r) => !!r && r.cargadas.includes('007') });
  await invEscena('S-22', 'inventario lento (10 s por archivo): sin errores y llega', p => p.route(/inventario\/inv_/, async r => { await espera(10000); r.continue(); }), { juzga: (e, a) => e.cargadas.length > 0 && a.errores.length === 0 });

  // ======================= espacios_frentes.bin y espacios_vp.bin =======================
  const espEscena = async (id, desc, prep, url = U + '&a=007#nomap', boton = 'button[data-esp="0"]') => {
    const a = await abre(prep, url); if (a.fin !== 'cargo') { caso(id, desc, 'no cargó: ' + a.txt, false); await a.ctx.close(); return; }
    const antes = await L.estado(a.page);
    await a.page.$eval(boton, b => b.click()); await a.page.waitForTimeout(400);
    const durante = await a.page.$eval('#esp-aviso', n => n.hidden ? '' : n.textContent);
    await a.page.waitForFunction(() => !/Cargando/.test(document.getElementById('esp-aviso').textContent), null, { timeout: 60000 }).catch(() => {});
    const e = await a.page.evaluate(() => ({ aviso: document.getElementById('esp-aviso').textContent, prendido: document.querySelector('button[data-esp="0"]').getAttribute('aria-pressed'), url: location.search }));
    const desp = await L.estado(a.page);
    await a.page.screenshot({ path: path.join(CAP, id + '.png') });
    const mismas = JSON.stringify(antes.kpis) === JSON.stringify(desp.kpis);
    caso(id, desc, `durante «${durante}» · después «${e.aviso}» · casilla ${e.prendido} · dirección ${e.url} · cifras sin cambio=${mismas} · errores JS ${a.errores.length}`, /No fue posible/.test(e.aviso) && e.prendido === 'false' && mismas && a.errores.length === 0);
    await a.ctx.close(); };
  const efr = () => fs.readFileSync(path.join(L.DOCS, 'datos/inventario/espacios_frentes.bin')), evp = () => fs.readFileSync(path.join(L.DOCS, 'datos/inventario/espacios_vp.bin'));
  await espEscena('S-23', 'espacios_frentes.bin vacío: el filtro «Espacio» avisa y no se queda prendido', p => p.route(/espacios_frentes\.bin/, r => r.fulfill({ status: 200, contentType: 'application/octet-stream', body: Buffer.alloc(0) })));
  await espEscena('S-24', 'espacios_frentes.bin truncado', p => p.route(/espacios_frentes\.bin/, r => r.fulfill({ status: 200, contentType: 'application/octet-stream', body: efr().subarray(0, efr().length >> 1) })));
  await espEscena('S-25', 'espacios_frentes.bin con bytes cambiados', p => p.route(/espacios_frentes\.bin/, r => r.fulfill({ status: 200, contentType: 'application/octet-stream', body: flip(efr(), efr().length >> 1) })));
  await espEscena('S-26', 'espacios_vp.bin 404 (Gobierno Central): el filtro avisa', p => p.route(/espacios_vp\.bin/, r => r.fulfill({ status: 404, body: '' })), U + '&r=gc&a=007#nomap');
  await espEscena('S-27', 'espacios_vp.bin con bytes cambiados (Gobierno Central)', p => p.route(/espacios_vp\.bin/, r => r.fulfill({ status: 200, contentType: 'application/octet-stream', body: flip(evp(), evp().length >> 1, 8) })), U + '&r=gc&a=007#nomap');
  // enlace con e=cv y el archivo dañado: la página abre y lo dice
  { const a = await abre(p => p.route(/espacios_frentes\.bin/, r => r.fulfill({ status: 200, contentType: 'application/octet-stream', body: Buffer.alloc(10) })), U + '&a=007&e=cv#nomap');
    const e = a.fin === 'cargo' ? await a.page.evaluate(() => ({ aviso: document.getElementById('esp-aviso').textContent, prendido: document.querySelector('button[data-esp="0"]').getAttribute('aria-pressed'), url: location.search, titulo: document.getElementById('scope-title').textContent })) : {};
    await a.page.screenshot({ path: path.join(CAP, 'S-28.png') });
    caso('S-28', 'enlace con e=cv y espacios_frentes.bin dañado: abre, avisa y no muestra cifras «filtradas»', `${a.fin} · ${JSON.stringify(e)} · errores JS ${a.errores.length}`, a.fin === 'cargo' && /No fue posible/.test(e.aviso || '') && e.prendido === 'false'); await a.ctx.close(); }
  // descarga con el inventario que tarda 10 s: el Excel espera y llega con las columnas
  { const a = await abre(p => p.route(/espacios_(frentes|vp)\.bin/, async r => { await espera(10000); r.continue(); }), U + '&a=011#nomap');
    await a.page.click('#tab-dl'); const t = Date.now(); let n = 0; a.page.on('download', () => n++);
    await a.page.$eval('#dl-frentes', b => { b.click(); b.click(); }); await a.page.waitForTimeout(1500); await a.page.$eval('#dl-frentes', b => b.click());
    await a.page.waitForFunction(() => /^(Descargado|No fue)/.test(document.getElementById('dl-status').textContent), null, { timeout: 120000 }).catch(() => {});
    await a.page.waitForTimeout(1500); const st = await a.page.$eval('#dl-status', s => s.textContent);
    caso('S-29', 'Excel con el inventario lento (10 s) y clics repetidos durante la espera: un solo archivo', `${n} archivo(s) en ${((Date.now() - t) / 1000).toFixed(1)} s · «${st.slice(0, 120)}»`, n === 1 && /Descargado/.test(st)); await a.ctx.close(); }
  // librería de Excel lenta: 10 s
  { const a = await abre(p => p.route(/libs\/(xlsx|excel_worker)\.js/, async r => { await espera(10000); r.continue(); }), U + '&a=011#nomap');
    await a.page.click('#tab-dl'); let n = 0; a.page.on('download', () => n++); const t = Date.now();
    await a.page.$eval('#dl-calles', b => b.click()); await a.page.waitForTimeout(3000); const durante = await a.page.$eval('#act-status', s => s.hidden ? '' : s.textContent);
    await a.page.$eval('#dl-calles', b => b.click());
    await a.page.waitForFunction(() => /^(Descargado|No fue|Descargado en CSV)/.test(document.getElementById('dl-status').textContent), null, { timeout: 120000 }).catch(() => {});
    await a.page.waitForTimeout(1500);
    caso('S-30', 'generador de Excel lento (10 s): el pie dice «Preparando…» y llega un solo archivo', `durante «${durante}» · ${n} archivo(s) en ${((Date.now() - t) / 1000).toFixed(1)} s`, /Preparando/.test(durante) && n === 1); await a.ctx.close(); }

  // ======================= sw.js =======================
  const swEscena = async (id, desc, cuerpo, estado = 200) => {
    const a = await abre(p => p.context().route(/\/sw\.js/, r => r.fulfill({ status: estado, contentType: 'application/javascript', body: cuerpo })), U + '#nomap', { sw: true });
    await a.page.waitForTimeout(2500); const e2 = await a.page.reload().then(() => a.page.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 150000 }).then(() => 'cargo')).catch(() => 'no');
    caso(id, desc, `primera ${a.fin} · recarga ${e2} · errores JS ${a.errores.length} ${a.errores.slice(0, 1).join('').slice(0, 100)}`, a.fin === 'cargo' && e2 === 'cargo' && a.errores.length === 0); await a.ctx.close(); };
  await swEscena('S-31', 'sw.js no existe (404): la herramienta abre igual y al recargar', '', 404);
  await swEscena('S-32', 'sw.js con error de sintaxis', 'this is not javascript (');
  await swEscena('S-33', 'sw.js que lanza al instalarse', "self.addEventListener('install', e => e.waitUntil(Promise.reject(new Error('x'))));");
  // proceso de servicio que guardó un data.bin cortado en la primera visita (descarga cortada con respuesta 200): ¿se recupera?
  { const ctx = await browser.newContext({ serviceWorkers: 'allow', locale: 'es-MX', viewport: { width: 1440, height: 900 } }); await L.sinEntrada(ctx); await ctx.addInitScript(() => { window.SIA_PRUEBA = true; });
    const b = bin('data.bin'); await ctx.route(/datos\/data\.bin/, r => r.fulfill({ status: 200, contentType: 'application/octet-stream', body: b.subarray(0, b.length - 4000) }));
    const page = await ctx.newPage(); await page.goto(U + '#nomap');
    const f1 = await Promise.race([page.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 150000 }).then(() => 'cargo'), page.waitForSelector('#loader .reintenta', { timeout: 150000 }).then(() => 'aviso')]).catch(() => 'nada');
    await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller !== undefined && navigator.serviceWorker.getRegistration().then(r => !!(r && r.active)), null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(4000);
    const enCache = await page.evaluate(async () => { const ks = await caches.keys(); for (const k of ks) { const c = await caches.open(k); const m = (await c.keys()).find(q => /data\.bin/.test(q.url)); if (m) return (await (await c.match(m)).arrayBuffer()).byteLength; } return null; });
    await ctx.unroute(/datos\/data\.bin/);   // la red ya entrega bien el archivo
    await page.reload(); const f2 = await Promise.race([page.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 150000 }).then(() => 'cargo'), page.waitForSelector('#loader .reintenta', { timeout: 150000 }).then(() => 'aviso')]).catch(() => 'nada');
    let f3 = null; if (f2 === 'aviso') { await page.click('#loader .reintenta'); f3 = await Promise.race([page.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 150000 }).then(() => 'cargo'), page.waitForSelector('#loader .reintenta', { timeout: 150000 }).then(() => 'aviso')]).catch(() => 'nada'); }
    await page.screenshot({ path: path.join(CAP, 'S-34.png') });
    caso('S-34', 'primera visita con data.bin cortado (200) y proceso de servicio activo; la red se arregla: al recargar o con «Reintentar» la herramienta se recupera', `1ª ${f1} · copia en caché ${enCache} bytes de ${b.length} · recarga ${f2}${f3 ? ' · Reintentar ' + f3 : ''}`, f2 === 'cargo' || f3 === 'cargo');
    await ctx.close(); }

  console.log(`\nTOTAL ${res.length} casos · ${res.filter(r => r.pasa).length} pasan · ${res.filter(r => !r.pasa).length} fallan`);
  fs.writeFileSync(path.join(__dirname, `sitio_b5_ronda${RONDA}.json`), JSON.stringify(res, null, 1));
  await browser.close(); srv.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
