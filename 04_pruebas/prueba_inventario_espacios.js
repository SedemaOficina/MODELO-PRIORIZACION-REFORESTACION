// Espacios para plantar (inventario de arbolado): cifras de control de los datos publicados contra un recálculo propio (y contra el CSV
// del inventario si está en el equipo), frente asignado a 20 m o menos, capa que aparece al acercar y no de lejos, casillas que encienden
// y apagan cada tipo, ficha de una cepa (tipo, clave, calle, prioridad del frente y Street View) que gana al frente de debajo, teclado,
// celular de 390 px sin desborde ni encimados, y sin errores de JavaScript. La capa no cambia ninguna cifra del modelo.
// Lee el estado de la capa con window.__INV y window.__MAPA, que solo existen con window.SIA_PRUEBA.
// Uso: node 04_pruebas/prueba_inventario_espacios.js   · termina con código ≠ 0 si algo falla.
// El CSV se busca en INVENTARIO_ARBOLADO_CSV o en ../adopta-un-arbol/00_insumos/arbolado/arbolado_cdmx_sep.csv; si no está, esa parte se omite.
const fs = require('fs'), path = require('path'), zlib = require('zlib'), readline = require('readline'), crypto = require('crypto');
const L = require('./lib_pruebas.js');
const ok = L.Registro('espacios para plantar');
const RAIZ = path.join(__dirname, '..');
const CSV = process.env.INVENTARIO_ARBOLADO_CSV || path.join(RAIZ, '..', 'adopta-un-arbol', '00_insumos', 'arbolado', 'arbolado_cdmx_sep.csv');
const RES = JSON.parse(fs.readFileSync(path.join(RAIZ, '02_fuente', 'datos', 'inventario', 'RESUMEN.json'), 'utf8'));
const TIPOS_CSV = { 'Cepa Vacante': 0, 'Tocón': 1, 'Árbol Muerto': 2 };
const ESC = 200000, KX = 111320 * Math.cos(19.4 * Math.PI / 180), KY = 110540;
const IZTAPALAPA = { longitude: -99.0565, latitude: 19.3445 };

// ---------- decodificador propio de docs/datos/inventario/*.bin (independiente de la aplicación) ----------
function leeInventario(D) {
  const out = {};
  for (const cve of D.META.muns) {
    const raw = zlib.gunzipSync(fs.readFileSync(path.join(L.DOCS, 'datos', 'inventario', `inv_${cve}.bin`))); let rp = 0;
    const rv = () => { let res = 0, sh = 0, b; do { b = raw[rp++]; res += (b & 0x7f) * Math.pow(2, sh); sh += 7; } while (b & 0x80); return (res % 2) ? -((res + 1) / 2) : res / 2; };
    const formato = rv(), n = rv(); const P = []; let x = 0, y = 0, fr = 0, pre = 0, uga = 0, num = 0;
    // formato 2 (v1.24): al final de cada punto, la parte de vialidad primaria + 1 de un punto del camellón (0 en los demás)
    for (let i = 0; i < n; i++) { x += rv(); y += rv(); const t = rv(); fr += rv(); pre += rv(); uga += rv(); num += rv(); const vp = formato >= 2 ? rv() - 1 : -1; P.push({ lon: x / ESC, lat: y / ESC, t, fr: fr - 1, vp, clave: String.fromCharCode(65 + Math.floor(pre / 676), 65 + Math.floor(pre / 26) % 26, 65 + pre % 26) + '-' + String(uga).padStart(3, '0') + '-' + String(num).padStart(4, '0') }); }
    out[cve] = { formato, P, completo: rp === raw.length };
  }
  return out;
}
// distancia (m) de un punto a un frente (polilínea en grados)
function distFrente(lon, lat, pts) { const px = lon * KX, py = lat * KY;
  if (pts.length < 4) return Math.hypot(px - pts[0] * KX, py - pts[1] * KY);
  let d = Infinity;
  for (let k = 0; k + 3 < pts.length; k += 2) { const ax = pts[k] * KX, ay = pts[k + 1] * KY, dx = pts[k + 2] * KX - ax, dy = pts[k + 3] * KY - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1))); d = Math.min(d, Math.hypot(px - ax - t * dx, py - ay - t * dy)); }
  return d; }
