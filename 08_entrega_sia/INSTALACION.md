# Instalación, actualización y reversión

Para el equipo del SIA. Supone acceso al servidor web por la vía habitual y permiso para recargar nginx. La herramienta es estática: no requiere instalar nada en el servidor web, ni Node ni Python. El inicio de sesión usa el backend y el PostgreSQL que el SIA ya tiene (`login/LEEME.md`), y su base se respalda como dice la sección 4 bis.

## 1. Qué se recibe

Un archivo `modelo-priorizacion-reforestacion_vX.Y_AAAAMMDD.zip`, que se entrega por enlace de descarga siempre junto con `modelo-priorizacion-reforestacion_vX.Y_AAAAMMDD.zip.sha256`, que trae su suma SHA-256 (cómo comprobarla: `LEEME.md` del paquete). El ZIP contiene:

```
modelo-priorizacion-reforestacion_vX.Y_AAAAMMDD/
├── LEEME.md               qué trae el paquete y en qué orden se instala
├── sitio/                 la carpeta que se publica (index.html, app.js, estilos.css, config.js, sw.js, datos/, libs/, fuentes/, img/)
├── MANIFIESTO.sha256      suma SHA-256 de cada archivo del paquete
├── VERSION.txt            versión, fecha, corte de los datos y parámetros con que se armó
├── login/                 inicio de sesión y registro de usos: pantalla de acceso, módulo del backend y esquema de base de datos
├── capas_geoserver/       tres capas en GeoPackage con sus estilos, para el GeoServer
└── documentos/            esta guía, el ejemplo de nginx, la lista de verificación y los demás documentos
```

El paquete no trae versiones anteriores, pruebas, capturas, bitácoras ni archivos de trabajo. `sitio/` ocupa unos 11 MB; el número de archivos de la versión está en `VERSION.txt`.

## 2. Primera instalación

Se usa una carpeta por versión y un enlace simbólico a la vigente, igual que el historial de versiones del portal principal. `VOL` es la carpeta del volumen de datos donde viven los sitios estáticos.

```
# 1. copiar el paquete al servidor y verificarlo (si el servidor no tiene unzip, descomprimir en un equipo
#    y copiar la carpeta completa)
cd /tmp && unzip -q modelo-priorizacion-reforestacion_vX.Y_AAAAMMDD.zip
cd modelo-priorizacion-reforestacion_vX.Y_AAAAMMDD && sha256sum -c --quiet MANIFIESTO.sha256 && cd ..   # sin mensajes = todo coincide

# 2. colocarlo como una versión
mkdir -p VOL/priorizacion-reforestacion_versiones
cp -r /tmp/modelo-priorizacion-reforestacion_vX.Y_AAAAMMDD/sitio VOL/priorizacion-reforestacion_versiones/vX.Y_AAAAMMDD

# 3. apuntar el enlace a esa versión
ln -sfn VOL/priorizacion-reforestacion_versiones/vX.Y_AAAAMMDD VOL/priorizacion-reforestacion

# 4. integrar la configuración de nginx (ver el ejemplo), validar y recargar
nginx -t && systemctl reload nginx
```

Después, correr `LISTA_DE_VERIFICACION.md` completa.

Notas para este servidor:

- **Permisos:** los archivos deben poder leerlos el usuario de nginx; basta lectura. Un ZIP armado en Windows no conserva permisos: después de copiar, `chmod -R a+rX,go-w` sobre la carpeta de la versión.
- **Cabeceras de seguridad generales:** el sitio ya aplica cabeceras a todo el dominio. En nginx, un bloque que define `add_header` deja de heredar las del bloque superior, así que las generales no llegarían a esta ruta. Cada bloque del ejemplo las repite con `include snippets/sia-cabeceras-servidor*.conf;`, el mismo que usa el tablero de Categorías de protección ambiental: las generales van en ese archivo (un `add_header … always;` por renglón), incluido también en el `server`. Con comodín, nginx no se queja si el archivo no existe. `Strict-Transport-Security` no va en el fragmento: la decide el SIA para todo el dominio. Que el archivo no repita una cabecera que ya pone el ejemplo (`Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cache-Control`): saldría dos veces.
- **Política de seguridad de contenido:** debe quedar una sola. Si el terminador de HTTPS añade otra, el navegador aplica las dos y gana la más estricta.
- **Geolocalización:** si la política general del sitio la niega (`Permissions-Policy: geolocation=()`), el botón «Mi ubicación» deja de funcionar. El ejemplo la permite solo para esta ruta.
- **Límite de velocidad:** la página hace unas 13 peticiones al abrir, y más al encender capas o al guardar la copia sin conexión. Revisar la ráfaga de `limit_req`.
- **Límite de subida:** no aplica. Con el inicio de sesión, la herramienta solo envía el registro de usos a `/priorizacion-reforestacion/api/uso` (unos cientos de bytes por evento); sin sesión no envía nada.
- **Espacio:** cinco versiones ocupan unos 55 MB.

