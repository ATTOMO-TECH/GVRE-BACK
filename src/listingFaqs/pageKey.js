// Página de listado a la que pertenece una FAQ.
//
// Cada FAQ cuelga de una página de listado de la web, identificada por:
//   departamento + ciudad + barrio (opcional) + operación
//
//   /residencial/madrid/inmuebles/la-moraleja/venta
//     → { department: "residencial", city: "madrid", zone: "la-moraleja", operation: "venta" }
//   /otros-activos-y-zonas/inmuebles/alquiler
//     → { department: "otros-activos-y-zonas", city: null, zone: null, operation: "alquiler" }
//   /residencial/madrid/inmuebles/la-moraleja  (venta y alquiler a la vez, o sin elegir)
//     → { department: "residencial", city: "madrid", zone: "la-moraleja", operation: "todas" }
//
// Los valores son los mismos segmentos que aparecen en la URL de la web. El
// barrio es el `slug` de la zona. Hay barrios con el mismo nombre en
// Residencial y en Patrimonio (El Viso, Almagro...), por eso el departamento
// forma parte de la clave.

// "todas": la página sin operación en la URL, la que se ve con venta y
// alquiler marcados a la vez (o sin ninguno)
const ALL_OPERATIONS = "todas";
const OPERATIONS = ["venta", "alquiler", ALL_OPERATIONS];

// Ciudades con listado propio en cada departamento. "Otros activos & zonas"
// no tiene ciudades ni barrios: solo venta y alquiler.
const CITIES_BY_DEPARTMENT = {
  residencial: ["madrid", "marbella", "sotogrande", "puerto-de-santa-maria"],
  patrimonio: ["madrid"],
  "otros-activos-y-zonas": [],
};

const DEPARTMENTS = Object.keys(CITIES_BY_DEPARTMENT);

class ListingFaqInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "ListingFaqInputError";
  }
}

const normalize = (value) =>
  typeof value === "string" && value.trim() !== ""
    ? value.trim().toLowerCase()
    : null;

// Valida y normaliza la página a partir de lo que llega en la petición
// (query o body). Lanza `ListingFaqInputError` si la combinación no existe.
const parsePageKey = (input = {}) => {
  const department = normalize(input.department);
  const city = normalize(input.city);
  const zone = normalize(input.zone);
  const operation = normalize(input.operation);

  if (!DEPARTMENTS.includes(department)) {
    throw new ListingFaqInputError(
      `Departamento no válido. Valores posibles: ${DEPARTMENTS.join(", ")}`,
    );
  }
  if (!OPERATIONS.includes(operation)) {
    throw new ListingFaqInputError(
      `Operación no válida. Valores posibles: ${OPERATIONS.join(", ")}`,
    );
  }

  const cities = CITIES_BY_DEPARTMENT[department];

  if (cities.length === 0) {
    if (city || zone) {
      throw new ListingFaqInputError(
        "Este departamento no tiene ciudades ni barrios",
      );
    }
    return { department, city: null, zone: null, operation };
  }

  if (!cities.includes(city)) {
    throw new ListingFaqInputError(
      `Ciudad no válida para ${department}. Valores posibles: ${cities.join(", ")}`,
    );
  }

  return { department, city, zone, operation };
};

// Pregunta y respuesta: texto plano y obligatorio.
const parseFaqContent = (input = {}) => {
  const question =
    typeof input.question === "string" ? input.question.trim() : "";
  const answer = typeof input.answer === "string" ? input.answer.trim() : "";

  if (!question || !answer) {
    throw new ListingFaqInputError("La pregunta y la respuesta son obligatorias");
  }

  return { question, answer };
};

// Filtro de Mongo para todas las FAQs de una página
const toPageFilter = ({ department, city, zone, operation }) => ({
  department,
  city,
  zone,
  operation,
});

module.exports = {
  ALL_OPERATIONS,
  OPERATIONS,
  DEPARTMENTS,
  CITIES_BY_DEPARTMENT,
  ListingFaqInputError,
  parsePageKey,
  parseFaqContent,
  toPageFilter,
};
