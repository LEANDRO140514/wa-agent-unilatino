/**
 * GHL Relevance Gate — pure decision logic (7G.7B shadow / 7G.7B.2 calibration).
 * No GHL / YCloud / OpenAI / DB calls.
 */

const IGNORED_INTENTS = new Set([
  "saludo",
  "agradecimiento",
  "despedida",
  "sin_texto",
  "spam",
  "emoji",
  "wrong_number",
  "media_no_text",
]);

const RELEVANT_INTENTS = new Set([
  "carrera_interes",
  "carreras_disponibles",
  "beca",
  "costo",
  "inscripcion",
  "documentos",
  "modalidad",
  "no_se_que_estudiar",
  "test_vocacional",
  "post_test",
  "humano",
  "duda_test",
  "fuera_de_knowledge",
  "queja",
]);

const HIGH_VALUE_INTENTS = new Set([
  "humano",
  "inscripcion",
  "post_test",
  "duda_test",
  "queja",
  "beca",
  "carrera_interes",
  "test_vocacional",
  "no_se_que_estudiar",
  "documentos",
  "carreras_disponibles",
  "costo",
]);

const HUMAN_HANDOFF_INTENTS = new Set([
  "humano",
  "inscripcion",
  "duda_test",
  "post_test",
  "queja",
  "fuera_de_knowledge",
]);

const PRESERVE_HUMAN_STAGES = new Set([
  "asesor_requerido",
  "beca_interes",
  "soporte_test",
  "post_test",
]);

const ENROLLMENT_PHRASES = [
  "inscribirme",
  "inscripcion",
  "inscribir",
  "quiero entrar",
  "quiero empezar",
  "iniciar esta semana",
  "hacer mi proceso",
  "apartar mi lugar",
  "proceso de inscripcion",
  "quiero inscribir",
];

const ORIENTATION_PHRASES = [
  "no se que estudiar",
  "no sé qué estudiar",
  "orientar",
  "orientacion",
  "orientación",
  "que carrera me conviene",
  "qué carrera me conviene",
  "que estudiar",
  "qué estudiar",
  "me pueden orientar",
  "me puede orientar",
];

const VOCATIONAL_PHRASES = [
  "test vocacional",
  "hacer el test",
  "hacer test vocacional",
  "quiero hacer el test",
];

const DOCUMENT_PHRASES = [
  "documentos",
  "requisitos",
  "papeles",
  "acta",
  "certificado",
];

const PARENT_PHRASES = [
  "mama",
  "mamá",
  "mama de",
  "mamá de",
  "papa",
  "papá",
  "papa de",
  "papá de",
  "padre",
  "madre",
  "mi hijo",
  "mi hija",
  "tutor",
];

const URGENCY_PHRASES = [
  "urgente",
  "hoy",
  "antes de",
  "cierre",
  "esta semana",
  "lo antes posible",
  "este mes",
  " ya ",
];

const MODALITY_PHRASES = [
  "modalidad",
  "en linea",
  "en línea",
  "online",
  "presencial",
  "sabatino",
  "semipresencial",
];

const COST_PHRASES = [
  "costo",
  "cuesta",
  "precio",
  "colegiatura",
  "mensualidad",
  "cuanto se paga",
  "cuánto se paga",
  "inscripcion cuanto",
  "inscripción cuánto",
  "pago",
];

const NON_COMMERCIAL_ACADEMIC_INTENTS = new Set([
  "greeting",
  "saludo",
  "farewell",
  "despedida",
  "thanks",
  "agradecimiento",
  "small_talk",
  "fallback",
  "ambiguous",
  "ambiguo",
  "none",
]);

const COST_ACADEMIC_INTENTS = new Set([
  "cost",
  "tuition",
  "pricing",
  "colegiatura",
  "mensualidad",
  "costo",
  "precio",
]);

const COST_TOPIC_TOKENS = [
  "cost",
  "tuition",
  "pricing",
  "colegiatura",
  "mensualidad",
  "precio",
  "costo",
  "tarifa",
  "pago",
];

