/**
 * OPT-OUT / NO_CONTACT (Maestro D22, Fase 1 ítem 2).
 * Matcher determinístico estricto + confirmación ambigua + re-opt-in.
 */

export const OPT_OUT_CONFIRMATION_QUESTION =
  "¿Prefieres que ya no te enviemos mensajes?";

export const OPT_OUT_EXECUTED_RESPONSE =
  "Entendido, no te enviaremos más mensajes. Si algún día quieres retomar, aquí estaremos 👍";

export const RE_OPT_IN_ACK_RESPONSE =
  "Perfecto 😊 Retomamos por aquí. ¿En qué te puedo ayudar?";

const EXPLICIT_OPT_OUT_PHRASES = [
  "ya no me escriban",
  "ya no me escribas",
  "no me escriban",
  "no me escribas",
  "no me contacten",
  "no me contactes",
  "no me manden mas mensajes",
  "no me manden más mensajes",
  "no me mandes mas mensajes",
  "no me mandes más mensajes",
  "quiero darme de baja",
  "dejen de mandarme mensajes",
  "deja de mandarme mensajes",
  "borren mi numero",
  "borren mi número",
  "borra mi numero",
  "borra mi número",
  "stop",
  "unsubscribe",
  "darme de baja",
  "baja de mensajes",
  "no quiero mas mensajes",
  "no quiero más mensajes",
];

/** Frases cortas exactas de baja (normalizadas). */
const EXPLICIT_OPT_OUT_EXACT = new Set(["baja", "stop", "unsubscribe"]);

const AMBIGUOUS_OPT_OUT_PHRASES = [
  "ya no quiero",
  "ya no me interesa",
  "no me interesa ya",
  "no quiero seguir recibiendo",
];

const RE_OPT_IN_PHRASES = [
  "si quiero informacion de nuevo",
  "sí quiero información de nuevo",
  "si quiero info de nuevo",
  "sí quiero info de nuevo",
  "reactivenme",
  "reactívenme",
  "reactivar",
  "quiero retomar",
  "volver a recibir informacion",
  "volver a recibir información",
  "si quiero que me escriban de nuevo",
  "sí quiero que me escriban de nuevo",
];

const CONFIRM_YES_PHRASES = [
  "si",
  "sí",
  "yes",
  "confirmo",
  "correcto",
  "exacto",
  "afirmativo",
  "ok si",
  "ok sí",
  "dale si",
  "dale sí",
  "por favor si",
  "por favor sí",
  "si por favor",
  "sí por favor",
  "ya no quiero mensajes",
  "no me escriban",
  "no me escribas",
];

const CONFIRM_NO_PHRASES = [
  "no",
  "nop",
  "nel",
  "no gracias",
  "nah",
  "negativo",
  "no quiero",
];

