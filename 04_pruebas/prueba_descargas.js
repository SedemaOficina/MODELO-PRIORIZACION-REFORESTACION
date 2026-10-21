// Descargas (bloque 4 de la auditoría del 19 oct 2026, v1.40). Comprueba:
//  1) «Lista de calles» y «Lista de avenidas» traen las mismas filas y en el mismo orden que «Dónde empezar» con su «Mostrar» (C1-01):
//     3 alcaldías × orden por km y por cepas; los 40 primeros renglones iguales y el mismo total;
//  2) si se cambia de alcaldía mientras el inventario tarda, el Excel y su diccionario son de la alcaldía pedida (B3-01);
//  3) con el inventario colgado, el Excel llega en 20 s o menos, sin las columnas de espacios, y lo dice (B5-03);
//  4) un doble clic en la ficha PDF da un solo archivo (B3-04);
//  5) «Las 16 alcaldías» cuadra con un cálculo propio desde docs/datos (C1-03);
//  6) títulos con acentos, nombres que dicen qué traen y fecha de la Ciudad de México con el equipo en otra zona (B3-02, B8-02).
// Uso: node 04_pruebas/prueba_descargas.js   · termina con código ≠ 0 si algo falla.
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const L = require('./lib_pruebas.js');
const SAL = process.env.SALIDA || fs.mkdtempSync(path.join(os.tmpdir(), 'descargas-'));
const ok = L.Registro('descargas');
const xlsx = ruta => JSON.parse(cp.execFileSync(L.PY, ['-c', `
import openpyxl, json, sys
wb = openpyxl.load_workbook(sys.argv[1], read_only=True)
print(json.dumps({'titulo': wb.properties.title, 'datos': [list(r) for r in wb['Datos'].iter_rows(values_only=True)], 'dic': [list(r) for r in wb['Diccionario'].iter_rows(values_only=True)]}, default=str))`, ruta], { maxBuffer: 1 << 28 }).toString());
const dicVal = (X, campo) => { const r = X.dic.find(f => f[0] === campo); return r ? String(r[1]) : ''; };
const CDMX = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d).replace(/-/g, '');

