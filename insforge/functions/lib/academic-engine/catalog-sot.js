/**
 * Matriz §11 + reglas de alias/modalidad/nivel — consumidas por notOfferedResolver (N1).
 * Única fuente de datos; el resolver no define listas propias.
 */
import { getActiveCareers, getCatalogMeta } from "./truth.js";
import { normalizeInput, includesAny, ONLINE_SYNONYMS, PRESENTIAL_SYNONYMS, SATURDAY_SYNONYMS } from "./normalizer.js";

/** Nombres EXACTOS de las 12 licenciaturas §4.1 (orden estable por área + nombre). */
export function getOfficialCareerNames() {
  const careers = getActiveCareers();
  const areaOrder = ["Derecho", "Salud", "Tecnología", "Negocios", "Gastronomía"];
  const sorted = [...careers].sort((a, b) => {
    const ai = areaOrder.indexOf(a.area);
    const bi = areaOrder.indexOf(b.area);
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return String(a.name).localeCompare(String(b.name), "es");
  });
  return sorted.map((c) => c.name);
}

/**
 * Matriz §11 precargada — demanda esperada no ofertada (Maestro §11 + D4 + N1).
 */
export const EXPECTED_NOT_OFFERED_DEMAND = [
  {
    id: "salud",
    category: "Salud",
    label: "Medicina",
    keywords: [
      "medicina",
      "medicida",
      "medico cirujano",
      "medico",
      "doctor",
      "odontologia",
      "odontología",
      "veterinaria",
      "fisioterapia",
    ],
    excludeIf: ["nutricion", "enfermeria", "psicologia"],
    alternatives: ["Enfermería", "Nutrición", "Psicología"],
    relatedArea: "Salud",
  },
  {
    id: "tecnologia",
    category: "Tecnología",
    label: "Ingeniería",
    keywords: [
      "arquitectura",
      "ingenieria civil",
      "ingenieria industrial",
      "ingenieria mecanica",
      "ingenieria mecatronica",
      "ingenieria biomedica",
      "inteligencia artificial",
      "ciencia de datos",
      "ciencias de datos",
    ],
    alternatives: ["Ingeniería en Sistemas Computacionales"],
    relatedArea: "Tecnología",
  },
  {
    id: "creativas",
    category: "Creativas/comerciales",
    label: "Diseño",
    keywords: [
      "diseno grafico",
      "diseño gráfico",
      "diseno de modas",
      "diseño de modas",
      "comunicacion",
      "comunicación",
      "diseno",
      "diseño",
    ],
    alternatives: ["Ventas y Mercadotecnia", "Ventas y Mercadotecnia Online"],
    relatedArea: "Negocios",
  },
  {
    id: "internacionales",
    category: "Internacionales",
    label: "Relaciones Internacionales",
    keywords: ["relaciones internacionales", "comercio internacional", "turismo"],
    alternatives: ["Negocios Internacionales"],
    relatedArea: "Negocios",
  },
  {
    id: "juridicas",
    category: "Jurídicas",
    label: "Criminología",
    keywords: ["criminologia", "criminalistica", "criminalística"],
    alternatives: ["Derecho"],
    relatedArea: "Derecho",
  },
  {
    id: "negocios",
    category: "Negocios",
    label: "Contaduría",
    keywords: ["contaduria", "contador", "contadora", "contadores"],
    alternatives: [
      "Administración Sabatina",
      "Administración y Desarrollo Empresarial Online",
    ],
    relatedArea: "Negocios",
  },
  {
    id: "educacion",
    category: "Educación",
    label: "Educación",
    keywords: [
      "educacion",
      "pedagogia",
      "pedagogía",
      "docencia",
      "licenciatura en educacion",
    ],
    alternatives: [
      "Psicología",
      "Administración Sabatina",
      "Administración y Desarrollo Empresarial Online",
    ],
    relatedArea: "Educación",
  },
];

export const INVALID_LEVEL_KEYWORDS = [
  "maestria",
  "maestría",
  "maestrias",
  "maestrías",
  "posgrado",
  "posgrados",
  "postgrado",
  "postgrados",
  "doctorado",
  "doctorados",
  "diplomado",
  "diplomados",
  "curso",
  "cursos",
  "preparatoria",
  "prepa",
  "bachillerato",
  "bachiller",
  "especialidad",
];

