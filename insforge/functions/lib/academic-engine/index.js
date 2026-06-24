import { SOURCE_TRUTH_VERSION } from "./truth.js";
import { normalizeInput } from "./normalizer.js";
import { extractEntities } from "./entityExtractor.js";
import { detectAcademicIntent } from "./intentEngine.js";
import { buildAcademicResponse } from "./responseBuilder.js";
import { EMPTY_ACADEMIC_STATE, updateAcademicState } from "./stateManager.js";

export { EMPTY_ACADEMIC_STATE };

/**
 * Resolve an academic message using SOURCE_OF_TRUTH only.
 * @param {string} rawText
 * @param {object} prevState
 * @param {object} options
 */
export function resolveAcademicMessage(rawText, prevState = {}, options = {}) {
  const warnings = [];
  const normalized = normalizeInput(rawText);

  if (!normalized) {
    return {
      ok: false,
      academic_intent: "fallback",
      entities: {},
      response: "",
      confidence: 0,
      source_context: "empty_input",
      pending_validation_used: false,
      warnings: ["empty_input"],
      state: { ...EMPTY_ACADEMIC_STATE, ...prevState },
      source_truth_version: SOURCE_TRUTH_VERSION,
    };
  }

  const state = { ...EMPTY_ACADEMIC_STATE, ...prevState };
  const entities = extractEntities(normalized);
  const academic_intent = detectAcademicIntent(normalized, entities, state);
  const built = buildAcademicResponse(academic_intent, entities, state, normalized);
  const newState = updateAcademicState(state, academic_intent, entities, normalized);

  if (options.debug) {
    warnings.push(`intent=${academic_intent}`);
  }

  return {
    ok: true,
    academic_intent,
    entities,
    response: built.text,
    confidence: built.confidence,
    source_context: built.source_context,
    pending_validation_used: built.pending_validation_used === true,
    warnings,
    state: newState,
    source_truth_version: SOURCE_TRUTH_VERSION,
  };
}
