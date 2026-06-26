#!/usr/bin/env node
/**
 * Phase 7G.7C.1 — Qualified sync policy wiring (local).
 * Usage: node tests/run-phase7g7c-qualified-sync.mjs
 */

import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GATE_PATH = path.join(ROOT, "insforge/functions/lib/ghl-relevance-gate.js");
const POLICY_PATH = path.join(ROOT, "insforge/functions/lib/ghl-sync-policy.js");
const HANDLER_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");
const MOCK_DB_PATH = path.join(ROOT, "insforge/functions/lib/test/mock-insforge-client.js");

if (!globalThis.Deno) {
  globalThis.Deno = { env: { get: (key) => process.env[key] } };
}

const gate = await import(pathToFileURL(GATE_PATH).href);
const policy = await import(pathToFileURL(POLICY_PATH).href);
const handler = (await import(pathToFileURL(HANDLER_PATH).href)).default;
const { resetMockInsforgeStore, getMockInsforgeStore } = await import(
  pathToFileURL(MOCK_DB_PATH).href
);

const baseConfig = handler.getConfig();
const relevanceConfig = handler.buildGhlRelevanceConfigFromHandlerConfig(baseConfig);
const ALLOWED = "+529991525583";
const BLOCKED = "+529991525599";

function configWith(overrides = {}) {
  return { ...baseConfig, ...overrides };
}

function allowlistFor(phone, syncMode = "live") {
  return handler.resolveGhlLiveAllowlist(
    configWith({ ghlSyncMode: syncMode, ghlLiveAllowedPhones: [ALLOWED] }),
    phone
  );
}

function evaluate(input, extra = {}) {
  const intentDecision =
    extra.intentDecision ||
    handler.classifyIntent(input.messageText, baseConfig, input.contactContext || {});
  return gate.evaluateGhlRelevance({
    ...input,
    intent: extra.intent ?? intentDecision.intent,
    intentDecision,
    firstMessage: input.firstMessage,
    academicResult: input.academicResult,
    config: relevanceConfig,
    env: {},
  });
}

let pass = 0;
let fail = 0;

function assertCase(id, ok, detail = "") {
  if (ok) {
    pass++;
    console.log(`PASS ${id}`);
  } else {
    fail++;
    console.log(`FAIL ${id}${detail ? `: ${detail}` : ""}`);
  }
}

console.log("7G.7C.1 Qualified sync policy wiring\n");

// --- Policy authorization unit cases ---
{
  const cfg = configWith({ ghlSyncPolicy: "none", ghlSyncMode: "dry_run" });
  const auth = policy.resolveGhlSyncAuthorization({
    config: cfg,
    relevanceDecision: evaluate({ messageText: "Hola", contactContext: {}, source: "organic" }),
    allowlist: allowlistFor(ALLOWED, "dry_run"),
  });
  assertCase(
    "A-policy-none-dry-run-legacy",
    auth.shouldSync === true && auth.governedByGate === false,
    JSON.stringify(auth)
  );
}

{
  const cfg = configWith({ ghlSyncPolicy: "none", ghlSyncMode: "live" });
  const auth = policy.resolveGhlSyncAuthorization({
    config: cfg,
    relevanceDecision: evaluate({
      messageText: "Me interesa Derecho online",
      contactContext: {},
      source: "organic",
    }),
    allowlist: allowlistFor(ALLOWED),
  });
  assertCase(
    "B-policy-none-live-blocks",
    auth.shouldSync === false && auth.blockReason === "policy_none",
    JSON.stringify(auth)
  );
}

{
  const rd = evaluate({ messageText: "Hola", contactContext: {}, source: "organic" });
  const cfg = configWith({ ghlSyncPolicy: "qualified_only", ghlSyncMode: "dry_run" });
  const auth = policy.resolveGhlSyncAuthorization({
    config: cfg,
    relevanceDecision: rd,
    allowlist: allowlistFor(ALLOWED, "dry_run"),
  });
  assertCase(
    "C-qualified-saludo-blocks",
    auth.shouldSync === false && auth.governedByGate === true,
    JSON.stringify(auth)
  );
}

{
  const rd = evaluate({
    messageText: "Me interesa Derecho online",
    contactContext: {},
    source: "organic",
  });
  const cfg = configWith({ ghlSyncPolicy: "qualified_only", ghlSyncMode: "dry_run" });
  const auth = policy.resolveGhlSyncAuthorization({
    config: cfg,
    relevanceDecision: rd,
    allowlist: allowlistFor(ALLOWED, "dry_run"),
  });
  const ctx = policy.enrichGhlSyncContext({ intent: "carrera_interes" }, rd, auth);
  assertCase(
    "D-qualified-carrera-sync-no-task",
    auth.shouldSync === true &&
      auth.governedByGate === true &&
      rd.would_create_task === false &&
      ctx.ghlWouldCreateTask === false,
    JSON.stringify({ auth, task: rd.would_create_task })
  );
}

