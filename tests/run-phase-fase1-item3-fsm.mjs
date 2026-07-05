#!/usr/bin/env node
/**
 * Fase 1 — Item 3: FSM lite (FF_FSM).
 *
 * Usage: node tests/run-phase-fase1-item3-fsm.mjs
 */

import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const HANDLER_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");
const FSM_PATH = path.join(ROOT, "insforge/functions/lib/fsm-lite.js");
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
};

for (const [key, value] of Object.entries(BASE_ENV)) {
  process.env[key] = value;
}

if (!globalThis.Deno) {
  globalThis.Deno = { env: { get: (key) => process.env[key] } };
}

const fsm = await import(pathToFileURL(FSM_PATH).href);
const { resetMockInsforgeStore, getMockInsforgeStore, seedMockContact } = await import(
  pathToFileURL(MOCK_DB_PATH).href,
);
const handler = (await import(pathToFileURL(HANDLER_PATH).href)).default;

const RUN = Date.now().toString(36);
let msgSeq = 0;

function nextMessageId(label) {
  msgSeq += 1;
  return `fase1-item3-${RUN}-${label}-${msgSeq}`;
}

function buildPayload(messageText, phone, messageId = nextMessageId("msg")) {
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

async function invoke(messageText, phone, messageId) {
  const request = new Request("http://localhost/ycloud-wa-inbound", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildPayload(messageText, phone, messageId)),
  });
  const response = await handler(request);
  const body = await response.json();
  return { status: response.status, body };
}

function contactRow(store, phone) {
  return store.wa_contacts_state.find((r) => r.normalized_phone === phone) || null;
}

function ghlTaskLogs(store, phone) {
  return store.wa_ghl_sync_log.filter((r) => {
    if (r.normalized_phone !== phone) return false;
    return r.would_create_task === true || r.payload?.task != null;
  });
}

const SALUDO_STAGES = [
  "inicio",
  "pendiente_texto",
  "orientacion",
  "ambiguo",
  "cierre_positivo",
  "despedida",
];
const CONSULTA_STAGES = [
  "carrera_interes",
  "carreras_exploracion",
  "carreras_online",
  "ubicacion_consultada",
  "rvoe_consultado",
  "objecion_precio",
  "promocion_interes",
  "nivel_no_principal",
  "revalidacion_interes",
  "carrera_no_ofertada",
  "test_recomendado",
];
const HUMANO_STAGES = ["asesor_requerido", "soporte_test", "post_test", "beca_interes"];

const results = [];
let failures = 0;

