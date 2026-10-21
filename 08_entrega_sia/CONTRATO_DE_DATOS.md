# Contrato de datos

Formato exacto de los tres archivos de `datos/` (secciones 1 a 6) y de los del inventario de arbolado en `datos/inventario/` (sección 6 bis), suficiente para escribir un lector o un generador sin ver el código. Lectores de referencia en Python, sin dependencias: `03_procesamiento_datos/verificar_datos.py` (todos) y `03_procesamiento_datos/reporte_catalogos.py`. Los generadores son `03_procesamiento_datos/4_generar_datos.py` (los tres de `datos/`) y `03_procesamiento_datos/9_inventario_espacios.py` (los del inventario).

Los tres archivos de `datos/` no llevan número de versión de formato ni fecha dentro (los del inventario sí traen su número de formato: sección 6 bis); la versión y el corte se declaran en `construir.py` (`VERSION`, `CORTE_DATOS`) y la identidad del contenido, en `02_fuente/datos/SUMAS.json`.

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

## 6 bis. `datos/inventario/` · espacios para plantar (inventario de arbolado)

Cepas vacantes, tocones y árboles muertos del inventario de arbolado urbano del CIGA-UNAM y SEDEMA, **en curso** (corte en `config.js`, `window.SIA_INVENTARIO.corte`). Los árboles vivos no se publican. La capa no interviene en ninguna cifra del modelo: es una capa de oportunidad encima de él. Los genera `03_procesamiento_datos/9_inventario_espacios.py` y dependen de `data.bin` y `vp.bin`: si cambian los frentes o las vialidades hay que volver a generarlos (la construcción se detiene si no coinciden).

| Archivo | Contenido | Formato vigente |
|---|---|---|
| `inv_<cve>.bin` | Un archivo por alcaldía (`<cve>` = clave INEGI de 3 dígitos, «002» a «017», como en `meta.muns`): sus puntos | 2 |
| `espacios_frentes.bin` | Cuántos puntos de cada tipo tiene asignados cada frente de `data.bin` | 2 |
| `espacios_vp.bin` | Cuántos puntos de cada tipo cuentan para cada parte de `vp.bin` | 1 |

**Lo que comparten con la sección 1 y la 2, y lo que no.** La envoltura es la misma (gzip; si llegan descomprimidos, se usan igual) y los enteros también (varint con signo en zigzag, sección 2). Pero **no** son como `data.bin`:

1. **Encabezado.** Cada archivo empieza con dos enteros: `formato` y `n` (número de registros). Un lector debe rechazar un `formato` que no conozca: el formato 1 de `inv_<cve>.bin` (hasta la v1.23) traía 7 enteros por punto, no 8, y se leería corrido.
2. **Escala de las coordenadas: `ESCALA = 200000`** (no `Q = 100000`): grados decimales WGS 84 multiplicados por 200,000 y redondeados al entero; una unidad equivale a unos 0.55 m. Va también en `RESUMEN.json` (`escala`).
3. **Varios campos van en diferencias** con su propio acumulador, no solo las coordenadas (ver «Dif.» en las tablas). Todos los acumuladores empiezan en 0 al inicio de cada archivo (salvo el índice de `espacios_*.bin`, que empieza en −1) y no se reinician entre registros. Valor del registro = acumulador + entero leído; ese valor pasa a ser el acumulador.
4. Después del último registro **no sobra ningún byte**: si sobran o faltan, el archivo está dañado.

### `inv_<cve>.bin` (formato 2)

`formato` (= 2), `n` (número de puntos) y después `n` registros de **8 enteros**, en este orden:

| # | Campo | Dif. | Valor ya acumulado |
|---|---|---|---|
| 1 | `x` | Sí | Longitud × 200,000. Longitud en grados = `x / 200000` (negativa en la CDMX: −99.4 a −98.9) |
| 2 | `y` | Sí | Latitud × 200,000. Latitud = `y / 200000` (19.0 a 19.65) |
| 3 | `tipo` | No | 0 cepa vacante, 1 tocón, 2 árbol muerto |
| 4 | `fr` | Sí | Frente de manzana asignado + 1: el número de orden del frente en `data.bin` (sección 4) más 1. 0 = sin frente a 20 m o menos |
| 5 | `pre` | Sí | Las tres letras de la clave del inventario como número en base 26, con A = 0: `pre = 676·L1 + 26·L2 + L3` |
| 6 | `uga` | Sí | El número de en medio de la clave (unidad de gestión ambiental) |
| 7 | `num` | Sí | El consecutivo de la clave |
| 8 | `vp` | **No** | Parte de vialidad primaria + 1 (número de orden en `vp.bin` más 1) si el punto es **del camellón**: quedó sin frente (`fr` = 0) y el eje de esa parte está a 25 m o menos. 0 en los demás puntos (siempre 0 si `fr` > 0) |

