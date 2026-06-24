import { ClassificationResult } from "./AiProvider";

const OTHER_CATEGORY = "Other";

const CATEGORY_ALIASES = new Map<string, string>([
  ["food", "Food"],
  ["comida", "Food"],
  ["alimentacion", "Food"],
  ["alimentos", "Food"],
  ["restaurant", "Food"],
  ["restaurante", "Food"],
  ["transportation", "Transportation"],
  ["transport", "Transportation"],
  ["transporte", "Transportation"],
  ["movilidad", "Transportation"],
  ["pasajes", "Transportation"],
  ["housing", "Housing"],
  ["vivienda", "Housing"],
  ["alquiler", "Housing"],
  ["utilities", "Utilities"],
  ["servicios", "Utilities"],
  ["servicios basicos", "Utilities"],
  ["health", "Health"],
  ["salud", "Health"],
  ["entertainment", "Entertainment"],
  ["entretenimiento", "Entertainment"],
  ["ocio", "Entertainment"],
  ["shopping", "Shopping"],
  ["compras", "Shopping"],
  ["ropa", "Shopping"],
  ["subscriptions", "Subscriptions"],
  ["suscripciones", "Subscriptions"],
  ["subscripciones", "Subscriptions"],
  ["cravings", "Cravings"],
  ["antojos", "Cravings"],
  ["snacks", "Cravings"],
  ["bebida", "Cravings"],
  ["bebidas", "Cravings"],
  ["savings", "Savings"],
  ["ahorro", "Savings"],
  ["ahorros", "Savings"],
  ["scholarship", "Scholarship"],
  ["beca", "Scholarship"],
  ["part time work", "Part-time work"],
  ["part-time work", "Part-time work"],
  ["trabajo part time", "Part-time work"],
  ["trabajo medio tiempo", "Part-time work"],
  ["sueldo", "Part-time work"],
  ["salario", "Part-time work"],
  ["family", "Family"],
  ["familia", "Family"],
  ["apoyo familiar", "Family"],
  ["mesada", "Family"],
  ["freelance", "Freelance"],
  ["honorarios", "Freelance"],
  ["cachuelo", "Freelance"],
  ["other", OTHER_CATEGORY],
  ["otros", OTHER_CATEGORY],
  ["otro", OTHER_CATEGORY],
]);

