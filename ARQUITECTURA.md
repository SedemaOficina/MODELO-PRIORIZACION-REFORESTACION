# Arquitectura · Calles prioritarias para reforestar

Guía para quien mantenga la herramienta o la instale en el SIA: dónde está cada cosa, cómo se arma, cómo viajan los datos y cómo hacer los cambios más comunes. Para el uso diario del repositorio, ver `README.md`.

**Corresponde a la versión 17.26 (3 de octubre de 2026).** Los tamaños y conteos no se repiten aquí: `construir.py` los mide en cada construcción y los deja en `05_documentacion/cifras_de_la_construccion.md`.

## 1. En una frase

Sitio **estático**: HTML, CSS y JavaScript sin frameworks ni compilador. El navegador descarga los datos ya procesados (`docs/datos/*.bin`), los descomprime y dibuja el mapa con deck.gl. No hay servidor de aplicaciones, base de datos ni GeoServer, y la herramienta no guarda datos de nadie: el navegador solo conserva los archivos de la propia herramienta (para abrir sin conexión) y una preferencia de aviso.

## 2. Mapa del repositorio

```
MODELO-PRIORIZACION-REFORESTACION/
├── README.md                  uso diario, publicación y pendientes
├── ARQUITECTURA.md            este documento
├── 02_fuente/                 ← AQUÍ SE EDITA
│   ├── construir.py           arma el sitio (docs/) y la versión de un solo archivo (_local/)
│   ├── plantilla.html         estructura de la página
│   ├── css/                   estilos, en orden de aplicación
│   ├── js/                    lógica, un archivo por tema, en orden de ejecución
│   ├── datos/                 meta.bin, data.bin, vp.bin (los genera 03_procesamiento_datos)
│   ├── img/                   logotipo y lámina de la metodología
│   ├── libs/                  deck.gl, pako, jsPDF, SheetJS + excel_worker.js (arma los Excel grandes aparte) + LICENCIAS.md y el texto de cada licencia
│   └── fuentes/               tipografías Cabin y Roboto (woff2) + licencias OFL
├── docs/                      ← LO QUE SE PUBLICA (generado; no editar a mano)
├── 03_procesamiento_datos/    scripts de Python que producen 02_fuente/datos/ y las listas de catálogos (ver su LEEME.md)
├── 04_pruebas/                correr_todas.js, seis pruebas de navegador y la prueba de la construcción (ver su LEEME.md)
├── package.json               versiones fijas de las herramientas de prueba (ESLint, Playwright) y órdenes abreviadas
├── eslint.config.mjs          reglas de la revisión estática de docs/app.js
├── .gitattributes             docs/, libs/ y fuentes/ sin conversión de fin de línea: mismos bytes en cualquier equipo
├── 05_documentacion/          cifras de la construcción (generado), decisiones de despliegue en el SIA, auditoría UX
│                              y bitácora de decisiones (la bitácora solo en la copia local)
├── 06_entregables/            guía de prueba con alcaldías, listas de catálogos para el SIA y lámina de frentes de manzana
├── 08_entrega_sia/            paquete de entrega al SIA: instalación, nginx, verificación, sesión, contrato de datos
├── _local/                    la herramienta en un solo archivo y los paquetes de entrega (generado; solo en la copia local)
└── 07_versiones/              versiones anteriores (solo en la copia local)
```

**Regla de oro:** se edita en `02_fuente/` y se corre `python3 02_fuente/construir.py`. Todo lo de `docs/` se regenera; un cambio hecho directamente en `docs/` se pierde en la siguiente construcción.

## 3. Cómo se arma (`construir.py`)

