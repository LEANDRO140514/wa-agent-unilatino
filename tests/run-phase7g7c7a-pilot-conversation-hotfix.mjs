#!/usr/bin/env node
/**
 * Phase 7G.7C.7-A — Pilot conversation coverage hotfix (local/mock).
 * Usage: node tests/run-phase7g7c7a-pilot-conversation-hotfix.mjs
 */

import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HANDLER_PATH = path.join(__dirname, "../insforge/functions/ycloud-wa-inbound.js");

const handler = (await import(pathToFileURL(HANDLER_PATH).href)).default;
const config = {
  evaTestUrl: "https://testunilatino.algorithmus.io",
  academicEngineEnabled: true,
  evaLlmEnabled: false,
  evaLlmMode: "off",
  mode: "mock",
};

const MENU_MARKERS = ["1. Carreras disponibles", "2. Becas", "3. Hacer el test vocacional"];

function assertDecision(tc, decision) {
  const issues = [];
  const e = tc.expect;

  if (e.intent && decision.intent !== e.intent) issues.push(`intent=${decision.intent}`);
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
    if (!decision.responseText.includes(s)) issues.push(`missing:${s}`);
  }
  for (const s of e.must_not_include || []) {
    if (decision.responseText.includes(s)) issues.push(`forbidden:${s}`);
  }
  if (e.no_menu && MENU_MARKERS.some((m) => decision.responseText.includes(m))) {
    issues.push("menu_repeated");
  }
  if (e.allow_menu && !decision.responseText.includes("1. Carreras disponibles")) {
    issues.push("menu_expected");
  }
  if (e.tags) {
    const tags = handler.getIntentTags(decision.intent, {
      messageText: tc.input,
      needsHuman: decision.needsHuman,
    });
    for (const t of e.tags) {
      if (!tags.includes(t)) issues.push(`missing_tag:${t}`);
    }
  }
  for (const t of e.tags_must_not || []) {
    const tags = handler.getIntentTags(decision.intent, {
      messageText: tc.input,
      needsHuman: decision.needsHuman,
    });
    if (tags.includes(t)) issues.push(`forbidden_tag:${t}`);
  }

  return issues;
}

async function runCase(tc) {
  const base = handler.classifyIntent(tc.input, config, tc.context || {});
  if (!tc.enrich) return { decision: base, issues: assertDecision(tc, base) };

  const enrich = await handler.applyAcademicAndLlmEnrichment(base, tc.input, config, {});
  const decision = enrich.decision;
  return { decision, issues: assertDecision(tc, decision) };
}

const cases = [
  {
    id: "revalidacion-estudios",
    input: "Tienen revalidación de estudios?",
    expect: {
      intent: "revalidacion_estudios",
      no_menu: true,
      must_include: ["revalidación", "asesor"],
      must_not_include: ["materias podrían revalidarse sin"],
      needs_human: true,
      create_task: true,
      tags: ["wa_revalidacion", "wa_requiere_asesor"],
    },
  },
  {
    id: "maestrias",
    input: "tienen maestrias?",
    expect: {
      intent: "niveles_no_principales",
      no_menu: true,
      must_include: ["Preparatoria", "Posgrados", "asesor"],
      must_not_include: ["$", "07:00"],
      tags: ["wa_nivel_no_principal", "wa_posgrado"],
    },
  },
  {
    id: "preparatoria-vista",
    input: "veo que tienen preparatoria",
    expect: {
      intent: "niveles_no_principales",
      no_menu: true,
      must_include: ["Preparatoria"],
      must_not_include: ["Derecho\n- Psicología", "1. Carreras"],
      tags: ["wa_preparatoria"],
    },
  },
  {
    id: "objecion-precio-post-carrera",
    input: "esta cara no?",
    context: { wa_stage: "carrera_interes", wa_last_intent: "carrera_interes" },
    expect: {
      intent: "objecion_precio",
      no_menu: true,
      must_include: ["becas", "promedio"],
      tags: ["wa_objecion_precio", "wa_interes_beca"],
    },
  },
  {
    id: "ubicacion-typo",
    input: "en que unicacion estan?",
    expect: {
      intent: "ubicacion_campus",
      no_menu: true,
      needs_human: false,
      create_task: false,
      must_include: ["Santa Rita Cholul", "Google Maps"],
      must_not_include: ["asesor", "visita", "coordinar"],
      tags: ["wa_ubicacion"],
      tags_must_not: ["wa_requiere_asesor", "wa_interes_visita"],
    },
  },
  {
    id: "rvoe-reconocida-acreditada",
    input: "la Universidad reconocida y acreditada en México?",
    expect: {
      intent: "rvoe_reconocimiento",
      no_menu: true,
      must_include: ["RVOE"],
      tags: ["wa_rvoe"],
    },
  },
  {
    id: "reconocimiento-oficial",
    input: "tienen reconocimiento oficial?",
    expect: {
      intent: "rvoe_reconocimiento",
      no_menu: true,
      must_include: ["RVOE"],
    },
  },
  {
    id: "promociones",
    input: "que promociones tienen?",
    expect: {
      intent: "promociones_descuentos",
      no_menu: true,
      must_include: ["becas", "descuentos"],
      needs_human: true,
      tags: ["wa_interes_promocion", "wa_interes_beca"],
    },
  },
  {
    id: "medicina-typo",
    input: "medicida tienen?",
    expect: {
      intent: "carrera_no_ofertada",
      no_menu: true,
      must_include: ["no tengo Medicina", "Psicología", "Enfermería", "Nutrición"],
      tags: ["wa_carrera_no_ofertada", "wa_salud"],
    },
  },
  {
    id: "carreras-online",
    input: "carreras online?",
    enrich: true,
    expect: {
      intent: "carreras_online",
      no_menu: true,
      academic_enriched: true,
      must_include: ["En línea", "Derecho"],
      must_not_include: ["Arquitectura — Presencial"],
    },
  },
  {
    id: "ubicacion-simple",
    input: "Ubicacion?",
    expect: {
      intent: "ubicacion_campus",
      needs_human: false,
      create_task: false,
      must_include: ["Google Maps"],
      must_not_include: ["asesor", "visita", "coordinar"],
      no_menu: true,
      tags: ["wa_ubicacion"],
      tags_must_not: ["wa_requiere_asesor", "wa_interes_visita"],
    },
  },
  {
    id: "hola-menu",
    input: "hola",
    expect: {
      intent: "ambiguo",
      allow_menu: true,
    },
  },
  {
    id: "fallback-inteligente",
    input: "xyz pregunta rara sin sentido",
    expect: {
      intent: "fallback_inteligente",
      no_menu: true,
      must_include: ["carreras, becas, ubicación"],
    },
  },
];

let pass = 0;
let fail = 0;

for (const tc of cases) {
  const { decision, issues } = await runCase(tc);
  if (issues.length === 0) {
    pass++;
    console.log(`PASS ${tc.id}`);
  } else {
    fail++;
    console.log(`FAIL ${tc.id}: ${issues.join(", ")}`);
    if (process.env.DEBUG) console.log(`  response: ${decision.responseText.slice(0, 120)}…`);
  }
}

console.log(`\n7G.7C.7-A pilot conversation hotfix: ${pass}/${cases.length} PASS`);
if (fail > 0) process.exitCode = 1;
