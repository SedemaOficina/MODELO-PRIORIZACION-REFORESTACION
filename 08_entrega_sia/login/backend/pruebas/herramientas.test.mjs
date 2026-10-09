// Pruebas del alta masiva, de los datos simulados y de la herramienta de la primera cuenta, con el esquema real en memoria.
process.env.PRIORIZACION_REFORESTACION_SCRYPT_N = '1024';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { baseEnMemoria, appComoSia } from './base.mjs';
const { leeCsv, revisa, aplica } = await import('../src/modulos/priorizacion-reforestacion/masiva.ts');
const { huella, verifica } = await import('../src/modulos/priorizacion-reforestacion/contrasenas.ts');
const { crearRutasPriorizacionReforestacion } = await import('../src/modulos/priorizacion-reforestacion/rutas.ts');
const datos = await import('../scripts/datos_demo.mjs');
const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

test('alta masiva: lee el CSV de Excel (punto y coma, BOM, comillas), revisa cada renglón y da de alta', async () => {
  const csv = '﻿correo;nombre;institucion;alcaldia;rol\r\n' +
    'Enlace@Azcapotzalco.cdmx.gob.mx;"García, Ana";Alcaldía;Azcapotzalco;usuario\r\n' +
    'vial@cdmx.gob.mx;Luis Pérez;Gobierno Central;;consulta\r\n' +
    'sia@sedema.cdmx.gob.mx;Admin SIA;SEDEMA;;admin\r\n' +
    'malo-sin-arroba;X;Alcaldía;Narnia;jefe\r\n' +
    'enlace@azcapotzalco.cdmx.gob.mx;Repetido;Alcaldía;002;usuario\r\n' +
    'sinalcaldia@x.mx;Sin Alcaldía;Alcaldía;;usuario\r\n';
  const { ok, errores } = revisa(leeCsv(csv));
  assert.equal(ok.length, 3); assert.equal(errores.length, 3);
  assert.equal(ok[0].correo, 'enlace@azcapotzalco.cdmx.gob.mx'); assert.equal(ok[0].nombre, 'García, Ana'); assert.equal(ok[0].alcaldia_cve, '002');
  assert.equal(ok[1].rol, 'usuario'); assert.equal(ok[2].rol, 'admin');
  assert.match(errores[0], /^Renglón 5 .*correo no válido.*alcaldía «Narnia».*rol «jefe»/);
  assert.match(errores[1], /^Renglón 6 .*repetido/); assert.match(errores[2], /^Renglón 7 .*necesita su alcaldía/);
  const pool = baseEnMemoria();
  const r = await aplica(pool, ok); assert.equal(r.hechas.length, 3); assert.equal(r.existentes.length, 0);
  const u = (await pool.query("SELECT * FROM priorizacion_reforestacion.usuarios WHERE correo = 'enlace@azcapotzalco.cdmx.gob.mx'")).rows[0];
  assert.equal(u.debe_cambiar, true); assert.ok(await verifica(r.hechas[0].contrasena_temporal, u.huella), 'la contraseña temporal entregada es la que quedó');
  const r2 = await aplica(pool, ok); assert.equal(r2.hechas.length, 0); assert.equal(r2.existentes.length, 3, 'correr dos veces no duplica ni cambia contraseñas');
});

test('datos simulados: cuentas ficticias y 90 días de uso; se niegan en una base con cuentas reales', async () => {
  const pool = baseEnMemoria();
  const r = await datos.sembrar(pool, { dias: 30 });
  assert.equal(r.cuentas, 37); assert.ok(r.registros > 300, `${r.registros} registros`);
  const n = (await pool.query(`SELECT count(*) AS n FROM priorizacion_reforestacion.usuarios WHERE correo NOT LIKE '%@ejemplo.gob.mx'`)).rows[0].n;
  assert.equal(+n, 0, 'solo correos @ejemplo.gob.mx');
  const ev = (await pool.query('SELECT evento, count(*) AS n FROM priorizacion_reforestacion.bitacora GROUP BY evento')).rows;
  for (const e of ['acceso', 'visita', 'consulta', 'descarga']) assert.ok(ev.some(x => x.evento === e && +x.n > 0), e);
  assert.equal(await datos.borrar(pool), 37);
  await pool.query(`INSERT INTO priorizacion_reforestacion.usuarios (correo, nombre, huella) VALUES ('persona@real.gob.mx', 'Real', 'scrypt$x')`);
  await assert.rejects(datos.sembrar(pool), /cuentas reales/);
});