const RULES: Array<{
  categoryName: string;
  confidence: number;
  keywords: string[];
}> = [
  {
    categoryName: "Scholarship",
    confidence: 0.9,
    keywords: [
      "beca",
      "pronabec",
      "subvencion",
      "apoyo academico",
      "ayuda economica universidad",
    ],
  },
  {
    categoryName: "Family",
    confidence: 0.88,
    keywords: [
      "familia",
      "familiar",
      "papa",
      "mama",
      "padres",
      "mi madre",
      "mi padre",
      "mis padres",
      "apoyo familiar",
      "mesada",
    ],
  },
  {
    categoryName: "Freelance",
    confidence: 0.88,
    keywords: [
      "freelance",
      "honorario",
      "honorarios",
      "proyecto freelance",
      "cliente",
      "cachuelo",
      "servicio independiente",
    ],
  },
  {
    categoryName: "Part-time work",
    confidence: 0.86,
    keywords: [
      "sueldo",
      "salario",
      "planilla",
      "trabajo part time",
      "trabajo medio tiempo",
      "part time",
      "me pagaron",
      "pago trabajo",
    ],
  },
  {
    categoryName: "Subscriptions",
    confidence: 0.88,
    keywords: [
      "netflix",
      "spotify",
      "disney",
      "hbo",
      "prime video",
      "youtube premium",
      "icloud",
      "google one",
      "suscripcion",
      "subscripcion",
      "plan mensual",
      "mensualidad app",
    ],
  },
  {
    categoryName: "Cravings",
    confidence: 0.84,
    keywords: [
      "galleta",
      "snack",
      "bebida",
      "bebidas",
      "gaseosa",
      "refresco",
      "jugo",
      "agua mineral",
      "energizante",
      "frappe",
      "milkshake",
      "dulce",
      "helado",
      "postre",
      "cafe",
      "starbucks",
      "tambo",
      "oxxo",
      "delivery",
      "rappi",
      "pedidosya",
      "pizza",
      "hamburguesa",
      "kfc",
      "bembos",
      "mcdonald",
    ],
  },
  {
    categoryName: "Transportation",
    confidence: 0.86,
    keywords: [
      "taxi",
      "uber",
      "cabify",
      "bus",
      "micro",
      "metropolitano",
      "corredor",
      "pasaje",
      "recarga tarjeta",
      "combustible",
      "gasolina",
      "peaje",
      "estacionamiento",
    ],
  },
  {
    categoryName: "Housing",
    confidence: 0.86,
    keywords: [
      "alquiler",
      "renta",
      "cuarto",
      "habitacion",
      "vivienda",
      "condominio",
    ],
  },
  {
    categoryName: "Utilities",
    confidence: 0.85,
    keywords: [
      "luz",
      "agua",
      "gas",
      "internet",
      "wifi",
      "telefono",
      "celular",
      "movistar",
      "claro",
      "entel",
      "bitel",
      "servicio",
      "recibo",
    ],
  },
  {
    categoryName: "Health",
    confidence: 0.84,
    keywords: [
      "farmacia",
      "botica",
      "medicina",
      "medicamento",
      "doctor",
      "consulta",
      "clinica",
      "hospital",
      "seguro",
      "gimnasio",
      "gym",
    ],
  },
  {
    categoryName: "Savings",
    confidence: 0.84,
    keywords: [
      "ahorro",
      "alcancia",
      "fondo de emergencia",
      "inversion",
      "invertir",
    ],
  },
  {
    categoryName: "Shopping",
    confidence: 0.8,
    keywords: [
      "ropa",
      "zapatilla",
      "zapato",
      "polo",
      "casaca",
      "mochila",
      "mall",
      "falabella",
      "ripley",
      "oechsle",
      "saga",
      "platanitos",
      "accesorio",
      "libro",
      "materiales",
      "tecnologia",
    ],
  },
  {
    categoryName: "Entertainment",
    confidence: 0.78,
    keywords: [
      "cine",
      "concierto",
      "juego",
      "videojuego",
      "bar",
      "discoteca",
      "salida",
      "entrada",
      "teatro",
      "bowling",
    ],
  },
  {
    categoryName: "Food",
    confidence: 0.82,
    keywords: [
      "comida",
      "menu",
      "almuerzo",
      "cena",
      "desayuno",
      "restaurante",
      "cafeteria",
      "pollo",
      "chifa",
      "ceviche",
      "mercado",
      "supermercado",
      "abarrotes",
      "plaza vea",
      "metro",
      "wong",
      "vivanda",
      "tottus",
      "makro",
    ],
  },
];

export function normalizeClassificationCategory(
  categoryName: string | null | undefined,
): string | null {
  if (!categoryName) return null;
  const normalized = normalizeText(categoryName);
  return CATEGORY_ALIASES.get(normalized) ?? null;
}

export function classifyTransactionByRules(
  description: string,
  _amount: number,
): ClassificationResult {
  const text = normalizeText(description);
  for (const rule of RULES) {
    if (
      rule.keywords.some((keyword) => text.includes(normalizeText(keyword)))
    ) {
      return {
        categoryName: rule.categoryName,
        confidence: rule.confidence,
      };
    }
  }

  return { categoryName: OTHER_CATEGORY, confidence: 0.35 };
}

export function normalizeClassificationResult(
  raw: Partial<ClassificationResult>,
  description: string,
  amount: number,
): ClassificationResult {
  const fallback = classifyTransactionByRules(description, amount);
  const canonical = normalizeClassificationCategory(raw.categoryName);
  const confidence =
    typeof raw.confidence === "number" && Number.isFinite(raw.confidence)
      ? clamp(raw.confidence, 0, 1)
      : fallback.confidence;

  if (!canonical) return fallback;
  if (
    canonical === OTHER_CATEGORY &&
    fallback.categoryName !== OTHER_CATEGORY
  ) {
    return fallback;
  }

  return { categoryName: canonical, confidence };
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
