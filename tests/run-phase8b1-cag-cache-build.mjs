#!/usr/bin/env node
/**
 * Phase 8B.1 — CAG cache build tests
 */

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CACHE_PATH = path.join(ROOT, "docs/knowledge/cache/eva-cache-v1.json");
const BUILD_SCRIPT = path.join(ROOT, "scripts/build-eva-cag-cache.mjs");

const SECRET_PATTERNS = [
  "SUPABASE_SERVICE_ROLE",
  "OPENAI_API_KEY",
  "GHL_API_KEY",
  "YCLOUD_API_KEY",
  "INSFORGE_SERVICE_ROLE",
  "Bearer ",
  "sk-",
];

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

console.log("Phase 8B.1 — CAG cache build tests\n");

const build = spawnSync(process.execPath, [BUILD_SCRIPT], {
  cwd: ROOT,
  encoding: "utf8",
});
assert("build script exits 0", build.status === 0, build.stderr || build.stdout);
assert("cache file exists", fs.existsSync(CACHE_PATH));

let cache = {};
try {
  cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
} catch (e) {
  assert("cache JSON parse", false, e.message);
}

assert("tenantId", cache.tenantId === "universidad-latino");
assert("verticalId", cache.verticalId === "eva-wa-unilatino");
assert("knowledgeVersion", cache.knowledgeVersion === "eva-unilatino-cag-v1");
assert("generatedAt", typeof cache.generatedAt === "string" && cache.generatedAt.length > 0);
assert("contentHash", typeof cache.contentHash === "string" && cache.contentHash.length === 64);
assert("tokenEstimate > 0", cache.tokenEstimate > 0);
assert("sourceFiles array", Array.isArray(cache.sourceFiles) && cache.sourceFiles.length === 8);
assert("context string", typeof cache.context === "string" && cache.context.length > 0);
assert('context contains "Universidad Latino"', cache.context.includes("Universidad Latino"));
assert('context contains "Negocios Internacionales"', cache.context.includes("Negocios Internacionales"));
assert('context contains "Becas de excelencia"', cache.context.includes("Becas de excelencia"));
assert('context contains "RVOE"', cache.context.includes("RVOE"));
assert("context contains ubicación", cache.context.includes("Santa Rita Cholul"));

for (const pat of SECRET_PATTERNS) {
  assert(`no secret pattern "${pat}"`, !cache.context.includes(pat));
}

console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
