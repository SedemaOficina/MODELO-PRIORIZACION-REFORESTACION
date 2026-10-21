# Auditoría del Modelo de priorización de reforestación urbana · 19 de octubre de 2026

**Datos de la auditoría:**
- **Versión auditada:** 1.36, commit `c8007dd` del 17 de octubre de 2026, rama `main`, sin cambios sin guardar.
- **Alcance:** las auditorías de cada cambio y de cada versión, completas. Además, las de las dos etapas actuales: **antes de entregar al SIA** y **antes de usar datos reales**, porque el inicio de sesión guarda datos personales.
- **No auditado antes:** todo lo agregado desde el 2 de octubre (v17.26 en adelante) se trató como no auditado.
- **Método:** auditoría independiente y de solo lectura. No se corrigió nada.
- **Evidencia:** en `evidencia-2026-10-19/` (guiones) y en `_local/auditoria-2026-10-19/` (informes completos y salidas; no se publica).
- **Seguridad:** el informe con los detalles está aparte, en `_local/auditoria-seguridad-2026-10-19.md`.

---

## 1. Veredicto

| Etapa | Veredicto |
|---|---|
| En cada cambio | **Lista con reservas.** Las 4 verificaciones rápidas pasan, pero ninguna corre sola (A1-01). |
| En cada versión | **No lista.** Con filtros, la herramienta da cifras distintas del Gobierno Central en la misma pantalla, una de ellas con un filtro que no se ve (B2-01, B2-02, B2-03). El Excel puede describir otro ámbito (B3-01). |
| Antes de mostrar al área | **No lista.** Hay diferencias en cifras (B2) y la lista de la cuadrilla no coincide con su Excel (C1-01). |
| Antes de cerrar la etapa | **No lista.** Hay contradicciones documentales abiertas (D1-01 a D1-03). La metodología publicada no describe la regla real (D5-01, D5-02). |
| Antes de usar datos reales | **No lista.** El aviso de privacidad cita una ley abrogada (G1-01) y no tiene aprobación (D1-01). El bloqueo de intentos se salta (E1-01) y una contraseña temporal de administración opera el panel (E1-02). |
| Antes de entregar al SIA | **No lista.** No se ha ensayado la instalación (F5). Los documentos de entrega describen la v1.0 (D1-03). Hay que resolver lo anterior. |
| Antes de operar | **No lista.** No hay constancia de pruebas en equipos reales, con el personal ni de los vistos buenos (H1 a H6). |

## 2. Resumen ejecutivo

La herramienta es sólida en lo que más se había trabajado:
- **Cifras sin filtros.** Las de las alcaldías cuadran al 100 % con dos recálculos independientes:
  - 18 combinaciones, 41 de 41 bloques;
  - 204 estados en 2 corridas, 0 diferencias en la columna Alcaldía.
- **Construcción.** Dos construcciones desde cero salen idénticas a lo publicado, archivo por archivo (60 de 60).
- **Pantallas.** En 228 pantallas y 7 anchos: no se sale nada de la pantalla, no hay errores de consola ni archivos que no carguen, y todos los objetivos táctiles miden 24 px o más.
- **Privacidad técnica.** Al abrir no hay peticiones a terceros.
- **Seguridad del sitio.** Ningún intento de inyectar código se ejecutó (40 de 40).
- **Inicio de sesión.** Las 7 rutas de administración rechazan sin sesión y con una cuenta normal.

Los problemas graves se concentran en cuatro lugares:

1. **Las cifras del Gobierno Central con filtros.** La tabla «Alcaldía y Gobierno Central» filtra por «Banqueta» y por «Espacio» con reglas distintas de las del bloque del Gobierno Central. Además sigue filtrando cuando la fila «Banqueta» ya no se ve. En Iztapalapa, la misma pantalla dice 35 y 240 km de frente prioritario del Gobierno Central. Con solo Gobierno Central, la tabla da −70 % sin ninguna señal. Lo encontraron tres revisores por separado y lo confirmé en el código.
2. **El método.**
   - «Sin arbolado» es el dato de árboles del Censo INEGI 2020, no una clase del modelo, y en 3 de cada 10 casos contradice el verdor del modelo.
   - La prioridad del frente sale del promedio de la calificación de una zona (celdas hexagonales) y del verdor, con cortes que no se publican. Esa zona no es la colonia que muestra la herramienta en el 18 % de los frentes.
   - 256 km prioritarios no aparecen en ninguna lista.
3. **El aviso de privacidad y los documentos de entrega.**
   - El aviso se funda en el art. 21 Ter de una ley abrogada el 14 de julio de 2026, y le faltan apartados que exige la ley vigente.
   - La guía de entrega afirma que la Unidad de Transparencia lo aprobó, y no hay constancia.
4. **El inicio de sesión.** Hay tres fallas que juntas forman una cadena de ataque:
   - el tiempo de respuesta delata qué cuentas tienen contraseña temporal;
   - con intentos simultáneos, el bloqueo no funciona;
   - una cuenta de administración con contraseña temporal opera todo el panel, y la temporal no caduca.

**Totales: 3 Críticos, 8 Altos, 36 Medios, 42 Bajos y 12 Informativos.** No hubo ningún cambio en la carpeta del proyecto durante la auditoría: las huellas de inicio y final de 916 archivos son idénticas.

**Recomendación:** corregir primero los bloques 1 (cifras del Gobierno Central), 2 (inicio de sesión) y 3 (aviso y documentos) del plan de la sección 11. Después, llevar a decisión las preguntas del método (sección 8). No conviene armar el paquete del SIA hasta cerrar esos tres bloques.

---

## 3. Cobertura

Calificación del 1 al 5: 5 = completa y sin hallazgos Críticos ni Altos. Gravedades: C = Crítica · A = Alta · M = Media · B = Baja · I = Informativa.

| Código | Auditoría | Estado | Cómo se hizo | C/A/M/B/I | Calif. | Qué faltó |
|---|---|---|---|---|---|---|
| A1 | Pruebas y regresión | Hecha | Serie completa de línea base: 21 de 22 a la primera. La del recorrido falló 1 de 4 corridas por tiempos y pasó 53 de 53 al repetirla. Mapa de cobertura; revisión de comprobaciones que no pueden fallar (no se encontró ninguna) | 0/0/3/1/0 | 3 | Correr las pruebas nuevas contra la versión anterior de Git |
| A2 | Integridad de datos | Hecha | Decodificador propio en Python: 49 de 49 comprobaciones, incluidos los 62,898 puntos del inventario | 0/0/0/0/0 | 5 | — |
| A3 | Construcción reproducible | Hecha | 2 construcciones desde cero, iguales a `docs/` byte por byte (60 de 60) | 0 | 5 | — |
| A4 | Calidad estática | Hecha | ESLint 9.37 sobre `app.js`, `sw.js`, `config.js`, `excel_worker.js` y los 20 módulos; `tsc --noUnusedLocals` en el servidor: 0 errores | 0 | 5 | — |
| A5 | Consistencia automática | Hecha | 0 ids repetidos, 0 `style="`, 0 términos retirados; gitleaks en `docs/`: 0 | 0/0/0/1/0 | 4 | — |
| A6 | Estilos y contraste | Hecha | 253 pares vigentes: 188 cumplen, 5 aceptados, 0 pendientes. Pares nuevos medidos sobre satélite; colores escritos a mano; clases sin uso | 0/0/0/2/0 | 4 | — |
| B1 | Barrido de pantallas | Hecha | 228 pantallas (19 estados más el recorrido, 7 anchos, zoom al 200 %); 198 controles presionados | 0/0/1/3/0 | 3 | Modo completo con tarjeta gráfica |
| B2 | Coherencia de cifras | Hecha | Dos recálculos independientes: 18 combinaciones (frente 1) y 204 estados × 2 (independiente) | 1/2/1/0/0 | 1 | — |
| B3 | Archivos que genera | Hecha | 49 descargas en 4 corridas más 33 × 2; openpyxl, pdftotext | 0/1/0/4/0 | 2 | Abrir en Excel, Google Earth y QGIS reales |
| B4 | Accesibilidad | En parte | axe-core 4.10.2 (WCAG 2.2 AA) en 65 pantallas; teclado de principio a fin (86 paradas por ancho); simulación de daltonismo | 0/0/1/5/2 | 3 | Lector de pantalla: no hay en el equipo |
| B5 | Robustez | Hecha | 34 escenarios × 2 en el sitio; 7 casos de base caída o lenta | 0/0/3/1/0 | 3 | — |
| B6 | Teléfono y sin conexión | Hecha | Ciclo de versión con corte real en el servidor (3 escenarios × 2); GPS negado o sin respuesta; peso de la primera visita | 0/0/2/0/0 | 3 | Teléfono y red móvil reales |
| B7 | Privacidad técnica | Hecha | `prueba_sin_terceros.js` 16 de 16 (× 2); terceros por diseño revisados | 0/0/0/1/0 | 4 | — |
| B8 | Navegadores y fechas | En parte | Chromium 141 y WebKit 26; reloj fijo en 7 casos | 0/0/1/0/1 | 3 | Firefox: la versión instalada no corresponde y el sistema no deja ejecutarla |
| B9 | Seguridad del despliegue | En parte | `prueba_servidor_sia.js` 32 de 32 (× 2); lectura del ejemplo de nginx | 0/0/0/2/1 | 3 | `nginx -t` y peticiones reales: no hay nginx |
| C1 | Tareas del personal | Hecha | 3 perfiles, 3 tareas completas con conteo de acciones, 13 fichas de pantalla | 0/1/3/0/0 | 2 | Personal real |
| C2 | UX heurística | Hecha | 10 heurísticas de Nielsen; de los 15 hallazgos del 24 sep, 12 cerrados y 1 regresó | 0/0/1/0/0 | 3 | Teléfono físico |
| C3 | Carga de la interfaz | Hecha | 20 estados × 2 anchos (palabras, controles, pantallas) | 0/0/1/0/1 | 3 | — |
| C4 | Matriz de estados | Hecha | 34 combinaciones × 3 pestañas; «Atrás», recarga, enlace compartido, dos pestañas | 1*/0/3/2/0 | 2 | Con sesión del SIA |
| C5 | Textos | Hecha | Inventario de 1,485 textos con archivo:línea; glosario | 0/0/2/4/0 | 3 | Revisión jurídica; corrector externo |
| C6 | Sistema visual | Hecha | Estilo calculado de 455 controles; CIEDE2000 contra la rampa | 0/0/0/1/0 | 4 | Estándar compartido del SIA (no existe) |
| D1 | Coherencia documental | Hecha | Unos 60 cruces de decisiones, cifras y afirmaciones contra el código | 1/0/2/2/0 | 1 | Notas 1 a 41 de la bitácora |
| D2 | Modelo de datos | No aplica | El sitio no tiene base de datos; el esquema del inicio de sesión se revisó en E1 y E2 | — | — | — |
| D3 | Datos de terceros | Hecha | 23 de 23 insumos con su suma; inventario por alcaldía y por fecha de imagen | 0/0/2/0/1 | 3 | Contenido de los `.rar` (no hay descompresor) |
| D4 | Peso y velocidad | Hecha | 3G y 4G lenta × CPU 4 y 6, en 390×844; gzip y brotli | 0/0/0/1/0 | 3 | Tiempos limpios: la máquina estaba al 91 % por los revisores |
| D5 | Validación del método | En parte | Insumo original extraído; regla reproducida en 372,534 de 372,534 frentes; sensibilidad de pesos | 0/2/0/0/0 | 1 | Sensibilidad de calor, rezago y sombra: el insumo no conserva los componentes |
| E1 | Seguridad y datos personales | En parte | OWASP ASVS 4.0 nivel 2; gitleaks en el historial completo; 39 + 38 + 22 casos de ataque; 40 de XSS; `npm run pruebas` 11 + 1 omitida | 0/2/4/2/2 | 2 | PostgreSQL real; nginx real |
| E2 | Registros y respaldo | En parte | pg-mem con el esquema real: transacciones, cambios simultáneos, duplicados | 0/0/3/1/1 | 2 | Restaurar un respaldo real (no hay PostgreSQL) |
| E3 | Intentar romperlo | Hecha | 104 casos × 2 en el sitio; 22 × 2 por HTTP contra el servidor de demostración; 6 × 2 de doble clic | 0/0/0/2/1 | 3 | Teléfono real con señal intermitente |
| F1 | Limpieza | Hecha | Cobertura de JS y CSS en Chromium; búsqueda de referencias; 5 frentes | 0/0/0/2/0 | 4 | — |
| F2 | Revisión de código | Hecha | Diff de la v1.0 a la v1.36: 124 archivos, +7,027/−977, por bloques | 0/0†/0/1/0 | 2 | Lectura línea a línea de las pruebas |
| F3 | Dependencias y licencias | Hecha | `npm audit` en el servidor y en la raíz; huellas de las librerías contra `LICENCIAS.md` | 0/0/0/1/1 | 4 | SheetJS no se audita con npm |
| F4 | Control del paquete | Hecha | `empaquetar.py` 3 veces en una copia, con archivos sembrados; manifiesto 93 de 93; gitleaks en el paquete: 0 | 0/0/1/1/0 | 3 | — |
| F5 | Ensayo de instalación | No hecha | — | — | — | Otra persona, nginx y PostgreSQL: no verificable desde aquí |
| F6 | Revisión del receptor | Hecha | Estado de lo pedido por el SIA (notas 15, 42 y 70) | 0/0/0/0/1 | 3 | No hay un documento del SIA; solo la nota 70 |
| G1 | Cotejo normativo | Hecha | 14 y 19 citas contra el texto oficial (dos revisores) | 1/0/1/0/0 | 1 | Reglamento Interior posterior al 31-10-2025: el portal de la Consejería no abrió |
| G2 | Componentes compartidos | Hecha | Inventario de 11 fallas ajenas y sus rodeos | 0/0/1/1/0 | 2 | — |
| H1 | Dispositivos reales | En parte | Solo revisiones informales en un iPhone, sin registro | — | — | Registro; Android de gama baja; Firefox; VoiceOver y TalkBack |
| H2 | Prueba con el personal | No hecha | Las guías existen (v17.29 y v17.38); la prueba se descartó | — | — | — |
| H3 | Carga concurrente | No hecha | El inicio de sesión no está instalado | — | — | — |
| H4 | Seguridad en el entorno real | No hecha | No está instalado | — | — | — |
| H5 | Vistos buenos | No hecha | Faltan los de la Unidad de Transparencia, jurídico y especialista | — | — | — |
| H6 | Piloto en campo | No hecha | — | — | — | — |
| H7 | Periódicas | No aplica aún | No está en operación. `CIERRE_FASE_1.md` propone una revisión mensual | — | — | — |

