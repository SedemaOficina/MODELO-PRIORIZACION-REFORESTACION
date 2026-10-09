// Datos SIMULADOS para ensayar el módulo: cuentas ficticias (@ejemplo.gob.mx) y 90 días de uso con un patrón realista.
// Sirven para ver el panel de usos «como en la vida real» antes de abrir, en la demostración o en una base de PRUEBAS.
//
// Uso con la demostración (base en memoria):   DEMO_DATOS=1 node --import ./pruebas/cargador.mjs scripts/servidor_demo.mjs
// Uso contra una base de pruebas de PostgreSQL:  node --import ./pruebas/cargador.mjs scripts/datos_demo.mjs --base-de-pruebas   (variables PG* de esa base)
// Solo para desarrollo y ensayo: no va al backend del SIA.
// Nunca en producción: se niega si la base ya tiene cuentas que no sean @ejemplo.gob.mx. Para quitar los datos: --borrar.
import pg from 'pg';
import { fileURLToPath } from 'node:url';
const { huella } = await import('../src/modulos/priorizacion-reforestacion/contrasenas.ts');
const { ALCALDIAS } = await import('../src/modulos/priorizacion-reforestacion/alcaldias.ts');

const DOMINIO = '@ejemplo.gob.mx';
const CLAVE_DEMO = 'demostracion-2026';   // la misma para todas las cuentas ficticias; solo existe en datos de prueba
const NOMBRES = ['Ana', 'Luis', 'María', 'Jorge', 'Carmen', 'Raúl', 'Lucía', 'Pedro', 'Elena', 'Miguel', 'Sofía', 'Arturo', 'Patricia', 'Ricardo', 'Laura', 'Fernando'];
const APELLIDOS = ['García', 'Hernández', 'López', 'Martínez', 'Pérez', 'Sánchez', 'Ramírez', 'Flores', 'Cruz', 'Morales', 'Reyes', 'Torres', 'Jiménez', 'Ruiz', 'Vargas', 'Castillo'];
const AVENIDAS = ['Calzada de Tlalpan', 'Avenida Insurgentes Sur', 'Eje 5 Sur', 'Calzada Ermita Iztapalapa', 'Anillo Periférico', 'Río Churubusco', 'Avenida Tláhuac', 'Calzada Ignacio Zaragoza'];
const COLONIAS = ['Centro', 'Santo Domingo', 'San Felipe de Jesús', 'Agrícola Oriental', 'Tacubaya', 'Del Mar Sur', 'Moctezuma 2a Sección', 'La Malinche', 'Barrio Norte', 'Industrial Vallejo'];
// tipos de archivo con su peso: el Excel de frentes y la ficha de alcaldía son los más pedidos
const ARCHIVOS = [['excel_frentes', 30], ['excel_calles', 18], ['ficha_alcaldia', 14], ['ficha_colonia', 12], ['kml', 9], ['excel_calle', 6], ['ficha_calle', 5], ['geojson', 3], ['excel_tramos', 2], ['ficha_vialidades', 1]];
const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

