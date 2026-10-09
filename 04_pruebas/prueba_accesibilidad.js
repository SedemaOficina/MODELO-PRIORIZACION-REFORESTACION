// Accesibilidad de la herramienta y de los documentos que genera.
// Recorre la herramienta con teclado y comprueba marcado, anuncios, foco, contraste de controles, objetivos táctiles,
// tamaños de letra, impresión y propiedades de los documentos generados. No sustituye la lectura con un lector de pantalla real.
// Uso: node 04_pruebas/prueba_accesibilidad.js   · termina con código ≠ 0 si algo falla. Requiere Python (lee las propiedades del Excel).
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const L = require('./lib_pruebas.js');
const SAL = process.env.SALIDA || fs.mkdtempSync(path.join(os.tmpdir(), 'acc-'));
const ok = L.Registro('accesibilidad');
// contraste WCAG entre dos colores «rgb(r, g, b)»
const lum = c => { const v = c.match(/[\d.]+/g).slice(0, 3).map(x => { x = +x / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const activo = page => page.evaluate(() => { const a = document.activeElement; return a ? (a.id || a.className || a.tagName) : ''; });

(async () => {
  const srv = await L.servidor(0); const browser = await L.lanzar(); const U = srv.url + '?modo=ligero#nomap'; const errores = [];
  const html = fs.readFileSync(path.join(L.DOCS, 'index.html'), 'utf8'); const css = fs.readFileSync(path.join(L.DOCS, 'estilos.css'), 'utf8');
  const cabeza = html.slice(0, html.indexOf('</head>')), cuerpo = html.slice(html.indexOf('<body'));

  // ---------- marcado ----------
  ok('<title> y <meta> van en <head>; el cuerpo no trae <title>, <meta> ni hojas de estilo', /<title>/.test(cabeza) && /rel="stylesheet"/.test(cabeza) && !/<title|<meta|<link/.test(cuerpo));
  ok('la página declara idioma, tiene <main> y enlace para saltar a la respuesta', /<html lang="es-MX"/.test(html) && /<main /.test(cuerpo) && /class="salto"/.test(cuerpo));
  ok('ningún encabezado dentro de un botón', !/<button[^>]*>(?:(?!<\/button>)[\s\S])*<h[1-6]/.test(cuerpo));
  ok('el cargador tiene barra de avance con rol y el mensaje de error se anuncia', /id="load-prog" role="progressbar"/.test(cuerpo) && /role','alert'/.test(fs.readFileSync(path.join(L.DOCS, 'app.js'), 'utf8')));
  ok('ningún tamaño de letra en píxeles en la hoja de estilos', !/font-size:\s*[\d.]+px/.test(css) && !/font:[^;}]*\d+px/.test(css), (css.match(/font-size:\s*[\d.]+px/g) || []).slice(0, 3).join(' '));
  ok('hay estilos de impresión', /@media print/.test(css));

  // ---------- escritorio ----------
  { const { page, ctx } = await L.abrir(browser, U, {}, errores);
    const nom = await page.evaluate(() => { const n = e => e ? (e.getAttribute('aria-label') || e.innerText || '').trim() : null; const cv = document.querySelector('#map canvas');
      return { ayuda: (g => g && document.getElementById(g.getAttribute('aria-labelledby')) ? document.getElementById(g.getAttribute('aria-labelledby')).textContent.trim() : null)(document.querySelector('.resp-row .chips[role=group]')), canvasRol: cv && cv.getAttribute('role'), canvasNom: cv && cv.getAttribute('aria-label'), sinNombre: [...document.querySelectorAll('button, [role=button], select, input')].filter(e => e.offsetParent && !(e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || e.innerText.trim() || e.title || (e.labels && e.labels.length))).map(e => e.id || e.className).slice(0, 5) }; });
    ok('el grupo «Atiende» tiene nombre accesible', nom.ayuda === 'Atiende', nom.ayuda);
    ok('el lienzo del mapa tiene rol y nombre', !!nom.canvasRol && /Mapa/.test(nom.canvasNom || ''), `${nom.canvasRol} · ${(nom.canvasNom || '').slice(0, 40)}`);
    ok('ningún control visible sin nombre accesible', nom.sinNombre.length === 0, nom.sinNombre.join(', '));
    // enlace de salto: primera parada de tabulación
    await page.keyboard.press('Tab'); ok('la primera parada de tabulación es «Saltar a la respuesta»', /salto/.test(await activo(page)), await activo(page));
    // buscador con teclado: opción activa anunciada, foco al título y anuncio del ámbito
    await page.focus('#omni'); await page.keyboard.type('iztapalapa'); await page.waitForTimeout(500); await page.keyboard.press('ArrowDown');
    const sel = await page.evaluate(() => { const o = [...document.querySelectorAll('#omni-list li.opt')]; return { n: o.filter(x => x.getAttribute('aria-selected') === 'true').length, act: document.getElementById('omni').getAttribute('aria-activedescendant') }; });
    ok('la opción activa del buscador lleva aria-selected y aria-activedescendant', sel.n === 1 && !!sel.act, JSON.stringify(sel));
    await page.keyboard.press('Enter'); await page.waitForTimeout(700);
    ok('tras elegir en el buscador, el foco pasa al título de la respuesta', (await activo(page)) === 'scope-title', await activo(page));
    const anuncio = await page.$eval('#sr-estado', e => e.textContent);
    ok('el cambio de ámbito se anuncia en una región viva', /Iztapalapa/.test(anuncio) && /km/.test(anuncio), anuncio);
    ok('el conteo de resultados y el estado de descargas son regiones de estado', await page.evaluate(() => ['search-count', 'dl-status', 'act-status', 'sr-estado'].every(i => document.getElementById(i).getAttribute('role') === 'status')));
    // listado: renglones con rol, foco visible y barra espaciadora
    await L.clic(page, '#tab-list');
    const fila = await page.evaluate(() => { const li = document.querySelector('#results li[tabindex]'); li.focus(); const cs = getComputedStyle(li); return { rol: li.getAttribute('role'), ancho: parseFloat(cs.outlineWidth), estilo: cs.outlineStyle, color: cs.outlineColor, fondo: getComputedStyle(document.querySelector('.panel')).backgroundColor, txt: li.innerText.split('\n')[0] }; });
    ok('los renglones del listado tienen rol de botón', fila.rol === 'button', fila.rol);
    ok('el renglón enfocado muestra un indicador de foco de 3:1 o más', fila.estilo !== 'none' && fila.ancho >= 2 && contraste(fila.color, 'rgb(255,255,255)') >= 3, `${fila.estilo} ${fila.ancho}px ${fila.color} · ${contraste(fila.color, 'rgb(255,255,255)').toFixed(1)}:1`);
    await page.keyboard.press(' '); await page.waitForTimeout(900);
    const act = await page.evaluate(() => { const a = document.querySelector('#results li.active'); return { activo: a ? a.innerText.split('\n')[0] : '', titulo: document.getElementById('scope-title').innerText }; });
    ok('la barra espaciadora activa el renglón', act.activo === fila.txt || act.titulo === fila.txt, `${act.activo || act.titulo} · ${fila.txt}`);
    ok('tras activar un renglón el foco no queda en el documento', !/^(BODY|HTML)?$/.test(await activo(page)), await activo(page));
    // calle consultada y ficha de un frente solo con teclado
    await page.evaluate(() => document.querySelector('#results li[tabindex]').focus()); await page.keyboard.press('Enter'); await page.waitForTimeout(900);
    const hayTramos = await page.evaluate(() => { const t = document.querySelector('#tramos li[tabindex]'); if (!t) return false; t.focus(); return t.getAttribute('role') === 'button'; });
    ok('los tramos de la calle consultada son renglones con rol de botón', hayTramos);
    await page.keyboard.press('Enter'); await page.waitForTimeout(700);
    const ficha = await page.evaluate(() => { const c = document.getElementById('card'); return { abierta: !c.hidden, foco: document.activeElement === c, nombre: c.getAttribute('aria-label'), campo: !!c.querySelector('[data-copy]'), txt: c.innerText.slice(0, 60).replace(/\s+/g, ' ') }; });
    ok('la ficha de un frente se abre con teclado desde el tramo, con sus acciones de campo', ficha.abierta && ficha.campo, ficha.txt);
    ok('la ficha recibe el foco y tiene nombre', ficha.foco && /Ficha/.test(ficha.nombre || ''), ficha.nombre);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    const tras = await page.evaluate(() => ({ cerrada: document.getElementById('card').hidden, foco: document.activeElement && (document.activeElement.closest('#tramos') ? 'tramo' : document.activeElement.id || document.activeElement.tagName) }));
    ok('Esc cierra la ficha y devuelve el foco al renglón que la abrió', tras.cerrada && tras.foco === 'tramo', JSON.stringify(tras));
    // panel de capas: Esc lo cierra y devuelve el foco
    await page.evaluate(() => { if (!document.querySelector('.legend').classList.contains('open')) document.getElementById('zcapas').click(); document.querySelector('.legend .pills button').focus(); });
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    ok('Esc cierra el panel de capas y devuelve el foco a su botón', await page.evaluate(() => !document.querySelector('.legend').classList.contains('open') && document.activeElement.id === 'zcapas'));
    // ayuda: fondo inerte y foco retenido
    await page.focus('#open-info'); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
    let fuera = 0; for (let i = 0; i < 45; i++) { await page.keyboard.press('Tab'); if (await page.evaluate(() => !!document.activeElement.closest('.app'))) fuera++; }
    const inerte = await page.evaluate(() => document.querySelector('.app').inert === true);
    ok('con la ayuda abierta el fondo queda inerte y 45 tabulaciones no salen de la ventana', inerte && fuera === 0, `inerte ${inerte} · fuera ${fuera}`);
    ok('la ayuda no trae una sección de uso con teclado', !/Uso con teclado/.test(await page.$eval('#info-modal', e => e.innerText)));
    await page.keyboard.press('Escape'); await page.waitForTimeout(700);
    ok('al cerrar la ayuda el foco vuelve al botón que la abrió y el fondo deja de ser inerte', await page.evaluate(() => document.activeElement.id === 'open-info' && !document.querySelector('.app').inert));
    // contraste de componentes
    const comp = await page.evaluate(() => { const b = s => { const e = document.querySelector(s); return e ? getComputedStyle(e).borderTopColor : null; }; const sw = document.querySelector('#legend-rows .row i');
      return { input: b('#omni'), filtro: b('#q'), select: b('#alc'), casilla: b('.chip[aria-pressed="false"] i'), pill: b('.legend .pills button[aria-pressed="false"]'), leyenda: sw ? getComputedStyle(sw).boxShadow : '' }; });
    const bajos = ['input', 'filtro', 'select', 'casilla', 'pill'].filter(k => !comp[k] || contraste(comp[k], 'rgb(255,255,255)') < 3);
    ok('bordes de campos, selector y casillas con contraste de 3:1 o más', bajos.length === 0, bajos.map(k => `${k} ${comp[k]}`).join(' · ') || contraste(comp.input, 'rgb(255,255,255)').toFixed(2) + ':1');
    ok('las muestras de la leyenda llevan borde', /rgba?\(/.test(comp.leyenda) && comp.leyenda !== 'none', comp.leyenda);
    await page.evaluate(() => { const b = document.getElementById('act-main'); b.disabled = false; b.focus(); }); await page.waitForTimeout(400);
    const foco = await page.evaluate(() => { const b = document.getElementById('act-main'); const c = getComputedStyle(b); return { color: c.outlineColor, ancho: parseFloat(c.outlineWidth), halo: c.boxShadow, fondo: c.backgroundColor }; });
    ok('indicador de foco de dos tonos: anillo de 3:1 sobre blanco y halo claro sobre el botón guinda', foco.ancho >= 3 && contraste(foco.color, 'rgb(255,255,255)') >= 3 && /255, 255, 255/.test(foco.halo) && contraste('rgb(255,255,255)', foco.fondo) >= 3, `${foco.color} · ${foco.halo}`);
    // letra mínima
    const chica = await page.evaluate(() => [...document.querySelectorAll('.app *')].filter(e => e.offsetParent && e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12).map(e => (e.id || e.className || e.tagName) + ' ' + getComputedStyle(e).fontSize).slice(0, 5));
    ok('ningún texto visible por debajo de 12 px', chica.length === 0, chica.join(' · '));
    // el tamaño de letra del navegador se respeta
    const esc = await page.evaluate(() => { const e = document.getElementById('scope-title'); const a = parseFloat(getComputedStyle(e).fontSize); document.documentElement.style.fontSize = '20px'; const b = parseFloat(getComputedStyle(e).fontSize); document.documentElement.style.fontSize = ''; return [a, b]; });
    ok('el texto crece con el tamaño de letra configurado en el navegador', esc[1] > esc[0] * 1.2, esc.join(' → '));
    // documentos generados
    await L.elegir(page, 'iztapalapa');
    const pdf = await L.descargar(page, '#dl-ficha-alc', SAL, 120000); const xls = await L.descargar(page, '#dl-calles', SAL, 120000);
    const pb = pdf ? fs.readFileSync(pdf.ruta).toString('latin1') : '';
    ok('la ficha PDF declara idioma, título y autoría', /\/Lang\s*\(es-MX\)/.test(pb) && /\/Title/.test(pb) && /\/Author/.test(pb), pdf ? pdf.nombre : 'sin archivo');
    let core = ''; try { core = cp.execFileSync(L.PY, ['-c', 'import sys, zipfile; sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read("docProps/core.xml"))', xls.ruta]).toString('utf8'); } catch (e) {}   // con Python y no con unzip, que Windows no trae
    ok('el Excel trae título y autoría en sus propiedades', /<dc:title>[^<]+<\/dc:title>/.test(core) && /Secretaría del Medio Ambiente/.test(core), core.slice(0, 80));
    // impresión y movimiento reducido
    await page.emulateMedia({ media: 'print' });
    const imp = await page.evaluate(() => ({ barra: getComputedStyle(document.querySelector('.toolbar')).display, acciones: getComputedStyle(document.getElementById('panel-actions')).display, panel: getComputedStyle(document.querySelector('.panel-body')).overflowY, listado: getComputedStyle(document.getElementById('tp-list')).display }));
    ok('al imprimir se ocultan los controles y la respuesta sale completa, sin recorte', imp.barra === 'none' && imp.acciones === 'none' && imp.panel === 'visible' && imp.listado !== 'none', JSON.stringify(imp));
    await page.emulateMedia({ media: 'screen', reducedMotion: 'reduce' });
    const mov = await page.evaluate(() => [...document.querySelectorAll('.tool, .chip, .tabs button, .btn, .panel')].filter(e => parseFloat(getComputedStyle(e).transitionDuration) > 0).length);
    ok('con movimiento reducido no quedan transiciones', mov === 0, String(mov));
    await ctx.close(); }

  // ---------- teléfono ----------
  { const { page, ctx } = await L.abrir(browser, U, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, errores);
    await L.clic(page, '#zcapas'); await page.waitForTimeout(300);
    const t = await page.evaluate(() => { const al = s => [...document.querySelectorAll(s)].filter(e => e.offsetParent).map(e => Math.round(e.getBoundingClientRect().height)); const an = s => [...document.querySelectorAll(s)].filter(e => e.offsetParent).map(e => Math.round(e.getBoundingClientRect().width));
      return { tool: Math.min(...al('.tool'), ...an('.tool')), pills: Math.min(...al('.legend .pills button')), filas: Math.min(...al('#legend-rows .row')) }; });
    ok('en teléfono los botones de la barra de herramientas miden 44 px o más', t.tool >= 44, String(t.tool));
    ok('en teléfono las casillas de capas y las filas de prioridad miden 38 px o más', t.pills >= 38 && t.filas >= 38, JSON.stringify(t));
    await L.clic(page, '#zcapas'); await L.elegir(page, 'iztapalapa'); await page.evaluate(() => { if (!document.body.classList.contains('sheet-open')) document.getElementById('sheet').click(); }); await page.waitForTimeout(300);
    await page.evaluate(() => { if (!document.body.classList.contains('sheet-open')) document.getElementById('sheet').click(); }); await page.waitForTimeout(400);
    const t2 = await page.evaluate(() => ({ tabs: Math.min(...[...document.querySelectorAll('.tabs button')].map(e => Math.round(e.getBoundingClientRect().height))), sel: Math.round(document.getElementById('alc').getBoundingClientRect().height), desborde: document.documentElement.scrollWidth - innerWidth }));
    ok('en teléfono las pestañas y el selector de alcaldía miden 44 px o más, sin desborde horizontal', t2.tabs >= 44 && t2.sel >= 44 && t2.desborde <= 0, JSON.stringify(t2));
    // ayuda en teléfono: la tabla se apila y la lámina se desplaza dentro de su marco
    await L.clic(page, '#open-info'); await page.waitForTimeout(400);
    const ay = await page.evaluate(() => { const m = document.querySelector('.modal-card'); const td = document.querySelector('.tbl td'); const f = document.querySelector('figure.lamina'); const tablas = document.querySelectorAll('.modal-card .tbl'); return { desborde: m.scrollWidth - m.clientWidth, celda: getComputedStyle(td).display, lamina: f.scrollWidth <= f.clientWidth + 1, laminaAncho: Math.round(f.querySelector('img').getBoundingClientRect().width), ancho: Math.round(f.clientWidth), etiquetasCriterios: [...tablas[0].querySelectorAll('td')].filter(c => getComputedStyle(c, '::before').content.includes('Fuente') || getComputedStyle(c, '::before').content.includes('Clase')).length, etiquetasFundamento: tablas[1] ? [...tablas[1].querySelectorAll('td')].filter(c => /Fuente|Clase/.test(getComputedStyle(c, '::before').content)).length : -1 }; });
    ok('en teléfono las tablas de la ayuda se apilan y la lámina cabe completa a lo ancho', ay.desborde <= 0 && ay.celda === 'block' && ay.lamina && ay.laminaAncho <= ay.ancho + 1, JSON.stringify(ay));
    ok('en teléfono solo la tabla de criterios lleva las etiquetas «Fuente» y «Clase»; la del fundamento no', ay.etiquetasCriterios === 9 && ay.etiquetasFundamento === 0, JSON.stringify(ay));
    await page.keyboard.press('Escape'); await page.waitForTimeout(700);
    // foco no tapado: con una ficha abierta, enfocar un control tapado la cierra
    await page.evaluate(() => { if (document.body.classList.contains('sheet-open')) document.getElementById('sheet').click(); }); await page.waitForTimeout(300);
    await L.elegir(page, 'vicente guerrero iztapalapa'); await L.clic(page, '#tab-list'); await page.evaluate(() => document.querySelector('#results li[tabindex]').click()); await page.waitForTimeout(600);
    const abre = await page.evaluate(() => { const t = document.querySelector('#tramos li[tabindex]'); if (!t) return 'sin tramos'; t.click(); return document.getElementById('card').hidden ? 'cerrada' : 'abierta'; }); await page.waitForTimeout(300);
    const tapado = await page.evaluate(() => { const c = document.getElementById('card').getBoundingClientRect(); const e = [...document.querySelectorAll('.panel button, .panel input, .panel [tabindex="0"]')].find(x => { if (!x.offsetParent) return false; const r = x.getBoundingClientRect(); return r.top > c.top + 6 && r.bottom < c.bottom - 6; }); if (!e) return 'ninguno tapado'; e.focus(); return document.getElementById('card').hidden ? 'cerrada' : 'sigue abierta'; });
    ok('en teléfono, al enfocar un control tapado por la ficha, la ficha se cierra', abre === 'abierta' && (tapado === 'cerrada' || tapado === 'ninguno tapado'), `${abre} · ${tapado}`);
    await ctx.close(); }

  ok('sin errores de JavaScript durante la prueba', errores.length === 0, errores.slice(0, 2).join(' | '));
  await browser.close(); srv.close(); process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
