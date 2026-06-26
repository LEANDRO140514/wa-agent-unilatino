#!/usr/bin/env node
/**
 * Phase 7G.7B — GHL Relevance Gate shadow mode.
 * Usage: node tests/run-phase7g7b-ghl-relevance-shadow.mjs
 */

import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GATE_PATH = path.join(ROOT, "insforge/functions/lib/ghl-relevance-gate.js");
const HANDLER_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");

if (!globalThis.Deno) {
  globalThis.Deno = { env: { get: (key) => process.env[key] } };
}

const gate = await import(pathToFileURL(GATE_PATH).href);
const handler = (await import(pathToFileURL(HANDLER_PATH).href)).default;

const { evaluateGhlRelevance, normalizeGhlRelevanceConfig } = gate;
const config = handler.getConfig();
const relevanceConfig = handler.buildGhlRelevanceConfigFromHandlerConfig(config);

function gateEval(input, extra = {}) {
  const intentDecision =
    extra.intentDecision ||
    handler.classifyIntent(input.messageText, config, input.contactContext || {});
  return evaluateGhlRelevance({
    ...input,
    intent: extra.intent ?? intentDecision.intent,
    intentDecision,
    firstMessage: input.firstMessage,
    academicResult: input.academicResult,
    config: relevanceConfig,
    env: {},
  });
}

function shadow(input, extra = {}) {
  return gateEval(input, extra);
}

function assertCase(id, result, expect) {
  const issues = [];
  for (const [key, value] of Object.entries(expect)) {
    if (key === "lead_score_min") {
      if (result.lead_score < value) issues.push(`lead_score=${result.lead_score}<${value}`);
      continue;
    }
    if (key === "human_handoff_present") {
      if (!result.human_handoff_reason) issues.push("human_handoff_reason missing");
      continue;
    }
    if (key === "human_handoff_absent") {
      if (value && result.human_handoff_reason) {
        issues.push(`human_handoff_reason=${result.human_handoff_reason}`);
      }
      continue;
    }
    if (key === "routing_reason_not") {
      if (result.routing_reason === value) {
        issues.push(`routing_reason=${result.routing_reason} should not equal ${value}`);
      }
      continue;
    }
    if (result[key] !== value) issues.push(`${key}=${JSON.stringify(result[key])} expected ${JSON.stringify(value)}`);
  }
  const ok = issues.length === 0;
  console.log(ok ? `PASS ${id}` : `FAIL ${id}: ${issues.join(", ")}`);
  if (!ok) {
    console.log("  shadow:", JSON.stringify(result, null, 2));
  }
  return ok;
}

