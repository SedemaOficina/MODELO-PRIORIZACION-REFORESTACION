// Pruebas del módulo con el esquema real y la app armada como en sia-backend (helmet, cors y express.json() globales; el módulo no depende de trust proxy).
// Por omisión, en una base PostgreSQL en memoria (pg-mem):   npm run pruebas
// Contra un PostgreSQL de PRUEBAS con los dos SQL ya aplicados, con la cuenta del módulo (como en producción):
//   PRUEBAS_PG=1 PGHOST=… PGDATABASE=…prueba… PGUSER=priorizacion_reforestacion_api PGPASSWORD=… npm run pruebas
// ¡Vacía las tablas del esquema en esa base! Solo para bases cuyo nombre diga «prueba».
process.env.PRIORIZACION_REFORESTACION_SCRYPT_N = '1024';   // huellas rápidas solo en pruebas
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import pg from 'pg';
import { baseEnMemoria, appComoSia } from './base.mjs';
const { crearRutasPriorizacionReforestacion } = await import('../src/modulos/priorizacion-reforestacion/rutas.ts');
const { huella } = await import('../src/modulos/priorizacion-reforestacion/contrasenas.ts');

const ORIGEN = 'https://sedema.sia.cdmx.gob.mx';
const API = '/api/priorizacion-reforestacion';
const REAL = !!process.env.PRUEBAS_PG;
const abiertos = [];

async function montar() {
  let pool;
  if (REAL) {
    if (!/prueba/i.test(process.env.PGDATABASE || '')) throw new Error('PRUEBAS_PG solo contra una base cuyo nombre diga «prueba».');
    pool = new pg.Pool(); abiertos.push(pool);
    // la cuenta del módulo no puede borrar usuarios ni bitácora: en una base de pruebas se vacía con la cuenta dueña (PRUEBAS_PG_DUENO_*)
    const dueno = new pg.Pool({ user: process.env.PRUEBAS_PG_DUENO_USER, password: process.env.PRUEBAS_PG_DUENO_PASSWORD }); abiertos.push(dueno);
    await dueno.query('TRUNCATE priorizacion_reforestacion.bitacora, priorizacion_reforestacion.sesiones, priorizacion_reforestacion.usuarios RESTART IDENTITY CASCADE');
  } else pool = baseEnMemoria();
  const app = appComoSia(a => a.use(API, crearRutasPriorizacionReforestacion(pool, { depurarCadaHoras: 0 })));
  await pool.query(`INSERT INTO priorizacion_reforestacion.usuarios (correo, nombre, institucion, rol, huella, debe_cambiar) VALUES ('admin@sedema.cdmx.gob.mx', 'Admin', 'SEDEMA', 'admin', $1, true)`, [await huella('temporal-admin-1')]);
  return { app, pool };
}
const galleta = res => (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).find(c => c.startsWith('priorizacion_reforestacion_sesion=')) || '';
const entrar = (app, correo, contrasena, volver, ip) => { const r = request(app).post(API + '/entrar').set('Origin', ORIGEN); if (ip) r.set('X-Forwarded-For', ip); return r.send({ correo, contrasena, volver }); };

