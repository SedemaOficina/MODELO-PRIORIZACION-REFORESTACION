# Procesamiento de datos

Scripts que producen los datos de la herramienta (`02_fuente/datos/meta.bin`, `data.bin` y `vp.bin`). Solo se vuelven a correr si cambian los insumos: nuevo modelo de priorización, nueva capa de vialidades primarias o nuevo índice social. El formato de los archivos está descrito en `ARQUITECTURA.md`, sección 7.

Requieren Python 3 con las dependencias de `requirements.txt` (`pip install -r 03_procesamiento_datos/requirements.txt`): `numpy`, `pyshp`, `shapely` 2 y `pyproj` para los pasos 1 a 4, `Pillow` para la lámina y `openpyxl` para las listas de catálogos. `verificar_datos.py` solo requiere Python 3.

## Carpetas

| Carpeta | Contenido | ¿En el repositorio? |
|---|---|---|
| `insumos/IDS_ut/` | Índice de Desarrollo Social por unidad territorial (EVALÚA CDMX), con su diccionario | Sí |
| `insumos/VP_REFORESTACION/` | Capa de vialidades primarias priorizadas para reforestación (SEDEMA, agosto de 2026): `PRIMARIAS_REFORESTACION.shp` y sus archivos | No (copia local; huellas en `SUMAS_INSUMOS.md`) |
| `insumos/originales/` | Los insumos tal como se recibieron: `shp_frentes_manzanasv.rar` (modelo de priorización, nov. 2025, origen de las prioridades) y `VP_REFORESTACION.rar` (vialidades primarias). Huellas y comprobación en `SUMAS_INSUMOS.md` | No: copia local |
| `insumos/slide_orig.jpg` | Lámina original de composición de frentes (solo para `lamina_composicion.py`) | No |
| `intermedios/` | Resultados de cada paso: `frentes.npz`, `meta.json`, `cruce.npz` | Sí: permiten regenerar los datos sin repetir los pasos 1 y 2 |

## Pasos, en orden

