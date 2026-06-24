#!/usr/bin/env node
/**
 * Fase 7B.4 — E2E mock del handler ycloud-wa-inbound.js con payloads YCloud.
 * Usage: node tests/run-phase7b4-ycloud-e2e-mock.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(ROOT, "tests/payloads/phase7b4-ycloud-e2e-mock.json");
const REPORT = path.join(ROOT, "docs/phase-7b4-ycloud-e2e-mock-report.md");
const HANDLER_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");
const MOCK_DB_PATH = path.join(ROOT, "insforge/functions/lib/test/mock-insforge-client.js");

const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));

for (const [key, value] of Object.entries(fixture.env || {})) {
  process.env[key] = value;
}

if (!globalThis.Deno) {
  globalThis.Deno = { env: { get: (key) => process.env[key] } };
}

const {
  resetMockInsforgeStore,
  getMockInsforgeStore,
  countMockErrorsSince,
} = await import(pathToFileURL(MOCK_DB_PATH).href);

const handlerMod = await import(pathToFileURL(HANDLER_PATH).href);
const handler = handlerMod.default;

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

function phoneForCase(id) {
  return `+52555100${String(id).padStart(4, "0")}`;
}

function buildYCloudPayload(caseId, messageText, phoneOverride = null) {
  const from = phoneOverride || phoneForCase(caseId);
  return {
    event_type: "whatsapp.inbound_message.received",
    from,
    to: process.env.YCLOUD_BUSINESS_NUMBER || "+529994538421",
    message_id: `e2e-7b4-${caseId}-${Date.now()}`,
    message_type: "text",
    message_text: messageText,
    timestamp: new Date().toISOString(),
  };
}

async function invokeHandler(payload) {
  const request = new Request("http://localhost/ycloud-wa-inbound", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const response = await handler(request);
  const body = await response.json();
  return { status: response.status, body };
}

async function runCase(tc, storeBefore) {
  const failures = [];
  const payload = buildYCloudPayload(tc.id, tc.input);
  const { status, body } = await invokeHandler(payload);
  const storeAfter = getMockInsforgeStore();

  if (status !== 200) failures.push(`HTTP status ${status}`);
  if (body.ok !== true) failures.push(`body.ok=${body.ok}`);

  const checks = [
    ["outbound_real", false],
    ["ghl_live", false],
    ["custom_fields_written", false],
    ["eva_llm_enabled", false],
    ["eva_llm_rephrased", false],
    ["academic_engine_enabled", true],
  ];

  for (const [field, expected] of checks) {
    if (body[field] !== expected) {
      failures.push(`${field}: expected ${expected}, got ${body[field]}`);
    }
  }

  if (tc.expect_wa_intent && body.intent !== tc.expect_wa_intent) {
    failures.push(`wa_intent: expected ${tc.expect_wa_intent}, got ${body.intent}`);
  }

  if (
    tc.expect_academic_intent &&
    body.academic_intent !== tc.expect_academic_intent
  ) {
    failures.push(
      `academic_intent: expected ${tc.expect_academic_intent}, got ${body.academic_intent}`,
    );
  }

  if (
    tc.expect_academic_enriched !== undefined &&
    body.academic_enriched !== tc.expect_academic_enriched
  ) {
    failures.push(
      `academic_enriched: expected ${tc.expect_academic_enriched}, got ${body.academic_enriched}`,
    );
  }

  if (
    tc.expect_academic_skipped !== undefined &&
    body.academic_skipped !== tc.expect_academic_skipped
  ) {
    failures.push(
      `academic_skipped: expected ${tc.expect_academic_skipped}, got ${body.academic_skipped}`,
    );
  }

  if (body.ghl_dry_run !== true) {
    failures.push(`ghl_dry_run: expected true, got ${body.ghl_dry_run}`);
  }

  if (tc.response_must_include && !includesAll(body.response_text, tc.response_must_include)) {
    failures.push(`missing includes: ${tc.response_must_include.join(", ")}`);
  }

  if (tc.response_must_not_include && !excludesAll(body.response_text, tc.response_must_not_include)) {
    failures.push(`forbidden found: ${tc.response_must_not_include.join(", ")}`);
  }

  if (fixture.ghost_careers?.length && body.academic_enriched) {
    const ghosts = fixture.ghost_careers.filter(
      (g) => !excludesAll(body.response_text, [g]),
    );
    if (ghosts.length) failures.push(`ghost careers found: ${ghosts.join(", ")}`);
  }

  if (fixture.banned_claims?.length) {
    const banned = fixture.banned_claims.filter(
      (b) => !excludesAll(body.response_text, [b]),
    );
    if (banned.length) failures.push(`banned claims found: ${banned.join(", ")}`);
  }

  if (fixture.msi_forbidden_phrases?.length && body.academic_intent === "payment") {
    const msi = fixture.msi_forbidden_phrases.filter(
      (m) => !excludesAll(body.response_text, [m]),
    );
    if (msi.length) failures.push(`MSI invented: ${msi.join(", ")}`);
  }

  if (tc.preserve_operational) {
    if (
      tc.preserve_operational.needsHuman !== undefined &&
      body.wa_needs_human !== tc.preserve_operational.needsHuman
    ) {
      failures.push(
        `wa_needs_human: expected ${tc.preserve_operational.needsHuman}, got ${body.wa_needs_human}`,
      );
    }
    if (
      tc.preserve_operational.createTask === true &&
      body.ghl_would_create_task !== true
    ) {
      failures.push(`ghl_would_create_task: expected true, got ${body.ghl_would_create_task}`);
    }
    if (
      tc.preserve_operational.createTask === false &&
      body.ghl_would_create_task === true
    ) {
      failures.push(`ghl_would_create_task: expected false, got ${body.ghl_would_create_task}`);
    }
  }

  const inboundDelta = storeAfter.wa_inbound_messages.length - storeBefore.wa_inbound_messages.length;
  const outboundDelta = storeAfter.wa_outbound_messages.length - storeBefore.wa_outbound_messages.length;
  const ghlLogDelta = storeAfter.wa_ghl_sync_log.length - storeBefore.wa_ghl_sync_log.length;

  if (inboundDelta !== 1) failures.push(`wa_inbound_messages delta expected 1, got ${inboundDelta}`);
  if (outboundDelta !== 1) failures.push(`wa_outbound_messages delta expected 1, got ${outboundDelta}`);
  if (ghlLogDelta !== 1) failures.push(`wa_ghl_sync_log delta expected 1, got ${ghlLogDelta}`);

  const lastOutbound = storeAfter.wa_outbound_messages.at(-1);
  if (lastOutbound?.raw_response?.outbound_real !== false) {
    failures.push("outbound raw_response.outbound_real !== false");
  }
  if (lastOutbound?.raw_response?.academic_engine_enabled !== true) {
    failures.push("outbound raw_response.academic_engine_enabled !== true");
  }

  const lastGhlLog = storeAfter.wa_ghl_sync_log.at(-1);
  if (lastGhlLog?.sync_mode !== "dry_run") {
    failures.push(`wa_ghl_sync_log.sync_mode expected dry_run, got ${lastGhlLog?.sync_mode}`);
  }

  return {
    id: tc.id,
    input: tc.input,
    pass: failures.length === 0,
    failures,
    status,
    body,
    response_preview: summarize(body.response_text),
    phone: payload.from,
  };
}

resetMockInsforgeStore();
const results = [];
let rollingStore = getMockInsforgeStore();

for (const tc of fixture.cases) {
  const storeBefore = getMockInsforgeStore();
  const result = await runCase(tc, storeBefore);
  results.push(result);
  rollingStore = getMockInsforgeStore();
}

let contactReuseResult = { pass: true, note: "skipped" };
if (fixture.contact_state_reuse) {
  const reuse = fixture.contact_state_reuse;
  const baseCase = results.find((r) => r.id === reuse.reuse_case_id);
  const storeBefore = getMockInsforgeStore();
  const contactsBefore = storeBefore.wa_contacts_state.length;
  const payload = buildYCloudPayload(
    `reuse-${reuse.reuse_case_id}`,
    reuse.followup_input,
    baseCase?.phone,
  );
  const { status, body } = await invokeHandler(payload);
  const storeAfter = getMockInsforgeStore();
  const failures = [];
  if (status !== 200 || body.ok !== true) failures.push("reuse request failed");
  if (body.intent !== reuse.expect_wa_intent) {
    failures.push(`reuse intent expected ${reuse.expect_wa_intent}, got ${body.intent}`);
  }
  const phoneContacts = storeAfter.wa_contacts_state.filter(
    (c) => c.normalized_phone === baseCase?.phone,
  );
  if (reuse.expect_single_contact && phoneContacts.length !== 1) {
    failures.push(`expected 1 contact for reused phone, found ${phoneContacts.length}`);
  }
  if (storeAfter.wa_contacts_state.length !== contactsBefore) {
    failures.push("contact count changed on reuse (should update, not insert duplicate)");
  }
  contactReuseResult = {
    pass: failures.length === 0,
    failures,
    contacts_for_phone: phoneContacts.length,
    wa_last_intent: phoneContacts[0]?.wa_last_intent,
  };
}

const finalStore = getMockInsforgeStore();
const waErrorsRecent = countMockErrorsSince(10);
const passed = results.filter((r) => r.pass).length;
const total = results.length;
const allPass =
  passed === total && contactReuseResult.pass && waErrorsRecent === 0;

const lines = [
  "# Phase 7B.4 — YCloud E2E Mock Report",
  "",
  `**Date:** ${new Date().toISOString().slice(0, 10)}`,
  `**Result:** ${passed}/${total} cases PASS | contact reuse: ${contactReuseResult.pass ? "PASS" : "FAIL"} | wa_errors(10m): ${waErrorsRecent}`,
  "",
  "## Archivos",
  "",
  "| Archivo | Acción |",
  "|---|---|",
  "| `tests/payloads/phase7b4-ycloud-e2e-mock.json` | Creado |",
  "| `tests/run-phase7b4-ycloud-e2e-mock.mjs` | Creado |",
  "| `insforge/functions/lib/test/mock-insforge-client.js` | Creado |",
  "| `insforge/functions/ycloud-wa-inbound.js` | Modificado (`WA_E2E_MOCK_DB` en `getClient`) |",
  "| `insforge/functions/lib/academic-engine/entityExtractor.js` | Modificado (promedio `8.2` tras normalización) |",
  "| `insforge/functions/lib/academic-engine/intentEngine.js` | Modificado (promedio solo → scholarship) |",
  "| `docs/phase-7b4-ycloud-e2e-mock-report.md` | Generado |",
  "",
  "## Flags",
  "",
  "```",
  ...Object.entries(fixture.env || {}).map(([k, v]) => `${k}=${v}`),
  "```",
  "",
  "## Tabla por caso",
  "",
  "| ID | Input | WA intent | Academic intent | Enriched | outbound_real | ghl_live | CF written | Result |",
  "|---:|---|---|---|:---:|---|---|---|---|",
];

for (const r of results) {
  const b = r.body;
  lines.push(
    `| ${r.id} | ${summarize(r.input, 36)} | ${b.intent || "—"} | ${b.academic_intent || "—"} | ${b.academic_enriched ? "yes" : "no"} | ${b.outbound_real} | ${b.ghl_live} | ${b.custom_fields_written} | ${r.pass ? "PASS" : "FAIL"} |`,
  );
}

lines.push(
  "",
  "## Mock DB totals",
  "",
  `- wa_inbound_messages: ${finalStore.wa_inbound_messages.length}`,
  `- wa_outbound_messages: ${finalStore.wa_outbound_messages.length}`,
  `- wa_contacts_state: ${finalStore.wa_contacts_state.length}`,
  `- wa_ghl_sync_log: ${finalStore.wa_ghl_sync_log.length} (all dry_run)`,
  `- wa_errors (last 10 min): ${waErrorsRecent}`,
  "",
  "## Contact state reuse",
  "",
  `- Phone reused from case ${fixture.contact_state_reuse?.reuse_case_id}`,
  `- Follow-up: "${fixture.contact_state_reuse?.followup_input}" → intent \`${contactReuseResult.wa_last_intent || "—"}\``,
  `- Contacts for phone: ${contactReuseResult.contacts_for_phone ?? "—"}`,
  `- Result: ${contactReuseResult.pass ? "PASS" : `FAIL — ${(contactReuseResult.failures || []).join("; ")}`}`,
  "",
  "## Ejemplos de respuestas finales",
  "",
);

for (const r of results.filter((x) => [1, 8, 10, 17, 18, 20].includes(x.id))) {
  lines.push(`### Case ${r.id}: ${r.input}`, "", "```", r.body.response_text || "", "```", "");
}

lines.push(
  "## Confirmaciones",
  "",
  "- **WhatsApp real:** NO — `WA_AGENT_MODE=mock`, `outbound_real=false` en todos los casos.",
  "- **GHL live:** NO — `GHL_SYNC_MODE=dry_run`, `ghl_live=false`, logs `sync_mode=dry_run`.",
  "- **Custom fields live:** NO — `GHL_WRITE_CUSTOM_FIELDS=false`, `custom_fields_written=false`.",
  "- **LLM real:** NO — `EVA_LLM_ENABLED=false`, sin `OPENAI_API_KEY`.",
  "- **wa_errors:** 0 en ventana de 10 minutos (mock DB).",
  "",
  "## Recomendación deploy controlado",
  "",
  "1. Desplegar edge function con `ACADEMIC_ENGINE_ENABLED=true` y `EVA_LLM_ENABLED=false`.",
  "2. Mantener `WA_AGENT_MODE=mock` y `GHL_SYNC_MODE=dry_run` en el primer despliegue.",
  "3. Ejecutar 5–10 mensajes reales de prueba interna; validar `wa_outbound_messages.raw_response.academic_*`.",
  "4. Solo con autorización de Leandro: `WA_AGENT_MODE=live_outbound` y/o `GHL_SYNC_MODE=live`.",
  "",
  "## Fallos",
  "",
);

const failed = results.filter((r) => !r.pass);
if (!failed.length && contactReuseResult.pass) {
  lines.push("_Ninguno._");
} else {
  for (const r of failed) {
    lines.push(`- Case ${r.id}: ${r.failures.join("; ")}`);
  }
  if (!contactReuseResult.pass) {
    lines.push(`- Contact reuse: ${(contactReuseResult.failures || []).join("; ")}`);
  }
}

fs.writeFileSync(REPORT, lines.join("\n"), "utf8");

console.log(`Phase 7B.4 YCloud E2E mock: ${passed}/${total} PASS`);
console.log(`Contact reuse: ${contactReuseResult.pass ? "PASS" : "FAIL"}`);
console.log(`wa_errors (10m): ${waErrorsRecent}`);
if (waErrorsRecent !== 0) {
  console.log("  FAIL wa_errors: expected 0 in last 10 minutes");
}
console.log(`Report: ${REPORT}`);

for (const r of failed) {
  console.log(`  FAIL #${r.id}: ${r.failures.join("; ")}`);
}
if (!contactReuseResult.pass) {
  console.log(`  FAIL contact reuse: ${(contactReuseResult.failures || []).join("; ")}`);
}

process.exit(allPass ? 0 : 1);
