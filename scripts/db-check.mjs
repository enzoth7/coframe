import { inspectDatabase, validateBrands, readSources } from "./db-lib.mjs";

try {
  const sourceStats = validateBrands(readSources({
    uruguayCsv: process.env.COFRAME_URUGUAY_CSV,
    internationalCsv: process.env.COFRAME_INTERNATIONAL_CSV,
  }));
  const dbStats = inspectDatabase(process.env.COFRAME_DB_PATH);
  const expected = { total: 240, uruguay: 140, international: 100, global: 75, latam: 25, paysandu: 83, montevideo: 57, duplicates: 0, incomplete: 0 };
  const failures = Object.entries(expected).filter(([key, value]) => dbStats[key] !== value).map(([key, value]) => `${key}: esperado ${value}, obtenido ${dbStats[key]}`);
  if (failures.length) throw new Error(failures.join("\n"));
  console.table({ Fuentes: sourceStats, SQLite: dbStats });
  console.log(`Chequeo correcto: ${dbStats.total} nombres normalizados únicos, sin campos críticos incompletos.`);
} catch (error) {
  console.error(`Chequeo fallido:\n${error.message}`);
  process.exitCode = 1;
}
