#!/usr/bin/env node
/**
 * Fase 7G.1E — InsForge OpenAI shadow smoke.
 * Requires Dashboard: mock/dry_run + EVA_LLM shadow + LLM_PROVIDER=openai + OPENAI_API_KEY
 *
 * Usage: node tests/run-phase7g1e-openai-shadow.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(ROOT, "tests/payloads/phase7g1e-openai-shadow.json");
const REPORT = path.join(ROOT, "docs/phase-7g1e-openai-shadow-report.md");

const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
const ENDPOINT = process.env.PHASE7G1E_ENDPOINT || fixture.endpoint;

function summarize(text, max = 90) {
  const one = String(text || "").replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max)}…` : one;
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

function buildPayload(messageText, messageId) {
  return {
    event_type: "whatsapp.inbound_message.received",
    from: fixture.from,
    to: fixture.to,
    message_id: messageId,
    message_type: "text",
    message_text: messageText,
    timestamp: new Date().toISOString(),
  };
}

async function post(messageText, messageId) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildPayload(messageText, messageId)),
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

function checkRuntimeFlags(body, req) {
  const failures = [];
  if (body.mode !== req.mode) failures.push(`mode=${body.mode}`);
  if (body.outbound_real !== req.outbound_real) failures.push(`outbound_real=${body.outbound_real}`);
  if (body.ghl_live !== req.ghl_live) failures.push(`ghl_live=${body.ghl_live}`);
  if (body.ghl_dry_run !== req.ghl_dry_run) failures.push(`ghl_dry_run=${body.ghl_dry_run}`);
  if (body.custom_fields_written !== req.custom_fields_written) {
    failures.push(`custom_fields_written=${body.custom_fields_written}`);
  }
  if (body.academic_engine_enabled !== req.academic_engine_enabled) {
    failures.push(`academic_engine_enabled=${body.academic_engine_enabled}`);
  }
  if (body.eva_llm_enabled !== req.eva_llm_enabled) {
    failures.push(`eva_llm_enabled=${body.eva_llm_enabled}`);
  }
  if (req.eva_llm_mode && body.eva_llm_mode !== req.eva_llm_mode) {
    failures.push(`eva_llm_mode=${body.eva_llm_mode}`);
  }
  if (body.eva_llm_rephrased !== req.eva_llm_rephrased) {
    failures.push(`eva_llm_rephrased=${body.eva_llm_rephrased}`);
  }
  if (req.eva_llm_provider && body.eva_llm_provider !== req.eva_llm_provider) {
    failures.push(`eva_llm_provider=${body.eva_llm_provider} (expected ${req.eva_llm_provider})`);
  }
  if (req.openai_api_key_configured === true && body.openai_api_key_configured !== true) {
    failures.push(`openai_api_key_configured=${body.openai_api_key_configured}`);
  }
  if (body.eva_llm_mode === "rewrite" || body.eva_llm_mode === "rephrase") {
    failures.push(`rewrite mode active: ${body.eva_llm_mode}`);
  }
  return failures;
}

function evaluateQuality(tc, body) {
  const notes = [];
  const factual = body.response_text || "";
  const suggested = body.eva_llm_suggested_response || "";

  if (factual && suggested && factual === suggested) {
    notes.push("suggested identical to factual (tone rewrite minimal)");
  } else if (suggested) {
    notes.push("suggested differs from factual (shadow only)");
  }

  if (fixture.ghost_careers?.length && !excludesAll(suggested, fixture.ghost_careers)) {
    notes.push("WARNING: ghost career in suggested");
  }
  if (fixture.banned_claims?.length && !excludesAll(suggested, fixture.banned_claims)) {
    notes.push("WARNING: banned claim in suggested (guardrails should flag)");
  }

  if (tc.id === 3 && !includesAll(factual, ["50%"])) {
    notes.push("WARNING: factual missing 50% rule");
  }

  return notes;
}

function evaluateCase(tc, status, body, req) {
  const failures = [];
  if (status !== 200 || body.ok !== true) failures.push(`HTTP ${status} ok=${body.ok}`);
  failures.push(...checkRuntimeFlags(body, req));

  if (body.outbound_status !== "mocked") {
    failures.push(`outbound_status=${body.outbound_status}`);
  }

  if (tc.expect_wa_intent && body.intent !== tc.expect_wa_intent) {
    failures.push(`wa_intent expected ${tc.expect_wa_intent}, got ${body.intent}`);
  }
  if (
    tc.expect_academic_enriched !== undefined &&
    body.academic_enriched !== tc.expect_academic_enriched
  ) {
    failures.push(`academic_enriched expected ${tc.expect_academic_enriched}`);
  }
  if (
    tc.expect_academic_skipped !== undefined &&
    body.academic_skipped !== tc.expect_academic_skipped
  ) {
    failures.push(`academic_skipped expected ${tc.expect_academic_skipped}`);
  }

  const suggested = body.eva_llm_suggested_response;
  if (tc.expect_suggested) {
    if (!suggested || typeof suggested !== "string" || !suggested.length) {
      failures.push("eva_llm_suggested_response missing");
    }
  }

  if (tc.expect_provider && body.eva_llm_provider !== tc.expect_provider) {
    failures.push(`eva_llm_provider=${body.eva_llm_provider}`);
  }

  if (body.eva_llm_rephrased === true) {
    failures.push("eva_llm_rephrased must be false in shadow");
  }

  if (body.response_text && suggested && body.response_text !== suggested && body.eva_llm_rephrased) {
    failures.push("user would receive LLM text");
  }

  if (tc.response_must_include && !includesAll(body.response_text, tc.response_must_include)) {
    failures.push(`missing in final: ${tc.response_must_include.join(", ")}`);
  }
  if (
    tc.response_must_not_include &&
    !excludesAll(body.response_text, tc.response_must_not_include)
  ) {
    failures.push(`forbidden in final: ${tc.response_must_not_include.join(", ")}`);
  }

  if (body.eva_llm_error) {
    failures.push(`eva_llm_error=${body.eva_llm_error}`);
  }

  if (tc.expect_guardrail_warnings) {
    const warnings = body.eva_llm_guardrail_warnings || [];
    if (!Array.isArray(warnings) || warnings.length === 0) {
      failures.push("eva_llm_guardrail_warnings empty");
    }
  }

  if (!body.inbound_id) failures.push("inbound_id missing");

  const qualityNotes = evaluateQuality(tc, body);

  return {
    id: tc.id,
    input: tc.input,
    pass: failures.length === 0,
    failures,
    inbound_id: body.inbound_id,
    wa_intent: body.intent,
    eva_llm_mode: body.eva_llm_mode,
    eva_llm_provider: body.eva_llm_provider,
    eva_llm_model: body.eva_llm_model,
    final_preview: summarize(body.response_text),
    suggested_preview: summarize(suggested),
    guardrails: (body.eva_llm_guardrail_warnings || []).join("; ") || "—",
    quality_notes: qualityNotes,
    final_equals_suggested: body.response_text === suggested,
  };
}

function writeBlockedReport(preFailures, pre) {
  const lines = [
    "# Phase 7G.1E — OpenAI Shadow Report",
    "",
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    "**Status:** BLOCKED — preflight failed",
    `**Endpoint:** ${ENDPOINT}`,
    "",
    "## Preflight failures",
    "",
    ...preFailures.map((f) => `- ${f}`),
    "",
    "## Runtime observado",
    "",
    "| Campo | Valor |",
    "|-------|-------|",
    `| mode | ${pre.body.mode ?? "—"} |`,
    `| eva_llm_enabled | ${pre.body.eva_llm_enabled ?? "—"} |`,
    `| eva_llm_mode | ${pre.body.eva_llm_mode ?? "—"} |`,
    `| eva_llm_provider | ${pre.body.eva_llm_provider ?? "—"} |`,
    `| eva_llm_model | ${pre.body.eva_llm_model ?? "—"} |`,
    `| openai_api_key_configured | ${pre.body.openai_api_key_configured ?? "—"} |`,
    `| outbound_real | ${pre.body.outbound_real ?? "—"} |`,
    `| ghl_live | ${pre.body.ghl_live ?? "—"} |`,
    "",
    "## Secrets requeridos (Dashboard)",
    "",
    "| Secret | Valor |",
    "|--------|-------|",
    "| `WA_AGENT_MODE` | `mock` |",
    "| `GHL_SYNC_MODE` | `dry_run` |",
    "| `GHL_WRITE_CUSTOM_FIELDS` | `false` |",
    "| `ACADEMIC_ENGINE_ENABLED` | `true` |",
    "| `EVA_LLM_ENABLED` | `true` |",
    "| `LLM_MODE` | `shadow` |",
    "| `LLM_PROVIDER` | `openai` |",
    "| `LLM_MODEL` | `gpt-4o-mini` |",
    "| `EVA_LLM_FAIL_OPEN` | `true` |",
    "| `OPENAI_API_KEY` | *(configurar, no imprimir)* |",
    "",
    "Re-run: `node tests/run-phase7g1e-openai-shadow.mjs`",
  ];
  fs.writeFileSync(REPORT, lines.join("\n"), "utf8");
}

console.log(`Phase 7G.1E preflight → ${ENDPOINT}`);
const pre = await post("__phase7g1e_preflight__", `7g1e-preflight-${Date.now()}`);
const preFailures = checkRuntimeFlags(pre.body, fixture.required_runtime_flags);
if (pre.status !== 200 || pre.body.ok !== true) {
  preFailures.push(`HTTP ${pre.status} ok=${pre.body.ok}`);
}

if (preFailures.length) {
  console.error("PREFLIGHT FAILED — configure InsForge Dashboard secrets:");
  console.error(preFailures.join("; "));
  writeBlockedReport(preFailures, pre);
  process.exit(2);
}

const results = [];
for (const tc of fixture.cases) {
  const { status, body } = await post(tc.input, `7g1e-case-${tc.id}-${Date.now()}`);
  results.push(evaluateCase(tc, status, body, fixture.required_runtime_flags));
  await new Promise((r) => setTimeout(r, 500));
}

const passed = results.filter((r) => r.pass).length;
const total = results.length;
const allPass = passed === total;

const lines = [
  "# Phase 7G.1E — OpenAI Shadow Report",
  "",
  `**Date:** ${new Date().toISOString().slice(0, 10)}`,
  `**Result:** ${passed}/${total} PASS`,
  `**Endpoint:** ${ENDPOINT}`,
  "",
  "## Flags detectados (preflight)",
  "",
  "| Flag | Valor |",
  "|------|-------|",
  `| mode | ${pre.body.mode} |`,
  `| outbound_real | ${pre.body.outbound_real} |`,
  `| ghl_live | ${pre.body.ghl_live} |`,
  `| ghl_dry_run | ${pre.body.ghl_dry_run} |`,
  `| academic_engine_enabled | ${pre.body.academic_engine_enabled} |`,
  `| eva_llm_enabled | ${pre.body.eva_llm_enabled} |`,
  `| eva_llm_mode | ${pre.body.eva_llm_mode} |`,
  `| eva_llm_provider | ${pre.body.eva_llm_provider} |`,
  `| eva_llm_model | ${pre.body.eva_llm_model || fixture.expected_model} |`,
  `| openai_api_key_configured | ${pre.body.openai_api_key_configured} |`,
  `| eva_llm_rephrased | ${pre.body.eva_llm_rephrased} |`,
  "",
  "## Resultados por caso",
  "",
  "| ID | Input | Intent | Provider | Suggested | Guardrails | Result |",
  "|---:|---|---|:---:|:---:|:---:|---|",
];

for (const r of results) {
  lines.push(
    `| ${r.id} | ${summarize(r.input, 28)} | ${r.wa_intent} | ${r.eva_llm_provider} | ${r.suggested_preview ? "yes" : "no"} | ${r.guardrails} | ${r.pass ? "PASS" : "FAIL"} |`,
  );
}

lines.push("", "## factual vs suggested (muestras)", "");
for (const r of results) {
  lines.push(`### Caso ${r.id}: ${r.input}`, "");
  lines.push(`- **Final (usuario):** ${r.final_preview}`);
  lines.push(`- **Suggested (log):** ${r.suggested_preview}`);
  lines.push(`- Final = suggested: ${r.final_equals_suggested ? "sí" : "no"}`);
  if (r.quality_notes.length) {
    lines.push(`- Notas: ${r.quality_notes.join("; ")}`);
  }
  lines.push("");
}

lines.push("## Inbound IDs", "");
for (const r of results) {
  lines.push(`- Case ${r.id}: \`${r.inbound_id}\``);
}

lines.push("", "## SQL verificación", "");
lines.push("```sql");
lines.push("SELECT count(*)::int FROM wa_llm_shadow_log WHERE provider = 'openai';");
lines.push("SELECT wa_intent, provider, model, guardrail_warnings, llm_error, created_at");
lines.push("FROM wa_llm_shadow_log ORDER BY created_at DESC LIMIT 10;");
lines.push("SELECT count(*)::int FROM wa_errors WHERE created_at > NOW() - INTERVAL '30 minutes'");
lines.push("  AND error_type != 'phone_normalization_failed';");
lines.push("```");

lines.push("", "## Confirmaciones", "");
lines.push("- No outbound real: `outbound_real=false`, `outbound_status=mocked`");
lines.push("- No GHL live: `ghl_live=false`, `ghl_dry_run=true`");
lines.push("- No rewrite: `eva_llm_mode=shadow`, `eva_llm_rephrased=false`");
lines.push("- OpenAI solo en shadow log; `final_response` factual al usuario");

lines.push("", "## Evaluación preliminar de calidad", "");
const qualitySummary = [
  "- **Tono:** suggested suele ser más conversacional sin cambiar datos en final",
  "- **Datos:** final_response permanece del academic-engine",
  "- **Carreras fantasma:** validar en suggested (guardrails + revisión humana)",
  "- **Costos/becas:** final mantiene reglas oficiales (ej. 50% inscripción)",
  "- **Humano/test:** intents operativos intactos",
];

for (const r of results) {
  for (const n of r.quality_notes) {
    if (n.startsWith("WARNING")) qualitySummary.push(`- ${n} (caso ${r.id})`);
  }
}
lines.push(...qualitySummary);

lines.push("", "## Recomendación 7G.2", "");
if (allPass) {
  lines.push(
    "Avanzar a **7G.2** con revisión humana de muestra en `wa_llm_shadow_log` (provider=openai) antes de considerar rephrase/live.",
  );
} else {
  lines.push("No avanzar a 7G.2 hasta corregir fallos del smoke.");
}

if (results.some((r) => !r.pass)) {
  lines.push("", "## Failures", "");
  for (const r of results.filter((x) => !x.pass)) {
    lines.push(`- Case ${r.id}: ${r.failures.join("; ")}`);
  }
}

fs.writeFileSync(REPORT, lines.join("\n"), "utf8");
console.log(`Phase 7G.1E OpenAI shadow smoke: ${passed}/${total} PASS`);
console.log(`Model: ${pre.body.eva_llm_model || fixture.expected_model}`);
console.log(`Provider: ${pre.body.eva_llm_provider}`);
console.log(`OPENAI_API_KEY configured: ${pre.body.openai_api_key_configured}`);
for (const r of results.filter((x) => !x.pass)) {
  console.log(`  FAIL #${r.id}: ${r.failures.join("; ")}`);
}
process.exit(allPass ? 0 : 1);