// azar con semilla: los mismos datos en cada ejecución (útil para comparar)
function azar(semilla) { let s = semilla >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export async function sembrar(pool, { dias = 90, semilla = 2026, ahora = Date.now() } = {}) {
  const r = azar(semilla), elige = a => a[Math.floor(r() * a.length)], pesado = l => { let t = l.reduce((x, y) => x + y[1], 0) * r(); for (const [v, w] of l) { if ((t -= w) < 0) return v; } return l[0][0]; };
  const otras = await pool.query(`SELECT count(*) AS n FROM priorizacion_reforestacion.usuarios WHERE correo NOT LIKE '%${DOMINIO}'`);
  if (+otras.rows[0].n > 0) throw new Error('La base ya tiene cuentas reales: los datos simulados solo se cargan en una base de prueba o vacía.');
  const h = await huella(CLAVE_DEMO);
  const personas = [];
  const nombre = () => `${elige(NOMBRES)} ${elige(APELLIDOS)} ${elige(APELLIDOS)}`;
  // dos enlaces por alcaldía (uno muy activo, otro ocasional), tres del Gobierno Central, dos de SEDEMA con administración
  for (const [cve, alc] of Object.entries(ALCALDIAS)) for (const k of [1, 2])
    personas.push({ correo: `enlace${k}.${slug(alc)}${DOMINIO}`, nombre: nombre(), institucion: 'Alcaldía', alcaldia_cve: cve, rol: 'usuario', actividad: k === 1 ? 0.35 + r() * 0.4 : 0.05 + r() * 0.15 });
  for (const k of [1, 2, 3]) personas.push({ correo: `vialidades${k}${DOMINIO}`, nombre: nombre(), institucion: 'Gobierno Central', alcaldia_cve: null, rol: 'usuario', actividad: 0.2 + r() * 0.3 });
  for (const k of [1, 2]) personas.push({ correo: `sia${k}${DOMINIO}`, nombre: nombre(), institucion: 'SEDEMA', alcaldia_cve: null, rol: 'admin', actividad: 0.25 });
  const ids = [];
  for (const [i, p] of personas.entries()) {
    const baja = i === 7, pendiente = i === 12, detenida = i === 20;   // algunos casos para ver los estados en el panel
    const { rows } = await pool.query(`INSERT INTO priorizacion_reforestacion.usuarios (correo, nombre, institucion, alcaldia_cve, rol, activo, huella, debe_cambiar, bloqueado_hasta, creado)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (correo) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id`,
      [p.correo, p.nombre, p.institucion, p.alcaldia_cve, p.rol, !baja, h, pendiente, detenida ? new Date(ahora + 10 * 60000) : null, new Date(ahora - (dias + 5) * 864e5)]);
    ids.push({ ...p, id: rows[0].id, activo: !baja && !pendiente });
  }
  // bitácora: por día hábil, cada persona entra con la probabilidad de su actividad; consulta su alcaldía la mayoría de las veces
  const filas = [];
  const ip = () => `10.0.${Math.floor(r() * 250)}.${Math.floor(r() * 250)}`;
  for (let d = dias; d >= 0; d--) {
    const dia = new Date(ahora - d * 864e5), habil = dia.getDay() > 0 && dia.getDay() < 6;
    for (const p of ids) {
      if (!p.activo || r() > p.actividad * (habil ? 1 : 0.1)) continue;
      let t = new Date(dia); t.setHours(9 + Math.floor(r() * 8), Math.floor(r() * 60), 0, 0);
      const mas = min => { t = new Date(t.getTime() + min * 60000); return t; };
      if (r() < 0.06) filas.push([p.id, 'acceso_fallido', null, mas(0), ip()]);
      filas.push([p.id, 'acceso', null, mas(1), ip()]); filas.push([p.id, 'visita', null, mas(0), ip()]);
      const gc = p.institucion === 'Gobierno Central';
      const nCons = 1 + Math.floor(r() * 4);
      for (let c = 0; c < nCons; c++) {
        const alc = p.alcaldia_cve && r() < 0.85 ? ALCALDIAS[p.alcaldia_cve] : elige(Object.values(ALCALDIAS));
        const det = gc ? { red: 'gc', alcaldia: r() < 0.4 ? '' : alc, avenida: r() < 0.6 ? elige(AVENIDAS) : '', banqueta: 'todas' }
          : { red: 'alc', alcaldia: alc, colonia: r() < 0.45 ? elige(COLONIAS) : '', banqueta: r() < 0.55 ? 'todas' : r() < 0.7 ? 'con' : 'sin' };
        filas.push([p.id, 'consulta', det, mas(2 + r() * 10), ip()]);
        if (r() < 0.55) { const tipo = gc ? (r() < 0.7 ? 'excel_tramos' : 'ficha_vialidades') : pesado(ARCHIVOS);
          filas.push([p.id, 'descarga', { ...det, tipo, archivo: `${tipo}_${slug(det.alcaldia || 'ciudad')}.${/^excel/.test(tipo) ? 'xlsx' : /^ficha/.test(tipo) ? 'pdf' : tipo}` }, mas(1 + r() * 5), ip()]); }
      }
      if (r() < 0.4) filas.push([p.id, 'salida', null, mas(5 + r() * 20), ip()]);
    }
  }
  for (let i = 0; i < filas.length; i += 400) {   // por bloques: rápido en PostgreSQL real
    const b = filas.slice(i, i + 400), v = [];
    const sql = 'INSERT INTO priorizacion_reforestacion.bitacora (usuario_id, evento, detalle, momento, ip) VALUES ' +
      b.map((f, j) => { v.push(f[0], f[1], f[2] ? JSON.stringify(f[2]) : null, f[3], f[4]); return `($${j * 5 + 1}, $${j * 5 + 2}, $${j * 5 + 3}, $${j * 5 + 4}, $${j * 5 + 5})`; }).join(', ');
    await pool.query(sql, v);
  }
  for (const p of ids) await pool.query('UPDATE priorizacion_reforestacion.usuarios SET ultimo_acceso = (SELECT max(momento) FROM priorizacion_reforestacion.bitacora WHERE usuario_id = $1 AND evento = $2) WHERE id = $1', [p.id, 'acceso']);
  return { cuentas: personas.length, registros: filas.length, clave: CLAVE_DEMO };
}

export async function borrar(pool) {
  await pool.query(`DELETE FROM priorizacion_reforestacion.bitacora WHERE usuario_id IN (SELECT id FROM priorizacion_reforestacion.usuarios WHERE correo LIKE '%${DOMINIO}')`);
  const { rows } = await pool.query(`DELETE FROM priorizacion_reforestacion.usuarios WHERE correo LIKE '%${DOMINIO}' RETURNING id`);
  return rows.length;
}

export { CLAVE_DEMO, DOMINIO };

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) (async () => {
  const a = process.argv.slice(2);
  if (!a.includes('--base-de-pruebas')) { console.error('Solo para una base de PRUEBAS. Confirma con: node --import ./pruebas/cargador.mjs scripts/datos_demo.mjs --base-de-pruebas  [--borrar]'); process.exit(1); }
  const pool = new pg.Pool();
  try {
    if (a.includes('--borrar')) console.log(`Cuentas ficticias borradas: ${await borrar(pool)}.`);
    else { const r = await sembrar(pool); console.log(`Listo: ${r.cuentas} cuentas ficticias (${DOMINIO}, contraseña «${r.clave}») y ${r.registros} registros de uso de 90 días.`); }
  } catch (e) { console.error('ERROR:', e.message); process.exitCode = 1; } finally { await pool.end(); }
})();
