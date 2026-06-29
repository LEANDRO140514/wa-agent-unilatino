#!/usr/bin/env node
/**
 * Phase 8B.6 — CAG assistive response prototype (mock only).
 * Does NOT activate production CAG, modify handler, or call external APIs.
 * Usage: node tests/run-phase8b6-cag-assistive-response-prototype.mjs
 */

import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const {
  isCagAssistiveResponseEnabled,
  isCagAssistiveCategoryAllowed,
  buildCagAssistiveResponse,
} = require(path.join(
  __dirname,
  "../insforge/functions/lib/knowledge/cagAssistiveResponse.js",
));

const MOCK_SAFE_ENV = {
  EVA_CAG_RESPONSE_ENABLED: "true",
  WA_AGENT_MODE: "mock",
  EVA_LLM_ENABLED: "false",
  LLM_MODE: "off",
  GHL_SYNC_MODE: "dry_run",
};

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

function preview(text, max = 80) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function assertNoSecrets(assistiveResponse) {
  const text = String(assistiveResponse || "");
  const forbidden = [
    /sk-[a-zA-Z0-9]{10,}/,
    /api[_-]?key/i,
    /bearer\s+/i,
    /contentHash/i,
    /tokenEstimate/i,
    /"context"\s*:/,
    /# Universidad Latino —/,
    /EVA_CAG_RESPONSE_ENABLED/,
    /process\.env/,
  ];
  return forbidden.every((re) => !re.test(text)) && text.length < 2500;
}

console.log("Phase 8B.6 — CAG assistive response prototype (mock only)\n");

console.log("5.1 Gate off (EVA_CAG_RESPONSE_ENABLED=false):");
{
  const env = {
    EVA_CAG_RESPONSE_ENABLED: "false",
    WA_AGENT_MODE: "mock",
    EVA_LLM_ENABLED: "false",
    LLM_MODE: "off",
    GHL_SYNC_MODE: "dry_run",
  };
  const r = buildCagAssistiveResponse({
    message: "ubicacion?",
    deterministicResponse: "det",
    options: { env },
  });
  assert("enabled=false", r.enabled === false);
  assert("mode=disabled", r.mode === "disabled");
  assert("shouldUse=false", r.shouldUseAssistiveResponse === false);
  assert("finalResponseModified=false", r.finalResponseModified === false);
}

console.log("\n5.2 Flag missing:");
{
  const env = {
    WA_AGENT_MODE: "mock",
    EVA_LLM_ENABLED: "false",
    LLM_MODE: "off",
    GHL_SYNC_MODE: "dry_run",
  };
  const r = buildCagAssistiveResponse({
    message: "ubicacion?",
    deterministicResponse: "det",
    options: { env },
  });
  assert("disabled when flag missing", r.mode === "disabled" && r.enabled === false);
  assert("isCagAssistiveResponseEnabled false", isCagAssistiveResponseEnabled(env) === false);
}

console.log("\n5.3 Flag on + mock — allowed categories:");
{
  const cases = [
    { message: "ubicacion?", category: "location" },
    { message: "tienen reconocimiento oficial?", category: "rvoe" },
    { message: "carreras online?", category: "online_programs" },
    { message: "medicida tienen?", category: "not_offered" },
    { message: "tienen revalidación?", category: "revalidation_general" },
    { message: "tienen becas?", category: "scholarships" },
    { message: "esta cara no?", category: "price_objection" },
  ];
  for (const c of cases) {
    const r = buildCagAssistiveResponse({
      message: c.message,
      deterministicResponse: "deterministic",
      options: { env: MOCK_SAFE_ENV },
    });
    assert(
      `${c.category} enabled`,
      r.enabled === true && r.mode === "assistive_mock",
      `got mode=${r.mode}`,
    );
    assert(`${c.category} shouldUse`, r.shouldUseAssistiveResponse === true);
    assert(`${c.category} assistive non-empty`, r.assistiveResponse.length > 20);
    assert(`${c.category} finalResponseModified=false`, r.finalResponseModified === false);
    assert(`${c.category} category match`, r.category === c.category);
  }
}

console.log("\n5.4 Promotions general (partial):");
{
  const r = buildCagAssistiveResponse({
    message: "que promociones tienen?",
    deterministicResponse: "det",
    options: { env: MOCK_SAFE_ENV },
  });
  assert("category=promotions_general", r.category === "promotions_general");
  assert("shouldUse true or partial", r.shouldUseAssistiveResponse === true);
  assert("mentions becas/descuentos", /becas|descuentos/i.test(r.assistiveResponse));
  assert("no vigente promo claim", !/promoci[oó]n vigente|hoy tenemos|esta semana/i.test(r.assistiveResponse));
  assert("human followup safeguard", r.safeguards.includes("human_followup_required"));
  assert("finalResponseModified=false", r.finalResponseModified === false);
  const partial = isCagAssistiveCategoryAllowed("promotions_general");
  assert("partial allowed", partial.allowed === true && partial.partial === true);
}

