#!/usr/bin/env node
/**
 * Fase 1 — Item 4: notOfferedResolver pipeline §11 (FF_NOT_OFFERED).
 *
 * Usage: node tests/run-phase-fase1-item4-notoffered.mjs
 */

import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const HANDLER_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");
const CATALOG_PATH = path.join(ROOT, "insforge/functions/lib/academic-engine/catalog-sot.js");
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
  FF_FSM: "false",
  FF_NOT_OFFERED: "true",
  FF_FALLBACKS: "false",
  FF_ESCALATION_V2: "false",
};

for (const [key, value] of Object.entries(BASE_ENV)) {
  process.env[key] = value;
}

if (!globalThis.Deno) {
  globalThis.Deno = { env: { get: (key) => process.env[key] } };
}

const catalog = await import(pathToFileURL(CATALOG_PATH).href);
const { resetMockInsforgeStore, getMockInsforgeStore } = await import(
  pathToFileURL(MOCK_DB_PATH).href,
);
const handler = (await import(pathToFileURL(HANDLER_PATH).href)).default;

const RUN = Date.now().toString(36);
let msgSeq = 0;

function nextMessageId(label) {
  msgSeq += 1;
  return `fase1-item4-${RUN}-${label}-${msgSeq}`;
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

function lastGhlLog(store, phone) {
  const rows = store.wa_ghl_sync_log.filter((r) => r.normalized_phone === phone);
  return rows[rows.length - 1] || null;
}

function ghlLogs(store, phone) {
  return store.wa_ghl_sync_log.filter((r) => r.normalized_phone === phone);
}

function tagsFromLog(log) {
  return log?.payload?.tags || log?.would_add_tags || [];
}

const results = [];
let failures = 0;

function record(id, ok, detail = "") {
  results.push({ id, ok, detail });
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${id}${detail ? ` — ${detail}` : ""}`);
}

function assertEightStepWithAlts(responseText, alternatives) {
  const text = String(responseText || "");
  if (!text.includes("1. Entiendo")) return false;
  return alternatives.every((alt) => text.includes(alt));
}

try {
  // 1. Matrix categories → 8 steps with correct alternatives
  const matrixCases = [
    { id: "salud", msg: "quiero medicina", alts: ["Enfermería", "Nutrición", "Psicología"] },
    { id: "tecnologia", msg: "me interesa arquitectura", alts: ["Ingeniería en Sistemas Computacionales"] },
    { id: "creativas", msg: "diseño gráfico", alts: ["Ventas y Mercadotecnia"] },
    { id: "internacionales", msg: "turismo", alts: ["Negocios Internacionales"] },
    { id: "juridicas", msg: "criminología", alts: ["Derecho"] },
    { id: "negocios", msg: "contaduría", alts: ["Administración Sabatina"] },
    { id: "educacion", msg: "pedagogía", alts: ["Psicología"] },
  ];

  for (const tc of matrixCases) {
    resetMockInsforgeStore();
    const phone = `+5255512700${matrixCases.indexOf(tc)}`;
    const r = await invoke(tc.msg, phone);
    record(
      `N1_${tc.id}_eight_step`,
      r.body.intent === "carrera_no_ofertada" &&
        assertEightStepWithAlts(r.body.response_text, tc.alts),
      r.body.intent,
    );
  }

  // 2. Typo sicologia → confirm; sí → carrera_interes; no → unknown
  resetMockInsforgeStore();
  const phone2 = "+525551270010";
  const r2a = await invoke("sicologia", phone2);
  record("N2_typo_confirm", r2a.body.intent === "carrera_confirmacion");
  record("N2_typo_no_ghl", ghlLogs(getMockInsforgeStore(), phone2).length === 0);

  const r2b = await invoke("sí", phone2);
  record("N2_yes_carrera_interes", r2b.body.intent === "carrera_interes");

  resetMockInsforgeStore();
  const phone2c = "+525551270011";
  await invoke("sicologia", phone2c);
  const r2c = await invoke("no", phone2c);
  record("N2_no_unknown_flow", r2c.body.intent === "carrera_no_ofertada");
  const ghl2c = lastGhlLog(getMockInsforgeStore(), phone2c);
  record(
    "N2_no_unknown_tag",
    tagsFromLog(ghl2c).includes("wa_requested_unknown_career"),
  );

  // 3. administración → disambiguation
  resetMockInsforgeStore();
  const phone3 = "+525551270012";
  const r3 = await invoke("administración", phone3);
  record("N3_admin_confirm", r3.body.intent === "carrera_confirmacion");
  record(
    "N3_admin_question",
    String(r3.body.response_text || "").includes("Administración Sabatina"),
  );

  // 4. leyes → Derecho + modality (NOT no-ofertada)
  resetMockInsforgeStore();
  const phone4 = "+525551270013";
  const r4 = await invoke("quiero estudiar leyes", phone4);
  record("N4_leyes_carrera_interes", r4.body.intent === "carrera_interes", r4.body.intent);
  record(
    "N4_leyes_modality_question",
    String(r4.body.response_text || "").includes("modalidad"),
  );

  // 5. enfermería en línea → invalid_modality
  resetMockInsforgeStore();
  const phone5 = "+525551270014";
  const r5 = await invoke("enfermería en línea", phone5);
  const ghl5 = lastGhlLog(getMockInsforgeStore(), phone5);
  record("N5_invalid_modality_intent", r5.body.intent === "modalidad_invalida", r5.body.intent);
  record(
    "N5_invalid_modality_tag",
    tagsFromLog(ghl5).includes("wa_requested_invalid_modality"),
  );
  record(
    "N5_no_future_promise",
    !String(r5.body.response_text || "").toLowerCase().includes("pronto"),
  );

  // 6. maestrías → invalid_level
  resetMockInsforgeStore();
  const phone6 = "+525551270015";
  const r6 = await invoke("tienen maestrías", phone6);
  record("N6_invalid_level", r6.body.intent === "niveles_no_principales", r6.body.intent);
  record(
    "N6_no_licenciatura_alts",
    !String(r6.body.response_text || "").includes("Administración Sabatina"),
  );

  // 7. medicina x2 → 2nd needsHuman + tag
  resetMockInsforgeStore();
  const phone7 = "+525551270016";
  const r7a = await invoke("quiero medicina", phone7);
  record("N7_first_not_offered", r7a.body.intent === "carrera_no_ofertada");
  const r7b = await invoke("quiero medicina", phone7);
  const ghl7b = lastGhlLog(getMockInsforgeStore(), phone7);
  record("N7_second_humano", r7b.body.intent === "humano", r7b.body.intent);
  record(
    "N7_insistence_tag",
    tagsFromLog(ghl7b).includes("wa_needs_human_career_not_offered"),
  );

  // 8. unknown astrofísica
  resetMockInsforgeStore();
  const phone8 = "+525551270017";
  const r8 = await invoke("astrofísica", phone8);
  const ghl8 = lastGhlLog(getMockInsforgeStore(), phone8);
  record("N8_unknown_intent", r8.body.intent === "carrera_no_ofertada");
  record(
    "N8_unknown_tag",
    tagsFromLog(ghl8).includes("wa_requested_unknown_career"),
  );
  record(
    "N8_literal_note",
    String(ghl8?.payload?.note || ghl8?.would_add_note || "").includes("astrofísica"),
  );

  // 9. Demand registration + dedupe
  resetMockInsforgeStore();
  const phone9 = "+525551270018";
  const msg9 = nextMessageId("demand-dedupe");
  await invoke("odontología", phone9, msg9);
  const store9a = getMockInsforgeStore();
  const logs9a = ghlLogs(store9a, phone9);
  record("N9_first_has_tags", tagsFromLog(logs9a[0]).includes("wa_market_signal_career_demand"));
  record("N9_first_has_note", Boolean(logs9a[0]?.payload?.note || logs9a[0]?.would_add_note));

  const replay9 = await invoke("odontología", phone9, msg9);
  record("N9_replay_skipped", replay9.body.skipped === true && replay9.body.idempotent === true);

  await invoke("odontología", phone9);
  const noteCount9 = ghlLogs(getMockInsforgeStore(), phone9).filter(
    (l) => l.payload?.note || l.would_add_note,
  ).length;
  record("N9_same_day_note_dedupe", noteCount9 === 1, String(noteCount9));

  // 10. Offered careers never fall to not-offered resolver
  const offered = catalog.getOfficialCareerNames();
  for (const career of offered) {
    resetMockInsforgeStore();
    const phone = `+525551271${String(offered.indexOf(career)).padStart(3, "0")}`;
    const r = await invoke(`Me interesa ${career}`, phone);
    record(
      `N10_offered_${catalog.normalizeInput?.(career) || career.slice(0, 12)}`,
      r.body.intent !== "carrera_no_ofertada",
      r.body.intent,
    );
  }

  // 11. FF_NOT_OFFERED=false → item 0 behavior
  process.env.FF_NOT_OFFERED = "false";
  resetMockInsforgeStore();
  const phone11 = "+525551270019";
  const r11 = await invoke("medicina", phone11);
  record(
    "N11_flag_off_simple",
    r11.body.intent === "carrera_no_ofertada" &&
      !String(r11.body.response_text || "").includes("1. Entiendo"),
    r11.body.intent,
  );
  process.env.FF_NOT_OFFERED = "true";
} catch (err) {
  failures += 1;
  console.error("FATAL", err.message);
  console.error(err.stack);
}

console.log(`\n--- Fase 1 Item 4: ${results.length - failures}/${results.length} passed ---`);
process.exit(failures > 0 ? 1 : 0);