test('acceso, contraseña temporal, verificación para nginx, usos, administración y bajas', async () => {
  const { app, pool } = await montar();

  // ---- datos incorrectos: mismo mensaje exista o no el correo ----
  const a = await entrar(app, 'nadie@x.mx', 'loquesea-1234'); const b = await entrar(app, 'admin@sedema.cdmx.gob.mx', 'equivocada-1234');
  assert.equal(a.status, 401); assert.equal(b.status, 401); assert.equal(a.body.error, b.body.error);

  // ---- otra procedencia: rechazada ----
  assert.equal((await request(app).post(API + '/entrar').set('Origin', 'https://otro.sitio').send({ correo: 'a', contrasena: 'b' })).status, 403);

  // ---- entra con la temporal: debe cambiarla; mientras tanto nginx no deja pasar ----
  let r = await entrar(app, 'ADMIN@sedema.cdmx.gob.mx', 'temporal-admin-1', 'https://malicioso.com/'); const ck = galleta(r);
  assert.equal(r.status, 200); assert.equal(r.body.debe_cambiar, true); assert.equal(r.body.volver, '/priorizacion-reforestacion/', 'la dirección de regreso solo puede ser la herramienta');
  assert.match(r.headers['set-cookie'].join(';'), /; Path=\/priorizacion-reforestacion\/; HttpOnly; Secure; SameSite=Lax/, 'la cookie solo viaja bajo /priorizacion-reforestacion/');
  for (const v of ['/priorizacion-reforestacion/acceso/admin/', '/priorizacion-reforestacion/api/salir'])
    assert.equal((await entrar(app, 'admin@sedema.cdmx.gob.mx', 'temporal-admin-1', v)).body.volver, '/priorizacion-reforestacion/', `no se regresa a ${v}`);
  assert.equal((await request(app).get(API + '/sesion').set('Cookie', ck)).status, 401, 'con contraseña temporal no se entra a la herramienta');
  assert.equal((await request(app).post(API + '/contrasena').set('Origin', ORIGEN).set('Cookie', ck).send({ actual: 'temporal-admin-1', nueva: 'corta' })).status, 400);
  r = await request(app).post(API + '/contrasena').set('Origin', ORIGEN).set('Cookie', ck).send({ actual: 'temporal-admin-1', nueva: 'una frase larga y segura', volver: '/priorizacion-reforestacion/?a=007' });
  assert.equal(r.status, 200); assert.equal(r.body.volver, '/priorizacion-reforestacion/?a=007');

  // ---- verificación para nginx: 204 y una visita al pedir la página, no por cada archivo ----
  assert.equal((await request(app).get(API + '/sesion')).status, 401, 'sin cookie, 401');
  assert.equal((await request(app).get(API + '/sesion').set('Cookie', ck).set('X-Original-URI', '/priorizacion-reforestacion/?a=007')).status, 204);
  await request(app).get(API + '/sesion').set('Cookie', ck).set('X-Original-URI', '/priorizacion-reforestacion/datos/data.bin?v=1');
  await request(app).get(API + '/sesion').set('Cookie', ck).set('X-Original-URI', '/priorizacion-reforestacion/');
  const v = await pool.query("SELECT count(*) AS n FROM priorizacion_reforestacion.bitacora WHERE evento = 'visita'"); assert.equal(+v.rows[0].n, 1, 'una sola visita en 30 minutos');

  // ---- alta de una persona de alcaldía; ella entra, cambia la contraseña y usa la herramienta ----
  r = await request(app).post(API + '/admin/usuarios').set('Origin', ORIGEN).set('Cookie', ck).send({ correo: 'tecnica@iztapalapa.gob.mx', nombre: 'Técnica Iztapalapa', institucion: 'Alcaldía', alcaldia_cve: '007' });
  assert.equal(r.status, 201); const temp = r.body.contrasena_temporal; assert.match(temp, /^[a-z]+-[a-z]+-[a-z]+-[a-z]+-\d\d$/); const idU = r.body.usuario.id;
  assert.equal((await request(app).post(API + '/admin/usuarios').set('Origin', ORIGEN).set('Cookie', ck).send({ correo: 'tecnica@iztapalapa.gob.mx', nombre: 'X' })).status, 409);
  assert.equal((await request(app).post(API + '/admin/usuarios').set('Origin', ORIGEN).set('Cookie', ck).send({ correo: 'x@y.mx', nombre: 'X', alcaldia_cve: '999' })).status, 400, 'alcaldía no válida');
  r = await entrar(app, 'tecnica@iztapalapa.gob.mx', temp); const cu = galleta(r);
  await request(app).post(API + '/contrasena').set('Origin', ORIGEN).set('Cookie', cu).send({ actual: temp, nueva: 'jacarandas en la banqueta' });
  assert.equal((await request(app).get(API + '/sesion').set('Cookie', cu)).status, 204);
  const uso = d => request(app).post(API + '/uso').set('Origin', ORIGEN).set('Cookie', cu).set('Content-Type', 'text/plain;charset=UTF-8').send(JSON.stringify(d));
  assert.equal((await uso({ evento: 'consulta', red: 'alc', alcaldia: 'Iztapalapa', banqueta: 'con', espacio: 'cv,am' })).status, 204);
  { const c = await pool.query("SELECT detalle FROM priorizacion_reforestacion.bitacora WHERE evento = 'consulta' ORDER BY id DESC LIMIT 1");
    const dc = typeof c.rows[0].detalle === 'string' ? JSON.parse(c.rows[0].detalle) : c.rows[0].detalle;
    assert.equal(dc.espacio, 'cv,am', 'el filtro «Espacio» se guarda en el registro de usos'); assert.equal(dc.banqueta, 'con'); }
  assert.equal((await uso({ evento: 'descarga', tipo: 'excel_frentes', archivo: 'frentes_prioritarios_iztapalapa_con_banqueta_20261005.xlsx', alcaldia: 'Iztapalapa' })).status, 204);
  assert.equal((await uso({ evento: 'descarga', tipo: 'ficha_pdf', alcaldia: 'Coyoacán', colonia: '<script>x</script>' })).status, 204);
  assert.equal((await uso({ evento: 'borrar_todo' })).status, 400, 'solo eventos conocidos');
  const d = await pool.query("SELECT detalle FROM priorizacion_reforestacion.bitacora WHERE evento = 'descarga' ORDER BY id DESC LIMIT 1");
  const det = typeof d.rows[0].detalle === 'string' ? JSON.parse(d.rows[0].detalle) : d.rows[0].detalle;
  assert.equal(det.colonia, undefined, 'un texto con marcado no se guarda'); assert.equal(det.alcaldia, 'Coyoacán');
  assert.equal((await request(app).get(API + '/admin/usuarios').set('Cookie', cu)).status, 403, 'una persona usuaria no administra');

  // ---- reporte de usos ----
  r = await request(app).get(API + '/admin/usos').set('Cookie', ck); assert.equal(r.status, 200);
  const g = r.body.por_grupo.find(x => x.alcaldia_cve === '007'); assert.ok(g, 'aparece la alcaldía de quien consulta');
  assert.equal(g.descargas, 2); assert.equal(g.consultas, 1); assert.equal(g.personas, 1);
  assert.deepEqual(r.body.alcaldias_consultadas.find(x => x.alcaldia === 'Iztapalapa'), { alcaldia: 'Iztapalapa', consultas: 1, descargas: 1 });
  assert.equal(r.body.archivos.find(x => x.tipo === 'excel_frentes').n, 1);
  r = await request(app).get(API + '/admin/usos.csv').set('Cookie', ck); assert.equal(r.status, 200); assert.match(r.text, /tecnica@iztapalapa\.gob\.mx/);
  assert.doesNotMatch(r.text, /\d+\.\d+\.\d+\.\d+/, 'el CSV no lleva direcciones IP');

  // ---- baja: cierra su sesión al momento ----
  assert.equal((await request(app).patch(`${API}/admin/usuarios/${idU}`).set('Origin', ORIGEN).set('Cookie', ck).send({ activo: false })).status, 200);
  assert.ok((await pool.query('SELECT baja FROM priorizacion_reforestacion.usuarios WHERE id = $1', [idU])).rows[0].baja, 'la baja guarda su fecha: de ahí corren los 24 meses');
  assert.equal((await request(app).get(API + '/sesion').set('Cookie', cu)).status, 401);
  assert.equal((await entrar(app, 'tecnica@iztapalapa.gob.mx', 'jacarandas en la banqueta')).status, 401);
  const idAdmin = (await pool.query("SELECT id FROM priorizacion_reforestacion.usuarios WHERE correo = 'admin@sedema.cdmx.gob.mx'")).rows[0].id;
  assert.equal((await request(app).patch(`${API}/admin/usuarios/${idAdmin}`).set('Origin', ORIGEN).set('Cookie', ck).send({ activo: false })).status, 400, 'no se desactiva a sí misma');

  // ---- restablecer: nueva temporal, la anterior deja de servir ----
  await request(app).patch(`${API}/admin/usuarios/${idU}`).set('Origin', ORIGEN).set('Cookie', ck).send({ activo: true });
  assert.equal((await pool.query('SELECT baja FROM priorizacion_reforestacion.usuarios WHERE id = $1', [idU])).rows[0].baja, null, 'al reactivar la cuenta se quita la fecha de baja');
  r = await request(app).post(`${API}/admin/usuarios/${idU}/restablecer`).set('Origin', ORIGEN).set('Cookie', ck); assert.equal(r.status, 200);
  assert.equal((await entrar(app, 'tecnica@iztapalapa.gob.mx', 'jacarandas en la banqueta')).status, 401);
  assert.equal((await entrar(app, 'tecnica@iztapalapa.gob.mx', r.body.contrasena_temporal)).body.debe_cambiar, true);

  // ---- salir ----
  r = await request(app).get(API + '/salir').set('Cookie', ck); assert.equal(r.status, 303); assert.equal(r.headers.location, '/priorizacion-reforestacion/acceso/?salida=1');
  assert.match(r.headers['set-cookie'].join(';'), /; Path=\/priorizacion-reforestacion\/;.*Max-Age=0/, 'se borra la misma cookie (misma ruta)');
  assert.equal((await request(app).get(API + '/sesion').set('Cookie', ck)).status, 401);
});

