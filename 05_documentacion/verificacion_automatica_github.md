# Verificación automática en GitHub

Desde la versión 1.42, GitHub repite en cada *Push* las verificaciones rápidas: que los datos sean los registrados, que la construcción dé el mismo sitio desde cero (así se nota si `docs/` quedó desfasado de `02_fuente/`), la revisión estática del programa, el contraste de los colores del mapa, la coherencia de los documentos, la consistencia (ids, estilos en línea, términos retirados, claves en el repositorio), el empaquetado para el SIA y las pruebas del módulo de inicio de sesión. Además, en otro trabajo, prueba el flujo principal en **Safari (WebKit)**: abre, busca una colonia y saca el Excel y la ficha PDF (`04_pruebas/prueba_navegadores.js`). Firefox se revisa a mano (ver abajo). Las demás pruebas de navegador se siguen corriendo en el equipo de trabajo antes de cada versión. Cuántas son y qué revisa cada una está en `04_pruebas/LEEME.md`.

Lo decidió Liber el 19 de octubre de 2026 (auditoría, A1-01). El archivo es `.github/workflows/verificar.yml`.

## Qué se ve

- En github.com, junto a cada commit aparece una **palomita verde** (todo pasó) o una **cruz roja** (algo falló). El detalle está en la pestaña *Actions* del repositorio, en «Verificar».
- Si falla, GitHub envía un correo a la cuenta que hizo el *Push*.
- La página publicada **no depende** de este resultado: GitHub Pages publica igual. La cruz roja es un aviso para corregir antes de la siguiente versión.
- Las rápidas tardan unos 2 minutos y WebKit unos 3, casi todo en preparar el equipo de GitHub e instalar los navegadores. Es gratuito en repositorios públicos.

## Si aparece la cruz roja

1. Abrir *Actions* → la corrida con la cruz. En «Annotations» aparece cada verificación que falló, con su motivo (desde la v1.46, `04_pruebas/avisos_github.js`); eso se ve sin iniciar sesión. El registro completo del trabajo que falló («Verificaciones rápidas» o «WebKit (Safari)») pide iniciar sesión en GitHub.
2. En el equipo de trabajo, correr lo mismo: `node 04_pruebas/correr_todas.js rapidas`, o `node 04_pruebas/prueba_navegadores.js`. Debe fallar igual.
3. Corregir, construir (`python 02_fuente/construir.py`), volver a correr las rápidas y hacer un commit nuevo.

Si falla en GitHub pero pasa en el equipo de trabajo, la diferencia suele ser algo que no está en el repositorio (un archivo en `.gitignore`) o de Linux (mayúsculas y minúsculas en los nombres de archivo).

## Firefox, a mano

Firefox no se prueba en GitHub (decisión de Liber del 23 de octubre de 2026). El Firefox de los equipos de GitHub no tiene WebGL 2, ni forzándolo (versión 1.47), y la herramienta lo necesita para abrir. En el equipo de trabajo Windows no deja abrir el Firefox de las pruebas.

Antes de cada versión que cambie la herramienta (no solo pruebas o documentos), y antes de cada entrega al SIA, se revisa en un Firefox normal, en una computadora:

1. Abrir la página publicada.
2. Buscar una colonia (por ejemplo, Tecpinco, en Iztapalapa) y elegirla.
3. Descargar el Excel de frentes y la ficha PDF, y abrir los dos.

Si algo falla, anotarlo en la bitácora de la versión.

## Para desactivarla

Borrar `.github/workflows/verificar.yml` (moverlo a `_to_delete/`) y hacer commit, o en github.com, *Settings → Actions → General*, deshabilitar las acciones del repositorio.

**Al subirla por primera vez:** GitHub pide permiso de «workflow» para subir archivos de `.github/workflows/`. GitHub Desktop ya lo tiene. Si el *Push* se rechaza por eso, crear el archivo desde github.com (*Add file → Create new file*, nombre `.github/workflows/verificar.yml`, pegar el contenido) y después en GitHub Desktop dar *Fetch origin* y *Pull origin*.
