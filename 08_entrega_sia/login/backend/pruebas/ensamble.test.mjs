// El módulo, empaquetado con la MISMA configuración de tsup que sia-backend (tsup.config.ts: ESM, node22, bundle, minify,
// noExternal todo, banner con createRequire), carga y responde. Así se descarta que algo funcione con Node directo y no en su binario.
process.env.PRIORIZACION_REFORESTACION_SCRYPT_N = '1024';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import request from 'supertest';
import { build } from 'tsup';
import { baseEnMemoria } from './base.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));

test('empaquetado como sia-backend: un solo .mjs que monta el módulo y responde', async () => {
  const sal = fs.mkdtempSync(path.join(os.tmpdir(), 'ensamble-'));
  await build({
    entry: { index: path.join(AQUI, 'ensamble', 'entrada.ts') },
    format: ['esm'], target: 'node22', outDir: sal, clean: true, bundle: true, minify: true, sourcemap: true,
    noExternal: [/(.*)/], external: ['pg-native'], silent: true,
    banner: { js: "import { createRequire as ___createRequire } from 'module'; const require = ___createRequire(import.meta.url);" },
  });
  const archivo = fs.readdirSync(sal).find(f => /^index\.m?js$/.test(f));
  assert.ok(archivo, 'tsup generó el binario');
  assert.ok(fs.statSync(path.join(sal, archivo)).size > 50_000, 'trae express adentro, como su binario');
  const { crearApp } = await import(pathToFileURL(path.join(sal, archivo)).href);
  const pool = baseEnMemoria();
  const app = crearApp(pool);
  assert.equal((await request(app).get('/api/health')).status, 200);
  const r = await request(app).post('/api/priorizacion-reforestacion/entrar').set('Origin', 'https://sedema.sia.cdmx.gob.mx').set('X-Forwarded-For', '203.0.113.5').send({ correo: 'nadie@x.mx', contrasena: 'x-incorrecta-1' });
  assert.equal(r.status, 401); assert.match(r.body.error, /correo o la contraseña/);
  assert.equal((await request(app).get('/api/priorizacion-reforestacion/sesion')).status, 401, 'la puerta de nginx responde');
  const ip = (await pool.query("SELECT ip FROM priorizacion_reforestacion.bitacora WHERE evento = 'acceso_fallido'")).rows[0].ip;
  assert.equal(ip, '203.0.113.5', 'en el binario también se lee la IP de X-Forwarded-For');
  assert.ok(r.headers['x-content-type-options'], 'helmet sigue aplicando sus cabeceras');
});
