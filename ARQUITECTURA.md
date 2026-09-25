# Arquitectura · Calles prioritarias para reforestar

Guía para quien mantenga la herramienta o la instale en el SIA: dónde está cada cosa, cómo se arma, cómo viajan los datos y cómo hacer los cambios más comunes. Para el uso diario del repositorio, ver `README.md`.

## 1. En una frase

Sitio **estático**: HTML, CSS y JavaScript sin frameworks ni compilador. El navegador descarga los datos ya procesados (`docs/datos/*.bin`), los descomprime y dibuja el mapa con deck.gl. No hay servidor de aplicaciones, base de datos ni GeoServer, y la herramienta no guarda datos de nadie.

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
│   └── libs/                  deck.gl, pako, jsPDF, SheetJS + LICENCIAS.md
├── docs/                      ← LO QUE SE PUBLICA (generado; no editar a mano)
├── 03_procesamiento_datos/    scripts de Python que producen 02_fuente/datos/ (ver su LEEME.md)
├── 04_pruebas/                prueba integral en escritorio y teléfono (ver su LEEME.md)
├── 05_documentacion/          auditoría UX y bitácora de decisiones (la bitácora solo en la copia local)
├── 06_entregables/            guía de prueba con alcaldías y lámina de frentes de manzana
└── 07_versiones/              versiones anteriores (solo en la copia local)
```

**Regla de oro:** se edita en `02_fuente/` y se corre `python3 02_fuente/construir.py`. Todo lo de `docs/` se regenera; un cambio hecho directamente en `docs/` se pierde en la siguiente construcción.

## 3. Cómo se arma (`construir.py`)

| Salida | Para qué | Cómo quedan las piezas |
|---|---|---|
| `docs/` | GitHub Pages y el servidor del SIA | `index.html` (29 KB) + `estilos.css` + `config.js` + `app.js` + `datos/` + `libs/` + `img/`, cada referencia con huella `?v=` para la caché del navegador. Sin código en línea. |
| `_local/calles_prioritarias.html` | Abrir con doble clic, sin servidor | Todo incrustado en un archivo (6.7 MB); librerías desde CDN. No se publica. |
| `--artefacto RUTA` | Respaldo como artefacto de Claude | Igual que el anterior, sin la envoltura `<html>`. |

- `css/*.css` se concatenan en orden alfabético → `estilos.css`.
- `js/*.js` se concatenan en orden alfabético dentro de una función asíncrona (`(async function(){ … })()`) → `app.js`. Por eso **todos los archivos comparten el mismo alcance**: una variable o función de `03_estado.js` se usa directamente en `10_seleccion.js`. Si al cargar ocurre un error, el cargador lo muestra en lugar del mapa.
- `config.js` indica dónde están las librerías (`SIA_LIBS`) y la huella y el tamaño de los datos (`SIA_DATOS`). Si no existe (archivo único o artefacto), la app lee los datos incrustados.
- Solo se reescriben los archivos que cambiaron, así Git no ve cambios falsos.
- `ROBOTS` en `construir.py` controla la instrucción de no aparecer en buscadores.

## 4. Orden de carga en el navegador

1. `index.html` pinta el panel y el cargador; con `preload` empieza a bajar `datos/*.bin` de inmediato.
2. `config.js`, `libs/deck.js`, `libs/pako.js` y `app.js` (en ese orden).
3. `02_datos.js` descarga los tres `.bin` con barra de avance, los descomprime (`DecompressionStream`, o pako si no existe) y los decodifica.
4. `03_estado.js` a `15_mi_ubicacion.js` preparan estado, mapa, panel y eventos; `16_arranque.js` fija el estado inicial.
5. jsPDF y SheetJS se cargan solo al pedir una ficha o un Excel (`loadLib`).

## 5. Módulos de `02_fuente/js/`

| Archivo | Responsabilidad | Funciones principales |
|---|---|---|
| `01_utilidades.js` | `$`, formatos de número, km y porcentaje | `kmTxt`, `kmFull`, `pct` |
| `02_datos.js` | Descarga, descompresión y decodificación de los datos | `fetchBytes`, `gunzip`, `reader` |
| `03_estado.js` | Estado de la consulta, colores del tema, colores y filtros por vértice, geometría de alcaldías y colonias, rankings | `readTokens`, `buildColors`, `buildFilter`, `buildVP` |
| `04_mapa_capas.js` | Vista del mapa, nombres de calle, barra de escala y capas de deck.gl | `layers`, `flyTo`, `fitTo`, `updateScale` |
| `05_mapa_tarjetas.js` | HTML de las tarjetas: frente, tramo de vialidad primaria, colonia; acciones de campo | `featHtml`, `vpHtml`, `colHtml`, `fieldActs` |
| `06_mapa_interaccion.js` | Instancia `DeckGL`, clic en el mapa, mostrar/ocultar tarjeta, botones de zoom, encuadre y toda la ciudad | `showCard`, `hideCard`, `rerender`, `scopeView` |
| `07_leyenda_y_capas.js` | Leyenda-filtro, fila "Atiende" (alcaldías / Gobierno Central), casillas de capas | `setResp`, `setLayer` |
| `08_resumenes.js` | Estadísticas por colonia, avenida y ámbito; cifras y barras del panel | `colStat`, `avStat`, `frSumm`, `renderSummary` |
| `09_listados.js` | Pestaña "Listado": calles dentro de su colonia, avenidas, colonias, alcaldías | `buildStreets`, `buildAvenues`, `renderResults` |
| `10_seleccion.js` | Selección de alcaldía, colonia y avenida; **`refresh()`** | `refresh`, `setSel`, `pickColonia`, `pickAvenida` |
| `11_descargas.js` | CSV y Excel con diccionario de datos; carga de librerías bajo demanda | `deliverTable`, `dictAoa`, `loadLib` |
| `12_fichas_pdf.js` | Fichas PDF de colonia, alcaldía, vialidades primarias y avenida | `conPDF`, `fichaPDF` |
| `13_interfaz.js` | Ventana de ayuda (se cierra con ×, "Volver al mapa", Esc o Atrás), hoja inferior en teléfono, pestañas, acciones fijas, ruta de navegación | `openInfo`, `closeInfo`, `setSheetState`, `setTab`, `renderActions`, `renderCrumb` |
| `14_buscador.js` | Buscador único con abreviaturas y tolerancia a errores | `omniIndex`, `omniSearch`, `omniPick` |
| `15_mi_ubicacion.js` | GPS, colonia donde está la persona, tramos prioritarios cercanos, seguimiento | `locate`, `whereAmI`, `nearby`, `showLoc` |
| `16_arranque.js` | Estado inicial | — |

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

Los archivos 04 y 05 ajustan reglas de los anteriores: **el orden importa**. Para cambiar un componente, buscar su clase en todos los archivos de `css/`.

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
`flags`: bits 0–2 arbolado (1 = sin arbolado), bits 3–5 banqueta (índice en `disp`), bit 6 = a cargo de Gobierno Central.

**`vp.bin`** (tramos de vialidades primarias): `NV`, y por cada tramo: nomenclatura, nombre, tipo, carriles, circulación, texto de alcaldía, alcaldía, prioridad, longitud (m), clave, registro, número de vértices y los vértices.

Cómo se generan: `03_procesamiento_datos/LEEME.md`.

## 8. Dependencias externas

| Qué | Dónde | Nota |
|---|---|---|
| deck.gl 9.4, pako 2.1, jsPDF 2.5.2, SheetJS 0.18.5 | `docs/libs/` (sitio) · CDN (archivo único y artefacto) | Licencias en `libs/LICENCIAS.md` |
| Tipografías Cabin y Roboto | Google Fonts | Pendiente servirlas desde el sitio para el SIA |
| Enlaces "Cómo llegar" y "Street View" | Google Maps | Solo enlaces; se abren en otra pestaña |
| Geolocalización | API del navegador | Requiere HTTPS; la posición no sale del teléfono |

## 9. Cambios comunes

| Quiero… | Dónde |
|---|---|
| Cambiar un texto del panel o de la ayuda | `plantilla.html` (fijos) o el módulo que lo genera (`08_resumenes.js`, `13_interfaz.js`) |
| Cambiar un color | `css/01_variables.css` |
| Cambiar el contenido de una ficha PDF | `js/12_fichas_pdf.js` |
| Agregar una columna a un Excel | `js/11_descargas.js` (datos y diccionario van juntos) |
| Cambiar qué muestra la tarjeta de un frente | `js/05_mapa_tarjetas.js` |
| Actualizar los datos del modelo | Scripts de `03_procesamiento_datos/` → `construir.py` |
| Permitir que aparezca en buscadores | `ROBOTS = ''` en `construir.py` |

Después de cualquier cambio: `python3 02_fuente/construir.py` y `node 04_pruebas/prueba_sitio.js`.

## 10. Publicación en el SIA (resumen)

`docs/` se copia tal cual a una ruta del servidor web (p. ej. `/calles-prioritarias/`). Necesita: redirección de la ruta sin barra final a la ruta con barra, tipos MIME estándar (`.bin` como `application/octet-stream`, sin volver a comprimirlo) y caché larga para los archivos con `?v=`. La guía de instalación, la configuración de nginx y la lista de verificación forman parte del paquete de entrega pendiente.
