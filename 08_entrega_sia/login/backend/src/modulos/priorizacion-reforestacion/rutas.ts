import express, { type ErrorRequestHandler, type NextFunction, type Request, type RequestHandler, type Response, type Router } from "express";
import { createHash, randomBytes } from "node:crypto";
import type pg from "pg";
import { huella, revisaNueva, temporal, verifica } from "./contrasenas";
import { ALCALDIAS, nombreAlcaldia } from "./alcaldias";
import { aplica, INSTITUCIONES, leeCsv, revisa, type CuentaNueva } from "./masiva";
import { ipDeOrigen } from "./procedencia";

/* ============================================================
   Módulo Modelo de priorización de reforestación urbana · acceso y usos
   ============================================================
   Frontera propia y pool propio: entra como `priorizacion_reforestacion_api`,
   que solo alcanza el esquema `priorizacion_reforestacion`
   (db/priorizacion_reforestacion/02-…-rol-y-grants.sql).

   Qué hace:
   - Controla quién entra a la herramienta: cuentas dadas de alta por
     administración, contraseñas con huella scrypt y bloqueo por intentos.
   - Es la puerta de nginx: `GET /sesion` responde 204 o 401 a `auth_request`
     antes de entregar cualquier archivo de /priorizacion-reforestacion/.
   - Registra los usos (accesos, visitas, consultas y descargas) para saber qué
     instituciones y alcaldías usan la herramienta.

   El aviso de privacidad se publica en
   /acceso/priorizacion-reforestacion/aviso-de-privacidad.html. El registro es parte
   del acceso: este módulo NO trae interruptor de captura, porque apagado nadie
   podría entrar a la herramienta.

   Montaje (src/index.ts):
     app.use("/api/priorizacion-reforestacion", crearRutasPriorizacionReforestacion(poolPriorizacionReforestacion));
   ============================================================ */

export interface Opciones {
  /** Procedencias aceptadas en peticiones que cambian algo (varias, separadas por coma). */
  origen: string;
  /** Solo la demostración local (HTTP) la apaga: en producción la cookie siempre va con Secure. */
  cookieSegura: boolean;
  rutaHerramienta: string;
  rutaAcceso: string;
  /** La sesión se cierra tras este tiempo sin actividad… */
  inactividadMin: number;
  /** …y, en todo caso, a los N días. */
  maximoDias: number;
  intentosMax: number;
  bloqueoMin: number;
  /** Una visita a la página se anota a lo más cada N minutos por sesión. */
  visitaCadaMin: number;
  /** 0 apaga la depuración periódica (para pruebas); la base también puede correrla sola. */
  depurarCadaHoras: number;
}

const OPCIONES: Opciones = {
  origen: process.env.PRIORIZACION_REFORESTACION_ORIGEN || "https://sedema.sia.cdmx.gob.mx",
  cookieSegura: true,
  rutaHerramienta: "/priorizacion-reforestacion/",
  rutaAcceso: "/acceso/priorizacion-reforestacion/",
  inactividadMin: 12 * 60,
  maximoDias: 7,
  intentosMax: 5,
  bloqueoMin: 15,
  visitaCadaMin: 30,
  depurarCadaHoras: 24,
};