\* El Crítico B2-01 se cuenta en B2; también es de C4. † El Alto B3-01 salió de la revisión de código (F2), pero se cuenta en B3.

---

## 4. Las 10 de mayor prioridad

Orden por impacto × probabilidad ÷ esfuerzo.

| # | Clave | Gravedad | Esfuerzo | Qué |
|---|---|---|---|---|
| 1 | B2-01 | Crítica | S | Con solo Gobierno Central, la comparación sigue filtrada por una banqueta oculta |
| 2 | G1-01 | Crítica | S | El aviso de privacidad cita una ley abrogada y le faltan apartados de la vigente |
| 3 | D1-01 | Crítica | S | La guía de entrega afirma una aprobación de la Unidad de Transparencia que no consta |
| 4 | E1-02 | Alta | S | Una contraseña temporal de administración opera el panel y no caduca |
| 5 | E1-01 | Alta | M | El bloqueo de intentos se salta con peticiones simultáneas |
| 6 | D5-01 | Alta | S | «Sin arbolado» es INEGI 2020, no el modelo |
| 7 | B2-02 | Alta | M | La columna Gobierno Central filtra con otra regla que su propio bloque |
| 8 | B3-01 | Alta | S | El Excel puede describir otro ámbito (intermitente) |
| 9 | C1-01 | Alta | M | El Excel de la cuadrilla no trae la lista elegida |
| 10 | E1-03 | Media | S | El tiempo de respuesta delata las cuentas con temporal: es el primer eslabón de la cadena con E1-01 y E1-02 |

---

## 5. Hallazgos

- **Formato.** Los Críticos y Altos van completos. Los Medios, Bajos e Informativos van en tablas; su formato largo, con pasos y evidencia, está en los informes de cada revisor (`_local/auditoria-2026-10-19/frenteN.md` e `independiente.md`).
- **Columna «Visto por».** Indica qué revisores lo encontraron por separado (F1 a F6 e Ind.) y si el coordinador lo confirmó (Coord.).

**Totales:**

| Gravedad | Total | Auditorías |
|---|---|---|
| Crítica | 3 | B2, D1, G1 |
| Alta | 8 | B2 2, B3, C1, D5 2, E1 2 |
| Media | 36 | A1 3, B1, B2, B4, B5 3, B6 2, B8, C1 3, C2, C3, C4 3, C5 2, D1 2, D3 2, E1 4, E2 3, F4, G1, G2 |
| Baja | 42 | — |
| Informativa | 12 | — |

### 5.1 Críticos

#### B2-01 · Con «Solo Gobierno Central», la comparación sigue filtrada por una banqueta que ya no se ve
- **Gravedad, prioridad y esfuerzo:** Crítica · prioridad 1 · S.
- **Auditoría y etapa afectada:** B2 y C4 · cada versión, entrega y uso con datos reales.
- **Dónde:**
  - Resumen › «Comparar con la alcaldía», escritorio y teléfono.
  - `02_fuente/js/07_leyenda_y_capas.js:27` (`setResp` oculta la fila y conserva `filtroBanq`).
  - `10_seleccion.js:79` (un enlace aplica `b` aunque traiga `r=gc`).
  - `08_resumenes.js:38` (`repStat` aplica `pasaBanq`).
- **Qué pasa:**
  - Se espera que, al dejar solo el Gobierno Central, nada se filtre por banqueta: la fila desaparece y la dirección ya no lleva `b`.
  - Se observa en Iztapalapa: «Prioritario · Alcaldía 1,217 · Gobierno Central 35 · Total 1,252» y «Cepas vacantes 597», en lugar de 4,112 · 240 · 4,352.
  - Al recargar la misma dirección salen las cifras correctas. Un enlace `?r=gc&a=007&b=sin` abre directamente con el filtro oculto.
- **Consecuencia concreta:** quien es del Gobierno Central compara contra la alcaldía con cifras 70 % más bajas, sin forma de saberlo. Dos personas con el mismo enlace ven números distintos.
- **Cómo se reproduce:**
  1. Abrir `?a=007` y la pestaña Resumen.
  2. En «Banqueta», elegir «Sin».
  3. En «Atiende», apagar «Alcaldías» y prender «Gobierno Central».
  4. Abrir «Comparar con la alcaldía».
- **Evidencia:** `independiente/banqueta_oculta.js`; salida en `_local/…/indep/salidas/banqueta_oculta.json`. El coordinador lo confirmó en el código (`setResp` solo oculta la fila).
- **Reproducido:** 2 de 2 (revisor independiente) y confirmado en el código.
- **Causa probable:** el estado de la banqueta sobrevive al cambio de red, y `repStat` no distingue la red consultada.
- **Corrección propuesta:** al pasar a `gc`, ignorar la banqueta en todo cálculo, o reiniciarla; en `aplicarURL`, no aceptar `b` cuando viene `r=gc`. Se corrige junto con B2-02.
- **Listo cuando:** una prueba elige «Sin», pasa a solo Gobierno Central y comprueba en Iztapalapa 4,112 / 240, igual que tras recargar. Con `?r=gc&a=007&b=sin` da lo mismo.
- **Estado:** Abierto.
- **Visto por:** Ind., Coord.

#### G1-01 · El aviso de privacidad se funda en una ley abrogada y le faltan apartados que exige la vigente
- **Gravedad, prioridad y esfuerzo:** Crítica · prioridad 2 · S.
- **Auditoría y etapa afectada:** G1 · antes de usar datos reales y antes de entregar. El aviso se publica en la pantalla de acceso.
- **Dónde:** `08_entrega_sia/login/privacidad/aviso_integral.md:24` y `08_entrega_sia/login/acceso/aviso-de-privacidad.html:24`, que va en el paquete.
- **Qué pasa:**
  - El fundamento cita el «artículo 21 Ter de la Ley de Protección de Datos Personales en Posesión de Sujetos Obligados de la Ciudad de México».
  - Esa ley, de 2018, **quedó abrogada** por el transitorio cuarto de la ley con el mismo nombre publicada en la Gaceta Oficial el 13 de julio de 2026, que entró en vigor al día siguiente. La ley vigente no tiene art. 21 Ter.
  - Su art. 23 exige en el aviso integral un apartado de **transferencias** y los derechos **ARCOP** (acceso, rectificación, cancelación, oposición y portabilidad). El aviso no trae transferencias y dice «ARCO».
  - El aviso tiene fecha del 5 de octubre de 2026, posterior a la abrogación.
- **Consecuencia concreta:** cada persona que entre verá un aviso que cita un artículo que ya no existe. Se suma a que el aviso no está aprobado (D1-01).
- **Cómo se reproduce:** comparar `aviso_integral.md:24` y `:37-39` con el texto oficial: transitorio cuarto y artículo 23 de la ley del 13-07-2026, publicada en paot.org.mx.
- **Evidencia:** texto oficial extraído en `_local/…/e6/g1/fuentes/lpdp2026.txt` (art. 23 en la línea 637, transitorio cuarto en la línea 2774) y en `_local/…/indep/g1/`. El coordinador leyó el transitorio y el art. 23 en el texto oficial.
- **Reproducido:** 2 de 2 (dos revisores por separado) y confirmado por el coordinador.
- **Causa probable:** el aviso se redactó con la ley de 2018; no se revisó la reforma de julio de 2026.
- **Corrección propuesta:**
  - Mientras tanto, dejar el fundamento entre corchetes («[confirmar con la Unidad de Transparencia]») y marcar el aviso integral como borrador.
  - Agregar «Transferencias» y cambiar a «ARCOP».
  - Mandar a la Unidad de Transparencia la ley vigente para que fije los artículos.
- **Listo cuando:** una prueba rápida falla si un aviso cita «21 Ter» o le falta «Transferencias», y la Unidad de Transparencia aprueba el texto por escrito.
- **Estado:** Decide Liber, con la Unidad de Transparencia (H5).
- **Visto por:** F6, Ind., Coord.

#### D1-01 · La guía de entrega afirma que la Unidad de Transparencia aprobó el aviso, y no hay constancia
- **Gravedad, prioridad y esfuerzo:** Crítica · prioridad 3 · S.
- **Auditoría y etapa afectada:** D1 · antes de entregar y de abrir el inicio de sesión.
- **Dónde:** `08_entrega_sia/LEEME.md:46`: «Aprobado por la Unidad de Transparencia (oct. 2026)».
- **Qué pasa:** lo contradicen cinco fuentes:
  - la bitácora 54:45, «Pendiente: aprobación de los avisos… antes de abrir»;
  - la bitácora 58:28, «ya no afirman que la Unidad de Transparencia aprobó el aviso»;
  - la bitácora 70:45, «pendiente con el SIA»;
  - el commit `6d87030`, que corrigió la línea 28 de ese archivo y dejó la 46;
  - la Nota a la Unidad de Transparencia, sin firma ni número.

  La bitácora 57 (líneas 402 y 421) repite la afirmación.
- **Consecuencia concreta:** el SIA puede abrir el registro de datos personales confiando en una aprobación que no existe.
- **Cómo se reproduce:** `grep -rn "Aprobado por la Unidad" 08_entrega_sia`.
- **Evidencia:** el comando anterior; `git show 6d87030 -- 08_entrega_sia/LEEME.md`. El coordinador lo confirmó con el mismo comando.
- **Reproducido:** 2 de 2 y confirmado.
- **Corrección propuesta:**
  - Cambiar la línea 46 a «En revisión de la Unidad de Transparencia; **no abrir el inicio de sesión sin su aprobación por escrito**».
  - Repetir ese requisito en `SESION_Y_LOGIN.md` §7 y en `LEEME_PAQUETE.md`.
  - Rectificar la nota 57 con una nota nueva de la bitácora.
- **Listo cuando:** una prueba rápida no encuentra ninguna afirmación de aprobación sin el número de oficio.
- **Estado:** Abierto.
- **Visto por:** F6 como Crítica, Ind. como Alta, Coord. Se calibró en Crítica porque es la condición para tratar datos personales.

### 5.2 Altos

#### B2-02 · La columna «Gobierno Central» de la comparación filtra con otra regla que el bloque del Gobierno Central
- **Gravedad, prioridad y esfuerzo:** Alta · prioridad 7 · M.
- **Auditoría y etapa afectada:** B2, B3 y C4 · cada versión y entrega.
- **Dónde:**
  - Tabla «Alcaldía y Gobierno Central» (`08_resumenes.js:35-41`, `repStat`), contra el bloque «Equivalencia en km de frente» (`:46-58`, `gcFrente` y `gcBanq`).
  - Diccionario del Excel de frentes (`11_descargas.js:229-233`).
  - Ficha PDF de alcaldía y de colonia (`12_fichas_pdf.js:135-139`).
