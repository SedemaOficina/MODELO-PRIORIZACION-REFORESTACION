# Capas para el GeoServer del SIA · Calles prioritarias para reforestar

Tres capas y sus estilos, para publicarlas en `https://sedema.sia.cdmx.gob.mx/geoserver`, espacio de trabajo `sia`.

**Se publican como capas NUEVAS.** No sustituyen a `sia:frentes_manzanas` ni a `sia:vial_primarias`:
- `sia:vial_primarias` es la red completa de INEGI (33,612 segmentos), sin prioridad, y la usan otros visores.
- Estas capas traen lo que calcula la herramienta (prioridad, banqueta, responsable) y se actualizan con ella.

## Archivos

| Archivo | Capa sugerida | Geometría | Registros | Estilo |
|---|---|---|---|---|
| `frentes_reforestacion.gpkg` | `sia:frentes_reforestacion` | MultiLineString | 372,534 | `frentes_reforestacion.sld` |
| `vialidades_primarias_reforestacion.gpkg` | `sia:vialidades_primarias_reforestacion` | MultiLineString | 13,335 | `vialidades_primarias_reforestacion.sld` |
| `colonias_reforestacion.gpkg` | `sia:colonias_reforestacion` | MultiPolygon | 2,243 | `colonias_reforestacion.sld` |

Todas las capas:
- Están en **WGS 84 (EPSG:4326)**.
- Usan texto en UTF-8.
- Traen **índice espacial**.

Cada GeoPackage tiene una tabla de datos, con el mismo nombre que el archivo, y la tabla `layer_styles` con el **estilo incrustado**: QGIS pinta la capa con los colores de la herramienta al abrirla, sin cargar nada más. GeoServer no lee esa tabla; usa el `.sld`, que tiene los mismos colores (`#7F1D12` Muy Alta, `#C2421B` Alta, `#E88A2E` Media, `#F4C56E` Baja, `#F9E7BF` Muy Baja).

No usar el `frentes_manzanas_verdes.qml` del paquete original del modelo: asigna los colores en orden alfabético y pinta «Muy Alta» de verde. `MANIFIESTO.sha256` trae la huella de cada archivo; para comprobarlos: `sha256sum -c MANIFIESTO.sha256`.

## Publicación (GeoServer, interfaz web)

Para cada una de las tres capas:

1. **Almacén:** Almacenes de datos → Agregar → **GeoPackage**. Espacio de trabajo `sia`, nombre igual al del archivo (p. ej. `frentes_reforestacion`). Ruta: el `.gpkg` copiado al directorio de datos del servidor.
2. **Capa:** Publicar la tabla. SRS declarado `EPSG:4326`; calcular los límites desde los datos.
3. **Estilo:** Estilos → Agregar → subir el `.sld` correspondiente y asignarlo como estilo por omisión de la capa.
4. **Caché de teselas:** en la pestaña *Tile Caching* de la capa, activar GeoWebCache con `EPSG:900913` (o `EPSG:3857`) y `image/png`, y **precargar (seed)** los niveles 10 a 16. Sin precarga, cada tesela tarda alrededor de 1 s la primera vez; precargada, alrededor de 0.1 s. **Atención:** según el inventario del SIA, el cacheo de GeoWebCache está apagado por falta de disco y el volumen de datos de GeoServer va al 54 % de 10 GB. Las tres capas ocupan unos 150 MB. Precargar los niveles 10 a 16 de toda la ciudad puede ocupar del orden de 1 a 2 GB. Conviene precargar solo los niveles 13 a 16 (los de calle), o solicitar espacio antes.

## Para actualizar

Cuando cambie el modelo o la herramienta:
1. Se regeneran los archivos con `python 03_procesamiento_datos/5_exportar_geoserver.py`.
2. Se reemplazan los `.gpkg` en el servidor.
3. Se vacía la caché de teselas de las tres capas (*Truncate*).

Los nombres de las capas y de los campos no cambian.

## Campos

### `frentes_reforestacion`

