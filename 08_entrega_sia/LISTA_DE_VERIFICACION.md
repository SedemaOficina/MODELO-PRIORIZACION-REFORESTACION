# Lista de verificación posterior a la instalación

Se corre desde cualquier equipo con `curl`, contra la dirección pública. Sustituir `SITIO` por `https://sedema.sia.cdmx.gob.mx`. Cada renglón dice qué se espera; si no coincide, la columna «Si falla» remite a la causa.

| # | Comprobación | Orden | Se espera | Si falla |
|---|---|---|---|---|
| 1 | La página responde | `curl -sI SITIO/priorizacion-reforestacion/` | `200`, `Content-Type: text/html` | Enlace simbólico o `root` mal puestos |
| 2 | Sin barra final redirige bien | `curl -sI SITIO/priorizacion-reforestacion` | `301` y `Location: /priorizacion-reforestacion/` (relativa, sin `http://`) | Falta el bloque 1 del ejemplo (`absolute_redirect off`) |
| 3 | Política de seguridad de contenido | `curl -sI SITIO/priorizacion-reforestacion/ \| grep -i content-security` | La política del ejemplo, **una sola vez** | Si aparece dos veces, la general del sitio se suma a la de la ruta y gana la más estricta: dejar una |
| 4 | Geolocalización permitida | `curl -sI SITIO/priorizacion-reforestacion/ \| grep -i permissions-policy` | `geolocation=(self)` o sin cabecera | Con `geolocation=()` el botón «Mi ubicación» no funciona |
| 5 | Datos sin doble compresión | `curl -sI -H 'Accept-Encoding: gzip' SITIO/priorizacion-reforestacion/datos/data.bin` | `200`, `application/octet-stream`, **sin** `Content-Encoding`, `Content-Length` igual al tamaño de `sitio/datos/data.bin` del paquete (`ls -l`) | `gzip_types` incluye `application/octet-stream` o falta el bloque 3 |
| 6 | Datos íntegros | `curl -s SITIO/priorizacion-reforestacion/datos/data.bin \| sha256sum` | La suma de `MANIFIESTO.sha256` | Transferencia incompleta o un intermediario altera el archivo |
| 7 | Texto comprimido | `curl -sI -H 'Accept-Encoding: gzip' SITIO/priorizacion-reforestacion/app.js` | `Content-Encoding: gzip` | Compresión de texto apagada: la primera visita pesa 1.7 MB más |
| 8 | Caché de archivos con huella | `curl -sI 'SITIO/priorizacion-reforestacion/app.js?v=x'` | `Cache-Control: public, max-age=31536000, immutable` | Falta el `map` del fragmento A |
| 9 | La página no se guarda en caché, tampoco la de un enlace de avenida | `curl -sI SITIO/priorizacion-reforestacion/` y `curl -sI 'SITIO/priorizacion-reforestacion/?a=09&v=123'` | `Cache-Control: no-cache` en las dos | Igual que 8. Si solo la segunda trae `immutable`, el `map` es el anterior a la v17.31 (se decidía por `$arg_v`, que en la página es la avenida): un enlace compartido de avenida dejaría la página guardada un año |
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
