# Incorporar la capa «calles-cdmx 1.0.0» al modelo · análisis de impacto

26 de octubre de 2026. Análisis en solo lectura: no cambia ningún dato ni ningún archivo de la herramienta.

- **Capa:** `Páginas web/calles-cdmx/salidas/entrega/calles-cdmx-1.0.0/datos/calles_cdmx.gpkg`, 178,771 tramos.
- **Frentes:** los 372,534 de `03_procesamiento_datos/intermedios/frentes.npz`.
- **Quién atiende hoy:** el cruce actual con las vialidades primarias, `intermedios/cruce.npz`.
- **Scripts y salida completa:** en esta carpeta (`cruce_calles.py`, `diag.py`, `impacto.py`, `impacto.txt`).

## En corto

1. **Los frentes y la capa se entienden bien.** El 97 % de los km de frente que dan a una calle encuentra su tramo, y en el 95.8 % de esos frentes el nombre coincide.
2. **Lo que más cambia es quién atiende.** Con el campo `atiende` de la capa, el Gobierno Central baja de 2,082 a 1,684 km de frente. Casi todo lo que sale, 285 km, son calles **secundarias** que la regla actual del cruce marcaba como Gobierno Central por estar a 18 m o menos de una primaria. Esa regla sigue «pendiente de validación»; la capa usa la red legal (acuerdo de 2024 y SEMOVI).
3. **Los nombres cambian de escritura, no de calle.** Solo el 10 % queda idéntico, porque la capa agrega el tipo («Hidalgo» → «Calle Hidalgo») y corrige acentos. Pero son la misma calle en el 95.8 %.
4. **Recomendación para la prioridad:** que el **frente** siga siendo la unidad que lleva la prioridad, porque es la unidad del modelo del SIA, y que cada frente se ligue a su tramo con la `clave`. Así no se pierde nada y las cifras se mantienen. Del tramo se toman su nombre, quién lo atiende, su red vial y entre qué calles va.

## 1. Cómo se cruzaron

A cada frente se le busca el tramo de calle que tiene enfrente:
- desde el punto medio del frente, a 40 m o menos;
- con el mismo rumbo: 30° o menos de diferencia;
- si el nombre coincide, vale hasta 40 m; si no coincide, solo hasta 20 m. Entre los candidatos, el nombre pesa como 15 m de cercanía.

Los frentes quedan a 4 m de su tramo en la mediana, y el 90 % a 12 m o menos.

| | Frentes | Km de frente | Km prioritarios |
|---|---:|---:|---:|
| Con tramo | 302,379 | 23,261.3 | — |
| Sin tramo, tipo «Rasgo» | 47,207 | 1,805.3 | 972.5 |
| Sin tramo, los demás | 22,948 | 679.0 (2.9 %) | 355.5 |

Los km prioritarios de esta tabla usan la prioridad propia de cada frente, la del modelo del SIA.

- **«Rasgo»:** son 55,282 frentes y 2,081 km. Son lados de manzana que dan a un parque, barranca, río o vía de tren: no hay calle enfrente. Aun así, el modelo les dio prioridad: los que se quedan sin tramo suman **972.5 km prioritarios**. Por eso conviene que la prioridad no dependa de que haya un tramo.
- **Los demás sin tramo:** son sobre todo cerradas y privadas cortas (19 m en la mediana) que el INEGI 2025 no trae o trae en otro trazo.

## 2. Quién atiende: hoy contra la capa nueva

Hoy, Gobierno Central sale del cruce con `PRIMARIAS_REFORESTACION.shp`. Con la capa, sale de `atiende` = «Gobierno de CDMX».

| Caso | Frentes | Km de frente | Km prioritarios |
|---|---:|---:|---:|
| Gobierno Central hoy y con la capa | 15,731 | 1,665.9 | 955.4 |
| Gobierno Central hoy → alcaldía con la capa | 2,338 | 289.7 | 157.1 |
| Gobierno Central hoy, sin tramo | 1,342 | 126.4 | 73.8 |
| Alcaldía hoy → Gobierno de CDMX con la capa | 301 | 18.3 | 11.4 |
| Alcaldía hoy → Gobierno Federal o concesión | 346 | 80.9 | 43.9 |
| Alcaldía hoy y con la capa | 283,663 | 21,206.4 | 15,093.7 |
| Alcaldía hoy, sin tramo | 68,813 | 2,357.8 | 1,260.2 |

