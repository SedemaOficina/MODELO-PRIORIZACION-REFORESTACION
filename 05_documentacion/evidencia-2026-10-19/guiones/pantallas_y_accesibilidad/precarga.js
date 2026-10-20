// B8 · ¿La precarga (<link rel=preload>) de los datos se aprovecha o se descargan dos veces? Cuenta pedidos por archivo en cada motor.
const C = require('./comun.js'); const { L, PW, path } = C;
const WEBKIT = path.join(process.env.LOCALAPPDATA, 'ms-playwright', 'webkit-2359', 'Playwright.exe');
const http = require('http'), fs = require('fs'); const DOCS = path.resolve(process.env.DOCS); let H = {};
const srvP = () => new Promise(res => { const s = http.createServer((req, rs) => { let rel = decodeURIComponent(req.url.split('?')[0]); if (rel.endsWith('/')) rel += 'index.html'; const ruta = path.join(DOCS, rel);
  if (!fs.existsSync(ruta)) { rs.writeHead(404); return rs.end(); } const u = rel.split('/').pop(); if (/\.bin$/.test(u)) H[u] = (H[u] || 0) + 1;
  rs.writeHead(200, { 'Content-Type': /html$/.test(rel) ? 'text/html; charset=utf-8' : /js$/.test(rel) ? 'application/javascript' : /css$/.test(rel) ? 'text/css' : 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000' }); fs.createReadStream(ruta).pipe(rs); });
  s.listen(0, () => { s.url = `http://localhost:${s.address().port}/`; res(s); }); });
(async () => { const srv = await srvP();
  for (const m of ['chromium', 'webkit']) for (let r = 1; r <= 2; r++) { const b = m === 'webkit' ? await PW.webkit.launch({ executablePath: WEBKIT }) : await L.lanzar();
    const ctx = await C.contexto(b, { ...C.ANCHOS[5] }); const n = {}; ctx.on('request', q => { const u = q.url().split('/').pop().split('?')[0]; if (/\.bin$/.test(u)) n[u] = (n[u] || 0) + 1; });
    const p = await C.pagina(ctx, srv.url + '?modo=ligero'); await p.waitForTimeout(4000); console.log(m, 'rep', r, 'eventos', JSON.stringify(n), '· llegaron al servidor', JSON.stringify(H)); H = {}; await b.close(); }
  srv.close(); })();
