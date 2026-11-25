import fs from "node:fs";
import path from "node:path";
import data from "./coframe-data.js";
import { DEFAULT_SETTINGS, FACTORS, normalizeSettings, weightShares } from "./weights.js";
import { defaultMatrices, lookup } from "./matrices.js";
import { valueAffinity, valuesFit } from "./values.js";

const DEFAULT_MATRICES = defaultMatrices();

let logoManifest = {};
try {
  const manifestPath = path.join(process.cwd(), "public", "logos", "manifest.json");
  if (fs.existsSync(manifestPath)) {
    logoManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  }
} catch {
  logoManifest = {};
}

const categoryArchetypes = {
  Alimentos: ["Cuidador", "Ciudadano"], Automotriz: ["Héroe", "Gobernante"], Bebidas: ["Bufón", "Ciudadano"],
  Educación: ["Sabio", "Cuidador"], Entretenimiento: ["Bufón", "Creador"], Finanzas: ["Gobernante", "Sabio"],
  Hogar: ["Cuidador", "Creador"], Moda: ["Amante", "Creador"], Retail: ["Ciudadano", "Gobernante"],
  Salud: ["Cuidador", "Sabio"], Servicios: ["Sabio", "Cuidador"], Tecnología: ["Mago", "Creador"],
  Telecomunicaciones: ["Mago", "Ciudadano"], Transporte: ["Explorador", "Gobernante"], Turismo: ["Explorador", "Amante"],
  Otro: ["Creador", "Ciudadano"],
};

const normalize = (value = "") => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function archetypeAffinity(a, b) {
  if (a === b) return 1;
  const pair = data.archetypePairs.find(([first, second]) => (first === a && second === b) || (first === b && second === a));
  return pair ? pair[2] : 0.48;
}

function overlapScore(first = [], second = []) {
  if (!first.length || !second.length) return 0.5;
  const normalizedSecond = new Set(second.map(normalize));
  const matches = first.filter((item) => normalizedSecond.has(normalize(item))).length;
  return Math.min(1, matches / Math.max(1, Math.min(first.length, second.length)));
}

function motivatorFit(first, second, allowComplements = false) {
  const direct = overlapScore(first, second);
  if (!allowComplements) return direct;
  const complements = [["Seguridad", "Exploración"], ["Control", "Libertad"], ["Pertenencia", "Estatus"], ["Familia", "Placer"], ["Poder", "Trascendencia"]];
  const complement = complements.some(([a, b]) => (first.includes(a) && second.includes(b)) || (first.includes(b) && second.includes(a))) ? 0.78 : 0.45;
  return Math.max(direct, complement);
}

// Motivadores: si comparten alguno vale lo que comparten; si no, el mejor cruce según la matriz.
function motivatorMatrixFit(first = [], second = [], matrices) {
  const direct = overlapScore(first, second);
  let best = 0.45;
  for (const a of first) for (const b of second) {
    if (a === b) continue;
    const value = lookup(matrices, "motivators", a, b);
    if (value != null && value > best) best = value;
  }
  return Math.max(direct, best);
}

function clientFit(a, b) {
  if (!a || !b) return 0.5;
  if (a === b) return 1;
  if (a.includes("B2B") && b.includes("B2B")) return 0.88;
  if (a.includes("B2C") && b.includes("B2C")) return 0.88;
  return 0.42;
}

function nseFit(a, b) {
  if (!a || !b || a.includes("Amplio") || b.includes("Amplio")) return 0.78;
  const order = ["Bajo", "Medio-Bajo", "Medio", "Medio-Alto", "Alto", "Élite"];
  return Math.max(0.25, 1 - Math.abs(order.indexOf(a) - order.indexOf(b)) * 0.18);
}

// Devuelve un valor de CULTURAL_CODES (lib/taxonomies.js): el significado cultural que activa la marca.
function determineCulturalCode(answers, primary) {
  const highNse = ["Alto", "Élite"].includes(answers.nse);
  if (answers.category === "Tecnología" || primary === "Mago") return "Tech / Futurista";
  if (answers.category === "Salud" || primary === "Héroe") return "Bienestar / Vida sana";
  if (answers.motivators.includes("Estatus") || answers.motivators.includes("Poder")) return highNse ? "Aspiracional Ostentoso" : "Urbano / Street / Vibrante";
  if (primary === "Forajido") return answers.tone === "Provocador" ? "Underground / Subcultural" : "Urbano / Street / Vibrante";
  if (answers.tone === "Creativo" || primary === "Creador") return "Creativo / Indie / Alternativo";
  if (answers.tone === "Formal" || primary === "Sabio") return "Tradicional / Institucional";
  if (highNse || primary === "Amante" || primary === "Gobernante") return "Aspiracional Silencioso";
  if (answers.tone === "Divertido" || primary === "Bufón" || primary === "Explorador") return "Relajado / Casual";
  return "Mainstream / Popular";
}

