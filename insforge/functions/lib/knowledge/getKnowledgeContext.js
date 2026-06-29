/**
 * Eva WA — local CAG knowledge context (8B.1 scaffold).
 * RAG mode is intentionally disabled in 8B.1.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../../..");
const DEFAULT_CACHE_PATH = path.join(ROOT, "docs/knowledge/cache/eva-cache-v1.json");

const CAG_SUITABLE_PATTERNS = [
  "carrera",
  "carreras",
  "programa",
  "programas",
  "licenciatura",
  "costo",
  "costos",
  "colegiatura",
  "mensualidad",
  "inscripcion",
  "inscripción",
  "precio",
  "cuanto cuesta",
  "cuánto cuesta",
  "beca",
  "becas",
  "descuento",
  "descuentos",
  "ubicacion",
  "ubicación",
  "direccion",
  "dirección",
  "campus",
  "donde estan",
  "dónde están",
  "rvoe",
  "reconocimiento oficial",
  "reconocida",
  "reconocido",
  "validez oficial",
  "acreditacion",
  "acreditación",
  "admision",
  "admisión",
  "requisito",
  "requisitos",
  "documento",
  "documentos",
  "revalidacion",
  "revalidación",
  "revalidar",
  "convalidacion",
  "equivalencia general",
  "preparatoria",
  "prepa",
  "bachillerato",
  "posgrado",
  "postgrado",
  "maestria",
  "maestría",
  "doctorado",
  "online",
  "en linea",
  "en línea",
  "virtual",
  "medicina",
  "medicida",
  "medico",
  "médico",
  "faq",
  "universidad latino",
  "negocios internacionales",
];

const NOT_CAG_PATTERNS = [
  "promocion de hoy",
  "promoción de hoy",
  "promocion vigente",
  "promoción vigente",
  "que promocion tienen hoy",
  "qué promoción tienen hoy",
  "que promociones tienen hoy",
  "qué promociones tienen hoy",
  "hay cupo",
  "cupo mañana",
  "cupo manana",
  "disponibilidad mañana",
  "disponibilidad manana",
  "mañana hay",
  "manana hay",
  "revalidar 8",
  "revalidar ocho",
  "cuantas materias",
  "cuántas materias",
  "8 materias",
  "ocho materias",
  "materias de otra universidad",
  "equivalencias especificas",
  "equivalencias específicas",
  "revisar mi certificado",
  "revisar mi kardex",
  "revisar mi kárdex",
  "mi certificado parcial",
  "beca exacta",
  "cuanto me toca de beca exacta",
  "cuánto me toca de beca exacta",
  "me pueden revalidar",
  "pueden revalidar",
  "promocion tienen?",
  "promoción tienen?",
  "que promocion tienen",
  "qué promoción tienen",
];

function normalizeQuery(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿¡?.,!;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isQuerySuitableForCAG(query) {
  const n = normalizeQuery(query);
  if (!n) return false;

  for (const p of NOT_CAG_PATTERNS) {
    const pn = normalizeQuery(p);
    if (n.includes(pn)) return false;
  }

  return CAG_SUITABLE_PATTERNS.some((p) => n.includes(normalizeQuery(p)));
}

let _cache = null;
let _cachePath = null;

function loadCache(cachePath = DEFAULT_CACHE_PATH) {
  if (_cache && _cachePath === cachePath) return _cache;
  if (!fs.existsSync(cachePath)) {
    _cache = null;
    _cachePath = cachePath;
    return null;
  }
  _cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
  _cachePath = cachePath;
  return _cache;
}

function getKnowledgeContext(query, options = {}) {
  const cachePath = options.cachePath || DEFAULT_CACHE_PATH;
  const cache = loadCache(cachePath);

  if (!cache || !cache.context) {
    return {
      mode: "NONE",
      source: "missing_cache",
      context: "",
      confidence: "none",
      knowledgeVersion: null,
    };
  }

  if (!isQuerySuitableForCAG(query)) {
    return {
      mode: "NONE",
      source: "not_cag_suitable",
      context: "",
      confidence: "none",
      reason: "query_requires_dynamic_or_personalized_answer",
      knowledgeVersion: cache.knowledgeVersion,
    };
  }

  return {
    mode: "CAG",
    source: "cache",
    knowledgeVersion: cache.knowledgeVersion,
    context: cache.context,
    confidence: "static",
    contentHash: cache.contentHash,
    tokenEstimate: cache.tokenEstimate,
  };
}

module.exports = { getKnowledgeContext, isQuerySuitableForCAG, normalizeQuery };
