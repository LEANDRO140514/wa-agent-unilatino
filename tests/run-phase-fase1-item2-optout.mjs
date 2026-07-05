#!/usr/bin/env node
/**
 * Fase 1 — Item 2: OPT-OUT / NO_CONTACT (D22).
 *
 * Usage: node tests/run-phase-fase1-item2-optout.mjs
 */

import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const HANDLER_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");
const MOCK_DB_PATH = path.join(ROOT, "insforge/functions/lib/test/mock-insforge-client.js");

const BASE_ENV = {
  WA_E2E_MOCK_DB: "true",
  WA_AGENT_MODE: "mock",
  GHL_SYNC_MODE: "dry_run",
  ACADEMIC_ENGINE_ENABLED: "false",
  EVA_LLM_ENABLED: "false",
  INSFORGE_BASE_URL: "http://mock-insforge.local",
  ANON_KEY: "mock-anon-key",
  FF_NO_CONTACT: "true",
  FF_FSM: "false",
  FF_FALLBACKS: "false",
  FF_ESCALATION_V2: "false",
};

for (const [key, value] of Object.entries(BASE_ENV)) {
  process.env[key] = value;
}

if (!globalThis.Deno) {
  globalThis.Deno = { env: { get: (key) => process.env[key] } };
}

const { resetMockInsforgeStore, getMockInsforgeStore } = await import(
  pathToFileURL(MOCK_DB_PATH).href,
);
const handler = (await import(pathToFileURL(HANDLER_PATH).href)).default;

const RUN = Date.now().toString(36);
let msgSeq = 0;

function nextMessageId(label) {
  msgSeq += 1;
  return `fase1-item2-${RUN}-${label}-${msgSeq}`;
}

function buildPayload(messageText, phone, messageId = nextMessageId("msg")) {
  return {
    event_type: "whatsapp.inbound_message.received",
    from: phone,
    to: "+529994538421",
    message_type: "text",
    message_text: messageText,
    message_id: messageId,
    timestamp: new Date().toISOString(),
  };
}

async function invoke(messageText, phone, messageId) {
  const request = new Request("http://localhost/ycloud-wa-inbound", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildPayload(messageText, phone, messageId)),
  });
  const response = await handler(request);
  const body = await response.json();
  return { status: response.status, body };
}

function contactRow(store, phone) {
  return store.wa_contacts_state.find((r) => r.normalized_phone === phone) || null;
}

function lastGhlLog(store, phone) {
  const rows = store.wa_ghl_sync_log.filter((r) => r.normalized_phone === phone);
  return rows[rows.length - 1] || null;
}

function ghlLogsWithTag(store, phone, tag) {
  return store.wa_ghl_sync_log.filter((r) => {
    if (r.normalized_phone !== phone) return false;
    const tags = r.payload?.tags || r.would_add_tags || [];
    return Array.isArray(tags) && tags.includes(tag);
  });
}

const results = [];
let failures = 0;

