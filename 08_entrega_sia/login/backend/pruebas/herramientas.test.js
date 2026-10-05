// Pruebas del alta masiva por CSV y de los datos simulados, con el esquema real en una base en memoria (pg-mem).
'use strict';
process.env.CALLES_SCRYPT_N = '1024';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const { newDb } = require('pg-mem');
const { leeCsv, revisa, aplica } = require('../scripts/alta_masiva');
const datos = require('../scripts/datos_demo');
const { verifica } = require('../src/contrasenas');

function base() { const db = newDb(); db.public.none(fs.readFileSync(path.join(__dirname, '..', 'sql', '001_esquema.sql'), 'utf8').split('-- Plazos de conservación')[0]);
  const { Pool } = db.adapters.createPg(); return new Pool(); }

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
  const pool = base();
  const r = await aplica(pool, ok); assert.equal(r.hechas.length, 3); assert.equal(r.existentes.length, 0);
  const u = (await pool.query("SELECT * FROM calles.usuarios WHERE correo = 'enlace@azcapotzalco.cdmx.gob.mx'")).rows[0];
  assert.equal(u.debe_cambiar, true); assert.ok(await verifica(r.hechas[0].contrasena_temporal, u.huella), 'la contraseña temporal entregada es la que quedó');
  const r2 = await aplica(pool, ok); assert.equal(r2.hechas.length, 0); assert.equal(r2.existentes.length, 3, 'correr dos veces no duplica ni cambia contraseñas');
});

test('datos simulados: cuentas ficticias y 90 días de uso; se niegan en una base con cuentas reales', async () => {
  const pool = base();
  const r = await datos.sembrar(pool, { dias: 30 });
  assert.equal(r.cuentas, 37); assert.ok(r.registros > 300, `${r.registros} registros`);
  const n = (await pool.query(`SELECT count(*) AS n FROM calles.usuarios WHERE correo NOT LIKE '%@ejemplo.gob.mx'`)).rows[0].n;
  assert.equal(+n, 0, 'solo correos @ejemplo.gob.mx');
  const ev = (await pool.query('SELECT evento, count(*) AS n FROM calles.bitacora GROUP BY evento')).rows;
  for (const e of ['acceso', 'visita', 'consulta', 'descarga']) assert.ok(ev.some(x => x.evento === e && +x.n > 0), e);
  assert.equal(await datos.borrar(pool), 37);
  await pool.query(`INSERT INTO calles.usuarios (correo, nombre, huella) VALUES ('persona@real.gob.mx', 'Real', 'x')`);
  await assert.rejects(datos.sembrar(pool), /cuentas reales/);
});

test('alta masiva desde el panel: revisa sin escribir, no aplica con errores, aplica y no duplica; solo administración', async () => {
  const express = require('express'), request = require('supertest'), { huella } = require('../src/contrasenas');
  const pool = base(); const app = express(); app.use('/api/calles', require('../src')({ pool, opciones: { depurarCadaHoras: 0 } }));
  const O = 'https://sedema.sia.cdmx.gob.mx';
  await pool.query(`INSERT INTO calles.usuarios (correo, nombre, rol, huella, debe_cambiar) VALUES ('adm@x.mx', 'Adm', 'admin', $1, false), ('usu@x.mx', 'Usu', 'usuario', $1, false)`, [await huella('una contraseña de prueba')]);
  const entra = async c => (await request(app).post('/api/calles/entrar').set('Origin', O).send({ correo: c, contrasena: 'una contraseña de prueba' })).headers['set-cookie'][0].split(';')[0];
  const ca = await entra('adm@x.mx'), cu = await entra('usu@x.mx');
  const envia = (ck, csv, aplicar) => request(app).post('/api/calles/admin/usuarios/masiva').set('Origin', O).set('Cookie', ck).send({ csv, aplicar });
  const bueno = 'correo,nombre,institucion,alcaldia,rol\nana@gmail.com,Ana,Alcaldía,Tlalpan,usuario\nusu@x.mx,Usu,SEDEMA,,usuario\n';
  assert.equal((await envia(cu, bueno, false)).status, 403, 'una cuenta de consulta no hace altas');
  let r = await envia(ca, bueno, false); assert.equal(r.status, 200); assert.equal(r.body.aplicado, false);
  assert.deepEqual(r.body.validas.map(v => [v.correo, v.existe]), [['ana@gmail.com', false], ['usu@x.mx', true]]);
  assert.equal(+(await pool.query("SELECT count(*) AS n FROM calles.usuarios WHERE correo = 'ana@gmail.com'")).rows[0].n, 0, 'revisar no escribe');
  r = await envia(ca, bueno + 'mal@,X,Alcaldía,Gotham,usuario\n', true); assert.equal(r.body.aplicado, false, 'con errores no se aplica aunque se pida'); assert.equal(r.body.errores.length, 1);
  r = await envia(ca, bueno, true); assert.equal(r.body.aplicado, true); assert.equal(r.body.hechas.length, 1); assert.deepEqual(r.body.existentes, ['usu@x.mx']);
  assert.ok(r.body.hechas[0].contrasena_temporal);
  assert.equal((await envia(ca, 'nombre,otra\nx,y\n', false)).status, 400, 'sin columna correo');
});
