// Migraciones del SQLite editable. Son idempotentes: se pueden correr cuantas veces haga falta.
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { CULTURAL_CODES, SEGMENTS, toCulturalCode, toSegment } from "../lib/taxonomies.js";
import { LIST_CATALOG } from "../lib/list-catalog.js";
import { DEFAULT_SETTINGS } from "../lib/weights.js";
import { MATRICES } from "../lib/matrices.js";
import { SPONSOR_VALUES, estimateValues } from "../lib/values.js";
import { subcategoryCategory, toSubcategory } from "../lib/subcategories.js";
import { FOLLOWER_BUCKETS, REVENUE_BUCKETS, SPONSOR_REVENUE, followersBucketFor, toRevenueBucket } from "../lib/scales.js";

// Seguidores reales en Instagram de las marcas que estaban en el tramo 20.001–100.000 (2026-11-25).
const FOLLOWER_COUNTS = {
  "M-00001": 27000, "M-00003": 88000, "M-00004": 60000, "M-00008": 79000, "M-00010": 32000, "M-00014": 82000,
  "M-00017": 121000, "M-00018": 46000, "M-00021": 27000, "M-00022": 65000, "M-00023": 46000, "M-00024": 77000,
  "M-00025": 77000, "M-00031": 86000, "M-00035": 41000, "M-00040": 26000, "M-00041": 48000, "M-00042": 52000,
  "M-00043": 28000, "M-00044": 65000, "M-00048": 88000, "M-00055": 56000, "M-00056": 93000, "M-00064": 24000,
  "M-00067": 81000, "M-00069": 27000, "M-00073": 81000, "M-00074": 40000, "M-00083": 28000, "M-00097": 41000,
  "M-00126": 54000, "M-00131": 86000, "M-00132": 66000, "M-00141": 51000, "M-00144": 29000,
};

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".gif": "image/gif" };

const normalizeName = (value = "") => String(value).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function followersBucket(count) {
  if (!count) return null;
  if (count <= 1000) return "0 - 1.000";
  if (count <= 5000) return "1.001 - 5.000";
  if (count <= 20000) return "5.001 - 20.000";
  if (count <= 100000) return "20.001 - 100.000";
  return "100.001 - 500.000";
}

function nextUruguayId(db) {
  const max = db.prepare("SELECT id FROM brands WHERE id LIKE 'M-%'").all()
    .reduce((top, row) => Math.max(top, Number(row.id.split("-")[1]) || 0), 0);
  return `M-${String(max + 1).padStart(5, "0")}`;
}

