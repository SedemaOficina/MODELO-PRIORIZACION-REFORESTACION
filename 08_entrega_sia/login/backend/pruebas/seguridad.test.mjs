// Pruebas de seguridad del módulo (v1.38, bloque 2 de la auditoría del 19 de octubre de 2026): intentos simultáneos, contraseña
// temporal (solo sirve para cambiarla y vence a las 72 horas), contraseñas comunes, alta masiva en una transacción, siempre una cuenta
// de administración, entradas mal formadas, procedencia, caché y depuración al arrancar. Con el esquema real en memoria (pg-mem).
process.env.PRIORIZACION_REFORESTACION_SCRYPT_N = '1024';
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import pg from 'pg';
import { baseEnMemoria, appComoSia } from './base.mjs';
const { crearRutasPriorizacionReforestacion } = await import('../src/modulos/priorizacion-reforestacion/rutas.ts');
const { huella, huellaTemporal, revisaNueva } = await import('../src/modulos/priorizacion-reforestacion/contrasenas.ts');
const { aplica, revisa, leeCsv } = await import('../src/modulos/priorizacion-reforestacion/masiva.ts');

const O = 'https://sedema.sia.cdmx.gob.mx', API = '/api/priorizacion-reforestacion';
const abiertos = [];
// con PostgreSQL real (PRUEBAS_PG, base cuyo nombre diga «prueba»): se vacían las tablas con la cuenta dueña, como en sesion.test.mjs
async function vacia() { if (!/prueba/i.test(process.env.PGDATABASE || '')) throw new Error('PRUEBAS_PG solo contra una base cuyo nombre diga «prueba».');
  const d = new pg.Pool({ user: process.env.PRUEBAS_PG_DUENO_USER, password: process.env.PRUEBAS_PG_DUENO_PASSWORD }); abiertos.push(d);
  await d.query('TRUNCATE priorizacion_reforestacion.bitacora, priorizacion_reforestacion.sesiones, priorizacion_reforestacion.usuarios RESTART IDENTITY CASCADE'); }
const DEF = 'una frase larga y segura', TEMP = 'cedro-pirul-hoja-monte-42';
async function montar(pool = baseEnMemoria(), op = {}) {
  const app = appComoSia(a => a.use(API, crearRutasPriorizacionReforestacion(pool, { depurarCadaHoras: 0, ...op })));
  await pool.query(`INSERT INTO priorizacion_reforestacion.usuarios (correo, nombre, institucion, rol, huella, debe_cambiar) VALUES
    ('adm@x.mx', 'Adm', 'SEDEMA', 'admin', $1, false), ('adm2@x.mx', 'Adm Dos', 'SEDEMA', 'admin', $1, false), ('usu@x.mx', 'Usu', 'SEDEMA', 'usuario', $1, false)`, [await huella(DEF)]);
  return { app, pool };
}
const galleta = res => (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).find(c => c.startsWith('priorizacion_reforestacion_sesion=')) || '';
const entrar = (app, correo, contrasena, ip) => { const r = request(app).post(API + '/entrar').set('Origin', O); if (ip) r.set('X-Forwarded-For', ip); return r.send({ correo, contrasena }); };
const altaTemporal = async (pool, correo, rol = 'usuario', horas = 0) => pool.query(
  `INSERT INTO priorizacion_reforestacion.usuarios (correo, nombre, rol, huella, debe_cambiar, temporal_desde) VALUES ($1, 'Temporal', $2, $3, true, $4)`,
  [correo, rol, await huellaTemporal(TEMP), new Date(Date.now() - horas * 3600e3)]);

