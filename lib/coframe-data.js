const coframeData = (() => {
  const categories = [
    "Alimentos",
    "Automotriz",
    "Bebidas",
    "Educación",
    "Entretenimiento",
    "Finanzas",
    "Hogar",
    "Moda",
    "Retail",
    "Salud",
    "Servicios",
    "Tecnología",
    "Telecomunicaciones",
    "Transporte",
    "Turismo",
    "Otro"
  ];

  const ages = ["13–17", "18–24", "25–34", "35–44", "45–54", "55+"];
  const nse = ["Bajo", "Medio-Bajo", "Medio", "Medio-Alto", "Alto", "Élite", "Amplio / transversal"];
  const motivators = [
    "Seguridad",
    "Pertenencia",
    "Control",
    "Placer",
    "Estatus",
    "Poder",
    "Trascendencia",
    "Exploración",
    "Libertad",
    "Familia"
  ];

  const scopes = [
    { value: "Local", label: "Local", help: "Una ciudad o zona" },
    { value: "Nacional", label: "Nacional", help: "Todo el país" },
    { value: "Multinacional", label: "Internacional", help: "Más de un país" }
  ];

  const clientTypes = [
    { value: "B2C", label: "Personas", help: "Venta al público" },
    { value: "B2B", label: "Empresas", help: "Venta a organizaciones" },
    { value: "B2B, B2C", label: "Ambos", help: "Personas y empresas" }
  ];

  const tones = [
    { value: "Formal", label: "Formal", help: "Precisa y profesional" },
    { value: "Cercano", label: "Cercano", help: "Humana y simple" },
    { value: "Divertido", label: "Divertido", help: "Ligera y espontánea" },
    { value: "Aspiracional", label: "Aspiracional", help: "Deseable y elevada" },
    { value: "Provocador", label: "Provocador", help: "Directa y desafiante" },
    { value: "Creativo", label: "Creativo", help: "Original y expresiva" }
  ];

  const objectives = [
    { value: "Vender más", label: "Vender más", help: "Generar demanda y conversión" },
    { value: "Que más gente nos conozca", label: "Ganar visibilidad", help: "Llegar a nuevas audiencias" },
    { value: "Más interacción en redes", label: "Crear comunidad", help: "Lograr participación y vínculo" },
    { value: "Lanzar algo nuevo", label: "Lanzar algo nuevo", help: "Presentar un producto o proyecto" },
    { value: "Mejorar la imagen", label: "Elevar la imagen", help: "Reposicionar la percepción" },
    { value: "Encontrar alianzas", label: "Encontrar alianzas", help: "Crear valor con otras marcas" }
  ];

  const budgets = [
    { value: "< 1k", label: "Pequeña", help: "Acciones simples o locales" },
    { value: "1 – 2k", label: "Media", help: "Campaña o activación acotada" },
    { value: "2 – 5k", label: "Media-alta", help: "Producción y difusión compartida" },
    { value: "5 – 10k", label: "Grande", help: "Campaña de mayor alcance" },
    { value: "10k+", label: "Estratégica", help: "Proyecto amplio o sostenido" },
    { value: "Flexible", label: "Todavía no sé", help: "Depende de la oportunidad" }
  ];

  const personalityOptions = [
    { archetype: "Gobernante", title: "Liderar con criterio", help: "Orden, control y excelencia" },
    { archetype: "Creador", title: "Crear algo original", help: "Expresión, visión e innovación" },
    { archetype: "Inocente", title: "Hacer la vida más simple", help: "Optimismo, claridad y confianza" },
    { archetype: "Sabio", title: "Ayudar a comprender", help: "Conocimiento, verdad y precisión" },
    { archetype: "Explorador", title: "Abrir nuevos caminos", help: "Libertad, experiencia y descubrimiento" },
    { archetype: "Forajido", title: "Cambiar las reglas", help: "Rebeldía, ruptura y transformación" },
    { archetype: "Mago", title: "Hacer posible lo inesperado", help: "Transformación, visión y asombro" },
    { archetype: "Héroe", title: "Superar un desafío", help: "Esfuerzo, valentía y resultados" },
    { archetype: "Amante", title: "Crear deseo y conexión", help: "Belleza, placer e intimidad" },
    { archetype: "Bufón", title: "Disfrutar el momento", help: "Humor, espontaneidad y energía" },
    { archetype: "Ciudadano", title: "Hacer sentir parte", help: "Cercanía, pertenencia y vida real" },
    { archetype: "Cuidador", title: "Proteger y acompañar", help: "Servicio, seguridad y empatía" }
  ];

  const archetypes = {
    Gobernante: {
      label: "La Gobernante",
      promise: "Convertir la ambición en orden, estándar y liderazgo.",
      description: "Tu marca busca transmitir control, confianza y una forma clara de hacer las cosas bien.",
      strength: "Autoridad confiable",
      risk: "Parecer distante o rígida",
      codes: ["Tradicional / Institucional", "Aspiracional Silencioso"]
    },
    Creador: {
      label: "La Creadora",
      promise: "Dar forma a ideas originales que expresan una visión propia.",
      description: "Tu marca se reconoce por su mirada, su sensibilidad y la necesidad de construir algo distinto.",
      strength: "Originalidad con intención",
      risk: "Priorizar la idea sobre la claridad",
      codes: ["Creativo / Indie / Alternativo", "Innovador / Early adopter"]
    },
    Inocente: {
      label: "La Inocente",
      promise: "Hacer que lo cotidiano se sienta simple, confiable y positivo.",
      description: "Tu marca reduce fricción y transmite optimismo sin necesidad de complicar el mensaje.",
      strength: "Confianza inmediata",
      risk: "Parecer ingenua o genérica",
      codes: ["Relajado / Casual", "Mainstream / Popular"]
    },
    Sabio: {
      label: "La Sabia",
      promise: "Entender mejor para decidir mejor.",
      description: "Tu marca gana valor cuando ordena información, explica y ayuda a elegir con criterio.",
      strength: "Claridad y conocimiento",
      risk: "Volverse demasiado técnica",
      codes: ["Funcional / Necesidad", "Tradicional / Institucional"]
    },
    Explorador: {
      label: "La Exploradora",
      promise: "Abrir posibilidades para vivir con más libertad.",
      description: "Tu marca propone movimiento, experiencias y una identidad que no quiere quedarse quieta.",
      strength: "Inspirar descubrimiento",
      risk: "Dispersarse o evitar compromisos",
      codes: ["Lifestyle / Experiencias", "Urbano / Street / Vibrante"]
    },
    Forajido: {
      label: "La Forajida",
      promise: "Cuestionar lo establecido para impulsar un cambio real.",
      description: "Tu marca encuentra energía en la tensión, la irreverencia y la voluntad de hacer las cosas de otra manera.",
      strength: "Diferenciación valiente",
      risk: "Provocar sin propósito",
      codes: ["Underground / Subcultural", "Urbano / Street / Vibrante"]
    },
    Mago: {
      label: "La Maga",
      promise: "Transformar una situación y revelar una nueva posibilidad.",
      description: "Tu marca conecta ideas, tecnología o experiencias para producir una sensación de cambio.",
      strength: "Transformación memorable",
      risk: "Prometer más de lo demostrable",
      codes: ["Innovador / Early adopter", "Creativo / Indie / Alternativo"]
    },
    "Héroe": {
      label: "La Heroína",
      promise: "Demostrar que el esfuerzo puede superar cualquier límite.",
      description: "Tu marca activa, desafía y celebra el progreso, la disciplina y los resultados visibles.",
      strength: "Motivación y desempeño",
      risk: "Convertir todo en competencia",
      codes: ["Aspiracional Ostentoso", "Lifestyle / Experiencias"]
    },
    Amante: {
      label: "La Amante",
      promise: "Hacer que las personas se sientan elegidas, conectadas y deseadas.",
      description: "Tu marca trabaja desde la estética, el vínculo, el placer y la intensidad de la experiencia.",
      strength: "Deseo y conexión emocional",
      risk: "Depender demasiado de la apariencia",
      codes: ["Aspiracional Silencioso", "Lifestyle / Experiencias"]
    },
    "Bufón": {
      label: "La Bufona",
      promise: "Recordar que la vida también está para disfrutarla.",
      description: "Tu marca conecta mediante humor, frescura y una energía que reduce la distancia con la gente.",
      strength: "Cercanía espontánea",
      risk: "No ser tomada en serio",
      codes: ["Relajado / Casual", "Urbano / Street / Vibrante"]
    },
    Ciudadano: {
      label: "La Ciudadana",
      promise: "Crear un lugar donde cualquiera pueda sentirse parte.",
      description: "Tu marca se apoya en la empatía, la familiaridad y una propuesta accesible para la vida real.",
      strength: "Pertenencia genuina",
      risk: "Perder diferenciación",
      codes: ["Mainstream / Popular", "Price-sensitive"]
    },
    Cuidador: {
      label: "La Cuidadora",
      promise: "Acompañar y proteger para que otros estén mejor.",
      description: "Tu marca transmite servicio, contención y responsabilidad con las personas que elige cuidar.",
      strength: "Confianza y empatía",
      risk: "Olvidar su propio valor",
      codes: ["Tradicional / Institucional", "Funcional / Necesidad"]
    }
  };

  const toneArchetypes = {
    Formal: ["Gobernante", "Sabio"],
    Cercano: ["Cuidador", "Ciudadano"],
    Divertido: ["Bufón", "Inocente"],
    Aspiracional: ["Amante", "Gobernante"],
    Provocador: ["Forajido", "Explorador"],
    Creativo: ["Creador", "Mago"]
  };

  const motivatorArchetypes = {
    Seguridad: ["Cuidador", "Inocente"],
    Pertenencia: ["Ciudadano", "Cuidador"],
    Control: ["Gobernante", "Sabio"],
    Placer: ["Amante", "Bufón"],
    Estatus: ["Héroe", "Gobernante"],
    Poder: ["Gobernante", "Forajido"],
    Trascendencia: ["Mago", "Sabio"],
    Exploración: ["Explorador", "Creador"],
    Libertad: ["Explorador", "Forajido"],
    Familia: ["Cuidador", "Ciudadano"]
  };

  const objectiveArchetypes = {
    "Vender más": ["Gobernante", "Amante"],
    "Que más gente nos conozca": ["Explorador", "Bufón"],
    "Más interacción en redes": ["Ciudadano", "Bufón"],
    "Lanzar algo nuevo": ["Creador", "Mago"],
    "Mejorar la imagen": ["Amante", "Gobernante"],
    "Encontrar alianzas": ["Ciudadano", "Creador"]
  };

  const archetypePairs = [
    ["Gobernante", "Sabio", 0.9], ["Gobernante", "Creador", 0.8], ["Gobernante", "Cuidador", 0.7],
    ["Creador", "Explorador", 0.9], ["Creador", "Mago", 0.9], ["Creador", "Amante", 0.8], ["Creador", "Cuidador", 0.7],
    ["Inocente", "Cuidador", 0.9], ["Inocente", "Ciudadano", 0.8], ["Inocente", "Sabio", 0.7],
    ["Sabio", "Explorador", 0.8], ["Sabio", "Héroe", 0.8], ["Sabio", "Mago", 0.6],
    ["Explorador", "Héroe", 0.8], ["Explorador", "Inocente", 0.7], ["Explorador", "Amante", 0.6],
    ["Forajido", "Mago", 0.7], ["Forajido", "Héroe", 0.7], ["Forajido", "Explorador", 0.6],
    ["Mago", "Héroe", 0.8], ["Mago", "Amante", 0.5],
    ["Héroe", "Ciudadano", 0.6], ["Héroe", "Cuidador", 0.6],
    ["Amante", "Bufón", 0.8], ["Amante", "Ciudadano", 0.7], ["Amante", "Cuidador", 0.8],
    ["Bufón", "Ciudadano", 0.7], ["Bufón", "Mago", 0.6],
    ["Ciudadano", "Cuidador", 0.9]
  ];

  const categoryComplements = {
    Alimentos: ["Bebidas", "Retail", "Entretenimiento", "Turismo"],
    Automotriz: ["Turismo", "Tecnología", "Finanzas", "Servicios"],
    Bebidas: ["Alimentos", "Entretenimiento", "Turismo", "Retail"],
    Educación: ["Tecnología", "Servicios", "Entretenimiento"],
    Entretenimiento: ["Bebidas", "Alimentos", "Tecnología", "Moda", "Turismo"],
    Finanzas: ["Tecnología", "Retail", "Automotriz", "Servicios"],
    Hogar: ["Retail", "Tecnología", "Servicios"],
    Moda: ["Entretenimiento", "Salud", "Bebidas", "Tecnología"],
    Retail: ["Alimentos", "Moda", "Hogar", "Tecnología", "Finanzas"],
    Salud: ["Alimentos", "Tecnología", "Moda", "Servicios"],
    Servicios: ["Tecnología", "Finanzas", "Educación", "Hogar"],
    Tecnología: ["Educación", "Finanzas", "Entretenimiento", "Retail", "Servicios"],
    Telecomunicaciones: ["Tecnología", "Entretenimiento", "Educación"],
    Transporte: ["Turismo", "Automotriz", "Tecnología"],
    Turismo: ["Transporte", "Bebidas", "Alimentos", "Entretenimiento", "Automotriz"],
    Otro: ["Servicios", "Tecnología", "Entretenimiento"]
  };


  return {
    categories,
    ages,
    nse,
    motivators,
    scopes,
    clientTypes,
    tones,
    objectives,
    budgets,
    personalityOptions,
    archetypes,
    toneArchetypes,
    motivatorArchetypes,
    objectiveArchetypes,
    archetypePairs,
    categoryComplements
  };
})();

export default coframeData;