export function migrateDatabase(dbPath, root = process.cwd()) {
  const db = new Database(dbPath, { fileMustExist: true });
  const log = [];
  try {
    db.pragma("foreign_keys = ON");
    db.exec(`
      CREATE TABLE IF NOT EXISTS brand_logos (
        brand_id TEXT PRIMARY KEY REFERENCES brands(id) ON DELETE CASCADE,
        mime TEXT NOT NULL,
        data BLOB NOT NULL,
        source TEXT,
        updated_at INTEGER NOT NULL
      );
    `);

    const saveLogo = db.prepare(`
      INSERT INTO brand_logos (brand_id, mime, data, source, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(brand_id) DO UPDATE SET mime = excluded.mime, data = excluded.data, source = excluded.source, updated_at = excluded.updated_at
    `);
    const hasLogo = db.prepare("SELECT 1 FROM brand_logos WHERE brand_id = ?");
    const findByName = db.prepare("SELECT id FROM brands WHERE normalized_name = ?");

    // 1. Logos que estaban como archivos sueltos en public/logos pasan a la base.
    const manifestPath = path.join(root, "public", "logos", "manifest.json");
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      let imported = 0;
      for (const [key, url] of Object.entries(manifest)) {
        const id = key.toUpperCase();
        if (hasLogo.get(id) || !db.prepare("SELECT 1 FROM brands WHERE id = ?").get(id)) continue;
        const file = path.join(root, "public", url.replace(/^\//, ""));
        const mime = MIME[path.extname(file).toLowerCase()];
        if (!mime || !fs.existsSync(file)) continue;
        saveLogo.run(id, mime, fs.readFileSync(file), "manifest", Date.now());
        imported += 1;
      }
      if (imported) log.push(`${imported} logos importados desde public/logos`);
    }

    // 2. Los sponsors de Polarist Club pasan a ser marcas de la base, con su logo a color.
    const sponsorFile = path.join(root, "data", "sponsors", "polarist-sponsors.json");
    if (fs.existsSync(sponsorFile)) {
      const { sponsors } = JSON.parse(fs.readFileSync(sponsorFile, "utf8"));
      const insertBrand = db.prepare(`
        INSERT INTO brands (id, name, normalized_name, website, instagram, followers_bucket, company_type, country_code, city,
          category, subcategory, client_type, scope, archetype, nse, source, active)
        VALUES (@id, @name, @normalizedName, @website, @instagram, @followersBucket, @scope, @countryCode, @city,
          @category, @subcategory, @clientType, @scope, @archetype, @nse, 'bd_v3', 1)
      `);
      const insertMotivator = db.prepare("INSERT OR IGNORE INTO brand_motivators (brand_id, motivator) VALUES (?, ?)");
      const insertAge = db.prepare("INSERT OR IGNORE INTO brand_age_ranges (brand_id, age_range) VALUES (?, ?)");
      for (const sponsor of sponsors) {
        let id = findByName.get(normalizeName(sponsor.name))?.id;
        if (!id) {
          id = nextUruguayId(db);
          const profile = sponsor.profile;
          db.transaction(() => {
            insertBrand.run({
              id, name: sponsor.name, normalizedName: normalizeName(sponsor.name), website: sponsor.website,
              instagram: sponsor.instagram, followersBucket: followersBucket(sponsor.followers), countryCode: sponsor.countryCode,
              city: sponsor.city, category: profile.category, subcategory: sponsor.subcategory, clientType: profile.clientType,
              scope: profile.scope, archetype: profile.personality, nse: profile.nse,
            });
            for (const item of profile.motivators) insertMotivator.run(id, item);
            for (const item of profile.ages) insertAge.run(id, item);
          })();
          log.push(`${sponsor.name} agregado a la base como ${id}`);
        }
        const logoFile = fs.readdirSync(path.join(root, "data", "sponsors", "logos"), { withFileTypes: true })
          .map((entry) => entry.name).find((name) => path.parse(name).name === sponsor.id);
        const current = db.prepare("SELECT source FROM brand_logos WHERE brand_id = ?").get(id);
        if (logoFile && (!current || current.source === "manifest")) {
          const file = path.join(root, "data", "sponsors", "logos", logoFile);
          saveLogo.run(id, MIME[path.extname(file).toLowerCase()], fs.readFileSync(file), "sponsor", Date.now());
          log.push(`logo a color de ${sponsor.name}`);
        }
      }
    }

    // 3. Segmento y código cultural pasan a sus listas propias (lib/taxonomies.js), sin valores compartidos.
    const rows = db.prepare("SELECT id, archetype, category, segment, cultural_code FROM brands").all();
    const update = db.prepare("UPDATE brands SET segment = ?, cultural_code = ? WHERE id = ?");
    let normalized = 0;
    db.transaction(() => {
      for (const row of rows) {
        const segment = row.segment ? toSegment(row.segment) : row.segment;
        const culturalCode = row.cultural_code ? toCulturalCode(row.cultural_code, row.archetype, row.category) : row.cultural_code;
        if (segment !== row.segment || culturalCode !== row.cultural_code) {
          update.run(segment, culturalCode, row.id);
          normalized += 1;
        }
      }
    })();
    if (normalized) log.push(`${normalized} marcas con segmento o código cultural pasados a las listas nuevas`);

    // 4. Listas de opciones con su descripción (pestaña Listas). Solo se agrega lo que falta:
    //    las descripciones editadas a mano no se pisan.
    db.exec(`
      CREATE TABLE IF NOT EXISTS list_options (
        list_key TEXT NOT NULL,
        value TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        position INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (list_key, value)
      );
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `);
    // "parent": a qué opción de otra lista pertenece (el rubro de cada subrubro).
    if (!db.prepare("PRAGMA table_info(list_options)").all().some((column) => column.name === "parent")) {
      db.exec("ALTER TABLE list_options ADD COLUMN parent TEXT");
    }
    const seedOption = db.prepare("INSERT OR IGNORE INTO list_options (list_key, value, description, position, parent) VALUES (?, ?, ?, ?, ?)");
    let seeded = 0;
    db.transaction(() => {
      for (const list of LIST_CATALOG) {
        list.options.forEach((option, index) => { seeded += seedOption.run(list.key, option.value, option.description, index, option.parent || null).changes; });
      }
    })();
    if (seeded) log.push(`${seeded} opciones de listas cargadas`);

    // 4b. Segmento y código cultural son listas fijas: se quitan las opciones que ya no existen.
    for (const [listKey, items] of [["cultural_code", CULTURAL_CODES], ["segment", SEGMENTS]]) {
      const valid = items.map((item) => item.value);
      const pruned = db.prepare(`DELETE FROM list_options WHERE list_key = ? AND value NOT IN (${valid.map(() => "?").join(", ")})`).run(listKey, ...valid).changes;
      if (pruned) log.push(`${pruned} opciones viejas quitadas de ${listKey}`);
    }

    // 5. Pesos de compatibilidad (pestaña Ajustes).
    const seededSettings = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('compatibility', ?)").run(JSON.stringify(DEFAULT_SETTINGS)).changes;
    if (seededSettings) log.push("pesos de compatibilidad por defecto cargados");

    // 6. Matrices de compatibilidad entre valores (pestaña Matriz). Se guardan una vez por par (a <= b);
    //    las celdas editadas a mano no se pisan y se quitan las de valores que ya no existen.
    db.exec(`
      CREATE TABLE IF NOT EXISTS matrix_values (
        matrix_key TEXT NOT NULL,
        a TEXT NOT NULL,
        b TEXT NOT NULL,
        value REAL NOT NULL CHECK (value >= 0 AND value <= 1),
        PRIMARY KEY (matrix_key, a, b)
      );
    `);
    const seedCell = db.prepare("INSERT OR IGNORE INTO matrix_values (matrix_key, a, b, value) VALUES (?, ?, ?, ?)");
    let cells = 0;
    let removed = 0;
    db.transaction(() => {
      for (const matrix of MATRICES) {
        for (const [pair, value] of Object.entries(matrix.defaults())) {
          const [a, b] = pair.split("||");
          cells += seedCell.run(matrix.key, a, b, value).changes;
        }
        const valid = matrix.values;
        const stale = db.prepare("SELECT a, b FROM matrix_values WHERE matrix_key = ?").all(matrix.key).filter((row) => !valid.includes(row.a) || !valid.includes(row.b));
        for (const row of stale) removed += db.prepare("DELETE FROM matrix_values WHERE matrix_key = ? AND a = ? AND b = ?").run(matrix.key, row.a, row.b).changes;
      }
    })();
    if (cells) log.push(`${cells} celdas de matrices cargadas`);

    // 8. Subrubros unificados (una sola vez): el texto libre pasa a la lista cerrada y, si el subrubro
    //    pertenece a otro rubro, la marca se mueve a ese rubro. Después se edita desde la tabla.
    if (!db.prepare("SELECT 1 FROM metadata WHERE key = 'subcategories_unified'").get()) {
      const brands = db.prepare("SELECT id, name, category, subcategory FROM brands").all();
      const update = db.prepare("UPDATE brands SET subcategory = ?, category = ? WHERE id = ?");
      let unified = 0;
      let moved = 0;
      db.transaction(() => {
        for (const brand of brands) {
          const subcategory = toSubcategory(brand.subcategory, brand.category, brand.name) || "Otro";
          const category = subcategoryCategory[subcategory] === "Otro" ? brand.category : subcategoryCategory[subcategory];
          if (subcategory !== brand.subcategory || category !== brand.category) {
            update.run(subcategory, category, brand.id);
            unified += 1;
            if (category !== brand.category) moved += 1;
          }
        }
        db.prepare("INSERT INTO metadata (key, value) VALUES ('subcategories_unified', ?)").run(new Date().toISOString());
      })();
      log.push(`subrubros unificados en ${unified} marcas (${moved} cambiaron de rubro)`);
    }

    // 7. Valores de marca (Schwartz). Se estiman UNA sola vez para las marcas uruguayas que no tengan;
    //    después se corrigen a mano y la migración no los vuelve a tocar.
    db.exec(`
      CREATE TABLE IF NOT EXISTS brand_values (
        brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
        value TEXT NOT NULL,
        PRIMARY KEY (brand_id, value)
      );
    `);
    const estimated = db.prepare("SELECT value FROM metadata WHERE key = 'brand_values_estimated'").get();
    if (!estimated) {
      const brands = db.prepare("SELECT id, name, archetype, cultural_code FROM brands WHERE country_code = 'UY'").all();
      const motives = db.prepare("SELECT motivator FROM brand_motivators WHERE brand_id = ?");
      const hasValues = db.prepare("SELECT 1 FROM brand_values WHERE brand_id = ?");
      const insertValue = db.prepare("INSERT OR IGNORE INTO brand_values (brand_id, value) VALUES (?, ?)");
      let filled = 0;
      db.transaction(() => {
        for (const brand of brands) {
          if (hasValues.get(brand.id)) continue;
          const values = SPONSOR_VALUES[brand.name] || estimateValues({
            archetype: brand.archetype,
            motivators: motives.all(brand.id).map((row) => row.motivator),
            culturalCode: brand.cultural_code,
          });
          for (const value of values) insertValue.run(brand.id, value);
          if (values.length) filled += 1;
        }
        db.prepare("INSERT INTO metadata (key, value) VALUES ('brand_values_estimated', ?)").run(new Date().toISOString());
      })();
      log.push(`valores estimados para ${filled} marcas uruguayas`);
    }
    if (removed) log.push(`${removed} celdas de valores viejos quitadas`);

    // 9. Escalones nuevos de seguidores y facturación (una sola vez). El tramo 20.001–100.000 se parte
    //    con los seguidores reales medidos el 2026-11-25; la facturación pasa a la clasificación uruguaya.
    if (!db.prepare("SELECT 1 FROM metadata WHERE key = 'scales_2026_11'").get()) {
      const brands = db.prepare("SELECT id, name, instagram, followers_bucket, revenue_range, company_size FROM brands").all();
      const update = db.prepare("UPDATE brands SET followers_bucket = ?, revenue_range = ? WHERE id = ?");
      let followersChanged = 0;
      let revenueChanged = 0;
      db.transaction(() => {
        for (const brand of brands) {
          let followers = brand.followers_bucket;
          if (/^sin instagram$/i.test(brand.instagram || "")) followers = "Sin cuenta";
          else if (FOLLOWER_COUNTS[brand.id]) followers = followersBucketFor(FOLLOWER_COUNTS[brand.id]);
          else if (followers === "20.001 - 100.000") followers = "20.001 - 50.000";
          const revenue = SPONSOR_REVENUE[brand.name]
            || toRevenueBucket(brand.revenue_range, { companySize: brand.company_size, followersBucket: followers });
          if (followers !== brand.followers_bucket) followersChanged += 1;
          if (revenue !== brand.revenue_range) revenueChanged += 1;
          if (followers !== brand.followers_bucket || revenue !== brand.revenue_range) update.run(followers, revenue, brand.id);
        }
        db.prepare("INSERT INTO metadata (key, value) VALUES ('scales_2026_11', ?)").run(new Date().toISOString());
      })();
      log.push(`escalones nuevos: ${followersChanged} marcas cambiaron de seguidores y ${revenueChanged} de facturación`);
    }
    for (const [listKey, items] of [["followers_bucket", FOLLOWER_BUCKETS], ["revenue_range", REVENUE_BUCKETS]]) {
      const valid = items.map((item) => item.value);
      const pruned = db.prepare(`DELETE FROM list_options WHERE list_key = ? AND value NOT IN (${valid.map(() => "?").join(", ")})`).run(listKey, ...valid).changes;
      if (pruned) log.push(`${pruned} opciones viejas quitadas de ${listKey}`);
    }
  } finally {
    db.close();
  }
  return log;
}
