/**
 * FSM lite — Fase 1 ítem 3 (Maestro §10, spec E2).
 * Estados: SALUDO_INICIAL | CONSULTA | HUMANO | NO_CONTACT
 */

export const FSM_STATES = Object.freeze({
  SALUDO_INICIAL: "SALUDO_INICIAL",
  CONSULTA: "CONSULTA",
  HUMANO: "HUMANO",
  NO_CONTACT: "NO_CONTACT",
});

/** @type {ReadonlySet<string>} */
export const WA_STAGE_SALUDO_INICIAL = new Set([
  "inicio",
  "pendiente_texto",
  "orientacion",
  "ambiguo",
  "cierre_positivo",
  "despedida",
]);

/** @type {ReadonlySet<string>} */
export const WA_STAGE_CONSULTA = new Set([
  "carrera_interes",
  "carreras_exploracion",
  "carreras_online",
  "ubicacion_consultada",
  "rvoe_consultado",
  "objecion_precio",
  "promocion_interes",
  "nivel_no_principal",
  "revalidacion_interes",
  "carrera_no_ofertada",
  "test_recomendado",
  "consulta",
  "opt_out_pendiente",
]);

/** @type {ReadonlySet<string>} */
export const WA_STAGE_HUMANO = new Set([
  "asesor_requerido",
  "soporte_test",
  "post_test",
  "beca_interes",
]);

/** @type {ReadonlySet<string>} */
export const WA_STAGE_NO_CONTACT = new Set(["no_contact"]);

export const HUMAN_RESET_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Map wa_stage → fsm_state (gap_fase1.md D1). Unknown → CONSULTA.
 * Never maps over an existing NO_CONTACT fsm_state (F2).
 *
 * @param {string|null|undefined} waStage
 * @param {string|null|undefined} currentFsmState
 * @returns {string}
 */
export function mapWaStageToFsmState(waStage, currentFsmState = null) {
  if (currentFsmState === FSM_STATES.NO_CONTACT) {
    return FSM_STATES.NO_CONTACT;
  }
  const stage = String(waStage || "").trim().toLowerCase();
  if (!stage) return FSM_STATES.CONSULTA;
  if (WA_STAGE_NO_CONTACT.has(stage)) return FSM_STATES.NO_CONTACT;
  if (WA_STAGE_SALUDO_INICIAL.has(stage)) return FSM_STATES.SALUDO_INICIAL;
  if (WA_STAGE_HUMANO.has(stage)) return FSM_STATES.HUMANO;
  if (WA_STAGE_CONSULTA.has(stage)) return FSM_STATES.CONSULTA;
  return FSM_STATES.CONSULTA;
}

/**
 * @param {object|null|undefined} waStageSets
 * @returns {string[]}
 */
export function listUnmappedWaStagesForBackfill(allStages = []) {
  const known = new Set([
    ...WA_STAGE_SALUDO_INICIAL,
    ...WA_STAGE_CONSULTA,
    ...WA_STAGE_HUMANO,
    ...WA_STAGE_NO_CONTACT,
  ]);
  return [...new Set(allStages.map((s) => String(s || "").trim().toLowerCase()).filter(Boolean))]
    .filter((s) => !known.has(s))
    .sort();
}

export function isFsmFeatureEnabled(config) {
  return config?.ffFsm !== false;
}

/**
 * Lazy TTL reset (F4) — no cron; evaluated on inbound only.
 *
 * @param {object} contactRow - fsm_state, closed_by_agent, updated_at
 * @param {string} nowIso
 * @returns {null | { contactContextPatch: object, persistPatch: object, academicStatePatch?: object }}
 */
export function evaluateLazyHumanReset(contactRow, nowIso) {
  if (!contactRow) return null;
  if (contactRow.fsm_state !== FSM_STATES.HUMANO) return null;
  if (contactRow.closed_by_agent !== true) return null;

  const updatedAtMs = Date.parse(contactRow.updated_at || "");
  const nowMs = Date.parse(nowIso || "");
  if (!Number.isFinite(updatedAtMs) || !Number.isFinite(nowMs)) return null;
  if (nowMs - updatedAtMs < HUMAN_RESET_TTL_MS) return null;

  return {
    contactContextPatch: {
      fsm_state: FSM_STATES.SALUDO_INICIAL,
      closed_by_agent: false,
      fallback_count: 0,
    },
    persistPatch: {
      fsm_state: FSM_STATES.SALUDO_INICIAL,
      closed_by_agent: false,
      fallback_count: 0,
    },
    academicStatePatch: { fallback_count: 0 },
  };
}

/**
 * @param {object} params
 * @returns {object} patch for decision (fsm_state, closed_by_agent)
 */
export function computeFsmTransition({
  contactContext = {},
  decision = {},
  isNewContact = false,
  lazyResetApplied = false,
  config = {},
}) {
  if (!isFsmFeatureEnabled(config)) return {};

  const current = contactContext.fsm_state || null;

  if (current === FSM_STATES.NO_CONTACT || decision.fsm_state === FSM_STATES.NO_CONTACT) {
    return {};
  }

  if (lazyResetApplied) {
    return {
      fsm_state: FSM_STATES.CONSULTA,
      closed_by_agent: false,
    };
  }

  if (decision.needsHuman === true) {
    return {
      fsm_state: FSM_STATES.HUMANO,
      closed_by_agent: false,
    };
  }

  if (current === FSM_STATES.HUMANO) {
    return { fsm_state: FSM_STATES.HUMANO };
  }

  if (isNewContact || current == null || current === FSM_STATES.SALUDO_INICIAL) {
    return { fsm_state: FSM_STATES.CONSULTA };
  }

  return { fsm_state: current || FSM_STATES.CONSULTA };
}

/**
 * At start of first inbound, logical state before response (test / trace hook).
 */
export function resolveInboundFsmStateAtStart(contactContext = {}) {
  if (contactContext.fsm_state === FSM_STATES.NO_CONTACT) {
    return FSM_STATES.NO_CONTACT;
  }
  if (contactContext.fsm_state) {
    return contactContext.fsm_state;
  }
  return FSM_STATES.SALUDO_INICIAL;
}

/**
 * F5 — while HUMANO and not closed: no re-escalation / tasks.
 */
export function applyHumanoBehaviorGate(decision, contactContext = {}, config = {}) {
  if (!isFsmFeatureEnabled(config)) return decision;
  if (contactContext.fsm_state !== FSM_STATES.HUMANO) return decision;
  if (contactContext.closed_by_agent === true) return decision;

  return {
    ...decision,
    createTask: false,
    needsHuman: false,
    fsm_humano_gate_applied: true,
  };
}

export function mergeFsmPatchIntoDecision(decision, fsmPatch) {
  if (!fsmPatch || Object.keys(fsmPatch).length === 0) return decision;
  return { ...decision, ...fsmPatch };
}

export function mergeAcademicStatePatch(academicState, patch) {
  if (!patch) return academicState || {};
  return { ...(academicState || {}), ...patch };
}
