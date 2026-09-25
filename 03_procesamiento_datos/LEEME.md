# Procesamiento de datos

Scripts con los que se prepararon los datos que usa la herramienta (`02_fuente/datos/*.bin`). Solo se vuelven a correr si cambian los insumos: nuevo modelo de priorización, nueva capa de vialidades primarias o nuevo índice social.

Requieren Python 3 con `numpy`, `pyshp`, `shapely` y `pyproj` (y `Pillow` para la lámina).

## Orden y qué hace cada uno

| # | Script | Lee | Escribe |
|---|---|---|---|
| 1 | `decode_frentes.py` | Frentes de manzana priorizados de la versión 6 de la herramienta (`07_versiones/calles_prioritarias_v6_original.html`, solo en la copia local) | `frentes.npz` |
| 2 | `ids_join.py` | `meta.json` y la capa `IDS_ut/` (Índice de Desarrollo Social por unidad territorial, EVALÚA CDMX) | `meta.json` con el IDS, la población y la pobreza por colonia |
| 3 | `cruce.py` | `frentes.npz` y la capa de vialidades primarias | `cruce.npz`: qué frentes quedan sobre una vialidad primaria (Gobierno Central) |
| 4 | `build_data.py` | `meta.json`, `frentes.npz`, `cruce.npz` y la capa de vialidades primarias | `02_fuente/datos/meta.bin`, `data.bin` y `vp.bin`, y `resumen_v7.json` |
| — | `recompone.py` | `insumos/slide_orig.jpg` (lámina original de la presentación) | `06_entregables/composicion_frentes_manzana*.png` |

Después de correr `build_data.py`, reconstruir la herramienta con `python3 02_fuente/construir.py`.

## Insumos que no están en el repositorio

Se colocan en `03_procesamiento_datos/insumos/` antes de correr los scripts:

- `VP_REFORESTACION/PRIMARIAS_REFORESTACION.shp` (con sus .dbf, .shx y .prj): capa de vialidades primarias priorizadas para reforestación (SEDEMA, agosto de 2026).
- `slide_orig.jpg`: lámina de composición de frentes de manzana, solo para `recompone.py`.

## Reglas del cruce con vialidades primarias

Un frente pasa a Gobierno Central si corre paralelo (30° o menos) a una vialidad primaria a 18 m o menos, o a 60 m o menos cuando además coincide el nombre de la calle. Esta regla está pendiente de validación con la Secretaría.
