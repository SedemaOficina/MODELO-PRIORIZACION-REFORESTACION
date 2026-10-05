# Pruebas

Una sola orden corre todo y termina con código 0 solo si todo pasó:

```
node 04_pruebas/correr_todas.js            todo: unos 12 minutos sin tarjeta gráfica
node 04_pruebas/correr_todas.js rapidas    datos, construcción y revisión estática: menos de un minuto
```

Preparación, una sola vez: Node 18 o posterior, Python 3 y `npm install` en la raíz (instala las versiones fijadas en `package.json`: Playwright 1.56.0 y ESLint 9.37.0), y `npx playwright install chromium`. La prueba de coherencia requiere además `openpyxl` y `pdftotext`.

**En Windows** (desde la v17.31): las pruebas llaman a Python como `python` (en Windows `python3` es un acceso directo a la tienda) y ya no se parten con rutas que llevan espacios. `pdftotext` viene con Git para Windows (`C:\Program Files\Git\mingw64\bin`); las pruebas le piden `-enc UTF-8`, porque en Windows entrega por omisión la codificación del sistema. `correr_todas.js` cuenta como falla una verificación que no pudo correr (por ejemplo, ESLint sin `npm install`): lo que no se revisó no se da por aprobado. Las órdenes de `package.json` que corren Python pasan por `04_pruebas/py.js`, que elige el nombre correcto en cada sistema.

| Verificación | Qué cuida | Duración aproximada |
|---|---|---|
| `03_procesamiento_datos/verificar_datos.py` | Que los datos sean los registrados y cuadren entre sí | 10 s |
| `prueba_construccion.py` | Que `construir.py` dé el mismo sitio desde cero y se detenga sin escribir si falta o sobra una pieza | 30 s |
| ESLint (`npm run lint`) | Variables sin definir o sin usar en `docs/app.js` | 5 s |
| `prueba_sin_terceros.js` | Que el sitio, el archivo único y la instalación en una subruta trabajen sin pedir nada a otros dominios | 2 min |
| `prueba_sitio.js` | Flujos principales en escritorio y teléfono | 6 min |
| `prueba_robustez.js` | Lo que ve la persona cuando algo falla | 1 min |
| `prueba_coherencia_cifras.js` | Que pantalla, Excel y fichas digan lo mismo que un recálculo independiente desde los datos | 2 min |
| `prueba_accesibilidad.js` | Marcado, anuncios, foco, teclado, contraste, objetivos táctiles, letra, impresión y propiedades de PDF y Excel | 1 min |
| `prueba_servidor_sia.js` | Instalada en `/calles-prioritarias/` con la política de seguridad de contenido del ejemplo de nginx y sus reglas de caché (la página, también con `?v=` de avenida, se revalida siempre; lo que lleva huella se guarda un año): cero violaciones, sesión vencida, datos descomprimidos por un intermediario | 2 min |
| `prueba_telefono_y_sin_conexion.js` | GPS impreciso, Excel grandes, teléfono en horizontal y uso sin conexión | 2 min |
| `prueba_orientacion.js` | Entrada por territorio, pestaña «Dónde empezar», capas cerradas con leyenda compacta, «Quién atiende» en capas y «Compartir» | 1 min |
| `prueba_casos_limite.js` | Casos de la revisión del 5 oct 2026: avenida con una alcaldía que no cruza, Atrás tras cambiar de red, colonias homónimas en archivos, mapa de una colonia con las dos redes y doble clic | 1 min |
| `prueba_mapa_descargas.js` | KML y GeoJSON de las calles prioritarias: validez, mismos registros que la pantalla, límites en teléfono | 1 min |

**Qué compara cifras.** La prueba integral (`prueba_sitio.js`) es un recorrido de controles: confirma que cada flujo responde, no que las cifras sean correctas. Las cifras las vigila `prueba_coherencia_cifras.js`, que abre los Excel y las fichas PDF y los compara con la pantalla y con un recálculo propio desde `docs/datos/*.bin`. Las dos son necesarias.

GitHub puede repetir las tres primeras verificaciones en cada cambio que recibe; la propuesta, sin activar, está en `05_documentacion/verificacion_automatica_github.md`.

## Prueba integral

`prueba_sitio.js` levanta un servidor local sobre `docs/` y recorre en escritorio (1440 × 900) y teléfono (390 × 844) los flujos principales:

- carga sin errores;
- buscador (abreviaturas, alcaldía, colonia);
- listado, Excel de frentes y de tramos, fichas PDF de alcaldía y de colonia;
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

`prueba_coherencia_cifras.js` (usa `lib_pruebas.js`) compara lo que muestra la pantalla con el **contenido** de los Excel y las fichas PDF y con un recálculo independiente desde `docs/datos/*.bin`: colonias con frentes en otra alcaldía (Tecpinco), unidades de la leyenda, tramos por `id_tramo`, avenida acotada a alcaldía y calles homónimas. Desde la v17.15 verifica además el cuadro «Quién atiende» (km de frente por responsable y prioridad), el universo de intervención (Muy Alta, Alta y Media) con sus cifras sin arbolado y con banqueta, la población de ese universo y el desglose de cada calle por prioridad; desde la v17.16, los tramos de la calle consultada (cuadro, Excel y ficha); desde la v17.17, el paso de ubicación de las calles con nombre repetido (alcaldías con conteo, renglones sin cifras) y la búsqueda de calle con su colonia o alcaldía; desde la v17.18, el equivalente en km de frente de las vialidades primarias y la banqueta como condición; desde la v17.19, el nombre único de los frentes sin calle, el identificador y la fecha en los Excel, el punto a media longitud, los frentes sin colonia, el aviso del filtro de la leyenda, las descargas sin registros, las avenidas homónimas y la calle en la ruta de navegación.