test('bloqueo de la cuenta tras 5 intentos fallidos: responde igual que una contraseña equivocada', async () => {
  const { app, pool } = await montar();
  const mal = await entrar(app, 'admin@sedema.cdmx.gob.mx', 'equivocada-0'), nadie = await entrar(app, 'nadie@x.mx', 'equivocada-0');
  for (let i = 1; i < 5; i++) await entrar(app, 'admin@sedema.cdmx.gob.mx', 'equivocada-' + i);
  const r = await entrar(app, 'admin@sedema.cdmx.gob.mx', 'temporal-admin-1');
  assert.equal(r.status, 401, 'aun con la contraseña correcta, la cuenta queda detenida unos minutos');
  assert.equal(r.body.error, mal.body.error, 'mismo mensaje que una contraseña equivocada'); assert.equal(r.body.error, nadie.body.error, 'y que un correo que no existe');
  assert.deepEqual(Object.keys(r.body), Object.keys(mal.body), 'mismo cuerpo de respuesta');
  assert.match(r.body.error, /Tras 5 intentos fallidos, el acceso se detiene 15 minutos/);
  const motivos = (await pool.query("SELECT detalle FROM priorizacion_reforestacion.bitacora WHERE evento = 'acceso_fallido' ORDER BY id")).rows
    .map(x => (typeof x.detalle === 'string' ? JSON.parse(x.detalle) : x.detalle).motivo);
  assert.deepEqual(motivos, ['contrasena', 'correo', 'contrasena', 'contrasena', 'contrasena', 'contrasena', 'detenida'], 'la bitácora sí distingue el motivo');
});

