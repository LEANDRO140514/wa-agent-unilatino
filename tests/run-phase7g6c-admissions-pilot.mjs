#!/usr/bin/env node
/**
 * Phase 7G.6C — Execute admissions pilot guion (live WA + GHL).
 * Usage: node tests/run-phase7g6c-admissions-pilot.mjs
 */

const ENDPOINT =
  process.env.PHASE7G6C_ENDPOINT ||
  "https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound";
// Required for live runs; keep real E.164 values in local env only.
const TO = process.env.PHASE7G6C_TO || "<EVA_WA_BUSINESS_E164>";
const OWNER_PHONE = process.env.PHASE7G6C_OWNER_PHONE || "<OWNER_E164>";
const ADM1_PHONE = process.env.PHASE7G6C_ADM1_PHONE || "<ADM1_E164>";
const ADM2_PHONE = process.env.PHASE7G6C_ADM2_PHONE || "<ADM2_E164>";
const DELAY_MS = Number(process.env.PHASE7G6C_DELAY_MS || "2500");

const PHONES = [
  { label: "Leandro", from: OWNER_PHONE },
  { label: "Admisiones 1", from: ADM1_PHONE },
  { label: "Admisiones 2", from: ADM2_PHONE },
];

const MESSAGES = [
  { text: "1", intent: "carreras_disponibles", task: false },
  { text: "Derecho online", intent: "carrera_interes", task: false },
  { text: "No sé qué estudiar", intent: "no_se_que_estudiar", task: false },
  {
    text: "Tengo promedio 9.2, qué beca me toca",
    intent: "beca",
    task: true,
  },
  { text: "Quiero hablar con asesor", intent: "humano", task: true },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(from, text, tag) {
  const payload = {
    event_type: "whatsapp.inbound_message.received",
    from,
    to: TO,
    message_id: `7g6c-${tag}-${Date.now()}`,
    message_type: "text",
    message_text: text,
    timestamp: new Date().toISOString(),
  };
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { http: res.status, body };
}

function check(body, expected) {
  const issues = [];
  if (body.mode !== "live_outbound") issues.push(`mode=${body.mode}`);
  if (!body.ghl_live) issues.push("ghl_live=false");
  if (!body.outbound_real) issues.push("outbound_real=false");
  if (body.outbound_status !== "accepted") issues.push(`outbound=${body.outbound_status}`);
  if (!body.ghl_synced) issues.push("ghl_synced=false");
  if (!body.custom_fields_written) issues.push("cf=false");
  if (body.ghl_allowlist_matched !== true) issues.push("allowlist_matched!=true");
  if (body.intent !== expected.intent) issues.push(`intent=${body.intent}`);
  return issues;
}

async function main() {
  console.log(`7G.6C execute → ${ENDPOINT}\n`);
  const results = [];
  let pass = 0;
  let fail = 0;

  for (const phone of PHONES) {
    console.log(`\n=== ${phone.label} (${phone.from}) ===`);
    for (let i = 0; i < MESSAGES.length; i++) {
      const msg = MESSAGES[i];
      const tag = `${phone.label.replace(/\s+/g, "-").toLowerCase()}-${i + 1}`;
      if (phone.from === OWNER_PHONE && i === 0) {
        console.log(`  [skip] msg 1 already sent in preflight`);
        continue;
      }
      process.stdout.write(`  ${i + 1}. "${msg.text.slice(0, 40)}" ... `);
      const { http, body } = await post(phone.from, msg.text, tag);
      const issues = check(body, msg);
      const ok = http === 200 && issues.length === 0;
      if (ok) {
        pass++;
        console.log(`PASS (${body.intent}, cf=${body.custom_fields_written})`);
      } else {
        fail++;
        console.log(`FAIL http=${http} ${issues.join(", ")}`);
      }
      results.push({
        phone: phone.from,
        label: phone.label,
        message: msg.text,
        ok,
        issues,
        intent: body.intent,
        ghl_synced: body.ghl_synced,
        cf: body.custom_fields_written,
        allowlist: body.ghl_allowlist_matched,
        provider: body.provider_response_id,
        task_would: body.ghl_would_create_task,
      });
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n--- Summary: ${pass} PASS, ${fail} FAIL ---`);
  if (fail > 0) process.exitCode = 1;
  return results;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
