// Preparación para el SIA (Fase 2): la herramienta instalada en la subruta /calles-prioritarias/, detrás de un servidor que
// aplica una política de seguridad de contenido (CSP) estricta y las cabeceras de caché de 08_entrega_sia/. Comprueba que
// todo funcione sin ninguna violación de la política, que la dirección sin barra final redirija bien, que una sesión vencida
// se reconozca y que los archivos de datos lleguen aunque un proxy los haya descomprimido.
// Uso: node 04_pruebas/prueba_servidor_sia.js   · termina con código ≠ 0 si algo falla.
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib');
const L = require('./lib_pruebas.js');
const ok = L.Registro('servidor del SIA'); const SAL = process.env.SALIDA || fs.mkdtempSync(path.join(os.tmpdir(), 'sia-'));
const PRE = '/calles-prioritarias/';
// La misma política que propone 08_entrega_sia/nginx_calles_prioritarias.conf.ejemplo (se lee de ahí para que no diverjan)
const conf = fs.readFileSync(path.join(__dirname, '..', '08_entrega_sia', 'nginx_calles_prioritarias.conf.ejemplo'), 'utf8');
const CSP = (conf.match(/add_header Content-Security-Policy "([^"]+)"/) || [])[1];
// Las reglas de caché del ejemplo (map "$uri|$arg_v"), también leídas de ahí: la primera expresión que coincide decide
const MAPA = (() => { const b = (conf.match(/map "\$uri\|\$arg_v" \$calles_cache \{([\s\S]*?)\n\}/) || [])[1] || ''; const reglas = []; let def = null;
  for (const l of b.split('\n')) { const m = l.match(/^\s*"~(.+?)"\s+"([^"]+)";/); if (m) reglas.push([new RegExp(m[1]), m[2]]); const d = l.match(/^\s*default\s+"([^"]+)";/); if (d) def = d[1]; }
  return { reglas, def }; })();
const cacheDe = (uri, v) => { const k = uri + '|' + (v || ''); const r = MAPA.reglas.find(([re]) => re.test(k)); return r ? r[1] : MAPA.def; };
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.bin': 'application/octet-stream' };
// modo: normal | sesion401 (datos y librerías responden 401) | login200 (responden la página de inicio de sesión con 200) | descomprime (los .bin llegan ya descomprimidos)
function servidor(modo) { const pedidas = [];
  const s = http.createServer((req, res) => { const u = req.url.split('?')[0]; pedidas.push(req.url);
    if (u === PRE.slice(0, -1)) { res.writeHead(301, { Location: PRE + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '') }); return res.end(); }   // como la regla del ejemplo: redirección relativa
    if (!u.startsWith(PRE)) { res.writeHead(404); return res.end(); }
    const rel = decodeURIComponent(u.slice(PRE.length)) || 'index.html'; const ruta = path.join(L.DOCS, rel);
    if (!ruta.startsWith(L.DOCS) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) { res.writeHead(404); return res.end(); }
    const protegido = /\.bin$|libs\/(xlsx|jspdf)\.js$/.test(rel);
    if (modo === 'sesion401' && protegido) { res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end('<html><body>No autorizado</body></html>'); }
    if (modo === 'login200' && protegido) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end('<html><body><form>Inicia sesión</form></body></html>'); }
    const v = new URLSearchParams(req.url.split('?')[1] || '').get('v');
    const cab = { 'Content-Type': TIPOS[path.extname(ruta)] || 'application/octet-stream', 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Cache-Control': cacheDe(PRE + rel, v) };
    if (modo === 'descomprime' && rel.endsWith('.bin')) { res.writeHead(200, cab); return res.end(zlib.gunzipSync(fs.readFileSync(ruta))); }
    res.writeHead(200, cab); fs.createReadStream(ruta).pipe(res); });
  return new Promise(r => s.listen(0, () => { s.url = `http://localhost:${s.address().port}`; s.pedidas = pedidas; r(s); })); }
const TESELA = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

