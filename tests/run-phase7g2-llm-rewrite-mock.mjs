#!/usr/bin/env node
/**
 * Fase 7G.2 — InsForge rewrite mock/dry_run smoke (allowlist segura).
 * Requires: LLM_MODE=rewrite + mock/dry_run + OPENAI_API_KEY
 *
 * Usage: node tests/run-phase7g2-llm-rewrite-mock.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(ROOT, "tests/payloads/phase7g2-llm-rewrite-mock.json");
const REPORT = path.join(ROOT, "docs/phase-7g2-llm-rewrite-mock-report.md");

const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
const ENDPOINT = process.env.PHASE7G2_ENDPOINT || fixture.endpoint;

function summarize(text, max = 90) {
  const one = String(text || "").replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max)}…` : one;
}

function includesAll(haystack, needles) {
  const h = String(haystack || "").toLowerCase();
  return needles.every((n) => h.includes(String(n).toLowerCase()));
}

function buildPayload(tc, messageId) {
  return {
    event_type: "whatsapp.inbound_message.received",
    from: fixture.from,
    to: fixture.to,
    message_id: messageId,
    message_type: tc.message_type || "text",
    message_text: tc.input ?? "",
    timestamp: new Date().toISOString(),
  };
}

async function post(tc, messageId) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildPayload(tc, messageId)),
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
  if (body.eva_llm_enabled !== req.eva_llm_enabled) failures.push(`eva_llm_enabled=${body.eva_llm_enabled}`);
  if (req.eva_llm_mode && body.eva_llm_mode !== req.eva_llm_mode) {
    failures.push(`eva_llm_mode=${body.eva_llm_mode}`);
  }
  if (req.eva_llm_provider && body.eva_llm_provider !== req.eva_llm_provider) {
    failures.push(`eva_llm_provider=${body.eva_llm_provider}`);
  }
  if (req.openai_api_key_configured === true && body.openai_api_key_configured !== true) {
    failures.push(`openai_api_key_configured=${body.openai_api_key_configured}`);
  }
  if (body.eva_llm_mode === "shadow") failures.push("still in shadow mode");
  return failures;
}

function evaluateCase(tc, status, body, req) {
  const failures = [];
  if (status !== 200 || body.ok !== true) failures.push(`HTTP ${status} ok=${body.ok}`);
  failures.push(...checkRuntimeFlags(body, req));

  if (body.outbound_status !== "mocked") failures.push(`outbound_status=${body.outbound_status}`);

  if (tc.expect_wa_intent && body.intent !== tc.expect_wa_intent) {
    failures.push(`wa_intent expected ${tc.expect_wa_intent}, got ${body.intent}`);
  }

  const blockReason = body.eva_llm_block_reason ?? null;
  if (tc.expect_block_reason !== undefined) {
    if (tc.expect_block_reason === null && blockReason) {
      failures.push(`unexpected block_reason=${blockReason}`);
    } else if (tc.expect_block_reason && blockReason !== tc.expect_block_reason) {
      failures.push(`block_reason expected ${tc.expect_block_reason}, got ${blockReason}`);
    }
  }

  if (tc.expect_rephrased === true && body.eva_llm_rephrased !== true) {
    failures.push(`eva_llm_rephrased expected true, got ${body.eva_llm_rephrased}`);
  }
  if (tc.expect_rephrased === false && body.eva_llm_rephrased === true) {
    failures.push("eva_llm_rephrased must be false");
  }

  if (tc.expect_rewrite_allowed === false && body.eva_llm_rephrased === true) {
    failures.push("rewrite occurred on blocked intent");
  }

  if (tc.expect_needs_human !== undefined && body.wa_needs_human !== tc.expect_needs_human) {
    failures.push(`wa_needs_human expected ${tc.expect_needs_human}`);
  }
  if (tc.expect_create_task !== undefined) {
    const task = body.ghl_would_create_task === true;
    if (task !== tc.expect_create_task) failures.push(`createTask expected ${tc.expect_create_task}`);
  }

  if (tc.response_must_include && !includesAll(body.response_text, tc.response_must_include)) {
    failures.push(`missing: ${tc.response_must_include.join(", ")}`);
  }

  if (tc.expect_guardrail_warnings) {
    const w = body.eva_llm_guardrail_warnings || [];
    if (!Array.isArray(w) || w.length === 0) failures.push("guardrail_warnings empty");
  }

  if (body.eva_llm_error && tc.expect_rephrased === true) {
    failures.push(`eva_llm_error=${body.eva_llm_error}`);
  }

  return {
    id: tc.id,
    input: tc.input || `(${tc.message_type})`,
    pass: failures.length === 0,
    failures,
    wa_intent: body.intent,
    rephrased: body.eva_llm_rephrased,
    block_reason: blockReason || "—",
    final_preview: summarize(body.response_text),
    suggested_preview: summarize(body.eva_llm_suggested_response),
    guardrails: (body.eva_llm_guardrail_warnings || []).join("; ") || "—",
    inbound_id: body.inbound_id,
  };
}

function writeBlocked(preFailures, pre) {
  const lines = [
    "# Phase 7G.2 — Rewrite Mock Report",
    "",
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    "**Status:** BLOCKED — preflight failed",
    "",
    ...preFailures.map((f) => `- ${f}`),
    "",
    "Set InsForge secrets: `LLM_MODE=rewrite` (keep mock/dry_run)",
    "",
    "Re-run: `node tests/run-phase7g2-llm-rewrite-mock.mjs`",
  ];
  fs.writeFileSync(REPORT, lines.join("\n"), "utf8");
}

console.log(`Phase 7G.2 preflight → ${ENDPOINT}`);
const pre = await post({ input: "__phase7g2_preflight__" }, `7g2-preflight-${Date.now()}`);
const preFailures = checkRuntimeFlags(pre.body, fixture.required_runtime_flags);
if (pre.status !== 200 || pre.body.ok !== true) preFailures.push(`HTTP ${pre.status}`);

if (preFailures.length) {
  console.error("PREFLIGHT FAILED:", preFailures.join("; "));
  writeBlocked(preFailures, pre);
  process.exit(2);
}

const results = [];
for (const tc of fixture.cases) {
  const { status, body } = await post(tc, `7g2-case-${tc.id}-${Date.now()}`);
  results.push(evaluateCase(tc, status, body, fixture.required_runtime_flags));
  await new Promise((r) => setTimeout(r, 600));
}

const passed = results.filter((r) => r.pass).length;
const total = results.length;
const rephrasedCount = results.filter((r) => r.rephrased === true).length;
const blockedCount = results.filter((r) => r.block_reason && r.block_reason !== "—").length;

const lines = [
  "# Phase 7G.2 — Rewrite Mock/Dry_run Report",
  "",
  `**Date:** ${new Date().toISOString().slice(0, 10)}`,
  `**Result:** ${passed}/${total} PASS`,
  `**Endpoint:** ${ENDPOINT}`,
  "",
  "## Flags (preflight)",
  "",
  `| mode | ${pre.body.mode} |`,
  `| eva_llm_mode | ${pre.body.eva_llm_mode} |`,
  `| eva_llm_provider | ${pre.body.eva_llm_provider} |`,
  `| eva_llm_model | ${pre.body.eva_llm_model || fixture.expected_model} |`,
  `| openai_api_key_configured | ${pre.body.openai_api_key_configured} |`,
  `| outbound_real | ${pre.body.outbound_real} |`,
  `| ghl_live | ${pre.body.ghl_live} |`,
  "",
  "## Resumen",
  "",
  `- Casos con rewrite aplicado: **${rephrasedCount}**`,
  `- Casos bloqueados (block_reason): **${blockedCount}**`,
  "",
  "## Casos",
  "",
  "| ID | Input | Intent | Rephrased | block_reason | Result |",
  "|---:|---|---|:---:|:---:|---|",
];

for (const r of results) {
  lines.push(
    `| ${r.id} | ${summarize(r.input, 24)} | ${r.wa_intent} | ${r.rephrased ? "yes" : "no"} | ${r.block_reason} | ${r.pass ? "PASS" : "FAIL"} |`,
  );
}

lines.push("", "## Muestras final vs suggested", "");
for (const r of results) {
  lines.push(`### Caso ${r.id}`, `- Final: ${r.final_preview}`, `- Suggested: ${r.suggested_preview}`, "");
}

lines.push("## Promedio 9.8 (hotfix entityExtractor)", "");
lines.push("- **Causa:** normalizer convierte `9.8` → `9 8`; regex capturaba solo `9`.");
lines.push("- **Fix:** priorizar patrón `promedio N M` antes del patrón simple.");
lines.push("- **Caso 5:** factual debe incluir tramo Sobresaliente / 50% con promedio 9.8.");

lines.push("", "## SQL", "");
lines.push("```sql");
lines.push("SELECT count(*)::int FROM wa_llm_shadow_log WHERE mode = 'rewrite';");
lines.push("SELECT wa_intent, eva_llm_rephrased, block_reason, provider FROM wa_llm_shadow_log");
lines.push("WHERE mode = 'rewrite' ORDER BY created_at DESC LIMIT 10;");
lines.push("```");

lines.push("", "## Recomendación 7G.3", "");
lines.push(passed === total
  ? "Avanzar a 7G.3 solo con autorización Leandro; mantener mock/dry_run."
  : "Corregir fallos antes de 7G.3.");

if (results.some((r) => !r.pass)) {
  lines.push("", "## Failures", "");
  for (const r of results.filter((x) => !x.pass)) {
    lines.push(`- Case ${r.id}: ${r.failures.join("; ")}`);
  }
}

fs.writeFileSync(REPORT, lines.join("\n"), "utf8");
console.log(`Phase 7G.2 rewrite mock smoke: ${passed}/${total} PASS`);
console.log(`Rephrased: ${rephrasedCount}, Blocked: ${blockedCount}`);
for (const r of results.filter((x) => !x.pass)) {
  console.log(`  FAIL #${r.id}: ${r.failures.join("; ")}`);
}
process.exit(passed === total ? 0 : 1);
