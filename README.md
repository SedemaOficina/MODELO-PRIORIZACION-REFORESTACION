# Modelo de Priorización · Reforestación Urbana

Herramienta **"Calles prioritarias para reforestar"** de la Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental (SIA).

Mapa de consulta para que las 16 alcaldías y el Gobierno de la Ciudad identifiquen qué colonias, calles y vialidades primarias conviene reforestar primero, según el modelo de priorización del SIA. Incluye buscador único, ubicación del usuario en campo, descargas en Excel con diccionario de datos y fichas PDF por alcaldía, colonia, vialidades primarias, avenida y calle.

Esta carpeta es la **copia de trabajo oficial**: aquí vive la versión vigente, todo lo necesario para reconstruirla y la bitácora de decisiones. La herramienta se construyó con Claude por iteraciones.

**¿Vas a mantenerla o instalarla?** Empieza por [`ARQUITECTURA.md`](ARQUITECTURA.md): dónde está cada cosa, cómo se arma, formato de los datos y cambios comunes.

## Alcance

- **Solo de consulta:** no recibe reportes ni datos de los usuarios (decisión de Liber, 25 sep 2026).
- **Sin datos personales:** la ubicación que usa "Mi ubicación" se queda en el teléfono; no se envía ni se guarda.
- **Lo que guarda el navegador:** una copia de los archivos de la propia herramienta (programa, estilos, datos y tipografías), para abrir más rápido y sin conexión, y una preferencia (`sia.avisoLigero`, si ya se leyó el aviso del modo ligero). Ninguna consulta ni dato del usuario.
- **Sitio estático:** no necesita base de datos, backend ni GeoServer. Lo único externo son los mapas de fondo opcionales (calles de CARTO sobre OpenStreetMap y satélite de Esri), que se piden a su servidor solo si el usuario los enciende, y los enlaces a Google Maps de las tarjetas, que se abren en otra pestaña.

## Qué hay en cada carpeta

| Carpeta | Contenido | ¿Se publica en GitHub? |
|---|---|---|
| `02_fuente/` | **Aquí se edita.** `plantilla.html` (estructura), `css/` (estilos), `js/` (lógica, un archivo por tema), `datos/*.bin`, `img/`, `libs/` (librerías con sus licencias), `fuentes/` (tipografías) y `construir.py`, que lo ensambla todo. | Sí |
| `docs/` | **El sitio publicado** (GitHub Pages y, después, el SIA). Lo genera `construir.py`; no se edita a mano. Necesita un servidor web: no se abre con doble clic. | Sí |
| `03_procesamiento_datos/` | Scripts de Python numerados en el orden en que se corren, con `insumos/` e `intermedios/`, y `reporte_catalogos.py` (listas para homologación). Ver su `LEEME.md`. | Sí, salvo la capa de vialidades primarias (`insumos/VP_REFORESTACION/`) y la lámina original |
| `04_pruebas/` | Cinco pruebas automáticas: integral, coherencia de cifras, arranque sin terceros, errores y robustez, teléfono y uso sin conexión. Ver su `LEEME.md`. | Sí, salvo `capturas/` |
| `05_documentacion/` | `cifras_de_la_construccion.md` (tamaños y conteos, generado), `despliegue_sia.md` (decisiones para instalar en el SIA), `auditoria_ux_calles.html` (auditoría UI/UX del 24 sep 2026) y `bitacora/` (registro de versiones y decisiones). | Sí, salvo `bitacora/` |
| `06_entregables/` | Guía de prueba con personal de alcaldías (Word y PDF), listas de catálogos para homologación en el SIA (Excel) y lámina de composición de frentes de manzana. | Sí |
| `07_versiones/` | Versiones anteriores de la herramienta, con un `LEEME.md` que relaciona sus nombres con la numeración vigente. | No |
| `_local/` | `calles_prioritarias.html`: la herramienta **en un solo archivo, para abrir con doble clic**. Lleva incrustados datos, tipografías y librerías: no pide nada a terceros, salvo los mapas de fondo si se encienden. Se genera al construir. | No |

Los tamaños y conteos vigentes (módulos, peso del sitio, peso del archivo único) están en [`05_documentacion/cifras_de_la_construccion.md`](05_documentacion/cifras_de_la_construccion.md), que `construir.py` vuelve a medir en cada construcción.

## Cómo reconstruir la herramienta

Después de cambiar cualquier archivo de `02_fuente/`:

```
python3 02_fuente/construir.py
```

