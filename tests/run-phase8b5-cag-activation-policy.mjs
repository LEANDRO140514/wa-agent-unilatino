#!/usr/bin/env node
/**
 * Phase 8B.5 — CAG future activation policy rules (documentation test only).
 * Does NOT activate CAG, modify handler, or call external APIs.
 * Usage: node tests/run-phase8b5-cag-activation-policy.mjs
 */

const FUTURE_CANDIDATE_CATEGORIES = new Set([
  "location",
  "rvoe",
  "online_programs",
  "not_offered",
  "non_primary_levels",
  "revalidation_general",
  "scholarships",
  "price_objection",
  "programs",
  "faqs",
]);

const PARTIAL_CATEGORIES = {
  promotions_general: {
    candidate: "partial",
    requiresHumanFollowup: true,
    mustNotClaimCurrentPromo: true,
  },
};

const BLOCKED_CATEGORIES = new Set([
  "dynamic",
  "personalized",
  "missing_cache",
  "unknown_or_greeting",
]);

function classifyFutureCandidate(category) {
  if (BLOCKED_CATEGORIES.has(category)) {
    return {
      candidate: false,
      reason: `category_${category}_blocked`,
    };
  }
  if (PARTIAL_CATEGORIES[category]) {
    return { ...PARTIAL_CATEGORIES[category] };
  }
  if (FUTURE_CANDIDATE_CATEGORIES.has(category)) {
    return {
      candidate: true,
      requiresFlag: true,
      mockOnlyFirst: true,
    };
  }
  return {
    candidate: false,
    reason: `category_${category}_not_approved`,
  };
}

/**
 * Simulates future EVA_CAG_RESPONSE_ENABLED gate (not implemented in runtime 8B.5).
 */
function evaluateFutureActivation(env = {}, category = null) {
  const enabled = env.EVA_CAG_RESPONSE_ENABLED === "true";
  const mode = env.WA_AGENT_MODE || "mock";
  const llmOn = env.EVA_LLM_ENABLED === "true";
  const llmMode = env.LLM_MODE || "off";
  const allowedCategories = String(env.EVA_CAG_RESPONSE_ALLOWED_CATEGORIES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!enabled) {
    return { activationAllowed: false, reason: "eva_cag_response_disabled" };
  }
  if (mode !== "mock") {
    return { activationAllowed: false, reason: "non_mock_mode_blocked" };
  }
  if (llmOn) {
    return { activationAllowed: false, reason: "llm_enabled_blocked" };
  }
  if (llmMode !== "off" && llmMode !== "") {
    return { activationAllowed: false, reason: "llm_mode_not_off" };
  }
  if (!category) {
    return { activationAllowed: false, reason: "missing_category" };
  }

  const catPolicy = classifyFutureCandidate(category);
  if (catPolicy.candidate === false) {
    return { activationAllowed: false, reason: catPolicy.reason };
  }
  if (catPolicy.candidate === "partial") {
    return {
      activationAllowed: false,
      reason: "partial_category_requires_human_followup_only",
      ...catPolicy,
    };
  }

  if (allowedCategories.length > 0 && !allowedCategories.includes(category)) {
    return { activationAllowed: false, reason: "category_not_in_allowlist" };
  }

  return {
    activationAllowed: true,
    reason: "future_mock_candidate_only",
    mockOnlyFirst: true,
    requiresFlag: true,
  };
}

let passed = 0;
let failed = 0;

function assert(name, ok, detail = "") {
  if (ok) {
    console.log(`  PASS  ${name}`);
    passed++;
  } else {
    console.log(`  FAIL  ${name}${detail ? `: ${detail}` : ""}`);
    failed++;
  }
}

console.log("Phase 8B.5 — CAG activation policy (future, not enabled)\n");

console.log("Future candidate categories:");
for (const cat of [
  "location",
  "rvoe",
  "online_programs",
  "not_offered",
  "non_primary_levels",
  "revalidation_general",
  "scholarships",
  "price_objection",
]) {
  const p = classifyFutureCandidate(cat);
  assert(`${cat} candidate=true`, p.candidate === true);
  assert(`${cat} requiresFlag`, p.requiresFlag === true);
  assert(`${cat} mockOnlyFirst`, p.mockOnlyFirst === true);
}

console.log("\nPartial / human followup:");
{
  const p = classifyFutureCandidate("promotions_general");
  assert("promotions_general partial", p.candidate === "partial");
  assert("promotions_general requiresHumanFollowup", p.requiresHumanFollowup === true);
  assert("promotions_general mustNotClaimCurrentPromo", p.mustNotClaimCurrentPromo === true);
}

console.log("\nBlocked categories:");
for (const cat of ["dynamic", "personalized", "missing_cache", "unknown_or_greeting"]) {
  const p = classifyFutureCandidate(cat);
  assert(`${cat} candidate=false`, p.candidate === false);
  assert(`${cat} reason exists`, typeof p.reason === "string" && p.reason.length > 0);
}

console.log("\nGlobal activation gate:");
assert(
  "EVA_CAG_RESPONSE_ENABLED=false",
  evaluateFutureActivation({ EVA_CAG_RESPONSE_ENABLED: "false" }, "location").activationAllowed === false,
);
assert(
  "flag missing",
  evaluateFutureActivation({}, "location").activationAllowed === false,
);

const mockOk = evaluateFutureActivation(
  {
    EVA_CAG_RESPONSE_ENABLED: "true",
    WA_AGENT_MODE: "mock",
    EVA_LLM_ENABLED: "false",
    LLM_MODE: "off",
    EVA_CAG_RESPONSE_ALLOWED_CATEGORIES: "location,rvoe,online_programs,not_offered",
  },
  "location",
);
assert("mock location future candidate", mockOk.activationAllowed === true);
assert("mock location mockOnlyFirst", mockOk.mockOnlyFirst === true);

assert(
  "live_outbound blocked",
  evaluateFutureActivation(
    {
      EVA_CAG_RESPONSE_ENABLED: "true",
      WA_AGENT_MODE: "live_outbound",
      EVA_LLM_ENABLED: "false",
      LLM_MODE: "off",
    },
    "location",
  ).activationAllowed === false,
);

assert(
  "LLM on blocked",
  evaluateFutureActivation(
    {
      EVA_CAG_RESPONSE_ENABLED: "true",
      WA_AGENT_MODE: "mock",
      EVA_LLM_ENABLED: "true",
      LLM_MODE: "rewrite",
    },
    "location",
  ).activationAllowed === false,
);

assert(
  "dynamic category blocked even with flag",
  evaluateFutureActivation(
    {
      EVA_CAG_RESPONSE_ENABLED: "true",
      WA_AGENT_MODE: "mock",
      EVA_LLM_ENABLED: "false",
      LLM_MODE: "off",
    },
    "dynamic",
  ).activationAllowed === false,
);

assert(
  "promotions_general partial blocked for activation",
  evaluateFutureActivation(
    {
      EVA_CAG_RESPONSE_ENABLED: "true",
      WA_AGENT_MODE: "mock",
      EVA_LLM_ENABLED: "false",
      LLM_MODE: "off",
    },
    "promotions_general",
  ).activationAllowed === false,
);

assert(
  "category not in allowlist blocked",
  evaluateFutureActivation(
    {
      EVA_CAG_RESPONSE_ENABLED: "true",
      WA_AGENT_MODE: "mock",
      EVA_LLM_ENABLED: "false",
      LLM_MODE: "off",
      EVA_CAG_RESPONSE_ALLOWED_CATEGORIES: "location",
    },
    "scholarships",
  ).activationAllowed === false,
);

console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
