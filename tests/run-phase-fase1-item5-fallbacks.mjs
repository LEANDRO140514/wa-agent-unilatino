#!/usr/bin/env node
/**
 * Fase 1 — Item 5: Fallbacks §12 + memoria (FF_FALLBACKS).
 *
 * Usage: node tests/run-phase-fase1-item5-fallbacks.mjs
 */

import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const HANDLER_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");
const CATALOG_PATH = path.join(ROOT, "insforge/functions/lib/academic-engine/catalog-sot.js");
const FALLBACKS_PATH = path.join(ROOT, "insforge/functions/lib/fallbacks-lite.js");
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
  FF_ESCALATION_V2: "false",
};

for (const [key, value] of Object.entries(BASE_ENV)) {
  process.env[key] = value;
}

if (!globalThis.Deno) {
  globalThis.Deno = { env: { get: (key) => process.env[key] } };
}

const catalog = await import(pathToFileURL(CATALOG_PATH).href);
const fallbacks = await import(pathToFileURL(FALLBACKS_PATH).href);
const { resetMockInsforgeStore, getMockInsforgeStore, seedMockContact } = await import(
  pathToFileURL(MOCK_DB_PATH).href,
);
const handler = (await import(pathToFileURL(HANDLER_PATH).href)).default;

const EVA_FALLBACK_LEGACY =
  "¡Hola de nuevo! 😊 Sigamos por aquí: puedo ayudarte con carreras, becas, ubicación, costos o revalidación.";

const RUN = Date.now().toString(36);
let msgSeq = 0;