- **Orden de los puntos:** dentro de cada archivo, por clave del inventario, de menor a mayor (`pre`, luego `uga`, luego `num`). Por eso `pre`, `uga` y `num` en diferencias suelen ser números chicos; las diferencias de `uga` y `num` pueden ser negativas.
- **Clave como texto** (forma `AAA-000-0000`, como la muestra la herramienta): letras `chr(65 + pre // 676)`, `chr(65 + (pre // 26) % 26)`, `chr(65 + pre % 26)`; `uga` con 3 dígitos y `num` con al menos 4, rellenando con ceros a la izquierda. La clave es única en toda la ciudad (el generador toma una sola vez una clave repetida).
- **Alcaldía de un punto:** la del archivo, que es la del polígono de `meta.alc` que contiene el punto (o el más cercano, si no cae en ninguno); puede no coincidir con la columna de alcaldía del inventario. Los polígonos están simplificados: unos 4,200 puntos (6.7 %) no caen en ninguno y unos cuantos, en el límite, caen en dos; un lector no debe recalcular la alcaldía, sino tomar la del archivo. Por eso `RESUMEN.json` cuenta los registros del inventario por su columna de alcaldía (`registros`, el avance) y los puntos por archivo (`puntos`).
- **Ejemplo** (primeros enteros de `inv_002.bin`, ya decodificados del zigzag; los de los registros, todavía en diferencias): `2, 4227, -19835704, 3891788, 0, 56349, 652, 1, 494, 0, …` se lee formato 2, 4,227 puntos y el primero en `x = −19835704` (longitud −99.17852), `y = 3891788` (latitud 19.45894), tipo 0 (cepa vacante), frente 56,348, `pre` 652 («AZC»), `uga` 1, `num` 494, sin camellón: clave «AZC-001-0494».

### `espacios_frentes.bin` (formato 2)

`formato` (= 2), `n` (frentes con al menos un punto) y después `n` registros de 4 enteros, en orden creciente de frente:

| # | Campo | Dif. | Valor ya acumulado |
|---|---|---|---|
| 1 | `f` | Sí, desde **−1** | Número de orden del frente en `data.bin` (0 a `N` − 1). El primer entero es `f + 1`; los siguientes, al menos 1 |
| 2 | `cv` | No | Cepas vacantes asignadas a ese frente |
| 3 | `to` | No | Tocones |
| 4 | `am` | No | Árboles muertos |

Al menos uno de `cv`, `to`, `am` es mayor que 0. Los frentes que no aparecen tienen 0 de cada tipo. Es la suma, por frente, de los puntos de los `inv_<cve>.bin` con ese `fr`. Lo usan el filtro «Espacio», el orden por cepas de «Dónde empezar» y, desde la v1.25, las columnas `cepas_vacantes`, `tocones` y `arboles_muertos` de los Excel, el GeoJSON y el KML. (El formato 1, hasta la v1.22, traía solo los tipos en bits.)

### `espacios_vp.bin` (formato 1)

Igual que `espacios_frentes.bin`, por parte de vialidad primaria: `formato` (= 1), `n` (partes con al menos un punto) y `n` registros `dvp, cv, to, am`, con `dvp` en diferencias desde −1 (número de orden en `vp.bin`). Un punto cuenta para una parte **por su frente** (su `fr` es un frente a cargo del Gobierno Central, bit 6 de las banderas, cuya vialidad primaria, campo 8 de `data.bin`, es esa parte) o **por el camellón** (`fr` = 0 y su campo `vp` es esa parte + 1). Los puntos de frentes de las alcaldías no cuentan para ninguna parte, ni los de un frente del Gobierno Central sin vialidad enlazada (campo 8 = 0; hoy no hay ninguno: `RESUMEN.json`, `puntos_gc_sin_parte`).

### Cifras de control

Un lector (o un generador) está bien si reproduce estas cifras. En el repositorio están en `02_fuente/datos/inventario/RESUMEN.json` (con la huella de cada archivo en `SUMAS.json`); en el sitio publicado, en `config.js` (`window.SIA_INVENTARIO`), que no trae `RESUMEN.json`.

