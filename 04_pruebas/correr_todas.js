// Corre todas las verificaciones, una tras otra, y da una sola señal: código 0 si todo pasó (auditoría H-077).
// Uso: node 04_pruebas/correr_todas.js          todas (unos 12 minutos sin tarjeta gráfica)
//      node 04_pruebas/correr_todas.js rapidas  solo las que no abren el navegador (menos de un minuto)
const cp = require('child_process'), path = require('path'), fs = require('fs');
const RAIZ = path.join(__dirname, '..'); const py = process.platform === 'win32' ? 'python' : 'python3';
const eslint = path.join(RAIZ, 'node_modules', '.bin', process.platform === 'win32' ? 'eslint.cmd' : 'eslint');
const RAPIDAS = [
  ['datos verificados', py, ['03_procesamiento_datos/verificar_datos.py']],
  ['construcción', py, ['04_pruebas/prueba_construccion.py']],
  ['revisión estática (ESLint)', fs.existsSync(eslint) ? eslint : null, ['docs/app.js']],
];
const NAVEGADOR = ['prueba_sin_terceros.js', 'prueba_sitio.js', 'prueba_robustez.js', 'prueba_coherencia_cifras.js', 'prueba_accesibilidad.js', 'prueba_servidor_sia.js', 'prueba_telefono_y_sin_conexion.js']
  .map(f => [f.replace('prueba_', '').replace('.js', '').replace(/_/g, ' '), process.execPath, ['04_pruebas/' + f]]);
const lista = process.argv[2] === 'rapidas' ? RAPIDAS : RAPIDAS.concat(NAVEGADOR); const res = [];
for (const [nombre, cmd, args] of lista) {
  if (!cmd) { res.push([nombre, 'OMITIDA (falta npm install)', 0]); continue; }
  const t = Date.now(); process.stdout.write(`\n===== ${nombre} =====\n`);
  const r = cp.spawnSync(cmd, args, { cwd: RAIZ, stdio: 'inherit', shell: process.platform === 'win32' });
  res.push([nombre, r.status === 0 ? 'OK' : 'FALLA', Math.round((Date.now() - t) / 1000)]);
}
console.log('\n===== Resumen =====');
for (const [n, e, s] of res) console.log(`${e.padEnd(8)} ${n}${s ? ` · ${s} s` : ''}`);
const mal = res.filter(r => r[1] === 'FALLA').length;
console.log(mal ? `\n${mal} verificación(es) con falla.` : '\nTodo pasó.');
process.exit(mal ? 1 : 0);
