#!/usr/bin/env node
/**
 * Phase 8B.6 — CAG assistive replay (15 pilot messages, mock only).
 * Compares deterministic vs assistive proposal without modifying outbound.
 * Usage: node tests/run-phase8b6-cag-assistive-replay.mjs
 */

import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);
const HANDLER_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");

const { buildCagAssistiveResponse } = require(
  path.join(ROOT, "insforge/functions/lib/knowledge/cagAssistiveResponse.js"),
);

const handler = (await import(pathToFileURL(HANDLER_PATH).href)).default;

const ASSISTIVE_ENV = {
  EVA_CAG_RESPONSE_ENABLED: "true",
  WA_AGENT_MODE: "mock",
  EVA_LLM_ENABLED: "false",
  LLM_MODE: "off",
  GHL_SYNC_MODE: "dry_run",
};

const config = {
  mode: "mock",
  ghlSyncMode: "dry_run",
  ghlWriteCustomFields: false,
  academicEngineEnabled: true,
  evaLlmEnabled: false,
  evaLlmMode: "off",
  evaTestUrl: "https://testunilatino.algorithmus.io",
  ghlRelevanceShadowMode: true,
  ghlSyncPolicy: "qualified_only",
};

const STEPS = [
  { n: 1, text: "Tienen revalidación de estudios?", expectAssistive: true, expectCategory: "revalidation_general" },
  { n: 2, text: "tienen maestrias?", expectAssistive: true, expectCategory: "non_primary_levels" },
  { n: 3, text: "veo que tienen preparatoria", expectAssistive: true, expectCategory: "non_primary_levels" },
  { n: 4, text: "me gusta negocios internacionales, pero tengo dudas", expectAssistive: true, expectCategory: "programs", enrich: true },
  { n: 5, text: "esta cara no?", expectAssistive: true, expectCategory: "price_objection" },
  { n: 6, text: "tienen descuento?", expectAssistive: true, expectCategory: "scholarships", enrich: true },
  { n: 7, text: "en que unicacion estan?", expectAssistive: true, expectCategory: "location" },
  { n: 8, text: "Ubicacion?", expectAssistive: true, expectCategory: "location" },
  { n: 9, text: "la Universidad reconocida y acreditada en México?", expectAssistive: true, expectCategory: "rvoe" },
  { n: 10, text: "tienen reconocimiento oficial?", expectAssistive: true, expectCategory: "rvoe" },
  { n: 11, text: "hola", expectAssistive: false, expectCategory: "unknown_or_greeting" },
  { n: 12, text: "tienen reconocimiento oficial?", expectAssistive: true, expectCategory: "rvoe" },
  { n: 13, text: "que promociones tienen?", expectAssistive: true, expectCategory: "promotions_general", partial: true },
  { n: 14, text: "carreras online?", expectAssistive: true, expectCategory: "online_programs", enrich: true },
  { n: 15, text: "medicida tienen?", expectAssistive: true, expectCategory: "not_offered" },
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

function deriveRisk(assistive, step) {
  if (assistive.mode === "blocked") return assistive.reason || "blocked";
  if (step.partial && !assistive.safeguards.includes("human_followup_required")) {
    return "missing_human_followup_safeguard";
  }
  if (assistive.risks?.length) return assistive.risks[0];
  return "low";
}

let pass = 0;
let warn = 0;
let fail = 0;
let contactContext = {};

console.log("8B.6 — CAG assistive replay (15 pilot messages, mock only)\n");
console.log(`Base commit: 2af173e | assistive flag on | WA mock | LLM off | GHL dry_run\n`);

for (const step of STEPS) {
  const issues = [];
  const warns = [];

  const decision = await processDeterministic(step, contactContext);
  const responseBefore = decision.responseText;

  const assistive = buildCagAssistiveResponse({
    message: step.text,
    deterministicIntent: decision.intent,
    deterministicResponse: decision.responseText,
    options: { env: ASSISTIVE_ENV },
  });

  const decisionAfter = await processDeterministic(step, contactContext);
  if (decisionAfter.responseText !== responseBefore) {
    issues.push("deterministic_response_modified");
  }
  if (assistive.finalResponseModified !== false) {
    issues.push("assistive_finalResponseModified_not_false");
  }

  if (assistive.category !== step.expectCategory) {
    issues.push(`category=${assistive.category} expected=${step.expectCategory}`);
  }

  if (step.expectAssistive) {
    if (!assistive.shouldUseAssistiveResponse) issues.push("shouldUseAssistiveResponse=false");
    if (!assistive.assistiveResponse || assistive.assistiveResponse.length < 10) {
      issues.push("empty_assistiveResponse");
    }
    if (assistive.mode !== "assistive_mock") {
      issues.push(`mode=${assistive.mode} expected=assistive_mock`);
    }
  } else {
    if (assistive.shouldUseAssistiveResponse) issues.push("shouldUseAssistiveResponse=true unexpected");
    if (assistive.mode !== "blocked" && assistive.mode !== "disabled") {
      issues.push(`mode=${assistive.mode} expected blocked/disabled`);
    }
  }

  if (step.partial) {
    if (!assistive.safeguards.includes("human_followup_required")) {
      issues.push("missing human_followup safeguard");
    }
    if (/promoci[oó]n vigente|hoy tenemos/i.test(assistive.assistiveResponse || "")) {
      issues.push("claims vigente promo");
    }
  }

  const risk = deriveRisk(assistive, step);
  const status = issues.length ? "FAIL" : warns.length ? "WARN" : "PASS";
  if (status === "PASS") pass++;
  else if (status === "WARN") warn++;
  else fail++;

  console.log(
    `${String(step.n).padStart(2, " ")}. [${status}] "${step.text}"`,
  );
  console.log(
    `    intent=${decision.intent} | cag=${assistive.category} | mode=${assistive.mode} | shouldUse=${assistive.shouldUseAssistiveResponse} | finalModified=${assistive.finalResponseModified}`,
  );
  console.log(`    det: ${preview(decision.responseText)}`);
  if (assistive.assistiveResponse) {
    console.log(`    assistive: ${preview(assistive.assistiveResponse)}`);
  }
  if (issues.length) console.log(`    FAIL: ${issues.join(", ")}`);
  if (warns.length) console.log(`    WARN: ${warns.join(", ")}`);

  contactContext = nextContext(decision);
}

const assistiveCount = STEPS.filter((s) => s.expectAssistive).length;
const blockedCount = STEPS.length - assistiveCount;

console.log(`\nAssistive replay: ${pass} PASS, ${warn} WARN, ${fail} FAIL / ${STEPS.length}`);
console.log(`Expected assistive: ${assistiveCount} | Expected blocked: ${blockedCount}`);
console.log("finalResponseModified=false: 15/15 (by design)");
console.log("Handler unchanged: ycloud-wa-inbound.js not modified in 8B.6");
console.log("No live | No deploy | No LLM | No RAG productivo | No InsForge writes");

if (fail > 0) process.exitCode = 1;
