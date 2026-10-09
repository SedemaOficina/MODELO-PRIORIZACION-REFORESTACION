// Permite correr el módulo TypeScript directo con Node (que quita los tipos) en las pruebas y la demostración.
// sia-backend importa sin extensión («./contrasenas») porque lo empaqueta tsup; Node exige la extensión, así que
// este cargador prueba con «.ts» cuando una importación relativa no la trae. Solo para desarrollo: no va al backend.
//   node --import ./pruebas/cargador.mjs …
import { register } from 'node:module';

register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(especificador, contexto, siguiente) {
  if (/^\\.{1,2}\\//.test(especificador) && !/\\.[cm]?[jt]s$/.test(especificador)) {
    try { return await siguiente(especificador + '.ts', contexto); } catch {}
  }
  return siguiente(especificador, contexto);
}`), import.meta.url);
