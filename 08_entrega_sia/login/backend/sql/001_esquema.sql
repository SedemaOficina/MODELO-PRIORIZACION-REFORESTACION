-- Módulo de sesión de «Calles prioritarias para reforestar» · esquema propio en la base del SIA (PostgreSQL 17).
-- Se crea una sola vez, con una cuenta administradora. La aplicación se conecta con la cuenta de servicio calles_app,
-- que solo puede leer y escribir en este esquema (como los demás módulos del backend).
-- Datos personales: correo, nombre, alcaldía o dependencia, bitácora de accesos y usos, dirección IP. Ver ../privacidad/.

CREATE SCHEMA IF NOT EXISTS calles;

-- Personas con acceso. La contraseña nunca se guarda: solo su huella (scrypt con sal propia).
CREATE TABLE IF NOT EXISTS calles.usuarios (
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
  ultimo_acceso     timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_correo ON calles.usuarios (correo);

-- Sesiones abiertas. La cookie lleva un valor aleatorio; aquí solo su huella SHA-256.
CREATE TABLE IF NOT EXISTS calles.sesiones (
  token_huella      text PRIMARY KEY,
  usuario_id        integer NOT NULL REFERENCES calles.usuarios (id) ON DELETE CASCADE,
  creada            timestamptz NOT NULL DEFAULT now(),
  ultima_actividad  timestamptz NOT NULL DEFAULT now(),
  expira            timestamptz NOT NULL,                -- tope absoluto
  ultima_visita     timestamptz                          -- para no anotar una visita por cada archivo
);
CREATE INDEX IF NOT EXISTS sesiones_usuario ON calles.sesiones (usuario_id);

-- Bitácora: accesos, visitas, consultas y descargas. Es lo que permite «saber usos».
-- evento: acceso · acceso_fallido · visita · consulta · descarga · salida · cambio_contrasena · admin
CREATE TABLE IF NOT EXISTS calles.bitacora (
  id          bigserial PRIMARY KEY,
  momento     timestamptz NOT NULL DEFAULT now(),
  usuario_id  integer REFERENCES calles.usuarios (id) ON DELETE SET NULL,
  evento      text NOT NULL,
  detalle     jsonb,                                     -- ámbito consultado, archivo descargado, etc. Nunca contraseñas
  ip          text                                       -- se borra a los 6 meses (calles.depurar)
);
CREATE INDEX IF NOT EXISTS bitacora_momento ON calles.bitacora (momento);
CREATE INDEX IF NOT EXISTS bitacora_usuario ON calles.bitacora (usuario_id, momento);

-- Plazos de conservación (los mismos que declara el aviso de privacidad): bitácora 24 meses, IP 6 meses, sesiones vencidas.
-- Se corre una vez al día (cron del servidor o el temporizador del propio módulo).
CREATE OR REPLACE FUNCTION calles.depurar() RETURNS void LANGUAGE sql AS $$
  DELETE FROM calles.sesiones WHERE expira < now();
  UPDATE calles.bitacora SET ip = NULL WHERE ip IS NOT NULL AND momento < now() - interval '6 months';
  DELETE FROM calles.bitacora WHERE momento < now() - interval '24 months';
$$;

-- Cuenta de servicio de la aplicación (la contraseña se fija aparte, nunca en este archivo).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'calles_app') THEN CREATE ROLE calles_app LOGIN; END IF;
END $$;
GRANT USAGE ON SCHEMA calles TO calles_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA calles TO calles_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA calles TO calles_app;
GRANT EXECUTE ON FUNCTION calles.depurar() TO calles_app;
REVOKE ALL ON SCHEMA calles FROM PUBLIC;
