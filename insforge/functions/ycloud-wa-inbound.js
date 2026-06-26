const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, YCloud-Signature",
};

const NO_TEXT_RESPONSE =
  "Recibí tu mensaje, pero por ahora puedo ayudarte mejor si me escribes tu duda en texto 😊\n\nPuedes decirme, por ejemplo:\n\"Quiero información\"\n\"No sé qué estudiar\"\n\"Quiero una beca\"\n\"Quiero hablar con un asesor\"";

const EVA_CAREER_NAMES = [
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
];

const EVA_TASK_INTENTS = new Set(["beca", "post_test", "humano", "duda_test"]);

const EVA_AFTER_HOURS_MESSAGE =
  "Gracias por escribirnos 😊 En este momento nuestro equipo de admisiones está fuera de horario, pero tu solicitud quedó registrada y te darán seguimiento en el siguiente horario hábil.";

const EVA_OPERATIONAL_DEFAULTS = {
  operational_owner: "Equipo de Admisiones Universidad Latino",
  business_hours_label: "Lunes a viernes 9:00-18:00, sábado 9:00-13:00",
  after_hours_message: EVA_AFTER_HOURS_MESSAGE,
  after_hours_logic_enabled: false,
};

const EVA_INTENT_TASK_TITLES = {
  humano: "Atender lead WhatsApp — Solicita asesor",
  duda_test: "Atender lead WhatsApp — Soporte test vocacional",
  beca: "Atender lead WhatsApp — Interés en beca",
  post_test: "Atender lead WhatsApp — Revisar resultado test",
};

const EVA_INTENT_OPERATIONAL = {
  humano: { priority: "high", escalation_required: true, task_priority_label: "Alta" },
  duda_test: { priority: "high", escalation_required: true, task_priority_label: "Alta" },
  beca: { priority: "medium", escalation_required: true, task_priority_label: "Media" },
  post_test: { priority: "medium", escalation_required: true, task_priority_label: "Media" },
  carrera_interes: { priority: "low", escalation_required: false, task_priority_label: "Baja" },
  carreras_disponibles: { priority: "low", escalation_required: false, task_priority_label: "Baja" },
  no_se_que_estudiar: { priority: "low", escalation_required: false, task_priority_label: "Baja" },
  ambiguo: { priority: "low", escalation_required: false, task_priority_label: "Baja" },
  agradecimiento: { priority: "low", escalation_required: false, task_priority_label: "Baja" },
  despedida: { priority: "low", escalation_required: false, task_priority_label: "Baja" },
  sin_texto: { priority: "low", escalation_required: false, task_priority_label: "Baja" },
};

const EVA_PRESERVE_HUMAN_STAGES = new Set([
  "asesor_requerido",
  "beca_interes",
  "soporte_test",
  "post_test",
]);

const EVA_AGRADECIMIENTO_POST_ESCALACION =
  "¡Con gusto! 😊 Tu solicitud ya quedó registrada. Un asesor de admisiones te dará seguimiento en breve.\n\n¡Éxito en tu proceso de inscripción!";

const EVA_AGRADECIMIENTO_GENERICO =
  "¡Con gusto! 😊 Si necesitas más información sobre carreras, becas o inscripción, escríbenos cuando quieras.";

const EVA_DESPEDIDA_POST_ESCALACION =
  "¡Hasta pronto! 😊 Tu solicitud sigue en seguimiento con admisiones. ¡Éxito en tu proceso!";

const EVA_DESPEDIDA_GENERICO =
  "¡Hasta pronto! 😊 Gracias por escribirnos. Si más adelante tienes dudas sobre carreras, becas o inscripción, aquí estaré para ayudarte.";

function shouldPreserveHumanContext(contactContext = {}) {
  if (contactContext.wa_needs_human === true) return true;
  const stage = contactContext.wa_stage || "";
  return EVA_PRESERVE_HUMAN_STAGES.has(stage);
}

const NON_INBOUND_EVENT_TYPES = new Set([
  "whatsapp.message.updated",
  "whatsapp.message.delivered",
  "whatsapp.message.read",
  "whatsapp.message.sent",
  "whatsapp.message.failed",
]);

function getConfig() {
  return {
    mode: Deno.env.get("WA_AGENT_MODE") || "mock",
    webhookSecret: Deno.env.get("YCLOUD_WEBHOOK_SECRET") || "",
    businessNumber: Deno.env.get("YCLOUD_BUSINESS_NUMBER") || "",
    wabaId: Deno.env.get("YCLOUD_WABA_ID") || "",
    ycloudApiKey: Deno.env.get("YCLOUD_API_KEY") || "",
    ycloudApiBaseUrl: Deno.env.get("YCLOUD_API_BASE_URL") || "https://api.ycloud.com/v2",
    evaTestUrl: Deno.env.get("EVA_TEST_URL") || "https://testunilatino.algorithmus.io",
    landingCarrerasUrl:
      Deno.env.get("LANDING_CARRERAS_URL") || "https://magenta-kangaroo.vercel.app",
    ghlSyncMode: Deno.env.get("GHL_SYNC_MODE") || "dry_run",
    ghlApiKey: Deno.env.get("GHL_API_KEY") || "",
    ghlLocationId: Deno.env.get("GHL_LOCATION_ID") || "",
    ghlApiBaseUrl:
      Deno.env.get("GHL_API_BASE_URL") || "https://services.leadconnectorhq.com",
    ghlWaFieldMapRaw: Deno.env.get("GHL_WA_FIELD_MAP") || "",
    ghlWriteCustomFields: Deno.env.get("GHL_WRITE_CUSTOM_FIELDS") === "true",
    ghlLiveAllowedPhones: parseGhlLiveAllowedPhones(
      Deno.env.get("GHL_LIVE_ALLOWED_PHONES") || ""
    ),
    academicEngineEnabled: Deno.env.get("ACADEMIC_ENGINE_ENABLED") === "true",
    evaLlmEnabled: Deno.env.get("EVA_LLM_ENABLED") === "true",
    evaLlmMode: Deno.env.get("LLM_MODE") || "off",
    evaLlmProvider: Deno.env.get("LLM_PROVIDER") || Deno.env.get("EVA_LLM_PROVIDER") || "openai",
    evaLlmModel: Deno.env.get("LLM_MODEL") || Deno.env.get("EVA_LLM_MODEL") || "gpt-4o-mini",
    evaLlmMaxTokens: Number(Deno.env.get("EVA_LLM_MAX_TOKENS") || "512"),
    evaLlmTimeoutMs: Number(Deno.env.get("EVA_LLM_TIMEOUT_MS") || "12000"),
    evaLlmFailOpen: Deno.env.get("EVA_LLM_FAIL_OPEN") !== "false",
    openaiApiKey: Deno.env.get("OPENAI_API_KEY") || "",
    ghlRelevanceShadowMode: Deno.env.get("GHL_RELEVANCE_SHADOW_MODE") !== "false",
    ghlSyncPolicy: Deno.env.get("GHL_SYNC_POLICY") || "none",
    ghlLeadScoreThreshold: Number(Deno.env.get("GHL_LEAD_SCORE_THRESHOLD") || "45"),
    ghlMetaAdsLeadScoreThreshold: Number(
      Deno.env.get("GHL_META_ADS_LEAD_SCORE_THRESHOLD") || "50"
    ),
    metaAdsFirstMessageNoSync: Deno.env.get("META_ADS_FIRST_MESSAGE_NO_SYNC") !== "false",
    metaAdsRequireQualification: Deno.env.get("META_ADS_REQUIRE_QUALIFICATION") !== "false",
  };
}

function parseGhlLiveAllowedPhones(raw) {
  if (!raw || !String(raw).trim()) return [];
  return String(raw)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function resolveGhlLiveAllowlist(config, normalizedPhone) {
  const allowedPhones = config.ghlLiveAllowedPhones || [];
  const count = allowedPhones.length;

  if (config.ghlSyncMode !== "live") {
    return {
      applies: false,
      allowlist_enabled: false,
      allowlist_matched: null,
      block_reason: null,
      allowed: true,
      allowed_phones_count: count,
    };
  }

  const phone = normalizedPhone ? String(normalizedPhone).trim() : "";

  if (count === 0) {
    return {
      applies: true,
      allowlist_enabled: true,
      allowlist_matched: false,
      block_reason: "blocked_allowlist_missing",
      allowed: false,
      allowed_phones_count: 0,
    };
  }

  if (!phone) {
    return {
      applies: true,
      allowlist_enabled: true,
      allowlist_matched: false,
      block_reason: "blocked_allowlist_no_phone",
      allowed: false,
      allowed_phones_count: count,
    };
  }

  const matched = allowedPhones.includes(phone);
  return {
    applies: true,
    allowlist_enabled: true,
    allowlist_matched: matched,
    block_reason: matched ? null : "blocked_allowlist_phone",
    allowed: matched,
    allowed_phones_count: count,
  };
}

function buildGhlAllowlistPayloadMeta(allowlist) {
  return {
    allowlist_enabled: allowlist.allowlist_enabled,
    allowlist_matched: allowlist.allowlist_matched,
    block_reason: allowlist.block_reason,
    allowed_phones_count: allowlist.allowed_phones_count,
  };
}

async function insertGhlAllowlistBlockedLog(client, baseLog, allowlist) {
  return insertGHLSyncLog(client, {
    ...baseLog,
    action: "blocked_allowlist",
    status: allowlist.block_reason,
    error_message: null,
    payload: buildGhlAllowlistPayloadMeta(allowlist),
    would_create_contact: false,
    would_update_contact: false,
    would_create_task: false,
  });
}

let _ghlSyncPolicyModule = null;

async function loadGhlSyncPolicyModule() {
  if (!_ghlSyncPolicyModule) {
    _ghlSyncPolicyModule = await import("./lib/ghl-sync-policy.js");
  }
  return _ghlSyncPolicyModule;
}

async function resolveGhlSyncAuthorizationForHandler(config, relevanceDecision, allowlist) {
  const mod = await loadGhlSyncPolicyModule();
  return mod.resolveGhlSyncAuthorization({ config, relevanceDecision, allowlist });
}

async function enrichGhlSyncContextForHandler(baseContext, relevanceDecision, authDecision) {
  const mod = await loadGhlSyncPolicyModule();
  return mod.enrichGhlSyncContext(baseContext, relevanceDecision, authDecision);
}

async function insertGhlPolicyBlockedResult(client, config, context, relevanceDecision, authDecision) {
  const logId = await insertGHLSyncLog(client, {
    inbound_message_id: context.inboundId || null,
    normalized_phone: context.normalizedPhone || null,
    intent: context.intent || null,
    sync_mode: config.ghlSyncMode === "live" ? "live" : "dry_run",
    protected_fields: { phase_7g7c: "policy_gate_block" },
    action: "policy_blocked",
    status: authDecision.blockReason || "policy_blocked",
    payload: {
      policy: authDecision.policy,
      block_reason: authDecision.blockReason,
      routing_reason: relevanceDecision?.routing_reason || null,
      lead_score: relevanceDecision?.lead_score ?? null,
      ignored_for_ghl: relevanceDecision?.ignored_for_ghl === true,
      would_sync_to_ghl: relevanceDecision?.would_sync_to_ghl === true,
      qualified_for_ghl: relevanceDecision?.qualified_for_ghl === true,
      human_handoff_reason: relevanceDecision?.human_handoff_reason || null,
    },
    would_create_contact: false,
    would_update_contact: false,
    would_create_task: false,
    would_add_note: false,
    would_add_tags: null,
  });
  return {
    synced: false,
    dry_run: config.ghlSyncMode !== "live",
    live: config.ghlSyncMode === "live",
    failed: false,
    blocked: true,
    policy_blocked: true,
    block_reason: authDecision.blockReason,
    ghl_sync_log_id: logId,
    would_create_contact: false,
    would_create_task: false,
    would_add_note: false,
  };
}

function buildYCloudTextPayload(from, to, text) {
  return {
    from,
    to,
    type: "text",
    text: { body: text, preview_url: false },
  };
}

async function sendYCloudMessage({ config, to, text }) {
  const from = config.businessNumber;
  const payload = buildYCloudTextPayload(from, to, text);

  if (config.mode !== "live_outbound") {
    return {
      sent: false,
      outbound_real: false,
      mode: config.mode,
      reason: "outbound_disabled",
      dry_run: true,
      endpoint: `${config.ycloudApiBaseUrl}/whatsapp/messages`,
      request: payload,
    };
  }

  if (!config.ycloudApiKey) {
    return {
      sent: false,
      outbound_real: false,
      failed: true,
      mode: config.mode,
      error_message: "YCLOUD_API_KEY is required for live_outbound mode",
    };
  }
  if (!from) {
    return {
      sent: false,
      outbound_real: false,
      failed: true,
      mode: config.mode,
      error_message: "YCLOUD_BUSINESS_NUMBER is required for live_outbound mode",
    };
  }
  if (!to || !text) {
    return {
      sent: false,
      outbound_real: false,
      failed: true,
      mode: config.mode,
      error_message: "to and text are required to send YCloud message",
    };
  }

  const endpoint = `${config.ycloudApiBaseUrl}/whatsapp/messages`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.ycloudApiKey,
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      sent: false,
      outbound_real: true,
      failed: true,
      mode: config.mode,
      provider: "ycloud",
      endpoint,
      http_status: response.status,
      error_message: `YCloud outbound failed (${response.status})`,
      raw_response: sanitizeForStorage(responseBody),
    };
  }

  return {
    sent: true,
    outbound_real: true,
    failed: false,
    mode: config.mode,
    provider: "ycloud",
    endpoint,
    provider_response_id: responseBody?.id || null,
    wamid: responseBody?.wamid || null,
    wabaId: responseBody?.wabaId || null,
    status: responseBody?.status || "accepted",
    raw_response: sanitizeForStorage(responseBody),
  };
}

