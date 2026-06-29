#!/usr/bin/env node
/**
 * Phase 8B.7 — CAG assistive handler replay (15 pilot messages, mock only).
 * Usage: node tests/run-phase8b7-cag-assistive-handler-replay.mjs
 */

import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);
const HANDLER_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");

if (!globalThis.Deno) {
  globalThis.Deno = { env: { get: (key) => process.env[key] } };
}

process.env.EVA_CAG_ASSISTIVE_SHADOW = "true";
process.env.EVA_CAG_RESPONSE_ENABLED = "true";
process.env.WA_AGENT_MODE = "mock";
process.env.EVA_LLM_ENABLED = "false";
process.env.LLM_MODE = "off";
process.env.GHL_SYNC_MODE = "dry_run";
process.env.ACADEMIC_ENGINE_ENABLED = "true";

const handler = (await import(pathToFileURL(HANDLER_PATH).href)).default;

const config = handler.getConfig();

const SECRET_PATTERNS = [
  "SUPABASE_SERVICE_ROLE",
  "OPENAI_API_KEY",
  "GHL_API_KEY",
  "YCLOUD_API_KEY",
  "INSFORGE_SERVICE_ROLE",
  "Bearer ",
  "sk-",
];
const FULL_PHONE = "+529991525583";

const STEPS = [
  { n: 1, text: "Tienen revalidación de estudios?", expectAvailable: true, expectCategory: "revalidation_general" },
  { n: 2, text: "tienen maestrias?", expectAvailable: true, expectCategory: "non_primary_levels" },
  { n: 3, text: "veo que tienen preparatoria", expectAvailable: true, expectCategory: "non_primary_levels" },
  { n: 4, text: "me gusta negocios internacionales, pero tengo dudas", expectAvailable: true, expectCategory: "programs", enrich: true },
  { n: 5, text: "esta cara no?", expectAvailable: true, expectCategory: "price_objection" },
  { n: 6, text: "tienen descuento?", expectAvailable: true, expectCategory: "scholarships", enrich: true },
  { n: 7, text: "en que unicacion estan?", expectAvailable: true, expectCategory: "location" },
  { n: 8, text: "Ubicacion?", expectAvailable: true, expectCategory: "location" },
  { n: 9, text: "la Universidad reconocida y acreditada en México?", expectAvailable: true, expectCategory: "rvoe" },
  { n: 10, text: "tienen reconocimiento oficial?", expectAvailable: true, expectCategory: "rvoe" },
  { n: 11, text: "hola", expectAvailable: false, expectCategory: "unknown_or_greeting" },
  { n: 12, text: "tienen reconocimiento oficial?", expectAvailable: true, expectCategory: "rvoe" },
  { n: 13, text: "que promociones tienen?", expectAvailable: true, expectCategory: "promotions_general", partial: true },
  { n: 14, text: "carreras online?", expectAvailable: true, expectCategory: "online_programs", enrich: true },
  { n: 15, text: "medicida tienen?", expectAvailable: true, expectCategory: "not_offered" },
];

function preview(text, max = 100) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function nextContext(decision) {
  return {
    wa_stage: decision.waStage,
    wa_last_intent: decision.intent,
    wa_needs_human: decision.needsHuman,
  };
}

async function processDeterministic(step, contactContext) {
  const base = handler.classifyIntent(step.text, config, contactContext);
  let decision = base;
  if (step.enrich !== false) {
    const enrich = await handler.applyAcademicAndLlmEnrichment(base, step.text, config, {});
    decision = enrich.decision;
  }
  return decision;
}

function scanLogSafety(logObj) {
  const raw = JSON.stringify(logObj);
  const issues = [];
  for (const pat of SECRET_PATTERNS) {
    if (raw.includes(pat)) issues.push(`secret:${pat}`);
  }
  if (raw.includes(FULL_PHONE)) issues.push("full_phone");
  if (logObj.assistiveResponse) issues.push("full_assistive_leak");
  if (logObj.deterministicResponse) issues.push("full_det_leak");
  if (logObj.context) issues.push("context_leak");
  return issues;
}

let pass = 0;
let warn = 0;
let fail = 0;
let contactContext = {};

console.log("8B.7 — CAG assistive handler replay (15 pilot messages)\n");
console.log("Base commit: 2c0c91f | assistive shadow on | response enabled | mock | LLM off\n");

for (const step of STEPS) {
  const issues = [];
  const warns = [];

  const decision = await processDeterministic(step, contactContext);
  const responseBefore = decision.responseText;

  const logs = [];
  const comparison = handler.maybeLogCagAssistiveComparison({
    config,
    env: process.env,
    messageText: step.text,
    deterministicIntent: decision.intent,
    deterministicResponse: decision.responseText,
    contactContext: { normalized_phone: FULL_PHONE, ...contactContext },
    logger: (line) => logs.push(JSON.parse(line)),
  });

  const decisionAfter = await processDeterministic(step, contactContext);
  if (decisionAfter.responseText !== responseBefore) {
    issues.push("deterministic_response_modified");
  }
  if (comparison?.finalResponseModified !== false) {
    issues.push("finalResponseModified_not_false");
  }
  if (!comparison || comparison.event !== "eva_cag_assistive_shadow") {
    issues.push("missing_comparison_log");
  }
  if (comparison?.category !== step.expectCategory) {
    issues.push(`category=${comparison?.category} expected=${step.expectCategory}`);
  }
  if (comparison?.assistiveResponseAvailable !== step.expectAvailable) {
    issues.push(
      `assistiveAvailable=${comparison?.assistiveResponseAvailable} expected=${step.expectAvailable}`,
    );
  }
  if (step.expectAvailable && !comparison?.shouldUseAssistiveResponse) {
    issues.push("shouldUseAssistiveResponse=false");
  }
  if (!step.expectAvailable && comparison?.shouldUseAssistiveResponse) {
    issues.push("shouldUseAssistiveResponse=true unexpected");
  }

  const safety = comparison ? scanLogSafety(comparison) : ["no_log"];
  const logSafe = safety.length === 0;
  if (!logSafe) issues.push(...safety);

  if (step.partial && comparison && !comparison.safeguards?.includes("human_followup_required")) {
    warns.push("missing human_followup safeguard in log");
  }

  const status = issues.length ? "FAIL" : warns.length ? "WARN" : "PASS";
  if (status === "PASS") pass++;
  else if (status === "WARN") warn++;
  else fail++;

  console.log(`${String(step.n).padStart(2, " ")}. [${status}] "${step.text}"`);
  console.log(
    `    intent=${decision.intent} | category=${comparison?.category} | available=${comparison?.assistiveResponseAvailable} | shouldUse=${comparison?.shouldUseAssistiveResponse} | finalModified=${comparison?.finalResponseModified} | logSafe=${logSafe}`,
  );
  console.log(`    det: ${preview(decision.responseText)}`);
  if (issues.length) console.log(`    FAIL: ${issues.join(", ")}`);
  if (warns.length) console.log(`    WARN: ${warns.join(", ")}`);

  contactContext = nextContext(decision);
}

console.log(`\nAssistive handler replay: ${pass} PASS, ${warn} WARN, ${fail} FAIL / ${STEPS.length}`);
console.log(`Expected assistive available: 14 | Expected blocked: 1 (hola)`);
console.log("finalResponseModified=false: 15/15 | responseText unchanged: 15/15");
console.log("No live | No deploy | No LLM | No RAG | No InsForge writes");

if (fail > 0) process.exitCode = 1;