test('IP de origen detrás de nginx: el límite por red es de cada persona, no de todas', async () => {
  // el módulo no depende de trust proxy: sin leer X-Forwarded-For, todas las peticiones parecerían venir de nginx y 30 intentos
  // de cualquiera bloquearían a todo el mundo. Con ipDeOrigen (última entrada, la que escribe nginx) cada red cuenta aparte.
  const { app, pool } = await montar();
  // solo cuentan los intentos fallidos: muchas personas de una oficina entran desde la misma IP
  for (let i = 0; i < 35; i++) assert.equal((await entrar(app, 'admin@sedema.cdmx.gob.mx', 'temporal-admin-1', undefined, '203.0.113.7')).status, 200, `acceso correcto ${i + 1}`);
  for (let i = 0; i < 29; i++) await entrar(app, `nadie${i}@x.mx`, 'x-incorrecta-1', undefined, '203.0.113.7');
  assert.equal((await entrar(app, 'admin@sedema.cdmx.gob.mx', 'temporal-admin-1', undefined, '203.0.113.7')).status, 200, 'con 29 fallidos aún se entra');
  await entrar(app, 'nadie29@x.mx', 'x-incorrecta-1', undefined, '203.0.113.7');
  assert.equal((await entrar(app, 'nadie@x.mx', 'x-incorrecta-1', undefined, '203.0.113.7')).status, 429, 'la red que insiste se detiene');
  const otra = await entrar(app, 'ADMIN@sedema.cdmx.gob.mx', 'temporal-admin-1', undefined, '198.51.100.20');
  assert.equal(otra.status, 200, 'otra red sigue entrando');
  // quien llama no puede elegir su IP anteponiendo valores: cuenta la última entrada, la de nginx
  assert.equal((await entrar(app, 'nadie@x.mx', 'x-incorrecta-1', undefined, '198.51.100.99, 203.0.113.7')).status, 429);
  const ip = (await pool.query("SELECT ip FROM priorizacion_reforestacion.bitacora WHERE evento = 'acceso' ORDER BY id DESC LIMIT 1")).rows[0].ip;
  assert.equal(ip, '198.51.100.20', 'la bitácora guarda la IP de la persona, no la de nginx');
});

