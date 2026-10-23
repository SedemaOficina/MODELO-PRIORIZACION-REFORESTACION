/*
  =====================================================================
  Modelo de priorización de reforestación urbana · esquema
  Esquema: priorizacion_reforestacion          Fecha: 2026-10-08
  =====================================================================

  Cuentas de acceso a la herramienta y bitácora de uso. Datos personales:
  nombre, correo, área, cargo, institución, alcaldía o dependencia u
  organización, bitácora de accesos y usos, IP.
  Aviso de privacidad:
  /priorizacion-reforestacion/acceso/aviso-de-privacidad.html

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

-- Catálogo de dependencias del Gobierno Central, organizaciones de la sociedad civil, empresas privadas y otras instituciones.
-- Lo edita quien administra desde el panel (pestaña «Catálogos»). Una entrada no se borra: se desactiva y deja de ofrecerse
-- en las altas, pero las cuentas que ya la tienen la conservan (v1.49).
CREATE TABLE IF NOT EXISTS priorizacion_reforestacion.catalogo_entidades (
  id          serial PRIMARY KEY,
  tipo        text NOT NULL CHECK (tipo IN ('Gobierno Central', 'Organización de la sociedad civil', 'Privado', 'Otra')),
  nombre      text NOT NULL CHECK (length(trim(nombre)) > 0 AND length(nombre) <= 120),
  activo      boolean NOT NULL DEFAULT true,
  creado      timestamptz NOT NULL DEFAULT now(),
  actualizado timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS catalogo_entidades_tipo_nombre ON priorizacion_reforestacion.catalogo_entidades (tipo, nombre);
-- las dependencias de arranque; quien administra agrega las demás
INSERT INTO priorizacion_reforestacion.catalogo_entidades (tipo, nombre) VALUES ('Gobierno Central', 'SEDEMA'), ('Gobierno Central', 'SOBSE'), ('Gobierno Central', 'PAOT')
  ON CONFLICT (tipo, nombre) DO NOTHING;

-- Personas con acceso. La contraseña nunca se guarda: solo su huella (scrypt con sal propia).
CREATE TABLE IF NOT EXISTS priorizacion_reforestacion.usuarios (
  id                serial PRIMARY KEY,
  correo            text NOT NULL CHECK (correo = lower(correo) AND correo ~ '^[!-?A-~]+@[!-?A-~]+\.[!-?A-~]+$'),   -- solo ASCII visible
  nombre            text NOT NULL CHECK (length(trim(nombre)) > 0 AND length(nombre) <= 120),
  area              text CHECK (length(area) <= 120),                    -- vacíos solo en cuentas anteriores a la v1.49
  cargo             text CHECK (length(cargo) <= 120),
  institucion       text NOT NULL DEFAULT 'Alcaldía' CHECK (institucion IN ('Alcaldía', 'Gobierno Central', 'Organización de la sociedad civil', 'Privado', 'Otra')),
  alcaldia_cve      text CHECK (alcaldia_cve ~ '^0(0[2-9]|1[0-7])$'),   -- clave de INEGI «002» a «017»; vacía si no es de una alcaldía
  entidad_id        integer REFERENCES priorizacion_reforestacion.catalogo_entidades (id),   -- dependencia u organización; vacía en alcaldías
  rol               text NOT NULL DEFAULT 'usuario' CHECK (rol IN ('usuario', 'admin')),
  activo            boolean NOT NULL DEFAULT true,
  huella            text NOT NULL CHECK (huella LIKE 'scrypt$%'),        -- scrypt$N$r$p$sal$huella
  debe_cambiar      boolean NOT NULL DEFAULT true,                       -- contraseña temporal: se cambia al primer acceso
  temporal_desde    timestamptz DEFAULT now(),                           -- cuándo se dio la temporal: deja de servir a las 72 horas
  intentos_fallidos integer NOT NULL DEFAULT 0,
  bloqueado_hasta   timestamptz,
  creado            timestamptz NOT NULL DEFAULT now(),
  actualizado       timestamptz NOT NULL DEFAULT now(),
  ultimo_acceso     timestamptz,
  baja              timestamptz                                          -- a los 24 meses de la baja, depurar() elimina la cuenta
);
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_correo ON priorizacion_reforestacion.usuarios (correo);
-- en una base donde el esquema ya estaba aplicado (antes de la v1.38)
ALTER TABLE priorizacion_reforestacion.usuarios ADD COLUMN IF NOT EXISTS temporal_desde timestamptz DEFAULT now();

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

-- En una base donde el esquema ya estaba aplicado (antes de la v1.49): área, cargo y dependencia u organización, y SEDEMA deja de ser
-- una institución aparte: pasa a Gobierno Central con la dependencia «SEDEMA» del catálogo.
ALTER TABLE priorizacion_reforestacion.usuarios ADD COLUMN IF NOT EXISTS area text CHECK (length(area) <= 120);
ALTER TABLE priorizacion_reforestacion.usuarios ADD COLUMN IF NOT EXISTS cargo text CHECK (length(cargo) <= 120);
ALTER TABLE priorizacion_reforestacion.usuarios ADD COLUMN IF NOT EXISTS entidad_id integer REFERENCES priorizacion_reforestacion.catalogo_entidades (id);
ALTER TABLE priorizacion_reforestacion.usuarios DROP CONSTRAINT IF EXISTS usuarios_institucion_check;
UPDATE priorizacion_reforestacion.usuarios
   SET institucion = 'Gobierno Central',
       entidad_id = (SELECT id FROM priorizacion_reforestacion.catalogo_entidades WHERE tipo = 'Gobierno Central' AND nombre = 'SEDEMA')
 WHERE institucion = 'SEDEMA';
ALTER TABLE priorizacion_reforestacion.usuarios ADD CONSTRAINT usuarios_institucion_check
  CHECK (institucion IN ('Alcaldía', 'Gobierno Central', 'Organización de la sociedad civil', 'Privado', 'Otra'));

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
