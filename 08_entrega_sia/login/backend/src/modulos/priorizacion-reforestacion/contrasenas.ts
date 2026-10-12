/* ============================================================
   Huellas de contraseña con scrypt
   ============================================================
   scrypt viene en Node: no hay dependencias nativas que compilar en el
   servidor. Formato guardado: scrypt$N$r$p$sal_base64$huella_base64. Cada
   huella lleva sus parámetros, así que cambiarlos aquí no invalida las ya
   guardadas: verifica() usa los de cada una.
   - Contraseña definitiva: N = 2^14, r = 8, p = 5. Equivale en costo a la
     recomendación de OWASP (N = 2^17, r = 8, p = 1) con 16 MiB de memoria por
     cálculo en lugar de 128 MiB.
   - Contraseña temporal (altas, restablecimientos, alta masiva y primera
     cuenta): N = 2^14, r = 8, p = 1. Se cambia en el primer acceso, y así un
     alta masiva no detiene al backend.
   Es asíncrono: un inicio de sesión no detiene a los demás módulos del backend.
   ============================================================ */
import { randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

/** PRIORIZACION_REFORESTACION_SCRYPT_N solo existe para que las pruebas corran rápido. */
const N = Number(process.env.PRIORIZACION_REFORESTACION_SCRYPT_N) || 2 ** 14;
const R = 8, LARGO = 64;
export const PARAMETROS = { definitiva: { n: N, r: R, p: 5 }, temporal: { n: N, r: R, p: 1 } } as const;
type Parametros = { n: number; r: number; p: number };
const opciones = ({ n, r, p }: Parametros): ScryptOptions => ({ N: n, r, p, maxmem: 256 * n * r + 1024 * 1024 });

/* Límites al leer una huella guardada: un valor alterado en la base no puede pedir memoria ni tiempo desmedidos.
   Admiten las huellas de N = 2^17, r = 8, p = 1 (128 MiB) y las definitivas de p = 5. */
const esPotencia2 = (x: number) => Number.isInteger(x) && x > 1 && (x & (x - 1)) === 0;
function admisibles(n: number, r: number, p: number): boolean {
  return esPotencia2(n) && n >= 2 ** 10 && n <= 2 ** 17
    && Number.isInteger(r) && r >= 1 && r <= 16
    && Number.isInteger(p) && p >= 1 && p <= 5
    && 128 * n * r <= 128 * 1024 * 1024   // memoria
    && n * r * p <= 2 ** 20;              // tiempo
}

function scrypt(clave: string, sal: Buffer, largo: number, op: ScryptOptions): Promise<Buffer> {
  return new Promise((ok, falla) => scryptCb(clave, sal, largo, op, (e, h) => (e ? falla(e) : ok(h))));
}

async function calcula(contrasena: string, par: Parametros): Promise<string> {
  const sal = randomBytes(16);
  const h = await scrypt(contrasena.normalize("NFC"), sal, LARGO, opciones(par));
  return ["scrypt", par.n, par.r, par.p, sal.toString("base64"), h.toString("base64")].join("$");
}

/** Huella de una contraseña elegida por la persona. */
export const huella = (contrasena: string) => calcula(contrasena, PARAMETROS.definitiva);
/** Huella de una contraseña temporal (debe cambiarse al entrar). */
export const huellaTemporal = (contrasena: string) => calcula(contrasena, PARAMETROS.temporal);

export async function verifica(contrasena: unknown, guardada: string | null | undefined): Promise<boolean> {
  const partes = String(guardada ?? "").split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return false;
  const [, n, r, p, sal, h] = partes;
  if (!/^\d{1,7}$/.test(n) || !/^\d{1,2}$/.test(r) || !/^\d{1,2}$/.test(p) || !admisibles(+n, +r, +p)) return false;
  if (!/^[A-Za-z0-9+/=]{4,88}$/.test(sal) || !/^[A-Za-z0-9+/=]{4,176}$/.test(h)) return false;
  const esperado = Buffer.from(h, "base64");
  if (esperado.length < 16 || esperado.length > 128) return false;
  const calculado = await scrypt(String(contrasena).normalize("NFC"), Buffer.from(sal, "base64"), esperado.length, opciones({ n: +n, r: +r, p: +p }));
  return timingSafeEqual(esperado, calculado);
}

/** Para un correo que no existe o una cuenta detenida: el mismo trabajo que verificar una contraseña definitiva,
 *  así el tiempo de respuesta no delata si la cuenta existe. */
let ficticia: Promise<string> | null = null;
export async function verificaFicticia(contrasena: unknown): Promise<void> {
  ficticia ??= huella(randomBytes(12).toString("base64url"));
  await verifica(contrasena, await ficticia);
}

/** Reglas mínimas: 12 caracteres o más y que no contenga el correo. Frases largas mejor que símbolos raros (NIST 800-63B). */
export function revisaNueva(nueva: unknown, correo: string | null | undefined): string | null {
  if (typeof nueva !== "string" || [...nueva].length < 12) return "La contraseña debe tener al menos 12 caracteres.";
  if ([...nueva].length > 200) return "La contraseña es demasiado larga.";
  if (correo && nueva.toLowerCase().includes(String(correo).split("@")[0].toLowerCase())) return "La contraseña no debe contener tu correo.";
  return null;
}

/** Contraseña temporal para altas, restablecimientos, alta masiva y primera cuenta: cuatro palabras cortas y dos dígitos, fácil de dictar. */
const PALABRAS = ["arbol", "cedro", "fresno", "jacaranda", "ahuehuete", "colorin", "pirul", "trueno", "encino", "ocote", "sauce", "tabachin",
  "banqueta", "calle", "colonia", "sombra", "raiz", "hoja", "semilla", "brote", "lluvia", "viento", "piedra", "monte"];
export function temporal(): string {
  const p = () => PALABRAS[randomInt(PALABRAS.length)];
  return `${p()}-${p()}-${p()}-${p()}-${randomInt(10, 100)}`;
}
