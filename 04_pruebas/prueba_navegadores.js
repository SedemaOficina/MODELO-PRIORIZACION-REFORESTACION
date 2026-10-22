// Firefox y Safari (WebKit): el flujo principal fuera de Chromium (A1-02 de la auditoría del 19 oct 2026; decisión de Liber del 21 oct:
// correrlo en GitHub en cada Push). En computadora y en teléfono: abre sin errores, busca y elige una colonia, y salen el Excel de frentes
// y la ficha PDF con contenido válido. Sin dibujar el mapa (#nomap): los equipos de GitHub no siempre tienen WebGL.
// En el equipo de trabajo, el motor que no esté instalado o que el sistema no deje abrir se omite y se dice (Windows no deja abrir el Firefox
// de Playwright); con NAVEGADORES_OBLIGATORIOS=1 (así corre en GitHub), un motor que no abre es una falla.
// Uso: node 04_pruebas/prueba_navegadores.js
const path = require('path'), fs = require('fs'), PW = require('playwright');
const L = require('./lib_pruebas.js');
const ok = L.Registro('Firefox y WebKit');
const SAL = path.join(__dirname, 'capturas', 'navegadores'); fs.mkdirSync(SAL, { recursive: true });
const OBLIGATORIOS = process.env.NAVEGADORES_OBLIGATORIOS === '1';
const MOTORES = [
  // Firefox sin pantalla en Linux apaga WebGL si no reconoce la tarjeta gráfica; se fuerza el dibujo por programa (la herramienta exige WebGL 2)
  ['Firefox', () => PW.firefox.launch({ firefoxUserPrefs: { 'webgl.force-enabled': true, 'webgl.disabled': false } })],
  // WebKit: el que pide Playwright o, si no está, el que ya está instalado en el equipo de trabajo (no se descarga)
  ['WebKit', async () => { try { return await PW.webkit.launch(); } catch (e) {
    const p = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'webkit-2359', 'Playwright.exe'); if (fs.existsSync(p)) return PW.webkit.launch({ executablePath: p }); throw e; } }],
];

(async () => {
  const srv = await L.servidor(0); const base = srv.url + '?modo=ligero#nomap';
  for (const [motor, lanza] of MOTORES) {
    let browser = null; try { browser = await lanza(); } catch (e) { const por = String(e.message || e).split('\n')[0].slice(0, 120);
      if (OBLIGATORIOS) ok(`${motor}: el navegador abre`, false, por); else console.log(`OMITIDA ${motor}: no se pudo abrir en este equipo (${por})`); continue; }
    ok(`${motor}: el navegador abre`, true, browser.version());
    // Firefox no admite la emulación de teléfono (isMobile): ahí el teléfono es solo el tamaño de pantalla
    const telefono = motor === 'Firefox' ? { viewport: { width: 390, height: 844 } } : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
    for (const [pantalla, op] of [['computadora', {}], ['teléfono', telefono]]) {
      const n = `${motor}, ${pantalla}`, errores = [];
      try {
        const { page, ctx } = await L.abrir(browser, base, op, errores);
        ok(`${n}: abre la herramienta`, await page.evaluate(() => !!document.getElementById('omni') && document.getElementById('loader').hidden));
        const elegida = await L.elegirTipo(page, 'Tecpinco', 'Col', 'Iztapalapa');
        const titulo = await page.evaluate(() => (document.getElementById('scope-title') || {}).textContent || '');
        ok(`${n}: el buscador encuentra y elige una colonia`, elegida && /Tecpinco/.test(titulo), titulo.trim().slice(0, 80));
        const x = await L.descargar(page, '#dl-frentes', SAL);
        const xb = x && fs.readFileSync(x.ruta);
        ok(`${n}: sale el Excel de frentes (un .xlsx válido)`, !!x && /\.xlsx$/.test(x.nombre) && xb.length > 2000 && xb.slice(0, 2).toString() === 'PK', x ? `${x.nombre} · ${xb.length} bytes` : 'no llegó');
        const f = await L.descargar(page, '#dl-ficha', SAL);
        const fb = f && fs.readFileSync(f.ruta);
        ok(`${n}: sale la ficha PDF de la colonia (un PDF válido)`, !!f && /\.pdf$/.test(f.nombre) && fb.length > 5000 && fb.slice(0, 5).toString() === '%PDF-', f ? `${f.nombre} · ${fb.length} bytes` : 'no llegó');
        ok(`${n}: sin errores en la página`, errores.length === 0, errores.slice(0, 2).join(' | '));
        await ctx.close();
      } catch (e) {
        // qué muestra la pantalla de carga y si el motor tiene WebGL 2 (sin él, la herramienta se detiene al abrir): en GitHub es la única pista
        const vista = await Promise.all(browser.contexts().flatMap(c => c.pages()).map(p => p.evaluate(() => ({
          carga: ((document.getElementById('load-msg') || {}).textContent || '').trim().slice(0, 200),
          webgl2: (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (x) { return false; } })() })).catch(() => null)));
        ok(`${n}: la prueba corre`, false, `${String(e.message).split('\n')[0].slice(0, 120)} · pantalla: ${JSON.stringify(vista.filter(Boolean))} · errores: ${errores.slice(0, 2).join(' | ').slice(0, 300)}`);
        await Promise.all(browser.contexts().map(c => c.close().catch(() => {}))); }
    }
    await browser.close();
  }
  srv.close(); process.exitCode = ok.fin() ? 1 : 0;
})();