- **Qué pasa:**
  - La regla documentada es que la banqueta solo aplica a calles de alcaldía (`ARQUITECTURA.md:116`) y que «Espacio» acota al Gobierno Central por tramo de vialidad, con camellón. La pantalla misma dice «No es un filtro» (`08_resumenes.js:58`).
  - `repStat` aplica la banqueta y el «Espacio» por frente también a los frentes del Gobierno Central.
  - Ejemplos:
    - Iztapalapa con «Sin»: la tabla dice 35 km y la equivalencia 240.
    - Iztapalapa con «Cepa vacante»: 32 contra 63.
    - Iztapalapa con «Sin» y tocón o árbol muerto: 12/8 contra 71/64.
    - Ciudad con «Sin»: 132 contra 1,254.
    - Coyoacán con «Sin», en ficha y Excel: 7.75 contra 77.8.
  - La frase «Además, … quedan a cargo del Gobierno Central» da la cifra sin filtro.
  - En 204 estados × 2 corridas hubo 498 diferencias, las mismas en las dos corridas. Las 168 de «Prioritario» coinciden al 100 % con la regla de `repStat` y con ninguna de la documentada.
- **Consecuencia concreta:** en la misma consulta circulan hasta cuatro cifras del Gobierno Central, y el «Total» de la tabla suma una columna mal filtrada.
- **Cómo se reproduce:** abrir `?r=both&a=007&b=sin&e=to,am` y la pestaña Resumen; comparar la columna «Gobierno Central» con «Equivalencia en km de frente».
- **Evidencia:** `datos_y_construccion/b2_*`, `tareas_y_textos/c4_comparacion.js`, `independiente/comparar.py` y `estado_app.js`; salidas en `_local`. El coordinador lo confirmó en el código.
- **Reproducido:** 2 de 2 por tres revisores.
- **Causa probable:** `repStat` reutiliza el filtro de las alcaldías para las dos redes.
- **Corrección propuesta:** para `g=1`, usar `pasaEspacioVP(F.vp[i])` sin banqueta, igual que `gcFrente`. Hacer lo mismo en `espComp` con colonia. Con filtro, la frase «Además…» usa la cifra filtrada o se quita.
- **Listo cuando:** en los 204 estados de `comparar.py`, la columna Gobierno Central es igual a «Equivalen a…» y hay 0 diferencias contra la regla documentada.
- **Estado:** Decide Liber la regla. Se recomienda la opción A de la sección 8.
- **Visto por:** F1, F3, Ind., Coord.

#### B2-03 · «Prioritario» del Gobierno Central tiene dos definiciones, y 256 km prioritarios no están en ninguna lista
- **Gravedad, prioridad y esfuerzo:** Alta · M.
- **Auditoría y etapa afectada:** B2 y D5 · entrega. Es H-019 de la auditoría del 2 de octubre: sigue abierto y creció.
- **Dónde:** `gcFrente` suma por la clase de cada frente (`F.prio`); las listas y descargas de tramos usan la clase del tramo (`VP.prio`). El cruce está en `03_procesamiento_datos/3_cruzar_vialidades_primarias.py`.
- **Qué pasa:**
  - «Avenida Universidad» (`?r=gc&v=136`) dice «0 km prioritarios · 0 de 84 tramos prioritarios» y, en la misma pantalla, «Equivalen a 20 km de frente…, 8.5 km prioritarios». Le pasa a 42 avenidas.
  - 2,360 frentes prioritarios (256.2 km) pasan al Gobierno Central sobre tramos no prioritarios y no salen en ningún Excel. El 2 de octubre eran 124.2 km.
  - Al revés, 2,124 frentes no prioritarios (188.6 km) están sobre tramos prioritarios.
  - Las alcaldías más afectadas son Álvaro Obregón (58.5 km), Benito Juárez (45.8) y Coyoacán (42.6).
- **Consecuencia concreta:** el modelo dice que conviene reforestar esos frentes primero, y no son tarea de nadie en la herramienta.
- **Cómo se reproduce:** `documentos_y_metodo/d5_h019.js` e `independiente/clase_gc.py` y `huerfanos.py`.
- **Evidencia:** salidas en `_local/…/e6/d5/d5_h019.json` e `indep/salidas/av_*.json`.
- **Reproducido:** 2 de 2 por dos revisores.
- **Corrección propuesta:** decidir qué prioridad rige en las vialidades primarias (sección 8). Mientras tanto, agregar en Descargas del Gobierno Central «Frentes prioritarios sobre vialidades primarias».
- **Listo cuando:** una prueba cuenta los frentes prioritarios del Gobierno Central y verifica que todos estén en algún archivo, y que una avenida con 0 km prioritarios tenga equivalencia prioritaria 0.
- **Estado:** Decide Liber.
- **Visto por:** F6, Ind.

#### C1-01 · El Excel para la cuadrilla no trae la lista que se eligió en pantalla
- **Gravedad, prioridad y esfuerzo:** Alta · prioridad 9 · M.
- **Auditoría y etapa afectada:** C1 y B3 · es la tarea principal del personal de alcaldía.
- **Dónde:**
  - `09_listados.js:171`: la pantalla ordena por cepas en frentes prioritarios.
  - `11_descargas.js:298`: el archivo ordena por `km_prioritario` y deja fuera las calles sin km prioritarios.
  - `:251`: `cepas_vacantes` cuenta todas las prioridades.
- **Qué pasa:**
  - Con «Mostrar: Calles · más cepas vacantes» y «Sin» banqueta, las 10 primeras calles de pantalla aparecen entre las 10 primeras del Excel así: 2 en Coyoacán, 0 en Iztapalapa y 1 en Tlalpan.
  - Aun reordenando el Excel por su columna de cepas, en Coyoacán solo coinciden 5 de 10, y ninguna en la misma posición.
  - En Iztapalapa, la pantalla cuenta 2,194 calles y el Excel trae 2,178.
  - El Excel de avenidas incluye una con 0 km prioritarios y 0 cepas.
- **Consecuencia concreta:** la cuadrilla recibe otras calles.
- **Cómo se reproduce:** abrir `?a=003&b=sin`, elegir «Mostrar: Calles · más cepas vacantes» y descargar «Resumen por calle (Excel)».
- **Evidencia:** `tareas_y_textos/c1_orden_excel.js` y `.py`, y `independiente/descargas_app.js` con `verificar_descargas.py`. El coordinador confirmó el orden fijo en el código.
- **Reproducido:** 2 de 2 por dos revisores.
- **Corrección propuesta:** el resumen sale en el orden de «Mostrar», con una columna `cepas_vacantes_prioritario` y el mismo conjunto de calles que la lista.
- **Listo cuando:** en 3 alcaldías y cada orden, los 40 primeros renglones del Excel son los 40 de la pantalla.
- **Estado:** Decide Liber (sección 8).
- **Visto por:** F3 como Alta, Ind. como Media, Coord.

#### B3-01 · El Excel puede describir otro ámbito si se cambia de alcaldía mientras se carga el inventario
- **Gravedad, prioridad y esfuerzo:** Alta · prioridad 8 · S. Probabilidad baja.
- **Auditoría y etapa afectada:** B3 y F2 · descargas.
- **Dónde:** `11_descargas.js:265-268`: `deliverConEsp` espera al inventario y después `dictAoa` (`:139-143`) lee el ámbito y el filtro del momento.
- **Qué pasa:** se pidió el Excel de frentes de Milpa Alta con el inventario lento y, durante la espera, se eligió Tláhuac. El archivo traía 8,505 renglones de Milpa Alta y se llamaba `frentes_prioritarios_milpa_alta_…`, pero su diccionario decía «Ámbito consultado: Tláhuac».
- **Consecuencia concreta:** un archivo oficial que se contradice. Quien lo lea por el diccionario atribuye a Tláhuac la lista de Milpa Alta.
- **Cómo se reproduce:** `documentos_y_metodo/f2_carrera_excel.js` con una espera de 8 s.
- **Evidencia:** `_local/…/e6/f2/f2_carrera_corrida*.json`. El coordinador confirmó en el código que el estado se lee después del `await`.
- **Reproducido:** intermitente, 2 de 3: depende de la espera.
- **Corrección propuesta:** guardar el ámbito, el filtro y la calle antes de esperar y pasarlos al diccionario (también en `geoDescarga`).
- **Listo cuando:** `f2_carrera_excel.js` pasa como prueba permanente.
- **Estado:** Abierto.
- **Visto por:** F6, Coord.

#### D5-01 · «Sin arbolado» se presenta como clase del modelo, pero es el dato de árboles de INEGI 2020
- **Gravedad, prioridad y esfuerzo:** Alta · prioridad 6 · S.
- **Auditoría y etapa afectada:** D5 · pantalla, Excel y fichas.
- **Dónde:** `08_resumenes.js:84` («“sin arbolado” es la clase del modelo»), `11_descargas.js:45` (diccionario de cada Excel), `12_fichas_pdf.js:139`. `ARQUITECTURA.md:174` dice «por confirmar»; `CONTRATO_DE_DATOS.md:42` dice que es `ARBOLES_D` de INEGI.
- **Qué pasa:** al unir la herramienta con el insumo del modelo frente por frente, los 130,119 frentes «sin arbolado» resultan ser «No dispone» de árboles en INEGI 2020. El modelo mide el verdor con NDVI y no usa ese campo. De esos frentes:
  - 37,761 (29 %) están en la clase de verdor más alta del modelo, con 93.6 % o más de vegetación;
  - solo el 33 % están en la más baja.
- **Consecuencia concreta:** la cifra «De lo prioritario, sin arbolado» (5,040 km en las alcaldías) se lee como resultado del modelo, y es otra fuente que lo contradice en 3 de cada 10 casos.
- **Cómo se reproduce:** `documentos_y_metodo/d5_sensibilidad.py` e `independiente/union_modelo.py`; los dos requieren el insumo extraído del `.rar`.
- **Evidencia:** `_local/…/e6/d5/d5_sensibilidad.json` e `indep/salidas/union_modelo.txt`.
- **Reproducido:** 2 de 2 por dos revisores.
- **Corrección propuesta:** cambia un texto.
  - Antes: «“sin arbolado” es la clase del modelo».
  - Después: «sin árboles según INEGI 2020 (Características del Entorno Urbano); no es el verdor del modelo».
  - Otra salida: calcularlo con el verdor del modelo.
- **Listo cuando:** ninguna salida dice «clase del modelo» junto a «sin arbolado».
- **Estado:** Decide Liber.
- **Visto por:** F6, Ind.

#### D5-02 · La metodología publicada no describe la regla con que se calcula la prioridad del frente
- **Gravedad, prioridad y esfuerzo:** Alta · L.
- **Auditoría y etapa afectada:** D5 · ayuda, fichas y diccionarios. Son H-004 y H-016 del 2 de octubre: siguen abiertos.
- **Dónde:** `02_fuente/plantilla.html:264-300`.
- **Qué pasa:** con el insumo original se reprodujo la regla en 372,534 de 372,534 frentes:
  - La prioridad del frente es el **promedio** de la calificación de una zona de celdas hexagonales (`pr_sdm_hx`) y la clase de verdor (`cat_pndvi`), con los cortes <2 Muy Baja, 2 Baja, 2.5–3 Media, 3.5 Alta y ≥4 Muy Alta.
  - La metodología dice que «combina la de su colonia con el verde de su frente» y no da la regla, los pesos ni los cortes.
  - Esa zona **no es** la prioridad de colonia que muestra la herramienta: difiere en 67,566 frentes (18.1 %).
  - Cambiar el peso de la zona a 1/3 o 2/3 mueve los km prioritarios entre −10 % y −14 %, y de 67 a 140 mil frentes cambian de clase.
  - 103 frentes tienen zona 0 (sin dato) y aun así reciben clase.
  - 69,518 frentes (2,953 km prioritarios) están en suelo de conservación, aunque la nota 06 decía que se descartaban.
- **Consecuencia concreta:** una calle Muy Alta en una colonia Media no se puede explicar con lo publicado, y los datos lo contradicen.
- **Cómo se reproduce:** `documentos_y_metodo/d5_sensibilidad.py` e `independiente/modelo_insumo.py`.
- **Evidencia:** `_local/…/e6/d5/` e `indep/salidas/modelo_insumo.txt`.
- **Reproducido:** 2 de 2 por dos revisores.
- **Corrección propuesta:** publicar la regla exacta, con pesos y cortes, y llamar «zona» a lo que no es la colonia. Llevar al especialista las preguntas de la sección 8. El documento del modelo se hace con el SIA (pendiente 10 del README).
- **Listo cuando:** una prueba recalcula la prioridad con la regla publicada y obtiene 372,534 de 372,534.
- **Estado:** Decide Liber, con el SIA y el especialista (H5).
- **Visto por:** F6, Ind.

