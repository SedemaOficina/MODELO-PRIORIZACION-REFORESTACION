// Entrada y orientación: entrada en dos pasos (red —alcaldías, Gobierno Central o «Las dos»— y territorio; el segundo no repite la
// presentación), pestaña inicial «Dónde empezar», panel de capas cerrado con
// leyenda compacta, «Quién atiende» dentro del panel de capas y la consulta guardada en la dirección.
// Uso: node 04_pruebas/prueba_orientacion.js   · termina con código ≠ 0 si algo falla.
const L = require('./lib_pruebas.js');
const ok = L.Registro('orientación');
const D = L.decodificar(), M = D.META;
const num = t => +String(t).replace(/,/g, '').match(/[\d.]+/)[0];
const noCrece = a => a.every((v, i) => i === 0 || v <= a[i - 1] + 1e-9);
const filas = page => page.$$eval('#ini-list li[role=button]', ls => ls.map(l => ({ nombre: l.querySelector('.n').innerText.slice(l.querySelector('.pos').innerText.length).trim(), pos: l.querySelector('.pos').innerText.trim(), k: l.querySelector('.k').firstChild.textContent.trim(), small: l.querySelector('.k small').innerText.trim() })));
const orden = async (page, v) => { await page.selectOption('#ini-orden', v); await page.waitForTimeout(300); return filas(page); };

