// Nombres del mapa y gestos: nombres de alcaldía y de colonia dentro de su figura, nombres de calle en medio de la calle,
// juego de letras completo (con «Ñ» en mayúsculas), contraste de los nombres de colonia, nombres de calle al día después de un salto sin animación y
// dedos «fantasma» que el mapa suelta. Lee el estado del mapa con window.__MAPA, que solo existe con window.SIA_PRUEBA.
// Uso: node 04_pruebas/prueba_nombres_mapa.js   · termina con código ≠ 0 si algo falla.
const L = require('./lib_pruebas.js');
const ok = L.Registro('nombres del mapa');

(async () => {
  const srv = await L.servidor(0); const browser = await L.lanzar(); const errores = [];
  // sin tarjeta gráfica el mapa entra en modo ligero y dibuja con retraso: se espera a la condición, no un tiempo fijo
  const hasta = async (pg, f, arg) => { try { await pg.waitForFunction(f, arg, { timeout: 60000 }); return true; } catch (e) { return false; } };
  const { page, ctx } = await L.abrir(browser, srv.url, {}, errores);
  await page.waitForFunction(() => window.__MAPA && window.__MAPA.colPosListas(), null, { timeout: 120000 });

  // ---------- nombres dentro de su figura y juego de letras ----------
  const fig = await page.evaluate(() => {
    const dentro = (rs, x, y) => rs.some(r => { let d = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [ax, ay] = r[i], [bx, by] = r[j]; if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) d = !d; } return d; });
    const E = window.__MAPA.etiquetas(); const porId = new Map(E.COLS.map(c => [c.i, c]));
    const alcFuera = E.ALC_LABELS.filter((l, k) => !dentro(E.ALC[k].polys, l.pos[0], l.pos[1])).map(l => l.text);
    const colFuera = E.COL_LABELS.filter(l => !dentro(porId.get(l.i).paths, l.pos[0], l.pos[1])).map(l => l.text);
    const letras = new Set(E.charset); const textos = E.ALC_LABELS.concat(E.COL_LABELS).map(l => l.text);
    const faltan = [...new Set([...textos.join('') + textos.join('').toUpperCase()].filter(ch => !letras.has(ch)))];
    return { alc: E.ALC_LABELS.length, col: E.COL_LABELS.length, alcFuera, colFuera, faltan, conEnie: textos.filter(t => /ñ/i.test(t)).length };
  });
  ok('los 16 nombres de alcaldía quedan dentro de su alcaldía', fig.alc === 16 && fig.alcFuera.length === 0, fig.alcFuera.join(', '));
  ok('cada nombre de colonia queda dentro de su colonia', fig.col > 2000 && fig.colFuera.length === 0, `${fig.colFuera.length} fuera de ${fig.col}: ${fig.colFuera.slice(0, 5).join(', ')}`);
  ok('el juego de letras trae todas las letras de los nombres, también en mayúsculas («Ñ»)', fig.faltan.length === 0 && fig.conEnie > 0, `faltan: ${fig.faltan.join(' ')} · nombres con ñ: ${fig.conEnie}`);

  // ---------- contraste de los nombres de colonia (zoom ≥ 13.6) ----------
  await page.evaluate(() => window.__MAPA.ir({ longitude: -99.1555, latitude: 19.3955, zoom: 14.2 }, 0));
  await hasta(page, () => !!window.__MAPA.capa('col-labels'));
  const con = await page.evaluate(() => {
    const p = window.__MAPA.capa('col-labels'); if (!p) return null;
    const c = typeof p.getColor === 'function' ? p.getColor({}) : p.getColor;
    const suelo = getComputedStyle(document.body).getPropertyValue('--ground').trim().replace('#', '');
    const g = [0, 2, 4].map(k => parseInt(suelo.slice(k, k + 2), 16));
    const a = (c[3] ?? 255) / 255; const t = c.slice(0, 3).map((v, k) => v * a + g[k] * (1 - a));   // el texto con su transparencia, sobre el suelo
    const lum = rgb => { const [r, gg, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * gg + 0.0722 * b; };
    const L1 = lum(t), L2 = lum(g); return { color: c, razon: (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05) };
  });
  ok('los nombres de colonia van en color sólido, con contraste de 4.5:1 o más sobre el suelo del mapa', con && (con.color[3] ?? 255) === 255 && con.razon >= 4.5, con ? `${con.color.join(',')} · ${con.razon.toFixed(2)}:1` : 'sin capa de nombres de colonia');

  // ---------- nombres de calle al día después de un salto sin animación ----------
  const en = ([x, y]) => { const c = window.__MAPA.lblCenter(); return !!c && Math.abs(c[0] - x) < 1e-6 && Math.abs(c[1] - y) < 1e-6; };
  await page.evaluate(() => window.__MAPA.ir({ longitude: -99.1335, latitude: 19.4326, zoom: 15.6 }, 0));
  const s1 = await hasta(page, en, [-99.1335, 19.4326]);
  await page.evaluate(() => window.__MAPA.ir({ longitude: -99.1680, latitude: 19.3830, zoom: 15.6 }, 0));
  const s2 = await hasta(page, en, [-99.1680, 19.3830]);
  ok('un salto sin animación al mismo zoom recalcula los nombres de calle del lugar nuevo', s1 && s2, `primer lugar: ${s1} · segundo lugar: ${s2} · centro de los nombres: ${await page.evaluate(() => window.__MAPA.lblCenter())}`);

  // ---------- nombres de calle en medio de la calle ----------
  const med = await page.evaluate(() => { const p = window.__MAPA.capa('st-labels'); const d = p ? p.data : []; return { n: d.length, m: d.filter(x => x.media).length }; });
  ok('casi todos los nombres de calle van sobre la línea media entre los frentes de los dos lados (no encima de la línea de prioridad)', med.n > 20 && med.m / med.n >= 0.85, `${med.m} de ${med.n}`);

  // ---------- dedos «fantasma» ----------
  const dedos = await page.evaluate(async () => {
    const M = window.__MAPA, el = document.querySelector('#map canvas') || document.getElementById('map'); const espera = ms => new Promise(r => setTimeout(r, ms));
    const ev = (tipo, id, primario, x = 300, y = 300) => el.dispatchEvent(new PointerEvent(tipo, { pointerId: id, pointerType: 'touch', isPrimary: primario, clientX: x, clientY: y, bubbles: true, cancelable: true }));
    const r = { inicio: M.dedos() };
    ev('pointerdown', 7, true); ev('pointerdown', 8, false, 360, 340); r.dosPuestos = M.dedos();
    // se pierde el aviso de que los dos se levantaron; un toque nuevo como primer dedo suelta los que sobran
    ev('pointerdown', 9, true, 320, 320); r.trasToqueNuevo = M.dedos(); ev('pointerup', 9, true, 320, 320); r.alSoltar = M.dedos();
    // se pierde el aviso otra vez; al quedar la pantalla sin dedos (touchend sin toques) también se sueltan
    ev('pointerdown', 10, true); window.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true })); await espera(50); r.trasTouchend = M.dedos();
    return r; });
  ok('el mapa ve los dedos puestos', dedos.inicio === 0 && dedos.dosPuestos === 2, JSON.stringify(dedos));
  ok('un toque nuevo como primer dedo suelta los dedos cuyo aviso se perdió', dedos.trasToqueNuevo === 1 && dedos.alSoltar === 0, JSON.stringify(dedos));
  ok('al quedar la pantalla sin dedos, el mapa suelta los que siguieran anotados', dedos.trasTouchend === 0, JSON.stringify(dedos));

  ok('sin errores de JavaScript', errores.length === 0, errores.slice(0, 3).join(' | '));
  await ctx.close(); await browser.close(); srv.close(); process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
