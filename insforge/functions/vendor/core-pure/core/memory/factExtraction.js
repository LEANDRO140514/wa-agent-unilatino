"use strict";
/**
 * Extracción de hechos duraderos del lead — Fase 2 / Bloque 3.
 *
 * Diseño portado de packages/memory/semantic-memory (tipos de hechos, prompt,
 * umbral de confianza, filtro de mensajes triviales). Este módulo es puro:
 * arma el prompt y parsea la respuesta; la llamada LLM y la persistencia
 * viven en LeadMemoryRepository.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_FACT_CONFIDENCE = exports.LEAD_FACT_TYPES = void 0;
exports.isWorthExtracting = isWorthExtracting;
exports.buildExtractionInput = buildExtractionInput;
exports.parseExtractedFacts = parseExtractedFacts;
exports.isSpecificQuery = isSpecificQuery;
exports.formatFactsBlock = formatFactsBlock;
exports.LEAD_FACT_TYPES = [
    "preference", // preferencias, estilos de comunicación, elecciones
    "decision", // decisiones tomadas o discutidas
    "constraint", // reglas, limitaciones, restricciones duras
    "objective", // metas, resultados deseados
    "task", // acciones pendientes
    "observation", // hechos notables sobre el lead o su situación
    "relationship", // conexiones entre personas o entidades
];
exports.MIN_FACT_CONFIDENCE = 0.7;
const MAX_FACT_TEXT_CHARS = 200;
const MIN_COMBINED_CHARS = 50;
const TRIVIAL_PATTERNS = /^(hi|hello|hola|thanks|gracias|ok|vale|yes|no|s[ií]|bye|chau|adios|good morning|buenos d[ií]as|buenas tardes|buenas noches)[!.?\s]*$/i;
/** Ráfagas triviales o muy cortas no ameritan una llamada de extracción. */
function isWorthExtracting(userMessage, aiResponse) {
    if (userMessage.length + aiResponse.length < MIN_COMBINED_CHARS)
        return false;
    if (TRIVIAL_PATTERNS.test(userMessage.trim()))
        return false;
    return true;
}
function buildExtractionInput(userMessage, aiResponse) {
    return [
        "Conversación:",
        `Usuario: ${userMessage.slice(0, 2000)}`,
        `Asistente: ${aiResponse.slice(0, 2000)}`,
    ].join("\n");
}
/**
 * Parsea la respuesta del LLM: { "facts": [{factText, factType, confidence}] }.
 * Tolera fences de markdown y texto alrededor. Devuelve [] ante cualquier
 * cosa inválida (fail-open) y filtra por confianza mínima y longitud.
 */
function parseExtractedFacts(raw) {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start)
        return [];
    let parsed;
    try {
        parsed = JSON.parse(cleaned.slice(start, end + 1));
    }
    catch {
        return [];
    }
    const facts = parsed.facts;
    if (!Array.isArray(facts))
        return [];
    const validTypes = new Set(exports.LEAD_FACT_TYPES);
    const out = [];
    for (const f of facts) {
        if (f === null || typeof f !== "object")
            continue;
        const { factText, factType, confidence } = f;
        if (typeof factText !== "string" || !factText.trim())
            continue;
        if (typeof confidence !== "number" || confidence < exports.MIN_FACT_CONFIDENCE) {
            continue;
        }
        const type = typeof factType === "string" && validTypes.has(factType)
            ? factType
            : "observation";
        out.push({
            factText: factText.trim().slice(0, MAX_FACT_TEXT_CHARS),
            factType: type,
            confidence: Math.min(1, confidence),
        });
    }
    return out;
}
const GENERIC_MEMORY_QUERY = /^[¿¡\s]*(que|qué|recuerdas|recuerda|memoria|sabes|anteriormente|sesión anterior|me conoces|what do you remember|remember)/i;
/** Consultas genéricas no aportan señal para FTS; solo top por confianza. */
function isSpecificQuery(query) {
    const q = query.trim();
    return q.length >= 3 && !GENERIC_MEMORY_QUERY.test(q);
}
/** Bloque de contexto para el system prompt (formato de semantic-memory). */
function formatFactsBlock(facts) {
    if (facts.length === 0)
        return "";
    const lines = facts
        .map((f) => `• [${f.factType}] ${f.factText} (confianza: ${f.trustScore})`)
        .join("\n");
    return `Datos conocidos del lead (de conversaciones previas):\n${lines}`;
}
