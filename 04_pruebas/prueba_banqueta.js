// Filtro de banqueta: los frentes de las alcaldías se separan en «con banqueta» (INEGI 2020 registra banqueta) y
// «sin o por verificar» (no la registra, conjunto habitacional, no aplica o sin dato). Comprueba con un recálculo propio desde
// los datos que pantalla, desglose, Excel, GeoJSON y ficha digan lo mismo con cada opción, y que la consulta viaje en la dirección.
// Uso: node 04_pruebas/prueba_banqueta.js   · termina con código ≠ 0 si algo falla.
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const L = require('./lib_pruebas.js');
const SAL = process.env.SALIDA || fs.mkdtempSync(path.join(os.tmpdir(), 'banq-'));
const ok = L.Registro('banqueta');
const D = L.decodificar(); const M = D.META;
const ALC = M.munNames.indexOf('Iztapalapa'), CLAVE = M.muns[ALC];
const COL = M.colonias.findIndex(c => c && c.n === 'Progreso Tizapan');
const xlsx = ruta => JSON.parse(cp.execFileSync(L.PY, ['-c', `
import openpyxl, json, sys
wb = openpyxl.load_workbook(sys.argv[1], read_only=True)
print(json.dumps({'datos': [list(r) for r in wb['Datos'].iter_rows(values_only=True)], 'dic': [list(r) for r in wb['Diccionario'].iter_rows(values_only=True)]}, default=str))`, ruta], { maxBuffer: 1 << 28 }).toString());
// recálculo propio: frentes prioritarios a cargo de la alcaldía en un territorio, por banqueta
const banq = f => (f.flags >> 3) & 7;   // 0 = Dispone
function calc(terr) { const r = { todas: [0, 0], con: [0, 0], sin: [0, 0], des: [0, 0, 0] };
  for (const f of D.F) { if (f.gc || f.prio < L.PRIO_MIN || !terr(f)) continue; const k = f.len / 1000, b = banq(f);
    r.todas[0] += k; r.todas[1]++; (b === 0 ? r.con : r.sin)[0] += k; (b === 0 ? r.con : r.sin)[1]++; r.des[b === 0 ? 0 : b === 1 ? 1 : 2] += k; }
  return r; }
const R = calc(f => f.mun === ALC), RC = calc(f => f.col === COL);
const kmDe = t => L.numEs(t);   // primera cifra de un texto

