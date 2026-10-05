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
| `04_pruebas/` | `correr_todas.js` corre todo y da una sola señal. Seis pruebas de navegador (integral, coherencia de cifras, arranque sin terceros, errores y robustez, teléfono y uso sin conexión, accesibilidad) y la prueba de la construcción. Ver su `LEEME.md`. | Sí, salvo `capturas/` |
| `05_documentacion/` | `cifras_de_la_construccion.md` (tamaños y conteos, generado), `despliegue_sia.md` (decisiones para instalar en el SIA), `auditoria_ux_calles.html` (auditoría UI/UX del 24 sep 2026) y `bitacora/` (registro de versiones y decisiones). | Sí, salvo `bitacora/` |
| `06_entregables/` | Guía de prueba con personal de alcaldías (Word y PDF), listas de catálogos para homologación en el SIA (Excel) y lámina de composición de frentes de manzana. | Sí |
| `07_versiones/` | Versiones anteriores de la herramienta, con un `LEEME.md` que relaciona sus nombres con la numeración vigente. | No |
| `08_entrega_sia/` | **Paquete de entrega al SIA:** guía de instalación, actualización y reversión, ejemplo de nginx, lista de verificación, integración del inicio de sesión, contrato de datos, cierre de la Fase 1 y `empaquetar.py`. | Sí |
| `_local/` | `calles_prioritarias.html`: la herramienta **en un solo archivo, para abrir con doble clic**. Lleva incrustados datos, tipografías y librerías: no pide nada a terceros, salvo los mapas de fondo si se encienden. Se genera al construir. | No |

Los tamaños y conteos vigentes (módulos, peso del sitio, peso del archivo único) están en [`05_documentacion/cifras_de_la_construccion.md`](05_documentacion/cifras_de_la_construccion.md), que `construir.py` vuelve a medir en cada construcción.

## Cómo reconstruir la herramienta

Después de cambiar cualquier archivo de `02_fuente/`:

```
python3 02_fuente/construir.py
```

Escribe `docs/`, `_local/calles_prioritarias.html` y `05_documentacion/cifras_de_la_construccion.md`. Solo reescribe los archivos que cambiaron. Requiere únicamente Python 3. Si este README no nombra como vigente la versión que se construye, la construcción lo avisa.

La construcción **se detiene sin escribir nada** si falta o sobra un módulo, si un módulo está vacío o si los datos no son los registrados en `02_fuente/datos/SUMAS.json`. Los archivos de `docs/` que dejan de pertenecer al sitio no se borran: se mueven a `_to_delete/`.

Para verificar: `node 04_pruebas/correr_todas.js` (todo, unos 12 minutos) o `node 04_pruebas/correr_todas.js rapidas` (datos, construcción y revisión estática, menos de un minuto). Ver `04_pruebas/LEEME.md`.

## Publicación

- **Repositorio:** https://github.com/SedemaOficina/MODELO-PRIORIZACION-REFORESTACION (público).
- **Página (GitHub Pages):** https://sedemaoficina.github.io/MODELO-PRIORIZACION-REFORESTACION/
- La página lleva la instrucción de **no aparecer en buscadores**. El repositorio, en cambio, es público y enlaza la página: durante el piloto, quien encuentre el repositorio puede abrirla. Para permitir la difusión de la página, dejar `ROBOTS = ''` en `02_fuente/construir.py`.
- **Qué no está en el repositorio** (ver `.gitignore`): la bitácora, que trae detalles de infraestructura y decisiones internas; `07_versiones/`; `_local/`; la capa de vialidades primarias y la lámina original de `03_procesamiento_datos/insumos/`, y las capturas de prueba.
- **Qué sí está:** el índice de desarrollo social por unidad territorial (`insumos/IDS_ut/`) y los resultados intermedios del procesamiento (`intermedios/`), que permiten regenerar los datos.
- **Historial:** Git conserva archivos de versiones anteriores que ya no están en la carpeta, entre ellos una copia de la versión 6 de la herramienta y los metadatos de una capa. El historial no se reescribió; si el repositorio se cierra al pasar al SIA, no hace falta.
- **Autoría de los commits:** desde la v17.12 se firman con la dirección `noreply` de la cuenta; los anteriores conservan el correo con el que se hicieron.
- **Destino final:** `sedema.sia.cdmx.gob.mx/calles-prioritarias/`, como sitio estático en el servidor web del SIA. El paquete de entrega está en [`08_entrega_sia/`](08_entrega_sia/LEEME.md) y se arma con `python3 08_entrega_sia/empaquetar.py`; las decisiones previas están en [`05_documentacion/despliegue_sia.md`](05_documentacion/despliegue_sia.md).
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
6. **Git sobre la carpeta sincronizada por OneDrive:** la sesión de trabajo no puede borrar archivos, así que cada orden de Git deja archivos de bloqueo (`.git/index.lock`, `tmp_obj_*`) que impiden el siguiente commit. Se retiran moviéndolos a `_to_delete/`; las consultas se hacen con `GIT_OPTIONAL_LOCKS=0`. Solo una sesión trabaja sobre la carpeta a la vez.
7. **Verificación automática en GitHub (propuesta, no activada):** `05_documentacion/verificacion_automatica_github.md` trae el archivo y los pasos para que GitHub repita en cada cambio las verificaciones rápidas (datos, construcción y revisión estática). Activarla es decisión de quien administra la cuenta.