(async () => {
  const srv = await L.servidor(0); const browser = await L.lanzar(); const U = srv.url + '?modo=ligero#nomap'; const errores = [];

  // ---------- entrada por territorio ----------
  { const { page, ctx } = await L.abrir(browser, U, { entrada: true }, errores);
    const e = await page.evaluate(() => { const d = document.getElementById('entrada'); return { visible: !d.hidden, ops: d.querySelectorAll('.entrada-op').length, ciudad: !!document.getElementById('entrada-cdmx'), inerte: document.querySelector('.app').inert, foco: document.activeElement.className, redes: d.querySelectorAll('.entrada-red').length, paso1: !document.getElementById('entrada-p1').hidden, paso2: !document.getElementById('entrada-p2').hidden, texto: d.innerText, rol: d.getAttribute('role'), modal: d.getAttribute('aria-modal'), nombre: !!document.getElementById(d.getAttribute('aria-labelledby')) }; });
    ok('primera visita sin consulta: se pregunta primero qué consultar, con tres opciones (alcaldías, Gobierno Central y «Las dos»)', e.visible && e.redes === 3 && e.paso1 && !e.paso2 && /Las dos/.test(e.texto), JSON.stringify(e));
    ok('la entrada es un diálogo con nombre, deja inerte el resto y enfoca la primera opción', e.rol === 'dialog' && e.modal === 'true' && e.nombre && e.inerte && e.foco === 'entrada-red');
    ok('la entrada dice que la herramienta es para las alcaldías y para el Gobierno de la Ciudad', /alcaldías/.test(e.texto) && /Gobierno de la Ciudad/.test(e.texto) && /Gobierno Central/.test(e.texto));
    ok('la presentación menciona los espacios para plantar del inventario de arbolado', /cepas vacantes, tocones y árboles muertos/.test(e.texto) && /inventario de arbolado/.test(e.texto));
    const ini = await page.evaluate(() => ({ tab: document.querySelector('.tabs [aria-selected="true"]').id, capas: document.querySelector('.legend').classList.contains('open') }));
    ok('la pestaña inicial es «Dónde empezar» y el panel de capas empieza cerrado', ini.tab === 'tab-ini' && !ini.capas, JSON.stringify(ini));
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    const c = await page.evaluate(() => ({ visible: !document.getElementById('entrada').hidden, inerte: document.querySelector('.app').inert, titulo: document.getElementById('scope-title').textContent, guarda: localStorage.getItem('cp_inicio'), foco: document.activeElement.id }));
    ok('Esc cierra la entrada, deja toda la ciudad y devuelve el foco a la respuesta', !c.visible && !c.inerte && c.titulo === 'Ciudad de México' && c.guarda === 'ciudad' && c.foco === 'scope-title', JSON.stringify(c));
    await page.reload(); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(600);
    ok('con «toda la ciudad» recordada no se vuelve a preguntar', await page.evaluate(() => document.getElementById('entrada').hidden));
    await ctx.close(); }
  { const { page, ctx } = await L.abrir(browser, U, { entrada: true }, errores);
    await page.click('.entrada-red[data-red="alc"]'); await page.waitForTimeout(200);
    const p2 = await page.evaluate(() => ({ paso2: !document.getElementById('entrada-p2').hidden, ops: document.querySelectorAll('.entrada-op').length, q: document.getElementById('entrada-q').textContent, foco: document.activeElement.id,
      texto: document.getElementById('entrada').innerText, eleg: document.getElementById('entrada-eleg').innerText.trim(), ic: !!document.querySelector('#entrada-eleg-ic svg'), volver: !!document.getElementById('entrada-volver').offsetParent }));
    ok('segundo paso: 16 alcaldías y «Ver toda la ciudad»; el foco pasa a la pregunta', p2.paso2 && p2.ops === 16 && /alcaldía/.test(p2.q) && p2.foco === 'entrada-q', JSON.stringify(p2));
    ok('segundo paso: no repite la presentación; una línea dice lo elegido, con su ícono, y se puede cambiar', !/pone esta herramienta/.test(p2.texto) && p2.eleg === 'Calles y colonias de las alcaldías' && p2.ic && p2.volver && /Cambiar lo que quiero consultar/.test(p2.texto), p2.eleg);
    await page.click('#entrada-volver'); await page.waitForTimeout(150);
    ok('se puede volver al primer paso', await page.evaluate(() => !document.getElementById('entrada-p1').hidden && document.getElementById('entrada-p2').hidden));
    await page.click('.entrada-red[data-red="alc"]');
    await page.evaluate(() => [...document.querySelectorAll('.entrada-op')].find(b => b.textContent === 'Iztapalapa').click()); await page.waitForTimeout(600);
    const a = await page.evaluate(() => ({ titulo: document.getElementById('scope-title').textContent, url: location.search, guarda: localStorage.getItem('cp_inicio'), entrada: document.getElementById('entrada').hidden }));
    ok('elegir una alcaldía abre la herramienta en ella y la deja en la dirección', a.titulo === 'Iztapalapa' && /a=007/.test(a.url) && a.guarda === '007' && a.entrada, JSON.stringify(a));
    await page.goto(U); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(600);
    const r = await page.evaluate(() => ({ titulo: document.getElementById('scope-title').textContent, entrada: document.getElementById('entrada').hidden, url: location.search }));
    ok('la siguiente visita abre en la última alcaldía consultada, sin preguntar', r.titulo === 'Iztapalapa' && r.entrada && /a=007/.test(r.url), JSON.stringify(r));
    await page.evaluate(() => document.getElementById('zcity').click()); await page.waitForTimeout(500);
    ok('volver a toda la ciudad también se recuerda', await page.evaluate(() => localStorage.getItem('cp_inicio')) === 'ciudad');
    await ctx.close(); }
  { const { page, ctx } = await L.abrir(browser, U, { entrada: true }, errores);
    await page.click('.entrada-red[data-red="gc"]'); await page.waitForTimeout(200);
    ok('con Gobierno Central, el segundo paso pregunta por las vialidades primarias', /vialidades primarias/.test(await page.$eval('#entrada-q', x => x.textContent)));
    ok('con Gobierno Central, la línea de lo elegido lo dice', (await page.$eval('#entrada-eleg', x => x.innerText.trim())) === 'Vialidades primarias del Gobierno Central');
    await page.evaluate(() => [...document.querySelectorAll('.entrada-op')].find(b => b.textContent === 'Iztapalapa').click()); await page.waitForTimeout(700);
    const g = await page.evaluate(() => ({ resp: document.body.dataset.resp, titulo: document.getElementById('scope-title').textContent, ini: document.getElementById('ini-title').textContent, n: document.querySelectorAll('#ini-list li[role=button]').length, url: location.search, red: localStorage.getItem('cp_red'), gc: document.querySelector('button[data-resp="gc"]').getAttribute('aria-pressed'), mapsum: document.getElementById('mapsum').innerText }));
    ok('entrar por Gobierno Central abre las vialidades primarias de la alcaldía, con sus avenidas en «Dónde empezar»', g.resp === 'gc' && g.titulo === 'Iztapalapa' && /^Avenidas de la alcaldía Iztapalapa/.test(g.ini) && g.n > 0 && g.gc === 'true', JSON.stringify(g));
    ok('la red queda en la dirección y se recuerda', /r=gc/.test(g.url) && /a=007/.test(g.url) && g.red === 'gc');
    await page.goto(U); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(600);
    const r = await page.evaluate(() => ({ resp: document.body.dataset.resp, titulo: document.getElementById('scope-title').textContent, entrada: document.getElementById('entrada').hidden, url: location.search }));
    ok('la siguiente visita abre en la misma red y alcaldía, sin preguntar', r.resp === 'gc' && r.titulo === 'Iztapalapa' && r.entrada && /r=gc/.test(r.url), JSON.stringify(r));
    await ctx.close(); }
  { const { page, ctx } = await L.abrir(browser, U, { entrada: true }, errores);
    await page.click('.entrada-red[data-red="gc"]'); await page.evaluate(() => document.getElementById('entrada-cdmx').click()); await page.waitForTimeout(600);
    const c = await page.evaluate(() => ({ resp: document.body.dataset.resp, titulo: document.getElementById('scope-title').textContent, ini: document.getElementById('ini-title').textContent, red: localStorage.getItem('cp_red'), inicio: localStorage.getItem('cp_inicio') }));
    ok('Gobierno Central en toda la ciudad: avenidas de la ciudad, y se recuerda', c.resp === 'gc' && c.titulo === 'Ciudad de México' && /^Avenidas de la ciudad/.test(c.ini) && c.red === 'gc' && c.inicio === 'ciudad', JSON.stringify(c));
    await page.goto(U); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(600);
    ok('al volver, sigue en Gobierno Central y toda la ciudad', await page.evaluate(() => document.body.dataset.resp === 'gc' && document.getElementById('entrada').hidden && document.getElementById('scope-title').textContent === 'Ciudad de México'));
    await ctx.close(); }
  // «Las dos»: como marcar «Alcaldías» y «Gobierno Central» en «Atiende» (resp='both'); queda en la dirección (r=both) y se recuerda
  { const { page, ctx } = await L.abrir(browser, U, { entrada: true }, errores);
    await page.click('.entrada-red[data-red="both"]'); await page.waitForTimeout(200);
    const p2 = await page.evaluate(() => ({ eleg: document.getElementById('entrada-eleg').innerText.trim(), q: document.getElementById('entrada-q').textContent, texto: document.getElementById('entrada').innerText }));
    ok('«Las dos»: el segundo paso dice «Calles de las alcaldías y vialidades primarias» y no repite la presentación', p2.eleg === 'Calles de las alcaldías y vialidades primarias' && /alcaldía/.test(p2.q) && !/pone esta herramienta/.test(p2.texto), JSON.stringify(p2.eleg));
    await page.evaluate(() => [...document.querySelectorAll('.entrada-op')].find(b => b.textContent === 'Iztapalapa').click()); await page.waitForTimeout(700);
    const b = await page.evaluate(() => ({ resp: document.body.dataset.resp, titulo: document.getElementById('scope-title').textContent, url: location.search, red: localStorage.getItem('cp_red'), inicio: localStorage.getItem('cp_inicio'),
      alc: document.querySelector('button[data-resp="alc"]').getAttribute('aria-pressed'), gc: document.querySelector('button[data-resp="gc"]').getAttribute('aria-pressed'), bars2: !document.getElementById('bars2').hidden }));
    ok('«Las dos» abre la alcaldía con las dos casillas de «Atiende» marcadas (resp=both) y los dos bloques del Resumen', b.resp === 'both' && b.titulo === 'Iztapalapa' && b.alc === 'true' && b.gc === 'true' && b.bars2, JSON.stringify(b));
    ok('«Las dos» queda en la dirección (r=both) y se recuerda', /r=both/.test(b.url) && /a=007/.test(b.url) && b.red === 'both' && b.inicio === '007', JSON.stringify(b));
    await page.goto(U); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(600);
    const r = await page.evaluate(() => ({ resp: document.body.dataset.resp, titulo: document.getElementById('scope-title').textContent, entrada: document.getElementById('entrada').hidden, url: location.search }));
    ok('la siguiente visita abre con las dos redes y la misma alcaldía, sin preguntar', r.resp === 'both' && r.titulo === 'Iztapalapa' && r.entrada && /r=both/.test(r.url), JSON.stringify(r));
    await ctx.close(); }
  { const { page, ctx } = await L.abrir(browser, U, { entrada: true }, errores);
    await page.click('.entrada-red[data-red="both"]'); await page.evaluate(() => document.getElementById('entrada-cdmx').click()); await page.waitForTimeout(600);
    const c = await page.evaluate(() => ({ resp: document.body.dataset.resp, titulo: document.getElementById('scope-title').textContent, red: localStorage.getItem('cp_red'), inicio: localStorage.getItem('cp_inicio') }));
    ok('«Las dos» en toda la ciudad: se recuerda', c.resp === 'both' && c.titulo === 'Ciudad de México' && c.red === 'both' && c.inicio === 'ciudad', JSON.stringify(c));
    await page.goto(U); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(600);
    ok('al volver, sigue con las dos redes y toda la ciudad', await page.evaluate(() => document.body.dataset.resp === 'both' && document.getElementById('entrada').hidden && document.getElementById('scope-title').textContent === 'Ciudad de México'));
    await ctx.close(); }
  { const { page, ctx } = await L.abrir(browser, srv.url + '?modo=ligero&a=005#nomap', { entrada: true }, errores);
    const r = await page.evaluate(() => ({ titulo: document.getElementById('scope-title').textContent, entrada: document.getElementById('entrada').hidden, guarda: localStorage.getItem('cp_inicio') }));
    ok('un enlace compartido abre su consulta sin preguntar y no cambia lo recordado', r.titulo === 'Gustavo A. Madero' && r.entrada && r.guarda === null, JSON.stringify(r));
    await ctx.close(); }

  // ---------- «Dónde empezar» ----------
  { const { page, ctx } = await L.abrir(browser, U, { permissions: ['clipboard-read', 'clipboard-write'] }, errores);
    await page.click('#tab-ini'); await L.elegir(page, 'Iztapalapa');
    const est = await page.evaluate(() => ({ tit: document.getElementById('ini-title').textContent, cnt: document.getElementById('ini-count').textContent, kpisEnResumen: !!document.querySelector('#tp-res #kpis'), resumenOculto: document.getElementById('tp-res').hidden, orden: !document.getElementById('ini-orden-box').hidden }));
    let f = await filas(page);
    ok('con una alcaldía, «Dónde empezar» lista diez colonias numeradas', /Colonias de Iztapalapa/.test(est.tit) && f.length === 10 && f.map(x => x.pos).join() === '1,2,3,4,5,6,7,8,9,10' && est.orden, est.tit + ' · ' + est.cnt);
    ok('las cifras del ámbito están en la pestaña Resumen', est.kpisEnResumen && est.resumenOculto);
    ok('orden por km prioritarios: no creciente', noCrece(f.map(x => num(x.k) * (/\bm$/.test(x.k) ? 0.001 : 1))), f.map(x => x.k).join(' | '));
    // contraste con un recálculo propio: colonias de Iztapalapa por km de frente prioritario a cargo de la alcaldía
    { const izt = M.munNames.indexOf('Iztapalapa'), kmp = new Map(); for (const x of D.F) { if (x.gc || !x.col || x.prio < L.PRIO_MIN) continue; kmp.set(x.col, (kmp.get(x.col) || 0) + x.len); }
      // los nombres de la pantalla se leen ya corregidos (acentos y abreviaturas): se comparan las cifras de cada renglón
      const esp = [...kmp.entries()].filter(([c]) => M.colonias[c] && M.colonias[c].n && M.colonias[c].m === M.muns[izt]).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([, m]) => `${L.kmTxt(m / 1000)} ${L.kmUn(m / 1000)}`);
      ok('coincide con el recálculo de las colonias por km prioritarios', esp.join('|') === f.map(x => x.k).join('|'), esp.slice(0, 4).join(', ') + ' · ' + f.map(x => x.k).slice(0, 4).join(', ')); }
    await page.evaluate(() => document.querySelector('.seg.lvl button[data-lvl="fr"]').click()); await page.waitForTimeout(300);
    ok('la lista no depende de las casillas de capas', (await filas(page)).map(x => x.nombre).join('|') === f.map(x => x.nombre).join('|'));
    await page.evaluate(() => document.querySelector('.seg.lvl button[data-lvl="fr"]').click()); await page.waitForTimeout(300);
    // tres pestañas: la del listado se fundió en «Dónde empezar»
    const pes = await page.evaluate(() => [...document.querySelectorAll('.tabs [role=tab]')].map(b => b.textContent.trim()));
    ok('hay tres pestañas: «Dónde empezar», «Resumen» y «Descargas»', pes.join('|') === 'Dónde empezar|Resumen|Descargas' && !(await page.$('#tab-list, #tp-list, #results')), pes.join(' | '));
    // las calles de la alcaldía, cada una en su colonia y con su desglose por prioridad
    f = await orden(page, 'calles');
    const ca = await page.evaluate(() => ({ tit: document.getElementById('ini-title').textContent, desg: [...document.querySelectorAll('#ini-list li[role=button]')].filter(l => l.querySelector('.desg')).length, t: (document.querySelector('#ini-list li .t') || {}).textContent }));
    ok('«Mostrar: calles» lista diez calles de la alcaldía con su colonia y su desglose por prioridad', /^Calles de Iztapalapa/.test(ca.tit) && f.length === 10 && ca.desg === 10 && noCrece(f.map(x => num(x.k) * (/\bm$/.test(x.k) ? 0.001 : 1))), JSON.stringify(ca));
    // filtro por nombre dentro de «Dónde empezar»
    await page.fill('#q', 'ayuntamiento'); await page.waitForTimeout(400);
    const fl = await page.evaluate(() => ({ tit: document.getElementById('ini-title').textContent, n: document.querySelectorAll('#ini-list li[role=button]').length, todas: [...document.querySelectorAll('#ini-list li[role=button] .n')].every(n => /ayuntamiento/i.test(n.textContent)), orden: document.getElementById('ini-orden-box').hidden, ph: document.getElementById('q').placeholder }));
    ok('el campo de «Dónde empezar» filtra las calles de la alcaldía por nombre', /^Calles encontradas en la alcaldía Iztapalapa/.test(fl.tit) && fl.n > 0 && fl.todas && fl.orden && /Buscar una calle de la alcaldía/.test(fl.ph), JSON.stringify(fl));
    await page.fill('#q', ''); await page.waitForTimeout(300);
    // v1.27: «Mostrar» con opciones cortas; sin el porcentaje prioritario ni «sin arbolado y con banqueta» (sus cifras siguen en el Resumen y los Excel)
    { const ops = await page.$$eval('#ini-orden option', o => o.map(x => x.value + '=' + x.textContent));
      ok('alcaldía: «Mostrar» ofrece colonias por km, por cepas y por habitantes, y calles por km y por cepas, con textos cortos', ops.join('|') === 'kmp=Colonias · más km prioritarios|cv=Colonias · más cepas vacantes|pob=Colonias · más habitantes|calles=Calles · más km prioritarios|callescv=Calles · más cepas vacantes', ops.join(' | ')); }
    f = await orden(page, 'pob'); ok('orden por habitantes: no creciente', f.length === 10 && noCrece(f.map(x => num(x.k))) && f.every(x => /hab/.test(x.k)), f.map(x => x.k).join(' | '));
    await page.evaluate(() => document.getElementById('ini-mas').click()); await page.waitForTimeout(300);
    ok('«Ver 10 más» agrega diez renglones y enfoca el primero nuevo', (await filas(page)).length === 20 && await page.evaluate(() => document.activeElement === document.getElementById('ini-list').children[10]));
    f = await orden(page, 'kmp'); const primera = f[0].nombre;
    await page.evaluate(() => document.querySelector('#ini-list li').click()); await page.waitForTimeout(600);
    const col = await page.evaluate(() => ({ titulo: document.getElementById('scope-title').textContent, ini: document.getElementById('ini-title').textContent, n: document.querySelectorAll('#ini-list li[role=button]').length, orden: document.getElementById('ini-orden-box').hidden, ops: [...document.querySelectorAll('#ini-orden option')].map(o => o.value).join(), v: document.getElementById('ini-orden').value }));
    // desde la v1.23 la colonia tiene selector: sus calles por km prioritarios (lo predeterminado) o por cepas vacantes del inventario
    ok('elegir una colonia la consulta y la pestaña pasa a sus calles, por km prioritarios (o por cepas vacantes, en el selector)', col.titulo === 'Col. ' + primera && col.ini.includes('Calles de ' + primera) && col.n > 0 && !col.orden && col.ops === 'calles,cv' && col.v === 'calles', JSON.stringify(col));
    const una = await page.evaluate(n => ({ rotulo: !!document.getElementById('scope-label'), res: document.getElementById('tp-res').textContent.includes(n), cab: document.getElementById('res-cab').textContent, sub: document.getElementById('res-sub').textContent,
      barras: document.getElementById('bars-title').textContent, cuadro: (document.querySelector('#reparto .res-cab') || {}).textContent, cuadroSub: (document.querySelector('#reparto .res-sub') || {}).textContent }), primera);
    ok('el nombre de la colonia no se repite en el Resumen: el bloque es «Alcaldía» (frentes en la colonia) y la comparación dice «en la colonia»', !una.rotulo && !una.res && una.cab === 'Alcaldía' && /en la colonia/.test(una.sub) && una.barras === 'Por prioridad' && una.cuadro === 'Alcaldía y Gobierno Central' && /, en la colonia$/.test(una.cuadroSub || ''), JSON.stringify(una));
    await page.evaluate(() => document.querySelector('#ini-list li').click()); await page.waitForTimeout(500);
    ok('elegir una calle la deja como calle consultada', await page.evaluate(() => /Quitar la calle/.test(document.getElementById('cr-rest').innerHTML)));
    const tr = await page.evaluate(() => { const b = document.getElementById('tramos'); return { dentro: !!b.closest('#tp-ini'), visible: !b.hidden, n: b.querySelectorAll('ol.tramos li').length, activa: !!document.querySelector('#ini-list li.active'), antes: b.compareDocumentPosition(document.getElementById('ini-list')) === Node.DOCUMENT_POSITION_FOLLOWING }; });
    ok('los tramos de la calle están en «Dónde empezar», arriba de la lista, y la calle queda marcada', tr.dentro && tr.visible && tr.n > 0 && tr.activa && tr.antes, JSON.stringify(tr));
    ok('sin NaN, undefined ni negativos en la pestaña', !L.MALOS.test(await page.$eval('#tp-ini', x => x.innerText)) && L.negativos(await page.$eval('#tp-ini', x => x.innerText)).length === 0);
    // compartir
    ok('no hay botón «Compartir»; la dirección guarda la consulta', !(await page.$('#share')) && /c=\d+/.test(await page.evaluate(() => location.href)));
    const ti = await page.evaluate(() => ({ b: (document.querySelector('#ini-title b.unidad') || {}).textContent, t: document.getElementById('ini-title').textContent }));
    ok('el título de «Dónde empezar» destaca lo que se consulta', ti.b === 'Calles' && /^Calles de /.test(ti.t), JSON.stringify(ti));
    // ciudad y Gobierno Central
    await L.clic(page, '#zcity'); await page.waitForTimeout(400);
    const cd = await page.evaluate(() => ({ tit: document.getElementById('ini-title').textContent, n: document.querySelectorAll('#ini-list li[role=button]').length, sub: document.querySelector('#ini-list li .t').textContent }));
    ok('en toda la ciudad lista colonias con su alcaldía', /Colonias de la ciudad/.test(cd.tit) && cd.n === 10 && / · Prioridad de colonia/.test(cd.sub), cd.tit + ' · ' + cd.sub);
    f = await orden(page, 'alc');
    ok('en toda la ciudad, «Mostrar: alcaldías» da las 16 alcaldías de diez en diez', /^Alcaldías por kilómetros de frente prioritario/.test(await page.$eval('#ini-title', x => x.textContent)) && f.length === 10 && await page.$eval('#ini-mas', b => !b.hidden && /Ver 6 más/.test(b.textContent)), f.map(x => x.nombre).slice(0, 3).join(', '));
    await orden(page, 'kmp');
    await L.ponResp(page, 'gc'); await page.waitForTimeout(400);
    const gc = await page.evaluate(() => ({ tit: document.getElementById('ini-title').textContent, n: document.querySelectorAll('#ini-list li[role=button]').length, orden: document.getElementById('ini-orden-box').hidden }));
    ok('con Gobierno Central lista avenidas; en toda la ciudad se pueden ver también por cepas vacantes (v1.24) y las alcaldías', /^Avenidas de la ciudad/.test(gc.tit) && gc.n === 10 && !gc.orden && (await page.$$eval('#ini-orden option', o => o.map(x => x.value).join())) === 'av,avcv,alc', JSON.stringify(gc));
    await page.evaluate(() => document.querySelector('#ini-list li').click()); await page.waitForTimeout(600);
    const av = await page.evaluate(() => ({ tit: document.getElementById('ini-title').textContent, n: document.querySelectorAll('#ini-list li[role=button]').length }));
    ok('con una avenida elegida, la lista da las alcaldías que cruza', /^Tramos de .+ por alcaldía$/.test(av.tit) && av.n > 0, JSON.stringify(av));
    await L.clic(page, '#zcity');
    await L.ponResp(page, 'alc');

    // ---------- capas, leyenda compacta y «Quién atiende» ----------
    const cap = await page.evaluate(() => { const lg = document.querySelector('.legend'), mini = document.getElementById('leymini'); const vis = e => getComputedStyle(e).display !== 'none';
      return { cerrada: !lg.classList.contains('open') && !vis(lg), mini: vis(mini), colores: [...mini.querySelectorAll('i')].map(i => getComputedStyle(i).backgroundColor), respEnPanel: !!document.querySelector('.panel .query button[data-resp="gc"]') && !lg.querySelector('button[data-resp]') && document.querySelector('.panel .query button[data-resp="gc"]').offsetParent !== null, explicaEnCapas: !lg.querySelector('#prelim-note') && !!lg.querySelector('#resp-note'), grupo: !!document.getElementById(document.querySelector('.resp-row .chips').getAttribute('aria-labelledby')) }; });
    ok('el panel de capas está cerrado y la leyenda compacta muestra cinco colores distintos', cap.cerrada && cap.mini && new Set(cap.colores).size === 5, cap.colores.join(' '));
    ok('la fila «Atiende» está a la vista junto al buscador; su explicación, en el panel de capas (sin aviso de asignación preliminar)', cap.respEnPanel && cap.explicaEnCapas && cap.grupo, JSON.stringify(cap));
    await page.evaluate(() => document.getElementById('leymini').click()); await page.waitForTimeout(300);
    const ab = await page.evaluate(() => ({ abierta: document.querySelector('.legend').classList.contains('open'), mini: getComputedStyle(document.getElementById('leymini')).display, foco: document.activeElement.id }));
    ok('la leyenda compacta abre el panel de capas y cede su lugar', ab.abierta && ab.mini === 'none' && ab.foco === 'legend-toggle', JSON.stringify(ab));
    await ctx.close(); }

  // ---------- teléfono ----------
  { const { page, ctx } = await L.abrir(browser, U, { entrada: true, viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, errores);
    const t = await page.evaluate(() => { const c = document.querySelector('.entrada-card'); const b = [...c.querySelectorAll('button')].filter(x => x.offsetParent !== null && !x.classList.contains('linkbtn')).map(x => x.getBoundingClientRect()); return { desborde: c.scrollWidth - c.clientWidth, chico: b.filter(r => r.height < 44).length, fuera: b.filter(r => r.right > innerWidth + 1 || r.left < -1).length }; });
    ok('en teléfono la entrada no se sale a lo ancho y sus botones miden al menos 44 px', t.desborde <= 0 && t.chico === 0 && t.fuera === 0, JSON.stringify(t));
    await page.evaluate(() => document.querySelector('.entrada-red[data-red="alc"]').click()); await page.waitForTimeout(200);
    const t2 = await page.evaluate(() => { const c = document.querySelector('.entrada-card'); const b = [...c.querySelectorAll('button')].filter(x => x.offsetParent !== null && !x.classList.contains('linkbtn')).map(x => x.getBoundingClientRect()); return { desborde: c.scrollWidth - c.clientWidth, chico: b.filter(r => r.height < 44).length, fuera: b.filter(r => r.right > innerWidth + 1 || r.left < -1).length, n: b.length }; });
    ok('en teléfono, el segundo paso tampoco se desborda', t2.desborde <= 0 && t2.chico === 0 && t2.fuera === 0 && t2.n === 17, JSON.stringify(t2));
    await page.evaluate(() => document.getElementById('entrada-cdmx').click()); await page.waitForTimeout(400);
    const tb = await page.evaluate(() => { const ts = document.querySelector('.tabs'); const m = document.getElementById('leymini').getBoundingClientRect(), s = document.getElementById('scalebar').getBoundingClientRect(); return { tabs: ts.scrollWidth - ts.clientWidth, pagina: document.documentElement.scrollWidth - innerWidth, cruza: !(m.right <= s.left || s.right <= m.left || m.bottom <= s.top || s.bottom <= m.top) }; });
    ok('en teléfono caben las tres pestañas, la página no se desborda y la leyenda compacta no tapa la escala', tb.tabs <= 0 && tb.pagina <= 0 && !tb.cruza, JSON.stringify(tb));
    await ctx.close(); }

  ok('sin errores de JavaScript durante la prueba', errores.length === 0, errores.slice(0, 2).join(' | '));
  await browser.close(); srv.close(); process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
