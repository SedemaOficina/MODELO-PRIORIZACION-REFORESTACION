# Pruebas

Una sola orden corre todo y termina con código 0 solo si todo pasó:

```
node 04_pruebas/correr_todas.js            todo: unos 40 minutos sin tarjeta gráfica
node 04_pruebas/correr_todas.js rapidas    datos, construcción, revisión estática y contraste del mapa: menos de un minuto
```

Preparación, una sola vez: Node 18 o posterior, Python 3 y `npm install` en la raíz (instala las versiones fijadas en `package.json`: Playwright 1.56.0 y ESLint 9.37.0), y `npx playwright install chromium`. La prueba de coherencia requiere además `openpyxl` y `pdftotext`.

**En Windows**: las pruebas llaman a Python como `python` (en Windows `python3` es un acceso directo a la tienda) y no se parten con rutas que llevan espacios. `pdftotext` viene con Git para Windows (`C:\Program Files\Git\mingw64\bin`); las pruebas le piden `-enc UTF-8`, porque en Windows entrega por omisión la codificación del sistema. `correr_todas.js` cuenta como falla una verificación que no pudo correr (por ejemplo, ESLint sin `npm install`): lo que no se revisó no se da por aprobado. Las órdenes de `package.json` que corren Python pasan por `04_pruebas/py.js`, que elige el nombre correcto en cada sistema.

