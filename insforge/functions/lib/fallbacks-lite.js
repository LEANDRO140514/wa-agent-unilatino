/**
 * Fallbacks §12 + D23 (Fase 1 ítem 5) — FF_FALLBACKS
 */

import { normalizeInput } from "./academic-engine/normalizer.js";
import { FSM_STATES } from "./fsm-lite.js";

export const FALLBACK_LEVEL_1_TEXT =
  "¡Con gusto! ¿Qué te interesa más: 🎓 carreras, 💰 costos, 🏅 becas o 👤 hablar con un asesor?";

export const FALLBACK_LEVEL_2_TEXT =
  "Perdón, no te entendí bien. ¿Te interesa conocer carreras, costos, becas o hablar con un asesor?";

export const FALLBACK_LEVEL_3_TEXT =
  "Para no hacerte perder tiempo, mejor te conecto con un asesor que te atienda personalmente. ¿Te parece?";

export const OUT_OF_DOMAIN_TEXT =
  "Yo te ayudo con todo lo de admisiones de Universidad Latino 😊 ¿Tienes alguna duda de carreras, costos o inscripción?";

const FALLBACK_INTENTS = new Set(["ambiguo", "fallback_inteligente"]);

const DOMAIN_AMBIGUOUS_PATTERNS = [
  "info",
  "informacion",
  "información",
  "mas informacion",
  "más informacion",
  "más información",
  "me interesa",
  "quiero saber",
  "quiero info",
  "quiero informacion",
  "?",
];

const OUT_OF_DOMAIN_PATTERNS = [
  "va a llover",
  "llover",
  "clima",
  "weather",
  "resultado del partido",
  "quien gano",
];

const CONTROL_INBOUND_PREFIXES = ["opt_out", "confirmacion"];

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

export function isFallbacksFeatureEnabled(config) {
  return config?.ffFallbacks !== false;
}

function normalizeForCompare(text) {
  return normalizeInput(text).replace(/\s+/g, " ").trim();
}

function countMenuOptions(text) {
  const lines = String(text || "").split("\n").filter((l) => /^\d+\./.test(l.trim()));
  if (lines.length > 0) return lines.length;
  const options = ["carreras", "costos", "becas", "asesor"];
  return options.filter((o) => normalizeForCompare(text).includes(normalizeInput(o))).length;
}

export function isDomainAmbiguousMessage(rawText) {
  const n = normalizeForCompare(rawText);
  if (!n) return false;
  if (n === "?") return true;
  if (n.length <= 2 && n.includes("?")) return true;
  const words = n.split(" ").filter(Boolean);
  if (words.length > 6) return false;

  const exactVague = [
    "info",
    "informacion",
    "información",
    "mas informacion",
    "más informacion",
    "más información",
    "me interesa",
    "quiero saber",
    "quiero info",
    "quiero informacion",
    "quiero información",
    "hola",
    "buenas",
    "buen dia",
    "buenas tardes",
    "que tal",
    "hey",
  ];

  return exactVague.some((p) => n === normalizeInput(p));
}

export function isOutOfDomainMessage(rawText) {
  const n = normalizeForCompare(rawText);
  return OUT_OF_DOMAIN_PATTERNS.some((p) => n.includes(normalizeInput(p)));
}

function isFallbackIntent(intent) {
  return FALLBACK_INTENTS.has(intent);
}

function isRecognizedIntent(intent, decision = {}) {
  if (!intent || isFallbackIntent(intent)) return false;
  if (decision.preserve_fallback_count === true) return false;
  return true;
}

function isControlInbound(rawText) {
  const n = normalizeForCompare(rawText);
  return CONTROL_INBOUND_PREFIXES.some((p) => n.startsWith(p));
}

export function detectInboundRepeat(rawText, academicState = {}) {
  const normalized = normalizeForCompare(rawText);
  if (!normalized || isControlInbound(rawText)) {
    return { isRepeat: false, streak: 0, normalized };
  }
  const prev = academicState?.last_user_inbound_normalized || "";
  if (!prev || prev !== normalized) {
    return { isRepeat: false, streak: 0, normalized };
  }
  const streak = Number(academicState?.user_inbound_repeat_count || 0) + 1;
  return { isRepeat: true, streak, normalized };
}

function buildReformulatedResponse(lastOutboundText) {
  const prev = String(lastOutboundText || "").trim();
  if (prev.includes(FALLBACK_LEVEL_1_TEXT.slice(0, 20))) {
    return FALLBACK_LEVEL_2_TEXT;
  }
  if (prev.includes(FALLBACK_LEVEL_2_TEXT.slice(0, 20))) {
    return (
      "Sigamos por aquí 😊 Puedo orientarte con carreras, costos, becas o conectarte con un asesor. " +
      "¿Cuál prefieres?"
    );
  }
  return FALLBACK_LEVEL_2_TEXT;
}

function buildLevel1Decision() {
  return enrichDecision({
    intent: "ambiguo",
    responseText: FALLBACK_LEVEL_1_TEXT,
    waStage: "ambiguo",
    needsHuman: false,
    createTask: false,
    ghl_tags: ["eva-wa", "wa_interes_info"],
    last_fallback_level: 1,
  });
}

function buildLevel2Decision() {
  return enrichDecision({
    intent: "fallback_inteligente",
    responseText: FALLBACK_LEVEL_2_TEXT,
    waStage: "orientacion",
    needsHuman: false,
    createTask: false,
    ghl_tags: ["eva-wa", "wa_interes_info"],
    last_fallback_level: 2,
  });
}

