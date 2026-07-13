/**
 * EVA-CJ-1 — journeyState + leadAttribution + journeyMerge (§6, §7, §14.5).
 * Funciones puras; la persistencia real ocurre en upsertContactState (aditivo).
 */

import {
  IMMUTABLE_ATTRIBUTION_FIELDS,
  JOURNEY_CHAINS,
  MENU_STATE_TTL_MS,
  MENU_VERSION,
  PROTECTED_TEST_FIELDS,
} from "./constants.js";
import { isValidEnumValue } from "./schemas.js";

// ── journeyState (§14.5) ───────────────────────────────────

export function isMenuStateValid(context, nowMs = Date.now()) {
  const state = context?.menu_state;
  if (!state) return false;
  const updatedAt = Date.parse(context?.menu_updated_at || "");
  if (Number.isNaN(updatedAt)) return false;
  return nowMs - updatedAt <= MENU_STATE_TTL_MS;
}

export function buildMenuStatePatch(nextState, lastAction, nowIso) {
  return {
    menu_state: nextState,
    menu_version: MENU_VERSION,
    menu_last_action: lastAction,
    menu_updated_at: nowIso,
  };
}

// ── leadAttribution (§6, §7.1-4) ───────────────────────────

const EMPTYish = new Set([null, undefined, "", "desconocido"]);

/**
 * Primera fuente identificable. Inmutable después de establecerse (§6.1).
 * @returns patch de atribución (solo campos que SÍ deben escribirse)
 */
export function deriveAttributionPatch(existing, detection, nowIso) {
  const patch = {};
  const det = detection || {
    fuente: "eva_wa",
    metodo: "whatsapp_directo",
    contexto: "contacto_directo",
  };

  if (EMPTYish.has(existing?.eva_fuente_lead)) {
    patch.eva_fuente_lead = det.fuente;
  }
  if (EMPTYish.has(existing?.eva_metodo_captura)) {
    patch.eva_metodo_captura = det.metodo;
  }
  if (EMPTYish.has(existing?.eva_contexto_entrada)) {
    patch.eva_contexto_entrada = det.contexto;
  }
  // eva_ultimo_touch SÍ se actualiza en cada interacción confirmada (§7.3)
  patch.eva_ultimo_touch = "whatsapp";
  return patch;
}

// ── journeyMerge (§7) ──────────────────────────────────────

function chainRank(state) {
  for (const chain of JOURNEY_CHAINS) {
    const idx = chain.indexOf(state);
    if (idx >= 0) return { chain, idx };
  }
  return null;
}

/** ¿incoming degradaría a previous dentro de su misma cadena? (§7.8) */
export function isDowngrade(previousState, incomingState) {
  if (!previousState || !incomingState || previousState === incomingState) return false;
  const prev = chainRank(previousState);
  const inc = chainRank(incomingState);
  if (!prev || !inc || prev.chain !== inc.chain) return false;
  return inc.idx < prev.idx;
}

/**
 * mergeJourneyState(previousState, incomingEvent) — pura y testeable (§7).
 * previousState: snapshot actual de campos journey/atribución/protegidos.
 * incomingEvent: { fields: {campo: valor}, authorizedTestSource?: boolean }
 */
export function mergeJourneyState(previousState = {}, incomingEvent = {}) {
  const prev = previousState || {};
  const fields = incomingEvent?.fields || {};
  const authorizedTestSource = incomingEvent?.authorizedTestSource === true;

  const nextState = { ...prev };
  const changedFields = [];
  const protectedFieldsSkipped = [];
  const immutableFieldsPreserved = [];
  const warnings = [];

  for (const [key, rawValue] of Object.entries(fields)) {
    const value = rawValue;

    // §7.4 — nunca sobrescribir valores válidos con vacío/placeholder
    if (EMPTYish.has(value)) {
      if (!EMPTYish.has(prev[key])) {
        warnings.push(`skip_empty_overwrite:${key}`);
      }
      continue;
    }

    // §7.5 — campos protegidos del test
    if (PROTECTED_TEST_FIELDS.includes(key) && !authorizedTestSource) {
      if (!EMPTYish.has(prev[key])) {
        protectedFieldsSkipped.push(key);
        continue;
      }
      // Permitido establecer por primera vez SOLO si viene de fuente test;
      // sin autorización, ni siquiera primera escritura.
      protectedFieldsSkipped.push(key);
      continue;
    }

    // §7.1/§6 — inmutables una vez establecidos
    if (IMMUTABLE_ATTRIBUTION_FIELDS.includes(key) && !EMPTYish.has(prev[key])) {
      if (prev[key] !== value) immutableFieldsPreserved.push(key);
      continue;
    }

    // §7.8 — no downgrade del journey
    if (key === "eva_estado_journey" && isDowngrade(prev[key], value)) {
      warnings.push(`no_downgrade:${prev[key]}->${value}`);
      continue;
    }

    // Validación de enums canónicos
    if (!isValidEnumValue(key, value)) {
      warnings.push(`invalid_enum:${key}=${String(value).slice(0, 40)}`);
      continue;
    }

    if (nextState[key] !== value) {
      nextState[key] = value;
      changedFields.push(key);
    }
  }

  return { nextState, changedFields, protectedFieldsSkipped, immutableFieldsPreserved, warnings };
}