/** YCloud message id: responseBody.id → raw_response.id (fallback for webhook/DB). */
function resolveProviderResponseId(ycloudSend) {
  if (!ycloudSend) return null;
  if (ycloudSend.provider_response_id) return ycloudSend.provider_response_id;
  const raw = ycloudSend.raw_response;
  if (raw && typeof raw === "object") {
    if (raw.id) return raw.id;
    if (raw.response?.id) return raw.response.id;
  }
  return null;
}

function sanitizeForStorage(value) {
  if (value == null) return value;
  try {
    const text = JSON.stringify(value);
    const redacted = text
      .replace(/"X-API-Key"\s*:\s*"[^"]*"/gi, '"X-API-Key":"[REDACTED]"')
      .replace(/"apiKey"\s*:\s*"[^"]*"/gi, '"apiKey":"[REDACTED]"');
    return JSON.parse(redacted);
  } catch (_err) {
    return { note: "unserializable_response" };
  }
}

function resolveOutboundStatus(ycloudSend) {
  if (ycloudSend.sent) {
    const ycStatus = String(ycloudSend.status || "accepted").toLowerCase();
    if (["accepted", "sent", "delivered", "read"].includes(ycStatus)) {
      return ycStatus;
    }
    return "sent";
  }
  if (ycloudSend.failed && ycloudSend.mode === "live_outbound") {
    return "failed";
  }
  return "mocked";
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: DEFAULT_HEADERS,
  });
}

function webhookResponse(body, httpStatus = 200) {
  return jsonResponse(httpStatus, body);
}

function cleanText(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizePhoneMX(input) {
  const original = String(input || "");
  const digits = original.replace(/\D/g, "");

  if (/^\d{10}$/.test(digits)) {
    return `+52${digits}`;
  }
  if (/^52\d{10}$/.test(digits)) {
    return `+${digits}`;
  }
  if (/^521\d{10}$/.test(digits)) {
    return `+52${digits.slice(-10)}`;
  }

  return null;
}

function extractMessageText(message, body) {
  if (message?.text?.body) return message.text.body;
  if (typeof message?.text === "string") return message.text;
  if (typeof message?.body === "string") return message.body;
  if (message?.body?.text) return message.body.text;
  if (typeof body?.message_text === "string") return body.message_text;
  if (typeof body?.text === "string") return body.text;
  if (body?.text?.body) return body.text.body;
  return null;
}

function normalizePayloadTrafficSource(raw) {
  const s = String(raw || "")
    .toLowerCase()
    .trim();
  if (!s) return null;
  if (s === "meta_ads" || s === "meta" || s === "meta-ads" || s === "facebook" || s === "instagram") {
    return "meta_ads";
  }
  return s;
}

function extractPayloadTrafficSource(body = {}) {
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
    const normalized = normalizePayloadTrafficSource(c);
    if (normalized) return normalized;
  }
  if (body.referral?.ad_id || body.referral?.campaign_id) return "meta_ads";
  return null;
}

function extractPayloadFirstMessageFlag(body = {}) {
  if (body.first_message === true || body.firstMessage === true) return true;
  if (body.first_message === false || body.firstMessage === false) return false;
  return null;
}

function parseInboundPayload(payload) {
  const body = payload || {};
  const inbound =
    body.whatsappInboundMessage ||
    body.whatsapp?.inboundMessage ||
    body.data?.whatsappInboundMessage ||
    null;
  const message =
    inbound ||
    body.message ||
    body.whatsapp?.message ||
    body.data?.message ||
    body.whatsappMessage ||
    {};

  const messageText = extractMessageText(message, body);
  const messageType =
    message.type ||
    body.message_type ||
    message.message_type ||
    (messageText ? "text" : "unknown");

  return {
    event_type:
      body.type ||
      body.event ||
      body.event_type ||
      body.eventType ||
      "unknown",
    event_id: body.id || body.event_id || null,
    from:
      message.from ||
      inbound?.from ||
      body.from ||
      body.sender?.phone ||
      body.sender?.phoneNumber ||
      "",
    to:
      message.to ||
      inbound?.to ||
      body.to ||
      body.recipient?.phone ||
      body.recipient?.phoneNumber ||
      "",
    message_id:
      message.id ||
      inbound?.id ||
      body.message_id ||
      body.messageId ||
      body.id ||
      "",
    message_type: messageType,
    message_text: messageText,
    timestamp:
      message.createTime ||
      inbound?.createTime ||
      body.createTime ||
      body.timestamp ||
      body.ts ||
      new Date().toISOString(),
    provider: body.type || body.whatsappInboundMessage ? "ycloud" : "mock",
    source: extractPayloadTrafficSource(body),
    first_message: extractPayloadFirstMessageFlag(body),
    referral_ad_id: body.referral?.ad_id || null,
    referral_campaign_id: body.referral?.campaign_id || null,
  };
}

function isInboundEvent(payload, parsed) {
  const eventType = cleanText(parsed.event_type);

  if (payload?.whatsappInboundMessage) return true;
  if (eventType.includes("inbound")) return true;
  if (eventType === "whatsapp.inbound_message.received") return true;

  if (NON_INBOUND_EVENT_TYPES.has(parsed.event_type)) return false;
  if (eventType.includes("message.updated") || eventType.includes(".updated")) {
    return false;
  }

  if (!payload?.type && !payload?.event && parsed.from) {
    return true;
  }

  if (payload?.type && !eventType.includes("inbound")) return false;

  return !!parsed.from;
}

function isOwnBusinessMessage(from, businessNumber) {
  if (!businessNumber) return false;
  const normalizedBusiness = normalizePhoneMX(businessNumber);
  const normalizedFrom = normalizePhoneMX(from);
  return Boolean(
    normalizedBusiness && normalizedFrom && normalizedBusiness === normalizedFrom
  );
}

function parseSignatureHeader(signatureHeader) {
  const result = {};
  for (const part of String(signatureHeader || "").split(",")) {
    const [key, value] = part.split("=");
    if (key && value) {
      result[key.trim()] = value.trim();
    }
  }
  return result;
}

async function verifyYCloudSignature(rawBody, signatureHeader, secret) {
  const parsed = parseSignatureHeader(signatureHeader);
  const timestamp = parsed.t;
  const receivedSignature = parsed.s;

  if (!timestamp || !receivedSignature || !secret) {
    return { valid: false, reason: "missing_signature_parts" };
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload)
  );
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const valid = expectedSignature === receivedSignature;
  return {
    valid,
    reason: valid ? "ok" : "signature_mismatch",
    timestamp,
  };
}

const GHL_PROTECTED_FIELDS = [
  "carrera_recomendada",
  "match_percent",
  "sector_principal",
  "dictamen_url",
  "test_completed_at",
  "test_version",
  "beca_elegible",
  "lead_score",
  "lead_class",
  "promedio",
  "email",
  "firstName",
  "lastName",
];

const GHL_WA_FIELD_KEYS = [
  "wa_last_intent",
  "wa_last_message_at",
  "wa_stage",
  "wa_needs_human",
  "wa_summary",
  "wa_source",
  "wa_last_inbound_text",
  "wa_last_outbound_text",
];

const GHL_WA_FIELD_MAP_FORBIDDEN = {
  ids: ["yBz675YEp1pdvwnvloXP"],
  keys: ["wa_test_checkbox_a"],
};

function maskGhlFieldIdPreview(id) {
  const s = String(id || "").trim();
  if (!s) return "";
  if (s.length <= 8) return "****";
  return `${s.slice(0, 4)}...${s.slice(-4)}`;
}

function parseGHLWAFieldMap(raw) {
  const result = {
    valid: false,
    map: null,
    errors: [],
    diagnostics: [],
    configLoaded: Boolean(raw && String(raw).trim()),
  };

  if (!result.configLoaded) {
    result.errors.push("GHL_WA_FIELD_MAP missing or empty");
    return result;
  }

  let parsed;
  try {
    parsed = JSON.parse(String(raw).trim());
  } catch (err) {
    result.errors.push(
      `invalid_json: ${err instanceof Error ? err.message : String(err)}`
    );
    return result;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    result.errors.push("map_must_be_object");
    return result;
  }

  const keys = Object.keys(parsed);
  const missing = GHL_WA_FIELD_KEYS.filter((k) => !(k in parsed));
  const extra = keys.filter((k) => !GHL_WA_FIELD_KEYS.includes(k));

  if (missing.length) {
    result.errors.push(`missing_keys: ${missing.join(",")}`);
  }
  if (extra.length) {
    result.errors.push(`extra_keys: ${extra.join(",")}`);
  }

  for (const key of GHL_WA_FIELD_KEYS) {
    const val = parsed[key];
    const idPresent = typeof val === "string" && val.trim().length > 0;
    result.diagnostics.push({
      key,
      id_present: idPresent,
      id_preview: idPresent ? maskGhlFieldIdPreview(val.trim()) : "",
    });
    if (!idPresent) {
      result.errors.push(`empty_id: ${key}`);
    }
  }

  for (const forbiddenId of GHL_WA_FIELD_MAP_FORBIDDEN.ids) {
    if (Object.values(parsed).some((v) => String(v).trim() === forbiddenId)) {
      result.errors.push(`forbidden_id: ${forbiddenId}`);
    }
  }
  for (const forbiddenKey of GHL_WA_FIELD_MAP_FORBIDDEN.keys) {
    if (forbiddenKey in parsed) {
      result.errors.push(`forbidden_key: ${forbiddenKey}`);
    }
  }

  result.valid = result.errors.length === 0;
  if (result.valid) {
    result.map = {};
    for (const key of GHL_WA_FIELD_KEYS) {
      result.map[key] = String(parsed[key]).trim();
    }
  }

  return result;
}