function nextMessageId(label) {
  msgSeq += 1;
  return `fase1-item5-${RUN}-${label}-${msgSeq}`;
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

function contactRow(store, phone) {
  return store.wa_contacts_state.find((r) => r.normalized_phone === phone) || null;
}

function academicState(row) {
  return row?.academic_state || {};
}

function fallbackCount(row) {
  if (row?.fallback_count != null) return Number(row.fallback_count) || 0;
  return Number(academicState(row).fallback_count) || 0;
}

function lastGhlLog(store, phone) {
  const rows = store.wa_ghl_sync_log.filter((r) => r.normalized_phone === phone);
  return rows[rows.length - 1] || null;
}

function tagsFromLog(log) {
  return log?.payload?.tags || log?.would_add_tags || [];
}

function priceTokens(careerName, modalityCode = null) {
  const record = catalog.resolveCareerRecord({ careerName, modalityCode });
  if (!record) throw new Error(`Career not found: ${careerName}`);
  return {
    record,
    monthly: record.monthly_price_display || `$${record.monthly_price}`,
    enrollment: record.enrollment_price_display || `$${record.enrollment_price}`,
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
  const phone1 = "+525551280001";
  resetMockInsforgeStore();
  const r1 = await invoke("info", phone1);
  const store1 = getMockInsforgeStore();
  const c1 = contactRow(store1, phone1);
  record(
    "F1_info_menu_count",
    fallbacks.countMenuOptions(r1.body.response_text) <= 4 &&
      String(r1.body.response_text).includes("carreras") &&
      fallbackCount(c1) === 1,
    `count=${fallbackCount(c1)}`,
  );

  const phone2 = "+525551280002";
  resetMockInsforgeStore();
  const r2a = await invoke("info", phone2);
  const r2b = await invoke("mas informacion", phone2);
  record(
    "F2_two_ambiguous_level2",
    r2b.body.response_text !== r2a.body.response_text &&
      String(r2b.body.response_text).includes("Perdón") &&
      fallbackCount(contactRow(getMockInsforgeStore(), phone2)) === 2,
    `count=${fallbackCount(contactRow(getMockInsforgeStore(), phone2))}`,
  );

  const phone3 = "+525551280003";
  resetMockInsforgeStore();
  await invoke("info", phone3);
  await invoke("?", phone3);
  const r3 = await invoke("no entiendo", phone3);
  const c3 = contactRow(getMockInsforgeStore(), phone3);
  const log3 = lastGhlLog(getMockInsforgeStore(), phone3);
  record(
    "F3_third_turn_level3",
    String(r3.body.response_text).includes("asesor") &&
      tagsFromLog(log3).includes("wa_low_confidence") &&
      c3.fsm_state === "HUMANO",
    c3.fsm_state,
  );

  const phone4 = "+525551280004";
  resetMockInsforgeStore();
  await invoke("info", phone4);
  record("F4a_ambiguous_count1", fallbackCount(contactRow(getMockInsforgeStore(), phone4)) === 1);
  await invoke("derecho", phone4);
  record(
    "F4b_resolved_resets",
    fallbackCount(contactRow(getMockInsforgeStore(), phone4)) === 0,
  );
  await invoke("info", phone4);
  record(
    "F4c_ambiguous_restarts",
    fallbackCount(contactRow(getMockInsforgeStore(), phone4)) === 1,
  );

  const phone5 = "+525551280005";
  const derechoPres = priceTokens("Derecho");
  resetMockInsforgeStore();
  const r5a = await invoke("¿cuánto cuesta?", phone5);
  record(
    "F5a_cost_clarify_no_count",
    String(r5a.body.response_text).includes("¿De qué carrera") &&
      fallbackCount(contactRow(getMockInsforgeStore(), phone5)) === 0,
  );
  const r5b = await invoke("derecho", phone5);
  record(
    "F5b_cost_followup_derecho",
    String(r5b.body.response_text).includes(derechoPres.monthly) &&
      String(r5b.body.response_text).includes(derechoPres.enrollment),
    derechoPres.monthly,
  );

  const phone6 = "+525551280006";
  const derechoOnline = priceTokens("Derecho Online");
  resetMockInsforgeStore();
  seedMockContact({
    normalized_phone: phone6,
    academic_state: {
      current_career: "Derecho Online",
      current_modality: "en_linea",
      fallback_count: 0,
    },
    fallback_count: 0,
    fsm_state: "CONSULTA",
  });
  const r6 = await invoke("¿cuánto cuesta?", phone6);
  record(
    "F6_cost_with_current_career",
    String(r6.body.response_text).includes(derechoOnline.monthly) &&
      String(r6.body.response_text).includes(derechoOnline.enrollment),
    derechoOnline.monthly,
  );

  const phone7 = "+525551280007";
  resetMockInsforgeStore();
  seedMockContact({
    normalized_phone: phone7,
    academic_state: {
      current_career: "Enfermería",
      current_modality: "presencial",
    },
    fsm_state: "CONSULTA",
  });
  const r7 = await invoke("y online", phone7);
  record(
    "F7_modality_invalid_reuse",
    r7.body.intent === "modalidad_invalida" &&
      String(r7.body.response_text).toLowerCase().includes("presencial"),
    r7.body.intent,
  );

  const phone8 = "+525551280008";
  resetMockInsforgeStore();
  await invoke("derecho", phone8);
  await invoke("psicología", phone8);
  const r8 = await invoke("y esa cuánto cuesta", phone8);
  record(
    "F8_last_mentioned_career_cost",
    String(r8.body.response_text).includes(derechoPres.monthly),
    derechoPres.monthly,
  );

  const phone9 = "+525551280009";
  resetMockInsforgeStore();
  const r9a = await invoke("info", phone9);
  const r9b = await invoke("info", phone9);
  const r9c = await invoke("info", phone9);
  record(
    "F9_d23_reformulate_then_level3",
    r9b.body.response_text !== r9a.body.response_text &&
      String(r9c.body.response_text).includes("asesor") &&
      tagsFromLog(lastGhlLog(getMockInsforgeStore(), phone9)).includes("wa_low_confidence"),
  );

  const phone10 = "+525551280010";
  resetMockInsforgeStore();
  const r10 = await invoke("¿va a llover?", phone10);
  record(
    "F10_out_of_domain_no_count",
    String(r10.body.response_text).includes("admisiones") &&
      fallbackCount(contactRow(getMockInsforgeStore(), phone10)) === 0,
  );

  const phone11 = "+525551280011";
  resetMockInsforgeStore();
  const r11 = await invoke("¿cuál me recomiendas?", phone11);
  record(
    "F11_no_recommend_career",
    !/\b(psicolog|derecho|enfermer|nutricion|gastronom|administracion|ventas|negocios|ingenier)/i.test(
      String(r11.body.response_text),
    ) &&
      (String(r11.body.response_text).includes("test") ||
        String(r11.body.response_text).includes("asesor")),
  );

  const phone12a = "+525551280012";
  resetMockInsforgeStore();
  seedMockContact({
    normalized_phone: phone12a,
    fsm_state: "NO_CONTACT",
    wa_stage: "no_contact",
    fallback_count: 2,
  });
  await invoke("info", phone12a);
  await invoke("?", phone12a);
  const r12a = await invoke("no entiendo", phone12a);
  record(
    "F12a_no_level3_on_no_contact",
    r12a.body.intent !== "humano" &&
      !tagsFromLog(lastGhlLog(getMockInsforgeStore(), phone12a)).includes("wa_low_confidence"),
    r12a.body.intent,
  );

  const phone12b = "+525551280013";
  resetMockInsforgeStore();
  seedMockContact({
    normalized_phone: phone12b,
    fsm_state: "HUMANO",
    closed_by_agent: false,
    wa_stage: "asesor_requerido",
    fallback_count: 2,
  });
  await invoke("info", phone12b);
  await invoke("?", phone12b);
  const r12b = await invoke("no entiendo", phone12b);
  const tasks12 = getMockInsforgeStore().wa_ghl_sync_log.filter(
    (r) => r.normalized_phone === phone12b && r.would_create_task === true,
  );
  record(
    "F12b_humano_open_no_reescalation",
    r12b.body.needs_human !== true && tasks12.length === 0,
    `needs_human=${r12b.body.needs_human}`,
  );

  const phone13 = "+525551280014";
  resetMockInsforgeStore();
  const dupId = nextMessageId("dup");
  await invoke("info", phone13, dupId);
  const countAfterFirst = fallbackCount(contactRow(getMockInsforgeStore(), phone13));
  const replay = await invoke("info", phone13, dupId);
  record(
    "F13_idempotent_no_double_count",
    replay.body.skipped === true && countAfterFirst === 1,
    `skipped=${replay.body.skipped}`,
  );

  process.env.FF_FALLBACKS = "false";
  const phone14 = "+525551280015";
  resetMockInsforgeStore();
  await invoke("hola", phone14);
  const r14 = await invoke("info", phone14);
  const c14 = contactRow(getMockInsforgeStore(), phone14);
  record(
    "F14_flag_off_legacy",
    String(r14.body.response_text).includes(EVA_FALLBACK_LEGACY.slice(0, 30)) &&
      (c14?.fallback_count == null || Number(c14?.fallback_count) === 0),
    r14.body.intent,
  );
  process.env.FF_FALLBACKS = "true";
} catch (err) {
  failures += 1;
  console.error("FATAL", err.message);
  console.error(err.stack);
}

console.log(`\n--- Fase 1 Item 5: ${results.length - failures}/${results.length} passed ---`);
process.exit(failures > 0 ? 1 : 0);
