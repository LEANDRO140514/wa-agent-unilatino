#!/usr/bin/env node
/**
 * Fase 7D — WhatsApp real controlado (live_outbound + GHL dry_run).
 *
 * Usage:
 *   node tests/run-phase7d-wa-live-academic.mjs           # live POST (preflight required)
 *   node tests/run-phase7d-wa-live-academic.mjs --recalculate  # re-eval recorded run (no POST)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(ROOT, "tests/payloads/phase7d-wa-live-academic.json");
const RECORDED = path.join(ROOT, "tests/fixtures/phase7d-recorded-run.json");
const REPORT = path.join(ROOT, "docs/phase-7d-wa-live-academic-report.md");

const RECALCULATE = process.argv.includes("--recalculate");
const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
const ENDPOINT = process.env.PHASE7D_ENDPOINT || fixture.endpoint;

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

function summarize(text, max = 120) {
  const one = String(text || "").replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max)}…` : one;
}

/**
 * YCloud POST /whatsapp/messages returns top-level `id` (stored as provider_response_id).
 */
function extractProviderResponseId(body, dbFallback = null) {
  if (body.provider_response_id) return body.provider_response_id;
  const nested =
    body.raw_response?.response?.id ||
    body.raw_response?.id ||
    body.ycloud?.provider_response_id ||
    null;
  if (nested) return nested;
  return dbFallback || null;
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
  if (req.ghl_dry_run && body.ghl_dry_run !== true) {
    failures.push(`ghl_dry_run=${body.ghl_dry_run}`);
  }
  return failures;
}

function evaluateCase(tc, body, options = {}) {
  const failures = [];
  const warnings = [];
  const req = fixture.required_runtime_flags;
  const dbProviderId = options.db_provider_response_id || null;
  const providerId = extractProviderResponseId(body, dbProviderId);

  failures.push(...checkRuntimeFlags(body, req));

  if (body.outbound_status !== "accepted" && req.mode === "live_outbound") {
    failures.push(`outbound_status=${body.outbound_status} (expected accepted)`);
  }

  if (req.mode === "live_outbound") {
    if (!providerId) {
      if (body.outbound_status === "accepted" && body.outbound_id) {
        warnings.push("provider_response_id missing in webhook (accepted + outbound_id present)");
      } else {
        failures.push("provider_response_id missing");
      }
    } else if (!body.provider_response_id && dbProviderId) {
      warnings.push(
        `provider_response_id only in DB/raw_response (${providerId}); webhook field was omitted`,
      );
    }
  }

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
  if (body.eva_llm_rephrased !== false) failures.push(`eva_llm_rephrased=${body.eva_llm_rephrased}`);

  if (tc.response_must_include && body.response_text && !includesAll(body.response_text, tc.response_must_include)) {
    failures.push(`missing: ${tc.response_must_include.join(", ")}`);
  }
  if (
    tc.response_must_not_include &&
    body.response_text &&
    !excludesAll(body.response_text, tc.response_must_not_include)
  ) {
    failures.push(`forbidden: ${tc.response_must_not_include.join(", ")}`);
  }
  if (fixture.ghost_careers?.length && body.academic_enriched && body.response_text) {
    const ghosts = fixture.ghost_careers.filter((g) => !excludesAll(body.response_text, [g]));
    if (ghosts.length) failures.push(`ghost careers: ${ghosts.join(", ")}`);
  }

  return {
    id: tc.id,
    input: tc.input,
    pass: failures.length === 0,
    failures,
    warnings,
    body,
    provider_response_id: providerId,
    response_preview: body.response_text ? summarize(body.response_text) : "(from recorded metadata)",
  };
}

