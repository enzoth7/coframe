import fs from "node:fs";
import path from "node:path";
import data from "./coframe-data.js";
import { calculateBrandResult, compatibilityBreakdown, matchReason, rankArchetypes } from "./brand-engine.js";
import { DEFAULT_SETTINGS } from "./weights.js";
import { SCALE_LABELS, brandScale, pairAlerts } from "./alerts.js";

const normalize = (value = "") => String(value).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export const MAX_SLOTS = 6;

export const PROFILE_FIELDS = [
  ["category", "Rubro"], ["location", "Ubicación"], ["scope", "Alcance"], ["clientType", "Cliente"], ["ages", "Edades"],
  ["nse", "NSE"], ["personality", "Arquetipo"], ["motivators", "Motivadores"], ["tone", "Tono"], ["objective", "Objetivo"],
];

export function loadSponsorFile(filePath = path.join(process.cwd(), "data", "sponsors", "polarist-sponsors.json")) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function locationFor(brand) {
  const city = normalize(brand.city);
  if (city === "paysandu") return "Paysandú";
  if (city === "montevideo") return "Montevideo";
  return brand.countryCode === "UY" ? "Otra ciudad de Uruguay" : "Fuera de Uruguay";
}

// La base manda: lo que se edita en la tabla se refleja acá. La ficha de sponsor
// (data/sponsors) solo suma lo que la base no guarda: tono, objetivo, descripción y qué datos son inferidos.
export function prepareCandidate(brand, extra = null) {
  const profile = {
    location: locationFor(brand),
    category: brand.category,
    scope: brand.scope,
    clientType: brand.client,
    ages: brand.ages,
    nse: brand.nse,
    personality: brand.archetype,
    motivators: brand.motives,
    tone: extra?.profile?.tone || null,
    objective: extra?.profile?.objective || null,
    segment: brand.segment || null,
    culturalCode: brand.culturalCode || null,
    values: brand.values || [],
    followersBucket: brand.followersBucket || null,
    revenueRange: brand.revenueRange || null,
  };
  const answers = { ...profile, brandName: brand.name };
  const { primary, secondary } = rankArchetypes(answers);
  const inferred = extra
    ? PROFILE_FIELDS.filter(([key]) => extra.confidence?.[key] !== "confirmado").map(([key]) => key)
    : [];
  return {
    id: brand.id,
    name: brand.name,
    logo: brand.logo || null,
    city: brand.city,
    countryCode: brand.countryCode,
    website: brand.website || null,
    instagram: brand.instagram || extra?.instagram || null,
    subcategory: brand.subcategory || extra?.subcategory || brand.category,
    description: extra?.description || null,
    followers: extra?.followers || null,
    isSponsor: Boolean(extra),
    profile,
    // Atributos de la base para la tabla comparativa del Lab.
    traits: {
      segment: brand.segment || null,
      culturalCode: brand.culturalCode || null,
      customerStyle: brand.customerStyle || null,
      coreAudience: brand.coreAudience || null,
    },
    inferred,
    scoring: { answers, primary, secondary },
    brand: { ...brand, archetype: primary },
    archetype: { primary, secondary, label: data.archetypes[primary]?.label || primary, promise: data.archetypes[primary]?.promise || "" },
  };
}

const activationIdeas = {
  "Alimentos|Bebidas": (food, drink) => `Estación de maridaje: ${food.name} pone la comida y ${drink.name} la bebida, con una degustación guiada a mitad del evento.`,
  "Bebidas|Bebidas": (a, b) => `Barra en dos tiempos: ${a.name} abre la noche y ${b.name} la cierra, con cartelería compartida y un vaso co-marcado.`,
  "Bebidas|Moda": (drink, fashion) => `Brindis de presentación: ${fashion.name} muestra una pieza o colección y ${drink.name} sirve el brindis.`,
  "Moda|Moda": (a, b) => `Kit cruzado: una pieza de ${a.name} y otra de ${b.name} en un sorteo para asistentes, con foto conjunta para redes.`,
  "Hogar|Moda": (home, fashion) => `Rincón ambientado: ${home.name} arma el living del evento y ${fashion.name} exhibe sus piezas ahí.`,
  "Alimentos|Moda": (food, fashion) => `Sorteo combinado: una canasta de ${food.name} más un producto de ${fashion.name}, anunciado en vivo.`,
  "Alimentos|Hogar": (food, home) => `Living de sobremesa: ${home.name} amuebla un espacio de descanso y ${food.name} sirve postres ahí.`,
  "Bebidas|Hogar": (drink, home) => `Lounge de descanso con muebles de ${home.name} y bebida de ${drink.name}, pensado para fotos y charlas.`,
};

