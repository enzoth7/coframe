import data from "./coframe-data.js";
import { CULTURAL_CODES, SEGMENTS } from "./taxonomies.js";
import { VALUE_NAMES, valueAffinity } from "./values.js";
import { FOLLOWER_ORDER, REVENUE_ORDER, scaleAffinity } from "./scales.js";

// Matrices de compatibilidad entre valores de un mismo atributo (pestaña Matriz).
// Cada celda va de 0 a 1: 1 = combinan perfecto, 0 = no combinan. Son simétricas.
// Los valores iniciales reproducen las reglas que el motor tenía fijas en el código; las de segmento
// y código cultural son una propuesta inicial para ajustar desde la pestaña Matriz.

const pairKey = (a, b) => [a, b].sort().join("||");

function fromPairs(values, same, pairs, fallback) {
  const table = {};
  for (const a of values) {
    for (const b of values) {
      if (a > b) continue;
      table[pairKey(a, b)] = a === b ? same : fallback;
    }
  }
  for (const [a, b, value] of pairs) table[pairKey(a, b)] = value;
  return table;
}

const NSE_ORDER = ["Bajo", "Medio-Bajo", "Medio", "Medio-Alto", "Alto", "Élite"];

function defaultNse(a, b) {
  if (a.includes("Amplio") || b.includes("Amplio")) return 0.78;
  return Math.max(0.25, 1 - Math.abs(NSE_ORDER.indexOf(a) - NSE_ORDER.indexOf(b)) * 0.18);
}

function defaultClient(a, b) {
  if (a === b) return 1;
  if (a.includes("B2B") && b.includes("B2B")) return 0.88;
  if (a.includes("B2C") && b.includes("B2C")) return 0.88;
  return 0.42;
}

const fromFunction = (values, compute) => {
  const table = {};
  for (const a of values) for (const b of values) if (a <= b) table[pairKey(a, b)] = Math.round(compute(a, b) * 100) / 100;
  return table;
};

const complementPairs = Object.entries(data.categoryComplements).flatMap(([a, list]) => list.map((b) => [a, b, 1]));

const SEGMENT_VALUES = SEGMENTS.map((item) => item.value);
const [INN, ASP, LIF, MAI, RAC, FUN, PRE, PRA] = SEGMENT_VALUES;
const CODE_VALUES = CULTURAL_CODES.map((item) => item.value);
const [OST, SIL, REL, IND, TRA, POP, URB, UND, BIE, TEC] = CODE_VALUES;

