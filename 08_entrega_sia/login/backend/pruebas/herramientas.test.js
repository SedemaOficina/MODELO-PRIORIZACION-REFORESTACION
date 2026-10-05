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
