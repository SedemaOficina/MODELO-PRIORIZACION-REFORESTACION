// Corre todas las verificaciones, una tras otra, y da una sola señal: código 0 si todo pasó (auditoría H-077).
// Uso: node 04_pruebas/correr_todas.js          todas (unos 12 minutos sin tarjeta gráfica)
//      node 04_pruebas/correr_todas.js rapidas  solo las que no abren el navegador (menos de un minuto)
const cp = require('child_process'), path = require('path'), fs = require('fs');
const RAIZ = path.join(__dirname, '..'); const py = process.platform === 'win32' ? 'python' : 'python3';
// ESLint se corre con Node y no con su .cmd: sin intérprete de órdenes de por medio, las rutas con espacios no se parten
const eslint = path.join(RAIZ, 'node_modules', 'eslint', 'bin', 'eslint.js');
const RAPIDAS = [
  ['datos verificados', py, ['03_procesamiento_datos/verificar_datos.py']],
  ['construcción', py, ['04_pruebas/prueba_construccion.py']],
  ['revisión estática (ESLint)', fs.existsSync(eslint) ? process.execPath : null, [eslint, 'docs/app.js']],
];
const NAVEGADOR = ['prueba_sin_terceros.js', 'prueba_sitio.js', 'prueba_robustez.js', 'prueba_coherencia_cifras.js', 'prueba_accesibilidad.js', 'prueba_servidor_sia.js', 'prueba_telefono_y_sin_conexion.js', 'prueba_orientacion.js', 'prueba_mapa_descargas.js', 'prueba_casos_limite.js']
  .map(f => [f.replace('prueba_', '').replace('.js', '').replace(/_/g, ' '), process.execPath, ['04_pruebas/' + f]]);
const lista = process.argv[2] === 'rapidas' ? RAPIDAS : RAPIDAS.concat(NAVEGADOR); const res = [];
for (const [nombre, cmd, args] of lista) {
  if (!cmd) { res.push([nombre, 'FALLA', 0, 'no se corrió: falta npm install']); continue; }   // lo que no se revisó no cuenta como aprobado
  const t = Date.now(); process.stdout.write(`\n===== ${nombre} =====\n`);
  // sin shell: en Windows partía «C:\Program Files\…» en dos. PYTHONIOENCODING: con la salida redirigida, Python en Windows
  // escribe en cp1252 y se detiene al imprimir «≤» o «·»
  const r = cp.spawnSync(cmd, args, { cwd: RAIZ, stdio: 'inherit', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  res.push([nombre, r.status === 0 ? 'OK' : 'FALLA', Math.round((Date.now() - t) / 1000), r.error ? r.error.message : '']);
}
console.log('\n===== Resumen =====');
for (const [n, e, s, nota] of res) console.log(`${e.padEnd(8)} ${n}${s ? ` · ${s} s` : ''}${nota ? ` · ${nota}` : ''}`);
const mal = res.filter(r => r[1] === 'FALLA').length;
console.log(mal ? `\n${mal} verificación(es) con falla.` : '\nTodo pasó.');
process.exit(mal ? 1 : 0);
