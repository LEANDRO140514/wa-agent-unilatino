/**
 * EscalationPayload §13.2 — Fase 1 ítem 6 (FF_ESCALATION_V2).
 * Dedupe día calendario: America/Merida (UTC-6 fijo, sin DST).
 */

import { FSM_STATES } from "./fsm-lite.js";

export const ESCALATION_TIMEZONE = "America/Merida";

/** Merida (Yucatán) — offset fijo UTC-6 */
const MERIDA_OFFSET_MS = 6 * 60 * 60 * 1000;

export const ESCALATION_REASONS = Object.freeze([
  "human_requested",
  "ready_to_enroll",
  "payment_intent",
  "urgent_lead",
  "docs_incomplete",
  "revalidation_case",
  "career_not_offered_help",
  "rvoe_sensitive",
  "complaint",
  "low_confidence",
  "minor_case",
  "parent_request",
  "scholarship_special",
  "price_negotiation",
  "appointment",
]);

/** @type {Record<string, { tag: string, taskTitle: string, priority: string, wired: boolean }>} */
export const REASON_CONFIG = Object.freeze({
  human_requested: {
    tag: "wa_needs_human",
    taskTitle: "Contactar lead — pidió asesor",
    priority: "normal",
    wired: true,
  },
  ready_to_enroll: {
    tag: "wa_ready_to_enroll",
    taskTitle: "🔥 Lead listo para inscribirse — {{carrera}}",
    priority: "high",
    wired: true,
  },
  payment_intent: {
    tag: "wa_payment_intent",
    taskTitle: "🔥 Lead con intención de pago",
    priority: "high",
    wired: false,
  },
  urgent_lead: {
    tag: "wa_urgent",
    taskTitle: "Lead urgente — inicio {{periodo}}",
    priority: "high",
    wired: false,
  },
  docs_incomplete: {
    tag: "wa_docs_incomplete",
    taskTitle: "Revisar caso documentos — {{lead}}",
    priority: "normal",
    wired: false,
  },
  revalidation_case: {
    tag: "wa_revalidation",
    taskTitle: "Caso revalidación/equivalencias",
    priority: "normal",
    wired: true,
  },
  career_not_offered_help: {
    tag: "wa_needs_human_career_not_offered",
    taskTitle: "Orientar lead — pidió {{requestedCareerRaw}}",
    priority: "normal",
    wired: true,
  },
  rvoe_sensitive: {
    tag: "wa_rvoe_escalation",
    taskTitle: "Validar RVOE con lead",
    priority: "normal",
    wired: false,
  },
  complaint: {
    tag: "wa_complaint",
    taskTitle: "⚠️ Atender queja",
    priority: "high",
    wired: false,
  },
  low_confidence: {
    tag: "wa_low_confidence",
    taskTitle: "Retomar conversación — bot no resolvió",
    priority: "normal",
    wired: true,
  },
  minor_case: {
    tag: "wa_minor",
    taskTitle: "Caso menor de edad — contactar tutor",
    priority: "normal",
    wired: false,
  },
  parent_request: {
    tag: "wa_parent",
    taskTitle: "Atender a padre/madre de aspirante",
    priority: "normal",
    wired: false,
  },
  scholarship_special: {
    tag: "wa_scholarship_special",
    taskTitle: "Evaluar beca especial",
    priority: "normal",
    wired: true,
  },
  price_negotiation: {
    tag: "wa_price_negotiation",
    taskTitle: "Lead pide condiciones de precio",
    priority: "normal",
    wired: false,
  },
  appointment: {
    tag: "wa_appointment",
    taskTitle: "Agendar cita/visita — {{campus}}",
    priority: "normal",
    wired: false,
  },
});

const PRIORITY_OPERATIONAL = Object.freeze({
  high: { priority: "high", task_priority_label: "Alta" },
  normal: { priority: "medium", task_priority_label: "Media" },
  low: { priority: "low", task_priority_label: "Baja" },
});

export function isEscalationV2Enabled(config) {
  return config?.ffEscalationV2 !== false;
}

/**
 * @param {string} nowIso
 * @returns {string} YYYY-MM-DD en America/Merida
 */
