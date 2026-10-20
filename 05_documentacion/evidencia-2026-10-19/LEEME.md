# Evidencia de la auditoría del 19 de octubre de 2026

Esta es la evidencia que acompaña a `../AUDITORIA-2026-10-19.md`. Corresponde a la versión 1.36, commit `c8007dd`.

## Qué hay aquí

`guiones/` trae los guiones que escribieron los revisores. Todos se pueden repetir en la próxima auditoría y ninguno modifica el proyecto: trabajan sobre una copia. Por omisión buscan las copias en `X:\r1` … `X:\r7`, una unidad corta que se creó con `subst`. La ruta temporal de Windows pasaba de 260 caracteres y hacía fallar Python y git. Cambia esa ruta por la de tu copia, como argumento o con la variable `COPIA` donde exista.

| Carpeta | Frente | Guiones principales |
|---|---|---|
| `datos_y_construccion/` | 1 · Pruebas, datos y construcción | `b2_decodificador.py` y `b2_recalculo.py`: lector y recálculo independientes, sin código de la app. `b2_leer_pantalla.js` con `b2_comparar.py`: compara la pantalla contra el recálculo en 18 combinaciones. `b3_descargas.js` con `b3_analizar.py`: descargas. `a2_integridad.py`, `a3_*` (construcción doble), `d3_*` (insumos e inventario) |
| `pantallas_y_accesibilidad/` | 2 · Pantallas, accesibilidad, teléfono y navegadores | `barrido.js`: 19 estados × 7 anchos, con axe, cobertura de CSS y capturas. `botones.js`: presiona cada control. `teclado.js`, `diag_foco.js`, `repro_foco.js`. `ciclo_version.js`: ciclo de versión sin red. `peso.js`, `precarga.js`, `navegadores.js`, `daltonismo.js`, `contraste_faltantes.mjs`. axe-core se carga desde la ruta que indica `comun.js` |
| `tareas_y_textos/` | 3 · Tareas, UX y textos | `c1_tareas.js`, `c1_orden_excel.js` con `.py`, `c3_carga.js`, `c4_estados.js`, `c4_comparacion.js`, `c5_textos.js` (inventario de textos en CSV), `c6_visual.js` |
| `robustez/` | 5 · Robustez del sitio | `sitio_b5.js` (34 escenarios), `sitio_e3.js` (104 casos), `doble_pdf.js` |
| `documentos_y_metodo/` | 6 · Documentos, limpieza, método | `f1_atras_recarga.js`, `f1_cobertura_js.js`, `css_sin_uso.js`, `f2_carrera_excel.js`, `f2_inventario_*.js`, `d4_*.js` (peso y velocidad con 3G y CPU lenta), `d5_sensibilidad.py` y `d5_h019.js` (método) |
| `independiente/` | Revisor independiente | `datos_indep.py` (lector propio), `estado_app.js` con `comparar.py` (204 estados), `banqueta_oculta.js`, `clase_gc.py`, `huerfanos.py`, `union_modelo.py`, `modelo_insumo.py` |

## Qué no está aquí y por qué

El repositorio es público. Esto se guardó en `_local/auditoria-2026-10-19/`, que no se publica:

- **Informes completos de cada revisor**, con todos sus hallazgos en el formato largo (`frente1.md` … `frente6.md`, `independiente.md`).
- **Salidas de los guiones:** registros, capturas (más de 500) y los Excel, PDF, KML y GeoJSON descargados.
- **Textos oficiales de leyes** que se usaron para el cotejo normativo.
- **Huellas SHA-256** del proyecto antes y después de la auditoría, y la línea base de las pruebas.
- **Guiones y salidas de las pruebas del inicio de sesión.** Reproducen fallas de seguridad que siguen abiertas.

El informe de seguridad con detalles para reproducir está en `_local/auditoria-seguridad-2026-10-19.md`.

No se guardaron copias del insumo original del modelo extraído de `03_procesamiento_datos/insumos/originales/`, porque se regeneran desde el `.rar`. Tampoco las copias del sitio que se usaron para el ciclo de versión.
