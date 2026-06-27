import { normalizeInput } from "./normalizer.js";

const GREETING_KEYWORDS = ["hola", "buenas", "buen dia", "buenas tardes", "buenas noches", "saludos"];

const CAREER_LIST_KEYWORDS = [
  "carreras", "programas", "que tienen", "que ofrecen", "opciones", "oferta academica",
  "licenciaturas", "cuantas carreras", "cuantos programas",
];

const CATALOG_COUNT_KEYWORDS = [
  "12 carreras", "doce carreras", "cuantas carreras diferentes", "son 12", "9 programas",
  "cuantos programas", "programas unicos", "combinaciones",
];

const HUMANO_KEYWORDS = [
  "hablar con un asesor", "hablar con asesor", "quiero un asesor", "asesor humano", "persona real",
];

const VOCATIONAL_KEYWORDS = [
  "no se que estudiar", "no sé qué estudiar", "test vocacional", "que estudiar", "vocacional",
];

const BANNED_CLAIM_TRIGGERS = ["nasa", "7 paises", "siete paises", "trilingue", "trilingüe"];

/**
 * @param {string} normalizedInput
 * @param {object} entities
 * @param {object} _state
 * @returns {string}
 */
export function detectAcademicIntent(normalizedInput, entities, _state = {}) {
  const n = normalizedInput.trim();

  if (HUMANO_KEYWORDS.some((k) => n.includes(k))) return "fallback";
  if (VOCATIONAL_KEYWORDS.some((k) => n.includes(k))) return "fallback";

  if (n === "1" || n === "carreras disponibles" || n === "licenciaturas") return "career_list";
  if (n === "2" || n === "beca" || n === "becas") return "scholarship";

  if (BANNED_CLAIM_TRIGGERS.some((k) => n.includes(k))) return "fallback";

  if (entities.pregunta_msi) return "payment";
  if (entities.promedio !== null && (entities.pregunta_beca || n.includes("apoyo"))) return "scholarship";
  if (entities.pregunta_beca) return "scholarship";
  if (entities.promedio !== null) return "scholarship";
  if (entities.pregunta_documentos) return "documents";
  if (entities.pregunta_admision) return "admission";
  if (entities.pregunta_contacto) return "contact";

  if (entities.pregunta_practicas) {
    if (entities.careerName && (n.includes("campo clinico") || n.includes("campos clinicos") || n.includes("documento") || n.includes("servicio social"))) {
      return "career_detail";
    }
    return "faq";
  }

  if (entities.careerName && (entities.pregunta_costo || n.includes("cuanto cuesta"))) return "career_detail";

  if (entities.careerName) return "career_detail";

  if (entities.modality) return "modality_filter";

  if (n.includes("carreras online") || n.includes("carreras en linea") || n.includes("carreras virtuales")) {
    return "modality_filter";
  }

  if (CATALOG_COUNT_KEYWORDS.some((k) => n.includes(k))) return "career_list";

  if (CAREER_LIST_KEYWORDS.some((k) => n.includes(k))) return "career_list";

  if (entities.area) return "career_list";

  if (entities.pregunta_costo) return "faq";

  if (n.includes("horario") || n.includes("modalidad") || n.includes("modalidades")) return "schedule";

  const isShort = n.split(" ").length <= 4;
  if (isShort && GREETING_KEYWORDS.some((k) => n.includes(k))) return "greeting";

  if (n === "informacion" || n === "info") return "greeting";

  return "fallback";
}
