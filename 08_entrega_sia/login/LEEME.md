# Inicio de sesión y registro de usos · Modelo de priorización de reforestación urbana

La herramienta se instala con **acceso restringido a cuentas autorizadas** y **registro de sus usos**, para controlar quién entra y saber qué instituciones y alcaldías la usan, qué consultan y qué descargan.

Esta carpeta trae todo lo necesario. Encaja en la infraestructura actual del SIA: nginx como entrada, el backend de Node.js + Express con un módulo por sistema y PostgreSQL con un esquema por sistema.

```
Persona ─▶ nginx ─▶ /priorizacion-reforestacion/   (auth_request ─▶ /api/priorizacion-reforestacion/sesion: 204 entra · 401 a la pantalla de acceso)
                 ├▶ /acceso/priorizacion-reforestacion/        pantalla de acceso, cambio de contraseña, panel de administración, aviso de privacidad (estáticos)
                 └▶ /api/priorizacion-reforestacion/           módulo «priorizacion-reforestacion» del backend ─▶ PostgreSQL, esquema priorizacion_reforestacion
```

## Contenido

`backend/` tiene la misma estructura que el repositorio `sia-backend`: cada carpeta se copia a la misma ruta allá.

| Carpeta | Qué es |
|---|---|
| `backend/src/modulos/priorizacion-reforestacion/` | El módulo, en TypeScript y con la misma forma que los demás: `rutas.ts` exporta `crearRutasPriorizacionReforestacion(pool)`. Además `contrasenas.ts` (huellas scrypt), `masiva.ts` (alta masiva desde CSV), `procedencia.ts` (IP de origen, mismo criterio que caec) y `alcaldias.ts`. No agrega dependencias: usa `express` y `pg`, que el backend ya tiene |
| `backend/db/priorizacion_reforestacion/` | `01-…-esquema.sql` (tablas, restricciones y depuración por plazos) y `02-…-rol-y-grants.sql` (rol `priorizacion_reforestacion_api` con mínimo privilegio, controles negativos y línea de `pg_hba`) |
| `backend/herramientas/priorizacion-reforestacion/primera-cuenta.ts` | Genera el SQL de la primera cuenta de administración. No se conecta a nada |
| `acceso/` | Pantalla de acceso (`index.html`), panel de administración (`admin/`), aviso de privacidad (`aviso-de-privacidad.html`) y sus recursos (estáticos, los sirve nginx) |
<!-- solo-repositorio -->

Solo en el repositorio (no van en el paquete del SIA):

| Carpeta | Qué es |
|---|---|
| `backend/pruebas/` | Pruebas: el módulo montado como en `sia-backend` (helmet, cors y `express.json()` globales, sin trust proxy), la IP detrás de nginx, el empaquetado con su misma configuración de tsup, la herramienta de la primera cuenta y, contra PostgreSQL real (`PRUEBAS_PG=1`), la depuración y los controles negativos del rol |
| `backend/scripts/servidor_demo.mjs`, `datos_demo.mjs` | Demostración en una sola máquina y datos simulados para ver el panel lleno |
| `backend/package.json`, `tsconfig.check.json` | Para correr las pruebas y la revisión de tipos (la misma configuración que `sia-backend`) |
| `privacidad/`, `generar_aviso_html.py` | Textos de los avisos y generador de `acceso/aviso-de-privacidad.html` |
<!-- /solo-repositorio -->

## Privacidad

El registro de usos trata datos personales: nombre, correo, institución, IP y bitácora. El aviso integral se publica en la pantalla de acceso (`acceso/aviso-de-privacidad.html`) y declara los plazos que cumple la depuración automática: bitácora 24 meses, IP 6 meses y cuentas dadas de baja 24 meses después de la baja.

## Instalación

Sigue las convenciones de `sia-backend`: un esquema y un rol por módulo, un pool por módulo y el despliegue de un solo binario. **El orden importa:** `crearPool` detiene el backend entero si faltan las variables del módulo, así que primero van la base y las variables, y al final el código.

**0. Copiar al repositorio `sia-backend`**, en las mismas rutas:
```
backend/src/modulos/priorizacion-reforestacion/      → src/modulos/priorizacion-reforestacion/
backend/db/priorizacion_reforestacion/               → db/priorizacion_reforestacion/
backend/herramientas/priorizacion-reforestacion/     → herramientas/priorizacion-reforestacion/
```

