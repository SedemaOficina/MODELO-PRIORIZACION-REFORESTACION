# Modelo de priorización de reforestación urbana · Paquete de instalación para el SIA

Secretaría del Medio Ambiente de la Ciudad de México · Oficina de la Secretaría · Sistema de Información Ambiental.

Este paquete trae todo lo necesario para instalar la herramienta en `sedema.sia.cdmx.gob.mx`, con acceso restringido a cuentas autorizadas y registro de usos. Versión, fecha y parámetros: `VERSION.txt`.

## Cómo llega

Cada entrega es una **etiqueta** `entrega-AAAA-MM-DD` del repositorio privado `SedemaOficina/modelo-priorizacion-reforestacion-sia`. Se instala desde la etiqueta, no desde lo último de la rama:
```
git clone https://github.com/SedemaOficina/modelo-priorizacion-reforestacion-sia.git paquete-priorizacion
cd paquete-priorizacion && git checkout entrega-AAAA-MM-DD
sha256sum -c --quiet MANIFIESTO.sha256          # no debe decir nada: todos los archivos coinciden
```
Para una entrega nueva, en el mismo clon: `git fetch origin --tags`, `git checkout entrega-NUEVA` y la misma comprobación. Qué cambió: `git diff entrega-ANTERIOR entrega-NUEVA --stat`.

## Lo que hay que saber

- **GeoServer:** la herramienta **no usa GeoServer** y esta entrega no trae capas para publicar. Todos sus datos viajan dentro de `sitio/datos/`.
- **Inventario de arbolado:** lo que trae `sitio/datos/inventario/` es un avance. Cuando llegue el inventario completo se reemplazarán esos archivos en una entrega nueva; para el SIA será solo volver a copiar `sitio/` (`documentos/INSTALACION.md`, «Actualización»).

## Contenido

| Carpeta o archivo | Qué es | Dónde va |
|---|---|---|
| `sitio/` | La herramienta: sitio estático (HTML, CSS, JavaScript y sus archivos de datos: los del modelo, el fondo «Calles» y el inventario de arbolado). `VERSION.txt` dice cuántos archivos trae y si incluye la clave del satélite de Esri; sin ella, el satélite funciona por ahora sin clave. Ya trae la sesión configurada | Servidor web, en la subruta `/priorizacion-reforestacion/` |
| `MANIFIESTO.sha256` | Suma SHA-256 de **cada archivo del paquete** (salvo él mismo), para comprobar que llegó y se copió completo | — |
| `login/acceso/` | Pantalla de acceso, cambio de contraseña, panel de administración y aviso de privacidad (estáticos) | Servidor web, en `/priorizacion-reforestacion/acceso/` |
| `login/backend/` | Con la misma estructura que el repositorio `sia-backend`: el módulo en TypeScript (`src/modulos/priorizacion-reforestacion/`), su SQL (`db/priorizacion_reforestacion/`) y la herramienta de la primera cuenta (`herramientas/priorizacion-reforestacion/`) | Repositorio `sia-backend`, en las mismas rutas |
| `documentos/` | Guía de instalación, ejemplo de nginx, lista de verificación, descripción del inicio de sesión y contrato de datos (formato de los archivos y propuesta del inventario en PostGIS) | — |

## Si llega como ZIP

El ZIP y su archivo `.sha256` **viajan siempre juntos**, en el mismo enlace de descarga: sin el `.sha256` no hay con qué comprobar el ZIP.

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

Después de descomprimir, `MANIFIESTO.sha256` comprueba **todos** los archivos del paquete (`sitio/`, `login/`, `documentos/`, `LEEME.md` y `VERSION.txt`), desde la carpeta del paquete:
```
cd modelo-priorizacion-reforestacion_vX.Y_AAAAMMDD && sha256sum -c MANIFIESTO.sha256      # cada renglón debe decir «La suma coincide» u «OK»
```
`sha256sum -c --quiet MANIFIESTO.sha256` muestra solo lo que no coincida.

## Orden de instalación

1. **Base de datos y backend:** `login/LEEME.md`, pasos 0 a 4. Se copian las carpetas a `sia-backend`, se aplica el SQL con `db/aplicar.sh`, se agregan las variables con `agregar-clave-modulo.sh` y, **al final**, se despliega el binario; después se crea la primera cuenta de administración.
2. **Archivos estáticos:** `sitio/` y `login/acceso/`, según `documentos/INSTALACION.md` y `login/LEEME.md`, paso 5.
3. **nginx:** `documentos/nginx_priorizacion_reforestacion.conf.ejemplo`, bloque «FASE 2 CON INICIO DE SESIÓN». Validar con `nginx -t`.
4. **Comprobación:** `documentos/LISTA_DE_VERIFICACION.md` y la tabla «Comprobación después de instalar» de `login/LEEME.md`.
5. **Cuentas:** las opera la Oficina de la Secretaría desde el panel de administración (`/priorizacion-reforestacion/acceso/admin/`), una por una o en bloque con «Alta masiva desde CSV». El SIA mantiene el servidor, la base de datos y sus respaldos.

## En una página

- **Herramienta:** sitio estático; no usa base de datos ni GeoServer. A terceros solo pide las imágenes del satélite (Esri), si la persona lo enciende; el fondo «Calles» viaja con el sitio. Con la sesión configurada, avisa al servidor de cada consulta y descarga (registro de usos).
- **Inicio de sesión:** nginx protege la herramienta con `auth_request`; el módulo `priorizacion-reforestacion` del backend valida la sesión y registra accesos, consultas y descargas en el esquema `priorizacion_reforestacion` de PostgreSQL.
- **Datos personales:** nombre, correo, área, cargo, institución, alcaldía o dependencia u organización, bitácora de uso y dirección IP. El aviso de privacidad se publica en la pantalla de acceso. **No abrir el inicio de sesión sin la aprobación por escrito de la Unidad de Transparencia** (número de oficio). La depuración automática cumple sus plazos: bitácora 24 meses, IP 6 meses y cuentas dadas de baja 24 meses después de la baja.
- **Navegadores:** Chrome o Edge 80, Firefox 79, Safari 15, o posteriores, con WebGL 2.
- **Soporte:** primer nivel, el SIA (servidor); segundo nivel, la Oficina de la Secretaría (contenido, datos y nuevas versiones).
