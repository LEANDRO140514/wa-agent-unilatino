# 7G.7C.6-A — LLM alignment pre-pilot

**Estado:** ✅ **ALINEACIÓN COMPLETADA** — LLM off confirmado; sin cambios productivos WA/GHL  
**Fecha:** 2026-06-26  
**Base:** `712bb2e` — 7G.7C.5 admissions pilot readiness  
**Autorización:** alinear solo `EVA_LLM_ENABLED` y `LLM_MODE` a modo seguro pre-piloto admisiones

---

## 1. Hallazgo crítico (7G.7C.5)

El runtime observado contradecía la política de piloto seguro:

| Secret | Antes (7G.7C.5) | Política esperada |
|--------|-----------------|-------------------|
| `EVA_LLM_ENABLED` | `true` | `false` |
| `LLM_MODE` | `rewrite` | `off` |

Riesgo: con `WA_AGENT_MODE=live_outbound`, `LLM_MODE=rewrite` podría alterar respuestas outbound sin política explícita de piloto.

---

## 2. Estado antes

### Secrets InsForge (lectura pre-cambio)

| Secret | Valor |
|--------|-------|
| `EVA_LLM_ENABLED` | `true` |
| `LLM_MODE` | `rewrite` |
| `WA_AGENT_MODE` | `mock` |
| `GHL_SYNC_MODE` | `dry_run` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` |
| `ACADEMIC_ENGINE_ENABLED` | `true` |
| `GHL_SYNC_POLICY` | `qualified_only` |
| `GHL_LIVE_ALLOWED_PHONES` | `+529991525583` |

### Probe pre-cambio (`Hola`)

```json
{
  "mode": "mock",
  "ghl_sync_mode": "dry_run",
  "outbound_real": false,
  "ghl_live": false,
  "eva_llm_enabled": true,
  "academic_engine_enabled": true,
  "custom_fields_enabled": false
}
```

`wa_errors` críticos (30 min pre-cambio): **0**

---

## 3. Cambio aplicado

Solo dos secrets modificados vía InsForge REST API (`PUT /api/secrets/{key}`):

```txt
EVA_LLM_ENABLED=false
LLM_MODE=off
```

**Mantenidos sin cambio:**

```txt
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
ACADEMIC_ENGINE_ENABLED=true
GHL_SYNC_POLICY=qualified_only
GHL_LIVE_ALLOWED_PHONES=+529991525583
```

- **Sin redeploy** — secrets recargados efectivamente en runtime (probe inmediato OK).
- **Sin** activación WA live, GHL live, CF, YCloud real, Meta Ads.
- **Sin** cambios en código, tests, `GHL_WA_FIELD_MAP`, source-of-truth, EVA Test, calculadora.

---

## 4. Estado después

### Secrets InsForge (lectura post-cambio)

| Secret | Valor |
|--------|-------|
| `EVA_LLM_ENABLED` | **`false`** |
| `LLM_MODE` | **`off`** |
| `WA_AGENT_MODE` | `mock` |
| `GHL_SYNC_MODE` | `dry_run` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` |
| `ACADEMIC_ENGINE_ENABLED` | `true` |

### Probe post-cambio (`Hola`)

```json
{
  "ok": true,
  "mode": "mock",
  "ghl_sync_mode": "dry_run",
  "outbound_real": false,
  "ghl_live": false,
  "eva_llm_enabled": false,
  "eva_llm_mode": "off",
  "academic_engine_enabled": true,
  "custom_fields_enabled": false,
  "policy": "qualified_only"
}
```

### Probes adicionales

| Caso | `outbound_real` | `eva_llm_enabled` | `eva_llm_mode` | `ghl_live` | `ghl_synced` | Notas |
|------|-----------------|-------------------|----------------|------------|--------------|-------|
| M1 `Hola` | `false` | `false` | `off` | `false` | `false` | `ghl_policy_blocked=true` |
| M2 `Me interesa Derecho en línea` | `false` | `false` | `off` | `false` | `false` | `intent=carrera_interes`, academic ON |