export function activationIdea(a, b) {
  const [first, second] = [a, b].sort((x, y) => String(x.profile.category).localeCompare(String(y.profile.category), "es"));
  const build = activationIdeas[`${first.profile.category}|${second.profile.category}`];
  return build ? build(first, second) : `Sorteo conjunto entre asistentes con productos de ${a.name} y ${b.name}.`;
}

function pairInsights(a, b) {
  const sharedMotivators = a.profile.motivators.filter((item) => b.profile.motivators.includes(item));
  const sharedAges = a.profile.ages.filter((item) => b.profile.ages.includes(item));
  const complementary = (data.categoryComplements[a.profile.category] || []).includes(b.profile.category)
    || (data.categoryComplements[b.profile.category] || []).includes(a.profile.category);
  return {
    sharedMotivators,
    sharedAges,
    sameCity: normalize(a.city) === normalize(b.city),
    sameCategory: a.profile.category === b.profile.category,
    complementary,
  };
}

export const pairKey = (first, second) => [first, second].sort().join("__");

// Lo que necesitan las alertas de cada marca (rubro, subrubro, escala, NSE y segmento).
function alertView(candidate) {
  return {
    name: candidate.name, category: candidate.profile.category, subcategory: candidate.subcategory, nse: candidate.profile.nse,
    segment: candidate.profile.segment, followersBucket: candidate.brand.followersBucket, revenueRange: candidate.brand.revenueRange,
  };
}

// Puntaje simétrico: promedio de A buscando a B y B buscando a A.
export function scorePair(a, b, settings = DEFAULT_SETTINGS) {
  const ab = compatibilityBreakdown(a.scoring, b.brand, settings);
  const ba = compatibilityBreakdown(b.scoring, a.brand, settings);
  const factors = ab.factors.map((factor, index) => ({ ...factor, value: (factor.value + ba.factors[index].value) / 2 }));
  const generic = new Set(["contextos compatibles", "potencial de colaboración"]);
  const all = [...new Set([matchReason(a.scoring, b.brand), matchReason(b.scoring, a.brand)].flatMap((text) => text.split(" · ")))];
  const specific = all.filter((reason) => !generic.has(reason));
  return {
    key: pairKey(a.id, b.id),
    a: a.id,
    b: b.id,
    score: Math.round((ab.score + ba.score) / 2),
    directional: { [a.id]: ab.score, [b.id]: ba.score },
    factors,
    location: (ab.location + ba.location) / 2,
    reasons: (specific.length ? specific : all).slice(0, 3),
    insights: pairInsights(a, b),
    idea: activationIdea(a, b),
    inferredFields: a.inferred.length + b.inferred.length,
    alerts: pairAlerts(alertView(a), alertView(b)),
  };
}

export function buildMatrix(candidates, settings = DEFAULT_SETTINGS) {
  const pairs = [];
  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) pairs.push(scorePair(candidates[i], candidates[j], settings));
  }
  return { pairs: pairs.sort((x, y) => y.score - x.score), byKey: Object.fromEntries(pairs.map((pair) => [pair.key, pair])) };
}

export function topMatchesFromBase(candidate, brands, excludeIds = [], settings = DEFAULT_SETTINGS) {
  const blocked = new Set(excludeIds);
  const pool = brands.filter((brand) => !blocked.has(brand.id));
  const result = calculateBrandResult(candidate.scoring.answers, pool, settings);
  return {
    matches: result.matches, idealArchetype: result.idealArchetype, idealCategories: result.idealCategories,
    derived: { culturalCode: result.culturalCode, segment: result.segment, customerStyle: result.customerStyle },
  };
}

