// Pruebas de la v1.49: área y cargo, catálogo de dependencias, organizaciones y empresas (lo edita quien administra), la pertenencia
// coherente de cada cuenta (alcaldía o entrada del catálogo de su tipo), «Mi perfil» (/yo) y el reporte de usos por dependencia.
// Con el esquema real en memoria (pg-mem).
process.env.PRIORIZACION_REFORESTACION_SCRYPT_N = '1024';
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { baseEnMemoria, appComoSia } from './base.mjs';
const { crearRutasPriorizacionReforestacion } = await import('../src/modulos/priorizacion-reforestacion/rutas.ts');
const { huella } = await import('../src/modulos/priorizacion-reforestacion/contrasenas.ts');

const O = 'https://sedema.sia.cdmx.gob.mx', API = '/api/priorizacion-reforestacion', DEF = 'una frase larga y segura';
async function montar() {
  const pool = baseEnMemoria();
  const app = appComoSia(a => a.use(API, crearRutasPriorizacionReforestacion(pool, { depurarCadaHoras: 0 })));
  // una cuenta de administración y una de consulta anterior a la v1.49: sin área, cargo ni dependencia
  await pool.query(`INSERT INTO priorizacion_reforestacion.usuarios (correo, nombre, institucion, rol, huella, debe_cambiar) VALUES
    ('adm@x.mx', 'Adm', 'Gobierno Central', 'admin', $1, false), ('vieja@x.mx', 'Cuenta Vieja', 'Gobierno Central', 'usuario', $1, false)`, [await huella(DEF)]);
  const entra = async c => ((await request(app).post(API + '/entrar').set('Origin', O).send({ correo: c, contrasena: DEF })).headers['set-cookie'] || [])[0].split(';')[0];
  return { app, pool, ca: await entra('adm@x.mx'), cu: await entra('vieja@x.mx') };
}

test('catálogo: lo edita solo quien administra; sin repetidos (mayúsculas y acentos); se renombra y se desactiva, no se borra', async () => {
  const { app, ca, cu } = await montar();
  const lista = async () => (await request(app).get(API + '/admin/catalogos').set('Cookie', ca)).body;
  let c = await lista();
  assert.deepEqual(c.tipos, ['Gobierno Central', 'Organización de la sociedad civil', 'Privado', 'Otra']);
  assert.deepEqual(c.entradas.map(e => e.nombre).sort(), ['PAOT', 'SEDEMA', 'SOBSE'], 'las tres dependencias de arranque');
  assert.equal((await request(app).get(API + '/admin/catalogos').set('Cookie', cu)).status, 403, 'una cuenta de consulta no ve el catálogo');
  assert.equal((await request(app).post(API + '/admin/catalogos').set('Origin', O).set('Cookie', cu).send({ tipo: 'Privado', nombre: 'X' })).status, 403, 'ni lo edita');
  const agrega = (tipo, nombre) => request(app).post(API + '/admin/catalogos').set('Origin', O).set('Cookie', ca).send({ tipo, nombre });
  let r = await agrega('Organización de la sociedad civil', '  Reforestamos México A.C.  ');
  assert.equal(r.status, 201); assert.equal(r.body.nombre, 'Reforestamos México A.C.', 'sin espacios de sobra'); const idOsc = r.body.id;
  assert.equal((await agrega('Organización de la sociedad civil', 'reforestamos mexico a.c.')).status, 409, 'repetido aunque cambien mayúsculas y acentos');
  assert.equal((await agrega('Privado', 'Reforestamos México A.C.')).status, 201, 'el mismo nombre en otro tipo sí');
  assert.equal((await agrega('Alcaldía', 'Tlalpan')).status, 400, 'las alcaldías no son catálogo');
  assert.equal((await agrega('Gobierno Central', '')).status, 400);
  assert.equal((await agrega('Gobierno Central', '=HIPERVINCULO("x")')).status, 400, 'sin fórmulas');
  assert.equal((await request(app).post(API + '/admin/catalogos').set('Sec-Fetch-Site', 'cross-site').set('Cookie', ca).send({ tipo: 'Privado', nombre: 'Y' })).status, 403, 'procedencia');
  const sobse = c.entradas.find(e => e.nombre === 'SOBSE').id;
  const cambia = (id, d) => request(app).patch(`${API}/admin/catalogos/${id}`).set('Origin', O).set('Cookie', ca).send(d);
  assert.equal((await cambia(sobse, { nombre: 'paot' })).status, 409, 'no se renombra a un nombre que ya existe');
  r = await cambia(sobse, { nombre: 'Secretaría de Obras y Servicios (SOBSE)' }); assert.equal(r.status, 200); assert.equal(r.body.nombre, 'Secretaría de Obras y Servicios (SOBSE)');
  r = await cambia(idOsc, { activo: false }); assert.equal(r.status, 200); assert.equal(r.body.activo, false);
  assert.equal((await cambia(99999, { activo: false })).status, 404); assert.equal((await cambia('abc', { activo: false })).status, 404);
  assert.equal((await cambia(idOsc, {})).status, 400, 'nada que cambiar');
  c = await lista(); assert.equal(c.entradas.length, 5, 'desactivar no borra');
});

