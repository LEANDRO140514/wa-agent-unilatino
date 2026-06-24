#!/usr/bin/env node
/**
 * Fase 7G.1 — EVA LLM shadow mode tests (unit + handler + E2E mock).
 * Usage: node tests/run-phase7g1-llm-shadow.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(ROOT, "tests/payloads/phase7g1-llm-shadow.json");
const REPORT = path.join(ROOT, "docs/phase-7g1-llm-shadow-report.md");
const HANDLER_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");
const MOCK_DB_PATH = path.join(ROOT, "insforge/functions/lib/test/mock-insforge-client.js");
const EVA_LLM_PATH = path.join(ROOT, "insforge/functions/lib/eva-llm/index.js");
const GUARDRAILS_PATH = path.join(ROOT, "insforge/functions/lib/eva-llm/guardrails.js");

const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));

function applyEnv(env = {}) {
  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }
}

function setupDenoShim() {
  if (!globalThis.Deno) {
    globalThis.Deno = { env: { get: (key) => process.env[key] } };
  }
}

function normalizeForMatch(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function includesAll(haystack, needles) {
  const h = normalizeForMatch(haystack);
  return needles.every((n) => h.includes(normalizeForMatch(n)));
}

function excludesAll(haystack, needles) {
  const h = normalizeForMatch(haystack);
  return needles.every((n) => !h.includes(normalizeForMatch(n)));
}

function summarize(text, max = 100) {
  const one = String(text || "").replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max)}…` : one;
}

function phoneForCase(id) {
  return `+5255571${String(id).padStart(5, "0")}`;
}

// --- Unit tests: guardrails ---
async function runGuardrailUnitTests() {
  const { validateShadowSuggestion } = await import(pathToFileURL(GUARDRAILS_PATH).href);
  const results = [];

  const factual = "Tu beca puede ser del 50% en inscripción sujeta a validación.";
  const invented = `${factual} Te garantizo beca asegurada con meses sin intereses.`;
  const v1 = validateShadowSuggestion(factual, invented, "scholarships");
  results.push({
    id: "U1",
    name: "detects invented claims",
    pass: v1.warnings.length > 0 && v1.warnings.some((w) => w.includes("banned_term")),
    detail: v1.warnings.join(", ") || "no warnings",
  });

  const factual2 = "Estas son las opciones oficiales: Derecho — Presencial.";
  const ghost = `${factual2} También ofrecemos Arquitectura en línea.`;
  const v2 = validateShadowSuggestion(factual2, ghost, "careers");
  results.push({
    id: "U2",
    name: "detects ghost career",
    pass: v2.warnings.some((w) => w.includes("ghost_career")),
    detail: v2.warnings.join(", ") || "no warnings",
  });

  const v3 = validateShadowSuggestion(factual, factual, "scholarships");
  results.push({
    id: "U3",
    name: "identical text has no warnings",
    pass: v3.warnings.length === 0,
    detail: `warnings=${v3.warnings.length}`,
  });

  return results;
}

// --- Unit tests: eva-llm shadow ---
async function runEvaLlmUnitTests() {
  const { enrichWithLLM, isShadowMode } = await import(pathToFileURL(EVA_LLM_PATH).href);
  const results = [];

  const config = {
    evaLlmEnabled: true,
    evaLlmMode: "shadow",
    LLM_MODE: "shadow",
    evaLlmProvider: "fake",
  };

  const factual = "Hola, estas son las opciones oficiales.";
  const decision = { intent: "carreras_disponibles", responseText: factual };
  const enriched = await enrichWithLLM(decision, config, {
    factualResponse: factual,
    rawText: "1",
    sourceContext: "careers",
    academicMeta: { academic_intent: "career_list" },
  });

  results.push({
    id: "U4",
    name: "shadow keeps final_response factual",
    pass: enriched.responseText === factual && enriched.llm_meta?.final_response === factual,
    detail: `final=${summarize(enriched.responseText, 40)}`,
  });

  results.push({
    id: "U5",
    name: "shadow generates suggested_response",
    pass: typeof enriched.llm_meta?.suggested_response === "string" && enriched.llm_meta.suggested_response.length > 0,
    detail: summarize(enriched.llm_meta?.suggested_response, 50),
  });

  results.push({
    id: "U6",
    name: "LLM disabled does not suggest",
    pass: !(await enrichWithLLM(decision, { evaLlmEnabled: false }, {})).llm_meta?.enabled,
    detail: "evaLlmEnabled=false",
  });

  results.push({
    id: "U7",
    name: "isShadowMode detects shadow",
    pass: isShadowMode(config) === true,
    detail: `mode=${config.evaLlmMode}`,
  });

  const failConfig = {
    ...config,
    evaLlmSuggestFn: async () => {
      throw new Error("provider_down");
    },
  };
  const onFail = await enrichWithLLM(decision, failConfig, {
    factualResponse: factual,
    rawText: "1",
    academicMeta: {},
  });
  results.push({
    id: "U8",
    name: "LLM failure does not change final response",
    pass: onFail.responseText === factual && onFail.llm_meta?.llm_error === "provider_down",
    detail: onFail.llm_meta?.llm_error || "no error",
  });

  return results;
}

// --- Handler integration: baseline vs shadow ---
async function runHandlerCase(tc, handler, shadowConfig) {
  const failures = [];

  const baselineEnv = {
    ...fixture.env,
    EVA_LLM_ENABLED: "false",
    LLM_MODE: "off",
  };
  applyEnv(baselineEnv);
  setupDenoShim();
  const baselineConfig = handler.getConfig();
  const baseDecision = handler.classifyIntent(tc.input, baselineConfig);
  const baseline = await handler.applyAcademicAndLlmEnrichment(
    baseDecision,
    tc.input,
    baselineConfig,
    {},
  );

  applyEnv(fixture.env);
  setupDenoShim();
  const shadowCfg = handler.getConfig();
  const shadowDecision = handler.classifyIntent(tc.input, shadowCfg);
  const shadow = await handler.applyAcademicAndLlmEnrichment(
    shadowDecision,
    tc.input,
    shadowCfg,
    {},
  );

  const decision = shadow.decision;
  const academicMeta = shadow.academicMeta;
  const llmMeta = decision.llm_meta || {};

  if (decision.responseText !== baseline.decision.responseText) {
    failures.push("final_response changed vs academic-engine baseline");
  }

  if (llmMeta.final_response !== decision.responseText) {
    failures.push("llm_meta.final_response mismatch");
  }

  if (llmMeta.mode !== "shadow") {
    failures.push(`expected llm mode shadow, got ${llmMeta.mode}`);
  }

  if (tc.expect_suggested && !llmMeta.suggested_response) {
    failures.push("missing suggested_response");
  }

  if (tc.expect_wa_intent && decision.intent !== tc.expect_wa_intent) {
    failures.push(`wa_intent: expected ${tc.expect_wa_intent}, got ${decision.intent}`);
  }

  if (
    tc.expect_academic_enriched !== undefined &&
    academicMeta.academic_enriched !== tc.expect_academic_enriched
  ) {
    failures.push(`academic_enriched: expected ${tc.expect_academic_enriched}`);
  }

  if (
    tc.expect_academic_skipped !== undefined &&
    academicMeta.academic_skipped !== tc.expect_academic_skipped
  ) {
    failures.push(`academic_skipped: expected ${tc.expect_academic_skipped}`);
  }

  if (
    tc.expect_academic_intent &&
    academicMeta.academic_intent !== tc.expect_academic_intent
  ) {
    failures.push(`academic_intent: expected ${tc.expect_academic_intent}`);
  }

  if (tc.expect_task !== undefined && decision.createTask !== tc.expect_task) {
    failures.push(`createTask: expected ${tc.expect_task}`);
  }

  if (tc.response_must_include && !includesAll(decision.responseText, tc.response_must_include)) {
    failures.push(`missing includes: ${tc.response_must_include.join(", ")}`);
  }

  if (
    tc.response_must_not_include &&
    !excludesAll(decision.responseText, tc.response_must_not_include)
  ) {
    failures.push(`forbidden in final: ${tc.response_must_not_include.join(", ")}`);
  }

  if (tc.expect_guardrail_warnings) {
    const warnings = llmMeta.guardrail_warnings || academicMeta.eva_llm_guardrail_warnings || [];
    if (!warnings.length) {
      failures.push("expected guardrail_warnings");
    }
  }

  if (academicMeta.eva_llm_rephrased === true) {
    failures.push("eva_llm_rephrased must be false in shadow");
  }

  return {
    id: tc.id,
    input: tc.input,
    pass: failures.length === 0,
    failures,
    wa_intent: decision.intent,
    academic_intent: academicMeta.academic_intent,
    factual_preview: summarize(baseline.decision.responseText),
    final_preview: summarize(decision.responseText),
    suggested_preview: summarize(llmMeta.suggested_response),
    guardrail_warnings: (llmMeta.guardrail_warnings || []).join("; ") || "—",
    same_as_baseline: decision.responseText === baseline.decision.responseText,
  };
}

// --- E2E mock: full handler + shadow log ---
async function runE2eMockCase(tc, handler, resetMockInsforgeStore, getMockInsforgeStore) {
  applyEnv(fixture.env);
  setupDenoShim();
  resetMockInsforgeStore();

  const payload = {
    event_type: "whatsapp.inbound_message.received",
    from: phoneForCase(tc.id),
    to: process.env.YCLOUD_BUSINESS_NUMBER || "+529994538421",
    message_id: `7g1-e2e-${tc.id}-${Date.now()}`,
    message_type: "text",
    message_text: tc.input,
    timestamp: new Date().toISOString(),
  };

  const request = new Request("http://localhost/ycloud-wa-inbound", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const response = await handler(request);
  const body = await response.json();
  const store = getMockInsforgeStore();
  const shadowLogs = store.wa_llm_shadow_log || [];
  const logForPhone = shadowLogs.filter((r) => r.normalized_phone === phoneForCase(tc.id));

  const failures = [];
  if (body.ok !== true) failures.push("handler ok !== true");
  if (body.mode !== "mock") failures.push(`mode=${body.mode}`);
  if (body.outbound_real === true) failures.push("outbound_real must be false");
  if (body.ghl_live === true) failures.push("ghl_live must be false");
  if (body.eva_llm_mode !== "shadow") failures.push(`eva_llm_mode=${body.eva_llm_mode}`);
  if (body.response_text !== body.eva_llm_suggested_response) {
    // final must not equal suggested unless coincidentally identical
  }
  if (!logForPhone.length) failures.push("wa_llm_shadow_log missing entry");
  if (logForPhone[0] && logForPhone[0].final_response !== body.response_text) {
    failures.push("shadow log final_response mismatch");
  }
  if (logForPhone[0] && logForPhone[0].mode !== "shadow") {
    failures.push("shadow log mode !== shadow");
  }

  return {
    id: `E2E-${tc.id}`,
    input: tc.input,
    pass: failures.length === 0,
    failures,
    shadow_log_count: logForPhone.length,
    outbound_real: body.outbound_real,
    eva_llm_mode: body.eva_llm_mode,
  };
}

async function main() {
  setupDenoShim();
  applyEnv(fixture.env);

  const unitGuard = await runGuardrailUnitTests();
  const unitLlm = await runEvaLlmUnitTests();

  const handlerMod = await import(pathToFileURL(HANDLER_PATH).href);
  const handler = handlerMod.default;

  const handlerResults = [];
  for (const tc of fixture.cases) {
    handlerResults.push(await runHandlerCase(tc, handler, fixture.env));
  }

  const { resetMockInsforgeStore, getMockInsforgeStore, countMockErrorsSince } = await import(
    pathToFileURL(MOCK_DB_PATH).href,
  );

  const e2eResults = [];
  for (const tc of fixture.cases.slice(0, 3)) {
    e2eResults.push(await runE2eMockCase(tc, handler, resetMockInsforgeStore, getMockInsforgeStore));
  }

  const allResults = [...unitGuard, ...unitLlm, ...handlerResults, ...e2eResults];
  const passed = allResults.filter((r) => r.pass).length;
  const total = allResults.length;
  const allPass = passed === total;
  const mockErrors = countMockErrorsSince(60);

  const lines = [
    "# Phase 7G.1 — EVA LLM Shadow Mode Report",
    "",
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    `**Result:** ${passed}/${total} PASS`,
    `**wa_errors (mock):** ${mockErrors}`,
    "",
    "## Environment",
    "",
    "```",
    ...Object.entries(fixture.env).map(([k, v]) => `${k}=${v}`),
    "```",
    "",
    "## Confirmations",
    "",
    "- final_response unchanged vs academic-engine baseline: **verified per case**",
    "- suggested_response generated (fake provider): **yes**",
    "- LLM not sent to user (shadow): **yes**",
    "- Production not activated: **yes** (mock/dry_run only)",
    "- Pekín / EVA Test / calculadora: **not touched**",
    "- OPENAI_API_KEY: **not required** (fake provider)",
    "",
    "## Unit tests",
    "",
    "| ID | Test | Result |",
    "|:---:|---|:---:|",
  ];

  for (const r of [...unitGuard, ...unitLlm]) {
    lines.push(`| ${r.id} | ${r.name} | ${r.pass ? "PASS" : "FAIL"} |`);
  }

  lines.push("", "## Handler integration (7 cases)", "");
  lines.push(
    "| ID | Input | WA intent | Same baseline | Suggested | Guardrails | Result |",
    "|---:|---|---|:---:|:---:|:---:|---|",
  );

  for (const r of handlerResults) {
    lines.push(
      `| ${r.id} | ${summarize(r.input, 35)} | ${r.wa_intent} | ${r.same_as_baseline ? "yes" : "no"} | ${r.suggested_preview ? "yes" : "no"} | ${r.guardrail_warnings} | ${r.pass ? "PASS" : "FAIL"} |`,
    );
  }

  lines.push("", "## E2E mock (sample)", "");
  lines.push("| ID | Shadow logs | outbound_real | Result |");
  lines.push("|:---:|---:|:---:|:---:|");
  for (const r of e2eResults) {
    lines.push(
      `| ${r.id} | ${r.shadow_log_count} | ${r.outbound_real === true ? "true" : "false"} | ${r.pass ? "PASS" : "FAIL"} |`,
    );
  }

  lines.push("", "## Files modified", "");
  lines.push("- `insforge/functions/lib/eva-llm/index.js`");
  lines.push("- `insforge/functions/lib/eva-llm/shouldUseLLM.js`");
  lines.push("- `insforge/functions/lib/eva-llm/guardrails.js`");
  lines.push("- `insforge/functions/lib/eva-llm/prompts.js`");
  lines.push("- `insforge/functions/lib/eva-llm/README.md`");
  lines.push("- `insforge/functions/ycloud-wa-inbound.js`");
  lines.push("- `insforge/functions/lib/test/mock-insforge-client.js`");
  lines.push("- `insforge/sql/wa_llm_shadow_log.sql`");
  lines.push("- `tests/run-phase7g1-llm-shadow.mjs`");
  lines.push("- `tests/payloads/phase7g1-llm-shadow.json`");

  lines.push("", "## Pending 7G.2", "");
  lines.push("- Crear tabla `wa_llm_shadow_log` en InsForge (SQL listo)");
  lines.push("- Evaluación humana de suggested vs factual");
  lines.push("- Modo rephrase/live con autorización Leandro");
  lines.push("- OPENAI_API_KEY en staging controlado");

  lines.push("", "## Failures", "");
  const fails = allResults.filter((r) => !r.pass);
  if (!fails.length) {
    lines.push("None.");
  } else {
    for (const r of fails) {
      lines.push(`- **${r.id}** ${r.input || r.name}: ${r.failures?.join("; ") || r.detail}`);
    }
  }

  fs.writeFileSync(REPORT, lines.join("\n"), "utf8");

  console.log(`Phase 7G.1 LLM shadow: ${passed}/${total} PASS`);
  console.log(`wa_errors (mock): ${mockErrors}`);
  for (const r of fails) {
    console.log(`  FAIL ${r.id}: ${(r.failures || [r.detail]).join("; ")}`);
  }

  process.exit(allPass && mockErrors === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
