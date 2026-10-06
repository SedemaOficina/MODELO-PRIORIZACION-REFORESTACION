// Módulo de sesión de «Modelo de priorización de reforestación urbana» para sia-backend (Node.js + Express).
// Controla quién entra (usuarios dados de alta, contraseñas con huella, bloqueo por intentos) y registra los usos
// (accesos, visitas, consultas por alcaldía y descargas) para saber quién usa la herramienta y para qué.
//
// Montaje en sia-backend:
//   const calles = require('./modulos/calles')({ pool });   // pool de pg con la cuenta de servicio calles_app
//   app.use('/api/calles', calles);
// Requiere app.set('trust proxy', ...) para que req.ip sea la del ciudadano (nginx envía X-Forwarded-For).
'use strict';
const crypto = require('crypto');
const express = require('express');
const { huella, verifica, revisaNueva, temporal } = require('./contrasenas');

const { ALCALDIAS } = require('./alcaldias');
const masiva = require('./masiva');
const INSTITUCIONES = ['Alcaldía', 'Gobierno Central', 'SEDEMA', 'Otra'];
const EVENTOS_USO = ['consulta', 'descarga'];

module.exports = function moduloCalles({ pool, opciones = {} }) {
  const o = {
    cookie: 'calles_sesion',
    origen: process.env.CALLES_ORIGEN || 'https://sedema.sia.cdmx.gob.mx',   // procedencia aceptada en peticiones que cambian algo (varias, separadas por coma)
    cookieSegura: true,            // solo la demostración en red local (HTTP) la apaga; en producción siempre va cifrada
    rutaHerramienta: '/calles-prioritarias/',
    rutaAcceso: '/acceso/calles/',
    inactividadMin: 12 * 60,       // la sesión se cierra tras 12 h sin actividad
    maximoDias: 7,                 // y, en todo caso, a los 7 días
    intentosMax: 5, bloqueoMin: 15,
    visitaCadaMin: 30,             // una visita se anota a lo más cada 30 min por sesión
    ...opciones,
  };
  const r = express.Router();
  const q = (sql, p) => pool.query(sql, p);
  const huellaToken = t => crypto.createHash('sha256').update(t).digest('hex');
  const ip = req => req.ip || null;
  const anota = (usuario_id, evento, detalle, req) =>
    q('INSERT INTO calles.bitacora (usuario_id, evento, detalle, ip) VALUES ($1, $2, $3, $4)', [usuario_id, evento, detalle ? JSON.stringify(detalle) : null, req ? ip(req) : null]);
  const leeCookie = req => { const c = req.get('cookie') || ''; const m = c.split(/;\s*/).find(x => x.startsWith(o.cookie + '=')); return m ? decodeURIComponent(m.slice(o.cookie.length + 1)) : null; };
  const ponCookie = (res, valor, maxSeg) => res.append('Set-Cookie',
    `${o.cookie}=${valor}; Path=/; HttpOnly;${o.cookieSegura ? ' Secure;' : ''} SameSite=Lax${maxSeg === 0 ? '; Max-Age=0' : `; Max-Age=${maxSeg}`}`);
  // dirección de regreso: solo dentro de la herramienta (nunca a otro sitio)
  const volverSeguro = v => (typeof v === 'string' && v.startsWith(o.rutaHerramienta) && !v.startsWith('//') && !/[\r\n\\]/.test(v)) ? v : o.rutaHerramienta;

  // ----- sesión a partir de la cookie -----
  async function sesion(req) {
    const t = leeCookie(req); if (!t || t.length > 200) return null;
    const { rows } = await q(`SELECT s.token_huella, s.ultima_actividad, s.expira, s.ultima_visita, u.id, u.correo, u.nombre, u.rol, u.activo, u.institucion, u.alcaldia_cve, u.debe_cambiar
      FROM calles.sesiones s JOIN calles.usuarios u ON u.id = s.usuario_id WHERE s.token_huella = $1`, [huellaToken(t)]);
    const s = rows[0]; const ahora = Date.now();
    if (!s || !s.activo || new Date(s.expira).getTime() < ahora || ahora - new Date(s.ultima_actividad).getTime() > o.inactividadMin * 60000) return null;
    return s;
  }
  // las peticiones que cambian algo deben venir de la misma procedencia (protección contra solicitudes cruzadas)
  const origenes = String(o.origen).split(',').map(s => s.trim()).filter(Boolean);
  const mismaProcedencia = (req, res, next) => { const or = req.get('origin');
    if (or && !origenes.includes(or)) return res.status(403).json({ error: 'Procedencia no permitida.' }); next(); };
  const conSesion = (rol) => async (req, res, next) => { try { const s = await sesion(req);
    if (!s) return res.status(401).json({ error: 'Tu sesión terminó. Vuelve a iniciar sesión para continuar.' });
    if (rol && s.rol !== rol) return res.status(403).json({ error: 'No tienes permiso para esta sección.' });
    req.usuario = s; next(); } catch (e) { next(e); } };
  const json = express.json({ limit: '8kb' });
  // límite simple por IP para los intentos de acceso (además del bloqueo por cuenta en la base)
  const intentos = new Map();
  const limiteIp = (req, res, next) => { const k = ip(req) || '?', ahora = Date.now(); const a = (intentos.get(k) || []).filter(t => ahora - t < 15 * 60000);
    if (a.length >= 30) return res.status(429).json({ error: 'Demasiados intentos desde esta red. Espera unos minutos.' });
    a.push(ahora); intentos.set(k, a); if (intentos.size > 5000) intentos.clear(); next(); };

  // ----- entrar -----
  r.post('/entrar', mismaProcedencia, limiteIp, json, async (req, res, next) => { try {
    const correo = String(req.body.correo || '').trim().toLowerCase(), contrasena = String(req.body.contrasena || '');
    const NO = () => res.status(401).json({ error: 'El correo o la contraseña no son correctos.' });   // mismo mensaje exista o no el correo
    const { rows } = await q('SELECT * FROM calles.usuarios WHERE correo = $1', [correo]); const u = rows[0];
    if (!u || !u.activo) { await huella('x'.repeat(12)); await anota(null, 'acceso_fallido', { motivo: 'correo' }, req); return NO(); }   // mismo tiempo de respuesta
    if (u.bloqueado_hasta && new Date(u.bloqueado_hasta).getTime() > Date.now())
      return res.status(423).json({ error: `Por seguridad, el acceso con esta cuenta está detenido unos minutos tras ${o.intentosMax} intentos fallidos. Inténtalo más tarde.` });
    if (!(await verifica(contrasena, u.huella))) {
      const n = u.intentos_fallidos + 1, bloquea = n >= o.intentosMax;
      await q('UPDATE calles.usuarios SET intentos_fallidos = $1, bloqueado_hasta = $2 WHERE id = $3', [bloquea ? 0 : n, bloquea ? new Date(Date.now() + o.bloqueoMin * 60000) : null, u.id]);
      await anota(u.id, 'acceso_fallido', { bloqueo: bloquea }, req); return NO(); }
    const token = crypto.randomBytes(32).toString('base64url');
    await q('INSERT INTO calles.sesiones (token_huella, usuario_id, expira) VALUES ($1, $2, $3)', [huellaToken(token), u.id, new Date(Date.now() + o.maximoDias * 864e5)]);
    await q('UPDATE calles.usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_acceso = now() WHERE id = $1', [u.id]);
    await anota(u.id, 'acceso', null, req);
    ponCookie(res, token, o.maximoDias * 86400);
    res.json({ ok: true, debe_cambiar: u.debe_cambiar, volver: volverSeguro(req.body.volver) });
  } catch (e) { next(e); } });

  // ----- verificación para nginx (auth_request): 204 con sesión válida, 401 sin ella. Es la puerta de toda la herramienta. -----
  r.get('/sesion', async (req, res, next) => { try {
    const s = await sesion(req); if (!s) return res.status(401).end();
    // con contraseña temporal no se entra a la herramienta: primero hay que cambiarla
    if (s.debe_cambiar) return res.status(401).end();
    const ahora = new Date(), uri = req.get('x-original-uri') || '';
    const esPagina = uri.split('?')[0] === o.rutaHerramienta || uri.split('?')[0] === o.rutaHerramienta + 'index.html';
    const visita = esPagina && (!s.ultima_visita || ahora - new Date(s.ultima_visita) > o.visitaCadaMin * 60000);
    if (ahora - new Date(s.ultima_actividad) > 60000 || visita)   // la actividad se actualiza a lo más una vez por minuto: nginx pregunta por cada archivo
      await q('UPDATE calles.sesiones SET ultima_actividad = $1' + (visita ? ', ultima_visita = $1' : '') + ' WHERE token_huella = $2', [ahora, s.token_huella]);
    if (visita) await anota(s.id, 'visita', null, req);
    res.set('X-Calles-Usuario', String(s.id)).status(204).end();
  } catch (e) { next(e); } });

  // ----- salir: por enlace (GET, desde «Cerrar sesión» de la herramienta) o por formulario -----
  const salir = async (req, res, next) => { try { const t = leeCookie(req);
    if (t) { const { rows } = await q('DELETE FROM calles.sesiones WHERE token_huella = $1 RETURNING usuario_id', [huellaToken(t)]); if (rows[0]) await anota(rows[0].usuario_id, 'salida', null, req); }
    ponCookie(res, '', 0); res.redirect(303, o.rutaAcceso + '?salida=1');
  } catch (e) { next(e); } };
  r.get('/salir', salir); r.post('/salir', mismaProcedencia, salir);

  // ----- quién soy (para la pantalla de acceso y el panel) -----
  r.get('/yo', async (req, res, next) => { try { const s = await sesion(req); if (!s) return res.status(401).json({ error: 'Sin sesión.' });
    res.json({ correo: s.correo, nombre: s.nombre, rol: s.rol, institucion: s.institucion, alcaldia_cve: s.alcaldia_cve, alcaldia: ALCALDIAS[s.alcaldia_cve] || null, debe_cambiar: s.debe_cambiar });
  } catch (e) { next(e); } });

  // ----- cambiar la contraseña (obligatorio con contraseña temporal) -----
  r.post('/contrasena', mismaProcedencia, json, conSesion(), async (req, res, next) => { try {
    const { rows } = await q('SELECT huella, correo FROM calles.usuarios WHERE id = $1', [req.usuario.id]);
    if (!(await verifica(String(req.body.actual || ''), rows[0].huella))) return res.status(400).json({ error: 'La contraseña actual no es correcta.', campo: 'actual' });
    const err = revisaNueva(req.body.nueva, rows[0].correo); if (err) return res.status(400).json({ error: err, campo: 'nueva' });
    await q('UPDATE calles.usuarios SET huella = $1, debe_cambiar = false, actualizado = now() WHERE id = $2', [await huella(req.body.nueva), req.usuario.id]);
    await q('DELETE FROM calles.sesiones WHERE usuario_id = $1 AND token_huella <> $2', [req.usuario.id, req.usuario.token_huella]);   // cierra las demás sesiones
    await anota(req.usuario.id, 'cambio_contrasena', null, req);
    res.json({ ok: true, volver: volverSeguro(req.body.volver) });
  } catch (e) { next(e); } });

  // ----- uso de la herramienta: consulta (alcaldía o colonia) y descarga (archivo). Llega con navigator.sendBeacon (texto). -----
  const LIMPIO = /^[\p{L}\p{N} .,;:()«»'_\-·/]{0,160}$/u;
  r.post('/uso', mismaProcedencia, express.text({ type: '*/*', limit: '4kb' }), conSesion(), async (req, res, next) => { try {
    let d; try { d = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch (e) { return res.status(400).end(); }
    if (!d || !EVENTOS_USO.includes(d.evento)) return res.status(400).end();
    const det = {};   // solo campos conocidos y textos cortos: nunca se guarda lo que mande la página sin revisar
    for (const k of ['red', 'alcaldia', 'colonia', 'avenida', 'calle', 'banqueta', 'archivo', 'tipo']) if (typeof d[k] === 'string' && LIMPIO.test(d[k])) det[k] = d[k];
    await anota(req.usuario.id, d.evento, det, req); res.status(204).end();
  } catch (e) { next(e); } });

  // ================= administración (rol admin) =================
  const admin = conSesion('admin');
  const vistaUsuario = u => ({ id: u.id, correo: u.correo, nombre: u.nombre, institucion: u.institucion, alcaldia_cve: u.alcaldia_cve, alcaldia: ALCALDIAS[u.alcaldia_cve] || null,
    rol: u.rol, activo: u.activo, debe_cambiar: u.debe_cambiar, bloqueado: !!(u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date()), creado: u.creado, ultimo_acceso: u.ultimo_acceso });
  const revisaDatos = (b, nuevo) => {
    if (nuevo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(b.correo || '').trim())) return 'Escribe un correo válido.';
    if (nuevo && !String(b.nombre || '').trim()) return 'Escribe el nombre.';
    if (b.institucion !== undefined && !INSTITUCIONES.includes(b.institucion)) return 'Institución no válida.';
    if (b.alcaldia_cve !== undefined && b.alcaldia_cve !== null && b.alcaldia_cve !== '' && !ALCALDIAS[b.alcaldia_cve]) return 'Alcaldía no válida.';
    if (b.rol !== undefined && !['usuario', 'admin'].includes(b.rol)) return 'Rol no válido.';
    return null; };

  r.get('/admin/usuarios', admin, async (req, res, next) => { try {
    const { rows } = await q('SELECT * FROM calles.usuarios ORDER BY activo DESC, institucion, alcaldia_cve, nombre'); res.json(rows.map(vistaUsuario));
  } catch (e) { next(e); } });
  r.post('/admin/usuarios', mismaProcedencia, json, admin, async (req, res, next) => { try {
    const b = req.body || {}; const err = revisaDatos(b, true); if (err) return res.status(400).json({ error: err });
    const correo = b.correo.trim().toLowerCase(), clave = temporal();
    const ya = await q('SELECT 1 FROM calles.usuarios WHERE correo = $1', [correo]); if (ya.rows.length) return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
    const { rows } = await q(`INSERT INTO calles.usuarios (correo, nombre, institucion, alcaldia_cve, rol, huella, debe_cambiar) VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
      [correo, b.nombre.trim(), b.institucion || 'Alcaldía', b.alcaldia_cve || null, b.rol || 'usuario', await huella(clave)]);
    await anota(req.usuario.id, 'admin', { accion: 'alta', usuario: rows[0].id }, req);
    res.status(201).json({ usuario: vistaUsuario(rows[0]), contrasena_temporal: clave });   // se muestra una sola vez
  } catch (e) { next(e); } });
  r.patch('/admin/usuarios/:id', mismaProcedencia, json, admin, async (req, res, next) => { try {
    const b = req.body || {}; const err = revisaDatos(b, false); if (err) return res.status(400).json({ error: err });
    const id = +req.params.id; if (id === req.usuario.id && (b.activo === false || b.rol === 'usuario')) return res.status(400).json({ error: 'No puedes desactivarte ni quitarte el rol de administración a ti mismo.' });
    const cambios = [], vals = [];
    for (const k of ['nombre', 'institucion', 'alcaldia_cve', 'rol', 'activo']) if (b[k] !== undefined) { vals.push(k === 'alcaldia_cve' ? (b[k] || null) : b[k]); cambios.push(`${k} = $${vals.length}`); }
    if (b.activo === false) cambios.push('baja = COALESCE(baja, now())'); else if (b.activo === true) cambios.push('baja = NULL');   // el plazo de 24 meses corre desde la baja
    if (!cambios.length) return res.status(400).json({ error: 'Nada que cambiar.' });
    vals.push(id); const { rows } = await q(`UPDATE calles.usuarios SET ${cambios.join(', ')}, actualizado = now() WHERE id = $${vals.length} RETURNING *`, vals);
    if (!rows[0]) return res.status(404).json({ error: 'No existe esa cuenta.' });
    if (b.activo === false) await q('DELETE FROM calles.sesiones WHERE usuario_id = $1', [id]);   // una baja cierra sus sesiones al momento
    await anota(req.usuario.id, 'admin', { accion: b.activo === false ? 'baja' : b.activo === true ? 'reactivacion' : 'cambio', usuario: id }, req);
    res.json(vistaUsuario(rows[0]));
  } catch (e) { next(e); } });
  r.post('/admin/usuarios/:id/restablecer', mismaProcedencia, admin, async (req, res, next) => { try {
    const clave = temporal(), id = +req.params.id;
    const { rows } = await q('UPDATE calles.usuarios SET huella = $1, debe_cambiar = true, intentos_fallidos = 0, bloqueado_hasta = NULL, actualizado = now() WHERE id = $2 RETURNING *', [await huella(clave), id]);
    if (!rows[0]) return res.status(404).json({ error: 'No existe esa cuenta.' });
    await q('DELETE FROM calles.sesiones WHERE usuario_id = $1', [id]);
    await anota(req.usuario.id, 'admin', { accion: 'restablecer', usuario: id }, req);
    res.json({ usuario: vistaUsuario(rows[0]), contrasena_temporal: clave });
  } catch (e) { next(e); } });

  // ----- alta masiva desde el panel: primero se revisa (no escribe nada); con aplicar: true da de alta las válidas nuevas.
  // Las contraseñas temporales vuelven una sola vez y el panel arma con ellas el CSV en el navegador: el servidor no lo guarda.
  r.post('/admin/usuarios/masiva', mismaProcedencia, express.json({ limit: '300kb' }), admin, async (req, res, next) => { try {
    const csv = String((req.body || {}).csv || ''); if (!csv.trim()) return res.status(400).json({ error: 'El archivo está vacío.' });
    let renglones; try { renglones = masiva.leeCsv(csv); } catch (e) { return res.status(400).json({ error: 'No se pudo leer el archivo como CSV.' }); }
    if (!renglones.length) return res.status(400).json({ error: 'El archivo no tiene renglones después del encabezado.' });
    if (!('correo' in renglones[0]) || !('nombre' in renglones[0])) return res.status(400).json({ error: 'Faltan columnas: el encabezado debe decir correo, nombre, institucion, alcaldia, rol.' });
    if (renglones.length > 500) return res.status(400).json({ error: 'Máximo 500 cuentas por archivo: divídelo en partes.' });
    const { ok, errores } = masiva.revisa(renglones);
    const existe = new Set(); for (const c of ok) if ((await q('SELECT 1 FROM calles.usuarios WHERE correo = $1', [c.correo])).rows.length) existe.add(c.correo);
    const vista = c => ({ correo: c.correo, nombre: c.nombre, institucion: c.institucion, alcaldia: ALCALDIAS[c.alcaldia_cve] || null, rol: c.rol, existe: existe.has(c.correo) });
    if (!req.body.aplicar || errores.length) return res.json({ aplicado: false, validas: ok.map(vista), errores });
    const hecho = await masiva.aplica(pool, ok, req.usuario.id);
    await anota(req.usuario.id, 'admin', { accion: 'alta_masiva', altas: hecho.hechas.length }, req);
    res.json({ aplicado: true, hechas: hecho.hechas.map(c => ({ ...vista(c), contrasena_temporal: c.contrasena_temporal })), existentes: hecho.existentes });
  } catch (e) { next(e); } });

  // ----- reporte de usos: por institución y alcaldía de quien consulta, por persona, por mes y por tipo de descarga -----
  r.get('/admin/usos', admin, async (req, res, next) => { try {
    const desde = new Date(req.query.desde || Date.now() - 90 * 864e5), hasta = new Date(req.query.hasta || Date.now());
    if (isNaN(desde) || isNaN(hasta)) return res.status(400).json({ error: 'Fechas no válidas.' });
    const p = [desde, new Date(hasta.getTime() + 864e5)];
    const porGrupo = await q(`SELECT u.institucion, u.alcaldia_cve, count(DISTINCT b.usuario_id) AS personas,
        sum(CASE WHEN b.evento = 'acceso' THEN 1 ELSE 0 END) AS accesos, sum(CASE WHEN b.evento = 'visita' THEN 1 ELSE 0 END) AS visitas,
        sum(CASE WHEN b.evento = 'consulta' THEN 1 ELSE 0 END) AS consultas, sum(CASE WHEN b.evento = 'descarga' THEN 1 ELSE 0 END) AS descargas
      FROM calles.bitacora b JOIN calles.usuarios u ON u.id = b.usuario_id WHERE b.momento >= $1 AND b.momento < $2
      GROUP BY u.institucion, u.alcaldia_cve ORDER BY descargas DESC, consultas DESC`, p);
    const porPersona = await q(`SELECT u.id, u.nombre, u.correo, u.institucion, u.alcaldia_cve, max(b.momento) AS ultimo,
        sum(CASE WHEN b.evento = 'acceso' THEN 1 ELSE 0 END) AS accesos, sum(CASE WHEN b.evento = 'consulta' THEN 1 ELSE 0 END) AS consultas, sum(CASE WHEN b.evento = 'descarga' THEN 1 ELSE 0 END) AS descargas
      FROM calles.bitacora b JOIN calles.usuarios u ON u.id = b.usuario_id WHERE b.momento >= $1 AND b.momento < $2
      GROUP BY u.id, u.nombre, u.correo, u.institucion, u.alcaldia_cve ORDER BY descargas DESC, consultas DESC`, p);
    const eventos = await q(`SELECT b.evento, b.detalle, b.momento FROM calles.bitacora b WHERE b.momento >= $1 AND b.momento < $2 AND b.evento IN ('consulta', 'descarga')`, p);
    // lo consultado y lo descargado, por alcaldía consultada (puede ser distinta de la de quien consulta) y por tipo de archivo
    const consultadas = {}, archivos = {};
    for (const e of eventos.rows) { const d = typeof e.detalle === 'string' ? JSON.parse(e.detalle) : (e.detalle || {});
      const a = d.alcaldia || 'Toda la ciudad'; consultadas[a] = consultadas[a] || { consultas: 0, descargas: 0 }; consultadas[a][e.evento === 'consulta' ? 'consultas' : 'descargas']++;
      if (e.evento === 'descarga') { const t = d.tipo || 'otro'; archivos[t] = (archivos[t] || 0) + 1; } }
    const nom = r_ => ({ ...r_, alcaldia: ALCALDIAS[r_.alcaldia_cve] || null, accesos: +r_.accesos, consultas: +r_.consultas, descargas: +r_.descargas, visitas: r_.visitas === undefined ? undefined : +r_.visitas, personas: r_.personas === undefined ? undefined : +r_.personas });
    const cuenta = await q('SELECT sum(CASE WHEN activo THEN 1 ELSE 0 END) AS activas, count(*) AS total FROM calles.usuarios');
    res.json({ desde: p[0], hasta: hasta, cuentas: { activas: +cuenta.rows[0].activas, total: +cuenta.rows[0].total },
      por_grupo: porGrupo.rows.map(nom), por_persona: porPersona.rows.map(nom),
      alcaldias_consultadas: Object.entries(consultadas).map(([alcaldia, v]) => ({ alcaldia, ...v })).sort((a, b) => b.descargas - a.descargas || b.consultas - a.consultas),
      archivos: Object.entries(archivos).map(([tipo, n]) => ({ tipo, n })).sort((a, b) => b.n - a.n) });
  } catch (e) { next(e); } });
  // bitácora completa en CSV (sin IP: la IP solo se usa para seguridad)
  r.get('/admin/usos.csv', admin, async (req, res, next) => { try {
    const { rows } = await q(`SELECT b.momento, b.evento, u.correo, u.institucion, u.alcaldia_cve, b.detalle FROM calles.bitacora b LEFT JOIN calles.usuarios u ON u.id = b.usuario_id
      WHERE b.momento >= $1 ORDER BY b.momento`, [new Date(req.query.desde || Date.now() - 90 * 864e5)]);
    const c = v => { const s = v === null || v === undefined ? '' : (typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v) : v instanceof Date ? v.toISOString() : String(v));
      return /^[=+\-@\t\r]/.test(s) ? `"'${s.replace(/"/g, '""')}"` : `"${s.replace(/"/g, '""')}"`; };   // sin fórmulas al abrir en Excel
    const csv = ['momento,evento,correo,institucion,alcaldia_cve,detalle'].concat(rows.map(x => [x.momento, x.evento, x.correo, x.institucion, x.alcaldia_cve, x.detalle].map(c).join(','))).join('\r\n');
    res.set('Content-Type', 'text/csv; charset=utf-8').set('Content-Disposition', 'attachment; filename="usos_calles_prioritarias.csv"').send('﻿' + csv);
  } catch (e) { next(e); } });

  // depuración diaria de lo vencido (además puede programarse en el servidor: SELECT calles.depurar();)
  if (opciones.depurarCadaHoras !== 0) { const t = setInterval(() => q('SELECT calles.depurar()').catch(() => {}), (opciones.depurarCadaHoras || 24) * 3600e3); t.unref(); }
  // errores: nunca se muestra el detalle a la persona
  r.use((err, req, res, next) => { console.error('[calles]', err); if (!res.headersSent) res.status(500).json({ error: 'Ocurrió un error. Inténtalo de nuevo.' }); });
  return r;
};
module.exports.ALCALDIAS = ALCALDIAS;
