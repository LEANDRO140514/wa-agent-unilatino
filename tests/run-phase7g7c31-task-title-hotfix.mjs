#!/usr/bin/env node
/**
 * Phase 7G.7C.3.1 — resolveGhlTaskTitle hotfix regression tests.
 * Usage: node tests/run-phase7g7c31-task-title-hotfix.mjs
 */

import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const HANDLER_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");
const GATE_PATH = path.join(ROOT, "insforge/functions/lib/ghl-relevance-gate.js");
const POLICY_PATH = path.join(ROOT, "insforge/functions/lib/ghl-sync-policy.js");

if (!globalThis.Deno) {
  globalThis.Deno = { env: { get: (key) => process.env[key] } };
}

const handler = (await import(pathToFileURL(HANDLER_PATH).href)).default;
const gate = await import(pathToFileURL(GATE_PATH).href);
const policy = await import(pathToFileURL(POLICY_PATH).href);

const { resolveGhlTaskTitle, buildGHLDryRunPayload, shouldCreateTaskDryRun } = handler;
const baseConfig = handler.getConfig();
const relevanceConfig = handler.buildGhlRelevanceConfigFromHandlerConfig(baseConfig);

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

function nonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

console.log("7G.7C.3.1 resolveGhlTaskTitle hotfix\n");

// --- Pure function cases ---
{
  const title = resolveGhlTaskTitle({
    intent: "carrera_interes",
    ghlHumanHandoffReason: "cost_or_tuition_requires_validation",
    ghlRoutingReason: "cost_signal_requires_human_validation",
    ghlWouldCreateTask: true,
  });
  assertCase(
    "A-cost-handoff-title",
    nonEmptyString(title) && title.includes("costo"),
    title
  );
}

{
  const title = resolveGhlTaskTitle({
    intent: "carrera_interes",
    ghlRoutingReason: "cost_signal_requires_human_validation",
  });
  assertCase("B-cost-routing-only", nonEmptyString(title), title);
}

{
  const title = resolveGhlTaskTitle({ intent: "humano" });
  assertCase(
    "C-humano-intent-unchanged",
    title === "Atender lead WhatsApp — Solicita asesor",
    title
  );
}

{
  const title = resolveGhlTaskTitle({
    intent: "carrera_interes",
    ghlWouldCreateTask: true,
  });
  assertCase("D-gate-generic-fallback", nonEmptyString(title), title);
}

{
  const title = resolveGhlTaskTitle({ intent: "carrera_interes" });
  assertCase("E-carrera-no-task-null", title === null, String(title));
}

// --- Gate + dry-run payload integration (no GHL live) ---
{
  const messageText = "Cuánto cuesta Derecho en línea?";
  const intentDecision = handler.classifyIntent(messageText, baseConfig, {});
  const rd = gate.evaluateGhlRelevance({
    messageText,
    intent: intentDecision.intent,
    intentDecision,
    contactContext: {},
    source: "organic",
    config: relevanceConfig,
    env: {},
    academicResult: {
      academic_intent: "career_detail",
      academic_enriched: true,
      academic_confidence: 1,
    },
  });
  const cfg = { ...baseConfig, ghlSyncPolicy: "qualified_only", ghlSyncMode: "dry_run" };
  const auth = policy.resolveGhlSyncAuthorization({
    config: cfg,
    relevanceDecision: rd,
    allowlist: handler.resolveGhlLiveAllowlist(cfg, "+529991525583"),
  });
  const ctx = policy.enrichGhlSyncContext(
    {
      inboundId: "in-cost",
      normalizedPhone: "+529991525583",
      intent: intentDecision.intent,
      messageText,
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
    rd,
    auth
  );
  assertCase(
    "F-gate-would-create-task",
    rd.would_create_task === true &&
      rd.routing_reason === "cost_signal_requires_human_validation",
    JSON.stringify({ task: rd.would_create_task, routing: rd.routing_reason })
  );
  assertCase(
    "G-dryrun-should-create-task",
    shouldCreateTaskDryRun(ctx) === true,
    String(shouldCreateTaskDryRun(ctx))
  );
  const dry = buildGHLDryRunPayload(ctx, "existing-contact-id", { fieldMap: null });
  assertCase(
    "H-dryrun-task-title-non-empty",
    nonEmptyString(dry.task?.title),
    dry.task?.title
  );
}

console.log(`\n7G.7C.3.1 task title hotfix: ${pass}/${pass + fail} PASS`);
if (fail > 0) process.exitCode = 1;