// IDs de la base para los sponsors del evento, en el orden de la ficha.
export function defaultSelection(brands, file) {
  const byName = new Map(brands.map((brand) => [normalize(brand.name), brand.id]));
  return file.sponsors.map((sponsor) => byName.get(normalize(sponsor.name))).filter(Boolean).slice(0, MAX_SLOTS);
}

export function buildLab({ brands, selectedIds, file = loadSponsorFile(), settings = DEFAULT_SETTINGS }) {
  const byId = new Map(brands.map((brand) => [brand.id, brand]));
  const extras = new Map(file.sponsors.map((sponsor) => [normalize(sponsor.name), sponsor]));
  const ids = [...new Set((selectedIds?.length ? selectedIds : defaultSelection(brands, file)).filter((id) => byId.has(id)))].slice(0, MAX_SLOTS);
  const candidates = ids.map((id) => prepareCandidate(byId.get(id), extras.get(normalize(byId.get(id).name)) || null));
  const { pairs, byKey } = buildMatrix(candidates, settings);
  const averages = Object.fromEntries(candidates.map((candidate) => {
    const own = pairs.filter((pair) => pair.a === candidate.id || pair.b === candidate.id);
    return [candidate.id, own.length ? Math.round(own.reduce((sum, pair) => sum + pair.score, 0) / own.length) : null];
  }));
  // Qué marca desentona: su compatibilidad promedio con el resto, su peor dupla y cómo quedaría
  // la compatibilidad general si se la saca del grupo.
  const general = pairs.length ? pairs.reduce((sum, pair) => sum + pair.score, 0) / pairs.length : null;
  const dissonance = candidates.length >= 3 ? candidates.map((candidate) => {
    const own = pairs.filter((pair) => pair.a === candidate.id || pair.b === candidate.id);
    const rest = pairs.filter((pair) => pair.a !== candidate.id && pair.b !== candidate.id);
    const worst = [...own].sort((x, y) => x.score - y.score)[0];
    const withoutValue = rest.length ? rest.reduce((sum, pair) => sum + pair.score, 0) / rest.length : null;
    return {
      id: candidate.id,
      average: averages[candidate.id],
      worst: worst ? { id: worst.a === candidate.id ? worst.b : worst.a, score: worst.score } : null,
      without: withoutValue == null ? null : Math.round(withoutValue),
      delta: withoutValue == null ? null : Math.round((withoutValue - general) * 10) / 10,
      alerts: own.reduce((sum, pair) => sum + pair.alerts.length, 0),
    };
  }).sort((x, y) => x.average - y.average) : [];

  return {
    event: file.event,
    selectedIds: ids,
    dissonance,
    candidates: candidates.map((candidate) => {
      const base = topMatchesFromBase(candidate, brands, ids, settings);
      // Si la base no tiene estos atributos cargados, se usa lo que deduce el motor del perfil.
      const traits = {
        ...candidate.traits,
        culturalCode: candidate.traits.culturalCode || base.derived.culturalCode,
        segment: candidate.traits.segment || base.derived.segment,
        customerStyle: candidate.traits.customerStyle || base.derived.customerStyle,
      };
      const scale = brandScale({ followersBucket: candidate.brand.followersBucket, revenueRange: candidate.brand.revenueRange });
      return { ...candidate, traits, scale: scale ? SCALE_LABELS[scale - 1] : null, average: averages[candidate.id], base };
    }),
    pairs,
    byKey,
    summary: pairs.length ? {
      average: Math.round(pairs.reduce((sum, pair) => sum + pair.score, 0) / pairs.length),
      best: pairs[0],
      worst: pairs.at(-1),
    } : null,
    options: brands.map((brand) => ({
      id: brand.id, name: brand.name, logo: brand.logo || null, city: brand.city, category: brand.category,
      isSponsor: extras.has(normalize(brand.name)),
    })),
  };
}
