# Inicio de sesión: qué hace la herramienta y qué construye el SIA

La herramienta se instala con acceso restringido a cuentas autorizadas y registro de usos. Este documento explica el principio y lo que se entrega; la instalación está en `login/LEEME.md`.

## 1. Principio

La sesión no puede resolverse dentro de la página: todo lo que la página contiene se puede leer. La protege el servidor, con `auth_request` de nginx: antes de entregar cualquier archivo de `/priorizacion-reforestacion/`, nginx pregunta al backend si la cookie de sesión es válida.

```
Navegador ── pide /priorizacion-reforestacion/datos/data.bin ──▶ nginx
                                                          │ auth_request ──▶ backend  /api/priorizacion-reforestacion/sesion
                                                          │◀── 204 (sesión válida)  o  401
                                                          ▼
                                              entrega el archivo  o  responde 401
```

## 2. Lo que la herramienta ya hace

| Capacidad | Dónde (en `sitio/`) |
|---|---|
| Reconoce la sesión vencida: respuesta 401 o 403, o una página HTML donde esperaba datos o un programa | `esSesion`, `causaFalla` en `app.js` |
| Dice «Tu sesión terminó. Vuelve a iniciar sesión para continuar.», con enlace a la pantalla de acceso, en lugar de «revisa tu conexión» | Carga inicial, Excel y fichas PDF |
| Con la sesión vencida no entrega archivos de respaldo | Descargas, en `app.js` |
| Muestra «Salir» junto a los logotipos si la instalación define esa dirección | `window.SIA_SESION` en `config.js` |
| No guarda copia para uso sin conexión cuando hay sesión, y retira la que hubiera | Arranque, en `app.js` |

Las direcciones se fijan al armar el paquete; las de este paquete están en `INSTALACION.md`, sección 7, y en `VERSION.txt`.

## 3. Lo que debe cumplir el servidor

1. **Datos y programas responden 401 sin sesión**, no 200 ni 302. Una redirección a otra ruta del mismo dominio también se reconoce (llega una página HTML), pero una redirección a otro dominio se ve como falla de red.
2. **Solo la página (`/priorizacion-reforestacion/`) redirige a la pantalla de acceso**, con la dirección de regreso.
3. La cookie de sesión: `Secure`, `HttpOnly`, `SameSite=Lax`, con ruta `/`.
4. El cierre de sesión es una dirección que invalida la cookie y lleva a la pantalla de acceso.

El bloque comentado «Fase 2 con inicio de sesión» del ejemplo de nginx implementa los puntos 1 y 2.

## 4. Lo que se entrega construido

El login tiene dos finalidades: **controlar quién entra** y **saber los usos**. Está construido y probado en `login/`:
- **Módulo `priorizacion-reforestacion` para `sia-backend`** (TypeScript, Express 5), con su propio pool y su propia cuenta de base de datos (`priorizacion_reforestacion_api`), con la misma forma que los demás módulos. Direcciones:
  - `POST /api/priorizacion-reforestacion/entrar`
  - `GET /api/priorizacion-reforestacion/sesion` (204 o 401, para `auth_request`)
  - `GET|POST /api/priorizacion-reforestacion/salir`
  - `POST /api/priorizacion-reforestacion/uso`
  - `POST /api/priorizacion-reforestacion/contrasena`
  - `/api/priorizacion-reforestacion/admin/…`
- **Esquema `priorizacion_reforestacion`**: usuarios (contraseñas con huella scrypt), sesiones y bitácora, con depuración automática según los plazos del aviso de privacidad.
- **Pantalla de acceso, cambio de contraseña, panel de administración y aviso de privacidad**, en `/acceso/priorizacion-reforestacion/`, fuera de la herramienta. Cumplen los criterios de la sección 6.
- **Registro de usos en la herramienta:** consultas y descargas, solo cuando está instalada con sesión.

Al SIA le corresponde instalarlo (`login/LEEME.md`) y operar las altas y bajas desde el panel. Tamaño esperado: decenas de usuarios; el módulo no añade carga apreciable ni ocupa disco, salvo la bitácora.

## 5. Qué se registra y qué no

- **Accesos y visitas:** los registra el servidor y no se pueden evitar.
- **Consultas y descargas:** los Excel, las fichas y los mapas se generan en el navegador con datos ya descargados, así que el servidor no ve qué se descarga. La herramienta lo **avisa** al servidor (`navigator.sendBeacon` a `/api/priorizacion-reforestacion/uso`) desde `deliver` y `deliverBlob` (`11_descargas.js`) y al detenerse en un ámbito (`usoConsulta`, `10_seleccion.js`).
- Ese aviso es **informativo**: una persona con conocimientos técnicos podría evitarlo. El control de acceso, en cambio, lo hace el servidor.
- El detalle de lo que se registra está en `login/LEEME.md` y en el aviso de privacidad (`login/acceso/aviso-de-privacidad.html`).

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
13. Tras entrar, regresa a la dirección solicitada, con su consulta.

## 7. Antes de abrir

- **Datos personales:** el login trata correo, contraseña, bitácora de accesos y dirección IP. El aviso de privacidad se publica en la pantalla de acceso.
- **Versión piloto en GitHub:** mientras siga en línea la versión de prueba en GitHub, el login no restringe nada. La Oficina de la Secretaría la retira cuando la herramienta quede publicada en el SIA.