### `wa_errors` críticos post-cambio

Últimos 15 min tras probes: **0** (`function_error`, `ghl_live_failed`, `outbound_live_failed`, `ghl_sync_failed`).

---

## 5. Smoke / suites

| Suite | Resultado | Nota |
|-------|-----------|------|
| Probe remoto Hola + carrera | ✅ | LLM off, academic on, mock/dry_run |
| `run-phase7g5b-custom-fields-preflight.mjs` | **9/9 PASS** | |
| `run-phase7g7c31-task-title-hotfix.mjs` | **8/8 PASS** | local |
| `run-phase7g3a-classifier-hotfix.mjs` | **PREFLIGHT BLOCKED** | fixture exige `eva_llm_enabled=true` + `rewrite`; incompatible con política LLM-off — esperado |

---

## 6. Confirmación de no cambios productivos

| Control | Cambió |
|---------|--------|
| `WA_AGENT_MODE` | ❌ sigue `mock` |
| `GHL_SYNC_MODE` | ❌ sigue `dry_run` |
| `GHL_WRITE_CUSTOM_FIELDS` | ❌ sigue `false` |
| WhatsApp real / YCloud outbound | ❌ `outbound_real=false` |
| GHL live | ❌ `ghl_live=false` |
| Meta Ads | ❌ no tocado |
| InsForge function code | ❌ no redeploy |
| DB schema | ❌ no tocado |
| `GHL_WA_FIELD_MAP` | ❌ no tocado |
| Academic source-of-truth | ❌ no tocado |
| EVA Test / calculadora | ❌ no tocado |

---

## 7. Archivos modificados (repo local)

| Archivo | Acción |
|---------|--------|
| `docs/phase-7g7c6a-llm-alignment-prepilot.md` | **Creado** (este doc) |

**Sin commit** en 7G.7C.6-A (pendiente instrucción posterior).

Efecto colateral local: `run-phase7g3a-classifier-hotfix.mjs` regeneró `docs/phase-7g3a-classifier-hotfix-report.md` como BLOCKED (fixture LLM rewrite). **No commitear** salvo autorización.

---

## 8. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Re-activación accidental LLM rewrite | Verificar secrets pre-sesión admisiones |
| Suite 7G.3A no corre con LLM off | Usar probes + 7G.5B; actualizar fixture en fase futura si se requiere |
| Secrets no recargan sin redeploy | Probe post-cambio obligatorio; redeploy si `eva_llm_enabled` sigue `true` |
| Piloto admisiones sin asesor | Sigue pendiente operativo (7G.7C.5) |

---

## 9. Decisión GO / NO-GO — briefing admisiones

### Bloqueo LLM (7G.7C.5)

| Check | Estado |
|-------|--------|
| `EVA_LLM_ENABLED=false` | ✅ |
| `LLM_MODE=off` | ✅ |
| Runtime seguro mock/dry_run | ✅ |
| Academic engine activo | ✅ |
| `wa_errors` críticos | ✅ 0 |

**Bloqueo técnico LLM resuelto.**

### Checks operativos pendientes (7G.7C.5)

| Check | Estado |
|-------|--------|
| Briefing admisiones | ⚠️ pendiente |
| Asesor humano agendado | ⚠️ pendiente |

### Veredicto 7G.7C.6-A

| Dimensión | Decisión |
|-----------|----------|
| **LLM alignment** | ✅ **GO** — alineado a política segura |
| **Briefing admisiones (7G.7C.6-B)** | **GO condicionado** — puede iniciar briefing; piloto live sigue requiriendo asesor + checklist ops |

---

## 10. Próxima acción recomendada

**7G.7C.6-B — Briefing admisiones:** sesión prep con guion `phase-7g6c-admissions-test-script.md`, confirmar asesor y ventana 30–60 min, sin activar flags live hasta autorización explícita de Leandro.
