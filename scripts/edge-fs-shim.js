/** Edge-safe fs shim: CAG cache unavailable in InsForge Deno runtime. */
export function existsSync() {
  return false;
}

export function readFileSync() {
  return "{}";
}

export default { existsSync, readFileSync };
