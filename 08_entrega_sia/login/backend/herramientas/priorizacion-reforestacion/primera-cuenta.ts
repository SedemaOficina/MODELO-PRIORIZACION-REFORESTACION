/* ============================================================
   Modelo de priorización · primera cuenta de administración
   ============================================================
   El servidor corre un solo binario, sin node_modules: un script con `pg` no
   tendría con qué conectarse allá. Así que esto NO se conecta a nada: genera el
   SQL del alta, para aplicarlo por el mismo camino que los demás SQL.

   Uso (Node 25 ejecuta TypeScript sin compilar), en la raíz de sia-backend:
     node herramientas/priorizacion-reforestacion/primera-cuenta.ts correo@sedema.cdmx.gob.mx "Nombre Apellido" > /tmp/primera-cuenta.sql

   - El SQL sale por la salida estándar; la contraseña temporal, por la de
     errores (pantalla), UNA sola vez. Al entrar, la herramienta pide cambiarla.
   - Si el correo ya existe, el INSERT no hace nada (ON CONFLICT DO NOTHING) y el
     NOTICE lo dice: entonces se usa «Restablecer» desde el panel.
   - Aplicar /tmp/primera-cuenta.sql con el mismo comando ssh + psql de
     db/aplicar.sh y BORRAR el archivo después. No va al repositorio: trae la
     huella de una contraseña.
   - Las demás cuentas se dan de alta desde el panel, una por una o en bloque
     con «Alta masiva desde CSV».
   ============================================================ */
import { huella, temporal } from "../../src/modulos/priorizacion-reforestacion/contrasenas.ts";

const [correoArg, nombreArg] = process.argv.slice(2);
const correo = (correoArg ?? "").trim().toLowerCase(), nombre = (nombreArg ?? "").trim();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || !nombre) {
  console.error('Uso: node herramientas/priorizacion-reforestacion/primera-cuenta.ts correo@sedema.cdmx.gob.mx "Nombre Apellido" > /tmp/primera-cuenta.sql');
  process.exit(1);
}
const lit = (s: string) => "'" + s.replace(/'/g, "''") + "'";
const clave = temporal();
const h = await huella(clave);

process.stdout.write(`-- Primera cuenta de administración · Modelo de priorización de reforestación urbana
-- Generado el ${new Date().toISOString()}. Trae la huella de una contraseña temporal: aplicar y BORRAR; no va al repositorio.
BEGIN;
DO $$
DECLARE n integer;
BEGIN
  INSERT INTO priorizacion_reforestacion.usuarios (correo, nombre, institucion, rol, huella, debe_cambiar)
  VALUES (${lit(correo)}, ${lit(nombre)}, 'SEDEMA', 'admin', ${lit(h)}, true)
  ON CONFLICT (correo) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RAISE NOTICE 'Ya existía una cuenta con ese correo: no se cambió nada. Usa «Restablecer» desde el panel.';
  ELSE RAISE NOTICE 'Cuenta de administración creada.';
  END IF;
END
$$;
COMMIT;
`);
console.error(`\nContraseña temporal de ${correo} (se muestra una sola vez): ${clave}\nAl entrar se pedirá cambiarla. Aplica el SQL y borra el archivo.\n`);