#### E1-01 · El bloqueo por intentos y el límite por red se saltan con peticiones simultáneas
- **Gravedad, prioridad y esfuerzo:** Alta · prioridad 5 · M.
- **Auditoría y etapa afectada:** E1 y E3 · antes de usar datos reales (OWASP ASVS 2.2.1).
- **Dónde:** `08_entrega_sia/login/backend/src/modulos/priorizacion-reforestacion/rutas.ts:147-160` (el límite por red se revisa antes de verificar y se anota después) y `:173-184` (el contador de la cuenta se lee y se escribe sin operación atómica).
- **Qué pasa:**
  - Se espera, como máximo, 5 contraseñas por cuenta y 30 intentos fallidos por red cada 15 minutos.
  - Con 20 o 40 intentos simultáneos, todos se verifican, la cuenta queda con 1 intento fallido y sin detener, y enseguida entra con la contraseña correcta.
  - Con 40 o 120 intentos simultáneos desde una red no hay ninguna respuesta «demasiados intentos». En serie, el bloqueo sí funciona.
  - El ejemplo de nginx trae `limit_req` comentado y dice «el módulo ya limita».
- **Consecuencia concreta:** se pueden adivinar contraseñas a la velocidad del servidor, sobre todo las temporales (E1-02, E1-03).
- **Cómo se reproduce:** los detalles están en el informe privado.
- **Evidencia:** `_local/…/e4/`, `e5/backend_e2_*`, `e5/login_e3_*` e `indep/salidas/ataques_login_*`. El coordinador lo confirmó en el código.
- **Reproducido:** 2 de 2 (frente 4), 2 de 2 con pg-mem y 2 de 2 por HTTP (frente 5), y 3 de 3 (independiente).
- **Corrección propuesta:**
  - Incrementar el contador con una sola sentencia atómica (`UPDATE … SET intentos_fallidos = intentos_fallidos + 1 … RETURNING`) antes de verificar.
  - Reservar el intento por red antes de verificar.
  - Activar `limit_req` en el ejemplo de nginx.
- **Listo cuando:** en `sesion.test.mjs`, 20 intentos simultáneos dejan la cuenta detenida y la contraseña correcta rechazada, y 40 simultáneos desde una red dan al menos 10 respuestas 429.
- **Estado:** Abierto.
- **Visto por:** F4, F5, Ind., Coord.

#### E1-02 · Una cuenta de administración con contraseña temporal opera el panel; la temporal no caduca
- **Gravedad, prioridad y esfuerzo:** Alta · prioridad 4 · S.
- **Auditoría y etapa afectada:** E1 · antes de usar datos reales (OWASP ASVS 2.3.1).
- **Dónde:** `rutas.ts:139-145`: `conSesion` no revisa `debe_cambiar`; solo lo hace la puerta de la herramienta (`:198`). El esquema no tiene caducidad para la temporal.
- **Qué pasa:** con la contraseña temporal sin cambiar, una cuenta de administración:
  - lista las cuentas;
  - da de alta otra cuenta de administración y recibe su contraseña temporal;
  - descarga la bitácora.

  Además, una temporal emitida hace 400 días sigue entrando, y la contraseña «nueva» puede ser la misma temporal.
- **Consecuencia concreta:** quien vea una temporal de administración (se reparten por mensaje o CSV) administra cuentas y descarga datos personales sin dejar rastro.
- **Evidencia:** `_local/…/e4/` e `indep/salidas/ataques_login_*`. El coordinador lo confirmó en el código.
- **Reproducido:** 2 de 2 por dos revisores.
- **Corrección propuesta:**
  - `conSesion` responde 403 «Primero cambia tu contraseña» si `debe_cambiar`, salvo en `/contrasena`, `/yo` y `/salir`.
  - La temporal caduca a las 72 horas.
  - Se rechaza una contraseña nueva igual a la actual.
- **Listo cuando:** las tres comprobaciones quedan en `sesion.test.mjs` y pasan.
- **Estado:** Abierto.
- **Visto por:** F4, Ind., Coord.

### 5.3 Medios

| Clave | Qué pasa | Corrección propuesta | Listo cuando | Visto por | Estado |
|---|---|---|---|---|---|
| A1-01 | Ninguna verificación corre sola: no hay `.github/` ni ganchos de Git. La propuesta de 3 oct no está activada | Activar las rápidas en cada push o un gancho `pre-commit` | Un commit con `docs/` desfasado se rechaza | F1 | Decide Liber |
| A1-02 | Funciones sin ninguna prueba: «Seguirme», contenido del registro de usos, el proceso de servicio con sesión y su actualización, el recorrido con «Las dos», Firefox | Pruebas nuevas (sección 12) | Cada función tiene una comprobación que falla al quitarla | F1 | Abierto |
| A1-03 | La prueba «sin conexión» usa `setOffline`, que no corta la red del proceso de servicio: 25 pedidos llegaron al servidor «sin red». Pasa aunque la copia esté incompleta y por eso no detectó B6-01 | Cortar en el servidor, como `ciclo_version.js`, y contar los pedidos | La prueba falla si se borra `data.bin` de la caché | F2 | Abierto · falla de la prueba |
| B1-01 | En teléfono horizontal (844×390) y con zoom al 200 %, la ficha queda bajo el recuadro «Resumen» (se lee «ORIDAD MEDIA»), tapa los 6 botones del mapa, y la leyenda tapa «Cómo llegar» | Ficha a la izquierda bajo el «Resumen» cuando el alto es de 480 px o menos; leyenda debajo de la ficha | `barrido.js`: 0 tapados en esos estados | F2 | Decide Liber |
| B2-04 | Fichas PDF y Resumen mezclan cifras con y sin filtro sin decirlo: «Concentra 25.1 % de la ciudad» (con el filtro sería 14.4 %), «Además, …», la leyenda «km de la alcaldía» con km filtrados; la cifra «1 frentes» | Omitir o filtrar la participación; etiquetar cada cifra filtrada y decir «sin filtros» en las de contexto | La prueba de fichas filtradas no encuentra porcentajes sin filtro | F1 (Alta), Ind., Coord. | Abierto |
| B4-01 | En el teléfono, al elegir una calle en el buscador el foco cae en `body`, porque se enfoca un elemento ya inerte | Enfocar «Volver a la información» o la ficha | El foco no queda en `body` ni dentro de algo inerte | F2 | Abierto |
| B5-01 | Un `SIA_INVENTARIO` mal formado en `config.js` impide abrir toda la herramienta | Validar la forma; si no sirve, seguir sin inventario | S-12 a S-14 abren sin errores | F5 | Abierto |
| B5-02 | Si el inventario o las manzanas del fondo fallan una vez, no se vuelven a pedir en toda la visita, y el aviso culpa a la conexión aunque el archivo esté dañado | Reintentar a los 30 s o con el evento `online`; botón «Reintentar»; texto distinto si el archivo está dañado | S-21 dibuja la alcaldía al volver la red | F5, F6 | Abierto |
| B5-03 | Si el archivo del inventario se queda colgado, el Excel, el KML y el GeoJSON nunca llegan («Preparando archivo…» sin fin) | Tiempo máximo de unos 15 s; después el archivo sale sin las columnas de espacios | Descarga en 20 s o menos con el inventario colgado | F6 | Abierto |
| B6-01 | Si una versión nueva llega a medias, la herramienta deja de abrir sin conexión: se queda sin `config.js` o con 16 de 17 archivos | `install` con `addAll`, sin activar una precarga incompleta; no guardar la página nueva en la caché vieja | `ciclo_version.js`, escenarios B y C, abre sin red | F2 | Abierto |
| B6-02 | La primera visita con el proceso de servicio descarga el doble: 15.8 MB en lugar de 7.2 en el teléfono, y 11.9 en lugar de 5.6 en escritorio. Además precarga `xlsx` y `jspdf`. El cargador anuncia «5 MB» | Precargar con `cache:'default'`, porque los archivos llevan huella; librerías bajo demanda | Un pedido por archivo; 6.5 MB o menos | F2, F6 | Abierto |
| B8-01 | En WebKit (el motor de Safari), `data`, `meta` y `vp` se piden dos veces porque no se aprovecha la precarga | Ajustar el `fetch` o la precarga; confirmar en un iPhone real | 1 pedido por archivo en los dos motores | F2 | Abierto |
| C1-02 | La ficha de un frente no dice si tiene cepas y remite a «Resultados», que ya no existe | Renglón «Espacios para plantar»; «están en el panel» | Ningún texto dice «Resultados» | F3 | Abierto |
| C1-03 | El mando no tiene un archivo de la ciudad: 50 cifras en 2.5 pantallas para copiar a mano | «Resumen por alcaldía (Excel)» | Existe la descarga en toda la ciudad | F3 | Decide Liber |
| C1-04 | Las reglas del inventario (20 m, 25 m, «en curso») no se ven donde se aplican: en el teléfono están plegadas y faltan en el aviso del filtro | Dejarlas a la vista bajo el selector y en el aviso | — | F3 | Abierto |
| C2-01 | En la computadora, la respuesta volvió a quedar bajo el pliegue: con una colonia, las cifras empiezan en y=915 de 900. Es una regresión del hallazgo C1 del 24 sep | Plegar en la computadora los recuadros del ámbito; «Espacio» en un renglón | Las cifras y el primer renglón quedan arriba del pie | F3 | Abierto |
| C3-01 | Una calle consultada ocupa 7.8 pantallas en el teléfono: 31 tramos completos, 968 palabras | 5 tramos y «Ver los 31» | Menos de 3 pantallas | F3 | Abierto |
| C4-01 | La lista «Dónde empezar» no dice qué filtro tiene puesto (24 de 24 estados) | `filtroCorto()` en el conteo de la lista | `#ini-count` dice el filtro | F3 | Abierto |
| C4-02 | Recargar o compartir la dirección pierde la calle, el orden y la pestaña | Calle (`k=`), orden y pestaña en la dirección | El enlace en otro navegador reproduce todo | F3, F6 | Decide Liber |
| C4-03 | Un enlace sin alcaldía (`?b=sin`) y la segunda pestaña abren la última consulta recordada, no lo enviado | Escribir siempre el ámbito; aplicar lo recordado solo sin parámetros | `?b=sin` abre la ciudad | F3, F6 | Abierto |
| C5-01 | «Tramo» tiene tres significados: entre esquinas, un frente, y de cruce a cruce | Un término por concepto (glosario en el informe del frente 3) | Ningún texto dice «tramo es el frente» | F3 | Abierto |
| C5-02 | «Gobierno Central» (57 textos) y «Gobierno de la Ciudad» (15) para el mismo responsable | «Gobierno Central» salvo en el fundamento legal | — | F3 | Decide Liber |
| D1-02 | Número y duración de las pruebas: 12, 6 y 18 pruebas; 12, 15, 40 y 80 minutos, según el documento | Una sola cifra en `04_pruebas/LEEME.md` y los demás documentos remiten a él | Una prueba rápida compara el conteo | F1, F2, F3, F6, Ind. | Abierto |
| D1-03 | Los documentos de entrega describen la v1.0: «8 MB», «tres archivos», «14 archivos», «12 de 12», «5 de 5», «trae la clave del mapa» (no la trae), «no envía nada al servidor» (con sesión sí envía) | Actualizar las cifras y remitir a `cifras_de_la_construccion.md` | Una prueba rápida no encuentra esas frases | F6, Ind. | Abierto |
| D3-01 | El contrato de datos no basta para leer `inv_*.bin`: faltan el encabezado, las diferencias y la escala 200000. Leído como dice, el primer punto sale en lon 0.00002 | Tabla de campos en la sección 6 bis | Un lector escrito solo desde el contrato reproduce `RESUMEN.json` | F1 | Para el SIA |
| D3-02 | «Corte: septiembre de 2026» no dice que el 10.4 % de los puntos viene de imágenes anteriores a 2022 (algunas de 2008) y que el 11.4 % no tiene fecha | Decir el rango de fechas; después, el año de la imagen en la ficha | La nota nombra el rango | F1 | Decide Liber |
| E1-03 | El tiempo de respuesta delata las cuentas con contraseña temporal: unos 40 a 120 ms contra 160 a 580 ms | Mismo costo para todas las huellas | Medianas dentro de ±15 % | F4, F6, Ind. | Abierto |
| E1-04 | La depuración de datos personales corre por primera vez 24 h después de arrancar. Si el servidor se reinicia antes, nunca corre, y el aviso promete eliminación automática | Depurar al arrancar y cada 24 h; tarea diaria obligatoria en la base | Una prueba de la llamada al crear el módulo | F4, Ind. | Abierto · Para el SIA |
| E1-05 | Se aceptan contraseñas comunes («123456789012»), y el cambio de contraseña no limita los intentos | Lista local de contraseñas comunes; contar los fallos en `/contrasena` | 4 comunes rechazadas; bloqueo tras 5 | F4 | Abierto |
| E1-06 | El CSV de contraseñas temporales que arma el panel deja fórmulas activas (`=HYPERLINK…`) junto a las contraseñas | Anteponer un apóstrofo, como `usos.csv`; validar los nombres | Ninguna celda empieza con `= + - @` | F4, F5, Ind. | Abierto |
| E2-01 | El alta masiva no usa transacción: si falla la fila 50, quedan 49 cuentas creadas y 0 contraseñas devueltas, y al reintentar salen como «existentes» | Transacción por envío; `ON CONFLICT`; 409 en el alta simultánea | Con la falla inyectada no queda ninguna cuenta | F5 | Abierto |
| E2-02 | Dos administradores pueden darse de baja a la vez y dejar 0 cuentas de administración | Regla «al menos una» en la misma sentencia; 409 | Queda 1 y una petición recibe 409 | F5 | Abierto |
| E2-03 | No hay procedimiento de respaldo ni de restauración de la base, e `INSTALACION.md:71` dice que la reversión «no pierde nada» | Sección «Respaldo y restauración» con su verificación y `depurar()` después de restaurar | El SIA restaura en una base de ensayo siguiendo solo el texto | F5 | Para el SIA |
| F4-01 | `empaquetar.py` no se detiene ante `.env`, `.pem`, `.sql` ni un CSV de contraseñas (4 de 4 quedaron en el ZIP). En el ejemplo de nginx, la ruta de acceso no niega los archivos ocultos | Lista blanca de extensiones por carpeta; búsqueda de secretos antes de cerrar el ZIP | La prueba con archivos sembrados termina con error | F4 | Abierto |
| G1-02 | La tabla «Fundamento» tiene cinco citas con matices y un paréntesis equivocado: la «paleta vegetal» no está en la NADF-001. Seis citas son correctas | Las correcciones del cotejo, con visto bueno jurídico | Jurídico firma la tabla | F6, Ind. | Decide Liber · jurídico |
| G2-01 | No existe un registro fijo de las fallas que vienen de componentes de otro equipo; el frente 6 encontró 11, dispersas | `05_documentacion/componentes_compartidos.md`, con la forma de la sección 9 | El archivo existe y cubre cada librería | F6 | Decide Liber |

