/**
 * Eva WA — CAG shadow logging (8B.4).
 * Observability only: does not modify responses, GHL, or tasks.
 * RAG mode is intentionally disabled in 8B.4.
 */

const { evaluateCagShadow } = require("./cagShadowEvaluator");

function resolveEnvValue(env, key) {
  if (env && env[key] !== undefined) return env[key];
  if (typeof Deno !== "undefined" && Deno.env?.get) return Deno.env.get(key);
  return process.env[key];
}

/**
 * Shadow logging runs only when explicitly enabled and runtime is safe mock + LLM off.
 * live / live_outbound are always blocked in 8B.4.
 */
function isCagShadowLoggingEnabled(env = process.env, config = {}) {
  const shadowFlag = resolveEnvValue(env, "EVA_CAG_SHADOW_LOGGING") === "true";
  const mode = config.mode || resolveEnvValue(env, "WA_AGENT_MODE") || "mock";
  const llmEnabled =
    config.evaLlmEnabled === true || resolveEnvValue(env, "EVA_LLM_ENABLED") === "true";
  const llmMode = config.evaLlmMode || resolveEnvValue(env, "LLM_MODE") || "off";

  return (
    shadowFlag &&
    mode === "mock" &&
    !llmEnabled &&
    (llmMode === "off" || llmMode === "")
  );
}

function redactCagShadowLog(shadow) {
  return {
    event: "eva_cag_shadow",
    shadowEnabled: shadow?.shadowEnabled === true,
    knowledgeMode: shadow?.knowledgeMode || null,
    knowledgeSource: shadow?.knowledgeSource || null,
    knowledgeVersion: shadow?.knowledgeVersion || null,
    category: shadow?.knowledgeCategory || null,
    recommendation: shadow?.recommendation || null,
    contextAvailable: shadow?.contextAvailable === true,
    contextPreviewLength: shadow?.contextPreview ? String(shadow.contextPreview).length : 0,
    deterministicIntent: shadow?.deterministicIntent || null,
    finalResponseModified: false,
    notes: Array.isArray(shadow?.notes) ? shadow.notes.slice(0, 5) : [],
  };
}

function maybeLogCagShadow({
  config = {},
  env = process.env,
  messageText,
  deterministicIntent,
  deterministicResponse,
  conversationState = {},
  logger = (line) => console.log(line),
} = {}) {
  if (!isCagShadowLoggingEnabled(env, config)) {
    return null;
  }

  const shadow = evaluateCagShadow({
    message: messageText,
    deterministicIntent,
    deterministicResponse,
    conversationState,
  });

  const redacted = redactCagShadowLog(shadow);
  logger(JSON.stringify(redacted));
  return redacted;
}

module.exports = {
  isCagShadowLoggingEnabled,
  redactCagShadowLog,
  maybeLogCagShadow,
};