test('intentos simultáneos: la cuenta se detiene y la red recibe «demasiados intentos»', async () => {
  const { app, pool } = await montar();
  const r = await Promise.all(Array.from({ length: 20 }, (_, i) => entrar(app, 'usu@x.mx', 'equivocada-' + i, '203.0.113.10')));
  assert.ok(r.every(x => x.status === 401), 'los 20 intentos se rechazan');
  const u = (await pool.query("SELECT bloqueado_hasta FROM priorizacion_reforestacion.usuarios WHERE correo = 'usu@x.mx'")).rows[0];
  assert.ok(u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date(), 'la cuenta queda detenida aunque los intentos llegaran a la vez');
  assert.equal((await entrar(app, 'usu@x.mx', DEF, '198.51.100.1')).status, 401, 'detenida: aun la contraseña correcta no entra');
  const motivos = (await pool.query("SELECT detalle FROM priorizacion_reforestacion.bitacora WHERE evento = 'acceso_fallido'")).rows.map(x => (typeof x.detalle === 'string' ? JSON.parse(x.detalle) : x.detalle).motivo);
  assert.ok(motivos.filter(m => m === 'contrasena').length <= 5, `a lo más 5 contraseñas evaluadas como equivocadas (${motivos.join(',')})`);
  // 40 intentos simultáneos desde una red contra correos distintos: a partir del 31 responde 429
  const red = await Promise.all(Array.from({ length: 40 }, (_, i) => entrar(app, `nadie${i}@x.mx`, 'x-incorrecta-1', '203.0.113.99')));
  assert.ok(red.filter(x => x.status === 429).length >= 10, `${red.filter(x => x.status === 429).length} respuestas 429`);
  assert.equal((await entrar(app, 'adm@x.mx', DEF, '198.51.100.2')).status, 200, 'otra red y otra cuenta siguen entrando');
});

test('contraseña temporal: solo sirve para cambiarla, vence a las 72 horas y la nueva debe ser distinta', async () => {
  const { app, pool } = await montar();
  await altaTemporal(pool, 'admtemp@x.mx', 'admin');
  const ck = galleta(await entrar(app, 'admtemp@x.mx', TEMP)); assert.ok(ck, 'entra con la temporal');
  for (const [m, ruta] of [['get', '/admin/usuarios'], ['get', '/admin/usos'], ['get', '/admin/usos.csv']])
    assert.equal((await request(app)[m](API + ruta).set('Cookie', ck)).status, 403, `con la temporal no se administra: ${ruta}`);
  assert.equal((await request(app).post(API + '/admin/usuarios').set('Origin', O).set('Cookie', ck).send({ correo: 'otra@x.mx', nombre: 'Otra', rol: 'admin' })).status, 403, 'ni se dan de alta cuentas');
  assert.equal((await request(app).post(API + '/uso').set('Origin', O).set('Cookie', ck).set('Content-Type', 'text/plain').send('{"evento":"consulta"}')).status, 403, 'ni se registran usos');
  assert.equal((await request(app).get(API + '/yo').set('Cookie', ck)).body.debe_cambiar, true, '«quién soy» sí responde, para llevarla a cambiarla');
  let r = await request(app).post(API + '/contrasena').set('Origin', O).set('Cookie', ck).send({ actual: TEMP, nueva: TEMP });
  assert.equal(r.status, 400, 'la nueva no puede ser la misma temporal'); assert.equal(r.body.campo, 'nueva');
  r = await request(app).post(API + '/contrasena').set('Origin', O).set('Cookie', ck).send({ actual: TEMP, nueva: DEF });
  assert.equal(r.status, 200);
  assert.equal((await request(app).get(API + '/admin/usuarios').set('Cookie', ck)).status, 200, 'ya con su contraseña, administra');
  // vencida: 73 horas después de darse ya no entra, con el mismo mensaje de siempre
  await altaTemporal(pool, 'vieja@x.mx', 'usuario', 73);
  const v = await entrar(app, 'vieja@x.mx', TEMP), mal = await entrar(app, 'nadie@x.mx', 'loquesea-1234');
  assert.equal(v.status, 401); assert.equal(v.body.error, mal.body.error, 'mismo mensaje que unos datos equivocados');
  const lista = (await request(app).get(API + '/admin/usuarios').set('Cookie', ck)).body;
  assert.equal(lista.find(u => u.correo === 'vieja@x.mx').temporal_vencida, true, 'el panel la marca como vencida');
  // al restablecerla, vuelve a servir
  const id = lista.find(u => u.correo === 'vieja@x.mx').id;
  const nueva = (await request(app).post(`${API}/admin/usuarios/${id}/restablecer`).set('Origin', O).set('Cookie', ck)).body.contrasena_temporal;
  assert.equal((await entrar(app, 'vieja@x.mx', nueva)).status, 200, 'restablecida, la temporal nueva sirve');
});