export const MATRICES = [
  {
    key: "archetype", label: "Arquetipo", factor: "archetype",
    help: "Qué tan bien conviven dos arquetipos. Se usa el arquetipo principal y, con menos peso, el secundario.",
    values: Object.keys(data.archetypes),
    defaults: () => fromPairs(Object.keys(data.archetypes), 1, data.archetypePairs, 0.48),
  },
  {
    key: "category", label: "Rubros", factor: "category",
    help: "Si dos rubros se complementan (alto) o compiten. El mismo rubro puntúa bajo porque suelen ser competencia.",
    values: data.categories,
    defaults: () => fromPairs(data.categories, 0.42, complementPairs, 0.62),
  },
  {
    key: "motivators", label: "Motivadores", factor: "motivators",
    help: "Qué tan bien se llevan dos motivadores distintos. Si comparten el mismo, cuenta como 100.",
    values: data.motivators,
    defaults: () => fromPairs(data.motivators, 1, [["Seguridad", "Exploración", 0.78], ["Control", "Libertad", 0.78], ["Pertenencia", "Estatus", 0.78], ["Familia", "Placer", 0.78], ["Poder", "Trascendencia", 0.78]], 0.45),
  },
  {
    key: "brand_values", label: "Valores", factor: "values",
    help: "Valores de Schwartz: los vecinos en el círculo se refuerzan (100, 80) y los opuestos chocan (10). Ejemplo: Poder contra Universalismo.",
    values: VALUE_NAMES,
    defaults: () => fromFunction(VALUE_NAMES, valueAffinity),
  },
  {
    key: "nse", label: "Nivel socioeconómico", factor: "nse",
    help: "Cuanto más cerca están los niveles, más compatibles. Amplio / transversal combina con todos.",
    values: data.nse,
    defaults: () => fromFunction(data.nse, defaultNse),
  },
  {
    key: "client_type", label: "Tipo de cliente", factor: "client",
    help: "Si las dos marcas le venden al mismo tipo de cliente.",
    values: ["B2C", "B2B", "B2B, B2C"],
    defaults: () => fromFunction(["B2C", "B2B", "B2B, B2C"], defaultClient),
  },
  {
    key: "scope", label: "Alcance", factor: "scope",
    help: "Si operan a la misma escala. Una marca internacional combina razonablemente con cualquiera.",
    values: ["Local", "Nacional", "Multinacional"],
    defaults: () => fromPairs(["Local", "Nacional", "Multinacional"], 1, [["Local", "Multinacional", 0.72], ["Multinacional", "Nacional", 0.72]], 0.56),
  },
  {
    key: "followers_bucket", label: "Seguidores en IG", factor: "followers",
    help: "Qué tan parecido es el alcance en Instagram. Mismo escalón 100; cuanto más lejos, menos (hasta 10).",
    values: FOLLOWER_ORDER,
    defaults: () => fromFunction(FOLLOWER_ORDER, scaleAffinity(FOLLOWER_ORDER)),
  },
  {
    key: "revenue_range", label: "Facturación", factor: "revenue",
    help: "Qué tan parecida es la escala del negocio, según la clasificación oficial uruguaya. Mismo escalón 100; cuanto más lejos, menos.",
    values: REVENUE_ORDER,
    defaults: () => fromFunction(REVENUE_ORDER, scaleAffinity(REVENUE_ORDER)),
  },
  {
    key: "segment", label: "Segmento", factor: "segment",
    help: "Qué tan parecidos son los clientes a los que le venden: lo que buscan y los recursos que tienen.",
    values: SEGMENT_VALUES,
    defaults: () => fromPairs(SEGMENT_VALUES, 1, [
      [INN, ASP, 0.7], [INN, LIF, 0.8], [INN, MAI, 0.45], [INN, RAC, 0.75], [INN, FUN, 0.4], [INN, PRE, 0.25], [INN, PRA, 0.5],
      [ASP, LIF, 0.8], [ASP, MAI, 0.5], [ASP, RAC, 0.55], [ASP, FUN, 0.35], [ASP, PRE, 0.2], [ASP, PRA, 0.45],
      [LIF, MAI, 0.6], [LIF, RAC, 0.5], [LIF, FUN, 0.35], [LIF, PRE, 0.3], [LIF, PRA, 0.55],
      [MAI, RAC, 0.6], [MAI, FUN, 0.7], [MAI, PRE, 0.75], [MAI, PRA, 0.8],
      [RAC, FUN, 0.75], [RAC, PRE, 0.55], [RAC, PRA, 0.6],
      [FUN, PRE, 0.75], [FUN, PRA, 0.8],
      [PRE, PRA, 0.7],
    ], 0.5),
  },
  {
    key: "cultural_code", label: "Código cultural", factor: "cultural_code",
    help: "Si los ambientes culturales de las dos marcas conviven bien en una misma activación.",
    values: CODE_VALUES,
    defaults: () => fromPairs(CODE_VALUES, 1, [
      [OST, SIL, 0.65], [OST, REL, 0.35], [OST, IND, 0.3], [OST, TRA, 0.55], [OST, POP, 0.45], [OST, URB, 0.55], [OST, UND, 0.2], [OST, BIE, 0.5], [OST, TEC, 0.6],
      [SIL, REL, 0.55], [SIL, IND, 0.7], [SIL, TRA, 0.6], [SIL, POP, 0.35], [SIL, URB, 0.4], [SIL, UND, 0.35], [SIL, BIE, 0.7], [SIL, TEC, 0.65],
      [REL, IND, 0.7], [REL, TRA, 0.45], [REL, POP, 0.75], [REL, URB, 0.7], [REL, UND, 0.5], [REL, BIE, 0.65], [REL, TEC, 0.5],
      [IND, TRA, 0.35], [IND, POP, 0.35], [IND, URB, 0.7], [IND, UND, 0.75], [IND, BIE, 0.55], [IND, TEC, 0.55],
      [TRA, POP, 0.65], [TRA, URB, 0.25], [TRA, UND, 0.1], [TRA, BIE, 0.55], [TRA, TEC, 0.35],
      [POP, URB, 0.55], [POP, UND, 0.2], [POP, BIE, 0.6], [POP, TEC, 0.55],
      [URB, UND, 0.7], [URB, BIE, 0.5], [URB, TEC, 0.6],
      [UND, BIE, 0.25], [UND, TEC, 0.45],
      [BIE, TEC, 0.5],
    ], 0.5),
  },
];

export const matrixByKey = Object.fromEntries(MATRICES.map((matrix) => [matrix.key, matrix]));

export function defaultMatrices() {
  return Object.fromEntries(MATRICES.map((matrix) => [matrix.key, matrix.defaults()]));
}

export { pairKey as matrixPairKey };

// Valor de la matriz para dos valores; null si alguno no está en la matriz.
export function lookup(matrices, key, a, b) {
  if (a == null || b == null) return null;
  const value = matrices?.[key]?.[pairKey(a, b)];
  return typeof value === "number" ? value : null;
}
