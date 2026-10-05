// Pruebas del módulo de sesión con una base PostgreSQL en memoria (pg-mem) y el esquema real (sql/001_esquema.sql).
// Uso: npm install && npm run pruebas
'use strict';
process.env.CALLES_SCRYPT_N = '1024';   // huellas rápidas solo en pruebas
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const express = require('express'), request = require('supertest');
const { newDb } = require('pg-mem');
const moduloCalles = require('../src');
const { huella } = require('../src/contrasenas');

const ORIGEN = 'https://sedema.sia.cdmx.gob.mx';
async function montar() {
  const db = newDb();
  // el esquema real, sin la parte que pg-mem no entiende (función de depuración y permisos de la cuenta de servicio)
  const sql = fs.readFileSync(path.join(__dirname, '..', 'sql', '001_esquema.sql'), 'utf8').split('-- Plazos de conservación')[0];
  db.public.none(sql);
  const { Pool } = db.adapters.createPg(); const pool = new Pool();
  const app = express(); app.set('trust proxy', true);
  app.use('/api/calles', moduloCalles({ pool, opciones: { depurarCadaHoras: 0 } }));
  await pool.query(`INSERT INTO calles.usuarios (correo, nombre, institucion, rol, huella, debe_cambiar) VALUES ('admin@sedema.cdmx.gob.mx', 'Admin', 'SEDEMA', 'admin', $1, true)`, [await huella('temporal-admin-1')]);
  return { app, pool };
}
const galleta = res => (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).find(c => c.startsWith('calles_sesion=')) || '';
const entrar = (app, correo, contrasena, volver) => request(app).post('/api/calles/entrar').set('Origin', ORIGEN).send({ correo, contrasena, volver });

