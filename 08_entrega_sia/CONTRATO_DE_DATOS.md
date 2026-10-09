# Contrato de datos

Formato exacto de los tres archivos de `datos/`, suficiente para escribir un lector o un generador sin ver el código. Lectores de referencia en Python, sin dependencias: `03_procesamiento_datos/verificar_datos.py` (los tres archivos) y `03_procesamiento_datos/reporte_catalogos.py`. El generador es `03_procesamiento_datos/4_generar_datos.py`.

Los archivos no llevan número de versión de formato ni fecha dentro; la versión y el corte se declaran en `construir.py` (`VERSION`, `CORTE_DATOS`) y la identidad del contenido, en `02_fuente/datos/SUMAS.json`.

## 1. Envoltura

Los tres archivos son **gzip** (firma `1f 8b`). Se sirven como `application/octet-stream`, sin `Content-Encoding`. Si llegan ya descomprimidos, la herramienta los usa igual.

| Archivo | Contenido descomprimido |
|---|---|
| `meta.bin` | **Texto JSON en UTF-8** (no una secuencia de enteros) |
| `data.bin` | Secuencia de enteros: frentes de manzana |
| `vp.bin` | Secuencia de enteros: partes de vialidad primaria |

## 2. Enteros

Cada entero es un **varint con signo en zigzag**: `z = 2·v` si `v ≥ 0`, `z = −2·v − 1` si `v < 0`; `z` se escribe en grupos de 7 bits, del menos al más significativo, con el bit alto encendido mientras queden grupos. Los valores caben en 53 bits (la herramienta los lee como números de JavaScript).

## 3. Coordenadas

Grados decimales (longitud, latitud, WGS 84) multiplicados por `Q = 100000` y redondeados: una unidad equivale a un metro, aproximadamente. En `data.bin` y `vp.bin` cada vértice se guarda como **diferencia respecto del vértice anterior del archivo**: el acumulador empieza en (0, 0) al inicio del archivo y **no se reinicia entre registros**; el primer vértice de un registro es una diferencia respecto del último del registro anterior. Cada archivo tiene su propio acumulador.

## 4. `data.bin` · frentes de manzana

`N`, y después `N` registros. El número de orden del registro (desde 0) es el identificador del frente; es estable solo mientras no se regeneren los datos.

| # | Campo | Valores |
|---|---|---|
| 1 | Alcaldía | Índice en `meta.muns` (0 a 15) |
| 2 | Prioridad | 0 Muy Baja, 1 Baja, 2 Media, 3 Alta, 4 Muy Alta |
| 3 | Nombre de calle | Índice en `meta.names` |
| 4 | Tipo de vialidad | Índice en `meta.tipos` |
| 5 | Colonia | Índice en `meta.colonias`; 0 = sin colonia identificada |
| 6 | Longitud | Metros enteros (máximo observado: 3,759) |
| 7 | Banderas | Bits 0–2: arbolado. Bits 3–5: banqueta, índice en `meta.disp`. Bit 6: 1 = a cargo del Gobierno Central. Bit 7: libre |
| 8 | Vialidad primaria | 0 = ninguna; `k + 1` = parte `k` de `vp.bin`. Solo distinto de 0 si el bit 6 está encendido |
| 9 | Número de vértices `nv` | ≥ 2 |
| 10 | `nv` pares (Δlongitud, Δlatitud) | Ver sección 3 |

**Arbolado (bits 0–2).** La herramienta solo usa el valor 1, «sin arbolado». Los valores presentes son 0 (160,694 frentes), 1 (130,119), 2 (62,747), 3 (12,429) y 4 (6,545). Los conteos de 2, 3 y 4 son idénticos a los de banqueta «Conjunto habitacional», «No aplica» y «No especificado», porque ambos campos usan el mismo catálogo de INEGI. **Confirmado el 5 oct 2026** con la capa del modelo (`ARBOLES_D` y `BANQUETA_D`, códigos 1 Dispone, 3 No dispone, 7, 8, 9): los conteos de cada código son idénticos. Ver `05_documentacion/capas_geograficas.md`. 81,721 frentes (21.9 %) no tienen dato de arbolado ni de banqueta.

## 5. `vp.bin` · partes de vialidad primaria

`NV`, y después `NV` registros. Una parte es un trazo continuo de un registro de la capa de origen.

| # | Campo | Valores |
|---|---|---|
| 1 | Nomenclatura | Índice en `meta.vp.nomenclat` |
| 2 | Nombre de la red vial | Índice en `meta.vp.nombres` |
| 3 | Tipo | Índice en `meta.vp.tipos` |
| 4 | Carriles | Entero |
| 5 | Circulación | Índice en `meta.vp.circula` |
| 6 | Texto de alcaldía de la capa | Índice en `meta.vp.alctxt` (puede nombrar dos alcaldías) |
| 7 | Alcaldía asignada | Índice en `meta.muns`; es la del vértice central de la parte |
| 8 | Prioridad | 0 a 4 |
| 9 | Longitud | Metros enteros, sobre el eje |
| 10 | Clave | Índice en `meta.vp.claves` |
| 11 | Registro de origen | Número del registro de la capa; varias partes pueden compartirlo |
| 12 | Número de vértices `nv` | |
| 13 | `nv` pares (Δlongitud, Δlatitud) | |