(async () => {
  const D = L.decodificar(); const mun = n => D.META.munNames.indexOf(n);
  const srv = await L.servidor(0); const browser = await L.lanzar(); const U = srv.url + '?modo=ligero'; const errores = [];
  // la lista de «Dónde empezar» tal como se ve: nombre y, en calles, colonia; con «Ver 10 más» hasta n renglones
  const lista = async (p, n) => { for (let k = 0; k < 60; k++) { const c = await p.$$eval('#ini-list li:not(.empty)', l => l.length); if (c >= n || !(await p.$eval('#ini-mas', b => !b.hidden))) break; await p.$eval('#ini-mas', b => b.click()); }
    return p.$$eval('#ini-list li:not(.empty)', ls => ls.map(li => { const n = li.querySelector('.n'), pos = n.querySelector('.pos'); const t = li.querySelector('.t');
      return { nombre: n.textContent.slice(pos ? pos.textContent.length : 0).trim(), donde: t ? t.textContent.split(' · ')[0].trim() : '' }; })); };
  const orden = async (p, v) => { await p.selectOption('#ini-orden', v); await p.waitForFunction(v2 => window.__INV.esp().orden === v2 && window.__INV.esp().pendiente === null, v, { timeout: 60000 }); await p.waitForTimeout(300); };
  // el mismo botón no acepta otro clic hasta 1.5 s después de entregar (GEN_PAUSA): entre dos descargas seguidas se espera eso
  const GEN_PAUSA = 1700;
  const total = async p => L.numEs(await p.$eval('#ini-count', e => e.textContent));

  // ---------- 1) Lista de calles y de avenidas = «Dónde empezar» ----------
  { const { page } = await L.abrir(browser, U + '#nomap', {}, errores);
    for (const [nom, cod] of [['Coyoacán', '003'], ['Iztapalapa', '007'], ['Tlalpan', '012']]) {
      await page.goto(U + `&a=${cod}#nomap`); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(500);
      for (const v of ['calles', 'callescv']) {
        await orden(page, v); const pant = await lista(page, 40), tot = await total(page); await page.waitForTimeout(GEN_PAUSA);
        const x = await L.descargar(page, '#dl-calles', SAL, 240000); const X = x ? xlsx(x.ruta) : { datos: [[]], dic: [] }; const h = X.datos[0];
        const exc = X.datos.slice(1).map(r => ({ nombre: String(r[h.indexOf('vialidad')]), donde: String(r[h.indexOf('colonia')]) }));
        const malas = pant.slice(0, 40).map((f, k) => exc[k] && exc[k].nombre === f.nombre && exc[k].donde === f.donde ? null : k + 1).filter(Boolean);
        ok(`Lista de calles = pantalla · ${nom} · ${v}`, x && pant.length >= Math.min(40, tot) && malas.length === 0 && exc.length === tot, `pantalla ${pant.length} de ${tot}; Excel ${exc.length}; distintos en ${malas.slice(0, 5).join(', ') || 'ninguno'}`);
        // el renglón del Gobierno Central del diccionario (v1.37) = la cifra de la nota del Resumen, «… (N km sobre tramos prioritarios)»
        if (v === 'calles') { const nota = (await page.$eval('#bars-note', e => e.textContent)).replace(/\s+/g, ' '), m = nota.match(/\(([\d,.]+) km sobre tramos prioritarios/);
          const gx = +dicVal(X, 'Km de frente a cargo del Gobierno Central sobre tramos prioritarios (sin filtro de banqueta; el espacio, por su tramo)');
          ok(`diccionario: km de frente del Gobierno Central sobre tramos prioritarios = el del Resumen · ${nom}`, !!m && Math.abs(gx - L.numEs(m[1])) <= 0.5, `${gx} vs ${m && m[1]}`); }
        if (v === 'callescv') { const i = h.indexOf('cepas_vacantes_prioritario'), cs = X.datos.slice(1).map(r => r[i]);
          ok(`Lista de calles por cepas: columna cepas_vacantes_prioritario y orden de mayor a menor · ${nom}`, i >= 0 && cs.slice(0, 40).every((c, k) => k === 0 || cs[k - 1] >= c), `columna ${i}`);
          ok(`el diccionario dice el orden · ${nom}`, /más cepas vacantes/.test(dicVal(X, 'Orden'))); }
      }
    }
    // avenidas, solo Gobierno Central
    await page.goto(U + '&r=gc&a=007#nomap'); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(500);
    for (const v of ['av', 'avcv']) {
      await orden(page, v); const pant = await lista(page, 40), tot = await total(page); await page.waitForTimeout(GEN_PAUSA);
      const x = await L.descargar(page, '#dl-avenidas', SAL, 240000); const X = x ? xlsx(x.ruta) : { datos: [[]], dic: [] }; const h = X.datos[0];
      const exc = X.datos.slice(1).map(r => String(r[h.indexOf('vialidad')]));
      const malas = pant.map((f, k) => exc[k] === f.nombre ? null : k + 1).filter(Boolean);
      const sinPrio = X.datos.slice(1).filter(r => !r[h.indexOf('km_prioritario')] && !(r[h.indexOf('cepas_vacantes_prioritario')] || r[h.indexOf('cepas_vacantes')]));
      ok(`Lista de avenidas = pantalla · Iztapalapa · ${v}`, x && malas.length === 0 && exc.length === tot && sinPrio.length === 0, `pantalla ${pant.length} de ${tot}; Excel ${exc.length}; distintos ${malas.length}; sin km ni cepas ${sinPrio.length}`);
    }
    await page.context().close(); }

  // ---------- 2) cambio de alcaldía mientras tarda el inventario ----------
  { const { page, ctx } = await L.abrir(browser, U + '&a=009#nomap', {}, errores);
    await ctx.route(/espacios_(frentes|vp)\.bin/, async r => { await new Promise(s => setTimeout(s, 8000)); await r.continue(); });
    const tla = mun('Tláhuac');
    const pd = page.waitForEvent('download', { timeout: 120000 }).catch(() => null);
    await page.$eval('#dl-frentes', b => b.click()); await page.waitForTimeout(800);
    await page.selectOption('#alc', String(tla)); const d = await pd;
    let X = { datos: [[]], dic: [] }, nombre = ''; if (d) { nombre = d.suggestedFilename(); const r = path.join(SAL, nombre); await d.saveAs(r); X = xlsx(r); }
    const h = X.datos[0] || [], alcs = new Set(X.datos.slice(1).map(r => r[h.indexOf('alcaldia')]));
    ok('cambio de alcaldía durante la espera: el archivo, su nombre y su diccionario son de Milpa Alta', !!d && /milpa_alta/.test(nombre) && alcs.size === 1 && alcs.has('Milpa Alta') && /^Milpa Alta/.test(dicVal(X, 'Ámbito consultado')) && /Milpa Alta/.test(X.titulo || ''),
      `${nombre} · ámbito «${dicVal(X, 'Ámbito consultado')}» · título «${X.titulo}»`);
    await ctx.close(); }

  // ---------- 3) inventario colgado ----------
  { const { page, ctx } = await L.abrir(browser, U + `&a=011#nomap`, {}, errores);
    await ctx.route(/espacios_(frentes|vp)\.bin/, () => {});   // nunca responde
    const x = await L.descargar(page, '#dl-frentes', SAL, 60000); const X = x ? xlsx(x.ruta) : { datos: [[]], dic: [] };
    const st = await page.$eval('#dl-status', e => e.textContent);
    ok('inventario colgado: el Excel llega en 20 s o menos, sin columnas de espacios, y lo dice', !!x && x.ms <= 20000 && !X.datos[0].includes('cepas_vacantes') && /no llegó/.test(dicVal(X, 'Espacios para plantar (inventario de arbolado)')) && /tardó demasiado/.test(st),
      x ? `${x.ms} ms · «${st}»` : 'no llegó');
    const g = await L.descargar(page, '#dl-geojson', SAL, 60000);
    ok('inventario colgado: el GeoJSON también llega en 20 s o menos', !!g && g.ms <= 20000 && /no llegó en 15 segundos/.test(fs.readFileSync(g.ruta, 'utf8').slice(0, 4000)), g ? g.ms + ' ms' : 'no llegó');
    await ctx.close(); }

  // ---------- 4) doble clic en la ficha PDF ----------
  { const { page, ctx } = await L.abrir(browser, U + '&a=011#nomap', {}, errores);
    await L.descargar(page, '#dl-ficha-alc', SAL, 120000); await page.waitForTimeout(2000);   // la librería ya cargada: la ficha sale en menos de 300 ms
    let n = 0; page.on('download', () => n++);
    for (const ms of [400, 600]) { n = 0; await page.$eval('#dl-ficha-alc', b => b.click()); await page.waitForTimeout(ms); await page.$eval('#dl-ficha-alc', b => b.click()); await page.waitForTimeout(3000);
      ok(`dos clics a ${ms} ms en la ficha PDF: un solo archivo`, n === 1, `${n} archivos`); }
    await ctx.close(); }

  // ---------- 5) las 16 alcaldías y 6) nombres, títulos y fecha de la CDMX ----------
  { const { page, ctx } = await L.abrir(browser, U + '&r=both#nomap', { timezoneId: 'Asia/Tokyo' }, errores);
    await ctx.clock.setFixedTime(new Date('2026-10-20T23:30:00-06:00'));   // en Tokio ya es 21 de octubre; en la CDMX, 20
    const vis = await page.$eval('#dl-alcaldias', b => !b.hidden && !b.closest('.dl-grupo').hidden);
    const x = await L.descargar(page, '#dl-alcaldias', SAL, 240000); const X = x ? xlsx(x.ruta) : { datos: [[]], dic: [] }; const h = X.datos[0];
    const col = n => h.indexOf(n); let malas = [];
    for (const r of X.datos.slice(1)) { const m = mun(r[col('alcaldia')]), F = L.resumenFrentes(D, { mun: m, gc: 0 }), V = L.resumenVP(D, { mun: m });
      let gcp = 0; for (const f of D.F) if (f.gc && f.mun === m) { const p = f.vp >= 0 ? D.VP[f.vp].prio : f.prio; if (p >= L.PRIO_MIN) gcp += f.len / 1000; }
      const esp = [['km_frente_prioritario_alcaldia', F.kmp], ['km_frente_total_alcaldia', F.kmt], ['frentes_prioritarios_alcaldia', F.np], ['km_vialidad_prioritaria_gobierno_central', V.kmp], ['tramos_prioritarios_gobierno_central', V.recsp.size], ['km_frente_prioritario_gobierno_central', gcp], ['km_frente_prioritario_total', F.kmp + gcp]];
      for (const [c, v] of esp) if (Math.abs(r[col(c)] - v) > 0.011) malas.push(`${r[0]} ${c}: ${r[col(c)]} ≠ ${v.toFixed(2)}`); }
    const kmA = X.datos.slice(1).map(r => r[col('km_frente_prioritario_alcaldia')]);
    ok('Las 16 alcaldías: visible en toda la ciudad, 16 renglones, de mayor a menor', vis && X.datos.length === 17 && kmA.every((v, k) => k === 0 || kmA[k - 1] >= v), `${X.datos.length - 1} renglones`);
    ok('Las 16 alcaldías: cifras iguales al cálculo propio desde docs/datos', malas.length === 0, malas.slice(0, 3).join('; ') || '7 columnas × 16');
    ok('fecha del nombre: la de la Ciudad de México aunque el equipo esté en otra zona', !!x && x.nombre === `las_16_alcaldias_${CDMX(new Date('2026-10-20T23:30:00-06:00'))}.xlsx` && /20 de octubre de 2026/.test(dicVal(X, 'Fecha de generación')), x && x.nombre);
    ok('título del Excel con acentos', /^Las 16 alcaldías · Ciudad de México/.test(X.titulo || ''), X.titulo);
    await page.goto(U + '&r=gc&a=007#nomap'); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(500);
    const g = await L.descargar(page, '#dl-kml', SAL, 120000), t = await L.descargar(page, '#dl-tramos', SAL, 240000), T = t ? xlsx(t.ruta) : {};
    ok('nombres: mapa de vialidades primarias y tramo por tramo', !!g && /^mapa_vialidades_primarias_prioritarias_iztapalapa_\d{8}\.kml$/.test(g.nombre) && !!t && /^tramo_por_tramo_vialidades_primarias_iztapalapa_\d{8}\.xlsx$/.test(t.nombre), `${g && g.nombre} · ${t && t.nombre}`);
    ok('título del Excel de tramos: «Tramo por tramo · Iztapalapa»', /^Tramo por tramo · Iztapalapa/.test(T.titulo || ''), T.titulo);
    // su equivalente en km de frente (v1.37: de los tramos prioritarios) = el del Resumen, «Equivalen a … N km sobre tramos prioritarios»
    await page.evaluate(() => { document.getElementById('tab-res').click(); document.querySelectorAll('.panel details').forEach(d => d.open = true); }); await page.waitForTimeout(300);
    const eqP = await page.$eval('.panel', e => { const m = e.innerText.replace(/\s+/g, ' ').match(/Equivalen a [\d,.]+ km de frente de manzana \(aceras con manzana enfrente\), ([\d,.]+) km sobre tramos prioritarios/); return m ? m[1] : null; });
    const eqX = +dicVal(T, 'Equivalente en km de frente de manzana de los tramos prioritarios (Muy Alta, Alta y Media)');
    ok('diccionario de tramo por tramo: equivalente en km de frente = el del Resumen', eqP !== null && Math.abs(eqX - L.numEs(eqP)) <= 0.5, `${eqX} vs ${eqP}`);
    await ctx.close(); }

  ok('sin errores de la página', errores.length === 0, errores.slice(0, 3).join(' | '));
  await browser.close(); srv.close();
  process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
