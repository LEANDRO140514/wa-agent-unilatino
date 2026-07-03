# 7G.6D — Checklist pre-live

**Fase:** 7G.6D — Gate antes de activación live (7G.6E)  
**Uso:** Completar **inmediatamente antes** de cambiar secrets InsForge  
**Fecha template:** 2026-07-03

---

## A. Autorización y equipo

| # | Check | OK | Notas |
|---|-------|:--:|-------|
| A1 | Leandro autorizó **explícitamente** sesión live (7G.6E) | ☐ | |
| A2 | Asesor admisiones 1 disponible | ☐ | |
| A3 | Asesor admisiones 2 disponible (o N/A) | ☐ | |
| A4 | Responsable técnico en sesión | ☐ | |
| A5 | Guion operativo revisado (`phase-7g6c-admissions-operator-script.md`) | ☐ | |
| A6 | Rollback checklist impreso / abierto (`phase-7g6d-rollback-checklist.md`) | ☐ | |

---

## B. Runtime seguro (estado actual antes de activar)

Ejecutar probe o readiness runner. **Debe estar en mock/dry_run ANTES de activar.**

| # | Check | Esperado | OK | Notas |
|---|-------|----------|:--:|-------|
| B1 | `WA_AGENT_MODE` / `mode` | `mock` | ☐ | |
| B2 | `GHL_SYNC_MODE` / `ghl_sync_mode` | `dry_run` | ☐ | |
| B3 | `GHL_WRITE_CUSTOM_FIELDS` / `custom_fields_written` | `false` | ☐ | |
| B4 | `ACADEMIC_ENGINE_ENABLED` | `true` | ☐ | |
| B5 | `EVA_LLM_ENABLED` | `false` | ☐ | |
| B6 | `outbound_real` | `false` | ☐ | |
| B7 | `ghl_live` | `false` | ☐ | |

```powershell
node tests/run-phase-7g6d-live-readiness.mjs
```

---

## C. Deploy y endpoint

| # | Check | OK | Notas |
|---|-------|:--:|-------|
| C1 | Deploy InsForge actual = ENG-0D (`2dabd21` o posterior documentado) | ☐ | |
| C2 | Endpoint YCloud → InsForge activo | ☐ | `ycloud-wa-inbound` |
| C3 | WhatsApp business Eva: `+529994538421` | ☐ | |
| C4 | Sin cambios pendientes en handler sin deploy | ☐ | |

---

## D. Suites de regresión (todas PASS)

```powershell
$env:PHASE_7G6D_STRICT_GIT="1"
node tests/run-phase-7g6d-live-readiness.mjs
```

| Suite | Esperado | OK | Notas |
|-------|----------|:--:|-------|
| 7G.6C controlled admissions | 7/7 PASS | ☐ | |
| VAL-0 | 7/7 PASS | ☐ | |
| ENG-0C | 17/17 PASS | ☐ | |
| ENG-0B | 4/4 PASS | ☐ | |
| Smoke 7C | 10/10 PASS | ☐ | |
| **7G.6D readiness** | **PASS** | ☐ | |

---

## E. GHL dry_run confirmado

| # | Check | OK | Notas |
|---|-------|:--:|-------|
| E1 | Última corrida 7G.6C: `ghl_sync_mode=dry_run` en todas las convs | ☐ | |
| E2 | Humano: `ghl_would_create_task=true` sin `ghl_live` | ☐ | |
| E3 | Sin escritura live accidental en contactos reales | ☐ | |

---

## F. Allowlist definida (valores reales solo en InsForge)

| # | Check | OK | Notas |
|---|-------|:--:|-------|
| F1 | Lista E.164 preparada (3 números mínimo) | ☐ | No commitear al repo |
| F2 | Placeholders documentados en plan §5 | ☐ | |
| F3 | CSV `GHL_LIVE_ALLOWED_PHONES` listo para pegar en InsForge | ☐ | |
| F4 | Números verificados en WhatsApp personal de asesores | ☐ | |

**Template placeholders:**

```
+52XXXXXXXXXX_TEST_1
+52XXXXXXXXXX_ADMISIONS_1
+52XXXXXXXXXX_ADMISIONS_2
```

---

## G. Rollback listo

| # | Check | OK | Notas |
|---|-------|:--:|-------|
| G1 | Pasos rollback § plan 7G.6D memorizados | ☐ | |
| G2 | Acceso InsForge secrets confirmado | ☐ | |
| G3 | Tiempo objetivo rollback ≤1 min | ☐ | |
| G4 | Post-rollback: readiness runner planificado | ☐ | |

---

## H. Monitoreo

| # | Check | OK | Notas |
|---|-------|:--:|-------|
| H1 | Plantilla monitoreo lista (`phase-7g6a-monitoring-template.md`) | ☐ | |
| H2 | Acceso SQL / MCP para `wa_errors` | ☐ | |
| H3 | Ventana sesión definida (45–60 min) | ☐ | |
| H4 | Canal incidencias asesor → técnico acordado | ☐ | |

---

## I. wa_errors limpio

| # | Check | OK | Notas |
|---|-------|:--:|-------|
| I1 | `wa_errors` críticos últimos 30 min = **0** | ☐ | Excl. `phone_normalization_failed` histórico |
| I2 | Sin incidentes abiertos WA/GHL | ☐ | |

```sql
SELECT count(*) FROM wa_errors
WHERE created_at > NOW() - INTERVAL '30 minutes'
  AND error_type NOT IN ('phone_normalization_failed');
```

---

## J. Git / repo

| # | Check | OK | Notas |
|---|-------|:--:|-------|
| J1 | Branch `main`, HEAD = origin/main | ☐ | |
| J2 | Working tree clean (strict) | ☐ | `PHASE_7G6D_STRICT_GIT=1` |
| J3 | 7G.6C committed y pushed | ☐ | |

---

## Decisión pre-live

| Resultado | Acción |
|-----------|--------|
| **Todos ☐ → ☑** | Proceder a activación 7G.6E (plan §11) |
| **Cualquier fallo** | **NO-GO** — corregir antes de tocar secrets |

**Firma GO:** _________________ (Leandro) · **Fecha/hora:** _________________
