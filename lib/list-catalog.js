import data from "./coframe-data.js";
import { CULTURAL_CODES, SEGMENTS } from "./taxonomies.js";
import { SCHWARTZ_VALUES } from "./values.js";
import { SUBCATEGORIES } from "./subcategories.js";
import { FOLLOWER_BUCKETS, REVENUE_BUCKETS } from "./scales.js";

// Catálogo inicial de las listas de CoframeLab: cada opción de los desplegables con su significado.
// Se copia a la tabla list_options del SQLite la primera vez; después se edita desde la pestaña Listas.
// "scored": la lista entra en el cálculo de compatibilidad, así que sus valores no se pueden renombrar.

const opt = (value, description) => ({ value, description });

export const LIST_CATALOG = [
  {
    key: "category", label: "Rubro", scored: true,
    help: "La categoría del negocio. Los rubros complementarios suman compatibilidad.",
    options: [
      opt("Alimentos", "Comida, gastronomía, panaderías, restaurantes y productos alimenticios."),
      opt("Automotriz", "Autos, motos, concesionarias, repuestos y servicios para vehículos."),
      opt("Bebidas", "Agua, refrescos, cerveza, vinos, destilados y bares centrados en la bebida."),
      opt("Educación", "Colegios, institutos, academias y formación."),
      opt("Entretenimiento", "Ocio, eventos, clubes, música, juegos y vida nocturna."),
      opt("Finanzas", "Bancos, pagos, seguros e inversiones."),
      opt("Hogar", "Muebles, decoración, colchones, electrodomésticos y artículos para la casa."),
      opt("Moda", "Ropa, calzado, accesorios, joyería y marroquinería."),
      opt("Retail", "Supermercados, tiendas multimarca y comercios de consumo general."),
      opt("Salud", "Gimnasios, bienestar, mutualistas, clínicas y cuidado personal."),
      opt("Servicios", "Servicios profesionales: arquitectura, consultoría, barbería, logística, etc."),
      opt("Tecnología", "Software, electrónica, apps y servicios digitales."),
      opt("Telecomunicaciones", "Telefonía, internet y conectividad."),
      opt("Transporte", "Traslado de personas o cargas."),
      opt("Turismo", "Viajes, hoteles, agencias y experiencias de viaje."),
      opt("Otro", "No encaja en ninguno de los rubros anteriores."),
    ],
  },
  {
    key: "subcategory", label: "Subrubro", scored: false, parentLabel: "Rubro",
    help: "Qué vende exactamente la marca dentro de su rubro. Si dos marcas comparten subrubro, son competencia directa.",
    options: SUBCATEGORIES.map((item) => ({ value: item.value, description: item.help, parent: item.category })),
  },
  {
    key: "archetype", label: "Arquetipo", scored: true,
    help: "La personalidad de la marca según los 12 arquetipos de Jung. Es el factor que más pesa.",
    options: Object.entries(data.archetypes).map(([value, item]) => opt(value, `${item.promise} Fortaleza: ${item.strength.toLowerCase()}. Riesgo: ${item.risk.toLowerCase()}.`)),
  },
  {
    key: "motivators", label: "Motivadores", scored: true,
    help: "Lo que mueve al público a elegir la marca. Una marca puede tener varios.",
    options: [
      opt("Seguridad", "Sentirse protegido, tranquilo y sin riesgos."),
      opt("Pertenencia", "Ser parte de un grupo, una comunidad o una identidad compartida."),
      opt("Control", "Orden, previsibilidad y tener todo bajo control."),
      opt("Placer", "Disfrutar, darse un gusto, gozar con los sentidos."),
      opt("Estatus", "Ser reconocido y mostrar logros o posición."),
      opt("Poder", "Influir, dominar y tener la última palabra."),
      opt("Trascendencia", "Dejar una huella, encontrar sentido y propósito."),
      opt("Exploración", "Descubrir lo nuevo y vivir experiencias distintas."),
      opt("Libertad", "Independencia, autonomía y salirse de las reglas."),
      opt("Familia", "Cuidar y compartir con los suyos."),
    ],
  },
  {
    key: "brand_values", label: "Valores", scored: true,
    help: "Los valores que defiende la marca, según la teoría de valores de Schwartz. Los vecinos en el círculo se llevan bien; los opuestos chocan.",
    options: SCHWARTZ_VALUES.map((item) => opt(item.value, item.help)),
  },
  {
    key: "ages", label: "Edades", scored: true,
    help: "Rangos de edad del público. Compartir edades suma compatibilidad.",
    options: data.ages.map((value) => opt(value, `Público de ${value.replace("+", " años o más").replace("–", " a ")}${value.includes("+") ? "" : " años"}.`)),
  },
  {
    key: "nse", label: "Nivel socioeconómico", scored: true,
    help: "El poder adquisitivo principal del público. Cuanto más cerca, más compatibles.",
    options: [
      opt("Bajo", "Ingresos bajos: compra lo esencial y cuida cada peso."),
      opt("Medio-Bajo", "Ingresos ajustados: busca precio, pero se da algunos gustos."),
      opt("Medio", "Clase media: equilibra precio y calidad."),
      opt("Medio-Alto", "Buen poder adquisitivo: paga más por calidad y marca."),
      opt("Alto", "Ingresos altos: prioriza calidad, diseño y exclusividad."),
      opt("Élite", "El segmento más alto: lujo y piezas exclusivas."),
      opt("Amplio / transversal", "Llega a todos los niveles por igual."),
    ],
  },
  {
    key: "client_type", label: "Tipo de cliente", scored: true,
    help: "A quién le vende la marca.",
    options: [
      opt("B2C", "Vende a personas (consumidor final)."),
      opt("B2B", "Vende a empresas u organizaciones."),
      opt("B2B, B2C", "Vende tanto a personas como a empresas."),
    ],
  },
  {
    key: "scope", label: "Alcance", scored: true,
    help: "Hasta dónde llega la marca.",
    options: [
      opt("Local", "Opera en una ciudad o zona."),
      opt("Nacional", "Llega a todo el país."),
      opt("Multinacional", "Opera en más de un país."),
    ],
  },
  {
    key: "tone", label: "Tono", scored: true,
    help: "Cómo habla la marca. Se usa para deducir su personalidad.",
    options: data.tones.map((item) => opt(item.value, `${item.help}.`)),
  },
  {
    key: "objective", label: "Objetivo", scored: true,
    help: "Qué busca hoy la marca con su comunicación. Se usa para deducir su personalidad.",
    options: data.objectives.map((item) => opt(item.value, `${item.help}.`)),
  },
  {
    key: "segment", label: "Segmento", scored: true,
    help: "Describe al cliente: a quién le vende según qué busca y con qué recursos (segmentación psicográfica tipo VALS).",
    options: SEGMENTS.map((item) => opt(item.value, item.help)),
  },
  {
    key: "cultural_code", label: "Código cultural", scored: true,
    help: "Describe a la marca: el ambiente cultural en el que se mueve, los símbolos y valores que su público reconoce. No repite la personalidad, que se mide aparte.",
    options: CULTURAL_CODES.map((item) => opt(item.value, item.help)),
  },
  {
    key: "customer_style", label: "Estilo de cliente", scored: false,
    help: "Cómo se comporta el cliente al comprar, según el modelo DISC.",
    options: [
      opt("Dominancia", "Directo y decidido: quiere resultados rápidos y tener el control."),
      opt("Influencia", "Social y entusiasta: compra por emoción, recomendación y experiencia."),
      opt("Estabilidad", "Tranquilo y leal: busca confianza, constancia y trato cercano."),
      opt("Cumplimiento", "Analítico y cuidadoso: compara, pide datos y decide con criterio."),
    ],
  },
  {
    key: "core_audience", label: "Núcleo de público", scored: false,
    help: "El grupo de personas al que apunta principalmente la marca.",
    options: [
      opt("Público urbano conectado", "Personas de ciudad, activas en redes y al tanto de tendencias."),
      opt("Público familiar y adulto", "Familias y adultos que compran para la casa y los suyos."),
      opt("Jóvenes Independientes", "Jóvenes que ya deciden sus compras: estudiantes y primeros trabajos."),
      opt("Jóvenes en Formación", "Adolescentes y jóvenes que todavía dependen de su familia."),
      opt("Adultos plenos", "Adultos de 35 a 55 años, con poder de compra y estilo definido."),
      opt("Ejecutivos jóvenes", "Profesionales jóvenes con ingresos altos y agenda exigente."),
    ],
  },
  {
    key: "company_type", label: "Tipo de empresa", scored: false,
    help: "La escala de la empresa según dónde opera.",
    options: [
      opt("Local", "Empresa de una ciudad o zona."),
      opt("Nacional", "Empresa con presencia en todo el país."),
      opt("Multinacional", "Empresa con operaciones en varios países."),
    ],
  },
  {
    key: "company_size", label: "Empleados", scored: false,
    help: "Cantidad aproximada de empleados.",
    options: [
      opt("001 – 010", "Microempresa: de 1 a 10 personas."),
      opt("011 – 050", "Pequeña: de 11 a 50 personas."),
      opt("051 – 200", "Mediana: de 51 a 200 personas."),
      opt("201 – 500", "Grande: de 201 a 500 personas."),
      opt("500+", "Muy grande: más de 500 personas."),
    ],
  },
  {
    key: "followers_bucket", label: "Seguidores en Instagram", scored: true,
    help: "Rango de seguidores de la cuenta principal de Instagram, con escalones pensados para Uruguay. Entra en el cálculo con su matriz.",
    options: FOLLOWER_BUCKETS.map((item) => opt(item.value, item.help)),
  },
  {
    key: "budget_range", label: "Presupuesto USD", scored: false,
    help: "Presupuesto aproximado que puede poner en una colaboración o campaña.",
    options: data.budgets.map((item) => opt(item.value, `${item.label}: ${item.help.toLowerCase()}.`)),
  },
  {
    key: "revenue_range", label: "Facturación USD", scored: true,
    help: "Facturación anual aproximada, alineada con la clasificación oficial de empresas de Uruguay (Decreto 504/007). Entra en el cálculo con su matriz.",
    options: REVENUE_BUCKETS.map((item) => opt(item.value, item.help)),
  },
  {
    key: "source", label: "Fuente", scored: false,
    help: "De qué grupo de la base viene la marca.",
    options: [
      opt("bd_v3", "Uruguay: marcas uruguayas, sobre todo de Paysandú y Montevideo."),
      opt("international_global", "Global: marcas internacionales de referencia."),
      opt("international_latam", "Latinoamérica: marcas de la región."),
    ],
  },
];

export const listByKey = Object.fromEntries(LIST_CATALOG.map((list) => [list.key, list]));
