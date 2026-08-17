#!/usr/bin/env node
/**
 * Eva Contract — Adapter v1 (unidad aislada, sin runtime, sin DB/HTTP/LLM).
 *
 * Cubre: reply desde responseText final, intent estructurado sin
 * reclasificar, handoff desde needsHuman, qualification_complete,
 * no_action nunca combinado, ausencia de campos GHL/owner/assignee/
 * provider, memory_updates restringido al allowlist, confidence null
 * cuando no hay una confianza nativa apropiada y determinismo.
 *
 * Usage: node tests/run-eva-contract-adapter.mjs
 */
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ADAPTER_PATH = path.join(ROOT, "insforge/functions/lib/eva-contract/adapter.js");

const { buildEvaContract, EVA_CONTRACT_MEMORY_ALLOWLIST, EVA_CONTRACT_VERSION } = await import(
  pathToFileURL(ADAPTER_PATH).href
);

let failures = 0;
function check(name, cond, detail = "") {
  console.log(`[${cond ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures += 1;
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ── 11. adapter copia final responseText a reply ────────────────────
{
  const c = buildEvaContract({
    decision: { responseText: "Texto final de Eva", intent: "carrera_interes", needsHuman: false },
  });
  check(
    "11. reply === responseText final",
    c.reply === "Texto final de Eva",
    JSON.stringify(c.reply),
  );
  check("11b. contract_version === eva-v1", c.contract_version === EVA_CONTRACT_VERSION);
}

// ── 12. adapter conserva intent estructurado sin reclasificar ───────
{
  const c = buildEvaContract({
    decision: { responseText: "hola", intent: "carrera_interes", needsHuman: false },
  });
  check(
    "12. intent.key === decision.intent (sin reclasificar) y status known",
    c.intent.key === "carrera_interes" && c.intent.status === "known",
    JSON.stringify(c.intent),
  );
}
{
  const c = buildEvaContract({
    decision: { responseText: "no entendí", intent: "ambiguo", needsHuman: false },
  });
  check(
    "12b. intent 'ambiguo' -> status ambiguous, key preservado",
    c.intent.key === "ambiguo" && c.intent.status === "ambiguous",
    JSON.stringify(c.intent),
  );
}
{
  const c = buildEvaContract({ decision: { responseText: "x", intent: null, needsHuman: false } });
  check(
    "12c. intent ausente -> status unknown",
    c.intent.key === null && c.intent.status === "unknown",
    JSON.stringify(c.intent),
  );
}

// ── 13. needsHuman=true -> handoff requested + handoff_human ────────
{
  const c = buildEvaContract({
    decision: { responseText: "te canalizo con un asesor", intent: "humano", needsHuman: true },
  });
  check(
    "13. needsHuman=true -> handoff.requested true, reason no nulo",
    c.handoff.requested === true && c.handoff.reason !== null,
    JSON.stringify(c.handoff),
  );
  check(
    "13b. needsHuman=true -> proposed_actions incluye handoff_human",
    c.proposed_actions.includes("handoff_human"),
    JSON.stringify(c.proposed_actions),
  );
}
{
  const c = buildEvaContract({
    decision: {
      responseText: "gracias por tu paciencia",
      intent: "beca",
      needsHuman: true,
      escalation_reason: "low_confidence",
    },
  });
  check(
    "13c. escalation_reason low_confidence -> handoff.reason === low_confidence",
    c.handoff.reason === "low_confidence",
    JSON.stringify(c.handoff),
  );
}

// ── 14. needsHuman=false -> handoff false y no handoff_human ────────
{
  const c = buildEvaContract({
    decision: { responseText: "aquí tienes info", intent: "carreras_disponibles", needsHuman: false },
  });
  check(
    "14. needsHuman=false -> handoff.requested false, reason null",
    c.handoff.requested === false && c.handoff.reason === null,
    JSON.stringify(c.handoff),
  );
  check(
    "14b. needsHuman=false -> proposed_actions NO incluye handoff_human",
    !c.proposed_actions.includes("handoff_human"),
    JSON.stringify(c.proposed_actions),
  );
}

// ── 15. qualification known -> qualification_complete ───────────────
{
  const c = buildEvaContract({
    decision: { responseText: "perfecto", intent: "carrera_interes", needsHuman: false },
    academicState: { current_career: "Derecho", current_modality: "presencial" },
  });
  check(
    "15. qualification known -> proposed_actions incluye qualification_complete",
    c.qualification.status === "known" && c.proposed_actions.includes("qualification_complete"),
    JSON.stringify({ qualification: c.qualification, actions: c.proposed_actions }),
  );
}

// ── 16. no_action nunca se combina con otras acciones ────────────────
{
  const c = buildEvaContract({
    decision: { responseText: "hola", intent: "greeting_no_reconocido", needsHuman: false },
    academicState: {},
  });
  check(
    "16. sin señales -> proposed_actions === ['no_action']",
    deepEqual(c.proposed_actions, ["no_action"]),
    JSON.stringify(c.proposed_actions),
  );
}
{
  const c = buildEvaContract({
    decision: { responseText: "te canalizo", intent: "humano", needsHuman: true },
    academicState: { current_career: "Gastronomía", current_modality: "presencial" },
  });
  check(
    "16b. con señales -> no_action nunca aparece junto a otras acciones",
    !c.proposed_actions.includes("no_action") && c.proposed_actions.length > 0,
    JSON.stringify(c.proposed_actions),
  );
}

// ── 17. ningún output contiene campos/IDs GHL, owner, assignee o provider ──
{
  const c = buildEvaContract({
    decision: {
      responseText: "hola",
      intent: "humano",
      needsHuman: true,
      escalation_reason: "human_requested",
      ghl_tags: ["wa_needs_human"],
      ghl_note: "nota interna GHL",
      task_title: "Contactar lead",
      operational_owner: "asesor-1",
      escalation_dedupe_key: "task:human_requested:2026-08-16",
      ghl_contact_id: "ghl-123",
    },
    academicState: { current_career: "Derecho", current_modality: "presencial" },
  });
  const serialized = JSON.stringify(c).toLowerCase();
  const forbidden = [
    "ghl",
    "owner",
    "assignee",
    "provider",
    "contact_id",
    "calendar",
    "credential",
    "token",
    "dedupe",
  ];
  const leaked = forbidden.filter((word) => serialized.includes(word));
  check(
    "17. output no contiene campos/IDs GHL, owner, assignee, provider ni dedupe keys",
    leaked.length === 0,
    leaked.join(", "),
  );
}

// ── 18. memory_updates solo usa allowlist indicada ───────────────────
{
  const c = buildEvaContract({
    decision: {
      responseText: "hola",
      intent: "carrera_interes",
      needsHuman: false,
      waStage: "carrera_interes",
    },
    academicState: {
      current_career: "Enfermería",
      current_modality: "presencial",
      last_objection: "precio_alto",
    },
  });
  const fields = c.memory_updates.map((u) => u.field);
  const outsideAllowlist = fields.filter((f) => !EVA_CONTRACT_MEMORY_ALLOWLIST.includes(f));
  check(
    "18. todos los memory_updates.field están en el allowlist",
    outsideAllowlist.length === 0 && fields.length > 0,
    JSON.stringify(fields),
  );
}

// ── 19. confidence queda null cuando no existe confianza nativa apropiada ──
{
  const c = buildEvaContract({
    decision: {
      responseText: "hola",
      intent: "carrera_interes",
      needsHuman: false,
    },
    academicState: { current_career: "Derecho", current_modality: "presencial" },
    academicMeta: { academic_confidence: 0.93 },
  });
  check(
    "19. intent.confidence === null (sin confianza nativa para intent WA)",
    c.intent.confidence === null,
    JSON.stringify(c.intent),
  );
  check(
    "19b. qualification.confidence === null (match determinístico contra catálogo)",
    c.qualification.confidence === null,
    JSON.stringify(c.qualification),
  );
}

// ── 20. Determinismo: mismo input produce mismo output ──────────────
{
  const input = {
    decision: {
      responseText: "misma respuesta",
      intent: "beca",
      needsHuman: true,
      escalation_reason: "scholarship_special",
      waStage: "beca_interes",
    },
    academicState: { current_career: "Nutrición", current_modality: "presencial" },
    latestUserMessage: "quiero saber de becas",
  };
  const r1 = buildEvaContract(input);
  const r2 = buildEvaContract(JSON.parse(JSON.stringify(input)));
  check(
    "20. buildEvaContract es determinístico (mismo input -> mismo output)",
    deepEqual(r1, r2),
    `${JSON.stringify(r1)} vs ${JSON.stringify(r2)}`,
  );
}

// ── Extra: evidence usa latestUserMessage sin reclasificar ──────────
{
  const c = buildEvaContract({
    decision: { responseText: "ok", intent: "carrera_interes", needsHuman: false },
    latestUserMessage: "quiero estudiar derecho presencial",
  });
  check(
    "Extra: evidence contiene el mensaje del usuario con source_message_index 0",
    c.intent.evidence.length === 1 &&
      c.intent.evidence[0].text === "quiero estudiar derecho presencial" &&
      c.intent.evidence[0].source_message_index === 0,
    JSON.stringify(c.intent.evidence),
  );
}
{
  const c = buildEvaContract({
    decision: { responseText: "ok", intent: "carrera_interes", needsHuman: false },
  });
  check(
    "Extra: sin latestUserMessage -> evidence vacío ([])",
    Array.isArray(c.intent.evidence) && c.intent.evidence.length === 0,
    JSON.stringify(c.intent.evidence),
  );
}

// ── Extra: invariantes de forma del contrato (siempre presentes) ────
{
  const c = buildEvaContract({});
  check(
    "Extra: reply es string vacío cuando no hay responseText",
    c.reply === "",
    JSON.stringify(c.reply),
  );
  check(
    "Extra: handoff.requested=false -> no handoff_human en proposed_actions y reason null",
    c.handoff.requested === false && c.handoff.reason === null && !c.proposed_actions.includes("handoff_human"),
    JSON.stringify(c),
  );
  check(
    "Extra: memory_updates es array (posiblemente vacío) cuando no hay estado estructurado",
    Array.isArray(c.memory_updates),
    JSON.stringify(c.memory_updates),
  );
}

// ── REGRESSION EVA-CONTRACT-V1 INTENT + EVIDENCE ───────────────────

// Vocabulario conversacional realmente emitido por Eva.
// NO incluye listas de GHL relevance/routing/lead scoring.
{
  const knownEvaIntents = [
    "agradecimiento",
    "beca",
    "carrera_interes",
    "carrera_no_ofertada",
    "carreras_disponibles",
    "carreras_online",
    "despedida",
    "duda_test",
    "humano",
    "niveles_no_principales",
    "no_se_que_estudiar",
    "objecion_precio",
    "post_test",
    "promociones_descuentos",
    "revalidacion_estudios",
    "rvoe_reconocimiento",
    "sin_texto",
    "ubicacion_campus",

    // controles conversacionales del canal, no señales GHL
    "opt_out",
    "opt_out_confirmacion",
    "re_opt_in",
  ];

  for (const intent of knownEvaIntents) {
    const c = buildEvaContract({
      decision: {
        responseText: "x",
        intent,
        needsHuman: false,
      },
    });

    check(
      `R-I1. intent Eva válido ${intent} -> status known`,
      c.intent.key === intent && c.intent.status === "known",
      JSON.stringify(c.intent),
    );
  }
}

// Ambigüedad conversacional explícita.
{
  for (const intent of ["ambiguo", "fallback_inteligente"]) {
    const c = buildEvaContract({
      decision: {
        responseText: "x",
        intent,
        needsHuman: false,
      },
    });

    check(
      `R-I2. ${intent} -> status ambiguous`,
      c.intent.key === intent && c.intent.status === "ambiguous",
      JSON.stringify(c.intent),
    );
  }
}

// Estado académico heredado NO convierte el mensaje actual en evidencia
// de esa qualification.
{
  const c = buildEvaContract({
    decision: {
      responseText: "Con gusto",
      intent: "agradecimiento",
      needsHuman: false,
    },
    academicState: {
      current_career: "Derecho",
      current_modality: "presencial",
    },
    latestUserMessage: "gracias",
  });

  check(
    "R-E1. mensaje 'gracias' no es evidence de qualification histórica Derecho/presencial",
    c.qualification.status === "known" &&
      Array.isArray(c.qualification.evidence) &&
      c.qualification.evidence.length === 0,
    JSON.stringify(c.qualification),
  );

  check(
    "R-E1b. el mismo mensaje sí puede ser evidence del intent agradecimiento",
    c.intent.evidence.length === 1 &&
      c.intent.evidence[0].text === "gracias",
    JSON.stringify(c.intent),
  );
}

// Control positivo: cuando el mensaje actual sí contiene la qualification,
// puede conservarse como evidence.
{
  const c = buildEvaContract({
    decision: {
      responseText: "Perfecto",
      intent: "carrera_interes",
      needsHuman: false,
    },
    academicState: {
      current_career: "Derecho",
      current_modality: "presencial",
    },
    latestUserMessage: "quiero estudiar derecho presencial",
  });

  check(
    "R-E2. mensaje que sí expresa Derecho presencial puede ser evidence de qualification",
    c.qualification.status === "known" &&
      c.qualification.evidence.length === 1 &&
      c.qualification.evidence[0].text === "quiero estudiar derecho presencial",
    JSON.stringify(c.qualification),
  );
}

console.log("");
if (failures > 0) {
  console.error(`Eva Contract Adapter: ${failures} FALLO(S).`);
  process.exit(1);
}
console.log("Eva Contract Adapter: OK — todas las verificaciones pasaron.");