test('contraseñas comunes y límite de intentos al cambiarla', async () => {
  for (const c of ['123456789012', 'password1234', 'Contraseña123', 'aaaaaaaaaaaa', 'holaholahola', 'qwertyuiopas', 'reforestacion2026'])
    assert.ok(revisaNueva(c, 'ana@x.mx'), `«${c}» no se acepta`);
  for (const c of [DEF, 'jacarandas en la banqueta', 'el ahuehuete de mi calle'])
    assert.equal(revisaNueva(c, 'ana@x.mx'), null, `«${c}» sí se acepta`);
  const { app } = await montar();
  const ck = galleta(await entrar(app, 'usu@x.mx', DEF));
  for (let i = 0; i < 4; i++) assert.equal((await request(app).post(API + '/contrasena').set('Origin', O).set('Cookie', ck).send({ actual: 'equivocada-' + i, nueva: 'otra frase larga y segura' })).status, 400);
  const r = await request(app).post(API + '/contrasena').set('Origin', O).set('Cookie', ck).send({ actual: 'equivocada-4', nueva: 'otra frase larga y segura' });
  assert.equal(r.status, 401, 'al quinto intento con la contraseña actual equivocada, la cuenta se detiene');
  assert.equal((await request(app).get(API + '/yo').set('Cookie', ck)).status, 401, 'y se cierran sus sesiones');
  assert.equal((await entrar(app, 'usu@x.mx', DEF)).status, 401, 'detenida unos minutos');
});

const REAL = !!process.env.PRUEBAS_PG;
// pg-mem no deshace transacciones (ROLLBACK no tiene efecto): esta parte se prueba contra PostgreSQL real, como la depuración
test('alta masiva en una transacción: si falla a la mitad, no queda ninguna cuenta creada (solo con PostgreSQL real)', { skip: !REAL && 'pg-mem no deshace transacciones' }, async () => {
  const base = new pg.Pool(); await vacia();
  let n = 0;   // se envuelve la conexión para que el INSERT de la cuenta 50 falle
  const pool = { query: (...a) => base.query(...a), connect: async () => { const c = await base.connect();
    return { query: (sql, v) => { if (/INSERT INTO priorizacion_reforestacion\.usuarios/.test(String(sql)) && ++n === 50) return Promise.reject(new Error('falla simulada')); return c.query(sql, v); }, release: () => c.release() }; } };
  const csv = 'correo,nombre,institucion,alcaldia,rol\n' + Array.from({ length: 100 }, (_, i) => `p${i}@tlalpan.cdmx.gob.mx,Persona ${i},Alcaldía,Tlalpan,usuario`).join('\n');
  const { ok } = revisa(leeCsv(csv));
  await assert.rejects(aplica(pool, ok), /falla simulada/);
  assert.equal(+(await base.query("SELECT count(*) AS n FROM priorizacion_reforestacion.usuarios WHERE correo LIKE 'p%@tlalpan.cdmx.gob.mx'")).rows[0].n, 0, 'ninguna cuenta quedó sin que su contraseña llegara');
  n = 1000; const r = await aplica(pool, ok);
  assert.equal(r.hechas.length, 100, 'al repetir el envío se crean todas y vuelven todas sus contraseñas');
  abiertos.push(base);
});

test('nombres y correos: sin fórmulas, sin nombres larguísimos ni caracteres invisibles', async () => {
  // nombres que serían fórmula o demasiado largos, y correos con caracteres invisibles: se rechazan en el archivo y en el alta individual
  const malo = revisa(leeCsv('correo,nombre,institucion,alcaldia,rol\na@x.mx,=HYPERLINK("http://x"),SEDEMA,,usuario\nb@x.mx,' + 'N'.repeat(121) + ',SEDEMA,,usuario\nc​@x.mx,C,SEDEMA,,usuario\n'));
  assert.equal(malo.ok.length, 0); assert.equal(malo.errores.length, 3);
  const { app } = await montar();
  const ck = galleta(await entrar(app, 'adm@x.mx', DEF));
  for (const d of [{ correo: 'f@x.mx', nombre: '=SUMA(1)' }, { correo: 'g@x.mx', nombre: 'G'.repeat(121) }, { correo: 'ana​@x.mx', nombre: 'Ana' }])
    assert.equal((await request(app).post(API + '/admin/usuarios').set('Origin', O).set('Cookie', ck).send(d)).status, 400, JSON.stringify(d).slice(0, 40));
});