Escribe `docs/`, `_local/calles_prioritarias.html` y `05_documentacion/cifras_de_la_construccion.md`. Solo reescribe los archivos que cambiaron. Requiere únicamente Python 3. Si este README no nombra como vigente la versión que se construye, la construcción lo avisa.

Para verificar, correr las cinco pruebas de `04_pruebas/` (ver su `LEEME.md`).

## Publicación

- **Repositorio:** https://github.com/SedemaOficina/MODELO-PRIORIZACION-REFORESTACION (público).
- **Página (GitHub Pages):** https://sedemaoficina.github.io/MODELO-PRIORIZACION-REFORESTACION/
- La página lleva la instrucción de **no aparecer en buscadores**. El repositorio, en cambio, es público y enlaza la página: durante el piloto, quien encuentre el repositorio puede abrirla. Para permitir la difusión de la página, dejar `ROBOTS = ''` en `02_fuente/construir.py`.
- **Qué no está en el repositorio** (ver `.gitignore`): la bitácora, que trae detalles de infraestructura y decisiones internas; `07_versiones/`; `_local/`; la capa de vialidades primarias y la lámina original de `03_procesamiento_datos/insumos/`, y las capturas de prueba.
- **Qué sí está:** el índice de desarrollo social por unidad territorial (`insumos/IDS_ut/`) y los resultados intermedios del procesamiento (`intermedios/`), que permiten regenerar los datos.
- **Historial:** Git conserva archivos de versiones anteriores que ya no están en la carpeta, entre ellos una copia de la versión 6 de la herramienta y los metadatos de una capa. El historial no se reescribió; si el repositorio se cierra al pasar al SIA, no hace falta.
- **Autoría de los commits:** desde la v17.12 se firman con la dirección `noreply` de la cuenta; los anteriores conservan el correo con el que se hicieron.
- **Destino final:** `sedema.sia.cdmx.gob.mx`, como sitio estático en el servidor web del SIA. El paquete de entrega (configuración de nginx y guía de instalación) está pendiente; las decisiones previas están en [`05_documentacion/despliegue_sia.md`](05_documentacion/despliegue_sia.md).
- **Si una red institucional bloquea `github.io`:** usar `_local/calles_prioritarias.html`, que se abre con doble clic y no depende de ese dominio. Conviene pedir a cada alcaldía piloto una prueba de acceso desde su red antes de la sesión (la guía de `06_entregables/` lo incluye).

## Licencias y condiciones de terceros

- **Librerías** (deck.gl, pako, jsPDF, SheetJS): copias sin modificar, con el texto de cada licencia y su huella en `02_fuente/libs/` (ver `LICENCIAS.md`). **Tipografías** Cabin y Roboto: SIL Open Font License 1.1 (`02_fuente/fuentes/`).
- **Mapas de fondo:** CARTO exige desde el 29 de septiembre de 2026 una clave propia (gratuita); sin ella el fondo «Calles» llega con la marca «API key required». La clave va en `CARTO_KEY` de `construir.py`. El satélite de Esri se usa sin clave y queda por regularizar con `ESRI_KEY`. Ambos llevan su atribución en el mapa.
- **Pendiente de decisión institucional:** el repositorio no declara licencia para el código ni para los datos derivados; los términos de uso de la capa del índice de desarrollo social se confirman con su fuente (EVALÚA CDMX), y falta identificar el origen primario de los polígonos de colonias.

## Cómo se trabaja con Claude

1. Se conecta esta carpeta a la sesión de Claude (Cowork) y el proyecto "Alcaldías-Reforestación".
2. Claude edita las piezas de `02_fuente/`, reconstruye, corre las pruebas y **hace el commit** con un resumen y una descripción en español.
3. Liber revisa el commit en GitHub Desktop (pestaña History) y da **Push origin**. GitHub Pages se actualiza en uno o dos minutos.
4. Cada cambio se documenta en `05_documentacion/bitacora/`.
5. Claude nunca borra archivos de la carpeta: lo que sobre se mueve a `_to_delete/` para que Liber lo elimine.

## Estado al 2 de octubre de 2026 (versión 17.23)

- Versión vigente: **v17.23**, publicada en GitHub Pages. El artefacto «Calles Prioritarias para Reforestar» de Claude es un respaldo que se actualiza a solicitud y puede ir atrás de esta versión.
- Lo que cambió en cada versión está en el historial de Git (un commit por versión, con su descripción) y, en la copia local, en `05_documentacion/bitacora/`.

