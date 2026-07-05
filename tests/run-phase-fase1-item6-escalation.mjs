#!/usr/bin/env node
/**
 * Fase 1 — Item 6: EscalationPayload §13 + dedupe (FF_ESCALATION_V2).
 *
 * Usage: node tests/run-phase-fase1-item6-escalation.mjs
 */

import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const HANDLER_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");
const ESCALATION_PATH = path.join(ROOT, "insforge/functions/lib/escalation-payload.js");
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
  FF_FSM: "true",
  FF_NOT_OFFERED: "true",
  FF_FALLBACKS: "true",
  FF_ESCALATION_V2: "true",
};

for (const [key, value] of Object.entries(BASE_ENV)) {
  process.env[key] = value;
}

if (!globalThis.Deno) {
  globalThis.Deno = { env: { get: (key) => process.env[key] } };
}

const escalation = await import(pathToFileURL(ESCALATION_PATH).href);
const { resetMockInsforgeStore, getMockInsforgeStore, seedMockContact } = await import(
  pathToFileURL(MOCK_DB_PATH).href,
);
const handler = (await import(pathToFileURL(HANDLER_PATH).href)).default;

const RUN = Date.now().toString(36);
let msgSeq = 0;

function nextMessageId(label) {
  msgSeq += 1;
  return `fase1-item6-${RUN}-${label}-${msgSeq}`;
}

async function invoke(messageText, phone, messageId = nextMessageId("msg")) {
  const request = new Request("http://localhost/ycloud-wa-inbound", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_type: "whatsapp.inbound_message.received",
      from: phone,
      to: "+529994538421",
      message_type: "text",
      message_text: messageText,
      message_id: messageId,
      timestamp: new Date().toISOString(),
    }),
  });
  const response = await handler(request);
  return { status: response.status, body: await response.json() };
}

function ghlLogs(store, phone) {
  return store.wa_ghl_sync_log.filter((r) => r.normalized_phone === phone);
}

function taskLogs(store, phone) {
  return ghlLogs(store, phone).filter(
    (r) => r.would_create_task === true || r.payload?.task != null,
  );
}

function lastLog(store, phone) {
  const rows = ghlLogs(store, phone);
  return rows[rows.length - 1] || null;
}

function payloadReason(log) {
  return log?.payload?.escalation_reason || null;
}

function payloadTaskTitle(log) {
  return log?.payload?.task?.title || log?.payload?.task_title || null;
}

const results = [];
let failures = 0;