**1. Base de datos**, con el mismo procedimiento que los demás módulos:
```
bash db/aplicar.sh 01-priorizacion-reforestacion-esquema.sql
bash db/aplicar.sh 02-priorizacion-reforestacion-rol-y-grants.sql
```
Después:
- `\password priorizacion_reforestacion_api` (interactivo; la clave no queda en el registro).
- La línea `hostssl` en `pg_hba.conf` para `priorizacion_reforestacion_api` desde el servidor de aplicaciones (plantilla al final de `02-…`) y `SELECT pg_reload_conf();`.
- Correr los controles negativos del final de `02-…` conectado **como el rol**: deben fallar.

El rol puede leer y escribir cuentas y sesiones, solo agregar a la bitácora (no modificarla ni borrarla) y pedir la depuración. Las cuentas no se borran: se dan de baja, y `depurar()` (que corre con los permisos del dueño del esquema) las elimina 24 meses después.

**2. Variables** en el archivo de entorno del backend, con el script que ya usan (`deploy/agregar-clave-modulo.sh`):
```
PREFIJO=PRIORIZACION_REFORESTACION USUARIO=priorizacion_reforestacion_api bash /tmp/agregar-clave.sh
```
Agrega `PRIORIZACION_REFORESTACION_DB_USER` y `PRIORIZACION_REFORESTACION_DB_PASS`. Opcional: `PRIORIZACION_REFORESTACION_ORIGEN` (por omisión `https://sedema.sia.cdmx.gob.mx`), la única procedencia que acepta en peticiones que cambian algo.

**3. Código.** En `src/db.ts`, el pool propio y su renglón en `reportarIdentidades`:
```ts
export const poolPriorizacionReforestacion = crearPool({ modulo: "PRIORIZACION_REFORESTACION", prefijo: "PRIORIZACION_REFORESTACION" });
// en reportarIdentidades(): ["PRIORIZACION_REFORESTACION", poolPriorizacionReforestacion]
```
En `src/index.ts`, junto a los demás módulos:
```ts
import { crearRutasPriorizacionReforestacion } from "./modulos/priorizacion-reforestacion/rutas";
app.use("/api/priorizacion-reforestacion", crearRutasPriorizacionReforestacion(poolPriorizacionReforestacion));
```
- No hace falta `trust proxy`: la IP se toma de la última entrada de `X-Forwarded-For`, como en caec.
- Requiere Express 5: las rutas son asíncronas y Express 5 pasa sus errores al manejador. El `express.json()` general (100 KB) alcanza: la alta masiva admite 500 cuentas por archivo.
- `npm run typecheck`, `npm run build` y `deploy.fish`, **solo después** de los pasos 1 y 2. En el arranque, el journal debe decir `🔑 [PRIORIZACION_REFORESTACION] conectado como priorizacion_reforestacion_api`, sin «SUPERUSUARIO».
- El módulo pide la depuración por plazos cada 24 horas. Si se prefiere, puede programarse en la base: `SELECT priorizacion_reforestacion.depurar();` una vez al día.

**4. Primera cuenta de administración.** El servidor corre un solo binario, sin `node_modules`, así que la herramienta no se conecta: genera el SQL en la computadora de quien despliega (Node 25 ejecuta TypeScript sin compilar):
```
node herramientas/priorizacion-reforestacion/primera-cuenta.ts correo@sedema.cdmx.gob.mx "Nombre Apellido" > /tmp/primera-cuenta.sql
```
La contraseña temporal sale en pantalla una sola vez. Aplicar `/tmp/primera-cuenta.sql` con el mismo comando ssh + psql de `db/aplicar.sh` y **borrar el archivo**: trae la huella de una contraseña y no va al repositorio. Al entrar, la herramienta pide cambiarla. Las demás cuentas se dan de alta desde el panel.

**5. Archivos estáticos.** Copiar `acceso/` al volumen del servidor web, como `acceso-priorizacion-reforestacion/`.

