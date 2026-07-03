#!/usr/bin/env node
/**
 * 7G.6D — Live readiness gate (mock/dry_run pre-activation).
 *
 * Runs: 7G.6C, VAL-0, ENG-0C, ENG-0B, Smoke 7C + runtime flag probe + git hygiene.
 *
 * Usage: node tests/run-phase-7g6d-live-readiness.mjs
 * Output: tests/.phase-7g6d-live-readiness-results.json
 *
 * Env:
 *   PHASE_7G6D_STRICT_GIT=1  — fail on any untracked files (pre-live activation)
 *   PHASE_7G6D_SKIP_SUITES=1 — skip child suite runners (probe + git only)
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_JSON = path.join(ROOT, "tests/.phase-7g6d-live-readiness-results.json");
const ENDPOINT =
  process.env.PHASE_7G6D_ENDPOINT ||
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
  { id: "7G.6C", script: "tests/run-phase-7g6c-controlled-admissions-pilot.mjs", expect: "7/7" },
  { id: "VAL-0", script: "tests/run-phase-val-0-admissions-pilot-safe.mjs", expect: "7/7" },
  { id: "ENG-0C", script: "tests/run-phase-eng-0c-classify-intent-replay.mjs", expect: "17/17" },
  { id: "ENG-0B", script: "tests/run-phase-eng-0b-idempotency.mjs", expect: "4/4" },
  { id: "Smoke7C", script: "tests/run-phase7c-insforge-smoke.mjs", expect: "10/10" },
];

function runSuite(relPath) {
  const result = spawnSync(process.execPath, [path.join(ROOT, relPath)], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env },
    timeout: 300000,
  });
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    pass: result.status === 0,
  };
}

function checkGit() {
  const status = spawnSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" });
  const lines = (status.stdout || "").trim().split("\n").filter(Boolean);
  const modified = lines.filter((l) => !l.startsWith("??"));
  const untracked = lines.filter((l) => l.startsWith("??"));
  const strict = process.env.PHASE_7G6D_STRICT_GIT === "1";
  const failures = [];
  if (modified.length) failures.push(`modified/staged tracked files: ${modified.length}`);
  if (strict && untracked.length) failures.push(`untracked files: ${untracked.length}`);
  return {
    pass: failures.length === 0,
    failures,
    modified_count: modified.length,
    untracked_count: untracked.length,
    strict,
  };
}

async function probeRuntime() {
  const payload = {
    event_type: "whatsapp.inbound_message.received",
    from: "+525577777777",
    to: "+529994538421",
    message_type: "text",
    message_text: "1",
    message_id: `7g6d-readiness-${Date.now()}`,
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

  const liveWithoutAuth =
    body.mode === "live_outbound" ||
    body.ghl_sync_mode === "live" ||
    body.outbound_real === true ||
    body.ghl_live === true;
  if (liveWithoutAuth) failures.push("runtime appears LIVE without authorization");

  return { pass: failures.length === 0, failures, body };
}

async function main() {
  console.log("7G.6D live readiness gate");
  console.log(`Endpoint: ${ENDPOINT}\n`);

  const git = checkGit();
  console.log(git.pass ? "PASS Git hygiene" : "FAIL Git hygiene");
  if (!git.pass) git.failures.forEach((f) => console.log(`  - ${f}`));
  if (git.untracked_count && !git.strict) {
    console.log(`  (info: ${git.untracked_count} untracked — OK unless PHASE_7G6D_STRICT_GIT=1)`);
  }

  const probe = await probeRuntime();
  console.log(probe.pass ? "PASS Runtime flags (safe mock/dry_run)" : "FAIL Runtime flags");
  if (!probe.pass) probe.failures.forEach((f) => console.log(`  - ${f}`));
  else {
    console.log(
      `  mode=${probe.body.mode} ghl_sync_mode=${probe.body.ghl_sync_mode} outbound_real=${probe.body.outbound_real}`,
    );
  }

  const suiteResults = [];
  let suitesPass = true;

  if (process.env.PHASE_7G6D_SKIP_SUITES !== "1") {
    console.log("");
    for (const suite of SUITES) {
      process.stdout.write(`Running ${suite.id}… `);
      const r = runSuite(suite.script);
      suiteResults.push({ id: suite.id, expect: suite.expect, ...r });
      if (r.pass) {
        console.log("PASS");
      } else {
        console.log("FAIL");
        suitesPass = false;
        const tail = (r.stdout + r.stderr).split("\n").slice(-5).join("\n");
        if (tail) console.log(tail);
      }
      if (suite.id === "Smoke7C") {
        spawnSync("git", ["restore", "docs/phase-7c-insforge-controlled-deploy-report.md"], { cwd: ROOT });
      }
    }
  }

  const pass = git.pass && probe.pass && suitesPass;
  const summary = {
    phase: "7G.6D",
    timestamp: new Date().toISOString(),
    endpoint: ENDPOINT,
    pass,
    git,
    runtime_probe: {
      pass: probe.pass,
      failures: probe.failures,
      flags: probe.body
        ? {
            mode: probe.body.mode,
            ghl_sync_mode: probe.body.ghl_sync_mode,
            outbound_real: probe.body.outbound_real,
            ghl_live: probe.body.ghl_live,
            custom_fields_written: probe.body.custom_fields_written,
            academic_engine_enabled: probe.body.academic_engine_enabled,
            eva_llm_enabled: probe.body.eva_llm_enabled,
          }
        : null,
    },
    suites: suiteResults,
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2));
  console.log(`\n7G.6D readiness: ${pass ? "PASS" : "FAIL"}`);
  console.log(`Results: ${OUT_JSON}`);

  if (!pass) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
