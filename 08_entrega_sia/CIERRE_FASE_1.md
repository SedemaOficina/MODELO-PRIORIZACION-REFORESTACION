# Cierre de la Fase 1 (piloto en GitHub)

Mientras la página de GitHub siga activa habrá dos versiones públicas de la herramienta, que pueden quedar con datos distintos. Este es el orden para apagarla. Cada paso se hace solo cuando el anterior está comprobado.

| # | Paso | Quién | Comprobación |
|---|---|---|---|
| 1 | Instalar en el SIA y correr la lista de verificación completa | SIA | Los 25 puntos de `LISTA_DE_VERIFICACION.md` (del 16 al 22, los del inicio de sesión; del 23 al 25, los de la base) |
| 2 | Sin paso: la prueba con personal de las alcaldías se descartó el 5 de octubre de 2026; la herramienta se entrega directamente al SIA | — | — |
| 3 | Emitir la guía y los materiales con la dirección nueva; regenerar las fichas PDF que se hayan entregado | Oficina de la Secretaría | Ningún material vigente cita `github.io` |
| 4 | Avisar a las alcaldías del piloto el cambio de dirección | Oficina de la Secretaría | Acuse |
| 5 | Retirar las copias de respaldo publicadas fuera del SIA (dejar de compartirlas) | Oficina de la Secretaría | Sus enlaces no abren |
| 6 | Apagar GitHub Pages: en el repositorio, *Settings → Pages → Unpublish site* | Cuenta de GitHub | `curl -sI https://sedemaoficina.github.io/MODELO-PRIORIZACION-REFORESTACION/` responde `404` |
| 7 | Definir el destino del repositorio: privado, archivado o trasladado al control de versiones del SIA | Oficina de la Secretaría con el SIA | Decisión por escrito |
| 8 | En cada teléfono que usó el piloto, la copia sin conexión deja de actualizarse. No hace falta borrarla: al abrir la dirección nueva se usa esa | — | — |

**Qué no se entrega ni se conserva en el servidor:** `07_versiones/`, `_local/`, `04_pruebas/capturas/`, la bitácora y el informe de experiencia de uso (contiene capturas de una versión anterior y maquetas de funciones que no se construyeron). El paquete que arma `empaquetar.py` ya los excluye.

**Operación después del cierre**

| Asunto | Propuesta |
|---|---|
| Quién publica una versión | El SIA, con el paquete que entrega la Oficina de la Secretaría |
| Cómo se prueba antes | `correr_todas.js` en el equipo de quien entrega; lista de verificación en el servidor |
| Registro | Versión, fecha y suma del paquete en la bitácora del SIA |
| Medición de uso | Registros de nginx de la ruta (visitas por día, teléfono o escritorio) y, con login, la bitácora de accesos. Definir los indicadores antes de abrir |
| Revisión periódica | Mensual: espacio en disco, vigencia de las claves de los mapas de fondo, avisos de seguridad de las librerías |
| Soporte | Primer nivel, el SIA (servidor); segundo, la Oficina de la Secretaría (contenido y datos) |
