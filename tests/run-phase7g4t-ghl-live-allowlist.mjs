#!/usr/bin/env node
/**
 * Fase 7G.4T — GHL live allowlist guard (mock DB + stub GHL API).
 * Usage: node tests/run-phase7g4t-ghl-live-allowlist.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(ROOT, "tests/payloads/phase7g4t-ghl-live-allowlist.json");
const REPORT = path.join(ROOT, "docs/phase-7g4t-ghl-live-allowlist-report.md");
const HANDLER_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");
const MOCK_DB_PATH = path.join(ROOT, "insforge/functions/lib/test/mock-insforge-client.js");

const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));

const {
  resetMockInsforgeStore,
  getMockInsforgeStore,
  getMockInsforgeClient,
} = await import(pathToFileURL(MOCK_DB_PATH).href);

const handlerMod = await import(pathToFileURL(HANDLER_PATH).href);
const handler = handlerMod.default;

const nativeFetch = globalThis.fetch;
const ghlApiCalls = [];

function installGhlFetchStub() {
  ghlApiCalls.length = 0;
  globalThis.fetch = async (url, options = {}) => {
    const href = String(url);
    if (href.includes("leadconnectorhq.com")) {
      ghlApiCalls.push({ url: href, method: options.method || "GET" });
      if (href.includes("/contacts/search")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ contacts: [{ id: "mock-ghl-contact-7g4t" }] }),
        };
      }
      if (href.includes("/contacts/") && options.method === "POST" && href.endsWith("/contacts/")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ contact: { id: "mock-ghl-contact-new" } }),
        };
      }
      if (href.includes("/tags")) {
        return { ok: true, status: 200, json: async () => ({ tags: ["eva-wa"] }) };
      }
      if (href.includes("/notes")) {
        return { ok: true, status: 200, json: async () => ({ note: { id: "mock-note" } }) };
      }
      if (href.includes("/tasks")) {
        return { ok: true, status: 200, json: async () => ({ task: { id: "mock-task" } }) };
      }
      if (options.method === "PUT") {
        return { ok: true, status: 200, json: async () => ({ contact: { id: "mock-ghl-contact-7g4t" } }) };
      }
      return { ok: false, status: 404, json: async () => ({ message: "unexpected ghl path" }) };
    }
    return nativeFetch(url, options);
  };
}

function applyEnv(overrides = {}) {
  for (const [key, value] of Object.entries(fixture.base_env)) {
    process.env[key] = value;
  }
  for (const [key, value] of Object.entries(overrides)) {
    process.env[key] = value;
  }
  if (!globalThis.Deno) {
    globalThis.Deno = { env: { get: (key) => process.env[key] } };
  }
}

function buildPayload(phone, messageText) {
  return {
    event_type: "whatsapp.inbound_message.received",
    from: phone,
    to: process.env.YCLOUD_BUSINESS_NUMBER || "+529994538421",
    message_id: `7g4t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message_type: "text",
    message_text: messageText,
    timestamp: new Date().toISOString(),
  };
}

async function invokeHandler(phone, messageText) {
  const request = new Request("http://localhost/ycloud-wa-inbound", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildPayload(phone, messageText)),
  });
  const response = await handler(request);
  const body = await response.json();
  return { status: response.status, body };
}

async function runDirectSyncCase(tc) {
  installGhlFetchStub();
  applyEnv(tc.env);
  resetMockInsforgeStore();
  const client = getMockInsforgeClient();
  const config = handler.getConfig();
  const now = new Date().toISOString();
  const result = await handler.syncGHLContact(client, config, {
    inboundId: "mock-inbound-7g4t-5",
    normalizedPhone: tc.phone || null,
    intent: tc.intent || "beca",
    messageText: tc.input,
    messageType: "text",
    needsHuman: true,
    responseText: "mock response",
    waStage: "beca_interes",
    waSummary: "Intent: beca",
    timestamp: now,
    priority: "medium",
    escalation_required: true,
    operational_owner: "Equipo de Admisiones Universidad Latino",
    business_hours_label: "Lunes a viernes 9:00-18:00",
    after_hours_message: "",
    after_hours_logic_enabled: false,
    task_title: "Atender lead WhatsApp — Interés en beca",
    task_priority_label: "Media",
  });
  const store = getMockInsforgeStore();
  return { result, store, ghlApiCalls: ghlApiCalls.length };
}

async function runHandlerCase(tc) {
  installGhlFetchStub();
  applyEnv(tc.env);
  resetMockInsforgeStore();
  const { status, body } = await invokeHandler(tc.phone, tc.input);
  const store = getMockInsforgeStore();
  return { status, body, store, ghlApiCalls: ghlApiCalls.length };
}

function evaluateCase(tc, outcome) {
  const failures = [];
  const exp = tc.expect;

  if (tc.mode === "direct_sync") {
    const { result, ghlApiCalls: calls } = outcome;
    if (result.block_reason !== exp.ghl_block_reason) {
      failures.push(`block_reason: expected ${exp.ghl_block_reason}, got ${result.block_reason}`);
    }
    if (exp.ghl_api_calls !== undefined && calls !== exp.ghl_api_calls) {
      failures.push(`ghl_api_calls: expected ${exp.ghl_api_calls}, got ${calls}`);
    }
    return failures;
  }

  const { status, body, ghlApiCalls: calls } = outcome;
  if (status !== 200 || body.ok !== true) {
    failures.push(`HTTP ${status} ok=${body.ok}`);
    return failures;
  }

  for (const key of [
    "ghl_dry_run",
    "ghl_live",
    "ghl_synced",
    "ghl_block_reason",
    "ghl_sync_status",
    "ghl_allowlist_matched",
    "custom_fields_written",
    "ghl_would_create_task",
    "intent",
  ]) {
    if (exp[key] !== undefined && body[key] !== exp[key]) {
      failures.push(`${key}: expected ${exp[key]}, got ${body[key]}`);
    }
  }

  if (exp.ghl_api_calls !== undefined && calls !== exp.ghl_api_calls) {
    failures.push(`ghl_api_calls: expected ${exp.ghl_api_calls}, got ${calls}`);
  }
  if (exp.ghl_api_calls_min !== undefined && calls < exp.ghl_api_calls_min) {
    failures.push(`ghl_api_calls: expected >= ${exp.ghl_api_calls_min}, got ${calls}`);
  }

  const ghlLog = outcome.store.wa_ghl_sync_log[outcome.store.wa_ghl_sync_log.length - 1];
  if (exp.ghl_block_reason && ghlLog?.status !== exp.ghl_block_reason) {
    failures.push(`wa_ghl_sync_log.status: expected ${exp.ghl_block_reason}, got ${ghlLog?.status}`);
  }

  return failures;
}

async function main() {
  const results = [];
  let pass = 0;
  let fail = 0;

  for (const tc of fixture.cases) {
    const outcome =
      tc.mode === "direct_sync" ? await runDirectSyncCase(tc) : await runHandlerCase(tc);
    const failures = evaluateCase(tc, outcome);
    const ok = failures.length === 0;
    if (ok) pass++;
    else fail++;
    results.push({ tc, ok, failures, outcome });
    console.log(`Case ${tc.id} ${tc.name}: ${ok ? "PASS" : "FAIL"}`);
    if (!ok) failures.forEach((f) => console.log(`  - ${f}`));
  }

  const phonesParse = handler.parseGhlLiveAllowedPhones("+521111111111, +529991525583");
  if (
    phonesParse.length !== 2 ||
    phonesParse[1] !== "+529991525583"
  ) {
    fail++;
    console.log("parseGhlLiveAllowedPhones spaces: FAIL");
  } else {
    pass++;
    console.log("parseGhlLiveAllowedPhones spaces: PASS");
  }

  globalThis.fetch = nativeFetch;

  const statusLine = fail === 0 ? "**PASS**" : "**FAIL**";
  const lines = [
    "# Phase 7G.4T — GHL Live Allowlist Report",
    "",
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    `**Status:** ${statusLine} (${pass}/${fixture.cases.length + 1} checks)`,
    "",
    "## Summary",
    "",
    "- Variable: `GHL_LIVE_ALLOWED_PHONES`",
    "- Block only when `GHL_SYNC_MODE=live`",
    "- No real GHL API calls (stubbed `leadconnectorhq.com`)",
    "- No WhatsApp live (`WA_AGENT_MODE=mock`)",
    "- No deploy",
    "",
    "## Cases",
    "",
    "| ID | Name | Result |",
    "|:---:|---|:---:|",
  ];

  for (const row of results) {
    lines.push(`| ${row.tc.id} | ${row.tc.name} | ${row.ok ? "PASS" : "FAIL"} |`);
  }
  lines.push(`| P | parse spaces | ${fail === 0 ? "PASS" : "see console"} |`);
  lines.push("");
  lines.push("## Block reasons");
  lines.push("");
  lines.push("- `blocked_allowlist_missing` — live sin lista");
  lines.push("- `blocked_allowlist_no_phone` — teléfono vacío");
  lines.push("- `blocked_allowlist_phone` — teléfono fuera de lista");
  lines.push("");
  lines.push("## Recommendation 7G.5A");
  lines.push("");
  lines.push("1. Set `GHL_LIVE_ALLOWED_PHONES=+529991525583` in InsForge before `GHL_SYNC_MODE=live`.");
  lines.push("2. Keep `GHL_WRITE_CUSTOM_FIELDS=false`.");
  lines.push("3. Pilot 3–5 messages; rollback to `dry_run` after.");

  fs.writeFileSync(REPORT, lines.join("\n"));

  console.log(`\nPhase 7G.4T allowlist: ${pass}/${fixture.cases.length + 1} PASS`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  globalThis.fetch = nativeFetch;
  console.error(err);
  process.exit(1);
});