### 5.4 Bajos

| Clave | Qué pasa | Visto por |
|---|---|---|
| A1-04 | 281 esperas fijas en las pruebas; con `REF_ANTERIOR=no`, dos pruebas omiten la comparación con la versión anterior y pasan | F1 |
| A5-01 | Una clave de un proveedor de mapas base, ya sin uso, quedó en 26 commits del historial público; no consta que se haya revocado | F1, F4 |
| A6-01 | La auditoría de contraste no mide las capas nuevas sobre el satélite (filete, resalte, límites, tocón y árbol muerto). Hoy cumplen | F2 |
| A6-02 | 61 colores escritos a mano en el CSS; la paleta de la ficha PDF está duplicada en el JS | F2 |
| B1-02 | En el teléfono horizontal, los controles bajan a 26–34 px; la regla de 44 px no cubre ese caso | F2 |
| B1-03 | Tocar la única red elegida no hace nada y no avisa; lo mismo con «Colonias» en el panel de capas | F2 |
| B1-04 | En la ayuda, en teléfono y tableta, aparece «4 Cómo leer los resultados» sin los pasos 1 a 3, que están plegados | F2 |
| B3-02 | El título del Excel sale sin acentos; el KML y el GeoJSON de vialidades se llaman `calles_…` | F1 |
| B3-03 | El KML (58 MB) y el GeoJSON de Iztapalapa congelan la computadora alrededor de un segundo | F1 |
| B3-04 | Un segundo clic o toque, 300 a 600 ms después, entrega otra ficha PDF igual | F5 |
| B3-05 | «Fuentes» del panel, de la ficha PDF y del Excel no nombran el inventario de arbolado | F1 |
| B4-02 | axe, regla `list`: renglones `role="button"` dentro de `<ul>` en «Dónde empezar» y en los tramos | F2 |
| B4-03 | Texto a 4.07:1 en el tramo elegido (`--ink-3` sobre `--dorado-soft`) | F2 |
| B4-04 | Con la entrada o la ayuda abiertas, el tabulador sale al enlace «Saltar a la respuesta» | F2 |
| B4-05 | Al elegir una calle, el anuncio para lectores de pantalla dice la colonia, no la calle | F2 |
| B4-06 | En el teléfono, Esc en la ficha devuelve el foco a «Volver a la información» y no al tramo | F2 |
| B5-04 | Los datos que llegan ya descomprimidos no se comparan con su huella; un tipo de punto inválido rompe la capa | F5 |
| B7-01 | Ni la herramienta ni el aviso dicen que el satélite (Esri) y los enlaces (Google) van a terceros | F4 |
| B9-01 | En la fase con sesión, los archivos protegidos se marcan `public` en la caché | F4 |
| B9-02 | Las respuestas de la API con datos personales no llevan `Cache-Control: no-store` | F4 |
| C4-04 | En la computadora, «Atrás» después de elegir una calle quita el filtro y no la calle | F3 |
| C4-05 | Con «Las dos», elegir una avenida apaga «Alcaldías» sin decirlo | F3 |
| C5-03 | La misma cifra con dos formatos («71 mil» y «70,953»); «km» repetido; «de 13,335 tramos prioritarios» | F3 |
| C5-04 | Vocabulario menor: celular y teléfono; «ficha» para dos cosas; clases, categorías y prioridades; meses abreviados y completos | F3 |
| C5-05 | El recorrido promete que las fichas PDF traen cepas, tocones y árboles muertos, y no los traen | F3, F6 |
| C5-06 | En toda la ciudad, «Selecciona una alcaldía para descargar» aparece junto a dos botones activos | F3 |
| C6-01 | El guinda es acción, opción elegida, título y aviso, y está a la misma distancia de color de «Muy Alta» que dos clases vecinas | F3 |
| D1-04 | Fuentes que se contradicen: arbolado («por confirmar» o «confirmado»), qué guarda el navegador, `e=`, atribución de «Calles», variables de estado y orden de carga en ARQUITECTURA, `repartoHtml` | F1, F3, F6, Ind. |
| D1-05 | `python3` en ARQUITECTURA, README, el LEEME de pruebas y el contrato; el LEEME de pruebas describe funciones retiradas | todos |
| D4-01 | Lo pesado de la primera carga: logo de 168 KB, `fondo_base.bin` pedido en el teléfono sin mapa, tareas de hasta 8 s en 3G × CPU 4 | F6 |
| E1-07 | Error 500 con una cookie mal codificada, con un id no numérico o si falla la bitácora (queda una sesión huérfana) | F4, F5 |
| E1-08 | `GET /salir` se puede provocar desde otro sitio; un POST sin cabecera `Origin` se acepta | F4 |
| E2-04 | Nombres sin largo máximo (se aceptan 7,000 caracteres); un correo con un carácter invisible crea una cuenta «duplicada» | F5 |
| E3-01 | En el buscador, 2,000 caracteres congelan la página de 2 a 8 s, y solo signos da resultados al azar | F5 |
| E3-02 | «Atrás» durante el recorrido guiado o la entrada saca de la herramienta | F5 |
| F1-01 | Restos: `.sinnombre` sin uso, 10 comentarios con número de versión, ganchos de prueba en el sitio publicado | F2, F6 |
| F1-02 | Preferencias que no persisten al recargar: orden, pestaña, fondo, opacidad, prioridades ocultas | F6 |
| F2-01 | La condición del filtro se repite en las cachés, fuera de `enAmbito`: un tercer filtro no llegaría a ellas | F6 |
| F3-01 | La raíz no tiene `package-lock.json` y `npm audit` da ENOLOCK | F4 |
| F4-02 | Los archivos versionados (públicos) nombran esquemas, intermediarios y la configuración del servidor del SIA | F4 |
| G2-02 | Montado como sia-backend, un JSON inválido devuelve la página de error de Express con el rastro del servidor; depende de `NODE_ENV` del SIA | F5 |
| H-099 | Pendiente conocido, confirmado: la herramienta tutea en todo (141 textos) y los avisos de privacidad usan usted (8 casos) | F3 |

### 5.5 Informativos

| Clave | Qué |
|---|---|
| B4-07 | La barra de escala tiene `aria-label` en un `div` sin rol |
| B4-08 | Las pestañas no responden a las flechas; no incumple WCAG |
| B8-02 | Las fechas de archivos y fichas siguen la zona del equipo, no la de la CDMX |
| B9-03 | HSTS queda a cargo del terminador de HTTPS del SIA |
| C3-02 | Primera visita: 101 palabras, 2 decisiones y 14 pasos del recorrido |
| D3-03 | El avance y los puntos por alcaldía se cuentan con criterios distintos: 216 puntos caen en un frente de otra alcaldía |
| E1-09 | Los catálogos se pintan como HTML sin escapar. Hoy ningún nombre trae `<`, `>` ni `&`, pero conviene vigilarlo si el SIA homologa los catálogos |
| E1-10 | El correo institucional aparece en 93 commits; ya está declarado en el README |
| E2-05 | El módulo no tiene un tope de tiempo propio frente a una base lenta: se apoya en el de 15 s del rol |
| E3-03 | Con la sesión terminada, KML y GeoJSON se siguen entregando y no se registran |
| F3-02 | Aviso bajo de esbuild, solo en la herramienta de desarrollo del servidor |
| F6-01 | Estado de lo pedido por el SIA. Atendido: límite por IP, scrypt, 401 único, alta de 100, rutas y cookie, manifiesto. Pendiente: `ipDeOrigen`, Transparencia, `nginx -t`, catálogos, insumos, Esri, carga por territorio y cierre de GitHub Pages. La propuesta del inventario en PostGIS está en el contrato, pero el contrato no va en el paquete |

---

## 6. Verificado sin hallazgos

- **Cifras de alcaldía:**
  - Frente 1: 41 de 41 bloques iguales al recálculo independiente en 18 combinaciones de red, ámbito, banqueta y espacio, en 2 corridas.
  - Revisor independiente: 0 diferencias en la columna Alcaldía en 204 estados × 2.
  - Km sobre el eje y tramos del Gobierno Central: 0 diferencias.
- **Descargas:** los identificadores del Excel de frentes coinciden exactamente con el recálculo (6 de 6, incluida Iztapalapa con 70,953 frentes). KML y GeoJSON traen tantas líneas como frentes y tramos. Ninguna celda empieza con `= + - @`. Metadatos e idioma `es-MX` presentes. El Excel de 17.9 MB se arma sin congelar la pantalla.
- **Integridad y construcción:** 49 de 49 comprobaciones. 23 de 23 insumos con su suma. Dos construcciones desde cero, idénticas.
- **Pantallas:** en 228 pantallas, 0 desbordes, 0 elementos cortados, 0 errores de consola y 0 respuestas 4xx/5xx. Los 14 enlaces internos y las anclas funcionan. 0 objetivos de menos de 24 px fuera de la excepción.
- **Teclado:** el foco es visible en las 86 paradas de cada ancho y no queda tapado. Las descargas se entregan con Entrar. La ayuda y el recorrido retienen el foco y lo devuelven.
- **Daltonismo:** la rampa de prioridad conserva entre clases vecinas una diferencia de color CIEDE2000 de 11 o más con las tres deficiencias de color. H-051 (la prioridad solo por color, aceptada) sigue vigente con motivo: la prioridad está en texto en la lista, las fichas y el Excel.
- **Contraste:** los 5 pares aceptados (la línea Media contra su filete) siguen con motivo vigente: el filete contra el fondo da 3.63:1 o más.
- **Robustez del sitio:** datos vacíos, dañados o cortados; `config.js` ausente; `sw.js` roto; `localStorage` lleno; reloj en 2099 y en 1999; 30 direcciones con parámetros raros. En todos los casos sale un mensaje claro y la herramienta se recupera.
- **Seguridad del sitio:** 40 de 40 casos de XSS sin ejecución. Sin terceros al abrir (16 de 16). CSP sin `unsafe-inline` y cabeceras de seguridad en el ejemplo de nginx (32 de 32).
- **Inicio de sesión:**
  - 7 de 7 rutas de administración dan 401 sin sesión y 403 con una cuenta normal.
  - Cookies `HttpOnly`, `Secure`, `SameSite=Lax` y `Path` correcto, sin fijación de sesión.
  - scrypt con sal y comparación de tiempo constante.
  - El mismo mensaje para un correo inexistente, una cuenta detenida y una contraseña equivocada.
  - Sin inyección SQL. `usos.csv` neutraliza fórmulas. El rol solo tiene `SELECT, INSERT` sobre la bitácora (revisión estática).
  - Los plazos del aviso coinciden con `depurar()`.
