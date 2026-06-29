#!/usr/bin/env node
/**
 * Phase 8B.3 — CAG router + Eva normalizer alignment tests
 */

import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

const { normalizeCagQuery, classifyCagQuery } = require(
  path.join(ROOT, "insforge/functions/lib/knowledge/cagQueryNormalizer.js"),
);
const { getKnowledgeContext } = require(
  path.join(ROOT, "insforge/functions/lib/knowledge/getKnowledgeContext.js"),
);
const { evaluateCagShadow } = require(
  path.join(ROOT, "insforge/functions/lib/knowledge/cagShadowEvaluator.js"),
);

let passed = 0;
let failed = 0;

function assert(name, ok, detail = "") {
  if (ok) {
    console.log(`  PASS  ${name}`);
    passed++;
  } else {
    console.log(`  FAIL  ${name}${detail ? `: ${detail}` : ""}`);
    failed++;
  }
}

function expectCase({ query, mode, category, recommendation = null }) {
  const classified = classifyCagQuery(query);
  const ctx = getKnowledgeContext(query);
  assert(`"${query}" mode=${mode}`, ctx.mode === mode);
  assert(`"${query}" category=${category}`, ctx.category === category);
  assert(`"${query}" typo normalize`, normalizeCagQuery(query).length > 0);

  if (recommendation) {
    const shadow = evaluateCagShadow({
      message: query,
      deterministicIntent: "test_intent",
      deterministicResponse: "respuesta determinística de prueba",
    });
    assert(`"${query}" recommendation=${recommendation}`, shadow.recommendation === recommendation);
    assert(`"${query}" finalResponseModified=false`, shadow.finalResponseModified === false);
  }
}

console.log("Phase 8B.3 — CAG router normalizer alignment\n");

expectCase({
  query: "en que unicacion estan?",
  mode: "CAG",
  category: "location",
  recommendation: "useful",
});
expectCase({
  query: "ubicasion?",
  mode: "CAG",
  category: "location",
  recommendation: "useful",
});
expectCase({
  query: "esta cara no?",
  mode: "CAG",
  category: "price_objection",
  recommendation: "useful",
});
expectCase({
  query: "se me hace caro",
  mode: "CAG",
  category: "price_objection",
  recommendation: "useful",
});
expectCase({
  query: "que promociones tienen?",
  mode: "CAG",
  category: "promotions_general",
  recommendation: "useful_with_human_followup",
});
expectCase({
  query: "promoción de hoy?",
  mode: "NONE",
  category: "dynamic",
  recommendation: "requires_dynamic",
});
expectCase({
  query: "me pueden revalidar 8 materias?",
  mode: "NONE",
  category: "personalized",
  recommendation: "requires_human",
});
expectCase({
  query: "Tienen revalidación?",
  mode: "CAG",
  category: "revalidation_general",
});
expectCase({
  query: "medicida tienen?",
  mode: "CAG",
  category: "not_offered",
  recommendation: "useful",
});
expectCase({
  query: "hola",
  mode: "NONE",
  category: "unknown_or_greeting",
  recommendation: "not_applicable",
});

console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
