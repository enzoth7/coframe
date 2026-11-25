// El SQLite es la fuente de verdad: se edita desde la pestaña Base de datos.
// Los CSV de data/sources son solo una semilla de emergencia: se usan únicamente si el SQLite no existe.
import fs from "node:fs";
import { buildDatabase, defaultDbPath } from "./db-lib.mjs";
import { migrateDatabase } from "./db-migrate.mjs";

const dbPath = process.env.COFRAME_DB_PATH || defaultDbPath;

try {
  if (fs.existsSync(dbPath)) {
    console.log(`Base existente en ${dbPath}: se conservan las ediciones.`);
  } else {
    const stats = buildDatabase({ dbPath });
    console.log(`Base creada desde los CSV: ${stats.total} marcas.`);
  }
  for (const line of migrateDatabase(dbPath)) console.log(`Migración: ${line}`);
} catch (error) {
  console.error(`No se pudo preparar la base SQLite.\n${error.message}`);
  process.exitCode = 1;
}