| Verificación | Qué cuida | Duración aproximada |
|---|---|---|
| `03_procesamiento_datos/verificar_datos.py` | Que los datos sean los registrados y cuadren entre sí; del inventario de arbolado, que cada archivo sea el registrado, sus puntos por tipo las cifras de control y sus frentes los de `data.bin`; del archivo del filtro «Espacio», sus cifras de control y un recálculo desde los puntos | 10 s |
| `prueba_construccion.py` | Que `construir.py` dé el mismo sitio desde cero y se detenga sin escribir si falta o sobra una pieza, o si el inventario de arbolado no es el registrado, se asignó con otros frentes o el archivo del filtro «Espacio» falta o no cuadra | 30 s |
| ESLint (`npm run lint`) | Variables sin definir o sin usar en `docs/app.js` | 5 s |
| `prueba_contraste.js` | Contraste de los colores del mapa sobre cada fondo real (texto 4.5:1; líneas, puntos, aros, contornos y foco 3:1), con el cálculo de `herramientas/contraste.mjs` | 1 s |
| `prueba_sin_terceros.js` | Que el sitio, el archivo único y la instalación en una subruta trabajen sin pedir nada a otros dominios | 2 min |
| `prueba_sitio.js` | Flujos principales en escritorio y teléfono | 6 min |
| `prueba_robustez.js` | Lo que ve la persona cuando algo falla | 1 min |
| `prueba_coherencia_cifras.js` | Que pantalla, Excel y fichas digan lo mismo que un recálculo independiente desde los datos | 2 min |
| `prueba_accesibilidad.js` | Marcado, anuncios, foco, teclado, contraste, objetivos táctiles, letra, impresión y propiedades de PDF y Excel | 1 min |
| `prueba_servidor_sia.js` | Instalada en `/priorizacion-reforestacion/` con la política de seguridad de contenido del ejemplo de nginx y sus reglas de caché (la página, también con `?v=` de avenida, se revalida siempre; lo que lleva huella se guarda un año): cero violaciones, sesión vencida, datos descomprimidos por un intermediario; rutas de la fase 2 (acceso y API bajo `/priorizacion-reforestacion/`, sin `auth_request`); «Mi cuenta» con la sesión configurada (menú con «Cambiar contraseña» y «Cerrar sesión», teclado, Esc, clic fuera, celular de 44 px) y oculto sin sesión | 2 min |
| `prueba_telefono_y_sin_conexion.js` | GPS impreciso, Excel grandes, teléfono en horizontal y uso sin conexión | 2 min |
| `prueba_orientacion.js` | Entrada por territorio (tres opciones, «Las dos» abre con `r=both` y se recuerda; el segundo paso no repite la presentación), tres pestañas, «Dónde empezar» (orden, filtro por nombre, calles de la alcaldía, alcaldías, tramos de la calle elegida, avenidas y alcaldías que cruza una avenida), el nombre del lugar una sola vez en el Resumen, capas cerradas con leyenda compacta, «Quién atiende» en capas, sin «Compartir» | 1 min |
| `prueba_casos_limite.js` | Casos límite: avenida con una alcaldía que no cruza, Atrás tras cambiar de red, colonias homónimas en archivos, mapa de una colonia con las dos redes y doble clic | 1 min |
| `prueba_banqueta.js` | Filtro de banqueta: cifras de cada opción contra un recálculo propio, explicación visible de la opción elegida, desglose fijo, Excel, GeoJSON y ficha con el filtro, dirección y Gobierno Central (una sola medida a la vista; lo que está en km de frente, plegado también en la computadora) | 1 min |
| `prueba_recorrido.js` | Recorrido guiado: arranque solo después de la entrada y una sola vez, desde «Cómo funciona», teclado, cada globo cabe y no tapa su control, el foco cae sobre el control de cada paso, menos de 15 pasos, pasos de banqueta, «Espacio», orden por cepas, Street View y espacios para plantar (punto real del inventario), «Mi cuenta» solo con sesión (simulada con `SIA_SESION`), en escritorio, teléfono y Gobierno Central | 2 min |
| `prueba_nombres_mapa.js` | Nombres del mapa, gestos y búsqueda por coordenadas: nombres de alcaldía y colonia dentro de su figura, nombres de calle sobre la línea media, juego de letras con «Ñ» en mayúsculas, contraste de los nombres de colonia, nombres de calle al día tras un salto sin animación y dedos «fantasma» que el mapa suelta |
| `prueba_dos_pantallas.js` | Celular en dos pantallas (información y mapa): el panel sale a la izquierda y el mapa no cambia de tamaño, la pantalla que no se ve queda inerte, el botón de abajo dice qué se verá, qué acción lleva a qué pantalla, «atrás», nada encimado con el botón de abajo, «Atiende» y «Banqueta» siempre a la vista; en 360, 390 y 430 px, y en 1440 px la computadora no cambia (WebKit si está instalado) |
| `prueba_inventario_espacios.js` | Espacios para plantar (inventario de arbolado): puntos por tipo de los datos publicados = cifras de control y recálculo propio (y el CSV del inventario, si está en el equipo), frente asignado a 20 m o menos y ninguno cerca de los que quedaron sin frente, capa que aparece al acercar y no de lejos (archivos con huella, solo de las alcaldías a la vista), casillas que encienden y apagan cada tipo (también con el teclado), ficha de una cepa que gana al frente de debajo (tipo, clave, calle, colonia, prioridad del frente, Street View), avance de la alcaldía, cifras del modelo sin cambios, celular de 390 px sin desborde ni encimados y sin errores | 6 min |
| `prueba_filtro_espacio.js` | Filtro «Espacio» (cepa vacante, tocón, árbol muerto): archivo de puntos por tipo de cada frente = cifras de control y recálculo propio desde los puntos; cifras con las siete combinaciones (Tláhuac) y con cada tipo, los tres y «Con banqueta» (Iztapalapa) contra un recálculo propio; «Dónde empezar», Excel, GeoJSON, KML y ficha de una colonia con el filtro; todo igual al apagarlo; dirección (`e=`), «Reiniciar», Gobierno Central, aviso del inventario en curso, teclado y celular de 390 px; orden «más cepas vacantes» de «Dónde empezar» (colonias de Tláhuac y de la ciudad, con banqueta, calles de la alcaldía y de una colonia = recálculo propio; ceros al final, nota del corte, carga diferida y su falla, Gobierno Central, archivo único, celular) | 3 min |
| `prueba_espacio_gobierno_central.js` | Filtro «Espacio» y orden por cepas del Gobierno Central (v1.24): archivo de puntos por tipo de cada parte de vialidad = cifras de control y recálculo propio con la regla (por su frente o en el camellón, a 25 m o menos del eje, con rejilla propia); ciudad e Iztapalapa con cada combinación (km y tramos prioritarios); Excel de tramos y de avenidas, GeoJSON, KML, ficha de vialidades y de avenida con el filtro; «Avenidas con más cepas vacantes»; ficha de un tramo y de un punto del camellón; las dos redes; «Reiniciar»; `e=` con `r=gc`; celular; y, contra la v1.23 tomada de Git, todo igual con el filtro apagado y con «Alcaldías» | 8 min |
| `prueba_cepas_total.js` | Orden por cepas vacantes con el total de cualquier prioridad (v1.27) y columnas de espacios para plantar en las descargas (v1.25): opciones cortas de «Mostrar» (sin «(todas)», porcentaje ni «sin arbolado y con banqueta»); colonias de Tláhuac y de la ciudad, calles de la alcaldía y de una colonia y avenidas de Iztapalapa y de la ciudad por cepas de lo prioritario, con «N cepas vacantes · M en total» = recálculo propio (también con «Con banqueta» y «Espacio»), lo que no tiene km prioritarios pero sí cepas al final, carga diferida, falla y reintento, la avenida 5 de Mayo («sin cepas en lo prioritario · 128 en total»); columnas `cepas_vacantes`, `tocones` y `arboles_muertos` en los Excel de frentes (colonia y calle), de tramos y en los resúmenes por calle y por avenida, el Diccionario, GeoJSON y KML; descarga sin conexión al inventario; celular de 390 px; y, contra la v1.26 tomada de Git, lo que no cambió igual (del Resumen, las cifras sin sus rótulos; por cepas, lo que ya listaba) | 8 min |
| `prueba_cifras_gobierno_central.js` | Cifras del Gobierno Central en km de frente con filtros (v1.37): la columna del Gobierno Central de la tabla «Alcaldía y Gobierno Central» y «Equivalen a…» de su bloque coinciden con un recálculo propio en 6 consultas (sin banqueta, espacio por tramo, prioridad del tramo); con solo Gobierno Central no queda una banqueta escondida (al cambiar de red y con r=gc&b=…); una avenida sin km prioritarios da 0; «Además, …» de la ciudad; la lista «Dónde empezar» dice su filtro; la ficha PDF filtrada no trae «Concentra». Falla 25 de 36 contra la v1.36 | unos 3 min |
| `prueba_mapa_descargas.js` | KML y GeoJSON de las calles prioritarias: validez, mismos registros que la pantalla, límites en teléfono | 1 min |

