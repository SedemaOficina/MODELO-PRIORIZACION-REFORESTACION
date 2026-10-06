# Instalación, actualización y reversión

Para el equipo del SIA. Supone acceso al servidor web por la vía habitual y permiso para recargar nginx. No requiere instalar nada en el servidor: ni Node, ni Python, ni base de datos.

## 1. Qué se recibe

Un archivo `modelo-priorizacion-reforestacion_vX.Y_AAAAMMDD.zip` (en memoria USB) con:

```
modelo-priorizacion-reforestacion_vX.Y_AAAAMMDD/
├── LEEME.md               qué trae el paquete y en qué orden se instala
├── sitio/                 la carpeta que se publica (index.html, app.js, estilos.css, config.js, sw.js, datos/, libs/, fuentes/, img/)
├── MANIFIESTO.sha256      suma SHA-256 de cada archivo de sitio/
├── VERSION.txt            versión, fecha, corte de los datos y parámetros con que se armó
├── login/                 inicio de sesión y registro de usos: pantalla de acceso, módulo del backend y esquema de base de datos
├── capas_geoserver/       tres capas en GeoPackage con sus estilos, para el GeoServer
└── documentos/            esta guía, el ejemplo de nginx, la lista de verificación y los demás documentos
```

El paquete no trae versiones anteriores, pruebas, capturas, bitácoras ni archivos de trabajo. `sitio/` ocupa 8 MB.

## 2. Primera instalación

Se usa una carpeta por versión y un enlace simbólico a la vigente, igual que el historial de versiones del portal principal. `VOL` es la carpeta del volumen de datos donde viven los sitios estáticos.

```
# 1. copiar el paquete al servidor y verificarlo (si el servidor no tiene unzip, descomprimir en un equipo
#    y copiar la carpeta completa)
cd /tmp && unzip -q modelo-priorizacion-reforestacion_vX.Y_AAAAMMDD.zip
cd modelo-priorizacion-reforestacion_vX.Y_AAAAMMDD/sitio && sha256sum -c ../MANIFIESTO.sha256        # todo debe decir «OK»

# 2. colocarlo como una versión
mkdir -p VOL/calles-prioritarias_versiones
cp -r /tmp/modelo-priorizacion-reforestacion_vX.Y_AAAAMMDD/sitio VOL/calles-prioritarias_versiones/vX.Y_AAAAMMDD

# 3. apuntar el enlace a esa versión
ln -sfn VOL/calles-prioritarias_versiones/vX.Y_AAAAMMDD VOL/calles-prioritarias

# 4. integrar la configuración de nginx (ver el ejemplo), validar y recargar
nginx -t && systemctl reload nginx
```

Después, correr `LISTA_DE_VERIFICACION.md` completa.

Notas para este servidor:

- **Permisos:** los archivos deben poder leerlos el usuario de nginx; basta lectura. Un ZIP armado en Windows no conserva permisos: después de copiar, `chmod -R a+rX,go-w` sobre la carpeta de la versión.
- **Cabeceras de seguridad generales:** el sitio ya aplica cabeceras a todo el dominio. En nginx, un bloque que define `add_header` deja de heredar las del bloque superior, de modo que las del ejemplo sustituyen a las generales dentro de esta ruta. Si alguna general debe conservarse (por ejemplo `Strict-Transport-Security`, si no la pone el terminador de HTTPS), añadirla al bloque.
- **Política de seguridad de contenido:** debe quedar una sola. Si el terminador de HTTPS añade otra, el navegador aplica las dos y gana la más estricta.
- **Geolocalización:** si la política general del sitio la niega (`Permissions-Policy: geolocation=()`), el botón «Mi ubicación» deja de funcionar. El ejemplo la permite solo para esta ruta.
- **Límite de velocidad:** la página pide 14 archivos al abrir. Revisar la ráfaga de `limit_req`.
- **Límite de subida:** no aplica; la herramienta no envía nada al servidor.
- **Espacio:** cinco versiones ocupan 40 MB.

## 3. Actualización

Cada versión nueva llega como un paquete nuevo. No se sobrescribe la anterior.

