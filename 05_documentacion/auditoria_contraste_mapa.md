# Contraste medido sobre cada fondo real

Mapa de la herramienta «Modelo de priorización de reforestación urbana». Generado con `node herramientas/contraste.mjs --md` (2026-10-17); no editar a mano: si un color cambia en 02_fuente, se vuelve a generar.

Cada par se mide sobre el fondo donde aparece en el mapa. Texto: 4.5:1; líneas, puntos, aros, contornos y foco: 3:1 (WCAG 2.2, criterios 1.4.3 y 1.4.11). La razón se calcula con la luminancia relativa de WCAG 2.2, y herramientas/contraste.mjs la calcula por su lado leyendo los colores de 02_fuente/css y 02_fuente/js. Lo que se dibuja con transparencia (opacidad de la capa, `opPrio`, rellenos con alfa, halos al 92 %) se compone sobre su fondo antes de medir; el hex que se muestra es el color ya compuesto. La opacidad de la prioridad se mide en su valor de inicio (100 %). «Pendiente de decisión» es un par que se exige, que hoy no cumple y que espera la decisión de Liber. «Informativo» es un par que no se exige pero conviene ver; las razones se truncan a dos decimales (4.499 se muestra 4.49).

**253 pares medidos: 188 cumplen, 5 aceptados por decisión, 0 pendientes de decisión y 60 informativos** (193 exigidos).

Ids: MC = colores de texto (4.5:1); MN = no texto (3:1); MI = informativos.

## Lo principal

- Rampa de prioridad (frentes y, con Gobierno Central, vialidades primarias): Muy Baja, Baja y Media no llegan a 3:1 sobre ningún fondo claro (Muy Baja 1.00:1 a 1.22:1; Baja 1.12:1 a 1.60:1; Media 1.81:1 a 2.59:1). Desde el zoom 14 llevan un filete --map-filete de 1 px a cada lado, que contra los fondos da de 3.63:1 a 5.45:1; la línea contra su filete: Muy Baja 4.47:1, Baja 3.39:1 y Media 2.10:1 (Media no llega a 3:1: pendiente de decisión). Por debajo del zoom 14 van sin filete, a propósito, para que a escala de ciudad se lea la rampa. Alta y Muy Alta no llevan filete y cumplen. La prioridad no depende solo del color de la línea: la dicen la leyenda (muestra y nombre), la descripción al pasar el ratón, la ficha del frente y «Dónde empezar». El grosor no la distingue: todos los frentes miden 4 m (de 1 a 6 px), sin importar la clase.
- Nombres del mapa: cumplen sobre suelo, manzana, verde, agua y «Sin fondo», y contra su halo (6.41:1 los de alcaldía y colonia; 11.92:1 los de calle). Sobre los rellenos fuertes y el satélite los sostiene el halo (ver MI).
- Textos (nombres del mapa e interfaz sobre el mapa): todos los textos cumplen. «Seguirme» encendido (4.50:1) queda justo en el mínimo: cualquier cambio de --loc lo tira.
- Inventario: los tres símbolos cumplen contra su contorno blanco sobre todos los fondos y las cinco clases (el más bajo, MN76, 3.83:1). Entre ellos el color casi no los separa (1.49:1, 2.36:1, 1.58:1): los distingue la forma (anillo hueco, círculo lleno, círculo con ×).
- Límites y resaltados (cumplen / medidos): límite de alcaldía 5 de 5; límite de colonia 5 de 5; vialidades primarias en gris 3 de 3; contorno de la colonia o alcaldía elegida 11 de 11 (sobre una franja blanca de 2 px donde cruza las líneas); calle consultada 16 de 16; avenida consultada 2 de 2. El resalte de la calle o avenida consultada va, de fuera hacia dentro, en franja --map-halo, halo --guinda, filete --map-halo y, bajo las clases claras, filete --ink: el halo directo contra una línea Alta vecina daría 1.48:1.

## Tabla

