#!/usr/bin/env node
/**
 * Phase 7G.6D — Conversation hotfix (Gracias / Bye post-escalación).
 * Usage: node tests/run-phase7g6d-conversation-hotfix.mjs
 */

import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HANDLER_PATH = path.join(__dirname, "../insforge/functions/ycloud-wa-inbound.js");

const handler = (await import(pathToFileURL(HANDLER_PATH).href)).default;
const config = { evaTestUrl: "https://testunilatino.algorithmus.io" };

const cases = [
  {
    id: "gracias-post-asesor",
    input: "Gracias",
    context: { wa_stage: "asesor_requerido", wa_needs_human: true },
    expect: {
      intent: "agradecimiento",
      wa_stage: "asesor_requerido",
      needs_human: true,
      create_task: false,
      must_include: ["seguimiento", "asesor"],
      must_not_include: ["Carreras disponibles", "1.", "2."],
    },
  },
  {
    id: "bye-post-asesor",
    input: "Bye",
    context: { wa_stage: "asesor_requerido", wa_needs_human: true },
    expect: {
      intent: "despedida",
      wa_stage: "asesor_requerido",
      needs_human: true,
      create_task: false,
      must_include: ["Hasta pronto"],
      must_not_include: ["Soy Eva", "Carreras disponibles"],
    },
  },
  {
    id: "gracias-frio",
    input: "Gracias",
    context: {},
    expect: {
      intent: "agradecimiento",
      wa_stage: "cierre_positivo",
      needs_human: false,
      must_not_include: ["Carreras disponibles"],
    },
  },
  {
    id: "para-hablar-asesor",
    input: "Para hablar con un asesor?",
    context: { wa_stage: "carrera_interes" },
    expect: {
      intent: "humano",
      wa_stage: "asesor_requerido",
      needs_human: true,
      create_task: true,
    },
  },
];

let pass = 0;
let fail = 0;

for (const tc of cases) {
  const d = handler.classifyIntent(tc.input, config, tc.context);
  const issues = [];

  if (d.intent !== tc.expect.intent) issues.push(`intent=${d.intent}`);
  if (tc.expect.wa_stage && d.waStage !== tc.expect.wa_stage) issues.push(`wa_stage=${d.waStage}`);
  if (tc.expect.needs_human !== undefined && d.needsHuman !== tc.expect.needs_human) {
    issues.push(`needs_human=${d.needsHuman}`);
  }
  if (tc.expect.create_task !== undefined && d.createTask !== tc.expect.create_task) {
    issues.push(`create_task=${d.createTask}`);
  }
  for (const s of tc.expect.must_include || []) {
    if (!d.responseText.includes(s)) issues.push(`missing:${s}`);
  }
  for (const s of tc.expect.must_not_include || []) {
    if (d.responseText.includes(s)) issues.push(`forbidden:${s}`);
  }

  const ok = issues.length === 0;
  if (ok) {
    pass++;
    console.log(`PASS ${tc.id}`);
  } else {
    fail++;
    console.log(`FAIL ${tc.id}: ${issues.join(", ")}`);
  }
}

console.log(`\n7G.6D conversation hotfix: ${pass}/${cases.length} PASS`);
if (fail > 0) process.exitCode = 1;
