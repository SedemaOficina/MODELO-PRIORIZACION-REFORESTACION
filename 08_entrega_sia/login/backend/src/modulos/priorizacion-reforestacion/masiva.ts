/* ============================================================
   Alta masiva de cuentas desde CSV
   ============================================================
   Lectura del CSV, revisión por renglón y alta. La usa el panel de
   administración (POST /admin/usuarios/masiva). Acepta lo que guarda Excel:
   coma o punto y coma, con o sin BOM, campos entre comillas.
   ============================================================ */
import type pg from "pg";
import { huellaTemporal, temporal } from "./contrasenas";
import { ALCALDIAS } from "./alcaldias";

/** Lo mismo que revisa el alta individual (rutas.ts): nombre de 120 caracteres o menos que no empiece con = + - @, y correo de ASCII visible. */
const NOMBRE_MAX = 120;
const nombreMalo = (n: string) => n.length > NOMBRE_MAX || /^[=+\-@\t\r]/.test(n);
const CORREO_RE = /^[\x21-\x3f\x41-\x7e]+@[\x21-\x3f\x41-\x7e]+\.[\x21-\x3f\x41-\x7e]+$/;

/** Tipos de institución (fijos). Fuera de las alcaldías, cada cuenta lleva una entrada del catálogo de ese tipo (catalogo_entidades). */
export type Institucion = "Alcaldía" | "Gobierno Central" | "Organización de la sociedad civil" | "Privado" | "Otra";
export const INSTITUCIONES: readonly Institucion[] = ["Alcaldía", "Gobierno Central", "Organización de la sociedad civil", "Privado", "Otra"];
export const TIPOS_CATALOGO: readonly Institucion[] = INSTITUCIONES.filter((x) => x !== "Alcaldía");
export type Rol = "usuario" | "admin";
export interface Entidad { id: number; tipo: string; nombre: string; activo: boolean }
export interface CuentaNueva { correo: string; nombre: string; area: string; cargo: string; institucion: Institucion; alcaldia_cve: string | null; entidad_id: number | null; rol: Rol }
export type Renglon = Record<string, string>;

export const norm = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const POR_NOMBRE: Record<string, string> = Object.fromEntries(Object.entries(ALCALDIAS).map(([k, v]) => [norm(v), k]));

export function leeCsv(entrada: string): Renglon[] {
  const texto = entrada.replace(/^﻿/, "");
  const primera = texto.split(/\r?\n/)[0];
  const sep = (primera.match(/;/g) ?? []).length > (primera.match(/,/g) ?? []).length ? ";" : ",";
  const filas: string[][] = []; let f: string[] = [], c = "", q = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (q) { if (ch === '"' && texto[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === sep) { f.push(c); c = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && texto[i + 1] === "\n") i++; f.push(c); filas.push(f); f = []; c = ""; }
    else c += ch;
  }
  if (c !== "" || f.length) { f.push(c); filas.push(f); }
  const enc = (filas.shift() ?? []).map(norm);
  return filas.filter((r) => r.some((x) => x.trim())).map((r) => Object.fromEntries(enc.map((h, i) => [h, (r[i] ?? "").trim()])));
}

/** Revisa cada renglón contra el catálogo (solo sus entradas activas). Devuelve las cuentas válidas y los errores con su número de
 *  renglón (el encabezado es el 1). «SEDEMA» como institución, como en las plantillas anteriores a la v1.49, es Gobierno Central · SEDEMA. */