function record(id, ok, detail = "") {
  results.push({ id, ok, detail });
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${id}${detail ? ` — ${detail}` : ""}`);
}

try {
  // Merida timezone helpers
  record(
    "E0_merida_day_boundary",
    escalation.getLocalDayKey("2026-07-05T05:59:59.000Z") === "2026-07-04" &&
      escalation.getLocalDayKey("2026-07-05T06:00:00.000Z") === "2026-07-05" &&
      escalation.getLocalDayStartIso("2026-07-05T12:00:00.000Z") === "2026-07-05T06:00:00.000Z",
    `tz=${escalation.ESCALATION_TIMEZONE}`,
  );

  // 1. human_requested
  const phone1 = "+525551290001";
  resetMockInsforgeStore();
  await invoke("quiero hablar con un asesor", phone1);
  const log1 = lastLog(getMockInsforgeStore(), phone1);
  record(
    "E1_human_requested",
    payloadReason(log1) === "human_requested" &&
      String(payloadTaskTitle(log1)).includes("pidió asesor") &&
      (log1?.payload?.tags || []).includes("wa_needs_human"),
    payloadReason(log1),
  );

  // 2. ready_to_enroll high priority
  const phone2 = "+525551290002";
  resetMockInsforgeStore();
  await invoke("quiero inscribirme", phone2);
  const log2 = lastLog(getMockInsforgeStore(), phone2);
  record(
    "E2_ready_to_enroll",
    payloadReason(log2) === "ready_to_enroll" &&
      String(payloadTaskTitle(log2)).includes("listo para inscribirse") &&
      log2?.payload?.task?.priority === "high",
    `${payloadReason(log2)} / ${log2?.payload?.task?.priority}`,
  );

  // 3. low_confidence fallback L3
  const phone3 = "+525551290003";
  resetMockInsforgeStore();
  await invoke("info", phone3);
  await invoke("?", phone3);
  await invoke("no entiendo", phone3);
  const log3 = lastLog(getMockInsforgeStore(), phone3);
  record(
    "E3_low_confidence",
    payloadReason(log3) === "low_confidence" &&
      (log3?.payload?.tags || []).includes("wa_low_confidence"),
    payloadReason(log3),
  );

  // 4. career_not_offered_help insistence
  const phone4 = "+525551290004";
  resetMockInsforgeStore();
  await invoke("quiero medicina", phone4);
  await invoke("quiero medicina", phone4);
  const log4 = lastLog(getMockInsforgeStore(), phone4);
  record(
    "E4_career_not_offered_help",
    payloadReason(log4) === "career_not_offered_help" &&
      (log4?.payload?.tags || []).includes("wa_needs_human_career_not_offered"),
    payloadReason(log4),
  );

  // 5. revalidation_case
  const phone5 = "+525551290005";
  resetMockInsforgeStore();
  await invoke("tengo materias para revalidar de otra universidad", phone5);
  const log5 = lastLog(getMockInsforgeStore(), phone5);
  record(
    "E5_revalidation_case",
    payloadReason(log5) === "revalidation_case" &&
      (log5?.payload?.tags || []).includes("wa_revalidation"),
    payloadReason(log5),
  );

  // 6. scholarship_special (beca)
  const phone6 = "+525551290006";
  resetMockInsforgeStore();
  await invoke("quiero beca", phone6);
  const log6 = lastLog(getMockInsforgeStore(), phone6);
  record(
    "E6_scholarship_special",
    payloadReason(log6) === "scholarship_special" &&
      (log6?.payload?.tags || []).includes("wa_scholarship_special"),
    payloadReason(log6),
  );

  // 7. task dedupe same day (phone, reason, día Merida)
  const phone7 = "+525551290007";
  resetMockInsforgeStore();
  await invoke("quiero hablar con un asesor", phone7);
  const tasksAfterFirst = taskLogs(getMockInsforgeStore(), phone7).length;
  await invoke("necesito hablar con una persona", phone7);
  const log7b = lastLog(getMockInsforgeStore(), phone7);
  const tasksAfterSecond = taskLogs(getMockInsforgeStore(), phone7).length;
  record(
    "E7_task_dedupe_same_day",
    tasksAfterFirst === 1 &&
      log7b?.would_create_task === false &&
      tasksAfterSecond === 1,
    `tasks ${tasksAfterFirst}→${tasksAfterSecond} would_create_task=${log7b?.would_create_task}`,
  );

  // 8. FSM HUMANO abierto — sin nueva task
  const phone8 = "+525551290008";
  resetMockInsforgeStore();
  seedMockContact({
    normalized_phone: phone8,
    fsm_state: "HUMANO",
    closed_by_agent: false,
    wa_stage: "asesor_requerido",
    wa_needs_human: true,
  });
  const tasksBefore8 = taskLogs(getMockInsforgeStore(), phone8).length;
  await invoke("gracias", phone8);
  const log8 = lastLog(getMockInsforgeStore(), phone8);
  record(
    "E8_fsm_humano_no_task",
    (log8?.would_create_task === false || log8 == null) &&
      taskLogs(getMockInsforgeStore(), phone8).length === tasksBefore8,
    `would_create_task=${log8?.would_create_task}`,
  );

  // 9. FF_ESCALATION_V2=false — legacy task title
  const phone9 = "+525551290009";
  resetMockInsforgeStore();
  process.env.FF_ESCALATION_V2 = "false";
  await invoke("quiero hablar con un asesor", phone9);
  process.env.FF_ESCALATION_V2 = "true";
  const log9 = lastLog(getMockInsforgeStore(), phone9);
  record(
    "E9_legacy_ff_off",
    payloadReason(log9) == null &&
      String(payloadTaskTitle(log9)).includes("Solicita asesor"),
    payloadTaskTitle(log9),
  );
} catch (err) {
  console.error("FATAL", err);
  failures += 1;
}

const total = results.length;
const passed = results.filter((r) => r.ok).length;
console.log(`\n--- Item 6 escalation: ${passed}/${total} PASS, ${failures} FAIL ---`);
process.exit(failures > 0 ? 1 : 0);
