// Datos dañados, incompletos o que no llegan (v1.41, bloque 5 de la auditoría del 19 de octubre de 2026; casos de sitio_b5.js):
//  · datos principales vacíos, alterados o cortados: aviso claro con «Reintentar», sin texto técnico; ya descomprimidos por un intermediario,
//    se comparan con su huella (B5-04): intactos abren, alterados no;
//  · SIA_INVENTARIO de config.js con otra forma: la herramienta abre igual, sin inventario, y lo dice (B5-01);
//  · un archivo del inventario que no llega, llega dañado o trae un tipo de punto que no existe: las demás alcaldías se dibujan, el aviso
//    distingue la conexión del archivo y «Reintentar» o el regreso de la red lo vuelven a pedir (B5-02);
//  · las manzanas del fondo «Calles»: lo mismo (B5-02).
// Uso: node 04_pruebas/prueba_datos_danados.js
const L = require('./lib_pruebas.js'); const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ok = L.Registro('datos dañados');
const bin = n => fs.readFileSync(path.join(L.DOCS, 'datos', n));
const TEC = /incorrect header|unexpected end|invalid|undefined|TypeError|is not defined|network error|Failed to fetch|Cannot read|\bnull\b|NaN|\[object/i;
const flip = (b, desde, n = 24) => { const c = Buffer.from(b); for (let i = desde; i < desde + n && i < c.length; i++) c[i] ^= 0x5a; return c; };
const BORDE = { longitude: -99.0915, latitude: 19.3745 };   // Iztapalapa (007) junto a Iztacalco y Benito Juárez
const RED = /revisa la conexión/, ARCHIVO = /llegó dañado o el servidor no lo entregó/;

(async () => {
  const srv = await L.servidor(0); const browser = await L.lanzar(); const U = srv.url + '?modo=ligero';
  // abre con una intervención y espera a que cargue o al aviso con «Reintentar»
  async function abre(prep, url = U + '#nomap') {
    const ctx = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: true, locale: 'es-MX', viewport: { width: 1440, height: 900 } });
    await L.sinEntrada(ctx); await ctx.addInitScript(() => { window.SIA_PRUEBA = true; });
    const errores = []; const page = await ctx.newPage(); page.setDefaultTimeout(120000); page.on('pageerror', e => errores.push(e.message));
    if (prep) await prep(page, ctx);
    await page.goto(url);
    const fin = await Promise.race([page.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 150000 }).then(() => 'cargo'), page.waitForSelector('#loader .reintenta', { timeout: 150000 }).then(() => 'aviso')]).catch(() => 'nada');
    const txt = await page.$eval('#loader', l => l.hidden ? '' : l.innerText.replace(/\s+/g, ' ').trim()).catch(() => '');
    return { ctx, page, fin, txt, errores }; }
  const conFalla = async (desc, prep) => { const a = await abre(prep);
    ok(desc, a.fin === 'aviso' && /Reintentar/.test(a.txt) && !TEC.test(a.txt), `${a.fin} · «${a.txt.slice(0, 170)}»`); await a.ctx.close(); };

  // ---------- datos principales ----------
  await conFalla('meta.bin vacío: aviso claro con «Reintentar»', p => p.route(/datos\/meta\.bin/, r => r.fulfill({ status: 200, contentType: 'application/octet-stream', body: Buffer.alloc(0) })));
  await conFalla('vp.bin con bytes cambiados: aviso claro con «Reintentar»', p => p.route(/datos\/vp\.bin/, r => { const b = bin('vp.bin'); r.fulfill({ status: 200, contentType: 'application/octet-stream', body: flip(b, b.length >> 1) }); }));
  await conFalla('meta.bin ya descomprimido y cortado: aviso claro con «Reintentar»', p => p.route(/datos\/meta\.bin/, r => { const raw = zlib.gunzipSync(bin('meta.bin')); r.fulfill({ status: 200, contentType: 'application/octet-stream', body: raw.subarray(0, raw.length - 500) }); }));
  { const raw = Buffer.from(zlib.gunzipSync(bin('data.bin'))); let q = 0; const lee = () => { let v = 0, s = 0, b; do { b = raw[q++]; v += (b & 0x7f) * 2 ** s; s += 7; } while (b & 0x80); return v; };
    lee(); lee(); const pos = q; const antes = raw[pos]; raw[pos] = antes === 8 ? 0 : 8;   // prioridad del primer frente (zigzag: 4 → 8)
    const a = await abre(p => p.route(/datos\/data\.bin/, r => r.fulfill({ status: 200, contentType: 'application/octet-stream', body: raw })));
    ok('data.bin ya descomprimido y con la prioridad de un frente cambiada: no coincide con su huella y no abre con cifras alteradas (B5-04)', a.fin === 'aviso' && /huella/.test(a.txt) && !TEC.test(a.txt), `${a.fin} · «${a.txt.slice(0, 170)}»`); await a.ctx.close(); }
  { const a = await abre(p => p.route(/datos\/(data|meta|vp)\.bin/, r => { const n = r.request().url().match(/datos\/(\w+)\.bin/)[1]; r.fulfill({ status: 200, contentType: 'application/octet-stream', body: zlib.gunzipSync(bin(n + '.bin')) }); }));
    ok('data, meta y vp ya descomprimidos pero intactos: abre normal (coinciden con su huella)', a.fin === 'cargo' && !a.errores.length, `${a.fin} · ${a.errores.slice(0, 1).join('')}`); await a.ctx.close(); }
  { let n = 0; const a = await abre(p => p.route(/datos\/data\.bin/, r => (n++ === 0 ? r.fulfill({ status: 503, body: '' }) : r.continue())));
    let otra = false; if (a.fin === 'aviso') { await a.page.click('#loader .reintenta'); otra = await a.page.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 150000 }).then(() => true).catch(() => false); }
    ok('data.bin con un 503 pasajero: aviso y «Reintentar» recupera la herramienta', a.fin === 'aviso' && otra, `${a.fin} · después ${otra}`); await a.ctx.close(); }

  // ---------- SIA_INVENTARIO con otra forma (B5-01) ----------
  const cfg = fs.readFileSync(path.join(L.DOCS, 'config.js'), 'utf8');
  for (const [v, desc] of [['{}', 'objeto vacío'], ['"sin inventario"', 'texto'], [JSON.stringify({ corte: 'x', v: {}, n: {}, avance: {} }), 'sin fr ni vp'], ['null', 'null']]) {
    const a = await abre(p => p.route(/\/config\.js/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: cfg.replace(/window\.SIA_INVENTARIO = [^\n]*;/, 'window.SIA_INVENTARIO = ' + v + ';') })), U + '&a=007#nomap');
    let e = {}; if (a.fin === 'cargo') e = await a.page.evaluate(() => ({ fila: !document.getElementById('esp-row').hidden, panel: document.getElementById('inv-avance').textContent, cv: [...document.querySelectorAll('#ini-orden option')].some(o => /cv$/.test(o.value)) }));
    ok(`SIA_INVENTARIO = ${desc}: la herramienta abre sin errores, sin inventario, y lo dice`, a.fin === 'cargo' && !a.errores.length && !e.fila && !e.cv && /no están disponibles en esta copia/.test(e.panel || ''), `${a.fin} · ${JSON.stringify(e).slice(0, 160)} · ${a.errores.slice(0, 1).join('')}`);
    await a.ctx.close(); }

  // ---------- inventario por alcaldía (B5-02, B5-04) ----------
  const inv007 = () => fs.readFileSync(path.join(L.DOCS, 'datos/inventario/inv_007.bin'));
  async function invEscena(desc, ruta, juzga, despues) {
    const a = await abre(p => p.route(/inventario\/inv_007/, ruta), U);
    if (a.fin !== 'cargo') { ok(desc, false, 'no cargó: ' + a.txt); await a.ctx.close(); return; }
    await a.page.waitForFunction(() => window.SIA_LISTO && window.__INV, null, { timeout: 60000 }).catch(() => {});
    await a.page.evaluate(v => window.__MAPA.ir({ ...v, zoom: 16.4 }, 0), BORDE);
    await a.page.waitForFunction(() => window.__INV.pendientes() === 0 && (window.__INV.cargadas().length + window.__INV.fallas().length) > 1, null, { timeout: 60000 }).catch(() => {});
    await a.page.waitForTimeout(800);
    const estado = () => a.page.evaluate(() => ({ cargadas: window.__INV.cargadas(), fallas: window.__INV.fallas(), aviso: (n => n && !n.hidden ? n.textContent : '')(document.getElementById('inv-falla')), boton: !!document.querySelector('#inv-falla .reintentar') }));
    const e = await estado(); let r = null;
    if (despues) { await a.page.unroute(/inventario\/inv_007/); await despues(a.page);
      await a.page.waitForFunction(() => window.__INV.cargadas().includes('007') || window.__INV.fallas().includes('007'), null, { timeout: 60000 }).catch(() => {}); await a.page.waitForTimeout(800); r = await estado(); }
    ok(desc, juzga(e, r) && !a.errores.length, `cargadas ${e.cargadas.join(',')} · fallas ${e.fallas.join(',')} · aviso «${e.aviso.slice(0, 110)}»${r ? ` · después: cargadas ${r.cargadas.join(',')} · fallas ${r.fallas.join(',')} · aviso «${r.aviso.slice(0, 40)}»` : ''} · ${a.errores.slice(0, 1).join('')}`);
    await a.ctx.close(); }
  const fallo = (re) => e => e.fallas.includes('007') && e.cargadas.length > 0 && re.test(e.aviso) && e.boton;
  await invEscena('inventario: inv_007.bin no llega (sin red): las vecinas se dibujan y el aviso habla de la conexión, con «Reintentar»', r => r.abort('internetdisconnected'), fallo(RED));
  await invEscena('inventario: inv_007.bin 404: el aviso habla del archivo, no de la conexión', r => r.fulfill({ status: 404, body: '' }), fallo(ARCHIVO));
  await invEscena('inventario: inv_007.bin con bytes cambiados: el aviso habla del archivo', r => r.fulfill({ status: 200, contentType: 'application/octet-stream', body: flip(inv007(), inv007().length >> 1) }), fallo(ARCHIVO));
  { const raw = Buffer.from(zlib.gunzipSync(inv007())); let q = 0; const lee = () => { let v = 0, s = 0, b; do { b = raw[q++]; v += (b & 0x7f) * 2 ** s; s += 7; } while (b & 0x80); return v; }; lee(); lee(); lee(); lee(); raw[q] = 18;   // tipo del primer punto: 9
    await invEscena('inventario: inv_007.bin ya descomprimido con un tipo de punto que no existe: no rompe el mapa (B5-04)', r => r.fulfill({ status: 200, contentType: 'application/octet-stream', body: raw }), fallo(ARCHIVO)); }
  await invEscena('inventario: inv_007.bin ya descomprimido e intacto: se dibuja', r => r.fulfill({ status: 200, contentType: 'application/octet-stream', body: zlib.gunzipSync(inv007()) }), e => e.cargadas.includes('007') && !e.fallas.length);
  await invEscena('inventario: tras una falla, «Reintentar» lo vuelve a pedir, se dibuja y el aviso se quita', r => r.abort('internetdisconnected'), (e, r) => e.fallas.includes('007') && !!r && r.cargadas.includes('007') && !r.fallas.length && !r.aviso,
    p => p.$eval('#inv-falla .reintentar', b => b.click()));
  await invEscena('inventario: tras una falla, al volver la red se vuelve a pedir solo', r => r.abort('internetdisconnected'), (e, r) => e.fallas.includes('007') && !!r && r.cargadas.includes('007') && !r.fallas.length,
    p => p.evaluate(() => window.dispatchEvent(new Event('online'))));

  // ---------- manzanas del fondo «Calles» (B5-02) ----------
  { const a = await abre(p => p.route(/fondo\/fondo_mz_007/, r => r.abort('internetdisconnected')), U);
    await a.page.waitForFunction(() => window.SIA_LISTO && window.__MAPA, null, { timeout: 60000 }).catch(() => {});
    await a.page.evaluate(v => window.__MAPA.ir({ ...v, zoom: 15 }, 0), BORDE);
    await a.page.waitForFunction(() => !document.getElementById('fondo-note').hidden && window.__MAPA.capas().some(id => id.startsWith('fondo-mz-')), null, { timeout: 60000 }).catch(() => {});
    const aviso = () => a.page.evaluate(() => (n => n && !n.hidden ? n.textContent : '')(document.getElementById('fondo-note')));
    const t1 = await aviso(), c1 = await a.page.evaluate(() => window.__MAPA.capas().filter(id => id.startsWith('fondo-mz-')));
    await a.page.unroute(/fondo\/fondo_mz_007/); await a.page.$eval('#fondo-note .reintentar', b => b.click()).catch(() => {});
    await a.page.waitForFunction(() => window.__MAPA.capas().includes('fondo-mz-007'), null, { timeout: 60000 }).catch(() => {}); await a.page.waitForTimeout(500);
    const t2 = await aviso(), c2 = await a.page.evaluate(() => window.__MAPA.capas().filter(id => id.startsWith('fondo-mz-')));
    ok('fondo «Calles»: si las manzanas de una alcaldía no llegan, el aviso habla de la conexión con «Reintentar»; al tocarlo se dibujan y el aviso se quita',
      RED.test(t1) && !c1.includes('fondo-mz-007') && c2.includes('fondo-mz-007') && !t2 && !a.errores.length, `antes «${t1.slice(0, 80)}» ${c1.join(',')} · después «${t2}» ${c2.join(',')}`);
    await a.ctx.close(); }

  await browser.close(); srv.close(); process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