export const CAREER_ALIAS_RULES = [
  {
    id: "sistemas",
    keywords: [
      "sistemas",
      "software",
      "programacion",
      "programación",
      "computacion",
      "computación",
      "informatica",
      "informática",
    ],
    resolveTo: "Ingeniería en Sistemas Computacionales",
    askModality: false,
  },
  {
    id: "marketing",
    keywords: ["marketing", "mercadotecnia", "mercadeo"],
    resolveTo: "Ventas y Mercadotecnia",
    askModality: true,
  },
  {
    id: "leyes",
    keywords: ["leyes", "abogado", "abogacia", "abogacía"],
    resolveTo: "Derecho",
    askModality: true,
  },
  {
    id: "gastro",
    keywords: ["gastro", "chef", "cocina", "culinaria"],
    resolveTo: "Gastronomía",
    askModality: false,
  },
];

export const ADMIN_AMBIGUOUS_RULE = {
  id: "admin_ambiguous",
  keywords: [
    "administracion",
    "administración",
    "lae",
    "licenciatura en administracion",
    "licenciatura en administración",
  ],
  programs: [
    "Administración Sabatina",
    "Administración y Desarrollo Empresarial Online",
  ],
};

export const MODALITY_RULES_BY_PROGRAM = {
  Psicología: { allowed: ["presencial"], presencialOnly: true },
  Enfermería: { allowed: ["presencial"], presencialOnly: true },
  Nutrición: { allowed: ["presencial"], presencialOnly: true },
  Gastronomía: { allowed: ["presencial"], presencialOnly: true },
  "Ingeniería en Sistemas Computacionales": { allowed: ["presencial"], presencialOnly: true },
  "Negocios Internacionales": { allowed: ["presencial"], presencialOnly: true },
  Derecho: { allowed: ["presencial", "en_linea"], labels: ["Presencial", "Online"] },
  Administración: {
    allowed: ["sabatina", "en_linea"],
    labels: ["Administración Sabatina", "Administración y Desarrollo Empresarial Online"],
  },
};

function detectModalityCode(normalizedText) {
  if (includesAny(normalizedText, ONLINE_SYNONYMS)) return "en_linea";
  if (includesAny(normalizedText, SATURDAY_SYNONYMS)) return "sabatina";
  if (includesAny(normalizedText, PRESENTIAL_SYNONYMS)) return "presencial";
  if (/\bentre semana\b/.test(normalizedText)) return "presencial";
  return null;
}

function extractRequestedRawFragment(rawText, keyword) {
  const raw = String(rawText || "").trim();
  if (!raw) return keyword;
  const re = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const m = raw.match(re);
  return m ? m[0] : keyword;
}

export function buildEightStepNotOfferedResponse({
  requestedCareerRaw,
  displayLabel,
  alternatives = [],
  relatedArea = "un área relacionada",
  testUrl = "",
}) {
  const alts = alternatives.filter(Boolean).slice(0, 3);
  const altBullets = alts.map((a) => `• ${a}`).join("\n");
  const testLine = testUrl
    ? `Si aún no tienes claro qué estudiar, nuestro test vocacional puede ayudarte:\n${testUrl}`
    : "Si aún no tienes claro qué estudiar, nuestro test vocacional puede ayudarte.";

  return [
    `1. Entiendo tu interés en ${requestedCareerRaw}.`,
    `2. Por el momento ${displayLabel} no forma parte de nuestra oferta de licenciaturas.`,
    `3. En ${relatedArea} contamos con opciones que podrían orientarte — no son equivalentes a lo que buscas:`,
    altBullets || "• (consulta alternativas con un asesor)",
    "5. Ninguna sustituye lo que pediste; solo pueden servir como referencia.",
    testLine,
    "7. ¿Te gustaría conocer alguna opción, hacer el test o que un asesor te oriente?",
    "8. Quedo atenta si quieres retomar por aquí 😊",
  ].join("\n\n");
}

export function buildInvalidModalityResponse(programaBase, requestedModalityLabel) {
  const rule = MODALITY_RULES_BY_PROGRAM[programaBase];
  const allowedText =
    rule?.presencialOnly === true
      ? "solo modalidad Presencial"
      : rule?.labels
        ? rule.labels.join(" u ")
        : "las modalidades disponibles según nuestro catálogo";

  return (
    `${programaBase} ${allowedText.includes("solo") ? "se imparte en" : "está disponible en"} ${allowedText}. ` +
    `No ofrecemos ${programaBase} en ${requestedModalityLabel || "esa modalidad"}. ` +
    "No tenemos registro de apertura futura para esa combinación. " +
    `¿Te interesa conocer ${allowedText} o prefieres otra carrera?`
  );
}