| # | Script | Lee | Escribe |
|---|---|---|---|
| 1 | `1_decodificar_frentes.py` | Frentes priorizados y catálogos de la versión 6 de la herramienta (`07_versiones/calles_prioritarias_v6_original.html`, solo en la copia local) | `intermedios/frentes.npz` e `intermedios/meta_v6.json` (catálogos, polígonos y resúmenes; no se guarda en el repositorio) |
| 2 | `2_unir_ids.py` | `intermedios/meta_v6.json` (o, si no está, el `meta.json` guardado) e `insumos/IDS_ut/` | `intermedios/meta.json`: el catálogo con IDS, población y pobreza por colonia |
| 3 | `3_cruzar_vialidades_primarias.py` | `intermedios/frentes.npz`, `intermedios/meta.json` e `insumos/VP_REFORESTACION/` | `intermedios/cruce.npz`: qué frentes quedan sobre una vialidad primaria (Gobierno Central) |
| 4 | `4_generar_datos.py` | Los tres intermedios e `insumos/VP_REFORESTACION/` | `02_fuente/datos/meta.bin`, `data.bin` y `vp.bin` |
| 5 | `5_exportar_geoserver.py` | `02_fuente/datos/*.bin`, `insumos/originales/shp_frentes_manzanasv.rar` (se extrae con `tar`) e `insumos/VP_REFORESTACION/` | `08_entrega_sia/capas_geoserver/*.gpkg`: frentes (geometría original del modelo + prioridad, banqueta, responsable, colonia, `clave_frente` = CVEGEO_CVEFT), vialidades primarias y colonias, para publicar en GeoServer como capas nuevas. Comprueba que los 372,534 frentes empaten con la misma prioridad. Requiere `pyogrio`. Ver `08_entrega_sia/capas_geoserver/LEEME.md` |
| 6 | `6_fondo.py` | `insumos/fondo/` (manzanas del Catastro de la CDMX, Inventario de Áreas Verdes 2017, cuerpos de agua y ANP y AVA oficiales) y `intermedios/meta.json` (alcaldías) | `02_fuente/datos/fondo/`: fondo propio del mapa (opción «Calles»), con manzanas por alcaldía, parques y jardines, agua, ANP y AVA, y su `SUMAS.json`. Independiente de los pasos 1 a 5 |
| 7 | `7_nombres_colonias.py` | `intermedios/meta.json` | `02_fuente/datos/nombres_colonias.json` (nombre para mostrar de las colonias que cambian: acentos, abreviaturas, siglas, ordinales y romanos; correcciones a mano en `CORRECCIONES`) y `_local/revision_nombres_colonias.csv` (lista para revisar). La herramienta, los Excel (`colonia_catalogo`) y la capa de GeoServer conservan el nombre del catálogo |
| 8 | `8_asignar_sin_colonia.py` | `02_fuente/datos/data.bin`, `meta.bin` y `nombres_colonias.json` | Frentes de alcaldía sin colonia a ≤ 30 m de una colonia de su alcaldía pasan a la más cercana. Cambia solo ese campo de `data.bin` (no regenera los pasos 1 a 4); lista en `_local/asignacion_sin_colonia.csv`. Después: `verificar_datos.py --actualizar`, construir y, para GeoServer, el paso 5 |
| 9 | `9_inventario_espacios.py` | El CSV del inventario de arbolado (CIGA-UNAM y SEDEMA; ruta en `INVENTARIO_ARBOLADO_CSV`, por omisión `../adopta-un-arbol/00_insumos/arbolado/arbolado_cdmx_sep.csv`, solo lectura) y `02_fuente/datos/data.bin` y `meta.bin` | `02_fuente/datos/inventario/`: espacios para plantar (cepas vacantes, tocones y árboles muertos; los árboles vivos solo cuentan para el avance) en un archivo por alcaldía (formato 2 desde la v1.24), cada punto con el frente de manzana más cercano a 20 m o menos (índice espacial) y, si quedó sin frente, la parte de vialidad primaria cuyo eje esté a 25 m o menos (camellón); `espacios_frentes.bin`, los puntos de cada tipo de cada frente para el filtro «Espacio» de la herramienta; `espacios_vp.bin` (v1.24), los puntos de cada tipo de cada parte de vialidad primaria del Gobierno Central (los de sus frentes a cargo del Gobierno Central y los del camellón; los de los frentes de las alcaldías no cuentan); `SUMAS.json` y `RESUMEN.json` (corte, cifras de control, avance por alcaldía, distancias, la huella de `data.bin` y de `vp.bin` con que se asignó, los frentes y las partes de vialidad con cada tipo y cuántos puntos sin frente se recuperaron por el camellón). Capa de oportunidad: no cambia ningún dato del modelo. Imprime el reporte por tipo y alcaldía, y el de las vialidades primarias (por su frente y en el camellón, por tipo de vía y las avenidas con más cepas vacantes). Requiere `numpy` y `shapely` |
| — | `lamina_composicion.py` | `insumos/slide_orig.jpg` | `06_entregables/composicion_frentes_manzana*.png` |
| — | `reporte_catalogos.py` | `02_fuente/datos/*.bin` (los datos publicados) | `06_entregables/Catalogos_para_homologacion_SIA.xlsx`: listas de colonias y calles para homologar en la fuente. No modifica ningún catálogo. Requiere `openpyxl` |

Después del paso 4, en este orden:

```
python3 03_procesamiento_datos/verificar_datos.py --actualizar    registra las sumas de los datos nuevos
python3 02_fuente/construir.py
node 04_pruebas/correr_todas.js
```

**Reproducibilidad (comprobada el 5 oct 2026):** los pasos 1 y 2, corridos desde la versión 6 en una copia aparte con las versiones de `requirements.txt`, dan `frentes.npz` y `meta.json` idénticos a los guardados.

## Verificación de los datos

`verificar_datos.py` comprueba que los datos sean los registrados en `02_fuente/datos/SUMAS.json` y que cuadren entre sí: número de frentes y de partes de vialidad, que cada frente de Gobierno Central enlace a una parte existente y que los kilómetros por prioridad de los frentes coincidan con los resúmenes. Compara el **contenido descomprimido**, porque la compresión gzip depende del equipo: recomprimir los mismos datos en otro equipo cambia los bytes del archivo sin que los datos cambien. `construir.py` hace la misma comparación y se detiene si no coincide.

## Comprobaciones dentro de la cadena

- El paso 3 guarda en `cruce.npz` el número de partes de la capa con la que hizo el cruce (`nvp`).
- El paso 4 se detiene sin generar nada si el cruce enlaza a una parte que la capa no tiene, si la capa tiene otro número de partes que la del cruce, si la capa no está en UTM zona 14 norte (lee su `.prj`) o si los kilómetros de los frentes no cuadran con el resumen del modelo.
- Estas comprobaciones se corrieron con la capa en una copia aparte (5 oct 2026) y pasaron. El resultado coincide con los datos publicados salvo 144 enlaces de frente a parte contigua de la capa (empates de distancia; ver `SUMAS_INSUMOS.md`).

