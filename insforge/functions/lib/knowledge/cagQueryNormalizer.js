/**
 * CAG query normalization — reuses Eva typo corrections (8B.3).
 * Deterministic only; no LLM, no external APIs.
 */

const { applyTypoCorrections } = require("../eva-text-normalizer");

function normalizeCagQuery(input) {
  const corrected = applyTypoCorrections(String(input || ""));
  return corrected
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿¡?.,!;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text, patterns) {
  return patterns.some((p) => text.includes(normalizeCagQuery(p)));
}

const DYNAMIC_PATTERNS = [
  "promocion de hoy",
  "promocion tienen hoy",
  "promociones tienen hoy",
  "promo vigente hoy",
  "promocion vigente hoy",
  "promocion este mes",
  "campana actual",
  "descuento vigente de hoy",
  "descuento vigente este mes",
  "hay descuento vigente",
  "hay cupo",
  "cupo manana",
  "disponibilidad manana",
  "mañana hay",
  "manana hay",
];

const PERSONALIZED_PATTERNS = [
  "me pueden revalidar",
  "pueden revalidar",
  "cuantas materias",
  "8 materias",
  "ocho materias",
  "materias de otra universidad",
  "equivalencias especificas",
  "revisar mi certificado",
  "revisar mi kardex",
  "mi certificado parcial",
  "beca exacta",
  "cuanto me toca de beca exacta",
  "pueden revisar mi certificado",
];

const GREETING_PATTERNS = [
  "hola",
  "buenas",
  "buen dia",
  "buenas tardes",
  "buenas noches",
  "que tal",
  "hey",
  "info",
  "informacion",
  "quiero informacion",
  "quiero info",
];

const LOCATION_PATTERNS = [
  "ubicacion",
  "direccion",
  "donde estan",
  "campus",
  "localizacion",
  "sede",
  "como llegar",
  "unicacion",
  "ubicasion",
];

const PRICE_OBJECTION_PATTERNS = [
  "esta caro",
  "se me hace caro",
  "es mucho",
  "no tengo dinero",
  "no me alcanza",
  "muy caro",
  "costoso",
];

const PROMOTIONS_GENERAL_PATTERNS = [
  "promocion",
  "promociones",
  " promo",
  "ofertas",
  "que promociones tienen",
  "que promocion tienen",
];

const SCHOLARSHIP_PATTERNS = [
  "beca",
  "becas",
  "descuento",
  "descuentos",
  "becas de excelencia",
  "apoyo economico",
  "colegiatura accesible",
];

const REVALIDATION_GENERAL_PATTERNS = [
  "revalidacion",
  "revalidar",
  "convalidacion",
  "convalidar",
  "equivalencias generales",
  "tienen revalidacion",
];

const RVOE_PATTERNS = [
  "reconocimiento oficial",
  "reconocida",
  "reconocido",
  "acreditada",
  "acreditado",
  "acreditacion",
  "validez oficial",
  "rvoe",
  " sep",
];

const ONLINE_PATTERNS = [
  "carreras online",
  "carreras en linea",
  "modalidad online",
  "estudiar en linea",
  "carreras virtuales",
  "licenciaturas online",
];

const NOT_OFFERED_PATTERNS = [
  "medicina",
  "medicida",
  "medico cirujano",
  "medico",
  "doctor",
];

const NON_PRIMARY_PATTERNS = [
  "preparatoria",
  "prepa",
  "bachillerato",
  "maestria",
  "maestrias",
  "posgrado",
  "postgrado",
  "doctorado",
  "especialidad",
];

const PROGRAMS_PATTERNS = [
  "carrera",
  "carreras",
  "programa",
  "programas",
  "licenciatura",
  "costo",
  "costos",
  "colegiatura",
  "mensualidad",
  "inscripcion",
  "precio",
  "cuanto cuesta",
  "negocios internacionales",
  "universidad latino",
];

function matchesVagueGreeting(n) {
  if (!n) return false;
  const wordCount = n.split(/\s+/).length;
  if (wordCount > 6) return false;
  return includesAny(n, GREETING_PATTERNS) || n === "me interesa";
}

function matchesPriceObjection(n) {
  if (includesAny(n, PRICE_OBJECTION_PATTERNS)) return true;
  return (n.includes("caro") || n.includes("cara")) && n.length <= 40;
}

