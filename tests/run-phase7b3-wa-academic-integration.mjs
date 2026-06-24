#!/usr/bin/env node
/**
 * Fase 7B.3 — WA inbound + academic-engine integration tests.
 * Usage: node tests/run-phase7b3-wa-academic-integration.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(ROOT, "tests/payloads/phase7b3-wa-academic-integration.json");
const REPORT = path.join(ROOT, "docs/phase-7b3-wa-academic-integration-report.md");
const HANDLER_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");

const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));

for (const [key, value] of Object.entries(fixture.env || {})) {
  process.env[key] = value;
}

if (!globalThis.Deno) {
  globalThis.Deno = {
    env: {
      get: (key) => process.env[key],
    },
  };
}

const handlerUrl = pathToFileURL(HANDLER_PATH).href;
const handlerMod = await import(handlerUrl);
const handler = handlerMod.default;

function normalizeForMatch(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function includesAll(haystack, needles) {
  const h = normalizeForMatch(haystack);
  return needles.every((n) => h.includes(normalizeForMatch(n)));
}

function excludesAll(haystack, needles) {
  const h = normalizeForMatch(haystack);
  return needles.every((n) => !h.includes(normalizeForMatch(n)));
}

function summarize(text, max = 100) {
  const one = String(text || "").replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max)}…` : one;
}

async function runCase(tc) {
  const config = handler.getConfig();
  const baseDecision = handler.classifyIntent(tc.input, config);
  const originalOperational = {
    intent: baseDecision.intent,
    waStage: baseDecision.waStage,
    needsHuman: baseDecision.needsHuman,
    createTask: baseDecision.createTask,
    priority: baseDecision.priority,
    escalation_required: baseDecision.escalation_required,
    responseText: baseDecision.responseText,
  };

  const { decision, academicMeta } = await handler.applyAcademicAndLlmEnrichment(
    baseDecision,
    tc.input,
    config,
    {},
  );

  const failures = [];

  if (tc.expect_wa_intent && decision.intent !== tc.expect_wa_intent) {
    failures.push(`wa_intent: expected ${tc.expect_wa_intent}, got ${decision.intent}`);
  }

  if (
    tc.expect_academic_enriched !== undefined &&
    academicMeta.academic_enriched !== tc.expect_academic_enriched
  ) {
    failures.push(
      `academic_enriched: expected ${tc.expect_academic_enriched}, got ${academicMeta.academic_enriched}`,
    );
  }

  if (
    tc.expect_academic_skipped !== undefined &&
    academicMeta.academic_skipped !== tc.expect_academic_skipped
  ) {
    failures.push(
      `academic_skipped: expected ${tc.expect_academic_skipped}, got ${academicMeta.academic_skipped}`,
    );
  }

  if (
    tc.expect_academic_intent &&
    academicMeta.academic_intent !== tc.expect_academic_intent
  ) {
    failures.push(
      `academic_intent: expected ${tc.expect_academic_intent}, got ${academicMeta.academic_intent}`,
    );
  }

  if (tc.response_must_include && !includesAll(decision.responseText, tc.response_must_include)) {
    failures.push(`missing includes: ${tc.response_must_include.join(", ")}`);
  }

  if (
    tc.response_must_not_include &&
    !excludesAll(decision.responseText, tc.response_must_not_include)
  ) {
    failures.push(`forbidden found: ${tc.response_must_not_include.join(", ")}`);
  }

  for (const field of ["intent", "waStage", "needsHuman", "createTask", "priority", "escalation_required"]) {
    if (decision[field] !== originalOperational[field]) {
      failures.push(`operational field changed: ${field}`);
    }
  }

  if (tc.preserve_operational) {
    for (const [field, expected] of Object.entries(tc.preserve_operational)) {
      if (decision[field] !== expected) {
        failures.push(`preserve_operational.${field}: expected ${expected}, got ${decision[field]}`);
      }
    }
  }

  if (tc.expect_academic_enriched === false && decision.responseText !== originalOperational.responseText) {
    failures.push("responseText changed when enrichment disabled/skipped");
  }

  if (academicMeta.eva_llm_enabled !== false) {
    failures.push("eva_llm_enabled should be false in this phase");
  }

  if (academicMeta.eva_llm_rephrased !== false) {
    failures.push("eva_llm_rephrased should be false when LLM disabled");
  }

  return {
    id: tc.id,
    input: tc.input,
    pass: failures.length === 0,
    failures,
    wa_intent: decision.intent,
    academic_enriched: academicMeta.academic_enriched,
    academic_skipped: academicMeta.academic_skipped,
    academic_intent: academicMeta.academic_intent,
    response_preview: summarize(decision.responseText),
  };
}

const results = [];
for (const tc of fixture.cases) {
  results.push(await runCase(tc));
}

const passed = results.filter((r) => r.pass).length;
const total = results.length;
const allPass = passed === total;

const lines = [
  "# Phase 7B.3 — WA Academic Integration Report",
  "",
  `**Date:** ${new Date().toISOString().slice(0, 10)}`,
  `**Result:** ${passed}/${total} PASS`,
  "",
  "## Environment",
  "",
  "```",
  ...Object.entries(fixture.env || {}).map(([k, v]) => `${k}=${v}`),
  "```",
  "",
  "## Summary",
  "",
  "| ID | Input | WA intent | Academic | Enriched | Result |",
  "|---:|---|---|---|:---:|---|",
];

for (const r of results) {
  lines.push(
    `| ${r.id} | ${summarize(r.input, 40)} | ${r.wa_intent} | ${r.academic_intent || "—"} | ${r.academic_enriched ? "yes" : "no"} | ${r.pass ? "PASS" : "FAIL"} |`,
  );
}

lines.push("", "## Details", "");

for (const r of results) {
  lines.push(`### Case ${r.id}: ${r.input}`, "");
  lines.push(`- WA intent: \`${r.wa_intent}\``);
  lines.push(`- Academic intent: \`${r.academic_intent || "—"}\``);
  lines.push(`- Enriched: ${r.academic_enriched}, skipped: ${r.academic_skipped}`);
  lines.push(`- Response: ${r.response_preview}`);
  if (!r.pass) {
    lines.push(`- **Failures:** ${r.failures.join("; ")}`);
  }
  lines.push("");
}

lines.push("## Integration notes", "");
lines.push("- Hook: `classifyIntent` → `applyAcademicAndLlmEnrichment` → outbound/GHL");
lines.push("- `classifyIntent` / `buildIntentDecision` unchanged");
lines.push("- Academic metadata on outbound `raw_response` and webhook response");
lines.push("- No live deploy, mock/dry_run only");

fs.writeFileSync(REPORT, lines.join("\n"), "utf8");

console.log(`Phase 7B.3 WA academic integration: ${passed}/${total} PASS`);
for (const r of results.filter((x) => !x.pass)) {
  console.log(`  FAIL #${r.id}: ${r.failures.join("; ")}`);
}

process.exit(allPass ? 0 : 1);
