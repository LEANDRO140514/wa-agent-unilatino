#!/usr/bin/env node
/**
 * Fase 7G.4 — WA live_outbound controlado + GHL dry_run + rewrite allowlist.
 * Envía inbound simulado (mismo handler que YCloud) → outbound REAL a número de prueba.
 *
 * Usage:
 *   node tests/run-phase7g4-wa-live-rewrite-dryrun.mjs
 *   node tests/run-phase7g4-wa-live-rewrite-dryrun.mjs --optional   # incluye caso 6
 *
 * Rollback si falla: WA_AGENT_MODE=mock en InsForge Dashboard.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(ROOT, "tests/payloads/phase7g4-wa-live-rewrite-dryrun.json");
const REPORT = path.join(ROOT, "docs/phase-7g4-wa-live-rewrite-dryrun-report.md");

const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
const ENDPOINT = process.env.PHASE7G4_ENDPOINT || fixture.endpoint;
const DELAY_MS = Number(process.env.PHASE7G4_DELAY_MS || "8000");
const INCLUDE_OPTIONAL = process.argv.includes("--optional");
const COMMIT_BASE = fixture.commit_base;

function summarize(text, max = 90) {
  const one = String(text || "").replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max)}…` : one;
}

function includesAll(haystack, needles) {
  const h = String(haystack || "").toLowerCase();
  return needles.every((n) => h.includes(String(n).toLowerCase()));
}

function buildPayload(tc, messageId) {
  return {
    event_type: "whatsapp.inbound_message.received",
    from: fixture.from,
    to: fixture.to,
    message_id: messageId,
    message_type: "text",
    message_text: tc.input ?? "",
    timestamp: new Date().toISOString(),
  };
}

async function postInbound(tc, messageId) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildPayload(tc, messageId)),
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function postNonInboundPreflight() {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_type: "whatsapp.message.sent",
      type: "whatsapp.message.sent",
    }),
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

function gitCheck() {
  const top = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
  const head = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const status = execSync("git status --short", { encoding: "utf8" }).trim();
  const lines = status ? status.split("\n").map((l) => l.trim()).filter(Boolean) : [];
  const allowedUntracked = /^(\?\? tests\/(payloads\/phase7g4|run-phase7g4)|\?\? docs\/phase-7g4)/;
  const disallowed = lines.filter((l) => !allowedUntracked.test(l));
  return { top, head, clean: disallowed.length === 0, status, disallowed };
}

function checkLiveFlags(body, req) {
  const failures = [];
  if (body.mode !== req.mode) failures.push(`mode=${body.mode}`);
  if (body.ghl_live !== req.ghl_live) failures.push(`ghl_live=${body.ghl_live}`);
  if (body.ghl_dry_run !== req.ghl_dry_run) failures.push(`ghl_dry_run=${body.ghl_dry_run}`);
  if (body.ghl_sync_mode !== req.ghl_sync_mode) failures.push(`ghl_sync_mode=${body.ghl_sync_mode}`);
  if (body.custom_fields_written !== req.custom_fields_written) {
    failures.push(`custom_fields_written=${body.custom_fields_written}`);
  }
  if (body.academic_engine_enabled !== req.academic_engine_enabled) {
    failures.push(`academic_engine_enabled=${body.academic_engine_enabled}`);
  }
  if (body.eva_llm_enabled !== req.eva_llm_enabled) failures.push(`eva_llm_enabled=${body.eva_llm_enabled}`);
  if (req.eva_llm_mode && body.eva_llm_mode !== req.eva_llm_mode) {
    failures.push(`eva_llm_mode=${body.eva_llm_mode}`);
  }
  if (req.openai_api_key_configured && body.openai_api_key_configured !== true) {
    failures.push(`openai_api_key_configured=${body.openai_api_key_configured}`);
  }
  return failures;
}

function evaluateCase(tc, status, body, req) {
  const failures = [];
  if (status !== 200 || body.ok !== true) failures.push(`HTTP ${status} ok=${body.ok}`);

  failures.push(...checkLiveFlags(body, req));

  if (body.outbound_real !== true) failures.push(`outbound_real=${body.outbound_real}`);
  const obStatus = String(body.outbound_status || "").toLowerCase();
  if (tc.expect_outbound_status && !tc.expect_outbound_status.includes(obStatus)) {
    failures.push(`outbound_status=${body.outbound_status}`);
  }
  if (obStatus === "mocked" || obStatus === "failed") failures.push(`bad outbound_status=${body.outbound_status}`);

  if (tc.expect_wa_intent && body.intent !== tc.expect_wa_intent) {
    failures.push(`intent expected ${tc.expect_wa_intent}, got ${body.intent}`);
  }

  if (tc.expect_rephrased === true && body.eva_llm_rephrased !== true) {
    failures.push(`eva_llm_rephrased expected true`);
  }
  if (tc.expect_rephrased === false && body.eva_llm_rephrased === true) {
    failures.push("rewrite on blocked intent");
  }

  if (tc.expect_block_reason && body.eva_llm_block_reason !== tc.expect_block_reason) {
    failures.push(`block_reason expected ${tc.expect_block_reason}, got ${body.eva_llm_block_reason}`);
  }

  if (tc.expect_needs_human !== undefined && body.wa_needs_human !== tc.expect_needs_human) {
    failures.push(`wa_needs_human expected ${tc.expect_needs_human}`);
  }
  if (tc.expect_create_task !== undefined && body.ghl_would_create_task !== tc.expect_create_task) {
    failures.push(`createTask expected ${tc.expect_create_task}`);
  }

  if (tc.response_must_include && !includesAll(body.response_text, tc.response_must_include)) {
    failures.push(`missing: ${tc.response_must_include.join(", ")}`);
  }

  if (body.ghl_task_created === true) failures.push("ghl_task_created live");
  if (body.custom_fields_written === true) failures.push("custom_fields_written live");

  return {
    id: tc.id,
    input: tc.input,
    pass: failures.length === 0,
    failures,
    intent: body.intent,
    rephrased: body.eva_llm_rephrased,
    block_reason: body.eva_llm_block_reason || "—",
    outbound_status: body.outbound_status,
    provider_response_id: body.provider_response_id || null,
    inbound_id: body.inbound_id,
    outbound_id: body.outbound_id,
    preview: summarize(body.response_text),
  };
}

function writeReport(data) {
  const lines = [
    "# Phase 7G.4 — WA Live Outbound + GHL Dry_run Report",
    "",
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    `**Status:** ${data.passed === data.total ? "**PASS**" : data.rollback ? "**ROLLBACK RECOMMENDED**" : "**FAIL**"} (${data.passed}/${data.total})`,
    `**Endpoint:** ${ENDPOINT}`,
    `**Commit base:** \`${COMMIT_BASE}\``,
  ];
  if (data.git.head !== COMMIT_BASE) {
    lines.push(`**Git HEAD actual:** \`${data.git.head}\` (difiere del base)`);
  }
  lines.push(
    "",
    "## Flags iniciales (non-inbound preflight)",
    "",
    `| mode | ${data.preflight.body.mode} |`,
    `| outbound_real (preflight) | n/a (skipped event) |`,
    "",
    "## Flags durante prueba (caso 1)",
    "",
    `| mode | ${data.firstCaseFlags.mode} |`,
    `| outbound_real | ${data.firstCaseFlags.outbound_real} |`,
    `| ghl_live | ${data.firstCaseFlags.ghl_live} |`,
    `| ghl_dry_run | ${data.firstCaseFlags.ghl_dry_run} |`,
    `| eva_llm_mode | ${data.firstCaseFlags.eva_llm_mode} |`,
    `| openai_api_key_configured | ${data.firstCaseFlags.openai_api_key_configured} |`,
    "",
    "## Resultados",
    "",
    "| ID | Input | Intent | Rephrased | Outbound | provider_response_id | Result |",
    "|---:|---|---|:---:|:---:|---|---|",
  );
  for (const r of data.results) {
    lines.push(
      `| ${r.id} | ${summarize(r.input, 22)} | ${r.intent} | ${r.rephrased ? "yes" : "no"} | ${r.outbound_status} | ${r.provider_response_id || "—"} | ${r.pass ? "PASS" : "FAIL"} |`,
    );
  }
  lines.push(
    "",
    "## Confirmaciones",
    "",
    `- Mensajes con outbound real: **${data.results.filter((r) => r.outbound_status && r.outbound_status !== "mocked").length}**`,
    `- GHL live: **${data.results.some((r) => r.failures.some((f) => f.includes("ghl_live"))) ? "FAIL" : "NO"}**`,
    `- Custom fields live: **NO**`,
    `- Meta Ads: **NO**`,
    `- Rollback ejecutado: **${data.rollback ? "recomendado — ver abajo" : "no"}**`,
    "",
    "## Coste estimado OpenAI",
    "",
    `~$${data.estimatedCost} USD (${data.results.length} llamadas LLM)`,
  );
  if (data.failures.length) {
    lines.push("", "## Failures", "");
    for (const f of data.failures) lines.push(`- ${f}`);
  }
  if (data.rollback) {
    lines.push(
      "",
      "## Rollback",
      "",
      "Cambiar en InsForge Dashboard: `WA_AGENT_MODE=mock`",
      "Mantener: `GHL_SYNC_MODE=dry_run`, `LLM_MODE=rewrite`",
      "Luego: `node tests/run-phase7g3a-classifier-hotfix.mjs`",
    );
  }
  lines.push("", "## Recomendación", "", data.recommendation);
  fs.writeFileSync(REPORT, lines.join("\n"), "utf8");
}

// --- main ---
const git = gitCheck();
if (!git.top.replace(/\\/g, "/").endsWith("wa-agent-unilatino")) {
  console.error("BLOCKED: git root is not wa-agent-unilatino:", git.top);
  process.exit(2);
}
if (!git.clean) {
  console.error("BLOCKED: working tree has unexpected changes");
  console.error(git.disallowed.join("\n") || git.status);
  process.exit(2);
}

console.log(`Phase 7G.4 git OK @ ${git.head.slice(0, 7)}`);
console.log(`Preflight (non-inbound) → ${ENDPOINT}`);

const preflight = await postNonInboundPreflight();
if (preflight.body.mode !== "live_outbound") {
  console.error("BLOCKED: WA_AGENT_MODE is not live_outbound:", preflight.body.mode);
  console.error("Set WA_AGENT_MODE=live_outbound in InsForge Dashboard or stay on mock.");
  writeReport({
    passed: 0,
    total: 0,
    preflight,
    firstCaseFlags: {},
    results: [],
    failures: [`mode=${preflight.body.mode}`],
    rollback: false,
    git,
    estimatedCost: "0.0000",
    recommendation: "No ejecutar 7G.4 hasta activar live_outbound y confirmar YCloud secrets.",
  });
  process.exit(2);
}

const cases = fixture.cases.filter((c) => !c.optional || INCLUDE_OPTIONAL);
const results = [];
let consecutiveOutboundFails = 0;
let rollback = false;
let firstCaseBody = null;
const req = fixture.required_runtime_flags;

for (const tc of cases) {
  const messageId = `7g4-live-${tc.id}-${Date.now()}`;
  const { status, body } = await postInbound(tc, messageId);
  if (!firstCaseBody) firstCaseBody = body;
  const result = evaluateCase(tc, status, body, req);
  results.push(result);

  if (!result.pass) {
    console.log(`  FAIL #${tc.id}: ${result.failures.join("; ")}`);
    if (result.failures.some((f) => f.includes("outbound"))) {
      consecutiveOutboundFails++;
      if (consecutiveOutboundFails >= 2) {
        rollback = true;
        console.error("ROLLBACK: 2 outbound failures consecutivos");
        break;
      }
    }
    if (
      result.failures.some(
        (f) =>
          f.includes("rewrite on blocked") ||
          f.includes("ghl_task_created") ||
          f.includes("custom_fields_written") ||
          f.includes("ghl_live"),
      )
    ) {
      rollback = true;
      console.error("ROLLBACK: fallo crítico de seguridad");
      break;
    }
  } else {
    consecutiveOutboundFails = 0;
    console.log(`  PASS #${tc.id} outbound=${result.outbound_status} id=${result.provider_response_id || "—"}`);
  }

  await new Promise((r) => setTimeout(r, DELAY_MS));
}

const passed = results.filter((r) => r.pass).length;
const total = cases.length;
const requiredPass = results.filter((r) => !fixture.cases.find((c) => c.id === r.id)?.optional).length;
const requiredPassed = results.filter(
  (r) => r.pass && !fixture.cases.find((c) => c.id === r.id)?.optional,
).length;

const estimatedCost = ((results.length * 630 * 0.45) / 1_000_000).toFixed(4);

let recommendation;
if (rollback) {
  recommendation =
    "Ejecutar rollback a mock; diagnosticar YCloud/GHL; repetir 7G.4 solo tras corrección.";
} else if (requiredPassed >= 5 && passed === results.length) {
  recommendation =
    "Candidato a 7G.5 (GHL live controlado) solo con autorización explícita de Leandro. Mantener dry_run hasta entonces.";
} else if (requiredPassed >= 5) {
  recommendation = "Mínimo 5 casos core PASS; revisar opcionales. No avanzar a GHL live sin autorización.";
} else {
  recommendation = "Repetir 7G.4 o ajustar prompts/guardrails; considerar rollback a mock.";
}

const failureLines = results
  .filter((r) => !r.pass)
  .map((r) => `Case ${r.id}: ${r.failures.join("; ")}`);

writeReport({
  passed,
  total,
  preflight,
  firstCaseFlags: firstCaseBody || {},
  results,
  failures: failureLines,
  rollback,
  git,
  estimatedCost,
  recommendation,
});

console.log(`Phase 7G.4: ${passed}/${results.length} PASS (required ${requiredPassed}/5)`);
console.log(`Recommendation: ${recommendation}`);
if (rollback) console.log(">>> ROLLBACK: set WA_AGENT_MODE=mock in InsForge Dashboard <<<");

process.exit(rollback || requiredPassed < 5 ? 1 : 0);