**6. nginx.** En `../nginx_priorizacion_reforestacion.conf.ejemplo`, el bloque «FASE 2 CON INICIO DE SESIÓN» sustituye al bloque 2. Tiene tres partes:
- **2-bis:** la herramienta protegida con `auth_request`.
- **2-ter:** la pantalla de acceso, sin protección.
- **2-cuater:** la API, que va por la ruta `/api/` existente.

Validar con `nginx -t`.

En `deploy/verificar.sh` conviene agregar una comprobación: `GET /api/priorizacion-reforestacion/sesion` sin cookie debe responder `401` (la puerta funciona y el módulo está montado).

**7. La herramienta.** La carpeta `sitio/` del paquete ya viene construida con la sesión: acceso en `/acceso/priorizacion-reforestacion/`, cierre en `/api/priorizacion-reforestacion/salir` y registro de usos en `/api/priorizacion-reforestacion/uso`. Con eso la herramienta:
- muestra «Salir» junto a los logotipos;
- reconoce la sesión vencida;
- no guarda copia sin conexión;
- registra consultas y descargas.
<!-- solo-repositorio -->

En el repositorio, el paquete se arma con `SIA_SESION_INICIO=/acceso/priorizacion-reforestacion/ SIA_SESION_CIERRE=/api/priorizacion-reforestacion/salir python 08_entrega_sia/empaquetar.py`. Sin esas variables, por ejemplo en GitHub Pages, la herramienta no registra nada.
<!-- /solo-repositorio -->

## Comprobación después de instalar

| # | Prueba | Resultado esperado |
|---|---|---|
| 1 | Abrir `/priorizacion-reforestacion/` sin sesión | Lleva a `/acceso/priorizacion-reforestacion/?volver=/priorizacion-reforestacion/` |
| 2 | `curl -sI .../priorizacion-reforestacion/datos/data.bin` sin sesión | `401` |
| 3 | Entrar con la cuenta de administración (contraseña temporal) | Pide crear una contraseña propia y después abre la herramienta |
| 4 | Abrir un enlace con consulta (`?a=007&b=con`) sin sesión, entrar | Vuelve a esa misma consulta |
| 5 | En la herramienta, elegir una alcaldía y descargar un Excel | En el panel, pestaña «Usos», aparecen la consulta y la descarga |
| 6 | Dar de baja una cuenta con la sesión abierta en otro navegador | Esa sesión deja de funcionar al instante |
| 7 | Cinco contraseñas equivocadas seguidas | La cuenta se detiene 15 minutos |
| 8 | «Salir» en la herramienta | Vuelve a la pantalla de acceso con «Cerraste tu sesión» |

<!-- solo-repositorio -->
## Ensayo antes de instalar

Todo se puede ensayar en una computadora con Node.js 22.6 o posterior (`cd backend && npm install`).

- **Revisión de tipos**, con la misma configuración que `sia-backend`: `npm run typecheck`.
- **Pruebas** con base en memoria: `npm run pruebas`.
- **Demostración** sin base de datos: `DEMO_DATOS=1 npm run demo` → `http://localhost:8090/priorizacion-reforestacion/`.

**Con PostgreSQL de pruebas**, la forma recomendada antes de tocar `sia-backend`. Se ensaya el mismo SQL que irá a producción:
1. En una base de pruebas (su nombre debe contener «prueba»), aplicar `db/priorizacion_reforestacion/01-…` y `02-…` y dar contraseña a `priorizacion_reforestacion_api`.
2. Correr las pruebas con la cuenta del módulo. Comprueban también la depuración por plazos y los controles negativos del rol. La cuenta dueña solo se usa para vaciar las tablas entre pruebas:
   ```
   PRUEBAS_PG=1 PGHOST=localhost PGDATABASE=bd_csia_pruebas PGUSER=priorizacion_reforestacion_api PGPASSWORD=… PRUEBAS_PG_DUENO_USER=… PRUEBAS_PG_DUENO_PASSWORD=… npm run pruebas
   ```
3. Datos simulados: `node --import ./pruebas/cargador.mjs scripts/datos_demo.mjs --base-de-pruebas`, con las variables `PG*` de la cuenta dueña.
4. Demostración con esa base: `DEMO_PG=1 npm run demo`.

**Los datos simulados** son:
- 37 cuentas ficticias: dos enlaces por alcaldía, tres del Gobierno Central y dos de SEDEMA. Todas con correo `@ejemplo.gob.mx` y contraseña `demostracion-2026`.
- 90 días de uso con un patrón realista. Por ejemplo, cada enlace consulta sobre todo su alcaldía.

