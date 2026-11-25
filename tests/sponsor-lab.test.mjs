import assert from "node:assert/strict";
import test from "node:test";
import { MAX_SLOTS, buildLab, defaultSelection, loadSponsorFile, pairKey } from "../lib/sponsor-lab.js";

const file = loadSponsorFile();

function brand(id, name, overrides = {}) {
  return {
    id, name, website: "", market: "Paysandú, Uruguay", city: "Paysandú", countryCode: "UY", logo: null,
    category: "Turismo", subcategory: "", archetype: "Explorador", motives: ["Exploración"], ages: ["25–34"], client: "B2C",
    scope: "Local", nse: "Medio", source: "bd_v3", ...overrides,
  };
}

// Base de prueba: los 6 sponsors más 8 marcas de relleno.
const sponsorBrands = file.sponsors.map((sponsor, index) => brand(`S-${index}`, sponsor.name, {
  category: sponsor.profile.category, archetype: sponsor.profile.personality, motives: sponsor.profile.motivators,
  ages: sponsor.profile.ages, client: sponsor.profile.clientType, scope: sponsor.profile.scope, nse: sponsor.profile.nse, city: sponsor.city,
}));
const brands = [...sponsorBrands, ...Array.from({ length: 8 }, (_, index) => brand(`F-${index}`, `Marca ${index}`))];

test("sin selección arranca con los 6 sponsors y 15 duplas", () => {
  const lab = buildLab({ brands, file });
  assert.deepEqual(lab.selectedIds, defaultSelection(brands, file));
  assert.equal(lab.candidates.length, 6);
  assert.equal(lab.pairs.length, 15);
  assert.ok(lab.candidates.every((item) => item.isSponsor && item.profile.tone));
});

test("la matriz es simétrica, sin diagonal y con puntajes en rango", () => {
  const lab = buildLab({ brands, file });
  for (const pair of lab.pairs) {
    assert.notEqual(pair.a, pair.b);
    assert.equal(lab.byKey[pairKey(pair.a, pair.b)], lab.byKey[pairKey(pair.b, pair.a)]);
    assert.ok(pair.score >= 38 && pair.score <= 99, `${pair.key} fuera de rango: ${pair.score}`);
    assert.equal(pair.score, Math.round((pair.directional[pair.a] + pair.directional[pair.b]) / 2));
    assert.ok(pair.idea.length > 20);
  }
  const scores = lab.pairs.map((pair) => pair.score);
  assert.deepEqual(scores, [...scores].sort((x, y) => y - x));
});

test("se puede elegir cualquier marca de la base, hasta 6 y sin repetir", () => {
  const lab = buildLab({ brands, file, selectedIds: ["F-0", "S-1", "F-0", "NO-EXISTE", "F-1", "F-2", "F-3", "F-4", "F-5"] });
  assert.deepEqual(lab.selectedIds, ["F-0", "S-1", "F-1", "F-2", "F-3", "F-4"]);
  assert.equal(lab.selectedIds.length, MAX_SLOTS);
  const plain = lab.candidates.find((item) => item.id === "F-0");
  assert.equal(plain.isSponsor, false);
  assert.equal(plain.profile.tone, null);
});

test("con menos de dos marcas no hay duplas ni resumen", () => {
  const lab = buildLab({ brands, file, selectedIds: ["F-0"] });
  assert.equal(lab.pairs.length, 0);
  assert.equal(lab.summary, null);
});

test("el top de la base excluye a las marcas elegidas", () => {
  const lab = buildLab({ brands, file });
  for (const candidate of lab.candidates) {
    const ids = candidate.base.matches.map((item) => item.id);
    assert.equal(ids.length, 5);
    assert.ok(ids.every((id) => !lab.selectedIds.includes(id)));
  }
});
