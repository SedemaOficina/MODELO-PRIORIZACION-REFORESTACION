# Modelo de priorización de reforestación urbana · Paquete de instalación para el SIA

Secretaría del Medio Ambiente de la Ciudad de México · Oficina de la Secretaría · Sistema de Información Ambiental.

Este paquete trae todo lo necesario para instalar la herramienta en `sedema.sia.cdmx.gob.mx`, con acceso restringido a cuentas autorizadas y registro de usos, y para publicar sus capas en el GeoServer. Versión, fecha y parámetros: `VERSION.txt`.

## Contenido

| Carpeta o archivo | Qué es | Dónde va |
|---|---|---|
| `sitio/` | La herramienta: sitio estático (HTML, CSS, JavaScript y tres archivos de datos, 8 MB). Ya trae la clave del mapa de fondo y la sesión configurada | Servidor web, en la subruta `/priorizacion-reforestacion/` |
| `MANIFIESTO.sha256` | Suma SHA-256 de cada archivo de `sitio/`, para comprobar que se copió completo | — |
| `login/acceso/` | Pantalla de acceso, cambio de contraseña, panel de administración y aviso de privacidad (estáticos) | Servidor web, en `/acceso/priorizacion-reforestacion/` |
| `login/backend/` | Con la misma estructura que el repositorio `sia-backend`: el módulo en TypeScript (`src/modulos/priorizacion-reforestacion/`), su SQL (`db/priorizacion_reforestacion/`) y la herramienta de la primera cuenta (`herramientas/priorizacion-reforestacion/`) | Repositorio `sia-backend`, en las mismas rutas |
| `capas_geoserver/` | Tres capas en GeoPackage (frentes de manzana, vialidades primarias y colonias) con sus estilos | GeoServer (o PostGIS) |
| `documentos/` | Guía de instalación, ejemplo de nginx, lista de verificación y descripción del inicio de sesión | — |

## Comprobar que el paquete llegó completo

Junto al ZIP se entrega un archivo con el mismo nombre terminado en `.sha256`. Trae la **suma SHA-256** del ZIP: un código que se calcula a partir de su contenido exacto. Si el ZIP llegó completo y sin cambios, al calcularla sale el mismo código; si se dañó al copiarlo o alguien lo modificó, sale otro. La suma no puede ir dentro del ZIP, porque al incluirla el ZIP cambiaría.

En el servidor (Linux), en la carpeta donde están los dos archivos:
```
sha256sum -c modelo-priorizacion-reforestacion_vX.Y_AAAAMMDD.zip.sha256      # debe decir «La suma coincide» u «OK»
```
En Windows (PowerShell):
```
certutil -hashfile modelo-priorizacion-reforestacion_vX.Y_AAAAMMDD.zip SHA256
```
y comparar el resultado con el código del archivo `.sha256`.

Después de descomprimir, `MANIFIESTO.sha256` permite comprobar cada archivo de la herramienta: `cd sitio && sha256sum -c ../MANIFIESTO.sha256`. Las capas tienen el suyo: `cd capas_geoserver && sha256sum -c MANIFIESTO.sha256`.

## Orden de instalación

1. **Base de datos y backend:** `login/LEEME.md`, pasos 0 a 4. Se copian las carpetas a `sia-backend`, se aplica el SQL con `db/aplicar.sh`, se agregan las variables con `agregar-clave-modulo.sh` y, **al final**, se despliega el binario; después se crea la primera cuenta de administración.
2. **Archivos estáticos:** `sitio/` y `login/acceso/`, según `documentos/INSTALACION.md` y `login/LEEME.md`, paso 4.
3. **nginx:** `documentos/nginx_priorizacion_reforestacion.conf.ejemplo`, bloque «FASE 2 CON INICIO DE SESIÓN». Validar con `nginx -t`.
4. **Comprobación:** `documentos/LISTA_DE_VERIFICACION.md` y la tabla «Comprobación después de instalar» de `login/LEEME.md`.
5. **Capas:** `capas_geoserver/LEEME.md`. Son independientes de la herramienta: se pueden publicar antes o después.
6. **Cuentas:** desde el panel de administración (`/acceso/priorizacion-reforestacion/admin/`), una por una o en bloque con «Alta masiva desde CSV».

## En una página

- **Herramienta:** sitio estático; no usa base de datos ni GeoServer. Solo pide a terceros las teselas del mapa de fondo si la persona lo enciende.
- **Inicio de sesión:** nginx protege la herramienta con `auth_request`; el módulo `priorizacion-reforestacion` del backend valida la sesión y registra accesos, consultas y descargas en el esquema `priorizacion_reforestacion` de PostgreSQL.
- **Datos personales:** nombre, correo, institución, alcaldía, bitácora de uso y dirección IP. El aviso de privacidad se publica en la pantalla de acceso. La depuración automática cumple sus plazos: bitácora 24 meses, IP 6 meses y cuentas dadas de baja 24 meses después de la baja.
- **Navegadores:** Chrome o Edge 80, Firefox 79, Safari 15, o posteriores, con WebGL 2.
- **Soporte:** primer nivel, el SIA (servidor); segundo nivel, la Oficina de la Secretaría (contenido, datos y nuevas versiones).
