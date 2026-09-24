const { chromium } = require('playwright');
const fs = require('fs');
const SC = '/tmp/claude-0/-home-claude/dd9ce749-5a99-545b-9acc-0332c785cc1e/scratchpad/';
const out = [];
const ok = (id, cond, detail = '') => out.push(`${cond ? 'OK  ' : 'FALLA'} ${id} ${detail}`);

(async () => {
  const body = fs.readFileSync(SC + 'calles_prioritarias.html', 'utf8');
  fs.writeFileSync(SC + 'test_page.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + body + '</body></html>');
  const browser = await chromium.launch({ args: ['--ignore-certificate-errors', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });

  const boot = async (vp, mobile) => {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: !!mobile, isMobile: !!mobile, deviceScaleFactor: mobile ? 2 : 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
    page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
    await page.route('**/*', async r => {
      const u = r.request().url(), map = { 'deck.gl@9.4.0/dist.min.js': 'deck.js', 'pako_inflate.min.js': 'pako.js', 'jspdf.umd.min.js': 'jspdf.js' };
      for (const k in map) if (u.includes(k)) return r.fulfill({ path: SC + 'libs/' + map[k], contentType: 'application/javascript' });
      if (u.startsWith('https://fonts.')) return r.fulfill({ status: 200, body: '', contentType: 'text/css' });
      return r.continue();
    });
    const t0 = Date.now();
    await page.goto('file://' + SC + 'test_page.html');
    await page.waitForSelector('#loader[hidden]', { state: 'attached', timeout: 180000 });
    const load = Date.now() - t0;
    await page.waitForTimeout(2000);
    return { page, errs, load, ctx };
  };
  const click = (page, sel) => page.click(sel, { noWaitAfter: true, timeout: 60000 });
  const kpi = page => page.$eval('#kpis', e => e.innerText.replace(/\n/g, ' '));

  // ================= ESCRITORIO =================
  let { page, errs, load } = await boot({ width: 1400, height: 900 }, false);
  out.push(`--- ESCRITORIO 1400x900 (carga ${(load / 1000).toFixed(1)} s) ---`);
  ok('D1 carga sin errores de consola', errs.length === 0, errs.join(' | '));
  ok('D2 KPI ciudad (alcaldías)', (await kpi(page)).includes('9,227'), await kpi(page));

  // estados de atribución
  await click(page, 'button[data-resp="gc"]'); await page.waitForTimeout(1800);
  const kBoth = await kpi(page);
  ok('D3a ambas casillas: KPIs duales', kBoth.includes('9,227') && kBoth.includes('692'));
  await click(page, 'button[data-resp="alc"]'); await page.waitForTimeout(1800);
  ok('D3b solo Gobierno Central', (await kpi(page)).includes('692') && !(await kpi(page)).includes('9,227'));
  ok('D3c no se puede apagar la última casilla', await (async () => { await click(page, 'button[data-resp="gc"]'); await page.waitForTimeout(400); return (await page.$eval('button[data-resp="gc"]', e => e.getAttribute('aria-pressed'))) === 'true'; })());
  await click(page, 'button[data-resp="alc"]'); await page.waitForTimeout(1500);
  ok('D3d regreso a Alcaldías', (await kpi(page)).includes('9,227'));

  // capas
  await click(page, '.seg.lvl button[data-lvl="alc"]'); await page.waitForTimeout(1500);
  const rk = await page.$eval('#results', e => e.innerText.replace(/\n/g, ' · '));
  ok('D4a capa Alcaldías: ranking de alcaldías', rk.includes('Iztapalapa'), rk.slice(0, 80));
  await click(page, '.seg.lvl button[data-lvl="col"]'); await page.waitForTimeout(1500);
  ok('D4b capa Colonias: ranking de colonias', (await page.$eval('#search-title', e => e.innerText)).includes('Colonias'));
  await click(page, '.seg.lvl button[data-lvl="fr"]'); await page.waitForTimeout(1200);
  ok('D4c Colonias + Calles combinables', await page.$eval('.seg.lvl button[data-lvl="col"]', e => e.getAttribute('aria-pressed')) === 'true');

  // alcaldía, colonia, calle
  await page.selectOption('#alc', { label: 'Iztapalapa' }); await page.waitForTimeout(2200);
  ok('D5 alcaldía: KPIs y caja', (await kpi(page)).includes('3,389') && (await page.$eval('#alcinfo', e => e.innerText)).includes('Muy Alta'));
  await page.fill('#col-q', 'santa maria aztahuacan'); await page.waitForTimeout(600);
  const nOpt = await page.$$eval('#col-list li[role=option]', l => l.length);
  ok('D6a autocompletado de colonia', nOpt > 0, nOpt + ' opciones');
  if (nOpt) { await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await page.waitForTimeout(2200); }
  ok('D6b ficha de colonia disponible', !(await page.$eval('#dl-ficha', e => e.hidden)));
  await page.fill('#q', 'zaragoza'); await page.waitForTimeout(700);
  ok('D8 búsqueda de calle', (await page.$eval('#results', e => e.querySelectorAll('li').length)) > 0);
  await click(page, '#reset-all'); await page.waitForTimeout(2000);
  ok('D11 reiniciar deja Alcaldías + ciudad', (await kpi(page)).includes('9,227') && await page.$eval('#alc', e => e.value) === '');

  // descargas
  const dl = async (sel, name) => {
    try {
      const [d] = await Promise.all([page.waitForEvent('download', { timeout: 90000 }), click(page, sel)]);
      await d.saveAs(SC + 'aud_' + name); const sz = fs.statSync(SC + 'aud_' + name).size;
      ok('D9 ' + name, sz > 2000, sz + ' bytes');
    } catch (e) { ok('D9 ' + name, false, e.message.slice(0, 60)); }
  };
  await page.selectOption('#alc', { label: 'Gustavo A. Madero' }); await page.waitForTimeout(2000);
  await dl('#dl-frentes', 'frentes.csv'); await dl('#dl-calles', 'calles.csv'); await dl('#dl-ficha-alc', 'ficha_alc.pdf');
  await page.fill('#col-q', 'san felipe de jesus'); await page.waitForTimeout(600); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await page.waitForTimeout(2000);
  await dl('#dl-ficha', 'ficha_col.pdf');
  await click(page, 'button[data-resp="gc"]'); await click(page, 'button[data-resp="alc"]'); await page.waitForTimeout(2000);
  await dl('#dl-tramos', 'tramos.csv'); await dl('#dl-avenidas', 'avenidas.csv'); await dl('#dl-ficha-vpalc', 'ficha_vp.pdf');
  await page.fill('#av-q', 'insurgentes'); await page.waitForTimeout(600); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await page.waitForTimeout(2500);
  await dl('#dl-ficha-av', 'ficha_av.pdf');

  // metodología + accesibilidad
  await click(page, '#open-info'); await page.waitForTimeout(800);
  const spans = await page.$$eval('#info-modal span[id^="m-"]', ss => ss.map(s => s.innerText));
  ok('D10a cifras de la metodología resueltas', spans.every(t => t && t !== '—'), spans.join(' / '));
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  ok('D10b Escape cierra la metodología', await page.$eval('#info-modal', e => e.hidden));
  const noName = await page.$$eval('button, [role=checkbox], select, input', els => els.filter(e => !e.offsetParent ? false : !(e.innerText || '').trim() && !e.getAttribute('aria-label') && !e.getAttribute('title') && !e.labels?.length).map(e => e.id || e.className).slice(0, 6));
  ok('D12 controles visibles con nombre accesible', noName.length === 0, noName.join(', '));
  const contrast = await page.$eval('.chip[aria-pressed="true"]', e => getComputedStyle(e).backgroundColor);
  out.push('    (chip activo: ' + contrast + ')');

  // ================= MÓVIL =================
  for (const vp of [{ width: 390, height: 844 }, { width: 360, height: 780 }]) {
    const m = await boot(vp, true);
    out.push(`--- MÓVIL ${vp.width}x${vp.height} (carga ${(m.load / 1000).toFixed(1)} s) ---`);
    const p = m.page;
    ok('M0 sin errores', m.errs.length === 0, m.errs.join(' | '));
    const ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    ok('M1 sin desbordamiento horizontal', ov.sw <= ov.iw + 1, JSON.stringify(ov));
    const mapH = await p.$eval('.mapwrap', e => e.getBoundingClientRect().height);
    ok('M5 mapa con altura útil', mapH >= 180, Math.round(mapH) + ' px');
    ok('M3a leyenda plegada al inicio', !(await p.$eval('.legend', e => e.classList.contains('open'))));
    await click(p, '#legend-toggle'); await p.waitForTimeout(400);
    ok('M3b la leyenda abre', await p.$eval('#legend-body', e => e.getBoundingClientRect().height > 40));
    await click(p, '#legend-toggle'); await p.waitForTimeout(300);
    const h0 = await p.$eval('.panel', e => e.getBoundingClientRect().height);
    await click(p, '#sheet'); await p.waitForTimeout(600);
    const h1 = await p.$eval('.panel', e => e.getBoundingClientRect().height);
    ok('M2 la hoja inferior expande', h1 > h0 + 40, Math.round(h0) + ' → ' + Math.round(h1) + ' px');
    const small = await p.$$eval('.chip, .seg.pills button, .btn:not([hidden]), .tool, #sheet', els => els.filter(e => e.offsetParent).map(e => ({ c: (e.className || '').toString().slice(0, 22), h: Math.round(e.getBoundingClientRect().height) })).filter(o => o.h < 36));
    ok('M4 objetivos táctiles ≥ 36 px', small.length === 0, JSON.stringify(small).slice(0, 160));
    const fs16 = await p.$$eval('#col-q, #q, #alc', els => els.map(e => parseFloat(getComputedStyle(e).fontSize)));
    ok('M7 campos ≥ 16 px (sin zoom en iOS)', fs16.every(v => v >= 16), fs16.join('/'));
    await p.selectOption('#alc', { label: 'Iztapalapa' }); await p.waitForTimeout(2200);
    ok('M9 selección de alcaldía en móvil', (await p.$eval('#kpis', e => e.innerText)).includes('3,389'));
    ok('M2b al elegir ámbito la hoja se recoge', !(await p.evaluate(() => document.body.classList.contains('sheet-open'))));
    await p.evaluate(() => { document.querySelector('#card').hidden = false; document.querySelector('#card').innerHTML = '<button class="close">x</button><h3>Prueba</h3>'; });
    const cardW = await p.$eval('#card', e => e.getBoundingClientRect());
    ok('M6 ficha como hoja inferior a todo lo ancho', Math.abs(cardW.width - vp.width) < 2, JSON.stringify({ w: Math.round(cardW.width) }));
    await p.evaluate(() => { document.querySelector('#card').hidden = true; });
    await click(p, '#open-info'); await p.waitForTimeout(700);
    const modal = await p.$eval('.modal-card', e => e.getBoundingClientRect());
    ok('M8 metodología a pantalla completa', modal.width >= vp.width - 2, Math.round(modal.width) + ' px');
    const diag = await p.$eval('.diag svg', e => e.getBoundingClientRect().width);
    ok('M8b diagrama dentro del ancho', diag <= vp.width, Math.round(diag) + ' px');
    await p.screenshot({ path: SC + `aud_movil_${vp.width}.png`, fullPage: false, timeout: 120000 });
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    await click(p, '#sheet'); await p.waitForTimeout(700);
    await p.screenshot({ path: SC + `aud_movil_${vp.width}_sheet.png`, timeout: 120000 });
    if (m.errs.length) out.push('    errores: ' + m.errs.join(' | '));
    await m.ctx.close();
  }

  console.log(out.join('\n'));
  fs.writeFileSync(SC + 'auditoria.txt', out.join('\n'));
  await browser.close();
})().catch(e => { console.log(out.join('\n')); console.error('FALLO GENERAL', e); process.exit(1); });
