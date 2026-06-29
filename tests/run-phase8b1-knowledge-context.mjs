#!/usr/bin/env node
/**
 * Phase 8B.1 — getKnowledgeContext tests
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
  path.join(ROOT, "insforge/functions/lib/knowledge/getKnowledgeContext.js")
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

function expectCAG(query) {
  const r = getKnowledgeContext(query);
  assert(`CAG "${query}" mode`, r.mode === "CAG");
  assert(`CAG "${query}" source`, r.source === "cache");
  assert(`CAG "${query}" context`, r.context.length > 0);
  assert(`CAG "${query}" version`, r.knowledgeVersion === "eva-unilatino-cag-v1");
  assert(`CAG "${query}" confidence`, r.confidence === "static");
}

function expectNone(query) {
  const r = getKnowledgeContext(query);
  assert(`NONE "${query}" mode`, r.mode === "NONE");
  assert(`NONE "${query}" source`, r.source === "not_cag_suitable");
  assert(`NONE "${query}" context empty`, r.context === "");
  assert(`NONE "${query}" confidence`, r.confidence === "none");
}

console.log("Phase 8B.1 — knowledge context tests\n");

console.log("CAG-suitable queries:");
expectCAG("tienen becas?");
expectCAG("carreras online?");
expectCAG("ubicacion?");
expectCAG("tienen reconocimiento oficial?");
expectCAG("cuanto cuesta negocios internacionales?");
expectCAG("tienen medicina?");

console.log("\nNon-CAG / personalized queries:");
expectNone("me pueden revalidar 8 materias de otra universidad?");
expectNone("qué promoción tienen hoy?");
expectNone("hay cupo mañana?");
expectNone("pueden revisar mi certificado?");
expectNone("cuánto me toca de beca exacta?");

assert("isQuerySuitableForCAG becas", isQuerySuitableForCAG("tienen becas?") === true);
assert(
  "isQuerySuitableForCAG revalidar 8",
  isQuerySuitableForCAG("me pueden revalidar 8 materias de otra universidad?") === false
);

console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
