# Inicio de sesión: qué hace la herramienta y qué construye el SIA

El login es **opcional** para una herramienta de consulta y su finalidad está por decidirse (ver `05_documentacion/despliegue_sia.md`). Este documento describe cómo se integra si se decide.

## 1. Principio

La sesión no puede resolverse dentro de la página: todo lo que la página contiene se puede leer. La protege el servidor, con `auth_request` de nginx: antes de entregar cualquier archivo de `/calles-prioritarias/`, nginx pregunta al backend si la cookie de sesión es válida.

```
Navegador ── pide /calles-prioritarias/datos/data.bin ──▶ nginx
                                                          │ auth_request ──▶ backend  /api/calles/sesion
                                                          │◀── 204 (sesión válida)  o  401
                                                          ▼
                                              entrega el archivo  o  responde 401
```

## 2. Lo que la herramienta ya hace

| Capacidad | Dónde |
|---|---|
| Reconoce la sesión vencida: respuesta 401 o 403, o una página HTML donde esperaba datos o un programa | `esSesion`, `causaFalla` en `02_fuente/js/01_utilidades.js` |
| Dice «Tu sesión terminó. Vuelve a iniciar sesión para continuar.», con enlace a la pantalla de acceso, en lugar de «revisa tu conexión» | Carga inicial, Excel y fichas PDF |
| Con la sesión vencida no entrega archivos de respaldo (antes sustituía el Excel por CSV) | `11_descargas.js` |
| Muestra «Cerrar sesión» en el encabezado si la instalación define esa dirección | `SIA_SESION_CIERRE` |
| No guarda copia para uso sin conexión cuando hay sesión, y retira la que hubiera | `16_arranque.js` |

Las direcciones se fijan al empaquetar (`INSTALACION.md`, sección 7).

## 3. Lo que debe cumplir el servidor

1. **Datos y programas responden 401 sin sesión**, no 200 ni 302. Una redirección a otra ruta del mismo dominio también se reconoce (llega una página HTML), pero una redirección a otro dominio se ve como falla de red.
2. **Solo la página (`/calles-prioritarias/`) redirige a la pantalla de acceso**, con la dirección de regreso.
3. La cookie de sesión: `Secure`, `HttpOnly`, `SameSite=Lax`, con ruta `/`.
4. El cierre de sesión es una dirección que invalida la cookie y lleva a la pantalla de acceso.

El bloque comentado «Fase 2 con inicio de sesión» del ejemplo de nginx implementa los puntos 1 y 2.

## 4. Lo que construye el SIA

- **Módulo de sesión en el backend de aplicaciones**, con su propia cuenta de base de datos como los demás módulos: `POST /api/calles/entrar`, `GET /api/calles/sesion` (204 o 401), `POST /api/calles/salir`.
- **Esquema propio** con la tabla de usuarios (correo, contraseña con hash argon2 o bcrypt, alcaldía, rol, activo, fechas) y la bitácora de accesos.
- **Pantalla de acceso**, fuera de la herramienta.
- **Alta y baja de usuarios.**

Tamaño esperado: decenas de usuarios; el módulo no añade carga apreciable ni ocupa disco, salvo la bitácora.

## 5. Qué puede y qué no puede registrarse

Los Excel y las fichas se generan en el navegador con datos ya descargados: **el servidor no ve qué territorio se consultó ni qué se descargó**. Con el esquema anterior el SIA obtiene la bitácora de **accesos** (quién entró y cuándo), no la de descargas.

Si se quisiera registrar descargas, habría que añadir un aviso al servidor desde las dos funciones por las que pasan todas (`deliver` y `deliverBlob`, en `11_descargas.js`). Sería un registro informativo, que una persona con conocimientos podría evitar, y convertiría la herramienta en un sistema que envía datos, con su aviso de privacidad. No está hecho: es una decisión institucional.

## 6. Criterios de aceptación de la pantalla de acceso

Si la pantalla de acceso no es accesible, nadie con esa necesidad entra a la herramienta. Se proponen como criterio de aceptación:

1. Cada campo con su etiqueta visible y asociada; no solo texto de ejemplo dentro del campo.
2. Se opera completa con teclado; el orden de tabulación sigue el orden visual; el foco es visible.
3. `autocomplete="username"` y `autocomplete="current-password"`; se permite pegar la contraseña y usar gestores de contraseñas.
4. Los errores se dicen en texto, junto al campo, y se anuncian (`role="alert"`); no solo con color.
5. El mensaje de error no revela si el correo existe.
6. Contraste de texto de 4.5:1 y de controles de 3:1.
7. Botón para mostrar la contraseña.
8. Funciona a 320 px de ancho y con el texto ampliado al 200 %.
9. Objetivos táctiles de 44 px en teléfono.
10. Sin límite de tiempo para escribir; si la sesión va a vencer, se avisa.
11. Sin CAPTCHA que dependa solo de la vista.
12. Idioma declarado (`lang="es-MX"`) y título de página propio.
13. Tras entrar, regresa a la dirección que la persona pidió, con su consulta.

## 7. Antes de abrir

- **Datos personales:** el login trata correo, contraseña, bitácora de accesos y dirección IP. Requiere aviso de privacidad y registro del tratamiento ante la Unidad de Transparencia **antes** de construir el módulo.
- **Cierre del piloto:** con login, la página de GitHub y el repositorio público deben apagarse (`CIERRE_FASE_1.md`); si no, el login no restringe nada.
