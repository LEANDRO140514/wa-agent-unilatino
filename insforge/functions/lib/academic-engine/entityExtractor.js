import { getActiveCareers } from "./truth.js";
import {
  normalizeInput,
  includesAny,
  ONLINE_SYNONYMS,
  PRESENTIAL_SYNONYMS,
  SATURDAY_SYNONYMS,
} from "./normalizer.js";

const AREA_SYNONYMS = {
  Salud: ["salud", "medicina", "nutricion", "psicologia", "enfermeria", "clinica", "clinico"],
  Derecho: ["derecho", "legal", "abogado", "abogacia", "juridico"],
  Negocios: ["negocios", "empresa", "empresas", "administracion", "mercadotecnia", "ventas", "marketing", "internacionales", "comercio"],
  Gastronomía: ["gastronomia", "cocina", "chef", "culinaria", "alimentos"],
  Tecnología: ["tecnologia", "sistemas", "computacion", "ingenieria", "programacion", "software", "informatica"],
};

function buildCareerKeywordMap() {
  const careers = getActiveCareers();
  const pairs = [];

  for (const c of careers) {
    pairs.push([normalizeInput(c.name), c.name]);
    pairs.push([normalizeInput(c.programa_base), c.programa_base]);
    for (const kw of c.keywords || []) {
      pairs.push([normalizeInput(kw), c.name]);
    }
  }

  // Longest fragment first
  pairs.sort((a, b) => b[0].length - a[0].length);

  const seen = new Set();
  const unique = [];
  for (const [frag, name] of pairs) {
    const key = `${frag}::${name}`;
    if (!seen.has(key) && frag) {
      seen.add(key);
      unique.push([frag, name]);
    }
  }
  return unique;
}

let _careerMap = null;
function careerKeywordMap() {
  if (!_careerMap) _careerMap = buildCareerKeywordMap();
  return _careerMap;
}

export function detectModality(n) {
  if (includesAny(n, ONLINE_SYNONYMS)) return "en_linea";
  if (includesAny(n, PRESENTIAL_SYNONYMS)) return "presencial";
  if (includesAny(n, SATURDAY_SYNONYMS)) return "sabatina";
  return null;
}

export function detectArea(n) {
  for (const [area, synonyms] of Object.entries(AREA_SYNONYMS)) {
    if (synonyms.some((s) => n.includes(s))) return area;
  }
  return null;
}

export function detectCareerName(n) {
  for (const [fragment, name] of careerKeywordMap()) {
    if (n.includes(fragment)) return name;
  }
  if (/\bderecho\b/.test(n) && !includesAny(n, ONLINE_SYNONYMS)) return "Derecho";
  if (/\bderecho\b/.test(n) && includesAny(n, ONLINE_SYNONYMS)) return "Derecho Online";
  return null;
}

export function detectProgramaBase(careerName) {
  if (!careerName) return null;
  const careers = getActiveCareers();
  const match = careers.find(
    (c) => c.name === careerName || normalizeInput(c.name) === normalizeInput(careerName),
  );
  return match?.programa_base || null;
}

export function detectPromedio(n) {
  const patterns = [
    /promedio\s*(?:de)?\s*(\d+)\s+(\d)\b/,
    /tengo\s+promedio\s+(\d+)\s+(\d)\b/,
    /promedio\s*(?:de)?\s*(\d+(?:\.\d+)?)/,
    /(\d+(?:\.\d+)?)\s*(?:de\s*)?promedio/,
    /tengo\s+(\d+(?:\.\d+)?)/,
    /tengo\s+promedio\s+(\d+(?:\.\d+)?)/,
    /promedio\s*(\d+(?:\.\d+)?)/,
  ];
  for (const re of patterns) {
    const m = n.match(re);
    if (m) {
      const val =
        m[2] !== undefined ? parseFloat(`${m[1]}.${m[2]}`) : parseFloat(m[1]);
      if (val >= 0 && val <= 10) return val;
    }
  }
  return null;
}

export function detectPreguntaFlags(n) {
  return {
    pregunta_msi:
      n.includes("meses sin intereses") ||
      n.includes("msi") ||
      (n.includes("intereses") && (n.includes("tarjeta") || n.includes("credito"))),
    pregunta_contacto:
      n.includes("whatsapp") ||
      n.includes("telefono") ||
      n.includes("correo") ||
      n.includes("email") ||
      n.includes("contacto") ||
      n.includes("ubicacion") ||
      n.includes("direccion"),
    pregunta_documentos:
      n.includes("documento") ||
      n.includes("requisito") ||
      n.includes("papeles") ||
      n.includes("curp") ||
      n.includes("acta"),
    pregunta_admision:
      n.includes("inscripcion") ||
      n.includes("inscribirme") ||
      n.includes("admision") ||
      n.includes("como me inscribo") ||
      n.includes("como entro"),
    pregunta_beca:
      n.includes("beca") ||
      n.includes("becas") ||
      n.includes("descuento") ||
      n.includes("apoyo economico") ||
      n.includes("apoyo") ||
      n.includes("que me toca"),
    pregunta_costo:
      n.includes("cuanto cuesta") ||
      n.includes("precio") ||
      n.includes("costo") ||
      n.includes("colegiatura") ||
      n.includes("mensualidad"),
    pregunta_practicas:
      n.includes("practicas profesionales") ||
      n.includes("practica profesional") ||
      n.includes("servicio social") ||
      n.includes("campos clinicos") ||
      n.includes("campo clinico"),
  };
}

export function extractEntities(normalizedInput) {
  const n = normalizedInput;
  const careerName = detectCareerName(n);
  const flags = detectPreguntaFlags(n);

  return {
    careerName,
    programa_base: detectProgramaBase(careerName),
    modality: detectModality(n),
    area: detectArea(n),
    promedio: detectPromedio(n),
    ...flags,
  };
}

export function careersMatchingName(careerName, modality = null) {
  const careers = getActiveCareers();
  const norm = normalizeInput(careerName);
  let matched = careers.filter(
    (c) =>
      normalizeInput(c.name) === norm ||
      normalizeInput(c.programa_base) === norm ||
      normalizeInput(c.name).includes(norm) ||
      norm.includes(normalizeInput(c.programa_base)),
  );
  if (modality) {
    matched = matched.filter((c) => c.modality_code === modality);
  }
  return matched;
}