const CAREER_KEYWORDS = [
  "derecho",
  "psicologia",
  "administracion",
  "contaduria",
  "mercadotecnia",
  "educacion",
  "enfermeria",
  "arquitectura",
  "ingenieria",
  "sistemas",
  "criminologia",
  "nutricion",
  "diseno",
  "gastronomia",
  "gastronomía",
  "psicología",
];

const SPAM_PATTERNS = [
  "gana dinero",
  "ganar dinero",
  "http://",
  "https://",
  "www.",
  "click aqui",
  "click aquí",
  "criptomoneda",
  "bitcoin gratis",
];

const DEFAULTS = {
  ghlRelevanceShadowMode: true,
  ghlSyncPolicy: "none",
  ghlLeadScoreThreshold: 45,
  ghlMetaAdsLeadScoreThreshold: 50,
  metaAdsFirstMessageNoSync: true,
  metaAdsRequireQualification: true,
};

function normalizeText(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function textIncludesAny(t, phrases) {
  const n = normalizeText(t);
  return phrases.some((p) => n.includes(normalizeText(p)));
}

function envBool(value, defaultValue) {
  if (value === undefined || value === null || value === "") return defaultValue;
  return String(value).toLowerCase() === "true";
}

function envInt(value, defaultValue) {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

export function normalizeGhlRelevanceConfig(env = {}) {
  const get = (key) => env[key] ?? env[key.toLowerCase?.()] ?? undefined;
  return {
    ghlRelevanceShadowMode: envBool(get("GHL_RELEVANCE_SHADOW_MODE"), DEFAULTS.ghlRelevanceShadowMode),
    ghlSyncPolicy: String(get("GHL_SYNC_POLICY") || DEFAULTS.ghlSyncPolicy).toLowerCase(),
    ghlLeadScoreThreshold: envInt(get("GHL_LEAD_SCORE_THRESHOLD"), DEFAULTS.ghlLeadScoreThreshold),
    ghlMetaAdsLeadScoreThreshold: envInt(
      get("GHL_META_ADS_LEAD_SCORE_THRESHOLD"),
      DEFAULTS.ghlMetaAdsLeadScoreThreshold
    ),
    metaAdsFirstMessageNoSync: envBool(
      get("META_ADS_FIRST_MESSAGE_NO_SYNC"),
      DEFAULTS.metaAdsFirstMessageNoSync
    ),
    metaAdsRequireQualification: envBool(
      get("META_ADS_REQUIRE_QUALIFICATION"),
      DEFAULTS.metaAdsRequireQualification
    ),
  };
}

export function normalizeTrafficSource(raw) {
  const s = String(raw || "")
    .toLowerCase()
    .trim();
  if (!s) return null;
  if (s === "meta_ads" || s === "meta" || s === "meta-ads" || s === "facebook" || s === "instagram") {
    return "meta_ads";
  }
  return s;
}

export function extractTrafficSourceFromPayload(body = {}) {
  const candidates = [
    body.source,
    body.channel_source,
    body.origin,
    body.traffic_source,
    body.referral?.source,
    body.context?.source,
    body.referral?.type === "ad" ? "meta_ads" : null,
  ];
  for (const c of candidates) {
    const normalized = normalizeTrafficSource(c);
    if (normalized === "meta_ads") return "meta_ads";
    if (normalized) return normalized;
  }
  if (body.referral?.ad_id || body.referral?.campaign_id) return "meta_ads";
  return null;
}

export function extractFirstMessageFlag(body = {}) {
  if (body.first_message === true || body.firstMessage === true) return true;
  if (body.first_message === false || body.firstMessage === false) return false;
  return null;
}

function shouldPreserveHumanContext(contactContext = {}) {
  if (contactContext.wa_needs_human === true) return true;
  const stage = contactContext.wa_stage || "";
  return PRESERVE_HUMAN_STAGES.has(stage);
}

function isFirstMessageFromContext(contactContext = {}) {
  if (!contactContext || Object.keys(contactContext).length === 0) return true;
  const stage = contactContext.wa_stage;
  if (!stage || stage === "inicio") return true;
  return false;
}

export function resolveFirstMessage(input = {}) {
  if (input.firstMessage === true) return true;
  if (input.firstMessage === false) return false;
  return isFirstMessageFromContext(input.contactContext);
}

function isSaludoOnly(messageText) {
  const t = normalizeText(messageText);
  if (!t) return false;
  const greetings = [
    "hola",
    "buenas",
    "buen dia",
    "buenos dias",
    "buenas tardes",
    "buenas noches",
    "hey",
    "que tal",
    "saludos",
  ];
  const matched = greetings.some((g) => t === g || t.startsWith(`${g} `) || t.startsWith(`${g},`));
  if (!matched) return false;
  const stripped = greetings.reduce((s, g) => s.replace(g, "").trim(), t);
  return stripped.length <= 12 || t.split(/\s+/).length <= 3;
}

function isSpamMessage(messageText) {
  const t = normalizeText(messageText);
  return SPAM_PATTERNS.some((p) => t.includes(normalizeText(p)));
}

function isEmojiOnly(messageText) {
  const t = String(messageText || "").trim();
  if (!t) return false;
  return /^[\p{Emoji}\p{Extended_Pictographic}\s]+$/u.test(t) && t.length <= 8;
}

function hasCareerMention(messageText) {
  const t = normalizeText(messageText);
  if (CAREER_KEYWORDS.some((k) => t.includes(normalizeText(k)))) return true;
  if (
    t.includes("carrera") &&
    (t.includes("interesa") ||
      t.includes("informacion") ||
      t.includes("información") ||
      t.includes("conviene") ||
      t.includes("orientar") ||
      t.includes("estudiar"))
  ) {
    return true;
  }
  return false;
}

export function hasExplicitEnrollmentSignal(messageText) {
  const t = normalizeText(messageText);
  return ENROLLMENT_PHRASES.some((p) => t.includes(normalizeText(p))) || t.includes("inscri");
}

export function hasOrientationSignal(messageText, intent) {
  const t = normalizeText(messageText);
  if (intent === "no_se_que_estudiar") return true;
  if (textIncludesAny(messageText, ORIENTATION_PHRASES)) return true;
  if (t.includes("carrera") && (t.includes("conviene") || t.includes("orientar") || t.includes("orientacion"))) {
    return true;
  }
  return false;
}

export function hasVocationalTestSignal(messageText, intent) {
  if (intent === "test_vocacional" || intent === "duda_test") return true;
  return textIncludesAny(messageText, VOCATIONAL_PHRASES);
}

export function hasDocumentsEnrollmentSignal(messageText) {
  const t = normalizeText(messageText);
  const hasDocs = DOCUMENT_PHRASES.some((p) => t.includes(normalizeText(p)));
  const hasEnrollment = hasExplicitEnrollmentSignal(messageText);
  return hasDocs && (hasEnrollment || t.includes("inscri"));
}

export function hasParentGuardianSignal(messageText) {
  return textIncludesAny(messageText, PARENT_PHRASES);
}

export function hasCostSignal(messageText) {
  const t = normalizeText(messageText);
  if (textIncludesAny(messageText, COST_PHRASES)) return true;
  if (t.includes("cuanto") && (t.includes("cuesta") || t.includes("pago") || t.includes("cobran"))) {
    return true;
  }
  return false;
}

export function isNonCommercialAcademicIntent(academicIntent) {
  if (academicIntent === null || academicIntent === undefined) return true;
  const normalized = normalizeText(String(academicIntent));
  if (!normalized || normalized === "none") return true;
  return NON_COMMERCIAL_ACADEMIC_INTENTS.has(normalized);
}

function hasCostTopicSignal(topicRaw) {
  const topic = normalizeText(topicRaw || "");
  if (!topic) return false;
  return COST_TOPIC_TOKENS.some((token) => topic.includes(normalizeText(token)));
}

export function isCostOrTuitionExplicitlyValidated(academicResult) {
  if (!academicResult || typeof academicResult !== "object") return false;

  if (academicResult.cost_validated === true) return true;
  if (academicResult.tuition_validated === true) return true;
  if (academicResult.pricing_validated === true) return true;
  if (academicResult.has_cost_info === true) return true;
  if (academicResult.contains_cost === true) return true;

  const intent = normalizeText(academicResult.academic_intent || "");
  if (COST_ACADEMIC_INTENTS.has(intent)) {
    if (
      academicResult.kb_hit === true ||
      academicResult.validated === true ||
      academicResult.academic_kb_validated === true
    ) {
      return true;
    }
  }

  if (academicResult.kb_hit === true) {
    const topic =
      academicResult.kb_topic ||
      academicResult.topic ||
      academicResult.academic_topic ||
      "";
    if (hasCostTopicSignal(topic)) return true;
  }

  return false;
}

export function requiresCostHumanValidation(input = {}) {
  const { messageText, academicResult } = input;
  if (!hasCostSignal(messageText)) return false;
  if (isCostOrTuitionExplicitlyValidated(academicResult)) return false;
  const t = normalizeText(messageText);
  return (
    hasCareerMention(messageText) ||
    textIncludesAny(messageText, MODALITY_PHRASES) ||
    hasExplicitEnrollmentSignal(messageText) ||
    t.includes("admision") ||
    t.includes("admisión")
  );
}

function isMetaAdsNonCommercialFirstMessage(input, effectiveIntent) {
  const { messageText, source } = input;
  if (normalizeTrafficSource(source) !== "meta_ads") return false;
  if (!resolveFirstMessage(input)) return false;
  if (hasBusinessSignal(input)) return false;
  return (
    effectiveIntent === "saludo" ||
    effectiveIntent === "ambiguo" ||
    isSaludoOnly(messageText)
  );
}

function applyMetaAdsFirstMessageNoSync(base) {
  return {
    ...base,
    qualified_for_ghl: false,
    would_sync_to_ghl: false,
    would_create_contact: false,
    would_create_note: false,
    would_create_task: false,
    would_update_custom_fields: false,
    ignored_for_ghl: true,
    routing_reason: "meta_ads_first_message_no_sync",
    routing_decision: "whatsapp_and_insforge_only",
    human_handoff_reason: null,
  };
}

export function hasBusinessSignal(input = {}) {
  const { intent, messageText, contactContext, academicResult, intentDecision } = input;
  const t = normalizeText(messageText);

  if (RELEVANT_INTENTS.has(intent)) return true;
  if (intentDecision?.createTask === true) return true;
  if (contactContext?.wa_needs_human === true) return true;

  if (hasExplicitEnrollmentSignal(messageText)) return true;
  if (hasOrientationSignal(messageText, intent)) return true;
  if (hasVocationalTestSignal(messageText, intent)) return true;
  if (hasDocumentsEnrollmentSignal(messageText)) return true;

  if (
    t.includes("quiero estudiar") ||
    t.includes("me interesa")
  ) {
    return true;
  }
  if (t.includes("beca") || t.includes("promedio") || t.includes("costo") || t.includes("cuanto")) {
    return true;
  }
  if (t.includes("asesor") || t.includes("persona") || t.includes("llamada")) {
    return true;
  }
  if (hasCareerMention(messageText)) return true;

  const academicIntent = academicResult?.academic_intent;
  if (academicResult?.academic_enriched === true && !isNonCommercialAcademicIntent(academicIntent)) {
    return true;
  }
  if (academicIntent && !isNonCommercialAcademicIntent(academicIntent)) {
    return true;
  }

  return false;
}

export function isIgnoredIntent(intent) {
  return IGNORED_INTENTS.has(intent);
}

export function isRelevantIntent(intent) {
  return RELEVANT_INTENTS.has(intent);
}

function isHighValueIntent(intent) {
  return HIGH_VALUE_INTENTS.has(intent);
}

function isMediaNoText(messageType, messageText) {
  const type = String(messageType || "text").toLowerCase();
  const text = String(messageText || "").trim();
  if (type !== "text" && !text) return true;
  return false;
}

function resolveEffectiveIntent(input) {
  const { intent, messageText } = input;
  if (intent === "ambiguo" && isSaludoOnly(messageText)) return "saludo";
  if (isSpamMessage(messageText)) return "spam";
  if (isEmojiOnly(messageText)) return "emoji";
  if (isMediaNoText(input.messageType, messageText)) return "media_no_text";
  if (hasExplicitEnrollmentSignal(messageText) && intent === "ambiguo") return "inscripcion";
  if (hasDocumentsEnrollmentSignal(messageText) && intent === "ambiguo") return "documentos";
  return intent;
}

export function requiresHumanHandoff(input = {}) {
  return Boolean(getHumanHandoffReason(input));
}

export function getHumanHandoffReason(input = {}) {
  const { intent, intentDecision, messageText, academicResult } = input;
  const t = normalizeText(messageText);

  if (hasExplicitEnrollmentSignal(messageText) && !isSaludoOnly(messageText)) {
    return "explicit_enrollment_intent";
  }

  if (HUMAN_HANDOFF_INTENTS.has(intent)) {
    if (intent === "fuera_de_knowledge") {
      return hasBusinessSignal(input) ? "fuera_de_knowledge_commercial" : null;
    }
    return `intent_${intent}`;
  }

  if (intentDecision?.createTask === true && (intent === "humano" || intent === "beca")) {
    return `intent_${intent}_task`;
  }

  if (intent === "beca" && academicResult?.academic_pending_validation_used === true) {
    return "beca_no_validada";
  }

  if (
    (intent === "beca" || intent === "costo" || t.includes("cuanto cuesta")) &&
    academicResult?.academic_enriched === false &&
    academicResult?.academic_intent === "fallback"
  ) {
    return "costo_no_validado";
  }

  if (
    t.includes("llamada") ||
    t.includes("asesor") ||
    t.includes("persona") ||
    t.includes("hablar con") ||
    t.includes("me puede llamar")
  ) {
    return "explicit_human_request";
  }

  if (t.includes("frustrad") || t.includes("mal servicio") || t.includes("queja")) {
    return "frustration_or_complaint";
  }

  return null;
}

export function computeLeadScore(input = {}) {
  const { intent, messageText } = input;
  const t = normalizeText(messageText);
  const breakdown = [];
  let score = 0;

  const add = (rule, points) => {
    if (!points) return;
    breakdown.push({ rule, points });
    score += points;
  };

  if (hasExplicitEnrollmentSignal(messageText) || intent === "inscripcion") {
    add("explicit_enrollment_intent", 40);
  }
  if (intent === "carrera_interes" || hasCareerMention(messageText)) {
    add("career_interest", 30);
  }
  if (
    intent === "beca" ||
    intent === "costo" ||
    t.includes("beca") ||
    t.includes("promedio") ||
    t.includes("costo") ||
    t.includes("cuanto cuesta")
  ) {
    add("scholarship_or_cost", 25);
  }
  if (intent === "beca" && (t.includes("promedio") || t.includes("gpa"))) {
    add("beca_qualification_context", 20);
  }
  if (intent === "humano" || t.includes("asesor") || t.includes("hablar con")) {
    add("advisor_request", 20);
  }
  if (textIncludesAny(messageText, URGENCY_PHRASES) || t.includes("esta semana")) {
    add("urgency", 15);
  }
  if (textIncludesAny(messageText, MODALITY_PHRASES)) {
    add("modality", 10);
  }
  if (hasVocationalTestSignal(messageText, intent)) {
    add("vocational_test", 25);
  }
  if (hasOrientationSignal(messageText, intent)) {
    add("orientation_signal", 20);
  }
  if (hasDocumentsEnrollmentSignal(messageText) || (intent === "documentos" && t.includes("document"))) {
    add("documents_or_requirements", 20);
  }
  if (hasParentGuardianSignal(messageText)) {
    add("parent_or_guardian", 5);
  }

  const effectiveIntent = resolveEffectiveIntent(input);
  if (
    (effectiveIntent === "ambiguo" || effectiveIntent === "saludo") &&
    !hasBusinessSignal(input)
  ) {
    add("noise_or_ambiguous", -10);
  }
  if (effectiveIntent === "spam" || effectiveIntent === "emoji") {
    add("spam_or_noise", -20);
  }

  score = Math.max(0, Math.min(100, score));

  return { lead_score: score, score_breakdown: breakdown };
}

function buildShadowBase(config, lead_score, score_breakdown) {
  return {
    enabled: config.ghlRelevanceShadowMode,
    policy: config.ghlSyncPolicy,
    ghl_sync_policy: config.ghlSyncPolicy,
    ghl_relevance_shadow_enabled: config.ghlRelevanceShadowMode,
    lead_score,
    score_breakdown,
    qualified_for_ghl: false,
    would_sync_to_ghl: false,
    would_create_contact: false,
    would_create_note: false,
    would_create_task: false,
    would_update_custom_fields: false,
    routing_decision: "whatsapp_and_insforge_only",
    routing_reason: null,
    human_handoff_reason: null,
    ignored_for_ghl: false,
  };
}

function applyQualifiedContactNote(base, reason, qualified = true) {
  return {
    ...base,
    qualified_for_ghl: qualified,
    would_sync_to_ghl: true,
    would_create_contact: true,
    would_create_note: true,
    would_create_task: false,
    would_update_custom_fields: true,
    routing_decision: "qualified_contact_note",
    routing_reason: reason,
    ignored_for_ghl: false,
  };
}

function applyQualifiedWithTask(base, humanHandoffReason, reason) {
  return {
    ...base,
    qualified_for_ghl: true,
    would_sync_to_ghl: true,
    would_create_contact: true,
    would_create_note: true,
    would_create_task: true,
    would_update_custom_fields: true,
    routing_decision: "qualified_contact_note_task",
    routing_reason: reason,
    human_handoff_reason: humanHandoffReason,
    ignored_for_ghl: false,
  };
}

function detectCalibratedLeadException(input, effectiveIntent, intent) {
  const { messageText } = input;
  const t = normalizeText(messageText);

  if (hasExplicitEnrollmentSignal(messageText) && !isSaludoOnly(messageText)) {
    return { reason: "explicit_enrollment_intent", withTask: true, handoff: "explicit_enrollment_intent" };
  }

  if (hasDocumentsEnrollmentSignal(messageText)) {
    return { reason: "documents_enrollment_signal", withTask: false, handoff: null };
  }

  if (hasVocationalTestSignal(messageText, intent) && !t.includes("asesor")) {
    return { reason: "vocational_test_lead", withTask: false, handoff: null };
  }

  if (hasOrientationSignal(messageText, intent) && !t.includes("asesor") && !t.includes("llamada")) {
    return { reason: "orientation_lead", withTask: false, handoff: null };
  }

  if (
    (intent === "carrera_interes" || effectiveIntent === "carrera_interes") &&
    hasCareerMention(messageText)
  ) {
    return { reason: "high_value_intent_exception", withTask: false, handoff: null };
  }

  if (isHighValueIntent(intent) || isHighValueIntent(effectiveIntent)) {
    return { reason: "high_value_intent_exception", withTask: false, handoff: null };
  }

  return null;
}

export function evaluateGhlRelevance(input = {}) {
  const config = input.config || normalizeGhlRelevanceConfig(input.env || {});
  const { lead_score, score_breakdown } = computeLeadScore(input);
  const base = buildShadowBase(config, lead_score, score_breakdown);

  if (!config.ghlRelevanceShadowMode) {
    return { ...base, routing_reason: "shadow_disabled" };
  }

  const intent = input.intent;
  const effectiveIntent = resolveEffectiveIntent(input);
  const { contactContext, messageText, source, intentDecision } = input;
  const threshold =
    source === "meta_ads" ? config.ghlMetaAdsLeadScoreThreshold : config.ghlLeadScoreThreshold;

  if (
    (intent === "agradecimiento" || intent === "despedida") &&
    shouldPreserveHumanContext(contactContext)
  ) {
    return {
      ...base,
      ignored_for_ghl: true,
      routing_reason: "post_escalation_closure_no_sync",
      routing_decision: "whatsapp_and_insforge_only",
    };
  }

  if (isMetaAdsNonCommercialFirstMessage(input, effectiveIntent)) {
    return applyMetaAdsFirstMessageNoSync(base);
  }

  if (effectiveIntent === "sin_texto" || effectiveIntent === "media_no_text") {
    return {
      ...base,
      ignored_for_ghl: true,
      routing_reason: "ignored_intent",
      routing_decision: "whatsapp_and_insforge_only",
    };
  }

  if (effectiveIntent === "spam" || effectiveIntent === "emoji") {
    return {
      ...base,
      ignored_for_ghl: true,
      routing_reason: "ignored_intent",
      routing_decision: "whatsapp_and_insforge_only",
    };
  }

  if (isIgnoredIntent(effectiveIntent) && !hasBusinessSignal(input)) {
    return {
      ...base,
      ignored_for_ghl: true,
      routing_reason: "ignored_intent",
      routing_decision: "whatsapp_and_insforge_only",
    };
  }

  if (
    hasDocumentsEnrollmentSignal(messageText) &&
    !textIncludesAny(messageText, ["esta semana", "urgente", "hoy", "ya"])
  ) {
    return applyQualifiedContactNote(base, "documents_enrollment_signal");
  }

  if (requiresCostHumanValidation(input)) {
    return applyQualifiedWithTask(
      base,
      "cost_or_tuition_requires_validation",
      "cost_signal_requires_human_validation"
    );
  }

  const humanHandoffReason = getHumanHandoffReason({ ...input, intent: effectiveIntent });

  if (humanHandoffReason) {
    const routingReason =
      humanHandoffReason === "explicit_human_request"
        ? "explicit_human_handoff"
        : humanHandoffReason === "explicit_enrollment_intent"
          ? "explicit_enrollment_intent"
          : "human_handoff";
    return applyQualifiedWithTask(base, humanHandoffReason, routingReason);
  }

  const calibrated = detectCalibratedLeadException(input, effectiveIntent, intent);
  if (calibrated) {
    if (calibrated.withTask) {
      return applyQualifiedWithTask(base, calibrated.handoff, calibrated.reason);
    }
    return applyQualifiedContactNote(base, calibrated.reason);
  }

  if (lead_score >= 60) {
    const wantsTask =
      intentDecision?.createTask === true ||
      isHighValueIntent(effectiveIntent) ||
      isHighValueIntent(intent);
    if (wantsTask) {
      return applyQualifiedWithTask(base, null, "lead_score_high_with_task");
    }
    return applyQualifiedContactNote(base, "lead_score_threshold_met");
  }

  if (lead_score >= threshold) {
    const wantsTask =
      intentDecision?.createTask === true && (intent === "beca" || intent === "humano");
    if (wantsTask) {
      return {
        ...applyQualifiedContactNote(base, "lead_score_threshold_met"),
        would_create_task: true,
        routing_decision: "qualified_contact_note_task",
        human_handoff_reason: intent === "beca" ? "intent_beca_task" : null,
      };
    }
    return applyQualifiedContactNote(base, "lead_score_threshold_met");
  }

  if (lead_score >= 30 && isHighValueIntent(intent)) {
    return {
      ...applyQualifiedContactNote(base, "high_value_intent_exception"),
      routing_decision: "watch_only_or_high_value_exception",
    };
  }

  if (isMetaAdsNonCommercialFirstMessage(input, effectiveIntent)) {
    return applyMetaAdsFirstMessageNoSync(base);
  }

  if (source === "meta_ads" && config.metaAdsRequireQualification && lead_score < threshold) {
    return {
      ...base,
      routing_reason: "meta_ads_below_threshold",
      routing_decision: "watch_only_or_high_value_exception",
    };
  }

  return {
    ...base,
    routing_reason: lead_score < 30 ? "below_threshold" : "watch_only_or_high_value_exception",
    routing_decision:
      lead_score < 30 ? "whatsapp_and_insforge_only" : "watch_only_or_high_value_exception",
  };
}

export function formatGhlRelevanceShadowPayload(decision) {
  if (!decision) return null;
  return {
    enabled: decision.enabled,
    policy: decision.policy,
    lead_score: decision.lead_score,
    qualified_for_ghl: decision.qualified_for_ghl,
    would_sync_to_ghl: decision.would_sync_to_ghl,
    would_create_contact: decision.would_create_contact,
    would_create_note: decision.would_create_note,
    would_create_task: decision.would_create_task,
    would_update_custom_fields: decision.would_update_custom_fields,
    routing_decision: decision.routing_decision,
    routing_reason: decision.routing_reason,
    human_handoff_reason: decision.human_handoff_reason,
    ignored_for_ghl: decision.ignored_for_ghl,
    score_breakdown: decision.score_breakdown,
  };
}
