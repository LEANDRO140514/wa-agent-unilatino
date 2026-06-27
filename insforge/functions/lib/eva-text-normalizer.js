/**
 * Deterministic typo / phonetic corrections for Eva WA classifier (no LLM).
 */

const TYPO_CORRECTIONS = [
  ["unicacion", "ubicacion"],
  ["ubicasion", "ubicacion"],
  ["medicida", "medicina"],
  ["uiversidad", "universidad"],
  ["maestrias", "maestria"],
  ["revalidacion", "revalidacion"],
  ["acreditacion", "acreditacion"],
  ["promocion", "promocion"],
  ["promociones", "promociones"],
  ["convalidacion", "convalidacion"],
  ["equivalencias", "equivalencias"],
  ["posgrado", "posgrado"],
  ["postgrado", "posgrado"],
];

function applyTypoCorrections(rawText) {
  let text = String(rawText || "");
  for (const [from, to] of TYPO_CORRECTIONS) {
    if (text.toLowerCase().includes(from)) {
      const re = new RegExp(from, "gi");
      text = text.replace(re, to);
    }
  }
  return text;
}

module.exports = { applyTypoCorrections, TYPO_CORRECTIONS };
