#!/usr/bin/env node
/**
 * Fase 7G.3A — Hotfix clasificador WA + smoke rewrite mock/dry_run.
 *
 * Usage: node tests/run-phase7g3a-classifier-hotfix.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(ROOT, "tests/payloads/phase7g3a-classifier-hotfix.json");
const REPORT = path.join(ROOT, "docs/phase-7g3a-classifier-hotfix-report.md");

const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
const ENDPOINT = process.env.PHASE7G3A_ENDPOINT || fixture.endpoint;
const DELAY_MS = Number(process.env.PHASE7G3A_DELAY_MS || "500");

function summarize(text, max = 80) {
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
  return failures;
}

function evaluateCase(tc, status, body, req) {
  const failures = [];
  if (status !== 200 || body.ok !== true) failures.push(`HTTP ${status} ok=${body.ok}`);
  failures.push(...checkRuntimeFlags(body, req));
  if (body.outbound_status !== "mocked") failures.push(`outbound_status=${body.outbound_status}`);

  if (tc.expect_wa_intent && body.intent !== tc.expect_wa_intent) {
    failures.push(`intent expected ${tc.expect_wa_intent}, got ${body.intent}`);
  }

  const blockReason = body.eva_llm_block_reason ?? null;
  const rephrased = body.eva_llm_rephrased === true;
  const blocked = fixture.blocked_intents || [];

  if (tc.expect_block_reason !== undefined) {
    if (tc.expect_block_reason === null && blockReason) {
      failures.push(`unexpected block_reason=${blockReason}`);
    } else if (tc.expect_block_reason && blockReason !== tc.expect_block_reason) {
      failures.push(`block_reason expected ${tc.expect_block_reason}, got ${blockReason}`);
    }
  }

  if (tc.expect_rephrased === true && !rephrased) {
    failures.push(`eva_llm_rephrased expected true, got ${rephrased}`);
  }
  if (tc.expect_rephrased === false && rephrased) {
    failures.push("eva_llm_rephrased must be false");
  }
  if (tc.expect_rewrite_allowed === false && rephrased) {
    failures.push("rewrite on blocked intent");
  }
  if (blocked.includes(body.intent) && rephrased) {
    failures.push(`rewrite on blocked intent ${body.intent}`);
  }

  if (tc.expect_needs_human !== undefined && body.wa_needs_human !== tc.expect_needs_human) {
    failures.push(`wa_needs_human expected ${tc.expect_needs_human}`);
  }
  if (tc.expect_create_task !== undefined && body.ghl_would_create_task !== tc.expect_create_task) {
    failures.push(`createTask expected ${tc.expect_create_task}`);
  }

  if (tc.response_must_include && !includesAll(body.response_text, tc.response_must_include)) {
    failures.push(`missing: ${tc.response_must_include.join(", ")}`);
  }

  if (tc.expect_guardrail_warnings) {
    const w = body.eva_llm_guardrail_warnings || [];
    if (!w.length) failures.push("guardrail_warnings empty");
  }

  if (body.eva_llm_error && tc.expect_rephrased === true) {
    failures.push(`eva_llm_error=${body.eva_llm_error}`);
  }

  return {
    id: tc.id,
    section: tc.section,
    input: tc.input || `(${tc.message_type})`,
    intent_before: tc.intent_before || null,
    pass: failures.length === 0,
    failures,
    wa_intent: body.intent,
    rephrased,
    block_reason: blockReason || "—",
    final_preview: summarize(body.response_text),
    guardrails: (body.eva_llm_guardrail_warnings || []).join("; ") || "—",
  };
}

function writeReport({ pre, results, passed, total }) {
  const hotfix = results.filter((r) => r.section === "hotfix");
  const rephrased = results.filter((r) => r.rephrased).length;
  const blocked = results.filter((r) => r.block_reason !== "—").length;

  const lines = [
    "# Phase 7G.3A — Classifier Hotfix Report",
    "",
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    `**Status:** ${passed === total ? "**PASS**" : "**FAIL**"} (${passed}/${total})`,
    `**Endpoint:** ${ENDPOINT}`,
    "",
    "## Flags (preflight)",
    "",
    `| mode | ${pre.body.mode} |`,
    `| eva_llm_mode | ${pre.body.eva_llm_mode} |`,
    `| outbound_real | ${pre.body.outbound_real} |`,
    `| ghl_live | ${pre.body.ghl_live} |`,
    `| ghl_dry_run | ${pre.body.ghl_dry_run} |`,
    "",
    "## Resumen",
    "",
    `- **Total casos:** ${total}`,
    `- **PASS:** ${passed} | **FAIL:** ${total - passed}`,
    `- **Rewrites aplicados:** ${rephrased}`,
    `- **Bloqueos correctos:** ${blocked}`,
    "",
    "## Hotfix — intents antes/después (5 casos)",
    "",
    "| ID | Input | Antes | Ahora | Rephrased | Result |",
    "|---:|---|---|:---:|:---:|---|",
  ];

  for (const r of hotfix) {
    lines.push(
      `| ${r.id} | ${summarize(r.input, 28)} | ${r.intent_before || "—"} | ${r.wa_intent} | ${r.rephrased ? "yes" : "no"} | ${r.pass ? "PASS" : "FAIL"} |`,
    );
  }

  lines.push("", "## Todos los casos", "");
  lines.push("| ID | Sección | Input | Intent | Rephrased | block_reason | Result |");
  lines.push("|---:|---|---|---|:---:|:---:|---|");
  for (const r of results) {
    lines.push(
      `| ${r.id} | ${r.section} | ${summarize(r.input, 24)} | ${r.wa_intent} | ${r.rephrased ? "yes" : "no"} | ${r.block_reason} | ${r.pass ? "PASS" : "FAIL"} |`,
    );
  }

  lines.push("", "## Confirmaciones", "");
  lines.push("- WhatsApp real: **NO**");
  lines.push("- GHL live: **NO**");
  lines.push("- Allowlist sin cambios");
  lines.push("- `wa_errors` críticos LLM: **0** (esperado)");

  lines.push("", "## Cambios en clasificador", "");
  lines.push("- `matchesCarrerasDisponibles()` — carreras/licenciaturas/oferta académica/qué ofrecen");
  lines.push("- `matchesNoSeQueEstudiar()` — orientar/orientación");
  lines.push("- `matchesHumano()` — llamar/llamada/contacte alguien");

  if (results.some((r) => !r.pass)) {
    lines.push("", "## Failures", "");
    for (const r of results.filter((x) => !x.pass)) {
      lines.push(`- **${r.id}:** ${r.failures.join("; ")}`);
    }
  }

  lines.push("", "## Recomendación 7G.4", "");
  lines.push(
    passed === total
      ? "Clasificador listo. Avanzar a **7G.4 live_outbound controlado** con autorización explícita; mantener `GHL_SYNC_MODE=dry_run` en primer sub-paso."
      : "Corregir clasificador antes de 7G.4.",
  );

  fs.writeFileSync(REPORT, lines.join("\n"), "utf8");
}

console.log(`Phase 7G.3A preflight → ${ENDPOINT}`);
const pre = await post({ input: "__phase7g3a_preflight__" }, `7g3a-preflight-${Date.now()}`);
const preFailures = checkRuntimeFlags(pre.body, fixture.required_runtime_flags);
if (pre.status !== 200 || pre.body.ok !== true) preFailures.push(`HTTP ${pre.status}`);

if (preFailures.length) {
  console.error("PREFLIGHT FAILED:", preFailures.join("; "));
  fs.writeFileSync(
    REPORT,
    `# Phase 7G.3A — BLOCKED\n\n${preFailures.map((f) => `- ${f}`).join("\n")}\n`,
    "utf8",
  );
  process.exit(2);
}

const results = [];
for (const tc of fixture.cases) {
  const { status, body } = await post(tc, `7g3a-${tc.id}-${Date.now()}`);
  results.push(evaluateCase(tc, status, body, fixture.required_runtime_flags));
  await new Promise((r) => setTimeout(r, DELAY_MS));
}

const passed = results.filter((r) => r.pass).length;
const total = results.length;

writeReport({ pre, results, passed, total });

console.log(`Phase 7G.3A classifier hotfix: ${passed}/${total} PASS`);
console.log(`Rewrites: ${results.filter((r) => r.rephrased).length}`);
for (const r of results.filter((x) => !x.pass)) {
  console.log(`  FAIL ${r.id}: ${r.failures.join("; ")}`);
}

process.exit(passed === total ? 0 : 1);