const norm = s => L.norm(s).trim();

(async () => {
  const D = L.decodificar(); const INV = leeInventario(D);
  const config = fs.readFileSync(path.join(L.DOCS, 'config.js'), 'utf8');
  const SIA_INV = JSON.parse((config.match(/window\.SIA_INVENTARIO = (\{.*?\});\n/) || [])[1] || 'null');

  // ---------- 1) cifras de control ----------
  const porTipo = [0, 0, 0]; const malos = [];
  for (const cve of D.META.muns) { const c = [0, 0, 0]; INV[cve].P.forEach(p => c[p.t]++); c.forEach((v, t) => porTipo[t] += v);
    if (!INV[cve].completo || INV[cve].formato !== RES.formato || INV[cve].formato !== 2 || JSON.stringify(c) !== JSON.stringify(RES.por_alcaldia[cve].puntos) || JSON.stringify(c) !== JSON.stringify(SIA_INV && SIA_INV.n[cve])) malos.push(cve); }
  ok('cada archivo publicado se lee completo y sus puntos por tipo = cifras de control (RESUMEN.json y config.js)', !malos.length && !!SIA_INV, malos.join(', ') || '16 alcaldías');
  ok('puntos publicados por tipo = cifras de control (cepas vacantes, tocones, árboles muertos)', JSON.stringify(porTipo) === JSON.stringify(RES.puntos_por_tipo), porTipo.join(' · '));
  const todos = D.META.muns.flatMap(c => INV[c].P);
  const claves = new Set(todos.map(p => p.clave));
  ok('cada clave del inventario aparece una sola vez y tiene la forma AAA-000-0000', claves.size === todos.length && todos.every(p => /^[A-Z]{3}-\d{3}-\d{4,}$/.test(p.clave)), `${claves.size} claves de ${todos.length}`);
  // el frente asignado está a 20 m o menos (recalculado con la geometría publicada; tolerancia por el redondeo de las coordenadas)
  const con = todos.filter(p => p.fr >= 0); let lejos = 0, dmax = 0; const ds = [];
  for (const p of con) { const d = distFrente(p.lon, p.lat, D.F[p.fr].pts); ds.push(d); if (d > RES.distancia_max_m + 1.5) lejos++; dmax = Math.max(dmax, d); }
  ds.sort((a, b) => a - b);
  ok(`cada punto con frente está a ${RES.distancia_max_m} m o menos de él`, lejos === 0 && con.length + RES.sin_frente === todos.length, `${con.length} con frente · máximo ${dmax.toFixed(1)} m · mediana ${ds[ds.length >> 1].toFixed(1)} m`);
  // los que quedaron sin frente no tienen ninguno cerca (rejilla de segmentos de ~50 m)
  { const CEL = 50, key = (i, j) => i * 100000 + j, sin = todos.filter(p => p.fr < 0), G = new Map();
    // solo las celdas alrededor de los puntos sin frente: el índice queda chico y se arma en segundos
    for (const p of sin) { const i0 = Math.floor(p.lon * KX / CEL), j0 = Math.floor(p.lat * KY / CEL); for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) G.set(key(i, j), new Set()); }
    D.F.forEach((f, k) => { for (let v = 0; v + 2 < f.pts.length; v += 2) { const x0 = f.pts[v] * KX, x1 = f.pts[v + 2] * KX, y0 = f.pts[v + 1] * KY, y1 = f.pts[v + 3] * KY;
      for (let i = Math.floor(Math.min(x0, x1) / CEL); i <= Math.floor(Math.max(x0, x1) / CEL); i++) for (let j = Math.floor(Math.min(y0, y1) / CEL); j <= Math.floor(Math.max(y0, y1) / CEL); j++) { const a = G.get(key(i, j)); if (a) a.add(k); } } });
    let cerca = 0;
    for (const p of sin) { const i0 = Math.floor(p.lon * KX / CEL), j0 = Math.floor(p.lat * KY / CEL); let d = Infinity;
      for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) for (const k of G.get(key(i, j))) d = Math.min(d, distFrente(p.lon, p.lat, D.F[k].pts));
      if (d < RES.distancia_max_m - 1.5) cerca++; }
    ok(`los que quedaron sin frente no tienen ninguno a menos de ${RES.distancia_max_m} m`, cerca === 0 && sin.length === RES.sin_frente, `${sin.length} sin frente · ${cerca} con un frente cerca`); }
  // recálculo desde el CSV del inventario, si está en el equipo
  if (fs.existsSync(CSV)) {
    const t0 = Date.now(); const tipos = [0, 0, 0]; const reg = {}; let n = 0; const h = crypto.createHash('sha256');
    const nombre = Object.fromEntries(D.META.munNames.map((m, i) => [norm(m), D.META.muns[i]]));
    await new Promise((res, rej) => { const s = fs.createReadStream(CSV); s.on('data', b => h.update(b)); s.on('error', rej); s.on('end', res); });
    const rl = readline.createInterface({ input: fs.createReadStream(CSV, 'utf8'), crlfDelay: Infinity }); let primera = true;
    for await (const l of rl) { if (primera) { primera = false; continue; } if (!l) continue; const c = l.split(',', 7); n++;
      const cve = nombre[norm(c[6])]; reg[cve] = (reg[cve] || 0) + 1; if (c[5] in TIPOS_CSV) tipos[TIPOS_CSV[c[5]]]++; }
    ok('recálculo desde el CSV del inventario: puntos por tipo = datos publicados', JSON.stringify(tipos) === JSON.stringify(porTipo), `CSV ${tipos.join(' · ')} · publicados ${porTipo.join(' · ')} · ${Math.round((Date.now() - t0) / 1000)} s`);
    ok('recálculo desde el CSV: registros por alcaldía (avance, árboles vivos incluidos) = los publicados', D.META.muns.every(c => reg[c] === SIA_INV.avance[c]) && n === Object.values(SIA_INV.avance).reduce((a, b) => a + b, 0), `${n} registros`);
    ok('el CSV es el mismo con que se generaron los datos (si cambió, volver a correr 9_inventario_espacios.py)', h.digest('hex') === RES.insumo.sha256);
  } else console.log('AVISO el CSV del inventario no está en este equipo (' + CSV + '): se omite el recálculo desde el CSV.');

  // ---------- 2) en el navegador ----------
  const srv = await L.servidor(0); const browser = await L.lanzar(); const errores = [];
  const pedidos = []; const hasta = async (pg, f, arg, t = 90000) => { try { await pg.waitForFunction(f, arg, { timeout: t }); return true; } catch (e) { return false; } };
  const { page, ctx } = await L.abrir(browser, srv.url, {}, errores);
  page.on('request', r => { if (r.url().includes('/inventario/')) pedidos.push(r.url().split('/').pop()); });
  await hasta(page, () => window.SIA_LISTO && window.__INV);
  const zl = await page.evaluate(() => window.__INV.z());
  // de lejos: ni capa ni descargas
  await page.evaluate(v => window.__MAPA.ir({ ...v, zoom: 14.2 }, 0), IZTAPALAPA); await page.waitForTimeout(2500);
  const lejosZ = await page.evaluate(() => ({ capas: window.__INV.capas(), cargadas: window.__INV.cargadas(), aviso: !document.getElementById('inv-zoom').hidden }));
  ok('de lejos (zoom 14) no se dibujan ni se descargan los espacios para plantar, y el panel dice que se ven al acercar', lejosZ.capas.length === 0 && lejosZ.cargadas.length === 0 && pedidos.length === 0 && lejosZ.aviso, JSON.stringify(lejosZ));
  // de cerca: solo las alcaldías a la vista
  const t0 = Date.now();
  await page.evaluate(v => window.__MAPA.ir({ ...v, zoom: 16.3 }, 0), IZTAPALAPA);
  const llego = await hasta(page, () => window.__INV.cargadas().includes('007') && window.__INV.pendientes() === 0 && window.__INV.capas().some(c => c.id === 'inv-cepa'));
  const ms = Date.now() - t0; await page.waitForTimeout(800);
  const cerca = await page.evaluate(() => ({ capas: window.__INV.capas(), cargadas: window.__INV.cargadas(), aviso: !document.getElementById('inv-zoom').hidden, ligero: document.body.classList.contains('modo-ligero') }));
  const nCap = id => (cerca.capas.find(c => c.id === id) || {}).n || 0; const esperado = [0, 1, 2].map(t => cerca.cargadas.reduce((s, c) => s + RES.por_alcaldia[c].puntos[t], 0));
  ok(`al acercar en Iztapalapa (zoom 16.3; desde ${zl} en ${cerca.ligero ? 'modo ligero' : 'modo completo'}) aparecen los tres tipos, solo de las alcaldías a la vista`, llego && nCap('inv-cepa') === esperado[0] && nCap('inv-tocon') === esperado[1] && nCap('inv-muerto') === esperado[2] && esperado[0] > 1000 && !cerca.aviso && cerca.cargadas.length <= 3,
    `${cerca.cargadas.join(', ')} · ${nCap('inv-cepa')} cepas, ${nCap('inv-tocon')} tocones, ${nCap('inv-muerto')} muertos · ${ms} ms hasta verse`);
  ok('los archivos se piden con su huella (?v=), una vez por alcaldía', pedidos.length === cerca.cargadas.length && pedidos.every(u => /^inv_\d{3}\.bin\?v=[0-9a-f]{10}$/.test(u)), pedidos.join(' '));
  // casillas: cada una enciende y apaga su tipo (y se puede con el teclado)
  await page.evaluate(() => { if (!document.querySelector('.legend').classList.contains('open')) document.getElementById('zcapas').click(); }); await page.waitForTimeout(300);
  const ids = ['inv-cepa', 'inv-tocon', 'inv-muerto']; let casillas = true; const det = [];
  for (let t = 0; t < 3; t++) {
    await page.click(`#inv-sec input[data-inv="${t}"]`); await page.waitForTimeout(1500);
    const off = await page.evaluate(() => window.__INV.capas().map(c => c.id));
    await page.focus(`#inv-sec input[data-inv="${t}"]`); await page.keyboard.press('Space'); await page.waitForTimeout(1500);
    const on = await page.evaluate(() => window.__INV.capas().map(c => c.id));
    const bien = !off.includes(ids[t]) && ids.filter((_, k) => k !== t).every(i => off.includes(i)) && ids.every(i => on.includes(i)); casillas = casillas && bien; det.push(`${ids[t]}: ${bien ? 'bien' : off.join('+') + ' → ' + on.join('+')}`); }
  ok('cada casilla apaga solo su tipo y lo vuelve a encender (con el ratón y con la barra espaciadora)', casillas, det.join(' · '));
  const lab = await page.evaluate(() => [...document.querySelectorAll('#inv-sec label.inv-cb')].map(l => ({ t: l.innerText.replace(/\s+/g, ' ').trim(), cb: !!l.querySelector('input[type=checkbox]') })));
  ok('las tres casillas tienen etiqueta con su nombre y su cifra', lab.length === 3 && lab.every(l => l.cb) && /^Cepas vacantes [\d,]+$/.test(lab[0].t) && /^Tocones [\d,]+$/.test(lab[1].t) && /^Árboles muertos [\d,]+$/.test(lab[2].t), lab.map(l => l.t).join(' | '));
  const nota = await page.$eval('#inv-sec', e => e.innerText.replace(/\s+/g, ' '));
  ok('el panel dice que el inventario está en curso, su corte y el avance de la ciudad', nota.includes(`Inventario en curso (corte: ${RES.corte})`) && /Donde no hay puntos puede que aún no se haya inventariado/.test(nota) && /En toda la ciudad van [\d,]+ registros del inventario/.test(nota), nota.slice(0, 220));
  await page.evaluate(() => document.getElementById('zcapas').click()); await page.waitForTimeout(300);

  // ficha de una cepa: la más cercana al centro del mapa, sola en 14 px a la redonda, con su frente debajo
  const elige = () => page.evaluate(() => { const c = document.getElementById('map').getBoundingClientRect(); const P = window.__INV.puntos('007').map(p => ({ ...p, px: window.__INV.px(p.lon, p.lat) }));
    const libre = p => { const e = document.elementFromPoint(c.left + p.px[0], c.top + p.px[1]); return !!e && e.tagName === 'CANVAS'; };
    const vis = P.filter(p => p.px[0] > 40 && p.px[0] < c.width - 40 && p.px[1] > 120 && p.px[1] < c.height - 160 && libre(p));
    const sola = p => !vis.some(q => q !== p && Math.hypot(q.px[0] - p.px[0], q.px[1] - p.px[1]) < 14);
    const cand = vis.filter(p => p.t === 0 && p.fr >= 0 && sola(p)).map(p => ({ ...p, d: Math.hypot(p.px[0] - c.width / 2, p.px[1] - c.height / 2), bajo: window.__INV.frenteBajo(p.px[0], p.px[1]) })).filter(p => p.bajo !== null).sort((a, b) => a.d - b.d);
    return cand.length ? { ...cand[0], x: c.left + cand[0].px[0], y: c.top + cand[0].px[1] } : null; });
  const p = await elige();
  if (!p) ok('hay una cepa con su frente debajo cerca del centro del mapa', false);
  else {
    await page.mouse.click(p.x, p.y); await hasta(page, () => !document.getElementById('card').hidden, null, 30000); await page.waitForTimeout(300);
    const card = await page.evaluate(() => { const c = document.getElementById('card'); return { t: c.innerText.replace(/\s+/g, ' '), sv: (c.querySelector('a[href*="map_action=pano"]') || {}).href || '', foco: document.activeElement === c || c.contains(document.activeElement), copia: !!c.querySelector('[data-copy]'), llegar: !!c.querySelector('a[href*="maps/dir"]') }; });
    const f = D.F[p.fr], col = D.META.colonias[f.col], calle = D.META.names[f.name] || '', prio = D.META.prio[f.prio];
    const NC = JSON.parse(fs.readFileSync(path.join(RAIZ, '02_fuente', 'datos', 'nombres_colonias.json'), 'utf8')); const colTxt = f.col ? (NC[f.col] || col.n || '') : '';
    const llPunto = `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
    ok('al tocar una cepa sobre su frente, gana la cepa: su ficha y no la del frente', /Cepa vacante/i.test(card.t) && !/Longitud del frente/.test(card.t), card.t.slice(0, 120));
    ok('la ficha de la cepa trae tipo, «Se puede plantar directo», clave del inventario, calle, colonia, alcaldía, prioridad del frente y coordenadas',
      card.t.includes('Se puede plantar directo') && card.t.includes(p.clave) && (!calle || norm(card.t).includes(norm(calle)) || /sin nombre/i.test(card.t)) && (!colTxt || norm(card.t).includes(norm(colTxt))) && card.t.includes(D.META.munNames[f.mun]) && card.t.includes('Prioridad del frente') && card.t.includes(prio) && card.t.includes(p.lat.toFixed(5)),
      `${p.clave} · ${calle} · ${colTxt} · ${prio} · ${card.t.slice(0, 260)}`);
    ok('la ficha lleva «Cómo llegar», «Copiar coordenadas» y Street View armado con las coordenadas del punto', card.llegar && card.copia && card.sv.includes('viewpoint=' + llPunto), card.sv);
    ok('la ficha recibe el foco al abrirse (teclado)', card.foco);
    await page.keyboard.press('Tab'); const dentro = await page.evaluate(() => document.getElementById('card').contains(document.activeElement));
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    ok('con el teclado se recorre la ficha y Esc la cierra', dentro && await page.evaluate(() => document.getElementById('card').hidden));
    // los tres tipos tienen su ficha
    const fichas = await page.evaluate(() => [0, 1, 2].map(t => { const q = window.__INV.puntos('007').find(x => x.t === t); window.__INV.ficha(q); const c = document.getElementById('card'); return c.querySelector('h3').textContent + ' | ' + c.querySelector('.pill').textContent.trim(); }));
    ok('cada tipo dice qué hacer: cepa, tocón y árbol muerto', /^Se puede plantar directo \| Cepa vacante$/.test(fichas[0]) && /^Hay que retirar el tocón antes de plantar \| Tocón$/.test(fichas[1]) && /^Requiere sustitución \| Árbol muerto$/.test(fichas[2]), fichas.join(' · '));
    await page.keyboard.press('Escape');
  }
  // el avance de la alcaldía consultada y las cifras del modelo, sin cambios
  const antes = await L.estado(page);
  await L.elegir(page, 'Iztapalapa'); await page.waitForTimeout(800);
  const av = await page.evaluate(() => ({ t: document.getElementById('inv-avance').textContent, n: [0, 1, 2].map(k => document.getElementById('inv-n' + k).textContent) }));
  ok('con Iztapalapa consultada: «En esta alcaldía van N registros del inventario» y los puntos de la alcaldía en cada casilla', av.t.includes(`En esta alcaldía van ${L.fN.format(SIA_INV.avance['007'])} registros del inventario`) && av.n.join('|') === RES.por_alcaldia['007'].puntos.map(v => L.fN.format(v)).join('|'), `${av.t} · ${av.n.join(' · ')}`);
  const izt = L.resumenFrentes(D, { mun: D.META.muns.indexOf('007') });
  ok('las cifras del modelo no cambian con la capa (Iztapalapa: km prioritarios = recálculo propio)', (await L.estado(page)).mapsum.includes(L.kmTxt(izt.kmp)) && antes.kpis.length > 0, `${L.kmTxt(izt.kmp)} km`);
  await ctx.close();

  // ---------- 3) archivo de umbrales: modo completo desde zoom 15 ----------
  { const { page: pc, ctx: cc } = await L.abrir(browser, srv.url + '?modo=completo#nomap', {}, errores);
    ok('en modo completo se ven desde el zoom 15; en modo ligero, desde el 16', await pc.evaluate(() => window.__INV.z()) === 15 && zl === 16, `completo ${await pc.evaluate(() => window.__INV.z())} · ligero ${zl}`); await cc.close(); }

  // ---------- 4) celular de 390 × 844 ----------
  { const { page: m, ctx: mc } = await L.abrir(browser, srv.url, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, errores);
    await hasta(m, () => window.SIA_LISTO && window.__INV); await L.clic(m, '#ver-mapa'); await m.waitForTimeout(400);
    await m.evaluate(() => { const b = document.querySelector('.aviso-ligero:not(.aviso-error) button'); if (b) b.click(); });   // el aviso del modo ligero (sin tarjeta gráfica) tapa el mapa
    await m.evaluate(v => window.__MAPA.ir({ ...v, zoom: 16.6 }, 0), IZTAPALAPA);
    await hasta(m, () => window.__INV.cargadas().includes('007') && window.__INV.capas().some(c => c.id === 'inv-cepa')); await m.waitForTimeout(800);
    const encimados = sel => m.evaluate(s => { const b = document.getElementById('ver-info').getBoundingClientRect(); const out = [];
      for (const el of document.querySelectorAll(s)) { if (['ver-info', 'map', 'loader'].includes(el.id)) continue; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || el.hidden) continue; const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
        if (r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top) out.push((el.id || el.className) + ' ' + Math.round(r.top) + '-' + Math.round(r.bottom)); }
      return out; }, sel);
    const q = await (async () => { const pp = await m.evaluate(() => { const c = document.getElementById('map').getBoundingClientRect(); const P = window.__INV.puntos('007').filter(p => p.t === 0).map(p => ({ ...p, px: window.__INV.px(p.lon, p.lat) }));
      const libre = p => { const e = document.elementFromPoint(c.left + p.px[0], c.top + p.px[1]); return !!e && e.tagName === 'CANVAS'; };
      const vis = P.filter(p => p.px[0] > 40 && p.px[0] < c.width - 70 && p.px[1] > 140 && p.px[1] < c.height - 200 && libre(p)).filter(p => !P.some(o => o !== p && Math.hypot(o.px[0] - p.px[0], o.px[1] - p.px[1]) < 20)); vis.sort((a, b) => Math.hypot(a.px[0] - c.width / 2, a.px[1] - c.height / 2) - Math.hypot(b.px[0] - c.width / 2, b.px[1] - c.height / 2));
      return vis[0] ? { x: c.left + vis[0].px[0], y: c.top + vis[0].px[1], clave: vis[0].clave } : null; }); return pp; })();
    if (q) { await m.touchscreen.tap(q.x, q.y); await hasta(m, () => !document.getElementById('card').hidden, null, 30000); await m.waitForTimeout(400); }
    const ficha = await m.evaluate(() => { const c = document.getElementById('card'); const r = c.getBoundingClientRect(), b = document.getElementById('ver-info').getBoundingClientRect(); return { abierta: !c.hidden, t: c.innerText.replace(/\s+/g, ' ').slice(0, 300), sobre: r.bottom > b.top + 1, desborde: document.documentElement.scrollWidth - innerWidth, dentro: r.left >= 0 && r.right <= innerWidth + 1 }; });
    ok('celular: tocar una cepa con el dedo abre su ficha, sin taparse con el botón de abajo ni desbordarse', !!q && ficha.abierta && /Cepa vacante/i.test(ficha.t) && ficha.t.includes(q.clave) && !ficha.sobre && ficha.desborde <= 0 && ficha.dentro, JSON.stringify(ficha));
    await m.evaluate(() => { const b = document.querySelector('#card .close'); if (b) b.click(); }); await m.waitForTimeout(300);
    let enc = await encimados('.mapwrap > *, .legend, .leymini, .card');
    ok('celular: con la capa a la vista, nada queda encimado con el botón de abajo (leyenda compacta incluida)', enc.length === 0, enc.join(' | '));
    await m.evaluate(() => document.getElementById('zcapas').click()); await m.waitForTimeout(400);
    await m.evaluate(() => document.getElementById('inv-sec').scrollIntoView({ block: 'end' })); await m.waitForTimeout(300);
    const pan = await m.evaluate(() => { const s = document.getElementById('inv-sec').getBoundingClientRect(), lg = document.querySelector('.legend').getBoundingClientRect(), b = document.getElementById('ver-info').getBoundingClientRect();
      return { alturas: [...document.querySelectorAll('#inv-sec label.inv-cb')].map(l => Math.round(l.getBoundingClientRect().height)), visible: s.top >= lg.top - 1 && s.bottom <= lg.bottom + 1, sobre: lg.bottom > b.top + 1, desborde: document.documentElement.scrollWidth - innerWidth, anchoLeg: Math.round(lg.right) <= innerWidth,
        leymini: getComputedStyle(document.getElementById('leymini')).display }; });
    ok('celular: la sección del panel de capas se alcanza, sus casillas miden 38 px o más y no se enciman con el botón de abajo', pan.alturas.length === 3 && pan.alturas.every(h => h >= 38) && pan.visible && !pan.sobre && pan.desborde <= 0 && pan.anchoLeg && pan.leymini === 'none', JSON.stringify(pan));
    await mc.close(); }

  ok('sin errores de JavaScript', errores.length === 0, errores.slice(0, 3).join(' | '));
  await browser.close(); srv.close(); process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
