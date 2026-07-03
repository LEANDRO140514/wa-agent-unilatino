#!/usr/bin/env node
/**
 * Academic state persistence — parse, enrich multi-turn, upsert mock DB.
 * Usage: WA_E2E_MOCK_DB=true node tests/run-academic-state-persistence.mjs
 */

import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.WA_E2E_MOCK_DB = "true";
process.env.INSFORGE_BASE_URL = "http://mock-insforge.local";
process.env.ANON_KEY = "mock-anon-key";

const HANDLER_PATH = path.join(__dirname, "../insforge/functions/ycloud-wa-inbound.js");
const handler = (await import(pathToFileURL(HANDLER_PATH).href)).default;

const { getMockInsforgeClient, resetMockInsforgeStore, getMockInsforgeStore } = await import(
  pathToFileURL(path.join(__dirname, "../insforge/functions/lib/test/mock-insforge-client.js")).href,
);

const config = {
  academicEngineEnabled: true,
  evaLlmEnabled: false,
  evaLlmMode: "off",
  mode: "mock",
};

const PHONE = "+529991525583";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

resetMockInsforgeStore();
const client = getMockInsforgeClient();

// --- parseAcademicStateFromContact ---
assert(
  JSON.stringify(handler.parseAcademicStateFromContact(null)) === "{}",
  "null → {}",
);
assert(
  handler.parseAcademicStateFromContact({ last_career: "Derecho" }).last_career === "Derecho",
  "object parse",
);
assert(
  handler.parseAcademicStateFromContact(JSON.stringify({ last_career: "Psicologia" })).last_career ===
    "Psicologia",
  "JSON string parse",
);

// --- Turn 1: mention career ---
const turn1Decision = handler.classifyIntent("Derecho online", config, {});
const turn1Enrich = await handler.applyAcademicAndLlmEnrichment(
  turn1Decision,
  "Derecho online",
  config,
  {},
);
assert(turn1Enrich.academicState?.last_career, "turn1 should set last_career");

await handler.upsertContactState(
  client,
  PHONE,
  turn1Enrich.decision,
  new Date().toISOString(),
  config,
  "mocked",
  turn1Enrich.academicState,
);

const storeAfterTurn1 = getMockInsforgeStore();
const row1 = storeAfterTurn1.wa_contacts_state.find((r) => r.normalized_phone === PHONE);
assert(row1?.academic_state?.last_career, "DB row has academic_state after turn1");

// --- Turn 2: load persisted state and follow-up question ---
const loadedState = handler.parseAcademicStateFromContact(row1.academic_state);
assert(loadedState.last_career, "loaded state has last_career");

const contactContext = {
  wa_stage: row1.wa_stage,
  wa_last_intent: row1.wa_last_intent,
  wa_needs_human: row1.wa_needs_human,
};

const turn2Decision = handler.classifyIntent("cuanto cuesta", config, contactContext);
const turn2Enrich = await handler.applyAcademicAndLlmEnrichment(
  turn2Decision,
  "cuanto cuesta",
  config,
  loadedState,
);

assert(
  turn2Enrich.decision.responseText.toLowerCase().includes("derecho") ||
    turn2Enrich.decision.responseText.includes("$"),
  "turn2 should use persisted career context in response",
);

console.log("PASS academic-state-persistence (parse + 2-turn mock DB)");
console.log(`  turn1 last_career: ${turn1Enrich.academicState.last_career}`);
console.log(`  turn2 response preview: ${turn2Enrich.decision.responseText.slice(0, 80)}…`);
