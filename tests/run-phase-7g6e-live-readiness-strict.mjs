#!/usr/bin/env node
/**
 * 7G.6E-PREP — Strict live readiness gate (pre-activation).
 *
 * Requires:
 *   - HEAD = origin/main
 *   - No modified/staged tracked files
 *   - PHASE_7G6E_FULL_STRICT=1 → zero untracked (pre-live activation)
 *   - default → allow only 7G.6E-PREP artifact paths while validating
 *
 * Runs runtime probe + 7G.6C, VAL-0, ENG-0C, ENG-0B, Smoke 7C.
 *
 * Usage: node tests/run-phase-7g6e-live-readiness-strict.mjs
 * Output: tests/.phase-7g6e-live-readiness-strict-results.json
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_JSON = path.join(ROOT, "tests/.phase-7g6e-live-readiness-strict-results.json");
const ENDPOINT =
  process.env.PHASE_7G6E_ENDPOINT ||
  "https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound";

const SAFE_FLAGS = {
  mode: "mock",
  ghl_sync_mode: "dry_run",
  custom_fields_written: false,
  academic_engine_enabled: true,
  eva_llm_enabled: false,
  outbound_real: false,
  ghl_live: false,
};

const SUITES = [
  { id: "7G.6C", script: "tests/run-phase-7g6c-controlled-admissions-pilot.mjs" },
  { id: "VAL-0", script: "tests/run-phase-val-0-admissions-pilot-safe.mjs" },
  { id: "ENG-0C", script: "tests/run-phase-eng-0c-classify-intent-replay.mjs" },
  { id: "ENG-0B", script: "tests/run-phase-eng-0b-idempotency.mjs" },
  { id: "Smoke7C", script: "tests/run-phase7c-insforge-smoke.mjs" },
];

const ALLOWED_UNTRACKED = [
  /^docs\/phase-7g6e-/,
  /^tests\/run-phase-7g6e-/,
  /^tests\/\.phase-7g6e-/,
];

function gitOut(args) {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  return (r.stdout || "").trim();
}

function checkGitSync() {
  const head = gitOut(["rev-parse", "HEAD"]);
  const origin = gitOut(["rev-parse", "origin/main"]);
  const failures = [];
  if (!head) failures.push("cannot read HEAD");
  if (!origin) failures.push("cannot read origin/main");
  if (head && origin && head !== origin) {
    failures.push(`HEAD (${head.slice(0, 7)}) != origin/main (${origin.slice(0, 7)})`);
  }
  return { pass: failures.length === 0, failures, head, origin };
}

function checkWorkingTree() {
  const porcelain = gitOut(["status", "--porcelain"]);
  const lines = porcelain ? porcelain.split("\n").filter(Boolean) : [];
  const modified = lines.filter((l) => !l.startsWith("??"));
  const untracked = lines.filter((l) => l.startsWith("??")).map((l) => l.slice(3));
  const fullStrict = process.env.PHASE_7G6E_FULL_STRICT === "1";
  const failures = [];

  if (modified.length) failures.push(`modified/staged tracked: ${modified.length}`);

  const unexpected = untracked.filter(
    (p) => !ALLOWED_UNTRACKED.some((re) => re.test(p.replace(/\\/g, "/"))),
  );

  if (fullStrict && untracked.length) failures.push(`untracked files: ${untracked.length}`);
  else if (unexpected.length) {
    failures.push(`unexpected untracked: ${unexpected.join(", ")}`);
  }

  return {
    pass: failures.length === 0,
    failures,
    modified_count: modified.length,
    untracked_count: untracked.length,
    unexpected_untracked: unexpected,
    fullStrict,
  };
}

function runSuite(relPath) {
  const result = spawnSync(process.execPath, [path.join(ROOT, relPath)], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env },
    timeout: 300000,
  });
  return {
    pass: result.status === 0,
    exitCode: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

async function probeRuntime() {
  const payload = {
    event_type: "whatsapp.inbound_message.received",
    from: "+525577777777",
    to: "+529994538421",
    message_type: "text",
    message_text: "1",
    message_id: `7g6e-strict-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  const failures = [];
  if (res.status !== 200 || body.ok !== true) failures.push(`HTTP ${res.status} ok=${body.ok}`);

  for (const [key, expected] of Object.entries(SAFE_FLAGS)) {
    const actual = body[key];
    if (actual !== expected) failures.push(`${key}=${actual} (expected ${expected})`);
  }

  if (
    body.mode === "live_outbound" ||
    body.ghl_sync_mode === "live" ||
    body.outbound_real === true ||
    body.ghl_live === true
  ) {
    failures.push("runtime appears LIVE without authorization");
  }

  return { pass: failures.length === 0, failures, body };
}

async function main() {
  console.log("7G.6E strict live readiness gate\n");

  const sync = checkGitSync();
  console.log(sync.pass ? "PASS HEAD = origin/main" : "FAIL git sync");
  if (!sync.pass) sync.failures.forEach((f) => console.log(`  - ${f}`));

  const tree = checkWorkingTree();
  console.log(tree.pass ? "PASS working tree hygiene" : "FAIL working tree hygiene");
  if (!tree.pass) tree.failures.forEach((f) => console.log(`  - ${f}`));
  if (tree.untracked_count && tree.pass && !tree.fullStrict) {
    console.log(`  (info: ${tree.untracked_count} allowed 7G.6E-PREP untracked)`);
  }

  let probe = { pass: false, failures: ["skipped"], body: null };
  const suiteResults = [];
  let suitesPass = true;

  if (sync.pass && tree.pass) {
    probe = await probeRuntime();
    console.log(probe.pass ? "PASS Runtime flags (safe mock/dry_run)" : "FAIL Runtime flags");
    if (!probe.pass) probe.failures.forEach((f) => console.log(`  - ${f}`));
    else {
      console.log(
        `  mode=${probe.body.mode} ghl_sync_mode=${probe.body.ghl_sync_mode} outbound_real=${probe.body.outbound_real}`,
      );
    }

    console.log("");
    for (const suite of SUITES) {
      process.stdout.write(`Running ${suite.id}… `);
      const r = runSuite(suite.script);
      suiteResults.push({ id: suite.id, ...r });
      if (r.pass) console.log("PASS");
      else {
        console.log("FAIL");
        suitesPass = false;
        const tail = (r.stdout + r.stderr).split("\n").slice(-5).join("\n");
        if (tail) console.log(tail);
      }
      if (suite.id === "Smoke7C") {
        spawnSync("git", ["restore", "docs/phase-7c-insforge-controlled-deploy-report.md"], { cwd: ROOT });
      }
    }
  } else {
    console.log("\nSKIP runtime probe and suites (git gate failed)");
  }

  const pass = sync.pass && tree.pass && probe.pass && suitesPass;
  const summary = {
    phase: "7G.6E-PREP",
    timestamp: new Date().toISOString(),
    endpoint: ENDPOINT,
    pass,
    git_sync: sync,
    working_tree: tree,
    runtime_probe: probe.pass
      ? {
          pass: true,
          flags: {
            mode: probe.body.mode,
            ghl_sync_mode: probe.body.ghl_sync_mode,
            outbound_real: probe.body.outbound_real,
            ghl_live: probe.body.ghl_live,
          },
        }
      : { pass: false, failures: probe.failures },
    suites: suiteResults,
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2));
  console.log(`\n7G.6E strict readiness: ${pass ? "PASS" : "FAIL"}`);
  console.log(`Results: ${OUT_JSON}`);

  if (!pass) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
