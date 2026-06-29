/**
 * Eva WA — CAG assistive response prototype (8B.6 mock only).
 * RAG mode is intentionally disabled in 8B.6.
 * Does not modify outbound responses; finalResponseModified is always false.
 */

const { getKnowledgeContext } = require("./getKnowledgeContext");

const DEFAULT_ALLOWED_CATEGORIES = [
  "location",
  "rvoe",
  "online_programs",
  "not_offered",
  "non_primary_levels",
  "revalidation_general",
  "scholarships",
  "price_objection",
  "programs",
  "faqs",
];

const PARTIAL_CATEGORY = "promotions_general";

const BLOCKED_CATEGORIES = new Set([
  "dynamic",
  "personalized",
  "missing_cache",
  "unknown_or_greeting",
]);

function resolveEnvValue(env, key) {
  if (env && env[key] !== undefined) return env[key];
  if (typeof Deno !== "undefined" && Deno.env?.get) return Deno.env.get(key);
  return process.env[key];
}

function isCagAssistiveResponseEnabled(env = process.env) {
  const flag = resolveEnvValue(env, "EVA_CAG_RESPONSE_ENABLED") === "true";
  const mode = resolveEnvValue(env, "WA_AGENT_MODE") || "mock";
  const llmOn = resolveEnvValue(env, "EVA_LLM_ENABLED") === "true";
  const llmMode = resolveEnvValue(env, "LLM_MODE") || "off";
  const ghlSync = resolveEnvValue(env, "GHL_SYNC_MODE") || "dry_run";

  if (!flag) return false;
  if (mode !== "mock") return false;
  if (llmOn) return false;
  if (llmMode !== "off" && llmMode !== "") return false;
  if (ghlSync === "live") return false;
  return true;
}

function isCagAssistiveCategoryAllowed(category, options = {}) {
  const allowlist = options.allowedCategories || DEFAULT_ALLOWED_CATEGORIES;
  if (BLOCKED_CATEGORIES.has(category)) {
    return { allowed: false, partial: false, reason: `category_${category}_blocked` };
  }
  if (category === PARTIAL_CATEGORY) {
    return {
      allowed: true,
      partial: true,
      reason: "promotions_general_requires_human_followup",
    };
  }
  if (allowlist.includes(category)) {
    return { allowed: true, partial: false, reason: "category_in_allowlist" };
  }
  return { allowed: false, partial: false, reason: "category_not_in_allowlist" };
}

function buildTextForCategory(category, message, knowledgeResult) {
  const n = String(message || "").toLowerCase();

  switch (category) {
    case "location":
      return (
        "Nuestro Campus Central está en:\n\n" +
        "📍 Calle 7 Tablaje Catastral 15542 x 4 y 6, Colonia Santa Rita Cholul, Mérida, Yucatán, C.P. 97305.\n\n" +
        "Horario de atención:\nLunes a viernes: 07:00–21:00\nSábado: 08:00–14:00\n\n" +
        "Te comparto la ubicación en Google Maps:\n" +
        "https://www.google.com/maps/place/Universidad+Latino/@21.0279469,-89.5695554,17z"
      );

    case "rvoe":
      return (
        "Sí. Las carreras cuentan con Reconocimiento de Validez Oficial de Estudios (RVOE), según el programa y modalidad.\n\n" +
        "Si me dices qué carrera te interesa, puedo compartirte el RVOE correspondiente si está disponible en la información oficial.\n\n" +
        "Ejemplo validado: Negocios Internacionales — RVOE 809."
      );

    case "online_programs":
      return (
        "Carreras en modalidad En línea:\n" +
        "• Derecho Online — $1,980/mes | Inscripción $3,600\n" +
        "• Administración y Desarrollo Empresarial Online — $1,980/mes | Inscripción $3,600\n" +
        "• Ventas y Mercadotecnia Online — $1,980/mes | Inscripción $3,600"
      );

    case "not_offered":
      return (
        "Por ahora Medicina no aparece en la oferta oficial disponible.\n\n" +
        "Alternativas en Salud:\n• Psicología\n• Enfermería\n• Nutrición"
      );

    case "non_primary_levels":
      return (
        "Sí, Universidad Latino también cuenta con nivel Preparatoria y Posgrados.\n\n" +
        "Para costos, horarios, requisitos y planes de estudio específicos, un asesor de admisiones puede orientarte."
      );

    case "revalidation_general":
      return (
        "Sí, contamos con proceso de revalidación de materias.\n\n" +
        "Como cada caso depende de tus estudios previos y documentación académica, un asesor académico debe revisar tu caso.\n\n" +
        "No se puede indicar de antemano cuántas materias se revalidarían."
      );

    case "scholarships":
      return (
        "Becas de excelencia por promedio de bachillerato:\n" +
        "• Sobresaliente (9.6–10): 50% colegiaturas y 50% inscripción\n" +
        "• Muy alto (9–9.59): 40% colegiaturas y 50% inscripción\n" +
        "• Alto (8.5–8.99): 30% colegiaturas y 50% inscripción\n" +
        "• Base (7–8.49): sin beca en colegiaturas y 50% inscripción\n" +
        "• Menor a 7: un asesor puede revisar alternativas\n\n" +
        "Sujeto a validación del área de admisiones."
      );

    case "price_objection":
      return (
        "Entiendo tu preocupación por el costo 😊\n\n" +
        "En Universidad Latino hay becas de excelencia según promedio de bachillerato y descuentos en inscripción sujetos a validación.\n\n" +
        "No puedo prometer una beca exacta sin revisión de admisiones."
      );

    case "programs":
      if (/negocios\s+internacionales/i.test(n)) {
        return (
          "Negocios Internacionales — Presencial\n" +
          "• Mensualidad: $4,650 | Inscripción: $8,000\n" +
          "• Duración: 3 años 4 meses | Campus Central | RVOE 809"
        );
      }
      return (
        "Universidad Latino ofrece 9 programas académicos únicos en 12 combinaciones de carrera y modalidad.\n\n" +
        "Puedo orientarte por carrera, costos o modalidad según la información oficial validada."
      );

    case "promotions_general":
      return (
        "Puedo orientarte con las becas y descuentos oficiales documentados (tabla de excelencia por promedio).\n\n" +
        "Para promociones vigentes específicas, un asesor de admisiones debe confirmar las condiciones actuales."
      );

    case "faqs":
      return (
        "Con gusto te ayudo con información institucional sobre carreras, becas, ubicación, costos o revalidación."
      );

    default:
      return "";
  }
}

