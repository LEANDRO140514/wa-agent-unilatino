/**
 * Academic Canonicalizer v1 — Eva Contract.
 *
 * PURE LOGIC: sin DB, sin HTTP, sin LLM, sin filesystem, sin environment
 * reads, sin side effects. Determinístico y fail-closed: si una combinación
 * carrera/modalidad no está en la matriz de las 11 ofertas vigentes, nunca
 * se inventa una equivalencia — se devuelve null.
 *
 * No importa nada del academic-engine existente a propósito: este módulo
 * es una unidad autocontenida y no debe acoplarse a catálogos que puedan
 * cambiar de forma. La matriz de 11 combos está fijada aquí mismo.
 */

export const CANONICAL_MODALITIES = Object.freeze(["presencial", "en_linea"]);

const ONLINE_MODALITY_SYNONYMS = [
  "en linea",
  "online",
  "on line",
  "virtual",
  "por internet",
  "a distancia",
];

const PRESENCIAL_MODALITY_SYNONYMS = ["presencial", "escolarizado", "escolarizada"];

// Sabatina/sabatino NUNCA se mapea a presencial ni a en_linea — fail closed.
const SABATINA_MODALITY_SYNONYMS = ["sabatina", "sabatino"];

function normalizeText(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿¡]/g, "")
    .replace(/[.,!?;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function modalitySignals(rawModality) {
  const n = normalizeText(rawModality);
  if (!n) {
    return { empty: true, canonical: null, sabatina: false, online: false, presencial: false };
  }
  if (n === "presencial" || n === "en_linea") {
    return {
      empty: false,
      canonical: n,
      sabatina: false,
      online: n === "en_linea",
      presencial: n === "presencial",
    };
  }
  return {
    empty: false,
    canonical: null,
    sabatina: SABATINA_MODALITY_SYNONYMS.some((s) => n === s || n.includes(s)),
    online: ONLINE_MODALITY_SYNONYMS.some((s) => n === s || n.includes(s)),
    presencial: PRESENCIAL_MODALITY_SYNONYMS.some((s) => n === s || n.includes(s)),
  };
}

function isContradictoryModality(rawModality) {
  const sig = modalitySignals(rawModality);
  return !sig.empty && !sig.canonical && !sig.sabatina && sig.online && sig.presencial;
}

function isSabatinaModality(rawModality) {
  return modalitySignals(rawModality).sabatina === true;
}

/**
 * Normaliza texto libre o un código ya canónico ("presencial"/"en_linea")
 * hacia una modalidad canónica única. Sabatina siempre falla cerrado (null).
 * Señales inequívocas de presencial Y online a la vez: null (sin precedencia).
 * @param {string|null} rawModality
 * @returns {"presencial"|"en_linea"|null}
 */
export function canonicalizeModality(rawModality) {
  const sig = modalitySignals(rawModality);
  if (sig.empty) return null;
  if (sig.canonical) return sig.canonical;
  if (sig.sabatina) return null;
  if (sig.online && sig.presencial) return null;
  if (sig.online) return "en_linea";
  if (sig.presencial) return "presencial";
  return null;
}

/**
 * Bucket interno = nombre de oferta ya desambiguado por modalidad propia
 * (p. ej. "Derecho" vs "Derecho Online" son buckets distintos). Cada bucket
 * de la matriz vigente aparece exactamente una vez en CAREER_MODALITY_TABLE.
 * "admin_sabatina" existe solo para reconocer el texto y fallar cerrado
 * (oferta obsoleta §catálogo — Administración Sabatina).
 */
const CAREER_BUCKET_RULES = [
  { bucket: "derecho_presencial", names: ["derecho"] },
  { bucket: "derecho_online", names: ["derecho online"] },
  { bucket: "psicologia", names: ["psicologia"] },
  { bucket: "enfermeria", names: ["enfermeria"] },
  { bucket: "nutricion", names: ["nutricion"] },
  { bucket: "isc", names: ["ingenieria en sistemas computacionales"] },
  {
    bucket: "admin_online",
    names: ["administracion y desarrollo empresarial online"],
  },
  { bucket: "admin_sabatina", names: ["administracion sabatina"] },
  { bucket: "mkt_online", names: ["ventas y mercadotecnia online"] },
  {
    bucket: "mkt_presencial",
    names: [
      "ventas y mercadotecnia",
      "mercadotecnia global",
      "mercadotecnia global (escolarizado)",
      "ventas y mercadotecnia (escolarizado)",
    ],
  },
  { bucket: "negocios_internacionales", names: ["negocios internacionales"] },
  { bucket: "gastronomia", names: ["gastronomia"] },
];

/** Oferta obsoleta reconocida por texto — nunca produce career_key. */
export const OBSOLETE_CAREER_BUCKET = "admin_sabatina";

function resolveCareerBucketMatch(careerRaw) {
  const n = normalizeText(careerRaw);
  if (!n) return null;
  for (const rule of CAREER_BUCKET_RULES) {
    if (rule.names.some((name) => normalizeText(name) === n)) {
      return { bucket: rule.bucket, matchedName: n };
    }
  }
  return null;
}

function resolveCareerBucket(careerRaw) {
  return resolveCareerBucketMatch(careerRaw)?.bucket ?? null;
}

function careerKeysForBucket(bucket) {
  const keys = [];
  for (const [combo, key] of Object.entries(CAREER_MODALITY_TABLE)) {
    if (combo.startsWith(`${bucket}|`)) keys.push(key);
  }
  return keys;
}

function uniqueCareerKeyForBucket(bucket) {
  const keys = [...new Set(careerKeysForBucket(bucket))];
  return keys.length === 1 ? keys[0] : null;
}

/** Familia de SKUs en la matriz: `X` y `X_online` si ambos existen. */
function careerKeyFamily(careerKey) {
  const all = new Set(Object.values(CAREER_MODALITY_TABLE));
  const family = new Set([careerKey]);
  if (all.has(`${careerKey}_online`)) family.add(`${careerKey}_online`);
  if (careerKey.endsWith("_online")) {
    const base = careerKey.slice(0, -"_online".length);
    if (all.has(base)) family.add(base);
  }
  return family;
}

/**
 * Sin modalidad, un nombre exacto se une al SKU/alias de su bucket.
 * Solo es ambiguous si ese SKU es la base desnuda de una familia
 * multi-SKU de la matriz (derecho / derecho_online). Un alias explícito
 * de un solo SKU (Ventas y Mercadotecnia -> mercadotecnia_global) no.
 */
function isBareMultiSkuBaseName(matchedName, careerKey) {
  const family = careerKeyFamily(careerKey);
  if (family.size <= 1) return false;
  const baseKey = [...family].find((key) => !key.endsWith("_online"));
  if (!baseKey) return false;
  return matchedName === normalizeText(baseKey.replaceAll("_", " "));
}

function includesPhrase(haystack, phrase) {
  if (!phrase) return false;
  if (haystack === phrase) return true;
  return ` ${haystack} `.includes(` ${phrase} `);
}

/**
 * Extrae el nombre de carrera más largo mencionado en texto libre y
 * canonicaliza contra la matriz. Fail-closed: sin match exacto de nombre,
 * no inventa carrera. modalityRaw es el utterance completo para detectar
 * sinónimos, sabatina y contradicción presencial/online.
 */
export function canonicalizeCareerModalityFromText(text) {
  const n = normalizeText(text);
  if (!n) return canonicalizeCareerModality({});

  let bestName = null;
  for (const rule of CAREER_BUCKET_RULES) {
    for (const name of rule.names) {
      const nn = normalizeText(name);
      if (nn && includesPhrase(n, nn) && (!bestName || nn.length > bestName.length)) {
        bestName = nn;
      }
    }
  }

  return canonicalizeCareerModality({
    careerRaw: bestName,
    modalityRaw: text,
  });
}

/**
 * Matriz de las 11 combinaciones carrera+modalidad vigentes en el catálogo
 * de Universidad Latino. Cada bucket aparece una sola vez porque el nombre
 * ya distingue la modalidad ("Derecho" vs "Derecho Online", "Ventas y
 * Mercadotecnia" vs "Ventas y Mercadotecnia Online"). Cualquier combinación
 * fuera de esta tabla no existe: fail closed.
 */
const CAREER_MODALITY_TABLE = Object.freeze({
  "derecho_presencial|presencial": "derecho",
  "derecho_online|en_linea": "derecho_online",
  "psicologia|presencial": "psicologia",
  "enfermeria|presencial": "enfermeria",
  "nutricion|presencial": "nutricion",
  "isc|presencial": "ingenieria_en_sistemas_computacionales",
  "admin_online|en_linea": "administracion_y_desarrollo_empresarial_online",
  "mkt_presencial|presencial": "mercadotecnia_global",
  "mkt_online|en_linea": "ventas_y_mercadotecnia_online",
  "negocios_internacionales|presencial": "negocios_internacionales",
  "gastronomia|presencial": "gastronomia",
});

export const CANONICAL_CAREER_KEYS = Object.freeze([
  ...new Set(Object.values(CAREER_MODALITY_TABLE)),
]);

/**
 * Resuelve career_key + modality_key canónicos a partir de texto libre
 * (o códigos ya canónicos) de carrera y modalidad.
 *
 * Reglas (fail closed, determinístico):
 * - known: career_key y modality_key ambos presentes (combo en la matriz).
 * - partial: exactamente una canonical key presente (career_key XOR
 *   modality_key). Un nombre que identifica un único SKU sin modalidad
 *   conserva career_key y no infiere modalidad.
 * - ambiguous: el nombre es la base desnuda de una familia multi-SKU
 *   de la matriz y falta modalidad, o el input afirma presencial y
 *   online a la vez. Un alias explícito de un solo SKU no es ambiguous.
 * - unknown: ninguna canonical key (incluye sabatina/oferta obsoleta).
 *
 * @param {{ careerRaw?: string|null, modalityRaw?: string|null }} input
 * @returns {{
 *   career_key: string|null,
 *   modality_key: "presencial"|"en_linea"|null,
 *   status: "known"|"partial"|"unknown"|"ambiguous",
 *   career_bucket: string|null,
 *   is_obsolete_offering: boolean
 * }}
 */
export function canonicalizeCareerModality({ careerRaw = null, modalityRaw = null } = {}) {
  const modality_key = canonicalizeModality(modalityRaw);
  const match = resolveCareerBucketMatch(careerRaw);
  const career_bucket = match?.bucket ?? null;
  const is_obsolete_offering = career_bucket === OBSOLETE_CAREER_BUCKET;
  const contradictory = isContradictoryModality(modalityRaw);
  const sabatina = isSabatinaModality(modalityRaw);

  const boundKey =
    career_bucket && !is_obsolete_offering ? uniqueCareerKeyForBucket(career_bucket) : null;
  const bareMultiSku =
    Boolean(boundKey) &&
    !modality_key &&
    !sabatina &&
    !contradictory &&
    isBareMultiSkuBaseName(match.matchedName, boundKey);

  let career_key = null;
  if (career_bucket && !is_obsolete_offering && modality_key) {
    career_key = CAREER_MODALITY_TABLE[`${career_bucket}|${modality_key}`] || null;
  } else if (
    boundKey &&
    !modality_key &&
    !sabatina &&
    !contradictory &&
    !bareMultiSku
  ) {
    career_key = boundKey;
  }

  let status;
  if (contradictory || bareMultiSku) {
    status = "ambiguous";
    career_key = null;
  } else if (career_key && modality_key) {
    status = "known";
  } else if (career_key || modality_key) {
    status = "partial";
  } else {
    status = "unknown";
  }

  return {
    career_key,
    modality_key: career_key && modality_key ? modality_key : status === "partial" ? modality_key : null,
    status,
    career_bucket,
    is_obsolete_offering,
  };
}