const cases = [
  {
    id: "A-saludo",
    run: () =>
      shadow({
        messageText: "Hola",
        contactContext: {},
        messageType: "text",
        source: "organic",
      }),
    expect: {
      would_sync_to_ghl: false,
      would_create_task: false,
      ignored_for_ghl: true,
      routing_reason: "ignored_intent",
    },
  },
  {
    id: "B-agradecimiento-post-escalacion",
    run: () =>
      shadow({
        messageText: "Gracias",
        contactContext: { wa_needs_human: true, wa_stage: "asesor_requerido" },
        messageType: "text",
        source: "organic",
      }),
    expect: {
      would_sync_to_ghl: false,
      would_create_task: false,
      routing_reason: "post_escalation_closure_no_sync",
    },
  },
  {
    id: "C-despedida-post-escalacion",
    run: () =>
      shadow({
        messageText: "Bye",
        contactContext: { wa_needs_human: true, wa_stage: "asesor_requerido" },
        messageType: "text",
        source: "organic",
      }),
    expect: {
      would_sync_to_ghl: false,
      would_create_task: false,
      routing_reason: "post_escalation_closure_no_sync",
    },
  },
  {
    id: "D-carrera-interes",
    run: () =>
      shadow({
        messageText: "Me interesa Derecho online",
        contactContext: {},
        messageType: "text",
        source: "organic",
      }),
    expect: {
      lead_score_min: 40,
      would_sync_to_ghl: true,
      would_create_contact: true,
      would_create_note: true,
      would_create_task: false,
    },
  },
  {
    id: "E-beca",
    run: () =>
      shadow({
        messageText: "Tengo promedio 9.2, qué beca me toca?",
        contactContext: {},
        messageType: "text",
        source: "organic",
      }),
    expect: {
      lead_score_min: 45,
      would_sync_to_ghl: true,
      would_create_contact: true,
      would_create_note: true,
    },
  },
  {
    id: "F-humano",
    run: () =>
      shadow({
        messageText: "Quiero hablar con un asesor",
        contactContext: {},
        messageType: "text",
        source: "organic",
      }),
    expect: {
      would_sync_to_ghl: true,
      would_create_contact: true,
      would_create_note: true,
      would_create_task: true,
      human_handoff_present: true,
    },
  },
  {
    id: "G-media-sin-texto",
    run: () =>
      shadow({
        messageText: "",
        contactContext: {},
        messageType: "audio",
        source: "organic",
        intent: "sin_texto",
      }),
    expect: {
      would_sync_to_ghl: false,
      ignored_for_ghl: true,
      routing_reason: "ignored_intent",
    },
  },
  {
    id: "H-meta-ads-primer-saludo",
    run: () =>
      shadow({
        messageText: "Hola",
        contactContext: {},
        messageType: "text",
        source: "meta_ads",
        firstMessage: true,
      }),
    expect: {
      would_sync_to_ghl: false,
      ignored_for_ghl: true,
      would_create_task: false,
      routing_reason: "meta_ads_first_message_no_sync",
    },
  },
  {
    id: "H2-meta-ads-primer-saludo-flag-off",
    run: () =>
      evaluateGhlRelevance({
        messageText: "Hola",
        intent: "ambiguo",
        intentDecision: { intent: "ambiguo" },
        contactContext: {},
        messageType: "text",
        source: "meta_ads",
        firstMessage: true,
        config: {
          ...relevanceConfig,
          metaAdsFirstMessageNoSync: false,
        },
        env: {},
      }),
    expect: {
      would_sync_to_ghl: false,
      ignored_for_ghl: true,
      routing_reason: "meta_ads_first_message_no_sync",
    },
  },
  {
    id: "I-meta-ads-carrera",
    run: () =>
      shadow({
        messageText: "Quiero información de Psicología",
        contactContext: { wa_stage: "carrera_interes" },
        messageType: "text",
        source: "meta_ads",
        firstMessage: false,
      }),
    expect: {
      lead_score_min: 30,
      would_sync_to_ghl: true,
    },
  },
  {
    id: "K-inscripcion-explicita",
    run: () =>
      shadow({
        messageText: "Quiero inscribirme esta semana",
        contactContext: {},
        messageType: "text",
        source: "organic",
      }),
    expect: {
      would_sync_to_ghl: true,
      would_create_task: true,
      human_handoff_present: true,
      lead_score_min: 55,
    },
  },
  {
    id: "L-test-vocacional",
    run: () =>
      shadow({
        messageText: "Quiero hacer el test vocacional",
        contactContext: {},
        messageType: "text",
        source: "organic",
      }),
    expect: {
      would_sync_to_ghl: true,
      would_create_contact: true,
      would_create_note: true,
      would_create_task: false,
      routing_reason: "vocational_test_lead",
    },
  },
  {
    id: "M-orientacion",
    run: () =>
      shadow({
        messageText: "No sé qué estudiar, me pueden orientar?",
        contactContext: {},
        messageType: "text",
        source: "organic",
      }),
    expect: {
      would_sync_to_ghl: true,
      would_create_contact: true,
      would_create_note: true,
      would_create_task: false,
    },
  },
  {
    id: "N-documentos",
    run: () =>
      shadow({
        messageText: "Qué documentos necesito para inscribirme?",
        contactContext: {},
        messageType: "text",
        source: "organic",
      }),
    expect: {
      would_sync_to_ghl: true,
      would_create_contact: true,
      would_create_note: true,
      would_create_task: false,
      routing_reason: "documents_enrollment_signal",
    },
  },
  {
    id: "O-mama-orientacion",
    run: () =>
      shadow({
        messageText: "Soy mamá de un alumno y quiero saber qué carrera le conviene",
        contactContext: {},
        messageType: "text",
        source: "organic",
      }),
    expect: {
      would_sync_to_ghl: true,
      would_create_contact: true,
      would_create_note: true,
      would_create_task: false,
    },
  },
  {
    id: "P-costo-carrera",
    run: () =>
      shadow({
        messageText: "Cuánto cuesta Derecho en línea?",
        contactContext: {},
        messageType: "text",
        source: "organic",
      }),
    expect: {
      would_sync_to_ghl: true,
      would_create_contact: true,
      would_create_note: true,
      would_create_task: true,
      human_handoff_present: true,
      routing_reason: "cost_signal_requires_human_validation",
      lead_score_min: 45,
    },
  },
  {
    id: "Q-meta-greeting-academic",
    run: () =>
      gateEval({
        messageText: "Hola",
        contactContext: {},
        messageType: "text",
        source: "meta_ads",
        firstMessage: true,
        academicResult: {
          academic_intent: "greeting",
          academic_enriched: true,
          academic_confidence: 1,
        },
      }),
    expect: {
      would_sync_to_ghl: false,
      ignored_for_ghl: true,
      would_create_task: false,
      routing_reason: "meta_ads_first_message_no_sync",
    },
  },
  {
    id: "R-costo-career-detail-confidence",
    run: () =>
      gateEval({
        messageText: "Cuánto cuesta Derecho en línea?",
        contactContext: {},
        messageType: "text",
        source: "organic",
        academicResult: {
          academic_intent: "career_detail",
          academic_enriched: true,
          academic_confidence: 1,
        },
      }),
    expect: {
      would_sync_to_ghl: true,
      would_create_task: true,
      human_handoff_present: true,
      routing_reason: "cost_signal_requires_human_validation",
    },
  },
  {
    id: "S-costo-validated-explicit",
    run: () =>
      gateEval({
        messageText: "Cuánto cuesta Derecho en línea?",
        contactContext: {},
        messageType: "text",
        source: "organic",
        academicResult: {
          academic_intent: "cost",
          academic_enriched: true,
          academic_confidence: 1,
          cost_validated: true,
          kb_hit: true,
        },
      }),
    expect: {
      would_sync_to_ghl: true,
      would_create_contact: true,
      would_create_note: true,
      would_create_task: false,
      human_handoff_absent: true,
      routing_reason_not: "cost_signal_requires_human_validation",
    },
  },
  {
    id: "I2-meta-ads-carrera-academic",
    run: () =>
      gateEval({
        messageText: "Quiero información de Psicología",
        contactContext: { wa_stage: "carrera_interes" },
        messageType: "text",
        source: "meta_ads",
        firstMessage: false,
        academicResult: {
          academic_intent: "career_detail",
          academic_enriched: true,
          academic_confidence: 1,
        },
      }),
    expect: {
      would_sync_to_ghl: true,
      lead_score_min: 30,
    },
  },
  {
    id: "J-spam",
    run: () =>
      shadow({
        messageText: "gana dinero rápido con este link",
        contactContext: {},
        messageType: "text",
        source: "organic",
      }),
    expect: {
      would_sync_to_ghl: false,
      ignored_for_ghl: true,
      routing_reason: "ignored_intent",
    },
  },
];

let pass = 0;
let fail = 0;

console.log("7G.7B GHL relevance shadow — unit cases\n");

for (const tc of cases) {
  const result = tc.run();
  if (assertCase(tc.id, result, tc.expect)) pass++;
  else fail++;
}

const defaults = normalizeGhlRelevanceConfig({});
const defaultIssues = [];
if (defaults.ghlRelevanceShadowMode !== true) defaultIssues.push("shadow default not true");
if (defaults.ghlSyncPolicy !== "none") defaultIssues.push("policy default not none");
if (defaults.ghlLeadScoreThreshold !== 45) defaultIssues.push("threshold default not 45");
if (defaultIssues.length) {
  fail++;
  console.log(`FAIL defaults: ${defaultIssues.join(", ")}`);
} else {
  pass++;
  console.log("PASS config-defaults");
}

console.log(`\n7G.7B ghl relevance shadow: ${pass}/${cases.length + 1} PASS`);
if (fail > 0) process.exitCode = 1;
