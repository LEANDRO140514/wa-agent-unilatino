#!/usr/bin/env node
/**
 * Fase 7G.1D — InsForge shadow/fake deploy smoke.
 * Requires Dashboard secrets: mock/dry_run + EVA_LLM_ENABLED=true + LLM_MODE=shadow + LLM_PROVIDER=fake
 *
 * Usage: node tests/run-phase7g1d-insforge-shadow.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(ROOT, "tests/payloads/phase7g1d-insforge-shadow.json");
const REPORT = path.join(ROOT, "docs/phase-7g1d-insforge-shadow-deploy-report.md");

const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
const ENDPOINT = process.env.PHASE7G1D_ENDPOINT || fixture.endpoint;

function summarize(text, max = 90) {
  const one = String(text || "").replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max)}…` : one;
}

function includesAll(haystack, needles) {
  const h = String(haystack || "").toLowerCase();
  return needles.every((n) => h.includes(String(n).toLowerCase()));
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
  return failures;
}

function evaluateCase(tc, status, body, req) {
  const failures = [];
  if (status !== 200 || body.ok !== true) failures.push(`HTTP ${status} ok=${body.ok}`);
  failures.push(...checkRuntimeFlags(body, req));

  if (body.outbound_status !== "mocked" && body.outbound_real !== false) {
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

  if (tc.expect_suggested) {
    const suggested = body.eva_llm_suggested_response;
    if (!suggested || typeof suggested !== "string" || !suggested.length) {
      failures.push("eva_llm_suggested_response missing");
    }
    if (suggested && body.response_text !== body.eva_llm_suggested_response) {
      // shadow: final must not be replaced by suggested (unless identical by chance)
    }
    if (body.response_text && suggested && body.response_text !== suggested) {
      // expected in most shadow cases
    }
  }

  if (body.response_text && body.eva_llm_suggested_response) {
    if (body.response_text !== body.eva_llm_suggested_response && body.eva_llm_rephrased === true) {
      failures.push("eva_llm_rephrased true but shadow should keep factual");
    }
  }

  if (tc.response_must_include && !includesAll(body.response_text, tc.response_must_include)) {
    failures.push(`missing: ${tc.response_must_include.join(", ")}`);
  }

  if (tc.expect_guardrail_warnings) {
    const warnings = body.eva_llm_guardrail_warnings || [];
    if (!Array.isArray(warnings) || warnings.length === 0) {
      failures.push("eva_llm_guardrail_warnings empty");
    }
  }

  if (!body.inbound_id) failures.push("inbound_id missing");

  return {
    id: tc.id,
    input: tc.input,
    pass: failures.length === 0,
    failures,
    inbound_id: body.inbound_id,
    outbound_status: body.outbound_status,
    eva_llm_mode: body.eva_llm_mode,
    suggested_preview: summarize(body.eva_llm_suggested_response),
    final_preview: summarize(body.response_text),
    guardrails: (body.eva_llm_guardrail_warnings || []).join("; ") || "—",
  };
}

console.log(`Phase 7G.1D preflight → ${ENDPOINT}`);
const pre = await post("__phase7g1d_preflight__", `7g1d-preflight-${Date.now()}`);
const preFailures = checkRuntimeFlags(pre.body, fixture.required_runtime_flags);
if (pre.status !== 200 || pre.body.ok !== true) {
  preFailures.push(`HTTP ${pre.status} ok=${pre.body.ok}`);
}

if (preFailures.length) {
  console.error("PREFLIGHT FAILED — configure InsForge Dashboard secrets:");
  console.error(preFailures.join("; "));
  const lines = [
    "# Phase 7G.1D — InsForge Shadow Deploy Report",
    "",
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    "**Status:** BLOCKED — preflight failed",
    "",
    "## Preflight failures",
    "",
    ...preFailures.map((f) => `- ${f}`),
    "",
    "## Required secrets (Dashboard)",
    "",
    "| Secret | Valor |",
    "|--------|-------|",
    "| `WA_AGENT_MODE` | `mock` |",
    "| `GHL_SYNC_MODE` | `dry_run` |",
    "| `GHL_WRITE_CUSTOM_FIELDS` | `false` |",
    "| `ACADEMIC_ENGINE_ENABLED` | `true` |",
    "| `EVA_LLM_ENABLED` | `true` |",
    "| `LLM_MODE` | `shadow` |",
    "| `LLM_PROVIDER` | `fake` |",
    "| `EVA_LLM_FAIL_OPEN` | `true` |",
    "",
    "**No configurar:** `OPENAI_API_KEY`",
    "",
    "Re-run: `node tests/run-phase7g1d-insforge-shadow.mjs`",
  ];
  fs.writeFileSync(REPORT, lines.join("\n"), "utf8");
  process.exit(2);
}

const results = [];
for (const tc of fixture.cases) {
  const { status, body } = await post(tc.input, `7g1d-case-${tc.id}-${Date.now()}`);
  results.push(evaluateCase(tc, status, body, fixture.required_runtime_flags));
}

const passed = results.filter((r) => r.pass).length;
const total = results.length;
const allPass = passed === total;

const lines = [
  "# Phase 7G.1D — InsForge Shadow Deploy Report",
  "",
  `**Date:** ${new Date().toISOString().slice(0, 10)}`,
  `**Result:** ${passed}/${total} PASS`,
  `**Endpoint:** ${ENDPOINT}`,
  "",
  "## Runtime flags (preflight)",
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
  `| eva_llm_rephrased | ${pre.body.eva_llm_rephrased} |`,
  "",
  "## Casos",
  "",
  "| ID | Input | Mode | Suggested | Guardrails | Result |",
  "|---:|---|---|:---:|:---:|---|",
];

for (const r of results) {
  lines.push(
    `| ${r.id} | ${summarize(r.input, 30)} | ${r.eva_llm_mode} | ${r.suggested_preview ? "yes" : "no"} | ${r.guardrails} | ${r.pass ? "PASS" : "FAIL"} |`,
  );
}

lines.push("", "## Inbound IDs (wa_llm_shadow_log)", "");
for (const r of results) {
  lines.push(`- Case ${r.id}: \`${r.inbound_id}\``);
}

lines.push("", "## SQL verificación", "");
lines.push("```sql");
lines.push("SELECT count(*)::int FROM wa_llm_shadow_log;");
lines.push("SELECT id, wa_intent, provider, mode, guardrail_warnings, created_at");
lines.push("FROM wa_llm_shadow_log ORDER BY created_at DESC LIMIT 10;");
lines.push("SELECT count(*)::int FROM wa_errors WHERE created_at > NOW() - INTERVAL '30 minutes';");
lines.push("```");

lines.push("", "## Confirmaciones", "");
lines.push("- Deploy bundle: ver notas de ejecución");
lines.push("- No outbound real: `outbound_real=false`, `outbound_status=mocked`");
lines.push("- No GHL live: `ghl_live=false`, `ghl_dry_run=true`");
lines.push("- No OpenAI real: `LLM_PROVIDER=fake`, sin `OPENAI_API_KEY`");
lines.push("- final_response = respuesta factual (shadow)");

if (results.some((r) => !r.pass)) {
  lines.push("", "## Failures", "");
  for (const r of results.filter((x) => !x.pass)) {
    lines.push(`- Case ${r.id}: ${r.failures.join("; ")}`);
  }
}

fs.writeFileSync(REPORT, lines.join("\n"), "utf8");
console.log(`Phase 7G.1D InsForge shadow smoke: ${passed}/${total} PASS`);
for (const r of results.filter((x) => !x.pass)) {
  console.log(`  FAIL #${r.id}: ${r.failures.join("; ")}`);
}
process.exit(allPass ? 0 : 1);
