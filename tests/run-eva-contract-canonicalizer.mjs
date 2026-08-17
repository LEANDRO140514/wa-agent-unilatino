#!/usr/bin/env node
/**
 * Eva Contract — Academic Canonicalizer v1 (unidad aislada, sin runtime).
 *
 * Cubre: catálogo canónico de 11 combos, sinónimos de modalidad,
 * compatibilidad legacy (Ventas y Mercadotecnia / Mercadotecnia Global),
 * sabatina fail-closed, combinaciones no ofertadas y determinismo.
 *
 * Usage: node tests/run-eva-contract-canonicalizer.mjs
 */
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CANONICALIZER_PATH = path.join(
  ROOT,
  "insforge/functions/lib/eva-contract/academic-canonicalizer.js",
);

const { canonicalizeModality, canonicalizeCareerModality } = await import(
  pathToFileURL(CANONICALIZER_PATH).href
);

let failures = 0;
function check(name, cond, detail = "") {
  console.log(`[${cond ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures += 1;
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ── 1. Derecho presencial -> derecho/presencial known ──────────────
{
  const r = canonicalizeCareerModality({ careerRaw: "Derecho", modalityRaw: "presencial" });
  check(
    "1. Derecho + presencial -> derecho/presencial known",
    r.career_key === "derecho" && r.modality_key === "presencial" && r.status === "known",
    JSON.stringify(r),
  );
}

// ── 2. Derecho Online + online -> derecho_online/en_linea known ────
{
  const r = canonicalizeCareerModality({ careerRaw: "Derecho Online", modalityRaw: "online" });
  check(
    "2. Derecho Online + online -> derecho_online/en_linea known",
    r.career_key === "derecho_online" && r.modality_key === "en_linea" && r.status === "known",
    JSON.stringify(r),
  );
}

// ── 3. virtual -> en_linea ──────────────────────────────────────────
check(
  "3. virtual -> en_linea",
  canonicalizeModality("virtual") === "en_linea",
  canonicalizeModality("virtual"),
);

// ── 4. a distancia -> en_linea ──────────────────────────────────────
check(
  "4. a distancia -> en_linea",
  canonicalizeModality("a distancia") === "en_linea",
  canonicalizeModality("a distancia"),
);

// ── 5. Ventas y Mercadotecnia + presencial -> mercadotecnia_global/presencial known (legacy alias) ──
{
  const r = canonicalizeCareerModality({
    careerRaw: "Ventas y Mercadotecnia",
    modalityRaw: "presencial",
  });
  check(
    "5. Ventas y Mercadotecnia + presencial -> mercadotecnia_global/presencial known",
    r.career_key === "mercadotecnia_global" &&
      r.modality_key === "presencial" &&
      r.status === "known",
    JSON.stringify(r),
  );
}

// ── 6. Mercadotecnia Global + presencial -> mercadotecnia_global/presencial known ──
{
  const r = canonicalizeCareerModality({
    careerRaw: "Mercadotecnia Global",
    modalityRaw: "presencial",
  });
  check(
    "6. Mercadotecnia Global + presencial -> mercadotecnia_global/presencial known",
    r.career_key === "mercadotecnia_global" &&
      r.modality_key === "presencial" &&
      r.status === "known",
    JSON.stringify(r),
  );
}

// ── 7. Ventas y Mercadotecnia Online + en_linea -> ventas_y_mercadotecnia_online/en_linea known ──
{
  const r = canonicalizeCareerModality({
    careerRaw: "Ventas y Mercadotecnia Online",
    modalityRaw: "en_linea",
  });
  check(
    "7. Ventas y Mercadotecnia Online + en_linea -> ventas_y_mercadotecnia_online/en_linea known",
    r.career_key === "ventas_y_mercadotecnia_online" &&
      r.modality_key === "en_linea" &&
      r.status === "known",
    JSON.stringify(r),
  );
}

// ── 7b. "Ventas y Mercadotecnia" alias never bleeds into the online SKU ──
{
  const r = canonicalizeCareerModality({
    careerRaw: "Ventas y Mercadotecnia",
    modalityRaw: "en_linea",
  });
  check(
    "7b. Ventas y Mercadotecnia (alias presencial) + en_linea -> no career_key (alias no cubre online)",
    r.career_key === null,
    JSON.stringify(r),
  );
}

// ── 8. Administración Sabatina + sabatina -> NO canonical career/modality; fail closed ──
{
  const r = canonicalizeCareerModality({
    careerRaw: "Administración Sabatina",
    modalityRaw: "sabatina",
  });
  check(
    "8. Administración Sabatina + sabatina -> fail closed (sin career_key ni modality_key)",
    r.career_key === null && r.modality_key === null && r.is_obsolete_offering === true,
    JSON.stringify(r),
  );
}

// ── 9. carrera válida + sabatina -> no modality_key canónica; nunca presencial ──
{
  const r = canonicalizeCareerModality({ careerRaw: "Psicología", modalityRaw: "sabatina" });
  check(
    "9. Psicología (válida) + sabatina -> modality_key null, nunca presencial",
    r.modality_key === null && r.modality_key !== "presencial" && r.career_key === null,
    JSON.stringify(r),
  );
}
{
  const r = canonicalizeCareerModality({ careerRaw: "Derecho", modalityRaw: "sabatino" });
  check(
    "9b. Derecho + sabatino -> modality_key null, nunca presencial (variante sabatino)",
    r.modality_key === null && r.career_key === null,
    JSON.stringify(r),
  );
}

// ── 10. combinación carrera/modalidad no ofertada -> no known qualification ──
{
  const r = canonicalizeCareerModality({ careerRaw: "Psicología", modalityRaw: "en_linea" });
  check(
    "10. Psicología + en_linea (no ofertada) -> status != known",
    r.status !== "known" && r.career_key === null,
    JSON.stringify(r),
  );
}
{
  const r = canonicalizeCareerModality({ careerRaw: "Gastronomía", modalityRaw: "en_linea" });
  check(
    "10b. Gastronomía + en_linea (no ofertada) -> status != known",
    r.status !== "known" && r.career_key === null,
    JSON.stringify(r),
  );
}

// ── Extra: sinónimos adicionales de modalidad (cobertura de la lista del spec) ──
for (const [raw, expected] of [
  ["en linea", "en_linea"],
  ["en línea", "en_linea"],
  ["online", "en_linea"],
  ["on line", "en_linea"],
  ["por internet", "en_linea"],
  ["presencial", "presencial"],
  ["escolarizado", "presencial"],
  ["escolarizada", "presencial"],
  ["sabatina", null],
  ["sabatino", null],
  ["", null],
  [null, null],
]) {
  const got = canonicalizeModality(raw);
  check(
    `Extra: canonicalizeModality(${JSON.stringify(raw)}) === ${JSON.stringify(expected)}`,
    got === expected,
    `got=${JSON.stringify(got)}`,
  );
}

// ── Extra: nunca inventa una combinación fuera de la matriz de 11 ──
{
  const r = canonicalizeCareerModality({
    careerRaw: "Nutrición",
    modalityRaw: "en_linea",
  });
  check(
    "Extra: Nutrición + en_linea (no existe) -> career_key null",
    r.career_key === null,
    JSON.stringify(r),
  );
}
{
  const r = canonicalizeCareerModality({ careerRaw: "Carrera Inexistente", modalityRaw: "presencial" });
  check(
    "Extra: carrera desconocida + presencial -> career_key null, status partial (solo modality_key)",
    r.career_key === null && r.modality_key === "presencial" && r.status === "partial",
    JSON.stringify(r),
  );
}

// ── 20. Determinismo: mismo input produce mismo output ─────────────
{
  const input = { careerRaw: "Ventas y Mercadotecnia Online", modalityRaw: "virtual" };
  const r1 = canonicalizeCareerModality(input);
  const r2 = canonicalizeCareerModality({ ...input });
  check(
    "20. canonicalizeCareerModality es determinístico (mismo input -> mismo output)",
    deepEqual(r1, r2),
    `${JSON.stringify(r1)} vs ${JSON.stringify(r2)}`,
  );
  check(
    "20b. canonicalizeModality es determinístico",
    canonicalizeModality("Virtual") === canonicalizeModality("Virtual"),
  );
}

// ── REGRESSION EVA-CONTRACT-V1 QUALIFICATION ────────────────────────

// Carrera con una sola combinación canónica conocida:
// no inventar modalidad, pero conservar la carrera como partial.
{
  const r = canonicalizeCareerModality({
    careerRaw: "Psicología",
    modalityRaw: null,
  });

  check(
    "R-Q1. Psicología sin modalidad -> partial con career_key, sin inventar modalidad",
    r.career_key === "psicologia" &&
      r.modality_key === null &&
      r.status === "partial",
    JSON.stringify(r),
  );
}

// Derecho tiene dos SKUs canónicos (presencial / online).
// Sin modalidad no se puede escoger uno.
{
  const r = canonicalizeCareerModality({
    careerRaw: "Derecho",
    modalityRaw: null,
  });

  check(
    "R-Q2. Derecho sin modalidad -> ambiguous; no escoger presencial ni online",
    r.career_key === null &&
      r.modality_key === null &&
      r.status === "ambiguous",
    JSON.stringify(r),
  );
}

// Alias legacy explícito de un solo SKU (Mercadotecnia Global presencial).
// "Ventas y Mercadotecnia Online" es otra oferta; no vuelve ambiguo al alias.
{
  const r = canonicalizeCareerModality({
    careerRaw: "Ventas y Mercadotecnia",
    modalityRaw: null,
  });

  check(
    "R-Q2b. Ventas y Mercadotecnia sin modalidad -> partial mercadotecnia_global, sin inventar modalidad",
    r.career_key === "mercadotecnia_global" &&
      r.modality_key === null &&
      r.status === "partial",
    JSON.stringify(r),
  );
}

// Una entrada que afirma dos modalidades incompatibles no puede resolverse
// por precedencia de sinónimos.
{
  const got = canonicalizeModality("presencial u online");

  check(
    "R-Q3. modalidad contradictoria presencial/online -> no canonicalizar por precedencia",
    got === null,
    `got=${JSON.stringify(got)}`,
  );
}

{
  const r = canonicalizeCareerModality({
    careerRaw: "Psicología",
    modalityRaw: "presencial u online",
  });

  check(
    "R-Q4. contradicción explícita de modalidad -> qualification ambiguous",
    r.career_key === null &&
      r.modality_key === null &&
      r.status === "ambiguous",
    JSON.stringify(r),
  );
}

console.log("");
if (failures > 0) {
  console.error(`Eva Contract Canonicalizer: ${failures} FALLO(S).`);
  process.exit(1);
}
console.log("Eva Contract Canonicalizer: OK — todas las verificaciones pasaron.");