test('siempre queda una cuenta de administración activa', async () => {
  const { app, pool } = await montar();
  const a = galleta(await entrar(app, 'adm@x.mx', DEF)), b = galleta(await entrar(app, 'adm2@x.mx', DEF));
  const id = c => pool.query('SELECT id FROM priorizacion_reforestacion.usuarios WHERE correo = $1', [c]).then(r => r.rows[0].id);
  const [ia, ib] = [await id('adm@x.mx'), await id('adm2@x.mx')];
  const [r1, r2] = await Promise.all([
    request(app).patch(`${API}/admin/usuarios/${ib}`).set('Origin', O).set('Cookie', a).send({ activo: false }),
    request(app).patch(`${API}/admin/usuarios/${ia}`).set('Origin', O).set('Cookie', b).send({ activo: false })]);
  const activos = +(await pool.query("SELECT count(*) AS n FROM priorizacion_reforestacion.usuarios WHERE rol = 'admin' AND activo")).rows[0].n;
  assert.equal(activos, 1, `queda una cuenta de administración (${r1.status}, ${r2.status})`);
  assert.ok([r1.status, r2.status].includes(409) || [r1.status, r2.status].includes(401), 'la otra petición se rechaza');
});

test('entradas mal formadas, procedencia, caché y depuración al arrancar', async () => {
  const { app, pool } = await montar();
  assert.equal((await request(app).get(API + '/sesion').set('Cookie', 'priorizacion_reforestacion_sesion=%E0%A4%A')).status, 401, 'cookie mal codificada: 401, no 500');
  const ck = galleta(await entrar(app, 'adm@x.mx', DEF));
  assert.equal((await request(app).patch(API + '/admin/usuarios/abc').set('Origin', O).set('Cookie', ck).send({ nombre: 'X' })).status, 404, 'identificador no numérico: 404');
  assert.equal((await request(app).post(API + '/admin/usuarios/abc/restablecer').set('Origin', O).set('Cookie', ck)).status, 404);
  assert.equal((await request(app).get(API + '/yo').set('Cookie', ck)).headers['cache-control'], 'no-store', 'las respuestas no se guardan en caché');
  assert.equal((await request(app).post(API + '/admin/usuarios').set('Sec-Fetch-Site', 'cross-site').set('Cookie', ck).send({ correo: 'h@x.mx', nombre: 'H' })).status, 403, 'sin Origin y desde otro sitio: rechazada');
  await request(app).get(API + '/salir').set('Sec-Fetch-Site', 'cross-site').set('Cookie', ck);
  assert.equal((await request(app).get(API + '/yo').set('Cookie', ck)).status, 200, 'un enlace en otro sitio no cierra la sesión');
  await request(app).get(API + '/salir').set('Sec-Fetch-Site', 'same-origin').set('Cookie', ck);
  assert.equal((await request(app).get(API + '/yo').set('Cookie', ck)).status, 401, '«Salir» desde la herramienta sí la cierra');
  // depuración: se pide al arrancar, no hasta 24 horas después
  const pedidas = []; const espia = { query: (sql, ...v) => { if (/depurar/.test(String(sql))) { pedidas.push(sql); return Promise.resolve({ rows: [] }); } return pool.query(sql, ...v); }, connect: () => pool.connect() };
  crearRutasPriorizacionReforestacion(espia, { depurarCadaHoras: 24 });
  await new Promise(r => setTimeout(r, 1300));
  assert.equal(pedidas.length, 1, 'la depuración se pide al arrancar');
});

test.after(async () => { for (const p of abiertos) await p.end(); });