function buildWACustomFieldValues(context) {
  return {
    wa_last_intent: context.intent || "",
    wa_last_message_at: context.timestamp || "",
    wa_stage: context.waStage || context.intent || "",
    wa_needs_human: context.needsHuman ? "true" : "false",
    wa_summary: context.waSummary || "",
    wa_source: "YCloud / Eva WA",
    wa_last_inbound_text: context.messageText || "",
    wa_last_outbound_text: context.responseText || "",
  };
}

function toGHLCustomFieldsArray(fieldMap, values) {
  if (!fieldMap) return [];
  return GHL_WA_FIELD_KEYS.map((key) => ({
    id: fieldMap[key],
    value: values[key] ?? "",
  }));
}

function buildCustomFieldsApiShapePreview(fieldMap, values) {
  return GHL_WA_FIELD_KEYS.map((key) => ({
    key,
    id_present: Boolean(fieldMap?.[key]),
    id_preview: fieldMap?.[key] ? maskGhlFieldIdPreview(fieldMap[key]) : "",
    value: values[key] ?? "",
  }));
}

function resolveCustomFieldsWriteDecision(config, customFieldsState, contactId, customFieldsArray) {
  const customFieldsEnabled =
    config.ghlSyncMode === "live" &&
    config.ghlWriteCustomFields === true &&
    customFieldsState.custom_fields_map_valid === true;

  if (config.ghlSyncMode !== "live") {
    return {
      shouldWrite: false,
      skippedReason: "ghl_sync_mode_not_live",
      custom_fields_enabled: false,
    };
  }
  if (config.ghlWriteCustomFields !== true) {
    return {
      shouldWrite: false,
      skippedReason: "ghl_write_custom_fields_disabled",
      custom_fields_enabled: false,
    };
  }
  if (!customFieldsState.custom_fields_map_valid) {
    return {
      shouldWrite: false,
      skippedReason: "custom_fields_map_invalid",
      custom_fields_enabled: false,
    };
  }
  if (!contactId) {
    return {
      shouldWrite: false,
      skippedReason: "no_ghl_contact_id",
      custom_fields_enabled: true,
    };
  }
  if (!customFieldsArray || customFieldsArray.length !== GHL_WA_FIELD_KEYS.length) {
    return {
      shouldWrite: false,
      skippedReason: "custom_fields_array_incomplete",
      custom_fields_enabled: true,
    };
  }
  return {
    shouldWrite: true,
    skippedReason: null,
    custom_fields_enabled: true,
  };
}

function sanitizeGHLCustomFieldsResponse(body) {
  const sanitized = sanitizeGHLForStorage(body);
  if (!sanitized || typeof sanitized !== "object") return sanitized;

  const out = { ...sanitized };
  if (out.contact && typeof out.contact === "object") {
    out.contact = { ...out.contact };
    if (out.contact.id) {
      out.contact.id = maskGhlFieldIdPreview(out.contact.id);
    }
    if (Array.isArray(out.contact.customFields)) {
      out.contact.customFields = out.contact.customFields.map((cf) => ({
        id_preview: cf?.id ? maskGhlFieldIdPreview(cf.id) : "",
        value_length: String(cf?.value ?? "").length,
      }));
    }
  }
  if (out.id) {
    out.id = maskGhlFieldIdPreview(out.id);
  }
  return out;
}

function resolveGHLCustomFieldsConfig(config) {
  const parsed = parseGHLWAFieldMap(config.ghlWaFieldMapRaw);
  const writeEnabled = config.ghlWriteCustomFields === true;
  const mapValid = parsed.valid;
  const fieldMap = parsed.map;

  return {
    custom_fields_config_loaded: parsed.configLoaded,
    custom_fields_map_valid: mapValid,
    custom_fields_enabled: writeEnabled && mapValid,
    custom_fields_count: mapValid ? GHL_WA_FIELD_KEYS.length : 0,
    custom_fields_would_write: writeEnabled && mapValid,
    custom_fields_map_errors: parsed.errors,
    custom_fields_map_diagnostics: parsed.diagnostics,
    fieldMap,
    writeEnabled,
    ghlApiShape: mapValid
      ? buildCustomFieldsApiShapePreview(fieldMap, {})
      : parsed.diagnostics,
  };
}

const INTENT_TAG_MAP = {
  ambiguo: "wa_interes_info",
  no_se_que_estudiar: "wa_interes_test",
  carrera_interes: "wa_interes_carrera",
  carreras_disponibles: "wa_interes_carreras",
  beca: "wa_interes_beca",
  humano: "wa_requiere_asesor",
  duda_test: "wa_duda_test",
  post_test: "wa_post_test",
  sin_texto: "wa_sin_texto",
  agradecimiento: "wa_interes_info",
  despedida: "wa_interes_info",
};

const EVA_MENU_OPTION_GROUPS = [
  {
    intent: "carreras_disponibles",
    values: [
      "1",
      "carreras",
      "carreras disponibles",
      "licenciaturas",
      "licenciaturas disponibles",
    ],
  },
  {
    intent: "beca",
    values: ["2", "beca", "becas"],
  },
  {
    intent: "no_se_que_estudiar",
    values: ["3", "test", "hacer test", "test vocacional", "hacer el test vocacional"],
  },
  {
    intent: "humano",
    values: ["4", "asesor", "hablar con asesor", "hablar con un asesor", "humano"],
  },
];

function getIntentTag(intent) {
  return INTENT_TAG_MAP[intent] || "wa_interes_info";
}

function getTaskTitle(intent) {
  return EVA_INTENT_TASK_TITLES[intent] || null;
}

function enrichDecisionWithOperational(decision) {
  const op = EVA_INTENT_OPERATIONAL[decision.intent] || EVA_INTENT_OPERATIONAL.ambiguo;
  const taskTitle = decision.createTask ? getTaskTitle(decision.intent) : null;
  return {
    ...decision,
    ...EVA_OPERATIONAL_DEFAULTS,
    priority: op.priority,
    escalation_required: op.escalation_required,
    task_priority_label: op.task_priority_label,
    task_title: taskTitle,
    menu_option_detected: decision.menu_option_detected === true,
    menu_option_value: decision.menu_option_value || null,
  };
}

function buildOperationalWaSummary(decision, messageText) {
  const snippet = String(messageText || "").slice(0, 80) || "(sin texto)";
  const escalation = decision.escalation_required ? "escalación sí" : "escalación no";
  return `Intent: ${decision.intent} | Prioridad: ${decision.priority} | ${escalation} | ${snippet}`;
}

function shouldCreateTaskDryRun(context) {
  if (context.ghlSyncGovernedByGate === true) {
    return context.ghlWouldCreateTask === true;
  }
  return EVA_TASK_INTENTS.has(context.intent);
}

function buildGHLTaskDescription(context) {
  return [
    `Teléfono: ${context.normalizedPhone || "N/A"}`,
    `Intent: ${context.intent}`,
    `Prioridad: ${context.task_priority_label || context.priority || "N/A"}`,
    `Mensaje recibido: ${context.messageText || "(sin texto)"}`,
    `Respuesta generada por Eva: ${context.responseText || ""}`,
    `wa_stage: ${context.waStage || "N/A"}`,
    `wa_needs_human: ${context.needsHuman ? "true" : "false"}`,
    "Fuente: YCloud / Eva WA",
    `Fecha/hora ISO: ${context.timestamp}`,
    "Nota: Atender desde GHL / WhatsApp operativo según protocolo de admisiones.",
  ].join("\n");
}

function buildGHLNoteBody(context, modeLabel) {
  const lines = [
    modeLabel,
    "",
  ];
  if (context.ghlSyncGovernedByGate === true) {
    lines.push(
      "[Eva WA — qualified_only]",
      `Lead score: ${context.ghlLeadScore ?? "—"}`,
      `Routing: ${context.ghlRoutingReason || "—"}`,
      `Handoff: ${context.ghlHumanHandoffReason || "—"}`,
      `Policy: ${context.ghlSyncPolicy || "qualified_only"}`,
      ""
    );
  }
  lines.push(
    `Teléfono: ${context.normalizedPhone || "N/A"}`,
    `Intent: ${context.intent}`,
    `Prioridad: ${context.priority}`,
    `Escalamiento requerido: ${context.escalation_required ? "sí" : "no"}`,
    `Responsable: ${context.operational_owner}`,
    `Horario atención: ${context.business_hours_label}`,
    `Mensaje recibido: ${context.messageText || "(sin texto)"}`,
    `Respuesta Eva: ${context.responseText || ""}`,
    `wa_stage: ${context.waStage || "N/A"}`,
    `wa_needs_human: ${context.needsHuman ? "true" : "false"}`,
    `Resumen: ${context.waSummary || "N/A"}`,
    `Fecha/hora: ${context.timestamp}`,
    "Fuente: YCloud / Eva WA"
  );
  if (context.after_hours_message) {
    lines.push(`Mensaje fuera de horario (referencia): ${context.after_hours_message}`);
  }
  return lines.join("\n");
}

function buildGHLDryRunPayload(context, existingGhlContactId, customFieldsState) {
  const tag = getIntentTag(context.intent);
  const tags = ["eva-wa", tag];
  const governed = context.ghlSyncGovernedByGate === true;
  const wouldCreateContact = governed
    ? context.ghlWouldCreateContact === true && !existingGhlContactId
    : !existingGhlContactId;
  const wouldUpdateContact = governed
    ? context.ghlWouldCreateContact === true && Boolean(existingGhlContactId)
    : Boolean(existingGhlContactId);
  const includeNote = governed ? context.ghlWouldCreateNote === true : true;
  const note = includeNote
    ? buildGHLNoteBody(context, `[Eva WA dry-run] ${context.timestamp}`)
    : null;

  const waValues = buildWACustomFieldValues(context);
  const customFields = { ...waValues };
  const ghlCustomFieldsArray = customFieldsState?.fieldMap
    ? toGHLCustomFieldsArray(customFieldsState.fieldMap, waValues)
    : [];
  const apiShapePreview = buildCustomFieldsApiShapePreview(
    customFieldsState?.fieldMap,
    waValues
  );

  const wouldCreateContactFinal = governed
    ? context.ghlWouldCreateContact === true && !existingGhlContactId
    : wouldCreateContact;
  const wouldUpdateContactFinal = governed
    ? context.ghlWouldCreateContact === true && Boolean(existingGhlContactId)
    : wouldUpdateContact;

  const contactPayload = wouldCreateContact
    ? {
        phone: context.normalizedPhone,
        source: "YCloud / Eva WA",
        tags,
        customFields,
      }
    : wouldUpdateContactFinal
      ? {
          id: existingGhlContactId,
          phone: context.normalizedPhone,
          tags_to_add: tags,
          customFields,
        }
      : null;

  const taskPayload = shouldCreateTaskDryRun(context)
    ? {
        title: context.task_title || getTaskTitle(context.intent),
        body: buildGHLTaskDescription(context),
        dueDate: context.timestamp,
        priority: context.priority,
        task_priority_label: context.task_priority_label,
      }
    : null;

  const operational = {
    priority: context.priority,
    escalation_required: context.escalation_required,
    operational_owner: context.operational_owner,
    business_hours_label: context.business_hours_label,
    after_hours_message: context.after_hours_message,
    after_hours_logic_enabled: context.after_hours_logic_enabled,
    task_title: context.task_title,
    task_priority_label: context.task_priority_label,
  };

  return {
    action: wouldCreateContact
      ? "would_create_contact"
      : wouldUpdateContactFinal
        ? "would_update_contact"
        : "policy_no_contact",
    contact: contactPayload,
    note,
    task: taskPayload,
    tags,
    customFields,
    ghl_custom_fields_array: ghlCustomFieldsArray,
    operational,
    task_title: context.task_title,
    priority: context.priority,
    escalation_required: context.escalation_required,
    operational_owner: context.operational_owner,
    business_hours_label: context.business_hours_label,
    after_hours_message: context.after_hours_message,
    after_hours_logic_enabled: context.after_hours_logic_enabled,
    task_priority_label: context.task_priority_label,
    custom_fields_config_loaded: customFieldsState?.custom_fields_config_loaded === true,
    custom_fields_map_valid: customFieldsState?.custom_fields_map_valid === true,
    custom_fields_enabled: customFieldsState?.custom_fields_enabled === true,
    custom_fields_count: customFieldsState?.custom_fields_count || 0,
    custom_fields_would_write: customFieldsState?.custom_fields_would_write === true,
    custom_fields_ghl_api_shape_preview: apiShapePreview,
    protected_fields: {
      never_overwrite: GHL_PROTECTED_FIELDS,
      wa_fields_only: GHL_WA_FIELD_KEYS,
      phase_3c_3b: "read_only_no_put_custom_fields",
      phase_3c_4: "write_gated_not_executed",
      phase_4b: "operational_protocol_dry_run",
    },
    would_create_contact: wouldCreateContactFinal,
    would_update_contact: wouldUpdateContactFinal,
    would_create_task: Boolean(taskPayload),
    would_add_tags: tags,
    would_add_note: note,
  };
}

