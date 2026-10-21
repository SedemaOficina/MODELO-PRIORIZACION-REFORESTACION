// Empaquetado para el SIA (F4-01 de la auditoría del 19 oct 2026): empaquetar.py no deja viajar archivos ajenos ni secretos.
// Copia lo que lee el empaquetado (02_fuente sin claves.local.json, README.md y lo de 08_entrega_sia que entra al paquete) a una
// carpeta temporal FUERA del repositorio y ahí lo corre dos veces: (1) limpio y con --revisar, la revisión pasa, los .sql del
// módulo (db/) entran y no se escribe ZIP; (2) con archivos sembrados (.env, llave .pem, SQL fuera de db/, CSV de contraseñas y dos
// que solo delata su contenido), termina con error, nombra cada uno y no deja ZIP. Al final borra la carpeta temporal.
// No abre el navegador: corre en las rápidas. Uso: node 04_pruebas/prueba_empaquetado.js
// EMPAQUETAR=ruta/de/otro/empaquetar.py prueba otra versión del guion (por ejemplo la de HEAD, tomada con «git show»).
const path = require('path'), fs = require('fs'), os = require('os'), cp = require('child_process');
const RAIZ = path.join(__dirname, '..'), E = path.join(RAIZ, '08_entrega_sia');
const PY = process.platform === 'win32' ? 'python' : 'python3';   // en Windows «python3» es un acceso directo a la tienda
const r = []; const ok = (n, cond, det = '') => { r.push([!!cond, n, det]); console.log(`${cond ? 'OK   ' : 'FALLA'} ${n}${det ? ' · ' + det : ''}`); return !!cond; };

// lo que el empaquetado toma de 08_entrega_sia (rutas relativas a esa carpeta; dentro del paquete quedan igual)
const PARTES = ['login/acceso', 'login/LEEME.md', 'login/backend/src/modulos/priorizacion-reforestacion', 'login/backend/db/priorizacion_reforestacion',
  'login/backend/herramientas/priorizacion-reforestacion', 'capas_geoserver'];
// archivos sembrados: ruta dentro de 08_entrega_sia (= ruta dentro del paquete) y contenido, todo ficticio
const SEMBRADOS = {
  'login/acceso/.env': 'DB_PASSWORD=ficticia-solo-para-la-prueba\n',
  'login/backend/src/modulos/priorizacion-reforestacion/llave.pem': '-----BEGIN PRIVATE KEY-----\nAAAAficticiaSoloParaLaPrueba\n-----END PRIVATE KEY-----\n',
  'login/acceso/recursos/respaldo.sql': "INSERT INTO cuentas (correo) VALUES ('persona@ejemplo.mx');\n",
  'login/acceso/cuentas_con_contrasenas.csv': 'correo,nombre,contrasena_temporal\npersona@ejemplo.mx,Persona Ficticia,Ficticia-0000\n',
  // con extensión permitida en su carpeta: solo los delata el contenido
  'login/acceso/recursos/notas.txt': 'correo;contraseña\npersona@ejemplo.mx;Ficticia-0000\n',
  'login/acceso/recursos/ajustes.js': "// ajustes\nAPI_TOKEN = 'ficticio-0000-1111'\n",
};
// copia recursiva propia: fs.cpSync de Node 24 se cae en Windows con rutas que llevan acentos («Información», «Páginas»)
const copiar = (de, a, salta = () => false) => { if (salta(de)) return; if (fs.statSync(de).isDirectory()) { fs.mkdirSync(a, { recursive: true });
  for (const x of fs.readdirSync(de)) copiar(path.join(de, x), path.join(a, x), salta); } else fs.copyFileSync(de, a); };
