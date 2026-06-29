#!/usr/bin/env node
/**
 * Phase 8B.1/8B.3 — getKnowledgeContext tests
 */

import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

const BUILD_SCRIPT = path.join(ROOT, "scripts/build-eva-cag-cache.mjs");

spawnSync(process.execPath, [BUILD_SCRIPT], { cwd: ROOT, encoding: "utf8" });

const { getKnowledgeContext, isQuerySuitableForCAG } = require(
  path.join(ROOT, "insforge/functions/lib/knowledge/getKnowledgeContext.js"),
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

function expectCAG(query, category = null) {
  const r = getKnowledgeContext(query);
  assert(`CAG "${query}" mode`, r.mode === "CAG");
  assert(`CAG "${query}" source`, r.source === "cache");
  assert(`CAG "${query}" context`, r.context.length > 0);
  assert(`CAG "${query}" version`, r.knowledgeVersion === "eva-unilatino-cag-v1");
  assert(`CAG "${query}" confidence`, r.confidence === "static");
  assert(`CAG "${query}" normalizedQuery`, typeof r.normalizedQuery === "string" && r.normalizedQuery.length > 0);
  if (category) assert(`CAG "${query}" category=${category}`, r.category === category);
}

function expectNone(query, category = null) {
  const r = getKnowledgeContext(query);
  assert(`NONE "${query}" mode`, r.mode === "NONE");
  assert(`NONE "${query}" source`, r.source === "not_cag_suitable");
  assert(`NONE "${query}" context empty`, r.context === "");
  assert(`NONE "${query}" confidence`, r.confidence === "none");
  if (category) assert(`NONE "${query}" category=${category}`, r.category === category);
}

console.log("Phase 8B.1/8B.3 — knowledge context tests\n");

console.log("CAG-suitable queries (baseline):");
expectCAG("tienen becas?", "scholarships");
expectCAG("carreras online?", "online_programs");
expectCAG("ubicacion?", "location");
expectCAG("tienen reconocimiento oficial?", "rvoe");
expectCAG("cuanto cuesta negocios internacionales?", "programs");
expectCAG("tienen medicina?", "not_offered");

console.log("\nCAG-suitable queries (8B.3 alignment):");
expectCAG("en que unicacion estan?", "location");
expectCAG("ubicasion?", "location");
expectCAG("esta cara no?", "price_objection");
expectCAG("está caro", "price_objection");
expectCAG("se me hace caro", "price_objection");
expectCAG("que promociones tienen?", "promotions_general");
expectCAG("medicida tienen?", "not_offered");
expectCAG("Tienen revalidación?", "revalidation_general");

console.log("\nNon-CAG / personalized / dynamic / greeting:");
expectNone("me pueden revalidar 8 materias de otra universidad?", "personalized");
expectNone("qué promoción tienen hoy?", "dynamic");
expectNone("hay descuento vigente este mes?", "dynamic");
expectNone("hay cupo mañana?", "dynamic");
expectNone("pueden revisar mi certificado?", "personalized");
expectNone("cuánto me toca de beca exacta?", "personalized");
expectNone("cuántas materias me revalidan?", "personalized");
expectNone("hola", "unknown_or_greeting");

assert("isQuerySuitableForCAG becas", isQuerySuitableForCAG("tienen becas?") === true);
assert(
  "isQuerySuitableForCAG revalidar 8",
  isQuerySuitableForCAG("me pueden revalidar 8 materias de otra universidad?") === false,
);
assert("isQuerySuitableForCAG unicacion typo", isQuerySuitableForCAG("en que unicacion estan?") === true);
assert("isQuerySuitableForCAG esta cara", isQuerySuitableForCAG("esta cara no?") === true);

console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
