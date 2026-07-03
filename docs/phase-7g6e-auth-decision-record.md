# 7G.6E-AUTH — Authorization decision record

**Fase:** 7G.6E-AUTH — Autorización explícita y allowlist real para Perfil A  
**Date:** 2026-07-03  
**Base commit:** `6e8c572` (post 7G.6E-PREP push)

---

## Estado de autorización

| Campo | Valor |
|-------|-------|
| **Estado** | **`PENDING_AUTHORIZATION`** |
| **Perfil recomendado** | **Perfil A** |
| **Firmado por Leandro** | No (pendiente) |
| **Fecha firma** | — |

> Cuando Leandro autorice, actualizar copia **privada** (no commitear al repo) a `AUTHORIZED_BY_LEANDRO` y registrar fecha/hora.

---

## Perfil A — Qué se autorizaría (cuando se firme)

| Flag | Valor Perfil A |
|------|----------------|
| `WA_AGENT_MODE` | `live_outbound` |
| `GHL_SYNC_MODE` | `dry_run` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` |
| `EVA_LLM_ENABLED` | `false` |
| `ACADEMIC_ENGINE_ENABLED` | `true` |

**Efecto operativo:**

| Canal | Live cuando se active 7G.6E |
|-------|----------------------------|
| WhatsApp outbound | **Sí** (allowlist) |
| GHL sync | **No** (dry_run) |
| Custom fields GHL | **No** |
| LLM / OpenAI | **No** |

---

## Qué se autoriza (scope Perfil A)

- Respuestas WhatsApp **reales** a números en allowlist InsForge
- Procesamiento inbound normal (classifyIntent, academic-engine)
- GHL en **shadow/dry_run** (`ghl_would_create_task`, tags simulados en logs)
- Sesión piloto 45–60 min supervisada
- Rollback a mock/dry_run al cierre o incidente

---

## Qué NO se autoriza

| Prohibido | Motivo |
|-----------|--------|
| `GHL_SYNC_MODE=live` | Fuera de Perfil A |
| `GHL_WRITE_CUSTOM_FIELDS=true` | Fuera de Perfil A |
| `EVA_LLM_ENABLED=true` | No autorizado en piloto |
| Meta Ads | Fuera de scope |
| Teléfonos fuera de allowlist | Guard allowlist |
| Tráfico orgánico abierto | Solo allowlist explícita |
| Modificar YCloud webhook | Fuera de scope |
| E.164 reales en repo Git | Seguridad |

---

## Ventana autorizada (pendiente)

| Campo | Valor |
|-------|-------|
| Fecha | _Pendiente — completar en copia firmada_ |
| Hora inicio | _Pendiente_ |
| Hora fin (máx. 60 min) | _Pendiente_ |
| Duración máxima | 45–60 minutos |

---

## Responsables (pendiente)

| Rol | Persona | Estado |
|-----|---------|--------|
| Owner / GO-NO-GO | Leandro | Pendiente firma |
| Responsable monitoreo | _TBD en sesión_ | Pendiente |
| Responsable rollback | _TBD en sesión_ | Pendiente |
| Asesor admisiones 1 | _TBD_ | Pendiente confirmación |
| Asesor admisiones 2 | _TBD_ | Pendiente confirmación |

---

## Allowlist

| Campo | Valor |
|-------|-------|
| Secret InsForge | `GHL_LIVE_ALLOWED_PHONES` |
| **Cantidad requerida (piloto)** | **3** (owner + 2 asesores) |
| **Cantidad configurada (runtime remoto)** | **1** (según probe — owner-only default) |
| Valores E.164 | **No documentados en repo** |

**Acción pendiente:** Leandro carga CSV E.164 real en InsForge (3 números mínimo) **sin commitear al repo**.

Verificación: `node tests/run-phase-7g6e-allowlist-secret-check.mjs`

---

## Orden de activación 7G.6E Perfil A (NO ejecutar hasta AUTHORIZED)

1. Estado = `AUTHORIZED_BY_LEANDRO` (copia privada firmada)
2. Allowlist 3 E.164 en InsForge
3. `PHASE_7G6E_FULL_STRICT=1` + strict readiness PASS
4. Pre-live final checklist completado
5. `GHL_LIVE_ALLOWED_PHONES` confirmado (allowlist check PASS o strict)
6. **`WA_AGENT_MODE=live_outbound`** (último paso antes de probe)
7. Mantener `GHL_SYNC_MODE=dry_run`, `GHL_WRITE_CUSTOM_FIELDS=false`
8. Probe allowlist → `outbound_real=true`, `ghl_live=false`
9. Guion admisiones → rollback al cierre

Detalle: `phase-7g6e-live-activation-rollback-runbook.md` Perfil A.

---

## Referencias

| Documento | Uso |
|-----------|-----|
| `phase-7g6e-live-authorization-template.md` | Plantilla firma |
| `phase-7g6e-pre-live-final-checklist.md` | Gate final |
| `phase-7g6e-live-activation-rollback-runbook.md` | Runbook Perfil A |
| `phase-7g6e-secrets-allowlist-checklist.md` | Secrets gate |
