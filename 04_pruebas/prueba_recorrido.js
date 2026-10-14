// Recorrido guiado: arranca solo en la primera visita (después de la entrada), una sola vez; se repite desde «Cómo funciona».
// Comprueba cada paso en escritorio y en teléfono: el globo cabe en la pantalla, el foco cae sobre el control que explica (cada paso salvo
// la bienvenida), están los pasos de banqueta, del filtro «Espacio», del orden por cepas, de Street View (con la ficha de una calle real) y
// de los espacios para plantar (con un punto real del inventario), el de «Mi cuenta» solo aparece con sesión, el recorrido tiene menos
// de 15 pasos, y al salir la página queda como estaba.
// Uso: node 04_pruebas/prueba_recorrido.js   · termina con código ≠ 0 si algo falla.
const L = require('./lib_pruebas.js');
const ok = L.Registro('recorrido guiado');
const enPantalla = page => page.evaluate(() => { const g = document.querySelector('.rec-globo'); if (!g) return null;
  const r = g.getBoundingClientRect(), f = document.querySelector('.rec-foco'), fr = f && !f.hidden ? f.getBoundingClientRect() : null;
  return { paso: g.querySelector('.rec-paso').textContent, titulo: g.querySelector('h3').textContent, texto: g.querySelector('p').textContent,
    cabe: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5, foco: fr && { x: fr.left + fr.width / 2, y: fr.top + fr.height / 2, w: fr.width, h: fr.height },
    tapa: fr ? !(r.right < fr.left || r.left > fr.right || r.bottom < fr.top || r.top > fr.bottom) : false }; });
// ¿el centro del foco cae sobre el control esperado?
const focoSobre = (page, sel) => page.evaluate(sel => { const f = document.querySelector('.rec-foco'); if (!f || f.hidden) return false; const r = f.getBoundingClientRect();
  return [...document.querySelectorAll(sel)].some(e => { const q = e.getBoundingClientRect(); return q.width > 0 && Math.abs((q.left + q.width / 2) - (r.left + r.width / 2)) < 4 && Math.abs((q.top + q.height / 2) - (r.top + r.height / 2)) < 4; }); }, sel);
// control que debe iluminar cada paso (por su título)
const CONTROL = { 'Busca un lugar': '.omni', 'Quién atiende': '.resp-row', 'Banqueta: decide qué visitar': '#banq-row', 'Espacio: dónde ya hay lugar': '#esp-row',
  'Dónde empezar, cifras y descargas': '.tabs', 'Información y mapa': '#ver-mapa', 'Colores del mapa y capas': '#leymini, #zcapas', 'Pre-evalúa con Street View': '#card .field-acts a[href*="pano"]',
  'Espacios para plantar': '.rec-punto', 'Tu lista de campo': '#panel-actions, #tab-dl', 'En campo': '#zloc', 'Mi cuenta': '#cuenta-btn', 'Cuando lo necesites': '#open-info, #info-btn' };
