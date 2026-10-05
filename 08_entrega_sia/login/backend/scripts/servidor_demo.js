// Servidor de demostración: reproduce en una sola máquina lo que hará el servidor del SIA, sin PostgreSQL ni nginx.
//   /acceso/calles/        pantalla de acceso y panel (archivos de ../acceso)
//   /api/calles/           módulo de sesión, con una base en memoria (pg-mem)
//   /calles-prioritarias/  la herramienta (carpeta docs/ del repositorio), protegida como con auth_request de nginx:
//                          la página sin sesión va a la pantalla de acceso; datos y programas responden 401
// Uso: npm install && node scripts/servidor_demo.js   → http://localhost:8090/calles-prioritarias/
// Cuenta inicial: admin@demo.mx con la contraseña temporal que se muestra al arrancar. Nada se guarda al cerrar.
'use strict';
const path = require('path'), fs = require('fs');
const express = require('express');
const { newDb } = require('pg-mem');
const moduloCalles = require('../src');
const { huella, temporal } = require('../src/contrasenas');

(async () => {
  const PUERTO = +(process.env.PUERTO || 8090);
  const db = newDb(); db.public.none(fs.readFileSync(path.join(__dirname, '..', 'sql', '001_esquema.sql'), 'utf8').split('-- Plazos de conservación')[0]);
  const { Pool } = db.adapters.createPg(); const pool = new Pool();
  const clave = process.env.CLAVE_DEMO || temporal();
  await pool.query(`INSERT INTO calles.usuarios (correo, nombre, institucion, rol, huella, debe_cambiar) VALUES ('admin@demo.mx', 'Administración (demostración)', 'SEDEMA', 'admin', $1, true)`, [await huella(clave)]);

  const app = express(); app.set('trust proxy', true);
  app.use('/api/calles', moduloCalles({ pool, opciones: { origen: `http://localhost:${PUERTO}`, depurarCadaHoras: 0 } }));
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
  app.listen(PUERTO, () => console.log(`Demostración en http://localhost:${PUERTO}/calles-prioritarias/\nCuenta: admin@demo.mx · contraseña temporal: ${clave}\nPanel: http://localhost:${PUERTO}/acceso/calles/admin/`));
})();
