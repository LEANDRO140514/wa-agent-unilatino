import {
  getActiveCareers,
  getScholarships,
  getPolicies,
  getModalities,
  getDocuments,
  getAdmissionProcess,
  getPaymentMethods,
  getContact,
  getCatalogMeta,
  getSafeRequirementsResponse,
  findScholarshipTier,
} from "./truth.js";
import { careersMatchingName } from "./entityExtractor.js";
import { normalizeInput } from "./normalizer.js";

const BANNED_OUTPUT_TERMS = [
  "nasa",
  "7 paises",
  "siete paises",
  "trilingue",
  "trilingüe",
  "70% practica",
  "intercambios a 7",
];

export function formatPrice(num) {
  if (num === null || num === undefined) return "";
  return `$${Number(num).toLocaleString("es-MX")}`;
}

function modalityLabel(code) {
  const m = getModalities().find((x) => x.modality_code === code);
  return m?.modality_label || code;
}

function groupByArea(careers) {
  return careers.reduce((acc, c) => {
    const area = c.area || "General";
    if (!acc[area]) acc[area] = [];
    acc[area].push(c);
    return acc;
  }, {});
}

function renderCareersByArea(careers) {
  const grouped = groupByArea(careers);
  const lines = ["Estas son las opciones oficiales de Universidad Latino:\n"];
  for (const [area, items] of Object.entries(grouped)) {
    lines.push(`${area}:`);
    for (const c of items) {
      lines.push(`• ${c.name} — ${c.modality_label}`);
    }
    lines.push("");
  }
  const meta = getCatalogMeta();
  lines.push(
    `Contamos con ${meta.programas_unicos_calculado || meta.programas_unicos} programas académicos únicos en ${meta.combinaciones_calculado || meta.combinaciones_carrera_modalidad} combinaciones de carrera y modalidad.`,
  );
  lines.push("\n¿Te interesa alguna en particular?");
  return lines.join("\n");
}

function renderCatalogClarification() {
  const meta = getCatalogMeta();
  return [
    "En Universidad Latino hay",
    `${meta.programas_unicos_calculado || meta.programas_unicos} programas académicos únicos`,
    `ofrecidos en ${meta.combinaciones_calculado || meta.combinaciones_carrera_modalidad} combinaciones de carrera y modalidad`,
    "(por ejemplo, Derecho presencial y Derecho en línea cuentan como un mismo programa en dos modalidades).",
    "",
    "¿Te gustaría que te liste las opciones por área o modalidad?",
  ].join(" ");
}

function renderModalityList(modalityCode) {
  const careers = getActiveCareers().filter((c) => c.modality_code === modalityCode);
  const label = modalityLabel(modalityCode);
  if (!careers.length) return `No hay carreras en modalidad ${label} en este momento.`;
  const lines = [`Carreras en modalidad ${label}:\n`];
  for (const c of careers) {
    lines.push(`• ${c.name} — ${formatPrice(c.monthly_price)}/mes | Inscripción ${formatPrice(c.enrollment_price)}`);
  }
  lines.push("\n¿Te interesa alguna?");
  return lines.join("\n");
}

function renderCareerDetail(entities, state) {
  const policies = getPolicies();
  const safe = getSafeRequirementsResponse();

  const needsSafe =
    (entities.pregunta_practicas && entities.careerName) ||
    (state?.last_career &&
      (entities.pregunta_practicas || normalizeInput(String(state.last_question || "")).includes("campo clinico")));

  const careerForSafe = entities.careerName || state?.last_career;
  if (needsSafe && careerForSafe) {
    const c = getActiveCareers().find((x) => x.name === careerForSafe || x.programa_base === careerForSafe);
    if (
      c &&
      (c.professional_practices?.pending_validation ||
        c.social_service?.pending_validation ||
        c.extra_documents?.pending_validation ||
        entities.pregunta_practicas)
    ) {
      return { text: safe, pending_validation_used: true, source_context: "policies.respuesta_requisitos_especificos_ss_practicas" };
    }
  }

  const modality = entities.modality || state?.current_modality || null;
  let matched = careersMatchingName(entities.careerName, modality);

  if (!matched.length && entities.careerName) {
    matched = careersMatchingName(entities.careerName);
  }

  if (!matched.length) {
    return { text: "No encontré esa carrera en el catálogo oficial. ¿Puedes indicarme el nombre completo?", pending_validation_used: false, source_context: "careers" };
  }

  if (matched.length > 1 && !modality) {
    const base = matched[0].programa_base;
    const lines = [`${base} está disponible en estas opciones:\n`];
    for (const c of matched) {
      lines.push(
        `• ${c.modality_label} — ${formatPrice(c.monthly_price)}/mes | Inscripción ${formatPrice(c.enrollment_price)} | ${c.duration}`,
      );
    }
    lines.push("\n¿Cuál modalidad te interesa?");
    return { text: lines.join("\n"), pending_validation_used: false, source_context: "careers" };
  }

  const c = matched[0];
  const parts = [
    c.name,
    `• Modalidad: ${c.modality_label}`,
    `• Duración: ${c.duration}`,
    `• Mensualidad: ${formatPrice(c.monthly_price)}`,
    `• Inscripción: ${formatPrice(c.enrollment_price)}`,
    `• Campus: ${c.campus}`,
    `• RVOE: ${c.rvoe}`,
  ];

  if (c.additional_costs?.seguro_estudiante_anual) {
    parts.push(`• Seguro de estudiante (adicional): ${formatPrice(c.additional_costs.seguro_estudiante_anual)}/año`);
  }
  if (c.additional_costs?.campos_clinicos_min) {
    parts.push(
      `• Campos clínicos (adicional): ${formatPrice(c.additional_costs.campos_clinicos_min)}–${formatPrice(c.additional_costs.campos_clinicos_max)}`,
    );
  }

  if (policies.practicas_profesionales_garantizadas) {
    parts.push("• Prácticas profesionales garantizadas (institucional)");
  }

  parts.push("\n¿Te gustaría conocer becas o el proceso de inscripción?");
  return { text: parts.join("\n"), pending_validation_used: false, source_context: "careers" };
}