| Salida | Para qué | Cómo quedan las piezas |
|---|---|---|
| `docs/` | GitHub Pages y el servidor del SIA | `index.html` + `estilos.css` + `config.js` + `app.js` + `sw.js` + `datos/` + `libs/` + `fuentes/` + `img/`, cada referencia con huella `?v=` para la caché del navegador. **Sin programas ni estilos en línea:** todo el JavaScript y todo el CSS van en archivos, de modo que el sitio funciona bajo una política de seguridad de contenido estricta (lo comprueba `04_pruebas/prueba_servidor_sia.js`). `<title>`, `<meta>` y la hoja de estilos van en `<head>`: lo que la plantilla trae antes del marcador `<!-- ESTILOS -->` pasa al encabezado. |
| `_local/calles_prioritarias.html` | Abrir con doble clic, sin servidor, también en redes que bloquean dominios externos | Todo incrustado en un archivo: estilos, tipografías, imágenes, datos y las cuatro librerías (deck.gl y pako como programa; SheetJS y jsPDF en base64, se activan al pedir un Excel o una ficha). No pide nada a terceros. No se publica. |
| `05_documentacion/cifras_de_la_construccion.md` | Documentación | Tamaños y conteos medidos en la construcción. |
| `--artefacto RUTA` | Respaldo como artefacto de Claude | Igual que el anterior, sin la envoltura `<html>`. |

- `css/*.css` se concatenan en orden alfabético → `estilos.css`.
- `js/*.js` se concatenan en orden alfabético dentro de una función asíncrona (`(async function(){ … })()`) → `app.js`. Por eso **todos los archivos comparten el mismo alcance**: una variable o función de `03_estado.js` se usa directamente en `10_seleccion.js`. Si al cargar ocurre un error, el cargador lo muestra en lugar del mapa.
- `config.js` indica dónde están las librerías (`SIA_LIBS`) y su huella (`SIA_LIBS_V`), la huella y el tamaño de los datos (`SIA_DATOS`), las claves de los mapas de fondo y las direcciones de la sesión (`SIA_SESION`). Claves y sesión no se escriben en `construir.py`: se toman de variables de entorno (`SIA_CARTO_KEY`, `SIA_ESRI_KEY`, `SIA_SESION_INICIO`, `SIA_SESION_CIERRE`) o de `02_fuente/claves.local.json`, que no se publica. Si no existe (archivo único o artefacto), la app lee los datos incrustados.
- Solo se reescriben los archivos que cambiaron, así Git no ve cambios falsos.
- **Valida antes de escribir:** las listas `JS_ESPERADOS` y `CSS_ESPERADOS` nombran cada módulo; si falta, sobra o está vacío uno, se detiene con código 1 y no escribe nada. Para agregar un módulo hay que añadirlo a la lista. De `libs/` y `fuentes/` solo se publica lo listado en `LIBS_PUBLICADAS` y `FUENTES_PUBLICADAS`.
- **Datos verificados:** compara el contenido descomprimido de `datos/*.bin` con `datos/SUMAS.json` y se detiene si no coincide. Se compara el contenido porque la compresión gzip cambia de un equipo a otro. Tras regenerar los datos a propósito: `python3 03_procesamiento_datos/verificar_datos.py --actualizar`.
- **No borra:** un archivo de `docs/` que ya no pertenece al sitio se mueve a `_to_delete/docs_obsoletos_<fecha>/` y se avisa. Genera `docs/.nojekyll`.
- Lo cubre `04_pruebas/prueba_construccion.py`.
- `ROBOTS` en `construir.py` controla la instrucción de no aparecer en buscadores.
- Si `README.md` no nombra como vigente la versión de `VERSION`, la construcción lo avisa.

## 4. Orden de carga en el navegador

1. `index.html` pinta el panel y el cargador; con `preload` empieza a bajar `datos/*.bin` de inmediato.
2. `config.js`, `libs/deck.js`, `libs/pako.js` y `app.js` (en ese orden).
3. `02_datos.js` descarga los tres `.bin` con barra de avance, los descomprime (`DecompressionStream`, o pako si no existe) y los decodifica.
4. `03_estado.js` a `15_mi_ubicacion.js` preparan estado, mapa, panel y eventos; `16_arranque.js` fija el estado inicial.
5. jsPDF y SheetJS se cargan solo al pedir una ficha o un Excel (`loadLib`).
6. `16_arranque.js` registra `sw.js` (lo genera `construir.py`): guarda en el navegador los archivos de la herramienta con el nombre de caché `calles-<huella>`, de modo que la siguiente visita abre sin conexión. La página se pide primero a la red y solo si falla se usa la copia; cada publicación cambia la huella y descarta la copia anterior. No se registra en el archivo único ni dentro de un marco. **Fase 2:** revisar junto con el inicio de sesión del SIA, para que no sirva la herramienta a quien no ha entrado.