- **Secretos:** `claves.local.json` nunca entró al historial. En `docs/` y en el paquete, gitleaks no encuentra nada. El manifiesto del paquete cuadra en 93 de 93 archivos.
- **Dependencias:** jsPDF 4.2.1, deck.gl 9.4.0 y pako 2.1.0 no tienen avisos de seguridad. Las cinco librerías coinciden con las huellas de `LICENCIAS.md`.
- **Reglas de negocio:** `PRIO_MIN`, `esPrio` y `sumPrio` están en un solo lugar. No hay `>=2`, `[2]+[3]+[4]` ni `style="`.
- **Auditoría UX del 24 de septiembre:** 12 de 15 hallazgos siguen cerrados.

## 7. Contradicciones entre documentos y datos atrasados

| # | Fuente A | Fuente B o realidad | Clave |
|---|---|---|---|
| 1 | `08_entrega_sia/LEEME.md:46`: «Aprobado por la Unidad de Transparencia» | Notas 54:45, 58:28 y 70:45; commit `6d87030`; Nota a la UT sin firmar | D1-01 |
| 2 | Bitácora 57:402 y 57:421: «aprobado» | Notas 58:28 y 70:45 | D1-01 |
| 3 | `aviso_integral.md:24`: «art. 21 Ter» | La ley quedó abrogada el 14-07-2026 | G1-01 |
| 4 | `ARQUITECTURA.md:28` y `README.md:25`: «doce pruebas»; `verificacion_automatica_github.md`: «seis» | `correr_todas.js`: 18 | D1-02 |
| 5 | `CLAUDE.md`: 15 min; `README.md:46`: 12 min | `04_pruebas/LEEME.md`: 40 min; `README.md:93`: 80 min; línea base de esta auditoría: 34 y 65 min | D1-02 |
| 6 | `08_entrega_sia`: «8 MB», «tres archivos», «14 archivos», «12 de 12», «5 de 5», «v1.0», «trae la clave», «no envía nada» | Tabla de D1-03 en el informe del frente 6 | D1-03 |
| 7 | `ARQUITECTURA.md:116`, `08_resumenes.js:58`: «la banqueta solo aplica a las alcaldías» | `08_resumenes.js:38` la aplica al Gobierno Central | B2-02 |
| 8 | `08_resumenes.js:84` y `11_descargas.js:45`: «clase del modelo» | `CONTRATO_DE_DATOS.md:42`: `ARBOLES_D` de INEGI; `ARQUITECTURA.md:174`: «por confirmar» | D5-01 |
| 9 | `plantilla.html`: «combina la de su colonia» | La prioridad usa una zona hexagonal distinta en el 18 % de los frentes | D5-02 |
| 10 | `README.md:106` (v1.12): «sin perder contraseñas» | El alta masiva sin transacción las pierde | E2-01 |
| 11 | `INSTALACION.md:71`: «no pierde nada» | Con el inicio de sesión hay cuentas y bitácora | E2-03 |
| 12 | Ejemplo de nginx: «el módulo ya limita» | Con intentos simultáneos no limita | E1-01 |
| 13 | `aviso_integral.md:35`: «se eliminan de forma automática» | La depuración solo corre si el servidor dura 24 h | E1-04 |
| 14 | `17_recorrido.js:85`: las fichas PDF traen cepas | Las fichas PDF no las traen | C5-05 |
| 15 | `CONTRATO_DE_DATOS.md:3`: «suficiente para escribir un lector» | El inventario no se puede leer con el contrato | D3-01 |
| 16 | `login/LEEME.md:210` y Anexo 1 de la Nota a la UT: el registro guarda la «red y filtro de banqueta» | También guarda `espacio` (`CAMPOS_USO`) | D1-03 |
| 17 | `CIERRE_FASE_1.md:158`: prueba con alcaldías | Descartada (README, pendiente 3) | D1-03 |
| 18 | `README.md:163`: parámetros sin `e=` | El código usa `e=` | D1-04 |
| 19 | `ARQUITECTURA.md:9`: «una preferencia» | `README.md:15`: cuatro claves | D1-04 |
| 20 | `README.md:63`: «ambos llevan atribución» | «Calles» no la lleva (decisión de la nota 71) | D1-04 |
| 21 | Cargador: «5 MB la primera vez» | 7.2 MB sin caché, 15.8 MB con proceso de servicio | B6-02 |
| 22 | `ARQUITECTURA.md:128`: el foco vuelve al control de origen | En el teléfono no vuelve | B4-01, B4-06 |
| 23 | `00_indice.md`, renglón 92: «Versión 1.34» | La nota 92 contiene también la v1.35 | D1-04 |

## 8. Para decidir (Liber)

1. **Regla del Gobierno Central en la comparación (B2-01, B2-02).** ¿La columna del Gobierno Central sigue su propia regla?
   - (A) Sí: sin banqueta y con «Espacio» por tramo y camellón. Costo M. **Recomendada.**
   - (B) Con filtros, la columna muestra «—» y remite a su bloque. Costo S.
2. **Qué prioridad rige en las vialidades primarias (B2-03).**
   - (A) La del tramo, también para los km de frente. Costo M. **Recomendada:** coincide con las listas; la ciudad pasa de 1,253.9 a 1,186.3 km.
   - (B) La del frente, y se cambia el rótulo «equivalen».

   En los dos casos: ¿se ofrece el Excel de los 2,360 frentes prioritarios trasladados?
3. **Excel de la cuadrilla (C1-01).**
   - (a) En el orden de «Mostrar», con la columna de cepas en lo prioritario. Costo M. **Recomendada.**
   - (b) Solo agregar la columna. Costo S.
4. **«Sin arbolado» (D5-01).**
   - (a) Rotular «sin árboles según INEGI 2020». Costo S. **Recomendada ahora.**
   - (b) Calcularlo con el verdor del modelo.
5. **Metodología (D5-02).**
   - (a) Publicar ahora la regla exacta, con pesos y cortes, y llamar «zona» a lo que no es la colonia.
   - (b) Con el SIA, el documento del modelo.

   Preguntas para el especialista (H5):
   1. ¿Por qué pesan igual la zona y el verdor?
   2. ¿Cuáles son los cortes de la suma calor + rezago + sombra?
   3. ¿Por qué los cortes son asimétricos (Alta = solo 3.5)?
   4. ¿De qué tamaño son las celdas hexagonales y por qué se comunica como «colonia»?
   5. ¿Qué imagen, fecha y área de cada frente usa el NDVI, y por qué 110 mil frentes salen al 100 % y 86 mil al 0 %?
   6. ¿Deben contar los 69,518 frentes en suelo de conservación?
   7. ¿Cómo se clasifican los 103 frentes con zona 0?
   8. ¿Qué capa de temperatura de 2024 se usó?
   9. ¿Conviene usar CONAPO o el IDS de EVALÚA?
   10. ¿Cómo se valida la regla de 18 m, 30° y 60 m?
   11. ¿El inventario debería entrar al modelo?
6. **Aviso de asignación preliminar (H-005).** Se retiró en la v1.0 y la regla del cruce sigue sin validar. ¿El motivo sigue vigente ahora que se entrega?
7. **Inventario sin conexión.** Hoy no entra en la copia del navegador.
   - (a) Decirlo en la ayuda. Costo S.
   - (b) Guardarlo: pesa unos 400 KB. Costo S. **Recomendada:** el uso en campo es justo buscar cepas.
8. **Fechas de las imágenes del inventario (D3-02).** **Recomendado:** decir el rango ahora y, con el inventario completo, el año de la imagen en la ficha.
9. **Pantalla:**
   - B1-01, la ficha en horizontal: a la izquierda, bajo el «Resumen».
   - C1-03, archivo para el mando: Excel por alcaldía.
   - C4-02, la calle en la dirección: sí.
   - C4-05, «Las dos» al elegir una avenida: avisar o mantener.
   - C6-01, color de «elegido»: contorno.
   - B1-03, aviso al tocar la única red.
   - B1-04, numeración de la ayuda.
   - B4-06, Esc en el teléfono.
   - E3-02, «Atrás» en el recorrido.
   - F1-02, preferencias que persisten.
10. **Textos:**
    - C5-02: «Gobierno Central» en toda la herramienta.
    - H-099: tú en la herramienta y usted solo en los avisos legales, dicho en el README.
11. **Presupuesto de peso y velocidad.** Propuesta del frente 6:

    | Indicador | Meta | Hoy | ¿Cumple? |
    |---|---|---|---|
    | Primera carga | 6 MB o menos | 5.65 MB | Sí |
    | Con el proceso de servicio | 6.5 MB o menos | 11.9 MB | No |
    | «Listo» en 3G × CPU 4 | 40 s o menos | 33 s | Sí |
    | Tarea más larga | 3 s o menos | 8 s | No |
12. **Inicio de sesión:**
    - E1-02, caducidad de la temporal: 72 h (**recomendada**) o 7 días.
    - E3-03, KML y GeoJSON con la sesión vencida: preguntar al servidor antes de entregarlos.
13. **Repositorio y terceros:**
    - A5-01: revocar la clave vieja de mapas. Son 10 minutos.
    - F4-02: quitar los nombres de la infraestructura del SIA de lo público.
    - B7-01: avisar del satélite y de los enlaces de Google.
14. **A1-01, verificación automática:** activar las rápidas en cada push.
15. **B5-04, huella de los datos en el navegador:** compararla solo cuando llegan ya descomprimidos.
16. **G2-01, registro de componentes compartidos:** aceptar la forma de la sección 9.

### Decisiones de Liber (19 de octubre de 2026)

| Tema | Clave | Decisión |
|---|---|---|
| Regla del Gobierno Central en la comparación | B2-01, B2-02 | Su propia regla: sin banqueta y con «Espacio» por tramo y camellón |
| Prioridad en las vialidades primarias | B2-03 | La del tramo, también para los km de frente |
| Excel de la cuadrilla | C1-01 | El mismo orden y las mismas calles que «Mostrar», con una columna de cepas en lo prioritario |
| «Sin arbolado» | D5-01 | Decir que es el dato de INEGI 2020, no el verdor del modelo |
| Metodología | D5-02 | Publicar ya la regla exacta, con pesos y cortes, y llamar «zona» a lo que no es la colonia. Después, el documento del modelo con el SIA y las preguntas al especialista |
| Asignación al Gobierno Central (18 m, 30° y 60 m) | H-005 | Pedir al SIA que la valide en campo con una muestra de calles antes de decidir si vuelve el aviso «preliminar» |
| Inventario sin conexión | B5-02, B6 | Guardarlo en la copia del teléfono (unos 400 KB) |
| Fechas de las imágenes del inventario | D3-02 | Decir ahora «imágenes de 2008 a 2026»; con el inventario completo, el año de la imagen en la ficha y en el Excel |
| Caducidad de la contraseña temporal | E1-02 | 72 horas |
| Archivo para el mando | C1-03 | Excel con las 16 alcaldías y sus cifras de las dos redes |
| Enlace | C4-02 | Guardar la calle, el orden y la pestaña |
| Preferencias al recargar | F1-02 | Recordar también el fondo del mapa, la opacidad y las prioridades ocultas |
| Nombre del responsable | C5-02 | «Gobierno Central» en toda la herramienta; «Gobierno de la Ciudad» solo en el fundamento legal y el logotipo |
| Trato | H-099 | Tú en la herramienta; usted solo en los avisos de privacidad. Se anota en el README |
| Ficha en horizontal y con zoom al 200 % | B1-01 | A la izquierda, bajo el «Resumen», sin tapar la barra |
| Color de lo elegido | C6-01 | Contorno guinda con fondo claro; el relleno guinda queda solo para la acción principal |
| «Las dos» al elegir una avenida | C4-05 | Mantener el cambio y avisarlo |
| «Atrás» en el recorrido y la entrada | E3-02 | Cerrar el paso, como la ayuda |
| Esc en la ficha, en el teléfono | B4-06 | Volver a la información y al renglón de origen |
| Tocar la única red elegida | B1-03 | Aviso breve |
| Numeración de la ayuda | B1-04 | Quitar el número 4 |
| Fechas de archivos y fichas | B8-02 | Hora de la Ciudad de México |
| KML y GeoJSON con la sesión vencida | E3-03 | Revisar la sesión antes de entregarlos |
| Huella de los datos en el navegador | B5-04 | Compararla solo cuando el archivo llega ya descomprimido |
| Clave vieja de mapas en el historial | A5-01 | Liber la revoca en CARTO; se anota en el pendiente 7 y en la bitácora |
| Datos del SIA en el repositorio público | F4-02 | Marcadores en lo público; los nombres reales solo en el paquete |
| Terceros (Esri y Google) | B7-01 | Avisarlo en la herramienta, junto a «Satélite», y en el aviso de privacidad |
| Verificación automática | A1-01 | Las pruebas rápidas en GitHub en cada push |
| Registro de componentes compartidos | G2-01 | Sí: `05_documentacion/componentes_compartidos.md` |
| Presupuesto de peso y velocidad | D4 | Aprobado: 6 MB o menos en la primera carga; 6.5 MB o menos con la copia sin conexión; «lista» en 40 s o menos en 3G × CPU 4; ninguna pausa de más de 3 s |

