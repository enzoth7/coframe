import path from "node:path";
import Database from "better-sqlite3";
import { BRAND_COLUMNS, columnByKey } from "./brand-columns.js";
import { LIST_CATALOG, listByKey } from "./list-catalog.js";
import { DEFAULT_SETTINGS, normalizeSettings } from "./weights.js";
import { MATRICES, defaultMatrices, matrixByKey, matrixPairKey } from "./matrices.js";

const dbPath = () => process.env.COFRAME_DB_PATH || path.join(process.cwd(), "data", "coframe.sqlite");

function openDatabase() {
  const database = new Database(dbPath(), { readonly: true, fileMustExist: true });
  database.pragma("query_only = ON");
  return database;
}

function openWritable() {
  const database = new Database(dbPath(), { fileMustExist: true });
  database.pragma("foreign_keys = ON");
  return database;
}

// En Vercel el sistema de archivos es de solo lectura: la base se edita en local.
export const isDatabaseWritable = () => !process.env.VERCEL;

export class BrandEditError extends Error {}

const normalizeName = (value = "") => String(value).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// URL pública del logo guardado en la base; el parámetro v invalida la caché al cambiarlo.
export const logoUrl = (id, version) => (version ? `/api/brands/${encodeURIComponent(id)}/logo?v=${version}` : null);

export function getActiveBrands() {
  const database = openDatabase();
  try {
    const rows = database.prepare(`
    SELECT
      b.id, b.name, b.website, b.country_code AS countryCode, b.city, b.category,
      b.archetype, b.client_type AS client, b.scope, b.nse, b.source, b.subcategory, b.instagram,
      b.segment, b.cultural_code AS culturalCode, b.customer_style AS customerStyle, b.core_audience AS coreAudience,
      b.followers_bucket AS followersBucket, b.revenue_range AS revenueRange,
      (SELECT updated_at FROM brand_logos WHERE brand_id = b.id) AS logoVersion,
      CASE
        WHEN b.source = 'bd_v3' THEN b.city || ', Uruguay'
        WHEN b.source = 'international_latam' THEN 'Latinoamérica'
        ELSE 'Internacional'
      END AS market,
      (SELECT GROUP_CONCAT(value, '|') FROM brand_values WHERE brand_id = b.id) AS brandValues,
      GROUP_CONCAT(DISTINCT bm.motivator) AS motivators,
      GROUP_CONCAT(DISTINCT ba.age_range) AS ageRanges
    FROM brands b
    LEFT JOIN brand_motivators bm ON bm.brand_id = b.id
    LEFT JOIN brand_age_ranges ba ON ba.brand_id = b.id
    WHERE b.active = 1
    GROUP BY b.id
    ORDER BY b.name COLLATE NOCASE
    `).all();
    return rows.map(({ logoVersion, ...brand }) => ({
      ...brand,
      logo: logoUrl(brand.id, logoVersion),
      motives: brand.motivators ? brand.motivators.split(",") : [],
      values: brand.brandValues ? brand.brandValues.split("|") : [],
      ages: brand.ageRanges ? brand.ageRanges.split(",") : [],
    }));
  } finally {
    database.close();
  }
}

