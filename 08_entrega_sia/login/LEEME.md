# Inicio de sesión y registro de usos · Modelo de priorización de reforestación urbana

Decisión de la Secretaría (5 de octubre de 2026): la herramienta se instala con **acceso restringido a cuentas autorizadas** y **registro de sus usos**, para controlar quién entra y saber qué instituciones y alcaldías la usan, qué consultan y qué descargan.

Esta carpeta trae todo lo necesario. Encaja en la infraestructura actual del SIA: nginx como entrada, el backend de Node.js + Express con un módulo por sistema y PostgreSQL con un esquema por sistema.

```
Persona ─▶ nginx ─▶ /priorizacion-reforestacion/   (auth_request ─▶ /api/priorizacion-reforestacion/sesion: 204 entra · 401 a la pantalla de acceso)
                 ├▶ /acceso/priorizacion-reforestacion/        pantalla de acceso, cambio de contraseña, panel de administración, aviso de privacidad (estáticos)
                 └▶ /api/priorizacion-reforestacion/           módulo «priorizacion-reforestacion» del backend ─▶ PostgreSQL, esquema priorizacion_reforestacion
```

## Contenido

| Carpeta | Qué es |
|---|---|
| `backend/src/` | Módulo Express (`index.js`) y huellas de contraseña (`contrasenas.js`). Sin dependencias nativas: usa `express` y `pg`, que el backend ya tiene |
| `backend/sql/001_esquema.sql` | Esquema `priorizacion_reforestacion`: usuarios, sesiones, bitácora; función de depuración; cuenta de servicio `priorizacion_reforestacion_app` |
| `backend/scripts/crear_admin.js` | Crea la primera cuenta de administración (las demás, desde el panel) |
| `backend/src/masiva.js`, `backend/scripts/alta_masiva.js` | Alta de muchas cuentas desde un CSV (los enlaces que designa cada alcaldía), con revisión previa y contraseñas temporales: desde el panel o desde la terminal |
| `acceso/` | Pantalla de acceso (`index.html`), panel de administración (`admin/`), aviso de privacidad (`aviso-de-privacidad.html`) y sus recursos |
<!-- solo-repositorio -->

Solo en el repositorio (no van en el paquete del SIA):

| Carpeta | Qué es |
|---|---|
| `backend/scripts/servidor_demo.js` | Demostración en una sola máquina (nginx + backend + base), con base en memoria o PostgreSQL de pruebas |
| `backend/scripts/datos_demo.js` | Cuentas ficticias y 90 días de uso simulado para ver el panel lleno (solo en bases de prueba) |
| `backend/pruebas/` | Pruebas: con base en memoria (`npm run pruebas`) o contra PostgreSQL de pruebas (`PRUEBAS_PG=1`) |
| `privacidad/` | Textos de los avisos, solicitud y nota a la Unidad de Transparencia |
| `generar_aviso_html.py` | Genera `acceso/aviso-de-privacidad.html` a partir de `privacidad/aviso_integral.md` |
<!-- /solo-repositorio -->

## Privacidad

El registro de usos trata datos personales: nombre, correo, institución, IP y bitácora. La Unidad de Transparencia de la SEDEMA revisó y aprobó el aviso de privacidad (octubre de 2026). El aviso integral se publica en la pantalla de acceso (`acceso/aviso-de-privacidad.html`) y declara los plazos que cumple la depuración automática: bitácora 24 meses, IP 6 meses y cuentas dadas de baja 24 meses después de la baja.

## Instalación

**1. Base de datos.** Con una cuenta administradora de la base del SIA:
```
psql -d bd_csia -f backend/sql/001_esquema.sql
```
Después, asignar contraseña a la cuenta de servicio (`ALTER ROLE priorizacion_reforestacion_app PASSWORD '…'`) y permitir su conexión solo desde el servidor de aplicaciones, igual que las demás cuentas de servicio.

**2. Backend.**
- Copiar `backend/src/` a la carpeta de módulos de `sia-backend` (por ejemplo `modulos/priorizacion-reforestacion/`).
- Montar el módulo con su propio pool de `pg`, conectado con la cuenta `priorizacion_reforestacion_app`:
  ```js
  const { Pool } = require('pg');
  const priorizacion = require('./modulos/priorizacion-reforestacion')({ pool: new Pool({ /* cuenta priorizacion_reforestacion_app, ssl obligatorio */ }) });
  app.set('trust proxy', /* la red de nginx */);   // para que la bitácora registre la IP de la persona
  app.use('/api/priorizacion-reforestacion', priorizacion);
  ```
- Variable de entorno opcional `PRIORIZACION_ORIGEN`. Por omisión es `https://sedema.sia.cdmx.gob.mx`, y es la única procedencia que acepta en peticiones que cambian algo.
- El módulo depura una vez al día lo vencido: bitácora de 24 meses, IP de 6 meses, cuentas dadas de baja hace 24 meses y sesiones vencidas. También puede programarse en la base: `SELECT priorizacion_reforestacion.depurar();`.

