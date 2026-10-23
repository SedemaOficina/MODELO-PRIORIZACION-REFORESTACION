// Instalación en el SIA: la herramienta instalada en la subruta /priorizacion-reforestacion/, detrás de un servidor que
// aplica una política de seguridad de contenido (CSP) estricta y las cabeceras de caché de 08_entrega_sia/. Comprueba que
// todo funcione sin ninguna violación de la política, que la dirección sin barra final redirija bien, que una sesión vencida
// se reconozca y que los archivos de datos lleguen aunque un proxy los haya descomprimido. Revisa también las rutas de la
// fase 2 del ejemplo de nginx: herramienta con auth_request; acceso (/priorizacion-reforestacion/acceso/) y API
// (/priorizacion-reforestacion/api/ → /api/priorizacion-reforestacion/ del backend) sin él, bajo la ruta de la cookie.
// Uso: node 04_pruebas/prueba_servidor_sia.js   · termina con código ≠ 0 si algo falla.
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib');
const L = require('./lib_pruebas.js');
const ok = L.Registro('servidor del SIA'); const SAL = process.env.SALIDA || fs.mkdtempSync(path.join(os.tmpdir(), 'sia-'));
const PRE = '/priorizacion-reforestacion/';
// La misma política que propone 08_entrega_sia/nginx_priorizacion_reforestacion.conf.ejemplo (se lee de ahí para que no diverjan)
// (con fin de línea de Windows, «.» no pasa por el \r y los comentarios al final de una línea no se quitarían)
const conf = fs.readFileSync(path.join(__dirname, '..', '08_entrega_sia', 'nginx_priorizacion_reforestacion.conf.ejemplo'), 'utf8').replace(/\r\n/g, '\n');
const CSP = (conf.match(/add_header Content-Security-Policy "([^"]+)"/) || [])[1];
// Las reglas de caché del ejemplo (map "$uri|$arg_v"), también leídas de ahí: la primera expresión que coincide decide
const MAPA = (() => { const b = (conf.match(/map "\$uri\|\$arg_v" \$priorizacion_reforestacion_cache \{([\s\S]*?)\n\}/) || [])[1] || ''; const reglas = []; let def = null;
  for (const l of b.split('\n')) { const m = l.match(/^\s*"~(.+?)"\s+"([^"]+)";/); if (m) reglas.push([new RegExp(m[1]), m[2]]); const d = l.match(/^\s*default\s+"([^"]+)";/); if (d) def = d[1]; }
  return { reglas, def }; })();
const cacheDe = (uri, v) => { const k = uri + '|' + (v || ''); const r = MAPA.reglas.find(([re]) => re.test(k)); return r ? r[1] : MAPA.def; };
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.bin': 'application/octet-stream' };
// modo: normal | sesion401 (datos y librerías responden 401) | login200 (responden la página de inicio de sesión con 200) | descomprime (los .bin llegan ya descomprimidos)
//       | sesion (config.js con las direcciones de la sesión, como el paquete del SIA: «Mi cuenta»)
const SESION_SIA = { inicio: PRE + 'acceso/', cierre: PRE + 'api/salir', uso: PRE + 'api/uso' };
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
    if (modo === 'sesion' && rel === 'config.js') { res.writeHead(200, cab); return res.end(fs.readFileSync(ruta, 'utf8').replace(/window\.SIA_SESION = \{[^;]*\};/, 'window.SIA_SESION = ' + JSON.stringify(SESION_SIA) + ';')); }
    res.writeHead(200, cab); fs.createReadStream(ruta).pipe(res); });
  return new Promise(r => s.listen(0, () => { s.url = `http://localhost:${s.address().port}`; s.pedidas = pedidas; r(s); })); }
