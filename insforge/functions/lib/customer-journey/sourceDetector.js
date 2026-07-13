/**
 * EVA-CJ-1 — sourceDetector: origen del lead por mensaje prefill (§13).
 * Determinista, sin LLM. Tolerante: normaliza y matchea por conjuntos de
 * señales, no por coincidencia exacta. Sin evidencia suficiente → null
 * (nunca adivinar que vino de una landing).
 */

export function normalizeText(raw) {
  return String(raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Reglas ordenadas por especificidad. Cada regla: señales requeridas
 * (todas presentes) sobre el texto normalizado.
 */
const RULES = [
  {
    id: "post_test_cta",
    requires: [["ya hice", "ya complete", "ya termine"], ["test"]],
    result: {
      fuente: "test_vocacional",
      metodo: "whatsapp_cta",
      contexto: "post_test",
      menu: "from_test",
    },
  },
  {
    id: "test_cta",
    requires: [["test vocacional", "test de orientacion"], ["vengo", "estaba", "necesito orientacion", "quiero orientacion", "revisando"]],
    result: {
      fuente: "test_vocacional",
      metodo: "whatsapp_cta",
      contexto: "orientacion_vocacional",
      menu: "from_test",
    },
  },
  {
    id: "calculadora_cta",
    requires: [["calculadora"], ["beca", "becas", "beneficio", "beneficios"]],
    result: {
      fuente: "landing_carreras",
      metodo: "whatsapp_cta",
      contexto: "calculadora_becas",
      menu: "from_calculator",
    },
  },
  {
    id: "carreras_cta",
    requires: [["pagina de carreras", "web de carreras", "sitio de carreras", "vengo de la pagina", "vengo de carreras", "estaba revisando sus carreras", "revisando nuestras carreras"]],
    result: {
      fuente: "landing_carreras",
      metodo: "whatsapp_cta",
      contexto: "exploracion_carreras",
      menu: "from_careers",
    },
  },
];

/**
 * @returns {null | {fuente, metodo, contexto, menu, confidence, evidence}}
 */
export function detectSourceFromMessage(rawText) {
  const normalized = normalizeText(rawText);
  if (!normalized) return null;

  for (const rule of RULES) {
    const evidence = [];
    const allGroupsHit = rule.requires.every((group) => {
      const hit = group.find((signal) => normalized.includes(signal));
      if (hit) evidence.push(hit);
      return Boolean(hit);
    });
    if (allGroupsHit) {
      return {
        ...rule.result,
        confidence: rule.requires.length >= 2 ? "high" : "medium",
        evidence: { rule: rule.id, signals: evidence },
      };
    }
  }
  return null;
}