test('acceso, contraseña temporal, verificación para nginx, usos, administración y bajas', async () => {
  const { app, pool } = await montar();

  // ---- datos incorrectos: mismo mensaje exista o no el correo ----
  const a = await entrar(app, 'nadie@x.mx', 'loquesea-1234'); const b = await entrar(app, 'admin@sedema.cdmx.gob.mx', 'equivocada-1234');
  assert.equal(a.status, 401); assert.equal(b.status, 401); assert.equal(a.body.error, b.body.error);

  // ---- otra procedencia: rechazada ----
  assert.equal((await request(app).post('/api/calles/entrar').set('Origin', 'https://otro.sitio').send({ correo: 'a', contrasena: 'b' })).status, 403);

  // ---- entra con la temporal: debe cambiarla; mientras tanto nginx no deja pasar ----
  let r = await entrar(app, 'ADMIN@sedema.cdmx.gob.mx', 'temporal-admin-1', 'https://malicioso.com/'); const ck = galleta(r);
  assert.equal(r.status, 200); assert.equal(r.body.debe_cambiar, true); assert.equal(r.body.volver, '/calles-prioritarias/', 'la dirección de regreso solo puede ser la herramienta');
  assert.match(r.headers['set-cookie'].join(';'), /HttpOnly; Secure; SameSite=Lax/);
  assert.equal((await request(app).get('/api/calles/sesion').set('Cookie', ck)).status, 401, 'con contraseña temporal no se entra a la herramienta');
  assert.equal((await request(app).post('/api/calles/contrasena').set('Origin', ORIGEN).set('Cookie', ck).send({ actual: 'temporal-admin-1', nueva: 'corta' })).status, 400);
  r = await request(app).post('/api/calles/contrasena').set('Origin', ORIGEN).set('Cookie', ck).send({ actual: 'temporal-admin-1', nueva: 'una frase larga y segura', volver: '/calles-prioritarias/?a=007' });
  assert.equal(r.status, 200); assert.equal(r.body.volver, '/calles-prioritarias/?a=007');

  // ---- verificación para nginx: 204 y una visita al pedir la página, no por cada archivo ----
  assert.equal((await request(app).get('/api/calles/sesion')).status, 401, 'sin cookie, 401');
  assert.equal((await request(app).get('/api/calles/sesion').set('Cookie', ck).set('X-Original-URI', '/calles-prioritarias/?a=007')).status, 204);
  await request(app).get('/api/calles/sesion').set('Cookie', ck).set('X-Original-URI', '/calles-prioritarias/datos/data.bin?v=1');
  await request(app).get('/api/calles/sesion').set('Cookie', ck).set('X-Original-URI', '/calles-prioritarias/');
  let v = await pool.query("SELECT count(*) AS n FROM calles.bitacora WHERE evento = 'visita'"); assert.equal(+v.rows[0].n, 1, 'una sola visita en 30 minutos');

  // ---- alta de una persona de alcaldía; ella entra, cambia la contraseña y usa la herramienta ----
  r = await request(app).post('/api/calles/admin/usuarios').set('Origin', ORIGEN).set('Cookie', ck).send({ correo: 'tecnica@iztapalapa.gob.mx', nombre: 'Técnica Iztapalapa', institucion: 'Alcaldía', alcaldia_cve: '007' });
  assert.equal(r.status, 201); const temp = r.body.contrasena_temporal; assert.match(temp, /^[a-z]+-[a-z]+-[a-z]+-[a-z]+-\d\d$/); const idU = r.body.usuario.id;
  assert.equal((await request(app).post('/api/calles/admin/usuarios').set('Origin', ORIGEN).set('Cookie', ck).send({ correo: 'tecnica@iztapalapa.gob.mx', nombre: 'X' })).status, 409);
  r = await entrar(app, 'tecnica@iztapalapa.gob.mx', temp); const cu = galleta(r);
  await request(app).post('/api/calles/contrasena').set('Origin', ORIGEN).set('Cookie', cu).send({ actual: temp, nueva: 'jacarandas en la banqueta' });
  assert.equal((await request(app).get('/api/calles/sesion').set('Cookie', cu)).status, 204);
  const uso = d => request(app).post('/api/calles/uso').set('Origin', ORIGEN).set('Cookie', cu).set('Content-Type', 'text/plain;charset=UTF-8').send(JSON.stringify(d));
  assert.equal((await uso({ evento: 'consulta', red: 'alc', alcaldia: 'Iztapalapa', banqueta: 'con' })).status, 204);
  assert.equal((await uso({ evento: 'descarga', tipo: 'excel_frentes', archivo: 'frentes_prioritarios_iztapalapa_con_banqueta_20261005.xlsx', alcaldia: 'Iztapalapa' })).status, 204);
  assert.equal((await uso({ evento: 'descarga', tipo: 'ficha_pdf', alcaldia: 'Coyoacán', colonia: '<script>x</script>' })).status, 204);
  assert.equal((await uso({ evento: 'borrar_todo' })).status, 400, 'solo eventos conocidos');
  const d = await pool.query("SELECT detalle FROM calles.bitacora WHERE evento = 'descarga' ORDER BY id DESC LIMIT 1");
  const det = typeof d.rows[0].detalle === 'string' ? JSON.parse(d.rows[0].detalle) : d.rows[0].detalle;
  assert.equal(det.colonia, undefined, 'un texto con marcado no se guarda'); assert.equal(det.alcaldia, 'Coyoacán');
  assert.equal((await request(app).get('/api/calles/admin/usuarios').set('Cookie', cu)).status, 403, 'una persona usuaria no administra');

  // ---- reporte de usos ----
  r = await request(app).get('/api/calles/admin/usos').set('Cookie', ck); assert.equal(r.status, 200);
  const g = r.body.por_grupo.find(x => x.alcaldia_cve === '007'); assert.ok(g, 'aparece la alcaldía de quien consulta');
  assert.equal(g.descargas, 2); assert.equal(g.consultas, 1); assert.equal(g.personas, 1);
  assert.deepEqual(r.body.alcaldias_consultadas.find(x => x.alcaldia === 'Iztapalapa'), { alcaldia: 'Iztapalapa', consultas: 1, descargas: 1 });
  assert.equal(r.body.archivos.find(x => x.tipo === 'excel_frentes').n, 1);
  r = await request(app).get('/api/calles/admin/usos.csv').set('Cookie', ck); assert.equal(r.status, 200); assert.match(r.text, /tecnica@iztapalapa\.gob\.mx/);
  assert.doesNotMatch(r.text, /\d+\.\d+\.\d+\.\d+/, 'el CSV no lleva direcciones IP');

  // ---- baja: cierra su sesión al momento ----
  assert.equal((await request(app).patch(`/api/calles/admin/usuarios/${idU}`).set('Origin', ORIGEN).set('Cookie', ck).send({ activo: false })).status, 200);
  assert.equal((await request(app).get('/api/calles/sesion').set('Cookie', cu)).status, 401);
  assert.equal((await entrar(app, 'tecnica@iztapalapa.gob.mx', 'jacarandas en la banqueta')).status, 401);
  assert.equal((await request(app).patch(`/api/calles/admin/usuarios/1`).set('Origin', ORIGEN).set('Cookie', ck).send({ activo: false })).status, 400, 'no se desactiva a sí misma');

  // ---- restablecer: nueva temporal, la anterior deja de servir ----
  await request(app).patch(`/api/calles/admin/usuarios/${idU}`).set('Origin', ORIGEN).set('Cookie', ck).send({ activo: true });
  r = await request(app).post(`/api/calles/admin/usuarios/${idU}/restablecer`).set('Origin', ORIGEN).set('Cookie', ck); assert.equal(r.status, 200);
  assert.equal((await entrar(app, 'tecnica@iztapalapa.gob.mx', 'jacarandas en la banqueta')).status, 401);
  assert.equal((await entrar(app, 'tecnica@iztapalapa.gob.mx', r.body.contrasena_temporal)).body.debe_cambiar, true);

  // ---- salir ----
  r = await request(app).get('/api/calles/salir').set('Cookie', ck); assert.equal(r.status, 303); assert.equal(r.headers.location, '/acceso/calles/?salida=1');
  assert.match(r.headers['set-cookie'].join(';'), /Max-Age=0/);
  assert.equal((await request(app).get('/api/calles/sesion').set('Cookie', ck)).status, 401);
});

test('bloqueo tras 5 intentos fallidos', async () => {
  const { app } = await montar();
  for (let i = 0; i < 5; i++) await entrar(app, 'admin@sedema.cdmx.gob.mx', 'equivocada-' + i);
  const r = await entrar(app, 'admin@sedema.cdmx.gob.mx', 'temporal-admin-1');
  assert.equal(r.status, 423, 'aun con la contraseña correcta, la cuenta queda detenida unos minutos'); assert.match(r.body.error, /intentos/);
});
