#!/usr/bin/env node
/**
 * Fase 1 — Item 0: catálogo SoT §4.1 + guardrail carreras fantasma + matriz demanda §11.
 *
 * Usage: node tests/run-phase-fase1-item0-catalog-sot.mjs
 */

import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const HANDLER_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");
const MOCK_DB_PATH = path.join(ROOT, "insforge/functions/lib/test/mock-insforge-client.js");
const CATALOG_PATH = path.join(ROOT, "insforge/functions/lib/academic-engine/catalog-sot.js");

const MAESTRO_12_CAREERS = [
  "Derecho",
  "Derecho Online",
  "Psicología",
  "Enfermería",
  "Nutrición",
  "Ingeniería en Sistemas Computacionales",
  "Administración Sabatina",
  "Administración y Desarrollo Empresarial Online",
  "Ventas y Mercadotecnia",
  "Ventas y Mercadotecnia Online",
  "Negocios Internacionales",
  "Gastronomía",
];

const GHOST_CAREERS = ["Arquitectura", "Contaduría", "Criminología", "Educación", "Diseño"];

for (const [key, value] of Object.entries({
  WA_E2E_MOCK_DB: "true",
  WA_AGENT_MODE: "mock",
  GHL_SYNC_MODE: "dry_run",
  ACADEMIC_ENGINE_ENABLED: "false",
  EVA_LLM_ENABLED: "false",
  INSFORGE_BASE_URL: "http://mock-insforge.local",
  ANON_KEY: "mock-anon-key",
})) {
  process.env[key] = value;
}

if (!globalThis.Deno) {
  globalThis.Deno = { env: { get: (key) => process.env[key] } };
}

const catalog = await import(pathToFileURL(CATALOG_PATH).href);
const { resetMockInsforgeStore } = await import(pathToFileURL(MOCK_DB_PATH).href);
const handler = (await import(pathToFileURL(HANDLER_PATH).href)).default;

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function invoke(messageText, phone = "+525551230000") {
  resetMockInsforgeStore();
  const request = new Request("http://localhost/ycloud-wa-inbound", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_type: "whatsapp.inbound_message.received",
      from: phone,
      to: "+529994538421",
      message_type: "text",
      message_text: messageText,
      message_id: `fase1-item0-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    }),
  });
  const response = await handler(request);
  const body = await response.json();
  return body;
}

const results = [];
let failures = 0;

function record(id, ok, detail = "") {
  results.push({ id, ok, detail });
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${id}${detail ? ` — ${detail}` : ""}`);
}

try {
  const official = catalog.getOfficialCareerNames();
  record(
    "C01_official_count_12",
    official.length === 12,
    `got ${official.length}`,
  );
  record(
    "C02_official_names_match_maestro",
    MAESTRO_12_CAREERS.every((n) => official.includes(n)),
    official.join(" | "),
  );

  const listText = catalog.buildCarrerasDisponiblesResponseText();
  for (const name of MAESTRO_12_CAREERS) {
    record(`C03_list_contains_${norm(name).replace(/\s+/g, "_")}`, listText.includes(name), name);
  }
  for (const ghost of GHOST_CAREERS) {
    record(
      `C04_list_excludes_${norm(ghost)}`,
      !listText.includes(ghost),
      ghost,
    );
  }

  const keywords = catalog.getOfficialCareerKeywords();
  record("C05_no_ghost_keywords", !keywords.some((k) => norm(k).includes("arquitectura")));
  record("C06_has_nutricion", keywords.some((k) => norm(k).includes("nutricion")));
  record("C07_has_gastronomia", keywords.some((k) => norm(k).includes("gastronomia")));

  const notOfferedCases = [
    {
      id: "C08_medicina",
      text: "quiero medicina",
      intent: "carrera_no_ofertada",
      mustInclude: ["Enfermería", "Nutrición", "Psicología", "no está en nuestra oferta"],
    },
    {
      id: "C09_arquitectura",
      text: "info de arquitectura",
      intent: "carrera_no_ofertada",
      mustInclude: ["Ingeniería en Sistemas Computacionales", "no está en nuestra oferta"],
    },
    {
      id: "C10_contaduria",
      text: "quiero estudiar contaduría",
      intent: "carrera_no_ofertada",
      mustInclude: ["Administración Sabatina", "no está en nuestra oferta"],
    },
    {
      id: "C11_criminologia",
      text: "me interesa criminología",
      intent: "carrera_no_ofertada",
      mustInclude: ["Derecho", "no está en nuestra oferta"],
    },
    {
      id: "C12_educacion",
      text: "licenciatura en educación",
      intent: "carrera_no_ofertada",
      mustInclude: ["Psicología", "no está en nuestra oferta"],
    },
    {
      id: "C13_diseno",
      text: "diseño gráfico",
      intent: "carrera_no_ofertada",
      mustInclude: ["Ventas y Mercadotecnia", "no está en nuestra oferta"],
    },
    {
      id: "C14_psicologia_offered",
      text: "info de psicología",
      intent: "carrera_interes",
      mustExclude: ["no está en nuestra oferta académica"],
    },
    {
      id: "C15_carreras_list_handler",
      text: "qué carreras tienen",
      intent: "carreras_disponibles",
      mustInclude: ["Nutrición", "Gastronomía"],
      mustExclude: GHOST_CAREERS,
    },
  ];

  for (const tc of notOfferedCases) {
    const body = await invoke(tc.text, `+52555123${String(Math.floor(Math.random() * 9000 + 1000))}`);
    const responseText = body.response_text || "";
    const n = norm(responseText);
    let ok = body.intent === tc.intent;
    if (tc.mustInclude) {
      ok = ok && tc.mustInclude.every((frag) => n.includes(norm(frag)));
    }
    if (tc.mustExclude) {
      ok =
        ok &&
        tc.mustExclude.every((frag) => {
          if (Array.isArray(frag)) return true;
          return !n.includes(norm(frag));
        });
      for (const ghost of tc.mustExclude) {
        if (typeof ghost === "string" && responseText.includes(ghost)) ok = false;
      }
    }
    record(tc.id, ok, `intent=${body.intent}`);
  }
} catch (err) {
  failures += 1;
  console.error("FATAL", err.message);
}

console.log(`\n--- Fase 1 Item 0: ${results.length - failures}/${results.length} passed ---`);
process.exit(failures > 0 ? 1 : 0);
