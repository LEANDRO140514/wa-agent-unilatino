import { createClient } from "@insforge/sdk";

if (typeof globalThis.Deno === "undefined") {
  globalThis.Deno = {
    env: {
      get(key) {
        return process.env[key];
      },
    },
  };
}

const { handleEvaRuntimeShadow } =
  await import("../insforge/functions/eva-runtime-shadow.js");

const CONTACT_STATE_FIELDS = "wa_stage, wa_last_intent, wa_needs_human, academic_state, updated_at";

let insforgeClient;

function getInsforgeClient() {
  if (insforgeClient) return insforgeClient;

  const baseUrl = process.env.INSFORGE_BASE_URL;
  const anonKey = process.env.ANON_KEY;

  if (!baseUrl || !anonKey) {
    throw new Error("Missing INSFORGE_BASE_URL or ANON_KEY");
  }

  insforgeClient = createClient({ baseUrl, anonKey });
  return insforgeClient;
}

async function lookupContactState(normalizedPhone) {
  const client = getInsforgeClient();

  const { data, error } = await client.database
    .from("wa_contacts_state")
    .select(CONTACT_STATE_FIELDS)
    .eq("normalized_phone", normalizedPhone)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Lookup wa_contacts_state: ${error.message || String(error)}`
    );
  }

  if (!data) return null;

  return {
    ...data,
    fsm_state: null,
    closed_by_agent: false,
    fallback_count: 0,
    wa_last_outbound_text: "",
  };
}

export default {
  async fetch(request) {
    return handleEvaRuntimeShadow(request, {
      lookupContactState,
    });
  },
};
