/*
  =====================================================================
  Modelo de priorización de reforestación urbana · rol de servicio y privilegios
  Esquema: priorizacion_reforestacion   Rol: priorizacion_reforestacion_api   Fecha: 2026-10-08
  =====================================================================

  Un rol por módulo, ninguno superusuario, y ninguno alcanza los datos de otro.
  Este rol NO tiene USAGE sobre jpv, irs, plantacion, censo_kayaks, caec,
  caec_uto ni territorio.

  ORDEN DE APLICACIÓN — los cinco pasos, o el backend entero no arranca:

    1. 01-priorizacion-reforestacion-esquema.sql
    2. Este script                          (crea rol + privilegios)
    3. \password priorizacion_reforestacion_api   (interactivo; NO deja la clave en el log)
    4. pg_hba.conf del servidor de base de datos (ver el bloque al final)
    5. PRIORIZACION_REFORESTACION_DB_USER y PRIORIZACION_REFORESTACION_DB_PASS en
       el archivo de entorno del backend
    ── y HASTA ENTONCES ── el binario con el módulo.

  Qué puede hacer el rol, tabla por tabla:
    usuarios   SELECT, INSERT, UPDATE        (no DELETE: las cuentas se dan de baja, no se borran)
    sesiones   SELECT, INSERT, UPDATE, DELETE
    bitacora   SELECT, INSERT                (no UPDATE ni DELETE: solo se agrega)
    depurar()  EXECUTE                       (recorta según los plazos con los permisos del dueño)
  =====================================================================
*/

BEGIN;

-- =====================================================================
-- 1 · EL ROL
-- =====================================================================
-- Sin contraseña a propósito: se asigna en el paso 3 con \password.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'priorizacion_reforestacion_api') THEN
        CREATE ROLE priorizacion_reforestacion_api LOGIN
            NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT
            CONNECTION LIMIT 20;
    END IF;
END
$$;

-- Fijos en el ROL, no en la sesión: no dependen de lo que haga el pool de conexiones.
ALTER ROLE priorizacion_reforestacion_api SET search_path = priorizacion_reforestacion;
ALTER ROLE priorizacion_reforestacion_api SET statement_timeout = '15s';
ALTER ROLE priorizacion_reforestacion_api SET idle_in_transaction_session_timeout = '60s';

-- =====================================================================
-- 2 · ACCESO AL ESQUEMA
-- =====================================================================
REVOKE ALL ON SCHEMA priorizacion_reforestacion FROM PUBLIC;
GRANT USAGE ON SCHEMA priorizacion_reforestacion TO priorizacion_reforestacion_api;
REVOKE CREATE ON SCHEMA public FROM priorizacion_reforestacion_api;

-- =====================================================================
-- 3 · TABLAS, SECUENCIAS Y FUNCIÓN — explícito, sin ALL TABLES
-- =====================================================================
REVOKE ALL ON priorizacion_reforestacion.usuarios, priorizacion_reforestacion.sesiones, priorizacion_reforestacion.bitacora FROM priorizacion_reforestacion_api;
GRANT SELECT, INSERT, UPDATE         ON priorizacion_reforestacion.usuarios TO priorizacion_reforestacion_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON priorizacion_reforestacion.sesiones TO priorizacion_reforestacion_api;
GRANT SELECT, INSERT                 ON priorizacion_reforestacion.bitacora TO priorizacion_reforestacion_api;

GRANT USAGE ON SEQUENCE priorizacion_reforestacion.usuarios_id_seq TO priorizacion_reforestacion_api;
GRANT USAGE ON SEQUENCE priorizacion_reforestacion.bitacora_id_seq TO priorizacion_reforestacion_api;

REVOKE ALL ON FUNCTION priorizacion_reforestacion.depurar() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION priorizacion_reforestacion.depurar() TO priorizacion_reforestacion_api;

COMMIT;

/* =====================================================================
   CONTROLES NEGATIVOS — conectado COMO el rol, estas consultas DEBEN FALLAR:

     DELETE FROM priorizacion_reforestacion.usuarios;          -- permission denied
     UPDATE priorizacion_reforestacion.bitacora SET ip = NULL; -- permission denied
     DELETE FROM priorizacion_reforestacion.bitacora;          -- permission denied
     SELECT 1 FROM jpv.jpv_portal_2026 LIMIT 1;                -- permission denied for schema jpv
     CREATE TABLE public.intrusa (x int);                      -- permission denied for schema public

   Y esta debe funcionar: SELECT priorizacion_reforestacion.depurar();
   =====================================================================

   pg_hba.conf del servidor de base de datos (paso 4). Marcadores, no valores:
   usar la IP del servidor de aplicaciones, igual que las líneas de los demás módulos.

     hostssl  <base>  priorizacion_reforestacion_api  <ip-del-servidor-de-aplicaciones>/32  scram-sha-256

   Después: SELECT pg_reload_conf();
   ===================================================================== */
