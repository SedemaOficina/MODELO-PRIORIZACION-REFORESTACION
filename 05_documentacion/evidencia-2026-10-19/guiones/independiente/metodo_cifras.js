// Lee las cifras que la metodología («Cómo funciona») llena al abrir. Uso: node metodo_cifras.js <docs>
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium } = require(path.join('X:/r7/node_modules/playwright'));
const DOCS = process.argv[2];
const TIP = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.bin': 'application/octet-stream', '.png': 'image/png', '.woff2': 'font/woff2' };
(async () => { const s = http.createServer((q, r) => { let rel = decodeURIComponent(q.url.split('?')[0]); if (rel.endsWith('/')) rel += 'index.html'; const p = path.join(DOCS, rel); if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TIP[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise(ok => s.listen(0, '127.0.0.1', ok)); const url = `http://127.0.0.1:${s.address().port}/`;
  const br = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const ctx = await br.newContext({ serviceWorkers: 'block', locale: 'es-MX' });
  await ctx.addInitScript(() => { window.SIA_PRUEBA = true; try { localStorage.setItem('cp_inicio', 'ciudad'); localStorage.setItem('cp_recorrido', 'visto'); } catch (e) {} });
  const page = await ctx.newPage(); await page.goto(url + '?modo=ligero#nomap'); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(800);
  const t = await page.evaluate(() => { const m = document.getElementById('metodologia'); return m ? m.innerText.replace(/\s+/g, ' ') : null; });
  const i = t.indexOf('Quién atiende cada calle'); console.log(i < 0 ? 'NO ENCONTRADO' : t.slice(i, i + 900));
  console.log((t.match(/Cada calle se divide.{0,200}/) || [''])[0]);
  await br.close(); s.close(); })();