| Campo | Contenido |
|---|---|
| `clave_frente` | **Clave única**: `CVEGEO` + `_` + `CVEFT` con tres dígitos (p. ej. `0900200010025001_002`). Es la clave para enlazar con `sia:frentes_manzanas` (`CVEGEO` y `CVEFT`) |
| `cveft`, `cvegeo`, `cve_mun` | Claves de INEGI. `CVEFT` es el número del frente **dentro de su manzana**: sola no es única |
| `alcaldia`, `colonia_id`, `colonia`, `cp` | Ubicación. `colonia_id` es el número de la colonia en `colonias_reforestacion`; vacío si el frente no tiene colonia |
| `calle`, `tipo_vial` | Nombre y tipo de la vialidad (INEGI) |
| `prioridad`, `clase_prioridad` | Muy Baja a Muy Alta; clase 0 a 4. El estilo usa `clase_prioridad` |
| `prioritario` | 1 si es Alta o Muy Alta |
| `universo_intervencion` | 1 si es Media, Alta o Muy Alta |
| `banqueta_inegi` | Valor de INEGI 2020 |
| `grupo_banqueta` | `con banqueta`, `sin banqueta` o `por verificar` (conjunto habitacional, no aplica o sin dato): el filtro de la herramienta |
| `arbolado_inegi`, `sin_arbolado` | Arbolado según INEGI; `sin_arbolado` = 1 si no dispone |
| `responsable` | `Alcaldía` o `Gobierno Central` (frente sobre una vialidad primaria). **Asignación preliminar**: la regla del cruce (18 m, o 60 m con nombre coincidente) está en validación |
| `vp_clave` | Si el responsable es el Gobierno Central, la `clave` del tramo de vialidad primaria |
| `longitud_m` | Metros |
| `id_herramienta` | Número del frente en la herramienta (cambia si se regeneran sus datos; no usarlo para enlazar) |

La geometría es la **original** del modelo de priorización (nov. 2025), no la simplificada de la herramienta.

### `vialidades_primarias_reforestacion`

| Campo | Contenido |
|---|---|
| `clave` | Clave del tramo (p. ej. `BJU-024`): clave para enlazar |
| `nomenclat`, `red_vial` | Nombre de la vialidad y red a la que pertenece (Anillo Periférico, Eje 1 Norte…) |
| `tipo_via`, `carriles`, `circulacion` | Tipo, número de carriles y sentido de circulación |
| `alcaldia_capa` | Alcaldía según la capa; puede nombrar dos |
| `prioridad`, `clase_prioridad`, `prioritario` | Igual que en los frentes |
| `longitud_m`, `long_vp` | Longitud calculada en metros y la de la capa de origen (en km) |

### `colonias_reforestacion`

| Campo | Contenido |
|---|---|
| `colonia_id` | Número de la colonia en la herramienta |
| `colonia` | Nombre de la colonia |
| `cp` | Código postal, con cinco dígitos |
| `cve_mun`, `alcaldia` | Clave y nombre de la alcaldía |
| `prioridad`, `clase_prioridad` | Prioridad de la colonia; vacía si no tiene |
| `poblacion` | Censo 2020 |
| `desarrollo_social_ids`, `unidad_territorial`, `poblacion_pobreza_ut` | Índice de Desarrollo Social de su unidad territorial (EVALÚA CDMX) |
| `km_prioritarios` | Km de frente Alta y Muy Alta a cargo de la alcaldía |
| `km_prio_con_banqueta`, `km_prio_sin_banqueta`, `km_prio_por_verificar` | Esos km, separados por banqueta |

**Atención:**
- Los polígonos de colonias están **simplificados**: sirven para ver y ubicar, no para medir superficies.
- Su origen primario no está identificado. Si el SIA tiene una capa oficial de colonias, conviene usarla y unirle estos campos.
- La suma de `km_prioritarios` (9,212.9 km) es menor que el total de las alcaldías (9,226.9 km), porque algunos frentes no tienen colonia asignada.

## Cifras de control

Para comprobar que la capa publicada es la correcta:

| Comprobación | Valor |
|---|---|
| Frentes | 372,534 |
| Frentes a cargo del Gobierno Central | 19,411 |
| Km Alta + Muy Alta a cargo de las alcaldías | 9,226.9 |
| — con banqueta | 6,285 km |
| — sin banqueta | 1,939 km |
| — por verificar | 1,003 km |
| Tramos de vialidad primaria | 13,335 |
| Colonias | 2,243 |

Son las mismas cifras que muestra la herramienta, versión 17.36.
