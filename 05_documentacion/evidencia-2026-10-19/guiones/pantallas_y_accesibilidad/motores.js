// B8 · ¿Arrancan Firefox y WebKit de ms-playwright con el Playwright 1.56 de la copia?
// Uso: node motores.js   (desde cualquier carpeta; toma Playwright de r2/node_modules)
const path = require('path');
const R2 = process.env.R2 || path.join(__dirname, '..', '..', 'r2');
const { firefox, webkit, chromium } = require(path.join(R2, 'node_modules', 'playwright'));
const LA = process.env.LOCALAPPDATA;
const RUTAS = { firefox: path.join(LA, 'ms-playwright', 'firefox-1543', 'firefox', 'firefox.exe'), webkit: path.join(LA, 'ms-playwright', 'webkit-2359', 'Playwright.exe') };
(async () => {
  for (const [n, t] of [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]]) {
    for (const modo of ['por omisión', 'ruta explícita']) {
      if (modo === 'ruta explícita' && !RUTAS[n]) continue;
      const t0 = Date.now();
      try {
        const b = await t.launch(modo === 'ruta explícita' ? { executablePath: RUTAS[n], timeout: 60000 } : { timeout: 60000 });
        const p = await b.newPage(); await p.setContent('<p id=x>hola</p>'); const v = await p.textContent('#x');
        console.log(`${n} (${modo}): ARRANCA · versión ${b.version()} · ${v} · ${Date.now() - t0} ms`); await b.close();
      } catch (e) { console.log(`${n} (${modo}): NO ARRANCA · ${e.message.split('\n').slice(0, 3).join(' | ')}`); }
    }
  }
})();
