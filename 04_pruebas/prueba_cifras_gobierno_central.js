// Cifras del Gobierno Central en km de frente de manzana con filtros (v1.37, hallazgos B2-01 a B2-04 y C4-01 de la auditoría del 19 oct 2026).
// Regla: los frentes a cargo del Gobierno Central no se filtran por «Banqueta», el filtro «Espacio» se les aplica por su tramo de vialidad
// primaria (sus frentes y el camellón) y su prioridad es la de su tramo. Comprueba, contra un recálculo propio desde docs/datos:
//  · la tabla «Alcaldía y Gobierno Central» (columnas Alcaldía y Gobierno Central) y «Equivalen a…» del bloque del Gobierno Central, en
//    alcaldías y en la ciudad, con banqueta, con espacio y con los dos: la columna y la equivalencia dicen lo mismo;
//  · con solo Gobierno Central no queda ningún filtro de banqueta escondido (al cambiar de red y al abrir un enlace con r=gc&b=…);
//  · una avenida sin km prioritarios no tiene km de frente prioritarios;
//  · «Además, …» de la ciudad con la prioridad del tramo;
//  · la lista «Dónde empezar» dice el filtro que tiene puesto;
//  · la ficha PDF de alcaldía filtrada no trae la participación sin filtro («Concentra …»).
// Uso: node 04_pruebas/prueba_cifras_gobierno_central.js   · termina con código ≠ 0 si algo falla.
const fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib'), cp = require('child_process');
const L = require('./lib_pruebas.js');
const SAL = process.env.SALIDA || fs.mkdtempSync(path.join(os.tmpdir(), 'cifgc-'));
const ok = L.Registro('cifras del gobierno central');
const D = L.decodificar(); const M = D.META;
const IZT = M.munNames.indexOf('Iztapalapa'), COY = M.munNames.indexOf('Coyoacán'), TLP = M.munNames.indexOf('Tlalpan');
const pdf = ruta => cp.execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', ruta, '-']).toString().replace(/\s+/g, ' ');

// ---------- tipos del inventario por frente y por parte de vialidad (decodificador propio) ----------
const enteros = raw => { let rp = 0; return () => { let res = 0, sh = 0, b; do { b = raw[rp++]; res += (b & 0x7f) * Math.pow(2, sh); sh += 7; } while (b & 0x80); return (res % 2) ? -((res + 1) / 2) : res / 2; }; };
function tipos(nombre, max) { const rv = enteros(zlib.gunzipSync(fs.readFileSync(path.join(L.DOCS, 'datos', 'inventario', nombre))));
  rv(); const n = rv(), B = new Uint8Array(max); let f = -1;
  for (let k = 0; k < n; k++) { f += rv(); const c = [rv(), rv(), rv()]; if (f < max) B[f] = (c[0] ? 1 : 0) | (c[1] ? 2 : 0) | (c[2] ? 4 : 0); }
  return B; }
const BF = tipos('espacios_frentes.bin', D.N), BV = tipos('espacios_vp.bin', D.NV);

// ---------- recálculo: frentes por responsable en un territorio, con la regla de cada red ----------
const BIT = { cv: 1, to: 2, am: 4 }, mascara = e => String(e || '').split(',').reduce((m, k) => m | (BIT[k] || 0), 0);
const conBanq = f => ((f.flags >> 3) & 7) === 0;
function calcula(mun, b, m) { const r = { alc: { kmp: 0, kmt: 0 }, gc: { kmp: 0, kmt: 0 } };
  D.F.forEach((f, i) => { if (mun !== null && f.mun !== mun) return;
    if (!f.gc) { if (b !== 'todas' && conBanq(f) !== (b === 'con')) return; if (m && !(BF[i] & m)) return; r.alc.kmt += f.len / 1000; if (f.prio >= L.PRIO_MIN) r.alc.kmp += f.len / 1000; }
    else { if (m && !(f.vp >= 0 && (BV[f.vp] & m))) return; r.gc.kmt += f.len / 1000; if (f.vp >= 0 && D.VP[f.vp].prio >= L.PRIO_MIN) r.gc.kmp += f.len / 1000; } });
  return r; }
const num = t => +String(t).replace(/,/g, '').replace('<1', '0.4');
const kmDe = (v, u) => u === 'm' ? num(v) / 1000 : num(v);