export function getLocalDayKey(nowIso) {
  const ms = Date.parse(nowIso || "");
  if (!Number.isFinite(ms)) return "";
  const local = new Date(ms - MERIDA_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, "0");
  const d = String(local.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Inicio del día local Merida como ISO UTC (medianoche Merida = 06:00Z).
 * @param {string} nowIso
 * @returns {string}
 */
export function getLocalDayStartIso(nowIso) {
  const key = getLocalDayKey(nowIso);
  if (!key) return "";
  return `${key}T06:00:00.000Z`;
}

export function buildTaskDedupeKey(reason, nowIso) {
  const day = getLocalDayKey(nowIso);
  return `task:${reason}:${day}`;
}

function normalizeNoteText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function interpolateTaskTitle(template, academicState = {}, decision = {}) {
  const career =
    academicState?.current_career ||
    academicState?.last_career ||
    decision.requested_career_raw ||
    "por confirmar";
  const campus = academicState?.campus || "campus";
  const lead = academicState?.lead_name || decision.lead_name || "lead";
  const periodo = academicState?.start_period || "próximo periodo";
  return String(template || "")
    .replace(/\{\{carrera\}\}/gi, career)
    .replace(/\{\{requestedCareerRaw\}\}/gi, decision.requested_career_raw || career)
    .replace(/\{\{campus\}\}/gi, campus)
    .replace(/\{\{lead\}\}/gi, lead)
    .replace(/\{\{periodo\}\}/gi, periodo);
}

/**
 * Nota 2–3 líneas desde academic_state (sin inventar datos).
 */
export function buildEscalationNote(academicState = {}, decision = {}) {
  const lines = [];
  const career = academicState?.current_career || academicState?.last_career;
  if (career) lines.push(`Carrera: ${career}`);
  const modality = academicState?.modality || academicState?.last_modality;
  if (modality) lines.push(`Modalidad: ${modality}`);
  if (decision.requested_career_raw) {
    lines.push(`Demanda: ${decision.requested_career_raw}`);
  } else if (decision.intent) {
    lines.push(`Intent: ${decision.intent}`);
  }
  if (decision.waStage && lines.length < 3) {
    lines.push(`Estado: ${decision.waStage}`);
  }
  return lines.slice(0, 3).join("\n") || "Escalación humana — Eva WA";
}

export function applyNoCallTitle(taskTitle, tags = []) {
  const title = String(taskTitle || "");
  if (!tags.includes("wa_no_call")) return title;
  if (title.toLowerCase().includes("solo whatsapp")) return title;
  return `${title} — solo WhatsApp, no llamar`;
}

/**
 * Resuelve reason cableado (P2) desde la decisión determinística.
 * @returns {string|null}
 */
export function resolveEscalationReason(decision = {}, _context = {}) {
  const tags = decision.ghl_tags || [];
  const explicit = decision.escalation_reason;
  if (explicit && REASON_CONFIG[explicit]?.wired) {
    return explicit;
  }

  if (tags.includes("wa_low_confidence")) {
    return "low_confidence";
  }

  if (decision.not_offered_insistence === true) {
    return "career_not_offered_help";
  }

  if (decision.escalation_reason === "ready_to_enroll") {
    return "ready_to_enroll";
  }

  if (decision.intent === "humano" && !tags.includes("wa_low_confidence")) {
    return "human_requested";
  }

  if (decision.intent === "revalidacion_estudios" && decision.needsHuman) {
    return "revalidation_case";
  }

  if (decision.intent === "beca" && decision.createTask) {
    return "scholarship_special";
  }

  if (decision.intent === "promociones_descuentos" && decision.needsHuman) {
    return "scholarship_special";
  }

  if (
    (decision.intent === "duda_test" || decision.intent === "post_test") &&
    decision.createTask
  ) {
    return "low_confidence";
  }

  return null;
}

export function buildEscalationPayload({ reason, academicState = {}, decision = {}, nowIso }) {
  const cfg = REASON_CONFIG[reason];
  if (!cfg || !cfg.wired) return null;

  const note = buildEscalationNote(academicState, decision);
  const taskTitle = applyNoCallTitle(
    interpolateTaskTitle(cfg.taskTitle, academicState, decision),
    [...new Set([...(decision.ghl_tags || []), cfg.tag])],
  );

  return {
    needsHuman: true,
    reason,
    tag: cfg.tag,
    taskTitle,
    note,
    priority: cfg.priority,
    dedupeKey: buildTaskDedupeKey(reason, nowIso),
  };
}

export function shouldSkipEscalationTask(priorLogs, dedupeKey) {
  if (!dedupeKey || !Array.isArray(priorLogs)) return false;
  return priorLogs.some((row) => {
    if (row.payload?.escalation_dedupe_key === dedupeKey) return true;
    if (row.escalation_dedupe_key === dedupeKey) return true;
    return false;
  });
}

export function shouldSkipEscalationNote(priorLogs, noteText) {
  if (!noteText || !Array.isArray(priorLogs)) return false;
  const norm = normalizeNoteText(noteText);
  return priorLogs.some((row) => {
    const existing = row.payload?.note ?? row.would_add_note;
    if (!existing) return false;
    return normalizeNoteText(String(existing)) === norm;
  });
}

/** F5 — HUMANO abierto sin cierre: cero tasks de escalación. */
export function shouldBlockEscalationInOpenHumano(contactContext = {}, config = {}) {
  if (config?.ffFsm === false) return false;
  if (contactContext.fsm_state !== FSM_STATES.HUMANO) return false;
  if (contactContext.closed_by_agent === true) return false;
  return true;
}

export function applyEscalationPayloadToDecision(decision, payload) {
  if (!payload) return decision;

  const tags = [...new Set([...(decision.ghl_tags || []), payload.tag])];
  const op = PRIORITY_OPERATIONAL[payload.priority] || PRIORITY_OPERATIONAL.normal;

  return {
    ...decision,
    needsHuman: payload.needsHuman,
    createTask: true,
    escalation_required: true,
    escalation_payload: payload,
    escalation_reason: payload.reason,
    escalation_dedupe_key: payload.dedupeKey,
    task_title: payload.taskTitle,
    ghl_tags: tags,
    ghl_note: payload.note,
    priority: op.priority,
    task_priority_label: op.task_priority_label,
  };
}
