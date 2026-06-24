#!/usr/bin/env node
/**
 * Fase 7G.3 — Piloto controlado rewrite mock/dry_run.
 * Requires: LLM_MODE=rewrite + mock/dry_run + OPENAI_API_KEY
 *
 * Usage: node tests/run-phase7g3-rewrite-pilot-mock.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(ROOT, "tests/payloads/phase7g3-rewrite-pilot-mock.json");
const REPORT = path.join(ROOT, "docs/phase-7g3-rewrite-pilot-mock-report.md");

const { validateRephrase } = await import(
  pathToFileURL(path.join(ROOT, "insforge/functions/lib/eva-llm/guardrails.js")).href
);

const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
const ENDPOINT = process.env.PHASE7G3_ENDPOINT || fixture.endpoint;
const DELAY_MS = Number(process.env.PHASE7G3_DELAY_MS || "500");

const QUALITY_LABELS = [
  "better_tone",
  "same_quality",
  "worse",
  "too_short",
  "added_claims",
  "changed_meaning",
  "missing_link",
  "changed_escalation",
  "markdown_or_format_issue",
];

function summarize(text, max = 100) {
  const one = String(text || "").replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max)}…` : one;
}

function normalizeCompare(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSimilarity(a, b) {
  const ta = new Set(normalizeCompare(a).split(/\W+/).filter(Boolean));
  const tb = new Set(normalizeCompare(b).split(/\W+/).filter(Boolean));
  if (!ta.size && !tb.size) return 1;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.max(ta.size, tb.size, 1);
}

function extractMoney(text) {
  return new Set((String(text || "").match(/\$[\d,]+(?:\.\d+)?/g) || []).map((m) => m.replace(/,/g, "")));
}

function extractPercents(text) {
  return new Set(
    (String(text || "").match(/\d+(?:\.\d+)?\s*%/g) || []).map((m) => m.replace(/\s+/g, "")),
  );
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
    message_type: tc.message_type || "text",
    message_text: tc.input ?? "",
    timestamp: new Date().toISOString(),
  };
}

async function post(tc, messageId) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildPayload(tc, messageId)),
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

function checkRuntimeFlags(body, req) {
  const failures = [];
  if (body.mode !== req.mode) failures.push(`mode=${body.mode}`);
  if (body.outbound_real !== req.outbound_real) failures.push(`outbound_real=${body.outbound_real}`);
  if (body.ghl_live !== req.ghl_live) failures.push(`ghl_live=${body.ghl_live}`);
  if (body.ghl_dry_run !== req.ghl_dry_run) failures.push(`ghl_dry_run=${body.ghl_dry_run}`);
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
  if (req.eva_llm_provider && body.eva_llm_provider !== req.eva_llm_provider) {
    failures.push(`eva_llm_provider=${body.eva_llm_provider}`);
  }
  if (req.openai_api_key_configured === true && body.openai_api_key_configured !== true) {
    failures.push(`openai_api_key_configured=${body.openai_api_key_configured}`);
  }
  return failures;
}

/**
 * Clasifica calidad del rewrite comparando final vs suggested (proxy factual cuando bloqueado).
 */
