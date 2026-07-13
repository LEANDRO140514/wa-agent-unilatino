# RECON-1 — Reconciliación de catálogos UV

## Por qué existe
Durante la transición al destino B (un solo ADN por cliente — ver
multi-tenant-agent-conformation-v1.md en el monorepo), el conocimiento de
Universidad Latino vive DUPLICADO: el source-of-truth de este runtime
(csv-sources) y verticals/universidad-latino/ del monorepo. Dos fuentes de
verdad = deriva garantizada. RECON-1 es el seguro vigente hasta unificar.

## Qué verifica
R1/R2 mismas carreras en ambas direcciones (clave canónica, sin acentos) ·
R3 modalidad equivalente por carrera (Presencial/Sabatina/En línea, con
normalización online↔en_linea, sabatino↔sabatina) · R4 conteo esperado (12).

## Cómo correrlo
node tests/run-recon-1-catalog-parity.mjs
  · localiza el monorepo como repo hermano (../curdeeclau-monorepo) o vía
    RECON_MONOREPO_DIR=<ruta>
  · sin monorepo disponible → SKIP con advertencia (exit 0)
  · divergencia → FAIL exit 1 nombrando las carreras/modalidades divergentes

## Política operativa
1. Correr RECON-1 ANTES y DESPUÉS de cualquier cambio de catálogo en
   cualquiera de los dos repos.
2. Si falla: el catálogo DESACTUALIZADO se corrige primero; ninguna fase de
   conocimiento avanza con divergencia abierta.
3. Fecha de baseline: 2026-07-13, paridad 12/12 verificada
   (SOURCE_TRUTH_VERSION csv-sources-2026-06-18).
4. RECON-1 muere el día que el destino B unifique el ADN — su obituario
   será la mejor noticia del proyecto.