## 9. Fallas de componentes compartidos

No hay un registro fijo (G2-01). Forma propuesta para `05_documentacion/componentes_compartidos.md`:

`| Id | Componente y versión | Dueño | Síntoma | Cómo se reproduce | Rodeo (archivo:línea) | Prueba que lo vigila | Avisado a / fecha / medio | Estado | Al actualizar, revisar |`

| Componente | Síntoma | Rodeo | Estado |
|---|---|---|---|
| sia-backend · `ipDeOrigen` | Sin esa función con ese nombre el módulo no compila. Si no descarta los saltos intermedios, el límite por red afecta a todos | Sustituto solo para pruebas, fuera del paquete | Pendiente de confirmar con el SIA (nota 70) |
| sia-backend · `cors()` global | Responde `Access-Control-Allow-Origin: *` en la API del módulo | — | Para el SIA |
| sia-backend · `express.json()` y manejo de errores generales | JSON inválido → página de error de Express con el rastro; el límite de 8 KB del módulo no actúa | — | Para el SIA (`NODE_ENV=production`) — G2-02 |
| sia-backend · límite por red en memoria | Con varios procesos, cada uno lleva su cuenta | — | Para el SIA |
| sia-backend · `crearPool` | Detiene todo el servidor si faltan las variables del módulo | Orden de instalación documentado | Documentado |
| nginx del SIA · `auth_request` | Un 500 del módulo se muestra como la página genérica de nginx | — | Para el SIA (`error_page`) |
| deck.gl 9.4.0 · lista interna de dedos | Dedos «fantasma» en el iPhone | Lectura con la API interna: frágil al actualizar | Activo |
| deck.gl 9.4.0 · `CollisionFilterExtension` y `characterSet:'auto'` | Nombres encimados; zoom trabado | Acomodo propio; juego de letras fijo | Sustituido |
| jsPDF 4.2.1 | No etiqueta el PDF | Limitación declarada (pendiente 11b) | Abierto |
| SheetJS 0.20.3 | No está en npm; `!freeze` no se aplica | Revisar en cdn.sheetjs.com (pendientes 11c y 13) | Abierto |
| GeoServer del SIA · GeoWebCache | Cuota de 2 GiB compartida | Sin precarga | Documentado |
| Esri World Imagery | Uso sin clave; términos por regularizar | — | Pendiente 7 |
| Safari iOS · `100dvh`; Chrome iOS · detección de direcciones | Franja vacía; cifras subrayadas | `innerHeight`; `format-detection` | Rodeo |
| Playwright 1.56 · `setOffline` | No corta la red del proceso de servicio | Cortar en el servidor (A1-03) | Afecta a la prueba |

## 10. No verificable desde aquí · Hipótesis · No confirmado · No aplica

**No verificable desde aquí**

| Qué | Cómo se verifica |
|---|---|
| Lector de pantalla (NVDA, VoiceOver, TalkBack) | Recorrer entrada → calle → tramo → ficha → Excel con NVDA y con VoiceOver en iPhone |
| Firefox: la versión instalada (1543) no corresponde a Playwright 1.56 (1495) y el sistema no deja ejecutarla | Prueba manual o instalación autorizada |
| Safari de iPhone: solo se usó WebKit de Windows | iPhone real; confirmar B8-01 |
| Teléfono y red móvil reales; modo completo con tarjeta gráfica | Equipo real |
| PostgreSQL real: permisos del rol, bitácora no editable, `depurar()`, concurrencia, restaurar un respaldo | `PRUEBAS_PG=1 npm run pruebas` y los guiones de ataque contra una base de ensayo |
| nginx real (`nginx -t`, `limit_req`, `auth_request`, HSTS) e instalación por otra persona (F5) | Ensayo en el servidor de pruebas del SIA |
| Reglamento Interior posterior al 31-10-2025 y el órgano garante que sustituye al INFO: el portal de la Consejería no abrió | Gaceta Oficial desde un navegador |
| Sensibilidad de calor, rezago y sombra: el insumo no conserva los componentes | Con las capas por zona del SIA |
| Contenido de los `.rar` de insumos: no hay descompresor RAR | 7-Zip y `SUMAS_INSUMOS.md` |
| Tiempos limpios: la máquina estuvo al 91 % de CPU por los revisores en paralelo | Repetir D4 en un equipo libre |

**Hipótesis**

- Una ráfaga de unos 1,000 accesos fallidos ocuparía los hilos de scrypt y frenaría a los demás módulos de sia-backend. No se midió.
- Con IPv6, el límite por red se evadiría rotando direcciones del mismo bloque.
- Las regiones vivas que aparecen ocultas podrían no anunciarse. Requiere un lector real.
- En `inv_007.bin` (Iztapalapa) hay un punto con clave de Benito Juárez cerca del límite. Revisarlo con CIGA-UNAM.

**No confirmado**

- El bucle de redirecciones en una ronda del inicio de sesión. Lo causó otro servidor en el mismo puerto y no se reprodujo en otro puerto.
- Esc en el panel de capas en un flujo largo: 0 de 2 al repetir.

**No aplica**

- Modo oscuro: la página se declara `light only`.
- D2, el modelo de datos del sitio: el sitio no tiene base de datos.
- Envíos pendientes sin señal: la herramienta no envía datos.
- Inyección de fórmulas en los Excel de la herramienta: SheetJS escribe texto.
- «Reportar un dato»: se descartó.

**Fallas del entorno, no del sistema**

- La ruta temporal de más de 260 caracteres hizo fallar 7 pruebas en la primera corrida de la línea base, y algunas corridas de los revisores. Desde la unidad corta X: todas pasaron.

## 11. Plan de corrección en bloques cerrados

Cada bloque se cierra con la prueba que lo demuestra: debe fallar antes y pasar después. Esa prueba queda permanente. Se propone una versión por bloque. Las propuestas que cambian la pantalla van aparte, al final.

| Orden | Bloque | Hallazgos | Prueba que lo cierra | Versión |
|---|---|---|---|---|
| 1 | **Cifras del Gobierno Central** | B2-01, B2-02, B2-04, C4-01, F2-01 (una sola función de filtros para las dos redes) | `comparar.py` + `estado_app.js` (204 estados, 0 diferencias contra la regla documentada) y `banqueta_oculta.js` | 1.37 |
| 2 | **Inicio de sesión** | E1-01, E1-02, E1-03, E1-04, E1-05, E1-06, E2-01, E2-02, E1-07, E1-08, E2-04, B9-02 | Casos nuevos en `sesion.test.mjs` y `herramientas.test.mjs`: ráfagas, temporal de administración, tiempos, depuración al arrancar, alta con falla inyectada, baja cruzada | 1.38 |
| 3 | **Aviso y documentos de entrega** | G1-01, D1-01, D1-02, D1-03, D1-04, D1-05, D3-01, E2-03, F4-01, G1-02, G2-01, C5-05 | `prueba_docs_coherencia` en las rápidas: ninguna aprobación sin oficio, ni «21 Ter», ni cifras viejas; conteo de pruebas igual al LEEME; empaquetado con archivos sembrados que falla | 1.39, con la Unidad de Transparencia y jurídico |
| 4 | **Descargas** | C1-01, B3-01, B5-03, B3-02, B3-03, B3-04, B3-05 | `f2_carrera_excel.js`, Excel = lista (40 renglones × 3 alcaldías), inventario colgado, doble clic | 1.40 |
| 5 | **Campo y sin conexión** | B6-01, B6-02, B8-01, B5-01, B5-02, B5-04, A1-03, inventario sin conexión (decisión 7) | `ciclo_version.js` con corte en el servidor, `peso.js`, `precarga.js`, casos de `sitio_b5.js` | 1.41 |
| 6 | **Método** | D5-01, D5-02, B2-03 (según la decisión), D3-02 | Recálculo de la prioridad con la regla publicada (372,534 de 372,534); prueba de avenidas con 0 prioritario | Con el SIA y el especialista |
| 7 | **Verificación automática** | A1-01, A1-02, A1-04, A6-01, F3-01 | Las rápidas corren en cada push; pruebas nuevas de la sección 12 | 1.42 |
| 8 | **Accesibilidad y pulido** | B4-01 a B4-06, B1-02, A6-02, F1-01, C5-03, C5-04, C5-06, E3-01, E1-09 | axe con 0 violaciones en las 65 pantallas; foco en 390 px | 1.43 |
| 9 | **Seguridad menor y repositorio** | A5-01, B7-01, B9-01, F4-02, G2-02 y los pendientes del SIA | Revocación anotada; lista de verificación del SIA actualizada | Antes de entregar |

**Propuestas que cambian la pantalla.** Se hacen solo si Liber las aprueba.

| Clave | Antes | Después |
|---|---|---|
| B1-01 | En horizontal, la ficha arriba a la derecha, bajo el «Resumen» y sobre la barra del mapa | En alto de 480 px o menos, la ficha a la izquierda, bajo el «Resumen», sin tapar la barra |
| C2-01 | En la computadora, recuadros de alcaldía y colonia abiertos; las cifras empiezan en y=915 | Plegados como en el celular; las cifras arriba del pie |
| C3-01 | Los 31 tramos de la calle completos (7.8 pantallas) | 5 tramos y «Ver los 31 tramos» |
| C1-02 | La ficha del frente sin cepas y con «en Resultados» | Renglón «Espacios para plantar (inventario en curso)»; «están en el panel» |
| C1-03 | Sin archivo de la ciudad | «Resumen por alcaldía (Excel)» en toda la ciudad |
| C4-02 | La dirección `?a=007` sin la calle | `?a=007&k=…`, con la calle, el orden y la pestaña |
| C6-01 | Chip elegido con relleno guinda, igual que el botón de descarga | Chip elegido con contorno guinda grueso y fondo claro |
| D5-01 | «“sin arbolado” es la clase del modelo» | «sin árboles según INEGI 2020; no es el verdor del modelo» |

## 12. Pruebas nuevas que deben quedar permanentes

| Prueba (base en `evidencia-2026-10-19/guiones/`) | Qué vigila | Serie |
|---|---|---|
| `prueba_docs_coherencia` (nueva, sin navegador) | Aprobaciones sin oficio, «21 Ter», «Transferencias», cifras viejas en `08_entrega_sia`, conteo y tiempo de las pruebas, `python3` | Rápidas |
| Pares de satélite en `contraste.mjs` (A6-01) | Capas nuevas sobre el satélite | Rápidas (ya corre `prueba_contraste.js`) |
| ids repetidos, términos retirados, `style="`, gitleaks en `docs/`, ESLint en `sw.js`, `config.js` y `excel_worker.js`, clases sin uso | Consistencia automática | Rápidas |
| Ráfagas simultáneas, temporal de administración, caducidad, nueva igual a la actual, contraseñas comunes, `no-store`, entradas mal formadas (pg-mem) | Inicio de sesión | Rápidas (backend, menos de 10 s) |
| `comparar.py` + `estado_app.js` (204 estados) y `b2_recalculo.py` (18 combinaciones) | Cifras de las dos redes con filtros | Completa |
| `banqueta_oculta.js`; avenida con 0 km prioritarios | B2-01, B2-03 | Completa |
| `f2_carrera_excel.js`, inventario colgado, Excel = lista | Descargas | Completa |
| `ciclo_version.js` (corte en el servidor), `peso.js`, `precarga.js` | Sin conexión y peso | Completa |
| axe en los 19 estados, a 390 y 1440 px; foco tras el buscador y Esc en 390 px | Accesibilidad | Completa |
| `sitio_b5.js` (inventario mal formado, reintento, tipo inválido); `doble_pdf.js`; buscador con 2,000 caracteres | Robustez | Completa |
| `barrido.js` completo en 7 anchos | Barrido de pantallas | Antes de entregar |
| `login_e3.js` contra el servidor de demostración; empaquetado con archivos sembrados; gitleaks del historial y del paquete; `npm audit` | Entrega | Antes de entregar |
| `d5_sensibilidad.py` y `union_modelo.py` (requieren el insumo local) | Método | Antes de entregar |

