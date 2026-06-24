import { resolveAcademicMessage } from "./index.js";
import { normalizeInput } from "./normalizer.js";
import { detectAcademicIntent } from "./intentEngine.js";
import { extractEntities } from "./entityExtractor.js";

const ENRICHABLE_WA_INTENTS = new Set([
  "carreras_disponibles",
  "carrera_interes",
  "beca",
  "ambiguo",
]);

const BLOCKED_WA_INTENTS = new Set([
  "sin_texto",
  "humano",
  "post_test",
  "duda_test",
  "no_se_que_estudiar",
]);

/**
 * Whether WA funnel intent should call academic-engine for response enrichment.
 * @param {string} waIntent
 * @param {string} rawText
 */
export function shouldEnrichAcademic(waIntent, rawText) {
  if (BLOCKED_WA_INTENTS.has(waIntent)) return false;

  if (ENRICHABLE_WA_INTENTS.has(waIntent)) {
    if (waIntent === "ambiguo") {
      const normalized = normalizeInput(rawText);
      const entities = extractEntities(normalized);
      const academicIntent = detectAcademicIntent(normalized, entities, {});
      return academicIntent !== "fallback" && academicIntent !== "greeting";
    }
    return true;
  }

  return false;
}

/**
 * Merge academic response into WA decision without touching operational fields.
 * @param {object} waDecision
 * @param {object} academicResult - output of resolveAcademicMessage
 */
export function mergeAcademicIntoDecision(waDecision, academicResult) {
  if (!waDecision || !academicResult?.ok) {
    return {
      ...waDecision,
      academic_enriched: false,
      academic_meta: academicResult || null,
    };
  }

  const enriched = { ...waDecision };
  const canReplace =
    typeof academicResult.confidence === "number" && academicResult.confidence >= 0.5;

  if (canReplace && academicResult.response) {
    enriched.responseText = academicResult.response;
    enriched.academic_enriched = true;
  } else {
    enriched.academic_enriched = false;
  }

  enriched.academic_meta = {
    academic_intent: academicResult.academic_intent,
    confidence: academicResult.confidence,
    source_context: academicResult.source_context,
    pending_validation_used: academicResult.pending_validation_used,
    source_truth_version: academicResult.source_truth_version,
  };

  return enriched;
}

/**
 * Convenience: enrich from raw text (unit tests).
 */
export function enrichWaDecisionFromText(waDecision, rawText, prevAcademicState = {}) {
  const academicResult = resolveAcademicMessage(rawText, prevAcademicState);
  if (!shouldEnrichAcademic(waDecision.intent, rawText)) {
    return {
      ...waDecision,
      academic_enriched: false,
      academic_skipped: true,
      academic_meta: {
        academic_intent: academicResult.academic_intent,
        skipped_reason: `wa_intent_${waDecision.intent}`,
      },
    };
  }
  return mergeAcademicIntoDecision(waDecision, academicResult);
}