## 3. Actualización

Cada versión nueva llega como un paquete nuevo. No se sobrescribe la anterior.

```
cd /tmp && unzip -q modelo-priorizacion-reforestacion_vNUEVA.zip && cd modelo-priorizacion-reforestacion_vNUEVA && sha256sum -c --quiet MANIFIESTO.sha256
cp -r /tmp/modelo-priorizacion-reforestacion_vNUEVA/sitio VOL/priorizacion-reforestacion_versiones/vNUEVA
ln -sfn VOL/priorizacion-reforestacion_versiones/vNUEVA VOL/priorizacion-reforestacion          # el cambio es instantáneo
```

No hace falta recargar nginx ni avisar a las personas usuarias: `index.html` no se guarda en caché y todo lo demás lleva huella de versión, así que la siguiente visita recibe la versión nueva completa. Correr los puntos 1, 6 y 13 de la lista de verificación. Conservar las últimas cinco versiones.

## 4. Reversión

```
ln -sfn VOL/priorizacion-reforestacion_versiones/vANTERIOR VOL/priorizacion-reforestacion
```

Es inmediata y no toca la base del inicio de sesión: las cuentas, las sesiones y la bitácora de usos siguen en PostgreSQL (esquema `priorizacion_reforestacion`) y la versión anterior las sigue usando. Lo que no se revierte con el enlace es la base: si una versión trajo un cambio de esquema (lo dice su `LEEME.md`), regresar el sitio no regresa la base. Por eso, antes de aplicar un SQL nuevo se saca un respaldo (sección 4 bis), y revertir la base es restaurarlo: se pierde todo lo registrado después del respaldo.

## 4 bis. Respaldo y restauración de la base del inicio de sesión

La base guarda datos personales (nombre, correo, institución, IP y bitácora de usos) y las huellas de las contraseñas. Se respalda **solo el esquema del módulo**, `priorizacion_reforestacion`, no la base completa. En esta sección, `<servidor de base de datos>`, `<base>`, `<cuenta dueña del esquema>` y `<carpeta de respaldos>` son marcadores: los valores los pone el SIA.

**Con qué cuenta.** Con la **cuenta dueña del esquema** (la que aplicó `01-…` y `02-…`; aparece en `\dn priorizacion_reforestacion`), **no** con `priorizacion_reforestacion_api`: la cuenta del servicio no puede leer las secuencias ni debe poder sacar copias de la base. La contraseña va en `~/.pgpass` (permisos `600`) de quien corre el respaldo, nunca en la línea de comandos ni en el script. El cliente `pg_dump` debe ser de la misma versión que el servidor o más nueva.

### Respaldo

Un script, programado por el SIA (cron o su herramienta de respaldos). Primero depura, para que el respaldo no guarde datos que ya debían borrarse:

```
#!/bin/sh
# respaldo diario del esquema priorizacion_reforestacion
set -eu
ARCHIVO="<carpeta de respaldos>/priorizacion_reforestacion_$(date +%Y%m%d).dump"
psql -h <servidor de base de datos> -U <cuenta dueña del esquema> -d <base> -X -q -v ON_ERROR_STOP=1 \
     -c "SELECT priorizacion_reforestacion.depurar();"
pg_dump -h <servidor de base de datos> -U <cuenta dueña del esquema> -d <base> \
        -n priorizacion_reforestacion -Fc -f "$ARCHIVO"
pg_restore --list "$ARCHIVO" | grep -c "TABLE DATA"      # debe decir 3: usuarios, sesiones y bitacora
```

El respaldo trae el esquema, las tres tablas con sus datos, las secuencias, la función `depurar()` y los permisos de `priorizacion_reforestacion_api`. **No** trae el rol mismo ni su contraseña, su `search_path` y sus tiempos límite (son de todo el servidor, no del esquema): esos los repone `02-…-rol-y-grants.sql` y `\password`.

