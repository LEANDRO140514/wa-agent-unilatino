#!/usr/bin/env node
/**
 * Phase 8B.2/8B.3 — CAG shadow replay (pilot conversation + knowledge evaluation).
 * Does NOT modify deterministic responses or send CAG to users.
 * Usage: node tests/run-phase8b2-cag-shadow-replay.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);
const HANDLER_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");
const OUT_JSON = path.join(ROOT, "tests/.phase8b2-cag-shadow-replay-results.json");

const { evaluateCagShadow } = require(
  path.join(ROOT, "insforge/functions/lib/knowledge/cagShadowEvaluator.js"),
);

const handler = (await import(pathToFileURL(HANDLER_PATH).href)).default;

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
  {
    n: 1,
    text: "Tienen revalidación de estudios?",
    expectCag: "CAG",
    expectCategory: "revalidation_general",
    expectRecommendation: "useful_with_human_followup",
  },
  {
    n: 2,
    text: "tienen maestrias?",
    expectCag: "CAG",
    expectCategory: "non_primary_levels",
    expectRecommendation: "useful",
  },
  {
    n: 3,
    text: "veo que tienen preparatoria",
    expectCag: "CAG",
    expectCategory: "non_primary_levels",
    expectRecommendation: "useful",
  },
  {
    n: 4,
    text: "me gusta negocios internacionales, pero tengo dudas",
    expectCag: "CAG",
    expectCategory: "programs",
    expectRecommendation: "useful",
    enrich: true,
  },
  {
    n: 5,
    text: "esta cara no?",
    expectCag: "CAG",
    expectCategory: "price_objection",
    expectRecommendation: "useful",
  },
  {
    n: 6,
    text: "tienen descuento?",
    expectCag: "CAG",
    expectCategory: "scholarships",
    expectRecommendation: "useful",
    enrich: true,
  },
  {
    n: 7,
    text: "en que unicacion estan?",
    expectCag: "CAG",
    expectCategory: "location",
    expectRecommendation: "useful",
  },
  {
    n: 8,
    text: "Ubicacion?",
    expectCag: "CAG",
    expectCategory: "location",
    expectRecommendation: "useful",
  },
  {
    n: 9,
    text: "la Universidad reconocida y acreditada en México?",
    expectCag: "CAG",
    expectCategory: "rvoe",
    expectRecommendation: "useful",
  },
  {
    n: 10,
    text: "tienen reconocimiento oficial?",
    expectCag: "CAG",
    expectCategory: "rvoe",
    expectRecommendation: "useful",
  },
  {
    n: 11,
    text: "hola",
    expectCag: "NONE",
    expectCategory: "unknown_or_greeting",
    expectRecommendation: "not_applicable",
  },
  {
    n: 12,
    text: "tienen reconocimiento oficial?",
    expectCag: "CAG",
    expectCategory: "rvoe",
    expectRecommendation: "useful",
  },
  {
    n: 13,
    text: "que promociones tienen?",
    expectCag: "CAG",
    expectCategory: "promotions_general",
    expectRecommendation: "useful_with_human_followup",
  },
  {
    n: 14,
    text: "carreras online?",
    expectCag: "CAG",
    expectCategory: "online_programs",
    expectRecommendation: "useful",
    enrich: true,
  },
  {
    n: 15,
    text: "medicida tienen?",
    expectCag: "CAG",
    expectCategory: "not_offered",
    expectRecommendation: "useful",
  },
];

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

let pass = 0;
let warn = 0;
let fail = 0;
const results = [];
let contactContext = {};

console.log("8B.2/8B.3 — CAG shadow replay (pilot conversation, sequential)\n");
console.log(`Base commit: efbc1af | mode=${config.mode} ghl=${config.ghlSyncMode} llm=off\n`);

for (const step of STEPS) {
  const issues = [];
  const warns = [];

  const decision = await processDeterministic(step, contactContext);
  const responseBefore = decision.responseText;

  const shadow = evaluateCagShadow({
    message: step.text,
    deterministicIntent: decision.intent,
    deterministicResponse: decision.responseText,
    conversationState: { ...contactContext },
  });

  const decisionAfter = await processDeterministic(step, contactContext);
  if (decisionAfter.responseText !== responseBefore) {
    issues.push("final_response_modified");
  }
  if (shadow.finalResponseModified !== false) {
    issues.push("shadow_flag_response_modified");
  }

  if (shadow.knowledgeMode !== step.expectCag) {
    issues.push(`knowledgeMode=${shadow.knowledgeMode} expected=${step.expectCag}`);
  }
  if (shadow.recommendation !== step.expectRecommendation) {
    issues.push(`recommendation=${shadow.recommendation} expected=${step.expectRecommendation}`);
  }
  if (step.expectCag === "CAG" && !shadow.contextAvailable) {
    issues.push("contextAvailable=false");
  }
  if (step.expectCag === "CAG" && !shadow.contextPreview) {
    warns.push("empty_contextPreview");
  }
  if (step.expectCategory && shadow.knowledgeCategory !== step.expectCategory) {
    issues.push(`category=${shadow.knowledgeCategory} expected=${step.expectCategory}`);
  }
  if (shadow.knowledgeVersion && shadow.knowledgeVersion !== "eva-unilatino-cag-v1") {
    issues.push(`knowledgeVersion=${shadow.knowledgeVersion}`);
  }

  const detStatus = decision.responseText.length > 0 ? "PASS" : "FAIL";
  if (detStatus === "FAIL") issues.push("empty_deterministic_response");

  const status = issues.length ? "FAIL" : warns.length ? "WARN" : "PASS";
  if (status === "PASS") pass++;
  else if (status === "WARN") warn++;
  else fail++;

  const usefulLabel = shadow.cagUseful ? "CAG useful" : shadow.recommendation;
  console.log(
    `${String(step.n).padStart(2, " ")}. [${status}] "${step.text}" → intent=${decision.intent} | CAG=${shadow.knowledgeMode} | ${usefulLabel}`,
  );
  if (issues.length) console.log(`    FAIL: ${issues.join(", ")}`);
  if (warns.length) console.log(`    WARN: ${warns.join(", ")}`);

  results.push({
    n: step.n,
    message: step.text,
    status,
    deterministic: {
      intent: decision.intent,
      response_preview: shadow.deterministicResponsePreview,
      response_unchanged: decisionAfter.responseText === responseBefore,
      needs_human: decision.needsHuman,
    },
    shadow: {
      knowledgeMode: shadow.knowledgeMode,
      knowledgeSource: shadow.knowledgeSource,
      knowledgeCategory: shadow.knowledgeCategory,
      knowledgeReason: shadow.knowledgeReason,
      normalizedQuery: shadow.normalizedQuery,
      knowledgeVersion: shadow.knowledgeVersion,
      recommendation: shadow.recommendation,
      cagUseful: shadow.cagUseful,
      contextAvailable: shadow.contextAvailable,
      contextPreview: shadow.contextPreview,
      responseChangeRisk: shadow.responseChangeRisk,
      finalResponseModified: shadow.finalResponseModified,
      notes: shadow.notes,
    },
    issues,
    warns,
  });

  contactContext = nextContext(decision);
}

const cagUsefulCount = results.filter((r) => r.shadow.cagUseful).length;
const cagNoneCount = results.filter((r) => r.shadow.knowledgeMode === "NONE").length;

const summary = {
  phase: "8B.3",
  base_commit: "efbc1af4ac9a3afc90c1ed2d187bb29196537a8d",
  prior_cag_useful_8b2: "11/15",
  mode: config.mode,
  ghl_sync_mode: config.ghlSyncMode,
  eva_llm_enabled: false,
  rag_enabled: false,
  insforge_writes: false,
  deploy: false,
  live: false,
  ycloud_wa_inbound_modified: false,
  total: STEPS.length,
  pass,
  warn,
  fail,
  cag_useful_count: cagUsefulCount,
  cag_none_count: cagNoneCount,
  all_responses_unchanged: results.every((r) => r.deterministic.response_unchanged),
  results,
};

fs.writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2));

console.log(`\nShadow replay: ${pass} PASS, ${warn} WARN, ${fail} FAIL / ${STEPS.length}`);
console.log(`CAG useful: ${cagUsefulCount}/${STEPS.length} | CAG NONE: ${cagNoneCount}/${STEPS.length}`);
console.log(`Final responses unchanged: ${summary.all_responses_unchanged}`);
console.log(`Results: ${OUT_JSON}`);

if (fail > 0) process.exitCode = 1;