**Lote de fichas de las alcaldías** (no es una prueba; vive aquí porque usa las mismas herramientas): `node 04_pruebas/generar_fichas_alcaldias.js` descarga, por alcaldía, la ficha de la alcaldía, la de vialidades primarias y la de la colonia con más frente prioritario, en `_local/fichas_alcaldias_vX.YY/`; `python 04_pruebas/unir_fichas.py CARPETA` (requiere `pypdf`) las une en `00_todas_las_fichas.pdf` y arma el zip. Unos 5 minutos.

**Qué compara cifras.** La prueba integral (`prueba_sitio.js`) es un recorrido de controles: confirma que cada flujo responde, no que las cifras sean correctas. Las cifras las vigila `prueba_coherencia_cifras.js`, que abre los Excel y las fichas PDF y los compara con la pantalla y con un recálculo propio desde `docs/datos/*.bin`. Las dos son necesarias.

GitHub puede repetir las tres primeras verificaciones en cada cambio que recibe; la propuesta, sin activar, está en `05_documentacion/verificacion_automatica_github.md`.

## Prueba integral

`prueba_sitio.js` levanta un servidor local sobre `docs/` y recorre en escritorio (1440 × 900) y teléfono (390 × 844) los flujos principales:

- carga sin errores;
- buscador (abreviaturas, alcaldía, colonia);
- lista de calles en «Dónde empezar», Excel de frentes y de tramos, fichas PDF de alcaldía y de colonia;
- modo Gobierno Central y regreso a toda la ciudad;
- Mi ubicación con un GPS simulado en la colonia Vicente Guerrero (Iztapalapa);
- ayuda y lámina de la metodología, y que la ayuda se pueda cerrar aunque se haya bajado hasta el final;
- botón "toda la ciudad";
- teléfono sin desborde horizontal y con la hoja mínima al abrir.

