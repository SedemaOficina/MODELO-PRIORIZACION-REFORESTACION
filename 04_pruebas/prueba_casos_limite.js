// Casos límite: consultas que mezclan red, alcaldía y avenida, el historial,
// colonias homónimas, descargas para mapa con una colonia y el candado de un archivo por clic.
// Uso: node 04_pruebas/prueba_casos_limite.js   · termina con código ≠ 0 si algo falla.
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const L = require('./lib_pruebas.js');
const SAL = process.env.SALIDA || fs.mkdtempSync(path.join(os.tmpdir(), 'lim-'));
const ok = L.Registro('casos límite');
const D = L.decodificar(); const M = D.META;
const slugDe = s => L.norm(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// ---- casos tomados de los datos ----
// avenida y una alcaldía que no cruza: la avenida con más tramos y la primera alcaldía fuera de su recorrido
const porAv = new Map(); for (const v of D.VP) { if (!porAv.has(v.nom)) porAv.set(v.nom, new Set()); porAv.get(v.nom).add(v.mun); }
const [AV, AVMUN] = [...porAv].sort((a, b) => b[1].size - a[1].size)[0];
const FUERA = M.muns.findIndex((m, i) => !AVMUN.has(i)); const DENTRO = [...AVMUN][0];
// colonia homónima (mismo nombre, CP y alcaldía): la primera
const vistos = new Map(); let HOM = null;
for (let i = 1; i < M.colonias.length && !HOM; i++) { const c = M.colonias[i]; if (!c.n) continue; const k = c.n + '|' + (c.cp || '') + '|' + c.m; if (vistos.has(k)) HOM = { n: c.n, ids: [vistos.get(k), i] }; else vistos.set(k, i); }
// colonia con frentes prioritarios en una alcaldía con vialidades primarias prioritarias
const COL = M.colonias.findIndex(c => c && c.n === 'Progreso Tizapan');

(async () => {
  const srv = await L.servidor(0); const browser = await L.lanzar(); const base = srv.url + '?modo=ligero'; const errores = [];

  // ---------- 1) avenida que no cruza la alcaldía elegida ----------
  { const { page, ctx } = await L.abrir(browser, `${base}&r=gc&a=${M.muns[FUERA]}&v=${AV}#nomap`, {}, errores);
    const e = await L.estado(page);
    ok('una dirección con una avenida que no cruza la alcaldía consulta la avenida en toda la ciudad', e.alcSel === '' && !!e.avinfo && !/ningún tramo/.test(e.avinfo), `${M.munNames[FUERA]} · ${(e.avinfo || '').slice(0, 90)}`);
    ok('sin cifras rotas en el panel', !L.MALOS.test(e.panelTxt));
    // con una alcaldía que sí cruza, se conserva
    await page.goto(`${base}&r=gc&a=${M.muns[DENTRO]}&v=${AV}#nomap`); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(600);
    const e2 = await L.estado(page);
    ok('con una alcaldía que la avenida sí cruza, la alcaldía se conserva', e2.alcSel === String(DENTRO) && /Las cifras de abajo son solo del tramo/.test(e2.avinfo || ''), M.munNames[DENTRO]);
    // la ficha de avenida con alcaldía lleva la frase de la alcaldía
    const f = await L.descargar(page, '#dl-ficha-av', SAL, 180000);
    const t = f ? cp.execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', f.ruta, '-']).toString().replace(/\s+/g, ' ') : '';
    ok('la ficha de avenida con alcaldía conserva la frase de la alcaldía', t.includes(`En ${M.munNames[DENTRO]}:`) && /tramos prioritarios/.test(t), f && f.nombre);
    await ctx.close(); }

  // ---------- 2) Atrás: cambiar de red al elegir no deja un paso intermedio ----------
  { const { page, ctx } = await L.abrir(browser, base + '#nomap', {}, errores);
    await L.elegir(page, 'Iztapalapa'); const h0 = (await L.estado(page)).histLen;
    await L.elegirTipo(page, 'Calzada de Tlalpan', 'Av'); const e1 = await L.estado(page);
    ok('elegir una avenida desde Alcaldías agrega un solo paso al historial', e1.resp === 'gc' && e1.histLen === h0 + 1, `${h0} → ${e1.histLen}`);
    await page.goBack(); await page.waitForTimeout(1200); const e2 = await L.estado(page);
    ok('Atrás regresa a la consulta anterior (Alcaldías, Iztapalapa)', e2.resp === 'alc' && e2.titulo === 'Iztapalapa', `${e2.resp} · ${e2.titulo}`);
    await ctx.close(); }

  // ---------- 3) colonia homónima: nombre de archivo que la distingue ----------
  if (HOM) { const { page, ctx } = await L.abrir(browser, `${base}&c=${HOM.ids[1]}#nomap`, {}, errores);
    const f = await L.descargar(page, '#dl-ficha', SAL, 180000);
    ok('la ficha de una colonia homónima dice qué parte es en el nombre del archivo', !!f && f.nombre.includes(slugDe(HOM.n) + '_parte_2_de_'), `${HOM.n} · ${f && f.nombre}`);
    const x = await L.descargar(page, '#dl-calles', SAL, 180000);
    ok('el Excel de una colonia homónima también lo dice', !!x && x.nombre.includes('_parte_2_de_'), x && x.nombre);
    await ctx.close(); } else ok('hay colonias homónimas en los datos', false);

  // ---------- 4) mapa de una colonia con las dos redes; doble clic ----------
  { const { page, ctx } = await L.abrir(browser, `${base}&r=both&c=${COL}#nomap`, {}, errores);
    const k = await L.descargar(page, '#dl-kml', SAL); const xml = k ? fs.readFileSync(k.ruta, 'utf8') : '';
    const carpetas = (xml.match(/<Folder><name>[^<]+/g) || []).map(s => s.replace('<Folder><name>', ''));
    ok('KML de una colonia con las dos redes: solo los frentes de la colonia, sin vialidades de toda la alcaldía', carpetas.length === 1 && /alcaldía/.test(carpetas[0]), carpetas.join(' | '));
    ok('KML de una colonia con las dos redes: avisa que las vialidades primarias se descargan desde la alcaldía', /no se incluyen las vialidades primarias/.test(xml));
    const n = []; page.on('download', d => n.push(d.suggestedFilename()));
    await page.evaluate(() => { const b = document.getElementById('dl-geojson'); b.click(); b.click(); }); await page.waitForTimeout(4000);
    ok('doble clic en GeoJSON entrega un solo archivo', n.length === 1, n.join(', '));
    await ctx.close(); }

  ok('sin errores de JavaScript durante la prueba', errores.length === 0, errores.slice(0, 2).join(' | '));
  await browser.close(); srv.close(); process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
