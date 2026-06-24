const BANLIST_TERMS = [
  "meses sin intereses",
  "msi",
  "nasa",
  "7 paises",
  "7 países",
  "siete paises",
  "siete países",
  "trilingue",
  "trilingüe",
  "te garantizo",
  "beca asegurada",
  "100% garantizada",
  "beca del 100%",
];

const GHOST_CAREER_TERMS = [
  "contaduría",
  "contaduria",
  "arquitectura",
  "criminología",
  "criminologia",
  "diseño gráfico",
  "diseno grafico",
  "educación",
  "educacion",
];

function extractMoneyTokens(text) {
  const matches = String(text || "").match(/\$[\d,]+(?:\.\d+)?/g) || [];
  return new Set(matches.map((m) => m.replace(/,/g, "")));
}

function extractPercentTokens(text) {
  const matches = String(text || "").match(/\d+(?:\.\d+)?\s*%/g) || [];
  return new Set(matches.map((m) => m.replace(/\s+/g, "")));
}

function normalizeForCompare(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * @param {string} baseResponse
 * @param {string} candidateText
 * @param {string[]} _allowedAmounts
 */
export function validateRephrase(baseResponse, candidateText, _allowedAmounts = []) {
  const errors = [];
  const base = String(baseResponse || "");
  const candidate = String(candidateText || "");
  const lower = candidate.toLowerCase();

  for (const term of BANLIST_TERMS) {
    if (lower.includes(term) && !base.toLowerCase().includes(term)) {
      errors.push(`banned_term:${term}`);
    }
  }

  const baseAmounts = extractMoneyTokens(base);
  const candAmounts = extractMoneyTokens(candidate);
  for (const amt of candAmounts) {
    if (!baseAmounts.has(amt)) errors.push(`new_amount:${amt}`);
  }

  const basePercents = extractPercentTokens(base);
  const candPercents = extractPercentTokens(candidate);
  for (const pct of candPercents) {
    if (!basePercents.has(pct)) errors.push(`new_percent:${pct}`);
  }

  if (candidate.length > base.length * 1.4) errors.push("too_long");
  if (base.length > 20 && candidate.length < base.length * 0.5) errors.push("too_short");

  return { ok: errors.length === 0, errors };
}

/**
 * Shadow evaluation: compare suggested vs factual; flag unsupported additions.
 */
export function validateShadowSuggestion(factualResponse, suggestedResponse, sourceContext = "") {
  const warnings = [];
  const factual = String(factualResponse || "");
  const suggested = String(suggestedResponse || "");

  if (!suggested) {
    return { ok: true, errors: [], warnings };
  }

  const rephrase = validateRephrase(factual, suggested);
  for (const issue of rephrase.errors) {
    warnings.push(`unsupported_data:${issue}`);
  }

  const factualNorm = normalizeForCompare(factual);
  const suggestedNorm = normalizeForCompare(suggested);
  for (const term of GHOST_CAREER_TERMS) {
    const termNorm = normalizeForCompare(term);
    if (suggestedNorm.includes(termNorm) && !factualNorm.includes(termNorm)) {
      warnings.push(`ghost_career:${term}`);
    }
  }

  if (sourceContext && sourceContext !== "fallback" && sourceContext !== "empty_input") {
    const ctx = normalizeForCompare(sourceContext);
    if (ctx === "scholarships" && suggestedNorm.includes("100%") && !factualNorm.includes("100%")) {
      warnings.push("unsupported_claim:scholarship_100_percent");
    }
  }

  return {
    ok: warnings.length === 0,
    errors: rephrase.errors,
    warnings,
  };
}

/**
 * Rewrite gate: must pass before applying suggested as final_response.
 * @param {string} factualResponse
 * @param {string|null} suggestedResponse
 * @param {object} context - { waIntent, sourceContext }
 */
export function validateRewrite(factualResponse, suggestedResponse, context = {}) {
  const factual = String(factualResponse || "");
  const suggested = String(suggestedResponse || "");
  const errors = [];

  if (!suggested.trim()) {
    return { ok: false, errors: ["empty_suggestion"], warnings: [] };
  }

  const rephrase = validateRephrase(factual, suggested);
  errors.push(...rephrase.errors);

  const shadow = validateShadowSuggestion(factual, suggested, context.sourceContext || "");
  for (const w of shadow.warnings || []) {
    if (!errors.includes(w)) errors.push(w);
  }

  const waIntent = context.waIntent || "";
  const suggestedNorm = normalizeForCompare(suggested);

  if (waIntent === "humano" && !suggestedNorm.includes("asesor")) {
    errors.push("escalation_altered:missing_asesor");
  }

  if (waIntent === "no_se_que_estudiar") {
    if (!suggestedNorm.includes("test vocacional") && !suggestedNorm.includes("testunilatino")) {
      errors.push("vocational_altered");
    }
  }

  if (waIntent === "beca") {
    errors.push("scholarship_blocked");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings: shadow.warnings || [],
  };
}
