/**
 * EVA LLM — shadow (7G.1) + rewrite allowlist (7G.2).
 * EVA_LLM_ENABLED=false → sin llamadas.
 * LLM_MODE=shadow → suggested en logs; final = factual.
 * LLM_MODE=rewrite → allowlist + validateRewrite → final puede ser suggested.
 */

import {
  shouldUseLLM,
  resolveLlmMode,
  isShadowMode,
  isRewriteMode,
  isRewriteAllowed,
  isLlmEnabled,
} from "./shouldUseLLM.js";
import { validateRephrase, validateShadowSuggestion, validateRewrite } from "./guardrails.js";
import {
  REPHRASE_SYSTEM_PROMPT,
  SHADOW_SYSTEM_PROMPT,
  buildShadowUserPrompt,
  buildRewriteUserPrompt,
} from "./prompts.js";

function resolveProvider(config = {}) {
  return config.LLM_PROVIDER || config.evaLlmProvider || "openai";
}

function resolveModel(config = {}) {
  return config.LLM_MODEL || config.evaLlmModel || "gpt-4o-mini";
}

function resolveApiKey(config = {}) {
  return config.openaiApiKey || config.OPENAI_API_KEY || "";
}

function isFailOpen(config = {}) {
  return config.evaLlmFailOpen !== false && config.EVA_LLM_FAIL_OPEN !== "false";
}

function buildFakeSuggestion(factualResponse, context = {}) {
  const factual = String(factualResponse || "").trim();
  if (!factual) return factual;

  if (String(context.rawText || "").includes("SHADOW_INVENT_TEST")) {
    return `${factual}\n\nAdemás, te garantizo beca asegurada al 100% con meses sin intereses.`;
  }

  if (isRewriteMode(context.config || {})) {
    return factual.replace(/\n\n/g, "\n").replace(/•/g, "-");
  }

  if (factual.endsWith("?") || factual.endsWith(".") || factual.endsWith("…")) {
    return factual;
  }
  return `${factual} 😊`;
}

async function callOpenAI({ systemPrompt, userPrompt, config }) {
  const apiKey = resolveApiKey(config);
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY missing");
  }

  const model = resolveModel(config);
  const maxTokens = config.evaLlmMaxTokens || 512;
  const timeoutMs = config.evaLlmTimeoutMs || 12000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body?.error?.message || `OpenAI HTTP ${response.status}`);
    }

    const text = body?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("OpenAI empty response");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function generateSuggestedResponse(factualResponse, context, config = {}) {
  if (typeof config.evaLlmSuggestFn === "function") {
    return config.evaLlmSuggestFn(factualResponse, context, config);
  }

  const provider = resolveProvider(config);
  if (provider === "fake") {
    return buildFakeSuggestion(factualResponse, { ...context, config });
  }

  const apiKey = resolveApiKey(config);
  if (!apiKey) {
    return buildFakeSuggestion(factualResponse, { ...context, config });
  }

  const useRewritePrompt = isRewriteMode(config);
  const userPrompt = useRewritePrompt
    ? buildRewriteUserPrompt({
        factualResponse,
        waIntent: context.waIntent,
        academicIntent: context.academicIntent,
        sourceContext: context.sourceContext,
        rawText: context.rawText,
      })
    : buildShadowUserPrompt({
        factualResponse,
        waIntent: context.waIntent,
        academicIntent: context.academicIntent,
        sourceContext: context.sourceContext,
        rawText: context.rawText,
      });

  let text = await callOpenAI({
    systemPrompt: useRewritePrompt ? REPHRASE_SYSTEM_PROMPT : SHADOW_SYSTEM_PROMPT,
    userPrompt,
    config,
  });

  if (String(context.rawText || "").includes("SHADOW_INVENT_TEST")) {
    text = `${text}\n\nAdemás, te garantizo beca asegurada al 100% con meses sin intereses.`;
  }

  return text;
}

