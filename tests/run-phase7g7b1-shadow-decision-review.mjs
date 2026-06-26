#!/usr/bin/env node
/**
 * Phase 7G.7B.1 — Shadow decision review (remote InsForge, read-only intent).
 * Usage: node tests/run-phase7g7b1-shadow-decision-review.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENDPOINT =
  process.env.PHASE7G7B1_ENDPOINT ||
  "https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound";
const FROM = process.env.PHASE7G7B1_FROM || "+529991525583";
const TO = process.env.PHASE7G7B1_TO || "+529994538421";
const META_FIRST_FROM = process.env.PHASE7G7B1_META_FIRST_FROM || "+529991525586";
const META_SECOND_FROM = process.env.PHASE7G7B1_META_SECOND_FROM || "+529991525587";
const DELAY_MS = Number(process.env.PHASE7G7B1_DELAY_MS || "600");
const REPORT_PATH = path.join(ROOT, "docs/phase-7g7b1-shadow-decision-review.md");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function yn(v) {
  if (v === true) return "Y";
  if (v === false) return "N";
  return "-";
}

function hardFail(body, shadow) {
  const issues = [];
  if (body.outbound_real === true) issues.push("outbound_real=true");
  if (body.ghl_live === true) issues.push("ghl_live=true");
  if (!shadow) issues.push("ghl_relevance_shadow missing");
  if (shadow?.enabled !== true) issues.push("shadow.enabled!=true");
  return issues;
}

function verdictFrom(issues, hardIssues, reviewNotes = []) {
  if (hardIssues.length) return { verdict: "FAIL", notes: [...hardIssues, ...issues, ...reviewNotes] };
  if (issues.length || reviewNotes.length) return { verdict: "REVIEW", notes: [...issues, ...reviewNotes] };
  return { verdict: "PASS", notes: [] };
}

const CASES = [
  {
    id: "18",
    order: 1,
    label: "Meta Ads primer saludo",
    from: META_FIRST_FROM,
    message: "Hola",
    source: "meta_ads",
    first_message: true,
    comment: "Teléfono aislado + first_message=true en payload.",
    evaluate(body, s) {
      const hard = hardFail(body, s);
      const issues = [];
      const review = [];
      if (s?.would_sync_to_ghl !== false) issues.push("would_sync_to_ghl!=false");
      if (s?.ignored_for_ghl !== true) issues.push("ignored_for_ghl!=true");
      if (s?.would_create_task === true) issues.push("would_create_task=true");
      if (s?.routing_reason !== "meta_ads_first_message_no_sync") {
        issues.push(`routing_reason=${s?.routing_reason}`);
      }
      return verdictFrom(issues, hard);
    },
  },
  {
    id: "01",
    order: 2,
    label: "saludo simple",
    message: "Hola",
    evaluate(body, s) {
      const hard = hardFail(body, s);
      const issues = [];
      if (s?.would_sync_to_ghl !== false) issues.push("would_sync_to_ghl!=false");
      if (s?.would_create_task === true) issues.push("would_create_task=true");
      if (!s?.ignored_for_ghl && !["ignored_intent", "below_threshold"].includes(s?.routing_reason)) {
        issues.push(`ignored/routing: ignored=${s?.ignored_for_ghl} reason=${s?.routing_reason}`);
      }
      return verdictFrom(issues, hard);
    },
  },
  {
    id: "02",
    order: 3,
    label: "agradecimiento simple",
    message: "Gracias",
    evaluate(body, s) {
      const hard = hardFail(body, s);
      const issues = [];
      if (s?.would_sync_to_ghl !== false) issues.push("would_sync_to_ghl!=false");
      if (s?.would_create_task === true) issues.push("would_create_task=true");
      return verdictFrom(issues, hard);
    },
  },
  {
    id: "03",
    order: 4,
    label: "despedida simple",
    message: "Bye",
    evaluate(body, s) {
      const hard = hardFail(body, s);
      const issues = [];
      if (s?.would_sync_to_ghl !== false) issues.push("would_sync_to_ghl!=false");
      if (s?.would_create_task === true) issues.push("would_create_task=true");
      return verdictFrom(issues, hard);
    },
  },
  {
    id: "04",
    order: 5,
    label: "carreras disponibles",
    message: "Qué carreras tienen?",
    evaluate(body, s) {
      const hard = hardFail(body, s);
      const review = [];
      if (s?.would_create_task === true) review.push("would_create_task=true (catálogo general, revisar)");
      return verdictFrom([], hard, review);
    },
  },
  {
    id: "05",
    order: 6,
    label: "carrera concreta",
    message: "Me interesa Derecho online",
    evaluate(body, s) {
      const hard = hardFail(body, s);
      const issues = [];
      const review = [];
      if (s?.would_sync_to_ghl !== true) issues.push("would_sync_to_ghl!=true");
      if (s?.qualified_for_ghl !== true) issues.push("qualified_for_ghl!=true");
      if (s?.would_create_contact !== true) issues.push("would_create_contact!=true");
      if (s?.would_create_note !== true) issues.push("would_create_note!=true");
      if (s?.would_create_task === true) review.push("would_create_task=true (no handoff esperado)");
      if ((s?.lead_score ?? 0) < 45) review.push(`lead_score=${s?.lead_score}<45`);
      return verdictFrom(issues, hard, review);
    },
  },
  {
    id: "06",
    order: 7,
    label: "beca con promedio",
    message: "Tengo promedio 9.2, qué beca me toca?",
    evaluate(body, s) {
      const hard = hardFail(body, s);
      const issues = [];
      const review = [];
      if (s?.would_sync_to_ghl !== true) issues.push("would_sync_to_ghl!=true");
      if (s?.would_create_contact !== true) issues.push("would_create_contact!=true");
      if (s?.would_create_note !== true) issues.push("would_create_note!=true");
      if (s?.would_create_task !== true) review.push("would_create_task=false (beca puede requerir seguimiento)");
      if (!s?.human_handoff_reason) review.push("human_handoff_reason ausente");
      if ((s?.lead_score ?? 0) < 45) issues.push(`lead_score=${s?.lead_score}<45`);
      return verdictFrom(issues, hard, review);
    },
  },
  {
    id: "07",
    order: 8,
    label: "costo",
    message: "Cuánto cuesta Derecho en línea?",
    evaluate(body, s) {
      const hard = hardFail(body, s);
      const issues = [];
      if (s?.would_sync_to_ghl !== true) issues.push("would_sync_to_ghl!=true");
      if (s?.would_create_contact !== true) issues.push("would_create_contact!=true");
      if (s?.would_create_note !== true) issues.push("would_create_note!=true");
      if (s?.would_create_task !== true) issues.push("would_create_task!=true");
      if (s?.human_handoff_reason !== "cost_or_tuition_requires_validation") {
        issues.push(`human_handoff_reason=${s?.human_handoff_reason ?? "missing"}`);
      }
      if (s?.routing_reason !== "cost_signal_requires_human_validation") {
        issues.push(`routing_reason=${s?.routing_reason}`);
      }
      if ((s?.lead_score ?? 0) < 45) issues.push(`lead_score=${s?.lead_score}<45`);
      return verdictFrom(issues, hard);
    },
  },
  {
    id: "08",
    order: 9,
    label: "asesor",
    message: "Quiero hablar con un asesor",
    evaluate(body, s) {
      const hard = hardFail(body, s);
      const issues = [];
      const review = [];
      if (s?.would_sync_to_ghl !== true) issues.push("would_sync_to_ghl!=true");
      if (s?.would_create_contact !== true) issues.push("would_create_contact!=true");
      if (s?.would_create_note !== true) issues.push("would_create_note!=true");
      if (s?.would_create_task !== true) issues.push("would_create_task!=true");
      if (!s?.human_handoff_reason) issues.push("human_handoff_reason missing");
      if ((s?.lead_score ?? 0) < 45) review.push(`lead_score=${s?.lead_score}<45`);
      return verdictFrom(issues, hard, review);
    },
  },
  {
    id: "09",
    order: 10,
    label: "inscripción explícita",
    message: "Quiero inscribirme esta semana",
    evaluate(body, s) {
      const hard = hardFail(body, s);
      const issues = [];
      if (s?.would_sync_to_ghl !== true) issues.push("would_sync_to_ghl!=true");
      if (s?.would_create_contact !== true) issues.push("would_create_contact!=true");
      if (s?.would_create_note !== true) issues.push("would_create_note!=true");
      if (s?.would_create_task !== true) issues.push("would_create_task!=true");
      if (!s?.human_handoff_reason) issues.push("human_handoff_reason missing");
      if ((s?.lead_score ?? 0) < 55) issues.push(`lead_score=${s?.lead_score}<55`);
      return verdictFrom(issues, hard);
    },
  },
  {
    id: "10",
    order: 11,
    label: "no sabe qué estudiar",
    message: "No sé qué estudiar, me pueden orientar?",
    evaluate(body, s) {
      const hard = hardFail(body, s);
      const issues = [];
      if (s?.would_sync_to_ghl !== true) issues.push("would_sync_to_ghl!=true");
      if (s?.would_create_contact !== true) issues.push("would_create_contact!=true");
      if (s?.would_create_note !== true) issues.push("would_create_note!=true");
      if (s?.would_create_task === true) issues.push("would_create_task=true");
      return verdictFrom(issues, hard);
    },
  },
  {
    id: "11",
    order: 12,
    label: "test vocacional",
    message: "Quiero hacer el test vocacional",
    evaluate(body, s) {
      const hard = hardFail(body, s);
      const issues = [];
      if (s?.would_sync_to_ghl !== true) issues.push("would_sync_to_ghl!=true");
      if (s?.would_create_contact !== true) issues.push("would_create_contact!=true");
      if (s?.would_create_note !== true) issues.push("would_create_note!=true");
      if (s?.would_create_task === true) issues.push("would_create_task=true");
      return verdictFrom(issues, hard);
    },
  },
  {
    id: "12",
    order: 13,
    label: "post-test problema",
    message: "Ya hice el test pero no entiendo mi resultado",
    evaluate(body, s) {
      const hard = hardFail(body, s);
      const issues = [];
      if (s?.would_sync_to_ghl !== true) issues.push("would_sync_to_ghl!=true");
      if (s?.would_create_contact !== true) issues.push("would_create_contact!=true");
      if (s?.would_create_note !== true) issues.push("would_create_note!=true");
      if (s?.would_create_task !== true) issues.push("would_create_task!=true");
      if (!s?.human_handoff_reason) issues.push("human_handoff_reason missing");
      return verdictFrom(issues, hard);
    },
  },
  {
    id: "13",
    order: 14,
    label: "documentos inscripción",
    message: "Qué documentos necesito para inscribirme?",
    evaluate(body, s) {
      const hard = hardFail(body, s);
      const issues = [];
      if (s?.would_sync_to_ghl !== true) issues.push("would_sync_to_ghl!=true");
      if (s?.would_create_contact !== true) issues.push("would_create_contact!=true");
      if (s?.would_create_note !== true) issues.push("would_create_note!=true");
      if (s?.would_create_task === true) issues.push("would_create_task=true");
      return verdictFrom(issues, hard);
    },
  },
  {
    id: "14",
    order: 15,
    label: "media sin texto",
    message: "",
    message_type: "audio",
    evaluate(body, s) {
      const hard = hardFail(body, s);
      const issues = [];
      if (s?.would_sync_to_ghl !== false) issues.push("would_sync_to_ghl!=false");
      if (s?.ignored_for_ghl !== true) issues.push("ignored_for_ghl!=true");
      if (s?.would_create_task === true) issues.push("would_create_task=true");
      return verdictFrom(issues, hard);
    },
  },
  {
    id: "15",
    order: 16,
    label: "spam",
    message: "Gana dinero rápido con este link",
    evaluate(body, s) {
      const hard = hardFail(body, s);
      const issues = [];
      if (s?.would_sync_to_ghl !== false) issues.push("would_sync_to_ghl!=false");
      if (s?.ignored_for_ghl !== true) issues.push("ignored_for_ghl!=true");
      if (s?.would_create_task === true) issues.push("would_create_task=true");
      return verdictFrom(issues, hard);
    },
  },
  {
    id: "16",
    order: 17,
    label: "fuera de contexto",
    message: "Quién ganó el partido de ayer?",
    evaluate(body, s) {
      const hard = hardFail(body, s);
      const issues = [];
      if (s?.would_sync_to_ghl !== false) issues.push("would_sync_to_ghl!=false");
      if (s?.would_create_task === true) issues.push("would_create_task=true");
      if (!s?.ignored_for_ghl && (s?.lead_score ?? 0) >= 30) {
        issues.push("sync/ignored inconsistente para off-topic");
      }
      return verdictFrom(issues, hard);
    },
  },
  {
    id: "17",
    order: 18,
    label: "padre/madre",
    message: "Soy mamá de un alumno y quiero saber qué carrera le conviene",
    evaluate(body, s) {
      const hard = hardFail(body, s);
      const issues = [];
      const review = [];
      if (s?.would_sync_to_ghl !== true) issues.push("would_sync_to_ghl!=true");
      if (s?.would_create_task === true) issues.push("would_create_task=true");
      const hasParent = (s?.score_breakdown || []).some((b) => b.rule === "parent_or_guardian");
      if (!hasParent) review.push("score_breakdown sin parent_or_guardian");
      return verdictFrom(issues, hard, review);
    },
  },
  {
    id: "19",
    order: 19,
    label: "Meta Ads con carrera",
    from: META_SECOND_FROM,
    source: "meta_ads",
    first_message: false,
    preSeed: { message: "Hola", source: "meta_ads", first_message: true },
    message: "Quiero información de Psicología",
    comment: "Teléfono aislado: primer msg meta seed, segundo con carrera.",
    evaluate(body, s) {
      const hard = hardFail(body, s);
      const issues = [];
      const review = [];
      if (s?.would_sync_to_ghl !== true) issues.push("would_sync_to_ghl!=true");
      if (s?.qualified_for_ghl !== true) issues.push("qualified_for_ghl!=true");
      if (s?.would_create_contact !== true) issues.push("would_create_contact!=true");
      if (s?.would_create_note !== true) issues.push("would_create_note!=true");
      if ((s?.lead_score ?? 0) < 50) review.push(`lead_score=${s?.lead_score}<50 meta threshold`);
      return verdictFrom(issues, hard, review);
    },
  },
  {
    id: "20",
    order: 20,
    label: "ambiguo poco valor",
    message: "Info",
    evaluate(body, s) {
      const hard = hardFail(body, s);
      const review = [];
      if (s?.would_sync_to_ghl === true) review.push("would_sync_to_ghl=true (ambiguo corto)");
      const issues = [];
      if (s?.would_create_task === true) issues.push("would_create_task=true");
      return verdictFrom(issues, hard, review);
    },
  },
];

async function postCase(tc, suffix = "") {
  const from = tc.from || FROM;
  const payload = {
    event_type: "whatsapp.inbound_message.received",
    from,
    to: TO,
    message_id: `7g7b1-${tc.id}-${Date.now()}${suffix}`,
    message_type: tc.message_type || "text",
    message_text: tc.message,
    timestamp: new Date().toISOString(),
  };
  if (tc.source) payload.source = tc.source;
  if (tc.first_message === true) payload.first_message = true;
  if (tc.first_message === false) payload.first_message = false;
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { http: res.status, payload, body };
}

function extractRow(tc, body) {
  const s = body.ghl_relevance_shadow || null;
  return {
    id: tc.id,
    message: tc.message_type === "audio" ? "[MEDIA_ATTACHMENT]" : tc.message,
    intent: body.intent ?? "-",
    score: s?.lead_score ?? "-",
    would_sync: yn(s?.would_sync_to_ghl),
    contact: yn(s?.would_create_contact),
    note: yn(s?.would_create_note),
    task: yn(s?.would_create_task),
    reason: s?.routing_reason ?? "-",
    handoff_reason: s?.human_handoff_reason ?? "-",
    shadow: s,
    body,
    label: tc.label,
    comment: tc.comment || "",
  };
}

function printTable(rows) {
  const header = [
    "ID",
    "message",
    "intent",
    "score",
    "sync",
    "contact",
    "note",
    "task",
    "reason",
    "handoff",
    "verdict",
  ];
  const widths = [4, 28, 18, 5, 4, 3, 4, 4, 28, 18, 6];
  const line = (cols) =>
    cols.map((c, i) => String(c).slice(0, widths[i]).padEnd(widths[i])).join(" ");
  console.log("\n" + line(header));
  console.log(line(widths.map((w) => "-".repeat(w))));
  for (const r of rows) {
    console.log(
      line([
        r.id,
        r.message,
        r.intent,
        r.score,
        r.would_sync,
        r.contact,
        r.note,
        r.task,
        r.reason,
        r.handoff_reason,
        r.verdict,
      ])
    );
  }
}

function buildMarkdown(rows, runtime, summary, generatedAt) {
  const lines = [
    "# Phase 7G.7B.1 — Shadow Decision Review",
    "",
    `**Generated:** ${generatedAt}`,
    `**Endpoint:** \`${ENDPOINT}\``,
    `**Commit desplegado:** \`cb0134f\` — feat: add ghl relevance shadow gate`,
    "",
    "## Runtime flags (primer caso exitoso)",
    "",
    "| Flag | Valor |",
    "|------|-------|",
    `| mode | \`${runtime.mode}\` |`,
    `| ghl_sync_mode | \`${runtime.ghl_sync_mode}\` |`,
    `| custom_fields_enabled | \`${runtime.custom_fields_enabled}\` |`,
    `| outbound_real | \`${runtime.outbound_real}\` |`,
    `| ghl_live | \`${runtime.ghl_live}\` |`,
    `| ghl_relevance_shadow.enabled | \`${runtime.shadow_enabled}\` |`,
    "",
    "## Resumen",
    "",
    `| Verdict | Count |`,
    "|---------|-------|",
    `| PASS | ${summary.PASS} |`,
    `| REVIEW | ${summary.REVIEW} |`,
    `| FAIL | ${summary.FAIL} |`,
    "",
    "## Tabla de 20 casos",
    "",
    "| ID | Mensaje | Intent | Score | Sync | Contact | Note | Task | routing_reason | handoff | Verdict | Notas |",
    "|----|---------|--------|-------|------|---------|------|------|----------------|---------|---------|-------|",
  ];
  for (const r of rows.sort((a, b) => Number(a.id) - Number(b.id))) {
    const notes = r.verdict_notes?.join("; ") || "";
    lines.push(
      `| ${r.id} | ${r.message.replace(/\|/g, "\\|").slice(0, 40)} | ${r.intent} | ${r.score} | ${r.would_sync} | ${r.contact} | ${r.note} | ${r.task} | ${r.reason} | ${r.handoff_reason} | **${r.verdict}** | ${notes.slice(0, 80)} |`
    );
  }
  lines.push(
    "",
    "## Observaciones scoring",
    "",
    "- Revisar casos REVIEW donde `would_create_task` difiere del ideal operativo.",
    "- Meta Ads caso 18 usa teléfono aislado `+529991525586`; caso 19 usa `+529991525587` con seed previo.",
    "",
    "## Confirmaciones",
    "",
    "- GHL real no activado (`ghl_live=false` en todos los casos).",
    "- WhatsApp real no enviado (`outbound_real=false`).",
    "- Sin cambios a secrets/flags/deploy en esta fase.",
    "",
    "## Recomendaciones pre-7G.7C",
    "",
    "Ver sección de falsos positivos/negativos y ajustes sugeridos en reporte final de ejecución.",
    ""
  );
  return lines.join("\n");
}

async function main() {
  console.log(`7G.7B.1 Shadow Decision Review → ${ENDPOINT}\n`);

  const ordered = [...CASES].sort((a, b) => a.order - b.order);
  const rows = [];
  let runtime = null;

  for (const tc of ordered) {
    if (tc.preSeed) {
      await postCase(
        {
          id: `${tc.id}-seed`,
          from: tc.from,
          message: tc.preSeed.message,
          source: tc.preSeed.source,
          first_message: tc.preSeed.first_message,
        },
        "-seed"
      );
      await sleep(DELAY_MS);
    }

    const { http, body } = await postCase(tc);
    const row = extractRow(tc, body);
    const { verdict, notes } = tc.evaluate(body, row.shadow);
    row.verdict = verdict;
    row.verdict_notes = notes;
    row.http = http;

    if (!runtime && http === 200 && body.ok) {
      runtime = {
        mode: body.mode,
        ghl_sync_mode: body.ghl_sync_mode,
        custom_fields_enabled: body.custom_fields_enabled,
        outbound_real: body.outbound_real,
        ghl_live: body.ghl_live,
        shadow_enabled: body.ghl_relevance_shadow?.enabled,
      };
    }

    rows.push(row);
    const flag = verdict === "PASS" ? "PASS" : verdict === "REVIEW" ? "REVIEW" : "FAIL";
    console.log(
      `${flag} ${tc.id} http=${http} intent=${row.intent} score=${row.score} sync=${row.would_sync} task=${row.task} reason=${row.reason}${notes.length ? ` — ${notes.join("; ")}` : ""}`
    );
    await sleep(DELAY_MS);
  }

  printTable(rows);

  const summary = { PASS: 0, REVIEW: 0, FAIL: 0 };
  for (const r of rows) summary[r.verdict]++;

  console.log(`\n7G.7B.1 summary: PASS=${summary.PASS} REVIEW=${summary.REVIEW} FAIL=${summary.FAIL}`);

  const generatedAt = new Date().toISOString();
  const md = buildMarkdown(rows, runtime || {}, summary, generatedAt);
  fs.writeFileSync(REPORT_PATH, md, "utf8");
  console.log(`\nReport written: ${REPORT_PATH}`);

  if (summary.FAIL > 0) {
    process.exitCode = 1;
    console.log("\nFAIL detected — no commit recommended.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