- **Frecuencia sugerida:** diario, y además justo antes de aplicar cualquier SQL nuevo del módulo.
- **Cuánto tiempo guardarlos, dónde y con qué cifrado: lo decide el SIA** con sus políticas de respaldo. Lo mínimo: cifrados, fuera del servidor de base de datos y con acceso solo para quien opera la base. Al decidir la conservación, considerar que un respaldo guarda datos que el aviso de privacidad promete borrar (IP a los 6 meses, bitácora a los 24 meses, cuentas dadas de baja a los 24 meses de la baja): mientras más viejos se conserven, más tiempo viven esos datos. Sugerencia: siete diarios y cuatro semanales, y nunca más de 6 meses.

### Restauración de ensayo (comprobar que el respaldo sirve)

Se hace en una **base de ensayo** del mismo servidor, nunca sobre la de producción. Sugerencia: una vez después de instalar y después cada tres meses.

```
# 1. base de ensayo, con la cuenta dueña como propietaria (la crea una cuenta con permiso para crear bases)
createdb -h <servidor de base de datos> -U <cuenta con permiso para crear bases> -O <cuenta dueña del esquema> priorizacion_reforestacion_ensayo

# 2. restaurar como la cuenta dueña: todo queda a su nombre y los permisos del servicio se reponen
pg_restore -h <servidor de base de datos> -U <cuenta dueña del esquema> -d priorizacion_reforestacion_ensayo \
           --no-owner --exit-on-error --single-transaction <carpeta de respaldos>/priorizacion_reforestacion_AAAAMMDD.dump

# 3. depurar: un respaldo viejo no debe revivir datos que ya debían borrarse
psql -h <servidor de base de datos> -U <cuenta dueña del esquema> -d priorizacion_reforestacion_ensayo -X \
     -c "SELECT priorizacion_reforestacion.depurar();"
```

Si la base de ensayo está en otro servidor que no tiene el rol `priorizacion_reforestacion_api`, restaurar con `--no-privileges` y aplicar después `02-…-rol-y-grants.sql`, que crea el rol y da los permisos.

**Verificación**, conectado a la base de ensayo como la cuenta dueña:

```sql
-- a) conteos por tabla. La bitácora más reciente debe ser de poco antes del respaldo, y los conteos,
--    menores o iguales a los de producción hoy (salvo lo que depurar() haya recortado)
SELECT 'usuarios' AS tabla, count(*) FROM priorizacion_reforestacion.usuarios
UNION ALL SELECT 'usuarios activos', count(*) FROM priorizacion_reforestacion.usuarios WHERE activo
UNION ALL SELECT 'administración activa', count(*) FROM priorizacion_reforestacion.usuarios WHERE activo AND rol = 'admin'
UNION ALL SELECT 'sesiones', count(*) FROM priorizacion_reforestacion.sesiones
UNION ALL SELECT 'bitacora', count(*) FROM priorizacion_reforestacion.bitacora;
SELECT max(momento) AS bitacora_mas_reciente FROM priorizacion_reforestacion.bitacora;

-- b) la cuenta del servicio conserva sus permisos, y solo esos
SELECT c.relname AS tabla,
       string_agg(p, ',' ORDER BY p) FILTER (WHERE has_table_privilege('priorizacion_reforestacion_api', c.oid, p)) AS permisos
FROM pg_class c CROSS JOIN unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']) p
WHERE c.relnamespace = 'priorizacion_reforestacion'::regnamespace AND c.relkind = 'r'
GROUP BY 1 ORDER BY 1;
SELECT has_function_privilege('priorizacion_reforestacion_api', 'priorizacion_reforestacion.depurar()', 'EXECUTE') AS ejecuta_depurar,
       (SELECT prosecdef FROM pg_proc WHERE oid = 'priorizacion_reforestacion.depurar()'::regprocedure) AS con_permisos_de_la_duena;
```