## 5. Módulos de `02_fuente/js/`

| Archivo | Responsabilidad | Funciones principales |
|---|---|---|
| `01_utilidades.js` | `$`, formatos de número, km y porcentaje; **reglas de negocio** («prioritario» y «universo de intervención»); errores con mensaje para la persona; avisos sobre el mapa; regla única de teléfono | `kmTxt`, `kmFull`, `pct`, `PRIO_MIN`, `UNIV_MIN`, `esPrio`, `sumPrio`, `sumUniv`, `errAmable`, `limpioCat`, `avisoMapa`, `MQ_TEL` |
| `02_datos.js` | Descarga, descompresión y decodificación de los datos; `puntoMedio` es la única regla de punto medio (a media longitud sobre la línea) | `fetchBytes`, `gunzip`, `reader`, `puntoMedio` |
| `03_estado.js` | Estado de la consulta, colores del tema, colores y filtros por vértice, geometría de alcaldías y colonias, rankings | `readTokens`, `buildColors`, `buildFilter`, `buildVP` |
| `04_mapa_capas.js` | Vista del mapa, nombres de calle, barra de escala y capas de deck.gl (reutiliza los objetos de datos para no reprocesar 1 millón de vértices en cada zoom) | `layers`, `flyTo`, `fitTo`, `updateScale`, `frontsData` |
| `05_mapa_tarjetas.js` | HTML de las tarjetas: frente, tramo de vialidad primaria, colonia; acciones de campo | `featHtml`, `vpHtml`, `colHtml`, `fieldActs` |
| `06_mapa_interaccion.js` | Instancia `DeckGL`, clic en el mapa, mostrar/ocultar tarjeta, botones de zoom y toda la ciudad (casa), modo ligero | `showCard`, `hideCard`, `rerender`, `scopeView`, `revisarRendimiento` |
| `07_leyenda_y_capas.js` | Leyenda-filtro, fila "Atiende" (alcaldías / Gobierno Central), casillas de capas, mapa de fondo | `setResp`, `setLayer`, `setFondo` |
| `08_resumenes.js` | Estadísticas por colonia, avenida y ámbito; cifras y barras del panel; universo de intervención (Muy Alta, Alta y Media) y cuadro «Quién atiende» en km de frente por responsable | `colStat`, `avStat`, `frSumm`, `repStat`, `gcFrente` (equivalente en km de frente de las vialidades primarias), `avGrupos` (vialidades separadas que comparten nombre), `repartoHtml`, `univHtml`, `renderSummary` |
| `09_listados.js` | Pestaña "Listado": calles dentro de su colonia, avenidas, colonias, alcaldías; calle consultada (la resaltada) | `nomFrente` (nombre único de un frente; «Frente sin nombre de calle (INEGI)»), `buildStreets`, `buildAvenues`, `desgHtml` (desglose de la calle por prioridad), `calleCoincide` y `renderUbicar` (paso de ubicación de un nombre repetido: alcaldías con conteo y renglones sin cifras), `renderResults`, `highlightStreet`, `calleSel` |
| `09_tramos.js` | Tramos de la calle consultada: agrupa sus frentes de esquina a esquina con una regla geométrica (casi paralelos, en lados opuestos y traslapados) y nombra las vialidades que los delimitan; se calcula al consultar, sin cambiar los datos | `tramosDeCalle`, `entreTxt`, `tramosSel`, `renderTramos` |
| `10_seleccion.js` | Selección de alcaldía, colonia y avenida; **`refresh()`** | `refresh`, `setSel`, `pickColonia`, `pickAvenida` |
| `11_descargas.js` | CSV y Excel con diccionario de datos; carga de librerías bajo demanda (de `libs/` en el sitio, de la copia incrustada en el archivo único) | `deliverTable`, `dictAoa`, `loadLib`, `libIncrustada`, `excelAparte` |
| `12_fichas_pdf.js` | Fichas PDF de colonia, alcaldía, vialidades primarias, avenida y calle | `conPDF`, `fichaPDF`, `fichaCallePDF` |
| `13_interfaz.js` | Ventana de ayuda (se cierra con ×, "Volver al mapa", Esc o Atrás), hoja inferior en teléfono, pestañas, acciones fijas, ruta de navegación | `openInfo`, `closeInfo`, `setSheetState`, `setTab`, `renderActions`, `renderCrumb` |
| `14_buscador.js` | Buscador único con abreviaturas y tolerancia a errores | `omniIndex`, `omniSearch`, `omniPick` |
| `15_mi_ubicacion.js` | GPS, colonia donde está la persona, tramos prioritarios cercanos, seguimiento | `locate`, `whereAmI`, `nearby`, `showLoc` |
| `16_arranque.js` | Estado inicial, consulta indicada en la dirección, aviso de errores inesperados y registro de `sw.js` | — |

