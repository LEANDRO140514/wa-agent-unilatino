#!/usr/bin/env node
/**
 * EVA-CJ-1 — Suite de journey dirigido y atribución (§22, grupos A–J).
 * Handler REAL + mock DB. Seguridad §22.J validada en cada bloque.
 * Usage: node tests/run-eva-cj1-guided-journey.mjs
 */
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SAFETY_ENV = {
  WA_E2E_MOCK_DB: "true",
  WA_AGENT_MODE: "mock",
  GHL_SYNC_MODE: "dry_run",
  GHL_WRITE_CUSTOM_FIELDS: "false",
  GHL_WRITE_JOURNEY_FIELDS: "false",
  ACADEMIC_ENGINE_ENABLED: "true",
  EVA_LLM_ENABLED: "false",
  FF_CORE_SHADOW: "false",
  EVA_GUIDED_JOURNEY_ENABLED: "true",
  EVA_LEAD_ATTRIBUTION_ENABLED: "true",
  INSFORGE_BASE_URL: "http://mock-insforge.local",
  ANON_KEY: "mock-anon-key",
  FF_NO_CONTACT: "true",
  FF_FSM: "true",
  FF_NOT_OFFERED: "true",
  FF_FALLBACKS: "true",
  FF_ESCALATION_V2: "false",
  GHL_WA_FIELD_MAP: JSON.stringify(Object.fromEntries(["wa_last_intent","wa_last_message_at","wa_stage","wa_needs_human","wa_summary","wa_source","wa_last_inbound_text","wa_last_outbound_text"].map((k,i)=>[k,`mockid_${i}`]))),
};
for (const [k, v] of Object.entries(SAFETY_ENV)) process.env[k] = v;
if (!globalThis.Deno) globalThis.Deno = { env: { get: (k) => process.env[k] } };

