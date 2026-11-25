import assert from "node:assert/strict";
import test from "node:test";
import { calculateBrandResult } from "../lib/brand-engine.js";

const answers = {
  brandName: "Marca de prueba", location: "Paysandú", category: "Turismo", scope: "Local", clientType: "B2C",
  ages: ["25–34", "35–44"], nse: "Medio", personality: "Explorador",
  motivators: ["Exploración", "Libertad"], tone: "Cercano", objective: "Alcance", budget: "Bajo",
};

function brand(name, city, source, countryCode = "UY") {
  return {
    name, website: "", market: source === "bd_v3" ? `${city}, Uruguay` : "Internacional",
    city, countryCode, category: "Alimentos", archetype: "Ciudadano", motives: ["Pertenencia", "Seguridad"],
    client: "B2C", ages: ["25–34", "35–44"], scope: "Local", nse: "Medio", source,
  };
}

test("la ubicación prioriza sin bloquear marcas internacionales", () => {
  const brands = [
    { ...brand("Ancla similar", "Madrid", "international_global", "ES"), category: "Turismo", archetype: "Explorador", motives: ["Exploración", "Libertad"] },
    brand("Local exacta", "Paysandú", "bd_v3"),
    brand("Otra uruguaya", "Montevideo", "bd_v3"),
    brand("Internacional", "Madrid", "international_global", "ES"),
    { ...brand("Internacional muy afín", "Madrid", "international_global", "ES"), category: "Tecnología", archetype: "Explorador", motives: ["Exploración", "Libertad"] },
  ];
  const result = calculateBrandResult(answers, brands);
  const local = result.matches.find((item) => item.name === "Local exacta");
  const other = result.matches.find((item) => item.name === "Otra uruguaya");
  const international = result.matches.find((item) => item.name === "Internacional");
  assert.ok(local.score > other.score);
  assert.ok(other.score > international.score);
  assert.ok(result.matches.some((item) => item.name === "Internacional muy afín"));
});

test("las marcas retornadas incluyen id y logo desde el manifiesto", () => {
  const brands = [
    { ...brand("Apple", "Cupertino", "international_global", "US"), id: "INT-0001" },
    { ...brand("Marca sin logo", "Paysandú", "bd_v3"), id: "M-99999" },
  ];
  const result = calculateBrandResult(answers, brands);
  const apple = result.similar.find((item) => item.name === "Apple") || result.matches.find((item) => item.name === "Apple");
  assert.ok(apple);
  assert.equal(apple.id, "INT-0001");
  assert.ok(typeof apple.logo === "string" && apple.logo.startsWith("/logos/int-0001."));

  const unknown = result.similar.find((item) => item.name === "Marca sin logo") || result.matches.find((item) => item.name === "Marca sin logo");
  assert.ok(unknown);
  assert.equal(unknown.id, "M-99999");
  assert.equal(unknown.logo, null);
});

