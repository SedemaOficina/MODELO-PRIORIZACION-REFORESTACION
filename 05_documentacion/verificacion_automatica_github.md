# Verificación automática en GitHub (propuesta, no activada)

GitHub puede repetir, en cada cambio que llega al repositorio, las verificaciones rápidas: que los datos sean los registrados, que la construcción dé el mismo sitio desde cero y que el programa no tenga variables sin definir. Tarda unos dos minutos y no abre el navegador; las seis pruebas de navegador se siguen corriendo en el equipo de trabajo antes de cada commit.

**Qué cambia al activarla.** En cada *Push*, la pestaña *Actions* del repositorio muestra una palomita verde o una cruz roja. Si falla, GitHub envía un correo a la cuenta. La página publicada no depende de este resultado. Es gratuita en repositorios públicos.

**Por qué no se activó.** El archivo va en `.github/workflows/`, una carpeta que la sesión de trabajo no puede escribir. Activarla es decisión de quien administra la cuenta.

## Cómo activarla

1. En github.com, abrir el repositorio y elegir **Add file → Create new file**.
2. En el nombre, escribir exactamente: `.github/workflows/verificar.yml`
3. Pegar el contenido de abajo y pulsar **Commit changes**.
4. En GitHub Desktop, pulsar **Fetch origin** y después **Pull origin** para traer ese archivo a la carpeta local.

Para desactivarla: borrar ese archivo desde github.com, o en *Settings → Actions* deshabilitar las acciones del repositorio.

```yaml
# Verificación automática en cada cambio que llega a GitHub (auditoría H-038): datos, construcción y revisión estática.
# No abre el navegador: las seis pruebas de navegador se corren en el equipo de trabajo antes de cada commit (04_pruebas/LEEME.md).
# Si falla, GitHub avisa por correo a la cuenta del repositorio; la página publicada no cambia por ello.
name: Verificar
on:
  push:
    branches: [main]
  pull_request:
permissions:
  contents: read
jobs:
  verificar:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.13'
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Datos verificados
        run: python3 03_procesamiento_datos/verificar_datos.py
      - name: Construcción (desde cero, idéntica a docs/; se detiene si falta o sobra una pieza)
        run: python3 04_pruebas/prueba_construccion.py
      - name: docs/ corresponde al código fuente
        run: |
          python3 02_fuente/construir.py
          git diff --exit-code -- docs
      - name: Revisión estática
        run: |
          npm install --no-audit --no-fund @eslint/js@9.37.0 eslint@9.37.0 globals@16.4.0
          npx eslint docs/app.js
```