- **Los que pasan de Gobierno Central a alcaldía** son casi todos secundarias (284.9 km de los 289.7) en Iztapalapa, Gustavo A. Madero, Álvaro Obregón, Miguel Hidalgo, Coyoacán y Venustiano Carranza.
- **Un caso nuevo, «Gobierno Federal»:** 344 frentes, 81 km. Hoy la herramienta solo distingue alcaldía y Gobierno Central.

Los km prioritarios de esta tabla usan la prioridad que muestra hoy la herramienta (`prioFr`): la del frente, o la de su vialidad primaria si es de Gobierno Central.

## 3. Nombres

Se compararon los 294,304 frentes con tramo, sin contar los «Rasgo»:

| Qué | % |
|---|---:|
| Nombre idéntico, sin acentos ni mayúsculas | 10.1 % |
| La misma calle (coinciden las palabras del nombre) | 95.8 % |

- **Cambios típicos:** «Hidalgo» → «Calle Hidalgo»; «6 Sur (ángel Urraza)» → «Eje 6 Sur (Ángel Urraza)»; «Rosas de Navidad» → «Privada Rosas de Navidad».
- **El 4 % distinto:**
  - frentes de 2020 sin nombre («Sin Referencia», «5») que ahora lo tienen («Calle 5»);
  - calles que cambiaron de nombre o de trazo entre el INEGI 2020 y el de 2025;
  - unos pocos cruces dudosos en andadores y cerradas pegadas.

  Se puede revisar con la muestra de `impacto.txt`.

## 4. Cómo llevar la prioridad de los frentes a la capa de calles

Un tramo tiene acera de los dos lados, y cada acera tiene sus frentes con su propia prioridad.
- 156,475 tramos tienen al menos un frente (89.6 % de los km de calle).
- 107,405 tramos tienen frentes de los dos lados, y 49,070 de un solo lado.
- En los tramos de alcaldía con los dos lados, el **6.1 %** tiene un lado prioritario y el otro no.

Se probaron tres caminos:

### A. El frente sigue siendo la unidad, ligado a su tramo (recomendado)

Cada frente guarda la `clave` de su tramo, y la prioridad no se mueve.
- **Cifras:** la herramienta sigue contando km de acera, igual que hoy.
- **Lo que gana:** el tramo da nombre homologado, «entre X y Y», red vial y quién atiende.
- **Para un resumen por calle:** se suma «por acera», cada lado con su prioridad. Así da **15,246.5 km** de acera prioritarios, contra 15,294.7 km de hoy en esos mismos tramos: prácticamente lo mismo.
- **Sin pérdida:** no se pierden los 1,328 km prioritarios de frentes sin tramo («Rasgo» y los demás). Siguen como frentes, con su nombre de 2020.

### B. El tramo es la unidad, con una sola prioridad

Se le pone a cada tramo una prioridad sacada de sus frentes. En tramos de alcaldía:

| Regla | Tramos prioritarios | Km de calle prioritarios | Muy Alta | Alta | Media |
|---|---:|---:|---:|---:|---:|
| La mayor de sus frentes | 111,807 | 8,903.6 | 3,408.9 | 1,925.7 | 3,568.9 |
| La de más km de frente | 107,761 | 8,482.2 | 2,839.6 | 1,918.8 | 3,723.8 |
| Promedio redondeado | 107,975 | 8,490.2 | 2,854.9 | 1,983.0 | 3,652.3 |

- **Pros:** el mapa queda más limpio (una línea por calle) y los km se vuelven «km de calle». Se parecen a lo que entiende una alcaldía.
- **Contras:**
  - Todas las cifras cambian, de unos 15,300 a unos 8,500–8,900 km.
  - El 6.1 % de los tramos queda con una prioridad que no es la de una de sus aceras.
  - Los 1,328 km prioritarios de frentes sin tramo («Rasgo» y sin calle) desaparecen.
  - Además, se reescriben `data.bin`, el mapa, las fichas, el Excel y las pruebas.

### C. El tramo es la unidad, con prioridad por lado

