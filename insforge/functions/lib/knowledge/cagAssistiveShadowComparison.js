/**
 * Eva WA — CAG assistive shadow comparison (8B.7).
 * Observability only: compares deterministic vs assistive proposal without modifying responses.
 * RAG mode is intentionally disabled in 8B.7.
 */

const { buildCagAssistiveResponse } = require("./cagAssistiveResponse");

function resolveEnvValue(env, key) {
  if (env && env[key] !== undefined) return env[key];
  if (typeof Deno !== "undefined" && Deno.env?.get) return Deno.env.get(key);
  return process.env[key];
}

/**
 * Shadow comparison runs only when explicitly enabled and runtime is safe mock + LLM off.
 * live / live_outbound / GHL live are blocked in 8B.7.
 */
function isCagAssistiveShadowComparisonEnabled(env = process.env, config = {}) {
  const shadowFlag = resolveEnvValue(env, "EVA_CAG_ASSISTIVE_SHADOW") === "true";
  const mode = config.mode || resolveEnvValue(env, "WA_AGENT_MODE") || "mock";
  const llmEnabled =
    config.evaLlmEnabled === true || resolveEnvValue(env, "EVA_LLM_ENABLED") === "true";
  const llmMode = config.evaLlmMode || resolveEnvValue(env, "LLM_MODE") || "off";
  const ghlSync = config.ghlSyncMode || resolveEnvValue(env, "GHL_SYNC_MODE") || "dry_run";

  return (
    shadowFlag &&
    mode === "mock" &&
    !llmEnabled &&
    (llmMode === "off" || llmMode === "") &&
    ghlSync !== "live"
  );
}

function deriveRecommendation(assistive) {
  if (!assistive?.enabled) {
    if (assistive?.mode === "blocked") return "blocked";
    return "disabled";
  }
  if (assistive.mode === "assistive_mock" && assistive.shouldUseAssistiveResponse) {
    if (assistive.reason === "assistive_partial_with_human_followup") {
      return "assistive_partial_mock";
    }
    return "assistive_available_mock";
  }
  if (assistive.mode === "blocked") return "blocked";
  return "not_applicable";
}

function redactCagAssistiveComparisonLog(comparison) {
  return {
    event: "eva_cag_assistive_shadow",
    enabled: comparison?.enabled === true,
    mode: comparison?.mode || null,
    category: comparison?.category || null,
    shouldUseAssistiveResponse: comparison?.shouldUseAssistiveResponse === true,
    assistiveResponseAvailable: comparison?.assistiveResponseAvailable === true,
    assistiveResponsePreviewLength: comparison?.assistiveResponsePreviewLength || 0,
    deterministicResponsePreviewLength: comparison?.deterministicResponsePreviewLength || 0,
    recommendation: comparison?.recommendation || null,
    reason: comparison?.reason || null,
    risks: Array.isArray(comparison?.risks) ? comparison.risks.slice(0, 8) : [],
    safeguards: Array.isArray(comparison?.safeguards) ? comparison.safeguards.slice(0, 10) : [],
    finalResponseModified: false,
  };
}

function buildComparison({
  messageText,
  deterministicIntent,
  deterministicResponse,
  knowledgeResult,
  env,
}) {
  const assistive = buildCagAssistiveResponse({
    message: messageText,
    deterministicIntent,
    deterministicResponse,
    knowledgeResult,
    options: { env },
  });

  const detLen = String(deterministicResponse || "").length;
  const assistiveLen = String(assistive.assistiveResponse || "").length;

  return {
    enabled: assistive.enabled,
    mode: assistive.mode,
    category: assistive.category,
    shouldUseAssistiveResponse: assistive.shouldUseAssistiveResponse,
    assistiveResponseAvailable:
      assistive.shouldUseAssistiveResponse === true && assistiveLen > 0,
    assistiveResponsePreviewLength: assistiveLen,
    deterministicResponsePreviewLength: detLen,
    recommendation: deriveRecommendation(assistive),
    reason: assistive.reason,
    risks: assistive.risks || [],
    safeguards: assistive.safeguards || [],
    finalResponseModified: false,
  };
}

function maybeLogCagAssistiveComparison({
  config = {},
  env = process.env,
  messageText,
  deterministicIntent,
  deterministicResponse,
  knowledgeResult = null,
  contactContext = {},
  logger = (line) => console.log(line),
} = {}) {
  if (!isCagAssistiveShadowComparisonEnabled(env, config)) {
    return null;
  }

  void contactContext;

  try {
    const comparison = buildComparison({
      messageText,
      deterministicIntent,
      deterministicResponse,
      knowledgeResult,
      env,
    });

    const redacted = redactCagAssistiveComparisonLog(comparison);
    logger(JSON.stringify(redacted));
    return redacted;
  } catch (err) {
    logger(
      JSON.stringify({
        event: "eva_cag_assistive_shadow",
        enabled: false,
        mode: "error",
        reason: String(err?.message || "comparison_failed").slice(0, 120),
        finalResponseModified: false,
      }),
    );
    return null;
  }
}

module.exports = {
  isCagAssistiveShadowComparisonEnabled,
  redactCagAssistiveComparisonLog,
  maybeLogCagAssistiveComparison,
  deriveRecommendation,
};
