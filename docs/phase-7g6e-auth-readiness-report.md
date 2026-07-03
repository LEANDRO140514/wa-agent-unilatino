# 7G.6E-AUTH — Authorization readiness report

**Date:** 2026-07-03  
**Phase:** 7G.6E-AUTH — Autorización explícita y allowlist real para Perfil A  
**Base commit:** `6e8c572` (post 7G.6E-PREP push)  
**Endpoint:** https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound

---

## 1. Preflight

| Check | Resultado |
|-------|-----------|
| Git branch | `main` |
| HEAD | `6e8c572` |
| origin/main | `6e8c572` (HEAD = origin) |
| Working tree | Clean except 7G.6E-AUTH deliverables untracked (sin commit por diseño) |
| Live activado | **No** |

---

## 2. Flags remotos confirmados

| Flag | Valor | OK |
|------|-------|:--:|
| `WA_AGENT_MODE` / `mode` | `mock` | ✅ |
| `GHL_SYNC_MODE` / `ghl_sync_mode` | `dry_run` | ✅ |
| `GHL_WRITE_CUSTOM_FIELDS` / `custom_fields_written` | `false` | ✅ |
| `ACADEMIC_ENGINE_ENABLED` | `true` | ✅ |
| `EVA_LLM_ENABLED` | `false` | ✅ |
| `outbound_real` | `false` | ✅ |
| `ghl_live` | `false` | ✅ |

---

## 3. Estado de autorización

| Campo | Valor |
|-------|-------|
| **Estado** | **`PENDING_AUTHORIZATION`** |
| **Perfil objetivo** | **Perfil A** |
| Firma Leandro | Pendiente |
| Documento | `phase-7g6e-auth-decision-record.md` |

**Qué falta:** copia privada firmada de `phase-7g6e-live-authorization-template.md` con ventana y responsables.

---

## 4. Estado allowlist

| Campo | Valor |
|-------|-------|
| Secret | `GHL_LIVE_ALLOWED_PHONES` |
| Local env presente | **No** (esperado — no en repo) |
| `allowlist_configured` | **false** (runner) |
| `allowlist_count` | **0** (sin env local; remote metadata null en probe) |
| Piloto requiere | **3** E.164 (owner + 2 asesores) |
| Teléfonos en repo | **Ninguno** (correcto) |

**Acción:** Leandro debe cargar allowlist real en InsForge y confirmar manualmente (InsForge console).

---

## 5. Runner allowlist

**Script:** `tests/run-phase-7g6e-allowlist-secret-check.mjs`  
**Evidencia:** `tests/.phase-7g6e-allowlist-secret-check-results.json`

| Resultado | **MANUAL_VERIFICATION_REQUIRED** |
|-----------|-------------------------------------|
| Exit code | 0 (no fail — modo no-strict) |
| Valores E.164 impresos | **Ninguno** |

Strict mode (`PHASE_7G6E_ALLOWLIST_STRICT=1` + env local) requerido antes de activación Perfil A.

---

## 6. Strict readiness

**Script:** `tests/run-phase-7g6e-live-readiness-strict.mjs`  
**Resultado:** **PASS**

Incluye: HEAD=origin, runtime mock/dry_run, 7G.6C · VAL-0 · ENG-0C · ENG-0B · Smoke 7C.

**Nota:** ENG-0C registró 1 fallo transitorio C11 (`ok=false`) durante batch largo; re-run inmediato **17/17 PASS**.

---

## 7. GO / NO-GO para ejecutar Perfil A

| Criterio | Estado |
|----------|--------|
| Prep técnica (suites) | ✅ PASS |
| Runtime seguro | ✅ mock/dry_run |
| Authorization record | ❌ PENDING |
| Allowlist 3 E.164 InsForge | ❌ Pendiente Leandro |
| Pre-live final checklist firmado | ❌ Pendiente |
| `PHASE_7G6E_FULL_STRICT=1` pre-activación | ❌ Pendiente (post-commit AUTH) |

### Decisión

| | |
|---|---|
| **GO prep 7G.6E-AUTH** | ✅ Documentación lista |
| **GO activar Perfil A (7G.6E)** | **NO-GO** — esperar autorización manual Leandro |

---

## 8. Riesgos pendientes

1. Allowlist no verificable desde CI/local sin env — verificación manual obligatoria.
2. Perfil A activa WA real — rollback ≤1 min debe estar a mano.
3. ENG-0C ocasional timeout/transiente bajo carga — re-run si falla antes de GO.
4. `PHASE_7G6E_FULL_STRICT=1` obligatorio inmediatamente antes de cambiar `WA_AGENT_MODE`.

---

## 9. Qué falta antes de activar Perfil A

| # | Item |
|---|------|
| 1 | Leandro firma plantilla autorización (copia privada) |
| 2 | `GHL_LIVE_ALLOWED_PHONES` = 3 E.164 en InsForge |
| 3 | Pre-live final checklist completado y firmado |
| 4 | Commit/push 7G.6E-AUTH (opcional previo) |
| 5 | `$env:PHASE_7G6E_FULL_STRICT="1"` + strict readiness PASS |
| 6 | Solo entonces: `WA_AGENT_MODE=live_outbound` (mantener GHL dry_run) |

---

## wa_errors recientes

| Ventana | Críticos (excl. phone_normalization_failed) |
|---------|---------------------------------------------|
| Últimos 30 min | **0** |

---

## Resultados suites (validación 7G.6E-AUTH)

| Suite | Resultado |
|-------|-----------|
| Allowlist check | **MANUAL_VERIFICATION_REQUIRED** |
| 7G.6E strict readiness | **PASS** |
| 7G.6D | **PASS** |
| 7G.6C | **7/7 PASS** |
| VAL-0 | **7/7 PASS** |
| ENG-0C | **17/17 PASS** (re-run tras transiente) |
| ENG-0B | **4/4 PASS** |
| Smoke 7C | **10/10 PASS** |

---

## Recomendación

| Acción | Recomendación |
|--------|---------------|
| Commit/push 7G.6E-AUTH | Tras aprobación Leandro — no bloqueado técnicamente |
| Activar Perfil A | **Esperar autorización manual** — NO-GO hasta items §9 |

---

## Resumen ejecutivo

| Item | Resultado |
|------|-----------|
| Autorización | **PENDING_AUTHORIZATION** |
| Allowlist | **Manual verification required** |
| Perfil recomendado | **A** |
| Strict readiness | **PASS** |
| GO Perfil A | **NO-GO** |
