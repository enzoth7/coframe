import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { parse } from "csv-parse/sync";
import { toCulturalCode, toSegment } from "../lib/taxonomies.js";

export const projectRoot = process.cwd();
export const defaultUruguayCsv = path.join(projectRoot, "data", "sources", "uruguay-brands.csv");
export const defaultInternationalCsv = path.join(projectRoot, "data", "sources", "international-brands.csv");
export const defaultDbPath = path.join(projectRoot, "data", "coframe.sqlite");

const requiredUruguayHeaders = [
  "ID_MARCA", "NOMBRE_MARCA", "PAIS_ISO2", "SEDE", "CATEGORIA", "ARQUETIPOS_MARCAS",
  "MOTIVADORES_SIMBOLISMOS", "TIPO_CLIENTE(B2B/B2C)", "PUBLICO_EDAD(RANGO)",
  "NIVEL_SOCIOECONÓMICO", "CÓDIGO_CULTURAL",
];

const requiredInternationalHeaders = [
  "id", "name", "website", "country_code", "city", "category", "client_type", "scope",
  "archetype", "motivators", "age_ranges", "customer_style", "nse", "segment",
  "cultural_code", "source", "public_source_url",
];

const archetypes = new Set(["Inocente", "Explorador", "Sabio", "Héroe", "Forajido", "Mago", "Ciudadano", "Amante", "Bufón", "Cuidador", "Creador", "Gobernante"]);