test('IP de origen con saltos conocidos (SIA_SALTOS_CONOCIDOS): se descartan el proxy intermedio y nginx', async () => {
  const { ipDeOrigen } = await import('../src/comun/procedencia.ts');
  const pide = xff => ({ header: () => xff, socket: { remoteAddress: '127.0.0.1' } });
  process.env.SIA_SALTOS_CONOCIDOS = '10.0.0.5, 10.0.0.9';
  try {
    assert.equal(ipDeOrigen(pide('203.0.113.50, 10.0.0.5, 10.0.0.9')), '203.0.113.50');
    assert.equal(ipDeOrigen(pide('198.51.100.1, 203.0.113.50, 10.0.0.9')), '203.0.113.50', 'lo anterior a la persona lo puede escribir quien llama: no cuenta');
    assert.equal(ipDeOrigen(pide('10.0.0.5')), '127.0.0.1', 'solo saltos conocidos: la dirección directa');
  } finally { delete process.env.SIA_SALTOS_CONOCIDOS; }
  assert.equal(ipDeOrigen(pide('203.0.113.50, 10.0.0.5')), '10.0.0.5', 'sin la lista, la última entrada');
  assert.equal(ipDeOrigen(pide('no-es-ip')), '127.0.0.1');
});

test('montado como en sia-backend: helmet, cors y express.json() globales no lo afectan; errores en JSON', async () => {
  const { app } = await montar();
  const r = await entrar(app, 'admin@sedema.cdmx.gob.mx', 'temporal-admin-1');
  assert.equal(r.status, 200, 'el express.json() general ya leyó el cuerpo y el módulo lo usa');
  const ck = galleta(r);
  // el registro de usos llega como texto (sendBeacon): el json() general no lo toca
  await request(app).post(API + '/contrasena').set('Origin', ORIGEN).set('Cookie', ck).send({ actual: 'temporal-admin-1', nueva: 'una frase larga y segura' });
  assert.equal((await request(app).post(API + '/uso').set('Origin', ORIGEN).set('Cookie', ck).set('Content-Type', 'text/plain;charset=UTF-8').send('{"evento":"consulta","alcaldia":"Tlalpan"}')).status, 204);
  // un JSON mal formado lo rechaza el json() general antes del módulo (400 de Express)
  const mal = await request(app).post(API + '/entrar').set('Origin', ORIGEN).set('Content-Type', 'application/json').send('{"correo":');
  assert.equal(mal.status, 400);
  // la alta masiva: hasta 100 cuentas por envío, que caben de sobra en el límite general de 100 KB
  const csv = n => 'correo,nombre,institucion,alcaldia,rol\n' + Array.from({ length: n }, (_, i) => `enlace${i}@tlalpan.cdmx.gob.mx,Enlace Número ${i} de la Alcaldía,Alcaldía,Tlalpan,usuario`).join('\n');
  assert.ok(JSON.stringify({ csv: csv(100) }).length < 100 * 1024, `100 cuentas = ${JSON.stringify({ csv: csv(100) }).length} bytes`);
  const m = await request(app).post(API + '/admin/usuarios/masiva').set('Origin', ORIGEN).set('Cookie', ck).send({ csv: csv(100), aplicar: false });
  assert.equal(m.status, 200); assert.equal(m.body.validas.length, 100);
  const m2 = await request(app).post(API + '/admin/usuarios/masiva').set('Origin', ORIGEN).set('Cookie', ck).send({ csv: csv(101), aplicar: false });
  assert.equal(m2.status, 400, 'más de 100 cuentas por envío se rechaza'); assert.match(m2.body.error, /Máximo 100 cuentas/);
});

