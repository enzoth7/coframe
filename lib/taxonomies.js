// Segmento y código cultural son dos clasificaciones distintas y no comparten valores.
//
// SEGMENTO: a quién le vende la marca según qué busca ese consumidor y con qué recursos.
// Es segmentación psicográfica (en la línea de VALS: innovadores, realizadores, experimentadores,
// pensadores, creyentes, prácticos y sobrevivientes).
//
// CÓDIGO CULTURAL: el ambiente cultural en el que se mueve la marca: la estética, los lugares y la
// actitud que su público reconoce. Las 8 primeras son el mapa original de Coframe (lujo visible,
// lujo discreto, relajado, indie, tradicional, popular, urbano y underground); Bienestar y Tech se
// sumaron para marcas de salud, deporte y tecnología que no entraban en ninguna.

export const SEGMENTS = [
  { value: "Innovador / Early adopter", help: "Prueba primero lo nuevo y adopta tecnología o tendencias antes que el resto." },
  { value: "Aspiracional / Status-seeker", help: "Compra para mostrar logro y posición; valora marcas que lo distinguen." },
  { value: "Lifestyle / Experiencias", help: "Compra vivencias y autoexpresión: salir, viajar, disfrutar, sentirse parte de un estilo." },
  { value: "Convencional / Masivo", help: "El gran público: elige marcas conocidas, confiables y accesibles." },
  { value: "Racional / Informado", help: "Se informa y compara; decide por calidad, datos y criterio." },
  { value: "Funcional / Necesidad", help: "Compra para resolver algo concreto, sin carga emocional." },
  { value: "Sensible al precio", help: "El precio manda: busca ofertas y la opción más económica." },
  { value: "Práctico / Conveniencia", help: "Prioriza rapidez y comodidad: cerca, fácil y sin vueltas." },
];

export const CULTURAL_CODES = [
  { value: "Aspiracional Ostentoso", help: "Lujo visible, estética premium explícita, mostrar estatus. Golf, boliches top, moda premium con brillo." },
  { value: "Aspiracional Silencioso", help: "Lujo discreto, diseño minimalista, elegancia sin ostentar. Moda de diseño, cafés estéticos, marcas \"fine & quiet\"." },
  { value: "Relajado / Casual", help: "Ambiente cómodo, cero formalidad, energía chill. Cervecerías, bares chill, carritos ricos, cafés informales." },
  { value: "Creativo / Indie / Alternativo", help: "Artístico, cultural, estética única, anti-mainstream. Cafés indie, tiendas de diseño independiente, espacios culturales." },
  { value: "Tradicional / Institucional", help: "Histórico, serio, formal, conservador. Clubes sociales, instituciones, restaurantes clásicos." },
  { value: "Mainstream / Popular", help: "Accesible para todos, estética estándar, masivo. Cadenas, supermercados, restaurantes familiares, fast food." },
  { value: "Urbano / Street / Vibrante", help: "Estética callejera, joven, fuerte, con actitud. Streetwear, barberías urbanas, tiendas jóvenes estilo trap." },
  { value: "Underground / Subcultural", help: "Oscuro, de nicho, contracultural. Estudios de tatuaje, bares alternativos, escenas punk y techno." },
  { value: "Bienestar / Vida sana", help: "Salud, deporte, naturaleza y vida al aire libre. Gimnasios, mutualistas, marcas outdoor y de comida saludable." },
  { value: "Tech / Futurista", help: "Digital, innovación y futuro. Apps, fintech, electrónica y marcas tecnológicas." },
];

const OLD_SEGMENTS = {
  "Mainstream / Popular": "Convencional / Masivo",
  "Price-sensitive": "Sensible al precio",
  "Convenience-first": "Práctico / Conveniencia",
  "Funcional / Conocimiento": "Racional / Informado",
};

// Traducción de cualquier código viejo (planilla BD_V3 y las dos listas intermedias) a los 10 actuales.
// Algunos dependen del rubro porque el código viejo mezclaba territorios distintos.
function oldCulturalCode(value, category) {
  const tech = category === "Tecnología";
  const health = category === "Salud";
  switch (value) {
    case "Mainstream / Optimista":
    case "Pertenencia popular":
    case "Alegría y optimismo":
    case "Popular y cercano":
      return "Mainstream / Popular";
    case "Relajo y cotidianidad":
    case "Lifestyle / Experiencias":
    case "Aventura y libertad":
      return health ? "Bienestar / Vida sana" : "Relajado / Casual";
    case "Lujo silencioso":
    case "Lujo y distinción":
    case "Aspiracional / Placer":
    case "Placer y sensualidad":
      return "Aspiracional Silencioso";
    case "Éxito y ostentación":
      return "Aspiracional Ostentoso";
    case "Aspiracional / Rendimiento":
    case "Superación y rendimiento":
      return ["Automotriz", "Finanzas"].includes(category) ? "Aspiracional Ostentoso" : "Bienestar / Vida sana";
    case "Tradición y arraigo":
    case "Saber y expertise":
    case "Funcional / Conocimiento":
      return tech ? "Tech / Futurista" : "Tradicional / Institucional";
    case "Tradicional / Cuidado":
    case "Cuidado y bienestar":
      return health ? "Bienestar / Vida sana" : "Tradicional / Institucional";
    case "Creatividad y autenticidad":
    case "Artesanal e independiente":
      return tech ? "Tech / Futurista" : "Creativo / Indie / Alternativo";
    case "Innovador / Early adopter":
    case "Progreso y tecnología":
    case "Innovación y tecnología":
      return "Tech / Futurista";
    case "Calle y contracultura":
    case "Urbano y contracultural":
      return "Urbano / Street / Vibrante";
    case "Bienestar y vida sana":
      return "Bienestar / Vida sana";
    default:
      return null;
  }
}

export function toSegment(value) {
  return OLD_SEGMENTS[value] || value;
}

export function toCulturalCode(value, archetype, category) {
  return oldCulturalCode(value, category) || value;
}
