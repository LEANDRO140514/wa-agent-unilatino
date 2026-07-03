# 7G.6D — Controlled live readiness report

**Date:** 2026-07-03  
**Phase:** 7G.6D — Preparación piloto live con allowlist  
**Base commit:** `071d970` (post 7G.6C push)  
**Runtime deployado:** ENG-0D (`2dabd21`)  
**Endpoint:** https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound

---

## 1. Preflight

| Check | Resultado |
|-------|-----------|
| Git branch | `main` |
| HEAD | `071d970` |
| origin/main | `071d970` (HEAD = origin) |
| Working tree | Clean except 7G.6D deliverables untracked (sin commit por diseño) |
| Live activado | **No** — fase preparación únicamente |

---

## 2. Flags remotos confirmados

Probe readiness + suites:

| Flag | Valor | OK |
|------|-------|:--:|
| `WA_AGENT_MODE` / `mode` | `mock` | ✅ |
| `GHL_SYNC_MODE` / `ghl_sync_mode` | `dry_run` | ✅ |
| `GHL_WRITE_CUSTOM_FIELDS` / `custom_fields_written` | `false` | ✅ |
| `ACADEMIC_ENGINE_ENABLED` | `true` | ✅ |
| `EVA_LLM_ENABLED` | `false` | ✅ |
| `outbound_real` | `false` | ✅ |
| `ghl_live` | `false` | ✅ |

Sin flags live detectados — no abort.

---

## 3. Documentos creados

| Archivo | Estado |
|---------|--------|
| `docs/phase-7g6d-controlled-live-activation-plan.md` | ✅ Creado |
| `docs/phase-7g6d-pre-live-checklist.md` | ✅ Creado |
| `docs/phase-7g6d-rollback-checklist.md` | ✅ Creado |
| `tests/run-phase-7g6d-live-readiness.mjs` | ✅ Creado |
| `docs/phase-7g6d-controlled-live-readiness-report.md` | ✅ Este documento |

During-live checklist integrado en plan §12 (monitoreo primera hora).

---

## 4. Runner readiness

**Script:** `tests/run-phase-7g6d-live-readiness.mjs`  
**Evidencia:** `tests/.phase-7g6d-live-readiness-results.json`

Validaciones del runner:

- Git hygiene (sin modified/staged tracked)
- Runtime probe flags seguros
- Orquesta: 7G.6C · VAL-0 · ENG-0C · ENG-0B · Smoke 7C
- Falla si runtime live sin autorización
- `PHASE_7G6D_STRICT_GIT=1` — falla además en untracked (usar antes de 7G.6E)

---

## 5. Resultados de suites

| Suite | Resultado |
|-------|-----------|
| **7G.6D readiness** | **PASS** |
| 7G.6C | **7/7 PASS** |
| VAL-0 | **7/7 PASS** |
| ENG-0C | **17/17 PASS** |
| ENG-0B | **4/4 PASS** |
| Smoke 7C | **10/10 PASS** |

---

## 6. GO / NO-GO preliminar

| Criterio | Estado |
|----------|--------|
| Prep documentación 7G.6D | ✅ Completa |
| Suites mock/dry_run | ✅ Todas PASS |
| Flags seguros | ✅ Confirmados |
| Autorización Leandro para live | ❌ **Pendiente** |
| Allowlist E.164 en InsForge | ❌ **Pendiente** (solo placeholders en docs) |
| Asesores en sesión | ❌ **Pendiente** |

### Decisión preliminar

| | |
|---|---|
| **GO prep 7G.6D** | ✅ **Sí** — documentación y runner listos |
| **GO activación live (7G.6E)** | **NO** — requiere autorización explícita Leandro + allowlist real + pre-live checklist firmado |

---

## 7. Riesgos pendientes

1. **Activación live** — ningún secret cambiado en 7G.6D; riesgo controlado.
2. **Allowlist** — E.164 reales no deben commitearse al repo.
3. **Strict git** — antes de 7G.6E ejecutar readiness con `PHASE_7G6D_STRICT_GIT=1` tras commit de artefactos 7G.6D.
4. **Smoke 7C** — regenera reporte 7C; revertir antes de commits futuros.
5. **Rollback** — depende de acceso InsForge en ventana de sesión.

---

## 8. Qué autorización explícita falta para 7G.6E

| # | Autorización requerida |
|---|------------------------|
| 1 | Leandro: GO escrito para sesión live 45–60 min |
| 2 | Leandro: CSV E.164 reales en `GHL_LIVE_ALLOWED_PHONES` (InsForge) |
| 3 | Secuencia flags: `GHL_SYNC_MODE=live` → `GHL_WRITE_CUSTOM_FIELDS=true` → `WA_AGENT_MODE=live_outbound` |
| 4 | Asesores disponibles + guion operativo |
| 5 | Pre-live checklist (`phase-7g6d-pre-live-checklist.md`) completado y firmado |
| 6 | Rollback checklist a mano durante sesión |

**NO autorizado en 7G.6D:** Meta Ads · EVA_LLM · tráfico orgánico abierto · YCloud webhook changes.

---

## 9. wa_errors recientes

| Ventana | Resultado |
|---------|-----------|
| Últimos 30 min | **0 errores** (sin filas) |
| Críticos | **0** |

---

## 10. Recomendación

| Acción | Recomendación |
|--------|---------------|
| Commit/push 7G.6D | **Listo cuando Leandro apruebe** — no requerido corrección previa |
| Siguiente fase | **7G.6E** — activación live controlada con allowlist (solo post-autorización) |

---

## Resumen ejecutivo

| Item | Resultado |
|------|-----------|
| 7G.6D readiness | **PASS** |
| 7G.6C | **7/7 PASS** |
| VAL-0 | **7/7 PASS** |
| ENG-0C | **17/17 PASS** |
| ENG-0B | **4/4 PASS** |
| Smoke 7C | **10/10 PASS** |
| Modo live | **No activado** |
| GO 7G.6E (live) | **NO** — prep completa, autorización pendiente |