function determineSegment(answers) {
  if (answers.motivators.some((item) => ["Estatus", "Poder"].includes(item))) return "Aspiracional / Status-seeker";
  if (answers.motivators.some((item) => ["Exploración", "Libertad", "Placer"].includes(item))) return "Lifestyle / Experiencias";
  if (answers.category === "Tecnología" || answers.personality === "Mago") return "Innovador / Early adopter";
  if (answers.clientType === "B2B") return "Funcional / Necesidad";
  return "Convencional / Masivo";
}

function determineCustomerStyle(answers) {
  if (answers.motivators.some((item) => ["Poder", "Estatus"].includes(item))) return "Dominancia";
  if (["Divertido", "Aspiracional", "Creativo"].includes(answers.tone)) return "Influencia";
  if (answers.motivators.some((item) => ["Seguridad", "Familia", "Pertenencia"].includes(item))) return "Estabilidad";
  return "Cumplimiento";
}

// Fuentes con ubicación uruguaya verificada: la base BD_V3 y los sponsors cargados a mano.
const localSources = new Set(["bd_v3", "polarist_sponsor"]);

// "city" si comparten ciudad, "country" si ambas están en Uruguay, null si no hay cercanía.
function locationKind(answers, brand) {
  if (!localSources.has(brand.source)) return null;
  const location = normalize(answers.location);
  const brandCity = normalize(brand.city);
  if ((location === "paysandu" || location === "montevideo") && location === brandCity) return "city";
  if (answers.location !== "Fuera de Uruguay" && brand.countryCode === "UY") return "country";
  return null;
}

function locationBonus(answers, brand, bonus = DEFAULT_SETTINGS.locationBonus) {
  const kind = locationKind(answers, brand);
  return kind === "city" ? bonus.sameCity : kind === "country" ? bonus.uruguay : 0;
}

function publicBrand(brand, score, reason) {
  const brandId = brand.id ? String(brand.id).toLowerCase() : "";
  return {
    id: brand.id,
    name: brand.name,
    logo: brand.logo ?? (brandId ? (logoManifest[brandId] || null) : null),
    website: brand.website,
    market: brand.market,
    city: brand.city,
    countryCode: brand.countryCode,
    category: brand.category,
    archetype: brand.archetype,
    source: brand.source,
    score,
    ...(reason ? { reason } : {}),
  };
}

// Arquetipo primario y secundario a partir de las respuestas del test.
export function rankArchetypes(answers) {
  const scores = Object.fromEntries(Object.keys(data.archetypes).map((key) => [key, 0]));
  const add = (key, amount) => { if (key && key in scores) scores[key] += amount; };
  const addMapped = (keys, amounts) => (keys || []).forEach((key, index) => add(key, amounts[index] || amounts.at(-1) || 0));
  add(answers.personality, 5);
  addMapped(data.toneArchetypes[answers.tone], [2.2, 1.4]);
  answers.motivators.forEach((motivator) => addMapped(data.motivatorArchetypes[motivator], [1.6, 1.05]));
  addMapped(data.objectiveArchetypes[answers.objective], [1.25, 0.8]);
  addMapped(categoryArchetypes[answers.category] || categoryArchetypes.Otro, [0.8, 0.45]);
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const primary = ranked[0][0];
  const secondary = ranked.find(([name]) => name !== primary)?.[0] || "Ciudadano";
  return { primary, secondary };
}

// `profile` es { answers, primary, secondary }; `brand` tiene la forma de getActiveBrands().
export function similarityScore({ answers, primary, secondary }, brand) {
  const archetype = Math.max(archetypeAffinity(primary, brand.archetype), archetypeAffinity(secondary, brand.archetype) * 0.9);
  return Math.round(clamp((archetype * 0.36 + motivatorFit(answers.motivators, brand.motives) * 0.25 + overlapScore(answers.ages, brand.ages) * 0.14 + (answers.category === brand.category ? 1 : 0.34) * 0.1 + clientFit(answers.clientType, brand.client) * 0.08 + (answers.scope === brand.scope ? 1 : 0.55) * 0.04 + nseFit(answers.nse, brand.nse) * 0.03) * 100, 35, 97));
}

