# Publicación en el SIA y login: decisiones previas

Extracto público de las decisiones registradas el 24 de septiembre de 2026. Los detalles de infraestructura quedan en la bitácora, que no se publica.

## Punto de partida

- La herramienta vivirá en la infraestructura del Sistema de Información Ambiental (`sedema.sia.cdmx.gob.mx`) como **sitio estático** en una ruta propia (por ejemplo, `/priorizacion-reforestacion/`). La publica el equipo del SIA; la entrega debe ir lista y documentada.
- **El login no puede resolverse dentro de la página:** cualquier contraseña incluida en ella se puede leer. Debe resolverse en el servidor, de modo que ni la página ni los datos se descarguen sin sesión.
- Opción recomendada: un módulo de autenticación en el servidor de aplicaciones del SIA, con usuarios por persona, contraseñas con hash, sesión por cookie segura y bitácora de accesos y descargas. Opción provisional para un piloto: autenticación básica del servidor web, sin correo ni recuperación de contraseña.

## Decisión previa: para qué es el login

Opciones: A) restringir el acceso a cuentas autorizadas; B) saber quién usa la herramienta, qué consulta y qué descarga. **Se adoptaron las dos (5 de octubre de 2026).** El módulo, la pantalla de acceso, el panel y los textos de privacidad están en `08_entrega_sia/login/`. Con el login, la página pública de GitHub y las copias de respaldo se cierran cuando la herramienta esté en el SIA (`08_entrega_sia/CIERRE_FASE_1.md`).

## Nueve decisiones

| # | Decisión | Opciones | Recomendación | Quién decide |
|---|---|---|---|---|
| 1 | Tipo de usuario | Una cuenta por persona / cuenta compartida por alcaldía | Por persona | Oficina de la Secretaría |
| 2 | Alta y baja de usuarios | SIA / Oficina de la Secretaría / enlace de cada alcaldía | El SIA da de alta; cada alcaldía designa uno o dos enlaces que solicitan las cuentas por oficio o correo institucional | Oficina de la Secretaría con el SIA |
| 3 | Qué ve cada usuario | Toda la ciudad / solo su alcaldía | Todos ven todo (restringir obliga a partir los datos; las avenidas cruzan alcaldías) | Secretaría |
| 4 | Recuperación de contraseña | Automática por correo / manual por el SIA | Manual en el piloto | SIA |
| 5 | Datos personales | Aviso de privacidad y registro del tratamiento | Obligatorio si se guardan correos; turnar a la Unidad de Transparencia antes de abrir | Jurídico / Transparencia |
| 6 | Origen de las capas | Archivos de la herramienta / servicio de mapas del SIA | Archivos de la herramienta en el primer año | SIA |
| 7 | Forma de arranque | Piloto con autenticación básica / módulo completo | Piloto de 4 a 6 semanas con 3 o 4 alcaldías; después el módulo completo | Oficina de la Secretaría con el SIA |
| 8 | Dirección web | `sedema.sia.cdmx.gob.mx/priorizacion-reforestacion/` u otra | Ruta corta y estable (irá impresa en fichas y oficios) | SIA |
| 9 | Actualizaciones | Quién sube cada versión | La Oficina de la Secretaría entrega el paquete; el SIA lo publica y se registra en la bitácora | SIA |

**Ruta sugerida:** definir la decisión previa y las 1, 2 y 7; reunión con el SIA para las 4, 6, 8 y 9; turno a Transparencia por la 5, en paralelo; con eso se prepara el paquete técnico.

**Estado:** en espera.

## Paquete de entrega

La guía de instalación, el ejemplo de nginx, la lista de verificación y la integración del inicio de sesión están en `08_entrega_sia/`.

## Puntos técnicos ya identificados para la instalación

- **Política de seguridad de contenido:** resuelto. El sitio no trae programas ni estilos en línea y funciona bajo una política estricta (la del ejemplo de nginx).
- **Uso sin conexión (`sw.js`):** resuelto. Con las direcciones de sesión configuradas, la herramienta no guarda copia local y retira la que hubiera.
- **Mapas de fondo:** las cabeceras del servidor deben permitir imágenes de `basemaps.cartocdn.com`, `services.arcgisonline.com` y `static-map-tiles-api.arcgis.com`, o bien usar un fondo propio del SIA.
- **Servidor web:** redirección de la ruta sin barra final, `.bin` como `application/octet-stream` sin volver a comprimir, y caché larga para los archivos con `?v=`.
