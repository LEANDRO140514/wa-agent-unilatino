/**
 * Pipeline §11.1 — notOfferedResolver (Fase 1 ítem 4).
 * Consume catalog-sot.js exclusivamente (N1).
 */

import { normalizeInput } from "./normalizer.js";
import {
  ADMIN_AMBIGUOUS_RULE,
  MODALITY_RULES_BY_PROGRAM,
  buildAdminAmbiguousQuestion,
  buildDemandRegistrationNote,
  buildEightStepNotOfferedResponse,
  buildInvalidLevelResponse,
  buildModalityChoiceQuestion,
  buildTypoConfirmationQuestion,
  detectExpectedNotOfferedDemand,
  detectInvalidModalityRequest,
  getTypoCandidateOfferedCareers,
  matchAdminAmbiguous,
  matchCareerAlias,
  matchExactOfferedCareer,
  matchesInvalidLevel,
} from "./catalog-sot.js";

const TYPO_MAX_DISTANCE = 2;
const TYPO_MIN_WORD_LEN = 5;

const YES_PHRASES = ["si", "sí", "yes", "correcto", "exacto", "confirmo", "afirmativo"];
const NO_PHRASES = ["no", "nop", "nel", "no gracias", "negativo"];

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function isYes(rawText) {
  const n = normalizeInput(rawText);
  return YES_PHRASES.some((p) => n === p || n.startsWith(`${p} `));
}

function isNo(rawText) {
  const n = normalizeInput(rawText);
  return NO_PHRASES.some((p) => n === p || n.startsWith(`${p} `));
}

function extractCareerToken(rawText) {
  const raw = String(rawText || "").trim();
  const n = normalizeInput(raw);
  const studyMatch = raw.match(
    /(?:quiero estudiar|me interesa|estudiar|licenciatura en|carrera de)\s+([a-záéíóúñü\s]{3,40})/i,
  );
  if (studyMatch) return studyMatch[1].trim();
  if (n.split(" ").length <= 3 && n.length >= 4) return raw;
  return null;
}

function findTypoOfferedCareer(rawText) {
  const n = normalizeInput(rawText);
  const tokens = n.split(/\s+/).filter((t) => t.length >= TYPO_MIN_WORD_LEN);
  const candidates = getTypoCandidateOfferedCareers();

  for (const token of tokens) {
    for (const career of candidates) {
      if (token === career.normalized) continue;
      const dist = levenshtein(token, career.normalized);
      const threshold = career.normalized.length >= 8 ? TYPO_MAX_DISTANCE : 1;
      if (dist > 0 && dist <= threshold) {
        return {
          suggestedCareer: career.programa_base || career.name,
          token,
        };
      }
    }
  }
  return null;
}

function buildDemandTags({ isUnknown, insistenceHuman = false }) {
  const tags = ["eva-wa", "wa_career_not_offered", "wa_market_signal_career_demand"];
  if (isUnknown) tags.push("wa_requested_unknown_career");
  if (insistenceHuman) tags.push("wa_needs_human_career_not_offered");
  return tags;
}

function enrichDecision(base) {
  return {
    priority: "low",
    escalation_required: false,
    operational_owner: "Equipo de Admisiones Universidad Latino",
    business_hours_label: "Lunes a viernes 9:00-18:00, sábado 9:00-13:00",
    after_hours_logic_enabled: false,
    task_priority_label: "Baja",
    menu_option_detected: false,
    menu_option_value: null,
    ...base,
  };
}

function buildNotOfferedDecision({
  rawText,
  demand,
  isUnknown = false,
  insistenceHuman = false,
  requestedCareerRaw,
}) {
  const literal = requestedCareerRaw || demand?.requestedCareerRaw || String(rawText || "").trim();
  const responseText = buildEightStepNotOfferedResponse({
    requestedCareerRaw: literal,
    displayLabel: demand?.label || literal,
    alternatives: demand?.alternatives || [],
    relatedArea: demand?.relatedArea || "un área relacionada",
  });

  return enrichDecision({
    intent: insistenceHuman ? "humano" : "carrera_no_ofertada",
    responseText: insistenceHuman
      ? "Entiendo 😊 Te canalizo con un asesor para orientarte sobre tu interés y las alternativas disponibles."
      : responseText,
    waStage: insistenceHuman ? "asesor_requerido" : "carrera_no_ofertada",
    needsHuman: insistenceHuman,
    createTask: insistenceHuman,
    requested_career_raw: literal,
    not_offered_id: demand?.id || (isUnknown ? "unknown" : null),
    not_offered_unknown: isUnknown,
    ghl_tags: buildDemandTags({ isUnknown, insistenceHuman }),
    ghl_note: buildDemandRegistrationNote(literal, demand?.id || null, isUnknown),
    demand_note_key: literal.toLowerCase(),
  });
}