Uso (requiere Node 18 o posterior y Playwright):

```
npm i playwright
npx playwright install chromium
node 04_pruebas/prueba_sitio.js
```

Imprime `OK` o `FALLA` por cada punto y termina con error si algo falla. Las descargas y capturas quedan en `04_pruebas/capturas/`, que no se publica.

## Prueba de coherencia de cifras

`prueba_coherencia_cifras.js` (usa `lib_pruebas.js`) compara lo que muestra la pantalla con el **contenido** de los Excel y las fichas PDF y con un recálculo independiente desde `docs/datos/*.bin`: colonias con frentes en otra alcaldía (Tecpinco), unidades de la leyenda, tramos por `id_tramo`, avenida acotada a alcaldía y calles homónimas. Verifica además la tabla de comparación del Resumen (km de frente prioritario, sin arbolado y total por responsable, y cepas vacantes, tocones y árboles muertos de cada responsable), el universo de intervención (Muy Alta, Alta y Media) con sus cifras sin arbolado y con banqueta, la población de ese universo y el desglose de cada calle por prioridad; los tramos de la calle consultada (cuadro, Excel y ficha); el paso de ubicación de las calles con nombre repetido (alcaldías con conteo, renglones sin cifras) y la búsqueda de calle con su colonia o alcaldía; el equivalente en km de frente de las vialidades primarias y la banqueta como condición; el nombre único de los frentes sin calle, el identificador y la fecha en los Excel, el punto a media longitud, los frentes sin colonia, el aviso del filtro de la leyenda, las descargas sin registros, las avenidas homónimas y la calle en la ruta de navegación.

```
node 04_pruebas/prueba_coherencia_cifras.js
```

Requiere además Python 3 con `openpyxl` y la utilidad `pdftotext`. Termina con error si alguna cifra no coincide. Si Playwright no encuentra el navegador, indicar su ruta en la variable `PW_CHROME`.

## Prueba de arranque sin terceros

`prueba_sin_terceros.js` carga el sitio con **todos los dominios externos bloqueados** y verifica que arranque, que no haga ninguna solicitud fuera de su origen, que las tipografías Cabin y Roboto vengan de `docs/fuentes/` y que el primer contenido aparezca en menos de 3 segundos. Después abre `_local/priorizacion_reforestacion.html` como archivo, con todo dominio externo bloqueado, y verifica que arranca y que entrega un Excel y una ficha PDF con las librerías incrustadas. Por último sirve el sitio desde la subruta `/priorizacion-reforestacion/`, como se instalará en el SIA, y verifica que no pide nada fuera de ella.

```
node 04_pruebas/prueba_sin_terceros.js
```

## Prueba de errores y robustez

`prueba_robustez.js` provoca fallas y comprueba lo que ve la persona: datos cortados o dañados, archivo de datos inexistente, `app.js` o el componente del mapa que no llegan, un catálogo con marcado HTML, tres clics seguidos en una descarga, Atrás y Adelante del navegador, enlaces con la consulta en la dirección, atribución del mapa de fondo con una tarjeta abierta, el buscador con abreviaturas y el CSV de respaldo.

```
node 04_pruebas/prueba_robustez.js
```

Las pruebas abren la página con `?modo=ligero#nomap`. `#nomap` deja el mapa sin capas para que corran rápido sin tarjeta gráfica y **solo tiene efecto cuando la prueba define `window.SIA_PRUEBA`** (lo hace `lib_pruebas.js`); en el sitio publicado no hace nada.

## Prueba de teléfono y uso sin conexión

`prueba_telefono_y_sin_conexion.js` comprueba el GPS impreciso (±5,000 m) y la respuesta tardía de «Mi ubicación», que el Excel de una alcaldía grande no congela la página, el avance de la carga, el modo ligero, el teléfono en horizontal (844 × 390) y que la herramienta vuelve a abrir y entrega Excel y PDF sin conexión después de la primera visita.

