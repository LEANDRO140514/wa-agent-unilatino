/**
 * FASE 9B — Core-engine shadow (Costura 1, paso 2 de 3).
 *
 * Ejecuta el "juez" puro de @curdeeclau/algorithmus-core-engine
 * (Validator → DecisionMatrix → FSMTransitionChecker → HardGate)
 * EN PARALELO a la decisión determinista de Eva, y registra la
 * comparación en wa_core_shadow_log.
 *
 * Invariantes de este módulo:
 *   SHADOW-1: NUNCA modifica la decisión ni la respuesta de Eva.
 *   SHADOW-2: Cualquier error se degrada a warning; jamás lanza al handler.
 *   SHADOW-3: Solo corre con FF_CORE_SHADOW=true (opt-in explícito).
 *
 * Mapeo de estados (decisión (b) de Costura 1: Eva adopta los
 * CONTRATOS de core y mapea sus estados; la generalización del FSM
 * de core queda para la fase 9c):
 *   SALUDO_INICIAL → INIT
 *   CONSULTA       → QUALIFYING
 *   HUMANO         → HUMAN_HANDOVER
 *   NO_CONTACT     → (skip: opt-out regulatorio, no hay output que juzgar)
 *
 * Heurística de grounding (v1, refinar en 9c): las respuestas
 * deterministas de Eva salen de canónicas/SOT, por lo que se
 * consideran grounded por construcción cuando hay intent resuelto.
 *
 * Vendor: insforge/functions/vendor/core-pure (ver VENDOR-STAMP.json).
 */

import {
  FSMEngine,
  FSMTransitionChecker,
  BasicAIValidator,
  BasicDecisionMatrix,
  BasicHardGate,
  getAllowedActionsForState,
} from "../../vendor/core-pure/pure.js";

export const EVA_TO_CORE_STATE = Object.freeze({
  SALUDO_INICIAL: "INIT",
  CONSULTA: "QUALIFYING",
  HUMANO: "HUMAN_HANDOVER",
});

const DETERMINISTIC_CONFIDENCE = 1.0;

const validator = new BasicAIValidator();
const matrix = new BasicDecisionMatrix();
const gate = new BasicHardGate();
const transitionChecker = new FSMTransitionChecker(new FSMEngine());

/**
 * Deriva el desenlace real de Eva para compararlo con el veredicto de core.
 * @returns {"escalated"|"responded"|"silent"}
 */
export function deriveEvaOutcome(decision) {
  if (decision?.fsm_state === "HUMANO" || decision?.createTask === true) {
    return "escalated";
  }
  if (typeof decision?.responseText === "string" && decision.responseText.trim().length > 0) {
    return "responded";
  }
  return "silent";
}

/**
 * Corre el juez de core sobre la decisión de Eva. Puro: no toca red ni DB.
 * @returns {object} veredicto { skipped } | { core_*, eva_outcome, agreement, disagreement_reason }
 */
export async function evaluateCoreShadow({
  evaState,
  userMessage,
  decision,
}) {
  const currentEvaState = evaState || "SALUDO_INICIAL";

  if (currentEvaState === "NO_CONTACT") {
    return { skipped: true, skip_reason: "no_contact_optout" };
  }

  const coreState = EVA_TO_CORE_STATE[currentEvaState] || "INIT";
  const allowedActions = getAllowedActionsForState(coreState);
  const fsmContext = {
    currentState: coreState,
    message: userMessage || "",
    allowedActions,
  };

  const responseText = decision?.responseText || "";
  const intent = decision?.intent || null;
  const groundingReferences = intent
    ? [{ id: String(intent), source: "eva-deterministic" }]
    : [];

  const validation = await validator.validate({
    aiOutput: { text: responseText, confidence: DETERMINISTIC_CONFIDENCE },
    groundingReferences,
    fsmContext,
    expectedAction: "generate_reply",
  });

  const coreDecision = matrix.decide({ validation });
  const fsmTransition = transitionChecker.check({ context: fsmContext });
  const gateResult = gate.authorize({
    validation,
    decision: coreDecision,
    fsmTransition,
  });

  const evaOutcome = deriveEvaOutcome(decision);

  let agreement = false;
  let disagreementReason = null;
  if (evaOutcome === "escalated" && coreDecision.action === "handover") {
    agreement = true;
  } else if (evaOutcome === "responded" && gateResult.allowed && coreDecision.action === "accept") {
    agreement = true;
  } else if (evaOutcome === "silent" && !gateResult.allowed) {
    agreement = true;
  } else {
    disagreementReason = `eva_${evaOutcome}_core_${gateResult.allowed ? coreDecision.action : "blocked"}`;
  }

  return {
    skipped: false,
    eva_state: currentEvaState,
    core_state: coreState,
    eva_outcome: evaOutcome,
    core_flags: validation.flags,
    core_reason_codes: validation.reasonCodes,
    core_action: coreDecision.action,
    core_transition_allowed: fsmTransition.allowed,
    core_transition_to: fsmTransition.toState || null,
    core_gate_allowed: gateResult.allowed,
    core_gate_reason: gateResult.reason || null,
    agreement,
    disagreement_reason: disagreementReason,
  };
}

/**
 * Punto de entrada para el handler: evalúa y persiste la comparación.
 * Fail-safe integral (SHADOW-2): nunca lanza.
 */
export async function maybeLogCoreShadowComparison({
  config,
  client,
  evaState,
  userMessage,
  decision,
  inboundMessageId,
  normalizedPhone,
}) {
  if (config?.ffCoreShadow !== true) {
    return { logged: false, reason: "flag_off" };
  }

  try {
    const verdict = await evaluateCoreShadow({ evaState, userMessage, decision });
    if (verdict.skipped) {
      return { logged: false, reason: verdict.skip_reason };
    }

    const { error } = await client.database.from("wa_core_shadow_log").insert({
      inbound_message_id: inboundMessageId || null,
      normalized_phone: normalizedPhone || null,
      eva_state: verdict.eva_state,
      core_state: verdict.core_state,
      eva_intent: decision?.intent || null,
      eva_outcome: verdict.eva_outcome,
      eva_response: decision?.responseText || null,
      core_flags: verdict.core_flags,
      core_reason_codes: verdict.core_reason_codes,
      core_action: verdict.core_action,
      core_transition_allowed: verdict.core_transition_allowed,
      core_transition_to: verdict.core_transition_to,
      core_gate_allowed: verdict.core_gate_allowed,
      core_gate_reason: verdict.core_gate_reason,
      agreement: verdict.agreement,
      disagreement_reason: verdict.disagreement_reason,
      vendor_commit: "e854708",
      mode: "shadow",
    });

    if (error) {
      console.warn("[core_shadow_error]", JSON.stringify({
        error_type: "core_shadow_log_failed",
        message: String(error.message || error).slice(0, 200),
      }));
      return { logged: false, reason: "insert_error" };
    }
    return { logged: true, agreement: verdict.agreement };
  } catch (err) {
    console.warn("[core_shadow_error]", JSON.stringify({
      error_type: "core_shadow_failed",
      message: String(err?.message || err).slice(0, 200),
    }));
    return { logged: false, reason: "exception" };
  }
}