async function syncGHLContactDryRun(client, config, context) {
  const customFieldsState = resolveGHLCustomFieldsConfig(config);

  if (customFieldsState.custom_fields_config_loaded && !customFieldsState.custom_fields_map_valid) {
    await logWarning(client, {
      normalized_phone: context.normalizedPhone || null,
      error_type: "ghl_wa_field_map_invalid",
      error_message: customFieldsState.custom_fields_map_errors.join("; "),
      raw_context: {
        inbound_id: context.inboundId || null,
        diagnostics: customFieldsState.custom_fields_map_diagnostics,
      },
    });
  } else if (!customFieldsState.custom_fields_config_loaded) {
    await logWarning(client, {
      normalized_phone: context.normalizedPhone || null,
      error_type: "ghl_wa_field_map_missing",
      error_message: "GHL_WA_FIELD_MAP secret missing or empty",
      raw_context: { inbound_id: context.inboundId || null },
    });
  }

  const { data: existingContact } = await client.database
    .from("wa_contacts_state")
    .select("ghl_contact_id")
    .eq("normalized_phone", context.normalizedPhone)
    .maybeSingle();

  const dryRun = buildGHLDryRunPayload(
    context,
    existingContact?.ghl_contact_id || null,
    customFieldsState
  );

  const waValues = buildWACustomFieldValues(context);
  const customFieldsArray = customFieldsState.fieldMap
    ? toGHLCustomFieldsArray(customFieldsState.fieldMap, waValues)
    : [];
  const writeDecision = resolveCustomFieldsWriteDecision(
    config,
    customFieldsState,
    existingContact?.ghl_contact_id || null,
    customFieldsArray
  );
  const allowlist = resolveGhlLiveAllowlist(config, context.normalizedPhone);

  const { data: rows, error } = await client.database
    .from("wa_ghl_sync_log")
    .insert({
      inbound_message_id: context.inboundId || null,
      normalized_phone: context.normalizedPhone || null,
      intent: context.intent || null,
      sync_mode: "dry_run",
      action: dryRun.action,
      payload: {
        contact: dryRun.contact,
        note: dryRun.note,
        task: dryRun.task,
        tags: dryRun.tags,
        customFields: dryRun.customFields,
        custom_fields_config_loaded: dryRun.custom_fields_config_loaded,
        custom_fields_map_valid: dryRun.custom_fields_map_valid,
        custom_fields_enabled: dryRun.custom_fields_enabled,
        custom_fields_count: dryRun.custom_fields_count,
        custom_fields_would_write: dryRun.custom_fields_would_write,
        custom_fields_written: false,
        custom_fields_skipped_reason: writeDecision.skippedReason,
        custom_fields_ghl_api_shape_preview: dryRun.custom_fields_ghl_api_shape_preview,
        operational: dryRun.operational,
        task_title: dryRun.task_title,
        ...buildGhlAllowlistPayloadMeta(allowlist),
      },
      protected_fields: {
        ...dryRun.protected_fields,
        phase_3c_4: "write_gated_not_executed",
        phase_4b: "operational_protocol_dry_run",
      },
      would_create_contact: dryRun.would_create_contact,
      would_update_contact: dryRun.would_update_contact,
      would_create_task: dryRun.would_create_task,
      would_add_tags: dryRun.would_add_tags,
      would_add_note: dryRun.would_add_note,
      status: "dry_run",
    })
    .select("id")
    .limit(1);

  if (error) {
    throw new Error(`Insert wa_ghl_sync_log failed: ${error.message || String(error)}`);
  }

  return {
    synced: false,
    dry_run: true,
    ghl_sync_log_id: rows?.[0]?.id || null,
    custom_fields_written: false,
    custom_fields_skipped_reason: writeDecision.skippedReason,
    ...buildGhlAllowlistPayloadMeta(allowlist),
    ...dryRun,
  };
}

const GHL_API_VERSION = "2021-07-28";

function sanitizeGHLForStorage(value) {
  if (value == null) return value;
  try {
    const text = JSON.stringify(value);
    const redacted = text
      .replace(/"Authorization"\s*:\s*"[^"]*"/gi, '"Authorization":"[REDACTED]"')
      .replace(/"Bearer\s[^"]*"/gi, '"Bearer [REDACTED]"')
      .replace(/"apiKey"\s*:\s*"[^"]*"/gi, '"apiKey":"[REDACTED]"');
    return JSON.parse(redacted);
  } catch (_err) {
    return { note: "unserializable_ghl_response" };
  }
}

function ghlHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    Version: GHL_API_VERSION,
    "Content-Type": "application/json",
  };
}

