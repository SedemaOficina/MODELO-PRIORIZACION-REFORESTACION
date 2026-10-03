# Sumas de verificación de los insumos

SHA-256 de los archivos con los que se generaron los datos de la herramienta, calculadas el 3 de octubre de 2026 sobre la carpeta de trabajo. Sirven para confirmar que un insumo entregado o resguardado es exactamente el que se usó (auditoría H-007). Para comprobar un archivo: `sha256sum ARCHIVO` (Linux, macOS) o `certutil -hashfile ARCHIVO SHA256` (Windows).

## Insumos

| Archivo | ¿Dónde está? | SHA-256 |
|---|---|---|
| `07_versiones/calles_prioritarias_v6_original.html` (frentes priorizados; lo lee el paso 1) | Solo en la copia local | `a89d6a900aeeb877352c0500733bf7fdd78e738932cd1ad8523077bd497c56e6` |
| `insumos/VP_REFORESTACION/PRIMARIAS_REFORESTACION.shp` y sus archivos (pasos 3 y 4) | **No localizado en la carpeta de trabajo** | Por calcular cuando se localice |
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