Permiten ver el panel de usos lleno. El script **se niega** a cargarse en una base que ya tenga cuentas reales. Se quitan con `--borrar`.

Para ver el registro de usos desde la herramienta, esta debe estar construida con la sesión (paso 7 de la instalación) y servirse con `SITIO=…/docs`.
<!-- /solo-repositorio -->

## Alta masiva desde CSV

Cuando las alcaldías designen a sus enlaces por oficio, las cuentas se dan de alta todas juntas desde un CSV. Puede guardarse desde Excel, con coma o punto y coma, en UTF-8 o en la codificación de Excel en español.

**Desde el panel** (pestaña «Personas» → «Alta masiva desde CSV»), sin terminal:
1. «Descargar plantilla» da las columnas correctas.
2. «Revisar el archivo» señala los errores por renglón y no da de alta a nadie.
3. «Dar de alta N cuentas» crea las cuentas nuevas; las que ya existen no se tocan. Máximo 500 por archivo.
4. «Descargar contraseñas (CSV)»: el archivo se arma en el navegador, el servidor no lo guarda. Repártelas y bórralo.

El archivo lleva una persona por renglón:
```
correo,nombre,institucion,alcaldia,rol
enlace@azcapotzalco.cdmx.gob.mx,Ana García,Alcaldía,Azcapotzalco,usuario
```
`alcaldia` acepta el nombre o la clave «002»…«017» (vacía si no es de una alcaldía); `rol`, «usuario» o «admin».

## Operación

- **Altas** (una por una, o muchas con «Alta masiva desde CSV»):
  - Desde el panel (`/acceso/priorizacion-reforestacion/admin/`, solo cuentas con permiso de administración).
  - Se elige institución y alcaldía; el panel muestra una contraseña temporal **una sola vez**.
  - Compártela por un medio institucional y por separado del correo.
- **Bajas:** «Dar de baja» cierra las sesiones de la persona al instante; la cuenta puede reactivarse.
- **Contraseña olvidada:** «Restablecer contraseña» genera otra temporal y cierra sus sesiones.
- **Reportes:** la pestaña «Usos» muestra, por rango de fechas:
  - cuentas activas;
  - uso por institución y alcaldía de quien consulta;
  - territorios consultados;
  - tipos de archivo descargados;
  - uso por persona.

  «Descargar bitácora (CSV)» exporta el detalle, sin direcciones IP.
- **Seguridad:**
  - Contraseñas de 12 caracteres o más, guardadas con huella scrypt.
  - La cuenta se detiene tras 5 intentos fallidos.
  - La sesión dura 12 h sin actividad, con un máximo de 7 días.
  - Cookie `HttpOnly`, `Secure` y `SameSite=Lax`.
  - Solo se aceptan peticiones de la propia procedencia.
  - La dirección de regreso nunca sale de la herramienta.
  - Un mismo mensaje de error, exista o no el correo.

## Qué registra y qué no

- **Sí registra:**
  - accesos, intentos fallidos, cierres de sesión;
  - visitas a la página (una cada 30 minutos por sesión, no por cada archivo);
  - **consultas**: el ámbito donde la persona se detiene (alcaldía, colonia, avenida o calle, red y filtro de banqueta);
  - **descargas**: tipo y nombre del archivo.
- **No registra:**
  - la ubicación de «Mi ubicación», que nunca sale del teléfono;
  - el contenido de los archivos;
  - los movimientos del mapa;
  - las consultas de toda la ciudad (vista inicial);
  - los cambios automáticos de «Seguirme».
- **Advertencia:** el registro de consultas y descargas lo envía la propia página. Es informativo: una persona con conocimientos técnicos podría evitarlo. El control de acceso, en cambio, lo hace el servidor y no se puede saltar.

<!-- solo-repositorio -->
## Mantenimiento

- **Pruebas y tipos:** `cd backend && npm install && npm run typecheck && npm run pruebas`.
- **Aviso de privacidad:** después de editar `privacidad/aviso_integral.md`, regenerar la página con `python 08_entrega_sia/login/generar_aviso_html.py`.
<!-- /solo-repositorio -->
