/**
 * EVA-CJ-1 — schemas: validación de enums canónicos y sanitización (§20).
 */

import {
  CONTEXTOS_ENTRADA,
  FUENTES_LEAD,
  JOURNEY_STATES,
  MENU_STATES,
  METODOS_CAPTURA,
  NEXT_ACTIONS,
  TEMAS_ATENCION,
  ULTIMO_TOUCH,
} from "./constants.js";

const ENUM_BY_FIELD = Object.freeze({
  eva_fuente_lead: FUENTES_LEAD,
  eva_metodo_captura: METODOS_CAPTURA,
  eva_contexto_entrada: CONTEXTOS_ENTRADA,
  eva_ultimo_touch: ULTIMO_TOUCH,
  eva_tema_atencion: TEMAS_ATENCION,
  eva_estado_journey: JOURNEY_STATES,
  eva_siguiente_accion: NEXT_ACTIONS,
  menu_state: MENU_STATES,
});

export function isValidEnumValue(field, value) {
  const allowed = ENUM_BY_FIELD[field];
  if (!allowed) return true; // campo no-enum (timestamps, versiones, libres)
  return allowed.includes(value);
}

export function sanitizeJourneyFields(fields = {}) {
  const clean = {};
  const rejected = [];
  for (const [key, value] of Object.entries(fields)) {
    if (isValidEnumValue(key, value)) clean[key] = value;
    else rejected.push(key);
  }
  return { clean, rejected };
}