export function normalizeName(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function clean(value = "") {
  const result = String(value ?? "").trim();
  return result === "N/A" ? "" : result;
}

function parseCsv(content, options = {}) {
  return parse(content.replace(/^\uFEFF/, ""), {
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
    ...options,
  });
}

function splitComma(value) {
  return clean(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function canonicalMotivator(value) {
  const normalized = normalizeName(value);
  if (normalized.includes("familia") || normalized.includes("resguardo")) return "Familia";
  if (normalized.includes("pertenencia")) return "Pertenencia";
  if (normalized.includes("seguridad")) return "Seguridad";
  if (normalized.includes("exploracion")) return "Exploración";
  if (normalized.includes("libertad")) return "Libertad";
  if (normalized.includes("placer")) return "Placer";
  if (normalized.includes("estatus")) return "Estatus";
  if (normalized.includes("poder") || normalized.includes("dominancia")) return "Poder";
  if (normalized.includes("control")) return "Control";
  if (normalized.includes("trascendencia")) return "Trascendencia";
  return value.trim();
}

function splitMotivators(value, separator = ",") {
  return [...new Set(clean(value).split(separator).map(canonicalMotivator).filter(Boolean))];
}

function splitAges(value, separator = ",") {
  return [...new Set(clean(value).split(separator).map((item) => {
    const numbers = item.match(/\d+/g) || [];
    if (numbers.length >= 2) return `${numbers[0]}–${numbers[1]}`;
    if (numbers.length === 1 && /\+/.test(item)) return `${numbers[0]}+`;
    return item.trim();
  }).filter(Boolean))];
}

function firstArchetype(value) {
  const candidates = clean(value).split(/[,/|]/).map((item) => item.trim());
  return candidates.find((item) => archetypes.has(item)) || candidates[0] || "Ciudadano";
}

function brandBase(values) {
  return {
    matrixBrand: clean(values.matrixBrand), website: clean(values.website), instagram: clean(values.instagram),
    followersBucket: clean(values.followersBucket), engagementRate: clean(values.engagementRate),
    companyType: clean(values.companyType), companySize: clean(values.companySize), countryCode: clean(values.countryCode).toUpperCase(),
    city: clean(values.city), category: clean(values.category), subcategory: clean(values.subcategory), clientType: clean(values.clientType),
    scope: clean(values.scope), budgetRange: clean(values.budgetRange), revenueRange: clean(values.revenueRange),
    customerStyle: clean(values.customerStyle), nse: clean(values.nse), segment: clean(values.segment),
    coreAudience: clean(values.coreAudience), culturalCode: clean(values.culturalCode), source: clean(values.source),
    publicSourceUrl: clean(values.publicSourceUrl), active: 1,
  };
}

// [estilo de cliente, segmento, código cultural] por arquetipo. Segmento y código cultural usan
// las listas de lib/taxonomies.js, que no comparten valores.
const archetypeDefaults = {
  Creador: ["Influencia", "Innovador / Early adopter", "Creativo / Indie / Alternativo"],
  Sabio: ["Cumplimiento", "Racional / Informado", "Tradicional / Institucional"],
  Gobernante: ["Dominancia", "Aspiracional / Status-seeker", "Aspiracional Silencioso"],
  Mago: ["Influencia", "Innovador / Early adopter", "Tech / Futurista"],
  Bufón: ["Influencia", "Convencional / Masivo", "Relajado / Casual"],
  Explorador: ["Influencia", "Lifestyle / Experiencias", "Relajado / Casual"],
  Inocente: ["Estabilidad", "Convencional / Masivo", "Mainstream / Popular"],
  Héroe: ["Dominancia", "Aspiracional / Status-seeker", "Bienestar / Vida sana"],
  Ciudadano: ["Estabilidad", "Convencional / Masivo", "Mainstream / Popular"],
  Forajido: ["Dominancia", "Lifestyle / Experiencias", "Urbano / Street / Vibrante"],
  Cuidador: ["Estabilidad", "Convencional / Masivo", "Bienestar / Vida sana"],
  Amante: ["Influencia", "Aspiracional / Status-seeker", "Aspiracional Silencioso"],
};

function completeClassifications(brand) {
  const defaults = archetypeDefaults[brand.archetype] || archetypeDefaults.Ciudadano;
  const adultAudience = ["Automotriz", "Finanzas", "Hogar", "Servicios", "Turismo"].includes(brand.category);
  const broadAudience = ["Alimentos", "Bebidas", "Retail", "Salud", "Educación"].includes(brand.category);
  return {
    ...brand,
    customerStyle: brand.customerStyle || defaults[0],
    segment: toSegment(brand.segment) || defaults[1],
    coreAudience: brand.coreAudience || (broadAudience ? "Público familiar y adulto" : "Público urbano conectado"),
    culturalCode: toCulturalCode(brand.culturalCode, brand.archetype, brand.category) || defaults[2],
    ageRanges: brand.ageRanges.length ? brand.ageRanges : adultAudience ? ["25–34", "35–44", "45–54"] : broadAudience ? ["18–24", "25–34", "35–44", "45–54"] : ["18–24", "25–34", "35–44"],
  };
}

export function parseUruguayCsv(content) {
  const rows = parseCsv(content);
  const headerIndex = rows.findIndex((row) => row[0] === "ID_MARCA");
  if (headerIndex < 0) throw new Error("No se encontró la cabecera ID_MARCA en BD_V3.");
  const headers = rows[headerIndex].map((header) => clean(header));
  const missingHeaders = requiredUruguayHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length) throw new Error(`Faltan columnas en BD_V3: ${missingHeaders.join(", ")}`);
  const at = (row, header) => row[headers.indexOf(header)] ?? "";
  const result = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const id = clean(at(row, "ID_MARCA"));
    const name = clean(at(row, "NOMBRE_MARCA"));
    if (!/^M-\d+$/i.test(id) || !name) continue;
    const brand = {
      id, name, normalizedName: normalizeName(name),
      ...brandBase({
        matrixBrand: at(row, "MARCA_MATRIZ"), website: at(row, "WEBSITE"), instagram: at(row, "IG_HANDLE"),
        followersBucket: at(row, "SEGUIDORES_IG"), engagementRate: at(row, "ENGAGEMENT_IG_%"),
        companyType: at(row, "TIPO_EMPRESA"), companySize: at(row, "TAMAÑO_EMPRESA"), countryCode: at(row, "PAIS_ISO2"),
        city: at(row, "SEDE"), category: at(row, "CATEGORIA"), subcategory: at(row, "SUBCATEGORIA"),
        clientType: at(row, "TIPO_CLIENTE(B2B/B2C)"), scope: at(row, "TIPO_EMPRESA"),
        budgetRange: at(row, "PRESUPUESTO_USD(RANGO)"), revenueRange: at(row, "ANNUAL_REVENUE_USD"),
        customerStyle: at(row, "TIPOS_CLIENTES"), nse: at(row, "NIVEL_SOCIOECONÓMICO"),
        segment: at(row, "SEGMENTO_TRANSVERSAL"), coreAudience: at(row, "NUCLEO_PUB_OBJ"),
        culturalCode: at(row, "CÓDIGO_CULTURAL"), source: "bd_v3",
        publicSourceUrl: at(row, "WEBSITE"),
      }),
      archetype: firstArchetype(at(row, "ARQUETIPOS_MARCAS")),
      motivators: splitMotivators(at(row, "MOTIVADORES_SIMBOLISMOS")),
      ageRanges: splitAges(at(row, "PUBLICO_EDAD(RANGO)")),
    };
    result.push(completeClassifications(brand));
  }
  return result;
}

export function parseInternationalCsv(content) {
  const rows = parseCsv(content, { columns: true, trim: true });
  if (!rows.length) throw new Error("El catálogo internacional está vacío.");
  const missingHeaders = requiredInternationalHeaders.filter((header) => !(header in rows[0]));
  if (missingHeaders.length) throw new Error(`Faltan columnas internacionales: ${missingHeaders.join(", ")}`);
  return rows.map((row) => ({
    id: clean(row.id), name: clean(row.name), normalizedName: normalizeName(row.name),
    ...brandBase({
      matrixBrand: row.matrix_brand, website: row.website, instagram: row.instagram,
      companyType: row.company_type, companySize: row.company_size, countryCode: row.country_code,
      city: row.city, category: row.category, subcategory: row.subcategory, clientType: row.client_type,
      scope: row.scope, budgetRange: row.budget_range, revenueRange: row.revenue_range,
      customerStyle: row.customer_style, nse: row.nse, segment: row.segment,
      coreAudience: row.core_audience, culturalCode: row.cultural_code, source: row.source,
      publicSourceUrl: row.public_source_url,
    }),
    archetype: firstArchetype(row.archetype),
    motivators: splitMotivators(row.motivators, "|"),
    ageRanges: splitAges(row.age_ranges, "|"),
  }));
}

export function readSources({ uruguayCsv = defaultUruguayCsv, internationalCsv = defaultInternationalCsv } = {}) {
  const uruguayContent = fs.readFileSync(uruguayCsv, "utf8");
  const internationalContent = fs.readFileSync(internationalCsv, "utf8");
  return {
    uruguay: parseUruguayCsv(uruguayContent),
    international: parseInternationalCsv(internationalContent),
    sourceHash: crypto.createHash("sha256").update(uruguayContent).update("\0").update(internationalContent).digest("hex"),
  };
}

export function validateBrands({ uruguay, international }) {
  const errors = [];
  const all = [...uruguay, ...international];
  const required = ["id", "name", "normalizedName", "countryCode", "city", "category", "archetype", "clientType", "scope", "source"];
  if (uruguay.length !== 140) errors.push(`Se esperaban 140 marcas de BD_V3 y llegaron ${uruguay.length}.`);
  if (international.length !== 100) errors.push(`Se esperaban 100 marcas internacionales y llegaron ${international.length}.`);
  const globalCount = international.filter((brand) => brand.source === "international_global").length;
  const latamCount = international.filter((brand) => brand.source === "international_latam").length;
  if (globalCount !== 75 || latamCount !== 25) errors.push(`El catálogo internacional debe tener 75 globales y 25 latinoamericanas; tiene ${globalCount} y ${latamCount}.`);
  const paysandu = uruguay.filter((brand) => normalizeName(brand.city) === "paysandu").length;
  const montevideo = uruguay.filter((brand) => normalizeName(brand.city) === "montevideo").length;
  if (paysandu !== 83 || montevideo !== 57) errors.push(`BD_V3 debe tener 83 marcas de Paysandú y 57 de Montevideo; tiene ${paysandu} y ${montevideo}.`);
  for (const brand of all) {
    const missing = required.filter((field) => !brand[field]);
    if (!brand.motivators.length) missing.push("motivators");
    if (!brand.ageRanges.length) missing.push("ageRanges");
    if (missing.length) errors.push(`${brand.id || "sin ID"} (${brand.name || "sin nombre"}): faltan ${missing.join(", ")}.`);
  }
  const duplicates = new Map();
  for (const brand of all) duplicates.set(brand.normalizedName, [...(duplicates.get(brand.normalizedName) || []), brand.name]);
  for (const [key, names] of duplicates) if (names.length > 1) errors.push(`Nombre duplicado normalizado “${key}”: ${names.join(" / ")}.`);
  if (all.length !== 240 || duplicates.size !== 240) errors.push(`El total final debe ser 240 marcas únicas; hay ${all.length} filas y ${duplicates.size} nombres.`);
  if (errors.length) throw new Error(errors.join("\n"));
  return { total: all.length, uruguay: uruguay.length, international: international.length, global: globalCount, latam: latamCount, paysandu, montevideo, duplicates: all.length - duplicates.size };
}

const schema = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE brands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL UNIQUE,
    matrix_brand TEXT, website TEXT, instagram TEXT, followers_bucket TEXT, engagement_rate TEXT,
    company_type TEXT, company_size TEXT, country_code TEXT NOT NULL, city TEXT NOT NULL,
    category TEXT NOT NULL, subcategory TEXT, client_type TEXT NOT NULL, scope TEXT NOT NULL,
    budget_range TEXT, revenue_range TEXT, archetype TEXT NOT NULL, customer_style TEXT,
    nse TEXT, segment TEXT, core_audience TEXT, cultural_code TEXT, source TEXT NOT NULL,
    public_source_url TEXT, active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
  );
  CREATE TABLE brand_motivators (
    brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    motivator TEXT NOT NULL,
    PRIMARY KEY (brand_id, motivator)
  );
  CREATE TABLE brand_age_ranges (
    brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    age_range TEXT NOT NULL,
    PRIMARY KEY (brand_id, age_range)
  );
  CREATE INDEX idx_brands_city ON brands(city);
  CREATE INDEX idx_brands_country ON brands(country_code);
  CREATE INDEX idx_brands_category ON brands(category);
  CREATE INDEX idx_brands_archetype ON brands(archetype);
  CREATE INDEX idx_brands_source ON brands(source);
