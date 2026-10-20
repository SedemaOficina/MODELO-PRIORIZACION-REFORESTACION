// Funciones comunes de los guiones del frente 3 (tareas, UX y textos).
// Usa el Playwright y la biblioteca de pruebas de la copia r3 (sin instalar nada). Sirve r3/docs en un puerto libre.
// Uso desde otro guion:  const C = require('./comun_f3');
const path = require('path'), fs = require('fs');
const R3 = process.env.R3 || path.resolve(__dirname, '..', '..', 'r3');
const L = require(path.join(R3, '04_pruebas', 'lib_pruebas.js'));
const { chromium } = require(path.join(R3, 'node_modules', 'playwright'));
const EVID = __dirname, CAP = path.join(EVID, 'capturas'), DESC = path.join(EVID, 'descargas');
fs.mkdirSync(CAP, { recursive: true }); fs.mkdirSync(DESC, { recursive: true });
const TEL = { width: 390, height: 844 }, ESC = { width: 1440, height: 900 };

async function lanzar() { return chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); }
// abre la herramienta. op.vp: tamaño; op.mapa: true dibuja el mapa (sin #nomap); op.primera: primera visita (entrada y recorrido);
// op.query: ?a=…; op.ctx: contexto existente (para dos pestañas)
async function abrir(browser, base, op = {}) {
  const vp = op.vp || ESC; const tel = vp.width < 600;
  const ctx = op.ctx || await browser.newContext({ acceptDownloads: true, viewport: vp, locale: 'es-MX', serviceWorkers: 'block',
    ...(tel ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
  if (!op.ctx) {
    await ctx.addInitScript(() => { window.SIA_PRUEBA = true; });
    if (op.primera) await ctx.addInitScript(() => { window.SIA_RECORRIDO = true; });
    else await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('cp_p')) { localStorage.setItem('cp_inicio', 'ciudad'); localStorage.setItem('cp_recorrido', 'visto'); sessionStorage.setItem('cp_p', '1'); } } catch (e) {} });
  }
  const page = await ctx.newPage(); page.setDefaultTimeout(240000);
  page.errores = []; page.on('pageerror', e => page.errores.push(e.message));
  const url = base + (op.query || '?modo=ligero') + (op.mapa ? '' : '#nomap');
  await page.goto(url); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(op.mapa ? 2500 : 800);
  return { ctx, page };
}
// conteo de carga de la interfaz en la pantalla visible (C3): palabras, controles, pestañas, alto en pantallas
async function medir(page, nombre) {
  return page.evaluate((nombre) => {
    const H = innerHeight, W = innerWidth;
    const visible = e => { if (!e || !e.isConnected) return false; if (e.closest('[hidden],[inert]')) return false; const s = getComputedStyle(e);
      if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
      const d = e.parentElement && e.parentElement.closest('details:not([open])'); if (d && !(e.tagName === 'SUMMARY' && e.parentElement === d)) return false; return true; };
    // contenedor de la pantalla visible: modal abierto, recorrido, o panel / mapa según la pantalla del celular
    const modal = [...document.querySelectorAll('.modal')].find(m => !m.hidden);
    const raiz = modal || (document.body.classList.contains('ver-mapa') && W < 861 ? document.querySelector('.mapwrap') : document.body);
    const sc = modal ? modal.querySelector('.modal-card') : (W < 861 ? (document.body.classList.contains('ver-mapa') ? document.querySelector('.mapwrap') : [document.querySelector('.panel-body'), document.querySelector('.panel')].find(e => e && e.scrollHeight > e.clientHeight + 4) || document.querySelector('.panel')) : document.querySelector('.panel-body'));
    // texto visible: nodos de texto cuyos padres son visibles
    const tw = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT); let pal = 0, palPliegue = 0, n;
    while ((n = tw.nextNode())) { const p = n.parentElement; if (!p || !visible(p) || p.closest('svg,script,style,.sr,option')) continue; const w = (n.textContent.match(/[\p{L}\p{N}][\p{L}\p{N}.,%°·'-]*/gu) || []).length; if (!w) continue;
      pal += w; const r = p.getBoundingClientRect(); if (r.top < H && r.bottom > 0) palPliegue += w; }
    const ctl = [...raiz.querySelectorAll('button,a[href],input:not([type=hidden]),select,summary,[role=button],[role=tab],[role=checkbox],[tabindex="0"]')].filter(visible);
    const unicos = [...new Set(ctl)];
    const pliegue = unicos.filter(e => { const r = e.getBoundingClientRect(); return r.top < H && r.bottom > 0; });
    const tabs = unicos.filter(e => e.getAttribute('role') === 'tab').length;
    const botones = unicos.filter(e => e.tagName === 'BUTTON' || e.getAttribute('role') === 'button').length;
    const alto = sc ? sc.scrollHeight : document.documentElement.scrollHeight, vista = sc ? sc.clientHeight : H;
    return { nombre, ancho: W, palabras: pal, palabrasPrimeraPantalla: palPliegue, controles: unicos.length, controlesPrimeraPantalla: pliegue.length, botones, pestanas: tabs,
      pantallas: +(alto / Math.max(1, vista)).toFixed(2), altoPx: alto, desbordeHorizontal: document.documentElement.scrollWidth > W + 1 };
  }, nombre);
}
async function captura(page, nombre, op = {}) { const f = path.join(CAP, nombre + '.png'); await page.screenshot({ path: f, fullPage: !!op.completa }); return path.relative(EVID, f); }
const esperar = (page, ms = 400) => page.waitForTimeout(ms);
async function clic(page, sel) { await page.$eval(sel, b => b.click()); await esperar(page, 450); }
async function omni(page, texto, n = 0, tipo = null) {
  await page.fill('#omni', ''); await page.fill('#omni', texto); await esperar(page, 700);
  const ops = await page.$$('#omni-list li.opt');
  let o = ops[n]; if (tipo) for (const x of ops) { const t = (await x.innerText()).trim(); if (t.startsWith(tipo)) { o = x; break; } }
  if (!o) return null; const t = (await o.innerText()).replace(/\s+/g, ' ').trim(); await o.dispatchEvent('mousedown'); await esperar(page, 900); return t; }
async function texto(page, sel) { return page.$eval(sel, e => e.innerText.replace(/\s+/g, ' ').trim()).catch(() => null); }
async function guardarJSON(nombre, obj) { fs.writeFileSync(path.join(EVID, nombre), JSON.stringify(obj, null, 1)); }
module.exports = { R3, L, EVID, CAP, DESC, TEL, ESC, lanzar, abrir, medir, captura, esperar, clic, omni, texto, guardarJSON, servidor: () => L.servidor(0, path.join(R3, 'docs')) };
