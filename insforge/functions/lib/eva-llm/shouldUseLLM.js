/**
 * Criterios de uso de LLM por modo.
 * shadow: suggested en logs; final = factual.
 * rewrite: suggested + allowlist + validateRephrase → final puede cambiar.
 */

export const REWRITE_ALLOWLIST = new Set([
  "carreras_disponibles",
  "carrera_interes",
  "no_se_que_estudiar",
  "humano",
]);

export function resolveLlmMode(config = {}) {
  const raw = config.LLM_MODE || config.evaLlmMode || config.llmMode || "off";
  return String(raw).toLowerCase();
}

export function isShadowMode(config = {}) {
  return resolveLlmMode(config) === "shadow";
}

export function isRewriteMode(config = {}) {
  const mode = resolveLlmMode(config);
  return mode === "rewrite" || mode === "rephrase";
}

export function isLlmEnabled(config = {}) {
  return config.EVA_LLM_ENABLED === true || config.evaLlmEnabled === true;
}

export function isRewriteAllowed(intent) {
  return REWRITE_ALLOWLIST.has(intent);
}

export function shouldUseLLM(decision, _academicMeta, config = {}) {
  if (!isLlmEnabled(config)) return false;

  const intent = decision?.intent;
  if (intent === "sin_texto") return false;

  if (isShadowMode(config) || isRewriteMode(config)) {
    return true;
  }

  const blockedIntents = new Set([
    "sin_texto",
    "humano",
    "post_test",
    "duda_test",
    "no_se_que_estudiar",
  ]);
  if (blockedIntents.has(intent)) return false;

  const confidence = _academicMeta?.confidence ?? _academicMeta?.academic_confidence ?? 1;
  if (confidence >= 0.8) return false;

  return true;
}
