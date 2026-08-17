/**
 * Eva Contract Adapter v1.
 *
 * PURE LOGIC: sin DB, sin HTTP, sin LLM, sin filesystem, sin environment
 * reads, sin side effects. No conoce ni produce IDs externos (GHL, YCloud,
 * calendar, owners, assignees, dedupe keys de proveedor): el adapter solo
 * lee el estado final ya decidido por el runtime de Eva y lo traduce al
 * contrato eva-v1, sin reclasificar intent ni re-inferir semántica desde
 * texto libre.
 *
 * Input esperado (todo opcional, todo ya existente en el runtime — el
 * adapter no exige IDs externos para funcionar):
 *   - decision / enrichedDecision: { responseText, intent, needsHuman,
 *     escalation_reason, waStage, ... } — el estado FINAL de la conversación.
 *   - academicState: { current_career, current_modality, last_career,
 *     last_objection, ... } — estado estructurado del academic-engine.
 *   - academicMeta: metadata opcional del academic-engine (no se usa para
 *     inventar confidence de hechos que no la traen de forma nativa).
 *   - latestUserMessage: string opcional. En intent.evidence se copia
 *     tal cual. En qualification.evidence solo entra si el mensaje
 *     actual, evaluado solo, reproduce la misma qualification canónica.
 */

import {
  canonicalizeCareerModality,
  canonicalizeCareerModalityFromText,
} from "./academic-canonicalizer.js";

export const EVA_CONTRACT_VERSION = "eva-v1";

/**
 * Intents conversacionales de Eva más controles explícitos del canal.
 * No se importan listas GHL/routing/journey/lead-score.
 *
 * "ambiguo" y "fallback_inteligente" son fallbacks declarados — "ambiguous".
 * Ausente o no reconocido — "unknown".
 *
 * No hay confidence nativa para el intent WA: intent.confidence es null en v1.
 */
const EVA_CONVERSATIONAL_INTENTS = new Set([
  "agradecimiento",
  "despedida",
  "sin_texto",
  "duda_test",
  "post_test",
  "humano",
  "beca",
  "no_se_que_estudiar",
  "carrera_interes",
  "carreras_disponibles",
  "carreras_online",
  "revalidacion_estudios",
  "niveles_no_principales",
  "ubicacion_campus",
  "rvoe_reconocimiento",
  "objecion_precio",
  "promociones_descuentos",
  "carrera_no_ofertada",
]);

const CHANNEL_CONTROL_INTENTS = new Set([
  "opt_out",
  "opt_out_confirmacion",
  "re_opt_in",
]);

const AMBIGUOUS_WA_INTENTS = new Set(["ambiguo", "fallback_inteligente"]);

/**
 * Mapeo conservador de escalation_reason (ESCALATION_REASONS existente en
 * escalation-payload.js) hacia las razones del contrato. Motivos con
 * connotación de política/cumplimiento (menor de edad, tutor, RVOE,
 * revalidación) se mapean a "policy"; el resto de razones "wired" que no
 * están explícitas en el spec caen en "other".
 */
const ESCALATION_REASON_MAP = {
  human_requested: "explicit_request",
  complaint: "frustration",
  low_confidence: "low_confidence",
  career_not_offered_help: "out_of_scope",
  minor_case: "policy",
  parent_request: "policy",
  rvoe_sensitive: "policy",
  revalidation_case: "policy",
  ready_to_enroll: "other",
  payment_intent: "other",
  urgent_lead: "other",
  docs_incomplete: "other",
  scholarship_special: "other",
  price_negotiation: "other",
  appointment: "other",
};

const MEMORY_ALLOWLIST = Object.freeze([
  "career_key",
  "modality_key",
  "admission_stage",
  "last_intent",
  "last_objection",
  "suggested_next_step",
]);

function buildEvidence(latestUserMessage) {
  const text = typeof latestUserMessage === "string" ? latestUserMessage.trim() : "";
  if (!text) return [];
  return [{ text, source_message_index: 0 }];
}

function resolveIntent(decision, evidence) {
  const key = decision?.intent || null;

  let status;
  if (!key) {
    status = "unknown";
  } else if (AMBIGUOUS_WA_INTENTS.has(key)) {
    status = "ambiguous";
  } else if (EVA_CONVERSATIONAL_INTENTS.has(key) || CHANNEL_CONTROL_INTENTS.has(key)) {
    status = "known";
  } else {
    status = "unknown";
  }

  return {
    key,
    status,
    // No hay confidence nativa para el intent de nivel WA — ver nota arriba.
    confidence: null,
    evidence,
  };
}