## 13. Criterios de salida

| Momento | Requisito | ¿Cumple? | Razón |
|---|---|---|---|
| En cada cambio | 0 fallas en A1 a A6 | Cumple con reservas | Las rápidas pasan, pero nada corre solo (A1-01) |
| En cada versión | 0 Críticos y 0 Altos abiertos | No cumple | B2-01, B2-02, B2-03, B3-01 |
| Tras cambios grandes de interfaz | Sin Altos en C1 ni en C5 | No cumple | C1-01 |
| Antes de mostrar al área | Sin Altos y 0 diferencias en cifras | No cumple | B2 |
| Antes de cerrar la etapa | Sin contradicciones abiertas; dentro del presupuesto de peso | No cumple | D1-01 a D1-05; no hay presupuesto, y con el proceso de servicio se excede |
| Antes de usar datos reales | E1 a E3 sin Críticos ni Altos; plazo decidido; aviso aprobado con constancia | No cumple | E1-01, E1-02, G1-01, D1-01. Los plazos sí están decididos |
| Antes de entregar | F1 a F6 completas; ensayo aprobado por otra persona | No cumple | F5 no se hizo |
| En documentos que van a firma | 0 citas equivocadas | No aplica hoy | Ningún documento va a firma. El aviso sí cita mal (G1-01) |
| Antes de operar | H1 a H6 con constancia | No cumple | Sin constancias |
| Siempre que aparezca | G2 registrada y avisada | No cumple | No hay registro (G2-01) |

## 14. Calendario

| Qué | Cada cuándo |
|---|---|
| Rápidas (A1 a A6, más las nuevas de la sección 12) | En cada cambio, de forma automática cuando se active A1-01 |
| Serie completa, más 204 estados, axe y ciclo sin conexión | En cada versión |
| C1 a C6 y E3 | Tras cada cambio grande de interfaz |
| D1, D4 y D5 | Al cerrar una etapa |
| E1, con informe aparte | Antes de abrir el inicio de sesión y cada vez que cambie el módulo |
| F1 a F6, gitleaks del historial y del paquete, `npm audit` | Antes de cada entrega al SIA |
| A2, D3 y B2 | Al llegar el inventario completo, y cada vez que se reemplacen datos |
| G1 | Antes de publicar un texto legal, y cada trimestre, porque la ley de datos cambió en julio de 2026 |
| H1 a H6 | Antes de operar |
| H7: dependencias, cuentas y accesos, enlaces, fuentes oficiales, barrido de pantallas | Cada mes, en operación |

## 15. Método

- **Revisores.** Seis revisores en paralelo, cada uno en su propia copia del proyecto. Un **revisor independiente**, sin acceso a los hallazgos de los demás, repitió los frentes con Críticos o Altos: cifras y descargas, inicio de sesión, documentos, método y normas. El coordinador reprodujo los 3 Críticos y confirmó 7 de los 8 Altos en el código o en el texto oficial. D5-02 lo encontraron dos revisores por separado.

  | Frente | Auditorías |
  |---|---|
  | 1 | A1–A5, B2, B3, D3 |
  | 2 | A6, B1, B4, B6, B8 |
  | 3 | C1–C6 |
  | 4 | B7, B9, E1, F3, F4 |
  | 5 | B5, E2, E3 |
  | 6 | D1, D4, D5, F1, F2, F6, G1, G2 |

- **Equipo.** Windows 11, Node 24.12 y Python 3.12. Navegadores:
  - Chromium 141 de Playwright 1.56.0, sin tarjeta gráfica (SwiftShader, modo ligero);
  - WebKit 26 (`webkit-2359`), con su ruta explícita;
  - Firefox no se pudo usar.
- **Herramientas.** axe-core 4.10.2, gitleaks 8.21.2, `npm audit`, ESLint 9.37.0, TypeScript (`tsc`), openpyxl 3.1.5, pdftotext, pypdf y pg-mem 3.0.14. Se autorizó instalar axe-core y gitleaks (descargado de su página oficial, con la suma SHA-256 comprobada) en una carpeta temporal fuera del proyecto.
- **Alcance de las pruebas:**
  - 228 pantallas en 7 anchos (360, 390, 430, 844×390, 768, 1440×900 y zoom al 200 %);
  - 65 pantallas con axe;
  - 204 estados × 2 corridas;
  - 102 fotos de estado;
  - 1,485 textos inventariados;
  - del orden de 1,000 casos en total, cada hallazgo de comportamiento reproducido 2 veces.
- **Línea base:** la serie completa corrió en una copia desde una ruta corta. Pasaron 21 de 22 pruebas. La del recorrido falló 1 vez por tiempos y pasó 53 de 53 en las dos repeticiones. Duración: 65 min con la máquina compartida.
- **Resultado final:**
  - las pruebas existentes no cambiaron, porque no se tocó el proyecto;
  - las 4 rápidas pasaron en las copias de los revisores;
  - `prueba_sin_terceros` pasó 16 de 16, `prueba_servidor_sia` 32 de 32 y las pruebas del módulo 11 de 11, cada una en 2 corridas.
- **Huellas.** SHA-256 de 916 archivos del proyecto al inicio y al final: **sin cambios**. Se omitieron `.git` y `node_modules`; también el informe y su evidencia, que se escribieron al terminar. Las huellas están en `_local/auditoria-2026-10-19/`.
- **Escrituras en el proyecto, al final y solo estas:**
  - este informe;
  - `05_documentacion/evidencia-2026-10-19/`;
  - `_local/auditoria-2026-10-19/`;
  - `_local/auditoria-seguridad-2026-10-19.md`.
- **Entorno.** La carpeta temporal tenía una ruta de más de 260 caracteres. Por eso se usó una unidad corta (X:), creada con `subst`, y git con `core.longpaths` solo en las variables de cada comando. No se cambió la configuración global. Varias corridas de tiempos salieron infladas por la carga de la máquina.

## 16. Qué sigue

**Recomendación:** corregir en este orden el **bloque 1** (cifras del Gobierno Central), el **bloque 2** (inicio de sesión) y el **bloque 3** (aviso y documentos).
- El bloque 3 se corrige en paralelo: mandar a la Unidad de Transparencia la ley de datos vigente con el aviso corregido.
- Antes de empezar, decidir los puntos 1 a 5 de la sección 8.
- Después, repetir B2, E1 y D1 sobre la versión corregida.
- El paquete del SIA se arma hasta que esos tres bloques estén cerrados y se haya ensayado la instalación (F5) con el SIA.

---

## Seguimiento de las correcciones

| Versión | Fecha | Bloque | Hallazgos | Estado | Prueba que lo cierra |
|---|---|---|---|---|---|
| 1.37 | 20 oct 2026 | 1 · Cifras del Gobierno Central | B2-01, B2-02, B2-03, B2-04, C4-01, F2-01 | Corregidos | `04_pruebas/prueba_cifras_gobierno_central.js`: 36 de 36; contra la v1.36, 11 de 36 |
| 1.38 | 20 oct 2026 | 2 · Inicio de sesión | E1-01, E1-02, E1-03, E1-04, E1-05, E1-06, E1-07, E1-08, E2-01, E2-02, E2-04, B9-02, E3-03 | Corregidos | `backend/pruebas/seguridad.test.mjs` (contra la v1.37 fallan las 6 que corren en memoria); módulo 19 de 19 en PostgreSQL 17 de pruebas; `prueba_servidor_sia.js` 34 de 34 |
| 1.39 | 20 oct 2026 | 3 · Aviso y documentos | G1-01, D1-01, D1-02, D1-03, D1-04, D1-05, D3-01, E2-03, F4-01, G1-02, G2-01, C5-05, B7-01 (aviso) | Corregidos; G1-01 y G1-02 esperan la aprobación de la Unidad de Transparencia y de jurídico | `prueba_docs_coherencia.js` y `prueba_empaquetado.js` (contra la v1.38: 22 de 27 y 11 de 16 fallas); lector independiente del inventario 109 de 109; respaldo y restauración ensayados en PostgreSQL 17 de pruebas |
| 1.40 | 20 oct 2026 | 4 · Descargas | C1-01, B3-01, B5-03, B3-02, B3-03, B3-04, B3-05, B2-04 (subtítulo), C1-03, B8-02 | Corregidos; B3-03 sin volver a medir con la herramienta de la auditoría | `04_pruebas/prueba_descargas.js`: 30 de 30; contra la v1.39, 19 fallas antes de llegar al Excel de las 16 alcaldías, que no existía |
| 1.41 | 21 oct 2026 | 5 · Campo y sin conexión | B6-01, B6-02, B8-01, B5-01, B5-02, B5-04, A1-03, inventario sin conexión (decisión 7) | Corregidos; B8-01 comprobado con WebKit de Playwright, no en un iPhone real | `04_pruebas/prueba_sin_conexion.js` (red cortada en el servidor; contra la v1.40 fallan peso, anuncio, inventario sin red, ciclo C y WebKit) y `04_pruebas/prueba_datos_danados.js`: 18 de 18 |
| 1.42 | 21 oct 2026 | 7 · Verificación automática | A1-01, A1-02, A1-04, A6-01, F3-01, sección 12 (consistencia), C5-02 | Corregidos; Firefox solo en GitHub (Windows no deja ejecutarlo en el equipo de trabajo); A1-04 en parte: quedan esperas fijas en las pruebas que no se tocaron | `.github/workflows/verificar.yml` (rápidas en cada Push); `04_pruebas/prueba_consistencia.js` 20 de 20; `04_pruebas/prueba_sesion_y_seguirme.js` 22 de 22, y falla al quitar cada función en copias construidas a propósito; `04_pruebas/prueba_navegadores.js` (Firefox y WebKit; WebKit 11 de 11 aquí); contraste 270 pares, 0 pendientes; `npm audit` 0 en la raíz |

Notas:
- **B2-03:** se corrigió con la decisión de Liber (manda la prioridad del tramo). Ya no quedan frentes prioritarios del Gobierno Central fuera de sus listas: la ciudad pasa de 1,253.9 a 1,186.3 km de frente prioritario.
- **E1-04:** la depuración ya corre al arrancar. Programarla además en la base queda como recomendación para el SIA (lista de verificación, bloque 3).
- **B2-04:** la ficha filtrada ya no trae la participación sin filtro, y la leyenda dice el filtro. El subtítulo cortado de la ficha («… frente…») queda para el bloque 4 (descargas).
- **B2-04, subtítulo (1.40):** la ficha achica el subtítulo hasta 8 pt antes de cortarlo.
- **B3-03 (1.40):** el KML y el GeoJSON se arman por partes; no se volvió a medir el congelamiento con la herramienta de la auditoría.
- **Hallazgo nuevo en las pruebas (1.40):** `prueba_espacio_gobierno_central.js` y `prueba_cepas_total.js` guardaban lo que bajaba la versión anterior en la misma carpeta que lo nuevo; con el mismo nombre de archivo se comparaba el nuevo consigo mismo. Corregido: lo anterior va en `version_anterior/`. Al compararlos de verdad, los datos son idénticos y solo difieren los textos que cambiaron a propósito en la v1.37 y la v1.40.
- **B6-02 (1.41):** la primera visita con la copia sin conexión baja 6.37 MB, comprimido como en GitHub Pages; el presupuesto es de 6.5 MB. Las librerías de Excel y PDF siguen en la copia: caben y permiten sacar Excel y fichas sin señal.
- **A1-01 (1.42):** al correr las rápidas sobre lo que está en Git, el empaquetado fallaba porque las capas `.gpkg` no se publican; ahora usa capas ficticias si faltan. La primera corrida en Linux (GitHub) no se pudo ensayar en el equipo de trabajo.
- **F3-01 (1.42):** en el módulo de sesión queda una vulnerabilidad baja de esbuild (servidor de desarrollo en Windows), que solo usa tsup al empaquetar y no se puede actualizar todavía dentro de tsup 8.5.1.
