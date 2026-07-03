/** Edge-safe path shim for bundled knowledge modules. */
export function resolve(...parts) {
  return parts.filter(Boolean).join("/");
}

export function join(...parts) {
  return parts.filter(Boolean).join("/");
}

export default { resolve, join };
