# Pruebas

Seis pruebas automáticas. Todas terminan con error si algo falla; después de cualquier cambio se corren las seis.

| Prueba | Qué cuida | Duración aproximada sin tarjeta gráfica |
|---|---|---|
| `prueba_sitio.js` | Flujos principales en escritorio y teléfono | 5 min |
| `prueba_coherencia_cifras.js` | Que pantalla, Excel y fichas digan lo mismo que los datos | 15 min |
| `prueba_sin_terceros.js` | Que el sitio y el archivo único arranquen y trabajen sin pedir nada a otros dominios | 2 min |
| `prueba_robustez.js` | Lo que ve la persona cuando algo falla | 5 min |
| `prueba_telefono_y_sin_conexion.js` | GPS impreciso, Excel grandes, teléfono en horizontal y uso sin conexión | 12 min |
| `prueba_accesibilidad.js` | Marcado, anuncios, foco, teclado, contraste de controles, objetivos táctiles, letra, impresión y propiedades de PDF y Excel | 6 min |

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

`prueba_sin_terceros.js` carga el sitio con **todos los dominios externos bloqueados** y verifica que arranque, que no haga ninguna solicitud fuera de su origen, que las tipografías Cabin y Roboto vengan de `docs/fuentes/` y que el primer contenido aparezca en menos de 3 segundos. Después abre `_local/calles_prioritarias.html` como archivo, con todo dominio externo bloqueado, y verifica que arranca y que entrega un Excel y una ficha PDF con las librerías incrustadas.

```
node 04_pruebas/prueba_sin_terceros.js
```

## Prueba de errores y robustez

`prueba_robustez.js` provoca fallas y comprueba lo que ve la persona: datos cortados o dañados, archivo de datos inexistente, `app.js` o el componente del mapa que no llegan, un catálogo con marcado HTML, tres clics seguidos en una descarga, Atrás y Adelante del navegador, enlaces con la consulta en la dirección, atribución del mapa de fondo con una tarjeta abierta, el buscador con abreviaturas y el CSV de respaldo.

```
node 04_pruebas/prueba_robustez.js
```

Las pruebas abren la página con `?modo=ligero#nomap`. `#nomap` evita redibujar el mapa para que corran rápido sin tarjeta gráfica y **solo tiene efecto cuando la prueba define `window.SIA_PRUEBA`** (lo hace `lib_pruebas.js`); en el sitio publicado no hace nada.

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

Requiere la utilidad `unzip`. Cada corrección de la auditoría de accesibilidad queda así como comprobación automática (H-076). **No sustituye** la lectura con un lector de pantalla real ni una revisión con una herramienta como axe.