// lee la tabla de comparación (renglones «Prioritario» y «Todos los frentes») y la equivalencia del bloque del Gobierno Central
const leeResumen = page => page.evaluate(() => {
  document.querySelectorAll('#reparto details, #bars2 details, .panel details').forEach(d => d.open = true);
  const fila = n => { const tr = [...document.querySelectorAll('#reparto table.reparto tr')].find(t => t.querySelector('th') && t.querySelector('th').innerText.trim() === n);
    return tr ? [...tr.querySelectorAll('td')].map(td => td.innerText.trim()) : null; };
  const txt = document.querySelector('.panel') ? document.querySelector('.panel').innerText.replace(/\s+/g, ' ') : document.body.innerText;
  const eq = txt.match(/Equivalen a ([\d,.]+) (km|m) de frente de manzana \(aceras con manzana enfrente\), ([\d,.]+) (km|m) sobre tramos prioritarios/);
  return { prio: fila('Prioritario'), todos: fila('Todos los frentes'), eq: eq ? [eq[1], eq[2], eq[3], eq[4]] : null, txt, url: location.search,
    banq: (document.querySelector('button[data-banq][aria-pressed="true"]') || {}).dataset?.banq, banqVisible: !document.getElementById('banq-row').hidden }; });
async function espera(page, m) {   // los filtros de espacio se aplican cuando llega el inventario
  await page.waitForFunction(m => !m || /con (cepa vacante|tocón|árbol muerto)/.test(document.getElementById('mapsum').innerText), m, { timeout: 120000 });
  await page.waitForTimeout(400); }
const tolKm = v => Math.max(1, v * 0.002);   // la tabla redondea a km enteros

