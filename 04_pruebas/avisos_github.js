// Corre una verificación en GitHub y publica cada «FALLA» como aviso (anotación) de la corrida: se ve en la página de la corrida
// y por la API sin iniciar sesión, mientras que el registro completo solo lo ve quien tiene sesión. Si la verificación termina mal
// sin ninguna línea «FALLA» (por ejemplo, se cae), publica sus últimas líneas. Fuera de GitHub solo pasa la salida, sin cambios.
// Uso (en .github/workflows/verificar.yml): node 04_pruebas/avisos_github.js node 04_pruebas/prueba_navegadores.js
const cp = require('child_process');
const [cmd, ...args] = process.argv.slice(2);
if (!cmd) { console.error('Uso: node 04_pruebas/avisos_github.js ORDEN [ARGUMENTOS…]'); process.exit(2); }
const r = cp.spawnSync(cmd === 'node' ? process.execPath : cmd, args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, env: process.env });
const salida = (r.stdout || '') + (r.stderr || '') + (r.error ? r.error.message + '\n' : '');
process.stdout.write(salida);
if (process.env.GITHUB_ACTIONS === 'true') {
  // formato de los comandos de GitHub: % y saltos de línea van escapados
  const esc = t => String(t).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  const lineas = salida.split('\n'), fallas = lineas.filter(l => /^FALLA\s/.test(l)).map(l => l.replace(/^FALLA\s+/, ''));
  let seccion = '';
  for (const l of lineas) { const m = l.match(/^===== (.+) =====$/); if (m) seccion = m[1];
    if (/^FALLA\s/.test(l)) console.log(`::error title=${esc(seccion || args[args.length - 1] || cmd).replace(/[:,]/g, ' ')}::${esc(l.replace(/^FALLA\s+/, ''))}`); }
  if (r.status !== 0 && !fallas.length) console.log(`::error title=Terminó con error (código ${r.status})::${esc(lineas.filter(Boolean).slice(-20).join('\n'))}`);
}
process.exit(r.status === null ? 1 : r.status);
