import assert from "node:assert/strict";
import test from "node:test";
import { CULTURAL_CODES, SEGMENTS, toCulturalCode, toSegment } from "../lib/taxonomies.js";

const segments = SEGMENTS.map((item) => item.value);
const codes = CULTURAL_CODES.map((item) => item.value);

test("segmento y código cultural no comparten ningún valor", () => {
  assert.deepEqual(segments.filter((value) => codes.includes(value)), []);
});

test("los valores viejos de la planilla se traducen a las listas nuevas", () => {
  for (const old of ["Price-sensitive", "Convenience-first", "Funcional / Conocimiento", "Mainstream / Popular"]) {
    assert.ok(segments.includes(toSegment(old)), old);
  }
  const oldCodes = ["Mainstream / Popular", "Lifestyle / Experiencias", "Innovador / Early adopter", "Aspiracional Silencioso", "Urbano / Street / Vibrante",
    "Pertenencia popular", "Lujo silencioso", "Aventura y libertad", "Cuidado y bienestar", "Creatividad y autenticidad", "Placer y sensualidad",
    "Progreso y tecnología", "Relajo y cotidianidad", "Alegría y optimismo", "Superación y rendimiento", "Saber y expertise", "Calle y contracultura", "Éxito y ostentación"];
  for (const old of oldCodes) for (const category of ["Moda", "Alimentos", "Tecnología", "Salud", "Automotriz"]) {
    assert.ok(codes.includes(toCulturalCode(old, "Ciudadano", category)), `${old} (${category})`);
  }
  assert.equal(toCulturalCode("Tradicional / Cuidado", "Cuidador", "Salud"), "Bienestar / Vida sana");
  assert.equal(toCulturalCode("Tradicional / Cuidado", "Gobernante", "Moda"), "Tradicional / Institucional");
  assert.equal(toCulturalCode("Aspiracional Silencioso", "Gobernante", "Moda"), "Aspiracional Silencioso");
});

test("el código cultural usa los 8 del mapa original más Bienestar y Tech", () => {
  assert.equal(codes.length, 10);
  for (const name of ["Aspiracional Ostentoso", "Aspiracional Silencioso", "Relajado / Casual", "Creativo / Indie / Alternativo", "Tradicional / Institucional", "Mainstream / Popular", "Urbano / Street / Vibrante", "Underground / Subcultural"]) {
    assert.ok(codes.includes(name), name);
  }
});