test('alta masiva desde el panel: revisa sin escribir, no aplica con errores, aplica y no duplica; solo administración', async () => {
  const pool = baseEnMemoria();
  const app = appComoSia(a => a.use('/api/priorizacion-reforestacion', crearRutasPriorizacionReforestacion(pool, { depurarCadaHoras: 0 })));
  const O = 'https://sedema.sia.cdmx.gob.mx';
  await pool.query(`INSERT INTO priorizacion_reforestacion.usuarios (correo, nombre, rol, huella, debe_cambiar) VALUES ('adm@x.mx', 'Adm', 'admin', $1, false), ('usu@x.mx', 'Usu', 'usuario', $1, false)`, [await huella('una contraseña de prueba')]);
  const entra = async c => (await request(app).post('/api/priorizacion-reforestacion/entrar').set('Origin', O).send({ correo: c, contrasena: 'una contraseña de prueba' })).headers['set-cookie'][0].split(';')[0];
  const ca = await entra('adm@x.mx'), cu = await entra('usu@x.mx');
  const envia = (ck, csv, aplicar) => request(app).post('/api/priorizacion-reforestacion/admin/usuarios/masiva').set('Origin', O).set('Cookie', ck).send({ csv, aplicar });
  const bueno = 'correo,nombre,institucion,alcaldia,rol\nana@gmail.com,Ana,Alcaldía,Tlalpan,usuario\nusu@x.mx,Usu,SEDEMA,,usuario\n';
  assert.equal((await envia(cu, bueno, false)).status, 403, 'una cuenta de consulta no hace altas');
  let r = await envia(ca, bueno, false); assert.equal(r.status, 200); assert.equal(r.body.aplicado, false);
  assert.deepEqual(r.body.validas.map(v => [v.correo, v.existe]), [['ana@gmail.com', false], ['usu@x.mx', true]]);
  assert.equal(+(await pool.query("SELECT count(*) AS n FROM priorizacion_reforestacion.usuarios WHERE correo = 'ana@gmail.com'")).rows[0].n, 0, 'revisar no escribe');
  r = await envia(ca, bueno + 'mal@,X,Alcaldía,Gotham,usuario\n', true); assert.equal(r.body.aplicado, false, 'con errores no se aplica aunque se pida'); assert.equal(r.body.errores.length, 1);
  r = await envia(ca, bueno, true); assert.equal(r.body.aplicado, true); assert.equal(r.body.hechas.length, 1); assert.deepEqual(r.body.existentes, ['usu@x.mx']);
  assert.ok(r.body.hechas[0].contrasena_temporal);
  assert.equal((await envia(ca, 'nombre,otra\nx,y\n', false)).status, 400, 'sin columna correo');
});

test('primera cuenta: la herramienta genera el SQL (sin conectarse) y la contraseña temporal entra', async () => {
  // se ejecuta como la correrá el SIA: Node directo sobre el .ts, sin cargador ni dependencias
  const HERR = path.join(RAIZ, 'herramientas', 'priorizacion-reforestacion', 'primera-cuenta.ts');
  const env = { ...process.env, PRIORIZACION_REFORESTACION_SCRYPT_N: '1024' };
  const r = spawnSync(process.execPath, [HERR, 'Admin@SEDEMA.cdmx.gob.mx', "Ana O'Neill"], { env, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const sql = r.stdout;
  assert.match(sql, /^-- Primera cuenta/); assert.match(sql, /BEGIN;[\s\S]*ON CONFLICT \(correo\) DO NOTHING;[\s\S]*COMMIT;/);
  assert.match(sql, /'admin@sedema\.cdmx\.gob\.mx'/, 'el correo va en minúsculas'); assert.match(sql, /'Ana O''Neill'/, 'las comillas del nombre se escapan');
  const clave = (r.stderr.match(/se muestra una sola vez\): (\S+)/) || [])[1];
  assert.match(clave || '', /^[a-z]+-[a-z]+-[a-z]+-[a-z]+-\d\d$/, 'la contraseña temporal va a la pantalla, no al SQL');
  assert.ok(!sql.includes(clave), 'la contraseña no queda en el SQL');
  assert.notEqual(spawnSync(process.execPath, [HERR, 'sin-arroba', 'X'], { env, encoding: 'utf8' }).status, 0, 'con un correo inválido no genera nada');
  // el INSERT del bloque, aplicado en la base en memoria (pg-mem no ejecuta DO $$), y la temporal que mostró la herramienta entra
  const valores = sql.match(/VALUES \((.*)\)\s*\n\s*ON CONFLICT/)[1];
  const pool = baseEnMemoria();
  await pool.query(`INSERT INTO priorizacion_reforestacion.usuarios (correo, nombre, institucion, rol, huella, debe_cambiar) VALUES (${valores})`);
  const u = (await pool.query('SELECT * FROM priorizacion_reforestacion.usuarios')).rows[0];
  assert.equal(u.rol, 'admin'); assert.equal(u.debe_cambiar, true); assert.equal(u.nombre, "Ana O'Neill");
  assert.ok(await verifica(clave, u.huella), 'la contraseña mostrada corresponde a la huella del SQL');
});