function writeReport({ mode, results, pre, extraSections = [] }) {
  const passed = results.filter((r) => r.pass).length;
  const warnCount = results.filter((r) => r.warnings?.length).length;
  const lines = [
    "# Phase 7D — WhatsApp Real + Academic Engine Report",
    "",
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    `**Mode:** ${mode}`,
    `**Result:** ${passed}/${results.length} PASS` +
      (warnCount ? ` (${warnCount} with WARN provider_response_id)` : ""),
    `**Channel:** ${fixture.from} → ${fixture.to}`,
    "",
    ...extraSections,
    "## Tabla por caso",
    "",
    "| ID | Input | enriched | intent | outbound_status | provider_id | WARN | Result |",
    "|---:|---|:---:|---|---|---|:---:|---|",
  ];

  for (const r of results) {
    const b = r.body;
    lines.push(
      `| ${r.id} | ${summarize(r.input, 28)} | ${b.academic_enriched ? "yes" : "no"} | ${b.academic_intent || "—"} | ${b.outbound_status} | ${r.provider_response_id || "—"} | ${r.warnings?.length ? "yes" : "—"} | ${r.pass ? "PASS" : "FAIL"} |`,
    );
  }

  lines.push("", "## Detalle", "");
  for (const r of results) {
    lines.push(
      `### Case ${r.id}: ${r.input}`,
      "",
      `- inbound_id: \`${r.body.inbound_id}\``,
      `- outbound_id: \`${r.body.outbound_id}\``,
      `- provider_response_id (resolved): \`${r.provider_response_id || "—"}\``,
      `- academic_enriched: ${r.body.academic_enriched}`,
      r.warnings?.length ? `- **Warnings:** ${r.warnings.join("; ")}` : "",
      r.failures?.length ? `- **Failures:** ${r.failures.join("; ")}` : "",
      "",
    );
  }

  lines.push(
    "## Recomendación",
    "",
    "`WA_AGENT_MODE=mock` tras pruebas live.",
    "No activar GHL live sin autorización de Leandro.",
    "Ver `docs/phase-7d-provider-response-id-investigation.md` para mapeo YCloud `id`.",
  );

  fs.writeFileSync(REPORT, lines.join("\n"), "utf8");
  return { passed, total: results.length, warnCount };
}

async function preflight() {
  const { status, body } = await post("__phase7d_preflight__", `phase7d-preflight-${Date.now()}`);
  const failures = [];
  if (status !== 200 || body.ok !== true) failures.push(`HTTP ${status} ok=${body.ok}`);
  failures.push(...checkRuntimeFlags(body, fixture.required_runtime_flags));
  return { pass: failures.length === 0, failures, body };
}

if (RECALCULATE) {
  const recorded = JSON.parse(fs.readFileSync(RECORDED, "utf8"));
  const results = recorded.cases.map((row) => {
    const tc = fixture.cases.find((c) => c.id === row.id) || { id: row.id, input: row.input };
    return evaluateCase(tc, row.body, { db_provider_response_id: row.db_provider_response_id });
  });
  const { passed, total, warnCount } = writeReport({
    mode: "recalculate (no POST)",
    results,
    extraSections: [
      "## Investigación provider_response_id",
      "",
      "YCloud devuelve `response.id`. El handler lo guarda en `wa_outbound_messages.provider_response_id`",
      "y en `raw_response.response.id`. El webhook HTTP **no lo exponía** (corregido en handler).",
      "",
      `Recálculo sobre corrida ${recorded.recorded_at}.`,
      "",
    ],
  });
  console.log(`Phase 7D recalculate: ${passed}/${total} PASS` + (warnCount ? ` (${warnCount} WARN)` : ""));
  process.exit(passed === total ? 0 : 1);
}

console.log(`Phase 7D preflight → ${ENDPOINT}`);
console.log(`Channel: ${fixture.from} → ${fixture.to}`);

const pre = await preflight();
if (!pre.pass) {
  console.error("PREFLIGHT FAILED — aborting (fix InsForge secrets first).");
  console.error(pre.failures.join("; "));
  process.exit(2);
}

const results = [];
for (const tc of fixture.cases) {
  const messageId = `phase7d-case-${tc.id}-${Date.now()}`;
  const { status, body } = await post(tc.input, messageId);
  if (status !== 200 || body.ok !== true) {
    results.push({
      id: tc.id,
      input: tc.input,
      pass: false,
      failures: [`HTTP ${status} ok=${body.ok}`],
      warnings: [],
      body,
      provider_response_id: extractProviderResponseId(body),
      response_preview: summarize(body.response_text),
    });
  } else {
    results.push(evaluateCase(tc, body));
  }
  await new Promise((r) => setTimeout(r, 2500));
}

const { passed, total } = writeReport({ mode: "live POST", results, pre });
console.log(`Phase 7D: ${passed}/${total} PASS`);
process.exit(passed === total ? 0 : 1);