const COOKIE = "priorizacion_reforestacion_sesion";
const EVENTOS_USO = ["consulta", "descarga"] as const;
const CAMPOS_USO = ["red", "alcaldia", "colonia", "avenida", "calle", "banqueta", "archivo", "tipo"] as const;
const LIMPIO = /^[\p{L}\p{N} .,;:()«»'_\-·/]{0,160}$/u;

interface Usuario {
  id: number; correo: string; nombre: string; institucion: string; alcaldia_cve: string | null; rol: "usuario" | "admin";
  activo: boolean; huella: string; debe_cambiar: boolean; intentos_fallidos: number; bloqueado_hasta: Date | null;
  creado: Date; actualizado: Date; ultimo_acceso: Date | null; baja: Date | null;
}
interface Sesion extends Pick<Usuario, "id" | "correo" | "nombre" | "rol" | "activo" | "institucion" | "alcaldia_cve" | "debe_cambiar"> {
  token_huella: string; ultima_actividad: Date; expira: Date; ultima_visita: Date | null;
}

const huellaToken = (t: string) => createHash("sha256").update(t).digest("hex");
const cuerpo = (req: Request): Record<string, unknown> => (req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {});
const texto = (v: unknown) => (typeof v === "string" ? v : "");
/** La sesión que dejó `conSesion` en res.locals. */
const usuarioDe = (res: Response) => res.locals.usuario as Sesion;

export function crearRutasPriorizacionReforestacion(pool: pg.Pool, opciones: Partial<Opciones> = {}): Router {
  const o: Opciones = { ...OPCIONES, ...opciones };
  const r = express.Router();
  const json = express.json({ limit: "8kb" });

  const anota = (usuario_id: number | null, evento: string, detalle: object | null, req: Request | null) =>
    pool.query("INSERT INTO priorizacion_reforestacion.bitacora (usuario_id, evento, detalle, ip) VALUES ($1, $2, $3, $4)",
      [usuario_id, evento, detalle ? JSON.stringify(detalle) : null, req ? ipDeOrigen(req) : null]);

  const leeCookie = (req: Request): string | null => {
    const m = (req.get("cookie") ?? "").split(/;\s*/).find((x) => x.startsWith(COOKIE + "="));
    return m ? decodeURIComponent(m.slice(COOKIE.length + 1)) : null;
  };
  const ponCookie = (res: Response, valor: string, maxSeg: number) => res.append("Set-Cookie",
    `${COOKIE}=${valor}; Path=/; HttpOnly;${o.cookieSegura ? " Secure;" : ""} SameSite=Lax; Max-Age=${maxSeg}`);
  /** Dirección de regreso tras entrar: solo dentro de la herramienta, nunca a otro sitio. */
  const volverSeguro = (v: unknown) =>
    typeof v === "string" && v.startsWith(o.rutaHerramienta) && !v.startsWith("//") && !/[\r\n\\]/.test(v) ? v : o.rutaHerramienta;

  async function sesion(req: Request): Promise<Sesion | null> {
    const t = leeCookie(req);
    if (!t || t.length > 200) return null;
    const { rows } = await pool.query<Sesion>(
      `SELECT s.token_huella, s.ultima_actividad, s.expira, s.ultima_visita, u.id, u.correo, u.nombre, u.rol, u.activo, u.institucion, u.alcaldia_cve, u.debe_cambiar
         FROM priorizacion_reforestacion.sesiones s JOIN priorizacion_reforestacion.usuarios u ON u.id = s.usuario_id
        WHERE s.token_huella = $1`, [huellaToken(t)]);
    const s = rows[0], ahora = Date.now();
    if (!s || !s.activo || new Date(s.expira).getTime() < ahora || ahora - new Date(s.ultima_actividad).getTime() > o.inactividadMin * 60000) return null;
    return s;
  }

  /* Las peticiones que cambian algo deben venir de la propia procedencia (protección contra solicitudes cruzadas). */
  const origenes = o.origen.split(",").map((s) => s.trim()).filter(Boolean);
  const mismaProcedencia: RequestHandler = (req, res, next) => {
    const or = req.get("origin");
    if (or && !origenes.includes(or)) { res.status(403).json({ error: "Procedencia no permitida." }); return; }
    next();
  };
  const conSesion = (rol?: "admin"): RequestHandler => async (req, res, next) => {
    const s = await sesion(req);
    if (!s) { res.status(401).json({ error: "Tu sesión terminó. Vuelve a iniciar sesión para continuar." }); return; }
    if (rol && s.rol !== rol) { res.status(403).json({ error: "No tienes permiso para esta sección." }); return; }
    res.locals.usuario = s;
    next();
  };

  /* Límite por IP para los intentos de acceso, además del bloqueo por cuenta en la base. La IP sale de ipDeOrigen. */
  const intentos = new Map<string, number[]>();
  const limiteIp: RequestHandler = (req, res, next) => {
    const k = ipDeOrigen(req) ?? "?", ahora = Date.now();
    const a = (intentos.get(k) ?? []).filter((t) => ahora - t < 15 * 60000);
    if (a.length >= 30) { res.status(429).json({ error: "Demasiados intentos desde esta red. Espera unos minutos." }); return; }
    a.push(ahora); intentos.set(k, a);
    if (intentos.size > 5000) intentos.clear();
    next();
  };

  // ---------- entrar ----------
  r.post("/entrar", mismaProcedencia, limiteIp, json, async (req, res) => {
    const b = cuerpo(req);
    const correo = texto(b.correo).trim().toLowerCase(), contrasena = texto(b.contrasena);
    const NO = () => res.status(401).json({ error: "El correo o la contraseña no son correctos." });   // mismo mensaje exista o no el correo
    const { rows } = await pool.query<Usuario>("SELECT * FROM priorizacion_reforestacion.usuarios WHERE correo = $1", [correo]);
    const u = rows[0];
    if (!u || !u.activo) { await huella("x".repeat(12)); await anota(null, "acceso_fallido", { motivo: "correo" }, req); NO(); return; }   // mismo tiempo de respuesta
    if (u.bloqueado_hasta && new Date(u.bloqueado_hasta).getTime() > Date.now()) {
      res.status(423).json({ error: `Por seguridad, el acceso con esta cuenta está detenido unos minutos tras ${o.intentosMax} intentos fallidos. Inténtalo más tarde.` });
      return;
    }
    if (!(await verifica(contrasena, u.huella))) {
      const n = u.intentos_fallidos + 1, bloquea = n >= o.intentosMax;
      await pool.query("UPDATE priorizacion_reforestacion.usuarios SET intentos_fallidos = $1, bloqueado_hasta = $2 WHERE id = $3",
        [bloquea ? 0 : n, bloquea ? new Date(Date.now() + o.bloqueoMin * 60000) : null, u.id]);
      await anota(u.id, "acceso_fallido", { bloqueo: bloquea }, req);
      NO(); return;
    }
    const token = randomBytes(32).toString("base64url");
    await pool.query("INSERT INTO priorizacion_reforestacion.sesiones (token_huella, usuario_id, expira) VALUES ($1, $2, $3)",
      [huellaToken(token), u.id, new Date(Date.now() + o.maximoDias * 864e5)]);
    await pool.query("UPDATE priorizacion_reforestacion.usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_acceso = now() WHERE id = $1", [u.id]);
    await anota(u.id, "acceso", null, req);
    ponCookie(res, token, o.maximoDias * 86400);
    res.json({ ok: true, debe_cambiar: u.debe_cambiar, volver: volverSeguro(b.volver) });
  });

  // ---------- verificación para nginx (auth_request): 204 con sesión válida, 401 sin ella. Es la puerta de toda la herramienta ----------
  r.get("/sesion", async (req, res) => {
    const s = await sesion(req);
    if (!s || s.debe_cambiar) { res.status(401).end(); return; }   // con contraseña temporal no se entra: primero se cambia
    const ahora = new Date(), uri = (req.get("x-original-uri") ?? "").split("?")[0];
    const esPagina = uri === o.rutaHerramienta || uri === o.rutaHerramienta + "index.html";
    const visita = esPagina && (!s.ultima_visita || ahora.getTime() - new Date(s.ultima_visita).getTime() > o.visitaCadaMin * 60000);
    // la actividad se actualiza a lo más una vez por minuto: nginx pregunta por cada archivo
    if (ahora.getTime() - new Date(s.ultima_actividad).getTime() > 60000 || visita)
      await pool.query("UPDATE priorizacion_reforestacion.sesiones SET ultima_actividad = $1" + (visita ? ", ultima_visita = $1" : "") + " WHERE token_huella = $2",
        [ahora, s.token_huella]);
    if (visita) await anota(s.id, "visita", null, req);
    res.set("X-Priorizacion-Usuario", String(s.id)).status(204).end();
  });

  // ---------- salir: por enlace (GET, desde «Salir» en la herramienta) o por formulario ----------
  const salir: RequestHandler = async (req, res) => {
    const t = leeCookie(req);
    if (t) {
      const { rows } = await pool.query<{ usuario_id: number }>("DELETE FROM priorizacion_reforestacion.sesiones WHERE token_huella = $1 RETURNING usuario_id", [huellaToken(t)]);
      if (rows[0]) await anota(rows[0].usuario_id, "salida", null, req);
    }
    ponCookie(res, "", 0);
    res.redirect(303, o.rutaAcceso + "?salida=1");
  };
  r.get("/salir", salir);
  r.post("/salir", mismaProcedencia, salir);

  // ---------- quién soy (pantalla de acceso y panel) ----------
  r.get("/yo", async (req, res) => {
    const s = await sesion(req);
    if (!s) { res.status(401).json({ error: "Sin sesión." }); return; }
    res.json({ correo: s.correo, nombre: s.nombre, rol: s.rol, institucion: s.institucion, alcaldia_cve: s.alcaldia_cve, alcaldia: nombreAlcaldia(s.alcaldia_cve), debe_cambiar: s.debe_cambiar });
  });

  // ---------- cambiar la contraseña (obligatorio con contraseña temporal) ----------
  r.post("/contrasena", mismaProcedencia, json, conSesion(), async (req, res) => {
    const yo = usuarioDe(res), b = cuerpo(req);
    const { rows } = await pool.query<Pick<Usuario, "huella" | "correo">>("SELECT huella, correo FROM priorizacion_reforestacion.usuarios WHERE id = $1", [yo.id]);
    if (!(await verifica(texto(b.actual), rows[0]?.huella))) { res.status(400).json({ error: "La contraseña actual no es correcta.", campo: "actual" }); return; }
    const err = revisaNueva(b.nueva, rows[0].correo);
    if (err) { res.status(400).json({ error: err, campo: "nueva" }); return; }
    await pool.query("UPDATE priorizacion_reforestacion.usuarios SET huella = $1, debe_cambiar = false, actualizado = now() WHERE id = $2", [await huella(texto(b.nueva)), yo.id]);
    await pool.query("DELETE FROM priorizacion_reforestacion.sesiones WHERE usuario_id = $1 AND token_huella <> $2", [yo.id, yo.token_huella]);   // cierra las demás sesiones
    await anota(yo.id, "cambio_contrasena", null, req);
    res.json({ ok: true, volver: volverSeguro(b.volver) });
  });

  // ---------- uso de la herramienta: consulta y descarga. Llega con navigator.sendBeacon, como texto ----------
  r.post("/uso", mismaProcedencia, express.text({ type: "*/*", limit: "4kb" }), conSesion(), async (req, res) => {
    let d: Record<string, unknown>;
    try { d = typeof req.body === "string" ? (JSON.parse(req.body) as Record<string, unknown>) : cuerpo(req); } catch { res.status(400).end(); return; }
    const evento = d?.evento;
    if (typeof evento !== "string" || !(EVENTOS_USO as readonly string[]).includes(evento)) { res.status(400).end(); return; }
    const det: Record<string, string> = {};   // solo campos conocidos y textos cortos: nunca se guarda lo que mande la página sin revisar
    for (const k of CAMPOS_USO) { const v = d[k]; if (typeof v === "string" && LIMPIO.test(v)) det[k] = v; }
    await anota(usuarioDe(res).id, evento, det, req);
    res.status(204).end();
  });

  // ================= administración (rol admin) =================
  const admin = conSesion("admin");
  const vistaUsuario = (u: Usuario) => ({
    id: u.id, correo: u.correo, nombre: u.nombre, institucion: u.institucion, alcaldia_cve: u.alcaldia_cve, alcaldia: nombreAlcaldia(u.alcaldia_cve),
    rol: u.rol, activo: u.activo, debe_cambiar: u.debe_cambiar, bloqueado: !!(u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date()),
    creado: u.creado, ultimo_acceso: u.ultimo_acceso,
  });
  const revisaDatos = (b: Record<string, unknown>, nuevo: boolean): string | null => {
    if (nuevo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto(b.correo).trim())) return "Escribe un correo válido.";
    if (nuevo && !texto(b.nombre).trim()) return "Escribe el nombre.";
    if (b.institucion !== undefined && !(INSTITUCIONES as readonly unknown[]).includes(b.institucion)) return "Institución no válida.";
    if (b.alcaldia_cve !== undefined && b.alcaldia_cve !== null && b.alcaldia_cve !== "" && !(typeof b.alcaldia_cve === "string" && ALCALDIAS[b.alcaldia_cve])) return "Alcaldía no válida.";
    if (b.rol !== undefined && b.rol !== "usuario" && b.rol !== "admin") return "Rol no válido.";
    if (b.nombre !== undefined && typeof b.nombre !== "string") return "Nombre no válido.";
    if (b.activo !== undefined && typeof b.activo !== "boolean") return "Estado no válido.";
    return null;
  };

  r.get("/admin/usuarios", admin, async (_req, res) => {
    const { rows } = await pool.query<Usuario>("SELECT * FROM priorizacion_reforestacion.usuarios ORDER BY activo DESC, institucion, alcaldia_cve, nombre");
    res.json(rows.map(vistaUsuario));
  });

  r.post("/admin/usuarios", mismaProcedencia, json, admin, async (req, res) => {
    const b = cuerpo(req), err = revisaDatos(b, true);
    if (err) { res.status(400).json({ error: err }); return; }
    const correo = texto(b.correo).trim().toLowerCase(), clave = temporal();
    if ((await pool.query("SELECT 1 FROM priorizacion_reforestacion.usuarios WHERE correo = $1", [correo])).rows.length) { res.status(409).json({ error: "Ya existe una cuenta con ese correo." }); return; }
    const { rows } = await pool.query<Usuario>(
      `INSERT INTO priorizacion_reforestacion.usuarios (correo, nombre, institucion, alcaldia_cve, rol, huella, debe_cambiar)
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
      [correo, texto(b.nombre).trim(), b.institucion ?? "Alcaldía", b.alcaldia_cve || null, b.rol ?? "usuario", await huella(clave)]);
    await anota(usuarioDe(res).id, "admin", { accion: "alta", usuario: rows[0].id }, req);
    res.status(201).json({ usuario: vistaUsuario(rows[0]), contrasena_temporal: clave });   // se muestra una sola vez
  });

  r.patch("/admin/usuarios/:id", mismaProcedencia, json, admin, async (req, res) => {
    const b = cuerpo(req), err = revisaDatos(b, false);
    if (err) { res.status(400).json({ error: err }); return; }
    const id = Number(req.params.id), yo = usuarioDe(res);
    if (id === yo.id && (b.activo === false || b.rol === "usuario")) { res.status(400).json({ error: "No puedes desactivarte ni quitarte el rol de administración a ti mismo." }); return; }
    const cambios: string[] = [], vals: unknown[] = [];
    for (const k of ["nombre", "institucion", "alcaldia_cve", "rol", "activo"] as const)
      if (b[k] !== undefined) { vals.push(k === "alcaldia_cve" ? b[k] || null : b[k]); cambios.push(`${k} = $${vals.length}`); }
    if (b.activo === false) cambios.push("baja = COALESCE(baja, now())");   // el plazo de 24 meses corre desde la baja
    else if (b.activo === true) cambios.push("baja = NULL");
    if (!cambios.length) { res.status(400).json({ error: "Nada que cambiar." }); return; }
    vals.push(id);
    const { rows } = await pool.query<Usuario>(`UPDATE priorizacion_reforestacion.usuarios SET ${cambios.join(", ")}, actualizado = now() WHERE id = $${vals.length} RETURNING *`, vals);
    if (!rows[0]) { res.status(404).json({ error: "No existe esa cuenta." }); return; }
    if (b.activo === false) await pool.query("DELETE FROM priorizacion_reforestacion.sesiones WHERE usuario_id = $1", [id]);   // una baja cierra sus sesiones al momento
    await anota(yo.id, "admin", { accion: b.activo === false ? "baja" : b.activo === true ? "reactivacion" : "cambio", usuario: id }, req);
    res.json(vistaUsuario(rows[0]));
  });

  r.post("/admin/usuarios/:id/restablecer", mismaProcedencia, admin, async (req, res) => {
    const clave = temporal(), id = Number(req.params.id);
    const { rows } = await pool.query<Usuario>(
      "UPDATE priorizacion_reforestacion.usuarios SET huella = $1, debe_cambiar = true, intentos_fallidos = 0, bloqueado_hasta = NULL, actualizado = now() WHERE id = $2 RETURNING *",
      [await huella(clave), id]);
    if (!rows[0]) { res.status(404).json({ error: "No existe esa cuenta." }); return; }
    await pool.query("DELETE FROM priorizacion_reforestacion.sesiones WHERE usuario_id = $1", [id]);
    await anota(usuarioDe(res).id, "admin", { accion: "restablecer", usuario: id }, req);
    res.json({ usuario: vistaUsuario(rows[0]), contrasena_temporal: clave });
  });

  /* Alta masiva desde el panel: primero se revisa (no escribe nada); con aplicar: true da de alta las válidas nuevas.
     Las contraseñas temporales vuelven una sola vez y el panel arma con ellas el CSV en el navegador: el servidor no lo guarda.
     Límite de 100 KB, igual que el express.json() general de sia-backend (unas 500 cuentas). */
  r.post("/admin/usuarios/masiva", mismaProcedencia, express.json({ limit: "100kb" }), admin, async (req, res) => {
    const b = cuerpo(req), csv = texto(b.csv);
    if (!csv.trim()) { res.status(400).json({ error: "El archivo está vacío." }); return; }
    let renglones;
    try { renglones = leeCsv(csv); } catch { res.status(400).json({ error: "No se pudo leer el archivo como CSV." }); return; }
    if (!renglones.length) { res.status(400).json({ error: "El archivo no tiene renglones después del encabezado." }); return; }
    if (!("correo" in renglones[0]) || !("nombre" in renglones[0])) { res.status(400).json({ error: "Faltan columnas: el encabezado debe decir correo, nombre, institucion, alcaldia, rol." }); return; }
    if (renglones.length > 500) { res.status(400).json({ error: "Máximo 500 cuentas por archivo: divídelo en partes." }); return; }
    const { ok, errores } = revisa(renglones);
    const existe = new Set<string>();
    for (const c of ok) if ((await pool.query("SELECT 1 FROM priorizacion_reforestacion.usuarios WHERE correo = $1", [c.correo])).rows.length) existe.add(c.correo);
    const vista = (c: CuentaNueva) => ({ correo: c.correo, nombre: c.nombre, institucion: c.institucion, alcaldia: nombreAlcaldia(c.alcaldia_cve), rol: c.rol, existe: existe.has(c.correo) });
    if (!b.aplicar || errores.length) { res.json({ aplicado: false, validas: ok.map(vista), errores }); return; }
    const yo = usuarioDe(res);
    const hecho = await aplica(pool, ok, yo.id);
    await anota(yo.id, "admin", { accion: "alta_masiva", altas: hecho.hechas.length }, req);
    res.json({ aplicado: true, hechas: hecho.hechas.map((c) => ({ ...vista(c), contrasena_temporal: c.contrasena_temporal })), existentes: hecho.existentes });
  });

  // ---------- reporte de usos: por institución y alcaldía de quien consulta, por persona y por tipo de descarga ----------
  r.get("/admin/usos", admin, async (req, res) => {
    const desde = new Date(texto(req.query.desde) || Date.now() - 90 * 864e5), hasta = new Date(texto(req.query.hasta) || Date.now());
    if (isNaN(desde.getTime()) || isNaN(hasta.getTime())) { res.status(400).json({ error: "Fechas no válidas." }); return; }
    const p = [desde, new Date(hasta.getTime() + 864e5)];
    type Fila = { institucion: string; alcaldia_cve: string | null; accesos: string; consultas: string; descargas: string; visitas?: string; personas?: string } & Record<string, unknown>;
    const porGrupo = await pool.query<Fila>(
      `SELECT u.institucion, u.alcaldia_cve, count(DISTINCT b.usuario_id) AS personas,
              sum(CASE WHEN b.evento = 'acceso' THEN 1 ELSE 0 END) AS accesos, sum(CASE WHEN b.evento = 'visita' THEN 1 ELSE 0 END) AS visitas,
              sum(CASE WHEN b.evento = 'consulta' THEN 1 ELSE 0 END) AS consultas, sum(CASE WHEN b.evento = 'descarga' THEN 1 ELSE 0 END) AS descargas
         FROM priorizacion_reforestacion.bitacora b JOIN priorizacion_reforestacion.usuarios u ON u.id = b.usuario_id
        WHERE b.momento >= $1 AND b.momento < $2
        GROUP BY u.institucion, u.alcaldia_cve ORDER BY descargas DESC, consultas DESC`, p);
    const porPersona = await pool.query<Fila>(
      `SELECT u.id, u.nombre, u.correo, u.institucion, u.alcaldia_cve, max(b.momento) AS ultimo,
              sum(CASE WHEN b.evento = 'acceso' THEN 1 ELSE 0 END) AS accesos, sum(CASE WHEN b.evento = 'consulta' THEN 1 ELSE 0 END) AS consultas,
              sum(CASE WHEN b.evento = 'descarga' THEN 1 ELSE 0 END) AS descargas
         FROM priorizacion_reforestacion.bitacora b JOIN priorizacion_reforestacion.usuarios u ON u.id = b.usuario_id
        WHERE b.momento >= $1 AND b.momento < $2
        GROUP BY u.id, u.nombre, u.correo, u.institucion, u.alcaldia_cve ORDER BY descargas DESC, consultas DESC`, p);
    const eventos = await pool.query<{ evento: string; detalle: unknown }>(
      `SELECT b.evento, b.detalle FROM priorizacion_reforestacion.bitacora b WHERE b.momento >= $1 AND b.momento < $2 AND b.evento IN ('consulta', 'descarga')`, p);
    // lo consultado y lo descargado, por alcaldía consultada (puede ser distinta de la de quien consulta) y por tipo de archivo
    const consultadas: Record<string, { consultas: number; descargas: number }> = {}, archivos: Record<string, number> = {};
    for (const e of eventos.rows) {
      const d = (typeof e.detalle === "string" ? JSON.parse(e.detalle) : e.detalle ?? {}) as Record<string, string>;
      const a = d.alcaldia || "Toda la ciudad";
      consultadas[a] ??= { consultas: 0, descargas: 0 };
      consultadas[a][e.evento === "consulta" ? "consultas" : "descargas"]++;
      if (e.evento === "descarga") { const t = d.tipo || "otro"; archivos[t] = (archivos[t] ?? 0) + 1; }
    }
    const nom = (f: Fila) => ({ ...f, alcaldia: nombreAlcaldia(f.alcaldia_cve), accesos: +f.accesos, consultas: +f.consultas, descargas: +f.descargas,
      visitas: f.visitas === undefined ? undefined : +f.visitas, personas: f.personas === undefined ? undefined : +f.personas });
    const cuenta = await pool.query<{ activas: string; total: string }>("SELECT sum(CASE WHEN activo THEN 1 ELSE 0 END) AS activas, count(*) AS total FROM priorizacion_reforestacion.usuarios");
    res.json({
      desde: p[0], hasta, cuentas: { activas: +cuenta.rows[0].activas, total: +cuenta.rows[0].total },
      por_grupo: porGrupo.rows.map(nom), por_persona: porPersona.rows.map(nom),
      alcaldias_consultadas: Object.entries(consultadas).map(([alcaldia, v]) => ({ alcaldia, ...v })).sort((a, b) => b.descargas - a.descargas || b.consultas - a.consultas),
      archivos: Object.entries(archivos).map(([tipo, n]) => ({ tipo, n })).sort((a, b) => b.n - a.n),
    });
  });

  // ---------- bitácora completa en CSV (sin IP: la IP solo se usa para seguridad) ----------
  r.get("/admin/usos.csv", admin, async (req, res) => {
    const { rows } = await pool.query<{ momento: Date; evento: string; correo: string | null; institucion: string | null; alcaldia_cve: string | null; detalle: unknown }>(
      `SELECT b.momento, b.evento, u.correo, u.institucion, u.alcaldia_cve, b.detalle
         FROM priorizacion_reforestacion.bitacora b LEFT JOIN priorizacion_reforestacion.usuarios u ON u.id = b.usuario_id
        WHERE b.momento >= $1 ORDER BY b.momento`, [new Date(texto(req.query.desde) || Date.now() - 90 * 864e5)]);
    const celda = (v: unknown) => {
      const s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v);
      return /^[=+\-@\t\r]/.test(s) ? `"'${s.replace(/"/g, '""')}"` : `"${s.replace(/"/g, '""')}"`;   // sin fórmulas al abrir en Excel
    };
    const csv = ["momento,evento,correo,institucion,alcaldia_cve,detalle"]
      .concat(rows.map((x) => [x.momento, x.evento, x.correo, x.institucion, x.alcaldia_cve, x.detalle].map(celda).join(","))).join("\r\n");
    res.set("Content-Type", "text/csv; charset=utf-8").set("Content-Disposition", 'attachment; filename="usos_priorizacion_reforestacion.csv"').send("﻿" + csv);
  });

  /* Depuración de lo vencido según los plazos del aviso de privacidad. También puede programarse en la base. */
  if (o.depurarCadaHoras > 0) {
    const t = setInterval(() => { pool.query("SELECT priorizacion_reforestacion.depurar()").catch((e: Error) => console.error("🔥 [PRIORIZACION_REFORESTACION] depuración:", e.message)); },
      o.depurarCadaHoras * 3600e3);
    t.unref();
  }

  /* Errores: a la persona nunca se le muestra el detalle; en el journal solo el mensaje, sin datos de la petición. */
  const errores: ErrorRequestHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const e = err as { type?: string; status?: number; message?: string };
    if (e?.type === "entity.too.large") { res.status(413).json({ error: "El archivo es demasiado grande." }); return; }
    if (e?.type === "entity.parse.failed") { res.status(400).json({ error: "La petición no es válida." }); return; }
    console.error("❌ [PRIORIZACION_REFORESTACION]", e?.message ?? err);
    if (!res.headersSent) res.status(500).json({ error: "Ocurrió un error. Inténtalo de nuevo." });
  };
  r.use(errores);
  return r;
}