```
cd /tmp && unzip -q modelo-priorizacion-reforestacion_vNUEVA.zip && cd modelo-priorizacion-reforestacion_vNUEVA/sitio && sha256sum -c ../MANIFIESTO.sha256
cp -r /tmp/modelo-priorizacion-reforestacion_vNUEVA/sitio VOL/calles-prioritarias_versiones/vNUEVA
ln -sfn VOL/calles-prioritarias_versiones/vNUEVA VOL/calles-prioritarias          # el cambio es instantáneo
```

No hace falta recargar nginx ni avisar a las personas usuarias: `index.html` no se guarda en caché y todo lo demás lleva huella de versión, así que la siguiente visita recibe la versión nueva completa. Correr los puntos 1, 6 y 13 de la lista de verificación. Conservar las últimas cinco versiones.

## 4. Reversión

```
ln -sfn VOL/calles-prioritarias_versiones/vANTERIOR VOL/calles-prioritarias
```

Es inmediata y no pierde nada: la herramienta no guarda datos.

## 5. Antes de publicar una versión (quien la entrega)

La Oficina de la Secretaría prueba cada versión completa antes de entregarla y anota en `VERSION.txt` la versión, la fecha y los parámetros con que se armó.
<!-- solo-repositorio -->

En el repositorio:
1. `node 04_pruebas/correr_todas.js` termina con «Todo pasó».
2. `python 08_entrega_sia/empaquetar.py` arma el paquete y verifica su manifiesto.
3. Se anota la versión en el registro de cambios (tabla de versiones del `README.md`).
<!-- /solo-repositorio -->

## 6. Diagnóstico

| Lo que ve la persona | Causa probable | Qué revisar |
|---|---|---|
| «Descargando la herramienta…» sin avanzar, o página sin estilos | Se abrió sin barra final y el servidor no redirigió | Lista de verificación, punto 2 |
| «Un archivo de datos llegó dañado o incompleto» | Transferencia cortada al copiar el paquete | Punto 6: comparar la suma |
| «No se encontró un archivo de datos en el servidor» | Carpeta `datos/` incompleta o enlace mal apuntado | Punto 1 y `ls` de la versión |
| «Tu sesión terminó» sin haber sesión | Un intermediario responde una página HTML en lugar del archivo | Puntos 5 y 17 |
| El mapa sale en blanco con un aviso de equipo sin aceleración | Navegador sin WebGL 2 | No es del servidor. La herramienta ofrece el modo ligero |
| Colores de prioridad ausentes, barras sin relleno | Una política de seguridad más estricta que la del ejemplo, o duplicada | Puntos 3 y 12 |
| «Mi ubicación» no responde | Geolocalización negada por cabecera | Punto 4 |
| El fondo «Calles» muestra «API key required» | Falta la clave de CARTO, o la dirección no está autorizada en ella | `VERSION.txt` dice si el paquete trae la clave; la clave solo funciona en `sedema.sia.cdmx.gob.mx` |
| Errores 503 al recargar | Límite de velocidad | Punto 15 |
| Excel o PDF no se descargan y la consola dice «Refused to…» | Política sin `worker-src 'self' blob:` o sin `'wasm-unsafe-eval'` | Punto 12 |

## 7. Parámetros de la instalación

Se fijan al armar el paquete, no en el servidor. Quedan escritos en `sitio/config.js` y se resumen en `VERSION.txt`. Este paquete trae:

| Parámetro | Valor |
|---|---|
| Clave de CARTO (fondo «Calles») | Incluida; restringida a `sedema.sia.cdmx.gob.mx` |
| Clave de Esri (fondo «Satélite») | No hace falta por ahora: el satélite funciona sin clave |
| Inicio de sesión | Encendido: acceso en `/acceso/calles/`, cierre en `/api/calles/salir`, registro de usos en `/api/calles/uso` (ver `login/LEEME.md`) |

Con inicio de sesión, la herramienta **no guarda copia para uso sin conexión**: una copia local se abriría sin sesión.

Si alguno debe cambiar, la Oficina de la Secretaría entrega un paquete nuevo.
<!-- solo-repositorio -->

En el repositorio: `SIA_CARTO_KEY` y `SIA_ESRI_KEY` (o `02_fuente/claves.local.json`, que no se publica), y `SIA_SESION_INICIO`, `SIA_SESION_CIERRE` y `SIA_SESION_USO` como variables de entorno al correr `empaquetar.py`. Vacías = sin sesión.
<!-- /solo-repositorio -->
