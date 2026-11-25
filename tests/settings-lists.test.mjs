import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { compatibilityBreakdown } from "../lib/brand-engine.js";
import { DEFAULT_SETTINGS, normalizeSettings, weightShares } from "../lib/weights.js";

// Trabaja sobre una copia de la base.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "coframe-settings-"));
const copy = path.join(dir, "coframe.sqlite");
fs.copyFileSync(path.join(process.cwd(), "data", "coframe.sqlite"), copy);
process.env.COFRAME_DB_PATH = copy;
const db = await import("../lib/brands-db.js");
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

const profile = {
  primary: "Explorador", secondary: "Creador",
  answers: { location: "Paysandú", category: "Turismo", scope: "Local", clientType: "B2C", ages: ["25–34"], nse: "Medio", motivators: ["Exploración"] },
};
const brand = { archetype: "Explorador", motives: ["Exploración"], ages: ["45–54"], category: "Moda", client: "B2C", scope: "Local", nse: "Medio", city: "Paysandú", countryCode: "UY", source: "bd_v3" };

test("los pesos se normalizan para sumar 100%", () => {
  const shares = weightShares({ weights: { archetype: 1, motivators: 1, ages: 1, category: 1, client: 0, scope: 0, nse: 0, segment: 0, cultural_code: 0, values: 0, followers: 0, revenue: 0 } });
  assert.equal(Math.round(Object.values(shares).reduce((a, b) => a + b, 0) * 1000) / 1000, 1);
  assert.equal(shares.archetype, 0.25);
  assert.deepEqual(normalizeSettings({ weights: { archetype: 0, motivators: 0, ages: 0, category: 0, client: 0, scope: 0, nse: 0, segment: 0, cultural_code: 0, values: 0, followers: 0, revenue: 0 } }).weights, DEFAULT_SETTINGS.weights);
});

test("cambiar pesos y bonus cambia el puntaje", () => {
  const base = compatibilityBreakdown(profile, brand);
  const onlyAges = compatibilityBreakdown(profile, brand, { weights: { archetype: 0, motivators: 0, ages: 100, category: 0, client: 0, scope: 0, nse: 0, segment: 0, cultural_code: 0, values: 0, followers: 0, revenue: 0 }, locationBonus: { sameCity: 0, uruguay: 0 } });
  assert.equal(base.location, 10);
  assert.equal(onlyAges.location, 0);
  assert.ok(onlyAges.score < base.score);
});

test("los ajustes se guardan en la base", () => {
  const saved = db.saveSettings({ weights: { ...DEFAULT_SETTINGS.weights, archetype: 50 }, locationBonus: { sameCity: 5, uruguay: 2 } });
  assert.equal(db.getSettings().weights.archetype, 50);
  assert.equal(saved.locationBonus.sameCity, 5);
});

test("listas: las del cálculo son fijas; las demás aceptan opciones nuevas", () => {
  assert.throws(() => db.addListOption("archetype", "Nuevo", "x"), db.BrandEditError);
  assert.throws(() => db.addListOption("segment", "Nuevo", "x"), db.BrandEditError);
  db.addListOption("core_audience", "Público de prueba", "Solo para el test");
  assert.ok(db.getLists().find((list) => list.key === "core_audience").options.some((option) => option.value === "Público de prueba"));
  db.deleteListOption("core_audience", "Público de prueba");
  assert.throws(() => db.deleteListOption("core_audience", "Público urbano conectado"), db.BrandEditError);
  db.updateListDescription("category", "Moda", "Ropa y accesorios.");
  assert.equal(db.getLists().find((list) => list.key === "category").options.find((option) => option.value === "Moda").description, "Ropa y accesorios.");
});

test("matrices: simétricas, editables y el motor las usa", async () => {
  const { MATRICES } = await import("../lib/matrices.js");
  const { compatibilityBreakdown } = await import("../lib/brand-engine.js");
  for (const matrix of MATRICES) {
    const table = matrix.defaults();
    for (const a of matrix.values) for (const b of matrix.values) {
      const value = table[[a, b].sort().join("||")];
      assert.ok(value >= 0 && value <= 1, `${matrix.key}: ${a} × ${b}`);
    }
  }
  assert.throws(() => db.setMatrixCell("segment", "Convencional / Masivo", "No existe", 0.5), db.BrandEditError);
  assert.throws(() => db.setMatrixCell("segment", "Convencional / Masivo", "Sensible al precio", 2), db.BrandEditError);
  db.setMatrixCell("cultural_code", "Urbano / Street / Vibrante", "Tradicional / Institucional", 0.9);
  const model = db.getModel();
  assert.equal(model.matrices.cultural_code[["Tradicional / Institucional", "Urbano / Street / Vibrante"].sort().join("||")], 0.9);
  const a = { primary: "Cuidador", secondary: "Ciudadano", answers: { location: "Paysandú", category: "Moda", scope: "Local", clientType: "B2C", ages: ["25–34"], nse: "Medio", motivators: ["Familia"], segment: "Convencional / Masivo", culturalCode: "Tradicional / Institucional" } };
  const b = { archetype: "Forajido", motives: ["Libertad"], ages: ["25–34"], category: "Bebidas", client: "B2C", scope: "Local", nse: "Medio", city: "Paysandú", countryCode: "UY", source: "bd_v3", segment: "Convencional / Masivo", culturalCode: "Urbano / Street / Vibrante" };
  const high = compatibilityBreakdown(a, b, model).factors.find((factor) => factor.key === "cultural_code").value;
  db.resetMatrix("cultural_code");
  const low = compatibilityBreakdown(a, b, db.getModel()).factors.find((factor) => factor.key === "cultural_code").value;
  assert.equal(high, 0.9);
  assert.equal(low, 0.25);
});
