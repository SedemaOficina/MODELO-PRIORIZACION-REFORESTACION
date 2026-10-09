// Utilidades de las pruebas: una base en memoria con el esquema REAL del módulo y una app montada como en sia-backend.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { newDb } from 'pg-mem';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const ESQUEMA = path.join(AQUI, '..', 'db', 'priorizacion_reforestacion', '01-priorizacion-reforestacion-esquema.sql');

/** Base PostgreSQL en memoria (pg-mem) con el esquema real, hasta la marca de pruebas: pg-mem no ejecuta funciones SQL ni roles. */
export function baseEnMemoria() {
  const sql = fs.readFileSync(ESQUEMA, 'utf8').split('-- marca-pruebas')[0]
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*(BEGIN|COMMIT);\s*$/gm, '');
  const db = newDb();
  // pg-mem no trae el operador de expresiones regulares de PostgreSQL: se agrega para que también se prueben las restricciones CHECK
  db.public.registerOperator({ operator: '~', left: 'text', right: 'text', returns: 'bool', implementation: (a, b) => new RegExp(b).test(a) });
  db.public.registerFunction({ name: 'trim', args: ['text'], returns: 'text', implementation: (x) => (x === null ? null : String(x).trim()) });
  db.public.registerFunction({ name: 'length', args: ['text'], returns: 'integer', implementation: (x) => (x === null ? null : [...String(x)].length) });
  db.public.none(sql);
  const { Pool } = db.adapters.createPg();
  return new Pool();
}

/** La app como la arma src/index.ts de sia-backend: helmet, cors y express.json() globales ANTES del módulo, y sin trust proxy. */
export function appComoSia(montar) {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  montar(app);
  return app;
}
