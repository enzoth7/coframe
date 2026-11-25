// Escalones de seguidores en Instagram y de facturación, pensados para Uruguay.
//
// Facturación: alineada con la clasificación oficial de empresas (Decreto 504/007): micro hasta
// 2.000.000 UI, pequeña hasta 10.000.000 UI y mediana hasta 75.000.000 UI de ventas anuales
// (aprox. USD 335 mil, 1,7 millones y 12,5 millones con la UI a $6,69 y el dólar cerca de 40 pesos).
// Seguidores: escala de marketing de influencers, con el tramo 20 mil–100 mil partido en dos porque
// en Uruguay una cuenta local de más de 50 mil ya es grande.

export const FOLLOWER_BUCKETS = [
  { value: "0 - 1.000", help: "Cuenta chica o recién empezando." },
  { value: "1.001 - 5.000", help: "Comunidad local pequeña." },
  { value: "5.001 - 20.000", help: "Comunidad local consolidada." },
  { value: "20.001 - 50.000", help: "Referente local o regional." },
  { value: "50.001 - 100.000", help: "Cuenta grande para Uruguay." },
  { value: "100.001 - 500.000", help: "Alcance nacional fuerte." },
  { value: "500.001+", help: "Cuenta global o de marca masiva." },
  { value: "Sin cuenta", help: "La marca no tiene Instagram identificable." },
];

export const REVENUE_BUCKETS = [
  { value: "Hasta USD 100.000", tier: "Emprendimiento", help: "Emprendimiento: facturación anual de hasta 100 mil dólares." },
  { value: "USD 100.000 – 350.000", tier: "Micro", help: "Microempresa (tope oficial: 2.000.000 UI, unos 335 mil dólares al año)." },
  { value: "USD 350.000 – 1,7 M", tier: "Pequeña", help: "Pequeña empresa (tope oficial: 10.000.000 UI, unos 1,7 millones de dólares al año)." },
  { value: "USD 1,7 M – 12 M", tier: "Mediana", help: "Mediana empresa (tope oficial: 75.000.000 UI, unos 12,5 millones de dólares al año)." },
  { value: "USD 12 M – 50 M", tier: "Grande nacional", help: "Gran empresa de escala nacional." },
  { value: "USD 50 M – 500 M", tier: "Grande", help: "Gran empresa, líder regional." },
  { value: "Más de USD 500 M", tier: "Multinacional", help: "Multinacional de escala global." },
  { value: "No informado", tier: null, help: "La empresa no publica su facturación." },
];

// Solo los escalones con orden (sin "Sin cuenta" / "No informado").
export const FOLLOWER_ORDER = FOLLOWER_BUCKETS.slice(0, 7).map((item) => item.value);
export const REVENUE_ORDER = REVENUE_BUCKETS.slice(0, 7).map((item) => item.value);

export function followersBucketFor(count) {
  if (count == null) return null;
  if (count <= 1000) return "0 - 1.000";
  if (count <= 5000) return "1.001 - 5.000";
  if (count <= 20000) return "5.001 - 20.000";
  if (count <= 50000) return "20.001 - 50.000";
  if (count <= 100000) return "50.001 - 100.000";
  if (count <= 500000) return "100.001 - 500.000";
  return "500.001+";
}

// Compatibilidad entre dos escalones según la distancia: mismo escalón 1, el más lejano 0,1.
const BY_DISTANCE = [1, 0.85, 0.65, 0.45, 0.3, 0.2, 0.1];
export function scaleAffinity(order) {
  return (a, b) => {
    const i = order.indexOf(a);
    const j = order.indexOf(b);
    if (i < 0 || j < 0) return null;
    return BY_DISTANCE[Math.abs(i - j)];
  };
}

// Escalones viejos ($, sin tramo intermedio) → nuevos. "< $1M" se reparte según empleados y seguidores.
const OLD_REVENUE = {
  "$500M+": "Más de USD 500 M",
  "$100M – $500M": "USD 50 M – 500 M",
  "$50M – $100M": "USD 50 M – 500 M",
  "$10M – $50M": "USD 12 M – 50 M",
  "$5M – $10M": "USD 1,7 M – 12 M",
};

const SMALL_FOLLOWERS = new Set(["", "0 - 1.000", "1.001 - 5.000", "Sin cuenta"]);

export function toRevenueBucket(value, { companySize, followersBucket } = {}) {
  if (REVENUE_ORDER.includes(value) || value === "No informado") return value;
  if (OLD_REVENUE[value]) return OLD_REVENUE[value];
  if (value === "$1M – $5M") return ["001 – 010", "011 – 050"].includes(companySize) ? "USD 350.000 – 1,7 M" : "USD 1,7 M – 12 M";
  if (value === "< $1M") {
    if (companySize === "001 – 010") return SMALL_FOLLOWERS.has(followersBucket || "") ? "Hasta USD 100.000" : "USD 100.000 – 350.000";
    if (companySize && companySize !== "001 – 010") return "USD 350.000 – 1,7 M";
    return "USD 100.000 – 350.000";
  }
  return value || null;
}

// Los sponsors de Polarist Club, estimados a mano.
export const SPONSOR_REVENUE = {
  MateArte: "USD 350.000 – 1,7 M",
  Robles: "USD 100.000 – 350.000",
  Piccoletto: "USD 100.000 – 350.000",
  Cabesas: "USD 350.000 – 1,7 M",
  "Mamba Negra": "USD 350.000 – 1,7 M",
};