```
node 04_pruebas/prueba_telefono_y_sin_conexion.js
```

Tarda unos 2 minutos. Las demás pruebas bloquean el proceso de servicio (`serviceWorkers: 'block'`) para poder intervenir la red; esta lo deja activo en su última sección.

## Prueba de contraste del mapa

`prueba_contraste.js` usa el mismo cálculo que `herramientas/contraste.mjs`, que lee los colores directamente de `02_fuente/css` y `02_fuente/js` (variables, colores de las capas de deck.gl, transparencias, halos y contornos) y mide cada par sobre el fondo donde aparece en el mapa: suelo, manzana, verde y agua del fondo «Calles», «Sin fondo», la rampa de prioridad, los rellenos de colonia y los extremos del satélite. Comprueba la fórmula contra valores conocidos de WCAG y **falla si un par exigido que hoy cumple deja de cumplir**, si un color ya no está donde la auditoría lo busca o si la lista de pendientes (`PENDIENTES_CONOCIDOS` en `contraste.mjs`) ya no corresponde a sus pares. Los pares «Pendiente de decisión» no la hacen fallar: se listan como aviso. También avisa si `05_documentacion/auditoria_contraste_mapa.md` no está al día con los colores. No abre el navegador.

```
node 04_pruebas/prueba_contraste.js
node herramientas/contraste.mjs                     la tabla completa
node herramientas/contraste.mjs --md 05_documentacion/auditoria_contraste_mapa.md --html _local/auditoria_contraste_mapa.html
node herramientas/contraste.mjs --pendientes        la lista de pendientes, para pegarla en contraste.mjs tras una decisión
```

## Prueba de accesibilidad

`prueba_accesibilidad.js` recorre la herramienta con teclado y comprueba: `<title>` y estilos en `<head>`, `<main>` y enlace de salto; anuncio del cambio de ámbito; foco tras elegir en el buscador, al abrir y cerrar la ficha, el panel de capas y la ayuda (fondo inerte); renglones de la lista de «Dónde empezar» con rol, foco visible y barra espaciadora; ficha de un frente abierta desde un tramo sin usar el puntero; contraste de bordes e indicador de foco; objetivos táctiles en teléfono (44 px en herramientas, pestañas y selector; 38 px en capas); ningún texto por debajo de 12 px ni tamaños en píxeles; impresión; movimiento reducido, e idioma, título y autoría en la ficha PDF y el Excel.

```
node 04_pruebas/prueba_accesibilidad.js
```

Las propiedades del Excel se leen con Python (`zipfile`), sin depender de `unzip`. Cada criterio de accesibilidad revisado queda así como comprobación automática. **No sustituye** la lectura con un lector de pantalla real ni una revisión con una herramienta como axe.

## Prueba de la construcción

`prueba_construccion.py` trabaja sobre copias en una carpeta temporal y comprueba que `construir.py`: da un sitio idéntico a `docs/` desde cero; no reescribe nada en una segunda corrida; da el mismo sitio con el código fuente en formato de Windows (CRLF); aparta en `_to_delete/` un archivo obsoleto de `docs/`; no publica un archivo imprevisto de `libs/`, y se detiene **sin escribir nada** cuando falta un módulo, sobra una hoja de estilos, un módulo está vacío, falta una librería, los datos están cortados o no son los registrados, la plantilla no trae su marcador o se le pasa un argumento desconocido.

```
python3 04_pruebas/prueba_construccion.py
```

## Prueba del servidor del SIA