async function recorre(page, nombre, { sesion = false, gc = false } = {}) { const pasos = [];
  // 900 ms: el globo se recoloca a los 380 ms (cuando terminan de moverse la hoja, el mapa o el desplazamiento) y el foco tarda .25 s en llegar
  for (let k = 0; k < 20; k++) { await page.waitForTimeout(900); let p = await enPantalla(page); if (!p) break;
    if (p.titulo === 'Espacios para plantar') {   // el punto real llega cuando baja el inventario de la alcaldía
      await page.waitForSelector('.rec-punto', { state: 'attached', timeout: 20000 }).catch(() => {}); await page.waitForTimeout(500); p = await enPantalla(page);
      p.punto = await page.evaluate(() => { const e = document.querySelector('.rec-punto'); if (!e) return null; const d = e.dataset;
        return { clave: d.clave, tipo: d.tipo, real: window.__INV.puntos(d.alc).some(x => x.clave === d.clave) }; }); }
    pasos.push(p);
    if (CONTROL[p.titulo]) p.sobre = await focoSobre(page, CONTROL[p.titulo]);
    if (/Street View/.test(p.titulo)) p.ficha = await page.evaluate(() => !document.getElementById('card').hidden);
    const fin = await page.$eval('.rec-sig', b => b.textContent); await page.$eval('.rec-sig', b => b.click()); if (fin === 'Terminar') { await page.waitForTimeout(500); break; } }
  const malos = pasos.filter(p => !p.cabe).map(p => p.titulo), t = x => pasos.find(p => p.titulo === x);
  ok(`${nombre}: todos los globos caben en la pantalla`, pasos.length >= 10 && malos.length === 0, `${pasos.length} pasos${malos.length ? ' · no caben: ' + malos.join(', ') : ''}`);
  ok(`${nombre}: el recorrido tiene menos de 15 pasos`, pasos.length < 15, `${pasos.length} pasos`);
  ok(`${nombre}: el globo no tapa el control que explica`, pasos.every(p => !p.tapa), pasos.filter(p => p.tapa).map(p => p.titulo).join(', '));
  const sinControl = pasos.slice(1).filter(p => !CONTROL[p.titulo]).map(p => p.titulo), fuera = pasos.slice(1).filter(p => CONTROL[p.titulo] && !p.sobre).map(p => p.titulo);
  ok(`${nombre}: después de la bienvenida, el foco cae sobre el control de cada paso`, !pasos[0].foco && sinControl.length === 0 && fuera.length === 0, `sin control conocido: ${sinControl.join(', ')} · fuera: ${fuera.join(', ')}`);
  const b = t('Banqueta: decide qué visitar'), s = t('Pre-evalúa con Street View'), e = t('Espacio: dónde ya hay lugar'), d = t('Dónde empezar, cifras y descargas'), i = t('Espacios para plantar'), c = t('Mi cuenta');
  if (gc) ok(`${nombre}: con Gobierno Central no aparece el paso de banqueta`, !b);
  else ok(`${nombre}: el paso de banqueta ilumina la fila y explica el reconocimiento en sitio`, !!b && b.sobre && /reconocimiento en sitio/.test(b.texto), b && b.titulo);
  ok(`${nombre}: el paso del filtro «Espacio» ilumina la fila, nombra las tres opciones y avisa que el inventario va en curso`, !!e && e.sobre && /«Cepa vacante», «Tocón» o «Árbol muerto»/.test(e.texto) && /en curso/.test(e.texto), e && e.texto);
  ok(`${nombre}: «Dónde empezar» explica el orden por cepas vacantes de «Mostrar»`, !!d && /«Mostrar»/.test(d.texto) && (gc ? /«Avenidas · más cepas vacantes»/ : /«Colonias · más cepas vacantes»/).test(d.texto), d && d.texto);
  ok(`${nombre}: el paso de Street View abre la ficha de una calle e ilumina su botón de Street View`, !!s && s.ficha && s.sobre && /pre-?evalú|Antes de salir/i.test(s.titulo + s.texto), s && s.titulo);
  ok(`${nombre}: el paso de los espacios para plantar ilumina un punto real del inventario y explica sus símbolos y su ficha`, !!i && i.sobre && !!i.punto && i.punto.real && /cepa vacante/.test(i.texto) && /tocón/.test(i.texto) && /árbol muerto/.test(i.texto) && /Street View/.test(i.texto), i && JSON.stringify(i.punto));
  if (sesion) ok(`${nombre}: con sesión, el paso «Mi cuenta» ilumina el botón y nombra cambiar la contraseña y cerrar sesión`, !!c && c.sobre && /cambiar tu contraseña/.test(c.texto) && /cerrar sesión/.test(c.texto), c && c.texto);
  else ok(`${nombre}: sin sesión no aparece el paso «Mi cuenta»`, !c);
  return pasos; }
const limpio = page => page.evaluate(() => ({ velo: !!document.querySelector('.rec-velo, .rec-foco, .rec-globo, .rec-punto'), inerte: document.querySelector('.app').inert, ficha: !document.getElementById('card').hidden, capas: document.querySelector('.legend').classList.contains('open'), visto: localStorage.getItem('cp_recorrido') }));
// con sesión: la instalación del SIA define las direcciones de la sesión en config.js; aquí se fijan antes de que cargue («Mi cuenta»)
async function abrirConSesion(browser, url, op, errores) {
  const ctx = await browser.newContext({ locale: 'es-MX', serviceWorkers: 'block', viewport: { width: 1440, height: 900 }, ...op });
  await ctx.addInitScript(() => { window.SIA_PRUEBA = true;
    Object.defineProperty(window, 'SIA_SESION', { value: { inicio: '/acceso/', cierre: '/api/salir', uso: '/api/uso' }, writable: false, configurable: false }); });
  await L.sinEntrada(ctx);
  const page = await ctx.newPage(); page.setDefaultTimeout(+process.env.T_ESPERA || 300000);
  page.on('pageerror', e => errores.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errores.push('console: ' + m.text()); });
  await page.route(u => u.hostname.startsWith('fonts.'), r => r.fulfill({ status: 200, body: '', contentType: 'text/css' }));
  await page.route(/\/api\//, r => r.fulfill({ status: 204, body: '' }));   // registro de usos: sin servidor de sesión en esta prueba
  await page.goto(url); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(600);
  return { ctx, page }; }
const desdeAyuda = async page => { await page.evaluate(() => { document.getElementById('info-btn').click(); }); await page.waitForTimeout(400); await page.$eval('#rec-abrir', b => b.click()); await page.waitForTimeout(1200); };

