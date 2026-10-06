# Instrucciones para Claude · Modelo de priorización de reforestación urbana

Herramienta de consulta de la Secretaría del Medio Ambiente de la CDMX (SIA) para las 16 alcaldías y el Gobierno Central. Sitio estático: HTML, CSS y JavaScript sin frameworks. Quien la mantiene es Liber.

Antes de cambiar algo, leer `ARQUITECTURA.md` (dónde está cada cosa, reglas de negocio, módulos) y la parte de `README.md` que toque.

## Reglas de trabajo

- **Se edita en `02_fuente/`**, nunca en `docs/` (se regenera). Después de cada cambio: `python 02_fuente/construir.py`.
- **No borrar archivos.** Lo que sobre se mueve a `_to_delete/` para que Liber lo elimine.
- **Un commit por versión**, con resumen `vX.YY: …` y descripción en español (ver `git log`). Antes de commitear: subir `VERSION` y poner la fecha en `ACTUALIZACION` en `construir.py`, poner la versión vigente en `README.md` (estado y fila de la tabla) y en el encabezado de `ARQUITECTURA.md`, y escribir la nota en `05_documentacion/bitacora/` (siguiente número y renglón en `00_indice.md`; la bitácora no se publica).
- **Push solo cuando Liber lo pida**; normalmente Liber revisa en GitHub Desktop y da Push origin.
- **Textos de la herramienta** en español de México, claros para personal de alcaldías, sin tecnicismos.
- **Reglas de negocio en un solo lugar:** `esPrio`, `sumPrio` y `enAmbito(i)`. «Prioritario» = Muy Alta, Alta y Media (`PRIO_MIN = 2`). No escribir `>=2`, `[2]+[3]+[4]` ni repetir la condición del ámbito.
- **Sin `style="`** en plantillas ni HTML generado (política de seguridad de contenido): usar `data-st`.
- **Claves de mapas de fondo:** nunca en `construir.py` ni en archivos versionados; van en variables de entorno o en `02_fuente/claves.local.json` (no se publica).

## Verificar

- Rápidas (menos de un minuto): `node 04_pruebas/correr_todas.js rapidas`
- Todas (unos 15 minutos): `node 04_pruebas/correr_todas.js`
- En este equipo Windows, Python se llama `python` (no `python3`). La carpeta está en OneDrive: solo una sesión trabaja sobre ella a la vez.