`prueba_servidor_sia.js` sirve el sitio desde `/priorizacion-reforestacion/` con la política de seguridad de contenido que declara `08_entrega_sia/nginx_priorizacion_reforestacion.conf.ejemplo` (la lee de ese archivo, para que no diverjan) y comprueba: que la dirección sin barra final redirige y carga; que trece funciones (cifras, barras, leyenda, tramos, ficha, mapas de fondo, espacios para plantar, Excel, Excel grande, PDF, ayuda, Mi ubicación) trabajan con **cero violaciones** de la política; que ni la página ni el programa traen estilos en línea; que las librerías se piden con huella; que una sesión vencida (respuesta 401, o la página de acceso con código 200) se dice como tal al cargar y al pedir un Excel o una ficha, y que los datos cargan aunque un intermediario los entregue descomprimidos. Del bloque «Fase 2» del ejemplo de nginx revisa, con la regla de nginx (exacta y después prefijo más largo), qué ubicación atiende cada dirección: la herramienta con `auth_request`; la pantalla de acceso (`/priorizacion-reforestacion/acceso/`) y la API (`/priorizacion-reforestacion/api/`, que llega al módulo en `/api/priorizacion-reforestacion/`) sin él; y que el módulo, `empaquetar.py`, la herramienta y las páginas de acceso usan las mismas direcciones, todas bajo la ruta de la cookie.

```
node 04_pruebas/prueba_servidor_sia.js
```

No sustituye la validación en el nginx real del SIA: el servidor de la prueba es de Node y solo reproduce las cabeceras.

## Entrada y orientación

`prueba_orientacion.js` comprueba que la primera visita pregunta el territorio y la siguiente abre en la última alcaldía consultada, que un enlace compartido no pregunta, que hay tres pestañas (la del listado se fundió en «Dónde empezar»), que «Dónde empezar» lista las colonias en el orden elegido (y coincide con un recálculo propio), que no depende de las casillas de capas, que ofrece las calles de la alcaldía con su desglose por prioridad y las alcaldías de la ciudad de diez en diez, que su campo filtra las calles por nombre, que elegir una colonia pasa a sus calles y elegir una calle muestra sus tramos arriba de la lista, que con una avenida da las alcaldías que cruza, que el nombre del lugar no se repite en el Resumen, que el panel de capas empieza cerrado con la leyenda compacta, que «Quién atiende» y el aviso de asignación preliminar están en el panel de capas y que no hay botón «Compartir»: la consulta queda en la dirección.

Las demás pruebas parten de «toda la ciudad» (`L.sinEntrada`) y leen las cifras en la pestaña Resumen; `L.estado` lee la lista de «Dónde empezar» (`#ini-list`, con su título, su conteo y el filtro `#q`).

```
node 04_pruebas/prueba_orientacion.js
```

## Cepas de cualquier prioridad y columnas de espacios para plantar

`prueba_cepas_total.js` revisa lo que agregó la v1.25. En «Dónde empezar», cada orden por cepas vacantes tiene dos opciones: «(prioritarias)», que cuenta solo las cepas de los frentes o tramos prioritarios (el de siempre), y «(todas)», que cuenta las de todos los frentes o tramos del ámbito, de cualquier prioridad, con los filtros de banqueta y «Espacio». Con decodificadores propios lee `data.bin`, `vp.bin`, `espacios_frentes.bin` y `espacios_vp.bin` y compara con un recálculo propio: las colonias de Tláhuac (todas) y de la ciudad, las calles de Tláhuac y de una colonia y las avenidas de Iztapalapa (todas) y de la ciudad, también con «Con banqueta» y con «Tocón»; que aparece lo que no tiene km prioritarios pero sí cepas («0 km de frente prioritario»); los ceros al final; la nota del corte; la carga diferida con aviso, su falla y el reintento; y que la avenida 5 de Mayo (128 cepas en partes no prioritarias) sale en su lugar con «(todas)» y al final con «(prioritarias)». En las descargas revisa las columnas `cepas_vacantes`, `tocones` y `arboles_muertos`, al final: en el Excel de frentes de una colonia y de la calle consultada, frente por frente y en total; en el de tramos de Iztapalapa, parte por parte; en los resúmenes por calle (Tláhuac) y por avenida (Iztapalapa), como suma de todos sus frentes o partes; el Diccionario (cada columna, fuente, corte y regla de asignación); el GeoJSON y el KML. Con el inventario bloqueado, el Excel y el GeoJSON salen sin esas columnas y lo dicen, y la pantalla lo avisa. En un celular de 390 px, las etiquetas de cepas caben enteras en el selector. Por último compara con la versión anterior tomada de Git (`REF_ANTERIOR`, por omisión el commit de la v1.24, `0eed690`; `REF_ANTERIOR=no` lo omite): pantalla, cifras, los órdenes que ya existían (listas completas) y, sin las tres columnas nuevas, los Excel y el GeoJSON, iguales. Imprime las cinco colonias y avenidas con más cepas vacantes de cualquier prioridad.