**3. Primera cuenta de administración** (en el servidor de aplicaciones, con las variables `PG*` de `priorizacion_reforestacion_app`):
```
node scripts/crear_admin.js correo@sedema.cdmx.gob.mx "Nombre Apellido"
```
Muestra una contraseña temporal; al entrar, se pide cambiarla.

**4. Archivos estáticos.** Copiar `acceso/` al volumen del servidor web, como `acceso-priorizacion-reforestacion/`.

**5. nginx.** En `../nginx_priorizacion_reforestacion.conf.ejemplo`, el bloque «FASE 2 CON INICIO DE SESIÓN» sustituye al bloque 2. Tiene tres partes:
- **2-bis:** la herramienta protegida con `auth_request`.
- **2-ter:** la pantalla de acceso, sin protección.
- **2-cuater:** la API, que va por la ruta `/api/` existente.

Validar con `nginx -t`.

**6. La herramienta.** La carpeta `sitio/` del paquete ya viene construida con la sesión: acceso en `/acceso/priorizacion-reforestacion/`, cierre en `/api/priorizacion-reforestacion/salir` y registro de usos en `/api/priorizacion-reforestacion/uso`. Con eso la herramienta:
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

Todo se puede ensayar en una computadora con Node.js (`cd backend && npm install`).

**Sin base de datos**, con una base en memoria:
```
DEMO_DATOS=1 node scripts/servidor_demo.js        → http://localhost:8090/priorizacion-reforestacion/
```

**Con PostgreSQL de pruebas**, que es la forma recomendada antes de tocar sia-backend. Se ensaya el mismo esquema que irá a producción:
1. Crear una base de pruebas (su nombre debe contener «prueba») y correr en ella `sql/001_esquema.sql`. Dar contraseña a `priorizacion_reforestacion_app`.
2. Correr las pruebas contra esa base, con la cuenta de servicio. Comprueban también la depuración por plazos y que `priorizacion_reforestacion_app` no pueda salir de su esquema:
   ```
   PRUEBAS_PG=1 PGHOST=localhost PGDATABASE=bd_csia_pruebas PGUSER=priorizacion_reforestacion_app PGPASSWORD=… npm run pruebas
   ```
3. Cargar los datos simulados: `node scripts/datos_demo.js --base-de-pruebas`.
4. Levantar la demostración con esa base: `DEMO_PG=1 node scripts/servidor_demo.js`.

**Los datos simulados** son:
- 37 cuentas ficticias: dos enlaces por alcaldía, tres del Gobierno Central y dos de SEDEMA. Todas con correo `@ejemplo.gob.mx` y contraseña `demostracion-2026`.
- 90 días de uso con un patrón realista. Por ejemplo, cada enlace consulta sobre todo su alcaldía.

Permiten ver el panel de usos lleno. El script **se niega** a cargarse en una base que ya tenga cuentas reales. Se quitan con `--borrar`.

Para ver el registro de usos desde la herramienta, esta debe estar construida con la sesión (paso 6 de la instalación) y servirse con `SITIO=…/docs`.
<!-- /solo-repositorio -->

## Alta masiva desde CSV

Cuando las alcaldías designen a sus enlaces por oficio, las cuentas se dan de alta todas juntas desde un CSV. Puede guardarse desde Excel, con coma o punto y coma, en UTF-8 o en la codificación de Excel en español.

**Desde el panel** (pestaña «Personas» → «Alta masiva desde CSV»), sin terminal:
1. «Descargar plantilla» da las columnas correctas.
2. «Revisar el archivo» señala los errores por renglón y no da de alta a nadie.
3. «Dar de alta N cuentas» crea las cuentas nuevas; las que ya existen no se tocan. Máximo 500 por archivo.
4. «Descargar contraseñas (CSV)»: el archivo se arma en el navegador, el servidor no lo guarda. Repártelas y bórralo.

**Desde la terminal del servidor**, con las mismas reglas:

```
correo,nombre,institucion,alcaldia,rol
enlace@azcapotzalco.cdmx.gob.mx,Ana García,Alcaldía,Azcapotzalco,usuario
```

1. `node scripts/alta_masiva.js cuentas.csv` revisa cada renglón y dice qué haría, **sin escribir nada**. Señala correos inválidos o repetidos, alcaldías no reconocidas y roles no válidos.
2. `node scripts/alta_masiva.js cuentas.csv --aplicar` da de alta las cuentas nuevas. Las que ya existen no se tocan.
3. Escribe `cuentas_con_contrasenas_AAAAMMDD.csv` con las contraseñas temporales. **Repártelas por canal institucional y borra ese archivo.**

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

- **Pruebas del módulo:** `cd backend && npm install && npm run pruebas`.
- **Aviso de privacidad:** después de editar `privacidad/aviso_integral.md`, regenerar la página con `python 08_entrega_sia/login/generar_aviso_html.py`.
- **Bases creadas antes de la v1.0:** volver a correr `sql/001_esquema.sql` con la cuenta dueña del esquema agrega la columna `baja` y actualiza la depuración.
<!-- /solo-repositorio -->