(async () => {
  const srv = await L.servidor(0); const browser = await L.lanzar(); const errores = []; const U = srv.url + '?modo=ligero#nomap';
  // ---------- 1) primera visita en escritorio: entrada y después el recorrido, solo ----------
  { const { page, ctx } = await L.abrir(browser, U, { entrada: true, recorrido: true }, errores);
    ok('primera visita: el recorrido espera a que termine la entrada', !(await page.$('.rec-globo')) && await page.evaluate(() => !document.getElementById('entrada').hidden));
    await page.$eval('.entrada-red[data-red="alc"]', b => b.click()); await page.waitForTimeout(300);
    await page.evaluate(() => [...document.querySelectorAll('#entrada-grid .entrada-op')].find(b => b.textContent === 'Iztapalapa').click()); await page.waitForTimeout(1800);
    const p0 = await enPantalla(page);
    ok('primera visita: al elegir la alcaldía arranca el recorrido en el paso 1', !!p0 && /^Paso 1 de \d+$/.test(p0.paso) && !p0.foco, p0 && p0.paso);
    ok('la bienvenida dice que el recorrido toma dos minutos y menciona el espacio para plantar', !!p0 && /dos minutos/.test(p0.texto) && /espacio para plantar/.test(p0.texto), p0 && p0.texto);
    const foco0 = await page.evaluate(() => document.activeElement && document.activeElement.id); ok('el foco del teclado queda en el título del globo', foco0 === 'rec-titulo', foco0);
    await recorre(page, 'escritorio');
    const z = await limpio(page);
    ok('al terminar se retira todo, la página deja de estar inerte, la ficha se cierra y queda anotado', !z.velo && !z.inerte && !z.ficha && z.visto === 'visto', JSON.stringify(z));
    await page.reload(); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(1800);
    ok('la siguiente visita no repite el recorrido', !(await page.$('.rec-globo')));
    // ---------- 2) manual, desde «Cómo funciona»; Esc sale ----------
    await page.$eval('#open-info', b => b.click()); await page.waitForTimeout(400);
    const cta = await page.evaluate(() => { const b = document.getElementById('rec-abrir'); return b && b.getBoundingClientRect().height > 0 ? b.innerText.trim() : ''; });
    ok('«Cómo funciona» ofrece el recorrido guiado, con su duración', cta === 'Recorrido guiado · 2 minutos', cta);
    const ayuda = await page.$eval('.howto', e => e.innerText);
    ok('la ayuda de «Cómo funciona» nombra «Las dos», los filtros «Banqueta» y «Espacio», «Mostrar» y los espacios para plantar', /o las dos/.test(ayuda) && /«Espacio»/.test(ayuda) && /«Con banqueta»/.test(ayuda) && /«Mostrar»/.test(ayuda) && /espacios para plantar/.test(ayuda));
    await page.$eval('#rec-abrir', b => b.click()); await page.waitForTimeout(1200);
    const m = await enPantalla(page); ok('desde «Cómo funciona» arranca en el paso 1, con la ayuda cerrada', !!m && /^Paso 1 /.test(m.paso) && await page.evaluate(() => document.getElementById('info-modal').hidden), m && m.paso);
    await page.$eval('.rec-sig', b => b.click()); await page.waitForTimeout(500); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(500);
    const m2 = await enPantalla(page); ok('con el teclado: las flechas avanzan', !!m2 && /^Paso 3 /.test(m2.paso), m2 && m2.paso);
    await page.keyboard.press('Escape'); await page.waitForTimeout(400); const z2 = await limpio(page);
    ok('Esc sale del recorrido y deja la página como estaba', !z2.velo && !z2.inerte, JSON.stringify(z2));
    // Esc a la mitad del paso de los espacios para plantar: no queda la marca del punto ni el panel de capas abierto
    await page.$eval('#open-info', b => b.click()); await page.waitForTimeout(400); await page.$eval('#rec-abrir', b => b.click()); await page.waitForTimeout(1200);
    for (let k = 0; k < 15 && (await enPantalla(page)).titulo !== 'Espacios para plantar'; k++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(400); }
    await page.waitForSelector('.rec-punto', { state: 'attached', timeout: 20000 }).catch(() => {});
    await page.keyboard.press('Escape'); await page.waitForTimeout(400); const z3 = await limpio(page);
    ok('Esc en el paso de los espacios para plantar no deja la marca del punto ni el panel de capas abierto', !z3.velo && !z3.inerte && !z3.capas, JSON.stringify(z3));
    await ctx.close(); }
  // ---------- 3) teléfono, con sesión ----------
  { const { page, ctx } = await abrirConSesion(browser, U.replace('?', '?a=007&'), { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, errores);
    await desdeAyuda(page);
    await recorre(page, 'teléfono con sesión', { sesion: true });
    const z = await limpio(page); ok('teléfono: al terminar no queda nada encima', !z.velo && !z.inerte, JSON.stringify(z));
    await ctx.close(); }
  // ---------- 4) escritorio, Gobierno Central, con sesión ----------
  { const { page, ctx } = await abrirConSesion(browser, U.replace('?', '?r=gc&a=007&'), {}, errores);
    await desdeAyuda(page);
    await recorre(page, 'escritorio con Gobierno Central y sesión', { sesion: true, gc: true });
    const z = await limpio(page); ok('Gobierno Central: al terminar no queda nada encima', !z.velo && !z.inerte && !z.ficha, JSON.stringify(z));
    await ctx.close(); }
  ok('sin errores de JavaScript durante la prueba', errores.length === 0, errores.slice(0, 2).join(' | '));
  await browser.close(); srv.close(); process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
