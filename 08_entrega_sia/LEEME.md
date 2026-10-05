# Entrega al SIA · Calles prioritarias para reforestar

Todo lo que el equipo del Sistema de Información Ambiental necesita para instalar, verificar, actualizar y operar la herramienta en `sedema.sia.cdmx.gob.mx/calles-prioritarias/` sin depender de quien la elaboró.

| Documento | Para qué |
|---|---|
| [`INSTALACION.md`](INSTALACION.md) | Instalar, actualizar y revertir, paso a paso |
| [`nginx_calles_prioritarias.conf.ejemplo`](nginx_calles_prioritarias.conf.ejemplo) | Los dos fragmentos de configuración de nginx |
| [`LISTA_DE_VERIFICACION.md`](LISTA_DE_VERIFICACION.md) | 19 comprobaciones con `curl` y navegador, y qué revisar si alguna falla |
| [`SESION_Y_LOGIN.md`](SESION_Y_LOGIN.md) | Cómo se integra un inicio de sesión: qué hace ya la herramienta y qué construye el SIA |
| [`CONTRATO_DE_DATOS.md`](CONTRATO_DE_DATOS.md) | Formato exacto de los archivos de datos, para leerlos o regenerarlos |
| [`CIERRE_FASE_1.md`](CIERRE_FASE_1.md) | Orden para apagar la página de GitHub y lo demás del piloto |
| `empaquetar.py` | Arma el paquete de entrega: la carpeta del sitio, su manifiesto de sumas y estos documentos |

## En una página

- **Qué es:** un sitio estático (HTML, CSS, JavaScript y tres archivos de datos). No usa base de datos, backend ni GeoServer. Pesa 8 MB.
- **Dónde va:** en el servidor web, junto a los demás sitios que no requieren backend, en la subruta `/calles-prioritarias/`.
- **Qué necesita del servidor:** servir archivos, la redirección de la dirección sin barra final, no recomprimir los `.bin` y las cabeceras del ejemplo. Nada más.
- **Qué pide a terceros:** nada para funcionar. Solo si la persona enciende un mapa de fondo, las teselas de CARTO o de Esri; y los enlaces a Google Maps de las fichas, que se abren en otra pestaña.
- **Datos personales:** ninguno. «Mi ubicación» se calcula en el teléfono y no se envía.
- **Política de seguridad de contenido:** funciona con una política estricta, sin `'unsafe-inline'` ni `'unsafe-eval'`. Probado: 12 de 12 funciones, cero violaciones.
- **Inicio de sesión:** opcional. La herramienta ya reconoce una sesión vencida y tiene dónde configurar las direcciones de acceso y de cierre; el módulo de sesión lo construye el SIA.
- **Navegadores:** Chrome o Edge 80, Firefox 79, Safari 15, o posteriores, con WebGL 2.
- **Soporte:** Oficina de la Secretaría, Sistema de Información Ambiental. El código y la documentación de mantenimiento están en `ARQUITECTURA.md`, en la raíz del repositorio.

## Estado de preparación (3 de octubre de 2026)

| Punto | Estado |
|---|---|
| Sitio autocontenido, sin recursos de terceros para arrancar | Listo |
| Funciona en una subruta, con rutas relativas | Listo; probado en `/calles-prioritarias/` |
| Política de seguridad de contenido estricta | Listo; probado |
| Dirección sin barra final detrás de un terminador de HTTPS | Listo en el ejemplo de nginx; por validar en el servidor |
| Archivos de datos resistentes a un intermediario que los descomprima | Listo; probado |
| Todas las referencias con huella de versión | Listo |
| Reconocer la sesión vencida; direcciones de acceso y cierre configurables | Listo; probado con un servidor de ensayo |
| Configuración de nginx | Escrita; **sin validar con `nginx -t`** |
| Guía de instalación, actualización y reversión | Escrita; **sin ensayar por una persona distinta de quien la escribió** |
| Módulo de sesión (backend, tabla de usuarios, pantalla de acceso) | No existe; lo construye el SIA si se decide el login |
| Instrumentos de datos personales para el login | No existen; corresponde a la Unidad de Transparencia |
| Claves de los mapas de fondo (CARTO y Esri) | Pendientes de solicitar |
| Librerías jsPDF y SheetJS con avisos de seguridad publicados | Atendido en la v17.34: jsPDF 4.2.1 y SheetJS 0.20.3, sin avisos publicados al 5 oct 2026 |
| Capa de vialidades primarias para regenerar los datos | No localizada |
