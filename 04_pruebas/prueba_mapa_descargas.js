// v17.29 · Descargas para abrir en un mapa: KML (Google Earth) y GeoJSON (SIG) con las calles prioritarias de la consulta.
// Comprueba que los archivos son válidos, que traen los mismos registros que las cifras de la pantalla y que no se entregan
// archivos vacíos ni, en teléfono, archivos demasiado pesados.
// Uso: node 04_pruebas/prueba_mapa_descargas.js   · termina con código ≠ 0 si algo falla.
const fs = require('fs'), path = require('path'), os = require('os');
const L = require('./lib_pruebas.js');
const SAL = process.env.SALIDA || fs.mkdtempSync(path.join(os.tmpdir(), 'geo-'));
const ok = L.Registro('descargas para mapa');
const enCDMX = c => c[0] > -99.4 && c[0] < -98.9 && c[1] > 19.0 && c[1] < 19.65;
const num = t => +String(t).replace(/,/g, '').match(/[\d.]+/)[0];

(async () => {
  const srv = await L.servidor(0); const browser = await L.lanzar(); const U = srv.url + '?modo=ligero#nomap'; const errores = [];
  { const { page, ctx } = await L.abrir(browser, U, {}, errores);
    const b0 = await page.evaluate(() => ({ kml: document.getElementById('dl-kml').disabled, gj: document.getElementById('dl-geojson').disabled }));
    ok('en toda la ciudad, con Alcaldías, los botones de mapa están deshabilitados', b0.kml && b0.gj);
    // ---------- colonia ----------
    await L.elegirTipo(page, 'Progreso Tizapan', 'Col'); await page.waitForTimeout(500);
    const e = await L.estado(page); const nPrio = num(e.kpis[2].v), kmPrio = num(e.kpis[0].v);
    const g = await L.descargar(page, '#dl-geojson', SAL);
    ok('GeoJSON de una colonia: se descarga con nombre, ámbito y fecha', !!g && /^calles_prioritarias_mapa_alvaro_obregon_progreso_tizapan_\d{8}\.geojson$/.test(g.nombre), g && g.nombre);
    const J = JSON.parse(fs.readFileSync(g.ruta, 'utf8')); const F = J.features;
    ok('GeoJSON válido: colección de líneas con al menos dos vértices dentro de la ciudad', J.type === 'FeatureCollection' && F.length > 0 && F.every(f => f.type === 'Feature' && f.geometry.type === 'LineString' && f.geometry.coordinates.length >= 2 && f.geometry.coordinates.every(enCDMX)), `${F.length} líneas`);
    ok('GeoJSON: tantas líneas como frentes prioritarios dice la pantalla', F.length === nPrio, `${F.length} vs ${nPrio}`);
    const km = F.reduce((t, f) => t + f.properties.longitud_m, 0) / 1000;
    ok('GeoJSON: sus longitudes suman los km prioritarios de la pantalla', Math.abs(km - kmPrio) < 0.06, `${km.toFixed(3)} vs ${kmPrio}`);
    ok('GeoJSON: solo Muy Alta y Alta, a cargo de la alcaldía, con vialidad y colonia', F.every(f => /^(Muy Alta|Alta)$/.test(f.properties.prioridad) && f.properties.responsable === 'Alcaldía' && f.properties.vialidad && f.properties.colonia === 'Progreso Tizapan' && Number.isInteger(f.properties.id_frente)));
    ok('GeoJSON: declara fuentes y versión, sin aviso de asignación preliminar', /INEGI/.test(J.descripcion) && !/preliminar/.test(J.descripcion) && /Versión \d+\.\d+/.test(J.descripcion));
    const k = await L.descargar(page, '#dl-kml', SAL); const xml = fs.readFileSync(k.ruta, 'utf8');
    const K = await page.evaluate(x => { const d = new DOMParser().parseFromString(x, 'application/xml'); const pm = [...d.getElementsByTagName('Placemark')];
      return { error: d.getElementsByTagName('parsererror').length, n: pm.length, estilos: [...d.getElementsByTagName('Style')].map(s => s.getAttribute('id')), sinEstilo: pm.filter(p => !d.querySelector('Style[id="' + p.getElementsByTagName('styleUrl')[0].textContent.slice(1) + '"]')).length,
        coords: pm.every(p => p.getElementsByTagName('coordinates')[0].textContent.trim().split(/\s+/).length >= 2), carpetas: [...d.getElementsByTagName('Folder')].map(f => f.getElementsByTagName('name')[0].textContent), datos: pm[0].getElementsByTagName('Data').length, colores: [...d.getElementsByTagName('color')].map(c => c.textContent) }; }, xml);
    ok('KML de una colonia: XML bien formado, con nombre y fecha', !!k && /\.kml$/.test(k.nombre) && /_\d{8}\.kml$/.test(k.nombre) && K.error === 0 && xml.startsWith('<?xml'), k && k.nombre);
    ok('KML: las mismas líneas que el GeoJSON, cada una con estilo, coordenadas y atributos', K.n === F.length && K.sinEstilo === 0 && K.coords && K.datos >= 7, JSON.stringify({ n: K.n, estilos: K.estilos }));
    ok('KML: colores de prioridad en formato aabbggrr y una sola carpeta (alcaldía)', K.colores.every(c => /^ff[0-9a-f]{6}$/.test(c)) && new Set(K.colores).size === 2 && K.carpetas.length === 1 && /alcaldía/.test(K.carpetas[0]), K.colores.join(' '));
    // ---------- alcaldía grande en escritorio ----------
    await L.elegir(page, 'Iztapalapa'); await page.waitForTimeout(500);
    const gi = await L.descargar(page, '#dl-geojson', SAL, 180000); const JI = JSON.parse(fs.readFileSync(gi.ruta, 'utf8'));
    const eI = await L.estado(page);
    ok('GeoJSON de una alcaldía grande: se entrega completo y válido', JI.features.length > 20000 && JI.features.every(f => f.geometry.coordinates.length >= 2), `${JI.features.length} líneas · ${(gi.bytes / 1e6).toFixed(1)} MB · ${gi.ms} ms`);
    ok('sus longitudes suman los km prioritarios de la alcaldía', Math.abs(JI.features.reduce((t, f) => t + f.properties.longitud_m, 0) / 1000 - num(eI.kpis[0].v)) < 1, eI.kpis[0].v);
    // ---------- Gobierno Central ----------
    await L.clic(page, '#zcity'); await L.ponResp(page, 'gc'); await page.waitForTimeout(400);
    ok('con Gobierno Central, en toda la ciudad, los botones de mapa se habilitan', await page.evaluate(() => !document.getElementById('dl-kml').disabled));
    const gg = await L.descargar(page, '#dl-geojson', SAL); const JG = JSON.parse(fs.readFileSync(gg.ruta, 'utf8'));
    ok('GeoJSON de vialidades primarias: tramos prioritarios a cargo del Gobierno Central', JG.features.length > 0 && JG.features.every(f => f.properties.responsable === 'Gobierno Central' && /^(Muy Alta|Alta)$/.test(f.properties.prioridad) && f.geometry.coordinates.every(enCDMX)) && /^calles_prioritarias_mapa_vialidades_primarias_ciudad_\d{8}\.geojson$/.test(gg.nombre), `${JG.features.length} líneas · ${gg.nombre}`);
    const kmG = JG.features.reduce((t, f) => t + f.properties.longitud_m, 0) / 1000; const eG = await L.estado(page);
    ok('sus longitudes suman los km prioritarios de vialidad primaria de la pantalla', Math.abs(kmG - num(eG.kpis[0].v)) < 1, `${kmG.toFixed(1)} vs ${eG.kpis[0].v}`);
    await L.ponResp(page, 'both'); await L.elegir(page, 'Milpa Alta'); await page.waitForTimeout(400);
    const kb = await L.descargar(page, '#dl-kml', SAL); const xb = fs.readFileSync(kb.ruta, 'utf8');
    ok('con las dos redes, el KML trae dos carpetas', (xb.match(/<Folder>/g) || []).length === 2 && /Gobierno Central/.test(xb) && /alcaldía/.test(xb));
    ok('sin NaN ni undefined en los archivos', !/NaN|undefined|\[object/.test(xb) && !/NaN|undefined|\[object/.test(JSON.stringify(J)));
    await ctx.close(); }
  // ---------- teléfono ----------
  { const { page, ctx } = await L.abrir(browser, U, { viewport: { width: 390, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, errores);
    await L.elegir(page, 'Iztapalapa'); await page.waitForTimeout(500);
    let n = 0; page.on('download', () => n++); await page.evaluate(() => document.getElementById('dl-kml').click()); await page.waitForTimeout(1500);
    const st = await page.$eval('#dl-status', x => x.textContent);
    ok('en teléfono, el mapa de una alcaldía grande no se descarga y se explica por qué', n === 0 && /demasiado pesado/.test(st) && /colonia/.test(st), st);
    await L.elegirTipo(page, 'Progreso Tizapan', 'Col'); await page.waitForTimeout(500);
    const kt = await L.descargar(page, '#dl-kml', SAL);
    ok('en teléfono, el KML de una colonia sí se descarga', !!kt && kt.bytes > 1000, kt && kt.nombre);
    await ctx.close(); }
  ok('sin errores de JavaScript durante la prueba', errores.length === 0, errores.slice(0, 2).join(' | '));
  await browser.close(); srv.close(); process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
