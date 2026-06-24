#!/usr/bin/env node
/**
 * Fase 7E — WhatsApp real + GHL live + custom fields + academic-engine.
 * Usage: node tests/run-phase7e-wa-live-ghl-live.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(ROOT, "tests/payloads/phase7e-wa-live-ghl-live.json");
const REPORT = path.join(ROOT, "docs/phase-7e-wa-live-ghl-live-academic-report.md");

const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
const ENDPOINT = process.env.PHASE7E_ENDPOINT || fixture.endpoint;

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

function extractProviderResponseId(body) {
  if (body.provider_response_id) return body.provider_response_id;
  return body.raw_response?.response?.id || body.raw_response?.id || null;
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
  if (body.ghl_synced !== req.ghl_synced) failures.push(`ghl_synced=${body.ghl_synced}`);
  if (req.ghl_dry_run === false && body.ghl_dry_run === true) {
    failures.push(`ghl_dry_run=${body.ghl_dry_run}`);
  }
  if (body.custom_fields_written !== req.custom_fields_written) {
    failures.push(`custom_fields_written=${body.custom_fields_written}`);
  }
  if (body.academic_engine_enabled !== req.academic_engine_enabled) {
    failures.push(`academic_engine_enabled=${body.academic_engine_enabled}`);
  }
  if (body.eva_llm_enabled !== req.eva_llm_enabled) {
    failures.push(`eva_llm_enabled=${body.eva_llm_enabled}`);
  }
  return failures;
}

function evaluateCase(tc, body) {
  const failures = [];
  const warnings = [];
  const req = fixture.required_runtime_flags;

  if (body.ok !== true) failures.push("ok !== true");
  failures.push(...checkRuntimeFlags(body, req));

  if (body.outbound_status !== "accepted") {
    failures.push(`outbound_status=${body.outbound_status}`);
  }

  const providerId = extractProviderResponseId(body);
  if (!providerId) failures.push("provider_response_id missing");

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

  const tags = body.ghl_would_add_tags || [];
  if (!tags.includes("eva-wa")) failures.push("missing tag eva-wa");
  if (tc.expect_ghl_tag && !tags.includes(tc.expect_ghl_tag)) {
    failures.push(`missing tag ${tc.expect_ghl_tag}, got ${tags.join(",")}`);
  }

  if (tc.expect_task === true && body.ghl_task_created !== true && body.ghl_would_create_task !== true) {
    failures.push("expected GHL task");
  }
  if (tc.expect_task === false && body.ghl_task_created === true) {
    failures.push("unexpected GHL task created");
  }

  if (body.custom_fields_count !== 8 && body.custom_fields_written) {
    warnings.push(`custom_fields_count=${body.custom_fields_count}`);
  }

  if (tc.response_must_include && !includesAll(body.response_text, tc.response_must_include)) {
    failures.push(`missing: ${tc.response_must_include.join(", ")}`);
  }
  if (tc.response_must_not_include && !excludesAll(body.response_text, tc.response_must_not_include)) {
    failures.push(`forbidden: ${tc.response_must_not_include.join(", ")}`);
  }
  if (fixture.ghost_careers?.length && body.academic_enriched) {
    const ghosts = fixture.ghost_careers.filter((g) => !excludesAll(body.response_text, [g]));
    if (ghosts.length) failures.push(`ghost: ${ghosts.join(", ")}`);
  }

  return {
    id: tc.id,
    input: tc.input,
    pass: failures.length === 0,
    failures,
    warnings,
    body,
    provider_response_id: providerId,
    response_preview: summarize(body.response_text),
  };
}

async function preflight() {
  const { status, body } = await post("__phase7e_preflight__", `phase7e-preflight-${Date.now()}`);
  const failures = [];
  if (status !== 200 || body.ok !== true) failures.push(`HTTP ${status} ok=${body.ok}`);
  failures.push(...checkRuntimeFlags(body, fixture.required_runtime_flags));
  return { pass: failures.length === 0, failures, body };
}

console.log(`Phase 7E preflight → ${ENDPOINT}`);
console.log(`Channel: ${fixture.from} → ${fixture.to}`);

const pre = await preflight();
if (!pre.pass) {
  console.error("PREFLIGHT FAILED — aborting 7E (set InsForge secrets first).");
  console.error(pre.failures.join("; "));
  const lines = [
    "# Phase 7E — WA Live + GHL Live + Academic Report",
    "",
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    "**Status:** BLOCKED — preflight failed",
    "",
    "## Runtime detectado",
    "",
    "| Flag | Requerido | Detectado |",
    "|---|---|---|",
    `| mode | live_outbound | ${pre.body.mode} |`,
    `| outbound_real | true | ${pre.body.outbound_real} |`,
    `| ghl_live | true | ${pre.body.ghl_live} |`,
    `| ghl_synced | true | ${pre.body.ghl_synced} |`,
    `| custom_fields_written | true | ${pre.body.custom_fields_written} |`,
    `| academic_engine_enabled | true | ${pre.body.academic_engine_enabled} |`,
  "",
    "## Secrets requeridos (Dashboard)",
    "",
    "```",
    "WA_AGENT_MODE=live_outbound",
    "GHL_SYNC_MODE=live",
    "GHL_WRITE_CUSTOM_FIELDS=true",
    "ACADEMIC_ENGINE_ENABLED=true",
    "EVA_LLM_ENABLED=false",
    "```",
    "",
    "## Fallos",
    "",
    ...pre.failures.map((f) => `- ${f}`),
    "",
    "_Casos 1–5 no ejecutados._",
    "",
    "## Rollback post-prueba",
    "",
    "```",
    "WA_AGENT_MODE=mock",
    "GHL_SYNC_MODE=dry_run",
    "GHL_WRITE_CUSTOM_FIELDS=false",
    "```",
  ];
  fs.writeFileSync(REPORT, lines.join("\n"), "utf8");
  process.exit(2);
}

const results = [];
for (const tc of fixture.cases) {
  const messageId = `phase7e-case-${tc.id}-${Date.now()}`;
  const { status, body } = await post(tc.input, messageId);
  if (status !== 200) {
    results.push({
      id: tc.id,
      input: tc.input,
      pass: false,
      failures: [`HTTP ${status}`],
      warnings: [],
      body: body || {},
      provider_response_id: null,
      response_preview: "",
    });
  } else {
    results.push(evaluateCase(tc, body));
  }
  await new Promise((r) => setTimeout(r, 3000));
}

const passed = results.filter((r) => r.pass).length;
const contactIds = [...new Set(results.map((r) => r.body.ghl_contact_id).filter(Boolean))];

const lines = [
  "# Phase 7E — WA Live + GHL Live + Academic Report",
  "",
  `**Date:** ${new Date().toISOString().slice(0, 10)}`,
  `**Result:** ${passed}/${results.length} PASS`,
  `**Channel:** ${fixture.from} → ${fixture.to}`,
  "",
  "## Runtime (preflight)",
  "",
  "| Flag | Valor |",
  "|---|---|",
  `| mode | ${pre.body.mode} |`,
  `| ghl_sync_mode | ${pre.body.ghl_sync_mode || "live"} |`,
  `| academic_engine_enabled | ${pre.body.academic_engine_enabled} |`,
  `| eva_llm_enabled | ${pre.body.eva_llm_enabled} |`,
  "",
  "## Contacto GHL",
  "",
  `- contact_ids únicos: ${contactIds.length} (${contactIds.map((id) => `\`${id}\``).join(", ") || "—"})`,
  `- duplicados: ${contactIds.length <= 1 ? "no detectados en respuestas" : "REVISAR"}`,
  "",
  "## Tabla por caso",
  "",
  "| ID | Input | WA | Academic | Enriched | outbound | provider_id | ghl_live | synced | CF | task | Result |",
  "|---:|---|---|---|:---:|---|---|---|:---:|:---:|---:|---|",
];

for (const r of results) {
  const b = r.body;
  lines.push(
    `| ${r.id} | ${summarize(r.input, 24)} | ${b.intent || "—"} | ${b.academic_intent || "—"} | ${b.academic_enriched ? "yes" : "no"} | ${b.outbound_status} | ${r.provider_response_id ? "yes" : "—"} | ${b.ghl_live} | ${b.ghl_synced} | ${b.custom_fields_written} | ${b.ghl_task_created ? "yes" : "no"} | ${r.pass ? "PASS" : "FAIL"} |`,
  );
}

lines.push("", "## Detalle", "");
for (const r of results) {
  const b = r.body;
  lines.push(
    `### Case ${r.id}: ${r.input}`,
    "",
    `- inbound_id: \`${b.inbound_id || "—"}\``,
    `- outbound_id: \`${b.outbound_id || "—"}\``,
    `- provider_response_id: \`${r.provider_response_id || "—"}\``,
    `- ghl_contact_id: \`${b.ghl_contact_id || "—"}\``,
    `- ghl_sync_log_id: \`${b.ghl_sync_log_id || "—"}\``,
    `- tags: ${(b.ghl_would_add_tags || []).join(", ") || "—"}`,
    `- Response: ${r.response_preview}`,
    r.failures?.length ? `- **Failures:** ${r.failures.join("; ")}` : "",
    r.warnings?.length ? `- **Warnings:** ${r.warnings.join("; ")}` : "",
    "",
  );
}

lines.push(
  "## Rollback obligatorio",
  "",
  "Si no se mantiene producción activa, regresar en Dashboard:",
  "",
  "```",
  "WA_AGENT_MODE=mock",
  "GHL_SYNC_MODE=dry_run",
  "GHL_WRITE_CUSTOM_FIELDS=false",
  "ACADEMIC_ENGINE_ENABLED=true",
  "EVA_LLM_ENABLED=false",
  "```",
  "",
  "## Recomendación",
  "",
  "No activar LLM real sin autorización de Leandro.",
  "Verificar `wa_errors` en SQL post-ejecución.",
);

fs.writeFileSync(REPORT, lines.join("\n"), "utf8");
console.log(`Phase 7E: ${passed}/${results.length} PASS`);
console.log(`Report: ${REPORT}`);
for (const r of results.filter((x) => !x.pass)) {
  console.log(`  FAIL #${r.id}: ${r.failures.join("; ")}`);
}
process.exit(passed === results.length ? 0 : 1);
