# Capas geográficas de la herramienta

Lista para comparar con las capas del GeoServer del SIA, antes de conectar la herramienta a ellas. Se revisó el 5 de octubre de 2026 (v17.36) directamente en los archivos.

La herramienta **no lee capas en vivo**: usa tres archivos ya procesados (`02_fuente/datos/*.bin`, formato en `08_entrega_sia/CONTRATO_DE_DATOS.md`). Esos archivos salen de **cinco capas**. Tres son archivos de origen; las de alcaldías y colonias venían ya incluidas en la versión 6 de la herramienta.

## Resumen

| # | Capa | Geometría | Registros | Proyección de origen | Dónde está |
|---|---|---|---|---|---|
| 1 | Frentes de manzana priorizados (modelo, nov. 2025) | Líneas | 372,534 | MEXICO_ITRF_2008_LCC (Lambert cónica, ITRF 2008; sin código EPSG en el `.prj`) | `03_procesamiento_datos/insumos/originales/shp_frentes_manzanasv.rar` → `frentes_manzanas_verdes.shp` |
| 2 | Vialidades primarias para reforestación (ago. 2026) | Líneas | 13,335 registros (16,072 partes) | WGS 84 / UTM 14N (EPSG:32614) | `03_procesamiento_datos/insumos/VP_REFORESTACION/PRIMARIAS_REFORESTACION.shp` |
| 3 | Índice de Desarrollo Social por unidad territorial (EVALÚA CDMX) | Polígonos | 1,814 | WGS 84 / UTM 14N (EPSG:32614) | `03_procesamiento_datos/insumos/IDS_ut/IDS_ponderado.shp` |
| 4 | Colonias | Polígonos | 2,243 | Solo en la versión procesada (WGS 84) | Dentro de `meta.bin` (`cols` y `colonias`); **origen primario por identificar** |
| 5 | Alcaldías | Polígonos | 16 | Solo en la versión procesada (WGS 84) | Dentro de `meta.bin` (`alc`) |

En la herramienta todo está en **WGS 84, grados decimales** (EPSG:4326), con precisión de unos 1.1 m (5 decimales). Los polígonos de colonias y alcaldías están **simplificados**: sirven para dibujar y ubicar un punto, no para medir.

## 1. Frentes de manzana priorizados

- **Qué es:** frentes de manzana del Censo de Características del Entorno Urbano de INEGI (2020), ámbito urbano, con la prioridad de reforestación del modelo del SIA.
- **Comprobación:** empatados por ubicación, los 372,534 frentes tienen en la herramienta la misma clase que `prio_fm` (`03_procesamiento_datos/SUMAS_INSUMOS.md`).

| Lo que usa la herramienta | Campo de la capa | Nota |
|---|---|---|
| Prioridad (5 clases) | `prio_fm` (1 a 5) | Clase de la herramienta = `prio_fm − 1` (0 Muy Baja … 4 Muy Alta). `PRIORIDAD` es el puntaje continuo y no se usa |
| Alcaldía | `CVE_MUN` | Claves «002» a «017» |
| Nombre de la calle | `NOMVIAL` | |
| Tipo de vialidad | `TIPOVIAL` | 23 valores |
| Banqueta | `BANQUETA_D` | Códigos de INEGI: 1 Dispone, 3 No dispone, 7 Conjunto habitacional, 8 No aplica, 9 No especificado (en la herramienta, 0 a 4 en ese orden) |
| Arbolado | `ARBOLES_D` | Mismos códigos: 1 Dispone, 3 No dispone, 7, 8, 9. La herramienta solo usa «No dispone» (sin arbolado) |
| Longitud | Calculada de la geometría | Metros enteros |
| Colonia | **No es campo de esta capa** | Asignada en la versión 6, por ubicación, con la capa de colonias (4) |
| Responsable (alcaldía o Gobierno Central) | **No es campo de esta capa** | Resulta del cruce con la capa 2, en el paso 3 de `03_procesamiento_datos` |

La prioridad está comprobada frente por frente. Banqueta y arbolado, por conteos exactos de cada código: 181,924 / 108,889 / 62,747 / 12,429 / 6,545 frentes en banqueta, y 160,694 / 130,119 / 62,747 / 12,429 / 6,545 en arbolado, iguales en la capa y en la herramienta. Nombre y tipo de vialidad se infirieron comparando valores.

