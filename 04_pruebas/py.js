// Corre un programa de Python con el nombre que tiene en cada sistema: «python» en Windows (donde «python3» es un acceso
// directo a la tienda, no Python) y «python3» en los demás. Lo usan las órdenes de package.json.
// Uso: node 04_pruebas/py.js RUTA_DEL_PROGRAMA [argumentos…]
const cp = require('child_process'), path = require('path');
const py = process.platform === 'win32' ? 'python' : 'python3';
const r = cp.spawnSync(py, process.argv.slice(2), { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
if (r.error) console.error(`No se pudo ejecutar ${py}: ${r.error.message}`);
process.exit(r.status === null ? 1 : r.status);
