/**
 * Eva WA — CAG shadow evaluator (8B.2).
 * Compares deterministic Eva output vs CAG availability without changing user-facing responses.
 * RAG mode is intentionally disabled in 8B.2.
 * Does not call LLM, external APIs, or InsForge.
 */

const { getKnowledgeContext } = require("./getKnowledgeContext");

const PREVIEW_MAX = 220;
const CONTEXT_PREVIEW_MAX = 280;

const HUMAN_ESCALATION_INTENTS = new Set([
  "revalidacion_estudios",
  "promociones_descuentos",
  "hablar_asesor",
  "documentos_admision",
]);

const CAG_ALIGNED_INTENTS = new Set([
  "revalidacion_estudios",
  "niveles_no_principales",
  "ubicacion_campus",
  "rvoe_reconocimiento",
  "carreras_online",
  "carrera_no_ofertada",
  "objecion_precio",
  "beca",
  "promociones_descuentos",
  "carrera_interes",
  "costos",
  "programas",
  "admision",
]);

function summarize(text, max = PREVIEW_MAX) {
  const one = String(text || "").replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max)}…` : one;
}

function extractContextSnippet(context, message, intent) {
  if (!context) return "";
  const hints = [];
  const n = String(message || "").toLowerCase();
  if (/revalid/i.test(n) || intent === "revalidacion_estudios") hints.push("revalidacion");
  if (/maestri|posgrad|preparatoria|prepa/i.test(n) || intent === "niveles_no_principales") {
    hints.push("preparatoria-posgrados", "Preparatoria");
  }
  if (/negocios|duda/i.test(n)) hints.push("Negocios Internacionales");
  if (/descuento|beca|cara|precio/i.test(n) || intent === "objecion_precio" || intent === "beca") {
    hints.push("becas", "Becas de excelencia");
  }
  if (/ubic|unicac|campus|donde/i.test(n) || intent === "ubicacion_campus") {
    hints.push("Santa Rita Cholul", "ubicacion");
  }
  if (/rvoe|reconoc|acredit/i.test(n) || intent === "rvoe_reconocimiento") hints.push("RVOE");
  if (/online|linea|línea/i.test(n) || intent === "carreras_online") hints.push("En línea", "online");
  if (/medic/i.test(n) || intent === "carrera_no_ofertada") hints.push("Medicina", "Psicología");

  for (const hint of hints) {
    const idx = context.indexOf(hint);
    if (idx >= 0) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(context.length, idx + CONTEXT_PREVIEW_MAX);
      return summarize(context.slice(start, end), CONTEXT_PREVIEW_MAX);
    }
  }
  return summarize(context, CONTEXT_PREVIEW_MAX);
}

function deriveRecommendation({
  knowledge,
  deterministicIntent,
  deterministicResponse,
  message,
}) {
  const notes = [];

  if (knowledge.source === "missing_cache") {
    return { recommendation: "missing_cache", notes: ["CAG cache file not found"] };
  }

  if (knowledge.mode === "CAG") {
    if (HUMAN_ESCALATION_INTENTS.has(deterministicIntent)) {
      notes.push("CAG provides general static context; deterministic flow still escalates human when needed");
      return { recommendation: "useful", notes };
    }
    if (CAG_ALIGNED_INTENTS.has(deterministicIntent) || deterministicIntent === "fallback_inteligente") {
      notes.push("Static CAG context aligns with deterministic institutional intent");
      return { recommendation: "useful", notes };
    }
    if (deterministicIntent === "ambiguo") {
      notes.push("CAG available but greeting uses menu; CAG not injected in shadow");
      return { recommendation: "not_needed", notes };
    }
    notes.push("CAG available; verify alignment in future integration");
    return { recommendation: "useful", notes };
  }

  // knowledge.mode === NONE
  if (knowledge.source === "not_cag_suitable") {
    if (HUMAN_ESCALATION_INTENTS.has(deterministicIntent)) {
      notes.push("Router correctly avoids static CAG for dynamic or human-required topic");
      return { recommendation: "requires_human", notes };
    }
    if (/unicac/i.test(message) && deterministicIntent === "ubicacion_campus") {
      notes.push("CAG router missed ubicacion typo; deterministic normalizer still resolves intent");
      return { recommendation: "not_needed", notes };
    }
    if (deterministicIntent === "objecion_precio") {
      notes.push("CAG router missed price objection phrasing; deterministic response already covers becas");
      return { recommendation: "not_needed", notes };
    }
    if (deterministicIntent === "ambiguo") {
      notes.push("Greeting or vague opener; menu response sufficient without CAG");
      return { recommendation: "not_needed", notes };
    }
    if (deterministicResponse && deterministicResponse.length > 0) {
      notes.push("Deterministic response already produced; CAG not required in shadow");
      return { recommendation: "not_needed", notes };
    }
    notes.push("Query flagged as not CAG-suitable");
    return { recommendation: "requires_dynamic", notes };
  }

  return { recommendation: "missing_cache", notes: ["Unexpected knowledge state"] };
}

function assessResponseChangeRisk({ knowledge, deterministicIntent, message }) {
  const notes = [];
  if (knowledge.mode !== "CAG") return { risk: false, notes };

  if (HUMAN_ESCALATION_INTENTS.has(deterministicIntent)) {
    notes.push("Injecting CAG must not remove human escalation already in deterministic response");
    return { risk: true, notes };
  }
  if (deterministicIntent === "ubicacion_campus") {
    notes.push("CAG ubicacion rules forbid asesor/visita; must match deterministic policy");
    return { risk: true, notes };
  }
  if (/promocion/i.test(message) && deterministicIntent === "promociones_descuentos") {
    notes.push("Promotions require dynamic validation; CAG must not invent vigentes");
    return { risk: true, notes };
  }
  return { risk: false, notes };
}

/**
 * @param {object} params
 * @param {string} params.message
 * @param {string} params.deterministicIntent
 * @param {string} params.deterministicResponse
 * @param {object} [params.conversationState]
 * @param {object} [params.options] - forwarded to getKnowledgeContext
 */
function evaluateCagShadow({
  message,
  deterministicIntent,
  deterministicResponse,
  conversationState = {},
  options = {},
}) {
  const knowledge = getKnowledgeContext(message, options);
  const { recommendation, notes: recNotes } = deriveRecommendation({
    knowledge,
    deterministicIntent,
    deterministicResponse,
    message,
  });
  const { risk, notes: riskNotes } = assessResponseChangeRisk({
    knowledge,
    deterministicIntent,
    message,
  });

  const contextPreview =
    knowledge.mode === "CAG"
      ? extractContextSnippet(knowledge.context, message, deterministicIntent)
      : "";

  return {
    shadowEnabled: true,
    query: message,
    conversationState,
    deterministicIntent,
    deterministicResponsePreview: summarize(deterministicResponse),
    knowledgeMode: knowledge.mode,
    knowledgeSource: knowledge.source,
    knowledgeVersion: knowledge.knowledgeVersion || null,
    contextAvailable: knowledge.mode === "CAG" && Boolean(knowledge.context),
    contextPreview,
    tokenEstimate: knowledge.tokenEstimate || null,
    recommendation,
    cagUseful: recommendation === "useful",
    responseChangeRisk: risk,
    finalResponseModified: false,
    notes: [...recNotes, ...riskNotes],
  };
}

module.exports = { evaluateCagShadow, summarize, extractContextSnippet };