// Aporte de cada factor a la compatibilidad. `value` va de 0 a 1 y `weight` suma 1 entre todos.
// `settings` trae los pesos y el bonus de cercanía de la pestaña Ajustes (lib/weights.js).
export function compatibilityBreakdown({ answers, primary, secondary }, brand, settings = DEFAULT_SETTINGS) {
  const complements = data.categoryComplements[answers.category] || [];
  const shares = weightShares(settings);
  // Las matrices de la pestaña Matriz mandan; si un valor no está en la matriz se usa la regla de siempre.
  const matrices = settings.matrices || DEFAULT_MATRICES;
  const cell = (key, a, b, fallback) => lookup(matrices, key, a, b) ?? fallback();
  const archetypeCell = (a) => cell("archetype", a, brand.archetype, () => archetypeAffinity(a, brand.archetype));
  const values = {
    archetype: Math.max(archetypeCell(primary), archetypeCell(secondary) * 0.88),
    values: valuesFit(answers.values || [], brand.values || [], (a, b) => lookup(matrices, "brand_values", a, b) ?? valueAffinity(a, b)),
    motivators: motivatorMatrixFit(answers.motivators, brand.motives, matrices),
    ages: overlapScore(answers.ages, brand.ages),
    category: cell("category", answers.category, brand.category, () => (complements.includes(brand.category) ? 1 : answers.category === brand.category ? 0.42 : 0.62)),
    client: cell("client_type", answers.clientType, brand.client, () => clientFit(answers.clientType, brand.client)),
    scope: cell("scope", answers.scope, brand.scope, () => (answers.scope === brand.scope ? 1 : brand.scope === "Multinacional" ? 0.72 : 0.56)),
    nse: cell("nse", answers.nse, brand.nse, () => nseFit(answers.nse, brand.nse)),
    followers: cell("followers_bucket", answers.followersBucket, brand.followersBucket, () => 0.5),
    revenue: cell("revenue_range", answers.revenueRange, brand.revenueRange, () => 0.5),
    segment: cell("segment", answers.segment, brand.segment, () => 0.5),
    cultural_code: cell("cultural_code", answers.culturalCode, brand.culturalCode, () => 0.5),
  };
  const factors = FACTORS.map(({ key, label }) => ({ key, label, weight: shares[key], value: values[key] }));
  const base = factors.reduce((sum, factor) => sum + factor.value * factor.weight, 0) * 100;
  const location = locationBonus(answers, brand, normalizeSettings(settings).locationBonus);
  return { factors, base, location, score: Math.round(clamp(clamp(base, 38, 96) + location, 38, 99)) };
}

export function compatibilityScore(profile, brand, settings = DEFAULT_SETTINGS) {
  return compatibilityBreakdown(profile, brand, settings).score;
}

export function matchReason({ answers, primary }, brand) {
  const reasons = [];
  if (archetypeAffinity(primary, brand.archetype) >= 0.8) reasons.push("personalidades afines");
  if (overlapScore(answers.ages, brand.ages) >= 0.65) reasons.push("público compartido");
  if ((data.categoryComplements[answers.category] || []).includes(brand.category)) reasons.push("rubros complementarios");
  if (motivatorFit(answers.motivators, brand.motives, true) >= 0.75) reasons.push("motivadores compatibles");
  const kind = locationKind(answers, brand);
  if (kind === "city") reasons.push("misma ciudad");
  else if (kind === "country") reasons.push("cercanía en Uruguay");
  return (reasons.length ? reasons : ["contextos compatibles", "potencial de colaboración"]).slice(0, 2).join(" · ");
}

export { archetypeAffinity };

export function calculateBrandResult(answers, brands = [], settings = DEFAULT_SETTINGS) {
  const { primary, secondary } = rankArchetypes(answers);
  const profile = { primary, secondary, culturalCode: determineCulturalCode(answers, primary), segment: determineSegment(answers), customerStyle: determineCustomerStyle(answers) };
  const scoring = { answers, primary, secondary };

  const available = brands.filter((brand) => normalize(brand.name) !== normalize(answers.brandName));
  const similar = available.map((brand) => publicBrand(brand, similarityScore(scoring, brand))).sort((a, b) => b.score - a.score).slice(0, 3);
  const excluded = new Set(similar.slice(0, 1).map((brand) => brand.name));
  const matches = available.filter((brand) => !excluded.has(brand.name)).map((brand) => publicBrand(brand, compatibilityScore(scoring, brand, settings), matchReason(scoring, brand))).sort((a, b) => b.score - a.score).slice(0, 5);
  const idealArchetype = Object.keys(data.archetypes).filter((name) => name !== primary).map((name) => ({ name, score: archetypeAffinity(primary, name) })).sort((a, b) => b.score - a.score)[0].name;
  return { ...profile, similar, matches, idealArchetype, idealCategories: (data.categoryComplements[answers.category] || data.categoryComplements.Otro).slice(0, 3) };
}
