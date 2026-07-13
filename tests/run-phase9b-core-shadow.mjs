#!/usr/bin/env node
/**
 * FASE 9B — Core-engine shadow (Costura 1).
 *
 * Verifica contra el handler REAL (mock DB):
 *   C1: respuesta determinista normal → fila shadow con agreement=true (core accept).
 *   C2: escalación a humano → fila shadow con agreement=false y
 *       disagreement_reason coherente (divergencia esperada y visible).
 *   C3: FF_CORE_SHADOW=false → cero filas (flag off = módulo dormido).
 *   C4: SHADOW-1 — la respuesta de Eva es idéntica con shadow on/off.
 *
 * Usage: node tests/run-phase9b-core-shadow.mjs
 */

import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const HANDLER_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");
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
  FF_NOT_OFFERED: "false",
  FF_FALLBACKS: "false",
  FF_ESCALATION_V2: "false",
  FF_CORE_SHADOW: "true",
};

for (const [key, value] of Object.entries(BASE_ENV)) {
  process.env[key] = value;
}

if (!globalThis.Deno) {
  globalThis.Deno = { env: { get: (key) => process.env[key] } };
}

const { resetMockInsforgeStore, getMockInsforgeStore } = await import(
  pathToFileURL(MOCK_DB_PATH).href,
);
const handler = (await import(pathToFileURL(HANDLER_PATH).href)).default;

const RUN = Date.now().toString(36);
let msgSeq = 0;
let failures = 0;

function nextMessageId(label) {
  msgSeq += 1;
  return `9b-${RUN}-${msgSeq}-${label}`;
}

function buildPayload({ phone, text, label }) {
  return {
    id: nextMessageId(label),
    type: "whatsapp.inbound_message.received",
    whatsappInboundMessage: {
      id: nextMessageId(`${label}-wamid`),
      from: phone,
      to: "5219999999999",
      type: "text",
      text: { body: text },
      sendTime: new Date().toISOString(),
    },
  };
}

async function post(payload) {
  const req = new Request("http://localhost/ycloud-wa-inbound", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const res = await handler(req);
  return res;
}

function shadowRows() {
  const store = getMockInsforgeStore();
  return store.wa_core_shadow_log || [];
}

function outboundTexts() {
  const store = getMockInsforgeStore();
  return (store.wa_outbound_messages || []).map((r) => r.message_text || r.text || r.body || "");
}

function check(name, cond, detail = "") {
  const status = cond ? "PASS" : "FAIL";
  if (!cond) failures += 1;
  console.log(`[${status}] ${name}${detail ? ` — ${detail}` : ""}`);
}

// ── C1: mensaje normal → shadow con agreement=true ─────────────
resetMockInsforgeStore();
await post(buildPayload({ phone: "5215550000001", text: "hola, quiero información de la carrera de derecho", label: "c1" }));
{
  const rows = shadowRows();
  check("C1 fila shadow creada", rows.length === 1, `rows=${rows.length}`);
  const row = rows[0] || {};
  check("C1 core aceptó (gate allowed)", row.core_gate_allowed === true, `gate=${row.core_gate_allowed}, action=${row.core_action}`);
  check("C1 agreement=true", row.agreement === true, `disagreement=${row.disagreement_reason}`);
  check("C1 vendor_commit presente", typeof row.vendor_commit === "string" && row.vendor_commit.length > 0, `vendor=${row.vendor_commit}`);
}

// ── C2: escalación a humano → divergencia esperada y visible ───
resetMockInsforgeStore();
await post(buildPayload({ phone: "5215550000002", text: "quiero hablar con un asesor humano por favor", label: "c2" }));
{
  const rows = shadowRows();
  check("C2 fila shadow creada", rows.length === 1, `rows=${rows.length}`);
  const row = rows[0] || {};
  check("C2 eva_outcome=escalated", row.eva_outcome === "escalated", `outcome=${row.eva_outcome}, eva_state=${row.eva_state}`);
  check(
    "C2 divergencia registrada coherente",
    row.agreement === false && typeof row.disagreement_reason === "string" && row.disagreement_reason.startsWith("eva_escalated"),
    `agreement=${row.agreement}, reason=${row.disagreement_reason}`,
  );
}

// ── C3: flag off → módulo dormido, cero filas ──────────────────
process.env.FF_CORE_SHADOW = "false";
resetMockInsforgeStore();
await post(buildPayload({ phone: "5215550000003", text: "hola, información de psicología", label: "c3" }));
{
  const rows = shadowRows();
  check("C3 flag off = cero filas shadow", rows.length === 0, `rows=${rows.length}`);
}

// ── C4: SHADOW-1 — respuesta idéntica con shadow on/off ────────
process.env.FF_CORE_SHADOW = "false";
resetMockInsforgeStore();
await post(buildPayload({ phone: "5215550000004", text: "hola, quiero información de la carrera de derecho", label: "c4off" }));
const textsOff = outboundTexts();

process.env.FF_CORE_SHADOW = "true";
resetMockInsforgeStore();
await post(buildPayload({ phone: "5215550000005", text: "hola, quiero información de la carrera de derecho", label: "c4on" }));
const textsOn = outboundTexts();

check(
  "C4 respuesta de Eva idéntica con shadow on/off",
  JSON.stringify(textsOff) === JSON.stringify(textsOn),
  `off=${textsOff.length} msgs, on=${textsOn.length} msgs`,
);

console.log("");
if (failures > 0) {
  console.error(`FASE 9B: ${failures} verificaciones FALLARON`);
  process.exit(1);
}
console.log("FASE 9B: OK — juez de core en sombra, decisión de Eva intacta");