export function normalizeOptOutText(raw) {
  return String(raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesPhrase(text, phrase) {
  const n = normalizeOptOutText(text);
  const p = normalizeOptOutText(phrase);
  if (!p) return false;
  if (EXPLICIT_OPT_OUT_EXACT.has(p)) {
    return n === p || n.startsWith(`${p} `) || n.endsWith(` ${p}`) || n.includes(` ${p} `);
  }
  return n.includes(p);
}

function matchesAny(text, phrases) {
  return phrases.some((p) => includesPhrase(text, p));
}

function isExactOrSingleToken(text, tokens) {
  const n = normalizeOptOutText(text);
  if (!n) return false;
  return tokens.some((t) => n === t || n === `${t}.`);
}

export function isExplicitOptOut(rawText) {
  if (!rawText || !String(rawText).trim()) return false;
  return matchesAny(rawText, EXPLICIT_OPT_OUT_PHRASES);
}

export function isAmbiguousOptOut(rawText) {
  if (!rawText || !String(rawText).trim()) return false;
  if (isExplicitOptOut(rawText)) return false;
  return matchesAny(rawText, AMBIGUOUS_OPT_OUT_PHRASES);
}

export function isReOptIn(rawText) {
  if (!rawText || !String(rawText).trim()) return false;
  return matchesAny(rawText, RE_OPT_IN_PHRASES);
}

export function isOptOutConfirmationYes(rawText) {
  if (!rawText) return false;
  return matchesAny(rawText, CONFIRM_YES_PHRASES) || isExactOrSingleToken(rawText, ["si", "sí", "yes"]);
}

export function isOptOutConfirmationNo(rawText) {
  if (!rawText) return false;
  return isExactOrSingleToken(rawText, CONFIRM_NO_PHRASES) || matchesAny(rawText, CONFIRM_NO_PHRASES);
}

/**
 * @param {object} params
 * @param {string} params.rawText
 * @param {object} params.contactContext - includes fsm_state
 * @param {object} params.academicState
 * @returns {{ action: string, decision?: object, academicStatePatch?: object, ghlSuppress?: boolean }}
 */
export function resolveOptOutTurn({ rawText, contactContext = {}, academicState = {} }) {
  const pending = academicState?.pending_opt_out_confirmation === true;
  const fsmState = contactContext?.fsm_state || null;

  if (pending) {
    if (isOptOutConfirmationYes(rawText)) {
      return {
        action: "execute_opt_out",
        academicStatePatch: { pending_opt_out_confirmation: null },
      };
    }
    if (isOptOutConfirmationNo(rawText)) {
      return {
        action: "cancel_confirmation",
        academicStatePatch: { pending_opt_out_confirmation: null },
      };
    }
    return {
      action: "ask_confirmation",
      decision: buildOptOutConfirmationDecision(),
      academicStatePatch: { pending_opt_out_confirmation: true },
    };
  }

  if (fsmState === "NO_CONTACT" && isReOptIn(rawText)) {
    return {
      action: "re_opt_in",
      decision: buildReOptInDecision(),
      academicStatePatch: { pending_opt_out_confirmation: null },
    };
  }

  if (isExplicitOptOut(rawText)) {
    return {
      action: "execute_opt_out",
      academicStatePatch: { pending_opt_out_confirmation: null },
    };
  }

  if (isAmbiguousOptOut(rawText)) {
    return {
      action: "ask_confirmation",
      decision: buildOptOutConfirmationDecision(),
      academicStatePatch: { pending_opt_out_confirmation: true },
    };
  }

  if (fsmState === "NO_CONTACT") {
    return { action: "reactive_no_contact", ghlSuppress: true };
  }

  return { action: "none" };
}

export function buildOptOutDecision(messageText = "") {
  return enrichOptOutDecision({
    intent: "opt_out",
    responseText: OPT_OUT_EXECUTED_RESPONSE,
    waStage: "no_contact",
    fsm_state: "NO_CONTACT",
    needsHuman: false,
    createTask: false,
    ghl_note: `Lead solicitó opt-out WhatsApp (D22). Mensaje: ${String(messageText || "").slice(0, 200)}`,
    ghl_tags: ["eva-wa", "wa_no_contact"],
  });
}

export function buildOptOutConfirmationDecision() {
  return enrichOptOutDecision({
    intent: "opt_out_confirmacion",
    responseText: OPT_OUT_CONFIRMATION_QUESTION,
    waStage: "opt_out_pendiente",
    needsHuman: false,
    createTask: false,
    ghlSuppress: true,
  });
}

export function buildReOptInDecision() {
  return enrichOptOutDecision({
    intent: "re_opt_in",
    responseText: RE_OPT_IN_ACK_RESPONSE,
    waStage: "consulta",
    fsm_state: null,
    needsHuman: false,
    createTask: false,
    ghl_tags: ["eva-wa"],
    ghl_tags_to_remove: ["wa_no_contact"],
    ghl_note: "Lead solicitó reactivar contacto WhatsApp (opt-out revertido).",
  });
}

function enrichOptOutDecision(decision) {
  return {
    ...decision,
    priority: "low",
    escalation_required: false,
    operational_owner: "Equipo de Admisiones Universidad Latino",
    business_hours_label: "Lunes a viernes 9:00-18:00, sábado 9:00-13:00",
    after_hours_logic_enabled: false,
    task_priority_label: "Baja",
    menu_option_detected: false,
    menu_option_value: null,
  };
}

export function isNoContactFeatureEnabled(config) {
  return config?.ffNoContact !== false;
}

export function mergeAcademicStatePatch(academicState, patch) {
  if (!patch) return academicState || {};
  return { ...(academicState || {}), ...patch };
}
