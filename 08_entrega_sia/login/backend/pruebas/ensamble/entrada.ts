// Entrada de prueba que reproduce cómo src/index.ts de sia-backend monta los módulos, para empaquetarla con su misma
// configuración de tsup (un solo .mjs ESM, minificado, con todo incluido) y probar el resultado. No va al backend del SIA.
import express from "express";
import cors from "cors";
import helmet from "helmet";
import type pg from "pg";
import { crearRutasPriorizacionReforestacion } from "../../src/modulos/priorizacion-reforestacion/rutas";

export function crearApp(pool: pg.Pool) {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use("/api/priorizacion-reforestacion", crearRutasPriorizacionReforestacion(pool, { depurarCadaHoras: 0 }));
  app.get("/api/health", (_req, res) => { res.status(200).json({ status: "ok" }); });
  return app;
}