function resolvePendingConfirmation(rawText, pending) {
  if (pending.kind === "typo_confirm") {
    if (isYes(rawText)) {
      return {
        action: "decision",
        decision: enrichDecision({
          intent: "carrera_interes",
          responseText:
            `¡Perfecto! Te oriento sobre ${pending.suggested_career} 😊\n\n` +
            "¿Me compartes tu nombre y si buscas iniciar licenciatura próximamente?",
          waStage: "carrera_interes",
          needsHuman: false,
          createTask: false,
        }),
        academicStatePatch: {
          pending_career_confirmation: null,
          current_career: pending.suggested_career,
          last_career: pending.suggested_career,
        },
      };
    }
    if (isNo(rawText)) {
      const literal = pending.raw_token || pending.raw_text;
      return {
        action: "decision",
        decision: buildNotOfferedDecision({
          rawText: pending.raw_text || rawText,
          demand: {
            requestedCareerRaw: literal,
            label: literal,
            alternatives: [],
            relatedArea: "un área relacionada",
            responseText: buildEightStepNotOfferedResponse({
              requestedCareerRaw: literal,
              displayLabel: literal,
              alternatives: [],
            }),
          },
          isUnknown: true,
        }),
        academicStatePatch: { pending_career_confirmation: null },
      };
    }
  }

  if (pending.kind === "admin_ambiguous") {
    const n = normalizeInput(rawText);
    if (n.includes("sabatina")) {
      return {
        action: "decision",
        decision: enrichDecision({
          intent: "carrera_interes",
          responseText:
            "¡Excelente elección! Te oriento sobre Administración Sabatina 😊 ¿Me compartes tu nombre?",
          waStage: "carrera_interes",
          needsHuman: false,
          createTask: false,
        }),
        academicStatePatch: {
          pending_career_confirmation: null,
          current_career: "Administración Sabatina",
        },
      };
    }
    if (n.includes("online") || n.includes("linea") || n.includes("desarrollo")) {
      return {
        action: "decision",
        decision: enrichDecision({
          intent: "carrera_interes",
          responseText:
            "¡Excelente elección! Te oriento sobre Administración y Desarrollo Empresarial Online 😊 ¿Me compartes tu nombre?",
          waStage: "carrera_interes",
          needsHuman: false,
          createTask: false,
        }),
        academicStatePatch: {
          pending_career_confirmation: null,
          current_career: "Administración y Desarrollo Empresarial Online",
        },
      };
    }
  }

  return {
    action: "decision",
    decision: enrichDecision({
      intent: "carrera_confirmacion",
      responseText:
        pending.kind === "admin_ambiguous"
          ? buildAdminAmbiguousQuestion()
          : buildTypoConfirmationQuestion(pending.suggested_career),
      waStage: "carrera_interes",
      needsHuman: false,
      createTask: false,
      ghlSuppress: true,
    }),
    academicStatePatch: { pending_career_confirmation: pending },
    ghlSuppress: true,
  };
}

function trackInsistence(academicState, demandKey) {
  const counts = { ...(academicState?.not_offered_request_counts || {}) };
  counts[demandKey] = (counts[demandKey] || 0) + 1;
  return counts;
}

function detectUnknownCareer(rawText) {
  const token = extractCareerToken(rawText);
  if (!token) return null;
  if (matchExactOfferedCareer(token)) return null;
  if (detectExpectedNotOfferedDemand(token)) return null;
  if (matchCareerAlias(token)) return null;
  if (matchesInvalidLevel(rawText)) return null;
  if (normalizeInput(token).length < 4) return null;
  return { requestedCareerRaw: token.trim(), label: token.trim() };
}

export function isNotOfferedFeatureEnabled(config) {
  return config?.ffNotOffered !== false;
}

export function mergeAcademicStatePatch(academicState, patch) {
  if (!patch) return academicState || {};
  return { ...(academicState || {}), ...patch };
}

/**
 * @returns {{ action: string, decision?: object, academicStatePatch?: object, ghlSuppress?: boolean }}
 */
