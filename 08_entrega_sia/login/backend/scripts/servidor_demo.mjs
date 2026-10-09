// Servidor de demostración: reproduce en una sola máquina lo que hará el servidor del SIA (nginx + backend + base), con una base en memoria o un PostgreSQL de pruebas.
//   /acceso/priorizacion-reforestacion/        pantalla de acceso y panel (archivos de ../acceso)
//   /api/priorizacion-reforestacion/           módulo de sesión, con una base en memoria (pg-mem)
//   /priorizacion-reforestacion/  la herramienta (carpeta docs/ del repositorio), protegida como con auth_request de nginx:
//                          la página sin sesión va a la pantalla de acceso; datos y programas responden 401
// Uso: npm install && node --import ./pruebas/cargador.mjs scripts/servidor_demo.mjs   → http://localhost:8090/priorizacion-reforestacion/
// Solo para desarrollo y ensayo: no va al backend del SIA. Monta el módulo igual que src/index.ts de sia-backend.
// Cuenta inicial: admin@ejemplo.gob.mx con la contraseña temporal que se muestra al arrancar. Nada se guarda al cerrar.
// Opciones (variables de entorno):
//   DEMO_DATOS=1   carga cuentas ficticias (@ejemplo.gob.mx, contraseña «demostracion-2026») y 90 días de uso simulado
//   DEMO_PG=1      usa un PostgreSQL de PRUEBAS (variables PG* de la cuenta priorizacion_reforestacion_api, con los dos SQL aplicados) en vez de la base en memoria
//   SITIO=…/docs   la herramienta a servir (para ver el registro de usos, construida con la sesión: ver ../LEEME.md)
//   DEMO_RED=192.168.x.x  además, abrirla desde otro equipo de la red (un celular): acepta esa procedencia y la cookie va sin «Secure»
//                  porque la red local no usa HTTPS. SOLO para la demostración: en producción la cookie siempre es segura.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import pg from 'pg';
import helmet from 'helmet';
import cors from 'cors';
import { baseEnMemoria } from '../pruebas/base.mjs';
const { crearRutasPriorizacionReforestacion } = await import('../src/modulos/priorizacion-reforestacion/rutas.ts');
const { huella, temporal } = await import('../src/modulos/priorizacion-reforestacion/contrasenas.ts');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  const PUERTO = +(process.env.PUERTO || 8090);
  let pool;
  if (process.env.DEMO_PG) pool = new pg.Pool();
  else pool = baseEnMemoria();
  const clave = process.env.CLAVE_DEMO || temporal();
  if (process.env.DEMO_DATOS) { const r = await (await import('./datos_demo.mjs')).sembrar(pool); console.log(`Datos simulados: ${r.cuentas} cuentas ficticias y ${r.registros} registros de 90 días.`); }
  await pool.query(`INSERT INTO priorizacion_reforestacion.usuarios (correo, nombre, institucion, rol, huella, debe_cambiar) VALUES ('admin@ejemplo.gob.mx', 'Administración (demostración)', 'SEDEMA', 'admin', $1, true)
    ON CONFLICT (correo) DO UPDATE SET huella = EXCLUDED.huella, debe_cambiar = true, activo = true`, [await huella(clave)]);

  const red = process.env.DEMO_RED, origen = `http://localhost:${PUERTO}` + (red ? `,http://${red}:${PUERTO}` : '');
  // la API, como en sia-backend (helmet, cors y express.json() globales); las páginas estáticas las sirve nginx en el SIA, sin pasar por Express
  const app = express();
  app.use('/api', helmet(), cors(), express.json());
  app.use('/api/priorizacion-reforestacion', crearRutasPriorizacionReforestacion(pool, { origen, depurarCadaHoras: 0, cookieSegura: !red }));
  app.use('/acceso/priorizacion-reforestacion', express.static(path.join(__dirname, '..', '..', 'acceso')));
  // equivalente a auth_request de nginx (ver ../LEEME.md, sección nginx)
  const sitio = process.env.SITIO || path.join(__dirname, '..', '..', '..', '..', 'docs');
  app.use('/priorizacion-reforestacion', async (req, res, next) => {
    const r = await fetch(`http://127.0.0.1:${PUERTO}/api/priorizacion-reforestacion/sesion`, { headers: { cookie: req.get('cookie') || '', 'x-original-uri': req.originalUrl } });
    if (r.status === 204) return next();
    const esPagina = req.path === '/' || req.path === '/index.html';
    if (esPagina) return res.redirect(302, '/acceso/priorizacion-reforestacion/?volver=' + encodeURIComponent(req.originalUrl));
    res.status(401).type('html').send('<html><body>No autorizado</body></html>');
  }, express.static(sitio));
  app.listen(PUERTO, () => console.log(`${red ? `En el celular (misma red Wi-Fi): http://${red}:${PUERTO}/priorizacion-reforestacion/
` : ''}Demostración en http://localhost:${PUERTO}/priorizacion-reforestacion/\nCuenta: admin@ejemplo.gob.mx · contraseña temporal: ${clave}\nPanel: http://localhost:${PUERTO}/acceso/priorizacion-reforestacion/admin/`));
})();