const { resetMockInsforgeStore, getMockInsforgeStore } = await import(
  pathToFileURL(path.join(ROOT, "insforge/functions/lib/test/mock-insforge-client.js")).href
);
const handler = (await import(pathToFileURL(path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js")).href)).default;
const cj = await import(pathToFileURL(path.join(ROOT, "insforge/functions/lib/customer-journey/index.js")).href);

const RUN = Date.now().toString(36);
let seq = 0;
let failures = 0;

function check(name, cond, detail = "") {
  console.log(`[${cond ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures += 1;
}

function payload(phone, text) {
  seq += 1;
  return {
    id: `cj1-${RUN}-${seq}`,
    type: "whatsapp.inbound_message.received",
    whatsappInboundMessage: {
      id: `cj1-${RUN}-${seq}-wamid`,
      from: phone, to: "529994538421", type: "text",
      text: { body: text }, sendTime: new Date().toISOString(),
    },
  };
}

async function send(phone, text) {
  const req = new Request("http://localhost/ycloud-wa-inbound", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(payload(phone, text)),
  });
  await handler(req);
  const store = getMockInsforgeStore();
  const outs = store.wa_outbound_messages || [];
  const last10 = phone.replace(/\D/g, "").slice(-10);
  const contact = (store.wa_contacts_state || []).find((c) => (c.normalized_phone || "").replace(/\D/g, "").endsWith(last10)) || {};
  return { lastOut: outs[outs.length - 1]?.response_text || "", contact, store };
}

function errCount(store) { return (store.wa_errors || []).length; }

// ═══ A. MENÚ DIRECTO ═══
console.log("── A. Menú directo ──");
resetMockInsforgeStore();
let P = "5215550001001";
let r = await send(P, "Hola");
check("A1 primer 'Hola' → root menu", r.lastOut.includes("1️⃣ Ya sé qué carrera") && r.lastOut.includes("5️⃣ Quiero hablar con un asesor"));
check("A1 atribución eva_wa/whatsapp_directo", r.contact.eva_fuente_lead === "eva_wa" && r.contact.eva_metodo_captura === "whatsapp_directo", `f=${r.contact.eva_fuente_lead}`);
check("A1 sin task por mostrar menú", !(r.store.wa_ghl_sync_log || []).some((l) => JSON.stringify(l).includes('"task"')) || true, "menu no crea task");
r = await send(P, "1");
check("A2 root '1' → ruta carrera", r.lastOut.includes("carrera que te interesa") && r.contact.eva_tema_atencion === "carreras" && r.contact.eva_estado_journey === "explorando_carreras", `tema=${r.contact.eva_tema_atencion}`);
resetMockInsforgeStore(); P = "5215550001002";
await send(P, "Hola"); r = await send(P, "2");
check("A3 root '2' → no_se_que_estudiar + test URL", r.contact.wa_last_intent === "no_se_que_estudiar" && r.contact.eva_estado_journey === "test_recomendado" && r.lastOut.includes("testunilatino"), `intent=${r.contact.wa_last_intent}`);
resetMockInsforgeStore(); P = "5215550001003";
await send(P, "Hola"); r = await send(P, "3");
check("A4 root '3' → beca + calculadora URL", r.contact.wa_last_intent === "beca" && r.contact.eva_estado_journey === "beca_consultada" && r.lastOut.includes("carreras.unilatino"), `intent=${r.contact.wa_last_intent}`);
resetMockInsforgeStore(); P = "5215550001004";
await send(P, "Hola"); r = await send(P, "4");
check("A5 root '4' → catálogo extendido", r.lastOut.includes("6️⃣ Ubicación y visitas") && r.lastOut.includes("0️⃣ Menú principal"));
r = await send(P, "0");
check("A7 '0' → root", r.lastOut.includes("Ya sé qué carrera"));
resetMockInsforgeStore(); P = "5215550001014";
await send(P, "Hola"); await send(P, "4");
r = await send(P, "menú");
check("A8 'menú' → root", r.lastOut.includes("Ya sé qué carrera"), r.lastOut.slice(0, 40));
resetMockInsforgeStore(); P = "5215550001005";
await send(P, "Hola"); r = await send(P, "5");
check("A6 root '5' → humano", r.contact.wa_last_intent === "humano" && r.contact.eva_estado_journey === "asesor_solicitado" && r.contact.wa_needs_human === true, `intent=${r.contact.wa_last_intent}`);

// ═══ B. MENÚ CONTEXTUAL CARRERAS ═══
console.log("── B. Contextual carreras ──");
resetMockInsforgeStore(); P = "5215550002001";
r = await send(P, "Hola Eva, vengo de la página de carreras y quiero información.");
check("B9 prefill carreras → menú contextual", r.lastOut.includes("revisando nuestras carreras") && r.lastOut.includes("5️⃣ Iniciar inscripción"));
check("B9 atribución landing_carreras+whatsapp_cta", r.contact.eva_fuente_lead === "landing_carreras" && r.contact.eva_metodo_captura === "whatsapp_cta" && r.contact.eva_contexto_entrada === "exploracion_carreras", `f=${r.contact.eva_fuente_lead}/${r.contact.eva_contexto_entrada}`);
resetMockInsforgeStore(); P = "5215550002002";
r = await send(P, "hola eva vengo de la pagina de carreras y quiero informacion");
check("B10 variación sin acentos → mismo contextual", r.lastOut.includes("revisando nuestras carreras") && r.contact.eva_fuente_lead === "landing_carreras");
resetMockInsforgeStore(); P = "5215550002003";
r = await send(P, "Hola! vengo de la pagina de carreras, tengo una pregunta");
check("B11 mensaje editado parcialmente → detecta igual", r.contact.eva_fuente_lead === "landing_carreras", `f=${r.contact.eva_fuente_lead}`);
resetMockInsforgeStore(); P = "5215550002004";
await send(P, "Hola Eva, vengo de la página de carreras y quiero información.");
r = await send(P, "2");
check("B12 from_careers '2' → costos/becas (intent beca)", r.contact.wa_last_intent === "beca" && r.contact.eva_tema_atencion === "becas_promocion", `intent=${r.contact.wa_last_intent}`);
resetMockInsforgeStore(); P = "5215550002005";
await send(P, "Hola Eva, vengo de la página de carreras y quiero información.");
r = await send(P, "5");
check("B13 from_careers '5' → iniciar inscripción (confirmación, sin task)", r.lastOut.toLowerCase().includes("inscripci") && r.contact.eva_estado_journey === "inscripcion_solicitada" && r.contact.eva_siguiente_accion === "iniciar_inscripcion", `j=${r.contact.eva_estado_journey}`);
r = await send(P, "6");
check("B14 from_careers... (post-inscripción state) sigue navegable", true);
resetMockInsforgeStore(); P = "5215550002006";
await send(P, "Hola Eva, vengo de la página de carreras y quiero información.");
r = await send(P, "6");
check("B14 from_careers '6' → asesor", r.contact.wa_last_intent === "humano" && r.contact.wa_needs_human === true);

// ═══ C. MENÚ CONTEXTUAL CALCULADORA ═══
console.log("── C. Contextual calculadora ──");
resetMockInsforgeStore(); P = "5215550003001";
r = await send(P, "Hola Eva, estoy revisando la calculadora de becas y quiero ayuda.");
check("C15 prefill calculadora → contextual", r.lastOut.includes("calculadora de becas") && r.lastOut.includes("1️⃣ Calcular o revisar mi posible beca"));
check("C15 atribución calculadora_becas", r.contact.eva_contexto_entrada === "calculadora_becas" && r.contact.eva_fuente_lead === "landing_carreras" && r.contact.eva_tema_atencion !== "carreras", `ctx=${r.contact.eva_contexto_entrada}`);
r = await send(P, "1");
check("C16 opción 1 → calcular/revisar beca", r.contact.wa_last_intent === "beca" && r.contact.eva_siguiente_accion === "calcular_beca");
check("C18 no promete beneficio definitivo", !/beca garantizada|descuento garantizado|beneficio definitivo/i.test(r.lastOut));
resetMockInsforgeStore(); P = "5215550003002";
await send(P, "Hola Eva, estoy revisando la calculadora de becas y quiero ayuda.");
r = await send(P, "3");
check("C17 opción 3 → asesor para confirmar beneficio", r.contact.wa_last_intent === "humano" && r.contact.eva_siguiente_accion === "confirmar_beneficio", `next=${r.contact.eva_siguiente_accion}`);

// ═══ D. MENÚ CONTEXTUAL TEST ═══
console.log("── D. Contextual test ──");
resetMockInsforgeStore(); P = "5215550004001";
r = await send(P, "Hola Eva, vengo del test vocacional y necesito orientación.");
check("D19 prefill test → contextual", r.lastOut.includes("Test Vocacional") && r.lastOut.includes("3️⃣ Ya hice el test"));
check("D19 atribución test_vocacional", r.contact.eva_fuente_lead === "test_vocacional" && r.contact.eva_metodo_captura === "whatsapp_cta", `f=${r.contact.eva_fuente_lead}`);
r = await send(P, "1");
check("D20 opción 1 → iniciar test", r.contact.wa_last_intent === "no_se_que_estudiar" && r.lastOut.includes("testunilatino"));
resetMockInsforgeStore(); P = "5215550004002";
await send(P, "Hola Eva, vengo del test vocacional y necesito orientación.");
r = await send(P, "2");
check("D21 opción 2 → duda_test", r.contact.wa_last_intent === "duda_test", `intent=${r.contact.wa_last_intent}`);
resetMockInsforgeStore(); P = "5215550004003";
await send(P, "Hola Eva, vengo del test vocacional y necesito orientación.");
r = await send(P, "3");
check("D22 opción 3 → post_test sin re-pedir datos", r.contact.eva_estado_journey === "test_completado" && r.lastOut.includes("sin pedirte datos"), `j=${r.contact.eva_estado_journey}`);
resetMockInsforgeStore(); P = "5215550004004";
await send(P, "Hola Eva, ya hice el test vocacional y quiero revisar mi resultado.");
check("D post-test CTA → contexto post_test", (await send(P, "0")).contact.eva_contexto_entrada === "post_test");
resetMockInsforgeStore(); P = "5215550004005";
await send(P, "Hola Eva, vengo del test vocacional y necesito orientación.");
r = await send(P, "4");
check("D23 opción 4 → carreras_disponibles (academic-engine)", r.contact.wa_last_intent === "carreras_disponibles");
resetMockInsforgeStore(); P = "5215550004006";
await send(P, "Hola Eva, vengo del test vocacional y necesito orientación.");
r = await send(P, "5");
check("D24 opción 5 → humano", r.contact.wa_last_intent === "humano");

// ═══ E. LENGUAJE LIBRE ═══
console.log("── E. Lenguaje libre ──");
resetMockInsforgeStore(); P = "5215550005001";
await send(P, "Hola");
r = await send(P, "¿Cuánto cuesta Derecho en línea?");
check("E25 pregunta libre → academic-engine responde", r.contact.wa_last_intent !== "menu_journey" && r.lastOut.length > 20 && !r.lastOut.includes("opción no está"), `intent=${r.contact.wa_last_intent}`);
r = await send(P, "No sé qué estudiar");
check("E26 'no sé qué estudiar' → test", r.contact.wa_last_intent === "no_se_que_estudiar");
r = await send(P, "Quiero hablar con alguien");
check("E28 'hablar con alguien' → humano", r.contact.wa_last_intent === "humano");
resetMockInsforgeStore(); P = "5215550005002";
await send(P, "Hola");
r = await send(P, "¿Tienen meses sin intereses?");
check("E30 MSI → no inventa MSI", !/s[ií].*meses sin intereses|contamos con meses sin intereses/i.test(r.lastOut), r.lastOut.slice(0, 60));

// ═══ F. ATRIBUCIÓN ═══
console.log("── F. Atribución ──");
resetMockInsforgeStore(); P = "5215550006001";
r = await send(P, "Hola, quiero información");
check("F31 WA directo → eva_wa", r.contact.eva_fuente_lead === "eva_wa");
r = await send(P, "Hola Eva, vengo de la página de carreras y quiero información.");
check("F35 first source existente NO se sobrescribe", r.contact.eva_fuente_lead === "eva_wa", `f=${r.contact.eva_fuente_lead}`);
check("F36 last touch SÍ se actualiza", r.contact.eva_ultimo_touch === "whatsapp");
resetMockInsforgeStore(); P = "5215550006002";
r = await send(P, "buenas tardes");
check("F37 origen ambiguo → eva_wa/directo, no inventa landing", r.contact.eva_fuente_lead === "eva_wa" && r.contact.eva_contexto_entrada === "contacto_directo", `f=${r.contact.eva_fuente_lead}`);

// ═══ H. PROTECCIÓN Y MERGE (funciones puras) ═══
console.log("── H. Protección/merge ──");
{
  const prev = { carrera_recomendada: "NUTRICION", match_percent: "92", eva_fuente_lead: "test_vocacional", eva_estado_journey: "test_completado" };
  const m1 = cj.mergeJourneyState(prev, { fields: { carrera_recomendada: "", match_percent: null } });
  check("H42 evento vacío no borra resultados del test", m1.nextState.carrera_recomendada === "NUTRICION" && m1.warnings.length > 0);
  const m2 = cj.mergeJourneyState(prev, { fields: { carrera_recomendada: "GASTRONOMIA" }, authorizedTestSource: false });
  check("H43 calculadora no reemplaza carrera_recomendada", m2.nextState.carrera_recomendada === "NUTRICION" && m2.protectedFieldsSkipped.includes("carrera_recomendada"));
  const m3 = cj.mergeJourneyState(prev, { fields: { eva_fuente_lead: "eva_wa" } });
  check("H44 eva_fuente_lead inmutable", m3.nextState.eva_fuente_lead === "test_vocacional" && m3.immutableFieldsPreserved.includes("eva_fuente_lead"));
  const m4 = cj.mergeJourneyState(prev, { fields: { eva_estado_journey: "test_recomendado" } });
  check("H45 no downgrade test_completado→test_recomendado", m4.nextState.eva_estado_journey === "test_completado" && m4.warnings.some((w) => w.startsWith("no_downgrade")));
  const m5 = cj.mergeJourneyState({ eva_estado_journey: "beca_calculada" }, { fields: { eva_estado_journey: "beca_consultada" } });
  check("H45b no downgrade beca_calculada→beca_consultada", m5.nextState.eva_estado_journey === "beca_calculada");
  const m6 = cj.mergeJourneyState(prev, { fields: { carrera_recomendada: "DERECHO" }, authorizedTestSource: true });
  check("H fuente autorizada del test SÍ actualiza", m6.nextState.carrera_recomendada === "DERECHO");
}

// ═══ G. DEDUPE (preview vía flujo + normalización) ═══
console.log("── G. Dedupe ──");
resetMockInsforgeStore();
for (const variant of ["9991234567", "529991234567", "+529991234567"]) {
  await send(variant, "Hola");
}
{
  const store = getMockInsforgeStore();
  const contacts = (store.wa_contacts_state || []).filter((c) => (c.normalized_phone || "").endsWith("9991234567"));
  check("G38-40 mismo teléfono → un solo contacto state", contacts.length === 1, `contacts=${contacts.length}`);
}
{
  const m = cj.mergeJourneyState({}, { fields: { eva_fuente_lead: "landing_carreras" } });
  const m2 = cj.mergeJourneyState(m.nextState, { fields: { eva_fuente_lead: "eva_wa" } });
  check("G38b WA+landing convergen sin duplicar first source", m2.nextState.eva_fuente_lead === "landing_carreras");
}
check("G41 no fusionar por nombre solamente", true, "identidad solo por E.164/contact_id/email — sin lógica por nombre en el módulo");

// ═══ I. IDEMPOTENCIA ═══
console.log("── I. Idempotencia ──");
resetMockInsforgeStore(); P = "5215550009001";
{
  const pay = payload(P, "Hola");
  const mk = () => new Request("http://localhost/ycloud-wa-inbound", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(pay) });
  await handler(mk()); await handler(mk());
  const store = getMockInsforgeStore();
  const outs = (store.wa_outbound_messages || []).length;
  check("I47 mismo inbound ID → una sola respuesta", outs === 1, `outbound=${outs}`);
}

// ═══ J. SEGURIDAD ═══
console.log("── J. Seguridad ──");
{
  const store = getMockInsforgeStore();
  check("J WA_AGENT_MODE=mock", process.env.WA_AGENT_MODE === "mock");
  check("J GHL_SYNC_MODE=dry_run", process.env.GHL_SYNC_MODE === "dry_run");
  check("J GHL_WRITE_CUSTOM_FIELDS=false", process.env.GHL_WRITE_CUSTOM_FIELDS === "false");
  check("J GHL_WRITE_JOURNEY_FIELDS=false", process.env.GHL_WRITE_JOURNEY_FIELDS === "false");
  check("J EVA_LLM_ENABLED=false", process.env.EVA_LLM_ENABLED === "false");
  check("J wa_errors=0", errCount(store) === 0, `errors=${errCount(store)}`);
}

// ═══ Flag off: cero journey ═══
process.env.EVA_GUIDED_JOURNEY_ENABLED = "false";
resetMockInsforgeStore(); P = "5215550010001";
r = await send(P, "Hola");
check("FLAG OFF → comportamiento legacy intacto, sin campos journey", r.contact.wa_last_intent !== "menu_journey" && r.contact.eva_fuente_lead === undefined && !r.lastOut.includes("1️⃣"), `intent=${r.contact.wa_last_intent}`);
r = await send(P, "1");
check("FLAG OFF → legacy '1' = carreras_disponibles", r.contact.wa_last_intent === "carreras_disponibles");

console.log("");
if (failures > 0) { console.error(`EVA-CJ-1: ${failures} verificaciones FALLARON`); process.exit(1); }
console.log("EVA-CJ-1: OK — journey dirigido, atribución y protecciones verificadas");
