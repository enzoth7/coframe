// Escala de compatibilidad del panel: verde, amarillo, naranja y rojo.
export const BANDS = [
  { key: "alta", label: "Alta", min: 80, range: "80 o más" },
  { key: "media", label: "Media", min: 70, range: "70 a 79" },
  { key: "baja", label: "Baja", min: 60, range: "60 a 69" },
  { key: "muy-baja", label: "Muy baja", min: 0, range: "Menos de 60" },
];

export function bandFor(score) {
  return BANDS.find((band) => score >= band.min) || BANDS.at(-1);
}
