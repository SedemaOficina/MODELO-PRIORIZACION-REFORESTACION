# Arquitectura · Modelo de priorización de reforestación urbana

Guía para quien mantenga la herramienta o la instale en el SIA: dónde está cada cosa, cómo se arma, cómo viajan los datos y cómo hacer los cambios más comunes. Para el uso diario del repositorio, ver `README.md`.

**Corresponde a la versión 1.47 (22 de octubre de 2026).** Los tamaños y conteos no se repiten aquí: `construir.py` los mide en cada construcción y los deja en `05_documentacion/cifras_de_la_construccion.md`.

## 1. En una frase

Sitio **estático**: HTML, CSS y JavaScript sin frameworks ni compilador. El navegador descarga los datos ya procesados (`docs/datos/*.bin`), los descomprime y dibuja el mapa con deck.gl. No hay servidor de aplicaciones, base de datos ni GeoServer, y la herramienta no guarda datos de nadie: el navegador solo conserva los archivos de la propia herramienta (para abrir sin conexión) y cuatro preferencias en `localStorage`: el aviso del modo ligero ya leído (`sia.avisoLigero`), la última alcaldía y red consultadas (`cp_inicio`, `cp_red`) y el recorrido guiado ya visto (`cp_recorrido`).

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
├── 04_pruebas/                correr_todas.js, las verificaciones rápidas y las pruebas de navegador (cuántas y cuánto tardan: su LEEME.md)
├── package.json               herramientas de prueba (ESLint, Playwright) y órdenes abreviadas; package-lock.json fija las versiones exactas
├── eslint.config.mjs          reglas de la revisión estática de docs/app.js, sw.js, config.js (ES5) y el worker de Excel
├── .github/workflows/         verificar.yml: GitHub corre las verificaciones rápidas en cada Push
├── .gitattributes             docs/, libs/ y fuentes/ sin conversión de fin de línea: mismos bytes en cualquier equipo
├── 05_documentacion/          cifras de la construcción (generado), decisiones de despliegue en el SIA, revisión de experiencia de uso
│                              y bitácora de decisiones (la bitácora solo en la copia local)
├── 06_entregables/            listas de catálogos para el SIA, logotipo institucional y lámina de frentes de manzana
├── 08_entrega_sia/            paquete de entrega al SIA: instalación, nginx, verificación, sesión, contrato de datos
├── _local/                    la herramienta en un solo archivo y los paquetes de entrega (generado; solo en la copia local)
└── 07_versiones/              versiones anteriores (solo en la copia local)
```

**Regla de oro:** se edita en `02_fuente/` y se corre `python 02_fuente/construir.py` (en Windows Python se llama `python`; en Linux o Mac, `python3`). Todo lo de `docs/` se regenera; un cambio hecho directamente en `docs/` se pierde en la siguiente construcción.

## 3. Cómo se arma (`construir.py`)

| Salida | Para qué | Cómo quedan las piezas |
|---|---|---|
| `docs/` | GitHub Pages y el servidor del SIA | `index.html` + `estilos.css` + `config.js` + `app.js` + `sw.js` + `datos/` + `libs/` + `fuentes/` + `img/`, cada referencia con huella `?v=` para la caché del navegador. **Sin programas ni estilos en línea:** todo el JavaScript y todo el CSS van en archivos, de modo que el sitio funciona bajo una política de seguridad de contenido estricta (lo comprueba `04_pruebas/prueba_servidor_sia.js`). `<title>`, `<meta>` y la hoja de estilos van en `<head>`: lo que la plantilla trae antes del marcador `<!-- ESTILOS -->` pasa al encabezado. |
| `_local/priorizacion_reforestacion.html` | Abrir con doble clic, sin servidor, también en redes que bloquean dominios externos | Todo incrustado en un archivo: estilos, tipografías, imágenes, datos y las cuatro librerías (deck.gl y pako como programa; SheetJS y jsPDF en base64, se activan al pedir un Excel o una ficha). No pide nada a terceros. No se publica. |
| `05_documentacion/cifras_de_la_construccion.md` | Documentación | Tamaños y conteos medidos en la construcción. |

- `css/*.css` se concatenan en orden alfabético → `estilos.css`.
- `js/*.js` se concatenan en orden alfabético dentro de una función asíncrona (`(async function(){ … })()`) → `app.js`. Por eso **todos los archivos comparten el mismo alcance**: una variable o función de `03_estado.js` se usa directamente en `10_seleccion.js`. Si al cargar ocurre un error, el cargador lo muestra en lugar del mapa.
- `config.js` indica dónde están las librerías (`SIA_LIBS`) y su huella (`SIA_LIBS_V`), la huella y el tamaño de los datos (`SIA_DATOS`), la huella de cada archivo del fondo propio (`SIA_FONDO`), la clave del satélite y las direcciones de la sesión (`SIA_SESION`). Clave y sesión no se escriben en `construir.py`: se toman de variables de entorno (`SIA_ESRI_KEY`, `SIA_SESION_INICIO`, `SIA_SESION_CIERRE`) o de `02_fuente/claves.local.json`, que no se publica. Si no existe (archivo único), la app lee los datos incrustados.
- Solo se reescriben los archivos que cambiaron, así Git no ve cambios falsos.
- **Valida antes de escribir:** las listas `JS_ESPERADOS` y `CSS_ESPERADOS` nombran cada módulo; si falta, sobra o está vacío uno, se detiene con código 1 y no escribe nada. Para agregar un módulo hay que añadirlo a la lista. De `libs/` y `fuentes/` solo se publica lo listado en `LIBS_PUBLICADAS` y `FUENTES_PUBLICADAS`.
- **Datos verificados:** compara el contenido descomprimido de `datos/*.bin` con `datos/SUMAS.json` y se detiene si no coincide. Se compara el contenido porque la compresión gzip cambia de un equipo a otro. Tras regenerar los datos a propósito: `python 03_procesamiento_datos/verificar_datos.py --actualizar`.
- **No borra:** un archivo de `docs/` que ya no pertenece al sitio se mueve a `_to_delete/docs_obsoletos_<fecha>/` y se avisa. Genera `docs/.nojekyll`.
- Lo cubre `04_pruebas/prueba_construccion.py`.
- `ROBOTS` en `construir.py` controla la instrucción de no aparecer en buscadores.
- Si `README.md` no nombra como vigente la versión de `VERSION`, la construcción lo avisa.

## 4. Orden de carga en el navegador

1. `index.html` pinta el panel y el cargador (con `preload` de las tipografías). El cargador anuncia lo que baja la primera visita, copia sin conexión incluida (lo calcula `construir.py`).
2. `config.js`, `libs/deck.js`, `libs/pako.js` y `app.js` (en ese orden). `config.js`, el primero y el más chico, empieza a pedir los tres `.bin` (`SIA_PEDIDOS`) mientras bajan las librerías: así se piden una sola vez en todos los navegadores (WebKit no aprovechaba `<link rel=preload as=fetch>`; B8-01).
3. `02_datos.js` toma esos pedidos con barra de avance, descomprime (`DecompressionStream`, o pako si no existe) y decodifica. Si un intermediario entrega un archivo ya descomprimido, lo compara con su huella (`crc` en `config.js`, CRC-32; B5-04).
4. `03_estado.js` a `15_mi_ubicacion.js` preparan estado, mapa, panel y eventos; `16_arranque.js` fija el estado inicial, y `17_recorrido.js`, el último, prepara el recorrido guiado (arranca solo en la primera visita, después de la entrada).
5. jsPDF y SheetJS se cargan solo al pedir una ficha o un Excel (`loadLib`).
6. `16_arranque.js` registra `sw.js` (lo genera `construir.py`): guarda en el navegador los archivos de la herramienta, el inventario de arbolado incluido, con el nombre de caché `calles-<huella>`, de modo que la siguiente visita abre sin conexión y muestra los espacios para plantar. La instalación es todo o nada: si un archivo no llega, la copia nueva se borra y sigue la anterior completa (B6-01). Toma de la caché del navegador lo que la página ya bajó, así nada se baja dos veces (B6-02). La página se pide primero a la red y solo si falla se usa la de la copia; la de la red no se guarda en la copia, para que la copia tenga siempre su página y sus archivos de la misma versión. Cada publicación cambia la huella y descarta la copia anterior cuando la nueva está completa. No se registra en el archivo único ni dentro de un marco. Con la sesión configurada (`SESION.inicio`) tampoco se registra, y se retira la copia que hubiera: una copia local se abriría sin sesión.

## 5. Módulos de `02_fuente/js/`

| Archivo | Responsabilidad | Funciones principales |
|---|---|---|
| `01_utilidades.js` | `$`, formatos de número, km y porcentaje; **reglas de negocio** («prioritario»); errores con mensaje para la persona; avisos sobre el mapa; regla única de teléfono | `kmTxt`, `kmFull`, `pct`, `PRIO_MIN`, `esPrio`, `sumPrio`, `errAmable`, `limpioCat`, `avisoMapa`, `MQ_TEL` |
| `02_datos.js` | Descarga, descompresión y decodificación de los datos (con la huella si llegan ya descomprimidos); `puntoMedio` es la única regla de punto medio (a media longitud sobre la línea) | `fetchBytes`, `gunzip`, `reader`, `puntoMedio` |
| `03_estado.js` | Estado de la consulta, colores del tema, colores y filtros por vértice, geometría de alcaldías y colonias, punto de cada nombre de área (el más interior de su figura; el de las colonias se calcula en ratos libres después de abrir), rankings | `readTokens`, `buildColors`, `buildFilter`, `buildVP`, `puntoInterior` |
| `04_mapa_capas.js` | Vista del mapa, mapas de fondo (el propio «Calles» y el satélite de Esri), línea media de cada calle para su nombre (entre un frente y el de enfrente, con la regla `trEnfrente` de los tramos), barra de escala y capas de deck.gl (reutiliza los objetos de datos para no reprocesar 1 millón de vértices en cada zoom) | `layers`, `flyTo`, `fitTo`, `updateScale`, `frontsData`, `lineaMedia` |
| `04_nombres_mapa.js` | Acomodo propio de los nombres del mapa (alcaldías, colonias, vialidades primarias y calles), sin el filtro de choques de deck.gl: en píxeles del mundo a un zoom redondeado (no brincan al mover el mapa), sin encimarse ni quedar bajo los paneles, solo donde el nombre cabe en un tramo recto, repartidos sobre una cuadrícula fija. Los tramos de calle se calculan por colonia en ratos libres | `colocarNombres`, `tramosColonia`, `tramosVP`, `etqDesfasado` |
| `05_mapa_tarjetas.js` | HTML de las tarjetas: frente, tramo de vialidad primaria, colonia; acciones de campo | `featHtml`, `vpHtml`, `colHtml`, `fieldActs` |
| `05_inventario.js` | Capa «Espacios para plantar» del inventario de arbolado (CIGA-UNAM y SEDEMA): cepas vacantes, tocones y árboles muertos. Carga diferida por alcaldía desde zoom 15 (16 en modo ligero), símbolos distinguibles sin color, ficha (`showCard('inv')`), casillas y avance del inventario. La capa no altera ninguna cifra; el filtro «Espacio» (v1.21) sí acota los frentes consultados, igual que la banqueta, con los tipos de cada frente que baja `espCargar` (`espacios_frentes.bin`, formato 2: puntos de cada tipo por frente; de ahí `ESP_FR` y `ESP_CV`, que usa también el orden por cepas). Desde la v1.41: si `SIA_INVENTARIO` de `config.js` no tiene la forma esperada (`invForma`), sigue sin inventario y lo dice; un archivo que falla se vuelve a pedir pasados 30 s, al volver la red o con «Reintentar», y el aviso distingue la conexión del archivo (`invPide`, `invAviso`) | `invCapas`, `invPick`, `invHtml`, `invNota`, `invReinicia`, `INV_Z`, `INV_Z_LIGERO`, `espCargar`, `espLeer`, `espNota`, `invDeAlc`, `invForma`, `invPide`, `invReintenta` |
| `06_mapa_interaccion.js` | Instancia `DeckGL`, clic en el mapa, dedos «fantasma» en teléfono, mostrar/ocultar tarjeta, botones de zoom y toda la ciudad (casa), modo ligero. Con `window.SIA_PRUEBA` expone `window.__MAPA` para las pruebas | `showCard`, `hideCard`, `rerender`, `scopeView`, `revisarRendimiento`, `soltarDedos` |
| `07_leyenda_y_capas.js` | Leyenda-filtro, filas «Atiende» (alcaldías / Gobierno Central), «Banqueta» (solo alcaldías) y «Espacio» (cepa vacante, tocón, árbol muerto; casillas independientes, todas apagadas = sin filtro; aplica a las dos redes desde la v1.24, con su aviso de inventario en curso). Casillas de capas, mapa de fondo | `setResp`, `setBanq`, `setEspacio`, `espAviso`, `espReinicia`, `setLayer`, `setFondo` |
| `08_resumenes.js` | Estadísticas por colonia, avenida y ámbito; cifras y barras del panel; desglose de lo prioritario por banqueta y cuadro «Quién atiende» en km de frente por responsable. «Más detalles» (`details.mas`): plegado en el celular y abierto en la computadora; con `siempre`, plegado también en la computadora (lo del Gobierno Central en km de frente) | `masDet`, `notaPlegable`, `compHtml` (comparación «Alcaldía y Gobierno Central»: km prioritario, sin arbolado y total sin decimales, y cepas, tocones y árboles muertos), `espComp`, `espCompPide`, `kmComp`, `colStat`, `avStat`, `frSumm`, `repStat`, `gcFrente` (equivalente en km de frente de las vialidades primarias), `avGrupos` (vialidades separadas que comparten nombre), `renderSummary` |
| `09_listados.js` | Pestaña «Dónde empezar» (`renderInicio`), la única lista: según el ámbito, colonias con orden elegible, calles de la alcaldía o de la colonia, avenidas o alcaldías (selector «Mostrar», `iniVistas`), con filtro por nombre, «Ver 10 más», tramos de la calle elegida arriba y calle consultada resaltada. «Mostrar» con textos cortos («Colonias · más km prioritarios», «· más cepas vacantes», «· más habitantes»; calles; avenidas; alcaldías). El orden por cepas cuenta lo prioritario y el renglón dice también el total (`cv`, `callescv`, `avcv`; `cepasTxt`, `cepasK`), que baja el inventario la primera vez (`iniCepas`, `iniCarga`, `cepasTxt`; `colStat().cv`) | `nomFrente` (nombre único de un frente; «Frente sin nombre de calle (INEGI)»), `buildStreets`, `buildAvenues`, `desgHtml` (desglose de la calle por prioridad), `calleCoincide` y `renderUbicar` (paso de ubicación de un nombre repetido: alcaldías con conteo y renglones sin cifras), `iniFila`, `filasColonias`, `filasCalles`, `filasAvenidas`, `filasAlcaldias`, `highlightStreet`, `calleSel` |
| `09_tramos.js` | Junta los pedazos de esquina (tramos de menos de 60 m «a la altura de» una calle) con el tramo vecino y los dos lados de una cuadra que no se emparejaron; lo que aún se repita se distingue por lado o número (`tramoTxt`). Tramos de la calle consultada: agrupa sus frentes de esquina a esquina con una regla geométrica (casi paralelos, en lados opuestos y traslapados) y nombra las vialidades que los delimitan; se calcula al consultar, sin cambiar los datos. Su regla de «frente de enfrente» (`trEnfrente`) la usan también los nombres de calle | `tramosDeCalle`, `trEnfrente`, `entreTxt`, `tramosSel`, `renderTramos` |
| `10_seleccion.js` | Selección de alcaldía, colonia y avenida; **`refresh()`** | `refresh`, `setSel`, `pickColonia`, `pickAvenida` |
| `11_descargas.js` | Seis Excel: «Lista de calles» y «Lista de avenidas» (mismas filas y orden que «Dónde empezar»: `callesLista`, `avenidasLista`, `ordenaLista` y `ordenCepas` de `09_listados.js`, compartidas con la pantalla), «Frente por frente», «Tramo por tramo», «Frente por frente de la calle» y «Las 16 alcaldías». Columnas `cepas_vacantes`, `tocones` y `arboles_muertos` (inventario) al final, y `cepas_vacantes_prioritario` en las listas; si el inventario no carga o tarda más de 15 s (`ESP_ESPERA`), salen sin ellas y lo dicen (`deliverConEsp`, `espDescarga`). La consulta se fotografía al pedir el archivo (`fotoDic`, `geoFoto`): un cambio de alcaldía durante la espera no cambia el archivo. Fechas de la Ciudad de México (`fechaCDMX`, `hoyCDMX`). Exportación geográfica de las calles prioritarias (`geoDescarga`: KML y GeoJSON armados por partes, mismos registros que los Excel de frentes y tramos). CSV y Excel con diccionario de datos; carga de librerías bajo demanda (de `libs/` en el sitio, de la copia incrustada en el archivo único) | `deliverTable`, `dictAoa`, `loadLib`, `libIncrustada`, `excelAparte` |
| `12_fichas_pdf.js` | Fichas PDF de colonia, alcaldía, vialidades primarias, avenida y calle | `conPDF`, `fichaPDF`, `fichaCallePDF` |
| `13_interfaz.js` | «Mi cuenta» con sesión (cambiar contraseña y cerrar sesión; menú accesible, Esc y clic fuera lo cierran). Celular en dos pantallas: `pantalla`, `verMapa`, `verInfo`, `rotuloInfo` (texto del botón de abajo) e `inert` de la pantalla que no se ve. Ventana de ayuda (se cierra con ×, "Volver al mapa", Esc o Atrás), tres pestañas (Dónde empezar, Resumen, Descargas; un nombre desconocido abre «Dónde empezar»), acciones fijas (lo principal es la lista de «Mostrar»: «Lista de calles» o «Lista de avenidas»; en toda la ciudad, «Las 16 alcaldías»; con una calle, sus frentes; en «Descargas» solo lo principal va relleno de guinda; el pie no ocupa lugar sin nada que descargar), ruta de navegación, entrada por territorio (`abreEntrada`) y leyenda compacta | `openInfo`, `closeInfo`, `setTab`, `renderActions`, `renderCrumb` |
| `14_buscador.js` | Lee también coordenadas pegadas (decimales, grados-minutos-segundos y enlaces largos de Google Maps; `leeCoordenadas`) y las manda a `irAPunto` (15_mi_ubicacion.js). Buscador único con abreviaturas y tolerancia a errores; nombre que distingue a las colonias homónimas de una alcaldía («parte k de n» o su CP), usado en archivos, fichas y «Ámbito consultado» | `omniIndex`, `omniSearch`, `omniPick`, `colNombre` |
| `15_mi_ubicacion.js` | La ficha de la zona (`zonaHtml`: colonia, lo que está junto y calles prioritarias cercanas) la comparten «Mi ubicación» y el punto buscado por coordenadas (`irAPunto`, marcador `pto-buscado`). GPS, colonia donde está la persona, tramos prioritarios cercanos, seguimiento. Con `window.SIA_PRUEBA` deja leer a las pruebas dónde cae un punto, el ámbito del registro de usos y el estado de «Seguirme» (`window.__UBIC`) | `locate`, `whereAmI`, `nearby`, `showLoc` |
| `16_arranque.js` | Estado inicial, consulta indicada en la dirección, aviso de errores inesperados y registro de `sw.js` | — |
| `17_recorrido.js` | Pasos de unos dos minutos (12 a 14 según pantalla y sesión): incluye el filtro «Espacio», un punto real del inventario («Espacios para plantar», `recPunto`, `recEspacios`), el orden por cepas dentro de «Dónde empezar» y «Mi cuenta» solo con sesión; los textos pueden depender de la consulta y `prep` puede ser asíncrono (`recDeshace`). Recorrido guiado: velo, foco sobre cada control y globo con el texto; arranca solo la primera vez (después de la entrada, mediante `trasEntrada` de `13_interfaz.js`) y desde el botón de «Cómo funciona». El paso de Street View abre la ficha de un frente prioritario con nombre del ámbito. No arranca solo en las pruebas automáticas salvo que se pida (`window.SIA_RECORRIDO`) | `recorrido`, `recPaso`, `recColoca`, `recFin` |

### Estado global (en `03_estado.js`, salvo donde se indica otro archivo)

| Variable | Qué guarda |
|---|---|
| `resp` / `respOn` | Quién atiende: `'alc'`, `'gc'` o `'both'` / casillas activas |
| `sel`, `selCol`, `selAv` | Alcaldía (índice), colonia (id) y avenida (id de NOMENCLAT) seleccionadas, o `null` |
| `highlight` | Calle o avenida resaltada en el mapa |
| `pinned` | Tarjeta abierta: `{kind:'fr'|'vp'|'col'|'inv'|'loc'|'pto', i}` (`inv`: punto del inventario; `pto`: punto buscado por coordenadas) |
| `visible[5]` | Prioridades visibles según la leyenda |
| `showAlcB`, `showColB`, `showFrB` | Capas encendidas |
| `viewState` | Vista actual del mapa |
| `myPos` | Última posición de Mi ubicación (solo en memoria) |
| `ptoBuscado` | Punto buscado por coordenadas (`{lon, lat}`), marcado en el mapa hasta otra búsqueda o al cerrar su ficha |
| `modoLigero` | `true` si el navegador dibuja sin tarjeta gráfica (ver sección 9 bis) |
| `fondo` | Mapa de fondo: `'no'`, `'calles'` o `'sat'` |
| `opPrio` | Opacidad de las capas de prioridad (0.2 a 1) |
| `filtroBanq` | Filtro de banqueta de los frentes de las alcaldías: `'todas'`, `'con'` o `'sin'` |
| `filtroEsp` | Filtro «Espacio» en vigor, en bits: 1 cepa vacante, 2 tocón, 4 árbol muerto; 0 = sin filtro (en la dirección, `e=cv,to,am`) |
| `espQuiero` | Lo elegido en las casillas de «Espacio» mientras llega el archivo del inventario; al llegar pasa a `filtroEsp` (`07_leyenda_y_capas.js`) |
| `PANTALLA` | Pantalla visible en el celular: `'info'` o `'mapa'` (`13_interfaz.js`) |

**Reglas de negocio en un solo lugar:** «prioritario» es clase ≥ `PRIO_MIN` = 2 (Muy Alta, Alta y Media). Todo el código pregunta con `esPrio(clase)` y suma con `sumPrio(arreglo)`; no debe escribirse `>=2` ni `[2]+[3]+[4]`. Las pruebas usan el mismo umbral desde `lib_pruebas.js` (`L.PRIO_MIN`) y la exportación de capas desde `PRIO_MIN` en `5_exportar_geoserver.py`.

**Filtro único del ámbito:** `enAmbito(i)` (en `03_estado.js`) decide si un frente pertenece a la consulta: con colonia elegida manda la colonia; sin colonia, la alcaldía; y además los filtros, con `pasaFiltros(i)`: los frentes de la alcaldía pasan por banqueta (`pasaBanq`) y espacio (`pasaEspacio`); los del Gobierno Central siguen la regla de sus vialidades, sin banqueta y con el espacio de su tramo (`pasaEspacioVP(F.vp[i])`). La prioridad de un frente se lee con `prioFr(i)`: la suya, o la de su tramo si es del Gobierno Central (v1.37). Mapa, cifras, listado, Excel y fichas deben usar estas funciones y no repetir la condición. Las cifras que se guardan en caché (`colStat`, `repStat`, `sinColStat`) se rehacen al cambiar `filtroBanq` o `filtroEsp`; con solo Gobierno Central `setResp` suelta el filtro de banqueta, que no se ve; `frSumm` recalcula desde los frentes cuando hay filtro. `banqDesglose` da los km prioritarios con banqueta, sin banqueta y por verificar **sin** aplicar el filtro: es el desglose que muestran siempre el Resumen y las fichas.

**Banqueta:** «con» = INEGI 2020 registra banqueta (índice 0 de `META.disp`, «Dispone»); «sin» = cualquier otro valor (no dispone, conjunto habitacional, no aplica, no especificado). Solo afecta a los frentes de manzana; las vialidades primarias no tienen ese dato. La fila se oculta con Gobierno Central.

**Errores y arranque:** `errAmable(mensaje, detalle)` (en `01_utilidades.js`) crea errores cuyo `amable` es lo que ve la persona; el cierre de `app.js` lo muestra con «Reintentar». `config.js` lleva además un vigía (definido en `construir.py`) que avisa si un programa no llega o la carga tarda más de 45 s. `02_datos.js` verifica que cada archivo traiga exactamente los registros declarados. Los textos de los catálogos se neutralizan al cargar (`limpioCat`).

**Estilos calculados sin atributo `style` (política de seguridad de contenido):** una política estricta rechaza `style="…"` escrito en el HTML. Las plantillas escriben `data-st="propiedad:valor"` y `aplicaSt` (`01_utilidades.js`), con un observador de cambios, lo aplica por programa, que sí está permitido. **No escribir `style="` en plantillas ni en la página**: la prueba del servidor lo detecta. Asignar `elemento.style.x = …` desde el código sí es válido.

**Registro de usos:** con la sesión configurada (`SESION.inicio`), `avisaUso` (`01_utilidades.js`) envía con `navigator.sendBeacon` a `/priorizacion-reforestacion/api/uso` (o `SESION.uso`) cada descarga (`usoDescarga`, llamada desde `deliver` y `deliverBlob`, con el tipo de archivo deducido del nombre) y cada consulta (`usoConsulta` al final de `refresh()`, tras 1.5 s en el mismo ámbito; no anota toda la ciudad ni los cambios de «Seguirme»). El ámbito lo arma `ambitoUso` (`11_descargas.js`). Sin sesión no envía nada. El servidor y el panel están en `08_entrega_sia/login/`.

**Sesión (Fase 2):** `esSesion` reconoce una respuesta 401 o 403, o una página HTML donde se esperaba un archivo; `sesionViva()` pregunta a `/api/yo` antes de entregar lo que se arma sin pedir nada al servidor (KML y GeoJSON, v1.38); `causaFalla(url)` distingue sesión, red y servidor cuando una librería no llega; `avisoSesion` escribe el mensaje con el enlace de `SESION.inicio`. Con `SESION.inicio` definido no se registra `sw.js`. Ver `08_entrega_sia/SESION_Y_LOGIN.md`.

**Accesibilidad:**
- *Anuncios:* `anunciaAmbito()` (`10_seleccion.js`) escribe el ámbito y su cifra en `#sr-estado` (región viva); el conteo del listado, el estado de las descargas y el mensaje del cargador tienen `role="status"`; los errores de carga, `role="alert"`.
- *Foco:* después de elegir, `enfocaRespuesta()` (`13_interfaz.js`) lo pasa a `#scope-title` o, en el celular con el mapa a la vista, a la ficha abierta o a «Volver a la información»; nunca queda en la página ni dentro de algo inerte. `showCard` enfoca la ficha (`enfocaFicha`) y `hideCard(true)` lo devuelve al control de origen; con Esc en el celular, si la ficha se abrió desde un renglón de la información, regresa a la información y a ese renglón. Esc cierra ayuda, ficha y capas (`13_interfaz.js`); con la ayuda, la entrada o el recorrido abiertos, `inerte()` deja `inert` a `.app` y al enlace «Saltar a la respuesta». En teléfono, si el foco llega a un control tapado por la ficha, la ficha se cierra.
- *Entrada y recuerdo del territorio:* sin consulta en la dirección, `16_arranque.js` abre en la última alcaldía consultada (`localStorage`, clave `cp_inicio`: clave de alcaldía o `ciudad`; y la red en `cp_red`: `alc`, `gc` o `both`); si no hay nada recordado, `abreEntrada()` pregunta, en dos pasos, la red (alcaldías o Gobierno Central) y el territorio. Un enlace con consulta manda sobre lo recordado y no lo modifica. Si el navegador no permite `localStorage`, la herramienta pregunta en cada visita.
- *Listados:* cada renglón es un `li` con un `<button class="fila">` que lo ocupa todo (la lista conserva su semántica); el botón se activa con Entrar o barra espaciadora sin código propio, y si la lista se vuelve a armar el foco regresa al renglón elegido o a la respuesta (delegado en `09_listados.js`). Elegir un tramo abre la ficha de su frente de mayor prioridad: es la vía de teclado a la ficha de un frente.
- *Mapa:* el lienzo lleva `role="application"` y un nombre que remite al listado; el texto está en `data-nombre` de `#map`.
- *Documentos:* `propsPDF` y `propsExcel` ponen idioma, título y autoría. Las fichas no están etiquetadas (jsPDF no puede).

**La consulta en la dirección:** `guardaURL()` anota cada cambio con `pushState` y `aplicarURL()` la restaura al abrir y en `popstate` (`10_seleccion.js`).

**Flujo de un cambio de ámbito:** una acción (buscador, clic, ruta) cambia `sel`/`selCol`/`selAv` → `refresh()` recalcula colores y filtros por vértice, cifras, listados y botones → `rerender()` redibuja las capas → `flyTo(scopeView())` encuadra el mapa.

## 6. Estilos de `02_fuente/css/`

| Archivo | Contenido |
|---|---|
| `01_variables.css` | Paleta institucional, rampa de prioridad (`--p0` Muy Baja … `--p4` Muy Alta), colores del mapa, `--loc`. **Cambiar un color aquí lo cambia en toda la herramienta**, mapa y fichas PDF incluidos (`pdfPaleta()` de `12_fichas_pdf.js` los lee). Las transparencias usan canales: `rgba(var(--tinta-rgb),.14)`. Ninguna otra hoja escribe colores a mano (lo revisa `prueba_consistencia.js`). |
| `02_base.css` | Tipografía, panel, cifras, barras, mapa, leyenda, tarjetas, ventana, cargador, teléfono |
| `03_controles.css` | Foco, campos, menús, barra de herramientas, barra de resumen, casillas |
| `04_pantalla_y_leyenda.css` | Sin desborde en teléfono, barra de escala, leyenda-filtro, encabezado compacto, estados vacíos y acciones de campo |
| `05_panel_y_hoja_inferior.css` | Panel en tres partes (consulta, respuesta y acciones), pestañas, ruta de navegación, sugerencias del buscador y posición del crédito del satélite y de «Modo ligero» en el celular (debajo del resumen del mapa, `--mapbar-alto`) |
| `06_mi_ubicacion.css` | Botón y tarjeta de Mi ubicación |
| `07_accesibilidad.css` | Texto solo para lector de pantalla, enlace de salto, indicador de foco, bordes de controles, objetivos táctiles en teléfono, tabla y lámina de la ayuda, movimiento reducido e impresión |
| `08_orientacion.css` | Entrada por territorio, pestaña «Dónde empezar» (filtro y tramos), Descargas sin botones apagados (solo el motivo), bloques del Resumen con las dos redes, leyenda compacta, «Quién atiende» dentro del panel de capas y acciones junto al título de la consulta |
| `09_recorrido.css` | Velo, foco y globo del recorrido guiado y su botón en «Cómo funciona» |
| `10_dos_pantallas.css` | Celular: información y mapa en dos pantallas completas encimadas (el panel sale hacia la izquierda; el mapa nunca cambia de tamaño), botones «Ver el mapa» y el de abajo del mapa, controles por encima de ese botón, modo sin mapa, alto real de la pantalla (`--alto`, `--vvh`), «Más detalles» (`details.mas`, `.siempre`) y encabezado compacto del celular |
| `11_inventario.css` | Sección «Espacios para plantar» del panel de capas y ficha del inventario (colores `--inv-*` en `01_variables.css`) |

Los archivos 04, 05 y 07 ajustan reglas de los anteriores: **el orden importa**. Los tamaños de letra van en `rem` (16 px = 1 rem) para respetar el tamaño configurado en el navegador; el mínimo es 0.75 rem. Para cambiar un componente, buscar su clase en todos los archivos de `css/`.

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
`flags`: bits 0–2 arbolado, el dato de árboles de INEGI 2020 (`ARBOLES_D`), con el mismo catálogo que la banqueta (`META.disp`; confirmado el 5 oct 2026, ver `08_entrega_sia/CONTRATO_DE_DATOS.md` y `05_documentacion/capas_geograficas.md`); la herramienta solo usa 1 = sin arbolado. Bits 3–5 banqueta (índice en `disp`), bit 6 = a cargo de Gobierno Central.

**`vp.bin`** (tramos de vialidades primarias): `NV`, y por cada tramo: nomenclatura, nombre, tipo, carriles, circulación, texto de alcaldía, alcaldía, prioridad, longitud (m), clave, registro, número de vértices y los vértices.

**`datos/inventario/inv_<cve>.bin`** (un archivo por alcaldía; formato byte por byte en la sección 6 bis de `08_entrega_sia/CONTRATO_DE_DATOS.md`): por punto, coordenadas, tipo (0 cepa vacante, 1 tocón, 2 árbol muerto), frente de manzana asignado + 1 (a 20 m o menos; 0 = sin frente) y la clave del inventario. `RESUMEN.json` y `SUMAS.json` (en `02_fuente/datos/inventario/`) guardan el corte, las cifras de control, el avance por alcaldía y la huella de `data.bin` con que se asignaron; `construir.py` se detiene si no coinciden. La página recibe huellas, corte y avance en `window.SIA_INVENTARIO` (`config.js`). **`datos/inventario/espacios_frentes.bin`** (v1.21; formato 2 desde la v1.23): por cada frente con al menos un punto asignado, su índice (en diferencias) y cuántas cepas vacantes, tocones y árboles muertos tiene; lo usa el filtro «Espacio» (`pasaEspacio(i)`, dentro de `enAmbito(i)` junto con `pasaBanq`; las cachés usan `filtroClave()`). Sus cifras van en `SIA_INVENTARIO.fr`. `SIA_INVENTARIO.sinc`: puntos sin frente ni vialidad primaria a 25 m (5,019), que la nota de la comparación del Resumen dice en toda la ciudad. **`datos/inventario/espacios_vp.bin`** (v1.24): por cada parte de vialidad primaria con al menos un punto, su índice (en diferencias) y sus conteos por tipo. Un punto cuenta para una parte si está en un frente del Gobierno Central ligado a ella (`F.vp`) o, si quedó sin frente, si el eje de la parte está a 25 m o menos (camellón). El filtro de vialidades está en `pasaEspacioVP(i)`, dentro de `enAmbitoVP(i)`; estado `ESP_VP`, `ESP_VPN`; cifras en `SIA_INVENTARIO.vp`. Desde la v1.24, `inv_<cve>.bin` va en formato 2: lleva además la parte de vialidad de los puntos del camellón.

Cómo se generan: `03_procesamiento_datos/LEEME.md` (el inventario, paso 9).

## 8. Dependencias externas

| Qué | Dónde | Nota |
|---|---|---|
| deck.gl 9.4, pako 2.1, jsPDF 4.2.1, SheetJS 0.20.3 | `docs/libs/` (sitio) · incrustadas (archivo único) | Copias idénticas a las del paquete oficial: npm, salvo SheetJS, que se distribuye desde `cdn.sheetjs.com` (huellas SHA-256 en `libs/LICENCIAS.md`), con el texto de cada licencia en `libs/LICENCIA_*.txt`. Ninguna versión las pide a una red de distribución externa |
| Tipografías Cabin y Roboto | `docs/fuentes/` (sitio) · incrustadas (archivo único) | Archivos woff2 de peso variable (400 a 700), subconjunto latino, 63 KB en total. Licencia SIL Open Font License 1.1 (`fuentes/OFL_*.txt`). La página no pide nada a terceros para arrancar; lo verifica `04_pruebas/prueba_sin_terceros.js` |
| Enlaces "Cómo llegar" y "Street View" | Google Maps | Solo enlaces; se abren en otra pestaña |
| Geolocalización | API del navegador | Requiere HTTPS; la posición no sale del teléfono |
| Mapa de fondo de calles (opcional) | Propio, alojado con el sitio (`datos/fondo/`): manzanas del Catastro de la CDMX, parques y jardines del Inventario de Áreas Verdes 2017 de SEDEMA, ANP y AVA oficiales y cuerpos de agua de SEDEMA | Lo genera `03_procesamiento_datos/6_fondo.py` (1.6 MB en total). Es el fondo con que abre la herramienta (`FONDO_INICIAL`): de lejos solo pide `fondo_base.bin` (143 KB, que también guarda el proceso de servicio para abrir sin conexión); las manzanas, por alcaldía, desde el zoom 13. No está en el archivo único, que abre sin fondo |
| Mapa de fondo satelital (opcional) | Sin clave (vigente): Esri World Imagery con la capa de nombres de vías `Reference/World_Transportation` encima, ambas de `services.arcgisonline.com`. Con clave: Esri World Imagery con nombres, `static-map-tiles-api.arcgis.com` (ArcGIS Location Platform, 2 millones de teselas gratis al mes) | La clave se da con `SIA_ESRI_KEY` o en `02_fuente/claves.local.json` (ver sección 9). El uso sin clave queda pendiente de regularizar con una cuenta de Esri. Atribución obligatoria. Solo se pide si el usuario lo enciende |
| Inventario de arbolado (capa «Espacios para plantar») | CIGA-UNAM y SEDEMA, corte de septiembre de 2026, **en curso**. Se lee del CSV de «Guardianes de árboles» (`INVENTARIO_ARBOLADO_CSV`) sin copiarlo; solo se publican cepas vacantes, tocones y árboles muertos. Pendiente de análisis: tomarlo de una sola fuente en PostGIS/GeoServer del SIA, al construir |

Las fallas y los límites conocidos de cada componente ajeno (librerías, navegadores, herramientas de prueba y servidor del SIA), con el rodeo que usa la herramienta y qué revisar al actualizarlo, están en `05_documentacion/componentes_compartidos.md`.

## 9. Cambios comunes

| Quiero… | Dónde |
|---|---|
| Cambiar un texto del panel o de la ayuda | `plantilla.html` (fijos) o el módulo que lo genera (`08_resumenes.js`, `13_interfaz.js`) |
| Cambiar un color | `css/01_variables.css` (ahí viven también `--focus`, `--map-halo`, `--map-alc`, `--map-vp`, `--map-col` y `--map-filete`; en JS se leen con `readTokens`: `T.ink`, `T.guinda`, `T.halo`, `T.prioClara`, `T.filete`). Filete de las clases claras de la rampa desde el zoom 14 (`FILETE_Z`, `FILETE_PX`, `FileteExt` en `04_mapa_capas.js`; la capa se conserva oculta debajo del 14; en modo ligero, los frentes solo lo llevan con alcaldía o colonia elegida); después, `node herramientas/contraste.mjs` (auditoría de contraste del mapa, `05_documentacion/auditoria_contraste_mapa.md`; la prueba `prueba_contraste.js` avisa si un par deja de cumplir) |
| Cambiar el contenido de una ficha PDF | `js/12_fichas_pdf.js` |
| Agregar una columna a un Excel | `js/11_descargas.js` (datos y diccionario van juntos) |
| Cambiar qué muestra la tarjeta de un frente | `js/05_mapa_tarjetas.js` |
| Actualizar los datos del modelo | Scripts de `03_procesamiento_datos/` → `construir.py` |
| Actualizar el inventario de arbolado | Reemplazar el CSV con el mismo nombre (o `INVENTARIO_ARBOLADO_CSV`), indicar el corte en `INVENTARIO_CORTE` y correr `9_inventario_espacios.py` → `verificar_datos.py` → `construir.py` → pruebas (`03_procesamiento_datos/LEEME.md`) |
| Publicar una versión nueva o cambiar el corte de los datos | `VERSION` y `CORTE_DATOS` en `construir.py` (aparecen en el panel, las fichas y el diccionario de los Excel) |
| Permitir que aparezca en buscadores | `ROBOTS = ''` en `construir.py` |
| Cambiar o agregar un mapa de fondo | `FONDOS` en `js/04_mapa_capas.js` (dirección, tamaño de tesela, zoom máximo, opacidad, atribución) |
| Poner la clave del satélite | Variable de entorno `SIA_ESRI_KEY` o `02_fuente/claves.local.json`, y reconstruir. La clave queda visible en la página: restringirla al dominio del sitio |
| Actualizar el fondo «Calles» | Poner los insumos nuevos en `03_procesamiento_datos/insumos/fondo/`, correr `python 03_procesamiento_datos/6_fondo.py` y reconstruir |
| Armar el paquete para el SIA | `python 08_entrega_sia/empaquetar.py`. Lo versionado nombra la infraestructura del SIA con textos genéricos; el paquete lleva los nombres reales de `08_entrega_sia/nombres_sia.local.json` (no se publica; formato: `{"reemplazos": [[texto genérico, texto real], …], "vigilar": [palabras]}`). Sin ese archivo, el paquete sale con los textos genéricos y lo avisa |
| Generar las listas de catálogos para el SIA | `python 03_procesamiento_datos/reporte_catalogos.py` |
| Cambiar a partir de qué zoom aparecen las calles en modo ligero | `ZOOM_LIGERO` en `js/03_estado.js` (y el corte en `ZOOM_CORTES` de `06_mapa_interaccion.js`) |

Después de cualquier cambio: `python 02_fuente/construir.py` y `node 04_pruebas/correr_todas.js` (ver `04_pruebas/LEEME.md`).

### 9 bis. Rendimiento y modo ligero

- Lo pesado es **dibujar** los 372 mil frentes (≈1 millón de vértices), no el código. Con tarjeta gráfica es fluido; sin ella (aceleración por hardware desactivada, escritorios remotos o máquinas virtuales) cada zoom puede tardar decenas de segundos.
- Al cargar, `revisarRendimiento()` lee el nombre del dibujante de WebGL. Si es por software (SwiftShader, llvmpipe, Microsoft Basic Render), activa el **modo ligero**: sin animaciones, resolución 1×, frentes solo a partir del zoom 13 (por debajo, las colonias pintadas por prioridad) y un aviso con los pasos para activar la aceleración.
- En modo ligero, con una alcaldía, colonia o calle consultada solo se dibujan los frentes de esa consulta (`frontsSub`, `frReal` en `04_mapa_capas.js`) y aparece el indicador «Dibujando calles…».
- Excel de más de 20 mil filas (`GRANDE` en `11_descargas.js`): se arma en `libs/excel_worker.js` y se avisa del tamaño; si el proceso auxiliar no está disponible se arma en la página.
- Teléfono: la regla única es `MQ_TEL` (`01_utilidades.js`) y su equivalente en CSS: angosto y alto = dos pantallas (información y mapa, `10_dos_pantallas.css`); teléfono en horizontal (alto ≤ 480 px) = panel lateral de 300 px.
- Forzar un modo desde la dirección: `?modo=ligero` (sin aviso) o `?modo=completo`.
- Siempre: los botones + y − cambian de zoom sin animación, las capas solo se rehacen al cruzar un corte de zoom (`ZOOM_CORTES`) y la resolución se limita a 1.5× en pantallas de alta densidad.

## 10. Publicación en el SIA

Todo está en `08_entrega_sia/`: guía de instalación, actualización y reversión; ejemplo de nginx; lista de verificación; integración del inicio de sesión; contrato de datos y cierre de la Fase 1. El formato de los datos de la sección 7 es un resumen: el contrato completo está en `08_entrega_sia/CONTRATO_DE_DATOS.md`.