console.log("\n5.5 Dynamic blocked:");
{
  const queries = [
    "promoción de hoy?",
    "hay cupo mañana?",
    "descuento vigente este mes?",
  ];
  for (const message of queries) {
    const r = buildCagAssistiveResponse({
      message,
      deterministicResponse: "det",
      options: { env: MOCK_SAFE_ENV },
    });
    assert(`${preview(message)} mode=blocked`, r.mode === "blocked");
    assert(`${preview(message)} shouldUse=false`, r.shouldUseAssistiveResponse === false);
    assert(`${preview(message)} reason dynamic`, /dynamic/.test(r.reason));
    assert(`${preview(message)} finalResponseModified=false`, r.finalResponseModified === false);
  }
}

console.log("\n5.6 Personalized blocked:");
{
  const queries = [
    "me pueden revalidar 8 materias?",
    "cuánto me toca de beca exacta?",
    "pueden revisar mi certificado?",
  ];
  for (const message of queries) {
    const r = buildCagAssistiveResponse({
      message,
      deterministicResponse: "det",
      options: { env: MOCK_SAFE_ENV },
    });
    assert(`${preview(message)} mode=blocked`, r.mode === "blocked");
    assert(`${preview(message)} shouldUse=false`, r.shouldUseAssistiveResponse === false);
    assert(`${preview(message)} reason personalized`, /personalized/.test(r.reason));
    assert(`${preview(message)} finalResponseModified=false`, r.finalResponseModified === false);
  }
}

console.log("\n5.7 Live blocked (WA_AGENT_MODE=live_outbound):");
{
  const env = {
    EVA_CAG_RESPONSE_ENABLED: "true",
    WA_AGENT_MODE: "live_outbound",
    EVA_LLM_ENABLED: "false",
    LLM_MODE: "off",
    GHL_SYNC_MODE: "dry_run",
  };
  const r = buildCagAssistiveResponse({
    message: "ubicacion?",
    deterministicResponse: "det",
    options: { env },
  });
  assert("enabled=false", r.enabled === false);
  assert("mode blocked or disabled", r.mode === "blocked" || r.mode === "disabled");
  assert("isCagAssistiveResponseEnabled false", isCagAssistiveResponseEnabled(env) === false);
}

console.log("\n5.8 GHL live blocked:");
{
  const env = {
    EVA_CAG_RESPONSE_ENABLED: "true",
    WA_AGENT_MODE: "mock",
    GHL_SYNC_MODE: "live",
  };
  const r = buildCagAssistiveResponse({
    message: "ubicacion?",
    deterministicResponse: "det",
    options: { env },
  });
  assert("enabled=false", r.enabled === false);
  assert("blocked unsafe env", r.mode === "blocked" || r.mode === "disabled");
}

console.log("\n5.9 LLM on blocked:");
{
  const env = {
    EVA_CAG_RESPONSE_ENABLED: "true",
    WA_AGENT_MODE: "mock",
    EVA_LLM_ENABLED: "true",
    LLM_MODE: "rewrite",
  };
  const r = buildCagAssistiveResponse({
    message: "ubicacion?",
    deterministicResponse: "det",
    options: { env },
  });
  assert("enabled=false", r.enabled === false);
  assert("isCagAssistiveResponseEnabled false", isCagAssistiveResponseEnabled(env) === false);
}

console.log("\n5.10 No secrets / no long raw context:");
{
  const messages = [
    "ubicacion?",
    "tienen becas?",
    "que promociones tienen?",
    "carreras online?",
  ];
  for (const message of messages) {
    const r = buildCagAssistiveResponse({
      message,
      deterministicResponse: "det",
      options: { env: MOCK_SAFE_ENV },
    });
    if (r.assistiveResponse) {
      assert(`${preview(message)} no secrets`, assertNoSecrets(r.assistiveResponse));
    }
  }
}

console.log("\nCategory allowlist sanity:");
for (const cat of ["dynamic", "personalized", "unknown_or_greeting", "missing_cache"]) {
  const p = isCagAssistiveCategoryAllowed(cat);
  assert(`${cat} not allowed`, p.allowed === false);
}

console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