## Insumos que no están en el repositorio

| Insumo | Para qué | Estado |
|---|---|---|
| `insumos/VP_REFORESTACION/PRIMARIAS_REFORESTACION.shp` y sus archivos | Pasos 3 y 4 | Copia local. Falta entregarla al SIA |
| `insumos/originales/shp_frentes_manzanasv.rar` | Origen del modelo (la v6 se armó a partir de él) | Copia local |
| `insumos/fondo/` (Catastro, áreas verdes, agua, ANP y AVA) | Paso 6 (fondo «Calles») | Copia local, tomada de `adopta-un-arbol/00_insumos/` (12 oct 2026); sumas en `SUMAS_INSUMOS.md` |
| Inventario de arbolado (`arbolado_cdmx_sep.csv`, 350 MB) | Paso 9 (espacios para plantar) | No se copia: se lee de la carpeta hermana `adopta-un-arbol` o de `INVENTARIO_ARBOLADO_CSV`; su suma queda en `02_fuente/datos/inventario/RESUMEN.json` |
| `insumos/slide_orig.jpg` | Solo `lamina_composicion.py` | **No se encontró** en la copia local. No es crítico: sus resultados ya están en `06_entregables/composicion_frentes_manzana*.png` |
| `07_versiones/calles_prioritarias_v6_original.html` | Paso 1 (origen de los frentes priorizados) | Solo en la copia local; su suma está en `SUMAS_INSUMOS.md` |
| Modelo de priorización de frentes (SIA, nov. 2025) | Origen de la prioridad de cada frente | No se tiene; depende del SIA |

Para que el SIA pueda regenerar los datos, estos insumos se entregan por canal institucional con su suma de verificación (`SUMAS_INSUMOS.md`).

Verificado el 25 sep 2026 en la copia local: los pasos 3 y 4 reproducen exactamente los datos publicados. Un tercero no puede repetir esa verificación solo con el repositorio, porque el paso 1 lee un archivo de `07_versiones/` y los pasos 3 y 4 la capa `insumos/VP_REFORESTACION/`, que no se publican. Los archivos se comprimen sin fecha, así que volver a correrlos sin cambios no genera diferencias en Git.

## Regla del cruce con vialidades primarias

Un frente pasa a Gobierno Central si corre paralelo (30° o menos) a una vialidad primaria a 18 m o menos, o a 60 m o menos cuando además coincide el nombre de la calle. Pendiente de validación con la Secretaría.

## Espacios para plantar: actualizar el inventario de arbolado

El inventario está en curso. Cuando llegue una entrega nueva (o la final):

**Al terminar el inventario, antes de actualizar:** proponer al SIA tenerlo en un solo lugar (PostGIS y GeoServer del SIA) y que cada proyecto lo tome de ahí al construir, en lugar de copiarlo en cada uno. Está explicado en `08_entrega_sia/CONTRATO_DE_DATOS.md` (sección 6 bis, «Pendiente: cuando el inventario de arbolado esté terminado»). Si el SIA todavía no lo tiene publicado, se actualiza como sigue.

1. Reemplazar el CSV con el mismo nombre en `adopta-un-arbol/00_insumos/arbolado/`, o indicar su ruta: `set INVENTARIO_ARBOLADO_CSV=C:
utalrchivo.csv` (PowerShell: `$env:INVENTARIO_ARBOLADO_CSV = "…"`).
2. Indicar el corte nuevo, que se muestra en la herramienta: `INVENTARIO_CORTE` (por ejemplo `diciembre de 2026`); si no se da, queda `septiembre de 2026` (constante `CORTE` del script).
3. `python 03_procesamiento_datos/9_inventario_espacios.py` (unos 15 s): imprime puntos por tipo y por alcaldía, los que quedaron sin frente a 20 m y la distancia típica, y reescribe `02_fuente/datos/inventario/`.
4. `python 03_procesamiento_datos/verificar_datos.py`, `python 02_fuente/construir.py` y `node 04_pruebas/correr_todas.js` (la prueba `prueba_inventario_espacios.js` recuenta desde el CSV si está en el equipo).

Si el script se detiene, dice por qué: falta el CSV, una alcaldía o un tipo de registro desconocido, una clave que no tiene la forma `AAA-000-0000` o un punto fuera de la ciudad. Si cambian los frentes (`data.bin`), `verificar_datos.py` y `construir.py` piden volver a correr este paso, porque cada punto guarda el índice de su frente.