function record(id, ok, detail = "") {
  results.push({ id, ok, detail });
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${id}${detail ? ` — ${detail}` : ""}`);
}

try {
  // 1. Backfill mapping
  for (const stage of SALUDO_STAGES) {
    record(
      `F1_saludo_${stage}`,
      fsm.mapWaStageToFsmState(stage) === fsm.FSM_STATES.SALUDO_INICIAL,
      fsm.mapWaStageToFsmState(stage),
    );
  }
  for (const stage of CONSULTA_STAGES) {
    record(
      `F1_consulta_${stage}`,
      fsm.mapWaStageToFsmState(stage) === fsm.FSM_STATES.CONSULTA,
      fsm.mapWaStageToFsmState(stage),
    );
  }
  for (const stage of HUMANO_STAGES) {
    record(
      `F1_humano_${stage}`,
      fsm.mapWaStageToFsmState(stage) === fsm.FSM_STATES.HUMANO,
      fsm.mapWaStageToFsmState(stage),
    );
  }
  record(
    "F1_no_contact_stage",
    fsm.mapWaStageToFsmState("no_contact") === fsm.FSM_STATES.NO_CONTACT,
  );
  record(
    "F1_unknown_to_consulta",
    fsm.mapWaStageToFsmState("valor_desconocido_xyz") === fsm.FSM_STATES.CONSULTA,
  );
  record(
    "F1_precedence_no_contact",
    fsm.mapWaStageToFsmState("asesor_requerido", "NO_CONTACT") === fsm.FSM_STATES.NO_CONTACT,
  );
  const unmapped = fsm.listUnmappedWaStagesForBackfill(["valor_desconocido_xyz", "carrera_interes"]);
  record("F1_unmapped_list", unmapped.includes("valor_desconocido_xyz") && !unmapped.includes("carrera_interes"));

  // 2. New contact → SALUDO at start → CONSULTA after first turn
  resetMockInsforgeStore();
  const phone2 = "+525551260001";
  record(
    "F2_start_saludo",
    fsm.resolveInboundFsmStateAtStart({}) === fsm.FSM_STATES.SALUDO_INICIAL,
  );
  await invoke("Hola", phone2);
  const contact2 = contactRow(getMockInsforgeStore(), phone2);
  record("F2_after_first_turn_consulta", contact2?.fsm_state === "CONSULTA", contact2?.fsm_state);

  // 3. Escalation → HUMANO + closed_by_agent=false
  resetMockInsforgeStore();
  const phone3 = "+525551260002";
  await invoke("Quiero hablar con un asesor", phone3);
  const contact3 = contactRow(getMockInsforgeStore(), phone3);
  record("F3_fsm_humano", contact3?.fsm_state === "HUMANO", contact3?.fsm_state);
  record("F3_closed_by_agent_false", contact3?.closed_by_agent === false, String(contact3?.closed_by_agent));

  // 4. HUMANO without close — no re-notify, state unchanged
  resetMockInsforgeStore();
  const phone4 = "+525551260003";
  seedMockContact({
    normalized_phone: phone4,
    fsm_state: "HUMANO",
    closed_by_agent: false,
    wa_stage: "asesor_requerido",
    wa_needs_human: true,
    updated_at: new Date().toISOString(),
  });
  const tasksBefore = ghlTaskLogs(getMockInsforgeStore(), phone4).length;
  await invoke("Quiero hablar con un asesor otra vez", phone4);
  const store4 = getMockInsforgeStore();
  const contact4 = contactRow(store4, phone4);
  const tasksAfter = ghlTaskLogs(store4, phone4).length;
  record("F4_still_humano", contact4?.fsm_state === "HUMANO", contact4?.fsm_state);
  record("F4_no_new_task", tasksAfter === tasksBefore, `${tasksBefore} → ${tasksAfter}`);

  // 5. Lazy reset after 25h
  resetMockInsforgeStore();
  const phone5 = "+525551260004";
  seedMockContact({
    normalized_phone: phone5,
    fsm_state: "HUMANO",
    closed_by_agent: true,
    wa_stage: "asesor_requerido",
    updated_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
  });
  await invoke("Hola de nuevo", phone5);
  const contact5 = contactRow(getMockInsforgeStore(), phone5);
  record("F5_lazy_reset_consulta", contact5?.fsm_state === "CONSULTA", contact5?.fsm_state);
  record("F5_closed_cleared", contact5?.closed_by_agent === false, String(contact5?.closed_by_agent));

  // 6. No reset within 2h
  resetMockInsforgeStore();
  const phone6 = "+525551260005";
  seedMockContact({
    normalized_phone: phone6,
    fsm_state: "HUMANO",
    closed_by_agent: true,
    wa_stage: "asesor_requerido",
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  });
  await invoke("Sigo esperando", phone6);
  const contact6 = contactRow(getMockInsforgeStore(), phone6);
  record("F6_no_reset_stays_humano", contact6?.fsm_state === "HUMANO", contact6?.fsm_state);

  // 7. NO_CONTACT precedence
  resetMockInsforgeStore();
  const phone7 = "+525551260006";
  seedMockContact({
    normalized_phone: phone7,
    fsm_state: "NO_CONTACT",
    closed_by_agent: false,
    wa_stage: "no_contact",
  });
  await invoke("Quiero hablar con un asesor", phone7);
  const contact7 = contactRow(getMockInsforgeStore(), phone7);
  record("F7_no_contact_intact", contact7?.fsm_state === "NO_CONTACT", contact7?.fsm_state);

  // 8. Idempotent replay — single transition
  resetMockInsforgeStore();
  const phone8 = "+525551260007";
  const msgId8 = nextMessageId("humano-replay");
  await invoke("Quiero hablar con un asesor", phone8, msgId8);
  const contact8a = contactRow(getMockInsforgeStore(), phone8);
  const replay8 = await invoke("Quiero hablar con un asesor", phone8, msgId8);
  const contact8b = contactRow(getMockInsforgeStore(), phone8);
  record("F8_replay_skipped", replay8.body.skipped === true && replay8.body.idempotent === true);
  record(
    "F8_single_transition",
    contact8a?.fsm_state === "HUMANO" && contact8b?.fsm_state === "HUMANO",
    `${contact8a?.fsm_state} → ${contact8b?.fsm_state}`,
  );

  // 9. FF_FSM=false — no fsm writes except opt-out
  process.env.FF_FSM = "false";
  resetMockInsforgeStore();
  const phone9a = "+525551260008";
  await invoke("Hola", phone9a);
  const contact9a = contactRow(getMockInsforgeStore(), phone9a);
  record("F9_flag_off_fsm_null", contact9a?.fsm_state == null, String(contact9a?.fsm_state));

  resetMockInsforgeStore();
  const phone9b = "+525551260009";
  await invoke("ya no me escriban", phone9b);
  const contact9b = contactRow(getMockInsforgeStore(), phone9b);
  record("F9_opt_out_still_no_contact", contact9b?.fsm_state === "NO_CONTACT", contact9b?.fsm_state);
  process.env.FF_FSM = "true";
} catch (err) {
  failures += 1;
  console.error("FATAL", err.message);
  console.error(err.stack);
}

console.log(`\n--- Fase 1 Item 3: ${results.length - failures}/${results.length} passed ---`);
process.exit(failures > 0 ? 1 : 0);
