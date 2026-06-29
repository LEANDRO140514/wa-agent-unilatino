#!/usr/bin/env node
/**
 * Phase 8B.8 — CAG assistive acceptance + console handoff (documental).
 * Read-only: validates acceptance report content. No APIs, no InsForge, no file writes.
 * Usage: node tests/run-phase8b8-cag-acceptance-console-handoff.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPORT_PATH = path.join(
  ROOT,
  "docs/phase-8b8-cag-assistive-acceptance-console-handoff.md",
);

const REQUIRED_PHRASES = [
  "wa-agent-unilatino",
  "algorithmus-wa-console",
  "no usar `curdeeclau-monorepo`",
  "8B.1",
  "8B.7",
  "CAG response injection sigue NO activo",
  "RAG productivo sigue NO activo",
  "LLM sigue apagado",
  "finalResponseModified=false",
  "responseText determinístico",
  "EVA_CAG_SHADOW_LOGGING",
  "EVA_CAG_ASSISTIVE_SHADOW",
  "EVA_CAG_RESPONSE_ENABLED",
  "location",
  "rvoe",
  "promotions_general",
  "dynamic",
  "personalized",
  "CONSOLE-0",
  "Audit whatsapp-saas",
  "eva-wa-unilatino",
  "universidad-latino",
  "eva-unilatino-cag-v1",
];

const FORBIDDEN_RECOMMENDATIONS = [
  { pattern: /activar\s+live\s+directamente/i, label: "activar live directamente" },
  { pattern: /activar\s+LLM\s+ahora/i, label: "activar LLM ahora" },
  { pattern: /activar\s+RAG\s+productivo/i, label: "activar RAG productivo" },
  { pattern: /deploy\s+inmediato/i, label: "deploy inmediato" },
  { pattern: /entrar\s+a\s+curdeeclau-monorepo/i, label: "entrar a curdeeclau-monorepo" },
  { pattern: /usar\s+curdeeclau-monorepo\s+para\s+esta\s+línea/i, label: "usar curdeeclau-monorepo" },
];

function hasForbiddenAsRecommendation(content, pattern) {
  const re = new RegExp(pattern.source, pattern.flags.includes("i") ? "gi" : "g");
  let match;
  while ((match = re.exec(content)) !== null) {
    const before = content.slice(Math.max(0, match.index - 24), match.index).toLowerCase();
    if (!/\b(no|sin|not|never|bloquead)\b[\s.:,*-]*$/i.test(before)) {
      return true;
    }
  }
  return false;
}

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

console.log("Phase 8B.8 — CAG acceptance + console handoff (documental)\n");

if (!fs.existsSync(REPORT_PATH)) {
  console.log(`  FAIL  report missing: ${REPORT_PATH}`);
  process.exit(1);
}

const content = fs.readFileSync(REPORT_PATH, "utf8");
const lower = content.toLowerCase();

console.log("Required phrases in acceptance report:");
for (const phrase of REQUIRED_PHRASES) {
  const found = content.includes(phrase) || lower.includes(phrase.toLowerCase());
  assert(`contains "${phrase}"`, found);
}

console.log("\nForbidden recommendations (must NOT appear as advice):");
for (const { pattern, label } of FORBIDDEN_RECOMMENDATIONS) {
  const match = hasForbiddenAsRecommendation(content, pattern);
  assert(`does not recommend ${label}`, !match, match ? "found as recommendation" : "");
}

console.log("\nStructural checks:");
assert("report has timeline table 8B.1–8B.7", /8B\.1.*4132fdb/.test(content) && /8B\.7.*5b2328c/.test(content));
assert("report has allowed categories section", /non_primary_levels/.test(content) && /online_programs/.test(content));
assert("report has blocked categories", /missing_cache/.test(content) && /unknown_or_greeting/.test(content));
assert("report documents gates", /WA_AGENT_MODE/.test(content) && /GHL_SYNC_MODE/.test(content));
assert("report documents handoff metrics", /assistiveAvailable/.test(content) || /assistive available/i.test(content));
assert("report closes 8B line", /ACEPTADA|cerrada.*PASS/i.test(content));

console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
