/**
 * EVA-CJ-1 — menuRegistry: definición declarativa de menús (§8–§12).
 * El menú determina navegación; el academic-engine decide la respuesta
 * factual desde source-of-truth. Cero datos factuales hardcodeados aquí.
 *
 * option → { intent (operativo existente o null), tema, journey, next,
 *            nextState, reply (texto de navegación o null si el intent
 *            operativo genera la respuesta), sendUrl }
 */

import { LANDING_CARRERAS_URL, TEST_VOCACIONAL_URL } from "./constants.js";

export const MENUS = Object.freeze({
  root: {
    text:
      "👋 ¡Hola! Soy Eva, asistente de admisiones de Universidad Latino.\n\n" +
      "¿Qué te gustaría hacer?\n\n" +
      "1️⃣ Ya sé qué carrera quiero estudiar\n" +
      "2️⃣ Todavía no sé qué estudiar\n" +
      "3️⃣ Quiero calcular mi beca y conocer la promoción\n" +
      "4️⃣ Quiero consultar otra información\n" +
      "5️⃣ Quiero hablar con un asesor\n\n" +
      "Responde solamente con el número.",
    options: {
      "1": {
        intent: null,
        tema: "carreras",
        journey: "explorando_carreras",
        next: "consultar_carrera",
        nextState: "career_options",
        reply:
          "¡Perfecto! ¿Cuál es la carrera que te interesa? Escríbeme su nombre " +
          `o explora todas aquí: ${LANDING_CARRERAS_URL}`,
        createTask: false,
      },
      "2": {
        intent: "no_se_que_estudiar",
        tema: "orientacion_vocacional",
        journey: "test_recomendado",
        next: "completar_test",
        nextState: "root",
        reply: null,
        createTask: false,
      },
      "3": {
        intent: "beca",
        tema: "becas_promocion",
        journey: "beca_consultada",
        next: "calcular_beca",
        nextState: "root",
        reply: null,
        appendUrl: `Puedes calcular tu posible beca aquí: ${LANDING_CARRERAS_URL}`,
        createTask: null, // null = conservar política vigente del intent
      },
      "4": {
        intent: null,
        tema: "otra_duda",
        journey: "menu_mostrado",
        next: "ninguna",
        nextState: "info_catalog",
        reply: "__MENU__info_catalog",
        createTask: false,
      },
      "5": {
        intent: "humano",
        tema: "asesor",
        journey: "asesor_solicitado",
        next: "contactar_asesor",
        nextState: "root",
        reply: null,
        createTask: null, // conservar escalamiento/task vigentes
      },
    },
  },

  info_catalog: {
    text:
      "¿En qué te puedo ayudar?\n\n" +
      "1️⃣ Carreras\n" +
      "2️⃣ Becas y promoción\n" +
      "3️⃣ Requisitos\n" +
      "4️⃣ Modalidades y horarios\n" +
      "5️⃣ Inscripción\n" +
      "6️⃣ Ubicación y visitas\n" +
      "7️⃣ Otra duda\n" +
      "8️⃣ Hablar con un asesor\n" +
      "0️⃣ Menú principal",
    options: {
      "1": { intent: "carreras_disponibles", tema: "carreras", journey: "explorando_carreras", next: "mostrar_carreras", nextState: "career_options", reply: null, createTask: false },
      "2": { intent: "beca", tema: "becas_promocion", journey: "beca_consultada", next: "calcular_beca", nextState: "info_catalog", reply: null, createTask: null },
      "3": { intent: "requisitos", tema: "requisitos", journey: "requisitos_consultados", next: "revisar_requisitos", nextState: "requirements_options", reply: null, createTask: false },
      "4": { intent: "modalidades", tema: "modalidades_horarios", journey: "modalidad_consultada", next: "revisar_modalidad", nextState: "modality_options", reply: null, createTask: false },
      "5": { intent: null, tema: "inscripcion", journey: "inscripcion_solicitada", next: "iniciar_inscripcion", nextState: "enrollment_options", reply: "¡Excelente decisión! Un asesor te acompañará en tu proceso de inscripción. ¿Confirmas que quieres iniciar tu inscripción? Responde SÍ para conectarte con un asesor.", createTask: false },
      "6": { intent: "ubicacion", tema: "ubicacion_visita", journey: "visita_solicitada", next: "agendar_visita", nextState: "location_options", reply: null, createTask: false },
      "7": { intent: null, tema: "otra_duda", journey: "menu_mostrado", next: "ninguna", nextState: "info_catalog", reply: "Cuéntame, ¿cuál es tu duda? Escríbela con confianza y te ayudo. 😊", createTask: false },
      "8": { intent: "humano", tema: "asesor", journey: "asesor_solicitado", next: "contactar_asesor", nextState: "root", reply: null, createTask: null },
    },
  },

  from_careers: {
    text:
      "👋 ¡Hola! Soy Eva.\n\n" +
      "Veo que estabas revisando nuestras carreras.\n\n" +
      "¿En qué te puedo ayudar?\n\n" +
      "1️⃣ Consultar una carrera\n" +
      "2️⃣ Revisar costos y becas\n" +
      "3️⃣ Conocer modalidades y horarios\n" +
      "4️⃣ Revisar requisitos\n" +
      "5️⃣ Iniciar inscripción\n" +
      "6️⃣ Hablar con un asesor\n" +
      "0️⃣ Menú principal",
    options: {
      "1": { intent: null, tema: "carreras", journey: "explorando_carreras", next: "consultar_carrera", nextState: "career_options", reply: "¡Claro! ¿Cuál carrera te interesa? Escríbeme su nombre y te comparto la información.", createTask: false },
      "2": { intent: "beca", tema: "becas_promocion", journey: "beca_consultada", next: "calcular_beca", nextState: "from_careers", reply: null, createTask: null },
      "3": { intent: "modalidades", tema: "modalidades_horarios", journey: "modalidad_consultada", next: "revisar_modalidad", nextState: "from_careers", reply: null, createTask: false },
      "4": { intent: "requisitos", tema: "requisitos", journey: "requisitos_consultados", next: "revisar_requisitos", nextState: "from_careers", reply: null, createTask: false },
      "5": { intent: null, tema: "inscripcion", journey: "inscripcion_solicitada", next: "iniciar_inscripcion", nextState: "enrollment_options", reply: "¡Excelente decisión! ¿Confirmas que quieres iniciar tu proceso de inscripción? Responde SÍ y te conecto con un asesor para acompañarte.", createTask: false },
      "6": { intent: "humano", tema: "asesor", journey: "asesor_solicitado", next: "contactar_asesor", nextState: "root", reply: null, createTask: null },
    },
  },

  from_calculator: {
    text:
      "👋 ¡Hola! Soy Eva.\n\n" +
      "Veo que estabas revisando nuestra calculadora de becas y los beneficios disponibles.\n\n" +
      "¿Qué quieres hacer?\n\n" +
      "1️⃣ Calcular o revisar mi posible beca\n" +
      "2️⃣ Consultar el costo de una carrera\n" +
      "3️⃣ Confirmar el beneficio con un asesor\n" +
      "4️⃣ Iniciar inscripción\n" +
      "5️⃣ Hablar con un asesor\n" +
      "0️⃣ Menú principal",
    options: {
      "1": { intent: "beca", tema: "becas_promocion", journey: "beca_consultada", next: "calcular_beca", nextState: "from_calculator", reply: null, appendUrl: `Puedes calcular tu posible beca aquí: ${LANDING_CARRERAS_URL}`, createTask: null },
      "2": { intent: null, tema: "carreras", journey: "explorando_carreras", next: "consultar_carrera", nextState: "career_options", reply: "¡Claro! ¿De qué carrera quieres conocer el costo? Escríbeme su nombre.", createTask: false },
      "3": { intent: "humano", tema: "becas_promocion", journey: "asesor_solicitado", next: "confirmar_beneficio", nextState: "root", reply: null, createTask: null },
      "4": { intent: null, tema: "inscripcion", journey: "inscripcion_solicitada", next: "iniciar_inscripcion", nextState: "enrollment_options", reply: "¡Excelente decisión! ¿Confirmas que quieres iniciar tu proceso de inscripción? Responde SÍ y te conecto con un asesor.", createTask: false },
      "5": { intent: "humano", tema: "asesor", journey: "asesor_solicitado", next: "contactar_asesor", nextState: "root", reply: null, createTask: null },
    },
  },

  from_test: {
    text:
      "👋 ¡Hola! Soy Eva.\n\n" +
      "Veo que estabas revisando nuestro Test Vocacional.\n\n" +
      "¿En qué te ayudo?\n\n" +
      "1️⃣ Quiero hacer el test\n" +
      "2️⃣ Tengo una duda sobre el test\n" +
      "3️⃣ Ya hice el test\n" +
      "4️⃣ Quiero ver las carreras\n" +
      "5️⃣ Hablar con un asesor\n" +
      "0️⃣ Menú principal",
    options: {
      "1": { intent: "no_se_que_estudiar", tema: "orientacion_vocacional", journey: "test_recomendado", next: "completar_test", nextState: "from_test", reply: null, createTask: false },
      "2": { intent: "duda_test", tema: "orientacion_vocacional", journey: "test_recomendado", next: "dar_seguimiento", nextState: "from_test", reply: null, createTask: null },
      "3": { intent: null, tema: "orientacion_vocacional", journey: "test_completado", next: "revisar_resultado", nextState: "from_test", reply: "¡Qué bien que ya hiciste el test! 🎯 Cuéntame, ¿qué carrera te recomendó? Con eso te comparto la información sin pedirte datos de nuevo.", createTask: false },
      "4": { intent: "carreras_disponibles", tema: "carreras", journey: "explorando_carreras", next: "mostrar_carreras", nextState: "career_options", reply: null, createTask: false },
      "5": { intent: "humano", tema: "asesor", journey: "asesor_solicitado", next: "contactar_asesor", nextState: "root", reply: null, createTask: null },
    },
  },
});

/** Menús sin opciones propias: estados de conversación libre guiada. */
export const PASSTHROUGH_STATES = Object.freeze([
  "career_options",
  "modality_options",
  "requirements_options",
  "enrollment_options",
  "location_options",
]);

export function getMenu(state) {
  return MENUS[state] || null;
}
