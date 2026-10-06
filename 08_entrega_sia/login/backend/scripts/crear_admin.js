// Crea la primera cuenta de administración (las demás se dan de alta desde el panel).
// Uso, en el servidor de aplicaciones, con las variables de conexión de PostgreSQL de la cuenta priorizacion_reforestacion_app (PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGSSLMODE):
//   node scripts/crear_admin.js correo@sedema.cdmx.gob.mx "Nombre Apellido"
// Muestra UNA vez una contraseña temporal; la persona la cambia al primer acceso.
'use strict';
const { Pool } = require('pg');
const { huella, temporal } = require('../src/contrasenas');

(async () => {
  const [correo, nombre] = process.argv.slice(2);
  if (!correo || !nombre || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { console.error('Uso: node scripts/crear_admin.js correo "Nombre"'); process.exit(1); }
  const pool = new Pool();
  try {
    const clave = temporal();
    const { rows } = await pool.query(`INSERT INTO priorizacion_reforestacion.usuarios (correo, nombre, institucion, rol, huella, debe_cambiar) VALUES ($1, $2, 'SEDEMA', 'admin', $3, true)
      ON CONFLICT (correo) DO NOTHING RETURNING id`, [correo.trim().toLowerCase(), nombre.trim(), await huella(clave)]);
    if (!rows.length) { console.error('Ya existe una cuenta con ese correo. Usa «Restablecer» desde el panel o pide apoyo a quien administra la base.'); process.exit(1); }
    console.log(`Cuenta de administración creada (id ${rows[0].id}).\nContraseña temporal (se muestra una sola vez): ${clave}\nAl entrar se pedirá cambiarla.`);
  } finally { await pool.end(); }
})().catch(e => { console.error(e.message); process.exit(1); });
