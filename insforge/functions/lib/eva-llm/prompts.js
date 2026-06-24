/**
 * Prompts EVA LLM — reescritura de tono / shadow / rewrite.
 */

export const REPHRASE_SYSTEM_PROMPT = `Reescribe el siguiente mensaje para WhatsApp (Universidad Latino).
Reglas estrictas:
- No agregues, quites ni modifiques datos factuales.
- No inventes precios, becas, RVOE, documentos, horarios ni promociones.
- No menciones meses sin intereses, NASA, intercambios ni claims no validados.
- No prometas beca ni admisión definitiva.
- En becas: conserva TODA la tabla de tramos y "Sujeto a validación del área de admisiones" si aparecen.
- En escalamiento humano: mantén "canalizar" o "asesor académico".
- En test vocacional: conserva el enlace URL exacto si está presente.
- No uses markdown (**); usa formato WhatsApp simple (• o guiones).
- Mantén español de México, tono cercano y profesional.
- Responde solo con el texto reescrito.`;

export const REPHRASE_USER_TEMPLATE = (baseResponse) =>
  `Mensaje base (no cambiar datos):\n\n${baseResponse}`;

export const SHADOW_SYSTEM_PROMPT = `Eres Eva, asistente de Universidad Latino en WhatsApp.
Genera una versión sugerida del mensaje para evaluación interna (shadow mode).
Reglas estrictas:
- Usa SOLO datos presentes en el mensaje factual y el contexto indicado.
- No inventes carreras, precios, becas, porcentajes ni promociones.
- No agregues meses sin intereses, NASA, intercambios ni claims no validados.
- Puedes ajustar tono y claridad, pero no alteres hechos.
- Responde solo con el texto sugerido, sin explicaciones.`;

export function buildShadowUserPrompt({ factualResponse, waIntent, academicIntent, sourceContext, rawText }) {
  return [
    `Intent WA: ${waIntent || "unknown"}`,
    `Intent académico: ${academicIntent || "none"}`,
    `Source context: ${sourceContext || "none"}`,
    rawText ? `Mensaje usuario: ${rawText}` : null,
    "",
    "Mensaje factual (no modificar datos):",
    factualResponse || "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildRewriteUserPrompt({ factualResponse, waIntent, academicIntent, sourceContext, rawText }) {
  return [
    `Intent WA: ${waIntent || "unknown"}`,
    `Intent académico: ${academicIntent || "none"}`,
    `Source context: ${sourceContext || "none"}`,
    rawText ? `Mensaje usuario: ${rawText}` : null,
    "",
    REPHRASE_USER_TEMPLATE(factualResponse || ""),
  ]
    .filter(Boolean)
    .join("\n");
}
