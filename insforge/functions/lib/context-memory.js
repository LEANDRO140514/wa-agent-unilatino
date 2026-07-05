/**
 * Context memory + follow-ups §12.6–12.7 (Fase 1 ítem 5).
 */

import { normalizeInput } from "./academic-engine/normalizer.js";
import {
  buildCareerCostResponseText,
  detectInvalidModalityRequest,
  matchCareerAlias,
  matchExactOfferedCareer,
  resolveCareerRecord,
} from "./academic-engine/catalog-sot.js";

const COST_PATTERNS = [
  "cuanto cuesta",
  "cuánto cuesta",
  "precio",
  "colegiatura",
  "mensualidad",
  "cuanto sale",
  "cuánto sale",
  "costo",
  "costos",
];
const DURATION_PATTERNS = ["cuanto dura", "cuánto dura", "duracion", "duración", "cuantos años", "cuántos años"];
const DOCS_PATTERNS = ["que documentos", "qué documentos", "documentos necesito", "requisitos"];
const RECOMMEND_PATTERNS = [
  "cual me recomiendas",
  "cuál me recomiendas",
  "que carrera me recomiendas",
  "qué carrera me recomiendas",
  "me recomiendas",
];
const LAST_MENTIONED_COST_PATTERNS = [
  "y esa cuanto cuesta",
  "y esa cuánto cuesta",
  "esa cuanto cuesta",
  "esa cuánto cuesta",
  "la otra cuanto cuesta",
  "la otra cuánto cuesta",
];

function includesAnyNormalized(text, fragments) {
  const n = normalizeInput(text);
  return fragments.some((f) => n.includes(normalizeInput(f)));
}

function detectPendingAttribute(rawText) {
  if (includesAnyNormalized(rawText, COST_PATTERNS)) return "cost";
  if (includesAnyNormalized(rawText, DURATION_PATTERNS)) return "duration";
  if (includesAnyNormalized(rawText, DOCS_PATTERNS)) return "documents";
  return null;
}

function isAttributeQuestion(rawText) {
  return detectPendingAttribute(rawText) !== null;
}

function isRecommendQuestion(rawText) {
  return includesAnyNormalized(rawText, RECOMMEND_PATTERNS);
}

function isLastMentionedCostFollowUp(rawText) {
  return includesAnyNormalized(rawText, LAST_MENTIONED_COST_PATTERNS);
}

function isModalityFollowUp(rawText) {
  const n = normalizeInput(rawText).trim();
  if (/^(y\s+)?(online|en linea|presencial|sabatina|sabatino)\b/.test(n)) return true;
  if (/^y (online|presencial|en linea|sabatina)\b/.test(n)) return true;
  return false;
}

function detectModalityFromFollowUp(rawText) {
  const n = normalizeInput(rawText);
  if (/\b(online|en linea|linea)\b/.test(n)) return "en_linea";
  if (/\b(sabatina|sabatino)\b/.test(n)) return "sabatina";
  if (/\b(presencial|entre semana)\b/.test(n)) return "presencial";
  return null;
}

function careerMentionInText(rawText) {
  const exact = matchExactOfferedCareer(rawText);
  if (exact) return exact;
  const alias = matchCareerAlias(rawText);
  if (alias?.resolveTo) {
    return resolveCareerRecord({ careerName: alias.resolveTo });
  }
  return null;
}

function enrichDecision(base) {
  return {
    priority: "low",
    escalation_required: false,
    operational_owner: "Equipo de Admisiones Universidad Latino",
    business_hours_label: "Lunes a viernes 9:00-18:00, sábado 9:00-13:00",
    after_hours_logic_enabled: false,
    task_priority_label: "Baja",
    menu_option_detected: false,
    menu_option_value: null,
    ...base,
  };
}

function buildRecommendResponse(config) {
  const testUrl = config?.evaTestUrl || "https://testunilatino.algorithmus.io";
  return enrichDecision({
    intent: "no_se_que_estudiar",
    responseText:
      "No puedo recomendarte una carrera específica 😊 Lo ideal es que explores con nuestro test vocacional " +
      `(${testUrl}) o que un asesor te oriente según tu perfil. ¿Qué prefieres?`,
    waStage: "test_recomendado",
    needsHuman: false,
    createTask: false,
    ghl_tags: ["eva-wa", "wa_referred_to_test"],
  });
}

function buildClarificationResponse(attribute) {
  const labels = {
    cost: "esa información",
    duration: "la duración",
    documents: "los documentos de inscripción",
  };
  const topic = labels[attribute] || "esa información";
  return enrichDecision({
    intent: "contexto_aclaracion",
    responseText: `¡Claro! ¿De qué carrera te gustaría saber ${topic}?`,
    waStage: "consulta",
    needsHuman: false,
    createTask: false,
    preserve_fallback_count: true,
  });
}

