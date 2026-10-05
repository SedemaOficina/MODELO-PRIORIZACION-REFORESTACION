# Procesamiento de datos

Scripts que producen los datos de la herramienta (`02_fuente/datos/meta.bin`, `data.bin` y `vp.bin`). Solo se vuelven a correr si cambian los insumos: nuevo modelo de priorización, nueva capa de vialidades primarias o nuevo índice social. El formato de los archivos está descrito en `ARQUITECTURA.md`, sección 7.

Requieren Python 3 con las dependencias de `requirements.txt` (`pip install -r 03_procesamiento_datos/requirements.txt`): `numpy`, `pyshp`, `shapely` 2 y `pyproj` para los pasos 1 a 4, `Pillow` para la lámina y `openpyxl` para las listas de catálogos. `verificar_datos.py` solo requiere Python 3.

## Carpetas

| Carpeta | Contenido | ¿En el repositorio? |
|---|---|---|
| `insumos/IDS_ut/` | Índice de Desarrollo Social por unidad territorial (EVALÚA CDMX), con su diccionario | Sí |
| `insumos/VP_REFORESTACION/` | Capa de vialidades primarias priorizadas para reforestación (SEDEMA, agosto de 2026): `PRIMARIAS_REFORESTACION.shp` y sus archivos | No: colocarla aquí antes de correr los pasos 3 y 4 |
| `insumos/slide_orig.jpg` | Lámina original de composición de frentes (solo para `lamina_composicion.py`) | No |
| `intermedios/` | Resultados de cada paso: `frentes.npz`, `meta.json`, `cruce.npz` | Sí: permiten regenerar los datos sin repetir los pasos 1 y 2 |

## Pasos, en orden

| # | Script | Lee | Escribe |
|---|---|---|---|
| 1 | `1_decodificar_frentes.py` | Frentes priorizados y catálogos de la versión 6 de la herramienta (`07_versiones/calles_prioritarias_v6_original.html`, solo en la copia local) | `intermedios/frentes.npz` e `intermedios/meta_v6.json` (catálogos, polígonos y resúmenes; no se guarda en el repositorio) |
| 2 | `2_unir_ids.py` | `intermedios/meta_v6.json` (o, si no está, el `meta.json` guardado) e `insumos/IDS_ut/` | `intermedios/meta.json`: el catálogo con IDS, población y pobreza por colonia |
| 3 | `3_cruzar_vialidades_primarias.py` | `intermedios/frentes.npz`, `intermedios/meta.json` e `insumos/VP_REFORESTACION/` | `intermedios/cruce.npz`: qué frentes quedan sobre una vialidad primaria (Gobierno Central) |
| 4 | `4_generar_datos.py` | Los tres intermedios e `insumos/VP_REFORESTACION/` | `02_fuente/datos/meta.bin`, `data.bin` y `vp.bin` |
| — | `lamina_composicion.py` | `insumos/slide_orig.jpg` | `06_entregables/composicion_frentes_manzana*.png` |
| — | `reporte_catalogos.py` | `02_fuente/datos/*.bin` (los datos publicados) | `06_entregables/Catalogos_para_homologacion_SIA.xlsx`: listas de colonias y calles para homologar en la fuente. No modifica ningún catálogo. Requiere `openpyxl` |

Después del paso 4, en este orden:

```
python3 03_procesamiento_datos/verificar_datos.py --actualizar    registra las sumas de los datos nuevos
python3 02_fuente/construir.py
node 04_pruebas/correr_todas.js
```

**Reproducibilidad (5 oct 2026, v17.33):** los pasos 1 y 2 se volvieron a correr desde la v6 en una copia aparte, con las versiones de `requirements.txt`, y dieron `frentes.npz` y `meta.json` idénticos a los guardados. Hasta la v17.32 ningún paso extraía el catálogo de la v6: `meta.json` solo existía como intermedio guardado y el paso 2 lo sobrescribía con su propia salida.

## Verificación de los datos

`verificar_datos.py` comprueba que los datos sean los registrados en `02_fuente/datos/SUMAS.json` y que cuadren entre sí: número de frentes y de partes de vialidad, que cada frente de Gobierno Central enlace a una parte existente y que los kilómetros por prioridad de los frentes coincidan con los resúmenes. Compara el **contenido descomprimido**, porque la compresión gzip depende del equipo: recomprimir los mismos datos en otro equipo cambia los bytes del archivo sin que los datos cambien. `construir.py` hace la misma comparación y se detiene si no coincide.

## Comprobaciones dentro de la cadena

- El paso 3 guarda en `cruce.npz` el número de partes de la capa con la que hizo el cruce (`nvp`).
- El paso 4 se detiene sin generar nada si el cruce enlaza a una parte que la capa no tiene, si la capa tiene otro número de partes que la del cruce, si la capa no está en UTM zona 14 norte (lee su `.prj`) o si los kilómetros de los frentes no cuadran con el resumen del modelo.
- Estas comprobaciones se escribieron el 3 de octubre de 2026 **sin poder ejecutar los pasos 3 y 4**, porque la capa de vialidades primarias no está en la carpeta de trabajo. Quedan por probar la primera vez que se corra la cadena.

## Insumos que no están en el repositorio

| Insumo | Para qué | Estado al 3 de octubre de 2026 |
|---|---|---|
| `insumos/VP_REFORESTACION/PRIMARIAS_REFORESTACION.shp` y sus archivos | Pasos 3 y 4 | **No está en la carpeta de trabajo.** Hay que localizarla y resguardarla |
| `07_versiones/calles_prioritarias_v6_original.html` | Paso 1 (origen de los frentes priorizados) | Solo en la copia local; su suma está en `SUMAS_INSUMOS.md` |
| Modelo de priorización de frentes (SIA, nov. 2025) | Origen de la prioridad de cada frente | No se tiene; depende del SIA |

Para que el SIA pueda regenerar los datos, estos insumos se entregan por canal institucional con su suma de verificación (`SUMAS_INSUMOS.md`).

Verificado el 25 sep 2026 en la copia local: los pasos 3 y 4 reproducen exactamente los datos publicados. Un tercero no puede repetir esa verificación solo con el repositorio, porque el paso 1 lee un archivo de `07_versiones/` y los pasos 3 y 4 la capa `insumos/VP_REFORESTACION/`, que no se publican. Los archivos se comprimen sin fecha, así que volver a correrlos sin cambios no genera diferencias en Git.

## Regla del cruce con vialidades primarias

Un frente pasa a Gobierno Central si corre paralelo (30° o menos) a una vialidad primaria a 18 m o menos, o a 60 m o menos cuando además coincide el nombre de la calle. Pendiente de validación con la Secretaría.