```
node 04_pruebas/prueba_cepas_total.js
```

## Descargas para abrir en un mapa

`prueba_mapa_descargas.js` descarga el GeoJSON y el KML de una colonia, de una alcaldía grande y de las vialidades primarias, y comprueba: que son válidos (JSON y XML bien formados, líneas con coordenadas dentro de la ciudad), que traen tantas líneas como frentes prioritarios dice la pantalla y que sus longitudes suman los mismos kilómetros, que declaran fuentes, asignación preliminar y versión, y que en teléfono no se entrega el archivo de una alcaldía grande.

```
node 04_pruebas/prueba_mapa_descargas.js
```

## Espacios para plantar

`prueba_inventario_espacios.js` revisa la capa del inventario de arbolado (cepas vacantes, tocones y árboles muertos), que va encima del modelo sin cambiar ninguna cifra. Con un decodificador propio lee `docs/datos/inventario/*.bin` y compara los puntos por tipo y por alcaldía con las cifras de control (`02_fuente/datos/inventario/RESUMEN.json` y `config.js`); recalcula con la geometría publicada que cada punto con frente esté a 20 m o menos de él y que los que quedaron sin frente no tengan ninguno cerca. Si el CSV del inventario está en el equipo (variable `INVENTARIO_ARBOLADO_CSV` o `../adopta-un-arbol/00_insumos/arbolado/arbolado_cdmx_sep.csv`), recuenta desde él los tipos y los registros por alcaldía y comprueba que es el mismo con que se generaron los datos; si no está, esa parte se omite con un aviso. En el navegador comprueba que la capa no se dibuja ni se descarga de lejos y sí al acercar en Iztapalapa (desde el zoom 16 en modo ligero; 15 en modo completo), las casillas, la ficha de una cepa al tocarla sobre su frente, el teclado, el avance de la alcaldía y el celular de 390 px.

```
node 04_pruebas/prueba_inventario_espacios.js
```

## Filtro «Espacio»

`prueba_filtro_espacio.js` revisa la fila «Espacio» de la consulta, que deja solo los frentes de las alcaldías con al menos un punto del inventario de arbolado de los tipos elegidos. Con un decodificador propio lee `docs/datos/inventario/espacios_frentes.bin`, compara los frentes con cada tipo con las cifras de control de `RESUMEN.json` y los tipos de cada frente con un recálculo desde los puntos de `inv_<cve>.bin`. En el navegador recorre con las casillas las siete combinaciones en Tláhuac y abre Iztapalapa desde la dirección (`e=cv`, `e=to`, `e=am`, `e=cv,to,am`, también con `b=con`), y compara cifra, etiqueta y resumen del mapa con un recálculo propio (frentes prioritarios a cargo de la alcaldía con al menos un punto de esos tipos). Comprueba que al apagar todo la página queda exactamente como antes; «Dónde empezar»; el Excel, el GeoJSON, el KML y la ficha de una colonia con «Cepa vacante» (solo esos frentes, y lo declaran) y el Excel sin filtro; códigos desconocidos en `e=`; «Reiniciar»; Gobierno Central y las dos redes; el aviso del inventario en curso; el teclado; y en un celular de 390 px, casillas que caben sin cortarse, de 44 px, con `aria-pressed` y etiqueta de grupo. Desde la v1.23 el mismo archivo trae cuántos puntos de cada tipo tiene cada frente (formato 2): la prueba compara esos conteos con el recálculo desde los puntos y con las cifras de control (`puntos_por_tipo` de `RESUMEN.json` y de `config.js`), y revisa el orden «más cepas vacantes» de «Dónde empezar»: que el archivo se pide solo al elegirlo, con un aviso mientras llega y la lista anterior intacta (sin cifras falsas), y con un mensaje si no llega; las colonias de Tláhuac (todas) y de la ciudad (las 10 primeras y el número), también con «Con banqueta» y con el filtro «Tocón», y las calles de la alcaldía y de una colonia, contra un recálculo propio desde `espacios_frentes.bin` y `data.bin` (cepas vacantes de los frentes prioritarios a cargo de la alcaldía; con el mismo número, por km prioritarios); el número de cada renglón («48 cepas vacantes», «1 cepa vacante»); las de 0 al final con «sin cepas registradas»; la nota del corte solo con ese orden; que con Gobierno Central y en el archivo único no se ofrece; y en un celular de 390 px, la nota plegada y la lista sin desborde. Al final imprime las cifras de control, los km prioritarios de Tláhuac e Iztapalapa con cada filtro y las cinco colonias con más cepas vacantes de la ciudad y de Tláhuac.

