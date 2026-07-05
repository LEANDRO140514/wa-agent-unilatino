#!/usr/bin/env node
/**
 * Fase 1 — Item 1: idempotencia ENG-0B insert-first + replay sin side effects.
 *
 * Usage: node tests/run-phase-fase1-item1-idempotency.mjs
 */

import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const HANDLER_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");
const MOCK_DB_PATH = path.join(ROOT, "insforge/functions/lib/test/mock-insforge-client.js");

for (const [key, value] of Object.entries({
  WA_E2E_MOCK_DB: "true",
  WA_AGENT_MODE: "mock",
  GHL_SYNC_MODE: "dry_run",
  ACADEMIC_ENGINE_ENABLED: "false",
  EVA_LLM_ENABLED: "false",
  INSFORGE_BASE_URL: "http://mock-insforge.local",
  ANON_KEY: "mock-anon-key",
  FF_NOT_OFFERED: "false",
  FF_FALLBACKS: "false",
  FF_ESCALATION_V2: "false",
})) {
  process.env[key] = value;
}

if (!globalThis.Deno) {
  globalThis.Deno = { env: { get: (key) => process.env[key] } };
}

const { resetMockInsforgeStore, getMockInsforgeStore } = await import(
  pathToFileURL(MOCK_DB_PATH).href,
);
const handler = (await import(pathToFileURL(HANDLER_PATH).href)).default;

const TEST_PHONE = "+525551240000";
const RUN_SUFFIX = Date.now().toString(36);

function buildPayload(messageId, messageText = "hola", phone = TEST_PHONE) {
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

async function invoke(payload) {
  const request = new Request("http://localhost/ycloud-wa-inbound", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const response = await handler(request);
  const body = await response.json();
  return { status: response.status, body };
}

function snapshotStore(store, phone = TEST_PHONE) {
  const contact = store.wa_contacts_state.find((r) => r.normalized_phone === phone) || null;
  return {
    inbound: store.wa_inbound_messages.length,
    outbound: store.wa_outbound_messages.filter((r) => r.to_phone === phone).length,
    ghl: store.wa_ghl_sync_log.length,
    errors: store.wa_errors.length,
    contact: contact ? { ...contact } : null,
  };
}

const results = [];
let failures = 0;

function record(id, ok, detail = "") {
  results.push({ id, ok, detail });
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${id}${detail ? ` — ${detail}` : ""}`);
}

try {
  // --- Test 1: first delivery full flow ---
  resetMockInsforgeStore();
  const messageId = `fase1-item1-${RUN_SUFFIX}-primary`;
  const payload1 = buildPayload(messageId, "qué carreras tienen");

  const first = await invoke(payload1);
  const storeAfterFirst = getMockInsforgeStore();
  const snapFirst = snapshotStore(storeAfterFirst);

  record("I1_first_http_200", first.status === 200);
  record("I1_first_not_skipped", first.body.skipped !== true, `skipped=${first.body.skipped}`);
  record("I1_first_has_inbound", snapFirst.inbound === 1, `inbound=${snapFirst.inbound}`);
  record("I1_first_has_outbound", snapFirst.outbound === 1, `outbound=${snapFirst.outbound}`);
  record("I1_first_has_ghl_log", snapFirst.ghl >= 1, `ghl=${snapFirst.ghl}`);
  record("I1_first_has_contact", snapFirst.contact !== null);

  // --- Test 2: exact replay ---
  const beforeReplay = snapshotStore(getMockInsforgeStore());
  const replay = await invoke(payload1);
  const afterReplay = snapshotStore(getMockInsforgeStore());

  record("I2_replay_skipped", replay.body.skipped === true);
  record("I2_replay_idempotent", replay.body.idempotent === true);
  record(
    "I2_replay_reason",
    replay.body.reason === "duplicate_ycloud_message_id",
    replay.body.reason,
  );
  record(
    "I2_replay_zero_outbound",
    afterReplay.outbound === beforeReplay.outbound,
    `outbound ${beforeReplay.outbound} → ${afterReplay.outbound}`,
  );
  record(
    "I2_replay_zero_inbound",
    afterReplay.inbound === beforeReplay.inbound,
    `inbound ${beforeReplay.inbound} → ${afterReplay.inbound}`,
  );
  record(
    "I2_replay_zero_ghl",
    afterReplay.ghl === beforeReplay.ghl,
    `ghl ${beforeReplay.ghl} → ${afterReplay.ghl}`,
  );
  record(
    "I2_replay_contact_unchanged",
    JSON.stringify(afterReplay.contact) === JSON.stringify(beforeReplay.contact),
  );
  if (beforeReplay.contact?.updated_at && afterReplay.contact?.updated_at) {
    record(
      "I2_replay_contact_updated_at_unchanged",
      afterReplay.contact.updated_at === beforeReplay.contact.updated_at,
    );
  }

  // --- Test 3: concurrent same message_id ---
  resetMockInsforgeStore();
  const concurrentId = `fase1-item1-${RUN_SUFFIX}-race`;
  const racePayload = buildPayload(concurrentId, "info", "+525551240001");
  const [raceA, raceB] = await Promise.all([invoke(racePayload), invoke(racePayload)]);
  const raceStore = getMockInsforgeStore();
  const racePhone = "+525551240001";

  const skippedCount = [raceA.body, raceB.body].filter((b) => b.skipped === true && b.idempotent === true).length;
  const processedCount = [raceA.body, raceB.body].filter((b) => b.skipped !== true).length;

  record(
    "I3_concurrent_one_processed",
    processedCount === 1,
    `processed=${processedCount}`,
  );
  record(
    "I3_concurrent_one_idempotent",
    skippedCount === 1,
    `idempotent=${skippedCount}`,
  );
  record(
    "I3_concurrent_single_inbound",
    raceStore.wa_inbound_messages.filter((r) => r.ycloud_message_id === concurrentId).length === 1,
  );
  record(
    "I3_concurrent_single_outbound",
    raceStore.wa_outbound_messages.filter((r) => r.to_phone === racePhone).length === 1,
  );
  record(
    "I3_concurrent_single_ghl",
    raceStore.wa_ghl_sync_log.filter((r) => r.normalized_phone === racePhone).length === 1,
  );

  // --- Test 4: negative control different message_id ---
  resetMockInsforgeStore();
  const controlPhone = "+525551240002";
  const idA = `fase1-item1-${RUN_SUFFIX}-ctrl-a`;
  const idB = `fase1-item1-${RUN_SUFFIX}-ctrl-b`;
  const ctrlA = await invoke(buildPayload(idA, "hola", controlPhone));
  const ctrlB = await invoke(buildPayload(idB, "hola de nuevo", controlPhone));
  const ctrlStore = getMockInsforgeStore();

  record("I4_control_a_not_skipped", ctrlA.body.skipped !== true);
  record("I4_control_b_not_skipped", ctrlB.body.skipped !== true);
  record(
    "I4_control_two_inbounds",
    ctrlStore.wa_inbound_messages.filter((r) => r.normalized_phone === controlPhone).length === 2,
  );
  record(
    "I4_control_two_outbounds",
    ctrlStore.wa_outbound_messages.filter((r) => r.to_phone === controlPhone).length === 2,
  );
} catch (err) {
  failures += 1;
  console.error("FATAL", err.message);
  console.error(err.stack);
}

console.log(`\n--- Fase 1 Item 1: ${results.length - failures}/${results.length} passed ---`);
process.exit(failures > 0 ? 1 : 0);
