// Valores de marca según la teoría de valores humanos básicos de Shalom Schwartz.
// Los 10 valores forman un círculo: los vecinos se refuerzan y los opuestos chocan
// (por ejemplo Poder contra Universalismo, o Tradición contra Estimulación).
// El orden de esta lista ES el orden del círculo.

export const SCHWARTZ_VALUES = [
  { value: "Poder", help: "Estatus social, prestigio y control sobre personas o recursos." },
  { value: "Logro", help: "Éxito personal demostrando capacidad y resultados." },
  { value: "Hedonismo", help: "Placer y disfrute de la vida." },
  { value: "Estimulación", help: "Novedad, emoción y desafíos; una vida variada." },
  { value: "Autodirección", help: "Pensar y elegir por cuenta propia: libertad, creatividad, curiosidad." },
  { value: "Universalismo", help: "Cuidado de todas las personas y de la naturaleza: sustentabilidad, igualdad, causas sociales." },
  { value: "Benevolencia", help: "Cuidar a los cercanos: familia, amigos, comunidad." },
  { value: "Tradición", help: "Respeto por las costumbres, la historia y lo heredado." },
  { value: "Conformidad", help: "Respetar normas y expectativas; no desentonar." },
  { value: "Seguridad", help: "Estabilidad, orden y protección para uno y los suyos." },
];

export const VALUE_NAMES = SCHWARTZ_VALUES.map((item) => item.value);

// Compatibilidad según la distancia en el círculo: 0 = mismo valor, 5 = opuesto.
const BY_DISTANCE = [1, 0.8, 0.6, 0.4, 0.25, 0.1];

export function valueAffinity(a, b) {
  const i = VALUE_NAMES.indexOf(a);
  const j = VALUE_NAMES.indexOf(b);
  if (i < 0 || j < 0) return null;
  const raw = Math.abs(i - j);
  return BY_DISTANCE[Math.min(raw, VALUE_NAMES.length - raw)];
}

// Encaje entre dos conjuntos de valores: para cada valor de una marca, el mejor encaje con los de la otra;
// se promedia en ambos sentidos. Sin datos de alguna de las dos, neutro (0,5).
export function valuesFit(first = [], second = [], affinity = valueAffinity) {
  if (!first.length || !second.length) return 0.5;
  const side = (from, to) => from.reduce((sum, a) => sum + Math.max(...to.map((b) => affinity(a, b) ?? 0.5)), 0) / from.length;
  return (side(first, second) + side(second, first)) / 2;
}

// --- Estimación inicial (después se corrige a mano en la Base de datos) ---

const FROM_ARCHETYPE = {
  Gobernante: ["Poder", "Logro"], Héroe: ["Logro", "Estimulación"], Explorador: ["Autodirección", "Estimulación"],
  Forajido: ["Estimulación", "Autodirección"], Mago: ["Autodirección", "Logro"], Creador: ["Autodirección", "Universalismo"],
  Sabio: ["Autodirección", "Universalismo"], Inocente: ["Seguridad", "Benevolencia"], Cuidador: ["Benevolencia", "Seguridad"],
  Ciudadano: ["Benevolencia", "Conformidad"], Amante: ["Hedonismo", "Logro"], Bufón: ["Hedonismo", "Estimulación"],
};

const FROM_MOTIVATOR = {
  Seguridad: "Seguridad", Pertenencia: "Benevolencia", Control: "Seguridad", Placer: "Hedonismo", Estatus: "Logro",
  Poder: "Poder", Trascendencia: "Universalismo", Exploración: "Estimulación", Libertad: "Autodirección", Familia: "Benevolencia",
};

const FROM_CULTURAL_CODE = {
  "Tradicional / Institucional": "Tradición", "Aspiracional Ostentoso": "Poder", "Aspiracional Silencioso": "Logro",
  "Creativo / Indie / Alternativo": "Autodirección", "Underground / Subcultural": "Estimulación", "Urbano / Street / Vibrante": "Estimulación",
  "Relajado / Casual": "Hedonismo", "Mainstream / Popular": "Conformidad", "Bienestar / Vida sana": "Seguridad", "Tech / Futurista": "Estimulación",
};

// Vota con arquetipo (3 y 2 puntos), motivadores (2 cada uno) y código cultural (1); quedan los 2 más votados.
export function estimateValues({ archetype, motivators = [], culturalCode }) {
  const votes = Object.fromEntries(VALUE_NAMES.map((name) => [name, 0]));
  const [first, second] = FROM_ARCHETYPE[archetype] || [];
  if (first) votes[first] += 3;
  if (second) votes[second] += 2;
  for (const motivator of motivators) if (FROM_MOTIVATOR[motivator]) votes[FROM_MOTIVATOR[motivator]] += 2;
  if (FROM_CULTURAL_CODE[culturalCode]) votes[FROM_CULTURAL_CODE[culturalCode]] += 1;
  return VALUE_NAMES.filter((name) => votes[name] > 0).sort((a, b) => votes[b] - votes[a] || VALUE_NAMES.indexOf(a) - VALUE_NAMES.indexOf(b)).slice(0, 2);
}

// Los 6 sponsors de Polarist Club, estimados a mano a partir de su comunicación pública.
export const SPONSOR_VALUES = {
  MateArte: ["Tradición", "Benevolencia"],
  Robles: ["Seguridad", "Benevolencia"],
  Piccoletto: ["Tradición", "Benevolencia"],
  Salus: ["Universalismo", "Seguridad"],
  "Mamba Negra": ["Logro", "Poder"],
  Cabesas: ["Hedonismo", "Autodirección"],
};
