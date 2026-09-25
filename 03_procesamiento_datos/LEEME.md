# Procesamiento de datos

Scripts que producen los datos de la herramienta (`02_fuente/datos/meta.bin`, `data.bin` y `vp.bin`). Solo se vuelven a correr si cambian los insumos: nuevo modelo de priorización, nueva capa de vialidades primarias o nuevo índice social. El formato de los archivos está descrito en `ARQUITECTURA.md`, sección 7.

Requieren Python 3 con `numpy`, `pyshp`, `shapely` y `pyproj` (y `Pillow` para la lámina).

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
| 1 | `1_decodificar_frentes.py` | Frentes priorizados de la versión 6 de la herramienta (`07_versiones/calles_prioritarias_v6_original.html`, solo en la copia local) | `intermedios/frentes.npz` |
| 2 | `2_unir_ids.py` | `intermedios/meta.json` e `insumos/IDS_ut/` | `intermedios/meta.json` con IDS, población y pobreza por colonia |
| 3 | `3_cruzar_vialidades_primarias.py` | `intermedios/frentes.npz`, `intermedios/meta.json` e `insumos/VP_REFORESTACION/` | `intermedios/cruce.npz`: qué frentes quedan sobre una vialidad primaria (Gobierno Central) |
| 4 | `4_generar_datos.py` | Los tres intermedios e `insumos/VP_REFORESTACION/` | `02_fuente/datos/meta.bin`, `data.bin` y `vp.bin` |
| — | `lamina_composicion.py` | `insumos/slide_orig.jpg` | `06_entregables/composicion_frentes_manzana*.png` |

Después del paso 4: `python3 02_fuente/construir.py` y `node 04_pruebas/prueba_sitio.js`.

Verificado el 25 sep 2026: los pasos 3 y 4 reproducen exactamente los datos publicados. Los archivos se comprimen sin fecha, así que volver a correrlos sin cambios no genera diferencias en Git.

## Regla del cruce con vialidades primarias

Un frente pasa a Gobierno Central si corre paralelo (30° o menos) a una vialidad primaria a 18 m o menos, o a 60 m o menos cuando además coincide el nombre de la calle. Pendiente de validación con la Secretaría.
