// Alta masiva de cuentas desde un CSV (por ejemplo, los enlaces que cada alcaldía designa por oficio).
// Uso (en el servidor de aplicaciones, con las variables PG* de la cuenta calles_app):
//   node scripts/alta_masiva.js cuentas.csv                → revisa y muestra qué haría (no escribe nada)
//   node scripts/alta_masiva.js cuentas.csv --aplicar      → da de alta y escribe cuentas_con_contrasenas_AAAAMMDD.csv
// CSV (UTF-8, con encabezado; separador coma o punto y coma, como lo guarda Excel):
//   correo,nombre,institucion,alcaldia,rol
//   enlace@azcapotzalco.cdmx.gob.mx,Ana García,Alcaldía,Azcapotzalco,usuario
// alcaldia: nombre o clave «002»…«017» (vacía si no es de alcaldía). institucion: Alcaldía · Gobierno Central · SEDEMA · Otra. rol: usuario · admin.
// El CSV de salida trae contraseñas temporales: se reparte por canal institucional y se BORRA después.
'use strict';
const fs = require('fs'), path = require('path');
const { leeCsv, revisa, aplica } = require('../src/masiva');
const { ALCALDIAS } = require('../src/alcaldias');

module.exports = { leeCsv, revisa, aplica };

if (require.main === module) (async () => {
  const [archivo, ...op] = process.argv.slice(2);
  if (!archivo || !fs.existsSync(archivo)) { console.error('Uso: node scripts/alta_masiva.js cuentas.csv [--aplicar]'); process.exit(1); }
  const { ok, errores } = revisa(leeCsv(fs.readFileSync(archivo, 'utf8')));
  console.log(`${ok.length} cuentas válidas · ${errores.length} con errores`); errores.forEach(e => console.log('  ✗ ' + e));
  if (errores.length) { console.log('Corrige los renglones con error y vuelve a correrlo. No se escribió nada.'); process.exit(1); }
  if (!op.includes('--aplicar')) { ok.forEach(c => console.log(`  ✓ ${c.correo} · ${c.institucion}${c.alcaldia_cve ? ' · ' + ALCALDIAS[c.alcaldia_cve] : ''} · ${c.rol}`)); console.log('Revisión sin cambios. Para dar de alta: --aplicar'); return; }
  const { Pool } = require('pg'); const pool = new Pool();
  try {
    const { hechas, existentes } = await aplica(pool, ok);
    const salida = path.join(path.dirname(archivo), `cuentas_con_contrasenas_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`);
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    fs.writeFileSync(salida, '﻿' + ['correo,nombre,institucion,alcaldia,contrasena_temporal'].concat(hechas.map(c => [c.correo, c.nombre, c.institucion, ALCALDIAS[c.alcaldia_cve] || '', c.contrasena_temporal].map(q).join(','))).join('\r\n'));
    console.log(`Altas: ${hechas.length}. Ya existían (sin cambios): ${existentes.length}${existentes.length ? ' → ' + existentes.join(', ') : ''}.`);
    console.log(`Contraseñas temporales en: ${salida}\nRepártelas por canal institucional y BORRA ese archivo después.`);
  } finally { await pool.end(); }
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