test('alta y edición: área y cargo obligatorios; alcaldía o entrada activa del catálogo de su tipo, nunca las dos', async () => {
  const { app, pool, ca } = await montar();
  const cat = (await request(app).get(API + '/admin/catalogos').set('Cookie', ca)).body.entradas, id = n => cat.find(e => e.nombre === n).id;
  const alta = d => request(app).post(API + '/admin/usuarios').set('Origin', O).set('Cookie', ca).send(d);
  const base = { nombre: 'Persona', area: 'Dirección General de Servicios Urbanos', cargo: 'Subdirección' };
  assert.equal((await alta({ ...base, correo: 'a@x.mx', area: '', institucion: 'Alcaldía', alcaldia_cve: '012' })).status, 400, 'sin área no');
  assert.equal((await alta({ ...base, correo: 'a@x.mx', cargo: '  ', institucion: 'Alcaldía', alcaldia_cve: '012' })).status, 400, 'sin cargo no');
  assert.equal((await alta({ ...base, correo: 'a@x.mx', institucion: 'Alcaldía' })).status, 400, 'alcaldía sin su alcaldía no');
  assert.equal((await alta({ ...base, correo: 'a@x.mx', institucion: 'Gobierno Central' })).status, 400, 'Gobierno Central sin dependencia no');
  assert.equal((await alta({ ...base, correo: 'a@x.mx', institucion: 'Privado', entidad_id: id('SOBSE') })).status, 400, 'una dependencia no es empresa');
  assert.equal((await alta({ ...base, correo: 'a@x.mx', institucion: 'SEDEMA' })).status, 400, 'SEDEMA ya no es institución aparte');
  assert.equal((await alta({ ...base, correo: 'a@x.mx', institucion: 'Gobierno Central', entidad_id: 'SOBSE' })).status, 400, 'la dependencia va por su número');
  let r = await alta({ ...base, correo: 'obras@x.mx', institucion: 'Gobierno Central', entidad_id: id('SOBSE'), alcaldia_cve: '012' });
  assert.equal(r.status, 201); assert.equal(r.body.usuario.entidad, 'SOBSE'); assert.equal(r.body.usuario.alcaldia_cve, null, 'Gobierno Central no lleva alcaldía');
  assert.equal(r.body.usuario.area, base.area); assert.equal(r.body.usuario.cargo, base.cargo);
  const idObras = r.body.usuario.id;
  r = await alta({ ...base, correo: 'tlalpan@x.mx', institucion: 'Alcaldía', alcaldia_cve: '012', entidad_id: id('PAOT') });
  assert.equal(r.status, 201); assert.equal(r.body.usuario.entidad_id, null, 'una cuenta de alcaldía no lleva dependencia'); const idTlalpan = r.body.usuario.id;
  // entrada desactivada: no sirve para altas nuevas, pero la cuenta que ya la tiene la conserva al editar otros datos
  await request(app).patch(`${API}/admin/catalogos/${id('SOBSE')}`).set('Origin', O).set('Cookie', ca).send({ activo: false });
  assert.equal((await alta({ ...base, correo: 'b@x.mx', institucion: 'Gobierno Central', entidad_id: id('SOBSE') })).status, 400, 'desactivada: no en altas');
  const edita = (uid, d) => request(app).patch(`${API}/admin/usuarios/${uid}`).set('Origin', O).set('Cookie', ca).send(d);
  r = await edita(idObras, { cargo: 'Dirección de área' }); assert.equal(r.status, 200); assert.equal(r.body.cargo, 'Dirección de área'); assert.equal(r.body.entidad, 'SOBSE', 'conserva la entrada desactivada');
  r = await edita(idObras, { institucion: 'Gobierno Central', entidad_id: id('SOBSE') }); assert.equal(r.status, 200, 'volver a mandar la misma entrada desactivada no es un cambio');
  // cambiar de institución
  assert.equal((await edita(idTlalpan, { institucion: 'Gobierno Central' })).status, 400, 'pasar a Gobierno Central pide dependencia');
  r = await edita(idTlalpan, { institucion: 'Gobierno Central', entidad_id: id('PAOT') }); assert.equal(r.status, 200);
  assert.equal(r.body.institucion, 'Gobierno Central'); assert.equal(r.body.entidad, 'PAOT'); assert.equal(r.body.alcaldia_cve, null, 'al dejar la alcaldía se quita su alcaldía');
  r = await edita(idTlalpan, { institucion: 'Alcaldía', alcaldia_cve: '007' }); assert.equal(r.status, 200); assert.equal(r.body.entidad_id, null, 'y al volver a alcaldía se quita la dependencia');
  assert.equal((await edita(idTlalpan, { area: '=1+1' })).status, 400, 'área como fórmula no');
  // una cuenta anterior a la v1.49 (sin área, cargo ni dependencia) se puede seguir editando sin tocar su pertenencia
  const vieja = (await pool.query("SELECT id FROM priorizacion_reforestacion.usuarios WHERE correo = 'vieja@x.mx'")).rows[0].id;
  r = await edita(vieja, { area: 'Sistema de Información Ambiental', cargo: 'Analista' }); assert.equal(r.status, 200); assert.equal(r.body.area, 'Sistema de Información Ambiental');
  r = await edita(vieja, { entidad_id: id('SEDEMA') }); assert.equal(r.status, 200); assert.equal(r.body.entidad, 'SEDEMA');
  const lista = (await request(app).get(API + '/admin/usuarios').set('Cookie', ca)).body;
  assert.ok(lista.every(u => 'area' in u && 'cargo' in u && 'entidad' in u), 'la lista trae área, cargo y dependencia de cada cuenta');
});