| Id | Primer plano y fondo | Razón | Mínimo | Resultado | Dónde |
|---|---|---|---|---|---|
| MC01 | --map-label #55585A sobre --ground #F4F2EE | 6.41:1 | 4.5:1 | Cumple | Nombres de alcaldía y de colonia sobre su halo (contorno de 2.3 px a 12 px de letra; es lo que los sostiene sobre la rampa, los rellenos y el satélite) |
| MC02 | --map-label #55585A sobre --fondo-calle #FFFFFF | 7.16:1 | 4.5:1 | Cumple | Nombres de alcaldía y de colonia sobre el suelo del fondo «Calles» |
| MC03 | --map-label #55585A sobre --fondo-manzana #E2DED6 | 5.34:1 | 4.5:1 | Cumple | Nombres de alcaldía y de colonia sobre una manzana del fondo «Calles» |
| MC04 | --map-label #55585A sobre --fondo-verde #D9EAD0 | 5.67:1 | 4.5:1 | Cumple | Nombres de alcaldía y de colonia sobre parques, jardines, ANP y AVA |
| MC05 | --map-label #55585A sobre --fondo-agua #BCD7E6 | 4.77:1 | 4.5:1 | Cumple | Nombres de alcaldía y de colonia sobre cuerpos de agua |
| MC06 | --map-label #55585A sobre --ground #F4F2EE | 6.41:1 | 4.5:1 | Cumple | Nombres de alcaldía y de colonia con «Sin fondo» |
| MC07 | --ink al 92 % #35373B sobre halo --map-halo al 92 % sobre --fondo-calle #FFFFFF | 11.92:1 | 4.5:1 | Cumple | Nombre de calle y de vialidad primaria sobre su halo blanco, en el suelo |
| MC08 | --ink al 92 % #333437 sobre --fondo-manzana #E2DED6 | 9.27:1 | 4.5:1 | Cumple | Nombre de calle sobre una manzana (sin contar el halo) |
| MC09 | --ink al 92 % #323537 sobre --fondo-verde #D9EAD0 | 9.78:1 | 4.5:1 | Cumple | Nombre de calle sobre parques, jardines, ANP y AVA (sin contar el halo) |
| MC10 | --ink al 92 % #303439 sobre --fondo-agua #BCD7E6 | 8.35:1 | 4.5:1 | Cumple | Nombre de calle sobre agua (sin contar el halo) |
| MC11 | --ink al 92 % #343639 sobre --ground #F4F2EE | 10.83:1 | 4.5:1 | Cumple | Nombre de calle con «Sin fondo» (sin contar el halo) |
| MC12 | --map-label #55585A sobre --ground #F4F2EE | 6.41:1 | 4.5:1 | Cumple | Satélite: nombres de alcaldía y de colonia sobre su halo opaco (la imagen no se transparenta en el halo) |
| MC13 | --ink al 92 % #232529 sobre halo --map-halo al 92 % sobre satélite, extremo oscuro (negro al 90 % sobre --ground) #EDEDED | 13.11:1 | 4.5:1 | Cumple | Satélite: nombre de calle sobre su halo, que es blanco al 92 % y deja pasar la imagen (peor caso: imagen negra) |
| MC14 | --ink #24262A sobre --panel #FFFFFF | 15.15:1 | 4.5:1 | Cumple | Resumen del mapa (#mapsum): nombre del ámbito |
| MC15 | --ink-3 #666A6D sobre --panel #FFFFFF | 5.45:1 | 4.5:1 | Cumple | Resumen del mapa: rótulo en mayúsculas («Resumen», «Colonia»…) |
| MC16 | --ink #24262A sobre --panel #FFFFFF | 15.15:1 | 4.5:1 | Cumple | Resumen del mapa: cifras |
| MC17 | --ink-2 #55585A sobre --panel #FFFFFF | 7.16:1 | 4.5:1 | Cumple | Resumen del mapa: texto bajo las cifras |
| MC18 | --ink-3 #666A6D sobre --panel #FFFFFF | 5.45:1 | 4.5:1 | Cumple | Panel de capas: título «Capas y prioridad» |
| MC19 | --ink-2 #55585A sobre --panel #FFFFFF | 7.16:1 | 4.5:1 | Cumple | Panel de capas: rótulos de sección («Ver en el mapa», «Mapa de fondo»…) |
| MC20 | --ink-2 #55585A sobre --panel #FFFFFF | 7.16:1 | 4.5:1 | Cumple | Panel de capas: notas |
| MC21 | --ink #24262A sobre --panel #FFFFFF | 15.15:1 | 4.5:1 | Cumple | Leyenda: nombre de cada prioridad (renglón encendido) |
| MC22 | --ink-2 #55585A sobre --panel #FFFFFF | 7.16:1 | 4.5:1 | Cumple | Leyenda: km de cada prioridad |
| MC23 | --ink-3 #666A6D sobre --panel #FFFFFF | 5.45:1 | 4.5:1 | Cumple | Leyenda: nombre de una prioridad apagada (casilla sin marcar; sigue siendo un control que se puede volver a encender) |
| MC24 | --guinda #9D2148 sobre --panel #FFFFFF | 7.65:1 | 4.5:1 | Cumple | Leyenda: aviso «Ninguna prioridad está visible» |
| MC25 | --ink-2 #55585A sobre --panel #FFFFFF | 7.16:1 | 4.5:1 | Cumple | Panel de capas: píldoras sin marcar (Alcaldías, Colonias, Calles; Sin fondo, Calles, Satélite) |
| MC26 | --guinda-ink #7E1A3A sobre --dorado-soft #EBDDC6 | 7.48:1 | 4.5:1 | Cumple | Panel de capas: píldora marcada |
| MC27 | --ink #24262A sobre --panel #FFFFFF | 15.15:1 | 4.5:1 | Cumple | Espacios para plantar: nombre de cada casilla |
| MC28 | --ink-2 #55585A sobre --panel #FFFFFF | 7.16:1 | 4.5:1 | Cumple | Espacios para plantar: conteo de cada casilla |
| MC29 | --ink-2 #55585A sobre --panel #FFFFFF | 7.16:1 | 4.5:1 | Cumple | Leyenda compacta: «Muy Alta» y «Muy Baja» |
| MC30 | --ink #24262A sobre --panel #FFFFFF | 15.15:1 | 4.5:1 | Cumple | Ficha (#card): título y valores |
| MC31 | --ink-2 #55585A sobre --panel #FFFFFF | 7.16:1 | 4.5:1 | Cumple | Ficha: subtítulo |
| MC32 | --ink-3 #666A6D sobre --panel #FFFFFF | 5.45:1 | 4.5:1 | Cumple | Ficha: etiquetas grises de cada dato (dt) |
| MC33 | --ink-3 #666A6D sobre --panel #FFFFFF | 5.45:1 | 4.5:1 | Cumple | Ficha: aclaraciones pequeñas junto a un valor |
| MC34 | --ink #24262A sobre --panel-2 #F8F6F2 | 14.04:1 | 4.5:1 | Cumple | Ficha: píldora de prioridad («PRIORIDAD MUY ALTA») |
| MC35 | --ink-3 #666A6D sobre --panel #FFFFFF | 5.45:1 | 4.5:1 | Cumple | Ficha: nota al pie |
| MC36 | --ink-2 #55585A sobre --panel-2 #F8F6F2 | 6.64:1 | 4.5:1 | Cumple | Ficha: nota destacada (fondo gris) |
| MC37 | --ink-2 #55585A sobre --panel #FFFFFF | 7.16:1 | 4.5:1 | Cumple | Ficha: autoría |
| MC38 | --ink #24262A sobre --panel #FFFFFF | 15.15:1 | 4.5:1 | Cumple | Ficha: botones «Cómo llegar», «Street View»… |
| MC39 | --ink-3 #666A6D sobre --panel #FFFFFF | 5.45:1 | 4.5:1 | Cumple | Ficha: × para cerrar |
| MC40 | --ink-3 #666A6D sobre --panel #FFFFFF | 5.45:1 | 4.5:1 | Cumple | Ficha de Mi ubicación: texto gris de los tramos cercanos |
| MC41 | --loc #1A73E8 sobre --panel #FFFFFF | 4.50:1 | 4.5:1 | Cumple | Ficha de Mi ubicación: «Seguirme» encendido (justo en el mínimo) |
| MC42 | --ink #24262A sobre --panel-2 #F8F6F2 | 14.04:1 | 4.5:1 | Cumple | Ficha de Mi ubicación: «Estás en…» |
| MC43 | --ink-2 #55585A sobre --panel al 80 % al 80 % sobre --ground #FDFCFC | 6.99:1 | 4.5:1 | Cumple | Crédito (#attrib) con «Sin fondo», y su enlace (hereda el color, subrayado) |
| MC44 | --ink-2 #55585A sobre --panel al 80 % al 80 % sobre satélite, extremo oscuro (negro al 90 % sobre --ground) #D1D1D1 | 4.69:1 | 4.5:1 | Cumple | Crédito del satélite y su enlace «Esri» (peor caso: imagen negra bajo el fondo translúcido) |
| MC45 | --ink-2 #55585A sobre --panel #FFFFFF | 7.16:1 | 4.5:1 | Cumple | Etiqueta «Modo ligero» |
| MC46 | #fff #FFFFFF sobre --ink #24262A | 15.15:1 | 4.5:1 | Cumple | Aviso «Dibujando calles…» |
| MC47 | --ink-2 #55585A sobre --panel #FFFFFF | 7.16:1 | 4.5:1 | Cumple | Avisos sobre el mapa (modo ligero y errores): texto |
| MC48 | --ink #24262A sobre --panel #FFFFFF | 15.15:1 | 4.5:1 | Cumple | Avisos sobre el mapa: texto en negritas |
| MC49 | --guinda #9D2148 sobre --panel #FFFFFF | 7.65:1 | 4.5:1 | Cumple | Aviso de error: botón «Recargar la página» |
| MC50 | --ink-3 #666A6D sobre --panel #FFFFFF | 5.45:1 | 4.5:1 | Cumple | Avisos sobre el mapa: × para cerrar |
| MC51 | --ink-2 #55585A sobre --panel #FFFFFF | 7.16:1 | 4.5:1 | Cumple | Botones del mapa (+, −, ?, casa, capas, Mi ubicación) |
| MC52 | --guinda #9D2148 sobre --panel #FFFFFF | 7.65:1 | 4.5:1 | Cumple | Botones del mapa al pasar el ratón |
| MC53 | --ink-2 #55585A sobre --panel #FFFFFF | 7.16:1 | 4.5:1 | Cumple | Botón para ocultar el panel |
| MC54 | #fff #FFFFFF sobre --guinda #9D2148 | 7.65:1 | 4.5:1 | Cumple | Celular: «Volver a la información» (blanco sobre guinda) |
| MC55 | #fff al 92 % #F7EDF0 sobre --guinda #9D2148 | 6.67:1 | 4.5:1 | Cumple | Celular: lugar consultado bajo «Volver a la información» |
| MC56 | --ink #24262A sobre --panel #FFFFFF | 15.15:1 | 4.5:1 | Cumple | Descripción emergente al pasar el ratón |
| MC57 | --ink-3 #666A6D sobre --panel #FFFFFF | 5.45:1 | 4.5:1 | Cumple | Descripción emergente: texto gris |
| MC58 | --ink-2 #55585A sobre rgba(255,255,255,.88) al 88 % sobre satélite, extremo oscuro (negro al 90 % sobre --ground) #E3E3E3 | 5.58:1 | 4.5:1 | Cumple | Barra de escala: texto (peor caso: satélite negro bajo su fondo translúcido) |
| MC59 | --ink-3 #666A6D sobre --panel #FFFFFF | 5.45:1 | 4.5:1 | Cumple | Leyenda: km de una prioridad apagada |
| MC60 | --ink #24262A sobre --panel #FFFFFF | 15.15:1 | 4.5:1 | Cumple | Filtros «Atiende», «Banqueta» y «Espacio»: texto de un chip sin elegir |
| MC61 | #fff #FFFFFF sobre --guinda #9D2148 | 7.65:1 | 4.5:1 | Cumple | Filtros «Atiende», «Banqueta» y «Espacio»: texto del chip elegido (blanco sobre guinda) |
| MN01 | --p0 Muy Baja #F9E7BF sobre --map-filete #666A6D | 4.47:1 | 3:1 | Cumple | Línea de prioridad Muy Baja (frentes de manzana; también vialidades primarias con Gobierno Central) sobre el suelo del fondo «Calles», desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras») |
| MN02 | --p1 Baja #F4C56E sobre --map-filete #666A6D | 3.39:1 | 3:1 | Cumple | Línea de prioridad Baja (frentes de manzana; también vialidades primarias con Gobierno Central) sobre el suelo del fondo «Calles», desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras») |
| MN03 | --p2 Media #E88A2E sobre --map-filete #666A6D | 2.10:1 | 3:1 | Aceptado | Línea de prioridad Media (frentes de manzana; también vialidades primarias con Gobierno Central) sobre el suelo del fondo «Calles», desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras») |
| MN04 | --p3 Alta #C2421B sobre --fondo-calle #FFFFFF | 5.13:1 | 3:1 | Cumple | Línea de prioridad Alta (frentes de manzana; también vialidades primarias con Gobierno Central) sobre el suelo del fondo «Calles» |
| MN05 | --p4 Muy Alta #7F1D12 sobre --fondo-calle #FFFFFF | 10.06:1 | 3:1 | Cumple | Línea de prioridad Muy Alta (frentes de manzana; también vialidades primarias con Gobierno Central) sobre el suelo del fondo «Calles» |
| MN06 | --p0 Muy Baja #F9E7BF sobre --map-filete #666A6D | 4.47:1 | 3:1 | Cumple | Línea de prioridad Muy Baja (frentes de manzana; también vialidades primarias con Gobierno Central) sobre una manzana del fondo «Calles», desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras») |
| MN07 | --p1 Baja #F4C56E sobre --map-filete #666A6D | 3.39:1 | 3:1 | Cumple | Línea de prioridad Baja (frentes de manzana; también vialidades primarias con Gobierno Central) sobre una manzana del fondo «Calles», desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras») |
| MN08 | --p2 Media #E88A2E sobre --map-filete #666A6D | 2.10:1 | 3:1 | Aceptado | Línea de prioridad Media (frentes de manzana; también vialidades primarias con Gobierno Central) sobre una manzana del fondo «Calles», desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras») |
| MN09 | --p3 Alta #C2421B sobre --fondo-manzana #E2DED6 | 3.82:1 | 3:1 | Cumple | Línea de prioridad Alta (frentes de manzana; también vialidades primarias con Gobierno Central) sobre una manzana del fondo «Calles» |
| MN10 | --p4 Muy Alta #7F1D12 sobre --fondo-manzana #E2DED6 | 7.50:1 | 3:1 | Cumple | Línea de prioridad Muy Alta (frentes de manzana; también vialidades primarias con Gobierno Central) sobre una manzana del fondo «Calles» |
| MN11 | --p0 Muy Baja #F9E7BF sobre --map-filete #666A6D | 4.47:1 | 3:1 | Cumple | Línea de prioridad Muy Baja (frentes de manzana; también vialidades primarias con Gobierno Central) sobre «Sin fondo», desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras») |
| MN12 | --p1 Baja #F4C56E sobre --map-filete #666A6D | 3.39:1 | 3:1 | Cumple | Línea de prioridad Baja (frentes de manzana; también vialidades primarias con Gobierno Central) sobre «Sin fondo», desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras») |
| MN13 | --p2 Media #E88A2E sobre --map-filete #666A6D | 2.10:1 | 3:1 | Aceptado | Línea de prioridad Media (frentes de manzana; también vialidades primarias con Gobierno Central) sobre «Sin fondo», desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras») |
| MN14 | --p3 Alta #C2421B sobre --ground #F4F2EE | 4.59:1 | 3:1 | Cumple | Línea de prioridad Alta (frentes de manzana; también vialidades primarias con Gobierno Central) sobre «Sin fondo» |
| MN15 | --p4 Muy Alta #7F1D12 sobre --ground #F4F2EE | 9.00:1 | 3:1 | Cumple | Línea de prioridad Muy Alta (frentes de manzana; también vialidades primarias con Gobierno Central) sobre «Sin fondo» |
| MN16 | --p0 Muy Baja #F9E7BF sobre --map-filete #666A6D | 4.47:1 | 3:1 | Cumple | Línea Muy Baja sobre el relleno de colonia que menos contrasta (fondo «Calles», relleno al 14 %), desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras») |
| MN17 | --p1 Baja #F4C56E sobre --map-filete #666A6D | 3.39:1 | 3:1 | Cumple | Línea Baja sobre el relleno de colonia que menos contrasta (fondo «Calles», relleno al 14 %), desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras») |
| MN18 | --p2 Media #E88A2E sobre --map-filete #666A6D | 2.10:1 | 3:1 | Aceptado | Línea Media sobre el relleno de colonia que menos contrasta (fondo «Calles», relleno al 14 %), desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras») |
| MN19 | --p3 Alta #C2421B sobre relleno de colonia --p4 (Muy Alta) al 14 % sobre --fondo-calle #EDE0DE | 3.99:1 | 3:1 | Cumple | Línea Alta sobre el relleno de colonia que menos contrasta (fondo «Calles», relleno al 14 %) |
| MN20 | --p4 Muy Alta #7F1D12 sobre relleno de colonia --p4 (Muy Alta) al 14 % sobre --fondo-calle #EDE0DE | 7.81:1 | 3:1 | Cumple | Línea Muy Alta sobre el relleno de colonia que menos contrasta (fondo «Calles», relleno al 14 %) |
| MN21 | --p0 Muy Baja #F9E7BF sobre --map-filete #666A6D | 4.47:1 | 3:1 | Cumple | Línea Muy Baja sobre el relleno de colonia que menos contrasta («Sin fondo», relleno al 14 %), desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras») |
| MN22 | --p1 Baja #F4C56E sobre --map-filete #666A6D | 3.39:1 | 3:1 | Cumple | Línea Baja sobre el relleno de colonia que menos contrasta («Sin fondo», relleno al 14 %), desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras») |
| MN23 | --p2 Media #E88A2E sobre --map-filete #666A6D | 2.10:1 | 3:1 | Aceptado | Línea Media sobre el relleno de colonia que menos contrasta («Sin fondo», relleno al 14 %), desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras») |
| MN24 | --p3 Alta #C2421B sobre relleno de colonia --p4 (Muy Alta) al 14 % sobre --ground #E4D5D0 | 3.60:1 | 3:1 | Cumple | Línea Alta sobre el relleno de colonia que menos contrasta («Sin fondo», relleno al 14 %) |
| MN25 | --p4 Muy Alta #7F1D12 sobre relleno de colonia --p4 (Muy Alta) al 14 % sobre --ground #E4D5D0 | 7.05:1 | 3:1 | Cumple | Línea Muy Alta sobre el relleno de colonia que menos contrasta («Sin fondo», relleno al 14 %) |
| MN26 | --map-vp al 100 % #666A6D sobre --fondo-calle #FFFFFF | 5.45:1 | 3:1 | Cumple | Vialidades primarias en gris (contexto con «Alcaldías») sobre el suelo |
| MN27 | --map-vp al 100 % #666A6D sobre --fondo-manzana #E2DED6 | 4.06:1 | 3:1 | Cumple | Vialidades primarias en gris (contexto con «Alcaldías») sobre una manzana |
| MN28 | --map-vp al 100 % #666A6D sobre --ground #F4F2EE | 4.88:1 | 3:1 | Cumple | Vialidades primarias en gris (contexto con «Alcaldías») sobre «Sin fondo» |
| MN29 | --map-alc #666A6D sobre --fondo-calle #FFFFFF | 5.45:1 | 3:1 | Cumple | Límite de alcaldía (--map-alc, 1 a 1.5 px) sobre suelo |
| MN30 | --map-alc #666A6D sobre --fondo-manzana #E2DED6 | 4.06:1 | 3:1 | Cumple | Límite de alcaldía (--map-alc, 1 a 1.5 px) sobre manzana |
| MN31 | --map-alc #666A6D sobre --fondo-verde #D9EAD0 | 4.32:1 | 3:1 | Cumple | Límite de alcaldía (--map-alc, 1 a 1.5 px) sobre verde (parques, ANP y AVA) |
| MN32 | --map-alc #666A6D sobre --fondo-agua #BCD7E6 | 3.63:1 | 3:1 | Cumple | Límite de alcaldía (--map-alc, 1 a 1.5 px) sobre agua |
| MN33 | --map-alc #666A6D sobre --ground #F4F2EE | 4.88:1 | 3:1 | Cumple | Límite de alcaldía (--map-alc, 1 a 1.5 px) sobre «Sin fondo» |
| MN34 | --map-col #7A766F sobre --fondo-calle #FFFFFF | 4.51:1 | 3:1 | Cumple | Límite de colonia (--map-col, 0.7 a 1 px) sobre suelo |
| MN35 | --map-col #7A766F sobre --fondo-manzana #E2DED6 | 3.36:1 | 3:1 | Cumple | Límite de colonia (--map-col, 0.7 a 1 px) sobre manzana |
| MN36 | --map-col #7A766F sobre --fondo-verde #D9EAD0 | 3.57:1 | 3:1 | Cumple | Límite de colonia (--map-col, 0.7 a 1 px) sobre verde (parques, ANP y AVA) |
| MN37 | --map-col #7A766F sobre --fondo-agua #BCD7E6 | 3.01:1 | 3:1 | Cumple | Límite de colonia (--map-col, 0.7 a 1 px) sobre agua |
| MN38 | --map-col #7A766F sobre --ground #F4F2EE | 4.04:1 | 3:1 | Cumple | Límite de colonia (--map-col, 0.7 a 1 px) sobre «Sin fondo» |
| MN39 | --map-sel #273A45 sobre --fondo-calle #FFFFFF | 11.81:1 | 3:1 | Cumple | Contorno de la colonia o alcaldía elegida (--map-sel, 2.2 a 4 px) sobre suelo |
| MN40 | --map-sel #273A45 sobre --fondo-manzana #E2DED6 | 8.80:1 | 3:1 | Cumple | Contorno de la colonia o alcaldía elegida (--map-sel, 2.2 a 4 px) sobre manzana |
| MN41 | --map-sel #273A45 sobre --fondo-verde #D9EAD0 | 9.35:1 | 3:1 | Cumple | Contorno de la colonia o alcaldía elegida (--map-sel, 2.2 a 4 px) sobre verde (parques, ANP y AVA) |
| MN42 | --map-sel #273A45 sobre --fondo-agua #BCD7E6 | 7.87:1 | 3:1 | Cumple | Contorno de la colonia o alcaldía elegida (--map-sel, 2.2 a 4 px) sobre agua |
| MN43 | --map-sel #273A45 sobre --ground #F4F2EE | 10.56:1 | 3:1 | Cumple | Contorno de la colonia o alcaldía elegida (--map-sel, 2.2 a 4 px) sobre «Sin fondo» |
| MN44 | --map-sel #273A45 sobre --map-halo #FFFFFF | 11.81:1 | 3:1 | Cumple | Contorno de la colonia o alcaldía elegida donde cruza una línea Muy Baja: contra su franja blanca de 2 px (--map-halo) |
| MN45 | --map-sel #273A45 sobre --map-halo #FFFFFF | 11.81:1 | 3:1 | Cumple | Contorno de la colonia o alcaldía elegida donde cruza una línea Baja: contra su franja blanca de 2 px (--map-halo) |
| MN46 | --map-sel #273A45 sobre --map-halo #FFFFFF | 11.81:1 | 3:1 | Cumple | Contorno de la colonia o alcaldía elegida donde cruza una línea Media: contra su franja blanca de 2 px (--map-halo) |
| MN47 | --map-sel #273A45 sobre --map-halo #FFFFFF | 11.81:1 | 3:1 | Cumple | Contorno de la colonia o alcaldía elegida donde cruza una línea Alta: contra su franja blanca de 2 px (--map-halo) |
| MN48 | --map-sel #273A45 sobre --map-halo #FFFFFF | 11.81:1 | 3:1 | Cumple | Contorno de la colonia o alcaldía elegida donde cruza una línea Muy Alta: contra su franja blanca de 2 px (--map-halo) |
| MN49 | --map-sel #273A45 sobre relleno de colonia --p4 (Muy Alta) al 24 % sobre --fondo-calle #E1CAC7 | 7.58:1 | 3:1 | Cumple | Contorno de la colonia elegida sobre su propio relleno (al 24 %), el que menos contrasta |
| MN50 | --guinda #9D2148 sobre --fondo-calle #FFFFFF | 7.65:1 | 3:1 | Cumple | Calle consultada: halo --guinda sobre suelo |
| MN51 | --guinda #9D2148 sobre --fondo-manzana #E2DED6 | 5.70:1 | 3:1 | Cumple | Calle consultada: halo --guinda sobre manzana |
| MN52 | --guinda #9D2148 sobre --fondo-verde #D9EAD0 | 6.05:1 | 3:1 | Cumple | Calle consultada: halo --guinda sobre verde (parques, ANP y AVA) |
| MN53 | --guinda #9D2148 sobre --fondo-agua #BCD7E6 | 5.10:1 | 3:1 | Cumple | Calle consultada: halo --guinda sobre agua |
| MN54 | --guinda #9D2148 sobre --ground #F4F2EE | 6.84:1 | 3:1 | Cumple | Calle consultada: halo --guinda sobre «Sin fondo» |
| MN55 | --guinda #9D2148 sobre --map-halo #FFFFFF | 7.65:1 | 3:1 | Cumple | Calle consultada: halo junto a una línea Muy Baja vecina: contra la franja --map-halo que los separa |
| MN56 | --guinda #9D2148 sobre --map-halo #FFFFFF | 7.65:1 | 3:1 | Cumple | Calle consultada: halo junto a una línea Baja vecina: contra la franja --map-halo que los separa |
| MN57 | --guinda #9D2148 sobre --map-halo #FFFFFF | 7.65:1 | 3:1 | Cumple | Calle consultada: halo junto a una línea Media vecina: contra la franja --map-halo que los separa |
| MN58 | --guinda #9D2148 sobre --map-halo #FFFFFF | 7.65:1 | 3:1 | Cumple | Calle consultada: halo junto a una línea Alta vecina: contra la franja --map-halo que los separa |
| MN59 | --guinda #9D2148 sobre --map-halo #FFFFFF | 7.65:1 | 3:1 | Cumple | Calle consultada: halo junto a una línea Muy Alta vecina: contra la franja --map-halo que los separa |
| MN60 | --map-halo #FFFFFF sobre --guinda #9D2148 | 7.65:1 | 3:1 | Cumple | Calle consultada: filete --map-halo sobre el halo --guinda |
| MN61 | --p0 #F9E7BF sobre --ink #24262A | 12.42:1 | 3:1 | Cumple | Calle o avenida consultada: prioridad Muy Baja al centro, sobre el filete oscuro (--ink, que va sobre el filete --map-halo: 15.15:1) |
| MN62 | --p1 #F4C56E sobre --ink #24262A | 9.42:1 | 3:1 | Cumple | Calle o avenida consultada: prioridad Baja al centro, sobre el filete oscuro (--ink, que va sobre el filete --map-halo: 15.15:1) |
| MN63 | --p2 #E88A2E sobre --ink #24262A | 5.84:1 | 3:1 | Cumple | Calle o avenida consultada: prioridad Media al centro, sobre el filete oscuro (--ink, que va sobre el filete --map-halo: 15.15:1) |
| MN64 | --p3 #C2421B sobre --map-halo #FFFFFF | 5.13:1 | 3:1 | Cumple | Calle o avenida consultada: prioridad Alta al centro, sobre el filete --map-halo |
| MN65 | --p4 #7F1D12 sobre --map-halo #FFFFFF | 10.06:1 | 3:1 | Cumple | Calle o avenida consultada: prioridad Muy Alta al centro, sobre el filete --map-halo |
| MN66 | --guinda #9D2148 sobre --fondo-calle #FFFFFF | 7.65:1 | 3:1 | Cumple | Avenida consultada (Gobierno Central, toda la ciudad): halo --guinda sobre el suelo |
| MN67 | --guinda #9D2148 sobre --fondo-calle #FFFFFF | 7.65:1 | 3:1 | Cumple | Avenida consultada (Gobierno Central, con alcaldía elegida): halo --guinda sobre el suelo |
| MN68 | --inv-cepa #1B8A3C sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --fondo-calle #FFFFFF | 4.42:1 | 3:1 | Cumple | Cepa vacante (anillo) sobre suelo: contra su contorno blanco (el símbolo directo sobre el fondo: 4.42:1) |
| MN69 | --inv-cepa #1B8A3C sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --fondo-manzana #FDFCFC | 4.31:1 | 3:1 | Cumple | Cepa vacante (anillo) sobre manzana: contra su contorno blanco (el símbolo directo sobre el fondo: 3.29:1) |
| MN70 | --inv-cepa #1B8A3C sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --fondo-verde #FCFDFB | 4.33:1 | 3:1 | Cumple | Cepa vacante (anillo) sobre verde (parques, ANP y AVA): contra su contorno blanco (el símbolo directo sobre el fondo: 3.50:1) |
| MN71 | --inv-cepa #1B8A3C sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --fondo-agua #FAFCFD | 4.29:1 | 3:1 | Cumple | Cepa vacante (anillo) sobre agua: contra su contorno blanco (el símbolo directo sobre el fondo: 2.94:1) |
| MN72 | --inv-cepa #1B8A3C sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --p0 Muy Baja #FFFDFA | 4.35:1 | 3:1 | Cumple | Cepa vacante (anillo) sobre la línea Muy Baja: contra su contorno blanco (el símbolo directo sobre el fondo: 3.62:1) |
| MN73 | --inv-cepa #1B8A3C sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --p1 Baja #FEFAF4 | 4.25:1 | 3:1 | Cumple | Cepa vacante (anillo) sobre la línea Baja: contra su contorno blanco (el símbolo directo sobre el fondo: 2.75:1) |
| MN74 | --inv-cepa #1B8A3C sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --p2 Media #FDF6EF | 4.12:1 | 3:1 | Cumple | Cepa vacante (anillo) sobre la línea Media: contra su contorno blanco (el símbolo directo sobre el fondo: 1.70:1) |
| MN75 | --inv-cepa #1B8A3C sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --p3 Alta #FAF0ED | 3.95:1 | 3:1 | Cumple | Cepa vacante (anillo) sobre la línea Alta: contra su contorno blanco (el símbolo directo sobre el fondo: 1.16:1) |
| MN76 | --inv-cepa #1B8A3C sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --p4 Muy Alta #F5EDEC | 3.83:1 | 3:1 | Cumple | Cepa vacante (anillo) sobre la línea Muy Alta: contra su contorno blanco (el símbolo directo sobre el fondo: 2.27:1) |
| MN77 | --inv-tocon #7A5534 sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --fondo-calle #FFFFFF | 6.61:1 | 3:1 | Cumple | Tocón (círculo) sobre suelo: contra su contorno blanco (el símbolo directo sobre el fondo: 6.61:1) |
| MN78 | --inv-tocon #7A5534 sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --fondo-manzana #FDFCFC | 6.45:1 | 3:1 | Cumple | Tocón (círculo) sobre manzana: contra su contorno blanco (el símbolo directo sobre el fondo: 4.92:1) |
| MN79 | --inv-tocon #7A5534 sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --fondo-verde #FCFDFB | 6.47:1 | 3:1 | Cumple | Tocón (círculo) sobre verde (parques, ANP y AVA): contra su contorno blanco (el símbolo directo sobre el fondo: 5.23:1) |
| MN80 | --inv-tocon #7A5534 sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --fondo-agua #FAFCFD | 6.42:1 | 3:1 | Cumple | Tocón (círculo) sobre agua: contra su contorno blanco (el símbolo directo sobre el fondo: 4.40:1) |
| MN81 | --inv-tocon #7A5534 sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --p0 Muy Baja #FFFDFA | 6.51:1 | 3:1 | Cumple | Tocón (círculo) sobre la línea Muy Baja: contra su contorno blanco (el símbolo directo sobre el fondo: 5.41:1) |
| MN82 | --inv-tocon #7A5534 sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --p1 Baja #FEFAF4 | 6.35:1 | 3:1 | Cumple | Tocón (círculo) sobre la línea Baja: contra su contorno blanco (el símbolo directo sobre el fondo: 4.11:1) |
| MN83 | --inv-tocon #7A5534 sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --p2 Media #FDF6EF | 6.17:1 | 3:1 | Cumple | Tocón (círculo) sobre la línea Media: contra su contorno blanco (el símbolo directo sobre el fondo: 2.55:1) |
| MN84 | --inv-tocon #7A5534 sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --p3 Alta #FAF0ED | 5.90:1 | 3:1 | Cumple | Tocón (círculo) sobre la línea Alta: contra su contorno blanco (el símbolo directo sobre el fondo: 1.28:1) |
| MN85 | --inv-tocon #7A5534 sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --p4 Muy Alta #F5EDEC | 5.73:1 | 3:1 | Cumple | Tocón (círculo) sobre la línea Muy Alta: contra su contorno blanco (el símbolo directo sobre el fondo: 1.52:1) |
| MN86 | --inv-muerto #3C4043 sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --fondo-calle #FFFFFF | 10.46:1 | 3:1 | Cumple | Árbol muerto (círculo con ×) sobre suelo: contra su contorno blanco (el símbolo directo sobre el fondo: 10.46:1) |
| MN87 | --inv-muerto #3C4043 sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --fondo-manzana #FDFCFC | 10.21:1 | 3:1 | Cumple | Árbol muerto (círculo con ×) sobre manzana: contra su contorno blanco (el símbolo directo sobre el fondo: 7.80:1) |
| MN88 | --inv-muerto #3C4043 sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --fondo-verde #FCFDFB | 10.25:1 | 3:1 | Cumple | Árbol muerto (círculo con ×) sobre verde (parques, ANP y AVA): contra su contorno blanco (el símbolo directo sobre el fondo: 8.28:1) |
| MN89 | --inv-muerto #3C4043 sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --fondo-agua #FAFCFD | 10.17:1 | 3:1 | Cumple | Árbol muerto (círculo con ×) sobre agua: contra su contorno blanco (el símbolo directo sobre el fondo: 6.97:1) |
| MN90 | --inv-muerto #3C4043 sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --p0 Muy Baja #FFFDFA | 10.30:1 | 3:1 | Cumple | Árbol muerto (círculo con ×) sobre la línea Muy Baja: contra su contorno blanco (el símbolo directo sobre el fondo: 8.57:1) |
| MN91 | --inv-muerto #3C4043 sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --p1 Baja #FEFAF4 | 10.06:1 | 3:1 | Cumple | Árbol muerto (círculo con ×) sobre la línea Baja: contra su contorno blanco (el símbolo directo sobre el fondo: 6.50:1) |
| MN92 | --inv-muerto #3C4043 sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --p2 Media #FDF6EF | 9.77:1 | 3:1 | Cumple | Árbol muerto (círculo con ×) sobre la línea Media: contra su contorno blanco (el símbolo directo sobre el fondo: 4.03:1) |
| MN93 | --inv-muerto #3C4043 sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --p3 Alta #FAF0ED | 9.34:1 | 3:1 | Cumple | Árbol muerto (círculo con ×) sobre la línea Alta: contra su contorno blanco (el símbolo directo sobre el fondo: 2.03:1) |
| MN94 | --inv-muerto #3C4043 sobre contorno blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre --p4 Muy Alta #F5EDEC | 9.07:1 | 3:1 | Cumple | Árbol muerto (círculo con ×) sobre la línea Muy Alta: contra su contorno blanco (el símbolo directo sobre el fondo: 1.04:1) |
| MN95 | --inv-cepa #1B8A3C sobre blanco [255,255,255] (escrito en 05_inventario.js) #FFFFFF | 4.42:1 | 3:1 | Cumple | Cepa vacante (anillo) contra el contorno blanco mismo |
| MN96 | --inv-tocon #7A5534 sobre blanco [255,255,255] (escrito en 05_inventario.js) #FFFFFF | 6.61:1 | 3:1 | Cumple | Tocón (círculo) contra el contorno blanco mismo |
| MN97 | --inv-muerto #3C4043 sobre blanco [255,255,255] (escrito en 05_inventario.js) #FFFFFF | 10.46:1 | 3:1 | Cumple | Árbol muerto (círculo con ×) contra el contorno blanco mismo |
| MN98 | × [255,255,255] (escrito en 05_inventario.js) #FFFFFF sobre --inv-muerto #3C4043 | 10.46:1 | 3:1 | Cumple | Árbol muerto: la × blanca sobre el círculo gris (símbolo, no texto) |
| MN99 | --inv-cepa #1B8A3C sobre blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre satélite, extremo oscuro (negro al 90 % sobre --ground) #EDEDED | 3.77:1 | 3:1 | Cumple | Satélite: cepa vacante contra su contorno blanco (peor caso: imagen negra) |
| MN100 | blanco [255,255,255] (escrito en 05_inventario.js) al 92 % sobre satélite, extremo oscuro (negro al 90 % sobre --ground) #EDEDED sobre satélite, extremo oscuro (negro al 90 % sobre --ground) #181818 | 15.16:1 | 3:1 | Cumple | Satélite: contorno blanco de los símbolos del inventario sobre la imagen (peor caso: imagen negra) |
| MN101 | --loc #1A73E8 sobre --map-halo #FFFFFF | 4.50:1 | 3:1 | Cumple | Mi ubicación: punto --loc contra su contorno blanco de 2.5 px (justo en el mínimo de texto; para un punto basta 3:1) |
| MN102 | --map-halo #FFFFFF sobre satélite, extremo oscuro (negro al 90 % sobre --ground) #181818 | 17.75:1 | 3:1 | Cumple | Satélite: contorno blanco de Mi ubicación sobre la imagen (peor caso: imagen negra) |
| MN103 | --guinda #9D2148 sobre --map-halo #FFFFFF | 7.65:1 | 3:1 | Cumple | Punto buscado por coordenadas: --guinda contra su contorno blanco de 3 px |
| MN104 | --map-halo #FFFFFF sobre satélite, extremo oscuro (negro al 90 % sobre --ground) #181818 | 17.75:1 | 3:1 | Cumple | Satélite: contorno blanco del punto buscado sobre la imagen (peor caso: imagen negra) |
| MN105 | --focus #5A1029 sobre #fff #FFFFFF | 13.62:1 | 3:1 | Cumple | Anillo de foco del teclado (--focus, 3 px) contra su halo blanco de 2 px |
| MN106 | --focus #5A1029 sobre --fondo-calle #FFFFFF | 13.62:1 | 3:1 | Cumple | Anillo de foco sobre el suelo del fondo «Calles» |
| MN107 | --focus #5A1029 sobre --ground #F4F2EE | 12.18:1 | 3:1 | Cumple | Anillo de foco sobre «Sin fondo» |
| MN108 | --focus #5A1029 sobre --fondo-manzana #E2DED6 | 10.15:1 | 3:1 | Cumple | Anillo de foco sobre una manzana |
| MN109 | --focus #5A1029 sobre --panel #FFFFFF | 13.62:1 | 3:1 | Cumple | Anillo de foco sobre el panel blanco |
| MN110 | --ink #24262A sobre --fondo-calle #FFFFFF | 15.15:1 | 3:1 | Cumple | Celular: foco de «Volver a la información» (--ink) sobre el suelo del mapa |
| MN111 | --ink #24262A sobre --ground #F4F2EE | 13.55:1 | 3:1 | Cumple | Celular: foco de «Volver a la información» sobre «Sin fondo» |
| MN112 | --ctl #8A8478 sobre --panel #FFFFFF | 3.71:1 | 3:1 | Cumple | Leyenda: borde de la casilla sin marcar (--ctl) |
| MN113 | --ink #24262A sobre --panel #FFFFFF | 15.15:1 | 3:1 | Cumple | Leyenda: casilla marcada |
| MN114 | --guinda #9D2148 sobre --panel #FFFFFF | 7.65:1 | 3:1 | Cumple | Ficha: íconos de «Cómo llegar», «Street View»… |
| MN115 | --loc #1A73E8 sobre --panel #FFFFFF | 4.50:1 | 3:1 | Cumple | Botón Mi ubicación encendido: ícono azul |
| MN116 | #fff #FFFFFF sobre --loc #1A73E8 | 4.50:1 | 3:1 | Cumple | Botón Mi ubicación en «Seguirme»: ícono blanco sobre azul |
| MN117 | --ink-2 #55585A sobre rgba(255,255,255,.88) al 88 % sobre satélite, extremo oscuro (negro al 90 % sobre --ground) #E3E3E3 | 5.58:1 | 3:1 | Cumple | Barra de escala: trazo (peor caso: satélite negro bajo su fondo translúcido) |
| MN118 | borde rgba(36,38,42,.45) sobre --p0 #99907C sobre --panel #FFFFFF | 3.16:1 | 3:1 | Cumple | Leyenda: borde de la muestra Muy Baja (lo que la separa del panel) |
| MN119 | borde rgba(36,38,42,.45) sobre --p0 #99907C sobre --panel #FFFFFF | 3.16:1 | 3:1 | Cumple | Leyenda compacta: borde de la muestra Muy Baja |
| MN120 | --ctl #8A8478 sobre --panel #FFFFFF | 3.71:1 | 3:1 | Cumple | Filtros: borde de un chip sin elegir (--ctl) sobre el panel |
| MN121 | --ctl #8A8478 sobre --panel #FFFFFF | 3.71:1 | 3:1 | Cumple | Filtros: borde de la casilla o del círculo de un chip sin elegir (--ctl) |
| MN122 | --guinda #9D2148 sobre --panel #FFFFFF | 7.65:1 | 3:1 | Cumple | Filtros: relleno del chip elegido sobre el panel |
| MN123 | --guinda #9D2148 sobre --panel #FFFFFF | 7.65:1 | 3:1 | Cumple | Filtros: borde del chip elegido sobre el panel |
| MN124 | #fff #FFFFFF sobre --guinda #9D2148 | 7.65:1 | 3:1 | Cumple | Filtros: casilla o círculo blanco del chip elegido sobre el guinda |
| MN125 | --guinda #9D2148 sobre #fff #FFFFFF | 7.65:1 | 3:1 | Cumple | Filtros: palomita o punto guinda dentro de la casilla o el círculo blanco |
| MN126 | --map-filete #666A6D sobre --fondo-calle #FFFFFF | 5.45:1 | 3:1 | Cumple | Filete de las clases claras (--map-filete, 1 px a cada lado de las líneas Muy Baja, Baja y Media, desde el zoom 14) sobre suelo |
| MN127 | --map-filete #666A6D sobre --fondo-manzana #E2DED6 | 4.06:1 | 3:1 | Cumple | Filete de las clases claras (--map-filete, 1 px a cada lado de las líneas Muy Baja, Baja y Media, desde el zoom 14) sobre manzana |
| MN128 | --map-filete #666A6D sobre --fondo-verde #D9EAD0 | 4.32:1 | 3:1 | Cumple | Filete de las clases claras (--map-filete, 1 px a cada lado de las líneas Muy Baja, Baja y Media, desde el zoom 14) sobre verde (parques, ANP y AVA) |
| MN129 | --map-filete #666A6D sobre --fondo-agua #BCD7E6 | 3.63:1 | 3:1 | Cumple | Filete de las clases claras (--map-filete, 1 px a cada lado de las líneas Muy Baja, Baja y Media, desde el zoom 14) sobre agua |
| MN130 | --map-filete #666A6D sobre --ground #F4F2EE | 4.88:1 | 3:1 | Cumple | Filete de las clases claras (--map-filete, 1 px a cada lado de las líneas Muy Baja, Baja y Media, desde el zoom 14) sobre «Sin fondo» |
| MN131 | --map-filete #666A6D sobre relleno de colonia --p4 (Muy Alta) al 14 % sobre --fondo-calle #EDE0DE | 4.24:1 | 3:1 | Cumple | Filete de las clases claras (--map-filete, 1 px a cada lado de las líneas Muy Baja, Baja y Media, desde el zoom 14) sobre el relleno de colonia que menos contrasta (fondo «Calles») |
| MN132 | --map-filete #666A6D sobre relleno de colonia --p4 (Muy Alta) al 14 % sobre --ground #E4D5D0 | 3.82:1 | 3:1 | Cumple | Filete de las clases claras (--map-filete, 1 px a cada lado de las líneas Muy Baja, Baja y Media, desde el zoom 14) sobre el relleno de colonia que menos contrasta («Sin fondo») |
| MI01 | --fondo-manzana #E2DED6 sobre --fondo-calle #FFFFFF | 1.34:1 | 3:1 (ref.) | Informativo | Fondo «Calles»: manzana contra suelo (suave a propósito) |
| MI02 | --fondo-verde #D9EAD0 sobre --fondo-calle #FFFFFF | 1.26:1 | 3:1 (ref.) | Informativo | Fondo «Calles»: verde contra suelo |
| MI03 | --fondo-agua #BCD7E6 sobre --fondo-calle #FFFFFF | 1.49:1 | 3:1 (ref.) | Informativo | Fondo «Calles»: agua contra suelo |
| MI04 | --fondo-verde #D9EAD0 sobre --fondo-manzana #E2DED6 | 1.06:1 | 3:1 (ref.) | Informativo | Fondo «Calles»: verde contra manzana |
| MI05 | --fondo-agua #BCD7E6 sobre --fondo-manzana #E2DED6 | 1.11:1 | 3:1 (ref.) | Informativo | Fondo «Calles»: agua contra manzana |
| MI06 | --p0 #F9E7BF sobre --p1 #F4C56E | 1.31:1 | 3:1 (ref.) | Informativo | Rampa: Muy Baja contra Baja (clases vecinas) |
| MI07 | --p1 #F4C56E sobre --p2 #E88A2E | 1.61:1 | 3:1 (ref.) | Informativo | Rampa: Baja contra Media (clases vecinas) |
| MI08 | --p2 #E88A2E sobre --p3 #C2421B | 1.98:1 | 3:1 (ref.) | Informativo | Rampa: Media contra Alta (clases vecinas) |
| MI09 | --p3 #C2421B sobre --p4 #7F1D12 | 1.95:1 | 3:1 (ref.) | Informativo | Rampa: Alta contra Muy Alta (clases vecinas) |
| MI10 | --map-label #55585A sobre relleno de colonia --p0 (Muy Baja) al 14 % sobre --fondo-calle #FEFCF6 | 6.98:1 | 4.5:1 (ref.) | Informativo | Nombre de colonia sobre el relleno Muy Baja (fondo «Calles», al 14 %); lo sostiene el halo (MC01) |
| MI11 | --map-label #55585A sobre relleno de colonia --p1 (Baja) al 14 % sobre --fondo-calle #FDF7EB | 6.71:1 | 4.5:1 (ref.) | Informativo | Nombre de colonia sobre el relleno Baja (fondo «Calles», al 14 %); lo sostiene el halo (MC01) |
| MI12 | --map-label #55585A sobre relleno de colonia --p2 (Media) al 14 % sobre --fondo-calle #FCEFE2 | 6.34:1 | 4.5:1 (ref.) | Informativo | Nombre de colonia sobre el relleno Media (fondo «Calles», al 14 %); lo sostiene el halo (MC01) |
| MI13 | --map-label #55585A sobre relleno de colonia --p3 (Alta) al 14 % sobre --fondo-calle #F7E5E0 | 5.88:1 | 4.5:1 (ref.) | Informativo | Nombre de colonia sobre el relleno Alta (fondo «Calles», al 14 %); lo sostiene el halo (MC01) |
| MI14 | --map-label #55585A sobre relleno de colonia --p4 (Muy Alta) al 14 % sobre --fondo-calle #EDE0DE | 5.56:1 | 4.5:1 (ref.) | Informativo | Nombre de colonia sobre el relleno Muy Alta (fondo «Calles», al 14 %); lo sostiene el halo (MC01) |
| MI15 | --map-label #55585A sobre relleno de colonia --p0 (Muy Baja) al 14 % sobre --ground #F5F0E8 | 6.31:1 | 4.5:1 (ref.) | Informativo | Nombre de colonia sobre el relleno Muy Baja («Sin fondo», al 14 %); lo sostiene el halo (MC01) |
| MI16 | --map-label #55585A sobre relleno de colonia --p1 (Baja) al 14 % sobre --ground #F4ECDC | 6.10:1 | 4.5:1 (ref.) | Informativo | Nombre de colonia sobre el relleno Baja («Sin fondo», al 14 %); lo sostiene el halo (MC01) |
| MI17 | --map-label #55585A sobre relleno de colonia --p2 (Media) al 14 % sobre --ground #F2E4D4 | 5.74:1 | 4.5:1 (ref.) | Informativo | Nombre de colonia sobre el relleno Media («Sin fondo», al 14 %); lo sostiene el halo (MC01) |
| MI18 | --map-label #55585A sobre relleno de colonia --p3 (Alta) al 14 % sobre --ground #EDDAD1 | 5.30:1 | 4.5:1 (ref.) | Informativo | Nombre de colonia sobre el relleno Alta («Sin fondo», al 14 %); lo sostiene el halo (MC01) |
| MI19 | --map-label #55585A sobre relleno de colonia --p4 (Muy Alta) al 14 % sobre --ground #E4D5D0 | 5.02:1 | 4.5:1 (ref.) | Informativo | Nombre de colonia sobre el relleno Muy Alta («Sin fondo», al 14 %); lo sostiene el halo (MC01) |
| MI20 | --map-label #55585A sobre relleno de colonia --p4 (Muy Alta) al 59 % sobre --ground #AF756D | 1.90:1 | 4.5:1 (ref.) | Informativo | Nombre de colonia con solo colonias (relleno Muy Alta al 59 %); lo sostiene el halo (MC01) |
| MI21 | --map-label #55585A sobre relleno de colonia --p4 (Muy Alta) al 75 % sobre --ground #9D534A | 1.28:1 | 4.5:1 (ref.) | Informativo | Nombre de la colonia elegida sin calles (relleno Muy Alta al 75 %); lo sostiene el halo (MC01) |
| MI22 | --map-label #55585A sobre relleno de alcaldía --p4 al 67 % #AA6861 | 1.65:1 | 4.5:1 (ref.) | Informativo | Nombre de alcaldía sobre el relleno de alcaldía Muy Alta (capa «Alcaldías»); lo sostiene el halo (MC01) |
| MI23 | --map-label #55585A sobre satélite, extremo oscuro (negro al 90 % sobre --ground) #181818 | 2.47:1 | 4.5:1 (ref.) | Informativo | Satélite: nombre de colonia directo sobre la imagen, sin halo (peor caso: negra); el fondo varía |
| MI24 | --map-label #55585A sobre satélite, extremo claro (blanco al 90 % sobre --ground) #FEFEFD | 7.10:1 | 4.5:1 (ref.) | Informativo | Satélite: nombre de colonia directo sobre la imagen, sin halo (imagen blanca) |
| MI25 | --p0 Muy Baja #F9E7BF sobre satélite, extremo claro (blanco al 90 % sobre --ground) #FEFEFD | 1.20:1 | 3:1 (ref.) | Informativo | Satélite: línea Muy Baja, sin halo; varía con la imagen: de 1.20:1 a 14.55:1 entre imagen negra y blanca |
| MI26 | --p1 Baja #F4C56E sobre satélite, extremo claro (blanco al 90 % sobre --ground) #FEFEFD | 1.59:1 | 3:1 (ref.) | Informativo | Satélite: línea Baja, sin halo; varía con la imagen: de 1.59:1 a 11.04:1 entre imagen negra y blanca |
| MI27 | --p2 Media #E88A2E sobre satélite, extremo claro (blanco al 90 % sobre --ground) #FEFEFD | 2.56:1 | 3:1 (ref.) | Informativo | Satélite: línea Media, sin halo; varía con la imagen: de 2.56:1 a 6.85:1 entre imagen negra y blanca |
| MI28 | --p3 Alta #C2421B sobre satélite, extremo oscuro (negro al 90 % sobre --ground) #181818 | 3.45:1 | 3:1 (ref.) | Informativo | Satélite: línea Alta, sin halo; varía con la imagen: de 3.45:1 a 5.08:1 entre imagen negra y blanca |
| MI29 | --p4 Muy Alta #7F1D12 sobre satélite, extremo oscuro (negro al 90 % sobre --ground) #181818 | 1.76:1 | 3:1 (ref.) | Informativo | Satélite: línea Muy Alta, sin halo; varía con la imagen: de 1.76:1 a 9.97:1 entre imagen negra y blanca |
| MI30 | --p4 al 15 % sobre --fondo-calle #ECDDDC sobre --fondo-calle #FFFFFF | 1.31:1 | 3:1 (ref.) | Informativo | Frente fuera del ámbito consultado (al 15 %, atenuado a propósito), clase Muy Alta |
| MI31 | --p4 al 20 % sobre --fondo-calle #E5D2D0 sobre --fondo-calle #FFFFFF | 1.45:1 | 3:1 (ref.) | Informativo | Línea Muy Alta con la opacidad de la prioridad al mínimo (20 %), que elige la persona |
| MI32 | --map-vp al 16 % sobre --fondo-calle #E7E8E8 sobre --fondo-calle #FFFFFF | 1.22:1 | 3:1 (ref.) | Informativo | Vialidad primaria fuera del ámbito (al 16 %) con el gris de contexto |
| MI33 | --map-alc #666A6D sobre --p3 #C2421B | 1.06:1 | 3:1 (ref.) | Informativo | Límite de alcaldía junto a la línea que menos contrasta (--p3); las líneas de prioridad se dibujan encima del límite |
| MI34 | --map-col #7A766F sobre --p3 #C2421B | 1.13:1 | 3:1 (ref.) | Informativo | Límite de colonia junto a la línea que menos contrasta (--p3); las líneas se dibujan encima |
| MI35 | --inv-cepa #1B8A3C sobre --p2 #E88A2E | 1.70:1 | 3:1 (ref.) | Informativo | Cepa vacante directo sobre la clase Media, sin contorno |
| MI36 | --inv-tocon #7A5534 sobre --p2 #E88A2E | 2.55:1 | 3:1 (ref.) | Informativo | Tocón directo sobre la clase Media, sin contorno |
| MI37 | --inv-muerto #3C4043 sobre --p4 #7F1D12 | 1.04:1 | 3:1 (ref.) | Informativo | Árbol muerto directo sobre la clase Muy Alta, sin contorno |
| MI38 | --inv-cepa #1B8A3C sobre --inv-tocon #7A5534 | 1.49:1 | 3:1 (ref.) | Informativo | Entre símbolos: cepa contra tocón (además, anillo hueco contra círculo lleno) |
| MI39 | --inv-cepa #1B8A3C sobre --inv-muerto #3C4043 | 2.36:1 | 3:1 (ref.) | Informativo | Entre símbolos: cepa contra árbol muerto (además, anillo hueco contra círculo con ×) |
| MI40 | --inv-tocon #7A5534 sobre --inv-muerto #3C4043 | 1.58:1 | 3:1 (ref.) | Informativo | Entre símbolos: tocón contra árbol muerto (los distingue la × y el tamaño, no el color) |
| MI41 | --loc al 15 % sobre --fondo-calle #DDEAFC sobre --fondo-calle #FFFFFF | 1.21:1 | 3:1 (ref.) | Informativo | Mi ubicación: círculo de precisión, relleno al 15 % |
| MI42 | --loc al 47 % sobre --fondo-calle #93BDF4 sobre --fondo-calle #FFFFFF | 1.93:1 | 3:1 (ref.) | Informativo | Mi ubicación: borde del círculo de precisión al 47 % |
| MI43 | --loc #1A73E8 sobre --p4 #7F1D12 | 2.23:1 | 3:1 (ref.) | Informativo | Mi ubicación: punto azul junto a una línea Muy Alta (el contorno blanco va de por medio) |
| MI44 | --focus #5A1029 sobre --p4 #7F1D12 | 1.35:1 | 3:1 (ref.) | Informativo | Anillo de foco junto a una línea Muy Alta (el halo blanco va de por medio) |
| MI45 | --focus #5A1029 sobre satélite, extremo oscuro (negro al 90 % sobre --ground) #181818 | 1.30:1 | 3:1 (ref.) | Informativo | Anillo de foco sobre el satélite (peor caso: imagen negra; el halo blanco va de por medio) |
| MI46 | --p0 #F9E7BF sobre --panel #FFFFFF | 1.22:1 | 3:1 (ref.) | Informativo | Leyenda: muestra Muy Baja contra el panel (sin su borde) |
| MI47 | --p1 #F4C56E sobre --panel #FFFFFF | 1.60:1 | 3:1 (ref.) | Informativo | Leyenda: muestra Baja contra el panel (sin su borde) |
| MI48 | --p2 #E88A2E sobre --panel #FFFFFF | 2.59:1 | 3:1 (ref.) | Informativo | Leyenda: muestra Media contra el panel (sin su borde) |
| MI49 | --p3 #C2421B sobre --panel #FFFFFF | 5.13:1 | 3:1 (ref.) | Informativo | Leyenda: muestra Alta contra el panel (sin su borde) |
| MI50 | --p4 #7F1D12 sobre --panel #FFFFFF | 10.06:1 | 3:1 (ref.) | Informativo | Leyenda: muestra Muy Alta contra el panel (sin su borde) |
| MI51 | --ink #24262A sobre --guinda #9D2148 | 1.98:1 | 3:1 (ref.) | Informativo | Celular: foco de «Volver a la información» contra el botón guinda (hay 2 px de mapa en medio) |
| MI52 | --map-sel #273A45 sobre --p4 #7F1D12 | 1.17:1 | 3:1 (ref.) | Informativo | Contorno de lo elegido directo sobre una línea Muy Alta, sin su franja blanca |
| MI53 | --guinda #9D2148 sobre --p0 Muy Baja #F9E7BF | 6.27:1 | 3:1 (ref.) | Informativo | Calle consultada: halo --guinda directo contra una línea Muy Baja vecina, sin la franja blanca |
| MI54 | --guinda #9D2148 sobre --p1 Baja #F4C56E | 4.75:1 | 3:1 (ref.) | Informativo | Calle consultada: halo --guinda directo contra una línea Baja vecina, sin la franja blanca |
| MI55 | --guinda #9D2148 sobre --p2 Media #E88A2E | 2.95:1 | 3:1 (ref.) | Informativo | Calle consultada: halo --guinda directo contra una línea Media vecina, sin la franja blanca |
| MI56 | --guinda #9D2148 sobre --p3 Alta #C2421B | 1.48:1 | 3:1 (ref.) | Informativo | Calle consultada: halo --guinda directo contra una línea Alta vecina, sin la franja blanca |
| MI57 | --guinda #9D2148 sobre --p4 Muy Alta #7F1D12 | 1.31:1 | 3:1 (ref.) | Informativo | Calle consultada: halo --guinda directo contra una línea Muy Alta vecina, sin la franja blanca |
| MI58 | --p0 Muy Baja #F9E7BF sobre relleno de colonia --p3 (Alta) al 14 % sobre --fondo-calle #F7E5E0 | 1.00:1 | 3:1 (ref.) | Informativo | Línea Muy Baja por debajo del zoom 14: va sin filete, a propósito, para que a escala de ciudad se lea la rampa (con filete, las zonas claras se ven grises); de 1.00:1 a 1.22:1 sobre los fondos claros, el más bajo sobre el relleno de colonia que menos contrasta (fondo «Calles») |
| MI59 | --p1 Baja #F4C56E sobre relleno de colonia --p4 (Muy Alta) al 14 % sobre --ground #E4D5D0 | 1.12:1 | 3:1 (ref.) | Informativo | Línea Baja por debajo del zoom 14: va sin filete, a propósito, para que a escala de ciudad se lea la rampa (con filete, las zonas claras se ven grises); de 1.12:1 a 1.60:1 sobre los fondos claros, el más bajo sobre el relleno de colonia que menos contrasta («Sin fondo») |
| MI60 | --p2 Media #E88A2E sobre relleno de colonia --p4 (Muy Alta) al 14 % sobre --ground #E4D5D0 | 1.81:1 | 3:1 (ref.) | Informativo | Línea Media por debajo del zoom 14: va sin filete, a propósito, para que a escala de ciudad se lea la rampa (con filete, las zonas claras se ven grises); de 1.81:1 a 2.59:1 sobre los fondos claros, el más bajo sobre el relleno de colonia que menos contrasta («Sin fondo») |

