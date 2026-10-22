import type { Request } from "express";

/* ============================================================
   SOLO PARA LAS PRUEBAS, LA REVISIÓN DE TIPOS Y LA DEMOSTRACIÓN LOCALES.
   En sia-backend se usa el src/comun/procedencia.ts propio del SIA. Este
   archivo NO va en el paquete de entrega (empaquetar.py no copia src/comun/).
   Sigue el mismo criterio que el del SIA (vigente en el tablero de
   Categorías de protección ambiental desde el 21 de octubre de 2026):
   ============================================================
   IP de quien hace la petición, para seguridad y forense (no es identidad).
   · X-Forwarded-For solo vale si la petición llega de un intermediario propio
     (SIA_PROXIES_CONFIABLES, IP separadas por coma; por omisión, el mismo
     equipo). Si no, manda la dirección directa.
   · Se recorre de derecha a izquierda: la entrada de más a la derecha la
     escribe el intermediario más cercano; lo de la izquierda lo puede escribir
     quien llama. Se toma la primera que no sea de un intermediario propio. */
const IP = /^[0-9a-fA-F.:]{3,45}$/;

// «::ffff:198.51.100.1» y «198.51.100.1» son la misma dirección; lo que no tiene forma de dirección no sale (la columna es inet)
function normal(ip: string | undefined): string | null {
  const limpia = String(ip ?? "").trim().replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/i, "");
  return IP.test(limpia) ? limpia : null;
}

export function ipDeOrigen(req: Request): string | null {
  const propios = new Set((process.env.SIA_PROXIES_CONFIABLES ?? "127.0.0.1,::1").split(",").map((s) => s.trim()).filter(Boolean));
  const directa = normal(req.socket.remoteAddress);
  if (directa === null || !propios.has(directa)) return directa;
  const xff = req.header("x-forwarded-for");
  if (typeof xff !== "string") return directa;
  let candidata = directa;
  for (const parte of xff.split(",").reverse()) {
    const ip = normal(parte);
    if (ip === null) break;
    candidata = ip;
    if (!propios.has(ip)) break;
  }
  return candidata;
}
