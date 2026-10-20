// Frente 5 · E3 «Intentar romperlo» en el sitio (lo que no cubren prueba_robustez.js ni prueba_casos_limite.js).
// Uso: node sitio_e3.js <carpeta r5> [ronda] [bloques separados por coma: A,B,C,D,E,F,G,H,I,J,K,L]
const path = require('path'), fs = require('fs'), cp = require('child_process');
const R5 = path.resolve(process.argv[2] || '.'); const RONDA = process.argv[3] || '1'; const SOLO = (process.argv[4] || 'A,B,C,D,E,F,G,H,I,J,K,L').split(',');
const L = require(path.join(R5, '04_pruebas', 'lib_pruebas.js'));
const SAL = path.join(__dirname, 'descargas_e3_' + RONDA); fs.mkdirSync(SAL, { recursive: true });
const CAP = path.join(__dirname, 'capturas_e3_' + RONDA); fs.mkdirSync(CAP, { recursive: true });
const res = []; const caso = (id, desc, obs, pasa) => { res.push({ id, desc, obs, pasa }); console.log(`${pasa ? 'PASA ' : 'FALLA'} ${id} · ${desc} · ${String(obs).replace(/\s+/g, ' ').slice(0, 300)}`); };
const D = L.decodificar(); const M = D.META;
const TLH = M.munNames.indexOf('Tláhuac'), IZT = M.munNames.indexOf('Iztapalapa');
const COLT = M.colonias.findIndex((c, i) => i > 0 && c && c.n && M.muns.indexOf(c.m) === TLH && D.F.some(f => f.col === i && !f.gc && f.prio >= 2));
const AV = (() => { const s = new Map(); for (const v of D.VP) if (v.mun === TLH) s.set(v.nom, (s.get(v.nom) || 0) + 1); return [...s].sort((a, b) => b[1] - a[1])[0][0]; })();