## Aceptados por decisión

- MN03 · --p2 Media #E88A2E sobre --map-filete #666A6D · **2.10:1** (mínimo 3:1) · Línea de prioridad Media (frentes de manzana; también vialidades primarias con Gobierno Central) sobre el suelo del fondo «Calles», desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras»). Decisión de Liber (17 oct 2026): se queda así; el filete gris ya separa la línea Media de cualquier fondo (3.63:1 o más), que es lo que importa para leer el mapa.
- MN08 · --p2 Media #E88A2E sobre --map-filete #666A6D · **2.10:1** (mínimo 3:1) · Línea de prioridad Media (frentes de manzana; también vialidades primarias con Gobierno Central) sobre una manzana del fondo «Calles», desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras»). Decisión de Liber (17 oct 2026): se queda así; el filete gris ya separa la línea Media de cualquier fondo (3.63:1 o más), que es lo que importa para leer el mapa.
- MN13 · --p2 Media #E88A2E sobre --map-filete #666A6D · **2.10:1** (mínimo 3:1) · Línea de prioridad Media (frentes de manzana; también vialidades primarias con Gobierno Central) sobre «Sin fondo», desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras»). Decisión de Liber (17 oct 2026): se queda así; el filete gris ya separa la línea Media de cualquier fondo (3.63:1 o más), que es lo que importa para leer el mapa.
- MN18 · --p2 Media #E88A2E sobre --map-filete #666A6D · **2.10:1** (mínimo 3:1) · Línea Media sobre el relleno de colonia que menos contrasta (fondo «Calles», relleno al 14 %), desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras»). Decisión de Liber (17 oct 2026): se queda así; el filete gris ya separa la línea Media de cualquier fondo (3.63:1 o más), que es lo que importa para leer el mapa.
- MN23 · --p2 Media #E88A2E sobre --map-filete #666A6D · **2.10:1** (mínimo 3:1) · Línea Media sobre el relleno de colonia que menos contrasta («Sin fondo», relleno al 14 %), desde el zoom 14, contra su filete --map-filete de 1 px a cada lado (el filete contra el fondo, en los pares «Filete de las clases claras»). Decisión de Liber (17 oct 2026): se queda así; el filete gris ya separa la línea Media de cualquier fondo (3.63:1 o más), que es lo que importa para leer el mapa.