test('«Mi perfil»: /yo da área, cargo, institución y dependencia; reporte de usos y bitácora por dependencia u organización', async () => {
  const { app, pool, ca } = await montar();
  const cat = (await request(app).get(API + '/admin/catalogos').set('Cookie', ca)).body.entradas, id = n => cat.find(e => e.nombre === n).id;
  const osc = (await request(app).post(API + '/admin/catalogos').set('Origin', O).set('Cookie', ca).send({ tipo: 'Organización de la sociedad civil', nombre: 'Bosque Urbano A.C.' })).body.id;
  let r = await request(app).post(API + '/admin/usuarios').set('Origin', O).set('Cookie', ca)
    .send({ correo: 'osc@x.mx', nombre: 'Lucía Flores', area: 'Proyectos', cargo: 'Coordinación', institucion: 'Organización de la sociedad civil', entidad_id: osc });
  const temp = r.body.contrasena_temporal;
  let ck = (await request(app).post(API + '/entrar').set('Origin', O).send({ correo: 'osc@x.mx', contrasena: temp })).headers['set-cookie'][0].split(';')[0];
  await request(app).post(API + '/contrasena').set('Origin', O).set('Cookie', ck).send({ actual: temp, nueva: 'jacarandas en la banqueta' });
  r = await request(app).get(API + '/yo').set('Cookie', ck);
  assert.deepEqual([r.body.nombre, r.body.area, r.body.cargo, r.body.institucion, r.body.entidad, r.body.alcaldia, r.body.rol],
    ['Lucía Flores', 'Proyectos', 'Coordinación', 'Organización de la sociedad civil', 'Bosque Urbano A.C.', null, 'usuario']);
  assert.equal((await request(app).patch(`${API}/admin/usuarios/1`).set('Origin', O).set('Cookie', ck).send({ area: 'Otra' })).status, 403, 'la persona no edita cuentas (ni la suya) desde la API');
  await request(app).post(API + '/uso').set('Origin', O).set('Cookie', ck).set('Content-Type', 'text/plain').send(JSON.stringify({ evento: 'consulta', red: 'alc', alcaldia: 'Tlalpan' }));
  await pool.query("UPDATE priorizacion_reforestacion.usuarios SET entidad_id = $1 WHERE correo = 'adm@x.mx'", [id('SEDEMA')]);
  r = await request(app).get(API + '/admin/usos').set('Cookie', ca); assert.equal(r.status, 200);
  const g = r.body.por_grupo.find(x => x.institucion === 'Organización de la sociedad civil');
  assert.ok(g && g.entidad === 'Bosque Urbano A.C.' && g.consultas === 1, 'el reporte agrupa por organización: ' + JSON.stringify(r.body.por_grupo));
  assert.ok(r.body.por_grupo.some(x => x.entidad === 'SEDEMA'), 'y por dependencia');
  assert.equal(r.body.por_persona.find(x => x.correo === 'osc@x.mx').entidad, 'Bosque Urbano A.C.');
  r = await request(app).get(API + '/admin/usos.csv').set('Cookie', ca);
  assert.match(r.text, /^﻿momento,evento,correo,institucion,alcaldia_cve,dependencia_u_organizacion,detalle/);
  assert.match(r.text, /"osc@x\.mx","Organización de la sociedad civil","","Bosque Urbano A\.C\."/);
});