function classifyRewriteQuality(body, tc) {
  const final = String(body.response_text || "");
  const suggested = String(body.eva_llm_suggested_response || "");
  const intent = body.intent;
  const rephrased = body.eva_llm_rephrased === true;

  if (!rephrased) return { quality: null, notes: "not_rephrased" };

  const baseline = suggested || final;
  const issues = [];
  const normFinal = normalizeCompare(final);

  if (/\*\*|^#|\*\s|```/.test(final)) issues.push("markdown_or_format_issue");
  if (intent === "no_se_que_estudiar" && !normFinal.includes("testunilatino")) {
    issues.push("missing_link");
  }
  if (intent === "humano" && !normFinal.includes("asesor")) issues.push("changed_escalation");
  if (body.wa_needs_human !== true && intent === "humano") issues.push("changed_escalation");

  const rephraseCheck = validateRephrase(baseline, final);
  for (const e of rephraseCheck.errors || []) {
    if (e.startsWith("new_amount") || e.startsWith("new_percent") || e.startsWith("banned_term")) {
      issues.push("added_claims");
    }
    if (e === "too_short") issues.push("too_short");
  }

  const baseMoney = extractMoney(baseline);
  const finalMoney = extractMoney(final);
  for (const m of finalMoney) if (!baseMoney.has(m)) issues.push("added_claims");
  const basePct = extractPercents(baseline);
  const finalPct = extractPercents(final);
  for (const p of finalPct) if (!basePct.has(p)) issues.push("added_claims");

  const sim = tokenSimilarity(baseline, final);
  if (sim < 0.35 && !issues.length) issues.push("changed_meaning");

  const guardrails = body.eva_llm_guardrail_warnings || [];
  if (guardrails.length > 0) issues.push("added_claims");

  if (issues.includes("added_claims")) return { quality: "added_claims", notes: issues.join(", ") };
  if (issues.includes("changed_escalation")) return { quality: "changed_escalation", notes: issues.join(", ") };
  if (issues.includes("missing_link")) return { quality: "missing_link", notes: issues.join(", ") };
  if (issues.includes("markdown_or_format_issue")) {
    return { quality: "markdown_or_format_issue", notes: issues.join(", ") };
  }
  if (issues.includes("too_short")) return { quality: "too_short", notes: issues.join(", ") };
  if (issues.includes("changed_meaning")) return { quality: "changed_meaning", notes: issues.join(", ") };

  if (sim >= 0.88) return { quality: "same_quality", notes: `similarity=${sim.toFixed(2)}` };
  if (sim >= 0.4 || /[\u{1F300}-\u{1FAFF}]/u.test(final)) {
    return { quality: "better_tone", notes: `similarity=${sim.toFixed(2)}` };
  }
  return { quality: "worse", notes: `similarity=${sim.toFixed(2)}` };
}

function evaluateCase(tc, status, body, req) {
  const failures = [];
  if (status !== 200 || body.ok !== true) failures.push(`HTTP ${status} ok=${body.ok}`);
  failures.push(...checkRuntimeFlags(body, req));
  if (body.outbound_status !== "mocked") failures.push(`outbound_status=${body.outbound_status}`);

  if (tc.expect_wa_intent && body.intent !== tc.expect_wa_intent) {
    failures.push(`intent expected ${tc.expect_wa_intent}, got ${body.intent}`);
  }

  const blockReason = body.eva_llm_block_reason ?? null;
  const rephrased = body.eva_llm_rephrased === true;
  const allowlist = fixture.rewrite_allowlist || [];
  const blocked = fixture.blocked_intents || [];
  const inAllowlist = allowlist.includes(body.intent);
  const inBlocked = blocked.includes(body.intent);

  if (tc.expect_block_reason !== undefined) {
    if (tc.expect_block_reason === null && blockReason) {
      failures.push(`unexpected block_reason=${blockReason}`);
    } else if (tc.expect_block_reason && blockReason !== tc.expect_block_reason) {
      failures.push(`block_reason expected ${tc.expect_block_reason}, got ${blockReason}`);
    }
  }

  if (tc.expect_rephrased === false && rephrased) failures.push("rewrite on blocked case");
  if (tc.expect_rewrite_allowed === false && rephrased) failures.push("rewrite on disallowed intent");
  if (inBlocked && rephrased) failures.push(`rewrite on blocked intent ${body.intent}`);

  if (inAllowlist && rephrased && blockReason) {
    failures.push(`rephrased with block_reason=${blockReason}`);
  }

  if (inBlocked && !rephrased) {
    const suggested = body.eva_llm_suggested_response;
    if (suggested && suggested !== body.response_text && body.intent !== "sin_texto") {
      // final must be factual — if different from suggested that's OK
    }
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

  if (tc.expect_guardrail_warnings) {
    const w = body.eva_llm_guardrail_warnings || [];
    if (!w.length) failures.push("guardrail_warnings empty");
  }

  if (body.eva_llm_error && inAllowlist && !blockReason) {
    failures.push(`eva_llm_error=${body.eva_llm_error}`);
  }

  const qualityResult = classifyRewriteQuality(body, tc);
  const qualityFail =
    qualityResult.quality &&
    ["added_claims", "changed_meaning", "changed_escalation"].includes(qualityResult.quality);
  if (qualityFail) failures.push(`quality=${qualityResult.quality}`);

  return {
    id: tc.id,
    group: tc.group,
    input: tc.input || `(${tc.message_type})`,
    pass: failures.length === 0,
    failures,
    wa_intent: body.intent,
    rephrased,
    block_reason: blockReason || "—",
    quality: qualityResult.quality,
    quality_notes: qualityResult.notes,
    final_text: body.response_text || "",
    suggested_text: body.eva_llm_suggested_response || "",
    final_preview: summarize(body.response_text),
    suggested_preview: summarize(body.eva_llm_suggested_response),
    guardrails: (body.eva_llm_guardrail_warnings || []).join("; ") || "—",
    needs_human: body.wa_needs_human,
    create_task: body.ghl_would_create_task,
  };
}

function estimateCost(results, model = "gpt-4o-mini") {
  const llmCalls = results.filter((r) => r.suggested_text || r.rephrased).length;
  const avgInputTokens = 450;
  const avgOutputTokens = 180;
  const inputCostPer1M = 0.15;
  const outputCostPer1M = 0.6;
  const inputCost = (llmCalls * avgInputTokens * inputCostPer1M) / 1_000_000;
  const outputCost = (llmCalls * avgOutputTokens * outputCostPer1M) / 1_000_000;
  return {
    model,
    llm_calls: llmCalls,
    estimated_usd: (inputCost + outputCost).toFixed(4),
    note: `~${llmCalls} calls × ~${avgInputTokens + avgOutputTokens} tokens (estimado)`,
  };
}

function buildRecommendation(passed, total, rephrased, qualityStats, safetyOk) {
  const good = (qualityStats.better_tone || 0) + (qualityStats.same_quality || 0);
  const qualityRate = rephrased > 0 ? good / rephrased : 0;

  if (passed < total || !safetyOk) {
    return "Ajustar prompts/guardrails y repetir piloto en mock antes de cualquier live_outbound.";
  }
  if (qualityRate >= 0.8 && (qualityStats.added_claims || 0) === 0) {
    return "Candidato a 7G.4 live_outbound controlado (solo con autorización explícita; mantener GHL dry_run inicialmente).";
  }
  if (qualityRate >= 0.6) {
    return "Ajustar prompts/guardrails (tono OK parcial); mantener rewrite solo en mock/dry_run.";
  }
  return "Mantener rewrite solo en mock/dry_run; no avanzar a live_outbound.";
}

function writeReport({ pre, results, passed, total, cost, recommendation }) {
  const rephrasedResults = results.filter((r) => r.rephrased);
  const rephrasedCount = rephrasedResults.length;
  const blockedCount = results.filter((r) => r.block_reason && r.block_reason !== "—").length;

  const blockReasonCounts = {};
  for (const r of results) {
    const br = r.block_reason === "—" ? "(none)" : r.block_reason;
    blockReasonCounts[br] = (blockReasonCounts[br] || 0) + 1;
  }

  const qualityStats = {};
  for (const label of QUALITY_LABELS) qualityStats[label] = 0;
  for (const r of rephrasedResults) {
    if (r.quality) qualityStats[r.quality] = (qualityStats[r.quality] || 0) + 1;
  }

  const goodQuality = (qualityStats.better_tone || 0) + (qualityStats.same_quality || 0);
  const qualityPct = rephrasedCount ? Math.round((goodQuality / rephrasedCount) * 100) : 0;

  const lines = [
    "# Phase 7G.3 — Rewrite Pilot Mock/Dry_run Report",
    "",
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    `**Result:** ${passed}/${total} PASS`,
    `**Endpoint:** ${ENDPOINT}`,
    "",
    "## Flags (preflight)",
    "",
    "| Flag | Valor |",
    "|------|-------|",
    `| mode | ${pre.body.mode} |`,
    `| eva_llm_mode | ${pre.body.eva_llm_mode} |`,
    `| eva_llm_provider | ${pre.body.eva_llm_provider} |`,
    `| eva_llm_model | ${pre.body.eva_llm_model || fixture.expected_model} |`,
    `| outbound_real | ${pre.body.outbound_real} |`,
    `| outbound_status | mocked |`,
    `| ghl_live | ${pre.body.ghl_live} |`,
    `| ghl_dry_run | ${pre.body.ghl_dry_run} |`,
    "",
    "## Resumen",
    "",
    `- **Total casos:** ${total}`,
    `- **PASS:** ${passed} | **FAIL:** ${total - passed}`,
    `- **Rewrites aplicados:** ${rephrasedCount}`,
    `- **Bloqueos (block_reason):** ${blockedCount}`,
    `- **Calidad good (better_tone + same_quality):** ${goodQuality}/${rephrasedCount} (${qualityPct}%)`,
    `- **Costo estimado OpenAI:** ~$${cost.estimated_usd} USD (${cost.note})`,
    "",
    "## block_reasons",
    "",
    ...Object.entries(blockReasonCounts).map(([k, v]) => `- \`${k}\`: ${v}`),
    "",
    "## Casos",
    "",
    "| ID | Grupo | Input | Intent | Rephrased | block_reason | Calidad | Result |",
    "|---:|---|---|---|:---:|:---:|---|---|",
  ];

  for (const r of results) {
    lines.push(
      `| ${r.id} | ${r.group} | ${summarize(r.input, 22)} | ${r.wa_intent} | ${r.rephrased ? "yes" : "no"} | ${r.block_reason} | ${r.quality || "—"} | ${r.pass ? "PASS" : "FAIL"} |`,
    );
  }

  lines.push("", "## Evaluación de calidad (solo rephrased)", "");
  for (const label of QUALITY_LABELS) {
    lines.push(`- **${label}:** ${qualityStats[label] || 0}`);
  }

  lines.push("", "## Muestras factual vs final", "");
  lines.push("> Cuando `rephrased=true`, `final` = suggested. Cuando bloqueado, `final` = factual (suggested solo en logs).", "");
  for (const r of results.filter((x) => x.rephrased || x.group === "blocked").slice(0, 12)) {
    lines.push(`### ${r.id} — ${summarize(r.input, 40)}`, "");
    lines.push(`- **Intent:** ${r.wa_intent} | **Rephrased:** ${r.rephrased} | **Calidad:** ${r.quality || "n/a"}`);
    lines.push(`- **Final:** ${r.final_preview}`);
    if (r.suggested_preview && r.rephrased) {
      lines.push(`- **Suggested:** ${r.suggested_preview}`);
    }
    if (r.guardrails !== "—") lines.push(`- **Guardrails:** ${r.guardrails}`);
    lines.push("");
  }

  lines.push("## Hallazgos del clasificador", "");
  lines.push("Mensajes del grupo A/C/D que caen en `ambiguo` (rewrite bloqueado por diseño):");
  for (const r of results.filter((x) => x.wa_intent === "ambiguo" && x.group !== "blocked")) {
    lines.push(`- \`${r.id}\` "${summarize(r.input, 50)}" → ambiguo (considerar ampliar menú/clasificador en fase futura, no en 7G.3)`);
  }

  lines.push("", "## Criterios de aprobación", "");
  const safetyOk =
    results.every((r) => r.pass || r.failures.every((f) => !f.includes("rewrite on blocked"))) &&
    !results.some((r) => r.failures.some((f) => f.includes("outbound_real") || f.includes("ghl_live")));
  lines.push(`- HTTP 200 + mock/dry_run: ${passed === total ? "OK" : "FAIL"}`);
  lines.push(`- 0 rewrite en beca/post_test/duda_test/sin_texto/ambiguo: ${results.every((r) => !fixture.blocked_intents.includes(r.wa_intent) || !r.rephrased) ? "OK" : "FAIL"}`);
  lines.push(`- 0 added_claims/changed_meaning en finales rephrased: ${(qualityStats.added_claims || 0) + (qualityStats.changed_meaning || 0) === 0 ? "OK" : "FAIL"}`);
  lines.push(`- ≥80% better_tone/same_quality: ${qualityPct >= 80 ? "OK" : `FAIL (${qualityPct}%)`}`);

  lines.push("", "## Errores", "");
  const failed = results.filter((r) => !r.pass);
  if (!failed.length) lines.push("- Ninguno");
  else for (const r of failed) lines.push(`- **${r.id}:** ${r.failures.join("; ")}`);

  lines.push("", "## Recomendación", "", recommendation, "");

  lines.push("## SQL (logs InsForge)", "", "```sql");
  lines.push("SELECT count(*)::int FROM wa_llm_shadow_log WHERE mode = 'rewrite';");
  lines.push("SELECT wa_intent, eva_llm_rephrased, block_reason, left(final_response,60)");
  lines.push("FROM wa_llm_shadow_log WHERE mode = 'rewrite' ORDER BY created_at DESC LIMIT 24;");
  lines.push("```");

  fs.writeFileSync(REPORT, lines.join("\n"), "utf8");
}

console.log(`Phase 7G.3 preflight → ${ENDPOINT}`);
const pre = await post({ input: "__phase7g3_preflight__" }, `7g3-preflight-${Date.now()}`);
const preFailures = checkRuntimeFlags(pre.body, fixture.required_runtime_flags);
if (pre.status !== 200 || pre.body.ok !== true) preFailures.push(`HTTP ${pre.status}`);

if (preFailures.length) {
  console.error("PREFLIGHT FAILED:", preFailures.join("; "));
  fs.writeFileSync(
    REPORT,
    `# Phase 7G.3 — BLOCKED\n\nPreflight failed:\n${preFailures.map((f) => `- ${f}`).join("\n")}\n`,
    "utf8",
  );
  process.exit(2);
}

const results = [];
for (const tc of fixture.cases) {
  const { status, body } = await post(tc, `7g3-${tc.id}-${Date.now()}`);
  results.push(evaluateCase(tc, status, body, fixture.required_runtime_flags));
  await new Promise((r) => setTimeout(r, DELAY_MS));
}

const passed = results.filter((r) => r.pass).length;
const total = results.length;
const rephrasedCount = results.filter((r) => r.rephrased).length;
const qualityStats = {};
for (const r of results.filter((x) => x.rephrased && x.quality)) {
  qualityStats[r.quality] = (qualityStats[r.quality] || 0) + 1;
}

const cost = estimateCost(results, pre.body.eva_llm_model || fixture.expected_model);
const safetyOk = !results.some(
  (r) => r.rephrased && fixture.blocked_intents.includes(r.wa_intent),
);
const recommendation = buildRecommendation(passed, total, rephrasedCount, qualityStats, safetyOk);

writeReport({ pre, results, passed, total, cost, recommendation });

console.log(`Phase 7G.3 pilot: ${passed}/${total} PASS`);
console.log(`Rewrites: ${rephrasedCount}, Blocked: ${results.filter((r) => r.block_reason !== "—").length}`);
console.log(`Quality: ${JSON.stringify(qualityStats)}`);
console.log(`Est. cost: $${cost.estimated_usd}`);
console.log(`Recommendation: ${recommendation}`);
for (const r of results.filter((x) => !x.pass)) {
  console.log(`  FAIL ${r.id}: ${r.failures.join("; ")}`);
}

const goodQ =
  rephrasedCount > 0
    ? ((qualityStats.better_tone || 0) + (qualityStats.same_quality || 0)) / rephrasedCount
    : 0;
const exitOk = passed === total && goodQ >= 0.8 && safetyOk;
process.exit(exitOk ? 0 : 1);
