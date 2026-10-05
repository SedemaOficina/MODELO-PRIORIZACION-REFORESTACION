// Servidor de demostración: reproduce en una sola máquina lo que hará el servidor del SIA (nginx + backend + base), con una base en memoria o un PostgreSQL de pruebas.
//   /acceso/calles/        pantalla de acceso y panel (archivos de ../acceso)
//   /api/calles/           módulo de sesión, con una base en memoria (pg-mem)
//   /calles-prioritarias/  la herramienta (carpeta docs/ del repositorio), protegida como con auth_request de nginx:
//                          la página sin sesión va a la pantalla de acceso; datos y programas responden 401
// Uso: npm install && node scripts/servidor_demo.js   → http://localhost:8090/calles-prioritarias/
// Cuenta inicial: admin@ejemplo.gob.mx con la contraseña temporal que se muestra al arrancar. Nada se guarda al cerrar.
// Opciones (variables de entorno):
//   DEMO_DATOS=1   carga cuentas ficticias (@ejemplo.gob.mx, contraseña «demostracion-2026») y 90 días de uso simulado
//   DEMO_PG=1      usa un PostgreSQL de PRUEBAS (variables PG* de la cuenta calles_app, esquema ya instalado) en vez de la base en memoria
//   SITIO=…/docs   la herramienta a servir (para ver el registro de usos, construida con la sesión: ver ../LEEME.md)
//   DEMO_RED=192.168.x.x  además, abrirla desde otro equipo de la red (un celular): acepta esa procedencia y la cookie va sin «Secure»
//                  porque la red local no usa HTTPS. SOLO para la demostración: en producción la cookie siempre es segura.
'use strict';
const path = require('path'), fs = require('fs');
const express = require('express');
const { newDb } = require('pg-mem');
const moduloCalles = require('../src');
const { huella, temporal } = require('../src/contrasenas');

(async () => {
  const PUERTO = +(process.env.PUERTO || 8090);
  let pool;
  if (process.env.DEMO_PG) { const { Pool } = require('pg'); pool = new Pool(); }
  else { const db = newDb(); db.public.none(fs.readFileSync(path.join(__dirname, '..', 'sql', '001_esquema.sql'), 'utf8').split('-- Plazos de conservación')[0]);
    const { Pool } = db.adapters.createPg(); pool = new Pool(); }
  const clave = process.env.CLAVE_DEMO || temporal();
  if (process.env.DEMO_DATOS) { const r = await require('./datos_demo').sembrar(pool); console.log(`Datos simulados: ${r.cuentas} cuentas ficticias y ${r.registros} registros de 90 días.`); }
  await pool.query(`INSERT INTO calles.usuarios (correo, nombre, institucion, rol, huella, debe_cambiar) VALUES ('admin@ejemplo.gob.mx', 'Administración (demostración)', 'SEDEMA', 'admin', $1, true)
    ON CONFLICT (correo) DO UPDATE SET huella = EXCLUDED.huella, debe_cambiar = true, activo = true`, [await huella(clave)]);

  const app = express(); app.set('trust proxy', true);
  const red = process.env.DEMO_RED, origen = `http://localhost:${PUERTO}` + (red ? `,http://${red}:${PUERTO}` : '');
  app.use('/api/calles', moduloCalles({ pool, opciones: { origen, depurarCadaHoras: 0, cookieSegura: !red } }));
  app.use('/acceso/calles', express.static(path.join(__dirname, '..', '..', 'acceso')));
  // equivalente a auth_request de nginx (ver ../LEEME.md, sección nginx)
  const sitio = process.env.SITIO || path.join(__dirname, '..', '..', '..', '..', 'docs');
  app.use('/calles-prioritarias', async (req, res, next) => {
    const r = await fetch(`http://127.0.0.1:${PUERTO}/api/calles/sesion`, { headers: { cookie: req.get('cookie') || '', 'x-original-uri': req.originalUrl } });
    if (r.status === 204) return next();
    const esPagina = req.path === '/' || req.path === '/index.html';
    if (esPagina) return res.redirect(302, '/acceso/calles/?volver=' + encodeURIComponent(req.originalUrl));
    res.status(401).type('html').send('<html><body>No autorizado</body></html>');
  }, express.static(sitio));
  app.listen(PUERTO, () => console.log(`${red ? `En el celular (misma red Wi-Fi): http://${red}:${PUERTO}/calles-prioritarias/
` : ''}Demostración en http://localhost:${PUERTO}/calles-prioritarias/\nCuenta: admin@ejemplo.gob.mx · contraseña temporal: ${clave}\nPanel: http://localhost:${PUERTO}/acceso/calles/admin/`));
})();
