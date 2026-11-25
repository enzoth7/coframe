import assert from "node:assert/strict";
import test from "node:test";
import { brandScale, pairAlerts } from "../lib/alerts.js";

const base = { name: "A", category: "Bebidas", subcategory: "Cerveza artesanal", nse: "Medio", segment: "Convencional / Masivo", followersBucket: "5.001 - 20.000", revenueRange: "Hasta USD 100.000" };

test("mismo subrubro es competencia directa; mismo rubro solo avisa", () => {
  const rival = { ...base, name: "B", subcategory: "Cerveza artesanal" };
  assert.equal(pairAlerts(base, rival)[0].key, "competition");
  const water = { ...base, name: "C", subcategory: "Gaseosas y aguas" };
  assert.equal(pairAlerts(base, water)[0].key, "same-category");
  assert.deepEqual(pairAlerts(base, { ...base, name: "D", category: "Moda", subcategory: "Ropa" }), []);
});

test("la escala combina seguidores y facturación", () => {
  assert.equal(brandScale({ followersBucket: "0 - 1.000", revenueRange: "Hasta USD 100.000" }), 1);
  assert.equal(brandScale({ followersBucket: "500.001+", revenueRange: "Más de USD 500 M" }), 5);
  assert.equal(brandScale({}), null);
  const giant = { ...base, name: "Gigante", category: "Moda", subcategory: "Ropa", followersBucket: "500.001+", revenueRange: "Más de USD 500 M" };
  const tiny = { ...base, name: "Chica", category: "Hogar", subcategory: "Muebles", followersBucket: "0 - 1.000", revenueRange: "Hasta USD 100.000" };
  assert.ok(pairAlerts(giant, tiny).some((alert) => alert.key === "scale"));
});

test("públicos de poder adquisitivo muy distinto avisan posicionamiento opuesto", () => {
  const cheap = { ...base, category: "Alimentos", subcategory: "Panadería", nse: "Bajo" };
  const luxury = { ...base, category: "Moda", subcategory: "Joyería", nse: "Alto" };
  assert.ok(pairAlerts(cheap, luxury).some((alert) => alert.key === "positioning"));
});

test("valores de Schwartz: vecinos se refuerzan y opuestos chocan", async () => {
  const { valueAffinity, valuesFit, estimateValues, VALUE_NAMES } = await import("../lib/values.js");
  assert.equal(VALUE_NAMES.length, 10);
  assert.equal(valueAffinity("Poder", "Poder"), 1);
  assert.equal(valueAffinity("Poder", "Logro"), 0.8);
  assert.equal(valueAffinity("Poder", "Universalismo"), 0.1);
  assert.equal(valueAffinity("Tradición", "Estimulación"), 0.25);
  assert.ok(valuesFit(["Tradición", "Benevolencia"], ["Tradición"]) > valuesFit(["Tradición"], ["Estimulación"]));
  assert.equal(valuesFit([], ["Poder"]), 0.5);
  assert.deepEqual(estimateValues({ archetype: "Gobernante", motivators: ["Estatus"], culturalCode: "Aspiracional Ostentoso" }), ["Poder", "Logro"]);
});

test("subrubros: cada uno tiene un rubro y todos los textos viejos se traducen", async () => {
  const { SUBCATEGORIES, toSubcategory } = await import("../lib/subcategories.js");
  const data = (await import("../lib/coframe-data.js")).default;
  for (const item of SUBCATEGORIES) assert.ok(data.categories.includes(item.category), item.value);
  assert.equal(new Set(SUBCATEGORIES.map((item) => item.value)).size, SUBCATEGORIES.length);
  assert.equal(toSubcategory("Fast food", "Alimentos", "X"), "Comida rápida");
  assert.equal(toSubcategory("Restauración rápida", "Alimentos", "Y"), "Comida rápida");
  assert.equal(toSubcategory("Software", "Servicios", "Passline"), "Venta de entradas");
  assert.equal(toSubcategory("Automóviles", "Automotriz", "Porsche"), "Fabricantes de autos");
  assert.equal(toSubcategory("Automóviles", "Automotriz", "JP Automóviles"), "Automotoras y concesionarias");
});

test("escalones de seguidores y facturación", async () => {
  const { followersBucketFor, scaleAffinity, toRevenueBucket, FOLLOWER_ORDER, REVENUE_ORDER } = await import("../lib/scales.js");
  assert.equal(followersBucketFor(46000), "20.001 - 50.000");
  assert.equal(followersBucketFor(51000), "50.001 - 100.000");
  assert.equal(followersBucketFor(121000), "100.001 - 500.000");
  assert.equal(REVENUE_ORDER.length, 7);
  const near = scaleAffinity(REVENUE_ORDER);
  assert.equal(near("USD 100.000 – 350.000", "USD 100.000 – 350.000"), 1);
  assert.equal(near("Hasta USD 100.000", "Más de USD 500 M"), 0.1);
  assert.equal(scaleAffinity(FOLLOWER_ORDER)("Sin cuenta", "500.001+"), null);
  assert.equal(toRevenueBucket("$5M – $10M"), "USD 1,7 M – 12 M");
  assert.equal(toRevenueBucket("< $1M", { companySize: "001 – 010", followersBucket: "1.001 - 5.000" }), "Hasta USD 100.000");
  assert.equal(toRevenueBucket("< $1M", { companySize: "011 – 050" }), "USD 350.000 – 1,7 M");
});
