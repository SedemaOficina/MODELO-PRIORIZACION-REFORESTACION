-- Módulo de sesión de «Modelo de priorización de reforestación urbana» · esquema propio en la base del SIA (PostgreSQL 17).
-- Se crea una sola vez, con una cuenta administradora. La aplicación se conecta con la cuenta de servicio priorizacion_reforestacion_app,
-- que solo puede leer y escribir en este esquema (como los demás módulos del backend).
-- Datos personales: correo, nombre, alcaldía o dependencia, bitácora de accesos y usos, dirección IP. Ver ../privacidad/.

CREATE SCHEMA IF NOT EXISTS priorizacion_reforestacion;

-- Personas con acceso. La contraseña nunca se guarda: solo su huella (scrypt con sal propia).
CREATE TABLE IF NOT EXISTS priorizacion_reforestacion.usuarios (
  id                serial PRIMARY KEY,
  correo            text NOT NULL,                       -- se guarda en minúsculas
  nombre            text NOT NULL,
  institucion       text NOT NULL DEFAULT 'Alcaldía',    -- Alcaldía · Gobierno Central · SEDEMA · Otra
  alcaldia_cve      text,                                -- clave de INEGI «002» a «017»; vacía si no es de una alcaldía
  rol               text NOT NULL DEFAULT 'usuario' CHECK (rol IN ('usuario', 'admin')),
  activo            boolean NOT NULL DEFAULT true,
  huella            text NOT NULL,                       -- scrypt$N$r$p$sal$huella
  debe_cambiar      boolean NOT NULL DEFAULT true,       -- contraseña temporal: se cambia al primer acceso
  intentos_fallidos integer NOT NULL DEFAULT 0,
  bloqueado_hasta   timestamptz,
  creado            timestamptz NOT NULL DEFAULT now(),
  actualizado       timestamptz NOT NULL DEFAULT now(),
  ultimo_acceso     timestamptz,
  baja              timestamptz                          -- fecha de la baja; a los 24 meses la cuenta se elimina (priorizacion_reforestacion.depurar)
);
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_correo ON priorizacion_reforestacion.usuarios (correo);
ALTER TABLE priorizacion_reforestacion.usuarios ADD COLUMN IF NOT EXISTS baja timestamptz;   -- bases creadas antes de la v1.0

-- Sesiones abiertas. La cookie lleva un valor aleatorio; aquí solo su huella SHA-256.
CREATE TABLE IF NOT EXISTS priorizacion_reforestacion.sesiones (
  token_huella      text PRIMARY KEY,
  usuario_id        integer NOT NULL REFERENCES priorizacion_reforestacion.usuarios (id) ON DELETE CASCADE,
  creada            timestamptz NOT NULL DEFAULT now(),
  ultima_actividad  timestamptz NOT NULL DEFAULT now(),
  expira            timestamptz NOT NULL,                -- tope absoluto
  ultima_visita     timestamptz                          -- para no anotar una visita por cada archivo
);
CREATE INDEX IF NOT EXISTS sesiones_usuario ON priorizacion_reforestacion.sesiones (usuario_id);

-- Bitácora: accesos, visitas, consultas y descargas. Es lo que permite «saber usos».
-- evento: acceso · acceso_fallido · visita · consulta · descarga · salida · cambio_contrasena · admin
CREATE TABLE IF NOT EXISTS priorizacion_reforestacion.bitacora (
  id          bigserial PRIMARY KEY,
  momento     timestamptz NOT NULL DEFAULT now(),
  usuario_id  integer REFERENCES priorizacion_reforestacion.usuarios (id) ON DELETE SET NULL,
  evento      text NOT NULL,
  detalle     jsonb,                                     -- ámbito consultado, archivo descargado, etc. Nunca contraseñas
  ip          text                                       -- se borra a los 6 meses (priorizacion_reforestacion.depurar)
);
CREATE INDEX IF NOT EXISTS bitacora_momento ON priorizacion_reforestacion.bitacora (momento);
CREATE INDEX IF NOT EXISTS bitacora_usuario ON priorizacion_reforestacion.bitacora (usuario_id, momento);

-- Plazos de conservación (los mismos que declara el aviso de privacidad): bitácora 24 meses, IP 6 meses, cuentas dadas de baja
-- 24 meses después de la baja, sesiones vencidas.
-- Se corre una vez al día (cron del servidor o el temporizador del propio módulo).
CREATE OR REPLACE FUNCTION priorizacion_reforestacion.depurar() RETURNS void LANGUAGE sql AS $$
  DELETE FROM priorizacion_reforestacion.sesiones WHERE expira < now();
  UPDATE priorizacion_reforestacion.bitacora SET ip = NULL WHERE ip IS NOT NULL AND momento < now() - interval '6 months';
  DELETE FROM priorizacion_reforestacion.bitacora WHERE momento < now() - interval '24 months';
  DELETE FROM priorizacion_reforestacion.usuarios WHERE NOT activo AND baja < now() - interval '24 months';
$$;

-- Cuenta de servicio de la aplicación (la contraseña se fija aparte, nunca en este archivo).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'priorizacion_reforestacion_app') THEN CREATE ROLE priorizacion_reforestacion_app LOGIN; END IF;
END $$;
GRANT USAGE ON SCHEMA priorizacion_reforestacion TO priorizacion_reforestacion_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA priorizacion_reforestacion TO priorizacion_reforestacion_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA priorizacion_reforestacion TO priorizacion_reforestacion_app;
GRANT EXECUTE ON FUNCTION priorizacion_reforestacion.depurar() TO priorizacion_reforestacion_app;
REVOKE ALL ON SCHEMA priorizacion_reforestacion FROM PUBLIC;
