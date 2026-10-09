/*
  =====================================================================
  Modelo de priorización de reforestación urbana · esquema
  Esquema: priorizacion_reforestacion          Fecha: 2026-10-08
  =====================================================================

  Cuentas de acceso a la herramienta y bitácora de uso. Datos personales:
  nombre, correo, institución, alcaldía, bitácora de accesos y usos, IP.
  Aviso de privacidad:
  /acceso/priorizacion-reforestacion/aviso-de-privacidad.html

  ORDEN: este archivo, después 02-priorizacion-reforestacion-rol-y-grants.sql.
  Idempotente: se puede volver a aplicar sin perder datos.

  Plazos de conservación (los mismos del aviso), que aplica depurar():
    - sesiones vencidas: al vencer
    - IP de la bitácora: 6 meses
    - bitácora: 24 meses
    - cuenta dada de baja: 24 meses después de la baja
  =====================================================================
*/

BEGIN;

CREATE SCHEMA IF NOT EXISTS priorizacion_reforestacion;

-- Personas con acceso. La contraseña nunca se guarda: solo su huella (scrypt con sal propia).
CREATE TABLE IF NOT EXISTS priorizacion_reforestacion.usuarios (
  id                serial PRIMARY KEY,
  correo            text NOT NULL CHECK (correo = lower(correo) AND correo ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  nombre            text NOT NULL CHECK (length(trim(nombre)) > 0),
  institucion       text NOT NULL DEFAULT 'Alcaldía' CHECK (institucion IN ('Alcaldía', 'Gobierno Central', 'SEDEMA', 'Otra')),
  alcaldia_cve      text CHECK (alcaldia_cve ~ '^0(0[2-9]|1[0-7])$'),   -- clave de INEGI «002» a «017»; vacía si no es de una alcaldía
  rol               text NOT NULL DEFAULT 'usuario' CHECK (rol IN ('usuario', 'admin')),
  activo            boolean NOT NULL DEFAULT true,
  huella            text NOT NULL CHECK (huella LIKE 'scrypt$%'),        -- scrypt$N$r$p$sal$huella
  debe_cambiar      boolean NOT NULL DEFAULT true,                       -- contraseña temporal: se cambia al primer acceso
  intentos_fallidos integer NOT NULL DEFAULT 0,
  bloqueado_hasta   timestamptz,
  creado            timestamptz NOT NULL DEFAULT now(),
  actualizado       timestamptz NOT NULL DEFAULT now(),
  ultimo_acceso     timestamptz,
  baja              timestamptz                                          -- a los 24 meses de la baja, depurar() elimina la cuenta
);
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_correo ON priorizacion_reforestacion.usuarios (correo);

-- Sesiones abiertas. La cookie lleva un valor aleatorio de 256 bits; aquí solo su huella SHA-256.
CREATE TABLE IF NOT EXISTS priorizacion_reforestacion.sesiones (
  token_huella      text PRIMARY KEY,
  usuario_id        integer NOT NULL REFERENCES priorizacion_reforestacion.usuarios (id) ON DELETE CASCADE,
  creada            timestamptz NOT NULL DEFAULT now(),
  ultima_actividad  timestamptz NOT NULL DEFAULT now(),
  expira            timestamptz NOT NULL,                                -- tope absoluto
  ultima_visita     timestamptz                                          -- para no anotar una visita por cada archivo
);
CREATE INDEX IF NOT EXISTS sesiones_usuario ON priorizacion_reforestacion.sesiones (usuario_id);

-- Bitácora: accesos, visitas, consultas y descargas. Solo se escribe y se lee: la cuenta del módulo no puede
-- modificarla ni borrarla (02-…-rol-y-grants.sql); solo depurar() la recorta según los plazos.
CREATE TABLE IF NOT EXISTS priorizacion_reforestacion.bitacora (
  id          bigserial PRIMARY KEY,
  momento     timestamptz NOT NULL DEFAULT now(),
  usuario_id  integer REFERENCES priorizacion_reforestacion.usuarios (id) ON DELETE SET NULL,
  evento      text NOT NULL CHECK (evento IN ('acceso', 'acceso_fallido', 'visita', 'consulta', 'descarga', 'salida', 'cambio_contrasena', 'admin')),
  detalle     jsonb,                                                     -- ámbito consultado, archivo descargado, etc. Nunca contraseñas
  ip          text                                                       -- se borra a los 6 meses
);
CREATE INDEX IF NOT EXISTS bitacora_momento ON priorizacion_reforestacion.bitacora (momento);
CREATE INDEX IF NOT EXISTS bitacora_usuario ON priorizacion_reforestacion.bitacora (usuario_id, momento);

-- marca-pruebas: lo anterior lo cargan también las pruebas del módulo en una base en memoria (pg-mem); lo que sigue no.

-- Plazos de conservación. SECURITY DEFINER: corre con los permisos del dueño del esquema, así la cuenta del
-- módulo puede pedir la depuración sin tener DELETE sobre usuarios ni UPDATE/DELETE sobre la bitácora.
-- search_path fijo y nombres calificados: una función SECURITY DEFINER no debe depender del search_path de quien la llama.
CREATE OR REPLACE FUNCTION priorizacion_reforestacion.depurar() RETURNS void
  LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  DELETE FROM priorizacion_reforestacion.sesiones WHERE expira < now();
  UPDATE priorizacion_reforestacion.bitacora SET ip = NULL WHERE ip IS NOT NULL AND momento < now() - interval '6 months';
  DELETE FROM priorizacion_reforestacion.bitacora WHERE momento < now() - interval '24 months';
  DELETE FROM priorizacion_reforestacion.usuarios WHERE NOT activo AND baja < now() - interval '24 months';
$$;
REVOKE ALL ON FUNCTION priorizacion_reforestacion.depurar() FROM PUBLIC;

REVOKE ALL ON SCHEMA priorizacion_reforestacion FROM PUBLIC;

COMMIT;