### Estado global (en `03_estado.js`)

| Variable | Qué guarda |
|---|---|
| `resp` / `respOn` | Quién atiende: `'alc'`, `'gc'` o `'both'` / casillas activas |
| `sel`, `selCol`, `selAv` | Alcaldía (índice), colonia (id) y avenida (id de NOMENCLAT) seleccionadas, o `null` |
| `highlight` | Calle o avenida resaltada en el mapa |
| `pinned` | Tarjeta abierta: `{kind:'fr'|'vp'|'col'|'loc', i}` |
| `visible[5]` | Prioridades visibles según la leyenda |
| `showAlcB`, `showColB`, `showFrB` | Capas encendidas |
| `viewState` | Vista actual del mapa |
| `myPos` | Última posición de Mi ubicación (solo en memoria) |
| `modoLigero` | `true` si el navegador dibuja sin tarjeta gráfica (ver sección 9 bis) |
| `fondo` | Mapa de fondo: `'no'`, `'calles'` o `'sat'` |
| `opPrio` | Opacidad de las capas de prioridad (0.2 a 1) |

**Reglas de negocio en un solo lugar:** «prioritario» es clase ≥ `PRIO_MIN` (Alta y Muy Alta) y «universo de intervención», clase ≥ `UNIV_MIN` (Media en adelante). Todo el código pregunta con `esPrio(clase)` y suma con `sumPrio(arreglo)` o `sumUniv(arreglo)`; no debe escribirse `>=3` ni `[3]+[4]`. Las comparaciones `===3` y `===4` que quedan separan Alta de Muy Alta (columnas distintas en los Excel).

**Filtro único del ámbito:** `enAmbito(i)` (en `03_estado.js`) decide si un frente pertenece a la consulta: con colonia elegida manda la colonia; sin colonia, la alcaldía. Mapa, cifras, listado, Excel y fichas deben usar esta función y no repetir la condición.

**Errores y arranque:** `errAmable(mensaje, detalle)` (en `01_utilidades.js`) crea errores cuyo `amable` es lo que ve la persona; el cierre de `app.js` lo muestra con «Reintentar». `config.js` lleva además un vigía (definido en `construir.py`) que avisa si un programa no llega o la carga tarda más de 45 s. `02_datos.js` verifica que cada archivo traiga exactamente los registros declarados. Los textos de los catálogos se neutralizan al cargar (`limpioCat`).

**Estilos calculados sin atributo `style` (política de seguridad de contenido):** una política estricta rechaza `style="…"` escrito en el HTML. Las plantillas escriben `data-st="propiedad:valor"` y `aplicaSt` (`01_utilidades.js`), con un observador de cambios, lo aplica por programa, que sí está permitido. **No escribir `style="` en plantillas ni en la página**: la prueba del servidor lo detecta. Asignar `elemento.style.x = …` desde el código sí es válido.