```
node 04_pruebas/prueba_filtro_espacio.js
```

Desde la v1.24, con Gobierno Central la fila «Espacio» se ve y el filtro aplica a las vialidades primarias; con Gobierno Central «Mostrar» ofrece «Avenidas con más cepas vacantes» y no el orden de colonias. Eso lo revisa la prueba siguiente.

## Filtro «Espacio» y orden por cepas del Gobierno Central

`prueba_espacio_gobierno_central.js` revisa el filtro «Espacio» y el orden por cepas vacantes en las vialidades primarias (v1.24). La regla: un punto del inventario en un frente de manzana a cargo del Gobierno Central cuenta para la parte de vialidad de ese frente; un punto sin frente, para la parte cuyo eje esté a 25 m o menos, la más cercana (camellón); los de los frentes de las alcaldías no se mueven. Con decodificadores propios lee `inv_<cve>.bin` (formato 2, con la parte de vialidad de los puntos del camellón), `espacios_vp.bin`, `data.bin` y `vp.bin`, y compara los puntos de cada tipo de cada parte con un recálculo con esa regla y con las cifras de control de `RESUMEN.json` y `config.js`; con una rejilla propia de segmentos comprueba que cada punto del camellón está a 25 m o menos de su parte y que es la más cercana, y que los demás puntos sin frente no tienen ninguna a 25 m. En el navegador abre la ciudad con `r=gc&e=…` en las ocho combinaciones y recorre con las casillas las siete en Iztapalapa: km de vialidad prioritaria, tramos prioritarios, barras, etiqueta, resumen del mapa, nota, aviso del inventario en curso y `e=` en la dirección contra un recálculo propio; al apagar, todo como antes. Con «Cepa vacante», el Excel de tramos (solo esas partes; tramos y km iguales a la pantalla; nombre, ámbito y renglón «Filtro «Espacio»» con la regla y el corte), el Excel de avenidas, el GeoJSON, el KML, la ficha de vialidades y la de una avenida. Revisa «Avenidas con más cepas vacantes» (Iztapalapa completa y la ciudad, también con «Tocón»: número en el renglón, ceros al final con «sin cepas registradas», nota del corte, carga diferida con aviso, falla y reintento), la ficha de un tramo con sus conteos (aunque el archivo llegue después de abrirla) y la de un punto del camellón, las dos redes (cifras y GeoJSON), «Reiniciar» y el celular de 390 px. Por último compara con la versión anterior, que toma de Git (`REF_ANTERIOR`, por omisión el commit de la v1.23; `REF_ANTERIOR=no` lo omite): los puntos del inventario conservan su frente; con el filtro apagado, pantalla, listas, Excel, GeoJSON y ficha iguales; con «Alcaldías», el filtro y el orden por cepas (listas completas) y el Excel de frentes, iguales. Al final imprime las cifras de control, los km y tramos prioritarios del Gobierno Central de la ciudad y de Iztapalapa con cada filtro y las cinco avenidas con más cepas vacantes. Unos 8 minutos.

```
node 04_pruebas/prueba_espacio_gobierno_central.js
```
