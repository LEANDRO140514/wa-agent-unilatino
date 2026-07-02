#!/usr/bin/env node
/**
 * Phase 7G.7C.3 — GHL live allowlist pilot (local, do not commit without auth).
 * Usage: node tests/run-phase7g7c3-ghl-live-allowlist.mjs
 */

const ENDPOINT =
  process.env.PHASE7G7C3_ENDPOINT ||
  "https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound";
// Required for live runs; keep real E.164 values in local env only.
const FROM = process.env.PHASE7G7C3_FROM || "<OWNER_E164>";
const TO = process.env.PHASE7G7C3_TO || "<EVA_WA_BUSINESS_E164>";
const DELAY_MS = Number(process.env.PHASE7G7C3_DELAY_MS || "1200");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(messageText) {
  const payload = {
    event_type: "whatsapp.inbound_message.received",
    from: FROM,
    to: TO,
    message_id: `7g7c3-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message_type: "text",
    message_text: messageText,
    timestamp: new Date().toISOString(),
  };
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

function summarize(body) {
  const s = body.ghl_relevance_shadow || {};
  return {
    ok: body.ok,
    mode: body.mode,
    intent: body.intent,
    ghl_sync_mode: body.ghl_sync_mode,
    outbound_real: body.outbound_real,
    outbound_status: body.outbound_status,
    ghl_live: body.ghl_live,
    ghl_synced: body.ghl_synced,
    ghl_policy_blocked: body.ghl_policy_blocked,
    ghl_sync_status: body.ghl_sync_status,
    ghl_contact_id: body.ghl_contact_id,
    ghl_note_created: body.ghl_note_created,
    ghl_task_created: body.ghl_task_created,
    ghl_would_create_task: body.ghl_would_create_task,
    custom_fields_enabled: body.custom_fields_enabled,
    custom_fields_written: body.custom_fields_written,
    ghl_allowlist_enabled: body.ghl_allowlist_enabled,
    ghl_allowlist_matched: body.ghl_allowlist_matched,
    policy: s.policy,
    would_sync: s.would_sync_to_ghl,
    routing: s.routing_reason,
    handoff: s.human_handoff_reason,
    would_task: s.would_create_task,
    ghl_sync_log_id: body.ghl_sync_log_id,
  };
}

const CASES = [
  {
    id: "C1",
    msg: "Hola",
    check(r) {
      return (
        r.ghl_policy_blocked === true &&
        r.ghl_synced !== true &&
        r.outbound_real === false &&
        r.mode === "mock"
      );
    },
  },
  {
    id: "C2",
    msg: "Me interesa Derecho en línea",
    check(r) {
      return (
        r.ghl_synced === true &&
        r.ghl_live === true &&
        r.ghl_policy_blocked !== true &&
        r.custom_fields_written === true &&
        r.would_task !== true &&
        r.outbound_real === false
      );
    },
  },
  {
    id: "C3",
    msg: "Cuánto cuesta Derecho en línea?",
    check(r) {
      return (
        r.ghl_synced === true &&
        r.routing === "cost_signal_requires_human_validation" &&
        (r.ghl_task_created === true || r.ghl_would_create_task === true) &&
        r.handoff === "cost_or_tuition_requires_validation" &&
        r.custom_fields_written === true &&
        r.outbound_real === false
      );
    },
  },
  {
    id: "C4",
    msg: "Quiero hablar con asesor",
    check(r) {
      return (
        r.ghl_synced === true &&
        (r.ghl_task_created === true || r.ghl_would_create_task === true) &&
        r.custom_fields_written === true &&
        r.outbound_real === false
      );
    },
  },
  {
    id: "C5",
    msg: "me gusta el fútbol",
    check(r) {
      return (
        r.ghl_policy_blocked === true &&
        r.ghl_synced !== true &&
        r.would_task !== true &&
        r.outbound_real === false
      );
    },
  },
];

let pass = 0;
let fail = 0;
const results = [];

console.log("7G.7C.3 GHL live allowlist pilot\n");

for (const c of CASES) {
  const { status, body } = await post(c.msg);
  const r = summarize(body);
  const ok = status === 200 && body.ok === true && c.check(r);
  results.push({ id: c.id, msg: c.msg, ok, ...r });
  if (ok) {
    pass++;
    console.log(`PASS ${c.id} — ${c.msg}`);
  } else {
    fail++;
    console.log(`FAIL ${c.id} — ${c.msg}`);
    console.log(JSON.stringify(r, null, 2));
  }
  await sleep(DELAY_MS);
}

console.log(`\n7G.7C.3 live pilot: ${pass}/${pass + fail} PASS`);
if (fail > 0) process.exitCode = 1;

export { results };
