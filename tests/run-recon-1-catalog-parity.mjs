#!/usr/bin/env node
/**
 * RECON-1 — Reconciliación de catálogos Universidad Latino.
 *
 * PROBLEMA: el ADN de UV vive duplicado durante la transición al destino B
 * (multi-tenant-agent-conformation-v1.md): el source-of-truth de este
 * runtime y el CSV de verticals/universidad-latino/ en curdeeclau-monorepo
 * describen la MISMA realidad. Dos fuentes de verdad = deriva garantizada.
 *
 * ESTE SCRIPT: compara carreras (nombre canónico) y modalidades entre
 * ambos y FALLA si divergen. Es el seguro vigente hasta unificar el ADN.
 *
 * Usage:
 *   node tests/run-recon-1-catalog-parity.mjs
 *   RECON_MONOREPO_DIR=/ruta/a/curdeeclau-monorepo node tests/run-recon-1-catalog-parity.mjs
 *
 * Si el monorepo no está disponible (checkout aislado/CI de este repo),
 * el script hace SKIP con advertencia y exit 0 — la reconciliación exige
 * ambos repos, no castiga su ausencia.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let failures = 0;
function check(name, cond, detail = "") {
  console.log(`[${cond ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures += 1;
}

// ── Localizar el monorepo (peer) ───────────────────────────
const CANDIDATES = [
  process.env.RECON_MONOREPO_DIR,
  path.resolve(ROOT, "../curdeeclau-monorepo"),
].filter(Boolean);
const monorepoDir = CANDIDATES.find((d) => fs.existsSync(path.join(d, "verticals/universidad-latino/knowledge/catalogo-carreras.csv")));

if (!monorepoDir) {
  console.warn("[SKIP] RECON-1: curdeeclau-monorepo no disponible junto a este repo.");
  console.warn("       Ejecuta con RECON_MONOREPO_DIR=<ruta> para reconciliar.");
  console.warn("       La reconciliación es OBLIGATORIA antes de cambios de catálogo.");
  process.exit(0);
}
console.log(`RECON-1: monorepo en ${monorepoDir}`);

// ── Normalización compartida (misma regla que toCarreraKey de core) ──
function normalize(text) {
  return String(text || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
    .toUpperCase();
}
function normalizeModalidad(text) {
  const n = String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[_\s]+/g, " ").trim();
  if (["en linea", "online", "en_linea"].includes(n)) return "en linea";
  if (["sabatina", "sabatino"].includes(n)) return "sabatina";
  return n;
}

// ── Lado A: SOT de wa-agent ────────────────────────────────
const { SOURCE_OF_TRUTH, SOURCE_TRUTH_VERSION } = await import(
  pathToFileURL(path.join(ROOT, "insforge/functions/lib/academic-engine/source-of-truth.js")).href
);
const agentCareers = new Map(
  (SOURCE_OF_TRUTH.careers || [])
    .filter((c) => c.active !== false)
    .map((c) => [normalize(c.name), { name: c.name, modalidad: normalizeModalidad(c.modality_label || c.modality_code) }]),
);

// ── Lado B: CSV del monorepo (parser CSV mínimo con comillas) ──
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQ) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQ = false;
      else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((f) => f.trim() !== "")) rows.push(row); }
  const [header, ...data] = rows;
  return data.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

const csvText = fs.readFileSync(path.join(monorepoDir, "verticals/universidad-latino/knowledge/catalogo-carreras.csv"), "utf-8");
const csvCareers = new Map(
  parseCSV(csvText)
    .filter((r) => r["Carrera"])
    .map((r) => [normalize(r["Carrera"]), { name: r["Carrera"], modalidad: normalizeModalidad(r["Modalidad"]) }]),
);

// ── Reconciliación ─────────────────────────────────────────
console.log(`Agente: ${agentCareers.size} carreras (${SOURCE_TRUTH_VERSION}) · Monorepo: ${csvCareers.size} carreras`);

const onlyAgent = [...agentCareers.keys()].filter((k) => !csvCareers.has(k));
const onlyCsv = [...csvCareers.keys()].filter((k) => !agentCareers.has(k));
check("R1 mismas carreras (agente ⊆ monorepo)", onlyAgent.length === 0, onlyAgent.join(", ") || "");
check("R2 mismas carreras (monorepo ⊆ agente)", onlyCsv.length === 0, onlyCsv.join(", ") || "");

const modalidadDiffs = [];
for (const [key, a] of agentCareers) {
  const b = csvCareers.get(key);
  if (b && a.modalidad !== b.modalidad) modalidadDiffs.push(`${a.name}: agente=${a.modalidad} vs monorepo=${b.modalidad}`);
}
check("R3 modalidades equivalentes por carrera", modalidadDiffs.length === 0, modalidadDiffs.join(" | ") || "");

check("R4 conteo esperado del catálogo UV (12)", agentCareers.size === 12 && csvCareers.size === 12, `${agentCareers.size}/${csvCareers.size}`);

console.log("");
if (failures > 0) {
  console.error("RECON-1: DIVERGENCIA DETECTADA — los dos ADN de UV ya no describen la misma realidad.");
  console.error("Corrige el catálogo desactualizado ANTES de cualquier otra fase de conocimiento.");
  process.exit(1);
}
console.log("RECON-1: OK — catálogos reconciliados (paridad de carreras y modalidades)");