function buildSafeguards(category, partial) {
  const safeguards = ["final_response_not_modified", "deterministic_no_llm", "static_cache_only"];
  if (partial || category === PARTIAL_CATEGORY) {
    safeguards.push("human_followup_required", "no_current_promotion_claim");
  }
  if (category === "location") {
    safeguards.push("no_asesor_offer", "no_visit_offer", "no_task");
  }
  if (category === "revalidation_general") {
    safeguards.push("no_materia_count_promise", "human_academic_review");
  }
  if (category === "price_objection" || category === "scholarships") {
    safeguards.push("no_exact_scholarship_promise");
  }
  if (category === "rvoe") {
    safeguards.push("no_invented_rvoe");
  }
  return safeguards;
}

function buildRisks(category, partial) {
  const risks = [];
  if (category === "location") risks.push("must_not_trigger_asesor_or_visit");
  if (category === "promotions_general" || partial) risks.push("must_not_claim_vigente_promo");
  if (category === "revalidation_general") risks.push("must_not_promise_equivalencias");
  if (category === "price_objection") risks.push("must_not_promise_exact_beca");
  return risks;
}

function buildCagAssistiveResponse({
  message,
  deterministicIntent,
  deterministicResponse,
  knowledgeResult = null,
  options = {},
}) {
  const env = options.env || process.env;
  const enabled = isCagAssistiveResponseEnabled(env);

  const base = {
    enabled,
    mode: enabled ? "assistive_mock" : "disabled",
    category: null,
    shouldUseAssistiveResponse: false,
    deterministicResponse: deterministicResponse || "",
    assistiveResponse: "",
    reason: enabled ? "assistive_gate_open" : "eva_cag_response_disabled_or_unsafe_env",
    risks: [],
    safeguards: [],
    finalResponseModified: false,
  };

  if (!enabled) {
    if (resolveEnvValue(env, "EVA_CAG_RESPONSE_ENABLED") === "true") {
      base.mode = "blocked";
      base.reason = "unsafe_runtime_env";
    }
    return base;
  }

  const knowledge =
    knowledgeResult || getKnowledgeContext(message, { cachePath: options.cachePath });

  base.category = knowledge.category || null;

  if (knowledge.mode !== "CAG" || !knowledge.category) {
    const blockedReason = knowledge.category || "no_cag_context";
    return {
      ...base,
      mode: "blocked",
      category: knowledge.category,
      shouldUseAssistiveResponse: false,
      reason: blockedReason === "dynamic" ? "dynamic" : blockedReason === "personalized" ? "personalized" : `blocked_${blockedReason}`,
      risks: [],
      safeguards: ["category_not_allowed"],
      finalResponseModified: false,
    };
  }

  const catCheck = isCagAssistiveCategoryAllowed(knowledge.category, options);
  if (!catCheck.allowed) {
    return {
      ...base,
      mode: "blocked",
      category: knowledge.category,
      shouldUseAssistiveResponse: false,
      reason: catCheck.reason,
      safeguards: ["category_not_allowed"],
      finalResponseModified: false,
    };
  }

  const assistiveText = buildTextForCategory(knowledge.category, message, knowledge);
  if (!assistiveText) {
    return {
      ...base,
      mode: "blocked",
      category: knowledge.category,
      shouldUseAssistiveResponse: false,
      reason: "empty_assistive_template",
      finalResponseModified: false,
    };
  }

  const partial = catCheck.partial === true;
  const safeguards = buildSafeguards(knowledge.category, partial);
  const risks = buildRisks(knowledge.category, partial);

  return {
    enabled: true,
    mode: "assistive_mock",
    category: knowledge.category,
    shouldUseAssistiveResponse: true,
    deterministicResponse: deterministicResponse || "",
    assistiveResponse: assistiveText,
    reason: partial ? "assistive_partial_with_human_followup" : "assistive_allowed_category",
    risks,
    safeguards,
    knowledgeVersion: knowledge.knowledgeVersion || null,
    deterministicIntent: deterministicIntent || null,
    finalResponseModified: false,
  };
}

module.exports = {
  isCagAssistiveResponseEnabled,
  isCagAssistiveCategoryAllowed,
  buildCagAssistiveResponse,
  DEFAULT_ALLOWED_CATEGORIES,
  BLOCKED_CATEGORIES,
};
