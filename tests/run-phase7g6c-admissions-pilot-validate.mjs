#!/usr/bin/env node
/**
 * Phase 7G.6C — Admissions pilot runtime + DB validation (read-only).
 *
 * Usage:
 *   node tests/run-phase7g6c-admissions-pilot-validate.mjs
 *   node tests/run-phase7g6c-admissions-pilot-validate.mjs --since 2026-06-25T20:00:00Z
 *
 * Requires INSFORGE_SQL_URL or uses MCP run-raw-sql externally for full DB audit.
 * This script probes the live endpoint safe-state flags and prints a checklist.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENDPOINT =
  process.env.PHASE7G6C_ENDPOINT ||
  "https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound";

// Required for live runs; keep real E.164 values in local env only.
const TO = process.env.PHASE7G6C_TO || "<EVA_WA_BUSINESS_E164>";
const OWNER_PHONE = process.env.PHASE7G6C_OWNER_PHONE || "<OWNER_E164>";
const ADM1_PHONE = process.env.PHASE7G6C_ADM1_PHONE || "<ADM1_E164>";
const ADM2_PHONE = process.env.PHASE7G6C_ADM2_PHONE || "<ADM2_E164>";

const ALLOWED_PHONES = [OWNER_PHONE, ADM1_PHONE, ADM2_PHONE];

const EXPECTED_MESSAGES = [
  { text: "1", intent: "carreras_disponibles" },
  { text: "Derecho online", intent: "carrera_interes" },
  { text: "No sé qué estudiar", intent: "no_se_que_estudiar" },
  {
    text: "Tengo promedio 9.2, qué beca me toca",
    intent: "beca",
    alt: "Tengo promedio de 9.2",
  },
  { text: "Quiero hablar con asesor", intent: "humano", task: true },
];

const SAFE = {
  WA_AGENT_MODE: "mock",
  GHL_SYNC_MODE: "dry_run",
  GHL_WRITE_CUSTOM_FIELDS: false,
  GHL_LIVE_ALLOWED_PHONES: process.env.GHL_LIVE_ALLOWED_PHONES || "<OWNER_E164>",
};

const LIVE = {
  WA_AGENT_MODE: "live_outbound",
  GHL_SYNC_MODE: "live",
  GHL_WRITE_CUSTOM_FIELDS: true,
  GHL_LIVE_ALLOWED_PHONES:
    process.env.GHL_LIVE_ALLOWED_PHONES || ALLOWED_PHONES.join(","),
};

async function probeRuntime() {
  const payload = {
    event_type: "whatsapp.inbound_message.received",
    from: OWNER_PHONE,
    to: TO,
    message_id: `7g6c-probe-${Date.now()}`,
    message_type: "text",
    message_text: "__7g6c_runtime_probe__",
    timestamp: new Date().toISOString(),
  };
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { http: res.status, body };
}

function flagLine(label, expected, actual, ok) {
  return `| ${label} | \`${expected}\` | \`${actual}\` | ${ok ? "✅" : "❌"} |`;
}

function assessMode(body) {
  const mode = body.mode || "unknown";
  const ghl = body.ghl_sync_mode || "unknown";
  const cf = Boolean(body.custom_fields_enabled);
  const count = body.ghl_allowed_phones_count ?? "?";
  const outboundReal = Boolean(body.outbound_real);

  const isSafe =
    mode === SAFE.WA_AGENT_MODE &&
    ghl === SAFE.GHL_SYNC_MODE &&
    !cf &&
    !outboundReal;

  const isLive =
    mode === LIVE.WA_AGENT_MODE &&
    ghl === LIVE.GHL_SYNC_MODE &&
    cf === LIVE.GHL_WRITE_CUSTOM_FIELDS &&
    outboundReal === false; // probe uses mock outbound if from allowlist in live? actually live_outbound would send real

  return { mode, ghl, cf, count, outboundReal, isSafe, isLive, body };
}

function buildReport(probe) {
  const { body } = probe;
  const a = assessMode(body);
  const lines = [
    "# Phase 7G.6C — Runtime probe (auto-generated)",
    "",
    `**Generated:** ${new Date().toISOString()}`,
    "",
    "## Runtime flags",
    "",
    "| Flag | Esperado (seguro) | Detectado | OK |",
    "|------|-------------------|-----------|:--:|",
    flagLine("WA_AGENT_MODE", SAFE.WA_AGENT_MODE, a.mode, a.mode === SAFE.WA_AGENT_MODE),
    flagLine("GHL_SYNC_MODE", SAFE.GHL_SYNC_MODE, a.ghl, a.ghl === SAFE.GHL_SYNC_MODE),
    flagLine(
      "GHL_WRITE_CUSTOM_FIELDS",
      "false",
      String(a.cf),
      !a.cf
    ),
    `| ghl_allowed_phones_count | 1 (seguro) | ${a.count} | ${Number(a.count) === 1 ? "✅" : "⚠️"} |`,
    `| outbound_real (probe) | false | ${a.outboundReal} | ${!a.outboundReal ? "✅" : "⚠️"} |`,
    "",
    `**Modo detectado:** ${a.isSafe ? "SEGURO ✅" : a.isLive ? "LIVE PILOTO ⚠️" : "MIXTO / REVISAR ❌"}`,
    "",
    "## Allowlist piloto 7G.6C",
    "",
    "```",
    `GHL_LIVE_ALLOWED_PHONES=${LIVE.GHL_LIVE_ALLOWED_PHONES}`,
    "```",
    "",
    "| Teléfono | Rol |",
    "|----------|-----|",
    ...ALLOWED_PHONES.map((p, i) => {
      const roles = ["Leandro (owner)", "Admisiones 1", "Admisiones 2"];
      return `| \`${p}\` | ${roles[i]} |`;
    }),
    "",
    "## Mensajes guion (por participante)",
    "",
    "| # | Mensaje | Intent | Task |",
    "|:--:|---------|--------|:----:|",
    ...EXPECTED_MESSAGES.map((m, i) =>
      `| ${i + 1} | \`${m.text}\` | ${m.intent} | ${m.task ? "sí" : "—"} |`
    ),
    "",
    "## Validación GHL post-sesión (manual + SQL)",
    "",
    "- [ ] Contacto creado/actualizado sin duplicado",
    "- [ ] Tags `eva-wa` + intent",
    "- [ ] Note con resumen",
    "- [ ] Task en humano/beca cuando aplica",
    "- [ ] 8 campos `wa_*` escritos",
    "- [ ] `allowlist_matched=true` en logs live",
    "- [ ] Campos protegidos intactos",
    "- [ ] `wa_errors` críticos = 0",
    "",
    "## SQL monitoreo (InsForge MCP)",
    "",
    "```sql",
    "SELECT i.received_at, i.normalized_phone, i.message_text, i.status,",
    "  o.status AS outbound_status, o.provider_response_id,",
    "  l.sync_mode, l.status AS ghl_status, l.intent,",
    "  l.payload->>'allowlist_matched' AS allowlist_matched,",
    "  l.payload->>'custom_fields_written' AS cf_written,",
    "  l.would_create_task",
    "FROM wa_inbound_messages i",
    "LEFT JOIN wa_outbound_messages o ON o.inbound_message_id = i.id",
    "LEFT JOIN wa_ghl_sync_log l ON l.inbound_message_id = i.id",
    `WHERE i.normalized_phone = ANY(ARRAY['${OWNER_PHONE}','${ADM1_PHONE}','${ADM2_PHONE}'])`,
    "  AND i.status = 'processed_inbound_live'",
    "  AND i.received_at > NOW() - INTERVAL '2 hours'",
    "ORDER BY i.received_at ASC;",
    "```",
    "",
  ];
  return lines.join("\n");
}

async function main() {
  console.log(`7G.6C validate → ${ENDPOINT}`);
  const probe = await probeRuntime();
  const report = buildReport(probe);
  const outPath = path.join(ROOT, "docs/phase-7g6c-runtime-probe.md");
  fs.writeFileSync(outPath, report, "utf8");
  console.log(`Wrote ${outPath}`);
  const a = assessMode(probe.body);
  if (a.isSafe) {
    console.log("Runtime: SEGURO (mock + dry_run + CF=false)");
  } else if (a.isLive) {
    console.log("Runtime: LIVE PILOTO — sesión admisiones puede continuar");
  } else {
    console.log("Runtime: REVISAR — flags no coinciden con seguro ni piloto");
    console.log(JSON.stringify({
      mode: a.mode,
      ghl: a.ghl,
      cf: a.cf,
      count: a.count,
    }));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
