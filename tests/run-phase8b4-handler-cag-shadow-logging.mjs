#!/usr/bin/env node
/**
 * Phase 8B.4 — Handler CAG shadow logging (mock only).
 * Usage: node tests/run-phase8b4-handler-cag-shadow-logging.mjs
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
    if (key.startsWith("EVA_CAG_") || key.startsWith("WA_AGENT_") || key.startsWith("EVA_LLM_") || key === "LLM_MODE") {
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

function captureShadowLogs(fn) {
  const lines = [];
  const logger = (line) => lines.push(String(line));
  const result = fn(logger);
  return { result, lines };
}

function parseShadowLogs(lines) {
  return lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((x) => x && x.event === "eva_cag_shadow");
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
  if (parsed.deterministicResponsePreview && String(parsed.deterministicResponsePreview).length > 300) {
    issues.push("long_response_preview");
  }
  return issues;
}

console.log("Phase 8B.4 — handler CAG shadow logging\n");

// Case A — flag off
console.log("Case A — EVA_CAG_SHADOW_LOGGING=false");
applyEnv({
  EVA_CAG_SHADOW_LOGGING: "false",
  WA_AGENT_MODE: "mock",
  EVA_LLM_ENABLED: "false",
  LLM_MODE: "off",
  ACADEMIC_ENGINE_ENABLED: "true",
});
{
  const config = handler.getConfig();
  assert("gate disabled", handler.isCagShadowLoggingEnabled(process.env, config) === false);
  const decision = await deterministicResponse("en que unicacion estan?", config);
  const before = decision.responseText;
  const { result, lines } = captureShadowLogs((logger) =>
    handler.maybeLogCagShadow({
      config,
      messageText: "en que unicacion estan?",
      deterministicIntent: decision.intent,
      deterministicResponse: decision.responseText,
      logger,
    }),
  );
  assert("no shadow result", result === null);
  assert("no eva_cag_shadow log", parseShadowLogs(lines).length === 0);
  const after = (await deterministicResponse("en que unicacion estan?", config)).responseText;
  assert("response unchanged", before === after);
}

// Case B — flag missing
console.log("\nCase B — EVA_CAG_SHADOW_LOGGING missing");
applyEnv({
  WA_AGENT_MODE: "mock",
  EVA_LLM_ENABLED: "false",
  LLM_MODE: "off",
  ACADEMIC_ENGINE_ENABLED: "true",
});
{
  const config = handler.getConfig();
  assert("gate disabled when missing", handler.isCagShadowLoggingEnabled(process.env, config) === false);
  const decision = await deterministicResponse("esta cara no?", config);
  const { result, lines } = captureShadowLogs((logger) =>
    handler.maybeLogCagShadow({
      config,
      messageText: "esta cara no?",
      deterministicIntent: decision.intent,
      deterministicResponse: decision.responseText,
      logger,
    }),
  );
  assert("no shadow result", result === null);
  assert("no log lines", parseShadowLogs(lines).length === 0);
}

// Case C — flag on + mock
console.log("\nCase C — EVA_CAG_SHADOW_LOGGING=true + mock");
applyEnv({
  EVA_CAG_SHADOW_LOGGING: "true",
  WA_AGENT_MODE: "mock",
  EVA_LLM_ENABLED: "false",
  LLM_MODE: "off",
  ACADEMIC_ENGINE_ENABLED: "true",
});
{
  const config = handler.getConfig();
  assert("gate enabled", handler.isCagShadowLoggingEnabled(process.env, config) === true);

  const messages = [
    { text: "en que unicacion estan?", expectMode: "CAG", expectCategory: "location" },
    { text: "esta cara no?", expectMode: "CAG", expectCategory: "price_objection" },
    { text: "tienen reconocimiento oficial?", expectMode: "CAG", expectCategory: "rvoe" },
    { text: "hola", expectMode: "NONE", expectCategory: "unknown_or_greeting" },
  ];

  for (const msg of messages) {
    const decision = await deterministicResponse(msg.text, config);
    const before = decision.responseText;
    const { result, lines } = captureShadowLogs((logger) =>
      handler.maybeLogCagShadow({
        config,
        messageText: msg.text,
        deterministicIntent: decision.intent,
        deterministicResponse: decision.responseText,
        conversationState: { normalized_phone: FULL_PHONE },
        logger,
      }),
    );
    assert(`shadow log for "${msg.text}"`, result !== null && result.event === "eva_cag_shadow");
    assert(`mode ${msg.text}`, result.knowledgeMode === msg.expectMode);
    assert(`category ${msg.text}`, result.category === msg.expectCategory);
    assert(`finalResponseModified ${msg.text}`, result.finalResponseModified === false);
    const logs = parseShadowLogs(lines);
    assert(`one log line ${msg.text}`, logs.length === 1);
    const safety = scanLogSafety(logs[0]);
    assert(`log safe ${msg.text}`, safety.length === 0, safety.join(", "));
    const after = (await deterministicResponse(msg.text, config)).responseText;
    assert(`response unchanged ${msg.text}`, before === after);
  }
}

// Case D — live_outbound blocked
console.log("\nCase D — live_outbound blocked");
applyEnv({
  EVA_CAG_SHADOW_LOGGING: "true",
  WA_AGENT_MODE: "live_outbound",
  EVA_LLM_ENABLED: "false",
  LLM_MODE: "off",
});
{
  const config = handler.getConfig();
  assert("gate blocked live", handler.isCagShadowLoggingEnabled(process.env, config) === false);
  const decision = await deterministicResponse("ubicacion?", {
    ...config,
    mode: "live_outbound",
    evaLlmEnabled: false,
    evaLlmMode: "off",
  });
  const { result, lines } = captureShadowLogs((logger) =>
    handler.maybeLogCagShadow({
      config: { ...config, mode: "live_outbound" },
      messageText: "ubicacion?",
      deterministicIntent: decision.intent,
      deterministicResponse: decision.responseText,
      logger,
    }),
  );
  assert("no shadow on live", result === null);
  assert("no log on live", parseShadowLogs(lines).length === 0);
}

// Case E — LLM on blocked
console.log("\nCase E — LLM on blocked");
applyEnv({
  EVA_CAG_SHADOW_LOGGING: "true",
  WA_AGENT_MODE: "mock",
  EVA_LLM_ENABLED: "true",
  LLM_MODE: "rewrite",
});
{
  const config = handler.getConfig();
  assert("gate blocked llm", handler.isCagShadowLoggingEnabled(process.env, config) === false);
  const { result, lines } = captureShadowLogs((logger) =>
    handler.maybeLogCagShadow({
      config,
      messageText: "tienen becas?",
      deterministicIntent: "beca",
      deterministicResponse: "becas test",
      logger,
    }),
  );
  assert("no shadow with llm on", result === null);
  assert("no log with llm on", parseShadowLogs(lines).length === 0);
}

console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