function buildLevel3Decision(contactContext = {}) {
  if (contactContext.fsm_state === FSM_STATES.NO_CONTACT) {
    return buildLevel2Decision();
  }
  return enrichDecision({
    intent: "humano",
    responseText: FALLBACK_LEVEL_3_TEXT,
    waStage: "asesor_requerido",
    needsHuman: true,
    createTask: true,
    ghl_tags: ["eva-wa", "wa_low_confidence", "wa_requiere_asesor"],
    escalation_reason: "low_confidence",
    last_fallback_level: 3,
  });
}

function buildOutOfDomainDecision() {
  return enrichDecision({
    intent: "fallback_inteligente",
    responseText: OUT_OF_DOMAIN_TEXT,
    waStage: "orientacion",
    needsHuman: false,
    createTask: false,
    ghl_tags: ["eva-wa", "wa_interes_info"],
    preserve_fallback_count: true,
  });
}

function buildReformulationDecision(lastOutboundText) {
  return enrichDecision({
    intent: "fallback_inteligente",
    responseText: buildReformulatedResponse(lastOutboundText),
    waStage: "orientacion",
    needsHuman: false,
    createTask: false,
    ghl_tags: ["eva-wa", "wa_interes_info"],
    last_fallback_level: 2,
    preserve_fallback_count: true,
  });
}

function inboundTrackingPatch(normalized, repeatStreak) {
  return {
    last_user_inbound_normalized: normalized,
    user_inbound_repeat_count: repeatStreak,
  };
}

/**
 * @returns {{ decision: object, fallbackCount: number, academicStatePatch: object }}
 */
export function resolveFallbackTurn({
  rawText,
  decision,
  fallbackCount = 0,
  academicState = {},
  contactContext = {},
  lastOutboundText = "",
  config = {},
}) {
  const count = Number(fallbackCount) || 0;
  const repeat = detectInboundRepeat(rawText, academicState);

  if (decision?.preserve_fallback_count === true) {
    return {
      decision,
      fallbackCount: count,
      academicStatePatch: {
        ...inboundTrackingPatch(repeat.normalized, repeat.isRepeat ? repeat.streak : 0),
        last_outbound_text: decision.responseText,
        last_fallback_level: decision.last_fallback_level ?? academicState?.last_fallback_level ?? null,
      },
    };
  }

  if (isRecognizedIntent(decision?.intent, decision)) {
    return {
      decision,
      fallbackCount: 0,
      academicStatePatch: {
        fallback_count: 0,
        ...inboundTrackingPatch(repeat.normalized, 0),
        last_outbound_text: decision.responseText,
        last_fallback_level: null,
      },
    };
  }

  if (isOutOfDomainMessage(rawText)) {
    const out = buildOutOfDomainDecision();
    return {
      decision: out,
      fallbackCount: count,
      academicStatePatch: {
        ...inboundTrackingPatch(repeat.normalized, 0),
        last_outbound_text: out.responseText,
      },
    };
  }

  if (repeat.isRepeat && repeat.streak >= 2) {
    const level3 = buildLevel3Decision(contactContext);
    return {
      decision: level3,
      fallbackCount: Math.max(count, 2),
      academicStatePatch: {
        fallback_count: Math.max(count, 2),
        ...inboundTrackingPatch(repeat.normalized, repeat.streak),
        last_outbound_text: level3.responseText,
        last_fallback_level: 3,
      },
    };
  }

  if (repeat.isRepeat && repeat.streak === 1) {
    const reform = buildReformulationDecision(lastOutboundText);
    return {
      decision: reform,
      fallbackCount: count,
      academicStatePatch: {
        ...inboundTrackingPatch(repeat.normalized, repeat.streak),
        last_outbound_text: reform.responseText,
        last_fallback_level: 2,
      },
    };
  }

  const triggersFallback =
    isFallbackIntent(decision?.intent) || isDomainAmbiguousMessage(rawText);

  if (!triggersFallback) {
    return {
      decision,
      fallbackCount: count,
      academicStatePatch: inboundTrackingPatch(repeat.normalized, 0),
    };
  }

  if (count >= 2) {
    const level3 = buildLevel3Decision(contactContext);
    return {
      decision: level3,
      fallbackCount: count,
      academicStatePatch: {
        fallback_count: count,
        ...inboundTrackingPatch(repeat.normalized, 0),
        last_outbound_text: level3.responseText,
        last_fallback_level: 3,
      },
    };
  }

  if (count >= 1) {
    const level2 = buildLevel2Decision();
    const next = count + 1;
    return {
      decision: level2,
      fallbackCount: next,
      academicStatePatch: {
        fallback_count: next,
        ...inboundTrackingPatch(repeat.normalized, 0),
        last_outbound_text: level2.responseText,
        last_fallback_level: 2,
      },
    };
  }

  const level1 = buildLevel1Decision();
  const next = 1;
  return {
    decision: level1,
    fallbackCount: next,
    academicStatePatch: {
      fallback_count: next,
      ...inboundTrackingPatch(repeat.normalized, 0),
      last_outbound_text: level1.responseText,
      last_fallback_level: 1,
    },
  };
}

export function mergeAcademicStatePatch(academicState, patch) {
  if (!patch) return academicState || {};
  return { ...(academicState || {}), ...patch };
}

export { countMenuOptions, isFallbackIntent };