## 6. `meta.bin` · catálogos y resúmenes (JSON)

| Clave | Contenido |
|---|---|
| `Q` | 100000 |
| `N` | Número de frentes; debe coincidir con `data.bin` |
| `muns`, `munNames` | Claves («002» a «017») y nombres de las 16 alcaldías, en el mismo orden |
| `prio`, `disp`, `tipos`, `names` | Textos de prioridad, banqueta, tipo de vialidad y nombres de calle |
| `colonias` | Lista. **El elemento 0 es un marcador de «sin colonia»** (todo vacío, `p: -1`). Cada colonia: `n` nombre, `cp` código postal (puede venir con cuatro dígitos), `m` clave de alcaldía, `p` prioridad de la colonia (0 a 4, −1 sin dato), `pob` población, `ids` estrato de desarrollo social, `nbi` población en pobreza, `ut` y `utpob` unidad territorial y su población, `gm` grado de marginación (**no lo usa la herramienta**) |
| `alc` | Polígonos de alcaldías: `cve`, `nom`, `rings` |
| `cols` | Polígonos de colonias: `i` (índice en `colonias`), `rings` |
| `bounds` | Por clave de alcaldía: `[oeste, sur, este, norte]` en grados |
| `ambito` | Ámbitos de INEGI incluidos |
| `summ`, `city` | Frentes a cargo de las alcaldías: por alcaldía y de la ciudad |
| `summ_gc`, `city_gc` | Frentes a cargo del Gobierno Central |
| `summ_all`, `city_all` | Resumen original del modelo, antes del cruce. **No lo usa la herramienta**; difiere de la suma de frentes en décimas de kilómetro por redondeo |
| `vp` | `nomenclat`, `nombres`, `circula`, `alctxt`, `claves`, `tipos` (catálogos); `summ`, `city` (resúmenes); `cov` (cobertura del cruce); `n` (número de partes, debe coincidir con `vp.bin`) |
| `cruce` | `frentes_gc`, `km_gc`, `km_gc_prio` y `regla` (texto de la regla aplicada) |

**Polígonos (`rings`).** Lista de anillos; cada anillo, lista de pares `[longitud·Q, latitud·Q]` en enteros **absolutos** (no diferencias), cerrado (el último punto repite el primero). Están simplificados: sirven para dibujar y para ubicar un punto, no para medir.

**Resúmenes.** Cada uno es `{n: [5], km: [5]}` por clase de prioridad (algunos traen además `km_sinarb`). Son una **segunda copia** de lo que dicen los registros. La herramienta recalcula los kilómetros desde los frentes al cargar; los conteos sí se leen de aquí.

## 7. Reglas que deben respetarse al sustituir datos

1. **Nunca editar un archivo a mano ni sustituir uno solo.** Los tres se generan juntos con el paso 4; los resúmenes de `meta.bin` deben corresponder a los registros.
2. Después de generar: `python3 03_procesamiento_datos/verificar_datos.py --actualizar`, `python3 02_fuente/construir.py` y `node 04_pruebas/correr_todas.js`. `construir.py` se niega a construir con datos distintos de los registrados.
3. Los catálogos se referencian **por posición**: insertar un elemento en medio de `names`, `colonias` o `vp.nomenclat` cambia el significado de todos los registros.
4. El número de clases de prioridad (5) y el umbral «prioritario» (≥ 2: Muy Alta, Alta y Media) están en `02_fuente/js/01_utilidades.js` (`PRIO_MIN`). `meta.bin` trae `cruce.km_gc_prio` calculado con umbral ≥ 3 (solo Muy Alta y Alta); la herramienta no lo usa y se corrige al regenerar los datos. Cambiar el número de clases exige revisar la leyenda, las fichas y los Excel.

## 8. Si el SIA quiere servir estos datos desde su base

El formato es de entrega, no de servicio: la herramienta carga los tres archivos completos y calcula en memoria. Como GeoJSON, los 372,534 frentes pesarían del orden de cien megabytes. La vía recomendada es que la base de datos del SIA sea el **origen** de un proceso por lotes que regenere estos tres archivos y los verifique, no sustituirlos por consultas en vivo.

## 9. Limitaciones conocidas de los datos

Identificadas en la revisión de los datos y **sin corregir**, porque se corrigen en las capas de origen: polígonos de colonias con traslapes; 138 grupos de partes de vialidad con geometría duplicada (unos 21 km); 48 partes y 2 frentes con longitud 0; tramos limítrofes asignados completos a una alcaldía; catálogos con homónimos y formatos anómalos (`06_entregables/Catalogos_para_homologacion_SIA.xlsx`).