**Sesión (Fase 2):** `esSesion` reconoce una respuesta 401 o 403, o una página HTML donde se esperaba un archivo; `causaFalla(url)` distingue sesión, red y servidor cuando una librería no llega; `avisoSesion` escribe el mensaje con el enlace de `SESION.inicio`. Con `SESION.inicio` definido no se registra `sw.js`. Ver `08_entrega_sia/SESION_Y_LOGIN.md`.

**Accesibilidad (bloque F1-B5):**
- *Anuncios:* `anunciaAmbito()` (`10_seleccion.js`) escribe el ámbito y su cifra en `#sr-estado` (región viva); el conteo del listado, el estado de las descargas y el mensaje del cargador tienen `role="status"`; los errores de carga, `role="alert"`.
- *Foco:* al elegir en el buscador el foco pasa a `#scope-title`; `showCard` enfoca la ficha (`enfocaFicha`) y `hideCard(true)` lo devuelve al control de origen; Esc cierra ayuda, ficha y capas (`13_interfaz.js`); con la ayuda abierta `.app` queda `inert`. En teléfono, si el foco llega a un control tapado por la ficha, la ficha se cierra.
- *Listados:* los renglones son `li` con `role="button"`, se activan con Entrar o barra espaciadora (delegado en `09_listados.js`). Elegir un tramo abre la ficha de su frente de mayor prioridad: es la vía de teclado a la ficha de un frente.
- *Mapa:* el lienzo lleva `role="application"` y un nombre que remite al listado; el texto está en `data-nombre` de `#map`.
- *Documentos:* `propsPDF` y `propsExcel` ponen idioma, título y autoría. Las fichas no están etiquetadas (jsPDF no puede).

**La consulta en la dirección:** `guardaURL()` anota cada cambio con `pushState` y `aplicarURL()` la restaura al abrir y en `popstate` (`10_seleccion.js`).

**Flujo de un cambio de ámbito:** una acción (buscador, clic, ruta) cambia `sel`/`selCol`/`selAv` → `refresh()` recalcula colores y filtros por vértice, cifras, listados y botones → `rerender()` redibuja las capas → `flyTo(scopeView())` encuadra el mapa.

## 6. Estilos de `02_fuente/css/`

| Archivo | Contenido |
|---|---|
| `01_variables.css` | Paleta institucional, rampa de prioridad (`--p0` Muy Baja … `--p4` Muy Alta), colores del mapa, `--loc`. **Cambiar un color aquí lo cambia en toda la herramienta**, mapa incluido. |
| `02_base.css` | Tipografía, panel, cifras, barras, mapa, leyenda, tarjetas, ventana, cargador, teléfono |
| `03_controles.css` | Foco, campos, menús, barra de herramientas, barra de resumen, casillas |
| `04_auditoria_bloque1.css` | Ajustes del bloque 1 de la auditoría UX |
| `05_auditoria_bloque2.css` | Ajustes del bloque 2 (panel en tres partes, pestañas, hoja inferior, ayuda) |
| `06_mi_ubicacion.css` | Botón y tarjeta de Mi ubicación |

| `07_accesibilidad.css` | Texto solo para lector de pantalla, enlace de salto, indicador de foco, bordes de controles, objetivos táctiles en teléfono, tabla y lámina de la ayuda, movimiento reducido e impresión |

Los archivos 04, 05 y 07 ajustan reglas de los anteriores: **el orden importa**. Los tamaños de letra van en `rem` (16 px = 1 rem) para respetar el tamaño configurado en el navegador; el mínimo es 0.75 rem. Para cambiar un componente, buscar su clase en todos los archivos de `css/`.

Los códigos entre paréntesis en los comentarios, como "(auditoría C3)", remiten a los hallazgos del informe `05_documentacion/auditoria_ux_calles.html`.

## 7. Datos

Los tres archivos son **gzip de una secuencia de enteros varint con signo en zigzag** (valores pequeños ocupan un byte). Las coordenadas se guardan como diferencias respecto al vértice anterior, en unidades de 1/Q grados (`Q = 100000`, ≈1 m).

**`meta.bin`** (JSON comprimido): catálogos y resúmenes.

