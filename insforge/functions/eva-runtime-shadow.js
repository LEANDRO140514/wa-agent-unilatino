/**
 * Eva Runtime SHADOW v1.
 *
 * POST JSON { contract, runtime_context } → EvaContractV1Output directo.
 * READ-ONLY lookup de wa_contacts_state. STOP antes de side effects.
 *
 * applyAcademicAndLlmEnrichment pertenece al cerebro Eva. Si
 * EVA_LLM_ENABLED=true el default productivo puede hacer egress LLM
 * semántico. Eso no es persistencia operacional (WhatsApp/GHL/FSM/outbound).
 */

import { buildEvaContract, EVA_CONTRACT_VERSION } from "./lib/eva-contract/adapter.js";

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const MEMORY_UPDATE_KEYS = new Set([
  "career_key",
  "modality_key",
  "admission_stage",
  "last_intent",
  "last_objection",
  "suggested_next_step",
]);

const ACTION_TYPES = new Set([
  "handoff_human",
  "schedule_requested",
  "follow_up_requested",
  "qualification_complete",
  "no_action",
]);

const INTENT_STATUSES = new Set(["known", "ambiguous", "unknown"]);
const QUALIFICATION_STATUSES = new Set(["known", "partial", "ambiguous", "unknown"]);
const MODALITY_KEYS = new Set(["presencial", "en_linea"]);
const HANDOFF_REASONS = new Set([
  "explicit_request",
  "frustration",
  "low_confidence",
  "policy",
  "out_of_scope",
  "other",
]);
const MESSAGE_ROLES = new Set(["user", "assistant", "human"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getEnv(key) {
  if (typeof Deno !== "undefined" && Deno.env?.get) {
    const v = Deno.env.get(key);
    if (v != null) return v;
  }
  return typeof process !== "undefined" ? process.env[key] : undefined;
}

function jsonError(status, error) {
  return new Response(JSON.stringify({ error }), { status, headers: DEFAULT_HEADERS });
}

function timingSafeEqualString(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  const max = Math.max(left.length, right.length);
  let out = left.length === right.length ? 0 : 1;
  for (let i = 0; i < max; i++) {
    out |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  }
  return out === 0;
}

function readBearer(request) {
  const header = request.headers.get("Authorization") || "";
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : "";
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function contractHasPhone(contract) {
  if (!isPlainObject(contract)) return true;
  if (contract.phone != null || contract.normalized_phone != null) return true;
  if (isPlainObject(contract.contact)) {
    if (contract.contact.phone != null || contract.contact.normalized_phone != null) return true;
  }
  return false;
}

function isUuid(v) {
  return typeof v === "string" && UUID_RE.test(v);
}

function exactKeys(obj, keys) {
  if (!isPlainObject(obj)) return false;
  const actual = Object.keys(obj);
  return actual.length === keys.length && keys.every((k) => Object.hasOwn(obj, k));
}

function isScalar(v) {
  return v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean";
}

function isConfidence(v) {
  if (v === null) return true;
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
}

function isEvidenceArray(list) {
  if (!Array.isArray(list)) return false;
  return list.every(
    (item) =>
      exactKeys(item, ["text", "source_message_index"]) &&
      typeof item.text === "string" &&
      Number.isInteger(item.source_message_index) &&
      item.source_message_index >= 0,
  );
}

function latestUserMessageFrom(recentMessages) {
  if (!Array.isArray(recentMessages)) return null;
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const msg = recentMessages[i];
    if (!msg || msg.role !== "user") continue;
    if (typeof msg.content !== "string") continue;
    const text = msg.content.trim();
    if (text) return text;
  }
  return null;
}

function parseAcademicState(raw) {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function isValidEvaContractV1Output(contract) {
  if (
    !exactKeys(contract, [
      "contract_version",
      "reply",
      "intent",
      "qualification",
      "handoff",
      "memory_updates",
      "proposed_actions",
    ])
  ) {
    return false;
  }
  if (contract.contract_version !== EVA_CONTRACT_VERSION) return false;
  if (typeof contract.reply !== "string") return false;

  const intent = contract.intent;
  if (!exactKeys(intent, ["key", "status", "confidence", "evidence"])) return false;
  if (!(intent.key === null || typeof intent.key === "string")) return false;
  if (!INTENT_STATUSES.has(intent.status)) return false;
  if (!isConfidence(intent.confidence)) return false;
  if (!isEvidenceArray(intent.evidence)) return false;

  const qualification = contract.qualification;
  if (
    !exactKeys(qualification, ["career_key", "modality_key", "status", "confidence", "evidence"])
  ) {
    return false;
  }
  if (!(qualification.career_key === null || typeof qualification.career_key === "string")) return false;
  if (
    !(
      qualification.modality_key === null ||
      MODALITY_KEYS.has(qualification.modality_key)
    )
  ) {
    return false;
  }
  if (!QUALIFICATION_STATUSES.has(qualification.status)) return false;
  if (!isConfidence(qualification.confidence)) return false;
  if (!isEvidenceArray(qualification.evidence)) return false;

  const handoff = contract.handoff;
  if (!exactKeys(handoff, ["requested", "reason", "note"])) return false;
  if (typeof handoff.requested !== "boolean") return false;
  if (handoff.requested === true) {
    if (!HANDOFF_REASONS.has(handoff.reason)) return false;
  } else if (handoff.reason !== null) {
    return false;
  }
  if (!(handoff.note === null || typeof handoff.note === "string")) return false;

  if (!Array.isArray(contract.memory_updates)) return false;
  for (const update of contract.memory_updates) {
    if (!exactKeys(update, ["section", "key", "value", "evidence"])) return false;
    if (update.section !== "business_state") return false;
    if (!MEMORY_UPDATE_KEYS.has(update.key)) return false;
    if (!isScalar(update.value)) return false;
    if (update.evidence !== null) return false;
  }

  if (!Array.isArray(contract.proposed_actions) || contract.proposed_actions.length === 0) {
    return false;
  }
  const types = [];
  for (const action of contract.proposed_actions) {
    if (
      !exactKeys(action, ["type", "reason", "preferred_date", "preferred_time_window", "note"])
    ) {
      return false;
    }
    if (!ACTION_TYPES.has(action.type)) return false;
    if (!(action.reason === null || typeof action.reason === "string")) return false;
    if (!(action.preferred_date === null || typeof action.preferred_date === "string")) return false;
    if (
      !(
        action.preferred_time_window === null ||
        typeof action.preferred_time_window === "string"
      )
    ) {
      return false;
    }
    if (!(action.note === null || typeof action.note === "string")) return false;
    types.push(action.type);
  }
  if (types.includes("no_action") && types.length !== 1) return false;
  if (Boolean(types.includes("handoff_human")) !== Boolean(handoff.requested)) return false;
  return true;
}

function validateMemory(memory) {
  if (!isPlainObject(memory)) return "malformed_memory";
  if (typeof memory.schema_version !== "string") return "malformed_memory";
  if (!Number.isInteger(memory.memory_revision) || memory.memory_revision <= 0) {
    return "invalid_memory_revision";
  }
  if (!isPlainObject(memory.business_state)) return "malformed_memory";
  if (typeof memory.relationship_summary !== "string") return "malformed_memory";
  if (!isPlainObject(memory.relationship_facts)) return "malformed_memory";
  if (!Array.isArray(memory.recent_events)) return "malformed_memory";
  return null;
}

function validateRecentMessages(recentMessages) {
  if (!Array.isArray(recentMessages)) return "missing_recent_messages";
  for (const item of recentMessages) {
    if (!isPlainObject(item)) return "invalid_recent_message";
    if (!MESSAGE_ROLES.has(item.role)) return "invalid_message_role";
    if (typeof item.content !== "string") return "invalid_message_content";
    if (typeof item.created_at !== "string") return "invalid_message_created_at";
  }
  return null;
}

function validateShadowInput(payload) {
  if (!isPlainObject(payload)) return "invalid_json";
  const runtime = payload.runtime_context;
  if (!isPlainObject(runtime)) return "missing_runtime_context";
  if (runtime.mode !== "shadow") return "mode_must_be_shadow";
  if (!isNonEmptyString(runtime.normalized_phone)) return "missing_normalized_phone";

  const contract = payload.contract;
  if (!isPlainObject(contract)) return "missing_contract";
  if (contract.contract_version !== EVA_CONTRACT_VERSION) return "invalid_contract_version";
  if (contractHasPhone(contract)) return "phone_must_not_be_in_contract";
  if (!isUuid(contract.workspace_id)) return "invalid_workspace_id";
  if (!isUuid(contract.conversation_id)) return "invalid_conversation_id";
  if (!isPlainObject(contract.contact)) return "missing_contact";
  if (!isUuid(contract.contact.contact_id)) return "invalid_contact_id";
  if (!(contract.contact.name === null || typeof contract.contact.name === "string")) {
    return "invalid_contact_name";
  }
  const messagesError = validateRecentMessages(contract.recent_messages);
  if (messagesError) return messagesError;
  const memoryError = validateMemory(contract.memory);
  if (memoryError) return memoryError;
  if (!Array.isArray(contract.knowledge_context)) return "invalid_knowledge_context";
  if (!contract.knowledge_context.every((item) => typeof item === "string")) {
    return "invalid_knowledge_context_item";
  }
  return null;
}

async function defaultLookupContactState(normalizedPhone) {
  const { createReadOnlyClient } = await import("./lib/eva-runtime/read-only-client.js");
  const client = await createReadOnlyClient();
  const { data, error } = await client.database
    .from("wa_contacts_state")
    .select(
      "wa_stage, wa_last_intent, wa_needs_human, academic_state, fsm_state, closed_by_agent, updated_at, fallback_count, wa_last_outbound_text, menu_state, menu_version, menu_last_action, menu_updated_at, eva_fuente_lead, eva_metodo_captura, eva_contexto_entrada, eva_ultimo_touch, eva_tema_atencion, eva_estado_journey, eva_siguiente_accion",
    )
    .eq("normalized_phone", normalizedPhone)
    .maybeSingle();
  if (error) throw new Error(`Lookup wa_contacts_state: ${error.message || String(error)}`);
  return data || null;
}

async function defaultRunSemanticTurn(input) {
  const inbound = (await import("./ycloud-wa-inbound.js")).default;
  if (typeof inbound.runEvaSemanticTurn !== "function") {
    throw new Error("runEvaSemanticTurn is not exported from ycloud-wa-inbound");
  }
  return inbound.runEvaSemanticTurn(input);
}

function contactContextFromRow(row) {
  if (!row) return {};
  return {
    wa_stage: row.wa_stage,
    wa_last_intent: row.wa_last_intent,
    wa_needs_human: row.wa_needs_human,
    fsm_state: row.fsm_state || null,
    closed_by_agent: row.closed_by_agent === true,
    updated_at: row.updated_at || null,
    fallback_count: row.fallback_count,
  };
}

export async function handleEvaRuntimeShadow(request, deps = {}) {
  if (request.method !== "POST") {
    return jsonError(405, "method_not_allowed");
  }

  const expectedToken = (deps.getBridgeToken || (() => getEnv("ALGORITHMUS_EVA_BRIDGE_TOKEN")))();
  const provided = readBearer(request);
  if (!expectedToken || !provided || !timingSafeEqualString(expectedToken, provided)) {
    return jsonError(401, "unauthorized");
  }

  let payload;
  try {
    payload = JSON.parse(await request.text());
  } catch {
    return jsonError(400, "invalid_json");
  }

  const inputError = validateShadowInput(payload);
  if (inputError) return jsonError(400, inputError);

  const latestUserMessage = latestUserMessageFrom(payload.contract.recent_messages);
  if (!latestUserMessage) return jsonError(400, "missing_user_message");

  const normalizedPhone = payload.runtime_context.normalized_phone.trim();
  const lookupContactState = deps.lookupContactState || defaultLookupContactState;
  const runSemanticTurn = deps.runSemanticTurn || defaultRunSemanticTurn;
  const buildContract = deps.buildEvaContract || buildEvaContract;

  let prevContact = null;
  try {
    prevContact = await lookupContactState(normalizedPhone);
  } catch {
    return jsonError(500, "contact_lookup_failed");
  }

  const academicState = parseAcademicState(prevContact?.academic_state);
  const contactContext = contactContextFromRow(prevContact);
  const fallbackCount =
    prevContact?.fallback_count != null
      ? Number(prevContact.fallback_count) || 0
      : Number(academicState?.fallback_count) || 0;

  const semantic = await runSemanticTurn({
    rawText: latestUserMessage,
    academicState,
    contactContext,
    prevContact,
    fallbackCount,
    nowIso: new Date().toISOString(),
    loadJourneyContext: async () => prevContact || {},
  });

  const contractOutput = buildContract({
    decision: semantic?.decision || {},
    academicState: semantic?.academicState || {},
    academicMeta: semantic?.academicMeta || null,
    latestUserMessage,
  });

  if (!isValidEvaContractV1Output(contractOutput)) {
    return jsonError(422, "invalid_eva_contract_output");
  }

  return new Response(JSON.stringify(contractOutput), {
    status: 200,
    headers: DEFAULT_HEADERS,
  });
}

export default async function handler(request) {
  return handleEvaRuntimeShadow(request);
}
