// Recorre combinaciones de filtros en la herramienta (docs/ servido localmente) y guarda lo que muestra la pantalla.
// Uso: node estado_app.js <docs> <salida.json> [lista de estados en JSON | "matriz"]
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium } = require(path.join('X:/r7/node_modules/playwright'));
const DOCS = process.argv[2] || 'X:/r7/docs', OUT = process.argv[3] || 'X:/hallazgos/indep/salidas/estados.json';
const TIP = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.bin': 'application/octet-stream', '.json':'application/json', '.woff2':'font/woff2', '.svg':'image/svg+xml' };
function servidor() { const s = http.createServer((q, r) => { let rel = decodeURIComponent(q.url.split('?')[0]); if (rel.endsWith('/')) rel += 'index.html'; const p = path.join(DOCS, rel);
  if (!p.startsWith(path.resolve(DOCS)) || !fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TIP[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  return new Promise(ok => s.listen(0, '127.0.0.1', () => { s.url = `http://127.0.0.1:${s.address().port}/`; ok(s); })); }
const lee = () => { const T = s => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; };
  const vis = s => { const e = document.querySelector(s); return !!e && !e.hidden && getComputedStyle(e).display !== 'none'; };
  const tabla = [...document.querySelectorAll('#reparto table.reparto tr')].map(tr => [...tr.children].map(c => c.innerText.replace(/\s+/g, ' ').trim()));
  const det = [...document.querySelectorAll('details')]; det.forEach(d => d.open = true);
  return { url: location.search, resp: document.body.dataset.resp, titulo: T('#scope-title'), kpis: T('#kpis'), kpis2: vis('#bars2') ? T('#kpis2') : null,
    resCab: T('#res-cab'), resSub: T('#res-sub'), bars: T('#bars'), bars2: vis('#bars2') ? T('#bars2-rows') : null, univ: vis('#univbox') ? T('#univbox') : null, univ2: vis('#univbox2') ? T('#univbox2') : null,
    reparto: vis('#reparto') ? T('#reparto') : null, tabla, mapsum: T('#mapsum'), nota: T('#bars-note'), alcinfo: vis('#alcinfo') ? T('#alcinfo') : null,
    lgScope: T('#lg-scope'), leyenda: [...document.querySelectorAll('#legend-rows .lg-km')].map(e => e.textContent),
    banqRow: vis('#banq-row'), banq: (document.querySelector('button[data-banq][aria-pressed="true"]') || {}).dataset?.banq, espRow: vis('#esp-row'), espAviso: vis('#esp-aviso') ? T('#esp-aviso') : null,
    iniTitle: T('#ini-title'), iniCount: T('#ini-count'), iniNote: T('#ini-note'), lista: [...document.querySelectorAll('#ini-list li')].map(li => li.innerText.replace(/\s+/g, ' ').trim()),
    dl: Object.fromEntries(['dl-frentes','dl-calles','dl-tramos','dl-avenidas','dl-ficha','dl-ficha-alc','dl-ficha-vpalc','dl-ficha-av','dl-kml','dl-geojson'].map(i => { const b = document.getElementById(i); return [i, b ? (b.hidden ? 'oculto' : b.disabled ? 'apagado' : 'activo') : null]; })),
    dlStatus: T('#dl-status') }; };
async function main() {
  const srv = await servidor(); const br = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-MX', serviceWorkers: 'block', acceptDownloads: true });
  await ctx.addInitScript(() => { window.SIA_PRUEBA = true; try { localStorage.setItem('cp_inicio', 'ciudad'); localStorage.setItem('cp_recorrido', 'visto'); } catch (e) {} });
  const page = await ctx.newPage(); page.setDefaultTimeout(180000); const errores = []; page.on('pageerror', e => errores.push(e.message));
  await page.goto(srv.url + '?modo=ligero#nomap'); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(800);
  await page.evaluate(() => document.getElementById('tab-res').click());
  let estados = process.argv[4] && process.argv[4] !== 'matriz' ? JSON.parse(fs.readFileSync(process.argv[4], 'utf8')) : null;
  if (!estados) { estados = []; const T = [['ciudad', ''], ['iztapalapa', 'a=007'], ['coyoacan', 'a=003'], ['tlalpan', 'a=012'], ['colonia', 'c=' + (process.env.COL || '')]];
    const E = ['', 'cv', 'to', 'am', 'cv,to', 'cv,to,am'];
    for (const r of ['alc', 'gc', 'both']) for (const [tn, tq] of T) for (const b of ['todas', 'con', 'sin']) for (const e of E) {
      if (r === 'gc' && tn === 'colonia') continue; if (r === 'gc' && b !== 'todas') continue;
      const q = [r !== 'alc' ? 'r=' + r : '', tq, b !== 'todas' ? 'b=' + b : '', e ? 'e=' + e : ''].filter(Boolean).join('&'); estados.push({ r, t: tn, b, e, q }); } }
  const res = [];
  for (const s of estados) {
    await page.evaluate(q => { history.pushState({}, '', location.pathname + '?modo=ligero' + (q ? '&' + q : '') + '#nomap'); dispatchEvent(new PopStateEvent('popstate', { state: null })); }, s.q);
    await page.waitForTimeout(400);
    await page.waitForFunction(() => { const a = document.getElementById('esp-aviso'); const r = document.getElementById('rp-esp'); return !(a && /Cargando/.test(a.textContent)) && !(r && /cargando/.test(r.textContent)); }, null, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(150);
    res.push({ ...s, app: await page.evaluate(lee) });
  }
  fs.writeFileSync(OUT, JSON.stringify({ errores, res }, null, 1)); console.log('estados', res.length, 'errores', errores.length);
  await br.close(); srv.close(); }
main().catch(e => { console.error(e); process.exit(1); });
