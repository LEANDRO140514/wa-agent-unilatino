# customer-journey — EVA-CJ-1

Journey dirigido y atribución de tres fuentes. Determinista, sin LLM,
sin I/O (el handler inyecta contexto y persiste patches).

| Archivo | Responsabilidad |
| --- | --- |
| constants.js | Enums canónicos, MENU_VERSION, TTL, campos protegidos/inmutables |
| sourceDetector.js | Origen por prefill (§13): normalización + señales, confidence/evidence |
| menuRegistry.js | Menús declarativos (§8-12): textos, opciones, mapeos |
| menuRouter.js | Números por estado, comandos globales/permanentes, legacy, fallback null |
| journeyMerge.js | mergeJourneyState (§7): precedencia, inmutables, protegidos, no-downgrade |
| journeyState.js / leadAttribution.js | Re-exports (§20) de journeyMerge |
| schemas.js | Validación de enums, sanitización |
| ghlJourneyPreview.js | custom_fields_journey_preview dry-run + GHL_EVA_JOURNEY_FIELD_MAP propuesto |
| index.js | resolveGuidedJourneyTurn(): la única entrada que usa el handler |

Flags (§4, defaults false): EVA_GUIDED_JOURNEY_ENABLED,
EVA_LEAD_ATTRIBUTION_ENABLED, GHL_WRITE_JOURNEY_FIELDS.

Principios: fuente ≠ método ≠ canal ≠ tema · el menú navega, el
academic-engine responde · lenguaje libre siempre disponible ·
menu_journey no está en RELEVANT_INTENTS → sin side-effects GHL.
