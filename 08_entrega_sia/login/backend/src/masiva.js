// Alta masiva de cuentas: lectura del CSV, revisión por renglón y alta. La usan el panel de administración (POST /admin/usuarios/masiva)
// y el script de terminal scripts/alta_masiva.js, con las mismas reglas.
'use strict';
const { huella, temporal } = require('./contrasenas');
const { ALCALDIAS } = require('./alcaldias');

const INST = ['Alcaldía', 'Gobierno Central', 'SEDEMA', 'Otra'];
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const POR_NOMBRE = Object.fromEntries(Object.entries(ALCALDIAS).map(([k, v]) => [norm(v), k]));

function leeCsv(texto) {
  texto = texto.replace(/^﻿/, '');
  const sep = (texto.split(/\r?\n/)[0].match(/;/g) || []).length > (texto.split(/\r?\n/)[0].match(/,/g) || []).length ? ';' : ',';
  const filas = []; let f = [], c = '', q = false;
  for (let i = 0; i < texto.length; i++) { const ch = texto[i];
    if (q) { if (ch === '"' && texto[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; }
    else if (ch === '"') q = true; else if (ch === sep) { f.push(c); c = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && texto[i + 1] === '\n') i++; f.push(c); filas.push(f); f = []; c = ''; } else c += ch; }
  if (c !== '' || f.length) { f.push(c); filas.push(f); }
  const enc = filas.shift().map(norm);
  return filas.filter(r => r.some(x => x.trim())).map(r => Object.fromEntries(enc.map((h, i) => [h, (r[i] || '').trim()])));
}

// revisa cada renglón; devuelve las cuentas válidas y los errores con su número de renglón (el encabezado es el 1)
function revisa(renglones) {
  const ok = [], errores = [], vistos = new Set();
  renglones.forEach((r, i) => { const n = i + 2, e = [];
    const correo = (r.correo || '').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) e.push('correo no válido');
    if (vistos.has(correo)) e.push('correo repetido en el archivo'); vistos.add(correo);
    if (!r.nombre) e.push('falta el nombre');
    const inst = INST.find(x => norm(x) === norm(r.institucion || 'Alcaldía'));
    if (!inst) e.push(`institución «${r.institucion}» no válida (${INST.join(', ')})`);
    const alc = r.alcaldia ? (ALCALDIAS[r.alcaldia.padStart(3, '0')] ? r.alcaldia.padStart(3, '0') : POR_NOMBRE[norm(r.alcaldia)]) : null;
    if (r.alcaldia && !alc) e.push(`alcaldía «${r.alcaldia}» no reconocida`);
    if (inst === 'Alcaldía' && !alc) e.push('una cuenta de alcaldía necesita su alcaldía');
    const rol = norm(r.rol || 'usuario') === 'admin' || norm(r.rol) === 'administracion' ? 'admin' : norm(r.rol || 'usuario') === 'usuario' || norm(r.rol) === 'consulta' ? 'usuario' : null;
    if (!rol) e.push(`rol «${r.rol}» no válido (usuario o admin)`);
    if (e.length) errores.push(`Renglón ${n} (${r.correo || 'sin correo'}): ${e.join('; ')}`);
    else ok.push({ correo, nombre: r.nombre, institucion: inst, alcaldia_cve: alc, rol }); });
  return { ok, errores };
}

async function aplica(pool, cuentas, autor = null) {
  const hechas = [], existentes = [];
  for (const c of cuentas) {
    // una cuenta que ya existe no se toca (ni su contraseña): correr el alta dos veces no cambia nada
    if ((await pool.query('SELECT 1 FROM priorizacion_reforestacion.usuarios WHERE correo = $1', [c.correo])).rows.length) { existentes.push(c.correo); continue; }
    const clave = temporal();
    const { rows } = await pool.query(`INSERT INTO priorizacion_reforestacion.usuarios (correo, nombre, institucion, alcaldia_cve, rol, huella, debe_cambiar) VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id`,
      [c.correo, c.nombre, c.institucion, c.alcaldia_cve, c.rol, await huella(clave)]);
    await pool.query(`INSERT INTO priorizacion_reforestacion.bitacora (usuario_id, evento, detalle) VALUES ($1, 'admin', $2)`, [autor, JSON.stringify({ accion: 'alta_masiva', usuario: rows[0].id })]);
    hechas.push({ ...c, contrasena_temporal: clave });
  }
  return { hechas, existentes };
}

module.exports = { leeCsv, revisa, aplica };