test('depuración: plazos de conservación y privilegio mínimo (solo con PostgreSQL real)', { skip: !REAL && 'pg-mem no ejecuta funciones SQL ni roles' }, async () => {
  const { pool } = await montar();
  const dueno = new pg.Pool({ user: process.env.PRUEBAS_PG_DUENO_USER, password: process.env.PRUEBAS_PG_DUENO_PASSWORD }); abiertos.push(dueno);
  const { rows } = await pool.query('SELECT id FROM priorizacion_reforestacion.usuarios LIMIT 1'); const id = rows[0].id;
  const hace = meses => new Date(Date.now() - meses * 30.5 * 864e5);
  await pool.query(`INSERT INTO priorizacion_reforestacion.bitacora (usuario_id, evento, momento, ip) VALUES ($1, 'acceso', $2, '1.1.1.1'), ($1, 'acceso', $3, '2.2.2.2'), ($1, 'acceso', $4, '3.3.3.3')`, [id, hace(1), hace(8), hace(25)]);
  await pool.query(`INSERT INTO priorizacion_reforestacion.sesiones (token_huella, usuario_id, expira) VALUES ('vencida', $1, $2)`, [id, hace(1)]);
  await pool.query(`INSERT INTO priorizacion_reforestacion.usuarios (correo, nombre, huella, activo, baja) VALUES ('baja25@ejemplo.gob.mx', 'Baja vieja', 'scrypt$x', false, $1), ('baja23@ejemplo.gob.mx', 'Baja reciente', 'scrypt$x', false, $2)`, [hace(25), hace(23)]);
  await pool.query('SELECT priorizacion_reforestacion.depurar()');   // la cuenta del módulo la pide; corre con los permisos del dueño
  const b = (await pool.query('SELECT ip FROM priorizacion_reforestacion.bitacora ORDER BY momento DESC')).rows.map(r => r.ip);
  assert.deepEqual(b, ['1.1.1.1', null], 'a los 6 meses se borra la IP; a los 24 meses, el registro');
  assert.equal(+(await pool.query(`SELECT count(*) AS n FROM priorizacion_reforestacion.sesiones WHERE token_huella = 'vencida'`)).rows[0].n, 0);
  const quedan = (await pool.query(`SELECT correo FROM priorizacion_reforestacion.usuarios WHERE correo LIKE 'baja%' ORDER BY correo`)).rows.map(r => r.correo);
  assert.deepEqual(quedan, ['baja23@ejemplo.gob.mx'], 'una cuenta dada de baja se elimina a los 24 meses de la baja');
  // privilegio mínimo: los controles negativos de 02-…-rol-y-grants.sql (por código SQLSTATE: el texto depende del idioma del servidor)
  const sinPermiso = e => e.code === '42501';
  await assert.rejects(pool.query('DELETE FROM priorizacion_reforestacion.usuarios'), sinPermiso, 'no borra cuentas');
  await assert.rejects(pool.query('UPDATE priorizacion_reforestacion.bitacora SET ip = NULL'), sinPermiso, 'no modifica la bitácora');
  await assert.rejects(pool.query('DELETE FROM priorizacion_reforestacion.bitacora'), sinPermiso, 'no borra la bitácora');
  await assert.rejects(pool.query('CREATE TABLE public.intrusa (x int)'), sinPermiso, 'no crea tablas fuera de su esquema');
  const rol = (await pool.query("SELECT rolsuper, rolcreatedb, rolcreaterole, rolconnlimit FROM pg_roles WHERE rolname = current_user")).rows[0];
  assert.deepEqual([rol.rolsuper, rol.rolcreatedb, rol.rolcreaterole, rol.rolconnlimit], [false, false, false, 20]);
  assert.equal((await pool.query('SHOW statement_timeout')).rows[0].statement_timeout, '15s');
  void dueno;
});

test.after(async () => { for (const p of abiertos) await p.end(); });
