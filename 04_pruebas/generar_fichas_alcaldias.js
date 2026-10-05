// Lote de fichas PDF para las 16 alcaldías (pendiente 8 del README; esquema de la nota 03 de la bitácora, más vialidades primarias).
// Por alcaldía, en orden alfabético: ficha de la alcaldía, ficha de vialidades primarias (Gobierno Central) y ficha de la colonia
// con más frente prioritario (km Muy Alta + Alta a cargo de la alcaldía). Las fichas son las mismas que descarga la herramienta.
// Uso: node 04_pruebas/generar_fichas_alcaldias.js [CARPETA]   (por omisión _local/fichas_alcaldias_vX.YY; no se publica)
// Después, para el PDF combinado y el zip: python 04_pruebas/unir_fichas.py CARPETA
const fs = require('fs'), path = require('path');
const L = require('./lib_pruebas.js');
const RAIZ = path.join(__dirname, '..');
const VERSION = (fs.readFileSync(path.join(RAIZ, '02_fuente', 'construir.py'), 'utf8').match(/^VERSION = '([^']+)'/m) || [])[1];
const SAL = process.argv[2] || path.join(RAIZ, '_local', `fichas_alcaldias_v${VERSION}`);
const D = L.decodificar(); const M = D.META;
const slug = s => L.norm(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// colonia con más km prioritarios a cargo de la alcaldía, por alcaldía (mismo criterio que el ranking de colonias de la herramienta)
const kmp = new Map(); for (const f of D.F) if (!f.gc && f.col && f.prio >= 3) kmp.set(f.col, (kmp.get(f.col) || 0) + f.len);
const mejor = M.muns.map(m => { let id = null, v = -1; for (const [c, k] of kmp) if (M.colonias[c].m === m && k > v) { id = c; v = k; } return { id, km: v / 1000 }; });

(async () => {
  fs.mkdirSync(SAL, { recursive: true });
  const srv = await L.servidor(0); const browser = await L.lanzar(); const errores = []; const indice = [];
  const { page, ctx } = await L.abrir(browser, srv.url + '?modo=ligero#nomap', {}, errores);
  const ir = async q => { await page.goto(srv.url + '?modo=ligero' + q + '#nomap'); await page.waitForSelector('#loader[hidden]', { state: 'attached' }); await page.waitForTimeout(700); };
  const orden = M.munNames.map((n, i) => i).sort((a, b) => M.munNames[a].localeCompare(M.munNames[b], 'es'));
  for (const [k, i] of orden.entries()) {
    const nom = M.munNames[i], clave = M.muns[i], dir = path.join(SAL, `${String(k + 1).padStart(2, '0')}_${slug(nom)}`); fs.mkdirSync(dir, { recursive: true });
    const col = mejor[i]; const fichas = [['alcaldia', `&a=${clave}`, 'dl-ficha-alc'], ['vialidades_primarias', `&r=gc&a=${clave}`, 'dl-ficha-vpalc'], ['colonia', `&c=${col.id}`, 'dl-ficha']];
    for (const [tipo, q, boton] of fichas) {
      await ir(q); const d = await L.descargar(page, '#' + boton, dir, 240000);
      if (!d) { console.log('FALTA', nom, tipo); errores.push(`${nom}: sin ficha de ${tipo}`); continue; }
      const dest = path.join(dir, `${String(fichas.findIndex(f => f[0] === tipo) + 1)}_${d.nombre.replace(/_\d{8}\.pdf$/, '.pdf')}`); fs.renameSync(d.ruta, dest);
      console.log('ok', path.relative(SAL, dest));
    }
    indice.push(`${String(k + 1).padStart(2, '0')}. ${nom} · colonia con más frente prioritario: ${M.colonias[col.id].n} (${col.km.toFixed(1)} km Muy Alta + Alta)`);
  }
  fs.writeFileSync(path.join(SAL, '00_indice.txt'), `Fichas de las 16 alcaldías · Calles prioritarias para reforestar · versión ${VERSION}\nGeneradas el ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}. Por alcaldía: 1 ficha de la alcaldía, 2 vialidades primarias (Gobierno Central), 3 colonia con más frente prioritario.\nLa asignación de frentes a la alcaldía o al Gobierno Central es preliminar: la regla del cruce está en validación.\n\n${indice.join('\n')}\n`, 'utf8');
  await ctx.close(); await browser.close(); srv.close();
  console.log(errores.length ? `\n${errores.length} problema(s): ${errores.slice(0, 3).join(' | ')}` : `\nLote completo en ${SAL}`); process.exit(errores.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