| Clave | Contenido |
|---|---|
| `muns`, `munNames` | Claves y nombres de las 16 alcaldías |
| `prio`, `disp`, `tipos`, `names` | Textos de prioridad, disponibilidad de banqueta, tipos de vialidad y nombres de calle (los frentes guardan el índice) |
| `colonias` | Catálogo: nombre `n`, `cp`, alcaldía `m`, prioridad `p`, población `pob`, IDS `ids`, pobreza `nbi`, unidad territorial `ut`, `utpob` |
| `alc`, `cols` | Polígonos de alcaldías y colonias |
| `summ`, `city`, `summ_gc`, `city_gc`, `summ_all`, `city_all` | Km y frentes por prioridad (alcaldías, Gobierno Central, total) |
| `vp` | Catálogos y resúmenes de vialidades primarias |
| `cruce` | Totales del cruce con vialidades primarias y la regla aplicada |
| `Q`, `N`, `bounds`, `ambito` | Escala de coordenadas, número de frentes, encuadres |

**`data.bin`** (372,534 frentes de manzana): `N`, y por cada frente: alcaldía, prioridad (0 Muy Baja … 4 Muy Alta), nombre, tipo, colonia, longitud (m), `flags`, vialidad primaria + 1, número de vértices y los vértices.
`flags`: bits 0–2 arbolado (1 = sin arbolado; el significado de las demás clases no está documentado y queda por confirmar con el SIA), bits 3–5 banqueta (índice en `disp`), bit 6 = a cargo de Gobierno Central.

**`vp.bin`** (tramos de vialidades primarias): `NV`, y por cada tramo: nomenclatura, nombre, tipo, carriles, circulación, texto de alcaldía, alcaldía, prioridad, longitud (m), clave, registro, número de vértices y los vértices.

Cómo se generan: `03_procesamiento_datos/LEEME.md`.

## 8. Dependencias externas

| Qué | Dónde | Nota |
|---|---|---|
| deck.gl 9.4, pako 2.1, jsPDF 2.5.2, SheetJS 0.18.5 | `docs/libs/` (sitio) · incrustadas (archivo único y artefacto) | Copias idénticas a las del paquete publicado en npm (huellas SHA-256 en `libs/LICENCIAS.md`), con el texto de cada licencia en `libs/LICENCIA_*.txt`. Ninguna versión las pide a una red de distribución externa |
| Tipografías Cabin y Roboto | `docs/fuentes/` (sitio) · incrustadas (archivo único y artefacto) | Archivos woff2 de peso variable (400 a 700), subconjunto latino, 63 KB en total. Licencia SIL Open Font License 1.1 (`fuentes/OFL_*.txt`). La página no pide nada a terceros para arrancar; lo verifica `04_pruebas/prueba_sin_terceros.js` |
| Enlaces "Cómo llegar" y "Street View" | Google Maps | Solo enlaces; se abren en otra pestaña |
| Geolocalización | API del navegador | Requiere HTTPS; la posición no sale del teléfono |
| Mapa de fondo de calles (opcional) | CARTO Positron sobre OpenStreetMap, `basemaps.cartocdn.com` | Desde el 29 de septiembre de 2026 CARTO exige una clave propia (gratuita hasta cierto volumen); sin ella las teselas llegan con la marca «API key required». La clave va en `CARTO_KEY` de `construir.py`. Atribución obligatoria. Solo se pide si el usuario lo enciende |
| Mapa de fondo satelital (opcional) | Sin clave (vigente): Esri World Imagery con la capa de nombres de vías `Reference/World_Transportation` encima, ambas de `services.arcgisonline.com`. Con clave: Esri World Imagery con nombres, `static-map-tiles-api.arcgis.com` (ArcGIS Location Platform, 2 millones de teselas gratis al mes) | La clave va en `ESRI_KEY` de `construir.py`. El uso sin clave queda pendiente de regularizar con una cuenta de Esri. Atribución obligatoria. Solo se pide si el usuario lo enciende |

## 9. Cambios comunes