## Pendientes de decisión

Ninguno.
## Notas

- .chip[aria-pressed="true"] i { background } se declara 2 veces con valores distintos: transparent en css/02_base.css; #fff en css/03_controles.css. Se mide el último, que es el que gana.
- Mismo color con dos nombres: --panel y --fondo-calle y --map-halo (#FFFFFF).
- Mismo color con dos nombres: --ink-2 y --map-label (#55585A).
- Mismo color con dos nombres: --ink-3 y --map-alc y --map-vp y --map-filete (#666A6D).
- ANP y AVA se pintan con el mismo verde que parques y jardines (--fondo-verde #D9EAD0): en el mapa no se distinguen entre sí.
- Los nombres de alcaldía y colonia usan de halo --ground (#F4F2EE), no el suelo del fondo «Calles» (--fondo-calle #FFFFFF): sobre el suelo blanco el halo se ve como una sombra beige muy tenue.
- Filete de las clases claras: se mide como se ve desde el zoom 14. Dos excepciones a propósito: por debajo de ese zoom no se dibuja (lectura de la rampa a escala de ciudad; ver los informativos «por debajo del zoom 14») y, en modo ligero (sin tarjeta gráfica), los frentes solo lo llevan con una alcaldía o colonia elegida, porque el de toda la ciudad hacía cada cuadro un 55 % más lento.
- El satélite no tiene color propio: se mide contra sus extremos (imagen negra y blanca, al 90 % sobre --ground).

## Cómo se usa

- `node herramientas/contraste.mjs` imprime la tabla; con `--md` y `--html` reescribe este documento y la versión HTML (`_local/auditoria_contraste_mapa.html`).
- `04_pruebas/prueba_contraste.js` (en las rápidas) usa el mismo cálculo: falla si un par exigido que hoy cumple deja de cumplir; los pendientes de decisión solo se listan como aviso.
