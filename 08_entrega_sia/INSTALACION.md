# Instalación, actualización y reversión

Para el equipo del SIA. Supone acceso al servidor web por la vía habitual y permiso para recargar nginx. No requiere instalar nada en el servidor: ni Node, ni Python, ni base de datos.

## 1. Qué se recibe

Un archivo `calles-prioritarias_vX.Y_AAAAMMDD.tar.gz` (lo arma `empaquetar.py`) con:

```
calles-prioritarias_vX.Y_AAAAMMDD/
├── sitio/                 la carpeta que se publica (index.html, app.js, estilos.css, config.js, sw.js, datos/, libs/, fuentes/, img/)
├── MANIFIESTO.sha256      suma SHA-256 de cada archivo de sitio/
├── VERSION.txt            versión, fecha y corte de los datos
└── documentos/            esta guía, el ejemplo de nginx, la lista de verificación y los demás documentos
```

El paquete no trae versiones anteriores, capturas, bitácoras ni la copia de un solo archivo. Ocupa unos 6 MB comprimido y 8 MB desplegado.

## 2. Primera instalación

Se usa una carpeta por versión y un enlace simbólico a la vigente, igual que el historial de versiones del portal principal. `VOL` es la carpeta del volumen de datos donde viven los sitios estáticos.

```
# 1. copiar el paquete al servidor y verificarlo
cd /tmp && tar xzf calles-prioritarias_vX.Y_AAAAMMDD.tar.gz
cd calles-prioritarias_vX.Y_AAAAMMDD/sitio && sha256sum -c ../MANIFIESTO.sha256        # todo debe decir «OK»

# 2. colocarlo como una versión
mkdir -p VOL/calles-prioritarias_versiones
cp -r /tmp/calles-prioritarias_vX.Y_AAAAMMDD/sitio VOL/calles-prioritarias_versiones/vX.Y_AAAAMMDD

# 3. apuntar el enlace a esa versión
ln -sfn VOL/calles-prioritarias_versiones/vX.Y_AAAAMMDD VOL/calles-prioritarias

# 4. integrar la configuración de nginx (ver el ejemplo), validar y recargar
nginx -t && systemctl reload nginx
```

Después, correr `LISTA_DE_VERIFICACION.md` completa.

Notas para este servidor:

- **Permisos:** los archivos deben poder leerlos el usuario de nginx; basta lectura.
- **Cabeceras de seguridad generales:** el sitio ya aplica cabeceras a todo el dominio. En nginx, un bloque que define `add_header` deja de heredar las del bloque superior, de modo que las del ejemplo sustituyen a las generales dentro de esta ruta. Si alguna general debe conservarse (por ejemplo `Strict-Transport-Security`, si no la pone el terminador de HTTPS), añadirla al bloque.
- **Política de seguridad de contenido:** debe quedar una sola. Si el terminador de HTTPS añade otra, el navegador aplica las dos y gana la más estricta.
- **Geolocalización:** si la política general del sitio la niega (`Permissions-Policy: geolocation=()`), el botón «Mi ubicación» deja de funcionar. El ejemplo la permite solo para esta ruta.
- **Límite de velocidad:** la página pide 14 archivos al abrir. Revisar la ráfaga de `limit_req`.
- **Límite de subida:** no aplica; la herramienta no envía nada al servidor.
- **Espacio:** cinco versiones ocupan 40 MB.

## 3. Actualización

Cada versión nueva llega como un paquete nuevo. No se sobrescribe la anterior.

```
cd /tmp && tar xzf calles-prioritarias_vNUEVA.tar.gz && cd calles-prioritarias_vNUEVA/sitio && sha256sum -c ../MANIFIESTO.sha256
cp -r /tmp/calles-prioritarias_vNUEVA/sitio VOL/calles-prioritarias_versiones/vNUEVA
ln -sfn VOL/calles-prioritarias_versiones/vNUEVA VOL/calles-prioritarias          # el cambio es instantáneo
```

No hace falta recargar nginx ni avisar a las personas usuarias: `index.html` no se guarda en caché y todo lo demás lleva huella de versión, así que la siguiente visita recibe la versión nueva completa. Correr los puntos 1, 6 y 13 de la lista de verificación. Conservar las últimas cinco versiones.

## 4. Reversión

```
ln -sfn VOL/calles-prioritarias_versiones/vANTERIOR VOL/calles-prioritarias
```

Es inmediata y no pierde nada: la herramienta no guarda datos.

## 5. Antes de publicar una versión (quien la entrega)

1. `node 04_pruebas/correr_todas.js` termina con «Todo pasó».
2. `python3 08_entrega_sia/empaquetar.py` arma el paquete y verifica su manifiesto.
3. Se anota la versión en el registro de cambios (tabla de versiones del `README.md`).

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
| El fondo «Calles» muestra «API key required» | Falta la clave de CARTO | Construir el paquete con la clave (ver abajo) |
| Errores 503 al recargar | Límite de velocidad | Punto 15 |
| Excel o PDF no se descargan y la consola dice «Refused to…» | Política sin `worker-src 'self' blob:` o sin `'wasm-unsafe-eval'` | Punto 12 |

## 7. Parámetros de la instalación

Se fijan al armar el paquete, no en el servidor. Quedan escritos en `sitio/config.js`.

| Parámetro | Para qué | Cómo |
|---|---|---|
| `SIA_CARTO_KEY`, `SIA_ESRI_KEY` | Claves de los mapas de fondo, restringidas al dominio | Variables de entorno al correr `empaquetar.py`, o `02_fuente/claves.local.json` (no se publica) |
| `SIA_SESION_INICIO`, `SIA_SESION_CIERRE` | Direcciones de la pantalla de acceso y del cierre de sesión | Igual. Vacías = sin sesión |

Con el login del SIA (decidido el 5 oct 2026; ver `login/LEEME.md`): `SIA_SESION_INICIO=/acceso/calles/ SIA_SESION_CIERRE=/api/calles/salir python3 08_entrega_sia/empaquetar.py`. Con sesión, la herramienta además registra consultas y descargas en `/api/calles/uso` (otra dirección con `SIA_SESION_USO`).

Con `SIA_SESION_INICIO` definido, la herramienta **no guarda copia para uso sin conexión**: una copia local se abriría sin sesión.
