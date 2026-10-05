# Inicio de sesión y registro de usos · Calles prioritarias para reforestar

Decisión de la Secretaría (5 de octubre de 2026): la herramienta se instala con **acceso restringido a cuentas autorizadas** y **registro de sus usos**, para controlar quién entra y saber qué instituciones y alcaldías la usan, qué consultan y qué descargan.

Esta carpeta trae todo lo necesario. Encaja en la infraestructura actual del SIA: nginx como entrada, el backend de Node.js + Express con un módulo por sistema y PostgreSQL con un esquema por sistema.

```
Persona ─▶ nginx ─▶ /calles-prioritarias/   (auth_request ─▶ /api/calles/sesion: 204 entra · 401 a la pantalla de acceso)
                 ├▶ /acceso/calles/        pantalla de acceso, cambio de contraseña, panel de administración, aviso de privacidad (estáticos)
                 └▶ /api/calles/           módulo «calles» en el backend ─▶ PostgreSQL, esquema calles
```

## Contenido

| Carpeta | Qué es |
|---|---|
| `backend/src/` | Módulo Express (`index.js`) y huellas de contraseña (`contrasenas.js`). Sin dependencias nativas: usa `express` y `pg`, que el backend ya tiene |
| `backend/sql/001_esquema.sql` | Esquema `calles`: usuarios, sesiones, bitácora; función de depuración; cuenta de servicio `calles_app` |
| `backend/scripts/crear_admin.js` | Crea la primera cuenta de administración (las demás, desde el panel) |
| `backend/scripts/servidor_demo.js` | Demostración en una sola máquina, sin PostgreSQL ni nginx: para ensayar antes de instalar |
| `backend/pruebas/` | Pruebas del módulo con una base en memoria (`npm install && npm run pruebas`) |
| `acceso/` | Pantalla de acceso (`index.html`), panel de administración (`admin/`), aviso de privacidad y sus recursos |
| `privacidad/` | Aviso integral, aviso simplificado y solicitud a la Unidad de Transparencia (**borradores**) |

## Antes de abrir: privacidad

El registro de usos trata datos personales: nombre, correo, institución, IP y bitácora. **El inicio de sesión no debe ponerse en operación** hasta que la Unidad de Transparencia apruebe los avisos y se registre el sistema de datos personales. Ver `privacidad/solicitud_unidad_transparencia.md`. Cuando estén aprobados:
1. Se pasan los textos finales a `privacidad/aviso_integral.md`.
2. Se regenera `acceso/aviso-de-privacidad.html` con `python generar_aviso_html.py`.

## Instalación

**1. Base de datos.** Con una cuenta administradora de la base del SIA:
```
psql -d bd_csia -f backend/sql/001_esquema.sql
```
Después, asignar contraseña a la cuenta de servicio (`ALTER ROLE calles_app PASSWORD '…'`) y permitir su conexión solo desde el servidor de aplicaciones, igual que las demás cuentas de servicio.

**2. Backend.**
- Copiar `backend/src/` a la carpeta de módulos de `sia-backend` (por ejemplo `modulos/calles/`).
- Montar el módulo con su propio pool de `pg`, conectado con la cuenta `calles_app`:
  ```js
  const { Pool } = require('pg');
  const calles = require('./modulos/calles')({ pool: new Pool({ /* cuenta calles_app, ssl obligatorio */ }) });
  app.set('trust proxy', /* la red de nginx */);   // para que la bitácora registre la IP de la persona
  app.use('/api/calles', calles);
  ```
- Variable de entorno opcional `CALLES_ORIGEN`. Por omisión es `https://sedema.sia.cdmx.gob.mx`, y es la única procedencia que acepta en peticiones que cambian algo.
- El módulo depura una vez al día lo vencido: bitácora de 24 meses, IP de 6 meses y sesiones vencidas. También puede programarse en la base: `SELECT calles.depurar();`.

**3. Primera cuenta de administración** (en el servidor de aplicaciones, con las variables `PG*` de `calles_app`):
```
node scripts/crear_admin.js correo@sedema.cdmx.gob.mx "Nombre Apellido"
```
Muestra una contraseña temporal; al entrar, se pide cambiarla.

**4. Archivos estáticos.** Copiar `acceso/` al volumen del servidor web, como `acceso-calles/`.

**5. nginx.** En `../nginx_calles_prioritarias.conf.ejemplo`, el bloque «FASE 2 CON INICIO DE SESIÓN» sustituye al bloque 2. Tiene tres partes:
- **2-bis:** la herramienta protegida con `auth_request`.
- **2-ter:** la pantalla de acceso, sin protección.
- **2-cuater:** la API, que va por la ruta `/api/` existente.

Validar con `nginx -t`.

**6. La herramienta, con la sesión configurada.** Se empaqueta con las direcciones de acceso y de cierre:
```
SIA_SESION_INICIO=/acceso/calles/ SIA_SESION_CIERRE=/api/calles/salir python3 08_entrega_sia/empaquetar.py
```
Con eso la herramienta:
- muestra «Cerrar sesión»;
- reconoce la sesión vencida;
- no guarda copia sin conexión;
- registra consultas y descargas (desde la v17.37).

Sin esas variables, por ejemplo en GitHub Pages, no registra nada.

## Comprobación después de instalar

| # | Prueba | Resultado esperado |
|---|---|---|
| 1 | Abrir `/calles-prioritarias/` sin sesión | Lleva a `/acceso/calles/?volver=/calles-prioritarias/` |
| 2 | `curl -sI .../calles-prioritarias/datos/data.bin` sin sesión | `401` |
| 3 | Entrar con la cuenta de administración (contraseña temporal) | Pide crear una contraseña propia y después abre la herramienta |
| 4 | Abrir un enlace con consulta (`?a=007&b=con`) sin sesión, entrar | Vuelve a esa misma consulta |
| 5 | En la herramienta, elegir una alcaldía y descargar un Excel | En el panel, pestaña «Usos», aparecen la consulta y la descarga |
| 6 | Dar de baja una cuenta con la sesión abierta en otro navegador | Esa sesión deja de funcionar al instante |
| 7 | Cinco contraseñas equivocadas seguidas | La cuenta se detiene 15 minutos |
| 8 | «Cerrar sesión» en la herramienta | Vuelve a la pantalla de acceso con «Cerraste tu sesión» |

Antes de instalar se puede ensayar todo en una computadora: `cd backend && npm install && node scripts/servidor_demo.js` y abrir `http://localhost:8090/calles-prioritarias/`. Para ver el registro de usos, la herramienta debe estar construida con la sesión (paso 6) y servirse con `SITIO=…/docs`.

## Operación

- **Altas:**
  - Desde el panel (`/acceso/calles/admin/`, solo cuentas con permiso de administración).
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

## Mantenimiento

- **Pruebas del módulo:** `cd backend && npm install && npm run pruebas`.
- **Aviso de privacidad:** después de editar `privacidad/aviso_integral.md`, regenerar la página con `python 08_entrega_sia/login/generar_aviso_html.py`.
