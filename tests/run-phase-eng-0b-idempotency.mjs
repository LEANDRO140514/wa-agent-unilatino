#!/usr/bin/env node
/**
 * ENG-0B — Webhook idempotency by ycloud_message_id (mock DB + optional live).
 *
 * Usage:
 *   node tests/run-phase-eng-0b-idempotency.mjs
 *   PHASE_ENG0B_LIVE=1 node tests/run-phase-eng-0b-idempotency.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(ROOT, "tests/payloads/phase-eng-0b-idempotency.json");
const HANDLER_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");
const MOCK_DB_PATH = path.join(ROOT, "insforge/functions/lib/test/mock-insforge-client.js");

const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
const LIVE = process.env.PHASE_ENG0B_LIVE === "1" || process.env.PHASE_ENG0B_LIVE === "true";

for (const [key, value] of Object.entries(fixture.env || {})) {
  if (!LIVE) process.env[key] = value;
}

if (!globalThis.Deno) {
  globalThis.Deno = { env: { get: (key) => process.env[key] } };
}

const { resetMockInsforgeStore, getMockInsforgeStore } = await import(
  pathToFileURL(MOCK_DB_PATH).href,
);

const handler = (await import(pathToFileURL(HANDLER_PATH).href)).default;

function countRows(store, table, filterFn) {
  return store[table].filter(filterFn).length;
}

function buildPayload(testPhone, messageId, messageText) {
  const payload = {
    event_type: "whatsapp.inbound_message.received",
    from: testPhone,
    to: "+529994538421",
    message_type: "text",
    message_text: messageText,
    timestamp: new Date().toISOString(),
  };
  if (messageId) payload.message_id = messageId;
  return payload;
}

async function invokeHandler(payload) {
  const endpoint = LIVE
    ? process.env.PHASE_ENG0B_ENDPOINT || fixture.endpoint
    : "http://localhost/ycloud-wa-inbound";
  const request = new Request(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const response = await handler(request);
  const body = await response.json();
  return { status: response.status, body };
}

async function runMockCases() {
  resetMockInsforgeStore();
  const testPhone = fixture.test_phone;
  const results = [];
  let failures = 0;

  for (const tc of fixture.cases) {
    const storeBefore = getMockInsforgeStore();
    const inboundBefore = countRows(
      storeBefore,
      "wa_inbound_messages",
      (r) => r.normalized_phone === testPhone,
    );
    const outboundBefore = countRows(
      storeBefore,
      "wa_outbound_messages",
      (r) => r.to_phone === testPhone,
    );
    const ghlBefore = storeBefore.wa_ghl_sync_log.length;

    const payload = buildPayload(testPhone, tc.message_id, tc.input);
    const { status, body } = await invokeHandler(payload);
    const storeAfter = getMockInsforgeStore();

    const inboundAfter = countRows(
      storeAfter,
      "wa_inbound_messages",
      (r) => r.normalized_phone === testPhone,
    );
    const outboundAfter = countRows(
      storeAfter,
      "wa_outbound_messages",
      (r) => r.to_phone === testPhone,
    );
    const ghlAfter = storeAfter.wa_ghl_sync_log.length;

    const caseFailures = [];
    if (status !== 200) caseFailures.push(`HTTP ${status}`);
    if (body.ok !== tc.expect_ok) caseFailures.push(`ok=${body.ok}`);
    if (Boolean(body.skipped) !== Boolean(tc.expect_skipped)) {
      caseFailures.push(`skipped=${body.skipped}`);
    }
    if (Boolean(body.idempotent) !== Boolean(tc.expect_idempotent)) {
      caseFailures.push(`idempotent=${body.idempotent}`);
    }
    if (tc.expect_reason && body.reason !== tc.expect_reason) {
      caseFailures.push(`reason=${body.reason}`);
    }

    const inboundDelta = inboundAfter - inboundBefore;
    const outboundDelta = outboundAfter - outboundBefore;
    const ghlDelta = ghlAfter - ghlBefore;

    if (inboundDelta !== tc.expect_inbound_delta) {
      caseFailures.push(`inbound_delta=${inboundDelta} (expected ${tc.expect_inbound_delta})`);
    }
    if (outboundDelta !== tc.expect_outbound_delta) {
      caseFailures.push(`outbound_delta=${outboundDelta} (expected ${tc.expect_outbound_delta})`);
    }
    if (ghlDelta !== (tc.expect_ghl_log_delta ?? tc.expect_inbound_delta)) {
      caseFailures.push(
        `ghl_log_delta=${ghlDelta} (expected ${tc.expect_ghl_log_delta ?? tc.expect_inbound_delta})`,
      );
    }

    if (tc.expect_warning_type) {
      const warned = storeAfter.wa_errors.some(
        (e) =>
          e.error_type === "webhook_warning" &&
          String(e.error_message || "").includes(tc.expect_warning_type),
      );
      if (!warned) caseFailures.push(`missing warning ${tc.expect_warning_type}`);
    }

    const pass = caseFailures.length === 0;
    if (!pass) failures += 1;
    results.push({
      id: tc.id,
      name: tc.name,
      pass,
      failures: caseFailures,
      inbound_delta: inboundDelta,
      outbound_delta: outboundDelta,
      ghl_log_delta: ghlDelta,
      body: {
        ok: body.ok,
        skipped: body.skipped,
        idempotent: body.idempotent,
        reason: body.reason,
        inbound_id: body.inbound_id,
      },
    });
  }

  return { failures, results };
}

async function main() {
  console.log(`ENG-0B idempotency tests (${LIVE ? "live endpoint" : "mock DB"})`);

  if (LIVE) {
    console.warn(
      "PHASE_ENG0B_LIVE=1 requires deployed handler with ENG-0B; skipping live until deploy.",
    );
    process.exit(0);
  }

  const { failures, results } = await runMockCases();
  for (const r of results) {
    console.log(
      `${r.pass ? "PASS" : "FAIL"} case ${r.id} (${r.name}) inbound+${r.inbound_delta} outbound+${r.outbound_delta} ghl+${r.ghl_log_delta}`,
    );
    if (!r.pass) {
      for (const f of r.failures) console.log(`  - ${f}`);
    }
  }

  if (failures > 0) {
    console.error(`ENG-0B: ${failures} case(s) FAILED`);
    process.exit(1);
  }

  console.log(`ENG-0B: ${results.length}/${results.length} PASS (mock DB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
