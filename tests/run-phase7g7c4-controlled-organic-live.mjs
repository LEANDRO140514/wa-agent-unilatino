#!/usr/bin/env node
/**
 * Phase 7G.7C.4 — Controlled organic GHL live + WA mock (local, do not commit).
 * Usage: node tests/run-phase7g7c4-controlled-organic-live.mjs
 */

const ENDPOINT =
  process.env.PHASE7G7C4_ENDPOINT ||
  "https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound";
// Required for live runs; keep real E.164 values in local env only.
const TO = process.env.PHASE7G7C4_TO || "<EVA_WA_BUSINESS_E164>";
const DELAY_MS = Number(process.env.PHASE7G7C4_DELAY_MS || "1500");

const PHONES = [
  {
    id: "P1",
    name: "Leandro",
    from: process.env.PHASE7G7C4_P1_PHONE || "<P1_E164>",
    ghl_contact_id:
      process.env.PHASE7G7C4_P1_GHL_CONTACT_ID || "<P1_GHL_CONTACT_ID>",
  },
  {
    id: "P2",
    name: "Admisiones 1",
    from: process.env.PHASE7G7C4_P2_PHONE || "<P2_E164>",
    ghl_contact_id:
      process.env.PHASE7G7C4_P2_GHL_CONTACT_ID || "<P2_GHL_CONTACT_ID>",
  },
  {
    id: "P3",
    name: "Admisiones 2",
    from: process.env.PHASE7G7C4_P3_PHONE || "<P3_E164>",
    ghl_contact_id:
      process.env.PHASE7G7C4_P3_GHL_CONTACT_ID || "<P3_GHL_CONTACT_ID>",
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(from, messageText, tag) {
  const payload = {
    event_type: "whatsapp.inbound_message.received",
    from,
    to: TO,
    message_id: `7g7c4-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
    ghl_task_title: body.ghl_task_title,
    ghl_would_create_task: body.ghl_would_create_task,
    custom_fields_enabled: body.custom_fields_enabled,
    custom_fields_written: body.custom_fields_written,
    custom_fields_keys_written: body.custom_fields_keys_written,
    ghl_allowlist_enabled: body.ghl_allowlist_enabled,
    ghl_allowlist_matched: body.ghl_allowlist_matched,
    ghl_allowed_phones_count: body.ghl_allowed_phones_count,
    policy: s.policy,
    would_sync: s.would_sync_to_ghl,
    routing: s.routing_reason,
    handoff: s.human_handoff_reason,
    would_task: s.would_create_task,
    ghl_sync_log_id: body.ghl_sync_log_id,
    reply_preview: typeof body.reply === "string" ? body.reply.slice(0, 80) : null,
  };
}

const CASES = [
  {
    id: "M1",
    msg: "Hola",
    check(r) {
      return (
        r.ghl_policy_blocked === true &&
        r.ghl_synced !== true &&
        r.outbound_real === false &&
        r.mode === "mock" &&
        r.ghl_live === true
      );
    },
  },
  {
    id: "M2",
    msg: "Me interesa Derecho en línea",
    check(r) {
      return (
        r.ghl_synced === true &&
        r.ghl_live === true &&
        r.ghl_policy_blocked !== true &&
        r.custom_fields_written === true &&
        r.would_task !== true &&
        r.outbound_real === false &&
        r.mode === "mock"
      );
    },
  },
  {
    id: "M3",
    msg: "Cuánto cuesta Derecho en línea?",
    check(r) {
      return (
        r.ghl_synced === true &&
        r.routing === "cost_signal_requires_human_validation" &&
        (r.ghl_task_created === true || r.ghl_would_create_task === true) &&
        r.handoff === "cost_or_tuition_requires_validation" &&
        r.custom_fields_written === true &&
        r.outbound_real === false &&
        r.mode === "mock"
      );
    },
  },
  {
    id: "M4",
    msg: "Quiero hablar con asesor",
    check(r) {
      return (
        r.ghl_synced === true &&
        (r.ghl_task_created === true || r.ghl_would_create_task === true) &&
        r.custom_fields_written === true &&
        r.outbound_real === false &&
        r.mode === "mock"
      );
    },
  },
  {
    id: "M5",
    msg: "Gracias",
    check(r) {
      return (
        (r.ghl_policy_blocked === true || r.ghl_synced !== true) &&
        r.outbound_real === false &&
        r.mode === "mock" &&
        r.would_task !== true
      );
    },
  },
];

let pass = 0;
let fail = 0;
const results = [];

console.log("7G.7C.4 Controlled organic GHL live + WA mock\n");

for (const phone of PHONES) {
  console.log(`\n--- ${phone.id} ${phone.name} (${phone.from}) ---\n`);
  for (const c of CASES) {
    const tag = `${phone.id}-${c.id}`;
    const { status, body } = await post(phone.from, c.msg, tag);
    const r = summarize(body);
    const ok = status === 200 && body.ok === true && c.check(r);
    const row = { phone: phone.id, phone_name: phone.name, from: phone.from, case_id: c.id, msg: c.msg, ok, status, ...r };
    results.push(row);
    if (ok) {
      pass++;
      console.log(`PASS ${tag} — ${c.msg}`);
    } else {
      fail++;
      console.log(`FAIL ${tag} — ${c.msg}`);
      console.log(JSON.stringify(r, null, 2));
    }
    await sleep(DELAY_MS);
  }
}

console.log(`\n7G.7C.4 live pilot: ${pass}/${pass + fail} PASS`);
if (fail > 0) process.exitCode = 1;

const outPath = process.env.PHASE7G7C4_RESULTS_JSON;
if (outPath) {
  const fs = await import("fs");
  fs.writeFileSync(outPath, JSON.stringify({ pass, fail, results }, null, 2));
}

export { results };
