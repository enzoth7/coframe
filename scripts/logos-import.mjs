// Importa logos a la base desde un JSON { "ID_MARCA": "https://url-de-la-imagen" }.
// Uso: node scripts/logos-import.mjs ruta/al/archivo.json [--reemplazar]
// Solo acepta PNG, JPEG o WEBP de hasta 2 MB. Sin --reemplazar no pisa logos existentes.
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const [file, flag] = process.argv.slice(2);
if (!file) {
  console.error("Falta el archivo JSON con las URLs.");
  process.exit(1);
}
const replace = flag === "--reemplazar";
const dbPath = process.env.COFRAME_DB_PATH || path.join(process.cwd(), "data", "coframe.sqlite");
const urls = JSON.parse(fs.readFileSync(file, "utf8"));

function sniff(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer.subarray(0, 4).toString("hex") === "89504e47") return "image/png";
  if (buffer.subarray(0, 4).toString("latin1") === "RIFF" && buffer.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

const db = new Database(dbPath, { fileMustExist: true });
const exists = db.prepare("SELECT 1 FROM brands WHERE id = ?");
const hasLogo = db.prepare("SELECT 1 FROM brand_logos WHERE brand_id = ?");
const save = db.prepare(`
  INSERT INTO brand_logos (brand_id, mime, data, source, updated_at) VALUES (?, ?, ?, 'instagram', ?)
  ON CONFLICT(brand_id) DO UPDATE SET mime = excluded.mime, data = excluded.data, source = excluded.source, updated_at = excluded.updated_at
`);

let saved = 0;
const skipped = [];
for (const [id, url] of Object.entries(urls)) {
  if (!exists.get(id)) { skipped.push(`${id}: no existe`); continue; }
  if (!replace && hasLogo.get(id)) { skipped.push(`${id}: ya tiene logo`); continue; }
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 2 * 1024 * 1024) throw new Error("pesa más de 2 MB");
    const mime = sniff(buffer);
    if (!mime) throw new Error("no es PNG, JPEG ni WEBP");
    save.run(id, mime, buffer, Date.now());
    saved += 1;
  } catch (error) {
    skipped.push(`${id}: ${error.message}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 150));
}
db.close();
console.log(`Logos guardados: ${saved}`);
if (skipped.length) console.log(`Sin guardar:\n  ${skipped.join("\n  ")}`);