function matchesPromotionsGeneral(n) {
  const promoDynamic = DYNAMIC_PATTERNS.filter(
    (p) => p.includes("promocion") || p.includes("descuento vigente"),
  );
  if (includesAny(n, promoDynamic)) {
    return false;
  }
  return includesAny(n, PROMOTIONS_GENERAL_PATTERNS);
}

/**
 * Classify normalized query for CAG routing.
 * @returns {{ suitable: boolean, category: string, reason: string }}
 */
function classifyCagQuery(rawQuery) {
  const normalizedQuery = normalizeCagQuery(rawQuery);

  if (!normalizedQuery) {
    return {
      suitable: false,
      category: "unknown",
      reason: "empty_query",
      normalizedQuery,
    };
  }

  if (matchesVagueGreeting(normalizedQuery)) {
    return {
      suitable: false,
      category: "unknown_or_greeting",
      reason: "greeting_or_vague_opener_handled_by_menu",
      normalizedQuery,
    };
  }

  if (includesAny(normalizedQuery, DYNAMIC_PATTERNS)) {
    return {
      suitable: false,
      category: "dynamic",
      reason: "requires_current_promotion_or_availability_validation",
      normalizedQuery,
    };
  }

  if (includesAny(normalizedQuery, PERSONALIZED_PATTERNS)) {
    return {
      suitable: false,
      category: "personalized",
      reason: "requires_academic_document_review",
      normalizedQuery,
    };
  }

  if (includesAny(normalizedQuery, LOCATION_PATTERNS)) {
    return {
      suitable: true,
      category: "location",
      reason: "static_campus_location_knowledge",
      normalizedQuery,
    };
  }

  if (matchesPriceObjection(normalizedQuery)) {
    return {
      suitable: true,
      category: "price_objection",
      reason: "scholarship_and_price_support_context",
      normalizedQuery,
    };
  }

  if (matchesPromotionsGeneral(normalizedQuery)) {
    return {
      suitable: true,
      category: "promotions_general",
      reason: "official_scholarships_and_discounts_vigentes_require_advisor",
      normalizedQuery,
    };
  }

  if (includesAny(normalizedQuery, SCHOLARSHIP_PATTERNS)) {
    return {
      suitable: true,
      category: "scholarships",
      reason: "static_scholarship_table_knowledge",
      normalizedQuery,
    };
  }

  if (includesAny(normalizedQuery, REVALIDATION_GENERAL_PATTERNS)) {
    return {
      suitable: true,
      category: "revalidation_general",
      reason: "general_revalidation_policy_knowledge",
      normalizedQuery,
    };
  }

  if (includesAny(normalizedQuery, RVOE_PATTERNS)) {
    return {
      suitable: true,
      category: "rvoe",
      reason: "official_recognition_rvoe_knowledge",
      normalizedQuery,
    };
  }

  if (includesAny(normalizedQuery, ONLINE_PATTERNS)) {
    return {
      suitable: true,
      category: "online_programs",
      reason: "online_programs_catalog_knowledge",
      normalizedQuery,
    };
  }

  if (includesAny(normalizedQuery, NOT_OFFERED_PATTERNS)) {
    return {
      suitable: true,
      category: "not_offered",
      reason: "non_offered_career_alternatives_knowledge",
      normalizedQuery,
    };
  }

  if (includesAny(normalizedQuery, NON_PRIMARY_PATTERNS)) {
    return {
      suitable: true,
      category: "non_primary_levels",
      reason: "preparatoria_posgrados_knowledge",
      normalizedQuery,
    };
  }

  if (includesAny(normalizedQuery, PROGRAMS_PATTERNS)) {
    return {
      suitable: true,
      category: "programs",
      reason: "academic_programs_and_costs_knowledge",
      normalizedQuery,
    };
  }

  if (includesAny(normalizedQuery, ["admision", "requisito", "documento", "faq"])) {
    return {
      suitable: true,
      category: "faqs",
      reason: "institutional_faq_knowledge",
      normalizedQuery,
    };
  }

  return {
    suitable: false,
    category: "unknown",
    reason: "query_requires_dynamic_or_personalized_answer",
    normalizedQuery,
  };
}

module.exports = {
  normalizeCagQuery,
  classifyCagQuery,
  includesAny,
};