(async () => {
  const srv = await L.servidor(); const browser = await L.lanzar(); const errores = [];
  try {
    // ---------- 1. tabla y equivalencia con filtros ----------
    const casos = [
      { q: '?r=both&a=007&b=sin', mun: IZT, b: 'sin', e: '' },
      { q: '?r=both&a=007&e=cv', mun: IZT, b: 'todas', e: 'cv' },
      { q: '?r=both&a=007&b=sin&e=to,am', mun: IZT, b: 'sin', e: 'to,am' },
      { q: '?r=both&a=003&b=con&e=cv', mun: COY, b: 'con', e: 'cv' },
      { q: '?r=both&a=012', mun: TLP, b: 'todas', e: '' },
      { q: '?r=both&b=sin', mun: null, b: 'sin', e: '' },
    ];
    for (const c of casos) {
      const { ctx, page } = await L.abrir(browser, srv.url + c.q + (c.q ? '&' : '?') + 'modo=ligero#nomap', {}, errores);
      await espera(page, mascara(c.e)); const R = await leeResumen(page), X = calcula(c.mun, c.b, mascara(c.e));
      const p = R.prio ? R.prio.map(num) : null, t = R.todos ? R.todos.map(num) : null;
      ok(`${c.q}: columna Alcaldía (prioritario) = recálculo con banqueta y espacio por frente`, p && Math.abs(p[0] - X.alc.kmp) <= tolKm(X.alc.kmp), `${p && p[0]} · ${X.alc.kmp.toFixed(1)}`);
      ok(`${c.q}: columna Gobierno Central (prioritario) = recálculo sin banqueta, espacio y prioridad por tramo`, p && Math.abs(p[1] - X.gc.kmp) <= tolKm(X.gc.kmp), `${p && p[1]} · ${X.gc.kmp.toFixed(1)}`);
      ok(`${c.q}: columna Gobierno Central (todos los frentes) = recálculo`, t && Math.abs(t[1] - X.gc.kmt) <= tolKm(X.gc.kmt), `${t && t[1]} · ${X.gc.kmt.toFixed(1)}`);
      if (c.mun !== null) {   // la equivalencia se muestra con una alcaldía elegida
        const eqp = R.eq ? kmDe(R.eq[2], R.eq[3]) : null;
        ok(`${c.q}: «Equivalen a…» del bloque del Gobierno Central = su columna en la tabla`, eqp !== null && p && Math.abs(eqp - p[1]) <= 1, `${R.eq && R.eq.join(' ')} · tabla ${p && p[1]}`);
      }
      await ctx.close();
    }

    // ---------- 2. con solo Gobierno Central no queda una banqueta escondida ----------
    { const X = calcula(IZT, 'todas', 0);
      const { ctx, page } = await L.abrir(browser, srv.url + '?a=007&modo=ligero#nomap', {}, errores);
      await L.clic(page, 'button[data-banq="sin"]'); await L.ponResp(page, 'gc'); await page.waitForTimeout(500);
      const R = await leeResumen(page), p = R.prio ? R.prio.map(num) : null;
      ok('al pasar a solo Gobierno Central, la fila «Banqueta» se oculta y su filtro se suelta', !R.banqVisible && R.banq === 'todas' && !/[?&]b=/.test(R.url), `${R.banqVisible} ${R.banq} ${R.url}`);
      ok('…y la comparación de Iztapalapa ya no está filtrada por banqueta', p && Math.abs(p[0] - X.alc.kmp) <= tolKm(X.alc.kmp) && Math.abs(p[1] - X.gc.kmp) <= tolKm(X.gc.kmp), `${p} · ${X.alc.kmp.toFixed(0)} y ${X.gc.kmp.toFixed(0)}`);
      await ctx.close();
      const o = await L.abrir(browser, srv.url + '?r=gc&a=007&b=sin&modo=ligero#nomap', {}, errores);
      const R2 = await leeResumen(o.page), p2 = R2.prio ? R2.prio.map(num) : null;
      ok('un enlace con r=gc&b=sin no aplica la banqueta', R2.banq === 'todas' && p2 && Math.abs(p2[0] - X.alc.kmp) <= tolKm(X.alc.kmp), `${R2.banq} · ${p2}`);
      await o.ctx.close(); }

    // ---------- 3. avenida sin km prioritarios ----------
    { const av = [...new Set(D.VP.map(v => v.nom))].find(a => D.VP.filter(v => v.nom === a).every(v => v.prio < L.PRIO_MIN) && D.F.some(f => f.gc && f.vp >= 0 && D.VP[f.vp].nom === a));
      const { ctx, page } = await L.abrir(browser, srv.url + `?r=gc&v=${av}&modo=ligero#nomap`, {}, errores);
      const R = await leeResumen(page);
      ok(`avenida ${av} sin km prioritarios: «Equivalen a…» dice 0 sobre tramos prioritarios`, R.eq && num(R.eq[2]) === 0, R.eq ? R.eq.join(' ') : 'sin equivalencia');
      await ctx.close(); }

    // ---------- 4. «Además, …» de la ciudad con la prioridad del tramo ----------
    { const X = calcula(null, 'todas', 0);
      const { ctx, page } = await L.abrir(browser, srv.url + '?modo=ligero#nomap', {}, errores);
      const R = await leeResumen(page); const m = R.txt.match(/Además, ([\d,]+) km de frentes sobre vialidades primarias de la ciudad \(([\d,]+) km sobre tramos prioritarios\)/);
      ok('«Además, …» de la ciudad: km de frente del Gobierno Central y los que dan a tramos prioritarios', m && Math.abs(num(m[1]) - X.gc.kmt) <= 1 && Math.abs(num(m[2]) - X.gc.kmp) <= 1, `${m && m.slice(1).join(' / ')} · ${X.gc.kmt.toFixed(0)} / ${X.gc.kmp.toFixed(0)}`);
      ok('lo prioritario del Gobierno Central en km de frente baja de 1,254 a 1,186 km (prioridad del tramo)', Math.round(X.gc.kmp) === 1186, X.gc.kmp.toFixed(1));
      await ctx.close(); }

    // ---------- 5. la lista «Dónde empezar» dice su filtro ----------
    for (const [q, debe, m] of [['?a=007&b=sin', 'sin banqueta o por verificar', 0], ['?a=007&e=cv', 'con cepa vacante', 1], ['?r=gc&a=012&e=to', 'con tocón', 2]]) {
      const { ctx, page } = await L.abrir(browser, srv.url + q + '&modo=ligero#nomap', {}, errores);
      await espera(page, m); await L.clic(page, '#tab-ini');
      const t = await page.$eval('#ini-count', e => e.textContent);
      ok(`${q}: el conteo de la lista dice «${debe}»`, t.includes(debe), t);
      await ctx.close();
    }

    // ---------- 6. ficha PDF de alcaldía: sin la participación sin filtro cuando hay filtro ----------
    for (const [q, filtrada] of [['?a=007&b=sin', true], ['?a=007', false]]) {
      const { ctx, page } = await L.abrir(browser, srv.url + q + '&modo=ligero#nomap', {}, errores);
      await L.clic(page, '#tab-dl'); const d = await L.descargar(page, '#dl-ficha-alc', SAL);
      const t = d ? pdf(d.ruta) : '';
      ok(`ficha de Iztapalapa ${filtrada ? 'filtrada: no trae' : 'sin filtro: trae'} «Concentra …»`, d && (filtrada ? !/Concentra/.test(t) : /Concentra [\d.,]+ ?%/.test(t)), d ? d.nombre : 'sin descarga');
      if (filtrada) ok('…y la cifra del Gobierno Central dice «sobre tramos prioritarios»', /sobre tramos prioritarios/.test(t), t.slice(t.indexOf('Gobierno Central:'), t.indexOf('Gobierno Central:') + 120));
      await ctx.close();
    }
    ok('sin errores de JavaScript durante la prueba', errores.length === 0, errores.slice(0, 3).join(' | '));
  } finally { await browser.close(); srv.close(); }
  process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
