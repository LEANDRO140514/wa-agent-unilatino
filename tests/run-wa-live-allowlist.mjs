#!/usr/bin/env node
/**
 * R2-P0 — WA_LIVE_ALLOWED_PHONES outbound allowlist (offline).
 * Usage: node tests/run-wa-live-allowlist.mjs
 *
 * Uses fictional E.164 numbers only. Stubs fetch — 0 real YCloud/GHL calls.
 */

import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const HANDLER_PATH = path.join(ROOT, "insforge/functions/ycloud-wa-inbound.js");

const PHONE_A = "+525550000001";
const PHONE_B = "+525550000002";
const PHONE_C = "+525550000003";
const PHONE_D = "+525550000004";

const handlerMod = await import(pathToFileURL(HANDLER_PATH).href);
const handler = handlerMod.default;

const results = [];
let failures = 0;
const ycloudFetchCalls = [];
const nativeFetch = globalThis.fetch;

function record(id, ok, detail = "") {
  results.push({ id, ok, detail });
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${id}${detail ? ` — ${detail}` : ""}`);
}

function installFetchStub() {
  ycloudFetchCalls.length = 0;
  globalThis.fetch = async (url, options = {}) => {
    const href = String(url);
    if (href.includes("api.ycloud.com") || href.includes("/whatsapp/messages")) {
      ycloudFetchCalls.push({ url: href, method: options.method || "GET" });
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: "mock-ycloud-msg", status: "accepted", wamid: "wamid.mock" }),
      };
    }
    throw new Error(`Unexpected network call in WA allowlist test: ${href}`);
  };
}

function restoreFetch() {
  globalThis.fetch = nativeFetch;
}

function applyEnv(overrides = {}) {
  const base = {
    WA_AGENT_MODE: "mock",
    YCLOUD_API_KEY: "test-ycloud-key",
    YCLOUD_BUSINESS_NUMBER: "+529990000000",
    YCLOUD_API_BASE_URL: "https://api.ycloud.com/v2",
    WA_LIVE_ALLOWED_PHONES: "",
  };
  for (const [k, v] of Object.entries({ ...base, ...overrides })) {
    if (v === undefined || v === null) delete process.env[k];
    else process.env[k] = String(v);
  }
  if (!globalThis.Deno) {
    globalThis.Deno = { env: { get: (key) => process.env[key] } };
  } else {
    globalThis.Deno.env.get = (key) => process.env[key];
  }
}

async function send(to) {
  const config = handler.getConfig();
  return handler.sendYCloudMessage({
    config,
    to,
    text: "hola test allowlist",
  });
}

try {
  installFetchStub();

  // WA1 — mock: outbound disabled regardless of allowlist
  applyEnv({
    WA_AGENT_MODE: "mock",
    WA_LIVE_ALLOWED_PHONES: `${PHONE_A},${PHONE_B}`,
  });
  ycloudFetchCalls.length = 0;
  {
    const r = await send(PHONE_A);
    record(
      "WA1_mock_outbound_disabled",
      r.outbound_real !== true &&
        r.sent !== true &&
        r.reason === "outbound_disabled" &&
        ycloudFetchCalls.length === 0,
      `reason=${r.reason} fetches=${ycloudFetchCalls.length}`,
    );
  }

  // WA2 — live + allowed phone → allowlist PASS (fetch stubbed, counted)
  applyEnv({
    WA_AGENT_MODE: "live_outbound",
    WA_LIVE_ALLOWED_PHONES: `${PHONE_A},${PHONE_B},${PHONE_C}`,
  });
  ycloudFetchCalls.length = 0;
  {
    const r = await send(PHONE_A);
    record(
      "WA2_live_allowed_pass",
      r.sent === true &&
        r.outbound_real === true &&
        r.blocked !== true &&
        ycloudFetchCalls.length === 1,
      `sent=${r.sent} fetches=${ycloudFetchCalls.length}`,
    );
  }

  // WA3 — live + phone outside allowlist → BLOCK, no fetch
  applyEnv({
    WA_AGENT_MODE: "live_outbound",
    WA_LIVE_ALLOWED_PHONES: `${PHONE_A},${PHONE_B},${PHONE_C}`,
  });
  ycloudFetchCalls.length = 0;
  {
    const r = await send(PHONE_D);
    record(
      "WA3_live_phone_not_allowed",
      r.sent !== true &&
        r.outbound_real !== true &&
        r.blocked === true &&
        r.reason === "blocked_allowlist_phone_not_allowed" &&
        ycloudFetchCalls.length === 0,
      `reason=${r.reason} fetches=${ycloudFetchCalls.length}`,
    );
  }

  // WA4 — live + empty allowlist → fail-closed
  applyEnv({
    WA_AGENT_MODE: "live_outbound",
    WA_LIVE_ALLOWED_PHONES: "",
  });
  ycloudFetchCalls.length = 0;
  {
    const r = await send(PHONE_A);
    record(
      "WA4_live_empty_allowlist_fail_closed",
      r.sent !== true &&
        r.blocked === true &&
        r.reason === "blocked_allowlist_missing" &&
        ycloudFetchCalls.length === 0,
      `reason=${r.reason} fetches=${ycloudFetchCalls.length}`,
    );
  }

  // WA5 — live + absent allowlist → fail-closed
  applyEnv({ WA_AGENT_MODE: "live_outbound" });
  delete process.env.WA_LIVE_ALLOWED_PHONES;
  ycloudFetchCalls.length = 0;
  {
    const r = await send(PHONE_A);
    record(
      "WA5_live_absent_allowlist_fail_closed",
      r.sent !== true &&
        r.blocked === true &&
        r.reason === "blocked_allowlist_missing" &&
        ycloudFetchCalls.length === 0,
      `reason=${r.reason} fetches=${ycloudFetchCalls.length}`,
    );
  }

  // WA6 — CSV parse count
  {
    const parsed = handler.parseWaLiveAllowedPhones(`${PHONE_A}, ${PHONE_B}, ${PHONE_C}`);
    record(
      "WA6_csv_parse_count_3",
      Array.isArray(parsed) && parsed.length === 3 && parsed.includes(PHONE_A),
      `count=${parsed.length}`,
    );
  }

  // WA7 — spaces / empty entries
  {
    const parsed = handler.parseWaLiveAllowedPhones(`${PHONE_A}, ,${PHONE_B} ,, ${PHONE_C}`);
    record(
      "WA7_csv_trim_empty_entries",
      Array.isArray(parsed) &&
        parsed.length === 3 &&
        parsed.includes(PHONE_A) &&
        parsed.includes(PHONE_B) &&
        parsed.includes(PHONE_C),
      `count=${parsed.length}`,
    );
  }

  // Compatibility with normalizePhoneMX (10-digit local → +52…)
  {
    const local10 = "5550000001";
    const parsed = handler.parseWaLiveAllowedPhones(local10);
    const gate = handler.resolveWaLiveAllowlist(
      { mode: "live_outbound", waLiveAllowedPhones: parsed },
      `+52${local10}`,
    );
    record(
      "WA8_normalize_mx_compat",
      parsed[0] === PHONE_A && gate.allowed === true && gate.allowlist_matched === true,
      `parsed0=${parsed[0]} matched=${gate.allowlist_matched}`,
    );
  }

  // Independence: GHL allowlist must not unlock WA outbound
  applyEnv({
    WA_AGENT_MODE: "live_outbound",
    WA_LIVE_ALLOWED_PHONES: "",
    GHL_LIVE_ALLOWED_PHONES: `${PHONE_A},${PHONE_B},${PHONE_C}`,
  });
  ycloudFetchCalls.length = 0;
  {
    const r = await send(PHONE_A);
    record(
      "WA9_independent_of_ghl_allowlist",
      r.blocked === true &&
        r.reason === "blocked_allowlist_missing" &&
        ycloudFetchCalls.length === 0,
      `reason=${r.reason}`,
    );
  }
} finally {
  restoreFetch();
}

console.log(`\n${results.length - failures}/${results.length} passed`);
process.exit(failures ? 1 : 0);
