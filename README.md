# Modelo de Priorización · Reforestación Urbana

Herramienta **"Calles prioritarias para reforestar"** de la Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental (SIA).

Mapa de consulta para que las 16 alcaldías y el Gobierno de la Ciudad identifiquen qué colonias, calles y vialidades primarias conviene reforestar primero, según el modelo de priorización del SIA. Incluye buscador único, ubicación del usuario en campo, descargas en Excel con diccionario de datos y fichas PDF por alcaldía, colonia, vialidades primarias y avenida.

Esta carpeta es la **copia de trabajo oficial**: aquí vive la versión vigente, todo lo necesario para reconstruirla y la bitácora de decisiones. La herramienta se construyó con Claude por iteraciones.

**¿Vas a mantenerla o instalarla?** Empieza por [`ARQUITECTURA.md`](ARQUITECTURA.md): dónde está cada cosa, cómo se arma, formato de los datos y cambios comunes.

## Alcance

- **Solo de consulta:** no recibe reportes ni datos de los usuarios (decisión de Liber, 25 sep 2026).
- **Sin datos personales:** la ubicación que usa "Mi ubicación" se queda en el teléfono; no se envía ni se guarda.
- **Sitio estático:** no necesita base de datos, backend ni GeoServer.

## Qué hay en cada carpeta

| Carpeta | Contenido |
|---|---|
| `02_fuente/` | **Aquí se edita.** `plantilla.html` (estructura), `css/` (6 archivos de estilos), `js/` (16 módulos de lógica, uno por tema), `datos/*.bin`, `img/`, `libs/` y `construir.py`, que lo ensambla todo. |
| `docs/` | **El sitio publicado** (GitHub Pages y, después, el SIA). Lo genera `construir.py`; no se edita a mano. Necesita un servidor web: no se abre con doble clic. |
| `03_procesamiento_datos/` | Scripts de Python numerados en el orden en que se corren, con `insumos/` e `intermedios/`. Ver su `LEEME.md`. |
| `04_pruebas/` | `prueba_sitio.js`: prueba integral en escritorio y teléfono. Ver su `LEEME.md`. |
| `05_documentacion/` | `auditoria_ux_calles.html`: informe de la auditoría UI/UX (24 sep 2026). `bitacora/`: registro de versiones y decisiones (**solo en la copia local**). |
| `06_entregables/` | Guía de prueba con personal de alcaldías (Word y PDF) y lámina de composición de frentes de manzana. |
| `07_versiones/` | Versiones anteriores de la herramienta (**solo en la copia local**; en GitHub el historial lo guarda Git). |
| `_local/` | `calles_prioritarias.html`: la herramienta **en un solo archivo, para abrir con doble clic**. Se genera al construir y no se publica. |

## Cómo reconstruir la herramienta

Después de cambiar cualquier archivo de `02_fuente/`:

```
python3 02_fuente/construir.py
```

Escribe `docs/` y `_local/calles_prioritarias.html`. Solo reescribe los archivos que cambiaron. Requiere únicamente Python 3.

Para verificar: `node 04_pruebas/prueba_sitio.js` (ver `04_pruebas/LEEME.md`).

## Publicación

- **Repositorio:** https://github.com/SedemaOficina/MODELO-PRIORIZACION-REFORESTACION (público).
- **Página (GitHub Pages):** https://sedemaoficina.github.io/MODELO-PRIORIZACION-REFORESTACION/
- La página lleva la instrucción de **no aparecer en buscadores**; solo entra quien tenga el enlace. Para permitir la difusión, dejar `ROBOTS = ''` en `02_fuente/construir.py`.
- Quedan fuera del repositorio (ver `.gitignore`): la bitácora, que trae detalles de infraestructura y decisiones internas, `07_versiones/`, `_local/`, los insumos de procesamiento y las capturas de prueba.
- **Destino final:** `sedema.sia.cdmx.gob.mx`, como sitio estático en el servidor web del SIA. El paquete de entrega (configuración de nginx y guía de instalación) está pendiente.

## Cómo se trabaja con Claude

1. Se conecta esta carpeta a la sesión de Claude (Cowork) y el proyecto "Alcaldías-Reforestación".
2. Claude edita las piezas de `02_fuente/`, reconstruye, prueba en escritorio y teléfono, actualiza el artefacto de respaldo y **hace el commit** con un resumen y una descripción en español.
3. Liber revisa el commit en GitHub Desktop (pestaña History) y da **Push origin**. GitHub Pages se actualiza en uno o dos minutos.
4. Cada cambio se documenta en `05_documentacion/bitacora/`.
5. Claude nunca borra archivos de la carpeta: lo que sobre se mueve a `_to_delete/` para que Liber lo elimine.

## Estado al 25 de septiembre de 2026

- Versión vigente: **v17.5** (bloques 1 y 2 de la auditoría UX, carga en archivos aparte, Mi ubicación, limpieza y organización del código, ayuda que siempre se cierra y botón "toda la ciudad").
- Publicada en GitHub Pages y, como respaldo, en el artefacto "Calles Prioritarias para Reforestar" de Claude.

### Pendientes
1. **Paquete de entrega al SIA:** configuración de nginx para `/calles-prioritarias/`, compatibilidad con sus cabeceras de seguridad (tipografías locales), guía de instalación y actualización y lista de verificación.
2. **Login** (opcional para una herramienta de consulta): nueve decisiones con recomendación y responsable en `bitacora/15_despliegue-sia-y-login.md`.
3. **Prueba con personal de alcaldías** con la guía de `06_entregables/`.
4. **Visto bueno institucional de la rampa de calor** que sustituyó al semáforo.
5. Validar con la Secretaría la regla del cruce de frentes con vialidades primarias (18 m, o 60 m con coincidencia de nombre).
6. Recalcular el modelo con el IDS cuando haya acceso a las capas de temperatura superficial 2024, cobertura de copa y NDVI por frente.
7. Bloque 3 de la auditoría: mapa de fondo y carga por zonas.
8. Regenerar el lote de fichas PDF de las 16 alcaldías con la versión definitiva.
9. Homologar en el SIA los nombres abreviados de colonias y "Av. Insurgentes Norte".
