#!/usr/bin/env node
/**
 * Fase 7C — Smoke tests contra endpoint InsForge real.
 * ABORTA si el runtime no está en mock/dry_run (preflight obligatorio).
 *
 * Usage: node tests/run-phase7c-insforge-smoke.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(ROOT, "tests/payloads/phase7c-insforge-smoke.json");
const REPORT = path.join(ROOT, "docs/phase-7c-insforge-controlled-deploy-report.md");

const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
const ENDPOINT = process.env.PHASE7C_ENDPOINT || fixture.endpoint;

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
  return `+52555207${String(id).padStart(4, "0")}`;
}

function buildPayload(caseId, messageText) {
  return {
    event_type: "whatsapp.inbound_message.received",
    from: phoneForCase(caseId),
    to: "+529994538421",
    message_id: `phase7c-${caseId}-${Date.now()}`,
    message_type: "text",
    message_text: messageText,
    timestamp: new Date().toISOString(),
  };
}

async function postCase(caseId, messageText) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildPayload(caseId, messageText)),
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function preflight() {
  const { status, body } = await postCase(9999, "1");
  const req = fixture.required_runtime_flags;
  const failures = [];

  if (status !== 200 || body.ok !== true) {
    failures.push(`preflight HTTP/body failed (${status}, ok=${body.ok})`);
  }
  if (body.mode !== req.mode) failures.push(`mode=${body.mode} (expected ${req.mode})`);
  if (body.outbound_real !== req.outbound_real) {
    failures.push(`outbound_real=${body.outbound_real}`);
  }
  if (body.ghl_live !== req.ghl_live) failures.push(`ghl_live=${body.ghl_live}`);
  if (body.custom_fields_written !== req.custom_fields_written) {
    failures.push(`custom_fields_written=${body.custom_fields_written}`);
  }
  if (body.academic_engine_enabled !== req.academic_engine_enabled) {
    failures.push(`academic_engine_enabled=${body.academic_engine_enabled}`);
  }
  if (body.eva_llm_enabled !== req.eva_llm_enabled) {
    failures.push(`eva_llm_enabled=${body.eva_llm_enabled}`);
  }

  return { pass: failures.length === 0, failures, body };
}

async function runCase(tc) {
  const failures = [];
  const { status, body } = await postCase(tc.id, tc.input);

  if (status !== 200 || body.ok !== true) failures.push(`HTTP ${status} ok=${body.ok}`);
  if (body.outbound_real !== false) failures.push(`outbound_real=${body.outbound_real}`);
  if (body.ghl_live !== false) failures.push(`ghl_live=${body.ghl_live}`);
  if (body.custom_fields_written !== false) {
    failures.push(`custom_fields_written=${body.custom_fields_written}`);
  }
  if (body.academic_engine_enabled !== true) {
    failures.push(`academic_engine_enabled=${body.academic_engine_enabled}`);
  }
  if (body.eva_llm_enabled !== false) failures.push(`eva_llm_enabled=${body.eva_llm_enabled}`);
  if (body.eva_llm_rephrased !== false) failures.push(`eva_llm_rephrased=${body.eva_llm_rephrased}`);

  if (tc.expect_wa_intent && body.intent !== tc.expect_wa_intent) {
    failures.push(`wa_intent expected ${tc.expect_wa_intent}, got ${body.intent}`);
  }
  if (tc.expect_academic_intent && body.academic_intent !== tc.expect_academic_intent) {
    failures.push(`academic_intent expected ${tc.expect_academic_intent}, got ${body.academic_intent}`);
  }
  if (
    tc.expect_academic_enriched !== undefined &&
    body.academic_enriched !== tc.expect_academic_enriched
  ) {
    failures.push(`academic_enriched expected ${tc.expect_academic_enriched}, got ${body.academic_enriched}`);
  }
  if (
    tc.expect_academic_skipped !== undefined &&
    body.academic_skipped !== tc.expect_academic_skipped
  ) {
    failures.push(`academic_skipped expected ${tc.expect_academic_skipped}, got ${body.academic_skipped}`);
  }

  if (tc.response_must_include && !includesAll(body.response_text, tc.response_must_include)) {
    failures.push(`missing: ${tc.response_must_include.join(", ")}`);
  }
  if (tc.response_must_not_include && !excludesAll(body.response_text, tc.response_must_not_include)) {
    failures.push(`forbidden: ${tc.response_must_not_include.join(", ")}`);
  }

  if (fixture.ghost_careers?.length && body.academic_enriched) {
    const ghosts = fixture.ghost_careers.filter((g) => !excludesAll(body.response_text, [g]));
    if (ghosts.length) failures.push(`ghost careers: ${ghosts.join(", ")}`);
  }

  const outboundOk = body.outbound_status === "mocked" || body.ghl_dry_run === true;
  if (!outboundOk && body.outbound_status !== "mocked") {
    failures.push(`outbound_status=${body.outbound_status}`);
  }

  return {
    id: tc.id,
    input: tc.input,
    pass: failures.length === 0,
    failures,
    body,
    response_preview: summarize(body.response_text),
  };
}

console.log(`Phase 7C preflight → ${ENDPOINT}`);
const pre = await preflight();

if (!pre.pass) {
  console.error("PREFLIGHT FAILED — aborting smoke suite (runtime not in mock/dry_run).");
  console.error(pre.failures.join("; "));
  const lines = [
    "# Phase 7C — InsForge Controlled Deploy Report",
    "",
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    "**Status:** BLOCKED — preflight failed (secrets not in mock/dry_run)",
    "",
    "## Preflight failures",
    "",
    ...pre.failures.map((f) => `- ${f}`),
    "",
    "## Action required (InsForge Dashboard → Function secrets)",
    "",
    "| Secret | Valor requerido |",
    "|---|---|",
    "| `WA_AGENT_MODE` | `mock` |",
    "| `GHL_SYNC_MODE` | `dry_run` |",
    "| `GHL_WRITE_CUSTOM_FIELDS` | `false` |",
    "| `ACADEMIC_ENGINE_ENABLED` | `true` | *(crear si no existe)* |",
    "| `EVA_LLM_ENABLED` | `false` | *(crear si no existe)* |",
    "",
    "Re-ejecutar: `node tests/run-phase7c-insforge-smoke.mjs`",
  ];
  fs.writeFileSync(REPORT, lines.join("\n"), "utf8");
  process.exit(2);
}

const results = [];
for (const tc of fixture.cases) {
  results.push(await runCase(tc));
}

const passed = results.filter((r) => r.pass).length;
const total = results.length;
const allPass = passed === total;

const lines = [
  "# Phase 7C — InsForge Controlled Deploy Report",
  "",
  `**Date:** ${new Date().toISOString().slice(0, 10)}`,
  `**Smoke result:** ${passed}/${total} PASS`,
  "",
  "## Endpoint",
  "",
  ENDPOINT,
  "",
  "## Tabla por caso",
  "",
  "| ID | Input | WA | Academic | Enriched | outbound_real | ghl_live | CF written | Result |",
  "|---:|---|---|---|:---:|---|---|---|---|",
];

for (const r of results) {
  const b = r.body;
  lines.push(
    `| ${r.id} | ${summarize(r.input, 32)} | ${b.intent} | ${b.academic_intent || "—"} | ${b.academic_enriched ? "yes" : "no"} | ${b.outbound_real} | ${b.ghl_live} | ${b.custom_fields_written} | ${r.pass ? "PASS" : "FAIL"} |`,
  );
}

lines.push("", "## IDs", "");
for (const r of results) {
  lines.push(
    `- Case ${r.id}: inbound=${r.body.inbound_id || "—"} outbound=${r.body.outbound_id || "—"} ghl_log=${r.body.ghl_sync_log_id || "—"}`,
  );
}

fs.writeFileSync(REPORT, lines.join("\n"), "utf8");
console.log(`Phase 7C smoke: ${passed}/${total} PASS`);
process.exit(allPass ? 0 : 1);
