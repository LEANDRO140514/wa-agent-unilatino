const DEFAULT_YCLOUD_API_BASE = "https://api.ycloud.com/v2";

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

function getOutboundConfig(env = Deno.env.toObject()) {
  return {
    mode: env.WA_AGENT_MODE || "mock",
    apiKey: env.YCLOUD_API_KEY || "",
    apiBaseUrl: env.YCLOUD_API_BASE_URL || DEFAULT_YCLOUD_API_BASE,
    businessNumber: env.YCLOUD_BUSINESS_NUMBER || "",
    wabaId: env.YCLOUD_WABA_ID || "",
  };
}

function buildTextMessagePayload({ from, to, text }) {
  return {
    from,
    to,
    type: "text",
    text: {
      body: text,
      preview_url: false,
    },
  };
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

/**
 * Sends a WhatsApp text message via YCloud.
 * In mock mode (default) it never calls YCloud — returns a dry-run result.
 */
async function sendYCloudMessage({
  to,
  text,
  from,
  mode,
  apiKey,
  apiBaseUrl,
}) {
  const resolvedMode = mode || "mock";
  const resolvedFrom = from || "";
  const payload = buildTextMessagePayload({ from: resolvedFrom, to, text });

  if (resolvedMode !== "live_outbound") {
    return {
      sent: false,
      outbound_real: false,
      mode: resolvedMode,
      reason: "outbound_disabled",
      dry_run: true,
      endpoint: `${apiBaseUrl || DEFAULT_YCLOUD_API_BASE}/whatsapp/messages`,
      request: payload,
    };
  }

  if (!apiKey) {
    return {
      sent: false,
      outbound_real: false,
      failed: true,
      mode: resolvedMode,
      error_message: "YCLOUD_API_KEY is required for live_outbound mode",
    };
  }
  if (!resolvedFrom) {
    return {
      sent: false,
      outbound_real: false,
      failed: true,
      mode: resolvedMode,
      error_message: "YCLOUD_BUSINESS_NUMBER is required for live_outbound mode",
    };
  }
  if (!to || !text) {
    return {
      sent: false,
      outbound_real: false,
      failed: true,
      mode: resolvedMode,
      error_message: "to and text are required to send YCloud message",
    };
  }

  const endpoint = `${apiBaseUrl || DEFAULT_YCLOUD_API_BASE}/whatsapp/messages`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      sent: false,
      outbound_real: true,
      failed: true,
      mode: resolvedMode,
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
    mode: resolvedMode,
    provider: "ycloud",
    endpoint,
    provider_response_id: responseBody?.id || null,
    wamid: responseBody?.wamid || null,
    wabaId: responseBody?.wabaId || null,
    status: responseBody?.status || "accepted",
    raw_response: sanitizeForStorage(responseBody),
  };
}

module.exports = {
  DEFAULT_YCLOUD_API_BASE,
  sanitizeForStorage,
  getOutboundConfig,
  buildTextMessagePayload,
  resolveOutboundStatus,
  sendYCloudMessage,
};