(async () => {
  const srv = await L.servidor(0); const browser = await L.lanzar(); const U = srv.url + '?modo=ligero';
  const abre = async (url, op = {}) => { const errores = []; const { page, ctx } = await L.abrir(browser, url, op, errores); page.setDefaultTimeout(150000); return { page, ctx, errores }; };
  const espDesc = page => page.waitForFunction(() => /^(Descargado|No fue|Descargado en CSV|El mapa de este|Este ámbito|Elige)/.test(document.getElementById('dl-status').textContent.trim()), null, { timeout: 180000 }).catch(() => {});

  // ---------------- A) doble clic real (ratón) en cada descarga ----------------
  if (SOLO.includes('A')) {
    const escenas = [[`${U}&a=${M.muns[TLH]}#nomap`, ['dl-frentes', 'dl-calles', 'dl-ficha-alc', 'dl-kml', 'dl-geojson']], [`${U}&c=${COLT}#nomap`, ['dl-ficha']],
      [`${U}&r=gc&a=${M.muns[TLH]}#nomap`, ['dl-tramos', 'dl-avenidas', 'dl-ficha-vpalc']], [`${U}&r=gc&v=${AV}#nomap`, ['dl-ficha-av']], [`${U}&a=${M.muns[TLH]}#nomap`, ['act-main', 'act-ficha']]];
    for (const [url, ids] of escenas) { const { page, ctx, errores } = await abre(url);
      for (const id of ids) { if (!id.startsWith('act')) await page.click('#tab-dl'); else await page.click('#tab-ini');
        const vis = await page.$eval('#' + id, b => !b.hidden && !b.disabled && b.getBoundingClientRect().height > 0).catch(() => false);
        if (!vis) { caso('A-' + id, `doble clic en ${id}`, 'botón no visible en este ámbito', true); continue; }
        const n = []; const h = d => n.push(d.suggestedFilename()); page.on('download', h);
        await page.dblclick('#' + id); await espDesc(page); await page.waitForTimeout(3500); page.off('download', h);
        const sinDic = n.filter(x => !/_diccionario\.csv$/.test(x));
        caso('A-' + id, `doble clic con el ratón en ${id} entrega un solo archivo`, `${sinDic.length}: ${sinDic.join(', ')}`, sinDic.length === 1); }
      caso('A-errores-' + ids[0], 'sin errores de JavaScript en los dobles clics', errores.slice(0, 2).join(' | '), errores.length === 0); await ctx.close(); } }

  // ---------------- B) doble toque en el teléfono ----------------
  if (SOLO.includes('B')) { const { page, ctx, errores } = await abre(`${U}&a=${M.muns[TLH]}#nomap`, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.tap('#tab-dl').catch(() => page.click('#tab-dl')); await page.waitForTimeout(400);
    for (const id of ['dl-frentes', 'dl-calles', 'dl-ficha-alc', 'dl-kml', 'dl-geojson']) {
      const vis = await page.$eval('#' + id, b => !b.hidden && !b.disabled && b.getBoundingClientRect().height > 0).catch(() => false); if (!vis) { caso('B-' + id, 'doble toque ' + id, 'no visible', true); continue; }
      await page.evaluate(() => document.querySelectorAll('#tp-dl details').forEach(d => { d.open = true; })); await page.$eval('#' + id, b => b.scrollIntoView({ block: 'center' })); await page.waitForTimeout(300);
      const n = []; const h = d => n.push(d.suggestedFilename()); page.on('download', h);
      const t0 = Date.now(); await page.tap('#' + id, { timeout: 15000 }).catch(() => {}); const t1 = Date.now(); const st1 = await page.$eval('#dl-status', s => s.textContent); await page.tap('#' + id, { timeout: 15000 }).catch(() => {}); const t2 = Date.now();
      await espDesc(page); await page.waitForTimeout(3500); page.off('download', h);
      const st = await page.$eval('#dl-status', s => s.textContent);
      caso('B-' + id, `doble toque en el teléfono (390 px) en ${id}: un archivo o un motivo claro`, `${n.length}: ${n.join(', ')} · entre toques ${t2 - t0} ms (1er toque tardó ${t1 - t0} ms; estado al 2º: «${st1.slice(0, 40)}») · «${st.slice(0, 90)}»`, n.length === 1 || (n.length === 0 && /teléfono|computadora/.test(st))); }
    caso('B-errores', 'sin errores de JavaScript en el teléfono', errores.slice(0, 2).join(' | '), errores.length === 0); await ctx.close(); }

  // ---------------- C) doble clic en filtros («Atiende», «Banqueta», «Espacio», casa) ----------------
  if (SOLO.includes('C')) { const { page, ctx, errores } = await abre(`${U}&a=${M.muns[IZT]}#nomap`);
    const foto = () => page.evaluate(() => ({ resp: document.body.dataset.resp, alc: document.querySelector('button[data-resp="alc"]').getAttribute('aria-pressed'), gc: document.querySelector('button[data-resp="gc"]').getAttribute('aria-pressed'),
      banq: (document.querySelector('.banq button[aria-pressed="true"]') || {}).dataset?.banq, esp: [...document.querySelectorAll('button[data-esp]')].map(b => b.getAttribute('aria-pressed')).join(''), url: location.search, titulo: document.getElementById('scope-title').textContent, aviso: document.getElementById('esp-aviso').hidden ? '' : document.getElementById('esp-aviso').textContent }));
    const coherente = f => { const p = new URLSearchParams(f.url); const r = p.get('r') || 'alc'; const e = p.get('e') || ''; const esPrend = f.esp.includes('true');
      return r === f.resp && (f.resp === 'gc' || (p.get('b') || 'todas') === f.banq) && (!!e === esPrend); };
    await page.dblclick('button[data-resp="gc"]'); await page.waitForTimeout(1500); let f = await foto();
    caso('C-01', 'doble clic en «Gobierno Central»: lo que se ve, el estado y la dirección coinciden', JSON.stringify(f), coherente(f));
    await page.dblclick('button[data-resp="alc"]'); await page.waitForTimeout(1500); f = await foto();
    caso('C-02', 'doble clic en «Alcaldías»', JSON.stringify(f), coherente(f));
    await L.ponResp(page, 'alc'); await page.dblclick('button[data-banq="con"]'); await page.waitForTimeout(1500); f = await foto();
    caso('C-03', 'doble clic en «Con» (banqueta): queda «Con» y la dirección lo dice', JSON.stringify(f), f.banq === 'con' && coherente(f));
    await page.dblclick('button[data-esp="0"]'); await page.waitForTimeout(6000); f = await foto();
    caso('C-04', 'doble clic en «Cepa vacante» mientras el inventario aún no llega: queda apagado y coherente', JSON.stringify(f), coherente(f) && !f.esp.includes('true') && !/Cargando/.test(f.aviso));
    await page.click('button[data-esp="1"]'); await page.waitForTimeout(4000); await page.dblclick('button[data-esp="2"]'); await page.waitForTimeout(2000); f = await foto();
    caso('C-05', 'con «Tocón» prendido, doble clic en «Árbol muerto»: queda solo «Tocón»', JSON.stringify(f), f.esp === 'falsetruefalse' && coherente(f));
    const kpiAntes = (await L.estado(page)).kpisTxt;
    await page.dblclick('#zcity'); await page.waitForTimeout(2000); f = await foto();
    caso('C-06', 'doble clic en la casa (toda la ciudad): se reinicia una vez, sin errores', `${JSON.stringify(f)} · antes ${kpiAntes.slice(0, 60)}`, coherente(f) && errores.length === 0);
    // cambiar de filtro con una descarga en curso
    await page.goto(`${U}&a=${M.muns[IZT]}#nomap`); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.click('#tab-dl');
    const n = []; page.on('download', d => n.push(d.suggestedFilename()));
    await page.$eval('#dl-frentes', b => b.click()); await page.waitForTimeout(150); await page.click('button[data-banq="con"]'); await page.waitForTimeout(150); await page.click('button[data-resp="gc"]');
    await espDesc(page); await page.waitForTimeout(3000);
    caso('C-07', 'cambiar banqueta y red mientras se prepara el Excel de frentes: el archivo corresponde a lo pedido al hacer clic (sin filtro de banqueta)', n.join(', '), n.length === 1 && !/con_banqueta/.test(n[0]) && /iztapalapa/.test(n[0]));
    caso('C-errores', 'sin errores de JavaScript', errores.slice(0, 2).join(' | '), errores.length === 0); await ctx.close(); }

  // ---------------- D) dos pestañas con filtros distintos y «Atrás» en una ----------------
  if (SOLO.includes('D')) { const { page: p1, ctx, errores } = await abre(`${U}#nomap`);
    await p1.selectOption('#alc', String(IZT)); await p1.waitForTimeout(800); await p1.click('button[data-banq="con"]'); await p1.waitForTimeout(800);
    const p2 = await ctx.newPage(); p2.on('pageerror', e => errores.push(e.message)); await p2.goto(`${U}#nomap`); await p2.waitForSelector('#loader[hidden]', { state: 'attached' }); await p2.waitForTimeout(600);
    const inicio2 = await L.estado(p2);
    await p2.click('button[data-resp="gc"]'); await p2.waitForTimeout(500); await p2.click('button[data-resp="alc"]'); await p2.waitForTimeout(500); await p2.selectOption('#alc', String(TLH)); await p2.waitForTimeout(800);
    await p1.goBack(); await p1.waitForTimeout(1200); const e1 = await L.estado(p1); const u1 = new URL(e1.url);
    const coincide = e1.alcSel === String(M.muns.indexOf(u1.searchParams.get('a'))) && (u1.searchParams.get('b') || 'todas') === (await p1.$eval('.banq button[aria-pressed="true"]', b => b.dataset.banq));
    caso('D-01', 'dos pestañas; «Atrás» en la primera: su pantalla coincide con su dirección y no toma la consulta de la otra', `p1 ${e1.titulo} · ${u1.search} · p2 abrió en «${inicio2.titulo}»`, coincide && /Iztapalapa/.test(e1.titulo));
    const ls = await p1.evaluate(() => [localStorage.getItem('cp_inicio'), localStorage.getItem('cp_red')]);
    const p3 = await ctx.newPage(); await p3.goto(`${U}#nomap`); await p3.waitForSelector('#loader[hidden]', { state: 'attached' }); await p3.waitForTimeout(600); const e3 = await L.estado(p3);
    caso('D-02', 'una tercera pestaña sin consulta abre en lo último recordado (informativo)', `recordado ${ls.join('/')} · abrió «${e3.titulo}»`, true);
    caso('D-errores', 'sin errores de JavaScript', errores.slice(0, 2).join(' | '), errores.length === 0); await ctx.close(); }

  // ---------------- E) «Atrás» y recarga a mitad del recorrido guiado ----------------
  if (SOLO.includes('E')) { for (const conHist of [false, true]) { const { page, ctx, errores } = await abre(`${U}#nomap`);
      if (conHist) { await page.selectOption('#alc', String(IZT)); await page.waitForTimeout(800); }
      await page.$eval('#open-info', b => b.click()); await page.waitForTimeout(500); await page.$eval('#rec-abrir', b => b.click()); await page.waitForTimeout(1500);
      for (let k = 0; k < 3; k++) { await page.$eval('.rec-sig', b => b.click()).catch(() => {}); await page.waitForTimeout(700); }
      const paso = await page.$eval('.rec-paso', e => e.textContent).catch(() => '');
      const urlAntes = page.url(); await page.goBack().catch(() => {}); await page.waitForTimeout(1500);
      const tras = await page.evaluate(() => ({ url: location.href, globo: !!document.querySelector('.rec-globo'), paso: (document.querySelector('.rec-paso') || {}).textContent, inerte: document.querySelector('.app') ? document.querySelector('.app').inert : null, titulo: (document.getElementById('scope-title') || {}).textContent })).catch(e => ({ fuera: true, url: page.url() }));
      await page.screenshot({ path: path.join(CAP, `E-atras-${conHist ? 'conhist' : 'sinhist'}.png`) }).catch(() => {});
      caso(conHist ? 'E-02' : 'E-01', `«Atrás» en el paso ${paso} del recorrido ${conHist ? '(después de elegir Iztapalapa)' : '(primera consulta de la pestaña)'}: el recorrido se cierra o sigue coherente, sin salir de la herramienta`, `${JSON.stringify(tras)}`, !tras.fuera && tras.url.startsWith(srv.url) && (!tras.globo || tras.inerte === true));
      // recarga a mitad del recorrido
      if (!tras.fuera && tras.url.startsWith(srv.url)) { if (!tras.globo) { await page.$eval('#open-info', b => b.click()); await page.waitForTimeout(500); await page.$eval('#rec-abrir', b => b.click()); await page.waitForTimeout(1500); await page.$eval('.rec-sig', b => b.click()); await page.waitForTimeout(600); }
        await page.reload(); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(2000);
        const r = await page.evaluate(() => ({ globo: !!document.querySelector('.rec-globo'), velo: !!document.querySelector('.rec-velo'), inerte: document.querySelector('.app').inert, visto: localStorage.getItem('cp_recorrido') }));
        caso(conHist ? 'E-04' : 'E-03', 'recarga a mitad del recorrido: la página queda usable (sin velo ni contenido inerte)', JSON.stringify(r), !r.velo && !r.inerte); }
      caso('E-errores-' + conHist, 'sin errores de JavaScript', errores.slice(0, 2).join(' | '), errores.length === 0); await ctx.close(); } }

  // ---------------- F) «Atrás» y recarga en la entrada (primera visita) ----------------
  if (SOLO.includes('F')) { const ctx = await browser.newContext({ locale: 'es-MX', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' }); await ctx.addInitScript(() => { window.SIA_PRUEBA = true; });
    const page = await ctx.newPage(); const errores = []; page.on('pageerror', e => errores.push(e.message));
    await page.goto(srv.url + 'img/logo_institucional.png').catch(() => {});   // una página anterior en el historial (como venir de un buscador o del correo)
    await page.goto(`${U}#nomap`); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(800);
    const e0 = await page.evaluate(() => !document.getElementById('entrada').hidden);
    await page.$eval('.entrada-red[data-red="alc"]', b => b.click()); await page.waitForTimeout(400);
    const p2 = await page.evaluate(() => !document.getElementById('entrada-p2').hidden);
    await page.goBack(); await page.waitForTimeout(1500);
    const tras = { url: page.url(), enHerramienta: page.url().startsWith(U.split('?')[0]) && !/logo/.test(page.url()) };
    if (tras.enHerramienta) Object.assign(tras, await page.evaluate(() => ({ entrada: !document.getElementById('entrada').hidden, paso1: !document.getElementById('entrada-p1').hidden })));
    caso('F-01', 'entrada, paso 2 (teléfono): «Atrás» del navegador regresa al paso 1 sin salir de la herramienta', `entrada visible ${e0} · paso2 ${p2} · ${JSON.stringify(tras)}`, tras.enHerramienta && tras.paso1);
    if (!tras.enHerramienta) { await page.goForward(); await page.waitForSelector('#loader[hidden]', { state: 'attached' }).catch(() => {}); await page.waitForTimeout(800); }
    await page.$eval('.entrada-red[data-red="gc"]', b => b.click()).catch(() => {}); await page.waitForTimeout(300); await page.reload(); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(800);
    const r = await page.evaluate(() => ({ entrada: !document.getElementById('entrada').hidden, paso1: !document.getElementById('entrada-p1').hidden, inerte: document.querySelector('.app').inert }));
    caso('F-02', 'recarga en el paso 2 de la entrada: vuelve a preguntar desde el paso 1, sin quedar trabada', JSON.stringify(r), r.entrada && r.paso1);
    caso('F-errores', 'sin errores de JavaScript', errores.slice(0, 2).join(' | '), errores.length === 0); await ctx.close(); }

  // ---------------- G) parámetros raros en la dirección ----------------
  if (SOLO.includes('G')) { const { page, ctx, errores } = await abre(`${U}#nomap`);
    const largo = 'x'.repeat(7000);   // más de ~8 KB lo rechaza el servidor (414 o 431) antes de llegar a la herramienta
    const casos = [['e=zz', 'e inválido'], ['e=cv&e=zz', 'e repetido'], ['e=cv,cv,cv,to', 'e con códigos repetidos'], ['e=%3Cscript%3Ealert(1)%3C/script%3E', 'e con <script>'], ['e=%F0%9F%8C%B3', 'e con emoji'],
      ['a=999', 'alcaldía inexistente'], ['a=__proto__', 'a=__proto__'], ['a=constructor', 'a=constructor'], ['a=toString&r=gc&v=' + AV, 'a=toString con avenida'], ['a=%00', 'a=%00'], ['a=' + largo, 'a de 7,000 caracteres'], ['a=%F0%9F%8C%B3', 'a con emoji'],
      ['c=-1', 'colonia negativa'], ['c=99999999', 'colonia fuera de rango'], ['c=1.5', 'colonia decimal'], ['c=0x10', 'colonia hexadecimal'], ['c=%3Cscript%3E', 'colonia con <script>'], ['c=' + COLT + '&a=' + M.muns[IZT], 'colonia de Tláhuac con a=Iztapalapa'], ['c=' + COLT + '&r=gc', 'colonia con r=gc'],
      ['v=999999&r=gc', 'avenida inexistente'], ['v=abc&r=gc', 'avenida no numérica'], ['v=' + AV, 'avenida sin r=gc'], ['r=xyz', 'r inválido'], ['r=gc&r=alc', 'r repetido'], ['b=CON', 'b en mayúsculas'], ['b=sin&r=gc', 'b con r=gc'], ['modo=%3Cscript%3E', 'modo con <script>'],
      ['a=007&a=011', 'a repetido'], ['c=' + COLT + '&e=cv&b=con&r=both', 'todo junto'], ['a=' + M.muns[TLH] + '%00', 'a con %00 al final']];
    for (const [q, d] of casos) { const n0 = errores.length; let t = Date.now();
      try { await page.goto(`${U}&${q}#nomap`); await page.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 120000 }); await page.waitForTimeout(700); } catch (e) { caso('G ' + d, 'carga con ' + d, 'no cargó: ' + e.message.slice(0, 80), false); continue; }
      const e = await L.estado(page); const ins = await page.evaluate(() => document.querySelectorAll('script:not([src])').length + (window.__iny ? 1 : 0));
      const malos = L.MALOS.test(e.panelTxt.replace(/null/g, '')) || /\[object|undefined|NaN/.test(e.titulo + e.crumb);
      caso('G ' + d, `dirección con ${d}: abre sin errores, sin texto roto y con la dirección normalizada`, `«${e.titulo}» · dirección ${decodeURIComponent(new URL(e.url).search).slice(0, 80)} · errores ${errores.length - n0} ${errores.slice(n0, n0 + 1).join('').slice(0, 80)} · ${((Date.now() - t) / 1000).toFixed(1)} s`, errores.length === n0 && !malos && ins === 0); }
    await ctx.close(); }

  // ---------------- H) buscador con entradas raras ----------------
  if (SOLO.includes('H')) { const { page, ctx, errores } = await abre(`${U}#nomap`);
    const entradas = [['2,000 caracteres', ('reforma iztapalapa ' + 'calle ').repeat(100).slice(0, 2000)], ['2,000 caracteres sin espacios', 'a'.repeat(2000)], ['emojis', '🌳🌳 Tláhuac 🚧'], ['acentos combinados (NFD)', 'Tláhuac'],
      ['comillas', `"'\`Roma' "Norte"`], ['<script>', '<script>window.__iny=1</script>'], ['lat 999', '999, -99.13'], ['lat 90 lon 180', '90, 180'], ['0,0', '0.0, 0.0'], ['-99,19 (al revés)', '-99.1332, 19.4326'],
      ['Maps @ malformado', 'https://www.google.com/maps/@abc,def,15z'], ['Maps @ fuera de rango', 'https://www.google.com/maps/@999.1,999.2,17z'], ['Maps ?q= con %2C', 'https://maps.google.com/?q=19.3000%2C-99.1019'], ['Maps corto', 'https://maps.app.goo.gl/AbCdEf'],
      ['geo: incompleto', 'geo:19.4'], ['DMS raro', `19°99'99"N 99°99'99"W`], ['solo signos', '%%%%$$$$####'], ['RTL y nulos', '‮\u0000Roma']];
    for (const [d, q] of entradas) { const n0 = errores.length; const t = Date.now();
      await page.fill('#omni', ''); await page.fill('#omni', q); const ms = Date.now() - t; await page.waitForTimeout(400);
      const r = await page.evaluate(() => ({ items: [...document.querySelectorAll('#omni-list li')].map(l => l.innerText.replace(/\s+/g, ' ').trim()).slice(0, 3), iny: window.__iny || 0 }));
      caso('H ' + d, `buscador con ${d}: responde rápido (≤ 1.5 s), sin errores ni código ejecutado, con un mensaje útil`, `${ms} ms · ${r.items.join(' | ').slice(0, 140)} · errores ${errores.length - n0}`, ms <= 1500 && errores.length === n0 && !r.iny && r.items.length > 0); }
    // elegir un punto fuera de la ciudad
    await page.fill('#omni', ''); await page.fill('#omni', '0.0, 0.0'); await page.waitForTimeout(400); const n0 = errores.length;
    await page.$eval('#omni-list li.opt', li => li.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))).catch(() => {}); await page.waitForTimeout(1500);
    const card = await page.$eval('#card', c => c.hidden ? '' : c.innerText.replace(/\s+/g, ' ')).catch(() => '');
    caso('H-punto-fuera', 'elegir el punto 0, 0 (fuera de la ciudad): lo dice y no se rompe', `ficha «${card.slice(0, 160)}» · errores ${errores.length - n0}`, errores.length === n0 && /Fuera|fuera/.test(card));
    await ctx.close(); }

  // ---------------- I) almacenamiento lleno o que lanza excepción ----------------
  if (SOLO.includes('I')) {
    const llena = () => { try { const t = 'x'.repeat(1 << 20); for (let i = 0; i < 20; i++) { try { localStorage.setItem('relleno' + i, t); } catch (e) { break; } } let s = 'y'.repeat(1 << 16); for (let i = 0; i < 400; i++) { try { localStorage.setItem('r' + i, s); } catch (e) { break; } } for (let i = 0; i < 200; i++) { try { sessionStorage.setItem('s' + i, 'z'.repeat(1 << 20)); } catch (e) { break; } } } catch (e) {} };
    for (const [id, init, desc] of [['I-01', llena, 'localStorage y sessionStorage llenos antes de cargar'], ['I-02', () => { for (const k of ['getItem', 'setItem', 'removeItem', 'key', 'clear']) Storage.prototype[k] = function () { throw new DOMException('denegado', 'SecurityError'); }; }, 'almacenamiento que lanza excepción en cada uso']]) {
      const ctx = await browser.newContext({ locale: 'es-MX', viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', acceptDownloads: true });
      await ctx.addInitScript(() => { window.SIA_PRUEBA = true; }); await ctx.addInitScript(init);
      const page = await ctx.newPage(); const errores = []; page.on('pageerror', e => errores.push(e.message));
      await page.goto(`${U}#nomap`); const ok1 = await page.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 150000 }).then(() => true).catch(() => false); await page.waitForTimeout(1000);
      const ent = await page.evaluate(() => !document.getElementById('entrada').hidden).catch(() => null);
      if (ent) { await page.$eval('.entrada-red[data-red="alc"]', b => b.click()); await page.waitForTimeout(300); await page.evaluate(() => [...document.querySelectorAll('#entrada-grid .entrada-op')].find(b => b.textContent === 'Tláhuac').click()); await page.waitForTimeout(1500); }
      const rec = await page.evaluate(() => !!document.querySelector('.rec-globo')); if (rec) { await page.keyboard.press('Escape'); await page.waitForTimeout(500); }
      await page.click('#tab-dl'); const d = await L.descargar(page, '#dl-calles', SAL, 120000).catch(() => null);
      await page.reload(); await page.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 150000 }).catch(() => {}); await page.waitForTimeout(1200);
      const ent2 = await page.evaluate(() => !document.getElementById('entrada').hidden);
      caso(id, `${desc}: abre, consulta y descarga; sin errores`, `cargó ${ok1} · entrada ${ent} · recorrido ${rec} · descarga ${d && d.nombre} · al recargar vuelve a preguntar ${ent2} · errores ${errores.length} ${errores.slice(0, 1).join('').slice(0, 80)}`, ok1 && !!d && errores.length === 0);
      await ctx.close(); } }

  // ---------------- J) reloj del equipo cambiado ----------------
  if (SOLO.includes('J')) { for (const [id, fecha, ymd, txt] of [['J-01', '2099-12-31T23:30:00-06:00', '20991231', '31 de diciembre de 2099'], ['J-02', '1999-01-01T08:00:00-06:00', '19990101', '1 de enero de 1999']]) {
      const ctx = await browser.newContext({ locale: 'es-MX', timezoneId: 'America/Mexico_City', viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', acceptDownloads: true });
      await L.sinEntrada(ctx); await ctx.addInitScript(() => { window.SIA_PRUEBA = true; });
      const page = await ctx.newPage(); const errores = []; page.on('pageerror', e => errores.push(e.message));
      await page.clock.setFixedTime(new Date(fecha));
      await page.goto(`${U}&a=${M.muns[TLH]}#nomap`); await page.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 150000 }); await page.waitForTimeout(800); await page.click('#tab-dl');
      const x = await L.descargar(page, '#dl-calles', SAL, 120000); const f = await L.descargar(page, '#dl-ficha-alc', SAL, 180000);
      const pdf = f ? cp.execFileSync('pdftotext', ['-enc', 'UTF-8', f.ruta, '-']).toString().replace(/\s+/g, ' ') : '';
      const ver = await page.$eval('#ver-line', e => e.textContent);
      caso(id, `reloj del equipo en ${fecha.slice(0, 10)}: la herramienta abre, los archivos llevan esa fecha y la versión no cambia`, `Excel ${x && x.nombre} · ficha ${f && f.nombre} · ficha dice «${txt}» ${pdf.includes(txt)} · ${ver.slice(0, 70)} · errores ${errores.length}`, !!x && !!f && x.nombre.includes(ymd) && errores.length === 0);
      await ctx.close(); } }

  // ---------------- K) archivos de toda la ciudad pedidos tres veces seguidas ----------------
  if (SOLO.includes('K')) { const { page, ctx, errores } = await abre(`${U}&r=gc#nomap`); await page.click('#tab-dl');
    const mem = () => page.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1);
    for (const id of ['dl-tramos', 'dl-avenidas', 'dl-kml']) { const ts = [], ns = [];
      for (let k = 0; k < 3; k++) { const d = await L.descargar(page, '#' + id, SAL, 240000); ts.push(d ? (d.ms / 1000).toFixed(1) : 'x'); ns.push(d ? d.bytes : 0); await espDesc(page); await page.waitForTimeout(500); }
      caso('K-' + id, `${id} de toda la ciudad tres veces seguidas: tres archivos iguales en tamaño`, `segundos ${ts.join(' / ')} · bytes ${ns.join(' / ')} · memoria ${await mem()} MB`, ns.every(n => n > 0 && n === ns[0])); }
    await page.goto(`${U}&a=${M.muns[IZT]}#nomap`); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.click('#tab-dl');
    for (const id of ['dl-frentes', 'dl-ficha-alc']) { const ts = [], ns = [];
      for (let k = 0; k < 3; k++) { const d = await L.descargar(page, '#' + id, SAL, 300000); ts.push(d ? (d.ms / 1000).toFixed(1) : 'x'); ns.push(d ? d.bytes : 0); await espDesc(page); await page.waitForTimeout(500); }
      caso('K-' + id + '-izt', `${id} de Iztapalapa (la más grande) tres veces seguidas`, `segundos ${ts.join(' / ')} · bytes ${ns.join(' / ')} · memoria ${await mem()} MB`, ns.every(n => n > 0) && Math.max(...ns) - Math.min(...ns) < 2048); }
    caso('K-errores', 'sin errores de JavaScript', errores.slice(0, 2).join(' | '), errores.length === 0); await ctx.close(); }

  // ---------------- L) teléfono girado en plena descarga ----------------
  if (SOLO.includes('L')) { const { page, ctx, errores } = await abre(`${U}&a=${M.muns[IZT]}#nomap`, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await page.click('#tab-dl'); await page.waitForTimeout(300);
    for (const id of ['dl-frentes', 'dl-ficha-alc']) { const n = []; const h = d => n.push(d.suggestedFilename()); page.on('download', h);
      await page.$eval('#' + id, b => b.click()); await page.waitForTimeout(300); await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(1500);
      const durante = await page.evaluate(() => ({ estado: (document.getElementById('act-status') || {}).textContent, ancho: document.documentElement.scrollWidth, vw: innerWidth }));
      await espDesc(page); await page.waitForTimeout(2500); await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(1200);
      const fin = await page.evaluate(() => ({ estado: document.getElementById('dl-status').textContent, ancho: document.documentElement.scrollWidth, vw: innerWidth }));
      await page.screenshot({ path: path.join(CAP, `L-${id}.png`) }); page.off('download', h);
      caso('L-' + id, `girar el teléfono durante ${id} y regresarlo: llega un archivo, el estado se ve y no hay desborde horizontal`, `${n.length} archivo(s) ${n.join(',')} · durante ${JSON.stringify(durante)} · al final ${JSON.stringify(fin).slice(0, 140)}`, n.length === 1 && fin.ancho <= fin.vw && durante.ancho <= durante.vw); }
    caso('L-errores', 'sin errores de JavaScript', errores.slice(0, 2).join(' | '), errores.length === 0); await ctx.close(); }

  console.log(`\nTOTAL ${res.length} casos · ${res.filter(r => r.pasa).length} pasan · ${res.filter(r => !r.pasa).length} fallan`);
  fs.writeFileSync(path.join(__dirname, `sitio_e3_ronda${RONDA}_${SOLO.join('')}.json`), JSON.stringify(res, null, 1));
  await browser.close(); srv.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
