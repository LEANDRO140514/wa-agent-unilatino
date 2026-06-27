#!/usr/bin/env node
/**
 * Phase 7G.7C.7-B — Full pilot conversation mock replay (sequential context).
 * Usage: node tests/run-phase7g7c7b-pilot-conversation-replay.mjs
 * Output: tests/.phase7g7c7b-replay-results.json (for report)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const HANDLER_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");
const OUT_JSON = path.join(ROOT, "tests/.phase7g7c7b-replay-results.json");

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

const MENU_MARKERS = ["1. Carreras disponibles", "2. Becas", "3. Hacer el test vocacional"];

const STEPS = [
  {
    n: 1,
    text: "Tienen revalidación de estudios?",
    expect: {
      intent: "revalidacion_estudios",
      no_menu: true,
      must_include: ["revalidación", "asesor"],
      must_not_include: ["1. Carreras"],
      needs_human: true,
      create_task: true,
      tags: ["wa_revalidacion", "wa_requiere_asesor"],
    },
  },
  {
    n: 2,
    text: "tienen maestrias?",
    expect: {
      intent: "niveles_no_principales",
      no_menu: true,
      must_include: ["Preparatoria", "Posgrados"],
      must_not_include: ["$", "07:00"],
    },
  },
  {
    n: 3,
    text: "veo que tienen preparatoria",
    expect: {
      intent: "niveles_no_principales",
      no_menu: true,
      must_include: ["Preparatoria"],
      must_not_include: ["- Derecho\n- Psicología", "1. Carreras"],
    },
  },
  {
    n: 4,
    text: "me gusta negocios internacionales, pero tengo dudas",
    enrich: true,
    expect: {
      intents_accept: ["carrera_interes", "fallback_inteligente"],
      no_menu: true,
      must_include: ["Negocios Internacionales"],
      academic_enriched: true,
    },
  },
  {
    n: 5,
    text: "esta cara no?",
    expect: {
      intent: "objecion_precio",
      no_menu: true,
      must_include: ["becas"],
    },
  },
  {
    n: 6,
    text: "tienen descuento?",
    enrich: true,
    expect: {
      intents_accept: ["beca", "promociones_descuentos"],
      no_menu: true,
      must_include: ["beca", "descuento"],
      must_include_any: ["excelencia", "promedio", "orientarte", "descuentos"],
    },
  },
  {
    n: 7,
    text: "en que unicacion estan?",
    expect: {
      intent: "ubicacion_campus",
      no_menu: true,
      must_include: ["Santa Rita Cholul", "Google Maps"],
      must_not_include: ["asesor", "visita", "coordinar"],
      needs_human: false,
      create_task: false,
      tags: ["wa_ubicacion"],
      tags_must_not: ["wa_requiere_asesor", "wa_interes_visita"],
    },
  },
  {
    n: 8,
    text: "Ubicacion?",
    expect: {
      intent: "ubicacion_campus",
      no_menu: true,
      must_include: ["Google Maps"],
      must_not_include: ["asesor", "visita", "coordinar"],
      needs_human: false,
      create_task: false,
      tags_must_not: ["wa_requiere_asesor", "wa_interes_visita"],
    },
  },
  {
    n: 9,
    text: "la Universidad reconocida y acreditada en México?",
    expect: {
      intent: "rvoe_reconocimiento",
      no_menu: true,
      must_include: ["RVOE"],
    },
  },
  {
    n: 10,
    text: "tienen reconocimiento oficial?",
    expect: {
      intent: "rvoe_reconocimiento",
      no_menu: true,
      must_include: ["RVOE"],
    },
  },
  {
    n: 11,
    text: "hola",
    expect: {
      intents_accept: ["ambiguo", "fallback_inteligente"],
      allow_menu: true,
    },
  },
  {
    n: 12,
    text: "tienen reconocimiento oficial?",
    expect: {
      intent: "rvoe_reconocimiento",
      no_menu: true,
      must_include: ["RVOE"],
    },
  },
  {
    n: 13,
    text: "que promociones tienen?",
    expect: {
      intent: "promociones_descuentos",
      no_menu: true,
      must_include: ["becas", "descuentos"],
      needs_human: true,
    },
  },
  {
    n: 14,
    text: "carreras online?",
    enrich: true,
    expect: {
      intent: "carreras_online",
      no_menu: true,
      academic_enriched: true,
      must_include: ["En línea", "Derecho"],
      must_not_include: ["Presencial"],
    },
  },
  {
    n: 15,
    text: "medicida tienen?",
    expect: {
      intent: "carrera_no_ofertada",
      no_menu: true,
      must_include: ["no tengo Medicina", "Psicología", "Enfermería", "Nutrición"],
    },
  },
];

function summarize(text, max = 100) {
  const one = String(text || "").replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max)}…` : one;
}

function buildGhlPreview(decision, messageText) {
  const ctx = {
    intent: decision.intent,
    messageText,
    needsHuman: decision.needsHuman,
    normalizedPhone: "+529991525583",
    waStage: decision.waStage,
    responseText: decision.responseText,
    timestamp: new Date().toISOString(),
    ghlSyncGovernedByGate: false,
  };
  const tags = handler.getIntentTags(decision.intent, ctx);
  const wouldCreateTask = handler.shouldCreateTaskDryRun(ctx);
  return { tags, would_create_task: wouldCreateTask, ghl_live: false, ghl_sync_mode: "dry_run" };
}

function evaluate(step, decision) {
  const e = step.expect;
  const issues = [];
  const warns = [];

  if (e.intent && decision.intent !== e.intent) issues.push(`intent=${decision.intent}`);
  if (e.intents_accept && !e.intents_accept.includes(decision.intent)) {
    issues.push(`intent=${decision.intent}`);
  }
  if (e.wa_stage && decision.waStage !== e.wa_stage) issues.push(`wa_stage=${decision.waStage}`);
  if (e.needs_human !== undefined && decision.needsHuman !== e.needs_human) {
    issues.push(`needs_human=${decision.needsHuman}`);
  }
  if (e.create_task !== undefined && decision.createTask !== e.create_task) {
    issues.push(`create_task=${decision.createTask}`);
  }
  if (e.academic_enriched === true && !decision.academic_enriched) {
    issues.push("academic_enriched=false");
  }
  for (const s of e.must_include || []) {
    if (!decision.responseText.toLowerCase().includes(s.toLowerCase())) issues.push(`missing:${s}`);
  }
  if (e.must_include_any) {
    const hit = e.must_include_any.some((s) =>
      decision.responseText.toLowerCase().includes(s.toLowerCase()),
    );
    if (!hit) issues.push(`missing_any:${e.must_include_any.join("|")}`);
  }
  for (const s of e.must_not_include || []) {
    if (decision.responseText.includes(s)) issues.push(`forbidden:${s}`);
  }
  if (e.no_menu && MENU_MARKERS.some((m) => decision.responseText.includes(m))) {
    issues.push("menu_repeated");
  }
  if (e.allow_menu && !decision.responseText.includes("1. Carreras disponibles")) {
    warns.push("menu_not_shown");
  }

  const ghl = buildGhlPreview(decision, step.text);
  if (e.tags) {
    for (const t of e.tags) {
      if (!ghl.tags.includes(t)) issues.push(`missing_tag:${t}`);
    }
  }
  for (const t of e.tags_must_not || []) {
    if (ghl.tags.includes(t)) issues.push(`forbidden_tag:${t}`);
  }
  if (e.create_task === false && ghl.would_create_task) {
    issues.push("ghl_would_create_task=true");
  }
  if (e.needs_human === false && ghl.tags.includes("wa_requiere_asesor")) {
    issues.push("forbidden_tag:wa_requiere_asesor");
  }

  const status = issues.length ? "FAIL" : warns.length ? "WARN" : "PASS";
  return { issues, warns, status, ghl };
}

function nextContext(decision) {
  return {
    wa_stage: decision.waStage,
    wa_last_intent: decision.intent,
    wa_needs_human: decision.needsHuman,
  };
}

async function processStep(step, contactContext) {
  const base = handler.classifyIntent(step.text, config, contactContext);
  let decision = base;
  let llmMeta = null;
  if (step.enrich !== false) {
    const enrich = await handler.applyAcademicAndLlmEnrichment(base, step.text, config, {});
    decision = enrich.decision;
    llmMeta = enrich.llmMeta || null;
  }
  const evalResult = evaluate(step, decision);
  return {
    ...evalResult,
    decision,
    llm_off: !decision.eva_llm_rephrased && config.evaLlmEnabled === false,
    academic_skipped: decision.academic_skipped,
    contactContext_in: { ...contactContext },
  };
}

const results = [];
let contactContext = {};
let pass = 0;
let warn = 0;
let fail = 0;

console.log("7G.7C.7-B pilot conversation replay (local mock, sequential)\n");
console.log(`Base commit: ad70bcb | mode=${config.mode} ghl=${config.ghlSyncMode} llm=off\n`);

for (const step of STEPS) {
  const r = await processStep(step, contactContext);
  const { decision, status, issues, warns, ghl } = r;

  if (status === "PASS") pass++;
  else if (status === "WARN") warn++;
  else fail++;

  const line = `${String(step.n).padStart(2, " ")}. [${status}] "${step.text}" → ${decision.intent}`;
  console.log(line);
  if (issues.length) console.log(`    FAIL: ${issues.join(", ")}`);
  if (warns.length) console.log(`    WARN: ${warns.join(", ")}`);

  results.push({
    n: step.n,
    message: step.text,
    status,
    intent: decision.intent,
    wa_stage: decision.waStage,
    needs_human: decision.needsHuman,
    create_task: decision.createTask,
    academic_enriched: decision.academic_enriched === true,
    response_summary: summarize(decision.responseText, 120),
    ghl_tags: ghl.tags,
    ghl_would_create_task: ghl.would_create_task,
    issues,
    warns,
    context_in: r.contactContext_in,
  });

  contactContext = nextContext(decision);
}

const summary = {
  phase: "7G.7C.7-B",
  base_commit: "ad70bcbc29b186d6d5e2ed0bc88ca059414473f0",
  mode: config.mode,
  ghl_sync_mode: config.ghlSyncMode,
  ghl_write_custom_fields: config.ghlWriteCustomFields,
  academic_engine_enabled: config.academicEngineEnabled,
  eva_llm_enabled: config.evaLlmEnabled,
  eva_llm_mode: config.evaLlmMode,
  outbound_real: false,
  ghl_live: false,
  total: STEPS.length,
  pass,
  warn,
  fail,
  results,
};

fs.writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2));

console.log(`\nReplay: ${pass} PASS, ${warn} WARN, ${fail} FAIL / ${STEPS.length}`);
console.log(`Results: ${OUT_JSON}`);
if (fail > 0) process.exitCode = 1;