export function revisa(renglones: Renglon[], catalogo: Entidad[] = []): { ok: CuentaNueva[]; errores: string[] } {
  const ok: CuentaNueva[] = [], errores: string[] = [], vistos = new Set<string>();
  renglones.forEach((r, i) => {
    const n = i + 2, e: string[] = [];
    const correo = (r.correo ?? "").toLowerCase();
    if (!CORREO_RE.test(correo)) e.push("correo no válido");
    if (vistos.has(correo)) e.push("correo repetido en el archivo");
    vistos.add(correo);
    if (!r.nombre) e.push("falta el nombre");
    else if (nombreMalo(r.nombre)) e.push(`el nombre debe tener a lo más ${NOMBRE_MAX} caracteres y no empezar con = + - @`);
    for (const [k, txt] of [["area", "el área"], ["cargo", "el cargo"]] as const) {
      if (!r[k]) e.push(`falta ${txt}`);
      else if (nombreMalo(r[k])) e.push(`${txt} debe tener a lo más ${NOMBRE_MAX} caracteres y no empezar con = + - @`);
    }
    const sedema = norm(r.institucion) === "sedema";
    const inst = sedema ? "Gobierno Central" : INSTITUCIONES.find((x) => norm(x) === norm(r.institucion || "Alcaldía"));
    if (!inst) e.push(`institución «${r.institucion}» no válida (${INSTITUCIONES.join(", ")})`);
    const ent = r.dependencia_u_organizacion || (sedema ? "SEDEMA" : "");
    let entidad: number | null = null;
    if (inst && inst !== "Alcaldía") {
      const hallada = catalogo.find((c) => c.activo && c.tipo === inst && norm(c.nombre) === norm(ent));
      if (!ent) e.push(`falta la dependencia u organización (${inst})`);
      else if (!hallada) e.push(`«${ent}» no está en el catálogo de ${inst}: agrégalo en «Catálogos»`);
      else entidad = hallada.id;
    } else if (ent) e.push("una cuenta de alcaldía no lleva dependencia u organización");
    const a = r.alcaldia;
    const alc = a ? (ALCALDIAS[a.padStart(3, "0")] ? a.padStart(3, "0") : POR_NOMBRE[norm(a)] ?? null) : null;
    if (a && !alc) e.push(`alcaldía «${a}» no reconocida`);
    if (inst === "Alcaldía" && !alc) e.push("una cuenta de alcaldía necesita su alcaldía");
    if (inst && inst !== "Alcaldía" && alc) e.push("solo las cuentas de alcaldía llevan alcaldía");
    const rr = norm(r.rol || "usuario");
    const rol: Rol | null = rr === "admin" || rr === "administracion" ? "admin" : rr === "usuario" || rr === "consulta" ? "usuario" : null;
    if (!rol) e.push(`rol «${r.rol}» no válido (usuario o admin)`);
    if (e.length || !inst || !rol) errores.push(`Renglón ${n} (${r.correo || "sin correo"}): ${e.join("; ")}`);
    else ok.push({ correo, nombre: r.nombre, area: r.area, cargo: r.cargo, institucion: inst, alcaldia_cve: alc, entidad_id: entidad, rol });
  });
  return { ok, errores };
}

/** Da de alta las cuentas nuevas. Una cuenta que ya existe no se toca (ni su contraseña): correr el alta dos veces no cambia nada.
 *  Todo el envío va en una transacción: si algo falla a la mitad no queda ninguna cuenta creada sin que su contraseña llegue a quien
 *  administra. Las huellas se calculan antes de abrir la transacción, para no tenerla abierta mientras se calculan. */
export async function aplica(pool: pg.Pool, cuentas: CuentaNueva[], autor: number | null = null) {
  const hechas: (CuentaNueva & { contrasena_temporal: string })[] = [], existentes: string[] = [];
  const claves = cuentas.map(() => temporal()), huellas = await Promise.all(claves.map((k) => huellaTemporal(k)));
  const cl = await pool.connect();
  try {
    await cl.query("BEGIN");
    for (const [i, c] of cuentas.entries()) {
      if ((await cl.query("SELECT 1 FROM priorizacion_reforestacion.usuarios WHERE correo = $1", [c.correo])).rows.length) { existentes.push(c.correo); continue; }
      // ON CONFLICT: si otra persona da de alta el mismo correo a la vez, esta no falla: la cuenta sale como «ya existía»
      const { rows } = await cl.query<{ id: number }>(
        `INSERT INTO priorizacion_reforestacion.usuarios (correo, nombre, area, cargo, institucion, alcaldia_cve, entidad_id, rol, huella, debe_cambiar, temporal_desde)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, now()) ON CONFLICT (correo) DO NOTHING RETURNING id`,
        [c.correo, c.nombre, c.area, c.cargo, c.institucion, c.alcaldia_cve, c.entidad_id, c.rol, huellas[i]]);
      if (!rows[0]) { existentes.push(c.correo); continue; }
      await cl.query(`INSERT INTO priorizacion_reforestacion.bitacora (usuario_id, evento, detalle) VALUES ($1, 'admin', $2)`,
        [autor, JSON.stringify({ accion: "alta_masiva", usuario: rows[0].id })]);
      hechas.push({ ...c, contrasena_temporal: claves[i] });
    }
    await cl.query("COMMIT");
  } catch (e) { await cl.query("ROLLBACK").catch(() => {}); throw e; } finally { cl.release(); }
  return { hechas, existentes };
}
