/**
 * Read-only InsForge client for Eva Runtime SHADOW.
 * Lookup only. Callers must not insert/update through this path.
 */

function getEnv(key) {
  if (typeof Deno !== "undefined" && Deno.env?.get) {
    const v = Deno.env.get(key);
    if (v != null) return v;
  }
  return typeof process !== "undefined" ? process.env[key] : undefined;
}

export async function createReadOnlyClient() {
  if (getEnv("WA_E2E_MOCK_DB") === "true") {
    const { getMockInsforgeClient } = await import("../test/mock-insforge-client.js");
    return getMockInsforgeClient();
  }
  const { createClient } = await import("npm:@insforge/sdk");
  const baseUrl = getEnv("INSFORGE_BASE_URL");
  const anonKey = getEnv("ANON_KEY");
  if (!baseUrl || !anonKey) {
    throw new Error("Missing INSFORGE_BASE_URL or ANON_KEY");
  }
  return createClient({ baseUrl, anonKey });
}