{
  const rd = evaluate({
    messageText: "Cuánto cuesta Derecho en línea?",
    contactContext: {},
    source: "organic",
    academicResult: {
      academic_intent: "career_detail",
      academic_enriched: true,
      academic_confidence: 1,
    },
  });
  const cfg = configWith({ ghlSyncPolicy: "qualified_only", ghlSyncMode: "dry_run" });
  const auth = policy.resolveGhlSyncAuthorization({
    config: cfg,
    relevanceDecision: rd,
    allowlist: allowlistFor(ALLOWED, "dry_run"),
  });
  assertCase(
    "E-qualified-costo-task-handoff",
    auth.shouldSync === true &&
      rd.would_create_task === true &&
      rd.human_handoff_reason === "cost_or_tuition_requires_validation" &&
      rd.routing_reason === "cost_signal_requires_human_validation",
    JSON.stringify(rd)
  );
}

{
  const rd = evaluate({
    messageText: "Quiero hablar con un asesor",
    contactContext: {},
    source: "organic",
  });
  const cfg = configWith({ ghlSyncPolicy: "qualified_only", ghlSyncMode: "live" });
  const auth = policy.resolveGhlSyncAuthorization({
    config: cfg,
    relevanceDecision: rd,
    allowlist: allowlistFor(BLOCKED),
  });
  assertCase(
    "F-qualified-live-no-allowlist",
    auth.shouldSync === false && auth.blockReason === "blocked_allowlist_phone",
    JSON.stringify(auth)
  );
}

{
  const rd = evaluate({
    messageText: "Me interesa Derecho online",
    contactContext: {},
    source: "organic",
  });
  const cfg = configWith({
    ghlSyncPolicy: "qualified_only",
    ghlSyncMode: "live",
    ghlLiveAllowedPhones: [ALLOWED],
  });
  const auth = policy.resolveGhlSyncAuthorization({
    config: cfg,
    relevanceDecision: rd,
    allowlist: allowlistFor(ALLOWED),
  });
  assertCase(
    "G-qualified-live-allowlist-carrera",
    auth.shouldSync === true && auth.governedByGate === true,
    JSON.stringify(auth)
  );
}

{
  const rd = evaluate({
    messageText: "Gracias",
    contactContext: { wa_needs_human: true, wa_stage: "asesor_requerido" },
    source: "organic",
    intent: "agradecimiento",
    intentDecision: { intent: "agradecimiento" },
  });
  const cfg = configWith({ ghlSyncPolicy: "qualified_only", ghlSyncMode: "dry_run" });
  const auth = policy.resolveGhlSyncAuthorization({
    config: cfg,
    relevanceDecision: rd,
    allowlist: allowlistFor(ALLOWED, "dry_run"),
  });
  assertCase(
    "H-post-escalacion-gracias-no-sync",
    auth.shouldSync === false &&
      rd.routing_reason === "post_escalation_closure_no_sync" &&
      rd.would_create_task === false,
    JSON.stringify(rd)
  );
}

{
  const rd = evaluate({
    messageText: "Hola",
    contactContext: {},
    source: "meta_ads",
    firstMessage: true,
    academicResult: { academic_intent: "greeting", academic_enriched: true },
  });
  const cfg = configWith({ ghlSyncPolicy: "qualified_only", ghlSyncMode: "dry_run" });
  const auth = policy.resolveGhlSyncAuthorization({
    config: cfg,
    relevanceDecision: rd,
    allowlist: allowlistFor(ALLOWED, "dry_run"),
  });
  assertCase(
    "I-meta-ads-primer-saludo-no-sync",
    auth.shouldSync === false &&
      rd.routing_reason === "meta_ads_first_message_no_sync" &&
      rd.ignored_for_ghl === true,
    JSON.stringify(rd)
  );
}

{
  const rd = evaluate({
    messageText: "Quiero inscribirme esta semana",
    contactContext: {},
    source: "organic",
  });
  const cfg = configWith({ ghlSyncPolicy: "qualified_only", ghlSyncMode: "dry_run" });
  const auth = policy.resolveGhlSyncAuthorization({
    config: cfg,
    relevanceDecision: rd,
    allowlist: allowlistFor(ALLOWED, "dry_run"),
  });
  assertCase(
    "J-inscripcion-task",
    auth.shouldSync === true && rd.would_create_task === true,
    JSON.stringify(rd)
  );
}