| Versión | Qué atendió |
|---|---|
| 17.23 | Documentación, repositorio y licencias (bloque F1-B8 de la auditoría): archivo único sin librerías de terceros, textos de licencia, clave de CARTO, listas de catálogos para el SIA, guía de prueba actualizada |
| 17.22 | Teléfono y rendimiento (F1-B6): «Mi ubicación» prudente, Excel grandes en proceso auxiliar, avance de carga, modo ligero, teléfono en horizontal, uso sin conexión |
| 17.21 | Errores y robustez (F1-B4): datos verificados al cargar, mensajes con «Reintentar», la consulta queda en la dirección, buscador con abreviaturas |
| 17.20 | Cierre de los bloques B y C: frentes sin calle o sin colonia, avenidas homónimas, sumas exactas, identificador y fecha en los Excel |
| 17.19 | Fondo «Satélite» con la imagen de Esri y nombres de vías |
| 17.18 | Unidades del Gobierno Central: km sobre el eje como cifra oficial y su equivalente en km de frente |
| 17.15 a 17.17 | Consultas de planeación (universo de intervención, cuadro «Quién atiende»), tramos de la calle consultada y calles con nombre repetido |
| 17.11 a 17.14 | Coherencia de cifras entre pantalla, descargas y fichas; tipografías propias; asignación preliminar y versión visibles; rótulos que dicen lo que el dato mide |
| 16 a 17.10 | Auditoría UX (bloques 1 y 2), carga en archivos aparte, Mi ubicación, modo ligero, mapas de fondo |

### Pendientes
1. **Paquete de entrega al SIA:** configuración de nginx para `/calles-prioritarias/`, compatibilidad con sus cabeceras de seguridad (las tipografías ya se sirven desde el sitio; falta retirar los estilos en línea), guía de instalación y actualización y lista de verificación.
2. **Login** (opcional para una herramienta de consulta): nueve decisiones con recomendación y responsable en `05_documentacion/despliegue_sia.md`. El uso sin conexión (`sw.js`) se revisa junto con el login.
3. **Prueba con personal de alcaldías** con la guía de `06_entregables/`, precedida de la prueba de acceso desde la red de cada alcaldía.
4. **Visto bueno institucional de la rampa de calor** que sustituyó al semáforo.
5. Validar con la Secretaría la regla del cruce de frentes con vialidades primarias (18 m, o 60 m con coincidencia de nombre).
6. Recalcular el modelo con el IDS cuando haya acceso a las capas de temperatura superficial 2024, cobertura de copa y NDVI por frente.
7. **Claves de los mapas de fondo:** solicitar la clave gratuita de CARTO y ponerla en `CARTO_KEY` de `02_fuente/construir.py`; crear una cuenta de ArcGIS Location Platform, generar una clave restringida al dominio y ponerla en `ESRI_KEY`. En el SIA, sus cabeceras de seguridad deben permitir imágenes de `basemaps.cartocdn.com`, `services.arcgisonline.com` y `static-map-tiles-api.arcgis.com`.
8. Regenerar el lote de fichas PDF de las 16 alcaldías con la versión definitiva.
9. **Homologar los catálogos en el SIA** con las listas de `06_entregables/Catalogos_para_homologacion_SIA.xlsx` (colonias homónimas, códigos postales de cuatro dígitos, variantes de nombres de calle, vialidades con dos escrituras y la calle «Prueba»). La herramienta no corrige los catálogos.
10. **Auditoría integral del 2 de octubre:** cerrados los bloques F1-B1, F1-B4, F1-B6 y F1-B8 (este último con los pendientes 7 y 9 y la licencia del repositorio); quedan F1-B2 (revisión jurídica de textos y tratamiento de tú o usted), F1-B3 (documento del modelo, depende del SIA), F1-B5 (accesibilidad), F1-B7 (calidad de ingeniería) y los bloques de la Fase 2.

## Navegadores y enlaces

- **Navegadores mínimos:** Chrome o Edge 80, Firefox 79, Safari 15, o posteriores, con WebGL 2 disponible. Si falta, la herramienta lo dice al abrir en lugar de quedar en blanco.
- **La consulta va en la dirección:** `?a=` clave de la alcaldía, `?c=` colonia, `?v=` avenida y `?r=gc` o `?r=both` para quién atiende. La dirección se puede compartir; Atrás y Adelante recorren las consultas.
- `?modo=ligero` y `?modo=completo` fuerzan el modo de dibujo. `#nomap` solo tiene efecto en las pruebas automáticas.