// Fase 2 (inicio de sesión): los bloques location del ejemplo de nginx (van comentados) y cuál atiende cada dirección,
// con la regla de nginx: primero la coincidencia exacta (=), después el prefijo más largo.
const FASE2 = (() => { const i = conf.indexOf('# FASE 2'); if (i < 0) return [];
  const lineas = conf.slice(i).split('\n').map(l => l.replace(/^#( |$)/, '').replace(/^\s*#.*$/, '').replace(/\s#.*$/, '')).filter(l => /[{};]\s*$/.test(l));
  const bloques = []; let prof = 0, actual = null;
  for (const l of lineas) { const m = l.match(/^\s*location\s+(=|\^~|~\*?)?\s*(\S+)\s*\{\s*$/);
    if (m && prof === 0) { actual = { mod: m[1] || '', ruta: m[2], cuerpo: [] }; bloques.push(actual); prof = 1; continue; }
    if (/\{\s*$/.test(l)) prof++;
    if (/^\s*\}\s*$/.test(l) && --prof === 0) { actual = null; continue; }
    if (actual) actual.cuerpo.push(l.trim()); }
  return bloques; })();
const atiende = uri => FASE2.find(b => b.mod === '=' && b.ruta === uri)
  || FASE2.filter(b => (b.mod === '' || b.mod === '^~') && uri.startsWith(b.ruta)).sort((a, b) => b.ruta.length - a.ruta.length)[0] || null;
const directiva = (b, nombre) => ((b && b.cuerpo.find(l => l.startsWith(nombre + ' '))) || '').replace(/^\S+\s+/, '').replace(/;$/, '');
// la ruta a la que nginx pasa la petición en el backend (proxy_pass con ruta: sustituye el prefijo de la location)
const rutaBackend = (b, uri) => { const d = directiva(b, 'proxy_pass'); if (!d) return null; const r = d.replace(/^https?:\/\/[^/]+/, '');
  return b.mod === '=' ? r : r + uri.slice(b.ruta.length); };
const TESELA = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

(async () => {
  ok('el ejemplo de nginx declara una política de seguridad de contenido sin estilos ni programas en línea', !!CSP && !/unsafe-inline|unsafe-eval'/.test(CSP.replace(/'wasm-unsafe-eval'/g, '')), (CSP || '').slice(0, 90));

  // ---------- Fase 2: todo bajo /priorizacion-reforestacion/ (la cookie lleva esa ruta), acceso y API sin auth_request ----------
  { const RAIZ = path.join(__dirname, '..'), lee = r => fs.readFileSync(path.join(RAIZ, ...r.split('/')), 'utf8');
    const rutas = lee('08_entrega_sia/login/backend/src/modulos/priorizacion-reforestacion/rutas.ts');
    const op = k => (rutas.match(new RegExp(`^\\s*${k}: "([^"]+)"`, 'm')) || [])[1];
    const HERR = op('rutaHerramienta'), ACCESO = op('rutaAcceso'), API = op('rutaApi');
    ok('el módulo pone la pantalla de acceso y su API bajo la ruta de la herramienta, que es la ruta de la cookie',
      HERR === PRE && ACCESO === PRE + 'acceso/' && API === PRE + 'api/' && /Path=\$\{o\.rutaHerramienta\}/.test(rutas), `${HERR} · ${ACCESO} · ${API}`);
    const herr = atiende(PRE), sesion = FASE2.find(b => b.mod === '=' && b.ruta === directiva(herr, 'auth_request'));
    const malHerr = [PRE, PRE + 'index.html', PRE + 'datos/data.bin', PRE + 'libs/xlsx.js', PRE + 'accesorios.js'].filter(u => atiende(u) !== herr || !directiva(atiende(u), 'auth_request'));
    ok('nginx (fase 2): la herramienta, con auth_request a una consulta interna del módulo', !!herr && !malHerr.length && !!sesion && sesion.cuerpo.includes('internal;')
      && rutaBackend(sesion, sesion.ruta) === '/api/priorizacion-reforestacion/sesion', malHerr.join(', ') || directiva(sesion, 'proxy_pass'));
    const acc = ['acceso/', 'acceso/admin/', 'acceso/aviso-de-privacidad.html', 'acceso/recursos/acceso.js'].map(u => atiende(PRE + u));
    ok('nginx (fase 2): la pantalla de acceso, el panel y el aviso, públicos (sin auth_request) y ganan a la herramienta',
      acc.every(b => b && b.ruta === ACCESO && b.mod === '^~' && !directiva(b, 'auth_request') && /acceso-priorizacion-reforestacion\/$/.test(directiva(b, 'alias'))),
      acc.map(b => b ? `${b.mod} ${b.ruta}` : 'ninguna').join(' | '));
    const api = ['api/entrar', 'api/sesion', 'api/salir', 'api/uso', 'api/admin/usuarios/masiva'].map(u => [u, atiende(PRE + u)]);
    const malApi = api.filter(([u, b]) => !b || directiva(b, 'auth_request') || rutaBackend(b, PRE + u) !== '/api/priorizacion-reforestacion/' + u.slice(4));
    ok('nginx (fase 2): /priorizacion-reforestacion/api/… llega al módulo montado en /api/priorizacion-reforestacion/, sin auth_request',
      !malApi.length && !!atiende(PRE + 'api/sesion').cuerpo.includes('absolute_redirect off;'), malApi.map(([u, b]) => `${u} → ${b ? rutaBackend(b, PRE + u) : 'ninguna'}`).join(', ') || 'las 5 direcciones');
    ok('nginx (fase 2): trae comentada la línea opcional limit_req zone=auth para el inicio de sesión', /#\s*limit_req zone=auth\b/.test(conf.slice(conf.indexOf('# FASE 2'))) && atiende(PRE + 'api/entrar').ruta === PRE + 'api/entrar');
    const nombrada = FASE2.find(b => b.ruta.startsWith('@')), ret = directiva(nombrada, 'return');
    ok('nginx (fase 2): la página sin sesión va a la pantalla de acceso con dirección relativa', ret.startsWith('302 ' + ACCESO + '?volver=') && nombrada.cuerpo.includes('absolute_redirect off;'), ret);
    // B9-01: con sesión, lo protegido no se marca «public» (un intermediario compartido lo entregaría a otra persona sin sesión)
    const mapaSesion = (conf.match(/map \$priorizacion_reforestacion_cache \$priorizacion_reforestacion_cache_sesion \{([\s\S]*?)\n\}/) || [])[1] || '';
    const cacheHerr = herr ? herr.cuerpo.filter(l => /^add_header Cache-Control /.test(l)) : [];
    ok('nginx (fase 2): la herramienta protegida se guarda como «private» (no «public»); la página sigue sin guardarse',
      /^\s*default\s+"private, max-age=31536000, immutable";/m.test(mapaSesion) && /^\s*"no-cache"\s+"no-cache";/m.test(mapaSesion) && !/public/.test(mapaSesion)
      && cacheHerr.length === 1 && cacheHerr[0] === 'add_header Cache-Control $priorizacion_reforestacion_cache_sesion always;', cacheHerr.join(' | ') || 'sin Cache-Control en la herramienta protegida');
    // lo aprendido del tablero de Categorías de protección ambiental, ya instalado en el SIA (v1.45): página propia si el módulo no
    // responde, las cabeceras del dominio con el mismo include y sin HSTS en el fragmento, y la lista de intermediarios del SIA
    // dos veces en 2-bis: en el bloque y en el de la página, que va dentro (un bloque con error_page no hereda los del padre)
    const SIN_SERVICIO = 'error_page 500 502 503 504 ' + ACCESO + 'sin-servicio.html;', destino = atiende(ACCESO + 'sin-servicio.html');
    const veces5xx = herr ? herr.cuerpo.filter(l => l === SIN_SERVICIO).length : 0;
    ok('nginx (fase 2): si el módulo no responde (auth_request da 500), una página propia, pública y que sí viene en el paquete',
      veces5xx === 2 && !!destino && destino.ruta === ACCESO && !directiva(destino, 'auth_request')
      && fs.existsSync(path.join(RAIZ, '08_entrega_sia', 'login', 'acceso', 'sin-servicio.html')), `${veces5xx} de 2 error_page 5xx en 2-bis · atiende ${destino ? destino.ruta : 'ninguna'}`);
    const INC = 'include snippets/sia-cabeceras-servidor*.conf;', fase1 = conf.slice(0, conf.indexOf('# FASE 2')).split('\n').filter(l => !/^\s*#/.test(l)).map(l => l.trim());
    ok('nginx: las cabeceras del dominio se repiten con el include del SIA en cada bloque con add_header, y el fragmento no trae HSTS',
      fase1.filter(l => l === INC).length === fase1.filter(l => l.startsWith('add_header Cache-Control ')).length && fase1.includes(INC)
      && atiende(ACCESO).cuerpo.includes(INC) && !/^[#\s]*add_header\s+Strict-Transport-Security/mi.test(conf),
      `${fase1.filter(l => l === INC).length} include en la fase 1 · acceso: ${atiende(ACCESO).cuerpo.includes(INC) ? 'sí' : 'no'}`);
    const procedencia = lee('08_entrega_sia/login/backend/src/comun/procedencia.ts');
    ok('la IP de origen sigue el criterio del SIA (SIA_PROXIES_CONFIABLES) en el sustituto de pruebas, el ejemplo de nginx y la lista de verificación',
      /process\.env\.SIA_PROXIES_CONFIABLES/.test(procedencia) && conf.includes('SIA_PROXIES_CONFIABLES') && lee('08_entrega_sia/LISTA_DE_VERIFICACION.md').includes('SIA_PROXIES_CONFIABLES'));
    const emp = lee('08_entrega_sia/empaquetar.py'), def = k => (emp.match(new RegExp(`setdefault\\('${k}', '([^']+)'\\)`)) || [])[1];
    const uti = lee('02_fuente/js/01_utilidades.js'), usoJs = (uti.match(/SESION\.inicio \? '([^']+)'/) || [])[1];
    const pags = lee('08_entrega_sia/login/acceso/recursos/acceso.js') + lee('08_entrega_sia/login/acceso/recursos/admin.js') + lee('08_entrega_sia/login/acceso/admin/index.html');
    ok('paquete, herramienta y páginas de acceso usan las mismas direcciones que el módulo',
      def('SIA_SESION_INICIO') === ACCESO && def('SIA_SESION_CIERRE') === API + 'salir' && def('SIA_SESION_USO') === API + 'uso' && usoJs === API + 'uso'
      && pags.includes(`'${API}'`) && pags.includes(`href="${API}salir"`) && !/\/api\/priorizacion-reforestacion|\/acceso\/priorizacion-reforestacion/.test(pags),
      `inicio ${def('SIA_SESION_INICIO')} · cierre ${def('SIA_SESION_CIERRE')} · uso ${def('SIA_SESION_USO')} · herramienta ${usoJs}`); }
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
    ok('la dirección sin barra final redirige a la subruta y la herramienta carga', page.url().includes(PRE) && srv.pedidas.filter(p => !p.startsWith(PRE.slice(0, -1))).length === 0, page.url().replace(srv.url, ''));
    await L.elegir(page, 'iztapalapa'); await page.waitForTimeout(1500);
    const f = {}; f.alcaldia = (await page.$eval('#scope-title', e => e.innerText)) === 'Iztapalapa';
    const estilo = await page.evaluate(() => { const g = s => { const e = document.querySelector(s); return e ? getComputedStyle(e) : null; }; const b = g('#bars .fill'), l = g('#legend-rows .row i'), o = [...document.querySelectorAll('#tp-dl .btn[hidden]')];
      return { barra: b ? parseFloat(b.width) : 0, leyenda: l ? l.backgroundColor : '', ocultos: o.filter(x => getComputedStyle(x).display !== 'none').length, cuerpo: getComputedStyle(document.body).margin }; });
    f.barras = estilo.barra > 20; f.leyenda = !/rgba\(0, 0, 0, 0\)|transparent/.test(estilo.leyenda); f.ocultos = estilo.ocultos === 0;
    await L.clic(page, '#tab-ini'); await page.selectOption('#ini-orden', 'calles'); await page.waitForTimeout(400); await page.evaluate(() => document.querySelector('#ini-list li .fila').click()); await page.waitForTimeout(1500);
    f.tramos = await page.evaluate(() => { const t = document.querySelector('#tramos li .fila'); if (!t) return false; t.click(); return true; }); await page.waitForTimeout(800);
    f.ficha = await page.evaluate(() => { const c = document.getElementById('card'); const d = c.querySelector('.pill i'); return !c.hidden && !!d && !/rgba\(0, 0, 0, 0\)/.test(getComputedStyle(d).backgroundColor); });
    await page.keyboard.press('Escape');
    await L.clic(page, '#zcapas'); await page.evaluate(() => { if (!document.querySelector('.legend').classList.contains('open')) document.getElementById('zcapas').click(); }); await page.$eval('.seg.fondo button[data-fondo="calles"]', b => b.click()); await page.waitForTimeout(3000);
    await page.$eval('.seg.fondo button[data-fondo="sat"]', b => b.click()); await page.waitForTimeout(3000); f.fondo = (await page.$eval('#attrib', e => e.innerText)).includes('Esri');
    // espacios para plantar (inventario de arbolado): el archivo de la alcaldía llega con su huella y la capa se dibuja bajo la política
    await page.evaluate(() => window.__MAPA.ir({ longitude: -99.0565, latitude: 19.3445, zoom: 16.3 }, 0));
    f.inventario = await page.waitForFunction(() => window.__INV.cargadas().includes('007') && window.__INV.capas().some(c => c.id === 'inv-cepa'), null, { timeout: 120000 }).then(() => true, () => false)
      && srv.pedidas.some(q => /^\/priorizacion-reforestacion\/datos\/inventario\/inv_007\.bin\?v=[0-9a-f]{10}$/.test(q));
    await page.$eval('.seg.fondo button[data-fondo="no"]', b => b.click());
    await L.elegir(page, 'iztapalapa');
    const x = await L.descargar(page, '#dl-calles', SAL, 180000); f.excel = !!x && /\.xlsx$/.test(x.nombre) && x.bytes > 5000;
    const g = await L.descargar(page, '#dl-frentes', SAL, 240000); f.excelGrande = !!g && g.bytes > 1000000;
    const p = await L.descargar(page, '#dl-ficha-alc', SAL, 180000); f.pdf = !!p && /\.pdf$/.test(p.nombre) && p.bytes > 20000;
    await L.clic(page, '#open-info'); await page.waitForTimeout(500); f.ayuda = await page.evaluate(() => { const i = document.querySelector('.scale-bar i'); return !document.getElementById('info-modal').hidden && !!i && !/rgba\(0, 0, 0, 0\)/.test(getComputedStyle(i).backgroundColor); }); await page.keyboard.press('Escape'); await page.waitForTimeout(600);
    await L.clic(page, '#zloc'); await page.waitForTimeout(1500); f.ubicacion = await page.evaluate(() => !document.getElementById('card').hidden);
    const mal = Object.entries(f).filter(([, v]) => !v).map(([k]) => k);
    ok(`bajo la política estricta funcionan las ${Object.keys(f).length} funciones revisadas`, mal.length === 0, mal.join(', ') || Object.keys(f).join(', '));
    const v = await page.evaluate(() => window.__csp); const res = {}; v.forEach(x => { const k = x.replace(/:\d+$/, ''); res[k] = (res[k] || 0) + 1; });
    ok('ninguna violación de la política de seguridad de contenido en todo el recorrido', v.length === 0, `${v.length} · ` + Object.entries(res).slice(0, 6).map(([k, n]) => `${n}× ${k}`).join(' | '));
    const html = fs.readFileSync(path.join(L.DOCS, 'index.html'), 'utf8');
    ok('la página no trae bloques <style> ni atributos style', !/<style/.test(html) && !/\sstyle="/.test(html), `${(html.match(/<style/g) || []).length} bloques · ${(html.match(/\sstyle="/g) || []).length} atributos`);
    const app = fs.readFileSync(path.join(L.DOCS, 'app.js'), 'utf8');
    ok('el programa no inserta atributos style ni usa cssText', !/style="/.test(app) && !/cssText/.test(app) && !/cssText/.test(fs.readFileSync(path.join(L.DOCS, 'config.js'), 'utf8')), `${(app.match(/style="/g) || []).length} patrones`);
    ok('las librerías de Excel y PDF se piden con huella de versión', srv.pedidas.filter(q => /libs\/(xlsx|jspdf|excel_worker)\.js/.test(q)).every(q => /\?v=[0-9a-f]{10}/.test(q)) && srv.pedidas.some(q => /libs\/jspdf\.js\?v=/.test(q)), srv.pedidas.filter(q => /libs\/(xlsx|jspdf|excel_worker)/.test(q)).map(q => q.split('/').pop()).join(' '));
    ok('los enlaces a terceros no envían la dirección de la consulta', await page.evaluate(() => [...document.querySelectorAll('a[target="_blank"]')].every(a => /noreferrer/.test(a.rel))));
    ok('sin sesión configurada no se muestra «Mi cuenta» (ni el antiguo «Salir»)', await page.evaluate(() => document.getElementById('cuenta').hidden && getComputedStyle(document.getElementById('cuenta')).display === 'none' && !document.getElementById('sesion-salir') && !document.body.classList.contains('con-sesion')));
    await ctx.close(); srv.close(); }

  // ---------- 1 bis) «Mi cuenta», con la sesión configurada (v1.27; sustituye a «Salir») ----------
  { const srv = await servidor('sesion'); const { page, ctx } = await abre(srv, PRE + '?modo=ligero&a=010');
    const est = p => p.evaluate(() => { const b = document.getElementById('cuenta-btn'), m = document.getElementById('cuenta-menu'), r = b.getBoundingClientRect(), u = m.getBoundingClientRect();
      return { vis: !document.getElementById('cuenta').hidden && r.width > 0, exp: b.getAttribute('aria-expanded'), ctrl: b.getAttribute('aria-controls'), abierto: !m.hidden, foco: document.activeElement === b, nombre: b.getAttribute('aria-label'), txt: b.innerText.trim(),
        alto: Math.round(r.height), ancho: Math.round(r.width), texto: getComputedStyle(b.querySelector('span')).display !== 'none', dentro: m.hidden || (u.left >= 0 && u.right <= innerWidth + 0.5),
        enlaces: [...m.querySelectorAll('a')].map(a => [a.textContent, a.getAttribute('href'), Math.round(a.getBoundingClientRect().height)]) }; });
    let e = await est(page);
    ok('con sesión, el encabezado muestra «Mi cuenta» (ícono y texto), cerrado, con aria-expanded y aria-controls', e.vis && e.txt === 'Mi cuenta' && e.nombre === 'Mi cuenta' && e.exp === 'false' && e.ctrl === 'cuenta-menu' && !e.abierto, JSON.stringify(e));
    await page.click('#cuenta-btn'); await page.waitForTimeout(150); e = await est(page);
    const volver = encodeURIComponent(PRE + '?modo=ligero&a=010');
    ok('al abrirlo: «Mi perfil» (acceso/perfil/ con la consulta para volver, v1.49), «Cambiar contraseña» (pantalla de acceso con ?cambiar=1 y la consulta para volver) y «Cerrar sesión» (api/salir), dentro de la pantalla', e.abierto && e.exp === 'true' && e.dentro && e.enlaces.length === 3
      && e.enlaces[0][0] === 'Mi perfil' && e.enlaces[0][1] === `${PRE}acceso/perfil/?volver=${volver}`
      && e.enlaces[1][0] === 'Cambiar contraseña' && e.enlaces[1][1] === `${PRE}acceso/?cambiar=1&volver=${volver}` && e.enlaces[2][0] === 'Cerrar sesión' && e.enlaces[2][1] === PRE + 'api/salir', JSON.stringify(e.enlaces));
    await page.keyboard.press('Escape'); await page.waitForTimeout(150); e = await est(page);
    ok('Esc cierra el menú y regresa el foco al botón', !e.abierto && e.exp === 'false' && e.foco);
    await page.keyboard.press('Enter'); await page.waitForTimeout(150); const conTeclado = (await est(page)).abierto; await page.keyboard.press('Tab');
    const primero = await page.evaluate(() => document.activeElement.id); await page.click('#scope-title'); await page.waitForTimeout(150); e = await est(page);
    ok('con el teclado se abre y Tab llega a la primera opción; un clic fuera lo cierra', conTeclado && primero === 'cuenta-perfil' && !e.abierto && e.exp === 'false', `${conTeclado} · ${primero}`);
    // la dirección de regreso sigue a la consulta del momento
    await L.elegir(page, 'iztapalapa'); await page.click('#cuenta-btn'); await page.waitForTimeout(150); e = await est(page);
    const ahora = new URL(page.url()).pathname + new URL(page.url()).search;
    ok('el regreso de «Mi perfil» y de «Cambiar contraseña» es la consulta del momento', [0, 1].every(i => new URLSearchParams(e.enlaces[i][1].split('?')[1]).get('volver') === ahora), e.enlaces[0][1] + ' · ' + e.enlaces[1][1]);
    const v = await page.evaluate(() => window.__csp);
    ok('«Mi cuenta» funciona sin violaciones de la política de seguridad de contenido', v.length === 0, v.slice(0, 3).join(' | '));
    await ctx.close();
    const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'es-MX', serviceWorkers: 'block' }); await L.sinEntrada(ctxM);
    const pm = await ctxM.newPage(); pm.on('pageerror', x => errores.push(x.message)); await pm.goto(srv.url + PRE + '?modo=ligero&a=010'); await pm.waitForSelector('#loader[hidden]', { state: 'attached' }); await pm.waitForTimeout(500);
    await pm.tap('#cuenta-btn'); await pm.waitForTimeout(200); const m = await est(pm), des = await pm.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok('celular de 390 px: solo el ícono, de 44 px, con nombre accesible; el menú cabe en la pantalla y sus opciones miden 44 px', m.alto >= 44 && m.ancho >= 44 && !m.texto && m.nombre === 'Mi cuenta' && m.abierto && m.dentro && m.enlaces.every(x => x[2] >= 44) && des <= 0, JSON.stringify(m));
    await ctxM.close(); srv.close(); }

  // ---------- 2) sesión vencida ----------
  for (const [modo, nombre] of [['sesion401', 'el servidor responde 401'], ['login200', 'el servidor responde la página de inicio de sesión']]) {
    const srv = await servidor(modo); const { page, ctx } = await abre(srv, PRE + '?modo=ligero', false);
    await page.waitForSelector('#loader .reintenta, #loader [role=alert]', { timeout: 120000 }).catch(() => {});
    const t = await page.$eval('#loader', l => l.innerText.replace(/\s+/g, ' '));
    ok(`al cargar, si ${nombre}, se dice que la sesión terminó (no «revisa tu conexión»)`, /sesión/i.test(t) && !/conexión|incorrect|header/i.test(t), t.slice(0, 110));
    await ctx.close(); srv.close(); }
  { // sesión que vence a media consulta: la página ya cargó y las librerías de descarga responden 401
    const srv = await servidor('normal'); const { page, ctx } = await abre(srv, PRE + '?modo=ligero'); await L.elegir(page, 'iztapalapa');
    await page.route(/libs\/(jspdf|xlsx|excel_worker)\.js/, r => r.fulfill({ status: 401, contentType: 'text/html', body: '<html>No autorizado</html>' }));
    await page.$eval('#dl-ficha-alc', b => b.click()); await page.waitForTimeout(4000);
    const t1 = await page.$eval('#dl-status', e => e.innerText);
    ok('con la sesión vencida, la ficha PDF avisa que la sesión terminó', /sesión/i.test(t1), t1.slice(0, 100));
    const desc = []; page.on('download', d => desc.push(d.suggestedFilename())); await page.$eval('#dl-calles', b => b.click()); await page.waitForTimeout(6000);
    const t2 = await page.$eval('#dl-status', e => e.innerText);
    ok('con la sesión vencida, el Excel no se sustituye por CSV: avisa que la sesión terminó', /sesión/i.test(t2) && desc.length === 0, `${t2.slice(0, 80)} · descargas: ${desc.join(', ') || 'ninguna'}`);
    await ctx.close(); srv.close(); }

  { // KML y GeoJSON con sesión: se arman en el navegador sin pedir nada, así que antes de entregarlos se pregunta si la sesión sigue (v1.38)
    const srv = await servidor('sesion'); const { page, ctx } = await abre(srv, PRE + '?modo=ligero'); await L.elegir(page, 'iztapalapa');
    await page.$eval('#tab-dl', b => b.click());
    const bajado = await L.descargar(page, '#dl-geojson', os.tmpdir(), 60000);
    ok('con la sesión abierta, el GeoJSON se entrega', !!bajado, bajado ? bajado.nombre : 'sin descarga');
    const desc = []; page.on('download', d => desc.push(d.suggestedFilename()));
    await page.route(/api\/yo/, r => r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Sin sesión."}' }));
    for (const id of ['dl-kml', 'dl-geojson']) { await page.$eval('#' + id, b => b.click()); await page.waitForTimeout(3000); }
    const t3 = await page.$eval('#dl-status', e => e.innerText);
    ok('con la sesión vencida, el KML y el GeoJSON no se entregan: avisa que la sesión terminó', /sesión/i.test(t3) && desc.length === 0, `${t3.slice(0, 80)} · descargas: ${desc.join(', ') || 'ninguna'}`);
    await ctx.close(); srv.close(); }

  // ---------- 3) un proxy entrega los .bin ya descomprimidos ----------
  { const srv = await servidor('descomprime'); const { page, ctx } = await abre(srv, PRE + '?modo=ligero'); await L.elegir(page, 'iztapalapa');
    ok('si un proxy entrega los datos ya descomprimidos, la herramienta carga igual', (await page.$eval('#scope-title', e => e.innerText)) === 'Iztapalapa' && (await page.$eval('#mapsum', e => e.innerText)).includes(L.kmTxt(L.resumenFrentes(L.decodificar(), { mun: L.decodificar().META.muns.indexOf('007') }).kmp)));
    await ctx.close(); srv.close(); }

  ok('sin errores de JavaScript durante la prueba', errores.length === 0, errores.slice(0, 2).join(' | '));
  await browser.close(); process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