export function buildInvalidLevelResponse() {
  return (
    "Universidad Latino ofrece licenciaturas en 12 programas oficiales. " +
    "Maestrías, posgrados, doctorados, preparatoria, cursos y diplomados no forman parte de nuestra oferta actual de licenciatura. " +
    "¿Te gustaría conocer nuestras licenciaturas o hablar con un asesor?"
  );
}

export function buildTypoConfirmationQuestion(suggestedCareer) {
  return `¿Te refieres a *${suggestedCareer}*?`;
}

export function buildAdminAmbiguousQuestion() {
  return (
    "Tenemos dos programas de Administración 😊\n\n" +
    "• Administración Sabatina\n" +
    "• Administración y Desarrollo Empresarial Online\n\n" +
    "¿Cuál te interesa?"
  );
}

export function buildModalityChoiceQuestion(careerLabel, options) {
  const opts = (options || []).filter(Boolean);
  const bullets = opts.map((o) => `• ${o}`).join("\n");
  return `¡Excelente! Sobre ${careerLabel}, ¿qué modalidad te interesa?\n\n${bullets}`;
}

export function buildNotOfferedDemandResponse(requestedLabel, alternatives) {
  const alts = (alternatives || []).filter(Boolean);
  const altText =
    alts.length === 1
      ? alts[0]
      : alts.length === 2
        ? `${alts[0]} y ${alts[1]}`
        : `${alts.slice(0, -1).join(", ")} y ${alts[alts.length - 1]}`;

  return (
    `Por el momento ${requestedLabel} no está en nuestra oferta académica. ` +
    `En un área cercana tenemos ${altText} (no son equivalentes, pero podrían interesarte). ` +
    `¿Quieres conocer alguna, hacer nuestro test vocacional o que un asesor te oriente?`
  );
}

export function buildDemandRegistrationNote(requestedCareerRaw, matrixId, isUnknown) {
  return (
    `[Eva WA — registro demanda §11]\n` +
    `requestedCareerRaw: ${requestedCareerRaw}\n` +
    `matriz_id: ${matrixId || "unknown"}\n` +
    `unknown_career: ${isUnknown ? "true" : "false"}`
  );
}

export function getOfficialCareerKeywords() {
  const careers = getActiveCareers();
  const keywords = new Set();

  for (const career of careers) {
    if (career.programa_base) keywords.add(normalizeInput(career.programa_base));
    if (career.name) keywords.add(normalizeInput(career.name));
    for (const kw of career.keywords || []) {
      const n = normalizeInput(kw);
      if (n) keywords.add(n);
    }
  }

  keywords.add("derecho online");
  keywords.add("administracion sabatina");
  keywords.add("administracion y desarrollo empresarial online");
  keywords.add("ventas y mercadotecnia online");
  keywords.add("negocios internacionales");
  keywords.add("ingenieria en sistemas computacionales");
  keywords.add("gastronomia");

  for (const entry of EXPECTED_NOT_OFFERED_DEMAND) {
    for (const kw of entry.keywords) {
      keywords.delete(normalizeInput(kw));
    }
  }

  return [...keywords].filter(Boolean);
}

export function matchesInvalidLevel(rawText) {
  if (!rawText || !String(rawText).trim()) return false;
  const n = normalizeInput(rawText);
  return INVALID_LEVEL_KEYWORDS.some((kw) => n.includes(normalizeInput(kw)));
}

export function matchAdminAmbiguous(rawText) {
  if (!rawText) return false;
  const n = normalizeInput(rawText);
  if (n.includes("administracion y desarrollo") || n.includes("administracion sabatina")) {
    return false;
  }
  return ADMIN_AMBIGUOUS_RULE.keywords.some((kw) => n.includes(normalizeInput(kw)));
}

export function matchCareerAlias(rawText) {
  if (!rawText) return null;
  const n = normalizeInput(rawText);
  for (const rule of CAREER_ALIAS_RULES) {
    if (rule.keywords.some((kw) => n.includes(normalizeInput(kw)))) {
      return rule;
    }
  }
  return null;
}

