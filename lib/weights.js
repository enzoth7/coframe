// Pesos del cálculo de compatibilidad. Se guardan en la tabla settings del SQLite y se cambian desde Ajustes.
// Los pesos son relativos: el motor los normaliza para que sumen 100%.

export const FACTORS = [
  { key: "archetype", label: "Arquetipo", help: "Qué tan afines son los arquetipos de las dos marcas." },
  { key: "values", label: "Valores", help: "Si las dos marcas defienden valores que se refuerzan o que chocan (círculo de Schwartz)." },
  { key: "motivators", label: "Motivadores", help: "Si sus públicos se mueven por lo mismo o por motivos que se complementan." },
  { key: "ages", label: "Edades del público", help: "Cuántos rangos de edad comparten." },
  { key: "category", label: "Rubros", help: "Si sus rubros se complementan (suma más) o son el mismo (suma menos)." },
  { key: "client", label: "Tipo de cliente", help: "Si las dos venden a personas, a empresas o a ambos." },
  { key: "scope", label: "Alcance", help: "Si las dos operan a la misma escala: local, nacional o internacional." },
  { key: "nse", label: "Nivel socioeconómico", help: "Qué tan cerca están los niveles socioeconómicos de sus públicos." },
  { key: "followers", label: "Seguidores en IG", help: "Si tienen un alcance parecido en Instagram (según la matriz de seguidores)." },
  { key: "revenue", label: "Facturación", help: "Si tienen una escala de negocio parecida (según la matriz de facturación)." },
  { key: "segment", label: "Segmento", help: "Qué tan parecidos son los clientes a los que les venden (según la matriz de segmentos)." },
  { key: "cultural_code", label: "Código cultural", help: "Si sus ambientes culturales conviven bien (según la matriz de códigos culturales)." },
];

export const DEFAULT_SETTINGS = {
  weights: { archetype: 30, values: 30, motivators: 20, ages: 18, category: 16, client: 8, scope: 5, nse: 3, followers: 5, revenue: 5, segment: 8, cultural_code: 8 },
  locationBonus: { sameCity: 10, uruguay: 4 },
};

const clampNumber = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

// Completa y limpia lo que venga de la base o del formulario.
export function normalizeSettings(input = {}) {
  const weights = Object.fromEntries(FACTORS.map(({ key }) => [key, clampNumber(input.weights?.[key], 0, 100, DEFAULT_SETTINGS.weights[key])]));
  if (!Object.values(weights).some((value) => value > 0)) Object.assign(weights, DEFAULT_SETTINGS.weights);
  return {
    weights,
    locationBonus: {
      sameCity: clampNumber(input.locationBonus?.sameCity, 0, 30, DEFAULT_SETTINGS.locationBonus.sameCity),
      uruguay: clampNumber(input.locationBonus?.uruguay, 0, 30, DEFAULT_SETTINGS.locationBonus.uruguay),
    },
  };
}

// Pesos como fracción (suman 1) para el motor.
export function weightShares(settings) {
  const { weights } = normalizeSettings(settings);
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  return Object.fromEntries(Object.entries(weights).map(([key, value]) => [key, value / total]));
}