| Quiero… | Dónde |
|---|---|
| Cambiar un texto del panel o de la ayuda | `plantilla.html` (fijos) o el módulo que lo genera (`08_resumenes.js`, `13_interfaz.js`) |
| Cambiar un color | `css/01_variables.css` |
| Cambiar el contenido de una ficha PDF | `js/12_fichas_pdf.js` |
| Agregar una columna a un Excel | `js/11_descargas.js` (datos y diccionario van juntos) |
| Cambiar qué muestra la tarjeta de un frente | `js/05_mapa_tarjetas.js` |
| Actualizar los datos del modelo | Scripts de `03_procesamiento_datos/` → `construir.py` |
| Publicar una versión nueva o cambiar el corte de los datos | `VERSION` y `CORTE_DATOS` en `construir.py` (aparecen en el panel, las fichas y el diccionario de los Excel) |
| Retirar el aviso de asignación preliminar (cuando la regla del cruce esté validada) | `#prelim-note` en `plantilla.html`, `PRELIM_TXT` en `js/01_utilidades.js` y la frase de la ayuda |
| Permitir que aparezca en buscadores | `ROBOTS = ''` en `construir.py` |
| Cambiar o agregar un mapa de fondo | `FONDOS` en `js/04_mapa_capas.js` (dirección, tamaño de tesela, zoom máximo, opacidad, atribución) |
| Poner la clave de un mapa de fondo | Variables de entorno `SIA_CARTO_KEY` y `SIA_ESRI_KEY`, o `02_fuente/claves.local.json`, y reconstruir. Las claves quedan visibles en la página: restringirlas al dominio del sitio |
| Armar el paquete para el SIA | `python3 08_entrega_sia/empaquetar.py` |
| Generar las listas de catálogos para el SIA | `python3 03_procesamiento_datos/reporte_catalogos.py` |
| Cambiar a partir de qué zoom aparecen las calles en modo ligero | `ZOOM_LIGERO` en `js/03_estado.js` (y el corte en `ZOOM_CORTES` de `06_mapa_interaccion.js`) |

Después de cualquier cambio: `python3 02_fuente/construir.py` y `node 04_pruebas/correr_todas.js` (ver `04_pruebas/LEEME.md`).

### 9 bis. Rendimiento y modo ligero

- Lo pesado es **dibujar** los 372 mil frentes (≈1 millón de vértices), no el código. Con tarjeta gráfica es fluido; sin ella (aceleración por hardware desactivada, escritorios remotos o máquinas virtuales) cada zoom puede tardar decenas de segundos.
- Al cargar, `revisarRendimiento()` lee el nombre del dibujante de WebGL. Si es por software (SwiftShader, llvmpipe, Microsoft Basic Render), activa el **modo ligero**: sin animaciones, resolución 1×, frentes solo a partir del zoom 13 (antes, las colonias pintadas por prioridad) y un aviso con los pasos para activar la aceleración.
- En modo ligero, con una alcaldía, colonia o calle consultada solo se dibujan los frentes de esa consulta (`frontsSub`, `frReal` en `04_mapa_capas.js`) y aparece el indicador «Dibujando calles…».
- Excel de más de 20 mil filas (`GRANDE` en `11_descargas.js`): se arma en `libs/excel_worker.js` y se avisa del tamaño; si el proceso auxiliar no está disponible se arma en la página.
- Teléfono: la regla única es `MQ_TEL` (`01_utilidades.js`) y su equivalente en CSS: angosto y alto = hoja inferior; teléfono en horizontal (alto ≤ 480 px) = panel lateral de 300 px.
- Forzar un modo desde la dirección: `?modo=ligero` (sin aviso) o `?modo=completo`.
- Siempre: los botones + y − cambian de zoom sin animación, las capas solo se rehacen al cruzar un corte de zoom (`ZOOM_CORTES`) y la resolución se limita a 1.5× en pantallas de alta densidad.

## 10. Publicación en el SIA

Todo está en `08_entrega_sia/`: guía de instalación, actualización y reversión; ejemplo de nginx; lista de verificación; integración del inicio de sesión; contrato de datos y cierre de la Fase 1. El formato de los datos de la sección 7 es un resumen: el contrato completo está en `08_entrega_sia/CONTRATO_DE_DATOS.md`.
