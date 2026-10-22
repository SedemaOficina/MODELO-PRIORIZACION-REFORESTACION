# Lista de verificación posterior a la instalación

Se corre desde cualquier equipo con `curl`, contra la dirección pública. Sustituir `SITIO` por `https://sedema.sia.cdmx.gob.mx`. Cada renglón dice qué se espera; si no coincide, la columna «Si falla» remite a la causa.

| # | Comprobación | Orden | Se espera | Si falla |
|---|---|---|---|---|
| 1 | La página responde | `curl -sI SITIO/priorizacion-reforestacion/` | `200`, `Content-Type: text/html` | Enlace simbólico o `root` mal puestos |
| 2 | Sin barra final redirige bien | `curl -sI SITIO/priorizacion-reforestacion` | `301` y `Location: /priorizacion-reforestacion/` (relativa, sin `http://`) | Falta el bloque 1 del ejemplo (`absolute_redirect off`) |
| 3 | Política de seguridad de contenido | `curl -sI SITIO/priorizacion-reforestacion/ \| grep -i content-security` | La política del ejemplo, **una sola vez** | Si aparece dos veces, la general del sitio se suma a la de la ruta y gana la más estricta: dejar una |
| 4 | Geolocalización permitida | `curl -sI SITIO/priorizacion-reforestacion/ \| grep -i permissions-policy` | `geolocation=(self)` o sin cabecera | Con `geolocation=()` el botón «Mi ubicación» no funciona |
| 5 | Datos sin doble compresión | `curl -sI -H 'Accept-Encoding: gzip' SITIO/priorizacion-reforestacion/datos/data.bin` | `200`, `application/octet-stream`, **sin** `Content-Encoding`, `Content-Length` igual al tamaño de `sitio/datos/data.bin` del paquete (`ls -l`) | `gzip_types` incluye `application/octet-stream` o falta el bloque 3 |
| 6 | Datos íntegros | `curl -s SITIO/priorizacion-reforestacion/datos/data.bin \| sha256sum` | La suma de `sitio/datos/data.bin` en `MANIFIESTO.sha256` | Transferencia incompleta o un intermediario altera el archivo |
| 7 | Texto comprimido | `curl -sI -H 'Accept-Encoding: gzip' SITIO/priorizacion-reforestacion/app.js` | `Content-Encoding: gzip` | Compresión de texto apagada: la primera visita pesa 1.7 MB más |
| 8 | Caché de archivos con huella | `curl -sI 'SITIO/priorizacion-reforestacion/app.js?v=x'` | `Cache-Control: public, max-age=31536000, immutable` | Falta el `map` del fragmento A |
| 9 | La página no se guarda en caché, tampoco la de un enlace de avenida | `curl -sI SITIO/priorizacion-reforestacion/` y `curl -sI 'SITIO/priorizacion-reforestacion/?a=09&v=123'` | `Cache-Control: no-cache` en las dos | Igual que 8. Si solo la segunda trae `immutable`, el `map` instalado decide solo por `$arg_v` (que en la página es la avenida) y no por la ruta: un enlace compartido de avenida dejaría la página guardada un año |
| 10 | Tipografías | `curl -sI SITIO/priorizacion-reforestacion/fuentes/cabin.woff2` | `200`, `font/woff2` | `mime.types` sin woff2 |
| 11 | Nada fuera de la subruta | Abrir la página con las herramientas del navegador (pestaña Red) | Ninguna solicitud a `SITIO/` fuera de `/priorizacion-reforestacion/`; ninguna con error | Una ruta absoluta: avisar a quien mantiene la herramienta |
| 12 | Sin violaciones de la política | Consola del navegador al abrir, elegir una alcaldía, descargar un Excel y una ficha, y encender los dos mapas de fondo | Ningún mensaje «Refused to…» | La política instalada no es la del ejemplo |
| 13 | Versión | Pestaña Descargas, al final | «Versión» igual a la de `VERSION.txt` del paquete | Se instaló otro paquete o el enlace apunta a una versión anterior |
| 14 | Teléfono | Abrir en un teléfono con datos móviles; «Mi ubicación» | Pide permiso y ubica | Ver 4. Requiere HTTPS, que da el terminador |
| 15 | Límite de velocidad | Recargar cinco veces seguidas | Ninguna respuesta `503` | Ráfaga de `limit_req` menor a 30 |

Con inicio de sesión, además:

