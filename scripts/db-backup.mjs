// Copia de seguridad del SQLite, que es la única fuente de datos de CoframeLab.
// Uso: npm run db:backup  →  data/coframe.backup-AAAA-MM-DD-HHMM.sqlite
import path from "node:path";
import Database from "better-sqlite3";

const dbPath = process.env.COFRAME_DB_PATH || path.join(process.cwd(), "data", "coframe.sqlite");
const stamp = new Date().toISOString().slice(0, 16).replace("T", "-").replace(":", "");
const target = path.join(path.dirname(dbPath), `coframe.backup-${stamp}.sqlite`);

const db = new Database(dbPath, { readonly: true, fileMustExist: true });
try {
  await db.backup(target);
  console.log(`Backup listo: ${target}`);
} finally {
  db.close();
}