export function matchExactOfferedCareer(rawText) {
  if (!rawText) return null;
  const n = normalizeInput(rawText);
  const careers = getActiveCareers();
  const pairs = careers
    .flatMap((c) => [
      [normalizeInput(c.name), c],
      [normalizeInput(c.programa_base), c],
    ])
    .sort((a, b) => b[0].length - a[0].length);

  for (const [frag, career] of pairs) {
    if (frag && n.includes(frag)) return career;
  }
  return null;
}

export function detectExpectedNotOfferedDemand(rawText) {
  if (!rawText || !String(rawText).trim()) return null;

  const text = normalizeInput(rawText);
  const hasAny = (fragments) =>
    fragments.some((f) => text.includes(normalizeInput(f)));

  for (const entry of EXPECTED_NOT_OFFERED_DEMAND) {
    if (entry.excludeIf && hasAny(entry.excludeIf)) continue;

    for (const kw of entry.keywords) {
      if (!text.includes(normalizeInput(kw))) continue;
      const requestedCareerRaw = extractRequestedRawFragment(rawText, kw);
      return {
        id: entry.id,
        category: entry.category,
        label: entry.label,
        matchedKeyword: kw,
        requestedCareerRaw,
        alternatives: [...entry.alternatives],
        relatedArea: entry.relatedArea || entry.category,
      };
    }
  }

  return null;
}

export function detectInvalidModalityRequest(rawText) {
  if (!rawText) return null;
  const n = normalizeInput(rawText);
  const modality = detectModalityCode(n);
  if (!modality) return null;

  const careers = getActiveCareers();
  for (const career of careers) {
    const base = career.programa_base;
    const nameNorm = normalizeInput(career.name);
    const baseNorm = normalizeInput(base);
    if (!n.includes(nameNorm) && !n.includes(baseNorm)) continue;

    const rule = MODALITY_RULES_BY_PROGRAM[base];
    if (!rule) continue;
    if (rule.allowed.includes(modality)) continue;

    let requestedModalityLabel = modality;
    if (modality === "en_linea") requestedModalityLabel = "línea / online";
    if (modality === "sabatina") requestedModalityLabel = "sabatino / sabatina";
    if (modality === "presencial" && base === "Derecho") requestedModalityLabel = "sabatino";

    return {
      programaBase: base,
      careerName: career.name,
      modality,
      requestedModalityLabel,
      requestedCareerRaw: extractRequestedRawFragment(rawText, base),
      responseText: buildInvalidModalityResponse(base, requestedModalityLabel),
    };
  }
  return null;
}

export function getTypoCandidateOfferedCareers() {
  return getActiveCareers().map((c) => ({
    name: c.name,
    programa_base: c.programa_base,
    normalized: normalizeInput(c.programa_base || c.name),
  }));
}

export function getOfferedCareerNamesForRegression() {
  return getOfficialCareerNames();
}

function groupByArea(careers) {
  return careers.reduce((acc, c) => {
    const area = c.area || "General";
    if (!acc[area]) acc[area] = [];
    acc[area].push(c);
    return acc;
  }, {});
}

export function buildCarrerasDisponiblesResponseText() {
  const careers = getActiveCareers();
  const grouped = groupByArea(careers);
  const areaEmoji = {
    Derecho: "⚖️",
    Salud: "🏥",
    Tecnología: "💻",
    Negocios: "💼",
    Gastronomía: "🍳",
  };

  const lines = [
    "En Universidad Latino contamos con 12 licenciaturas oficiales en 5 áreas 😊",
    "",
  ];

  for (const [area, items] of Object.entries(grouped)) {
    const emoji = areaEmoji[area] || "•";
    lines.push(`${emoji} ${area}:`);
    for (const c of items) {
      lines.push(`- ${c.name}`);
    }
    lines.push("");
  }

  const meta = getCatalogMeta();
  if (meta?.programas_unicos_calculado || meta?.programas_unicos) {
    lines.push(
      `Son ${meta.programas_unicos_calculado || meta.programas_unicos} programas únicos en ${meta.combinaciones_calculado || meta.combinaciones_carrera_modalidad} combinaciones de carrera y modalidad.`,
    );
    lines.push("");
  }

  lines.push(
    "¿Ya tienes alguna carrera en mente o prefieres hacer el test vocacional para descubrir cuál va mejor contigo?",
  );

  return lines.join("\n");
}

export const GHOST_CAREER_LABELS = [
  "Arquitectura",
  "Contaduría",
  "Criminología",
  "Educación",
  "Diseño",
];