| # | Comprobación | Orden | Se espera |
|---|---|---|---|
| 16 | Sin sesión, la página lleva al acceso | `curl -sI SITIO/priorizacion-reforestacion/` | `302` a la pantalla de acceso |
| 17 | Sin sesión, los datos responden 401 | `curl -sI SITIO/priorizacion-reforestacion/datos/data.bin` | `401` (no `200` ni `302`) |
| 18 | Sin sesión, los programas responden 401 | `curl -sI SITIO/priorizacion-reforestacion/libs/xlsx.js` | `401` |
| 19 | Sesión vencida a media consulta | Borrar la cookie con la página abierta y pedir una ficha | «Tu sesión terminó…» con el enlace «Iniciar sesión» |
| 20 | La pantalla de acceso no está protegida | `curl -sI SITIO/priorizacion-reforestacion/acceso/` | `200`, `text/html` (no `302` ni `401`) |
| 21 | La API llega al módulo | `curl -sI SITIO/priorizacion-reforestacion/api/sesion` | `401` del módulo (no `404` ni `302`) |
| 22 | Cookie limitada a la herramienta | Entrar y revisar la cookie `priorizacion_reforestacion_sesion` en el navegador | Ruta `/priorizacion-reforestacion/`, `HttpOnly`, `Secure`, `SameSite=Lax` |

Base del inicio de sesión (las revisa quien opera PostgreSQL; detalle en `INSTALACION.md`, sección 4 bis):

| # | Comprobación | Cómo | Se espera |
|---|---|---|---|
| 23 | Depuración diaria programada | Tarea del SIA (en la base o en el sistema) que corre `SELECT priorizacion_reforestacion.depurar();` con la cuenta dueña del esquema, una vez al día | La tarea existe y su última ejecución terminó sin error. No basta la depuración que pide el módulo: si el backend se reinicia antes de 24 horas, no llega a correr |
| 24 | Respaldo programado | Tarea diaria con `pg_dump -n priorizacion_reforestacion -Fc` y la cuenta dueña del esquema (no la del servicio) | Hay un respaldo de hoy; `pg_restore --list` del archivo cuenta 3 `TABLE DATA`; está cifrado y fuera del servidor de base de datos, según la política del SIA |
| 25 | Restauración de ensayo | Restaurar el último respaldo en una base de ensayo, correr `depurar()` y la verificación de la sección 4 bis; después borrar la base de ensayo | Conteos coherentes con producción, permisos de `priorizacion_reforestacion_api` iguales a los de `02-…`, controles negativos fallan. Repetir cada tres meses |

Antes de abrir al público (dependen de la configuración general del SIA; no se pudieron comprobar fuera de su servidor):

| # | Comprobación | Cómo | Se espera | Si falla |
|---|---|---|---|---|
| 26 | Configuración de nginx válida | `nginx -t` después de integrar los fragmentos del ejemplo | `syntax is ok` y `test is successful` | El ejemplo no se validó con `nginx -t` donde se escribió: corregir lo que señale |
| 27 | IP de origen de cada persona | En `sia-backend`, `src/comun/procedencia.ts` exporta `ipDeOrigen(req)`, que descarta los intermediarios listados en `SIA_PROXIES_CONFIABLES`. Entrar desde dos redes distintas (por ejemplo, la oficina y los datos del celular) y revisar la columna `ip` de la bitácora | Dos direcciones distintas, ninguna la del nginx ni la del intermediario de entrada | Sin esa función el módulo no compila. Si `SIA_PROXIES_CONFIABLES` no lista todos los intermediarios (el de entrada y el nginx), todas las peticiones parecen venir de uno de ellos y el límite de intentos fallidos por red detiene a todos a la vez |
| 28 | Errores sin rastro del servidor | `curl -s -i -X POST -H 'Content-Type: application/json' --data '{"correo":' SITIO/priorizacion-reforestacion/api/entrar` | `400` sin `SyntaxError`, `node_modules` ni rutas del servidor | La respuesta la da el manejo general de errores de `sia-backend`, antes del módulo: fijar `NODE_ENV=production` o un manejador general que no muestre el rastro |
| 29 | Con sesión, la caché es privada | Entrar, copiar el valor de la cookie `priorizacion_reforestacion_sesion` y correr `curl -sI -b 'priorizacion_reforestacion_sesion=VALOR' 'SITIO/priorizacion-reforestacion/app.js?v=x'` | `Cache-Control: private, max-age=31536000, immutable` (no `public`) | En el bloque 2-bis falta `add_header Cache-Control $priorizacion_reforestacion_cache_sesion always;` o el `map` de la fase 2 en el fragmento A |
