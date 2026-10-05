# Sumas de verificación de los insumos

SHA-256 de los archivos con los que se generaron los datos de la herramienta, calculadas el 3 de octubre de 2026 sobre la carpeta de trabajo. Sirven para confirmar que un insumo entregado o resguardado es exactamente el que se usó (auditoría H-007). Para comprobar un archivo: `sha256sum ARCHIVO` (Linux, macOS) o `certutil -hashfile ARCHIVO SHA256` (Windows).

## Insumos

| Archivo | ¿Dónde está? | SHA-256 |
|---|---|---|
| `07_versiones/calles_prioritarias_v6_original.html` (frentes priorizados; lo lee el paso 1) | Solo en la copia local | `a89d6a900aeeb877352c0500733bf7fdd78e738932cd1ad8523077bd497c56e6` |
| `insumos/VP_REFORESTACION/PRIMARIAS_REFORESTACION.shp` (pasos 3 y 4) | Copia local (no se publica); original en Descargas de Liber, también como `VP_REFORESTACION.rar` (`7e5575f257652b39992da8e189382ac3ed15c4deb828e31e2602ca4c9bc88324`). Localizada el 5 oct 2026 | `17b6b293d072bceff881feba242185dc6d231b7e2066aa65e1238a307717cc6f` |
| `insumos/VP_REFORESTACION/PRIMARIAS_REFORESTACION.dbf` | Igual | `978fe6a70e640d6e72b17bdad0361c94aee137a3f9b856937ee5edbd0331bd2c` |
| `insumos/VP_REFORESTACION/PRIMARIAS_REFORESTACION.shx` | Igual | `965b46203efdecaed1190a7ee667715a7cd8db429ce31a99b63b5e2fea407cf8` |
| `insumos/VP_REFORESTACION/PRIMARIAS_REFORESTACION.prj` | Igual | `db708912d14ad1ab84ec61604c667fdc25968fc1a35e5c56cd146d3f45a3c441` |
| `insumos/VP_REFORESTACION/PRIMARIAS_REFORESTACION.cpg` | Igual | `3ad3031f5503a4404af825262ee8232cc04d4ea6683d42c5dd0a2f2a27ac9824` |
| `insumos/originales/shp_frentes_manzanasv.rar`: **insumo del modelo de priorización** (nov. 2025). Trae `frentes_manzanas_verdes.shp` y sus archivos (372,534 frentes de INEGI con `PRIORIDAD`, puntaje, y `prio_fm`, clase 1 a 5) | Copia local (no se publica), desde el 5 oct 2026 | `637d40f7aac00ec7aa5ad9124c929ebe916e8f18fc5384c3aba367cc8d62c4ec` |
| └ `frentes_manzanas_verdes.shp` (dentro del rar) | Igual | `bd7538d3598ecd2db7c9d467c1715b20fcfc4b90fc0ee238539dfc43046343b4` |
| └ `frentes_manzanas_verdes.dbf` (dentro del rar) | Igual | `c9cd709a6893bc02440e9e4ec9051a3b85f8b2fbc4f4a8070c0be9fbab1865a2` |
| `insumos/originales/VP_REFORESTACION.rar`: la capa de vialidades primarias tal como se recibió | Copia local (no se publica), desde el 5 oct 2026 | `7e5575f257652b39992da8e189382ac3ed15c4deb828e31e2602ca4c9bc88324` |
| `insumos/IDS_ut/IDS_ponderado.shp` | Repositorio | `70ad3aaf462eac2018c7f3e6be3a8b918e7e4dacd6c8b5789dc97932ac5d09b8` |
| `insumos/IDS_ut/IDS_ponderado.dbf` | Repositorio | `fe7bf830a978dedb0c741ba34ee6e70d8be9ed34a807005eb746a9fd047ff1fd` |
| `insumos/IDS_ut/IDS_ponderado.shx` | Repositorio | `47493ff04214b7b3571284e10337393c5349e88e066ea2caa9a3a28cca0d0648` |
| `insumos/IDS_ut/IDS_ponderado.prj` | Repositorio | `db708912d14ad1ab84ec61604c667fdc25968fc1a35e5c56cd146d3f45a3c441` |
| `insumos/IDS_ut/IDS_ponderado.cpg` | Repositorio | `3ad3031f5503a4404af825262ee8232cc04d4ea6683d42c5dd0a2f2a27ac9824` |
| `insumos/IDS_ut/diccionario_ut.xlsx` | Repositorio | `91cae0673dd594c5d0b522ca484ee7064925d00746a2604975318901315adb5e` |

## Intermedios

| Archivo | SHA-256 |
|---|---|
| `intermedios/frentes.npz` (salida del paso 1) | `d363e369102f01d34fbc30e522e09c56e0161a339a31394280027c08560358b5` |
| `intermedios/meta.json` (salida del paso 2) | `5c6d9efac45c848a1b25b16ed47d21766d2ec66c71fc9afe39ccb5e879332d16` |
| `intermedios/cruce.npz` (salida del paso 3) | `e65380c4fa418f25dee277e9059cb2745ed328b096210d822c761f54f76ab056` |

## Datos de la herramienta

Las sumas del contenido de `02_fuente/datos/*.bin` están en `02_fuente/datos/SUMAS.json` y se comprueban con `python3 03_procesamiento_datos/verificar_datos.py`.

## Pendiente

Entregar al SIA, por canal institucional, la capa de vialidades primarias y el insumo del modelo de priorización con su suma, y anotar aquí dónde quedan resguardados.

## Comprobación del insumo del modelo (5 oct 2026)

`frentes_manzanas_verdes.shp` es el origen de las prioridades de la herramienta. Se empataron sus 372,534 frentes con los de la herramienta por el primer y el último vértice (convertidos de la proyección MEXICO_ITRF_2008_LCC a WGS 84) y **los 372,534 tienen la misma clase** (`prio_fm` − 1 = clase de la herramienta). Los frentes están en otro orden en la herramienta, porque la v6 los reordenó. La versión anterior del modelo (`reforestacion_frentesm`, jul. 2025, en Descargas) no trae el campo `PRIORIDAD` y no se copió.

## Comprobación de la capa (5 oct 2026)

Es la capa con la que se generaron los datos publicados: con ella, los pasos 3 y 4 (corridos en una copia aparte, con las versiones de `requirements.txt`) dan:
- **`vp.bin` idéntico** al publicado: 13,335 registros y 16,072 partes.
- **La misma asignación de los 372,534 frentes** a la alcaldía o al Gobierno Central: ningún frente cambia de responsable.
- **Diferencia:** 144 de los 19,411 frentes del Gobierno Central quedan enlazados a la parte contigua de la capa. Todos siguen en la misma alcaldía y 141 en la misma vialidad. Ocurre cuando el frente está a la misma distancia de dos partes (típicamente en un cruce) y el empate se resuelve según el orden interno de Shapely, que cambió entre versiones. Por eso `data.bin` y `meta.bin` no salen idénticos byte a byte. Los datos publicados no se reemplazaron.
