/**
 * EVA-CJ-1 — ghlJourneyPreview (§6, §17): payload dry-run de los campos
 * de journey que SE ESCRIBIRÍAN en GHL. Cero llamadas de red, cero writes.
 * GHL_EVA_JOURNEY_FIELD_MAP es una PROPUESTA separada; no toca
 * GHL_WA_FIELD_MAP.
 */

/** Propuesta de field map (key lógica → nombre visible sugerido en GHL). */
export const GHL_EVA_JOURNEY_FIELD_MAP_PROPOSAL = Object.freeze({
  eva_fuente_lead: "Eva - Fuente del lead",
  eva_metodo_captura: "Eva - Método de captura",
  eva_contexto_entrada: "Eva - Contexto de entrada",
  eva_ultimo_touch: "Eva - Último touch",
  eva_tema_atencion: "Eva - Tema de atención",
  eva_estado_journey: "Eva - Estado del journey",
  eva_siguiente_accion: "Eva - Siguiente acción",
});

/**
 * custom_fields_journey_preview: qué campos se escribirían, sin ejecutar.
 * @returns {{ would_write: boolean, reason: string, fields: object[] }}
 */
export function buildJourneyFieldsPreview(journeySnapshot = {}, config = {}) {
  const fields = Object.keys(GHL_EVA_JOURNEY_FIELD_MAP_PROPOSAL)
    .filter((key) => journeySnapshot[key] != null && journeySnapshot[key] !== "")
    .map((key) => ({
      key,
      proposed_ghl_name: GHL_EVA_JOURNEY_FIELD_MAP_PROPOSAL[key],
      value: journeySnapshot[key],
    }));

  const flagOn = config.ghlWriteJourneyFields === true;
  return {
    would_write: false, // esta fase NUNCA escribe (§4)
    reason: flagOn
      ? "GHL_WRITE_JOURNEY_FIELDS=true pero la fase EVA-CJ-1 es dry-run: preview solamente"
      : "GHL_WRITE_JOURNEY_FIELDS=false (default)",
    mode: "custom_fields_journey_preview",
    fields,
  };
}
