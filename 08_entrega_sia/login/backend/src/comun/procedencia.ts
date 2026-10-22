import type { Request } from "express";

/* ============================================================
   SOLO PARA LAS PRUEBAS, LA REVISIÓN DE TIPOS Y LA DEMOSTRACIÓN LOCALES.
   En sia-backend se usa el src/comun/procedencia.ts propio del SIA, que
   descarta los saltos conocidos (el intermediario de entrada del SIA y nginx). Este archivo NO va
   en el paquete de entrega (empaquetar.py no copia src/comun/).
   ============================================================
   IP de quien hace la petición, para seguridad y forense (no es identidad).
   Recorre X-Forwarded-For de derecha a izquierda: la entrada de más a la
   derecha la escribe el proxy más cercano. Se saltan las direcciones de
   SIA_SALTOS_CONOCIDOS (IP separadas por coma) y se toma la primera que no
   sea un salto conocido. Sin X-Forwarded-For válido, la dirección directa. */
const IP = /^[0-9a-fA-F.:]{3,45}$/;

export function ipDeOrigen(req: Request): string | null {
  const conocidos = new Set((process.env.SIA_SALTOS_CONOCIDOS ?? "").split(",").map((s) => s.trim()).filter(Boolean));
  const xff = req.header("x-forwarded-for");
  if (typeof xff === "string" && xff.trim() !== "") {
    const partes = xff.split(",").map((s) => s.trim()).filter(Boolean);
    for (let i = partes.length - 1; i >= 0; i--) {
      if (conocidos.has(partes[i])) continue;
      if (IP.test(partes[i])) return partes[i];
      break;
    }
  }
  const directa = req.socket.remoteAddress;
  return directa && IP.test(directa) ? directa : null;
}
