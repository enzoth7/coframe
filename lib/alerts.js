// Alertas de riesgo entre dos marcas. Van aparte del puntaje: una dupla puede dar alta y aun así
// tener un riesgo que conviene mirar antes de juntarlas en un evento o una pieza.

import { FOLLOWER_ORDER, REVENUE_ORDER } from "./scales.js";

const normalize = (value = "") => String(value).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const SCALE_LABELS = ["Micro", "Pequeña", "Mediana", "Grande", "Muy grande"];

// Escala de 1 a 5 combinando seguidores en Instagram y facturación (lo que haya cargado).
export function brandScale(brand) {
  const parts = [];
  const followers = FOLLOWER_ORDER.indexOf(brand.followersBucket);
  const revenue = REVENUE_ORDER.indexOf(brand.revenueRange);
  if (followers >= 0) parts.push(followers / (FOLLOWER_ORDER.length - 1));
  if (revenue >= 0) parts.push(revenue / (REVENUE_ORDER.length - 1));
  if (!parts.length) return null;
  const share = parts.reduce((sum, value) => sum + value, 0) / parts.length;
  return Math.min(5, Math.max(1, Math.round(share * 4) + 1));
}

const NSE_ORDER = ["Bajo", "Medio-Bajo", "Medio", "Medio-Alto", "Alto", "Élite"];

export function pairAlerts(a, b) {
  const alerts = [];
  // Competencia directa: mismo subrubro (lista cerrada). Mismo rubro con distinto subrubro: solo aviso.
  const sameSubcategory = a.subcategory && normalize(a.subcategory) === normalize(b.subcategory) && a.subcategory !== "Otro";
  const sameCategory = a.category && a.category === b.category;
  if (sameSubcategory) {
    alerts.push({ key: "competition", level: "alta", title: "Competencia directa", text: `Las dos están en el mismo subrubro: ${a.subcategory}.` });
  } else if (sameCategory) {
    alerts.push({ key: "same-category", level: "media", title: "Mismo rubro", text: `Las dos son de ${a.category}, en subrubros distintos (${a.subcategory} y ${b.subcategory}). No compiten de frente, pero conviene que no se pisen en la comunicación.` });
  }

  const scaleA = brandScale(a);
  const scaleB = brandScale(b);
  if (scaleA && scaleB && Math.abs(scaleA - scaleB) >= 3) {
    const [big, small] = scaleA > scaleB ? [a, b] : [b, a];
    alerts.push({ key: "scale", level: "media", title: "Escala muy despareja", text: `${big.name} (${SCALE_LABELS[Math.max(scaleA, scaleB) - 1]}) puede tapar a ${small.name} (${SCALE_LABELS[Math.min(scaleA, scaleB) - 1]}). Pensá cómo darle protagonismo a la más chica.` });
  }

  const nseA = NSE_ORDER.indexOf(a.nse);
  const nseB = NSE_ORDER.indexOf(b.nse);
  const priceClash = (a.segment === "Sensible al precio" && ["Aspiracional / Status-seeker"].includes(b.segment))
    || (b.segment === "Sensible al precio" && ["Aspiracional / Status-seeker"].includes(a.segment));
  if ((nseA >= 0 && nseB >= 0 && Math.abs(nseA - nseB) >= 3) || priceClash) {
    alerts.push({ key: "positioning", level: "media", title: "Posicionamiento opuesto", text: `Le hablan a públicos de poder adquisitivo muy distinto (${a.nse || a.segment} y ${b.nse || b.segment}). Juntas pueden restarse credibilidad.` });
  }
  return alerts;
}
