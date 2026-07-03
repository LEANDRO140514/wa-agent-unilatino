#!/usr/bin/env node
/**
 * 7G.6E-AUTH — Allowlist secret verification (no sensitive output).
 *
 * Checks GHL_LIVE_ALLOWED_PHONES from local env (never logged) and/or
 * remote runtime metadata (ghl_allowed_phones_count only).
 *
 * Usage: node tests/run-phase-7g6e-allowlist-secret-check.mjs
 * Output: tests/.phase-7g6e-allowlist-secret-check-results.json
 *
 * Env:
 *   PHASE_7G6E_ALLOWLIST_STRICT=1 — fail if env not set or E.164 invalid
 *   PHASE_7G6E_ALLOWLIST_MIN_COUNT=N — minimum count (default 1; use 3 for pilot)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_JSON = path.join(ROOT, "tests/.phase-7g6e-allowlist-secret-check-results.json");
const ENDPOINT =
  process.env.PHASE_7G6E_ENDPOINT ||
  "https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound";

const E164_RE = /^\+[1-9]\d{6,14}$/;

function parseAllowlist(raw) {
  if (!raw || !String(raw).trim()) return [];
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function validateAllowlist(phones) {
  if (phones.length === 0) {
    return { allowlist_configured: false, allowlist_count: 0, all_values_e164_like: false };
  }
  return {
    allowlist_configured: true,
    allowlist_count: phones.length,
    all_values_e164_like: phones.every((p) => E164_RE.test(p)),
  };
}

async function probeRemoteAllowlistMeta() {
  const payload = {
    event_type: "whatsapp.inbound_message.received",
    from: "+525577777777",
    to: "+529994538421",
    message_type: "text",
    message_text: "1",
    message_id: `7g6e-allowlist-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  const count = body.ghl_allowed_phones_count ?? null;
  return {
    ok: res.status === 200 && body.ok === true,
    ghl_allowed_phones_count: count,
    mode: body.mode,
    ghl_sync_mode: body.ghl_sync_mode,
  };
}

async function main() {
  console.log("7G.6E allowlist secret check (no sensitive values printed)\n");

  const envRaw = process.env.GHL_LIVE_ALLOWED_PHONES;
  const envPhones = parseAllowlist(envRaw);
  const envCheck = validateAllowlist(envPhones);
  const hasLocalEnv = envCheck.allowlist_configured;

  console.log(`Local env GHL_LIVE_ALLOWED_PHONES: ${hasLocalEnv ? "present" : "not set"}`);
  if (hasLocalEnv) {
    console.log(`  allowlist_count: ${envCheck.allowlist_count}`);
    console.log(`  all_values_e164_like: ${envCheck.all_values_e164_like}`);
  }

  const remote = await probeRemoteAllowlistMeta();
  console.log(`Remote runtime ghl_allowed_phones_count: ${remote.ghl_allowed_phones_count ?? "unknown"}`);
  console.log(`  mode=${remote.mode} ghl_sync_mode=${remote.ghl_sync_mode}`);

  const minCount = Number(process.env.PHASE_7G6E_ALLOWLIST_MIN_COUNT || "1");
  const strict = process.env.PHASE_7G6E_ALLOWLIST_STRICT === "1";
  const manualVerificationRequired = !hasLocalEnv;

  const allowlistConfigured =
    envCheck.allowlist_configured ||
    (remote.ghl_allowed_phones_count != null && remote.ghl_allowed_phones_count > 0);

  const allowlistCount = hasLocalEnv ? envCheck.allowlist_count : remote.ghl_allowed_phones_count ?? 0;

  let status = "PASS";
  const failures = [];

  if (manualVerificationRequired) {
    status = "MANUAL_VERIFICATION_REQUIRED";
    console.log("\nmanual_verification_required: InsForge secret not readable from local env");
    console.log("  → Leandro must confirm GHL_LIVE_ALLOWED_PHONES in InsForge console");
  }

  if (hasLocalEnv && !envCheck.all_values_e164_like) {
    failures.push("local allowlist contains non-E.164 values");
    status = "FAIL";
  }

  if (strict) {
    if (!hasLocalEnv) failures.push("strict mode requires GHL_LIVE_ALLOWED_PHONES in local env");
    if (allowlistCount < minCount) failures.push(`allowlist_count ${allowlistCount} < min ${minCount}`);
    if (failures.length) status = "FAIL";
  }

  const summary = {
    phase: "7G.6E-AUTH",
    timestamp: new Date().toISOString(),
    status,
    allowlist_configured: allowlistConfigured,
    allowlist_count: allowlistCount,
    all_values_e164_like: hasLocalEnv ? envCheck.all_values_e164_like : null,
    manual_verification_required: manualVerificationRequired,
    local_env_present: hasLocalEnv,
    remote_ghl_allowed_phones_count: remote.ghl_allowed_phones_count,
    strict,
    min_count: minCount,
    failures,
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2));
  console.log(`\nAllowlist check: ${status}`);
  console.log(`  allowlist_configured: ${allowlistConfigured}`);
  console.log(`  allowlist_count: ${allowlistCount}`);
  if (hasLocalEnv) console.log(`  all_values_e164_like: ${envCheck.all_values_e164_like}`);
  console.log(`Results: ${OUT_JSON}`);

  if (status === "FAIL") process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
