#!/usr/bin/env node
/**
 * Fase 7G.5B-PREFLIGHT — Custom fields wa_* audit (mock DB + stub GHL API).
 * Usage: node tests/run-phase7g5b-custom-fields-preflight.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(ROOT, "tests/payloads/phase7g5b-custom-fields-preflight.json");
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
const ghlCustomFieldPutCalls = [];

function resolveMapPlaceholder(raw) {
  if (!raw || typeof raw !== "string") return raw;
  return raw
    .replace("{{protected_key_map}}", fixture.protected_key_map)
    .replace("{{forbidden_id_map}}", fixture.forbidden_id_map)
    .replace("{{valid_map}}", fixture.valid_map);
}

function installGhlFetchStub() {
  ghlApiCalls.length = 0;
  ghlCustomFieldPutCalls.length = 0;
  globalThis.fetch = async (url, options = {}) => {
    const href = String(url);
    if (href.includes("leadconnectorhq.com")) {
      const method = options.method || "GET";
      let bodyObj = null;
      if (options.body) {
        try {
          bodyObj = JSON.parse(options.body);
        } catch {
          bodyObj = null;
        }
      }
      ghlApiCalls.push({ url: href, method, hasCustomFields: Boolean(bodyObj?.customFields) });
      if (method === "PUT" && bodyObj?.customFields) {
        ghlCustomFieldPutCalls.push({ url: href, count: bodyObj.customFields.length });
      }
      if (href.includes("/contacts/search")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ contacts: [{ id: "mock-ghl-contact-7g5b" }] }),
        };
      }
      if (href.includes("/contacts/") && method === "POST" && href.endsWith("/contacts/")) {
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
      if (method === "PUT") {
        return { ok: true, status: 200, json: async () => ({ contact: { id: "mock-ghl-contact-7g5b" } }) };
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
    process.env[key] = resolveMapPlaceholder(value);
  }
  if (!globalThis.Deno) {
    globalThis.Deno = { env: { get: (key) => process.env[key] } };
  }
}

async function runDirectSyncCase(tc) {
  installGhlFetchStub();
  applyEnv(tc.env);
  resetMockInsforgeStore();
  const client = getMockInsforgeClient();
  const config = handler.getConfig();
  const now = new Date().toISOString();
  const result = await handler.syncGHLContact(client, config, {
    inboundId: `mock-inbound-7g5b-${tc.id}`,
    normalizedPhone: tc.phone || "+529991525583",
    intent: tc.intent,
    messageText: tc.input,
    messageType: "text",
    needsHuman: tc.needsHuman ?? false,
    responseText: "mock outbound response",
    waStage: tc.waStage || tc.intent,
    waSummary: `Intent: ${tc.intent}`,
    timestamp: now,
    priority: "low",
    escalation_required: tc.needsHuman ?? false,
    operational_owner: "Equipo de Admisiones Universidad Latino",
    business_hours_label: "Lunes a viernes 9:00-18:00",
    after_hours_message: "",
    after_hours_logic_enabled: false,
    task_title: `Atender lead WhatsApp — ${tc.intent}`,
    task_priority_label: "Baja",
  });
  const store = getMockInsforgeStore();
  return { result, store, ghlApiCalls: ghlApiCalls.length, cfPuts: ghlCustomFieldPutCalls.length };
}

function runMapParseCase(tc) {
  applyEnv(tc.env);
  const config = handler.getConfig();
  const state = handler.getConfig();
  // Re-resolve via sync path: use internal parse through dry run config
  const parsed = JSON.parse(resolveMapPlaceholder(tc.env.GHL_WA_FIELD_MAP));
  const missing = [
    "wa_last_intent",
    "wa_last_message_at",
    "wa_stage",
    "wa_needs_human",
    "wa_summary",
    "wa_source",
    "wa_last_inbound_text",
    "wa_last_outbound_text",
  ].filter((k) => !(k in parsed));
  const extra = Object.keys(parsed).filter(
    (k) =>
      ![
        "wa_last_intent",
        "wa_last_message_at",
        "wa_stage",
        "wa_needs_human",
        "wa_summary",
        "wa_source",
        "wa_last_inbound_text",
        "wa_last_outbound_text",
      ].includes(k)
  );
  const errors = [];
  if (missing.length) errors.push(`missing_keys: ${missing.join(",")}`);
  if (extra.length) errors.push(`extra_keys: ${extra.join(",")}`);
  for (const id of Object.values(parsed)) {
    if (String(id).trim() === "yBz675YEp1pdvwnvloXP") errors.push("forbidden_id: yBz675YEp1pdvwnvloXP");
  }
  if ("wa_test_checkbox_a" in parsed) errors.push("forbidden_key: wa_test_checkbox_a");
  const mapValid = errors.length === 0;
  return { mapValid, errors, config: state };
}

function evaluateCase(tc, outcome) {
  const failures = [];
  const exp = tc.expect;

  if (tc.mode === "map_parse") {
    if (outcome.mapValid !== exp.map_valid) {
      failures.push(`map_valid: expected ${exp.map_valid}, got ${outcome.mapValid}`);
    }
    if (exp.error_includes && !outcome.errors.some((e) => e.includes(exp.error_includes))) {
      failures.push(`errors missing ${exp.error_includes}: ${outcome.errors.join("; ")}`);
    }
    return failures;
  }

  const { result, cfPuts, ghlApiCalls: calls } = outcome;

  for (const key of [
    "custom_fields_written",
    "custom_fields_would_write",
    "custom_fields_map_valid",
    "custom_fields_count",
    "custom_fields_skipped_reason",
    "would_create_task",
    "blocked",
  ]) {
    if (exp[key] !== undefined && result[key] !== exp[key]) {
      failures.push(`${key}: expected ${exp[key]}, got ${result[key]}`);
    }
  }

  if (exp.custom_fields_put_calls !== undefined && cfPuts !== exp.custom_fields_put_calls) {
    failures.push(`custom_fields_put_calls: expected ${exp.custom_fields_put_calls}, got ${cfPuts}`);
  }
  if (exp.ghl_api_calls !== undefined && calls !== exp.ghl_api_calls) {
    failures.push(`ghl_api_calls: expected ${exp.ghl_api_calls}, got ${calls}`);
  }

  const cf = result.customFields || {};
  if (exp.wa_last_intent && cf.wa_last_intent !== exp.wa_last_intent) {
    failures.push(`wa_last_intent: expected ${exp.wa_last_intent}, got ${cf.wa_last_intent}`);
  }
  if (exp.wa_stage && cf.wa_stage !== exp.wa_stage) {
    failures.push(`wa_stage: expected ${exp.wa_stage}, got ${cf.wa_stage}`);
  }
  if (exp.wa_needs_human && cf.wa_needs_human !== exp.wa_needs_human) {
    failures.push(`wa_needs_human: expected ${exp.wa_needs_human}, got ${cf.wa_needs_human}`);
  }

  if (exp.custom_fields_keys) {
    const keys = Object.keys(cf).sort();
    const expected = [...exp.custom_fields_keys].sort();
    if (JSON.stringify(keys) !== JSON.stringify(expected)) {
      failures.push(`customFields keys: expected ${expected.join(",")}, got ${keys.join(",")}`);
    }
  }

  if (exp.forbidden_cf_keys) {
    for (const bad of exp.forbidden_cf_keys) {
      if (bad in cf) failures.push(`forbidden key present in customFields: ${bad}`);
    }
  }

  const protectedList = [
    "carrera_recomendada",
    "match_percent",
    "sector_principal",
    "dictamen_url",
    "test_completed_at",
    "test_version",
    "beca_elegible",
    "lead_score",
    "lead_class",
    "promedio",
    "email",
    "firstName",
    "lastName",
  ];
  for (const bad of protectedList) {
    if (bad in cf) failures.push(`protected field leaked into customFields: ${bad}`);
  }

  return failures;
}

async function main() {
  const results = [];
  let pass = 0;
  let fail = 0;

  for (const tc of fixture.cases) {
    const outcome =
      tc.mode === "map_parse" ? runMapParseCase(tc) : await runDirectSyncCase(tc);
    const failures = evaluateCase(tc, outcome);
    const ok = failures.length === 0;
    if (ok) pass++;
    else fail++;
    results.push({ tc, ok, failures });
    console.log(`Case ${tc.id} ${tc.name}: ${ok ? "PASS" : "FAIL"}`);
    if (!ok) failures.forEach((f) => console.log(`  - ${f}`));
  }

  const total = fixture.cases.length;
  console.log(`\nPhase 7G.5B custom fields preflight: ${pass}/${total} PASS`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