async function ghlFetch(config, path, options = {}) {
  const url = `${config.ghlApiBaseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: { ...ghlHeaders(config.ghlApiKey), ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, body, url };
}

async function searchGHLContactByPhone(config, phone) {
  const result = await ghlFetch(config, "/contacts/search", {
    method: "POST",
    body: JSON.stringify({
      locationId: config.ghlLocationId,
      pageLimit: 5,
      query: phone,
    }),
  });
  if (!result.ok) {
    throw new Error(
      `GHL search failed (${result.status}): ${result.body?.message || "unknown"}`
    );
  }
  const contacts = result.body?.contacts || [];
  return { contacts, raw: result.body };
}

async function createGHLContactMinimal(config, phone) {
  const result = await ghlFetch(config, "/contacts/", {
    method: "POST",
    body: JSON.stringify({
      locationId: config.ghlLocationId,
      phone,
      source: "Eva WA / YCloud",
    }),
  });
  if (!result.ok) {
    throw new Error(
      `GHL create contact failed (${result.status}): ${result.body?.message || "unknown"}`
    );
  }
  const contactId = result.body?.contact?.id || result.body?.id || null;
  if (!contactId) {
    throw new Error("GHL create contact returned no contact id");
  }
  return { contactId, raw: result.body };
}

async function addGHLTags(config, contactId, tags) {
  const result = await ghlFetch(config, `/contacts/${contactId}/tags`, {
    method: "POST",
    body: JSON.stringify({ tags }),
  });
  if (!result.ok) {
    throw new Error(
      `GHL add tags failed (${result.status}): ${result.body?.message || "unknown"}`
    );
  }
  return sanitizeGHLForStorage(result.body);
}

async function createGHLNote(config, contactId, body) {
  const result = await ghlFetch(config, `/contacts/${contactId}/notes`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  if (!result.ok) {
    throw new Error(
      `GHL create note failed (${result.status}): ${result.body?.message || "unknown"}`
    );
  }
  return sanitizeGHLForStorage(result.body);
}

async function createGHLTask(config, contactId, task) {
  const result = await ghlFetch(config, `/contacts/${contactId}/tasks`, {
    method: "POST",
    body: JSON.stringify({
      title: task.title,
      body: task.body,
      dueDate: task.dueDate,
      completed: false,
    }),
  });
  if (!result.ok) {
    throw new Error(
      `GHL create task failed (${result.status}): ${result.body?.message || "unknown"}`
    );
  }
  return sanitizeGHLForStorage(result.body);
}

async function updateGHLContactCustomFields(config, contactId, customFieldsArray) {
  const result = await ghlFetch(config, `/contacts/${contactId}`, {
    method: "PUT",
    body: JSON.stringify({ customFields: customFieldsArray }),
  });
  if (!result.ok) {
    throw new Error(
      `GHL update custom fields failed (${result.status}): ${result.body?.message || "unknown"}`
    );
  }
  return {
    ok: true,
    status: result.status,
    body: result.body,
    traceId: result.body?.traceId || result.body?.meta?.traceId || null,
  };
}

function shouldCreateTaskLive(contextOrIntent) {
  if (contextOrIntent && typeof contextOrIntent === "object") {
    if (contextOrIntent.ghlSyncGovernedByGate === true) {
      return contextOrIntent.ghlWouldCreateTask === true;
    }
    return EVA_TASK_INTENTS.has(contextOrIntent.intent);
  }
  return EVA_TASK_INTENTS.has(contextOrIntent);
}

function buildGHLLiveNote(context, waMode) {
  const note = buildGHLNoteBody(context, "Eva WA — interacción WhatsApp");
  return `${note}\nModo WhatsApp: ${waMode}`;
}

function buildGHLLiveTaskDescription(context) {
  return buildGHLTaskDescription(context);
}

async function insertGHLSyncLog(client, entry) {
  const { data: rows, error } = await client.database
    .from("wa_ghl_sync_log")
    .insert(entry)
    .select("id")
    .limit(1);
  if (error) {
    throw new Error(`Insert wa_ghl_sync_log failed: ${error.message || String(error)}`);
  }
  return rows?.[0]?.id || null;
}

async function persistGhlContactId(client, normalizedPhone, ghlContactId) {
  const { data: existing } = await client.database
    .from("wa_contacts_state")
    .select("id")
    .eq("normalized_phone", normalizedPhone)
    .maybeSingle();
  if (existing?.id) {
    await client.database
      .from("wa_contacts_state")
      .update({ ghl_contact_id: ghlContactId, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  }
}

async function syncGHLContactLive(client, config, context) {
  const customFieldsState = resolveGHLCustomFieldsConfig(config);
  const waValues = buildWACustomFieldValues(context);
  const customFieldsArray = customFieldsState.fieldMap
    ? toGHLCustomFieldsArray(customFieldsState.fieldMap, waValues)
    : [];

  const protectedFields = {
    never_overwrite: GHL_PROTECTED_FIELDS,
    wa_fields_only: GHL_WA_FIELD_KEYS,
    phase_3b: "protected_fields_excluded_from_put_body",
    phase_3c_3b: "field_map_validated",
    phase_3c_4: "custom_fields_put_gated",
  };
  const tags = ["eva-wa", getIntentTag(context.intent)];
  const noteBody = buildGHLLiveNote(context, config.mode);
  const baseLog = {
    inbound_message_id: context.inboundId || null,
    normalized_phone: context.normalizedPhone || null,
    intent: context.intent || null,
    sync_mode: "live",
    protected_fields: protectedFields,
    would_add_tags: tags,
    would_add_note: noteBody,
    would_create_task: shouldCreateTaskLive(context),
  };

  const allowlist = resolveGhlLiveAllowlist(config, context.normalizedPhone);
  if (!allowlist.allowed) {
    const logId = await insertGhlAllowlistBlockedLog(client, baseLog, allowlist);
    return {
      synced: false,
      live: true,
      dry_run: false,
      failed: false,
      blocked: true,
      ghl_sync_log_id: logId,
      block_reason: allowlist.block_reason,
      ...buildGhlAllowlistPayloadMeta(allowlist),
      custom_fields_written: false,
      custom_fields_skipped_reason: "ghl_write_custom_fields_disabled",
    };
  }

  if (!config.ghlApiKey || !config.ghlLocationId) {
    const errorMessage = "GHL_API_KEY and GHL_LOCATION_ID required for live sync";
    const logId = await insertGHLSyncLog(client, {
      ...baseLog,
      action: "failed_precheck",
      status: "failed",
      error_message: errorMessage,
      payload: { precheck: "missing_secrets" },
      would_create_contact: false,
      would_update_contact: false,
      would_create_task: false,
    });
    return {
      synced: false,
      live: true,
      failed: true,
      ghl_sync_log_id: logId,
      error_message: errorMessage,
    };
  }

  try {
    const search = await searchGHLContactByPhone(config, context.normalizedPhone);
    const contacts = search.contacts;

    if (contacts.length > 1) {
      const errorMessage = `GHL duplicate contacts (${contacts.length}) for phone`;
      const logId = await insertGHLSyncLog(client, {
        ...baseLog,
        action: "skip_duplicate",
        status: "failed",
        error_message: errorMessage,
        payload: sanitizeGHLForStorage({
          search: search.raw,
          contact_ids: contacts.map((c) => c.id),
        }),
        would_create_contact: false,
        would_update_contact: false,
        would_create_task: false,
      });
      return {
        synced: false,
        live: true,
        failed: true,
        ghl_sync_log_id: logId,
        error_message: errorMessage,
        duplicate_contacts: contacts.length,
      };
    }

    let contactId = contacts[0]?.id || null;
    let action = "update_contact";
    let createRaw = null;

    if (!contactId) {
      const created = await createGHLContactMinimal(config, context.normalizedPhone);
      contactId = created.contactId;
      createRaw = created.raw;
      action = "create_contact";
    }

    const tagsRaw = await addGHLTags(config, contactId, tags);
    const noteRaw = await createGHLNote(config, contactId, noteBody);

    let taskRaw = null;
    if (shouldCreateTaskLive(context)) {
      taskRaw = await createGHLTask(config, contactId, {
        title: context.task_title || getTaskTitle(context.intent),
        body: buildGHLLiveTaskDescription(context),
        dueDate: context.timestamp,
      });
    }

    await persistGhlContactId(client, context.normalizedPhone, contactId);

    const writeDecision = resolveCustomFieldsWriteDecision(
      config,
      customFieldsState,
      contactId,
      customFieldsArray
    );

    let customFieldsWritten = false;
    let customFieldsSkippedReason = writeDecision.skippedReason;
    let customFieldsResponseSanitized = null;
    let customFieldsResponseId = null;

    if (writeDecision.shouldWrite) {
      try {
        const cfResult = await updateGHLContactCustomFields(
          config,
          contactId,
          customFieldsArray
        );
        customFieldsWritten = true;
        customFieldsSkippedReason = null;
        customFieldsResponseSanitized = sanitizeGHLCustomFieldsResponse(cfResult.body);
        customFieldsResponseId = cfResult.traceId || null;
        protectedFields.phase_3c_4 = "custom_fields_put_executed";
      } catch (cfErr) {
        const cfErrorMessage = cfErr instanceof Error ? cfErr.message : String(cfErr);
        customFieldsSkippedReason = "custom_fields_update_failed";
        customFieldsResponseSanitized = { error: cfErrorMessage };
        await logWarning(client, {
          normalized_phone: context.normalizedPhone || null,
          error_type: "ghl_custom_fields_update_failed",
          error_message: cfErrorMessage,
          raw_context: {
            inbound_id: context.inboundId || null,
            ghl_contact_id: maskGhlFieldIdPreview(contactId),
            custom_fields_count: customFieldsArray.length,
          },
        });
      }
    }

    const logId = await insertGHLSyncLog(client, {
      ...baseLog,
      protected_fields: protectedFields,
      action,
      status: "ok",
      payload: sanitizeGHLForStorage({
        ghl_contact_id: contactId,
        tags,
        note_preview: noteBody.slice(0, 200),
        create: createRaw,
        tags_response: tagsRaw,
        note_response: noteRaw,
        task_response: taskRaw,
        custom_fields_enabled: writeDecision.custom_fields_enabled,
        custom_fields_written: customFieldsWritten,
        custom_fields_count: customFieldsWritten ? GHL_WA_FIELD_KEYS.length : customFieldsArray.length,
        custom_fields_skipped_reason: customFieldsSkippedReason,
        custom_fields_response_sanitized: customFieldsResponseSanitized,
        custom_fields_response_id: customFieldsResponseId,
        custom_fields_ghl_api_shape_preview: buildCustomFieldsApiShapePreview(
          customFieldsState.fieldMap,
          waValues
        ),
        ...buildGhlAllowlistPayloadMeta(allowlist),
      }),
      would_create_contact: action === "create_contact",
      would_update_contact: action === "update_contact",
      would_create_task: Boolean(taskRaw),
    });

    return {
      synced: true,
      live: true,
      dry_run: false,
      failed: false,
      ghl_sync_log_id: logId,
      ghl_contact_id: contactId,
      action,
      tags,
      note_created: true,
      task_created: Boolean(taskRaw),
      would_create_task: Boolean(taskRaw),
      would_add_tags: tags,
      custom_fields_config_loaded: customFieldsState.custom_fields_config_loaded,
      custom_fields_map_valid: customFieldsState.custom_fields_map_valid,
      custom_fields_enabled: writeDecision.custom_fields_enabled,
      custom_fields_count: customFieldsWritten
        ? GHL_WA_FIELD_KEYS.length
        : customFieldsState.custom_fields_count,
      custom_fields_written: customFieldsWritten,
      custom_fields_skipped_reason: customFieldsSkippedReason,
      custom_fields_response_id: customFieldsResponseId,
      custom_fields_ghl_api_shape_preview: buildCustomFieldsApiShapePreview(
        customFieldsState.fieldMap,
        waValues
      ),
      ...buildGhlAllowlistPayloadMeta(allowlist),
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const logId = await insertGHLSyncLog(client, {
      ...baseLog,
      action: "failed",
      status: "failed",
      error_message: errorMessage,
      payload: { error: errorMessage },
      would_create_contact: false,
      would_update_contact: false,
      would_create_task: false,
    });
    return {
      synced: false,
      live: true,
      failed: true,
      ghl_sync_log_id: logId,
      error_message: errorMessage,
    };
  }
}

async function syncGHLContact(client, config, context) {
  if (config.ghlSyncMode === "live") {
    return syncGHLContactLive(client, config, context);
  }
  return syncGHLContactDryRun(client, config, context);
}

function buildIntentDecision(intent, config, contactContext = {}) {
  const testUrl = config.evaTestUrl;
  const preserveHuman = shouldPreserveHumanContext(contactContext);

  if (intent === "agradecimiento") {
    return enrichDecisionWithOperational({
      intent,
      responseText: preserveHuman ? EVA_AGRADECIMIENTO_POST_ESCALACION : EVA_AGRADECIMIENTO_GENERICO,
      waStage: preserveHuman ? contactContext.wa_stage || "asesor_requerido" : "cierre_positivo",
      needsHuman: preserveHuman,
      createTask: false,
    });
  }

  if (intent === "despedida") {
    return enrichDecisionWithOperational({
      intent,
      responseText: preserveHuman ? EVA_DESPEDIDA_POST_ESCALACION : EVA_DESPEDIDA_GENERICO,
      waStage: preserveHuman ? contactContext.wa_stage || "asesor_requerido" : "despedida",
      needsHuman: preserveHuman,
      createTask: false,
    });
  }

  const matrix = {
    sin_texto: {
      responseText: NO_TEXT_RESPONSE,
      waStage: "pendiente_texto",
      needsHuman: false,
      createTask: false,
    },
    duda_test: {
      responseText: `Gracias por avisarme. Voy a marcar tu caso para que puedan ayudarte con el test vocacional.\n\nMientras tanto, puedes intentar abrirlo nuevamente desde este enlace:\n${testUrl}`,
      waStage: "soporte_test",
      needsHuman: true,
      createTask: true,
    },
    post_test: {
      responseText:
        "¡Perfecto! 😊 Si ya realizaste el test vocacional, podemos ayudarte a revisar tu resultado y explicarte qué carrera puede ser mejor para ti.\n\nUn asesor académico puede continuar contigo por este WhatsApp.",
      waStage: "post_test",
      needsHuman: true,
      createTask: true,
    },
    humano: {
      responseText:
        "Claro 😊 Te voy a canalizar con un asesor académico para continuar tu proceso por WhatsApp.\n\nEn breve podrán darte seguimiento.",
      waStage: "asesor_requerido",
      needsHuman: true,
      createTask: true,
    },
    beca: {
      responseText:
        "Claro 😊 Universidad Latino cuenta con opciones de beca y apoyo según el perfil del alumno.\n\nPara orientarte mejor, un asesor puede revisar tu caso y explicarte las opciones disponibles. ¿Quieres que te contacten por este WhatsApp?",
      waStage: "beca_interes",
      needsHuman: true,
      createTask: true,
    },
    no_se_que_estudiar: {
      responseText: `No te preocupes, para eso tenemos nuestro test vocacional 😊\n\nTe ayuda a identificar qué carreras pueden ir mejor contigo según tus intereses y habilidades.\n\nPuedes hacerlo aquí:\n${testUrl}\n\nCuando termines, podrás compartir tu resultado para recibir orientación.`,
      waStage: "test_recomendado",
      needsHuman: false,
      createTask: false,
    },
    carrera_interes: {
      responseText:
        "¡Excelente! Te puedo orientar sobre esa carrera 😊\n\nPara darte información más precisa, ¿me compartes tu nombre y si estás buscando iniciar licenciatura próximamente?",
      waStage: "carrera_interes",
      needsHuman: false,
      createTask: false,
    },
    carreras_disponibles: {
      responseText:
        "En Universidad Latino contamos con diversas opciones de licenciatura 😊\n\nAlgunas áreas que puedes explorar son:\n- Derecho\n- Psicología\n- Administración\n- Contaduría\n- Mercadotecnia\n- Educación\n- Enfermería\n- Arquitectura\n- Sistemas\n- Criminología\n- Nutrición\n- Diseño\n\n¿Ya tienes alguna carrera en mente o prefieres hacer el test vocacional para descubrir cuál va mejor contigo?",
      waStage: "carreras_exploracion",
      needsHuman: false,
      createTask: false,
    },
    ambiguo: {
      responseText:
        "¡Hola! Soy Eva, asistente de Universidad Latino 😊\n\nCon gusto te ayudo. ¿Qué te gustaría conocer?\n\n1. Carreras disponibles\n2. Becas\n3. Hacer el test vocacional\n4. Hablar con un asesor",
      waStage: "inicio",
      needsHuman: false,
      createTask: false,
    },
  };

  const entry = matrix[intent] || matrix.ambiguo;
  return enrichDecisionWithOperational({
    intent,
    responseText: entry.responseText,
    waStage: entry.waStage,
    needsHuman: entry.needsHuman,
    createTask: entry.createTask,
  });
}

function matchesDudaTest(text, hasAny) {
  return hasAny([
    "no abre el test",
    "no abre",
    "se trabo el test",
    "se trabo",
    "se trabó",
    "tengo problema con el test",
    "problema con el test",
    "no me llego el resultado",
    "no me llegó el resultado",
    "error en el test",
    "error",
    "no llego",
    "no llegó",
    "fallo",
    "falló",
    "no me llego",
    "no me llegó",
    "no abre el link",
    "marca error",
  ]);
}

function matchesNoSeQueEstudiar(text, hasAny) {
  return hasAny([
    "hola quiero hacer el test vocacional",
    "quiero hacer el test vocacional",
    "quiero iniciar el test vocacional",
    "quiero hacer el test",
    "quiero el test",
    "me interesa el test vocacional",
    "ayudame con el test vocacional",
    "ayúdame con el test vocacional",
    "quiero descubrir que carrera estudiar",
    "quiero descubrir qué carrera estudiar",
    "quiero saber que carrera estudiar",
    "quiero saber qué carrera estudiar",
    "no se que carrera estudiar",
    "no sé qué carrera estudiar",
    "no se que estudiar",
    "no sé qué estudiar",
    "indeciso",
    "indecisa",
    "que carrera elegir",
    "qué carrera elegir",
    "no se que carrera elegir",
    "no sé qué carrera elegir",
    "estoy indeciso",
    "estoy indecisa",
    "me puedes orientar",
    "puedes orientarme",
    "puedes orientar",
    "orientacion",
    "orientación",
    "necesito orientacion",
    "necesito orientación",
  ]);
}

function matchesPostTest(text, hasAny) {
  const completion = hasAny([
    "ya hice",
    "me salio",
    "me salió",
    "termine",
    "terminé",
    "ya tengo mi resultado",
    "ya termine el test",
    "ya hice el test",
    "termine el test",
    "terminé el test",
    "terminé el test vocacional",
  ]);
  const testRelated = hasAny(["test", "resultado", "vocacional"]);
  return completion && testRelated;
}

function matchesHumano(text, hasAny) {
  return hasAny([
    "asesor",
    "humano",
    "contacten",
    "llamenme",
    "llámenme",
    "atencion personalizada",
    "atención personalizada",
    "persona",
    "me pueden llamar",
    "quiero hablar con un asesor",
    "me puede contactar alguien",
    "quiero que me llamen",
    "necesito hablar con una persona",
    "quiero hablar con alguien",
    "me puede llamar alguien",
    "me puede llamar",
    "llamada",
    "que me contacte alguien",
    "que me contacte",
    "quiero una llamada",
    "llameme",
    "llámame",
    "para hablar con un asesor",
    "para hablar con asesor",
  ]);
}

function matchesBeca(text, hasAny) {
  return hasAny([
    "beca",
    "promedio",
    "descuento",
    "apoyo economico",
    "apoyo económico",
    "apoyo",
    "quiero beca",
    "que beca me toca",
    "qué beca me toca",
    "hay descuentos",
    "tienen apoyo economico",
    "tienen apoyo económico",
  ]);
}

function matchesAgradecimiento(text, hasAny) {
  if (
    !hasAny([
      "gracias",
      "muchas gracias",
      "mil gracias",
      "te agradezco",
      "les agradezco",
      "agradecido",
      "agradecida",
      "gracias por la info",
      "gracias por la informacion",
      "gracias por la información",
    ])
  ) {
    return false;
  }
  if (hasAny(["quiero", "necesito", "cuanto", "cuánto", "beca", "carrera", "inscripcion", "inscripción"])) {
    return text.length <= 35;
  }
  return true;
}

function matchesDespedida(text, hasAny) {
  const normalized = normalizeMenuInput(text);
  if (normalized === "bye" || normalized === "by" || normalized === "x") return true;
  return hasAny([
    "adios",
    "adiós",
    "chao",
    "hasta luego",
    "hasta pronto",
    "nos vemos",
    "me voy",
    "bye bye",
    "goodbye",
  ]);
}

function matchesCarreraInteres(text, hasAny) {
  if (hasAny(EVA_CAREER_NAMES)) return true;
  if (
    hasAny([
      "informacion de una carrera",
      "información de una carrera",
      "info de una carrera",
      "informacion de carrera",
      "información de carrera",
    ])
  ) {
    return true;
  }
  if (hasAny(["me interesa", "quiero estudiar", "tienen"]) && hasAny(EVA_CAREER_NAMES)) {
    return true;
  }
  return false;
}

function matchesCarrerasDisponibles(text, hasAny) {
  return hasAny([
    "que carreras tienen",
    "qué carreras tienen",
    "que carreras ofrecen",
    "qué carreras ofrecen",
    "que carreras hay",
    "qué carreras hay",
    "que licenciaturas tienen",
    "qué licenciaturas tienen",
    "sus licenciaturas",
    "me puedes decir sus licenciaturas",
    "oferta academica",
    "oferta académica",
    "que ofrecen",
    "qué ofrecen",
    "listado de carreras",
    "lista de carreras",
    "catalogo de carreras",
    "catálogo de carreras",
  ]);
}

function normalizeMenuInput(rawText) {
  let s = String(rawText || "").trim().toLowerCase();
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/\.+$/, "").trim();
  s = s.replace(/\s+/g, " ");
  return s;
}

function detectMenuOption(rawText) {
  const normalized = normalizeMenuInput(rawText);
  if (!normalized) {
    return { detected: false, menu_option_value: null, intent: null };
  }

  for (const group of EVA_MENU_OPTION_GROUPS) {
    for (const value of group.values) {
      if (normalized === normalizeMenuInput(value)) {
        return {
          detected: true,
          menu_option_value: value,
          intent: group.intent,
        };
      }
    }
  }

  return { detected: false, menu_option_value: null, intent: null };
}

function returnIntent(intent, config, menuMeta = null, contactContext = {}) {
  const decision = buildIntentDecision(intent, config, contactContext);
  if (menuMeta?.detected) {
    return {
      ...decision,
      menu_option_detected: true,
      menu_option_value: menuMeta.menu_option_value,
    };
  }
  return {
    ...decision,
    menu_option_detected: false,
    menu_option_value: null,
  };
}

function classifyIntent(rawText, config, contactContext = {}) {
  if (!rawText || !String(rawText).trim()) {
    return returnIntent("sin_texto", config, null, contactContext);
  }

  const text = cleanText(rawText);
  const hasAny = (arr) => arr.some((t) => text.includes(cleanText(t)));

  if (matchesDudaTest(text, hasAny)) {
    return returnIntent("duda_test", config, null, contactContext);
  }

  if (matchesPostTest(text, hasAny)) {
    return returnIntent("post_test", config, null, contactContext);
  }

  if (matchesHumano(text, hasAny)) {
    return returnIntent("humano", config, null, contactContext);
  }

  if (matchesBeca(text, hasAny)) {
    return returnIntent("beca", config, null, contactContext);
  }

  if (matchesNoSeQueEstudiar(text, hasAny)) {
    return returnIntent("no_se_que_estudiar", config, null, contactContext);
  }

  if (matchesCarrerasDisponibles(text, hasAny)) {
    return returnIntent("carreras_disponibles", config, null, contactContext);
  }

  if (matchesCarreraInteres(text, hasAny)) {
    return returnIntent("carrera_interes", config, null, contactContext);
  }

  const menu = detectMenuOption(rawText);
  if (menu.detected) {
    return returnIntent(menu.intent, config, menu, contactContext);
  }

  if (matchesAgradecimiento(text, hasAny)) {
    return returnIntent("agradecimiento", config, null, contactContext);
  }

  if (matchesDespedida(text, hasAny)) {
    return returnIntent("despedida", config, null, contactContext);
  }

  return returnIntent("ambiguo", config, null, contactContext);
}

let _academicEngineModules = null;
let _ghlRelevanceGateModule = null;

async function loadGhlRelevanceGateModule() {
  if (!_ghlRelevanceGateModule) {
    _ghlRelevanceGateModule = await import("./lib/ghl-relevance-gate.js");
  }
  return _ghlRelevanceGateModule;
}

function buildGhlRelevanceConfigFromHandlerConfig(config) {
  return {
    ghlRelevanceShadowMode: config.ghlRelevanceShadowMode !== false,
    ghlSyncPolicy: config.ghlSyncPolicy || "none",
    ghlLeadScoreThreshold: Number.isFinite(config.ghlLeadScoreThreshold)
      ? config.ghlLeadScoreThreshold
      : 45,
    ghlMetaAdsLeadScoreThreshold: Number.isFinite(config.ghlMetaAdsLeadScoreThreshold)
      ? config.ghlMetaAdsLeadScoreThreshold
      : 50,
    metaAdsFirstMessageNoSync: config.metaAdsFirstMessageNoSync !== false,
    metaAdsRequireQualification: config.metaAdsRequireQualification !== false,
  };
}

function resolveInboundTrafficSource(parsed, contactContext) {
  if (parsed?.source) return parsed.source;
  const raw =
    parsed?.traffic_source ||
    contactContext?.wa_source ||
    contactContext?.source ||
    "";
  const normalized = String(raw || "").toLowerCase().trim();
  if (normalized === "meta_ads" || normalized === "meta" || normalized === "meta-ads") {
    return "meta_ads";
  }
  return "organic";
}

async function computeGhlRelevanceShadow({
  config,
  enrichedDecision,
  contactContext,
  messageText,
  messageType,
  source,
  firstMessage,
  academicMeta,
}) {
  if (config.ghlRelevanceShadowMode === false) {
    return null;
  }
  const gate = await loadGhlRelevanceGateModule();
  const decision = gate.evaluateGhlRelevance({
    intent: enrichedDecision.intent,
    intentDecision: enrichedDecision,
    contactContext,
    messageText,
    messageType,
    source,
    firstMessage,
    academicResult: academicMeta,
    config: buildGhlRelevanceConfigFromHandlerConfig(config),
  });
  return gate.formatGhlRelevanceShadowPayload(decision);
}

async function loadAcademicEngineModules() {
  if (!_academicEngineModules) {
    const adapter = await import("./lib/academic-engine/adapter.js");
    const academicIndex = await import("./lib/academic-engine/index.js");
    const evaLlm = await import("./lib/eva-llm/index.js");
    _academicEngineModules = { adapter, academicIndex, evaLlm };
  }
  return _academicEngineModules;
}

function buildAcademicMetaBase(config) {
  return {
    academic_engine_enabled: config.academicEngineEnabled === true,
    academic_enriched: false,
    academic_intent: null,
    academic_confidence: null,
    academic_source_truth_version: null,
    academic_pending_validation_used: false,
    academic_warnings: [],
    academic_response_replaced: false,
    academic_skipped: false,
    eva_llm_enabled: config.evaLlmEnabled === true,
    eva_llm_mode: config.evaLlmMode || "off",
    eva_llm_rephrased: false,
    eva_llm_suggested_response: null,
    eva_llm_guardrail_warnings: [],
    eva_llm_error: null,
    eva_llm_block_reason: null,
  };
}

async function applyEvaLlmLayer(decision, config, academicMeta, rawText, sourceContext) {
  if (!config.evaLlmEnabled) {
    return decision;
  }

  try {
    const { evaLlm } = await loadAcademicEngineModules();
    const factualResponse = decision.responseText;
    const withLlm = await evaLlm.enrichWithLLM(decision, config, {
      academicMeta,
      rawText,
      factualResponse,
      sourceContext,
    });

    academicMeta.eva_llm_mode = withLlm.llm_meta?.mode || config.evaLlmMode || "off";
    academicMeta.eva_llm_rephrased = withLlm.llm_meta?.rephrased === true;
    academicMeta.eva_llm_suggested_response = withLlm.llm_meta?.suggested_response ?? null;
    academicMeta.eva_llm_guardrail_warnings = withLlm.llm_meta?.guardrail_warnings || [];
    academicMeta.eva_llm_error = withLlm.llm_meta?.llm_error || null;
    academicMeta.eva_llm_block_reason = withLlm.llm_meta?.block_reason || null;

    return withLlm;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    academicMeta.eva_llm_error = message;
    academicMeta.academic_warnings = [...(academicMeta.academic_warnings || []), message];
    return decision;
  }
}

async function logLlmShadowEntry(client, entry) {
  try {
    const { error } = await client.database.from("wa_llm_shadow_log").insert({
      inbound_message_id: entry.inbound_message_id || null,
      normalized_phone: entry.normalized_phone || null,
      wa_intent: entry.wa_intent || null,
      academic_intent: entry.academic_intent || null,
      factual_response: entry.factual_response || null,
      suggested_response: entry.suggested_response || null,
      final_response: entry.final_response || null,
      mode: entry.mode || "shadow",
      provider: entry.provider || null,
      model: entry.model || null,
      guardrail_warnings: entry.guardrail_warnings || [],
      llm_error: entry.llm_error || null,
      block_reason: entry.block_reason || null,
      eva_llm_rephrased: entry.eva_llm_rephrased === true,
    });
    if (error) {
      await logWarning(client, {
        normalized_phone: entry.normalized_phone || null,
        error_type: "llm_shadow_log_failed",
        error_message: error.message || String(error),
        raw_context: { inbound_message_id: entry.inbound_message_id || null },
      });
    }
  } catch (err) {
    await logWarning(client, {
      normalized_phone: entry.normalized_phone || null,
      error_type: "llm_shadow_log_failed",
      error_message: err instanceof Error ? err.message : String(err),
      raw_context: { inbound_message_id: entry.inbound_message_id || null },
    });
  }
}

/**
 * Academic + LLM enrichment after classifyIntent / buildIntentDecision.
 * Preserves WA operational fields on decision.
 */
async function applyAcademicAndLlmEnrichment(decision, rawText, config, academicState = {}) {
  const academicMeta = buildAcademicMetaBase(config);

  if (!config.academicEngineEnabled) {
    return { decision, academicState, academicMeta };
  }

  try {
    const { adapter, academicIndex } = await loadAcademicEngineModules();
    const originalResponseText = decision.responseText;
    const academicResult = academicIndex.resolveAcademicMessage(rawText, academicState);

    academicMeta.academic_intent = academicResult.academic_intent;
    academicMeta.academic_confidence = academicResult.confidence;
    academicMeta.academic_source_truth_version = academicResult.source_truth_version;
    academicMeta.academic_pending_validation_used = academicResult.pending_validation_used === true;
    academicMeta.academic_warnings = academicResult.warnings || [];

    const sourceContext = academicResult.source_context || "";

    if (!adapter.shouldEnrichAcademic(decision.intent, rawText)) {
      academicMeta.academic_skipped = true;
      let skippedDecision = {
        ...decision,
        academic_meta: academicMeta,
      };
      skippedDecision = await applyEvaLlmLayer(
        skippedDecision,
        config,
        academicMeta,
        rawText,
        sourceContext,
      );
      skippedDecision.academic_meta = academicMeta;
      academicMeta.academic_response_replaced =
        skippedDecision.responseText !== originalResponseText;
      return {
        decision: skippedDecision,
        academicState: academicResult.state,
        academicMeta,
      };
    }

    let enriched = adapter.mergeAcademicIntoDecision(decision, academicResult);
    enriched.intent = decision.intent;
    enriched.waStage = decision.waStage;
    enriched.needsHuman = decision.needsHuman;
    enriched.createTask = decision.createTask;
    enriched.priority = decision.priority;
    enriched.escalation_required = decision.escalation_required;
    enriched.task_title = decision.task_title;
    enriched.task_priority_label = decision.task_priority_label;
    enriched.menu_option_detected = decision.menu_option_detected;
    enriched.menu_option_value = decision.menu_option_value;

    enriched = await applyEvaLlmLayer(enriched, config, academicMeta, rawText, sourceContext);

    academicMeta.academic_enriched = enriched.academic_enriched === true;
    academicMeta.academic_response_replaced = enriched.responseText !== originalResponseText;
    enriched.academic_meta = academicMeta;

    return {
      decision: enriched,
      academicState: academicResult.state,
      academicMeta,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    academicMeta.academic_warnings = [...(academicMeta.academic_warnings || []), message];
    return { decision, academicState, academicMeta };
  }
}

async function getClient() {
  if (Deno.env.get("WA_E2E_MOCK_DB") === "true") {
    const { getMockInsforgeClient } = await import("./lib/test/mock-insforge-client.js");
    return getMockInsforgeClient();
  }
  const { createClient } = await import("npm:@insforge/sdk");
  const baseUrl = Deno.env.get("INSFORGE_BASE_URL");
  const anonKey = Deno.env.get("ANON_KEY");
  if (!baseUrl || !anonKey) {
    throw new Error("Missing INSFORGE_BASE_URL or ANON_KEY in function environment");
  }
  return createClient({ baseUrl, anonKey });
}

function throwIfError(error, context) {
  if (error) {
    throw new Error(`${context}: ${error.message || String(error)}`);
  }
}

async function logWarning(client, entry) {
  try {
    await client.database.from("wa_errors").insert({
      source: "ycloud-wa-inbound",
      normalized_phone: entry.normalized_phone || null,
      error_type: entry.error_type || "webhook_warning",
      error_message: entry.error_message,
      raw_context: entry.raw_context || null,
    });
  } catch (_ignored) {
    // non-blocking warning log
  }
}

async function upsertContactState(client, phone, decision, nowIso, config, outboundStatus) {
  const { data: existingContact, error: contactLookupError } = await client.database
    .from("wa_contacts_state")
    .select("id")
    .eq("normalized_phone", phone)
    .maybeSingle();
  throwIfError(contactLookupError, "Lookup wa_contacts_state");

  const contactPayload = {
    wa_stage: decision.waStage || decision.intent,
    wa_last_intent: decision.intent,
    wa_last_message_at: nowIso,
    wa_needs_human: decision.needsHuman,
    wa_summary: `Intent: ${decision.intent}`,
    updated_at: nowIso,
  };

  if (existingContact?.id) {
    const { error: contactUpdateError } = await client.database
      .from("wa_contacts_state")
      .update(contactPayload)
      .eq("id", existingContact.id);
    throwIfError(contactUpdateError, "Update wa_contacts_state");
  } else {
    const { error: contactInsertError } = await client.database
      .from("wa_contacts_state")
      .insert({
        normalized_phone: phone,
        ...contactPayload,
      });
    throwIfError(contactInsertError, "Insert wa_contacts_state");
  }
}

module.exports = async function handler(request) {
  const config = getConfig();

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: DEFAULT_HEADERS });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  }

  let rawBody = "";
  let payload;
  try {
    rawBody = await request.text();
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch (_err) {
    return webhookResponse({
      ok: false,
      mode: config.mode,
      provider: "ycloud",
      error: "Invalid JSON payload",
    });
  }

  const signatureHeader =
    request.headers.get("YCloud-Signature") ||
    request.headers.get("ycloud-signature") ||
    "";

  if (!config.webhookSecret && config.mode === "mock" && signatureHeader) {
    const client = await getClient().catch(() => null);
    if (client) {
      await logWarning(client, {
        error_type: "webhook_warning",
        error_message:
          "YCLOUD_WEBHOOK_SECRET not configured; cannot validate YCloud-Signature header",
        raw_context: { mode: config.mode, has_signature_header: true },
      });
    }
  } else if (config.webhookSecret && signatureHeader) {
    const verification = await verifyYCloudSignature(
      rawBody,
      signatureHeader,
      config.webhookSecret
    );
    if (!verification.valid) {
      const client = await getClient().catch(() => null);
      if (client) {
        await logWarning(client, {
          error_type: "webhook_signature_invalid",
          error_message: `Signature validation failed: ${verification.reason}`,
          raw_context: { mode: config.mode, event_id: payload?.id || null },
        });
      }
      if (config.mode !== "mock") {
        return webhookResponse({
          ok: false,
          mode: config.mode,
          provider: "ycloud",
          error: "Invalid webhook signature",
        });
      }
    }
  }

  const parsed = parseInboundPayload(payload);

  if (!isInboundEvent(payload, parsed)) {
    return webhookResponse({
      ok: true,
      mode: config.mode,
      provider: "ycloud",
      skipped: true,
      reason: "non_inbound_event",
      event_type: parsed.event_type,
    });
  }

  if (isOwnBusinessMessage(parsed.from, config.businessNumber)) {
    return webhookResponse({
      ok: true,
      mode: config.mode,
      provider: "ycloud",
      skipped: true,
      reason: "own_business_message",
      normalized_phone: normalizePhoneMX(parsed.from) || parsed.from,
    });
  }

  const normalizedPhone = normalizePhoneMX(parsed.from);
  const nowIso = new Date().toISOString();
  let inboundId = null;
  let outboundId = null;

  try {
    const client = await getClient();

    if (!normalizedPhone) {
      await logWarning(client, {
        error_type: "phone_normalization_failed",
        error_message: "Could not normalize incoming phone",
        raw_context: { from: parsed.from, payload },
      });
    }

    const { data: inboundRows, error: inboundError } = await client.database
      .from("wa_inbound_messages")
      .insert({
        ycloud_message_id: parsed.message_id || parsed.event_id || null,
        from_phone: parsed.from || null,
        to_phone: parsed.to || null,
        normalized_phone: normalizedPhone || parsed.from || null,
        message_type: parsed.message_type || "unknown",
        message_text: parsed.message_text,
        raw_payload: payload,
        received_at: parsed.timestamp || nowIso,
        processed_at: nowIso,
        status:
          config.mode === "live_outbound"
            ? "processed_inbound_live"
            : "processed_inbound_mock",
      })
      .select("id")
      .limit(1);
    throwIfError(inboundError, "Insert wa_inbound_messages");
    inboundId = inboundRows?.[0]?.id || null;

    let contactContext = {};
    if (normalizedPhone) {
      const { data: prevContact, error: prevContactError } = await client.database
        .from("wa_contacts_state")
        .select("wa_stage, wa_last_intent, wa_needs_human")
        .eq("normalized_phone", normalizedPhone)
        .maybeSingle();
      throwIfError(prevContactError, "Lookup wa_contacts_state for context");
      if (prevContact) {
        contactContext = prevContact;
      }
    }

    const decision = classifyIntent(parsed.message_text, config, contactContext);
    const enrichResult = await applyAcademicAndLlmEnrichment(
      decision,
      parsed.message_text,
      config,
      {},
    );
    const enrichedDecision = enrichResult.decision;

    if (config.evaLlmEnabled && enrichedDecision.llm_meta && inboundId) {
      await logLlmShadowEntry(client, {
        inbound_message_id: inboundId,
        normalized_phone: normalizedPhone || parsed.from || null,
        wa_intent: enrichedDecision.intent,
        academic_intent: enrichResult.academicMeta?.academic_intent || null,
        factual_response: enrichedDecision.llm_meta?.factual_response || enrichedDecision.responseText,
        suggested_response: enrichedDecision.llm_meta?.suggested_response || null,
        final_response: enrichedDecision.responseText,
        mode: enrichedDecision.llm_meta?.mode || config.evaLlmMode || "off",
        provider: enrichedDecision.llm_meta?.provider || null,
        model: enrichedDecision.llm_meta?.model || null,
        guardrail_warnings: enrichedDecision.llm_meta?.guardrail_warnings || [],
        llm_error: enrichedDecision.llm_meta?.llm_error || null,
        block_reason: enrichedDecision.llm_meta?.block_reason || null,
        eva_llm_rephrased: enrichedDecision.llm_meta?.rephrased === true,
      });
    }
    enrichedDecision.waSummary = buildOperationalWaSummary(enrichedDecision, parsed.message_text);
    const ghlRelevanceShadow = await computeGhlRelevanceShadow({
      config,
      enrichedDecision,
      contactContext,
      messageText: parsed.message_text,
      messageType: parsed.message_type,
      source: resolveInboundTrafficSource(parsed, contactContext),
      firstMessage: parsed.first_message,
      academicMeta: enrichResult.academicMeta,
    });
    const ycloudSend = await sendYCloudMessage({
      config,
      to: normalizedPhone || parsed.from || null,
      text: enrichedDecision.responseText,
    });

    const outboundStatus = resolveOutboundStatus(ycloudSend);

    if (ycloudSend.failed && config.mode === "live_outbound") {
      await logWarning(client, {
        normalized_phone: normalizedPhone || null,
        error_type: "outbound_failed",
        error_message: ycloudSend.error_message || "YCloud outbound failed",
        raw_context: sanitizeForStorage({
          inbound_id: inboundId,
          http_status: ycloudSend.http_status || null,
          ycloud: ycloudSend,
        }),
      });
    }

    const { data: outboundRows, error: outboundError } = await client.database
      .from("wa_outbound_messages")
      .insert({
        inbound_message_id: inboundId,
        to_phone: normalizedPhone || parsed.from || null,
        response_text: enrichedDecision.responseText,
        provider: "ycloud",
        provider_response_id: resolveProviderResponseId(ycloudSend),
        raw_response: sanitizeForStorage({
          mode: ycloudSend.mode,
          intent: enrichedDecision.intent,
          outbound_real: ycloudSend.outbound_real === true,
          dry_run: ycloudSend.dry_run === true,
          failed: ycloudSend.failed === true,
          ycloud_status: ycloudSend.status || null,
          error_message: ycloudSend.error_message || null,
          endpoint: ycloudSend.endpoint || null,
          request: ycloudSend.request || null,
          response: ycloudSend.raw_response || null,
          academic_engine_enabled: enrichResult.academicMeta?.academic_engine_enabled === true,
          academic_enriched: enrichResult.academicMeta?.academic_enriched === true,
          academic_intent: enrichResult.academicMeta?.academic_intent || null,
          academic_confidence: enrichResult.academicMeta?.academic_confidence ?? null,
          academic_source_truth_version:
            enrichResult.academicMeta?.academic_source_truth_version || null,
          academic_pending_validation_used:
            enrichResult.academicMeta?.academic_pending_validation_used === true,
          academic_warnings: enrichResult.academicMeta?.academic_warnings || [],
          academic_response_replaced:
            enrichResult.academicMeta?.academic_response_replaced === true,
          academic_skipped: enrichResult.academicMeta?.academic_skipped === true,
          eva_llm_enabled: enrichResult.academicMeta?.eva_llm_enabled === true,
          eva_llm_mode: enrichResult.academicMeta?.eva_llm_mode || null,
          eva_llm_rephrased: enrichResult.academicMeta?.eva_llm_rephrased === true,
          eva_llm_suggested_response: enrichResult.academicMeta?.eva_llm_suggested_response || null,
          eva_llm_guardrail_warnings: enrichResult.academicMeta?.eva_llm_guardrail_warnings || [],
        }),
        sent_at: nowIso,
        status: outboundStatus,
        error_message: ycloudSend.error_message || null,
      })
      .select("id")
      .limit(1);
    throwIfError(outboundError, "Insert wa_outbound_messages");
    outboundId = outboundRows?.[0]?.id || null;

    await upsertContactState(
      client,
      normalizedPhone || parsed.from || null,
      enrichedDecision,
      nowIso,
      config,
      outboundStatus
    );

    let ghlSync = null;
    if (config.ghlSyncMode === "dry_run" || config.ghlSyncMode === "live") {
      try {
        const ghlAllowlist = resolveGhlLiveAllowlist(config, normalizedPhone || parsed.from || null);
        const ghlSyncAuth = await resolveGhlSyncAuthorizationForHandler(
          config,
          ghlRelevanceShadow,
          ghlAllowlist
        );
        const ghlSyncBaseContext = {
          inboundId,
          normalizedPhone: normalizedPhone || parsed.from || null,
          intent: enrichedDecision.intent,
          messageText: parsed.message_text,
          messageType: parsed.message_type,
          needsHuman: enrichedDecision.needsHuman,
          responseText: enrichedDecision.responseText,
          waStage: enrichedDecision.waStage,
          waSummary: enrichedDecision.waSummary,
          timestamp: nowIso,
          priority: enrichedDecision.priority,
          escalation_required: enrichedDecision.escalation_required,
          operational_owner: enrichedDecision.operational_owner,
          business_hours_label: enrichedDecision.business_hours_label,
          after_hours_message: enrichedDecision.after_hours_message,
          after_hours_logic_enabled: enrichedDecision.after_hours_logic_enabled,
          task_title: enrichedDecision.task_title,
          task_priority_label: enrichedDecision.task_priority_label,
          trafficSource: resolveInboundTrafficSource(parsed, contactContext),
        };

        if (ghlSyncAuth.shouldSync) {
          const ghlSyncContext = await enrichGhlSyncContextForHandler(
            ghlSyncBaseContext,
            ghlRelevanceShadow,
            ghlSyncAuth
          );
          ghlSync = await syncGHLContact(client, config, ghlSyncContext);
        } else {
          ghlSync = await insertGhlPolicyBlockedResult(
            client,
            config,
            ghlSyncBaseContext,
            ghlRelevanceShadow,
            ghlSyncAuth
          );
        }
        if (ghlSync?.failed) {
          await logWarning(client, {
            normalized_phone: normalizedPhone || null,
            error_type: "ghl_live_failed",
            error_message: ghlSync.error_message || "GHL live sync failed",
            raw_context: sanitizeGHLForStorage({
              inbound_id: inboundId,
              intent: decision.intent,
              ghl_sync_log_id: ghlSync.ghl_sync_log_id,
            }),
          });
        }
      } catch (ghlErr) {
        const ghlErrorMessage =
          ghlErr instanceof Error ? ghlErr.message : String(ghlErr);
        await logWarning(client, {
          normalized_phone: normalizedPhone || null,
          error_type:
            config.ghlSyncMode === "live" ? "ghl_live_failed" : "ghl_dry_run_failed",
          error_message: ghlErrorMessage,
          raw_context: { inbound_id: inboundId, intent: decision.intent },
        });
      }
    }

    return webhookResponse({
      ok: true,
      mode: config.mode,
      provider: "ycloud",
      intent: enrichedDecision.intent,
      normalized_phone: normalizedPhone || parsed.from || null,
      response_text: enrichedDecision.responseText,
      wa_stage: enrichedDecision.waStage,
      wa_needs_human: enrichedDecision.needsHuman,
      menu_option_detected: enrichedDecision.menu_option_detected === true,
      menu_option_value: enrichedDecision.menu_option_value || null,
      priority: enrichedDecision.priority,
      escalation_required: enrichedDecision.escalation_required,
      operational_owner: enrichedDecision.operational_owner,
      business_hours_label: enrichedDecision.business_hours_label,
      after_hours_message: enrichedDecision.after_hours_message,
      after_hours_logic_enabled: enrichedDecision.after_hours_logic_enabled,
      task_title: ghlSync?.task_title || enrichedDecision.task_title || null,
      task_priority_label: enrichedDecision.task_priority_label,
      academic_engine_enabled: enrichResult.academicMeta?.academic_engine_enabled === true,
      academic_enriched: enrichResult.academicMeta?.academic_enriched === true,
      academic_intent: enrichResult.academicMeta?.academic_intent || null,
      academic_confidence: enrichResult.academicMeta?.academic_confidence ?? null,
      academic_source_truth_version:
        enrichResult.academicMeta?.academic_source_truth_version || null,
      academic_pending_validation_used:
        enrichResult.academicMeta?.academic_pending_validation_used === true,
      academic_warnings: enrichResult.academicMeta?.academic_warnings || [],
      academic_response_replaced: enrichResult.academicMeta?.academic_response_replaced === true,
      academic_skipped: enrichResult.academicMeta?.academic_skipped === true,
      eva_llm_enabled: enrichResult.academicMeta?.eva_llm_enabled === true,
      eva_llm_mode: enrichResult.academicMeta?.eva_llm_mode || null,
      eva_llm_rephrased: enrichResult.academicMeta?.eva_llm_rephrased === true,
      eva_llm_suggested_response: enrichResult.academicMeta?.eva_llm_suggested_response || null,
      eva_llm_guardrail_warnings: enrichResult.academicMeta?.eva_llm_guardrail_warnings || [],
      eva_llm_provider: enrichedDecision.llm_meta?.provider || config.evaLlmProvider || null,
      eva_llm_model: enrichedDecision.llm_meta?.model || config.evaLlmModel || null,
      eva_llm_error: enrichResult.academicMeta?.eva_llm_error || null,
      eva_llm_block_reason: enrichResult.academicMeta?.eva_llm_block_reason || null,
      openai_api_key_configured: Boolean(config.openaiApiKey),
      inbound_id: inboundId,
      outbound_id: outboundId,
      outbound_status: outboundStatus,
      outbound_real: ycloudSend.outbound_real === true,
      provider_response_id: resolveProviderResponseId(ycloudSend),
      ghl_sync_mode: config.ghlSyncMode,
      ghl_dry_run: ghlSync?.dry_run === true,
      ghl_live: ghlSync?.live === true,
      ghl_synced: ghlSync?.synced === true,
      ghl_sync_status: ghlSync?.blocked
        ? ghlSync.block_reason
        : ghlSync?.failed
          ? "failed"
          : ghlSync?.synced
            ? "ok"
            : ghlSync?.dry_run
              ? "dry_run"
              : null,
      ghl_allowlist_enabled: ghlSync?.allowlist_enabled ?? null,
      ghl_allowlist_matched: ghlSync?.allowlist_matched ?? null,
      ghl_block_reason: ghlSync?.block_reason || null,
      ghl_policy_blocked: ghlSync?.policy_blocked === true,
      ghl_allowed_phones_count: ghlSync?.allowed_phones_count ?? null,
      ghl_contact_id: ghlSync?.ghl_contact_id || null,
      ghl_sync_log_id: ghlSync?.ghl_sync_log_id || null,
      ghl_note_created: ghlSync?.note_created === true,
      ghl_task_created: ghlSync?.task_created === true,
      ghl_would_create_task: ghlSync?.would_create_task === true,
      ghl_would_add_tags: ghlSync?.would_add_tags || null,
      ghl_error: ghlSync?.error_message || null,
      custom_fields_config_loaded: ghlSync?.custom_fields_config_loaded === true,
      custom_fields_map_valid: ghlSync?.custom_fields_map_valid === true,
      custom_fields_enabled: ghlSync?.custom_fields_enabled === true,
      custom_fields_count: ghlSync?.custom_fields_count ?? null,
      custom_fields_would_write: ghlSync?.custom_fields_would_write === true,
      custom_fields_written: ghlSync?.custom_fields_written === true,
      custom_fields_skipped_reason: ghlSync?.custom_fields_skipped_reason || null,
      custom_fields_ghl_api_shape_preview:
        ghlSync?.custom_fields_ghl_api_shape_preview || null,
      ghl_relevance_shadow: ghlRelevanceShadow,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    try {
      const client = await getClient();
      await client.database.from("wa_errors").insert({
        source: "ycloud-wa-inbound",
        normalized_phone: normalizedPhone || null,
        error_type: "function_error",
        error_message: errorMessage,
        raw_context: {
          payload,
          inbound_id: inboundId,
          outbound_id: outboundId,
        },
      });
    } catch (_ignored) {
      // ignore secondary error writes
    }

    return webhookResponse({
      ok: false,
      mode: config.mode,
      provider: "ycloud",
      error: errorMessage,
      inbound_id: inboundId,
      outbound_id: outboundId,
    });
  }
};

const handler = module.exports;
handler.classifyIntent = classifyIntent;
handler.applyAcademicAndLlmEnrichment = applyAcademicAndLlmEnrichment;
handler.logLlmShadowEntry = logLlmShadowEntry;
handler.getConfig = getConfig;
handler.parseGhlLiveAllowedPhones = parseGhlLiveAllowedPhones;
handler.resolveGhlLiveAllowlist = resolveGhlLiveAllowlist;
handler.syncGHLContact = syncGHLContact;
handler.computeGhlRelevanceShadow = computeGhlRelevanceShadow;
handler.buildGhlRelevanceConfigFromHandlerConfig = buildGhlRelevanceConfigFromHandlerConfig;
handler.resolveGhlSyncAuthorizationForHandler = resolveGhlSyncAuthorizationForHandler;
handler.enrichGhlSyncContextForHandler = enrichGhlSyncContextForHandler;
handler.insertGhlPolicyBlockedResult = insertGhlPolicyBlockedResult;
handler.buildGHLDryRunPayload = buildGHLDryRunPayload;
handler.shouldCreateTaskDryRun = shouldCreateTaskDryRun;
handler.shouldCreateTaskLive = shouldCreateTaskLive;