function buildQualificationEvidence(latestUserMessage, qualification) {
  if (!qualification.career_key || !qualification.modality_key) return [];
  const independent = canonicalizeCareerModalityFromText(latestUserMessage);
  if (
    independent.career_key !== qualification.career_key ||
    independent.modality_key !== qualification.modality_key
  ) {
    return [];
  }
  return buildEvidence(latestUserMessage);
}

function resolveQualification(academicState, latestUserMessage) {
  const canon = canonicalizeCareerModality({
    careerRaw: academicState?.current_career ?? null,
    modalityRaw: academicState?.current_modality ?? null,
  });

  const qualification = {
    career_key: canon.career_key,
    modality_key: canon.modality_key,
    status: canon.status,
    // Match determinístico contra catálogo fijo — no hay confidence nativa.
    confidence: null,
    evidence: [],
  };
  qualification.evidence = buildQualificationEvidence(latestUserMessage, qualification);
  return qualification;
}

function resolveHandoffReason(decision) {
  const mapped = ESCALATION_REASON_MAP[decision?.escalation_reason];
  if (mapped) return mapped;

  // escalation-payload aplica el reason solo si FF_ESCALATION_V2 está activo;
  // needsHuman puede llegar true sin escalation_reason poblado (paths legacy
  // de buildIntentDecision). Señal estructurada conservadora de respaldo:
  // el propio intent "humano" es la petición explícita de asesor.
  if (decision?.intent === "humano") return "explicit_request";

  return "other";
}

function resolveHandoff(decision) {
  const requested = decision?.needsHuman === true;
  return {
    requested,
    reason: requested ? resolveHandoffReason(decision) : null,
    // No exportamos detalles GHL/operativos en note — conservador en v1.
    note: null,
  };
}

function buildMemoryUpdates({ decision, academicState, qualification }) {
  const updates = [];

  if (qualification.career_key) {
    updates.push({ field: "career_key", value: qualification.career_key });
  }
  if (qualification.modality_key) {
    updates.push({ field: "modality_key", value: qualification.modality_key });
  }
  if (decision?.intent) {
    updates.push({ field: "last_intent", value: decision.intent });
  }
  if (academicState?.last_objection) {
    updates.push({ field: "last_objection", value: academicState.last_objection });
  }
  // admission_stage: copia directa de waStage (sin reclasificar) — solo
  // cuando el runtime ya trae ese hecho estructurado.
  if (decision?.waStage) {
    updates.push({ field: "admission_stage", value: decision.waStage });
  }

  return updates;
}

function buildProposedActions({ handoff, qualification, decision }) {
  const actions = [];

  if (handoff.requested) actions.push("handoff_human");
  if (qualification.status === "known") actions.push("qualification_complete");
  // Única señal estructurada inequívoca de agendamiento disponible hoy:
  // escalation_reason "appointment" (ESCALATION_REASONS existente).
  if (decision?.escalation_reason === "appointment") actions.push("schedule_requested");

  if (actions.length === 0) actions.push("no_action");
  return actions;
}

/**
 * Construye el Eva Contract v1 a partir del estado final ya decidido por
 * el runtime de Eva. No reclasifica, no llama LLM, no produce IDs externos.
 *
 * @param {{
 *   decision?: object,
 *   academicState?: object,
 *   academicMeta?: object,
 *   latestUserMessage?: string|null,
 * }} input
 */
export function buildEvaContract({
  decision = {},
  academicState = {},
  academicMeta = null,
  latestUserMessage = null,
} = {}) {
  const evidence = buildEvidence(latestUserMessage);

  const intent = resolveIntent(decision, evidence);
  const qualification = resolveQualification(academicState, latestUserMessage);
  const handoff = resolveHandoff(decision);
  const memory_updates = buildMemoryUpdates({ decision, academicState, qualification });
  const proposed_actions = buildProposedActions({ handoff, qualification, decision });

  return {
    contract_version: EVA_CONTRACT_VERSION,
    reply: typeof decision?.responseText === "string" ? decision.responseText : "",
    intent,
    qualification,
    handoff,
    memory_updates,
    proposed_actions,
  };
}

export const EVA_CONTRACT_MEMORY_ALLOWLIST = MEMORY_ALLOWLIST;