| Qué | `RESUMEN.json` | `config.js` (`SIA_INVENTARIO`) |
|---|---|---|
| Formato y escala de `inv_<cve>.bin` | `formato`, `escala` | — |
| Puntos de cada tipo en cada `inv_<cve>.bin` | `por_alcaldia.<cve>.puntos` | `n.<cve>` |
| Puntos sin frente (`fr` = 0) en cada archivo | `por_alcaldia.<cve>.sin_frente` | — |
| Puntos de cada tipo en toda la ciudad | `puntos_por_tipo` | suma de `n` |
| Puntos sin frente en toda la ciudad | `sin_frente` | — |
| `espacios_frentes.bin`: formato, `n`, frentes con cada tipo, puntos de cada tipo | `frentes_con_espacio`: `formato`, `frentes`, `por_tipo`, `puntos_por_tipo` | `fr`: `formato`, `n`, `tipos`, `puntos` |
| `espacios_vp.bin`: lo mismo por parte | `vialidades_con_espacio`: `formato`, `partes`, `por_tipo`, `puntos_por_tipo` | `vp`: `formato`, `n`, `tipos`, `puntos` |
| Puntos del camellón de cada tipo (`fr` = 0 y `vp` > 0) y su suma | `vialidades_con_espacio.puntos_camellon` y `sin_frente_recuperados` (la suma) | — |
| Puntos sin frente ni camellón (no cuentan para nadie) | `sin_frente` − `vialidades_con_espacio.sin_frente_recuperados` | `sinc` |

**Para un generador.** Comprimir con gzip nivel 9 y la fecha interna del gzip en 0, para que el mismo contenido dé siempre los mismos bytes y la misma huella (`SUMAS.json`; `construir.py` las compara). Redondear las coordenadas al entero más cercano antes de restar, nunca restar grados y luego redondear: así el error no se acumula a lo largo del archivo.

### Pendiente: cuando el inventario de arbolado esté terminado

Hoy el inventario está en curso y este proyecto lleva su propia copia procesada (los archivos de arriba), generada desde el CSV que también usa «Guardianes de árboles». **Cuando el CIGA-UNAM y SEDEMA entreguen el inventario completo**, la propuesta para el SIA es:

1. Cargarlo **una sola vez** en PostGIS del SIA, en un esquema compartido entre proyectos (como `territorio`), y publicarlo en su GeoServer.
2. Que cada proyecto que lo usa (este y «Guardianes de árboles») lo **tome de ahí al construir el sitio** (por WFS o GeoPackage), no en vivo: así la herramienta sigue rápida, funciona sin conexión y no depende de que el GeoServer responda en cada consulta.
3. Cuidar la cuota de 2 GiB de GeoWebCache y la carga del servidor si alguna capa se sirve en vivo (por ejemplo, el millón de árboles vivos a zoom alto).

Mientras tanto, nada cambia: el script `03_procesamiento_datos/9_inventario_espacios.py` lee el CSV local. Cuando el SIA lo tenga publicado, solo cambia de dónde lo lee el script; el formato de estos archivos se queda igual.

## 7. Reglas que deben respetarse al sustituir datos

1. **Nunca editar un archivo a mano ni sustituir uno solo.** Los tres se generan juntos con el paso 4; los resúmenes de `meta.bin` deben corresponder a los registros.
2. Después de generar (en el repositorio): `python 03_procesamiento_datos/verificar_datos.py --actualizar`, `python 02_fuente/construir.py` y `node 04_pruebas/correr_todas.js`. En un equipo Linux donde Python se llame `python3`, usar ese nombre. Si cambió `data.bin` o `vp.bin`, antes de verificar hay que volver a correr `python 03_procesamiento_datos/9_inventario_espacios.py` (sección 6 bis). `construir.py` se niega a construir con datos distintos de los registrados.
3. Los catálogos se referencian **por posición**: insertar un elemento en medio de `names`, `colonias` o `vp.nomenclat` cambia el significado de todos los registros.
4. El número de clases de prioridad (5) y el umbral «prioritario» (≥ 2: Muy Alta, Alta y Media) están en `02_fuente/js/01_utilidades.js` (`PRIO_MIN`). `meta.bin` trae `cruce.km_gc_prio` calculado con umbral ≥ 3 (solo Muy Alta y Alta); la herramienta no lo usa y se corrige al regenerar los datos. Cambiar el número de clases exige revisar la leyenda, las fichas y los Excel.

## 8. Si el SIA quiere servir estos datos desde su base

El formato es de entrega, no de servicio: la herramienta carga los tres archivos completos y calcula en memoria. Como GeoJSON, los 372,534 frentes pesarían del orden de cien megabytes. La vía recomendada es que la base de datos del SIA sea el **origen** de un proceso por lotes que regenere estos tres archivos y los verifique, no sustituirlos por consultas en vivo.

## 9. Limitaciones conocidas de los datos

Identificadas en la revisión de los datos y **sin corregir**, porque se corrigen en las capas de origen: polígonos de colonias con traslapes; 138 grupos de partes de vialidad con geometría duplicada (unos 21 km); 48 partes y 2 frentes con longitud 0; tramos limítrofes asignados completos a una alcaldía; catálogos con homónimos y formatos anómalos (`06_entregables/Catalogos_para_homologacion_SIA.xlsx`).
