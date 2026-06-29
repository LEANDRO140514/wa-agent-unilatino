/**
 * Eva WA — CAG shadow evaluator (8B.2, 8B.3 router alignment).
 * Compares deterministic Eva output vs CAG availability without changing user-facing responses.
 * RAG mode is intentionally disabled in 8B.3.
 * Does not call LLM, external APIs, or InsForge.
 */

const { getKnowledgeContext } = require("./getKnowledgeContext");

const PREVIEW_MAX = 220;
const CONTEXT_PREVIEW_MAX = 280;

const CATEGORY_CONTEXT_HINTS = {
  location: ["Santa Rita Cholul", "ubicacion"],
  price_objection: ["becas", "Becas de excelencia"],
  scholarships: ["becas", "Becas de excelencia"],
  promotions_general: ["becas", "Becas de excelencia"],
  revalidation_general: ["revalidacion"],
  rvoe: ["RVOE"],
  online_programs: ["En línea", "online"],
  not_offered: ["Medicina", "Psicología"],
  non_primary_levels: ["Preparatoria", "preparatoria-posgrados"],
  programs: ["Negocios Internacionales", "programas"],
  faqs: ["Universidad Latino"],
};

function summarize(text, max = PREVIEW_MAX) {
  const one = String(text || "").replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max)}…` : one;
}

function extractContextSnippet(context, category, message, intent) {
  if (!context) return "";
  const hints = [...(CATEGORY_CONTEXT_HINTS[category] || [])];
  const n = String(message || "").toLowerCase();
  if (/negocios|duda/i.test(n)) hints.push("Negocios Internacionales");
  if (/ubic|unicac|campus|donde/i.test(n) || intent === "ubicacion_campus") {
    hints.push("Santa Rita Cholul");
  }
  if (/descuento|beca|cara|precio/i.test(n) || intent === "objecion_precio" || intent === "beca") {
    hints.push("Becas de excelencia");
  }

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

function deriveRecommendation({ knowledge, deterministicIntent }) {
  const notes = [];
  const category = knowledge.category;

  if (knowledge.source === "missing_cache") {
    return { recommendation: "missing_cache", notes: ["CAG cache file not found"] };
  }

  if (knowledge.mode === "CAG") {
    switch (category) {
      case "location":
        notes.push("CAG confirms static location knowledge");
        return { recommendation: "useful", notes };
      case "price_objection":
        notes.push("CAG provides scholarship/price support context");
        return { recommendation: "useful", notes };
      case "promotions_general":
        notes.push(
          "CAG can provide official scholarships, but current promotions require validation",
        );
        return { recommendation: "useful_with_human_followup", notes };
      case "revalidation_general":
        if (deterministicIntent === "revalidacion_estudios") {
          notes.push(
            "CAG provides general revalidation policy; deterministic flow still escalates human when needed",
          );
          return { recommendation: "useful_with_human_followup", notes };
        }
        notes.push("General revalidation knowledge available in CAG");
        return { recommendation: "useful", notes };
      case "scholarships":
        notes.push("Static scholarship table aligns with deterministic becas intent");
        return { recommendation: "useful", notes };
      default:
        notes.push(`Static CAG context available for category ${category}`);
        return { recommendation: "useful", notes };
    }
  }

  if (knowledge.source === "not_cag_suitable") {
    if (category === "dynamic") {
      notes.push("Dynamic or time-bound promotion/availability query");
      return { recommendation: "requires_dynamic", notes };
    }
    if (category === "personalized") {
      notes.push("Personalized academic review required");
      return { recommendation: "requires_human", notes };
    }
    if (
      category === "unknown_or_greeting" ||
      (category === "unknown" && knowledge.reason === "greeting_or_vague_opener_handled_by_menu")
    ) {
      notes.push("Greeting or vague opener; deterministic menu handles response");
      return { recommendation: "not_applicable", notes };
    }
    if (deterministicIntent === "ambiguo") {
      notes.push("Greeting handled by menu without CAG");
      return { recommendation: "not_applicable", notes };
    }
    notes.push("Query not suitable for static CAG");
    return { recommendation: "not_needed", notes };
  }

  return { recommendation: "missing_cache", notes: ["Unexpected knowledge state"] };
}

function assessResponseChangeRisk({ knowledge, deterministicIntent, message }) {
  const notes = [];
  if (knowledge.mode !== "CAG") return { risk: false, notes };

  if (knowledge.category === "revalidation_general" && deterministicIntent === "revalidacion_estudios") {
    notes.push("Injecting CAG must not remove human escalation already in deterministic response");
    return { risk: true, notes };
  }
  if (knowledge.category === "location" || deterministicIntent === "ubicacion_campus") {
    notes.push("CAG ubicacion rules forbid asesor/visita; must match deterministic policy");
    return { risk: true, notes };
  }
  if (knowledge.category === "promotions_general" || /promocion/i.test(message)) {
    notes.push("Promotions require dynamic validation; CAG must not invent vigentes");
    return { risk: true, notes };
  }
  if (knowledge.category === "price_objection") {
    notes.push("CAG must not promise exact scholarship; only official table");
    return { risk: true, notes };
  }
  return { risk: false, notes };
}

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
      ? extractContextSnippet(knowledge.context, knowledge.category, message, deterministicIntent)
      : "";

  const cagUseful =
    recommendation === "useful" || recommendation === "useful_with_human_followup";

  return {
    shadowEnabled: true,
    query: message,
    conversationState,
    deterministicIntent,
    deterministicResponsePreview: summarize(deterministicResponse),
    knowledgeMode: knowledge.mode,
    knowledgeSource: knowledge.source,
    knowledgeVersion: knowledge.knowledgeVersion || null,
    knowledgeCategory: knowledge.category || null,
    knowledgeReason: knowledge.reason || null,
    normalizedQuery: knowledge.normalizedQuery || null,
    contextAvailable: knowledge.mode === "CAG" && Boolean(knowledge.context),
    contextPreview,
    tokenEstimate: knowledge.tokenEstimate || null,
    recommendation,
    cagUseful,
    responseChangeRisk: risk,
    finalResponseModified: false,
    notes: [...recNotes, ...riskNotes],
  };
}

module.exports = { evaluateCagShadow, summarize, extractContextSnippet };
