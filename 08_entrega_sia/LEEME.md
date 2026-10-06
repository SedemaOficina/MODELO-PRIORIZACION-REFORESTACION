# Entrega al SIA · Modelo de priorización de reforestación urbana

Todo lo que el equipo del Sistema de Información Ambiental necesita para instalar, verificar, actualizar y operar la herramienta en `sedema.sia.cdmx.gob.mx/calles-prioritarias/` sin depender de quien la elaboró.

**Cómo se entrega:** `python 08_entrega_sia/empaquetar.py` arma `_local/entrega/modelo-priorizacion-reforestacion_vX.Y_AAAAMMDD.zip`, que se entrega en memoria USB. Trae solo lo que se instala: `LEEME.md` (portada, desde `LEEME_PAQUETE.md`), `sitio/` con la sesión configurada, `login/` sin pruebas ni demostraciones, `capas_geoserver/` y `documentos/`. Las instrucciones para quien mantiene el repositorio van entre `<!-- solo-repositorio -->` y no llegan al paquete.

| Documento | Para qué |
|---|---|
| [`INSTALACION.md`](INSTALACION.md) | Instalar, actualizar y revertir, paso a paso |
| [`nginx_calles_prioritarias.conf.ejemplo`](nginx_calles_prioritarias.conf.ejemplo) | Los dos fragmentos de configuración de nginx |
| [`LISTA_DE_VERIFICACION.md`](LISTA_DE_VERIFICACION.md) | 19 comprobaciones con `curl` y navegador, y qué revisar si alguna falla |
| [`SESION_Y_LOGIN.md`](SESION_Y_LOGIN.md) | Cómo se integra un inicio de sesión: qué hace ya la herramienta y qué construye el SIA |
| [`CIERRE_FASE_1.md`](CIERRE_FASE_1.md) | Orden para apagar la página de GitHub y lo demás del piloto (interno; no va en el paquete) |
| [`CONTRATO_DE_DATOS.md`](CONTRATO_DE_DATOS.md) | Formato de los archivos de datos (interno; no va en el paquete) |
| [`login/`](login/LEEME.md) | **Inicio de sesión y registro de usos:** módulo para el backend, esquema de base de datos, pantalla de acceso, panel de administración y aviso de privacidad |
| [`capas_geoserver/`](capas_geoserver/LEEME.md) | Tres capas en GeoPackage con sus estilos para publicar en el GeoServer del SIA (independientes de la herramienta) |
| [`LEEME_PAQUETE.md`](LEEME_PAQUETE.md) | Portada del paquete: contenido y orden de instalación |
| `empaquetar.py` | Arma el ZIP de entrega |

## En una página

- **Qué es:** un sitio estático (HTML, CSS, JavaScript y tres archivos de datos). La herramienta no usa base de datos ni GeoServer. Pesa 8 MB. El inicio de sesión sí usa el backend y la base de datos (módulo `calles`).
- **Dónde va:** en el servidor web, junto a los demás sitios que no requieren backend, en la subruta `/calles-prioritarias/`.
- **Qué necesita del servidor:** servir archivos, la redirección de la dirección sin barra final, no recomprimir los `.bin` y las cabeceras del ejemplo. Nada más.
- **Qué pide a terceros:** nada para funcionar. Solo si la persona enciende un mapa de fondo, las teselas de CARTO o de Esri; y los enlaces a Google Maps de las fichas, que se abren en otra pestaña.
- **Datos personales:** los del inicio de sesión y el registro de usos (ver `login/LEEME.md`). «Mi ubicación» se calcula en el teléfono y no se envía.
- **Política de seguridad de contenido:** funciona con una política estricta, sin `'unsafe-inline'` ni `'unsafe-eval'`. Probado: 12 de 12 funciones, cero violaciones.
- **Inicio de sesión:** decidido (5 oct 2026): acceso solo con cuenta y registro de usos (accesos, consultas y descargas por institución y alcaldía). Se entrega construido y probado en `login/`; el SIA lo instala. La Unidad de Transparencia aprobó el aviso de privacidad.
- **Navegadores:** Chrome o Edge 80, Firefox 79, Safari 15, o posteriores, con WebGL 2.
- **Soporte:** Oficina de la Secretaría, Sistema de Información Ambiental. El código y la documentación de mantenimiento están en `ARQUITECTURA.md`, en la raíz del repositorio.

## Estado de preparación (5 de octubre de 2026, versión 1.0)

| Punto | Estado |
|---|---|
| Sitio autocontenido, sin recursos de terceros para arrancar | Listo |
| Funciona en una subruta, con rutas relativas | Listo; probado en `/calles-prioritarias/` |
| Política de seguridad de contenido estricta | Listo; probado |
| Caché del servidor: la página siempre se revalida, también con `?v=` de avenida | Listo; probado |
| Dirección sin barra final detrás de un terminador de HTTPS | Listo en el ejemplo de nginx; por validar en el servidor |
| Archivos de datos resistentes a un intermediario que los descomprima | Listo; probado |
| Todas las referencias con huella de versión | Listo |
| Librerías sin avisos de seguridad publicados | Listo: jsPDF 4.2.1 y SheetJS 0.20.3 |
| **Módulo de sesión** (backend, esquema, pantalla de acceso, panel de administración) | **Construido y probado** (`login/`): pruebas del módulo 5 de 5, depuración por plazos probada en PostgreSQL 17; flujo completo probado con la demostración (acceso, contraseña temporal, regreso a la consulta, registro de consultas y descargas, baja inmediata, cierre de sesión) |
| Registro de usos en la herramienta | Listo; solo se activa con la sesión configurada (el paquete la trae) |
| Aviso de privacidad | Aprobado por la Unidad de Transparencia (oct. 2026); publicado en la pantalla de acceso. Textos en `login/privacidad/` |
| Configuración de nginx (con y sin login) | Escrita; **sin validar con `nginx -t`** |
| Guía de instalación, actualización y reversión | Escrita; **sin ensayar por una persona distinta de quien la escribió** |
| Claves de los mapas de fondo | CARTO: lista (5 oct 2026), restringida a `sedema.sia.cdmx.gob.mx` y `sedemaoficina.github.io`; para el paquete se toma de `02_fuente/claves.local.json`. Esri: pendiente (el satélite funciona sin clave por ahora) |
| Insumos originales (modelo de priorización y vialidades primarias) | Localizados y comprobados; en la copia local, con sus huellas en `03_procesamiento_datos/SUMAS_INSUMOS.md` |
| Capas para GeoServer | Listas en `capas_geoserver/`, revisadas en QGIS. Nota: la caché de teselas de GeoServer está apagada por falta de disco; precargarla requiere espacio en el volumen de datos |