function buildCostDecision(careerRecord) {
  const text = buildCareerCostResponseText(careerRecord);
  return enrichDecision({
    intent: "consulta_costo",
    responseText: text,
    waStage: "carrera_interes",
    needsHuman: false,
    createTask: false,
  });
}

function buildInvalidModalityDecision(invalid) {
  return enrichDecision({
    intent: "modalidad_invalida",
    responseText: invalid.responseText,
    waStage: "carrera_interes",
    needsHuman: false,
    createTask: false,
    ghl_tags: ["eva-wa", "wa_requested_invalid_modality"],
  });
}

function updateCareerMemory(academicState, careerRecord) {
  const nextName = careerRecord?.name || careerRecord?.programa_base || null;
  const prev = academicState?.current_career || null;
  const patch = {
    current_career: nextName,
    current_modality: careerRecord?.modality_code || academicState?.current_modality || null,
  };
  if (nextName && prev && normalizeInput(prev) !== normalizeInput(nextName)) {
    patch.last_career = prev;
  }
  return patch;
}

function resolveCareerFromState(academicState, preferLastMentioned = false) {
  const name = preferLastMentioned
    ? academicState?.last_career || academicState?.current_career
    : academicState?.current_career;
  if (!name) return null;
  const modality = academicState?.current_modality || null;
  return resolveCareerRecord({ careerName: name, modalityCode: modality });
}

/**
 * @returns {{ action: 'none'|'decision', decision?: object, academicStatePatch?: object }}
 */
export function resolveContextMemoryTurn({ rawText, academicState = {}, catalogSot = null, config = {} }) {
  void catalogSot;
  if (!rawText || !String(rawText).trim()) {
    return { action: "none" };
  }

  if (isRecommendQuestion(rawText)) {
    return {
      action: "decision",
      decision: buildRecommendResponse(config),
      academicStatePatch: { pending_attribute: null },
    };
  }

  if (isModalityFollowUp(rawText) && academicState?.current_career) {
    const modality = detectModalityFromFollowUp(rawText);
    const synthetic = `${academicState.current_career} ${modality === "en_linea" ? "online" : modality || "online"}`;
    const invalid = detectInvalidModalityRequest(synthetic);
    if (invalid) {
      return {
        action: "decision",
        decision: buildInvalidModalityDecision(invalid),
        academicStatePatch: {
          pending_attribute: null,
          current_modality: modality,
        },
      };
    }
    const record = resolveCareerRecord({
      careerName: academicState.current_career,
      modalityCode: modality,
    });
    if (record) {
      return {
        action: "decision",
        decision: buildCostDecision(record),
        academicStatePatch: {
          ...updateCareerMemory(academicState, record),
          pending_attribute: null,
          current_modality: record.modality_code,
        },
      };
    }
  }

  if (isLastMentionedCostFollowUp(rawText)) {
    const record = resolveCareerFromState(academicState, true);
    if (record) {
      return {
        action: "decision",
        decision: buildCostDecision(record),
        academicStatePatch: { pending_attribute: null },
      };
    }
  }

  const pending = academicState?.pending_attribute || null;
  const mention = careerMentionInText(rawText);

  if (pending && mention) {
    const record = typeof mention === "object" && mention.monthly_price != null ? mention : mention;
    if (record && pending === "cost") {
      return {
        action: "decision",
        decision: buildCostDecision(record),
        academicStatePatch: {
          ...updateCareerMemory(academicState, record),
          pending_attribute: null,
        },
      };
    }
  }

  if (isAttributeQuestion(rawText)) {
    const attribute = detectPendingAttribute(rawText);
    const fromState = resolveCareerFromState(academicState, false);
    if (fromState && attribute === "cost") {
      return {
        action: "decision",
        decision: buildCostDecision(fromState),
        academicStatePatch: { pending_attribute: null },
      };
    }
    if (!fromState && attribute) {
      return {
        action: "decision",
        decision: buildClarificationResponse(attribute),
        academicStatePatch: { pending_attribute: attribute },
      };
    }
  }

  if (mention && !pending) {
    const record = typeof mention === "object" && mention.name ? mention : null;
    if (record && !isAttributeQuestion(rawText) && !isModalityFollowUp(rawText)) {
      const patch = updateCareerMemory(academicState, record);
      if (Object.keys(patch).length > 0) {
        return { action: "none", academicStatePatch: patch };
      }
    }
  }

  return { action: "none" };
}

export function mergeAcademicStatePatch(academicState, patch) {
  if (!patch) return academicState || {};
  return { ...(academicState || {}), ...patch };
}