**Importante para conectar:** la herramienta **no conserva `CVEFT` ni `CVEGEO`**. Identifica cada frente por su número de orden, que cambia si se regeneran los datos. Para enlazar con el GeoServer frente por frente, hay que agregar `CVEFT` o `CVEGEO` en el paso 4 de `03_procesamiento_datos`. Sin ese cambio solo se puede empatar por geometría.

## 2. Vialidades primarias para reforestación

- **Comprobación:** con esta capa, los pasos 3 y 4 reproducen exactamente `vp.bin` (`SUMAS_INSUMOS.md`).

| Lo que usa la herramienta | Campo de la capa |
|---|---|
| Nomenclatura (nombre de la vialidad) | `NOMENCLAT` |
| Red vial (Anillo Periférico, Eje 1 Norte…) | `NOMBRE` |
| Tipo | `TIPO_VIA` |
| Carriles | `CARRILES` |
| Circulación | `CIRCULA` |
| Alcaldía (texto; puede nombrar dos) | `ALCALDIA` |
| Clave del tramo (p. ej. «AOB-029») | `CLAVE` |
| Prioridad | `ref_sedema` |
| Longitud | Calculada de la geometría (`long_vp` solo se compara) |
| Alcaldía asignada a cada parte | Calculada: la del vértice central de la parte |

Un registro con varias partes (multilínea) se divide en partes; cada una conserva el número de registro de origen. La clave natural para enlazar con GeoServer es **`CLAVE`**.

## 3. Índice de Desarrollo Social por unidad territorial

| Lo que usa la herramienta | Campo de la capa |
|---|---|
| Estrato de desarrollo social de la colonia | `e_idsm` |
| Población en pobreza (NBI) | `pobres_tot` |
| Unidad territorial | `nombre_ut` |
| Población de la unidad territorial | `pobtotal` |

**Cómo se une:** cada colonia toma la unidad territorial que contiene el centro de su polígono. Si el centro cae fuera de todas, toma la más cercana (paso 2). La clave natural es **`cve_ut`**, pero la herramienta guarda el nombre (`nombre_ut`), no la clave.

## 4. Colonias

- **Catálogo:** 2,243 colonias con nombre y polígono.
- **Campos por colonia:**

| Campo | Contenido |
|---|---|
| `n` | Nombre |
| `cp` | Código postal; 1,322 vienen con cuatro dígitos y la herramienta los completa con un cero al mostrarlos |
| `m` | Clave de alcaldía |
| `p` | Prioridad de la colonia, 0 a 4 |
| `pob` | Población |
| `gm` | Grado de marginación; no se usa |
| `ids`, `nbi`, `ut`, `utpob` | Agregados desde la capa 3 |

- **Origen:** primario no identificado (pendiente del README). Hay colonias con el mismo nombre en una alcaldía: 265, y 213 de ellas comparten también el código postal. Las listas para homologar están en `06_entregables/Catalogos_para_homologacion_SIA.xlsx`.
- **Para comparar con GeoServer:** la herramienta no guarda una clave oficial de colonia, solo su posición en el catálogo. El empate tiene que ser por nombre, alcaldía y código postal, o por geometría.

## 5. Alcaldías

16 polígonos con clave (`cve`, «002» a «017», como `CVE_MUN` de INEGI) y nombre (`nom`). Origen no documentado; vienen de la versión 6. La clave **`CVE_MUN`** es directa.

## Lo que no es capa del proyecto

Los mapas de fondo (calles de CARTO sobre OpenStreetMap y satélite de Esri) son teselas de terceros que se piden solo si la persona los enciende. No forman parte de los datos ni deben estar en GeoServer.

## Para tu comparación, en corto

| Capa | ¿Clave para enlazar con GeoServer? |
|---|---|
| Frentes | **No**, hay que agregar `CVEFT` o `CVEGEO` al generar los datos |
| Vialidades primarias | Sí: `CLAVE` |
| Unidades territoriales (IDS) | En la capa sí (`cve_ut`); la herramienta guarda solo el nombre |
| Colonias | **No hay clave oficial**: nombre, alcaldía y CP, o geometría |
| Alcaldías | Sí: `CVE_MUN` |
