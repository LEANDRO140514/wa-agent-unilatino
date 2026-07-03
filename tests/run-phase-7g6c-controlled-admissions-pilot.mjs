#!/usr/bin/env node
/**
 * 7G.6C — Piloto humano admisiones controlado (runtime remoto mock/dry_run).
 *
 * Usage: node tests/run-phase-7g6c-controlled-admissions-pilot.mjs
 * Output: tests/.phase-7g6c-controlled-admissions-pilot-results.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(ROOT, "tests/payloads/phase-7g6c-controlled-admissions-pilot.json");
const OUT_JSON = path.join(ROOT, "tests/.phase-7g6c-controlled-admissions-pilot-results.json");

const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
const ENDPOINT = process.env.PHASE_7G6C_ENDPOINT || fixture.endpoint;
const RUN_NUM = String(process.env.PHASE_7G6C_RUN_ID || Date.now()).replace(/\D/g, "").slice(-8).padStart(8, "0");

function phoneFromSuffix(suffix) {
  const s = String(suffix).replace(/\D/g, "").padStart(4, "0").slice(-4);
  return `+5255${RUN_NUM.slice(0, 4)}${s}`;
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
  payload.message_id = messageId || `7g6c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return payload;
}

async function post(payload) {
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
  if (body.ghl_sync_mode !== req.ghl_sync_mode) failures.push(`ghl_sync_mode=${body.ghl_sync_mode}`);
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

function evaluateTurn(turn, body, status) {
  const failures = [];
  if (status !== 200 || body.ok !== true) failures.push(`HTTP ${status} ok=${body.ok}`);
  checkSafeFlags(body, failures);

  if (turn.expect_wa_intent && body.intent !== turn.expect_wa_intent) {
    failures.push(`wa_intent expected ${turn.expect_wa_intent}, got ${body.intent}`);
  }
  if (turn.expect_wa_intents && !turn.expect_wa_intents.includes(body.intent)) {
    failures.push(`wa_intent expected one of [${turn.expect_wa_intents.join(", ")}], got ${body.intent}`);
  }
  if (turn.expect_academic_intent && body.academic_intent !== turn.expect_academic_intent) {
    failures.push(`academic_intent expected ${turn.expect_academic_intent}, got ${body.academic_intent}`);
  }
  if (turn.expect_academic_enriched !== undefined && body.academic_enriched !== turn.expect_academic_enriched) {
    failures.push(`academic_enriched expected ${turn.expect_academic_enriched}, got ${body.academic_enriched}`);
  }
  if (turn.expect_academic_skipped !== undefined && body.academic_skipped !== turn.expect_academic_skipped) {
    failures.push(`academic_skipped expected ${turn.expect_academic_skipped}, got ${body.academic_skipped}`);
  }
  if (turn.expect_wa_needs_human !== undefined && body.wa_needs_human !== turn.expect_wa_needs_human) {
    failures.push(`wa_needs_human expected ${turn.expect_wa_needs_human}, got ${body.wa_needs_human}`);
  }
  if (turn.expect_ghl_would_create_task === true) {
    const wouldTask =
      body.ghl_would_create_task === true ||
      body.ghl_relevance_shadow?.would_create_task === true;
    if (!wouldTask) failures.push("ghl_would_create_task expected true");
  }
  if (turn.expect_ghl_sync_dry_run === true && body.ghl_sync_mode !== "dry_run") {
    failures.push(`ghl_sync_mode expected dry_run, got ${body.ghl_sync_mode}`);
  }
  if (turn.response_must_include && !includesAll(body.response_text, turn.response_must_include)) {
    failures.push(`missing: ${turn.response_must_include.join(", ")}`);
  }
  if (turn.response_must_include_any && !includesAny(body.response_text, turn.response_must_include_any)) {
    failures.push(`missing any: ${turn.response_must_include_any.join("|")}`);
  }
  if (turn.response_must_not_include && !excludesAll(body.response_text, turn.response_must_not_include)) {
    failures.push(`forbidden: ${turn.response_must_not_include.join(", ")}`);
  }
  if (turn.allow_menu && body.intent === "ambiguo" && !body.response_text?.includes("1. Carreras disponibles")) {
    failures.push("menu_not_shown");
  }
  if (fixture.ghost_careers?.length && body.academic_enriched) {
    const ghosts = fixture.ghost_careers.filter((g) => !excludesAll(body.response_text, [g]));
    if (ghosts.length) failures.push(`ghost careers: ${ghosts.join(", ")}`);
  }
  if (fixture.banned_claims?.length) {
    const banned = fixture.banned_claims.filter((b) => !excludesAll(body.response_text, [b]));
    if (banned.length) failures.push(`banned claims: ${banned.join(", ")}`);
  }

  return failures;
}

async function preflight() {
  const phone = phoneFromSuffix("9999");
  const { status, body } = await post(buildPayload({ phone, messageText: "1", messageId: `7g6c-preflight-${RUN_NUM}` }));
  const failures = evaluateTurn(
    { expect_wa_intent: "carreras_disponibles", expect_academic_enriched: true },
    body,
    status,
  );
  return { pass: failures.length === 0, failures, body };
}

async function runConversation(conv) {
  const phone = phoneFromSuffix(conv.phone_suffix);
  const turnResults = [];

  if (conv.idempotency) {
    const idem = conv.idempotency;
    const messageId = `${idem.message_id}-${RUN_NUM}`;
    const payload = buildPayload({ phone, messageText: idem.input, messageId });
    const first = await post(payload);
    const replay = await post(payload);
    const failures = [];
    if (first.status !== 200 || first.body.ok !== true) failures.push("first HTTP/body failed");
    checkSafeFlags(first.body, failures);
    if (first.body.skipped) failures.push("first should not be skipped");
    if (idem.expect_wa_intent_first && first.body.intent !== idem.expect_wa_intent_first) {
      failures.push(`first intent=${first.body.intent}`);
    }
    if (replay.body.skipped !== idem.expect_replay_skipped) failures.push(`replay skipped=${replay.body.skipped}`);
    if (replay.body.idempotent !== idem.expect_replay_idempotent) {
      failures.push(`replay idempotent=${replay.body.idempotent}`);
    }
    if (idem.expect_replay_reason && replay.body.reason !== idem.expect_replay_reason) {
      failures.push(`replay reason=${replay.body.reason}`);
    }
    const pass = failures.length === 0;
    turnResults.push({
      turn: "idempotency",
      input: idem.input,
      pass,
      failures,
      first: { intent: first.body.intent, inbound_id: first.body.inbound_id },
      replay: { skipped: replay.body.skipped, idempotent: replay.body.idempotent, reason: replay.body.reason },
    });
    return { id: conv.id, name: conv.name, phone, pass, turnResults };
  }

  for (let i = 0; i < conv.turns.length; i++) {
    const turn = conv.turns[i];
    const { status, body } = await post(
      buildPayload({
        phone,
        messageText: turn.input,
        messageId: `7g6c-c${conv.id}-t${i + 1}-${RUN_NUM}`,
      }),
    );
    const failures = evaluateTurn(turn, body, status);
    turnResults.push({
      turn: i + 1,
      input: turn.input,
      pass: failures.length === 0,
      failures,
      wa_intent: body.intent,
      academic_intent: body.academic_intent,
      academic_enriched: body.academic_enriched,
      wa_needs_human: body.wa_needs_human,
      ghl_would_create_task: body.ghl_would_create_task,
      ghl_sync_mode: body.ghl_sync_mode,
      response_summary: summarize(body.response_text),
    });
  }

  const pass = turnResults.every((t) => t.pass);
  return { id: conv.id, name: conv.name, phone, pass, turnResults };
}

async function main() {
  console.log(`7G.6C controlled admissions pilot (safe) → ${ENDPOINT}`);
  console.log(`Run NUM: ${RUN_NUM}\n`);

  const pf = await preflight();
  if (!pf.pass) {
    console.error("ABORT: preflight failed — runtime not in safe mock/dry_run mode");
    pf.failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
  console.log("Preflight OK (mock/dry_run flags confirmed)\n");

  const results = [];
  let passCount = 0;
  let failCount = 0;

  for (const conv of fixture.conversations) {
    const r = await runConversation(conv);
    results.push(r);
    if (r.pass) passCount++;
    else failCount++;
    console.log(`${r.pass ? "PASS" : "FAIL"} Conv ${r.id}: ${r.name}`);
    for (const t of r.turnResults) {
      const label = t.turn === "idempotency" ? "idem" : `T${t.turn}`;
      console.log(`  ${t.pass ? "  ok" : " FAIL"} ${label} "${t.input || conv.idempotency?.input}"`);
      if (!t.pass) t.failures.forEach((f) => console.log(`       - ${f}`));
    }
  }

  const summary = {
    phase: "7G.6C",
    run_num: RUN_NUM,
    endpoint: ENDPOINT,
    preflight: {
      pass: pf.pass,
      mode: pf.body.mode,
      ghl_sync_mode: pf.body.ghl_sync_mode,
      outbound_real: pf.body.outbound_real,
      ghl_live: pf.body.ghl_live,
    },
    conversations_pass: passCount,
    conversations_fail: failCount,
    conversations_total: fixture.conversations.length,
    pass: failCount === 0,
    results,
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2));
  console.log(`\n7G.6C: ${passCount}/${fixture.conversations.length} conversations PASS`);
  console.log(`Results: ${OUT_JSON}`);

  if (failCount > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
