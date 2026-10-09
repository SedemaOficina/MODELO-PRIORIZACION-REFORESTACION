import type { Request } from "express";

/* Mismo criterio que los módulos caec y caec_uto del backend: la ÚLTIMA entrada
   de X-Forwarded-For la escribe el proxy más cercano (nginx), que es el único
   eslabón que no elige quien llama. Sin esto, todas las peticiones parecerían
   venir de nginx y el límite de intentos por IP bloquearía a todo el mundo a la
   vez. Sirve para seguridad y forense, NO es identidad. */
export function ipDeOrigen(req: Request): string | null {
  const xff = req.header("x-forwarded-for");
  if (typeof xff === "string" && xff.trim() !== "") {
    const partes = xff.split(",").map((s) => s.trim()).filter(Boolean);
    const ultima = partes[partes.length - 1];
    if (ultima && /^[0-9a-fA-F.:]{3,45}$/.test(ultima)) return ultima;
  }
  const directa = req.socket.remoteAddress;
  return directa && /^[0-9a-fA-F.:]{3,45}$/.test(directa) ? directa : null;
}
