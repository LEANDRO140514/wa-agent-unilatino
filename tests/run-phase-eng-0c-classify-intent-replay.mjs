#!/usr/bin/env node
/**
 * ENG-0C — Replay classifyIntent + academic_state + idempotencia (InsForge remoto, mock/dry_run).
 *
 * Usage: node tests/run-phase-eng-0c-classify-intent-replay.mjs
 * Output: tests/.phase-eng-0c-replay-results.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(ROOT, "tests/payloads/phase-eng-0c-classify-intent-replay.json");
const OUT_JSON = path.join(ROOT, "tests/.phase-eng-0c-replay-results.json");
const HANDLER_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");
const MOCK_DB_PATH = path.join(ROOT, "insforge/functions/lib/test/mock-insforge-client.js");

const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
const LOCAL = process.env.PHASE_ENG0C_LOCAL === "1" || process.env.PHASE_ENG0C_LOCAL === "true";
const ENDPOINT = process.env.PHASE_ENG0C_ENDPOINT || fixture.endpoint;
const RUN_NUM = String(process.env.PHASE_ENG0C_RUN_ID || Date.now()).replace(/\D/g, "").slice(-8).padStart(8, "0");

let localHandler = null;
let resetMockInsforgeStore = null;

async function initLocalHandler() {
  if (localHandler) return;
  for (const [key, value] of Object.entries({
    WA_E2E_MOCK_DB: "true",
    WA_AGENT_MODE: "mock",
    GHL_SYNC_MODE: "dry_run",
    GHL_WRITE_CUSTOM_FIELDS: "false",
    ACADEMIC_ENGINE_ENABLED: "true",
    EVA_LLM_ENABLED: "false",
    INSFORGE_BASE_URL: "http://mock-insforge.local",
    ANON_KEY: "mock-anon-key",
  })) {
    process.env[key] = value;
  }
  if (!globalThis.Deno) {
    globalThis.Deno = { env: { get: (key) => process.env[key] } };
  }
  ({ resetMockInsforgeStore } = await import(pathToFileURL(MOCK_DB_PATH).href));
  localHandler = (await import(pathToFileURL(HANDLER_PATH).href)).default;
  resetMockInsforgeStore();
}

function phoneFromSuffix(suffix) {
  const s = String(suffix).replace(/\D/g, "").padStart(4, "0").slice(-4);
  return `+5255${RUN_NUM.slice(0, 4)}${s}`;
}

function freshMultiTurnPhone() {
  return `+5255${RUN_NUM.slice(0, 4)}8000`;
}

function freshIdempotencyPhone() {
  return `+5255${RUN_NUM.slice(0, 4)}8001`;
}

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

function includesAny(haystack, needles) {
  const h = normalizeForMatch(haystack);
  return needles.some((n) => h.includes(normalizeForMatch(n)));
}

function excludesAll(haystack, needles) {
  const h = normalizeForMatch(haystack);
  return needles.every((n) => !h.includes(normalizeForMatch(n)));
}

function summarize(text, max = 100) {
  const one = String(text || "").replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max)}…` : one;
}

function buildPayload({ phone, messageText, messageId }) {
  const payload = {
    event_type: "whatsapp.inbound_message.received",
    from: phone,
    to: "+529994538421",
    message_type: "text",
    message_text: messageText,
    timestamp: new Date().toISOString(),
  };
  if (messageId) payload.message_id = messageId;
  else payload.message_id = `eng0c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return payload;
}

async function post(payload) {
  if (LOCAL) {
    await initLocalHandler();
    const request = new Request("http://localhost/ycloud-wa-inbound", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const response = await localHandler(request);
    const body = await response.json();
    return { status: response.status, body };
  }
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

function checkSafeFlags(body, failures) {
  const req = fixture.required_runtime_flags;
  if (body.mode !== req.mode) failures.push(`mode=${body.mode}`);
  if (body.outbound_real !== req.outbound_real) failures.push(`outbound_real=${body.outbound_real}`);
  if (body.ghl_live !== req.ghl_live) failures.push(`ghl_live=${body.ghl_live}`);
  if (body.custom_fields_written !== req.custom_fields_written) {
    failures.push(`custom_fields_written=${body.custom_fields_written}`);
  }
  if (body.academic_engine_enabled !== req.academic_engine_enabled) {
    failures.push(`academic_engine_enabled=${body.academic_engine_enabled}`);
  }
  if (body.eva_llm_enabled !== req.eva_llm_enabled) failures.push(`eva_llm_enabled=${body.eva_llm_enabled}`);
}

function evaluateCase(tc, body, status) {
  const failures = [];
  if (status !== 200 || body.ok !== true) failures.push(`HTTP ${status} ok=${body.ok}`);
  checkSafeFlags(body, failures);

  if (tc.expect_wa_intent && body.intent !== tc.expect_wa_intent) {
    failures.push(`wa_intent expected ${tc.expect_wa_intent}, got ${body.intent}`);
  }
  if (tc.expect_wa_intents && !tc.expect_wa_intents.includes(body.intent)) {
    failures.push(`wa_intent expected one of [${tc.expect_wa_intents.join(", ")}], got ${body.intent}`);
  }
  if (tc.expect_academic_intent && body.academic_intent !== tc.expect_academic_intent) {
    failures.push(`academic_intent expected ${tc.expect_academic_intent}, got ${body.academic_intent}`);
  }
  if (tc.expect_academic_enriched !== undefined && body.academic_enriched !== tc.expect_academic_enriched) {
    failures.push(`academic_enriched expected ${tc.expect_academic_enriched}, got ${body.academic_enriched}`);
  }
  if (tc.expect_academic_skipped !== undefined && body.academic_skipped !== tc.expect_academic_skipped) {
    failures.push(`academic_skipped expected ${tc.expect_academic_skipped}, got ${body.academic_skipped}`);
  }
  if (tc.response_must_include && !includesAll(body.response_text, tc.response_must_include)) {
    failures.push(`missing: ${tc.response_must_include.join(", ")}`);
  }
  if (tc.response_must_include_any && !includesAny(body.response_text, tc.response_must_include_any)) {
    failures.push(`missing any: ${tc.response_must_include_any.join("|")}`);
  }
  if (tc.response_must_not_include && !excludesAll(body.response_text, tc.response_must_not_include)) {
    failures.push(`forbidden: ${tc.response_must_not_include.join(", ")}`);
  }
  if (tc.no_menu && fixture.menu_markers?.some((m) => body.response_text?.includes(m))) {
    failures.push("menu_repeated");
  }
  if (tc.allow_menu && body.intent === "ambiguo" && !body.response_text?.includes("1. Carreras disponibles")) {
    failures.push("menu_not_shown");
  }
  if (fixture.ghost_careers?.length && body.academic_enriched) {
    const ghosts = fixture.ghost_careers.filter((g) => !excludesAll(body.response_text, [g]));
    if (ghosts.length) failures.push(`ghost careers: ${ghosts.join(", ")}`);
  }

  return failures;
}

async function preflight() {
  const { status, body } = await post(
    buildPayload({ phone: phoneFromSuffix("9999"), messageText: "1", messageId: `eng0c-preflight-${Date.now()}` }),
  );
  const failures = evaluateCase(
    { expect_wa_intent: "carreras_disponibles", expect_academic_enriched: true },
    body,
    status,
  );
  return { pass: failures.length === 0, failures, body };
}

async function runFlatCases(groupKey, group) {
  const results = [];
  for (const tc of group.cases) {
    const phone = phoneFromSuffix(tc.phone_suffix);
    const { status, body } = await post(
      buildPayload({ phone, messageText: tc.input, messageId: `eng0c-${tc.id}-${Date.now()}` }),
    );
    const failures = evaluateCase(tc, body, status);
    const pass = failures.length === 0;
    results.push({
      group: groupKey,
      id: tc.id,
      input: tc.input,
      phone,
      pass,
      failures,
      wa_intent_expected: tc.expect_wa_intent || tc.expect_wa_intents,
      wa_intent_observed: body.intent,
      academic_intent_expected: tc.expect_academic_intent || null,
      academic_intent_observed: body.academic_intent || null,
      academic_enriched: body.academic_enriched,
      response_summary: summarize(body.response_text),
    });
    console.log(`${pass ? "PASS" : "FAIL"} [${groupKey}] ${tc.id} "${tc.input}" → ${body.intent}`);
    if (!pass) failures.forEach((f) => console.log(`  - ${f}`));
  }
  return results;
}

async function runMultiTurn(group) {
  const phone = freshMultiTurnPhone();
  const results = [];
  for (const turn of group.turns) {
    const { status, body } = await post(
      buildPayload({
        phone,
        messageText: turn.input,
        messageId: `eng0c-${turn.id}-${Date.now()}`,
      }),
    );
    const failures = evaluateCase(turn, body, status);
    const pass = failures.length === 0;
    results.push({
      group: "D",
      id: turn.id,
      input: turn.input,
      phone,
      pass,
      failures,
      wa_intent_observed: body.intent,
      academic_intent_observed: body.academic_intent,
      academic_enriched: body.academic_enriched,
      response_summary: summarize(body.response_text),
    });
    console.log(`${pass ? "PASS" : "FAIL"} [D] ${turn.id} "${turn.input}" → ${body.intent}`);
    if (!pass) failures.forEach((f) => console.log(`  - ${f}`));
  }
  const allPass = results.every((r) => r.pass);
  return { results, allPass, phone };
}

async function runIdempotency(group) {
  const phone = freshIdempotencyPhone();
  const messageId = `${group.message_id}-${RUN_NUM}`;
  const payload = buildPayload({
    phone,
    messageText: group.input,
    messageId,
  });
  const first = await post(payload);
  const replay = await post(payload);

  const failures = [];
  if (first.status !== 200 || first.body.ok !== true) failures.push("first HTTP/body failed");
  checkSafeFlags(first.body, failures);
  if (first.body.skipped) failures.push("first event should not be skipped");
  if (group.expect_wa_intent_first && first.body.intent !== group.expect_wa_intent_first) {
    failures.push(`first intent=${first.body.intent}`);
  }

  if (replay.status !== 200 || replay.body.ok !== true) failures.push("replay HTTP/body failed");
  if (replay.body.skipped !== group.expect_replay_skipped) {
    failures.push(`replay skipped=${replay.body.skipped}`);
  }
  if (replay.body.idempotent !== group.expect_replay_idempotent) {
    failures.push(`replay idempotent=${replay.body.idempotent}`);
  }
  if (group.expect_replay_reason && replay.body.reason !== group.expect_replay_reason) {
    failures.push(`replay reason=${replay.body.reason}`);
  }
  if (replay.body.inbound_id && first.body.inbound_id && replay.body.inbound_id !== first.body.inbound_id) {
    failures.push("replay inbound_id mismatch");
  }

  const pass = failures.length === 0;
  console.log(`${pass ? "PASS" : "FAIL"} [E] idempotency ${messageId} first=${first.body.intent} replay skipped=${replay.body.skipped}`);
  if (!pass) failures.forEach((f) => console.log(`  - ${f}`));

  return {
    group: "E",
    id: "E-idem",
    phone,
    message_id: messageId,
    pass,
    failures,
    first: {
      intent: first.body.intent,
      inbound_id: first.body.inbound_id,
      skipped: first.body.skipped,
    },
    replay: {
      skipped: replay.body.skipped,
      idempotent: replay.body.idempotent,
      reason: replay.body.reason,
      inbound_id: replay.body.inbound_id,
    },
  };
}

async function main() {
  console.log(
    `ENG-0C classifyIntent replay → ${LOCAL ? "local mock handler" : ENDPOINT}`,
  );
  console.log(`Run NUM: ${RUN_NUM}\n`);

  const pf = await preflight();
  if (!pf.pass) {
    console.error("ABORT: preflight failed — runtime not in safe mock/dry_run mode");
    pf.failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
  console.log("Preflight OK (mock/dry_run flags confirmed)\n");

  const allResults = [];
  let totalPass = 0;
  let totalFail = 0;

  for (const key of ["A", "B", "C"]) {
    const group = fixture.groups[key];
    console.log(`--- Group ${key}: ${group.name} ---`);
    const groupResults = await runFlatCases(key, group);
    allResults.push(...groupResults);
    for (const r of groupResults) {
      if (r.pass) totalPass++;
      else totalFail++;
    }
    console.log("");
  }

  console.log(`--- Group D: ${fixture.groups.D.name} ---`);
  const multi = await runMultiTurn(fixture.groups.D);
  allResults.push(...multi.results);
  for (const r of multi.results) {
    if (r.pass) totalPass++;
    else totalFail++;
  }
  console.log("");

  console.log(`--- Group E: ${fixture.groups.E.name} ---`);
  const idem = await runIdempotency(fixture.groups.E);
  allResults.push(idem);
  if (idem.pass) totalPass++;
  else totalFail++;

  const summary = {
    phase: "ENG-0C",
    run_num: RUN_NUM,
    mode: LOCAL ? "local_mock" : "remote",
    endpoint: LOCAL ? "local mock handler" : ENDPOINT,
    preflight: { pass: pf.pass, mode: pf.body.mode, ghl_sync_mode: pf.body.ghl_sync_mode },
    groups: {
      A: allResults.filter((r) => r.group === "A"),
      B: allResults.filter((r) => r.group === "B"),
      C: allResults.filter((r) => r.group === "C"),
      D: allResults.filter((r) => r.group === "D"),
      E: [idem],
    },
    total_cases: totalPass + totalFail,
    pass: totalPass,
    fail: totalFail,
    multi_turn_pass: multi.allPass,
    multi_turn_phone: multi.phone,
    idempotency_pass: idem.pass,
    results: allResults,
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2));
  console.log(`\nENG-0C replay: ${totalPass}/${totalPass + totalFail} PASS`);
  console.log(`Multi-turn academic_state: ${multi.allPass ? "PASS" : "FAIL"}`);
  console.log(`Idempotency + classifyIntent: ${idem.pass ? "PASS" : "FAIL"}`);
  console.log(`Results: ${OUT_JSON}`);

  if (totalFail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
