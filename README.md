# Modelo de Priorización · Reforestación Urbana

Herramienta **"Calles prioritarias para reforestar"** de la Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental (SIA).

Mapa de consulta para que las 16 alcaldías y el Gobierno de la Ciudad identifiquen qué colonias, calles y vialidades primarias conviene reforestar primero, según el modelo de priorización del SIA. Incluye descargas en Excel con diccionario de datos y fichas PDF por alcaldía, colonia, vialidades primarias y avenida.

Esta carpeta es la **copia de trabajo oficial**: aquí vive la versión vigente, todo lo necesario para reconstruirla y la bitácora de decisiones. La herramienta se construyó con Claude por iteraciones.

## Qué hay en cada carpeta

| Carpeta | Contenido |
|---|---|
| `docs/` | **El sitio publicado** (GitHub Pages y, después, el SIA): `index.html` y, aparte, `datos/` (frentes, catálogos y vialidades), `libs/` (librerías del mapa, PDF y Excel) e `img/`. Necesita un servidor web: no se abre con doble clic. |
| `_local/` | `calles_prioritarias.html`: la misma herramienta **en un solo archivo, para abrir con doble clic** (necesita internet para las librerías). Se genera al construir y no se publica. |
| `02_fuente/` | Las piezas con las que se arma la herramienta: `construir.py` (ensambla todo), `v6.html` (base), `v7_app.js` (lógica), `b1.css` y `b2.css` (estilos de los bloques 1 y 2 de la auditoría UX), `blk_*.txt` (datos comprimidos de frentes, colonias y vialidades), la lámina de la metodología y `libs/` (librerías para servir sin CDN). |
| `03_procesamiento_datos/` | Scripts de Python con los que se prepararon los datos (decodificación de frentes, cruce con vialidades primarias, unión con el IDS de EVALÚA) y sus insumos intermedios. `IDS_ut/` trae la capa del Índice de Desarrollo Social por unidad territorial. |
| `04_pruebas/` | Recorridos automatizados (Playwright) usados para verificar cada versión en escritorio y teléfono. |
| `05_documentacion/` | `auditoria_ux_calles.html`: informe de la auditoría UI/UX con capturas y maquetas. `bitacora/`: registro de versiones, decisiones y pendientes (**solo en la copia local**, no se publica). |
| `06_entregables/` | Lámina de composición de frentes de manzana (fondo crema y transparente). |
| `07_versiones/` | Versiones anteriores de la herramienta, para comparar o regresar (**solo en la copia local**; en GitHub el historial lo guarda Git). |

## Cómo reconstruir la herramienta

Después de cambiar cualquier archivo de `02_fuente/`:

```
python3 02_fuente/construir.py
```

El resultado se escribe en `docs/` (sitio con datos y librerías en archivos aparte) y en `_local/calles_prioritarias.html` (un solo archivo). Solo se reescriben los archivos que cambiaron. No requiere instalar nada más que Python 3.

## Publicación

- **Repositorio:** https://github.com/SedemaOficina/MODELO-PRIORIZACION-REFORESTACION (público).
- **Página pública (GitHub Pages):** https://sedemaoficina.github.io/MODELO-PRIORIZACION-REFORESTACION/
- La página lleva la instrucción de **no aparecer en buscadores** (`noindex`); solo entra quien tenga el enlace. Se quita vaciando la línea `ROBOTS` de `02_fuente/construir.py` cuando se apruebe su difusión.
- Quedan fuera del repositorio (ver `.gitignore`): la bitácora, que trae detalles de infraestructura y decisiones internas, y `07_versiones/`.
- Para publicar un cambio: **Claude hace el commit** (con resumen y descripción) al terminar cada modificación; Liber abre GitHub Desktop y da **Push origin**. GitHub Pages se actualiza en uno o dos minutos.
- Destino final: `sedema.sia.cdmx.gob.mx`. El equipo del SIA puede servir `docs/` directamente desde este repositorio, como en el sitio de árboles patrimoniales.

## Cómo se trabaja con Claude

1. Se conecta esta carpeta a la sesión de Claude (Cowork) y el proyecto "Alcaldías-Reforestación".
2. Claude edita las piezas de `02_fuente/`, reconstruye con `construir.py`, prueba en escritorio y teléfono, actualiza el artefacto de respaldo y **hace el commit** con un resumen y una descripción en español.
3. Liber revisa el commit en GitHub Desktop (pestaña History) y da **Push origin**.
4. Antes de cada cambio grande, la versión vigente se copia a `07_versiones/` con fecha.
5. Cada cambio se documenta en `05_documentacion/bitacora/`.
6. Claude nunca borra archivos de la carpeta: lo que sobre se mueve a `_to_delete/` para que Liber lo elimine.

## Estado al 24 de septiembre de 2026

- Versión vigente: **v17** (bloques 1 y 2 de la auditoría UX).
- Publicada en GitHub Pages (ver arriba) y, como respaldo, en el artefacto "Calles Prioritarias para Reforestar".

### Pendientes
1. **Visto bueno institucional de la rampa de calor** que sustituyó al semáforo (ver `bitacora/10_auditoria-ux-v1-y-bloque-1.md`).
2. **Login con correo y contraseña** y **publicación en la infraestructura del SIA** (`sedema.sia.cdmx.gob.mx`). Hay nueve decisiones por tomar (propósito del login, tipo de usuario, altas, alcance, recuperación de contraseña, aviso de privacidad, capas, piloto, dirección web y actualizaciones), con recomendación y responsable en `bitacora/15_despliegue-sia-y-login.md`.
3. Definir a dónde llegan los reportes de "Reportar un dato" en la ficha de campo.
4. Validar con la Secretaría la regla del cruce de frentes con vialidades primarias (18 m, o 60 m con coincidencia de nombre).
5. Recalcular el modelo con el IDS cuando haya acceso a las capas de temperatura superficial 2024, cobertura de copa y NDVI por frente.
6. Regenerar el lote de fichas PDF de las 16 alcaldías con la versión vigente.
7. Homologar en el SIA los nombres abreviados de colonias y "Av. Insurgentes Norte".
8. Probar en teléfonos reales con personal de alcaldías.