| Comprobación | Se espera |
|---|---|
| Conteos | Al menos una cuenta de «administración activa»; la bitácora más reciente, de poco antes del respaldo |
| Permisos por tabla | `bitacora`: `INSERT,SELECT` · `sesiones`: `DELETE,INSERT,SELECT,UPDATE` · `usuarios`: `INSERT,SELECT,UPDATE` |
| Función | `ejecuta_depurar` y `con_permisos_de_la_duena`, los dos `t` |
| Controles negativos | Los del final de `02-…`, conectado **como** `priorizacion_reforestacion_api` a la base de ensayo (si su `pg_hba` lo permite): deben fallar, y `depurar()` debe funcionar |
| Se puede entrar | Si el SIA tiene un backend de pruebas, apuntar su `PRIORIZACION_REFORESTACION_*` a la base de ensayo y entrar con una cuenta de administración. Si no, se comprueba al restaurar de verdad (punto 3 de la comprobación de `login/LEEME.md`) |

Al terminar, **borrar la base de ensayo** (`dropdb … priorizacion_reforestacion_ensayo`): es una copia de datos personales.

### Restauración en producción (pérdida o daño de la base)

1. Avisar a la Oficina de la Secretaría la **fecha y hora del respaldo** que se va a restaurar.
2. Como la cuenta dueña, apartar el esquema dañado sin borrarlo: `ALTER SCHEMA priorizacion_reforestacion RENAME TO priorizacion_reforestacion_danado;`
3. `pg_restore` como en el paso 2 del ensayo, pero con `-d <base>`.
4. Como la cuenta dueña: `SELECT priorizacion_reforestacion.depurar();` y `DELETE FROM priorizacion_reforestacion.sesiones;` (todas las personas vuelven a entrar; ninguna sesión del respaldo revive).
5. Reiniciar el backend, como en un despliegue, para que abra conexiones nuevas. Correr la verificación de arriba en la base de producción y entrar con una cuenta de administración.
6. Cuando todo funcione: `DROP SCHEMA priorizacion_reforestacion_danado CASCADE;` (también tiene datos personales).

**Qué se pierde:** todo lo posterior al respaldo. Las cuentas creadas después no existen; las **bajas** y los **restablecimientos de contraseña** posteriores se deshacen (una cuenta dada de baja vuelve a estar activa), y la bitácora de esos días no se recupera. Con la fecha del paso 1, la Oficina repite las bajas y restablecimientos desde el panel.

### Depuración diaria

Además del respaldo, programar una vez al día en la base o en el sistema, con la cuenta dueña: `SELECT priorizacion_reforestacion.depurar();` (el script de respaldo de arriba ya lo hace). El módulo también la pide al arrancar y cada 24 horas, pero si el backend se reinicia seguido podría no llegar a correr; con la tarea diaria se cumple lo que promete el aviso de privacidad.

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
| El fondo «Calles» no aparece | No se copiaron `sitio/datos/fondo/` o el servidor no los entrega | Comprobar con `MANIFIESTO.sha256` y abrir `/priorizacion-reforestacion/datos/fondo/fondo_base.bin`; las manzanas aparecen desde el zoom 13 |
| Errores 503 al recargar | Límite de velocidad | Punto 15 |
| Excel o PDF no se descargan y la consola dice «Refused to…» | Política sin `worker-src 'self' blob:` o sin `'wasm-unsafe-eval'` | Punto 12 |

## 7. Parámetros de la instalación

Se fijan al armar el paquete, no en el servidor. Quedan escritos en `sitio/config.js` y se resumen en `VERSION.txt`. Este paquete trae:

| Parámetro | Valor |
|---|---|
| Fondo «Calles» | Propio, en `sitio/datos/fondo/` (no pide nada a terceros ni lleva clave) |
| Clave de Esri (fondo «Satélite») | No hace falta por ahora: el satélite funciona sin clave |
| Inicio de sesión | Encendido: acceso en `/priorizacion-reforestacion/acceso/`, cierre en `/priorizacion-reforestacion/api/salir`, registro de usos en `/priorizacion-reforestacion/api/uso` (ver `login/LEEME.md`) |

Con inicio de sesión, la herramienta **no guarda copia para uso sin conexión**: una copia local se abriría sin sesión.

Si alguno debe cambiar, la Oficina de la Secretaría entrega un paquete nuevo.
<!-- solo-repositorio -->

En el repositorio: `SIA_ESRI_KEY` (o `02_fuente/claves.local.json`, que no se publica), y `SIA_SESION_INICIO`, `SIA_SESION_CIERRE` y `SIA_SESION_USO` como variables de entorno al correr `empaquetar.py`. Vacías = sin sesión.
<!-- /solo-repositorio -->