`;

function replaceDatabase(tempPath, targetPath) {
  const backupPath = `${targetPath}.previous`;
  if (fs.existsSync(backupPath)) fs.rmSync(backupPath);
  let backedUp = false;
  try {
    if (fs.existsSync(targetPath)) { fs.renameSync(targetPath, backupPath); backedUp = true; }
    fs.renameSync(tempPath, targetPath);
    if (backedUp) fs.rmSync(backupPath);
  } catch (error) {
    if (fs.existsSync(tempPath)) fs.rmSync(tempPath);
    if (backedUp && !fs.existsSync(targetPath) && fs.existsSync(backupPath)) fs.renameSync(backupPath, targetPath);
    throw error;
  }
}

export function buildDatabase({ uruguayCsv = defaultUruguayCsv, internationalCsv = defaultInternationalCsv, dbPath = defaultDbPath } = {}) {
  const sources = readSources({ uruguayCsv, internationalCsv });
  const stats = validateBrands(sources);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const tempPath = `${dbPath}.tmp-${process.pid}-${Date.now()}`;
  const db = new Database(tempPath);
  try {
    db.pragma("journal_mode = DELETE");
    db.exec(schema);
    const insertBrand = db.prepare(`INSERT INTO brands (
      id, name, normalized_name, matrix_brand, website, instagram, followers_bucket, engagement_rate,
      company_type, company_size, country_code, city, category, subcategory, client_type, scope,
      budget_range, revenue_range, archetype, customer_style, nse, segment, core_audience,
      cultural_code, source, public_source_url, active
    ) VALUES (
      @id, @name, @normalizedName, @matrixBrand, @website, @instagram, @followersBucket, @engagementRate,
      @companyType, @companySize, @countryCode, @city, @category, @subcategory, @clientType, @scope,
      @budgetRange, @revenueRange, @archetype, @customerStyle, @nse, @segment, @coreAudience,
      @culturalCode, @source, @publicSourceUrl, @active
    )`);
    const insertMotivator = db.prepare("INSERT INTO brand_motivators (brand_id, motivator) VALUES (?, ?)");
    const insertAge = db.prepare("INSERT INTO brand_age_ranges (brand_id, age_range) VALUES (?, ?)");
    const insertAll = db.transaction((brands) => {
      for (const brand of brands) {
        insertBrand.run(brand);
        for (const motivator of brand.motivators) insertMotivator.run(brand.id, motivator);
        for (const age of brand.ageRanges) insertAge.run(brand.id, age);
      }
    });
    insertAll([...sources.uruguay, ...sources.international]);
    db.prepare("INSERT INTO metadata (key, value) VALUES (?, ?)").run("schema_version", "1");
    db.prepare("INSERT INTO metadata (key, value) VALUES (?, ?)").run("source_sha256", sources.sourceHash);
    const integrity = db.pragma("quick_check", { simple: true });
    if (integrity !== "ok") throw new Error(`SQLite no superó quick_check: ${integrity}`);
  } catch (error) {
    db.close();
    if (fs.existsSync(tempPath)) fs.rmSync(tempPath);
    throw error;
  }
  db.close();
  replaceDatabase(tempPath, dbPath);
  return { ...stats, sourceHash: sources.sourceHash, dbPath };
}

export function inspectDatabase(dbPath = defaultDbPath) {
  if (!fs.existsSync(dbPath)) throw new Error(`No existe la base ${dbPath}. Restaurá un backup de data/ o corré npm run db:ensure.`);
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    const total = db.prepare("SELECT COUNT(*) AS count FROM brands").get().count;
    const uruguay = db.prepare("SELECT COUNT(*) AS count FROM brands WHERE source = 'bd_v3'").get().count;
    const international = db.prepare("SELECT COUNT(*) AS count FROM brands WHERE source LIKE 'international_%'").get().count;
    const global = db.prepare("SELECT COUNT(*) AS count FROM brands WHERE source = 'international_global'").get().count;
    const latam = db.prepare("SELECT COUNT(*) AS count FROM brands WHERE source = 'international_latam'").get().count;
    const paysandu = db.prepare("SELECT COUNT(*) AS count FROM brands WHERE source = 'bd_v3' AND lower(city) IN ('paysandu', 'paysandú')").get().count;
    const montevideo = db.prepare("SELECT COUNT(*) AS count FROM brands WHERE source = 'bd_v3' AND lower(city) = 'montevideo'").get().count;
    const duplicates = db.prepare("SELECT COUNT(*) AS count FROM (SELECT normalized_name FROM brands GROUP BY normalized_name HAVING COUNT(*) > 1)").get().count;
    const incomplete = db.prepare("SELECT COUNT(*) AS count FROM brands WHERE name = '' OR country_code = '' OR city = '' OR category = '' OR archetype = '' OR client_type = '' OR source = ''").get().count;
    const sourceHash = db.prepare("SELECT value FROM metadata WHERE key = 'source_sha256'").get()?.value || "";
    return { total, uruguay, international, global, latam, paysandu, montevideo, duplicates, incomplete, sourceHash };
  } finally {
    db.close();
  }
}