function resolveBlockReason(decision, config, { llmError, suggestedResponse, rewriteValidation, guardrailWarnings }) {
  if (!isRewriteMode(config)) return null;
  if (decision.intent === "beca") return "scholarship_blocked";
  if (!isRewriteAllowed(decision.intent)) return "blocked_intent";
  if (llmError) return "llm_error";
  if (!suggestedResponse) return "empty_suggestion";
  if (guardrailWarnings.length > 0 || !rewriteValidation?.ok) return "guardrail_blocked";
  return null;
}

/**
 * @param {object} decision
 * @param {object} config
 * @param {object} options
 */
export async function enrichWithLLM(decision, config = {}, options = {}) {
  const mode = resolveLlmMode(config);
  const factualResponse = options.factualResponse ?? decision.responseText ?? "";
  const academicMeta = options.academicMeta || decision.academic_meta || {};

  if (!isLlmEnabled(config)) {
    return {
      ...decision,
      llm_meta: { enabled: false, mode: "off", final_response: factualResponse },
    };
  }

  const llmContext = {
    waIntent: decision.intent,
    academicIntent: academicMeta.academic_intent,
    sourceContext:
      options.sourceContext ??
      academicMeta.source_context ??
      decision.academic_meta?.source_context ??
      "",
    rawText: options.rawText ?? "",
    decision,
    academicMeta,
  };

  if (!shouldUseLLM(decision, academicMeta, config)) {
    return {
      ...decision,
      responseText: factualResponse,
      llm_meta: {
        enabled: true,
        mode,
        skipped: true,
        factual_response: factualResponse,
        final_response: factualResponse,
        block_reason: "skipped_intent",
        provider: resolveProvider(config),
        model: resolveModel(config),
      },
    };
  }

  let suggestedResponse = null;
  let llmError = null;
  let guardrailWarnings = [];
  let rewriteValidation = { ok: true, errors: [], warnings: [] };

  try {
    suggestedResponse = await generateSuggestedResponse(factualResponse, llmContext, config);
    const shadowValidation = validateShadowSuggestion(
      factualResponse,
      suggestedResponse,
      llmContext.sourceContext,
    );
    guardrailWarnings = shadowValidation.warnings || [];
    rewriteValidation = validateRewrite(factualResponse, suggestedResponse, llmContext);
  } catch (err) {
    llmError = err instanceof Error ? err.message : String(err);
    suggestedResponse = null;
    if (!isFailOpen(config)) {
      throw err;
    }
  }

  let finalResponse = factualResponse;
  let rephrased = false;
  let blockReason = resolveBlockReason(decision, config, {
    llmError,
    suggestedResponse,
    rewriteValidation,
    guardrailWarnings,
  });

  if (isShadowMode(config)) {
    finalResponse = factualResponse;
    rephrased = false;
  } else if (isRewriteMode(config)) {
    if (!blockReason && suggestedResponse && rewriteValidation.ok) {
      finalResponse = suggestedResponse;
      rephrased = true;
    } else {
      finalResponse = factualResponse;
      rephrased = false;
    }
  } else if (suggestedResponse && !llmError) {
    const validation = validateRephrase(factualResponse, suggestedResponse);
    if (validation.ok) {
      finalResponse = suggestedResponse;
      rephrased = finalResponse !== factualResponse;
    }
  }

  const loggedProvider =
    resolveProvider(config) === "fake" || !resolveApiKey(config) ? "fake" : resolveProvider(config);

  return {
    ...decision,
    responseText: finalResponse,
    llm_meta: {
      enabled: true,
      mode,
      rephrased,
      factual_response: factualResponse,
      suggested_response: suggestedResponse,
      final_response: finalResponse,
      provider: loggedProvider,
      model: resolveModel(config),
      guardrail_warnings: guardrailWarnings,
      rewrite_validation_errors: rewriteValidation.errors || [],
      llm_error: llmError,
      block_reason: blockReason,
    },
  };
}

export {
  shouldUseLLM,
  resolveLlmMode,
  isShadowMode,
  isRewriteMode,
  isRewriteAllowed,
  isLlmEnabled,
  validateRephrase,
  validateShadowSuggestion,
  validateRewrite,
  buildFakeSuggestion,
};