{
  const cfg = configWith({ ghlSyncPolicy: "all", ghlSyncMode: "live" });
  const auth = policy.resolveGhlSyncAuthorization({
    config: cfg,
    relevanceDecision: evaluate({
      messageText: "Hola",
      contactContext: {},
      source: "organic",
    }),
    allowlist: allowlistFor(BLOCKED),
  });
  assertCase(
    "K-policy-all-live-no-allowlist",
    auth.shouldSync === false && auth.governedByGate === false,
    JSON.stringify(auth)
  );
}

// --- Handler integration: dry_run + qualified_only ---
resetMockInsforgeStore();
const client = (await import(pathToFileURL(MOCK_DB_PATH).href)).getMockInsforgeClient();
const carreraRd = evaluate({
  messageText: "Me interesa Derecho online",
  contactContext: {},
  source: "organic",
});
const qualifiedCfg = configWith({ ghlSyncPolicy: "qualified_only", ghlSyncMode: "dry_run" });
const carreraAuth = policy.resolveGhlSyncAuthorization({
  config: qualifiedCfg,
  relevanceDecision: carreraRd,
  allowlist: allowlistFor(ALLOWED, "dry_run"),
});
const carreraCtx = policy.enrichGhlSyncContext(
  {
    inboundId: "in-1",
    normalizedPhone: ALLOWED,
    intent: "carrera_interes",
    messageText: "Me interesa Derecho online",
    responseText: "Respuesta Eva",
    waStage: "carrera_interes",
    waSummary: "summary",
    timestamp: new Date().toISOString(),
    priority: "media",
    escalation_required: false,
    operational_owner: "admisiones",
    business_hours_label: "L-V",
    needsHuman: false,
  },
  carreraRd,
  carreraAuth
);
const carreraDry = await handler.syncGHLContact(client, qualifiedCfg, carreraCtx);
assertCase(
  "L-dryrun-qualified-carrera-contact-note",
  carreraDry.dry_run === true &&
    carreraDry.would_create_contact === true &&
    carreraDry.would_create_task === false &&
    carreraDry.would_add_note,
  JSON.stringify(carreraDry)
);

const holaRd = evaluate({ messageText: "Hola", contactContext: {}, source: "organic" });
const holaAuth = policy.resolveGhlSyncAuthorization({
  config: qualifiedCfg,
  relevanceDecision: holaRd,
  allowlist: allowlistFor(ALLOWED, "dry_run"),
});
const holaBlocked = await handler.insertGhlPolicyBlockedResult(
  client,
  qualifiedCfg,
  { inboundId: "in-2", normalizedPhone: ALLOWED, intent: "ambiguo" },
  holaRd,
  holaAuth
);
assertCase(
  "M-policy-blocked-log",
  holaBlocked.policy_blocked === true &&
    holaBlocked.block_reason === holaAuth.blockReason &&
    holaBlocked.would_create_contact === false,
  JSON.stringify(holaBlocked)
);

const store = getMockInsforgeStore();
const blockedLogs = (store.wa_ghl_sync_log || []).filter((row) => row.action === "policy_blocked");
assertCase("N-policy-blocked-db-row", blockedLogs.length >= 1, `rows=${blockedLogs.length}`);

// Default config (policy none + dry_run) still syncs legacy path
resetMockInsforgeStore();
const legacyClient = (await import(pathToFileURL(MOCK_DB_PATH).href)).getMockInsforgeClient();
const legacyCfg = configWith({ ghlSyncPolicy: "none", ghlSyncMode: "dry_run" });
const legacyAuth = policy.resolveGhlSyncAuthorization({
  config: legacyCfg,
  relevanceDecision: holaRd,
  allowlist: allowlistFor(ALLOWED, "dry_run"),
});
const legacyCtx = policy.enrichGhlSyncContext(
  {
    inboundId: "in-3",
    normalizedPhone: ALLOWED,
    intent: "ambiguo",
    messageText: "Hola",
    responseText: "Hola",
    waStage: "inicio",
    waSummary: "summary",
    timestamp: new Date().toISOString(),
    priority: "baja",
    escalation_required: false,
    operational_owner: "admisiones",
    business_hours_label: "L-V",
    needsHuman: false,
  },
  holaRd,
  legacyAuth
);
const legacyDry = await handler.syncGHLContact(legacyClient, legacyCfg, legacyCtx);
assertCase(
  "O-default-none-dry-run-legacy-unchanged",
  legacyAuth.governedByGate === false && legacyDry.dry_run === true,
  JSON.stringify({ auth: legacyAuth, dry: legacyDry.dry_run })
);

console.log(`\n7G.7C.1 qualified sync wiring: ${pass}/${pass + fail} PASS`);
if (fail > 0) process.exitCode = 1;