function renderScholarship(entities) {
  const lines = ["Becas de excelencia por promedio de bachillerato:\n"];
  for (const t of getScholarships()) {
  if (t.promedio_min === 0 && t.promedio_max <= 6.99) {
      lines.push(`• Menor a 7.00: sin beca automática — un asesor puede revisar alternativas`);
      continue;
    }
    const becaPart =
      t.beca_colegiatura_pct > 0
        ? `${t.beca_colegiatura_pct}% en colegiaturas`
        : "sin beca en colegiaturas";
    lines.push(
      `• ${t.etiqueta} (${t.promedio_min}–${t.promedio_max}): ${becaPart} y ${t.descuento_inscripcion_pct}% de descuento en inscripción`,
    );
  }
  lines.push("\nSujeto a validación del área de admisiones.");

  if (entities.promedio !== null) {
    const tier = findScholarshipTier(entities.promedio);
    if (tier) {
      lines.push(
        `\nCon promedio ${entities.promedio}, tu tramo sería: ${tier.etiqueta}.`,
      );
      if (tier.beca_colegiatura_pct > 0) {
        lines.push(`Beca estimada en colegiatura: ${tier.beca_colegiatura_pct}%.`);
      }
      if (tier.descuento_inscripcion_pct > 0) {
        lines.push(`Descuento estimado en inscripción: ${tier.descuento_inscripcion_pct}%.`);
      }
      if (tier.promedio_max <= 6.99) {
        lines.push("Te recomiendo hablar con un asesor para revisar opciones.");
      }
    }
  }

  return { text: lines.join("\n"), pending_validation_used: false, source_context: "scholarships" };
}

function renderPayment() {
  const methods = getPaymentMethods();
  const lines = ["Formas de pago documentadas:\n"];
  for (const m of methods) {
    if (m.key === "msi_tarjeta") {
      lines.push("• Meses sin intereses con tarjeta: no está documentado como opción institucional.");
      continue;
    }
    if (!m.available) continue;
    if (m.pending_validation) {
      lines.push(`• ${m.description}: disponible; ${m.notes || "detalle pendiente — un asesor puede confirmar montos."}`);
    } else {
      lines.push(`• ${m.description}`);
    }
  }
  lines.push("\n¿Te gustaría que un asesor te ayude a revisar la mejor opción para tu caso?");
  return { text: lines.join("\n"), pending_validation_used: false, source_context: "paymentMethods" };
}

function renderDocuments() {
  const docs = getDocuments();
  const lines = ["Documentos para inscripción:\n"];
  for (const d of docs) {
    lines.push(`• ${d.document}${d.notes ? ` (${d.notes})` : ""}`);
  }
  const policies = getPolicies();
  if (policies.examen_admision_requerido === false) {
    lines.push("\nNo se requiere examen de admisión.");
  }
  return { text: lines.join("\n"), pending_validation_used: false, source_context: "documents" };
}