export function resolveNotOfferedTurn({ rawText, academicState = {}, config = {} }) {
  if (!isNotOfferedFeatureEnabled(config)) {
    return { action: "none" };
  }

  const pending = academicState?.pending_career_confirmation;
  if (pending) {
    return resolvePendingConfirmation(rawText, pending);
  }

  if (!rawText || !String(rawText).trim()) {
    return { action: "none" };
  }

  if (matchAdminAmbiguous(rawText)) {
    return {
      action: "decision",
      decision: enrichDecision({
        intent: "carrera_confirmacion",
        responseText: buildAdminAmbiguousQuestion(),
        waStage: "carrera_interes",
        needsHuman: false,
        createTask: false,
        ghlSuppress: true,
      }),
      academicStatePatch: {
        pending_career_confirmation: {
          kind: "admin_ambiguous",
          programs: ADMIN_AMBIGUOUS_RULE.programs,
        },
      },
      ghlSuppress: true,
    };
  }

  const exact = matchExactOfferedCareer(rawText);
  if (exact) {
    const invalidModality = detectInvalidModalityRequest(rawText);
    if (invalidModality) {
      return {
        action: "decision",
        decision: enrichDecision({
          intent: "modalidad_invalida",
          responseText: invalidModality.responseText,
          waStage: "carrera_interes",
          needsHuman: false,
          createTask: false,
          requested_career_raw: invalidModality.requestedCareerRaw,
          ghl_tags: ["eva-wa", "wa_requested_invalid_modality"],
        }),
      };
    }
    return { action: "none" };
  }

  const alias = matchCareerAlias(rawText);
  if (alias) {
    const rule = MODALITY_RULES_BY_PROGRAM[alias.resolveTo];
    if (alias.askModality && rule?.labels) {
      return {
        action: "decision",
        decision: enrichDecision({
          intent: "carrera_interes",
          responseText: buildModalityChoiceQuestion(alias.resolveTo, rule.labels),
          waStage: "carrera_interes",
          needsHuman: false,
          createTask: false,
        }),
        academicStatePatch: {
          current_career: alias.resolveTo,
          last_career: alias.resolveTo,
        },
      };
    }
    return {
      action: "decision",
      decision: enrichDecision({
        intent: "carrera_interes",
        responseText:
          `¡Excelente! Te oriento sobre ${alias.resolveTo} 😊\n\n` +
          "¿Me compartes tu nombre y si buscas iniciar licenciatura próximamente?",
        waStage: "carrera_interes",
        needsHuman: false,
        createTask: false,
      }),
      academicStatePatch: {
        current_career: alias.resolveTo,
        last_career: alias.resolveTo,
      },
    };
  }

  const typo = findTypoOfferedCareer(rawText);
  if (typo) {
    return {
      action: "decision",
      decision: enrichDecision({
        intent: "carrera_confirmacion",
        responseText: buildTypoConfirmationQuestion(typo.suggestedCareer),
        waStage: "carrera_interes",
        needsHuman: false,
        createTask: false,
        ghlSuppress: true,
      }),
      academicStatePatch: {
        pending_career_confirmation: {
          kind: "typo_confirm",
          suggested_career: typo.suggestedCareer,
          raw_token: typo.token,
          raw_text: rawText,
        },
      },
      ghlSuppress: true,
    };
  }

  const invalidModality = detectInvalidModalityRequest(rawText);
  if (invalidModality) {
    return {
      action: "decision",
      decision: enrichDecision({
        intent: "modalidad_invalida",
        responseText: invalidModality.responseText,
        waStage: "carrera_interes",
        needsHuman: false,
        createTask: false,
        requested_career_raw: invalidModality.requestedCareerRaw,
        ghl_tags: ["eva-wa", "wa_requested_invalid_modality"],
      }),
    };
  }

  if (matchesInvalidLevel(rawText)) {
    return {
      action: "decision",
      decision: enrichDecision({
        intent: "niveles_no_principales",
        responseText: buildInvalidLevelResponse(),
        waStage: "nivel_no_principal",
        needsHuman: false,
        createTask: false,
        ghl_tags: ["eva-wa", "wa_requested_invalid_level"],
      }),
    };
  }

  const demand = detectExpectedNotOfferedDemand(rawText);
  if (demand) {
    const demandKey = demand.id || normalizeInput(demand.requestedCareerRaw);
    const counts = trackInsistence(academicState, demandKey);
    const insistenceHuman = counts[demandKey] >= 2;
    return {
      action: "decision",
      decision: buildNotOfferedDecision({ rawText, demand, insistenceHuman }),
      academicStatePatch: {
        not_offered_request_counts: counts,
        not_offered_career_requested: demand.requestedCareerRaw,
      },
    };
  }

  const unknown = detectUnknownCareer(rawText);
  if (unknown) {
    const demandKey = `unknown:${normalizeInput(unknown.requestedCareerRaw)}`;
    const counts = trackInsistence(academicState, demandKey);
    const insistenceHuman = counts[demandKey] >= 2;
    return {
      action: "decision",
      decision: buildNotOfferedDecision({
        rawText,
        demand: {
          requestedCareerRaw: unknown.requestedCareerRaw,
          label: unknown.label,
          alternatives: [],
          relatedArea: "un área relacionada",
          responseText: buildEightStepNotOfferedResponse({
            requestedCareerRaw: unknown.requestedCareerRaw,
            displayLabel: unknown.label,
            alternatives: [],
          }),
        },
        isUnknown: true,
        insistenceHuman,
      }),
      academicStatePatch: {
        not_offered_request_counts: counts,
        not_offered_career_requested: unknown.requestedCareerRaw,
      },
    };
  }

  return { action: "none" };
}

export function shouldSkipDemandNote(existingLogs, phone, demandNoteKey, timestampIso) {
  if (!phone || !demandNoteKey || !Array.isArray(existingLogs)) return false;
  const day = String(timestampIso || "").slice(0, 10);
  const keyNorm = normalizeInput(demandNoteKey);
  return existingLogs.some((row) => {
    if (row.normalized_phone !== phone) return false;
    const rowDay = String(row.created_at || row.timestamp || "").slice(0, 10);
    if (rowDay && day && rowDay !== day) return false;
    const note = String(row.payload?.note || row.would_add_note || "");
    return normalizeInput(note).includes(keyNorm);
  });
}
