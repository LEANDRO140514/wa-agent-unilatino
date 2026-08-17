#!/usr/bin/env node
/**
 * Eva Runtime SHADOW v1 — endpoint privado, sin side effects.
 *
 * Usage: node tests/run-eva-runtime-shadow.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SHADOW_PATH = path.join(ROOT, "insforge/functions/eva-runtime-shadow.js");
const INBOUND_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");
const SEAM_PATH = path.join(ROOT, "insforge/functions/lib/eva-runtime/run-eva-semantic-turn.js");

const TEST_TOKEN = "test-shadow-token";
const WS_UUID = "11111111-1111-4111-8111-111111111111";
const CONV_UUID = "22222222-2222-4222-8222-222222222222";
const CONTACT_UUID = "33333333-3333-4333-8333-333333333333";

for (const [key, value] of Object.entries({
  ALGORITHMUS_EVA_BRIDGE_TOKEN: TEST_TOKEN,
  EVA_LLM_ENABLED: "false",
  ACADEMIC_ENGINE_ENABLED: "false",
  WA_AGENT_MODE: "mock",
  WA_E2E_MOCK_DB: "true",
  GHL_SYNC_MODE: "dry_run",
  FF_NOT_OFFERED: "false",
  FF_FALLBACKS: "false",
  FF_ESCALATION_V2: "false",
  EVA_GUIDED_JOURNEY_ENABLED: "false",
})) {
  process.env[key] = value;
}

if (!globalThis.Deno) {
  globalThis.Deno = { env: { get: (key) => process.env[key] } };
}

const { handleEvaRuntimeShadow, isValidEvaContractV1Output } = await import(
  pathToFileURL(SHADOW_PATH).href
);

let failures = 0;
function check(name, cond, detail = "") {
  console.log(`[${cond ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures += 1;
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function validMemory(overrides = {}) {
  return {
    schema_version: "eva-memory-v1",
    memory_revision: 1,
    business_state: {},
    relationship_summary: "",
    relationship_facts: {},
    recent_events: [],
    ...overrides,
  };
}

function msg(role, content, created_at = "2026-08-17T00:00:00.000Z") {
  return { role, content, created_at };
}

function validContract(overrides = {}) {
  const { contact, recent_messages, memory, knowledge_context, ...rest } = overrides;
  return {
    contract_version: "eva-v1",
    workspace_id: WS_UUID,
    conversation_id: CONV_UUID,
    contact: {
      contact_id: CONTACT_UUID,
      name: "Ana",
      ...(contact || {}),
    },
    recent_messages: recent_messages || [
      msg("user", "hola", "2026-08-17T00:00:01.000Z"),
      msg("assistant", "¿en qué te ayudo?", "2026-08-17T00:00:02.000Z"),
      msg("user", "quiero estudiar derecho presencial", "2026-08-17T00:00:03.000Z"),
    ],
    memory: memory || validMemory(),
    knowledge_context: knowledge_context || [],
    ...rest,
  };
}

function validBody(overrides = {}) {
  const { contract, runtime_context } = overrides;
  return {
    contract: validContract(contract || {}),
    runtime_context: {
      normalized_phone: "529999111222",
      mode: "shadow",
      ...(runtime_context || {}),
    },
  };
}

function semanticFixture() {
  return {
    decision: {
      intent: "carrera_interes",
      responseText: "Perfecto, Derecho presencial.",
      needsHuman: false,
      waStage: "carrera_interes",
    },
    academicState: {
      current_career: "Derecho",
      current_modality: "presencial",
    },
    academicMeta: {},
  };
}

function makeDeps(overrides = {}) {
  const calls = {
    lookup: [],
    semantic: [],
    wa: 0,
    ghl: 0,
    persist: 0,
  };
  return {
    calls,
    getBridgeToken: () => TEST_TOKEN,
    lookupContactState: async (normalizedPhone) => {
      calls.lookup.push(normalizedPhone);
      return {
        wa_stage: "inicio",
        wa_last_intent: null,
        academic_state: {},
        fsm_state: null,
      };
    },
    runSemanticTurn: async (input) => {
      calls.semantic.push(input);
      return semanticFixture();
    },
    sendYCloudMessage: async () => {
      calls.wa += 1;
      throw new Error("shadow must not send WhatsApp");
    },
    syncGhl: async () => {
      calls.ghl += 1;
      throw new Error("shadow must not sync GHL");
    },
    persistContactState: async () => {
      calls.persist += 1;
      throw new Error("shadow must not persist contact");
    },
    persistOutbound: async () => {
      calls.persist += 1;
      throw new Error("shadow must not persist outbound");
    },
    persistFsm: async () => {
      calls.persist += 1;
      throw new Error("shadow must not persist FSM");
    },
    ...overrides,
  };
}

async function invoke(body, { method = "POST", token = TEST_TOKEN, deps } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token !== undefined && token !== null) {
    headers.Authorization = `Bearer ${token}`;
  }
  const request = new Request("http://localhost/eva-runtime-shadow", {
    method,
    headers,
    body: method === "GET" || method === "OPTIONS" ? undefined : JSON.stringify(body ?? validBody()),
  });
  const d = deps || makeDeps();
  const response = await handleEvaRuntimeShadow(request, d);
  let parsed = null;
  const text = await response.text();
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: response.status, body: parsed, deps: d, raw: text };
}

function exactKeys(obj, keys) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const actual = Object.keys(obj);
  return actual.length === keys.length && keys.every((k) => Object.hasOwn(obj, k));
}

// 1. método
{
  const r = await invoke(validBody(), { method: "GET" });
  check("1. rechaza GET", r.status === 405, `status=${r.status}`);
}

// 2. auth
{
  const r = await invoke(validBody(), { token: null });
  check("2a. rechaza auth ausente", r.status === 401, `status=${r.status}`);
}
{
  const r = await invoke(validBody(), { token: "wrong-token" });
  check("2b. rechaza auth inválida", r.status === 401, `status=${r.status}`);
}

// 3. mode
{
  const r = await invoke(validBody({ runtime_context: { mode: "live" } }));
  check("3. rechaza mode distinto de shadow", r.status === 400, `status=${r.status} body=${JSON.stringify(r.body)}`);
}

// 4. contract_version
{
  const r = await invoke({
    ...validBody(),
    contract: validContract({ contract_version: "eva-v0" }),
  });
  check("4. rechaza contract_version distinto de eva-v1", r.status === 400, `status=${r.status}`);
}

// 5. no phone inside contract
{
  const r = await invoke({
    ...validBody(),
    contract: validContract({ normalized_phone: "529999111222" }),
  });
  check("5a. rechaza normalized_phone dentro del contract input", r.status === 400, `status=${r.status}`);
}
{
  const r = await invoke(validBody());
  check(
    "5b. output no tiene key normalized_phone (validación estructural)",
    r.status === 200 && !Object.hasOwn(r.body, "normalized_phone"),
    `status=${r.status} keys=${r.body && Object.keys(r.body)}`,
  );
}

// 6. latest user message from content
{
  const r = await invoke(validBody());
  const rawText = r.deps.calls.semantic[0]?.rawText;
  check(
    "6. latest user message usa content del último role=user",
    rawText === "quiero estudiar derecho presencial",
    `rawText=${JSON.stringify(rawText)}`,
  );
}
{
  const r = await invoke({
    ...validBody(),
    contract: validContract({
      recent_messages: [msg("assistant", "hola")],
    }),
  });
  check("6b. sin mensaje de usuario válido -> 400", r.status === 400, `status=${r.status}`);
}
{
  const r = await invoke({
    ...validBody(),
    contract: validContract({
      recent_messages: [
        { role: "user", text: "quiero estudiar derecho presencial", created_at: "2026-08-17T00:00:00.000Z" },
      ],
    }),
  });
  check("6c. recent_messages con text y sin content -> 400", r.status === 400, `status=${r.status}`);
}

// 7. lookup usa normalized_phone
{
  const r = await invoke(validBody());
  check(
    "7. lookup de estado usa normalized_phone de runtime_context",
    r.status === 200 &&
      r.deps.calls.lookup.length === 1 &&
      r.deps.calls.lookup[0] === "529999111222",
    JSON.stringify(r.deps.calls.lookup),
  );
}

// 8. output válido eva-v1
{
  const r = await invoke(validBody());
  const c = r.body;
  const types = (c?.proposed_actions || []).map((a) => a?.type);
  check(
    "8. genera EvaContractV1Output válido y estructuralmente estricto",
    r.status === 200 &&
      isValidEvaContractV1Output(c) &&
      exactKeys(c, ["contract_version", "reply", "intent", "qualification", "handoff", "memory_updates", "proposed_actions"]) &&
      c.intent?.key === "carrera_interes" &&
      c.qualification?.status === "known" &&
      types.includes("qualification_complete") &&
      !types.includes("no_action") &&
      Boolean(types.includes("handoff_human")) === Boolean(c.handoff.requested),
    JSON.stringify(c),
  );
}

// 9-11. stubs no invocados (no son la prueba arquitectónica principal)
{
  const r = await invoke(validBody());
  check("9. stubs sendYCloud no invocados", r.deps.calls.wa === 0, `wa=${r.deps.calls.wa}`);
  check("10. stubs GHL no invocados", r.deps.calls.ghl === 0, `ghl=${r.deps.calls.ghl}`);
  check("11. stubs persist no invocados", r.deps.calls.persist === 0, `persist=${r.deps.calls.persist}`);
}

// 12. determinismo de boundary
{
  const deps1 = makeDeps();
  const deps2 = makeDeps();
  const r1 = await invoke(validBody(), { deps: deps1 });
  const r2 = await invoke(validBody(), { deps: deps2 });
  check(
    "12. mismo semantic result -> mismo EvaContractV1Output",
    r1.status === 200 && r2.status === 200 && deepEqual(r1.body, r2.body),
  );
}

// 13. fail-closed output inválido
{
  const deps = makeDeps({
    buildEvaContract: () => ({ contract_version: "nope", leak: "ghl-123" }),
  });
  const r = await invoke(validBody(), { deps });
  check(
    "13. output inválido -> fail-closed (no 200, no leakage del payload inválido)",
    r.status >= 400 &&
      r.status !== 200 &&
      !(typeof r.body === "object" && r.body?.contract_version === "nope"),
    `status=${r.status} body=${JSON.stringify(r.body)}`,
  );
}

{
  const deps = makeDeps({
    buildEvaContract: (input) => ({
      ...input,
      extra: true,
    }),
  });
  const r = await invoke(validBody(), { deps });
  check(
    "13b. keys extra en top-level -> 422",
    r.status === 422,
    `status=${r.status}`,
  );
}

{
  const deps = makeDeps({
    runSemanticTurn: async () => ({
      decision: {
        intent: "carrera_interes",
        responseText: "El texto puede mencionar ghl sin tumbar el contrato.",
        needsHuman: false,
        waStage: "carrera_interes",
      },
      academicState: { current_career: "Derecho", current_modality: "presencial" },
      academicMeta: {},
    }),
  });
  const r = await invoke(validBody(), { deps });
  check(
    "13c. reply con la palabra ghl no se rechaza por substring scan",
    r.status === 200 && String(r.body.reply).toLowerCase().includes("ghl"),
    `status=${r.status} reply=${JSON.stringify(r.body?.reply)}`,
  );
}

{
  const deps = makeDeps({
    runSemanticTurn: async () => ({
      decision: {
        intent: "agradecimiento",
        responseText: "Con gusto",
        needsHuman: false,
      },
      academicState: {},
      academicMeta: {},
    }),
  });
  const r = await invoke(
    {
      ...validBody(),
      contract: validContract({
        recent_messages: [msg("user", "gracias")],
      }),
    },
    { deps },
  );
  check(
    "Extra: no_action exclusivo cuando no hay qualification/handoff",
    r.status === 200 &&
      r.body.proposed_actions.length === 1 &&
      r.body.proposed_actions[0].type === "no_action",
    JSON.stringify(r.body?.proposed_actions),
  );
}

// Input alignment
{
  const r = await invoke({
    ...validBody(),
    contract: validContract({ workspace_id: "not-a-uuid" }),
  });
  check("I1. workspace_id no UUID -> 400", r.status === 400, `status=${r.status}`);
}
{
  const r = await invoke({
    ...validBody(),
    contract: validContract({ conversation_id: "conv-1" }),
  });
  check("I2. conversation_id no UUID -> 400", r.status === 400, `status=${r.status}`);
}
{
  const r = await invoke({
    ...validBody(),
    contract: validContract({ contact: { contact_id: "ct-1" } }),
  });
  check("I3. contact_id no UUID -> 400", r.status === 400, `status=${r.status}`);
}
{
  const r = await invoke({
    ...validBody(),
    contract: validContract({ contact: { name: 123 } }),
  });
  check("I4. contact.name tipo inválido -> 400", r.status === 400, `status=${r.status}`);
}
{
  const r = await invoke({
    ...validBody(),
    contract: validContract({
      recent_messages: [{ role: "system", content: "x", created_at: "2026-08-17T00:00:00.000Z" }],
    }),
  });
  check("I5. role inválido -> 400", r.status === 400, `status=${r.status}`);
}
{
  const r = await invoke({
    ...validBody(),
    contract: validContract({ memory: { schema_version: "x" } }),
  });
  check("I6. memory malformed -> 400", r.status === 400, `status=${r.status}`);
}
{
  const r = await invoke({
    ...validBody(),
    contract: validContract({ memory: validMemory({ memory_revision: 0 }) }),
  });
  check("I7. memory_revision <= 0 -> 400", r.status === 400, `status=${r.status}`);
}
{
  const r = await invoke({
    ...validBody(),
    contract: validContract({ knowledge_context: {} }),
  });
  check("I8. knowledge_context no-array -> 400", r.status === 400, `status=${r.status}`);
}
{
  const r = await invoke({
    ...validBody(),
    contract: validContract({ knowledge_context: [1] }),
  });
  check("I9. knowledge_context con elemento no-string -> 400", r.status === 400, `status=${r.status}`);
}
{
  const r = await invoke({
    ...validBody(),
    contract: validContract({ contact: { name: null } }),
  });
  check(
    "I10. contact.name === null es válido",
    r.status === 200,
    `status=${r.status} body=${JSON.stringify(r.body?.error || r.body?.intent)}`,
  );
}

// Architectural isolation (principal)
{
  const shadowSrc = fs.readFileSync(SHADOW_PATH, "utf8");
  const seamSrc = fs.readFileSync(SEAM_PATH, "utf8");
  check(
    "A1. shadow no importa/ejecuta outbound WhatsApp",
    !shadowSrc.includes("sendYCloudMessage") && !shadowSrc.includes("send-ycloud-message"),
  );
  check(
    "A2. shadow no importa/ejecuta GHL sync",
    !shadowSrc.includes("syncGHLContact") && !shadowSrc.includes("sync-ghl-contact"),
  );
  check(
    "A3. shadow no persiste contacto/FSM/outbound",
    !shadowSrc.includes("upsertContactState") && !shadowSrc.includes("wa_outbound_messages"),
  );
  check(
    "A4. shadow termina en buildEvaContract + validation",
    shadowSrc.includes("buildEvaContract") && shadowSrc.includes("isValidEvaContractV1Output"),
  );
  check(
    "A5. seam semántico no recibe executors outbound/GHL/persist",
    !seamSrc.includes("sendYCloudMessage") &&
      !seamSrc.includes("syncGHLContact") &&
      !seamSrc.includes("upsertContactState"),
  );
}

// Productive wrapper fills config/catalogSot
{
  const inbound = (await import(pathToFileURL(INBOUND_PATH).href)).default;
  let thrown = null;
  let result = null;
  try {
    result = await inbound.runEvaSemanticTurn({
      rawText: "hola",
      academicState: {},
      contactContext: {},
      prevContact: null,
      fallbackCount: 0,
      nowIso: "2026-08-17T00:00:00.000Z",
      loadJourneyContext: async () => ({}),
    });
  } catch (err) {
    thrown = err;
  }
  check(
    "W1. wrapper productivo sin input.config ni catalogSot no falla por config undefined",
    thrown === null && result && result.decision && typeof result.decision.intent === "string",
    thrown ? String(thrown?.stack || thrown) : JSON.stringify(result?.decision),
  );
}

console.log("");
if (failures > 0) {
  console.error(`Eva Runtime SHADOW: ${failures} FALLO(S).`);
  process.exit(1);
}
console.log("Eva Runtime SHADOW: OK — todas las verificaciones pasaron.");
