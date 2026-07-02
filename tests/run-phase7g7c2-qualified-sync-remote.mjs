#!/usr/bin/env node
/**
 * Phase 7G.7C.2 — Remote qualified sync dry_run validation.
 * Usage: node tests/run-phase7g7c2-qualified-sync-remote.mjs
 */

const ENDPOINT =
  process.env.PHASE7G7C2_ENDPOINT ||
  "https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound";
// Required for live runs; keep real E.164 values in local env only.
const TO = process.env.PHASE7G7C2_TO || "<EVA_WA_BUSINESS_E164>";
const ALLOWED = process.env.PHASE7G7C2_ALLOWED || "<OWNER_E164>";
const META_FROM = process.env.PHASE7G7C2_META_FROM || "<META_TEST_E164>";
const OFFTOPIC_FROM = process.env.PHASE7G7C2_OFFTOPIC_FROM || "<OFFTOPIC_TEST_E164>";
const POST_ESC_FROM = process.env.PHASE7G7C2_POST_ESC_FROM || "<POST_ESC_TEST_E164>";
const C1_FROM = process.env.PHASE7G7C2_C1_FROM || "<C1_TEST_E164>";
const C3_FROM = process.env.PHASE7G7C2_C3_FROM || "<C3_TEST_E164>";
const C4_FROM = process.env.PHASE7G7C2_C4_FROM || "<C4_TEST_E164>";
const DELAY_MS = Number(process.env.PHASE7G7C2_DELAY_MS || "700");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(from, messageText, extra = {}) {
  const payload = {
    event_type: "whatsapp.inbound_message.received",
    from,
    to: TO,
    message_id: `7g7c2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message_type: "text",
    message_text: messageText,
    timestamp: new Date().toISOString(),
    ...extra,
  };
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

function safeFlags(body) {
  return {
    outbound_real: body.outbound_real,
    ghl_live: body.ghl_live,
    ghl_synced: body.ghl_synced,
    custom_fields_enabled: body.custom_fields_enabled,
    custom_fields_written: body.custom_fields_written,
  };
}

function hardFail(body) {
  const issues = [];
  if (body.outbound_real === true) issues.push("outbound_real=true");
  if (body.ghl_live === true) issues.push("ghl_live=true");
  if (body.ghl_synced === true) issues.push("ghl_synced=true");
  if (body.custom_fields_written === true) issues.push("custom_fields_written=true");
  return issues;
}

let pass = 0;
let fail = 0;
const results = [];

function record(id, ok, detail) {
  results.push({ id, ok, detail });
  if (ok) {
    pass++;
    console.log(`PASS ${id}`);
  } else {
    fail++;
    console.log(`FAIL ${id}: ${detail}`);
  }
}

console.log("7G.7C.2 Remote qualified sync dry_run validation\n");

// Preflight probe
{
  const { status, body } = await post(ALLOWED, "1");
  const hard = hardFail(body);
  const s = body.ghl_relevance_shadow || {};
  const ok =
    status === 200 &&
    body.ok === true &&
    body.mode === "mock" &&
    hard.length === 0 &&
    body.ghl_sync_mode === "dry_run" &&
    s.enabled === true &&
    s.policy === "qualified_only" &&
    body.custom_fields_enabled === false;
  record(
    "PREFLIGHT",
    ok,
    ok
      ? `policy=${s.policy}`
      : JSON.stringify({
          status,
          mode: body.mode,
          policy: s.policy,
          hard,
          ghl_sync_mode: body.ghl_sync_mode,
        })
  );
}

await sleep(DELAY_MS);

// Case 1 — Saludo
{
  const from = C1_FROM;
  const { status, body } = await post(from, "Hola");
  const s = body.ghl_relevance_shadow || {};
  const hard = hardFail(body);
  const ok =
    status === 200 &&
    hard.length === 0 &&
    s.ignored_for_ghl === true &&
    s.would_sync_to_ghl === false &&
    (body.ghl_policy_blocked === true ||
      body.ghl_sync_status === s.routing_reason ||
      String(body.ghl_sync_status || "").includes("ignored"));
  record("C1-saludo", ok, JSON.stringify({ hard, policy_blocked: body.ghl_policy_blocked, sync: body.ghl_sync_status, s }));
}
await sleep(DELAY_MS);

// Case 2 — Post-escalación gracias/bye
{
  await post(POST_ESC_FROM, "Quiero hablar con un asesor");
  await sleep(DELAY_MS);
  const gracias = await post(POST_ESC_FROM, "Gracias");
  await sleep(DELAY_MS);
  const bye = await post(POST_ESC_FROM, "Bye");
  const g = gracias.body;
  const b = bye.body;
  const gs = g.ghl_relevance_shadow || {};
  const bs = b.ghl_relevance_shadow || {};
  const hard = [...hardFail(g), ...hardFail(b)];
  const ok =
    hard.length === 0 &&
    gs.would_sync_to_ghl === false &&
    bs.would_sync_to_ghl === false &&
    gs.would_create_task !== true &&
    bs.would_create_task !== true &&
    (g.ghl_policy_blocked === true || g.ghl_sync_status !== "dry_run") &&
    g.intent !== "carreras_disponibles";
  record("C2-post-escalacion", ok, JSON.stringify({ gracias: { intent: g.intent, sync: g.ghl_sync_status, task: gs.would_create_task }, bye: { sync: b.ghl_sync_status } }));
}
await sleep(DELAY_MS);

// Case 3 — Costo
{
  const from = C3_FROM;
  const { body } = await post(from, "Cuánto cuesta Derecho en línea?");
  const s = body.ghl_relevance_shadow || {};
  const hard = hardFail(body);
  const ok =
    hard.length === 0 &&
    s.would_sync_to_ghl === true &&
    s.would_create_task === true &&
    s.routing_reason === "cost_signal_requires_human_validation" &&
    s.human_handoff_reason === "cost_or_tuition_requires_validation" &&
    body.ghl_dry_run === true;
  record("C3-costo", ok, JSON.stringify({ hard, s, dry_run: body.ghl_dry_run, task: body.ghl_would_create_task }));
}
await sleep(DELAY_MS);

// Case 4 — Asesor humano
{
  const from = C4_FROM;
  const { body } = await post(from, "Quiero hablar con asesor");
  const s = body.ghl_relevance_shadow || {};
  const hard = hardFail(body);
  const ok =
    hard.length === 0 &&
    (s.routing_reason === "human_handoff" || s.routing_reason === "explicit_human_handoff") &&
    (s.would_create_task === true || body.ghl_would_create_task === true) &&
    body.ghl_live === false;
  record("C4-asesor", ok, JSON.stringify({ hard, routing: s.routing_reason, task: s.would_create_task }));
}
await sleep(DELAY_MS);

// Case 5 — Meta Ads first saludo
{
  const { body } = await post(META_FROM, "Hola", {
    source: "meta_ads",
    first_message: true,
  });
  const s = body.ghl_relevance_shadow || {};
  const hard = hardFail(body);
  const ok =
    hard.length === 0 &&
    s.ignored_for_ghl === true &&
    s.would_sync_to_ghl === false &&
    s.routing_reason === "meta_ads_first_message_no_sync" &&
    body.ghl_policy_blocked === true;
  record("C5-meta-first-saludo", ok, JSON.stringify({ hard, s, policy_blocked: body.ghl_policy_blocked }));
}
await sleep(DELAY_MS);

// Case 6 — Carrera válida
{
  const from = ALLOWED;
  const { body } = await post(from, "Me interesa Derecho en línea");
  const s = body.ghl_relevance_shadow || {};
  const hard = hardFail(body);
  const ok =
    hard.length === 0 &&
    s.would_sync_to_ghl === true &&
    body.ghl_dry_run === true &&
    body.ghl_policy_blocked !== true &&
    s.would_create_task !== true;
  record("C6-carrera", ok, JSON.stringify({ hard, sync: body.ghl_sync_status, dry_run: body.ghl_dry_run, routing: s.routing_reason }));
}
await sleep(DELAY_MS);

// Case 7 — Off-topic
{
  const { body } = await post(OFFTOPIC_FROM, "me gusta el fútbol");
  const s = body.ghl_relevance_shadow || {};
  const hard = hardFail(body);
  const ok =
    hard.length === 0 &&
    s.would_sync_to_ghl === false &&
    s.would_create_task !== true &&
    (body.ghl_policy_blocked === true || body.ghl_sync_status !== "dry_run");
  record("C7-off-topic", ok, JSON.stringify({ hard, sync: body.ghl_sync_status, routing: s.routing_reason }));
}

console.log(`\n7G.7C.2 remote: ${pass}/${pass + fail} PASS`);
if (fail > 0) process.exitCode = 1;

export { results };