## Estado al 4 de octubre de 2026 (versión 17.30)

- Versión vigente: **v17.30**, publicada en GitHub Pages. El artefacto «Calles Prioritarias para Reforestar» de Claude es un respaldo que se actualiza a solicitud y puede ir atrás de esta versión.
- Lo que cambió en cada versión está en el historial de Git (un commit por versión, con su descripción) y, en la copia local, en `05_documentacion/bitacora/`.

| Versión | Qué atendió |
|---|---|
| 17.30 | La herramienta es para las alcaldías y para el Gobierno Central: la entrada pregunta primero qué red se consulta (calles y colonias, o vialidades primarias) y después el territorio; se recuerdan ambas; la fila «Atiende» vuelve junto al buscador |
| 17.29 | Descargas para abrir en un mapa: las calles prioritarias de la consulta como líneas, en KML (Google Earth) y GeoJSON (sistemas de información geográfica) |
| 17.28 | Entrada y orientación (paquete 1 del informe de propuestas): al entrar se pregunta la alcaldía y se recuerda la última consultada; pestaña inicial «Dónde empezar» con las colonias por atender y orden elegible; las cifras pasan a «Resumen»; panel de capas cerrado al inicio con leyenda compacta; «Quién atiende» y el aviso de asignación preliminar pasan al panel de capas; botón «Compartir» |
| 17.27 | Teléfono: la ventana de ayuda ocupa el área visible de la pantalla, con el logotipo y el botón de cierre en un encabezado fijo que ya no se encima con el texto; el panel de capas ya no se sale a lo ancho, se desplaza solo en vertical y conserva a la vista su encabezado |
| 17.26 | Preparación para el SIA (Fase 2): funciona bajo una política de seguridad de contenido estricta (sin estilos en línea), reconoce la sesión vencida, direcciones de sesión configurables, todas las librerías con huella de versión, datos resistentes a un intermediario que los descomprima, claves fuera del archivo público y paquete de entrega (`08_entrega_sia/`) |
| 17.25 | Reproducibilidad y pruebas (F1-B7): la construcción se detiene antes de escribir si falta o sobra una pieza, datos verificados por su contenido, reglas «prioritario» y «universo» en un solo lugar, revisión estática y una sola orden para correr todas las pruebas |
| 17.24 | Accesibilidad (F1-B5): anuncios para lector de pantalla, foco que no se pierde, listados y ficha de un frente operables con teclado, Esc cierra ficha y capas, ayuda con fondo inerte, bordes y foco con contraste, objetivos táctiles de 44 px en teléfono, letra en unidades relativas, impresión, propiedades e idioma en PDF y Excel |
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
1. **Instalación en el SIA:** el paquete de entrega está escrito (`08_entrega_sia/`). Falta que el SIA valide la configuración de nginx (`nginx -t`), instale en un servidor de ensayo siguiendo solo la guía y corra la lista de verificación.
2. **Login** (opcional para una herramienta de consulta): nueve decisiones con recomendación y responsable en `05_documentacion/despliegue_sia.md`. Con sesión configurada, la herramienta no guarda copia para uso sin conexión. La integración está descrita en `08_entrega_sia/SESION_Y_LOGIN.md`.
3. **Prueba con personal de alcaldías** con la guía de `06_entregables/`, precedida de la prueba de acceso desde la red de cada alcaldía.
4. **Visto bueno institucional de la rampa de calor** que sustituyó al semáforo.
5. Validar con la Secretaría la regla del cruce de frentes con vialidades primarias (18 m, o 60 m con coincidencia de nombre).
6. Recalcular el modelo con el IDS cuando haya acceso a las capas de temperatura superficial 2024, cobertura de copa y NDVI por frente.
7. **Claves de los mapas de fondo:** solicitar la clave gratuita de CARTO; crear una cuenta de ArcGIS Location Platform y generar una clave restringida al dominio. **No se escriben en `construir.py`**, que es público: se dan con las variables de entorno `SIA_CARTO_KEY` y `SIA_ESRI_KEY` o en `02_fuente/claves.local.json` (no se publica). En el SIA, sus cabeceras de seguridad deben permitir imágenes de `basemaps.cartocdn.com`, `services.arcgisonline.com` y `static-map-tiles-api.arcgis.com`.
8. Regenerar el lote de fichas PDF de las 16 alcaldías con la versión definitiva.
9. **Homologar los catálogos en el SIA** con las listas de `06_entregables/Catalogos_para_homologacion_SIA.xlsx` (colonias homónimas, códigos postales de cuatro dígitos, variantes de nombres de calle, vialidades con dos escrituras y la calle «Prueba»). La herramienta no corrige los catálogos.
10. **Auditoría integral del 2 de octubre:** cerrados los bloques F1-B1, F1-B4, F1-B6 y F1-B8 (este último con los pendientes 7 y 9 y la licencia del repositorio); F1-B5 (accesibilidad) atendido salvo el pendiente 11; F1-B7 (reproducibilidad y pruebas) atendido salvo el pendiente 12; quedan F1-B2 (revisión jurídica de textos y tratamiento de tú o usted), F1-B3 (documento del modelo, depende del SIA) y los bloques de la Fase 2.
11. **Accesibilidad, lo que falta:** (a) el mapa comunica la prioridad solo con color (H-051): se decidió dejarlo como limitación declarada (3 oct 2026), porque la prioridad está también en texto en el listado, las fichas y los Excel; la lámina de metodología, que usa verde y rojo, queda por rehacer; (b) las fichas PDF no están etiquetadas (H-052): la librería no lo permite; la salida es ofrecer la ficha también como página imprimible; (c) el encabezado de los Excel no queda inmovilizado; (d) falta la lectura con un lector de pantalla real (NVDA o VoiceOver).
12. **Reproducibilidad, lo que falta:** (a) **la capa de vialidades primarias (`insumos/VP_REFORESTACION/`) no está en la carpeta de trabajo**: sin ella no pueden correrse los pasos 3 y 4 de `03_procesamiento_datos/`; hay que localizarla, resguardarla y entregarla al SIA con su suma de verificación, junto con el insumo del modelo (H-007); (b) fijar las versiones exactas de las dependencias de Python cuando la cadena vuelva a correrse; (c) el código sigue en un solo alcance y `fichaPDF` sin partir: extraer módulos con pruebas unitarias es trabajo de fondo (H-038).
13. **Librerías con avisos de seguridad:** jsPDF 2.5.2 y SheetJS 0.18.5 tienen avisos publicados. La exposición real es baja (la herramienta solo escribe archivos), pero un análisis del SIA o de la agencia digital puede objetarlas. Actualizarlas exige regenerar y comparar las fichas.

## Navegadores y enlaces

- **Teclado:** Tabulador recorre los controles; Entrar o barra espaciadora activan los renglones de los listados; Esc cierra la ficha, el panel de capas y la ayuda. La ayuda de la herramienta lo explica en «Uso con teclado y lector de pantalla».
- **Navegadores mínimos:** Chrome o Edge 80, Firefox 79, Safari 15, o posteriores, con WebGL 2 disponible. Si falta, la herramienta lo dice al abrir en lugar de quedar en blanco.
- **La consulta va en la dirección:** `?a=` clave de la alcaldía, `?c=` colonia, `?v=` avenida y `?r=gc` o `?r=both` para quién atiende. La dirección se puede compartir; Atrás y Adelante recorren las consultas.
- `?modo=ligero` y `?modo=completo` fuerzan el modo de dibujo. `#nomap` solo tiene efecto en las pruebas automáticas.