export function getBrandStats() {
  const database = openDatabase();
  try {
    return database.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(source = 'bd_v3') AS uruguay,
        SUM(source = 'international_global') AS global,
        SUM(source = 'international_latam') AS latam,
        SUM(source = 'bd_v3' AND lower(city) IN ('paysandu', 'paysandú')) AS paysandu,
        SUM(source = 'bd_v3' AND lower(city) = 'montevideo') AS montevideo
      FROM brands
      WHERE active = 1
    `).get();
  } finally {
    database.close();
  }
}

const plainKeys = BRAND_COLUMNS.filter((column) => column.type !== "multi").map((column) => column.key);

function readRows(database, where = "", params = []) {
  const rows = database.prepare(`
    SELECT b.id, ${plainKeys.map((key) => `b.${key}`).join(", ")},
      (SELECT GROUP_CONCAT(motivator, '|') FROM brand_motivators WHERE brand_id = b.id) AS motivators,
      (SELECT GROUP_CONCAT(age_range, '|') FROM brand_age_ranges WHERE brand_id = b.id) AS ages,
      (SELECT GROUP_CONCAT(value, '|') FROM brand_values WHERE brand_id = b.id) AS brand_values,
      (SELECT updated_at FROM brand_logos WHERE brand_id = b.id) AS logo_version
    FROM brands b ${where}
    ORDER BY b.name COLLATE NOCASE
  `).all(...params);
  return rows.map(({ logo_version: version, ...row }) => ({
    ...row,
    logo: logoUrl(row.id, version),
    active: row.active === 1,
    motivators: row.motivators ? row.motivators.split("|") : [],
    brand_values: row.brand_values ? row.brand_values.split("|") : [],
    ages: row.ages ? row.ages.split("|") : [],
  }));
}

function readListValues(database) {
  const hasTable = database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'list_options'").get();
  if (!hasTable) return { lists: {}, parents: {} };
  const hasParent = database.prepare("PRAGMA table_info(list_options)").all().some((column) => column.name === "parent");
  const lists = {};
  const parents = {};
  for (const row of database.prepare(`SELECT list_key, value${hasParent ? ", parent" : ""} FROM list_options ORDER BY list_key, position, value`).all()) {
    (lists[row.list_key] ||= []).push(row.value);
    if (row.parent) (parents[row.list_key] ||= {})[row.value] = row.parent;
  }
  return { lists, parents };
}

// Todas las marcas (activas e inactivas) con las opciones de cada columna de selección.
// `lists` son las listas oficiales (pestaña Listas); `options` suma además los valores que ya están cargados.
export function getBrandTable() {
  const database = openDatabase();
  try {
    const rows = readRows(database);
    const { lists, parents } = readListValues(database);
    const options = {};
    for (const column of BRAND_COLUMNS) {
      if (column.type !== "select" && column.type !== "multi") continue;
      const official = lists[column.key] || column.base || [];
      const existing = column.type === "multi"
        ? rows.flatMap((row) => row[column.key])
        : rows.map((row) => row[column.key]);
      const extra = [...new Set(existing.filter(Boolean))].filter((value) => !official.includes(value)).sort((a, b) => a.localeCompare(b, "es"));
      options[column.key] = [...official, ...extra];
      if (lists[column.key]) lists[column.key] = official;
    }
    return { rows, options, lists, parents };
  } finally {
    database.close();
  }
}

// --- Listas (pestaña Listas) ---

const MULTI_TABLES = { motivators: ["brand_motivators", "motivator"], ages: ["brand_age_ranges", "age_range"], brand_values: ["brand_values", "value"] };

export function getLists() {
  const database = openDatabase();
  try {
    const rows = database.prepare("SELECT list_key, value, description, position, parent FROM list_options ORDER BY list_key, position, value").all();
    const usage = {};
    for (const list of LIST_CATALOG) {
      const counts = {};
      if (MULTI_TABLES[list.key]) {
        const [table, field] = MULTI_TABLES[list.key];
        for (const row of database.prepare(`SELECT ${field} AS value, COUNT(*) AS n FROM ${table} GROUP BY ${field}`).all()) counts[row.value] = row.n;
      } else if (columnByKey[list.key]) {
        for (const row of database.prepare(`SELECT ${list.key} AS value, COUNT(*) AS n FROM brands GROUP BY ${list.key}`).all()) counts[row.value] = row.n;
      } else {
        continue;
      }
      usage[list.key] = counts;
    }
    return LIST_CATALOG.map((list) => ({
      key: list.key,
      label: list.label,
      help: list.help,
      scored: list.scored,
      parentLabel: list.parentLabel || null,
      parentOptions: list.parentLabel ? listByKey.category.options.map((option) => option.value) : null,
      countable: Boolean(usage[list.key]),
      options: rows.filter((row) => row.list_key === list.key).map((row) => ({
        value: row.value,
        description: row.description,
        parent: row.parent || null,
        uses: usage[list.key]?.[row.value] || 0,
      })),
    }));
  } finally {
    database.close();
  }
}

function catalogList(listKey) {
  const list = listByKey[listKey];
  if (!list) throw new BrandEditError("Esa lista no existe.");
  return list;
}

export function updateListDescription(listKey, value, description) {
  catalogList(listKey);
  const text = String(description ?? "").trim();
  if (!text) throw new BrandEditError("La descripción no puede quedar vacía.");
  const database = openWritable();
  try {
    const result = database.prepare("UPDATE list_options SET description = ? WHERE list_key = ? AND value = ?").run(text, listKey, value);
    if (!result.changes) throw new BrandEditError("Esa opción ya no existe.");
  } finally {
    database.close();
  }
}

// Las listas que entran en el cálculo no aceptan opciones nuevas: el motor no sabría cómo puntuarlas.
export function addListOption(listKey, value, description, parent) {
  const list = catalogList(listKey);
  if (list.scored) throw new BrandEditError(`${list.label} entra en el cálculo de compatibilidad: sus opciones son fijas.`);
  const name = String(value ?? "").trim();
  const text = String(description ?? "").trim();
  if (!name) throw new BrandEditError("Escribí el nombre de la opción.");
  if (!text) throw new BrandEditError("Escribí una descripción corta.");
  if (list.parentLabel && !listByKey.category.options.some((option) => option.value === parent)) {
    throw new BrandEditError(`Elegí el ${list.parentLabel.toLowerCase()} al que pertenece.`);
  }
  const database = openWritable();
  try {
    if (database.prepare("SELECT 1 FROM list_options WHERE list_key = ? AND lower(value) = lower(?)").get(listKey, name)) {
      throw new BrandEditError(`"${name}" ya está en la lista.`);
    }
    const position = database.prepare("SELECT COALESCE(MAX(position), -1) + 1 AS next FROM list_options WHERE list_key = ?").get(listKey).next;
    database.prepare("INSERT INTO list_options (list_key, value, description, position, parent) VALUES (?, ?, ?, ?, ?)").run(listKey, name, text, position, list.parentLabel ? parent : null);
  } finally {
    database.close();
  }
}

export function deleteListOption(listKey, value) {
  const list = catalogList(listKey);
  if (list.scored) throw new BrandEditError(`${list.label} entra en el cálculo de compatibilidad: sus opciones son fijas.`);
  const database = openWritable();
  try {
    if (columnByKey[listKey]) {
      const used = database.prepare(`SELECT COUNT(*) AS n FROM brands WHERE ${listKey} = ?`).get(value).n;
      if (used) throw new BrandEditError(`"${value}" lo usan ${used} marcas. Cambialas primero en la Base de datos.`);
    }
    database.prepare("DELETE FROM list_options WHERE list_key = ? AND value = ?").run(listKey, value);
  } finally {
    database.close();
  }
}

// --- Ajustes (pestaña Ajustes) ---

export function getSettings() {
  const database = openDatabase();
  try {
    const hasTable = database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'settings'").get();
    const row = hasTable ? database.prepare("SELECT value FROM settings WHERE key = 'compatibility'").get() : null;
    return normalizeSettings(row ? JSON.parse(row.value) : DEFAULT_SETTINGS);
  } finally {
    database.close();
  }
}

export function saveSettings(input) {
  const settings = normalizeSettings(input);
  const database = openWritable();
  try {
    database.prepare("INSERT INTO settings (key, value) VALUES ('compatibility', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify(settings));
    return settings;
  } finally {
    database.close();
  }
}

function cleanValue(column, value) {
  if (column.type === "bool") return value ? 1 : 0;
  if (column.type === "multi") {
    const list = Array.isArray(value) ? value : String(value || "").split(",");
    return [...new Set(list.map((item) => String(item).trim()).filter(Boolean))];
  }
  const text = value == null ? "" : String(value).trim();
  if (column.required && !text) throw new BrandEditError(`${column.label} no puede quedar vacío.`);
  if (column.key === "country_code") return text.toUpperCase().slice(0, 2);
  return text || null;
}

export function updateBrandField(id, key, value) {
  const column = columnByKey[key];
  if (!column) throw new BrandEditError("Esa columna no se puede editar.");
  const clean = cleanValue(column, value);
  const database = openWritable();
  try {
    const exists = database.prepare("SELECT 1 FROM brands WHERE id = ?").get(id);
    if (!exists) throw new BrandEditError("La marca ya no existe.");
    const save = database.transaction(() => {
      if (column.type === "multi") {
        const [table, field] = MULTI_TABLES[key];
        database.prepare(`DELETE FROM ${table} WHERE brand_id = ?`).run(id);
        const insert = database.prepare(`INSERT INTO ${table} (brand_id, ${field}) VALUES (?, ?)`);
        for (const item of clean) insert.run(id, item);
      } else if (key === "name") {
        const clash = database.prepare("SELECT name FROM brands WHERE normalized_name = ? AND id <> ?").get(normalizeName(clean), id);
        if (clash) throw new BrandEditError(`Ya existe una marca llamada ${clash.name}.`);
        database.prepare("UPDATE brands SET name = ?, normalized_name = ? WHERE id = ?").run(clean, normalizeName(clean), id);
      } else {
        database.prepare(`UPDATE brands SET ${key} = ? WHERE id = ?`).run(clean, id);
      }
    });
    save();
    return readRows(database, "WHERE b.id = ?", [id])[0];
  } finally {
    database.close();
  }
}

export function getLogo(id) {
  const database = openDatabase();
  try {
    return database.prepare("SELECT mime, data, updated_at FROM brand_logos WHERE brand_id = ?").get(id) || null;
  } finally {
    database.close();
  }
}

const LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

// Revisa el contenido real del archivo, no solo la extensión que manda el navegador.
function sniffImage(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer.subarray(0, 4).toString("hex") === "89504e47") return "image/png";
  if (buffer.subarray(0, 4).toString("latin1") === "RIFF" && buffer.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  const head = buffer.subarray(0, 512).toString("utf8").trimStart().toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) return "image/svg+xml";
  return null;
}

export function saveLogo(id, buffer) {
  if (!buffer?.length) throw new BrandEditError("El archivo está vacío.");
  if (buffer.length > MAX_LOGO_BYTES) throw new BrandEditError("El logo pesa más de 2 MB.");
  const mime = sniffImage(buffer);
  if (!mime || !LOGO_TYPES.has(mime)) throw new BrandEditError("El logo tiene que ser PNG, JPG, WEBP o SVG.");
  const database = openWritable();
  try {
    if (!database.prepare("SELECT 1 FROM brands WHERE id = ?").get(id)) throw new BrandEditError("La marca ya no existe.");
    const now = Date.now();
    database.prepare(`
      INSERT INTO brand_logos (brand_id, mime, data, source, updated_at) VALUES (?, ?, ?, 'manual', ?)
      ON CONFLICT(brand_id) DO UPDATE SET mime = excluded.mime, data = excluded.data, source = excluded.source, updated_at = excluded.updated_at
    `).run(id, mime, buffer, now);
    return logoUrl(id, now);
  } finally {
    database.close();
  }
}

export function deleteLogo(id) {
  const database = openWritable();
  try {
    database.prepare("DELETE FROM brand_logos WHERE brand_id = ?").run(id);
  } finally {
    database.close();
  }
}

function nextId(database, prefix, digits) {
  const rows = database.prepare("SELECT id FROM brands WHERE id LIKE ?").all(`${prefix}-%`);
  const max = rows.reduce((top, row) => Math.max(top, Number(row.id.split("-")[1]) || 0), 0);
  return `${prefix}-${String(max + 1).padStart(digits, "0")}`;
}

export function createBrand() {
  const database = openWritable();
  try {
    const id = nextId(database, "M", 5);
    let name = "Nueva marca";
    for (let index = 2; database.prepare("SELECT 1 FROM brands WHERE normalized_name = ?").get(normalizeName(name)); index += 1) name = `Nueva marca ${index}`;
    database.prepare(`
      INSERT INTO brands (id, name, normalized_name, country_code, city, category, subcategory, client_type, scope, archetype, source, active)
      VALUES (?, ?, ?, 'UY', 'Paysandú', 'Otro', 'Otro', 'B2C', 'Local', 'Ciudadano', 'bd_v3', 1)
    `).run(id, name, normalizeName(name));
    return readRows(database, "WHERE b.id = ?", [id])[0];
  } finally {
    database.close();
  }
}

// --- Matrices (pestaña Matriz) ---

export function getMatrices() {
  const database = openDatabase();
  try {
    const hasTable = database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'matrix_values'").get();
    if (!hasTable) return defaultMatrices();
    const matrices = Object.fromEntries(MATRICES.map((matrix) => [matrix.key, {}]));
    for (const row of database.prepare("SELECT matrix_key, a, b, value FROM matrix_values").all()) {
      if (matrices[row.matrix_key]) matrices[row.matrix_key][matrixPairKey(row.a, row.b)] = row.value;
    }
    return matrices;
  } finally {
    database.close();
  }
}

export function setMatrixCell(key, a, b, value) {
  const matrix = matrixByKey[key];
  if (!matrix) throw new BrandEditError("Esa matriz no existe.");
  if (!matrix.values.includes(a) || !matrix.values.includes(b)) throw new BrandEditError("Ese valor no está en la matriz.");
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1) throw new BrandEditError("El valor tiene que estar entre 0 y 100.");
  const [first, second] = [a, b].sort();
  const database = openWritable();
  try {
    database.prepare(`
      INSERT INTO matrix_values (matrix_key, a, b, value) VALUES (?, ?, ?, ?)
      ON CONFLICT(matrix_key, a, b) DO UPDATE SET value = excluded.value
    `).run(key, first, second, Math.round(number * 100) / 100);
  } finally {
    database.close();
  }
}

export function resetMatrix(key) {
  const matrix = matrixByKey[key];
  if (!matrix) throw new BrandEditError("Esa matriz no existe.");
  const database = openWritable();
  try {
    const save = database.prepare("INSERT INTO matrix_values (matrix_key, a, b, value) VALUES (?, ?, ?, ?) ON CONFLICT(matrix_key, a, b) DO UPDATE SET value = excluded.value");
    database.transaction(() => {
      for (const [pair, value] of Object.entries(matrix.defaults())) {
        const [a, b] = pair.split("||");
        save.run(key, a, b, value);
      }
    })();
  } finally {
    database.close();
  }
}

// Todo lo que el motor necesita para puntuar: pesos, bonus por cercanía y matrices.
export function getModel() {
  return { ...getSettings(), matrices: getMatrices() };
}