const cuenta = d => fs.statSync(d).isDirectory() ? fs.readdirSync(d).reduce((s, a) => s + cuenta(path.join(d, a)), 0) : 1;
const listar = d => fs.existsSync(d) ? fs.readdirSync(d, { recursive: true }).map(String).sort() : [];
const zips = d => listar(d).filter(a => /\.zip(\.sha256|\.parcial)?$/.test(a));
const ENTREGA_REPO = path.join(RAIZ, '_local', 'entrega'), antes = listar(ENTREGA_REPO).join('|');
const T = fs.mkdtempSync(path.join(os.tmpdir(), 'empaquetado-'));
const correr = (...args) => { const p = cp.spawnSync(PY, [path.join(T, '08_entrega_sia', 'empaquetar.py'), ...args],
  { cwd: T, encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' }, timeout: 300000 });
  return { status: p.status, salida: (p.stdout || '') + (p.stderr || '') + (p.error ? p.error.message : '') }; };

try {
  // ---------- copia fuera del repositorio ----------
  const t0 = Date.now();
  copiar(path.join(RAIZ, '02_fuente'), path.join(T, '02_fuente'), s => /claves\.local\.json$|__pycache__$/.test(s));
  fs.copyFileSync(path.join(RAIZ, 'README.md'), path.join(T, 'README.md'));
  fs.mkdirSync(path.join(T, '08_entrega_sia'));
  for (const a of fs.readdirSync(E)) if (/\.(md|ejemplo|py)$/.test(a)) fs.copyFileSync(path.join(E, a), path.join(T, '08_entrega_sia', a));
  if (process.env.EMPAQUETAR) fs.copyFileSync(path.resolve(process.env.EMPAQUETAR), path.join(T, '08_entrega_sia', 'empaquetar.py'));
  for (const p of PARTES) copiar(path.join(E, p), path.join(T, '08_entrega_sia', p));
  // en una copia de GitHub no vienen las capas .gpkg ni su manifiesto (no se publican): se ponen capas ficticias con su
  // manifiesto, porque esta prueba revisa qué deja viajar el empaquetado, no las capas
  const CG = path.join(T, '08_entrega_sia', 'capas_geoserver'), sinCapas = !fs.existsSync(path.join(CG, 'MANIFIESTO.sha256'));
  if (sinCapas) { const sha = f => require('crypto').createHash('sha256').update(fs.readFileSync(f)).digest('hex');
    const capas = fs.readdirSync(CG).filter(a => a.endsWith('.sld')).map(a => a.slice(0, -4));
    for (const c of capas) fs.writeFileSync(path.join(CG, c + '.gpkg'), 'capa ficticia para la prueba del empaquetado\n');
    fs.writeFileSync(path.join(CG, 'MANIFIESTO.sha256'), capas.flatMap(c => ['.gpkg', '.sld'].map(x => `${sha(path.join(CG, c + x))}  ${c + x}\n`)).join('')); }
  const fuera = path.relative(RAIZ, T);
  ok('copia de trabajo fuera del repositorio', (fuera.startsWith('..') || path.isAbsolute(fuera)) && fs.existsSync(path.join(T, '08_entrega_sia', 'empaquetar.py')),
    `${Math.round((Date.now() - t0) / 1000)} s${process.env.EMPAQUETAR ? ' · guion: ' + process.env.EMPAQUETAR : ''}${sinCapas ? ' · sin las capas .gpkg (copia de GitHub): se usan capas ficticias' : ''}`);
  const sql = fs.readdirSync(path.join(E, 'login/backend/db/priorizacion_reforestacion')).filter(a => a.endsWith('.sql'));
  const loginEsperados = PARTES.filter(p => p.startsWith('login/')).reduce((s, p) => s + cuenta(path.join(E, p)), 0);

  // ---------- 1) limpio, con --revisar: la revisión pasa y no se escribe el paquete ----------
  let c = correr('--revisar');
  ok('limpio: la revisión pasa (código 0)', c.status === 0, c.status === 0 ? '' : c.salida.trim().split('\n').slice(-6).join(' ⏎ '));
  const m = c.salida.match(/revisión correcta: (\d+) archivos \((.*?)\); sin/);
  ok('limpio: dice «revisión correcta» con el conteo por carpeta', !!m, m ? m[0] : c.salida.trim().split('\n').pop());
  const enLogin = m && +((m[2].match(/login (\d+)/) || [])[1]);
  ok(`limpio: entran todos los archivos de login/, con los ${sql.length} .sql del módulo (db/)`, enLogin === loginEsperados && sql.length >= 2,
    `${enLogin} de ${loginEsperados} · ${sql.join(', ')}`);
  ok('limpio con --revisar: no se escribe ZIP ni .sha256', zips(T).length === 0, zips(T).join(', '));

  // ---------- 2) con archivos sembrados: termina con error, nombra cada uno y no deja ZIP ----------
  for (const [rel, txt] of Object.entries(SEMBRADOS)) fs.writeFileSync(path.join(T, '08_entrega_sia', ...rel.split('/')), txt);
  for (const z of zips(T)) fs.rmSync(path.join(T, z));   // lo que haya dejado la corrida anterior no cuenta para esta
  c = correr();
  ok('sembrados: el empaquetado termina con error', c.status !== 0 && c.status !== null, `código ${c.status}`);
  for (const rel of Object.keys(SEMBRADOS)) {
    const linea = c.salida.split('\n').find(l => l.includes(rel + ':'));
    ok(`sembrados: nombra ${rel} y dice por qué`, !!linea, linea ? linea.trim().replace(/^- /, '') : 'no aparece');
  }
  const legitimos = sql.filter(a => c.salida.includes(a));
  ok('sembrados: no señala los .sql legítimos del módulo (db/)', legitimos.length === 0, legitimos.join(', '));
  ok('sembrados: no deja ZIP, .sha256 ni ZIP a medias', zips(T).length === 0, zips(T).join(', '));
} catch (e) {
  ok('la prueba corre', false, e.stack || e.message);
} finally {
  fs.rmSync(T, { recursive: true, force: true });
  ok('se borró la carpeta temporal', !fs.existsSync(T), T);
  ok('el repositorio no recibió paquetes (_local/entrega/ igual que antes)', listar(ENTREGA_REPO).join('|') === antes);
}

const f = r.filter(x => !x[0]); console.log(`\n[empaquetado] ${r.length - f.length} de ${r.length} verificaciones correctas; ${f.length} fallas`);
if (f.length) { console.log('Fallas:'); f.forEach(x => console.log('  - ' + x[1] + (x[2] ? ' · ' + x[2] : ''))); }
process.exitCode = f.length ? 1 : 0;