(async () => {
  ok('el recálculo cuadra: con + sin = todas', Math.abs(R.con[0] + R.sin[0] - R.todas[0]) < 1e-6 && R.con[1] + R.sin[1] === R.todas[1], `${R.todas[0].toFixed(1)} km · ${R.todas[1]} frentes`);
  const srv = await L.servidor(0); const browser = await L.lanzar(); const errores = []; const base = srv.url + '?modo=ligero';
  const ir = async (page, q) => { await page.goto(base + q + '#nomap'); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(700); await page.evaluate(() => { const t = document.getElementById('tab-res'); if (t) t.click(); }); };
  const { page, ctx } = await L.abrir(browser, base + '#nomap', {}, errores);

  // ---------- 1) sin filtro: cifras completas y desglose ----------
  await ir(page, `&a=${CLAVE}`); let e = await L.estado(page);
  const fila = await page.evaluate(() => ({ vis: !document.getElementById('banq-row').hidden, pres: [...document.querySelectorAll('button[data-banq]')].map(b => b.dataset.banq + ':' + b.getAttribute('aria-pressed')).join(' ') }));
  ok('la fila «Banqueta» se ve con Alcaldías y abre en «Todas»', fila.vis && /todas:true/.test(fila.pres), fila.pres);
  ok('con «Todas», el km prioritario de la alcaldía es el de siempre', Math.abs(kmDe(e.kpis[0].v) - R.todas[0]) < 1, `${e.kpis[0].v} vs ${R.todas[0].toFixed(1)}`);
  const des = await page.$eval('#univbox .univline.banq', x => x.innerText).catch(() => '');
  const nums = (des.match(/[\d,]+(\.\d+)?(?= km)/g) || []).map(s => +s.replace(/,/g, ''));
  ok('el Resumen muestra el desglose con banqueta / sin banqueta / por verificar del recálculo', nums.length >= 4 && Math.abs(nums[1] - R.des[0]) < 1 && Math.abs(nums[2] - R.des[1]) < 1 && Math.abs(nums[3] - R.des[2]) < 1 && /reconocimiento en sitio/.test(des), des.slice(0, 130));

  // ---------- 2) «Con banqueta» y «Sin o por verificar» ----------
  for (const [op, exp] of [['con', R.con], ['sin', R.sin]]) {
    await ir(page, `&a=${CLAVE}&b=${op}`); e = await L.estado(page);
    ok(`«${op}»: el km prioritario es el del recálculo`, Math.abs(kmDe(e.kpis[0].v) - exp[0]) < 1, `${e.kpis[0].v} vs ${exp[0].toFixed(1)}`);
    ok(`«${op}»: la cifra dice qué filtro está activo`, /solo frentes (con|sin) banqueta/.test(e.kpisTxt) && /banqueta/.test(e.mapsum || ''), (e.mapsum || '').slice(0, 90));
    const des2 = await page.$eval('#univbox .univline.banq', x => x.innerText).catch(() => '');
    ok(`«${op}»: el desglose sigue mostrando el total sin filtrar`, des2 === des, des2.slice(0, 60));
    const x = await L.descargar(page, '#dl-frentes', SAL, 240000); const X = x ? xlsx(x.ruta) : { datos: [], dic: [] };
    const amb = (X.dic.find(r => r[0] === 'Ámbito consultado') || [])[1] || '';
    ok(`«${op}»: el Excel de frentes trae los frentes del recálculo, con el filtro en el nombre y en el ámbito`, !!x && X.datos.length - 1 === exp[1] && x.nombre.includes(`_${op}_banqueta`) && /solo frentes/.test(amb), `${X.datos.length - 1} vs ${exp[1]} · ${x && x.nombre} · ${amb}`);
  }
  ok('la dirección lleva el filtro (b=sin)', /[?&]b=sin/.test(page.url()));
  await page.$eval('button[data-banq="todas"]', b => b.click()); await page.waitForTimeout(800); e = await L.estado(page);
  ok('volver a «Todas» quita el filtro de la dirección y regresa la cifra', !/[?&]b=/.test(page.url()) && Math.abs(kmDe(e.kpis[0].v) - R.todas[0]) < 1, page.url().replace(srv.url, ''));

  // ---------- 3) colonia: GeoJSON y ficha con el filtro ----------
  await ir(page, `&c=${COL}&b=sin`);
  const g = await L.descargar(page, '#dl-geojson', SAL); const J = g ? JSON.parse(fs.readFileSync(g.ruta, 'utf8')) : { features: [] };
  ok('GeoJSON de una colonia con «Sin o por verificar»: solo esos frentes, y lo declara', J.features.length === RC.sin[1] && /sin banqueta o por verificar/.test(J.name || '') && g.nombre.includes('_sin_banqueta'), `${J.features.length} vs ${RC.sin[1]} · ${g && g.nombre}`);
  const p = await L.descargar(page, '#dl-ficha', SAL, 180000);
  const t = p ? cp.execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', p.ruta, '-']).toString().replace(/\s+/g, ' ') : '';
  ok('la ficha de colonia con filtro lo declara y trae el desglose completo', !!p && p.nombre.includes('_sin_banqueta') && /Consulta filtrada/.test(t) && /con banqueta/.test(t) && /reconocimiento en sitio/.test(t), p && p.nombre);

  // ---------- 4) Gobierno Central: la fila no aplica ----------
  await ir(page, `&r=gc&a=${CLAVE}`);
  ok('con Gobierno Central la fila «Banqueta» no se muestra', await page.evaluate(() => document.getElementById('banq-row').hidden));
  // banqueta del Gobierno Central como referencia: frentes prioritarios que dan a las vialidades primarias de la alcaldía
  { const d = [0, 0, 0]; for (const f of D.F) { if (!f.gc || f.prio < L.PRIO_MIN || f.mun !== ALC) continue; const b = banq(f); d[b === 0 ? 0 : b === 1 ? 1 : 2] += f.len / 1000; }
    const t = d[0] + d[1] + d[2];
    const ub = await page.$eval('#univbox', x => x.hidden ? '' : x.textContent.replace(/\s+/g, ' '));
    ok('Gobierno Central: el Resumen da la banqueta de los frentes al lado como referencia, igual al recálculo', /Banqueta, como referencia/.test(ub) && ub.includes(`${L.kmTxt(t)} ${L.kmUn(t)}`) && ub.includes(`${L.kmTxt(d[0])} ${L.kmUn(d[0])} tienen banqueta`) && /No es un filtro/.test(ub), ub.slice(0, 220)); }
  // la ficha de un tramo dice la banqueta de los frentes que tiene al lado: se abre como en campo, desde «Mi ubicación» con Gobierno Central
  { const { page: pg, ctx: cx } = await L.abrir(browser, base + `&r=gc&a=${CLAVE}#nomap`, { geolocation: { latitude: 19.3560, longitude: -99.0560, accuracy: 12 }, permissions: ['geolocation'] }, errores);
    await pg.$eval('#zloc', x => x.click()); await pg.waitForFunction(() => document.querySelector('#card .loc-list button'), null, { timeout: 30000 });
    await pg.$eval('#card .loc-list button', x => x.click()); await pg.waitForTimeout(600);
    const card = await pg.$eval('#card', x => x.innerText.replace(/\s+/g, ' '));
    const m = /Banqueta al lado (Sin manzanas al lado: sin dato|([\d,]+) m con banqueta · ([\d,]+) m sin · ([\d,]+) m por verificar)/.exec(card);
    ok('la ficha de un tramo de vialidad primaria da la banqueta de los frentes al lado', !!m && /Quién atiende Gobierno Central/.test(card), card.slice(0, 300));
    await cx.close(); }
  ok('sin errores de JavaScript durante la prueba', errores.length === 0, errores.slice(0, 2).join(' | '));
  await ctx.close(); await browser.close(); srv.close(); process.exit(ok.fin() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