function record(id, ok, detail = "") {
  results.push({ id, ok, detail });
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${id}${detail ? ` — ${detail}` : ""}`);
}

try {
  // 1. Explicit opt-out
  resetMockInsforgeStore();
  const phone1 = "+525551250001";
  const r1 = await invoke("ya no me escriban", phone1);
  const store1 = getMockInsforgeStore();
  const contact1 = contactRow(store1, phone1);
  const ghl1 = lastGhlLog(store1, phone1);

  record("O1_intent_opt_out", r1.body.intent === "opt_out", r1.body.intent);
  record(
    "O1_fsm_no_contact",
    contact1?.fsm_state === "NO_CONTACT",
    contact1?.fsm_state,
  );
  record(
    "O1_response_confirmation",
    String(r1.body.response_text || "").includes("Entendido, no te enviaremos"),
  );
  record(
    "O1_tag_wa_no_contact",
    (ghl1?.payload?.tags || ghl1?.would_add_tags || []).includes("wa_no_contact"),
  );
  record(
    "O1_note_present",
    Boolean(ghl1?.payload?.note || ghl1?.would_add_note),
  );

  // 2. Negative — "no" / "no gracias" must NOT opt-out
  resetMockInsforgeStore();
  const phone2 = "+525551250002";
  const r2a = await invoke("no", phone2);
  const r2b = await invoke("no gracias", phone2);
  const contact2 = contactRow(getMockInsforgeStore(), phone2);
  record("O2_no_not_opt_out", r2a.body.intent !== "opt_out", r2a.body.intent);
  record("O2_no_gracias_not_opt_out", r2b.body.intent !== "opt_out", r2b.body.intent);
  record("O2_fsm_stays_null", contact2?.fsm_state == null, String(contact2?.fsm_state));

  // 3. Ambiguous → confirm → sí / no
  resetMockInsforgeStore();
  const phone3 = "+525551250003";
  const r3a = await invoke("ya no quiero", phone3);
  record("O3_asks_confirmation", r3a.body.intent === "opt_out_confirmacion");
  record(
    "O3_question_text",
    String(r3a.body.response_text || "").includes("Prefieres que ya no te enviemos"),
  );

  const r3b = await invoke("sí", phone3);
  const contact3b = contactRow(getMockInsforgeStore(), phone3);
  record("O3_yes_executes_opt_out", r3b.body.intent === "opt_out");
  record("O3_yes_fsm_no_contact", contact3b?.fsm_state === "NO_CONTACT");

  resetMockInsforgeStore();
  const phone3c = "+525551250004";
  await invoke("ya no quiero", phone3c);
  const r3c = await invoke("no", phone3c);
  const contact3c = contactRow(getMockInsforgeStore(), phone3c);
  record("O3_no_after_confirm_not_opt_out", r3c.body.intent !== "opt_out", r3c.body.intent);
  record("O3_no_fsm_not_set", contact3c?.fsm_state !== "NO_CONTACT", contact3c?.fsm_state);

  // 4. NO_CONTACT reactive — substantive answer, no new GHL tags
  resetMockInsforgeStore();
  const phone4 = "+525551250005";
  await invoke("dejen de mandarme mensajes", phone4);
  const ghlCountAfterOptOut = ghlLogsWithTag(getMockInsforgeStore(), phone4, "wa_no_contact").length;
  const r4 = await invoke("¿cuánto cuesta Derecho?", phone4);
  const store4 = getMockInsforgeStore();
  const contact4 = contactRow(store4, phone4);
  const ghlCountAfterReactive = ghlLogsWithTag(store4, phone4, "wa_no_contact").length;
  record("O4_reactive_has_response", Boolean(r4.body.response_text));
  record("O4_fsm_still_no_contact", contact4?.fsm_state === "NO_CONTACT");
  record(
    "O4_no_new_ghl_tags",
    ghlCountAfterReactive === ghlCountAfterOptOut,
    `${ghlCountAfterOptOut} → ${ghlCountAfterReactive}`,
  );
  record("O4_ghl_log_count_unchanged", store4.wa_ghl_sync_log.length === 1);

  // 5. Re-opt-in
  resetMockInsforgeStore();
  const phone5 = "+525551250006";
  await invoke("ya no me escriban", phone5);
  const r5 = await invoke("sí quiero información de nuevo", phone5);
  const store5 = getMockInsforgeStore();
  const contact5 = contactRow(store5, phone5);
  const ghl5 = lastGhlLog(store5, phone5);
  record("O5_reopt_in_intent", r5.body.intent === "re_opt_in");
  record("O5_fsm_cleared", contact5?.fsm_state == null, String(contact5?.fsm_state));
  record(
    "O5_tag_remove_logged",
    (ghl5?.payload?.tags_to_remove || ghl5?.would_remove_tags || []).includes("wa_no_contact"),
  );

  // 6. Idempotent replay of opt-out message
  resetMockInsforgeStore();
  const phone6 = "+525551250007";
  const optId = nextMessageId("opt-replay");
  const payload6 = buildPayload("stop", phone6, optId);
  await invoke("stop", phone6, optId);
  const ghlAfterFirst = ghlLogsWithTag(getMockInsforgeStore(), phone6, "wa_no_contact").length;
  const replay6 = await invoke("stop", phone6, optId);
  const ghlAfterReplay = ghlLogsWithTag(getMockInsforgeStore(), phone6, "wa_no_contact").length;
  record("O6_replay_skipped", replay6.body.skipped === true && replay6.body.idempotent === true);
  record(
    "O6_no_duplicate_ghl_tag",
    ghlAfterReplay === ghlAfterFirst && ghlAfterFirst === 1,
    `${ghlAfterFirst} → ${ghlAfterReplay}`,
  );

  // 7. FF_NO_CONTACT=false — legacy behavior
  process.env.FF_NO_CONTACT = "false";
  resetMockInsforgeStore();
  const phone7 = "+525551250008";
  const r7 = await invoke("ya no me escriban", phone7);
  const contact7 = contactRow(getMockInsforgeStore(), phone7);
  record("O7_flag_off_not_opt_out_intent", r7.body.intent !== "opt_out", r7.body.intent);
  record("O7_flag_off_no_fsm", contact7?.fsm_state == null, String(contact7?.fsm_state));
  process.env.FF_NO_CONTACT = "true";
} catch (err) {
  failures += 1;
  console.error("FATAL", err.message);
  console.error(err.stack);
}

console.log(`\n--- Fase 1 Item 2: ${results.length - failures}/${results.length} passed ---`);
process.exit(failures > 0 ? 1 : 0);
