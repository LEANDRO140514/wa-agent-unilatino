#!/usr/bin/env node
/**
 * Fase 7B.1 — Build source-of-truth.js from institutional CSV package.
 * Usage: node scripts/build-source-of-truth.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SOURCES_DIR = path.join(ROOT, "docs", "knowledge", "sources");
const OUTPUT_DIR = path.join(ROOT, "insforge", "functions", "lib", "academic-engine");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "source-of-truth.js");
const REPORT_FILE = path.join(SOURCES_DIR, "source-of-truth-build-report.md");

const SOURCE_TRUTH_VERSION = "csv-sources-2026-06-18";

const CSV_FILES = [
  "Base_Actualizada_Universidad_Latino_v2.csv",
  "becas_excelencia.csv",
  "politicas_institucionales.csv",
  "modalidades_horarios.csv",
  "documentos_inscripcion.csv",
  "proceso_admision.csv",
  "formas_pago.csv",
  "costos_adicionales.csv",
  "contacto_institucional.csv",
];

const LEGACY_FILES = ["becas.csv", "costos.csv", "carreras.csv", "Base_Actualizada_Universidad_Latino.csv"];

const FORBIDDEN_CAREER_NAMES = [
  "contaduría",
  "contaduria",
  "arquitectura",
  "criminología",
  "criminologia",
  "diseño",
  "diseno",
  "educación",
  "educacion",
];

const EXPECTED_SCHOLARSHIPS = [
  { min: 9.6, max: 10, tuition: 50, enrollment: 50 },
  { min: 9.0, max: 9.59, tuition: 40, enrollment: 50 },
  { min: 8.5, max: 8.99, tuition: 30, enrollment: 50 },
  { min: 7.0, max: 8.49, tuition: 0, enrollment: 50 },
  { min: 0, max: 6.99, tuition: 0, enrollment: 0 },
];

const MARKETING_CLAIM_KEYS = [
  "claim_marketing_nasa",
  "claim_marketing_7_paises",
  "claim_marketing_trilingue",
  "claim_marketing_70_practica_derecho",
  "intercambio_internacional",
];

// ─── CSV parser (RFC4180-ish) ───────────────────────────────────────────────

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let i = 0;
  let inQuotes = false;

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\r") {
      i += 1;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function readCsv(filename) {
  const filePath = path.join(SOURCES_DIR, filename);
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const rows = parseCsv(raw.trimEnd());
  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0];
  const records = rows.slice(1).filter((r) => r.some((c) => String(c).trim() !== ""));
  return { headers, records, filePath };
}

function toObject(headers, row) {
  const obj = {};
  headers.forEach((h, idx) => {
    obj[h] = row[idx] ?? "";
  });
  return obj;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeText(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isPendingValidation(value) {
  const v = String(value || "").trim().toLowerCase();
  return v === "pendiente_validacion" || v === "pending_validation" || v.includes("pendiente_validacion");
}

function parsePolicyValue(raw) {
  const v = String(raw ?? "").trim();
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "pending_validation") return { pending_validation: true };
  if (v === "pendiente_validacion") return { pending_validation: true };
  if (/^\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function parseJsonField(raw, fallback = null) {
  const v = String(raw || "").trim();
  if (!v || isPendingValidation(v)) return fallback;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

function parseNum(raw) {
  if (raw === "" || raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseBool(raw) {
  return String(raw).trim().toLowerCase() === "true";
}

function splitKeywords(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function wrapPendingField(value) {
  if (isPendingValidation(value)) {
    return { pending_validation: true, wa_auto_response: false };
  }
  return { value: String(value), pending_validation: false, wa_auto_response: true };
}

// ─── Build ──────────────────────────────────────────────────────────────────

function build() {
  const report = {
    readFiles: [],
    rowCounts: {},
    validations: [],
    warnings: [],
    pendingValidation: [],
    excludedFromWa: [],
  };

  function pass(name, detail) {
    report.validations.push({ status: "PASS", name, detail });
  }

  function fail(name, detail) {
    report.validations.push({ status: "FAIL", name, detail });
  }

  function warn(message) {
    report.warnings.push(message);
  }

  // Read primary CSVs only
  const loaded = {};
  for (const file of CSV_FILES) {
    const data = readCsv(file);
    loaded[file] = data;
    report.readFiles.push(data.filePath);
    report.rowCounts[file] = data.records.length;
  }

  for (const legacy of LEGACY_FILES) {
    const legacyPath = path.join(SOURCES_DIR, legacy);
    if (fs.existsSync(legacyPath)) {
      warn(`Archivo legacy presente pero no usado como fuente: ${legacy}`);
    }
  }

  // Careers
  const careersRaw = loaded["Base_Actualizada_Universidad_Latino_v2.csv"];
  const careers = careersRaw.records.map((row) => {
    const r = toObject(careersRaw.headers, row);
    const socialService = wrapPendingField(r.servicio_social);
    const practices = wrapPendingField(r.practicas_profesionales);
    const extraDocs = wrapPendingField(r.documentos_extra);
    const additionalCosts = parseJsonField(r.costos_adicionales_json, {});

    if (socialService.pending_validation) report.pendingValidation.push(`career:${r.id}:servicio_social`);
    if (practices.pending_validation) report.pendingValidation.push(`career:${r.id}:practicas_profesionales`);
    if (extraDocs.pending_validation) report.pendingValidation.push(`career:${r.id}:documentos_extra`);

    report.excludedFromWa.push(`career:${r.id}:resumen_ia`);
    report.excludedFromWa.push(`career:${r.id}:cta_asesoria`);

    return {
      id: r.id,
      programa_base: r.programa_base,
      modality_code: r.modalidad_codigo,
      name: r.Carrera,
      area: r["Área académica"],
      duration: r.Duración,
      modality_label: r.Modalidad,
      description_short: r["Descripción breve"],
      job_field: r["Campo laboral"],
      student_profile: r["Perfil del estudiante"],
      monthly_price: parseNum(r.costo_mensual_num),
      enrollment_price: parseNum(r.costo_inscripcion_num),
      monthly_price_display: r["Costo mensual"],
      enrollment_price_display: r["Costo inscripción"],
      campus: r.Campus,
      rvoe: r.RVOE,
      rvoe_authority: r["Autoridad RVOE"],
      keywords: splitKeywords(r["Palabras clave"]),
      schedule: r.horario_clases,
      degree_title: r.titulo_egreso,
      social_service: socialService,
      professional_practices: practices,
      additional_costs: additionalCosts,
      extra_documents: extraDocs,
      included_at_no_cost: String(r.incluye_sin_costo || "")
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean),
      wa_summary: r.resumen_wa,
      wa_cta: r.cta_wa,
      active: parseBool(r.activo),
      row_version: r.version_fila,
      web_only: {
        resumen_ia: { excluded_from_wa: true, value: r["Resumen IA"] },
        cta_asesoria: { excluded_from_wa: true, value: r["CTA asesoría"] },
      },
    };
  });

  // Scholarships
  const scholRaw = loaded["becas_excelencia.csv"];
  const scholarships = scholRaw.records.map((row) => {
    const r = toObject(scholRaw.headers, row);
    return {
      promedio_min: parseNum(r.promedio_min),
      promedio_max: parseNum(r.promedio_max),
      beca_colegiatura_pct: parseNum(r.beca_colegiatura_pct),
      descuento_inscripcion_pct: parseNum(r.descuento_inscripcion_pct),
      etiqueta: r.etiqueta,
      notas: r.notas,
    };
  });

  // Policies
  const polRaw = loaded["politicas_institucionales.csv"];
  const policiesRaw = {};
  const policiesWaActive = {};
  const policiesMeta = { excluded_from_wa: [], pending_validation: [] };

  for (const row of polRaw.records) {
    const r = toObject(polRaw.headers, row);
    const key = r.clave;
    const parsed = parsePolicyValue(r.valor);
    const excludedClaim = MARKETING_CLAIM_KEYS.includes(key);
    const pending =
      isPendingValidation(r.valor) ||
      (typeof parsed === "object" && parsed.pending_validation) ||
      excludedClaim;

    policiesRaw[key] = {
      value: parsed,
      canal_wa: r.canal_wa,
      intent_eva: r.intent_eva,
      notas: r.notas,
      pending_validation: pending,
      excluded_from_wa: excludedClaim || key === "resumen_ia_usar_en_wa",
    };

    if (pending || excludedClaim) {
      policiesMeta.pending_validation.push(key);
      if (excludedClaim || key === "resumen_ia_usar_en_wa") {
        policiesMeta.excluded_from_wa.push(key);
        report.excludedFromWa.push(`policy:${key}`);
      }
      if (isPendingValidation(r.valor)) {
        report.pendingValidation.push(`policy:${key}`);
      }
    } else if (typeof parsed === "boolean" || typeof parsed === "number" || typeof parsed === "string") {
      policiesWaActive[key] = parsed;
    }
  }

  const policies = {
    ...policiesWaActive,
    _raw: policiesRaw,
    _meta: policiesMeta,
  };

  // Modalities
  const modRaw = loaded["modalidades_horarios.csv"];
  const modalities = modRaw.records.map((row) => {
    const r = toObject(modRaw.headers, row);
    const pending = isPendingValidation(r.resumen) || isPendingValidation(r.horario);
    if (pending) report.pendingValidation.push(`modality:${r.modalidad_codigo}`);
    return {
      modality_code: r.modalidad_codigo,
      modality_label: r.modalidad_label,
      schedule: r.horario,
      summary: r.resumen,
      campus: r.campus,
      pending_validation: pending,
      wa_auto_response: !pending,
    };
  });

  // Documents
  const docRaw = loaded["documentos_inscripcion.csv"];
  const documents = docRaw.records.map((row) => {
    const r = toObject(docRaw.headers, row);
    return {
      order: parseNum(r.orden),
      document: r.documento,
      required: String(r.obligatorio).toLowerCase() === "si",
      notes: r.notas || null,
      pending_validation: false,
      wa_auto_response: true,
    };
  });

  // Admission
  const admRaw = loaded["proceso_admision.csv"];
  const admissionProcess = admRaw.records.map((row) => {
    const r = toObject(admRaw.headers, row);
    return {
      order: parseNum(r.orden),
      step: r.paso,
      description: r.descripcion,
      pending_validation: false,
      wa_auto_response: true,
    };
  });

  // Payment
  const payRaw = loaded["formas_pago.csv"];
  const paymentMethods = payRaw.records.map((row) => {
    const r = toObject(payRaw.headers, row);
    const pending = isPendingValidation(r.notas);
    if (pending) report.pendingValidation.push(`payment:${r.clave}`);
    return {
      key: r.clave,
      available: String(r.disponible).toLowerCase() === "si",
      description: r.descripcion,
      notes: r.notas || null,
      pending_validation: pending,
      wa_auto_response: !pending,
    };
  });

  // Additional costs
  const costRaw = loaded["costos_adicionales.csv"];
  const additionalCosts = costRaw.records.map((row) => {
    const r = toObject(costRaw.headers, row);
    const pending = isPendingValidation(r.frecuencia) || isPendingValidation(r.notas);
    if (pending) report.pendingValidation.push(`additional_cost:${r.clave}`);
    return {
      key: r.clave,
      applies_to: r.aplica_a,
      amount: r.monto,
      frequency: r.frecuencia,
      notes: r.notas || null,
      pending_validation: pending,
      wa_auto_response: !pending,
    };
  });

  // Contact
  const contactRaw = loaded["contacto_institucional.csv"];
  const contact = {};
  for (const row of contactRaw.records) {
    const r = toObject(contactRaw.headers, row);
    contact[r.tipo] = r.valor;
    if (r.notas) contact[`${r.tipo}_notas`] = r.notas;
  }

  const catalogMeta = {
    programas_unicos: parseNum(policiesWaActive.programas_unicos) ?? 9,
    combinaciones_carrera_modalidad: parseNum(policiesWaActive.combinaciones_carrera_modalidad) ?? 12,
    programas_unicos_calculado: new Set(careers.map((c) => c.programa_base)).size,
    combinaciones_calculado: careers.length,
  };

  const sourceOfTruth = {
    meta: {
      version: SOURCE_TRUTH_VERSION,
      generated_at: new Date().toISOString(),
      source: "docs/knowledge/sources",
      csv_files: CSV_FILES,
      build_script: "scripts/build-source-of-truth.js",
    },
    careers,
    scholarships,
    policies,
    modalities,
    documents,
    admissionProcess,
    paymentMethods,
    additionalCosts,
    contact,
    catalogMeta,
  };

  // ─── Validations ──────────────────────────────────────────────────────────

  if (careers.length === 12) pass("careers.length === 12", `${careers.length} filas`);
  else fail("careers.length === 12", `obtenido: ${careers.length}`);

  if (catalogMeta.programas_unicos_calculado === 9) {
    pass("programas únicos === 9", `${catalogMeta.programas_unicos_calculado}`);
  } else {
    fail("programas únicos === 9", `calculado: ${catalogMeta.programas_unicos_calculado}`);
  }

  if (catalogMeta.combinaciones_calculado === 12) {
    pass("combinaciones carrera/modalidad === 12", `${catalogMeta.combinaciones_calculado}`);
  } else {
    fail("combinaciones carrera/modalidad === 12", `calculado: ${catalogMeta.combinaciones_calculado}`);
  }

  const ghostHits = [];
  for (const c of careers) {
    const haystack = normalizeText([c.name, c.programa_base, ...(c.keywords || [])].join(" "));
    for (const forbidden of FORBIDDEN_CAREER_NAMES) {
      if (haystack.includes(normalizeText(forbidden))) {
        ghostHits.push(`${c.id} → ${forbidden}`);
      }
    }
  }
  if (ghostHits.length === 0) pass("sin carreras fantasma", FORBIDDEN_CAREER_NAMES.join(", "));
  else fail("sin carreras fantasma", ghostHits.join("; "));

  let scholarshipsOk = true;
  for (let i = 0; i < EXPECTED_SCHOLARSHIPS.length; i++) {
    const exp = EXPECTED_SCHOLARSHIPS[i];
    const got = scholarships[i];
    if (
      !got ||
      got.promedio_min !== exp.min ||
      got.promedio_max !== exp.max ||
      got.beca_colegiatura_pct !== exp.tuition ||
      got.descuento_inscripcion_pct !== exp.enrollment
    ) {
      scholarshipsOk = false;
      fail(`becas tramo ${i + 1}`, `esperado ${JSON.stringify(exp)}, got ${JSON.stringify(got)}`);
    }
  }
  if (scholarshipsOk) pass("becas 5 tramos", "50% inscripción en tramos con beneficio");

  const msiPolicy = policiesWaActive.msi_disponible === false;
  const msiPayment = paymentMethods.find((p) => p.key === "msi_tarjeta");
  if (msiPolicy && msiPayment && msiPayment.available === false) {
    pass("MSI === false", "politica + formas_pago");
  } else {
    fail("MSI === false", `msi_disponible=${policiesWaActive.msi_disponible}, msi_tarjeta=${msiPayment?.available}`);
  }

  const contactChecks = [
    ["area", "Departamento de Admisiones"],
    ["email", "informes@universidadlatino.edu.mx"],
    ["whatsapp_oficial", "+52 999 453 8421"],
    ["horario_lunes_viernes", "07:00-21:00"],
    ["horario_sabado", "08:00-14:00"],
  ];
  for (const [key, expected] of contactChecks) {
    if (contact[key] === expected) pass(`contacto.${key}`, expected);
    else fail(`contacto.${key}`, `esperado "${expected}", got "${contact[key]}"`);
  }

  if (policiesWaActive.practicas_profesionales_garantizadas === true) {
    pass("practicas_profesionales_garantizadas", "true");
  } else {
    fail("practicas_profesionales_garantizadas", String(policiesWaActive.practicas_profesionales_garantizadas));
  }

  for (const key of MARKETING_CLAIM_KEYS) {
    const p = policiesRaw[key];
    if (p && p.excluded_from_wa && p.pending_validation) {
      pass(`claim excluido WA: ${key}`, "excluded_from_wa");
    } else {
      fail(`claim excluido WA: ${key}`, JSON.stringify(p));
    }
  }

  if (policiesRaw.resumen_ia_usar_en_wa?.value === false) {
    pass("resumen_ia_usar_en_wa", "false");
  } else {
    fail("resumen_ia_usar_en_wa", String(policiesRaw.resumen_ia_usar_en_wa?.value));
  }

  const badPrices = careers.filter(
    (c) => !Number.isFinite(c.monthly_price) || !Number.isFinite(c.enrollment_price),
  );
  if (badPrices.length === 0) pass("costos numéricos limpios", "12/12");
  else fail("costos numéricos limpios", badPrices.map((c) => c.id).join(", "));

  const becaInCareers = careersRaw.headers.includes("Becas de Excelencia");
  if (!becaInCareers) pass("sin reglas beca duplicadas en careers", "columna ausente en v2");
  else fail("sin reglas beca duplicadas en careers", "columna Becas de Excelencia presente");

  const hasFailures = report.validations.some((v) => v.status === "FAIL");
  if (hasFailures) {
    warn("Build completado con validaciones FALLIDAS — revisar antes de 7B.2");
  }

  return { sourceOfTruth, report, hasFailures };
}

function generateJs(sourceOfTruth) {
  const json = JSON.stringify(sourceOfTruth, null, 2);
  return `// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Generated by scripts/build-source-of-truth.js
// Source: docs/knowledge/sources/*.csv
// Rebuild: node scripts/build-source-of-truth.js

export const SOURCE_TRUTH_VERSION = ${JSON.stringify(SOURCE_TRUTH_VERSION)};

export const SOURCE_OF_TRUTH = ${json};

export default SOURCE_OF_TRUTH;
`;
}

function generateReport({ sourceOfTruth, report, hasFailures }) {
  const lines = [
    "# Source of Truth — Build Report",
    "",
    `> **Generado:** ${sourceOfTruth.meta.generated_at}`,
    `> **Versión:** ${SOURCE_TRUTH_VERSION}`,
    `> **Estado:** ${hasFailures ? "FAIL — revisar validaciones" : "PASS — listo para 7B.2"}`,
    "",
    "## Archivos leídos",
    "",
    ...report.readFiles.map((f) => `- \`${path.relative(ROOT, f)}\``),
    "",
    "## Filas por archivo",
    "",
    "| Archivo | Filas |",
    "|---|---:|",
    ...Object.entries(report.rowCounts).map(([k, v]) => `| ${k} | ${v} |`),
    "",
    "## Validaciones",
    "",
    "| Estado | Validación | Detalle |",
    "|---|---|---|",
    ...report.validations.map((v) => `| ${v.status} | ${v.name} | ${v.detail} |`),
    "",
    "## Warnings",
    "",
    ...(report.warnings.length ? report.warnings.map((w) => `- ${w}`) : ["- (ninguno)"]),
    "",
    "## pending_validation",
    "",
    ...(report.pendingValidation.length
      ? report.pendingValidation.map((p) => `- ${p}`)
      : ["- (ninguno)"]),
    "",
    "## Excluidos de WA",
    "",
    ...(report.excludedFromWa.length
      ? report.excludedFromWa.map((e) => `- ${e}`)
      : ["- (ninguno)"]),
    "",
    "## Resumen del objeto generado",
    "",
    `- \`careers\`: ${sourceOfTruth.careers.length} entradas`,
    `- \`scholarships\`: ${sourceOfTruth.scholarships.length} tramos`,
    `- \`policies\` (WA activas): ${Object.keys(sourceOfTruth.policies).filter((k) => !k.startsWith("_")).length} claves`,
    `- \`modalities\`: ${sourceOfTruth.modalities.length}`,
    `- \`documents\`: ${sourceOfTruth.documents.length}`,
    `- \`admissionProcess\`: ${sourceOfTruth.admissionProcess.length} pasos`,
    `- \`paymentMethods\`: ${sourceOfTruth.paymentMethods.length}`,
    `- \`additionalCosts\`: ${sourceOfTruth.additionalCosts.length}`,
    `- \`contact\`: ${Object.keys(sourceOfTruth.contact).filter((k) => !k.endsWith("_notas")).length} campos`,
    `- \`catalogMeta.programas_unicos_calculado\`: ${sourceOfTruth.catalogMeta.programas_unicos_calculado}`,
    "",
    "## Salida",
    "",
    `- \`insforge/functions/lib/academic-engine/source-of-truth.js\``,
    "",
    "## Recomendación Fase 7B.2 (academic-engine)",
    "",
    hasFailures
      ? "1. Corregir validaciones FAIL antes de implementar academic-engine."
      : "1. Proceder con port de `normalizer`, `entityExtractor`, `intentEngine`, `responseBuilder` leyendo `SOURCE_OF_TRUTH`.",
    "2. Usar `policies.respuesta_requisitos_especificos_ss_practicas` para detalle no validado por carrera.",
    "3. No leer `careers[].web_only` ni claims en `_meta.excluded_from_wa` en respuestas automáticas.",
    "4. Regenerar este artefacto tras cada cambio en CSV: `node scripts/build-source-of-truth.js`.",
    "5. Probar en mock (`ACADEMIC_ENGINE_ENABLED`) antes de cualquier deploy.",
    "",
  ];
  return lines.join("\n");
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const { sourceOfTruth, report, hasFailures } = build();
  const js = generateJs(sourceOfTruth);
  fs.writeFileSync(OUTPUT_FILE, js, "utf8");
  fs.writeFileSync(REPORT_FILE, generateReport({ sourceOfTruth, report, hasFailures }), "utf8");

  const fails = report.validations.filter((v) => v.status === "FAIL").length;
  const passes = report.validations.filter((v) => v.status === "PASS").length;
  console.log(`Wrote ${OUTPUT_FILE}`);
  console.log(`Wrote ${REPORT_FILE}`);
  console.log(`Validations: ${passes} pass, ${fails} fail, ${report.warnings.length} warnings`);
  process.exit(hasFailures ? 1 : 0);
}

main();
