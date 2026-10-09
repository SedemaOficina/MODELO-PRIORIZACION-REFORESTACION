/* ============================================================
   Huellas de contraseña con scrypt
   ============================================================
   scrypt viene en Node: no hay dependencias nativas que compilar en el
   servidor. Formato guardado: scrypt$N$r$p$sal_base64$huella_base64.
   Parámetros según OWASP (N = 2^17, r = 8, p = 1). Es asíncrono: un inicio de
   sesión no detiene a los demás módulos del backend.
   ============================================================ */
import { randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

/** PRIORIZACION_REFORESTACION_SCRYPT_N solo existe para que las pruebas corran rápido. */
const N = Number(process.env.PRIORIZACION_REFORESTACION_SCRYPT_N) || 2 ** 17;
const R = 8, P = 1, LARGO = 64;
const opciones = (n: number, r: number, p: number): ScryptOptions => ({ N: n, r, p, maxmem: 256 * n * r + 1024 * 1024 });

function scrypt(clave: string, sal: Buffer, largo: number, op: ScryptOptions): Promise<Buffer> {
  return new Promise((ok, falla) => scryptCb(clave, sal, largo, op, (e, h) => (e ? falla(e) : ok(h))));
}

export async function huella(contrasena: string): Promise<string> {
  const sal = randomBytes(16);
  const h = await scrypt(contrasena.normalize("NFC"), sal, LARGO, opciones(N, R, P));
  return ["scrypt", N, R, P, sal.toString("base64"), h.toString("base64")].join("$");
}

export async function verifica(contrasena: unknown, guardada: string | null | undefined): Promise<boolean> {
  const [alg, n, r, p, sal, h] = String(guardada ?? "").split("$");
  if (alg !== "scrypt" || !sal || !h) return false;
  const esperado = Buffer.from(h, "base64");
  const calculado = await scrypt(String(contrasena).normalize("NFC"), Buffer.from(sal, "base64"), esperado.length, opciones(+n, +r, +p));
  return timingSafeEqual(esperado, calculado);
}

/** Reglas mínimas: 12 caracteres o más y que no contenga el correo. Frases largas mejor que símbolos raros (NIST 800-63B). */
export function revisaNueva(nueva: unknown, correo: string | null | undefined): string | null {
  if (typeof nueva !== "string" || [...nueva].length < 12) return "La contraseña debe tener al menos 12 caracteres.";
  if ([...nueva].length > 200) return "La contraseña es demasiado larga.";
  if (correo && nueva.toLowerCase().includes(String(correo).split("@")[0].toLowerCase())) return "La contraseña no debe contener tu correo.";
  return null;
}

/** Contraseña temporal para altas y restablecimientos: cuatro palabras cortas y dos dígitos, fácil de dictar. */
const PALABRAS = ["arbol", "cedro", "fresno", "jacaranda", "ahuehuete", "colorin", "pirul", "trueno", "encino", "ocote", "sauce", "tabachin",
  "banqueta", "calle", "colonia", "sombra", "raiz", "hoja", "semilla", "brote", "lluvia", "viento", "piedra", "monte"];
export function temporal(): string {
  const p = () => PALABRAS[randomInt(PALABRAS.length)];
  return `${p()}-${p()}-${p()}-${p()}-${randomInt(10, 100)}`;
}
