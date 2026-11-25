import data from "./coframe-data.js";
import { CULTURAL_CODES, SEGMENTS } from "./taxonomies.js";
import { VALUE_NAMES } from "./values.js";
import { SUBCATEGORY_NAMES } from "./subcategories.js";
import { FOLLOWER_BUCKETS, REVENUE_BUCKETS } from "./scales.js";

// Columnas editables de la tabla `brands`. Compartido entre servidor (validación) y cliente (tabla).
// type: text | select | multi | bool. `base` son opciones fijas; el servidor suma los valores que ya existen.
export const BRAND_COLUMNS = [
  { key: "name", label: "Marca", type: "text", width: 210, required: true },
  { key: "active", label: "Activa", type: "bool", width: 84 },
  { key: "category", label: "Rubro", type: "select", width: 150, required: true, base: data.categories },
  { key: "subcategory", label: "Subrubro", type: "select", width: 200, base: SUBCATEGORY_NAMES, parentKey: "category" },
  { key: "archetype", label: "Arquetipo", type: "select", width: 140, required: true, base: Object.keys(data.archetypes) },
  { key: "motivators", label: "Motivadores", type: "multi", width: 230, base: data.motivators },
  { key: "brand_values", label: "Valores", type: "multi", width: 220, base: VALUE_NAMES },
  { key: "ages", label: "Edades", type: "multi", width: 190, base: data.ages },
  { key: "nse", label: "NSE", type: "select", width: 160, base: data.nse },
  { key: "client_type", label: "Cliente", type: "select", width: 120, required: true, base: data.clientTypes.map((item) => item.value) },
  { key: "scope", label: "Alcance", type: "select", width: 140, required: true, base: data.scopes.map((item) => item.value) },
  { key: "city", label: "Ciudad", type: "text", width: 140, required: true },
  { key: "country_code", label: "País", type: "text", width: 76, required: true },
  { key: "source", label: "Fuente", type: "select", width: 150, required: true, base: ["bd_v3", "international_global", "international_latam"] },
  { key: "website", label: "Web", type: "text", width: 220 },
  { key: "instagram", label: "Instagram", type: "text", width: 160 },
  { key: "followers_bucket", label: "Seguidores IG", type: "select", width: 170, base: FOLLOWER_BUCKETS.map((item) => item.value) },
  { key: "engagement_rate", label: "Engagement %", type: "text", width: 120 },
  { key: "company_type", label: "Tipo empresa", type: "select", width: 140 },
  { key: "company_size", label: "Empleados", type: "select", width: 120 },
  { key: "budget_range", label: "Presupuesto USD", type: "select", width: 150, base: data.budgets.map((item) => item.value) },
  { key: "revenue_range", label: "Facturación USD", type: "select", width: 190, base: REVENUE_BUCKETS.map((item) => item.value) },
  { key: "customer_style", label: "Estilo de cliente", type: "select", width: 160 },
  { key: "segment", label: "Segmento", type: "select", width: 210, base: SEGMENTS.map((item) => item.value) },
  { key: "core_audience", label: "Núcleo de público", type: "select", width: 200 },
  { key: "cultural_code", label: "Código cultural", type: "select", width: 220, base: CULTURAL_CODES.map((item) => item.value) },
  { key: "matrix_brand", label: "Marca matriz", type: "text", width: 160 },
  { key: "public_source_url", label: "Fuente pública", type: "text", width: 220 },
];

export const SOURCE_LABELS = { bd_v3: "Uruguay", international_global: "Global", international_latam: "Latinoamérica" };

export const columnByKey = Object.fromEntries(BRAND_COLUMNS.map((column) => [column.key, column]));

// Valores que el motor no reconoce (por ejemplo "Heroe" sin tilde): se marcan en la tabla.
// Columnas con lista cerrada: un valor fuera de la lista se marca para revisar.
const SCORED_KEYS = new Set(["category", "subcategory", "archetype", "motivators", "brand_values", "ages", "nse", "scope", "segment", "cultural_code", "followers_bucket", "revenue_range"]);

export function isUnknownValue(column, value, list = column.base) {
  if (!SCORED_KEYS.has(column.key) || !list) return false;
  const values = Array.isArray(value) ? value : [value];
  return values.some((item) => item && !list.includes(item));
}