Como B, pero con dos prioridades por tramo, una por acera. Da los mismos km que A (15,246.5) sin perder ningún lado. Pero sigue perdiendo los «Rasgo» y los frentes sin tramo, y obliga a dibujar cada calle dos veces, una por acera. En la práctica es A con más trabajo.

**Por qué A:** la prioridad la calculó el SIA por frente de manzana, y A no la toca. A solo cambia lo que la capa de calles hace mejor: el nombre, quién atiende y dónde está la calle.

## 5. Gobierno de CDMX: la prioridad de las vialidades primarias

Hoy, los frentes de Gobierno Central toman la prioridad de su vialidad primaria (`ref_sedema` de `PRIMARIAS_REFORESTACION.shp`, desde la v1.37). Con la capa nueva:

| Tramos «Gobierno de CDMX» | Tramos | Km de calle |
|---|---:|---:|
| Total | 13,931 | 1,731.0 |
| Con prioridad de la capa de primarias (a 20 m o menos) | 12,549 | 1,178.8 |
| Sin primaria priorizada cerca | 1,382 | 552.1 |

- **Los 552 km sin prioridad:** 1,126 tramos son «carretera o camino», los caminos estatales rurales que la capa asigna al Gobierno de CDMX. Los otros 256 son primarias que la capa de reforestación no traía. **Hoy no tienen prioridad de nadie.**
- **Al revés:** de los 2,266.6 km de la capa de primarias priorizadas, 1,963.2 km quedan junto a un tramo de Gobierno de CDMX. El resto ya no es Gobierno de CDMX en la capa nueva: es secundaria, federal o no tiene calle del INEGI.
- **Dos prioridades distintas:** en los tramos que tienen las dos (la de las primarias y la de sus frentes), coinciden en prioritario o no prioritario solo el **77.7 %**. Por eso hay que seguir usando una de las dos, como hoy: la de las primarias.

## 6. Qué tocaría en la herramienta (con el camino A)

| Parte | Cambio |
|---|---|
| `03_procesamiento_datos/` | Un paso nuevo que reemplaza el cruce del paso 3: frente → tramo (este análisis, afinado). Gobierno Central sale de `atiende`, no de la regla de 18 y 60 m |
| `vp.bin` | Se arma desde los tramos «Gobierno de CDMX» de la capa, con la prioridad de `PRIMARIAS_REFORESTACION` llevada a cada tramo |
| `meta.bin` (`names`) | Nombres homologados de la capa; los frentes sin tramo conservan el de 2020 |
| Buscador | Encontrar por el nombre nuevo y también por el anterior («Hidalgo» y «Calle Hidalgo») |
| Ficha y ficha PDF | «Entre X y Y», red vial y tipo de vía |
| «Quién atiende» | Decidir qué se hace con Gobierno Federal (81 km de frente) |
| Cifras | Cambian todas las de Gobierno Central y de las alcaldías afectadas: `SUMAS.json`, `verificar_datos.py`, `prueba_coherencia_cifras.js` y textos de «Cómo funciona» que describen la regla del cruce |
| Capas de GeoServer (paso 5) | Campo nuevo `clave_tramo` en los frentes; las vialidades primarias pasan a ser tramos de la capa |
| Documentos | `CONTRATO_DE_DATOS.md`, `capas_geograficas.md`, `03_procesamiento_datos/LEEME.md` y la cita obligatoria de la capa (CC BY 4.0) |
| Insumo | Copia del GeoPackage 1.0.0 en `insumos/`, con su huella en `SUMAS_INSUMOS.md`; cuando el SIA la instale, tomarla de `territorio.calles` |

## 7. Decisiones que tiene que tomar Liber

1. **Unidad de la prioridad:** frente ligado a su tramo (A, recomendado) o tramo (B o C).
2. **Los 552 km de Gobierno de CDMX sin prioridad:**
   - opción 1: sin prioridad;
   - opción 2: con la prioridad de sus frentes del modelo del SIA;
   - opción 3: pedirle la prioridad a quien hizo la capa de reforestación.
3. **Gobierno Federal y concesión:**
   - opción 1: una tercera red en «Quién atiende»;
   - opción 2: dejarlos con la alcaldía;
   - opción 3: dejarlos fuera.
4. **Qué versión es:** el cambio mueve todas las cifras de Gobierno Central; conviene avisarlo como versión mayor en la nota de la herramienta.