function renderAdmission() {
  const steps = getAdmissionProcess();
  const lines = ["Proceso de admisión:\n"];
  steps.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.step}: ${s.description}`);
  });
  if (getPolicies().examen_admision_requerido === false) {
    lines.push("\nNo se requiere examen de admisión.");
  }
  return { text: lines.join("\n"), pending_validation_used: false, source_context: "admissionProcess" };
}

function renderSchedule() {
  const mods = getModalities();
  const lines = ["Modalidades y horarios:\n"];
  for (const m of mods) {
    lines.push(`• ${m.modality_label}: ${m.schedule}`);
    if (m.summary && !m.pending_validation) lines.push(`  ${m.summary}`);
  }
  return { text: lines.join("\n"), pending_validation_used: false, source_context: "modalities" };
}

function renderContact() {
  const c = getContact();
  return {
    text: [
      `${c.area || "Departamento de Admisiones"}`,
      "",
      `📍 ${c.direccion}`,
      `📧 ${c.email}`,
      `📱 WhatsApp: ${c.whatsapp_oficial}`,
      `📞 ${c.telefono}`,
      "",
      `Horario de atención:`,
      `• Lunes a viernes: ${c.horario_lunes_viernes}`,
      `• Sábado: ${c.horario_sabado}`,
    ].join("\n"),
    pending_validation_used: false,
    source_context: "contact",
  };
}

function renderFaq(entities) {
  const policies = getPolicies();
  if (entities.pregunta_practicas && policies.practicas_profesionales_garantizadas) {
    return {
      text: "Sí, Universidad Latino cuenta con prácticas profesionales garantizadas como parte de la formación institucional.\n\n" + getSafeRequirementsResponse(),
      pending_validation_used: true,
      source_context: "policies.practicas_profesionales_garantizadas",
    };
  }

  const lines = [
    "Colegiaturas de referencia:",
    `• Presencial: ${formatPrice(policies.inscripcion_presencial_default ? 4650 : 4650)}/mes | Inscripción ${formatPrice(policies.inscripcion_presencial_default)}`,
    `• En línea: desde ${formatPrice(1980)}/mes | Inscripción ${formatPrice(policies.inscripcion_online_sabatina_default)}`,
    `• Sabatina: desde ${formatPrice(3960)}/mes | Inscripción ${formatPrice(policies.inscripcion_online_sabatina_default)}`,
    "",
    "¿Sobre qué carrera o modalidad quieres más detalle?",
  ];
  return { text: lines.join("\n"), pending_validation_used: false, source_context: "policies" };
}

function renderFallback() {
  return {
    text: [
      "Puedo ayudarte con:",
      "",
      "• Carreras disponibles",
      "• Costos y becas",
      "• Requisitos de inscripción",
      "• Modalidades y horarios",
      "• Contacto de admisiones",
      "",
      "¿Qué te gustaría saber?",
    ].join("\n"),
    pending_validation_used: false,
    source_context: "fallback",
  };
}

function sanitizeOutput(text) {
  const lower = normalizeInput(text);
  for (const term of BANNED_OUTPUT_TERMS) {
    if (lower.includes(normalizeInput(term))) {
      return renderFallback().text;
    }
  }
  return text;
}

/**
 * @returns {{ text: string, pending_validation_used: boolean, source_context: string, confidence: number }}
 */
export function buildAcademicResponse(intent, entities, state = {}, normalizedInput = "") {
  let result;
  const n = normalizedInput;

  switch (intent) {
    case "greeting":
      result = {
        text: "Hola, soy Eva, asesora académica de Universidad Latino. Puedo orientarte sobre carreras, precios, becas y proceso de admisión. ¿En qué puedo ayudarte?",
        pending_validation_used: false,
        source_context: "static",
      };
      break;
    case "career_list":
      if (CATALOG_COUNT_PATTERNS.some((p) => n.includes(p))) {
        result = { text: renderCatalogClarification(), pending_validation_used: false, source_context: "catalogMeta" };
      } else {
        const careers = entities.area
          ? getActiveCareers().filter((c) => normalizeInput(c.area) === normalizeInput(entities.area))
          : getActiveCareers();
        result = { text: renderCareersByArea(careers), pending_validation_used: false, source_context: "careers" };
      }
      break;
    case "career_detail":
      result = renderCareerDetail(entities, state);
      break;
    case "modality_filter":
      result = {
        text: renderModalityList(entities.modality),
        pending_validation_used: false,
        source_context: "careers",
      };
      break;
    case "scholarship":
      result = renderScholarship(entities);
      break;
    case "payment":
      result = renderPayment();
      break;
    case "documents":
      result = renderDocuments();
      break;
    case "admission":
      result = renderAdmission();
      break;
    case "schedule":
      result = renderSchedule();
      break;
    case "contact":
      result = renderContact();
      break;
    case "faq":
      result = renderFaq(entities);
      break;
    default:
      result = renderFallback();
  }

  const confidence = intent === "fallback" ? 0.3 : intent === "greeting" ? 0.9 : 1;
  result.text = sanitizeOutput(result.text);
  result.confidence = confidence;
  return result;
}

const CATALOG_COUNT_PATTERNS = [
  "12 carreras diferentes",
  "son 12 carreras",
  "cuantas carreras diferentes",
  "9 programas",
  "programas unicos",
  "combinaciones",
];