(async () => {
  ok('el ejemplo de nginx declara una política de seguridad de contenido sin estilos ni programas en línea', !!CSP && !/unsafe-inline|unsafe-eval'/.test(CSP.replace(/'wasm-unsafe-eval'/g, '')), (CSP || '').slice(0, 90));
  // ---------- 0) caché: la página nunca queda guardada; los archivos con huella, un año ----------
  { const srv = await servidor('normal'); const cc = async u => (await fetch(srv.url + PRE + u)).headers.get('cache-control');
    const lib = (fs.readFileSync(path.join(L.DOCS, 'index.html'), 'utf8').match(/app\.js\?v=([0-9a-f]+)/) || [])[1] || 'x';
    const c = { pagina: await cc(''), avenida: await cc('?a=09&v=123&r=gc'), index: await cc('index.html?v=123'), sw: await cc('sw.js'), app: await cc('app.js?v=' + lib), datos: await cc('datos/data.bin?v=' + lib) };
    ok('el ejemplo de nginx trae las reglas de caché por ruta y huella', MAPA.reglas.length >= 3 && !!MAPA.def, `${MAPA.reglas.length} reglas`);
    ok('la página se revalida siempre, también un enlace compartido de avenida (?v= es la avenida, no una huella)', [c.pagina, c.avenida, c.index, c.sw].every(x => x === 'no-cache'), `página ${c.pagina} · avenida ${c.avenida} · index ${c.index} · sw ${c.sw}`);
    ok('programas y datos con huella se guardan un año', [c.app, c.datos].every(x => /max-age=31536000/.test(x || '')), `app ${c.app} · datos ${c.datos}`);
    srv.close(); }

  const browser = await L.lanzar(); const errores = [];
  const abre = async (srv, url, espera = true) => { const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 }, locale: 'es-MX', serviceWorkers: 'block' }); await L.sinEntrada(ctx);
    await ctx.addInitScript(() => { window.SIA_PRUEBA = true; window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ← ' + (e.blockedURI || 'en línea') + (e.sourceFile ? ' @' + String(e.sourceFile).split('/').pop() + ':' + e.lineNumber : ''))); });
    const page = await ctx.newPage(); page.setDefaultTimeout(240000); page.on('pageerror', e => errores.push(e.message));
    await page.route(u => !['localhost'].includes(u.hostname), r => r.fulfill({ status: 200, contentType: 'image/png', body: TESELA }));   // teselas de fondo simuladas
    await page.goto(srv.url + url); if (espera) { await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(500); } return { ctx, page }; };

  // ---------- 1) recorrido completo bajo la política estricta ----------
  { const srv = await servidor('normal'); const { page, ctx } = await abre(srv, PRE.slice(0, -1) + '?modo=ligero');   // se entra SIN la barra final
    ok('H-015 la dirección sin barra final redirige a la subruta y la herramienta carga', page.url().includes(PRE) && srv.pedidas.filter(p => !p.startsWith(PRE.slice(0, -1))).length === 0, page.url().replace(srv.url, ''));
    await L.elegir(page, 'iztapalapa'); await page.waitForTimeout(1500);
    const f = {}; f.alcaldia = (await page.$eval('#scope-title', e => e.innerText)) === 'Iztapalapa';
    const estilo = await page.evaluate(() => { const g = s => { const e = document.querySelector(s); return e ? getComputedStyle(e) : null; }; const b = g('#bars .fill'), l = g('#legend-rows .row i'), o = [...document.querySelectorAll('#tp-dl .btn[hidden]')];
      return { barra: b ? parseFloat(b.width) : 0, leyenda: l ? l.backgroundColor : '', ocultos: o.filter(x => getComputedStyle(x).display !== 'none').length, cuerpo: getComputedStyle(document.body).margin }; });
    f.barras = estilo.barra > 20; f.leyenda = !/rgba\(0, 0, 0, 0\)|transparent/.test(estilo.leyenda); f.ocultos = estilo.ocultos === 0;
    await L.clic(page, '#tab-list'); await page.evaluate(() => document.querySelector('#results li[tabindex]').click()); await page.waitForTimeout(1500);
    f.tramos = await page.evaluate(() => { const t = document.querySelector('#tramos li[tabindex]'); if (!t) return false; t.click(); return true; }); await page.waitForTimeout(800);
    f.ficha = await page.evaluate(() => { const c = document.getElementById('card'); const d = c.querySelector('.pill i'); return !c.hidden && !!d && !/rgba\(0, 0, 0, 0\)/.test(getComputedStyle(d).backgroundColor); });
    await page.keyboard.press('Escape');
    await L.clic(page, '#zcapas'); await page.evaluate(() => { if (!document.querySelector('.legend').classList.contains('open')) document.getElementById('zcapas').click(); }); await page.$eval('.seg.fondo button[data-fondo="calles"]', b => b.click()); await page.waitForTimeout(3000);
    await page.$eval('.seg.fondo button[data-fondo="sat"]', b => b.click()); await page.waitForTimeout(3000); f.fondo = (await page.$eval('#attrib', e => e.innerText)).includes('Esri');
    await page.$eval('.seg.fondo button[data-fondo="no"]', b => b.click());
    await L.elegir(page, 'iztapalapa');
    const x = await L.descargar(page, '#dl-calles', SAL, 180000); f.excel = !!x && /\.xlsx$/.test(x.nombre) && x.bytes > 5000;
    const g = await L.descargar(page, '#dl-frentes', SAL, 240000); f.excelGrande = !!g && g.bytes > 1000000;
    const p = await L.descargar(page, '#dl-ficha-alc', SAL, 180000); f.pdf = !!p && /\.pdf$/.test(p.nombre) && p.bytes > 20000;
    await L.clic(page, '#open-info'); await page.waitForTimeout(500); f.ayuda = await page.evaluate(() => { const i = document.querySelector('.scale-bar i'); return !document.getElementById('info-modal').hidden && !!i && !/rgba\(0, 0, 0, 0\)/.test(getComputedStyle(i).backgroundColor); }); await page.keyboard.press('Escape'); await page.waitForTimeout(600);
    await L.clic(page, '#zloc'); await page.waitForTimeout(1500); f.ubicacion = await page.evaluate(() => !document.getElementById('card').hidden);
    const mal = Object.entries(f).filter(([, v]) => !v).map(([k]) => k);
    ok(`H-001 bajo la política estricta funcionan las ${Object.keys(f).length} funciones revisadas`, mal.length === 0, mal.join(', ') || Object.keys(f).join(', '));
    const v = await page.evaluate(() => window.__csp); const res = {}; v.forEach(x => { const k = x.replace(/:\d+$/, ''); res[k] = (res[k] || 0) + 1; });
    ok('H-001 ninguna violación de la política de seguridad de contenido en todo el recorrido', v.length === 0, `${v.length} · ` + Object.entries(res).slice(0, 6).map(([k, n]) => `${n}× ${k}`).join(' | '));
    const html = fs.readFileSync(path.join(L.DOCS, 'index.html'), 'utf8');
    ok('H-001 la página no trae bloques <style> ni atributos style', !/<style/.test(html) && !/\sstyle="/.test(html), `${(html.match(/<style/g) || []).length} bloques · ${(html.match(/\sstyle="/g) || []).length} atributos`);
    const app = fs.readFileSync(path.join(L.DOCS, 'app.js'), 'utf8');
    ok('H-001 el programa no inserta atributos style ni usa cssText', !/style="/.test(app) && !/cssText/.test(app) && !/cssText/.test(fs.readFileSync(path.join(L.DOCS, 'config.js'), 'utf8')), `${(app.match(/style="/g) || []).length} patrones`);
    ok('H-060 las librerías de Excel y PDF se piden con huella de versión', srv.pedidas.filter(q => /libs\/(xlsx|jspdf|excel_worker)\.js/.test(q)).every(q => /\?v=[0-9a-f]{10}/.test(q)) && srv.pedidas.some(q => /libs\/jspdf\.js\?v=/.test(q)), srv.pedidas.filter(q => /libs\/(xlsx|jspdf|excel_worker)/.test(q)).map(q => q.split('/').pop()).join(' '));
    ok('H-098 los enlaces a terceros no envían la dirección de la consulta', await page.evaluate(() => [...document.querySelectorAll('a[target="_blank"]')].every(a => /noreferrer/.test(a.rel))));
    await ctx.close(); srv.close(); }

  // ---------- 2) sesión vencida ----------
  for (const [modo, nombre] of [['sesion401', 'el servidor responde 401'], ['login200', 'el servidor responde la página de inicio de sesión']]) {
    const srv = await servidor(modo); const { page, ctx } = await abre(srv, PRE + '?modo=ligero', false);
    await page.waitForSelector('#loader .reintenta, #loader [role=alert]', { timeout: 120000 }).catch(() => {});
    const t = await page.$eval('#loader', l => l.innerText.replace(/\s+/g, ' '));
    ok(`H-014 al cargar, si ${nombre}, se dice que la sesión terminó (no «revisa tu conexión»)`, /sesión/i.test(t) && !/conexión|incorrect|header/i.test(t), t.slice(0, 110));
    await ctx.close(); srv.close(); }
  { // sesión que vence a media consulta: la página ya cargó y las librerías de descarga responden 401
    const srv = await servidor('normal'); const { page, ctx } = await abre(srv, PRE + '?modo=ligero'); await L.elegir(page, 'iztapalapa');
    await page.route(/libs\/(jspdf|xlsx|excel_worker)\.js/, r => r.fulfill({ status: 401, contentType: 'text/html', body: '<html>No autorizado</html>' }));
    await page.$eval('#dl-ficha-alc', b => b.click()); await page.waitForTimeout(4000);
    const t1 = await page.$eval('#dl-status', e => e.innerText);
    ok('H-014 con la sesión vencida, la ficha PDF avisa que la sesión terminó', /sesión/i.test(t1), t1.slice(0, 100));
    const desc = []; page.on('download', d => desc.push(d.suggestedFilename())); await page.$eval('#dl-calles', b => b.click()); await page.waitForTimeout(6000);
    const t2 = await page.$eval('#dl-status', e => e.innerText);
    ok('H-014 con la sesión vencida, el Excel no se sustituye por CSV: avisa que la sesión terminó', /sesión/i.test(t2) && desc.length === 0, `${t2.slice(0, 80)} · descargas: ${desc.join(', ') || 'ninguna'}`);
    await ctx.close(); srv.close(); }

  // ---------- 3) un proxy entrega los .bin ya descomprimidos ----------
  { const srv = await servidor('descomprime'); const { page, ctx } = await abre(srv, PRE + '?modo=ligero'); await L.elegir(page, 'iztapalapa');
    ok('H-061 si un proxy entrega los datos ya descomprimidos, la herramienta carga igual', (await page.$eval('#scope-title', e => e.innerText)) === 'Iztapalapa' && /3,389/.test(await page.$eval('#mapsum', e => e.innerText)));
    await ctx.close(); srv.close(); }

  ok('sin errores de JavaScript durante la prueba', errores.length === 0, errores.slice(0, 2).join(' | '));
  await browser.close(); process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
