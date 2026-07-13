/**
 * EVA-CJ-1 — Constantes canónicas del customer journey dirigido.
 * Fuente única de enums; schemas.js valida contra estas listas.
 * Sin LLM, sin I/O. Autoridad factual: academic-engine/source-of-truth.
 */

export const MENU_VERSION = "cj1_v1";
export const MENU_STATE_TTL_MS = 24 * 60 * 60 * 1000; // 24h (§14.5)

export const TEST_VOCACIONAL_URL = "https://testunilatino.algorithmus.io/";
export const LANDING_CARRERAS_URL = "https://carreras.unilatino.algorithmus.io/";

export const FUENTES_LEAD = Object.freeze([
  "eva_wa",
  "landing_carreras",
  "test_vocacional",
  "desconocido",
]);

export const METODOS_CAPTURA = Object.freeze([
  "whatsapp_directo",
  "whatsapp_cta",
  "meta_click_to_whatsapp",
  "formulario_landing",
  "calculadora_becas",
  "registro_test",
  "finalizacion_test",
  "desconocido",
]);

export const CONTEXTOS_ENTRADA = Object.freeze([
  "contacto_directo",
  "exploracion_carreras",
  "carrera_especifica",
  "calculadora_becas",
  "costos_promocion",
  "orientacion_vocacional",
  "duda_test",
  "post_test",
  "inscripcion",
  "asesor",
  "desconocido",
]);

export const ULTIMO_TOUCH = Object.freeze([
  "whatsapp",
  "landing_carreras",
  "calculadora_becas",
  "test_vocacional",
  "asesor",
  "desconocido",
]);

export const TEMAS_ATENCION = Object.freeze([
  "carreras",
  "orientacion_vocacional",
  "becas_promocion",
  "requisitos",
  "modalidades_horarios",
  "inscripcion",
  "ubicacion_visita",
  "otra_duda",
  "asesor",
]);

/** Orden = ranking parcial para no-downgrade (§7.8). Estados de ramas
 *  distintas no se comparan entre sí; solo dentro de su cadena. */
export const JOURNEY_STATES = Object.freeze([
  "lead_capturado",
  "menu_mostrado",
  "explorando_carreras",
  "carrera_identificada",
  "test_recomendado",
  "test_iniciado",
  "test_completado",
  "beca_consultada",
  "beca_calculada",
  "requisitos_consultados",
  "modalidad_consultada",
  "inscripcion_solicitada",
  "visita_solicitada",
  "asesor_solicitado",
  "asesor_asignado",
]);

/** Cadenas de progreso: dentro de cada cadena no se permite retroceder. */
export const JOURNEY_CHAINS = Object.freeze([
  ["lead_capturado", "menu_mostrado"],
  ["explorando_carreras", "carrera_identificada"],
  ["test_recomendado", "test_iniciado", "test_completado"],
  ["beca_consultada", "beca_calculada"],
  ["asesor_solicitado", "asesor_asignado"],
]);

export const NEXT_ACTIONS = Object.freeze([
  "mostrar_carreras",
  "consultar_carrera",
  "completar_test",
  "revisar_resultado",
  "calcular_beca",
  "confirmar_beneficio",
  "revisar_modalidad",
  "revisar_requisitos",
  "iniciar_inscripcion",
  "agendar_visita",
  "contactar_asesor",
  "dar_seguimiento",
  "ninguna",
]);

/** Campos del test protegidos (§7.5): solo la fuente autorizada del test escribe. */
export const PROTECTED_TEST_FIELDS = Object.freeze([
  "carrera_recomendada",
  "match_percent",
  "sector_principal",
  "dictamen_url",
  "test_completed_at",
  "test_version",
  "respuestas_crudas",
  "dictamen_text",
  "top_programs",
  "oq_resumen",
]);

/** Campos de atribución inmutables una vez establecidos (≠ desconocido). */
export const IMMUTABLE_ATTRIBUTION_FIELDS = Object.freeze([
  "eva_fuente_lead",
  "eva_metodo_captura",
  "eva_contexto_entrada",
]);

export const MENU_STATES = Object.freeze([
  "root",
  "info_catalog",
  "from_careers",
  "from_calculator",
  "from_test",
  "career_options",
  "modality_options",
  "requirements_options",
  "enrollment_options",
  "location_options",
]);
