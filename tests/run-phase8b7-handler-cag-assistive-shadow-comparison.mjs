#!/usr/bin/env node
/**
 * Phase 8B.7 — Handler CAG assistive shadow comparison (mock only).
 * Usage: node tests/run-phase8b7-handler-cag-assistive-shadow-comparison.mjs
 */

import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);
const HANDLER_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");
const BUILD_SCRIPT = path.join(ROOT, "scripts/build-eva-cag-cache.mjs");

spawnSync(process.execPath, [BUILD_SCRIPT], { cwd: ROOT, encoding: "utf8" });

if (!globalThis.Deno) {
  globalThis.Deno = { env: { get: (key) => process.env[key] } };
}

const handler = (await import(pathToFileURL(HANDLER_PATH).href)).default;

const SECRET_PATTERNS = [
  "SUPABASE_SERVICE_ROLE",
  "OPENAI_API_KEY",
  "GHL_API_KEY",
  "YCLOUD_API_KEY",
  "INSFORGE_SERVICE_ROLE",
  "Bearer ",
  "sk-",
];

const FULL_PHONE = "+529991525583";

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

function applyEnv(env) {
  for (const key of Object.keys(process.env)) {
    if (
      key.startsWith("EVA_CAG_") ||
      key.startsWith("WA_AGENT_") ||
      key.startsWith("EVA_LLM_") ||
      key === "LLM_MODE" ||
      key === "GHL_SYNC_MODE"
    ) {
      delete process.env[key];
    }
  }
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

async function deterministicResponse(message, config) {
  const decision = handler.classifyIntent(message, config, {});
  const enrich = await handler.applyAcademicAndLlmEnrichment(decision, message, config, {});
  return enrich.decision;
}

function captureAssistiveLogs(fn) {
  const lines = [];
  const logger = (line) => lines.push(String(line));
  const result = fn(logger);
  return { result, lines };
}

function parseAssistiveLogs(lines) {
  return lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((x) => x && x.event === "eva_cag_assistive_shadow");
}

function scanLogSafety(logLine) {
  const raw = typeof logLine === "string" ? logLine : JSON.stringify(logLine);
  const issues = [];
  for (const pat of SECRET_PATTERNS) {
    if (raw.includes(pat)) issues.push(`secret:${pat}`);
  }
  if (raw.includes(FULL_PHONE)) issues.push("full_phone");
  if (raw.includes("# [programas]")) issues.push("full_context_leak");
  if (raw.includes("Becas de excelencia por promedio de bachillerato")) {
    issues.push("full_context_leak");
  }
  const parsed = typeof logLine === "object" ? logLine : JSON.parse(raw);
  if (parsed.context && String(parsed.context).length > 0) issues.push("context_field_present");
  if (parsed.assistiveResponse && String(parsed.assistiveResponse).length > 0) {
    issues.push("full_assistive_response_leak");
  }
  if (parsed.deterministicResponse && String(parsed.deterministicResponse).length > 0) {
    issues.push("full_deterministic_response_leak");
  }
  if (parsed.assistiveResponsePreviewLength > 500) issues.push("suspicious_assistive_length");
  return issues;
}

console.log("Phase 8B.7 — handler CAG assistive shadow comparison\n");

// Case A — flag off
console.log("Case A — EVA_CAG_ASSISTIVE_SHADOW=false");
applyEnv({
  EVA_CAG_ASSISTIVE_SHADOW: "false",
  EVA_CAG_RESPONSE_ENABLED: "true",
  WA_AGENT_MODE: "mock",
  EVA_LLM_ENABLED: "false",
  LLM_MODE: "off",
  GHL_SYNC_MODE: "dry_run",
  ACADEMIC_ENGINE_ENABLED: "true",
});
{
  const config = handler.getConfig();
  assert(
    "gate disabled",
    handler.isCagAssistiveShadowComparisonEnabled(process.env, config) === false,
  );
  const decision = await deterministicResponse("en que unicacion estan?", config);
  const before = decision.responseText;
  const { result, lines } = captureAssistiveLogs((logger) =>
    handler.maybeLogCagAssistiveComparison({
      config,
      messageText: "en que unicacion estan?",
      deterministicIntent: decision.intent,
      deterministicResponse: decision.responseText,
      logger,
    }),
  );
  assert("no comparison result", result === null);
  assert("no eva_cag_assistive_shadow log", parseAssistiveLogs(lines).length === 0);
  const after = (await deterministicResponse("en que unicacion estan?", config)).responseText;
  assert("response unchanged", before === after);
}

// Case B — flag missing
console.log("\nCase B — EVA_CAG_ASSISTIVE_SHADOW missing");
applyEnv({
  EVA_CAG_RESPONSE_ENABLED: "true",
  WA_AGENT_MODE: "mock",
  EVA_LLM_ENABLED: "false",
  LLM_MODE: "off",
  GHL_SYNC_MODE: "dry_run",
  ACADEMIC_ENGINE_ENABLED: "true",
});
{
  const config = handler.getConfig();
  assert(
    "gate disabled when missing",
    handler.isCagAssistiveShadowComparisonEnabled(process.env, config) === false,
  );
  const decision = await deterministicResponse("esta cara no?", config);
  const { result, lines } = captureAssistiveLogs((logger) =>
    handler.maybeLogCagAssistiveComparison({
      config,
      messageText: "esta cara no?",
      deterministicIntent: decision.intent,
      deterministicResponse: decision.responseText,
      logger,
    }),
  );
  assert("no comparison result", result === null);
  assert("no log lines", parseAssistiveLogs(lines).length === 0);
}

// Case C — flag on + mock + response enabled
console.log("\nCase C — EVA_CAG_ASSISTIVE_SHADOW=true + EVA_CAG_RESPONSE_ENABLED=true");
applyEnv({
  EVA_CAG_ASSISTIVE_SHADOW: "true",
  EVA_CAG_RESPONSE_ENABLED: "true",
  WA_AGENT_MODE: "mock",
  EVA_LLM_ENABLED: "false",
  LLM_MODE: "off",
  GHL_SYNC_MODE: "dry_run",
  ACADEMIC_ENGINE_ENABLED: "true",
});
{
  const config = handler.getConfig();
  assert(
    "gate enabled",
    handler.isCagAssistiveShadowComparisonEnabled(process.env, config) === true,
  );

  const messages = [
    { text: "en que unicacion estan?", expectAvailable: true, expectCategory: "location" },
    { text: "esta cara no?", expectAvailable: true, expectCategory: "price_objection" },
    { text: "tienen reconocimiento oficial?", expectAvailable: true, expectCategory: "rvoe" },
    { text: "carreras online?", expectAvailable: true, expectCategory: "online_programs" },
    { text: "medicida tienen?", expectAvailable: true, expectCategory: "not_offered" },
    { text: "hola", expectAvailable: false, expectCategory: "unknown_or_greeting" },
  ];

  for (const msg of messages) {
    const decision = await deterministicResponse(msg.text, config);
    const before = decision.responseText;
    const { result, lines } = captureAssistiveLogs((logger) =>
      handler.maybeLogCagAssistiveComparison({
        config,
        env: process.env,
        messageText: msg.text,
        deterministicIntent: decision.intent,
        deterministicResponse: decision.responseText,
        contactContext: { normalized_phone: FULL_PHONE },
        logger,
      }),
    );
    assert(
      `comparison log for "${msg.text}"`,
      result !== null && result.event === "eva_cag_assistive_shadow",
    );
    assert(`category ${msg.text}`, result.category === msg.expectCategory);
    assert(
      `assistiveAvailable ${msg.text}`,
      result.assistiveResponseAvailable === msg.expectAvailable,
    );
    assert(`finalResponseModified ${msg.text}`, result.finalResponseModified === false);
    const logs = parseAssistiveLogs(lines);
    assert(`one log line ${msg.text}`, logs.length === 1);
    const safety = scanLogSafety(logs[0]);
    assert(`log safe ${msg.text}`, safety.length === 0, safety.join(", "));
    const after = (await deterministicResponse(msg.text, config)).responseText;
    assert(`response unchanged ${msg.text}`, before === after);
  }
}

// Case D — assistive shadow on but response disabled
console.log("\nCase D — EVA_CAG_ASSISTIVE_SHADOW=true + EVA_CAG_RESPONSE_ENABLED=false");
applyEnv({
  EVA_CAG_ASSISTIVE_SHADOW: "true",
  EVA_CAG_RESPONSE_ENABLED: "false",
  WA_AGENT_MODE: "mock",
  EVA_LLM_ENABLED: "false",
  LLM_MODE: "off",
  GHL_SYNC_MODE: "dry_run",
  ACADEMIC_ENGINE_ENABLED: "true",
});
{
  const config = handler.getConfig();
  const decision = await deterministicResponse("ubicacion?", config);
  const before = decision.responseText;
  const { result } = captureAssistiveLogs((logger) =>
    handler.maybeLogCagAssistiveComparison({
      config,
      env: process.env,
      messageText: "ubicacion?",
      deterministicIntent: decision.intent,
      deterministicResponse: decision.responseText,
      logger,
    }),
  );
  if (result) {
    assert("no assistive usable when response disabled", result.assistiveResponseAvailable === false);
    assert("recommendation disabled or blocked", ["disabled", "blocked"].includes(result.recommendation));
  }
  const after = (await deterministicResponse("ubicacion?", config)).responseText;
  assert("response unchanged case D", before === after);
}

// Case E — live_outbound blocked
console.log("\nCase E — live_outbound blocked");
applyEnv({
  EVA_CAG_ASSISTIVE_SHADOW: "true",
  EVA_CAG_RESPONSE_ENABLED: "true",
  WA_AGENT_MODE: "live_outbound",
  EVA_LLM_ENABLED: "false",
  LLM_MODE: "off",
  GHL_SYNC_MODE: "dry_run",
});
{
  const config = handler.getConfig();
  assert(
    "gate blocked live",
    handler.isCagAssistiveShadowComparisonEnabled(process.env, config) === false,
  );
  const decision = await deterministicResponse("ubicacion?", {
    ...config,
    mode: "live_outbound",
    evaLlmEnabled: false,
    evaLlmMode: "off",
  });
  const { result, lines } = captureAssistiveLogs((logger) =>
    handler.maybeLogCagAssistiveComparison({
      config: { ...config, mode: "live_outbound" },
      env: process.env,
      messageText: "ubicacion?",
      deterministicIntent: decision.intent,
      deterministicResponse: decision.responseText,
      logger,
    }),
  );
  assert("no comparison on live", result === null);
  assert("no log on live", parseAssistiveLogs(lines).length === 0);
}

// Case F — GHL live blocked
console.log("\nCase F — GHL live blocked");
applyEnv({
  EVA_CAG_ASSISTIVE_SHADOW: "true",
  EVA_CAG_RESPONSE_ENABLED: "true",
  WA_AGENT_MODE: "mock",
  EVA_LLM_ENABLED: "false",
  LLM_MODE: "off",
  GHL_SYNC_MODE: "live",
});
{
  const config = handler.getConfig();
  assert(
    "gate blocked ghl live",
    handler.isCagAssistiveShadowComparisonEnabled(process.env, config) === false,
  );
  const { result, lines } = captureAssistiveLogs((logger) =>
    handler.maybeLogCagAssistiveComparison({
      config,
      env: process.env,
      messageText: "tienen becas?",
      deterministicIntent: "beca",
      deterministicResponse: "becas test",
      logger,
    }),
  );
  assert("no comparison ghl live", result === null);
  assert("no log ghl live", parseAssistiveLogs(lines).length === 0);
}

// Case G — LLM on blocked
console.log("\nCase G — LLM on blocked");
applyEnv({
  EVA_CAG_ASSISTIVE_SHADOW: "true",
  EVA_CAG_RESPONSE_ENABLED: "true",
  WA_AGENT_MODE: "mock",
  EVA_LLM_ENABLED: "true",
  LLM_MODE: "rewrite",
  GHL_SYNC_MODE: "dry_run",
});
{
  const config = handler.getConfig();
  assert(
    "gate blocked llm",
    handler.isCagAssistiveShadowComparisonEnabled(process.env, config) === false,
  );
  const { result, lines } = captureAssistiveLogs((logger) =>
    handler.maybeLogCagAssistiveComparison({
      config,
      env: process.env,
      messageText: "tienen becas?",
      deterministicIntent: "beca",
      deterministicResponse: "becas test",
      logger,
    }),
  );
  assert("no comparison with llm on", result === null);
  assert("no log with llm on", parseAssistiveLogs(lines).length === 0);
}

console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
