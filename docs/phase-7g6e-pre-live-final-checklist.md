# 7G.6E — Pre-live final checklist (Perfil A)

**Fase:** 7G.6E-AUTH → gate inmediato antes de activar Perfil A  
**Perfil:** A — `live_outbound` + `GHL dry_run` + `CF=false`  
**Uso:** Completar con Leandro presente. **NO activar flags hasta todos ☑.**

---

## A. Autorización explícita

| # | Check | OK | Notas |
|---|-------|:--:|-------|
| A1 | Decision record = `AUTHORIZED_BY_LEANDRO` (copia privada) | ☐ | Repo permanece `PENDING_AUTHORIZATION` |
| A2 | Perfil **A** marcado en plantilla firmada | ☐ | |
| A3 | Ventana fecha/hora inicio-fin definida | ☐ | Máx. 60 min |
| A4 | Responsable monitoreo nombrado | ☐ | |
| A5 | Responsable rollback nombrado | ☐ | |

---

## B. Allowlist real

| # | Check | OK | Notas |
|---|-------|:--:|-------|
| B1 | `GHL_LIVE_ALLOWED_PHONES` cargado en InsForge | ☐ | 3 E.164 mínimo piloto |
| B2 | Allowlist check runner ejecutado | ☐ | ver §H |
| B3 | `allowlist_count` ≥ 3 | ☐ | Solo count, no valores |
| B4 | `all_values_e164_like=true` (env local o verificación manual) | ☐ | |
| B5 | **Sin teléfonos reales en repo** | ☐ | `git grep` limpio |

```powershell
node tests/run-phase-7g6e-allowlist-secret-check.mjs
# Strict (con env local): $env:PHASE_7G6E_ALLOWLIST_STRICT="1"; $env:PHASE_7G6E_ALLOWLIST_MIN_COUNT="3"
```

---

## C. Equipo y horario

| # | Check | OK | Notas |
|---|-------|:--:|-------|
| C1 | Asesor admisiones disponible | ☐ | |
| C2 | Leandro disponible (GO/rollback) | ☐ | |
| C3 | Responsable técnico monitoreo | ☐ | |
| C4 | Horario confirmado (L–V 10:00–18:00 CDMX sugerido) | ☐ | |
| C5 | Guion operativo revisado | ☐ | `phase-7g6c-admissions-operator-script.md` |

---

## D. Flags ANTES de activar (deben estar así)

| Secret | Valor requerido pre-activación | OK | Actual |
|--------|-------------------------------|:--:|--------|
| `WA_AGENT_MODE` | **`mock`** | ☐ | |
| `GHL_SYNC_MODE` | **`dry_run`** | ☐ | |
| `GHL_WRITE_CUSTOM_FIELDS` | **`false`** | ☐ | |
| `EVA_LLM_ENABLED` | **`false`** | ☐ | |
| `ACADEMIC_ENGINE_ENABLED` | **`true`** | ☐ | |

Probe runtime:

```powershell
node tests/run-phase-7g6e-live-readiness-strict.mjs
```

Esperado pre-activación: `outbound_real=false`, `ghl_live=false`.

---

## E. Rollback listo

| # | Check | OK | Notas |
|---|-------|:--:|-------|
| E1 | Rollback runbook abierto | ☐ | `phase-7g6d-rollback-checklist.md` |
| E2 | Acceso InsForge secrets confirmado | ☐ | |
| E3 | Tiempo objetivo rollback ≤1 min | ☐ | |
| E4 | Post-rollback readiness planificado | ☐ | |

---

## F. Suites PASS

```powershell
$env:PHASE_7G6E_FULL_STRICT="1"
node tests/run-phase-7g6e-live-readiness-strict.mjs
```

| Suite | Esperado | OK |
|-------|----------|:--:|
| 7G.6E strict (FULL_STRICT) | PASS | ☐ |
| 7G.6D | PASS | ☐ |
| 7G.6C | 7/7 PASS | ☐ |
| VAL-0 | 7/7 PASS | ☐ |
| ENG-0C | 17/17 PASS | ☐ |
| ENG-0B | 4/4 PASS | ☐ |
| Smoke 7C | 10/10 PASS | ☐ |

---

## G. wa_errors limpio

| # | Check | OK | Notas |
|---|-------|:--:|-------|
| G1 | Críticos últimos 30 min = **0** | ☐ | Excl. `phone_normalization_failed` histórico |

---

## H. Allowlist check

| Resultado runner | Acción |
|------------------|--------|
| `PASS` | Proceder |
| `MANUAL_VERIFICATION_REQUIRED` | Leandro confirma InsForge manualmente → marcar B1–B4 |
| `FAIL` | **NO-GO** — corregir allowlist |

---

## I. Secuencia activación Perfil A (solo tras todos ☑)

| Paso | Acción | OK |
|:----:|--------|:--:|
| 1 | Confirmar checklist completo | ☐ |
| 2 | Allowlist 3 E.164 en InsForge | ☐ |
| 3 | **`WA_AGENT_MODE=live_outbound`** | ☐ |
| 4 | **NO cambiar** `GHL_SYNC_MODE` (permanece `dry_run`) | ☐ |
| 5 | **NO cambiar** `GHL_WRITE_CUSTOM_FIELDS` (permanece `false`) | ☐ |
| 6 | Probe: `outbound_real=true`, `ghl_sync_mode=dry_run` | ☐ |
| 7 | Iniciar guion asesores | ☐ |

---

## Decisión final

| Resultado | Acción |
|-----------|--------|
| Todos ☑ | **GO** — ejecutar Perfil A (pasos §I) |
| Cualquier ☐ | **NO-GO** — no cambiar `WA_AGENT_MODE` |

**Firma GO Perfil A:** _________________ (Leandro) · **Fecha/hora:** _________________