```
node 04_pruebas/prueba_coherencia_cifras.js
```

Requiere además Python 3 con `openpyxl` y la utilidad `pdftotext`. Termina con error si alguna cifra no coincide. Si Playwright no encuentra el navegador, indicar su ruta en la variable `PW_CHROME`.

## Prueba de arranque sin terceros

`prueba_sin_terceros.js` carga el sitio con **todos los dominios externos bloqueados** y verifica que arranque, que no haga ninguna solicitud fuera de su origen, que las tipografías Cabin y Roboto vengan de `docs/fuentes/` y que el primer contenido aparezca en menos de 3 segundos. Después abre `_local/calles_prioritarias.html` como archivo, con todo dominio externo bloqueado, y verifica que arranca y que entrega un Excel y una ficha PDF con las librerías incrustadas. Por último sirve el sitio desde la subruta `/calles-prioritarias/`, como se instalará en el SIA, y verifica que no pide nada fuera de ella.

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

Tarda unos 12 minutos sin tarjeta gráfica. Las demás pruebas bloquean el proceso de servicio (`serviceWorkers: 'block'`) para poder intervenir la red; esta lo deja activo en su última sección.

## Prueba de accesibilidad

`prueba_accesibilidad.js` recorre la herramienta con teclado y comprueba: `<title>` y estilos en `<head>`, `<main>` y enlace de salto; anuncio del cambio de ámbito; foco tras elegir en el buscador, al abrir y cerrar la ficha, el panel de capas y la ayuda (fondo inerte); renglones de listado con rol, foco visible y barra espaciadora; ficha de un frente abierta desde un tramo sin usar el puntero; contraste de bordes e indicador de foco; objetivos táctiles en teléfono (44 px en herramientas, pestañas y selector; 38 px en capas); ningún texto por debajo de 12 px ni tamaños en píxeles; impresión; movimiento reducido, e idioma, título y autoría en la ficha PDF y el Excel.

```
node 04_pruebas/prueba_accesibilidad.js
```

Las propiedades del Excel se leen con Python (`zipfile`), sin depender de `unzip`. Cada corrección de la auditoría de accesibilidad queda así como comprobación automática (H-076). **No sustituye** la lectura con un lector de pantalla real ni una revisión con una herramienta como axe.

## Prueba de la construcción

`prueba_construccion.py` trabaja sobre copias en una carpeta temporal y comprueba que `construir.py`: da un sitio idéntico a `docs/` desde cero; no reescribe nada en una segunda corrida; da el mismo sitio con el código fuente en formato de Windows (CRLF); aparta en `_to_delete/` un archivo obsoleto de `docs/`; no publica un archivo imprevisto de `libs/`, y se detiene **sin escribir nada** cuando falta un módulo, sobra una hoja de estilos, un módulo está vacío, falta una librería, los datos están cortados o no son los registrados, la plantilla no trae su marcador o se le pasa un argumento desconocido.

```
python3 04_pruebas/prueba_construccion.py
```

## Prueba del servidor del SIA

`prueba_servidor_sia.js` sirve el sitio desde `/calles-prioritarias/` con la política de seguridad de contenido que declara `08_entrega_sia/nginx_calles_prioritarias.conf.ejemplo` (la lee de ese archivo, para que no diverjan) y comprueba: que la dirección sin barra final redirige y carga; que doce funciones (cifras, barras, leyenda, tramos, ficha, mapas de fondo, Excel, Excel grande, PDF, ayuda, Mi ubicación) trabajan con **cero violaciones** de la política; que ni la página ni el programa traen estilos en línea; que las librerías se piden con huella; que una sesión vencida (respuesta 401, o la página de acceso con código 200) se dice como tal al cargar y al pedir un Excel o una ficha, y que los datos cargan aunque un intermediario los entregue descomprimidos.

```
node 04_pruebas/prueba_servidor_sia.js
```

No sustituye la validación en el nginx real del SIA: el servidor de la prueba es de Node y solo reproduce las cabeceras.

## Entrada y orientación (v17.28)

`prueba_orientacion.js` comprueba que la primera visita pregunta el territorio y la siguiente abre en la última alcaldía consultada, que un enlace compartido no pregunta, que «Dónde empezar» lista las colonias en el orden elegido (y coincide con el listado de colonias que ya existía), que elegir una colonia pasa a sus calles, que el panel de capas empieza cerrado con la leyenda compacta, que «Quién atiende» y el aviso de asignación preliminar están en el panel de capas y que «Compartir» copia la dirección.

Las demás pruebas parten de «toda la ciudad» (`L.sinEntrada`) y leen las cifras en la pestaña Resumen.

```
node 04_pruebas/prueba_orientacion.js
```

## Descargas para abrir en un mapa (v17.29)

`prueba_mapa_descargas.js` descarga el GeoJSON y el KML de una colonia, de una alcaldía grande y de las vialidades primarias, y comprueba: que son válidos (JSON y XML bien formados, líneas con coordenadas dentro de la ciudad), que traen tantas líneas como frentes prioritarios dice la pantalla y que sus longitudes suman los mismos kilómetros, que declaran fuentes, asignación preliminar y versión, y que en teléfono no se entrega el archivo de una alcaldía grande.

```
node 04_pruebas/prueba_mapa_descargas.js
```
