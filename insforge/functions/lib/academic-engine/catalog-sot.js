/**
 * Catálogo oficial derivado de source-of-truth.js (Maestro §4.1).
 * Única fuente para listados WA y keywords de carreras ofertadas.
 */
import { getActiveCareers, getCatalogMeta } from "./truth.js";
import { normalizeInput } from "./normalizer.js";

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
 * Matriz §11 precargada — demanda esperada no ofertada (Maestro §11 + D4).
 * Item 0: incluye las 5 carreras fantasma + Medicina.
 */
export const EXPECTED_NOT_OFFERED_DEMAND = [
  {
    id: "medicina",
    label: "Medicina",
    keywords: ["medicina", "medicida", "medico cirujano", "medico", "doctor"],
    excludeIf: ["nutricion", "enfermeria", "psicologia"],
    alternatives: ["Enfermería", "Nutrición", "Psicología"],
  },
  {
    id: "arquitectura",
    label: "Arquitectura",
    keywords: [
      "arquitectura",
      "ingenieria civil",
      "ingenieria industrial",
      "ingenieria mecanica",
      "ingenieria mecatronica",
      "ingenieria biomedica",
    ],
    alternatives: ["Ingeniería en Sistemas Computacionales"],
  },
  {
    id: "contaduria",
    label: "Contaduría",
    keywords: ["contaduria", "contador", "contadora", "contadores"],
    alternatives: [
      "Administración Sabatina",
      "Administración y Desarrollo Empresarial Online",
    ],
  },
  {
    id: "criminologia",
    label: "Criminología",
    keywords: ["criminologia", "criminalistica", "criminalística"],
    alternatives: ["Derecho"],
  },
  {
    id: "educacion",
    label: "Educación",
    keywords: ["educacion", "pedagogia", "pedagogía", "docencia", "licenciatura en educacion"],
    alternatives: ["Psicología", "Administración Sabatina", "Administración y Desarrollo Empresarial Online"],
  },
  {
    id: "diseno",
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
  },
];

/** Keywords normalizados SOLO de carreras ofertadas (para classifyIntent). */
export function getOfficialCareerKeywords() {
  const careers = getActiveCareers();
  const keywords = new Set();

  for (const career of careers) {
    if (career.programa_base) {
      keywords.add(normalizeInput(career.programa_base));
    }
    if (career.name) {
      keywords.add(normalizeInput(career.name));
    }
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

/**
 * @param {string} rawText
 * @returns {{ id: string, label: string, alternatives: string[], responseText: string } | null}
 */
export function detectExpectedNotOfferedDemand(rawText) {
  if (!rawText || !String(rawText).trim()) return null;

  const text = normalizeInput(rawText);
  const hasAny = (fragments) =>
    fragments.some((f) => text.includes(normalizeInput(f)));

  for (const entry of EXPECTED_NOT_OFFERED_DEMAND) {
    if (entry.excludeIf && hasAny(entry.excludeIf)) continue;
    if (!hasAny(entry.keywords)) continue;

    return {
      id: entry.id,
      label: entry.label,
      alternatives: [...entry.alternatives],
      responseText: buildNotOfferedDemandResponse(entry.label, entry.alternatives),
    };
  }

  return null;
}

function groupByArea(careers) {
  return careers.reduce((acc, c) => {
    const area = c.area || "General";
    if (!acc[area]) acc[area] = [];
    acc[area].push(c);
    return acc;
  }, {});
}

/** Respuesta determinística list_careers alineada a §4.1 (handler sin academic-engine). */
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

/** Carreras que nunca deben aparecer como ofertadas (guardrail D4). */
export const GHOST_CAREER_LABELS = [
  "Arquitectura",
  "Contaduría",
  "Criminología",
  "Educación",
  "Diseño",
];
