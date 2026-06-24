#!/usr/bin/env node
/**
 * Fase 7B.2 — Run academic-engine fixture tests.
 * Usage: node tests/run-phase7b-academic.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolveAcademicMessage } from "../insforge/functions/lib/academic-engine/index.js";
import {
  shouldEnrichAcademic,
  mergeAcademicIntoDecision,
} from "../insforge/functions/lib/academic-engine/adapter.js";
import { rephraseForWhatsApp, validateRephrase } from "../insforge/functions/lib/eva-llm/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(ROOT, "tests/payloads/phase7b-academic-engine-cases.json");
const REPORT = path.join(ROOT, "docs/phase-7b-academic-engine-report.md");

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

function summarize(text, max = 120) {
  const one = String(text || "").replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max)}…` : one;
}

function runCase(tc) {
  const result = resolveAcademicMessage(tc.input);
  const failures = [];

  if (tc.expect_intent && result.academic_intent !== tc.expect_intent) {
    failures.push(`intent: expected ${tc.expect_intent}, got ${result.academic_intent}`);
  }
  if (tc.response_must_include && !includesAll(result.response, tc.response_must_include)) {
    failures.push(`missing includes: ${tc.response_must_include.join(", ")}`);
  }
  if (tc.response_must_not_include && !excludesAll(result.response, tc.response_must_not_include)) {
    failures.push(`forbidden found: ${tc.response_must_not_include.join(", ")}`);
  }

  let adapterNote = "";
  if (tc.adapter_wa_intent !== undefined) {
    const enrich = shouldEnrichAcademic(tc.adapter_wa_intent, tc.input);
    if (enrich !== tc.adapter_should_enrich) {
      failures.push(
        `adapter shouldEnrich: expected ${tc.adapter_should_enrich}, got ${enrich}`,
      );
    }
    const mockDecision = {
      intent: tc.adapter_wa_intent,
      responseText: "original WA text",
      waStage: "test",
      needsHuman: tc.adapter_wa_intent === "humano",
      createTask: false,
    };
    const merged = mergeAcademicIntoDecision(mockDecision, result);
    if (tc.adapter_should_enrich === false && merged.academic_enriched === true) {
      failures.push("mergeAcademicIntoDecision should not enrich when shouldEnrich is false (test uses merge directly — skipped check)");
    }
    adapterNote = `shouldEnrich=${enrich}`;
  }

  return {
    id: tc.id,
    input: tc.input,
    intent: result.academic_intent,
    confidence: result.confidence,
    summary: summarize(result.response),
    pass: failures.length === 0,
    failures,
    adapterNote,
    pending_validation_used: result.pending_validation_used,
  };
}

function main() {
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  const results = fixture.cases.map(runCase);
  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;

  // LLM stub smoke
  const llmStub = rephraseForWhatsApp("Hola test $4,650", {}, { EVA_LLM_ENABLED: false });
  const llmGuard = validateRephrase("Hola test $4,650", "Hola test $5,000 inventado", []);
  const llmChecks = [
    llmStub.rephrased === false && llmStub.text === "Hola test $4,650",
    llmGuard.ok === false,
  ];

  const lines = [
    "# Fase 7B.2 — Academic Engine Report",
    "",
    `> **Generado:** ${new Date().toISOString()}`,
    `> **Estado:** ${failed === 0 && llmChecks.every(Boolean) ? "PASS" : "FAIL"}`,
    "",
    "## Archivos creados",
    "",
    "### academic-engine",
    "- `insforge/functions/lib/academic-engine/truth.js`",
    "- `insforge/functions/lib/academic-engine/normalizer.js`",
    "- `insforge/functions/lib/academic-engine/entityExtractor.js`",
    "- `insforge/functions/lib/academic-engine/intentEngine.js`",
    "- `insforge/functions/lib/academic-engine/responseBuilder.js`",
    "- `insforge/functions/lib/academic-engine/stateManager.js`",
    "- `insforge/functions/lib/academic-engine/index.js`",
    "- `insforge/functions/lib/academic-engine/adapter.js`",
    "- `insforge/functions/lib/academic-engine/README.md`",
    "",
    "### eva-llm (stub)",
    "- `insforge/functions/lib/eva-llm/index.js`",
    "- `insforge/functions/lib/eva-llm/shouldUseLLM.js`",
    "- `insforge/functions/lib/eva-llm/guardrails.js`",
    "- `insforge/functions/lib/eva-llm/prompts.js`",
    "- `insforge/functions/lib/eva-llm/README.md`",
    "",
    "### tests",
    "- `tests/payloads/phase7b-academic-engine-cases.json`",
    "- `tests/run-phase7b-academic.mjs`",
    "",
    "## Pruebas ejecutadas",
    "",
    `| # | Input | Intent | Summary | Pass |`,
    `|---|---|---|---|:---:|`,
    ...results.map(
      (r) =>
        `| ${r.id} | ${r.input.replace(/\|/g, "\\|")} | ${r.intent} | ${r.summary.replace(/\|/g, "\\|")} | ${r.pass ? "✅" : "❌"} |`,
    ),
    "",
    `**Total:** ${passed}/${results.length} pass`,
    "",
    "## Fallos",
    "",
    ...(failed
      ? results
          .filter((r) => !r.pass)
          .flatMap((r) => [`### Caso ${r.id}`, ...r.failures.map((f) => `- ${f}`), ""])
      : ["- (ninguno)"]),
    "",
    "## LLM stub",
    "",
    `- rephraseForWhatsApp pass-through: ${llmChecks[0] ? "✅" : "❌"}`,
    `- validateRephrase rejects invented amount: ${llmChecks[1] ? "✅" : "❌"}`,
    "",
    "## Warnings / limitaciones",
    "",
    "- Detalle por carrera de servicio social, prácticas y documentos extra usa respuesta segura cuando `pending_validation`.",
    "- `Resumen IA` y claims marketing nunca se emiten.",
    "- Horario presencial detallado por carrera sigue pendiente.",
    "- Montos de descuento pago anual/semestral: pendiente_validacion.",
    "- **adapter.js no conectado** a `ycloud-wa-inbound.js`.",
    "",
    "## Confirmaciones",
    "",
    "- ✅ `ycloud-wa-inbound.js` **no modificado**",
    "- ✅ Sin WhatsApp real / sin deploy live",
    "- ✅ Sin LLM real (`EVA_LLM_ENABLED=false`)",
    "- ✅ Sin cambios GHL / YCloud / secrets",
    "",
    "## Recomendación Fase 7B.3",
    "",
    failed === 0
      ? "Integrar `adapter.enrichWaDecisionFromText` en `ycloud-wa-inbound.js` detrás de `ACADEMIC_ENGINE_ENABLED=true`, manteniendo `WA_AGENT_MODE=mock` y `GHL_SYNC_MODE=dry_run`."
      : "Corregir casos fallidos antes de integrar adapter en mock.",
    "",
  ];

  fs.writeFileSync(REPORT, lines.join("\n"), "utf8");
  console.log(`Report: ${REPORT}`);
  console.log(`Tests: ${passed}/${results.length} passed`);
  if (failed > 0) {
    results.filter((r) => !r.pass).forEach((r) => {
      console.error(`FAIL #${r.id}:`, r.failures.join("; "));
    });
    process.exit(1);
  }
}

main();
