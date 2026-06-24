# Phase 7G.1D — InsForge Shadow/Fake Deploy Report

**Date:** 2026-06-23  
**Status:** **CLOSED — 6/6 PASS**  
**Endpoint:** `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`

---

## Resumen ejecutivo

| Paso | Resultado |
|------|-----------|
| Secrets LLM shadow/fake (Dashboard) | ✅ Aplicados por Leandro |
| Deploy bundle 7G.1 + hotfix `provider` | ✅ `2026-06-23T18:26:26.976Z` |
| Smoke `run-phase7g1d-insforge-shadow.mjs` | **6/6 PASS** |
| `wa_llm_shadow_log` | **0 → 7** filas |
| `suggested_response` generado | ✅ `provider=fake` |
| `final_response` factual intacto | ✅ `final_response = factual_response` en todos los logs |
| `guardrail_warnings` en `SHADOW_INVENT_TEST` | ✅ 4 warnings |
| Outbound real | ✅ `mocked`, `outbound_real=false` |
| GHL live | ✅ `ghl_live=false`, `ghl_dry_run=true` |
| OpenAI real | ✅ sin `OPENAI_API_KEY`, `provider=fake` |
| `wa_errors` críticos (30 min) | **0** |
| `phone_normalization_failed` | 17 (no crítico — teléfono fixture `+52555720001`) |

### Hotfix durante cierre 7G.1D

Primer smoke tras secrets (deploy previo) falló **0/6**: `ReferenceError: provider is not defined` en `eva-llm/index.js` al construir `llm_meta`, lo que revertía el enrichment completo.

**Corrección:** `loggedProvider` en `enrichWithLLM` + try/catch en `applyEvaLlmLayer`. Rebuild + redeploy → **6/6 PASS**.

---

## 1. Flags detectados (preflight runtime)

| Secret / campo respuesta | Esperado | Observado |
|--------------------------|----------|-----------|
| `WA_AGENT_MODE` → `mode` | `mock` | `mock` ✅ |
| `GHL_SYNC_MODE` → `ghl_dry_run` | `true` | `true` ✅ |
| `GHL_WRITE_CUSTOM_FIELDS` → `custom_fields_written` | `false` | `false` ✅ |
| `ACADEMIC_ENGINE_ENABLED` | `true` | `true` ✅ |
| `EVA_LLM_ENABLED` → `eva_llm_enabled` | `true` | `true` ✅ |
| `LLM_MODE` → `eva_llm_mode` | `shadow` | `shadow` ✅ |
| `LLM_PROVIDER` → log `provider` | `fake` | `fake` ✅ |
| `EVA_LLM_FAIL_OPEN` | `true` | activo (sin errores LLM bloqueantes) ✅ |
| `eva_llm_rephrased` | `false` | `false` ✅ |
| `outbound_real` | `false` | `false` ✅ |
| `outbound_status` | `mocked` | `mocked` ✅ |
| `ghl_live` | `false` | `false` ✅ |
| `OPENAI_API_KEY` | ausente | ausente ✅ |

---

## 2. Deploy

| Campo | Valor |
|-------|-------|
| Función | `ycloud-wa-inbound` |
| Bundle | `insforge/functions/dist/ycloud-wa-inbound.deploy.js` (167.6 KB) |
| Deploy inicial 7G.1D | `2026-06-23T18:10:31.081Z` |
| Redeploy hotfix | `2026-06-23T18:26:26.976Z` |
| Status | `active` |

---

## 3. Smoke 7G.1D — resultados por caso

**Runner:** `node tests/run-phase7g1d-insforge-shadow.mjs`  
**Teléfono prueba:** `+52555720001` → `+529994538421`

| ID | Input | WA intent | Suggested | Guardrails | Result |
|---:|---|---|:---:|:---:|---|
| 1 | `1` | `carreras_disponibles` | ✅ | — | **PASS** |
| 2 | `Derecho online` | `carrera_interes` | ✅ | — | **PASS** |
| 3 | `Tengo promedio 9.8, qué beca me toca` | `beca` | ✅ | — | **PASS** |
| 4 | `No sé qué estudiar` | `no_se_que_estudiar` | ✅ | — | **PASS** |
| 5 | `Quiero hablar con asesor` | `humano` | ✅ | — | **PASS** |
| 6 | `SHADOW_INVENT_TEST` | `ambiguo` | ✅ | `banned_term` ×3, `new_percent:100%` | **PASS** |

**Validaciones cumplidas:**
- HTTP 200 en todos los casos
- `response_text` factual (academic-engine cuando aplica; menú WA en `ambiguo`)
- `eva_llm_suggested_response` presente en respuesta webhook
- `eva_llm_rephrased=false` — usuario no recibe texto LLM
- Caso 6: `eva_llm_guardrail_warnings` con 4 entradas

---

## 4. `wa_llm_shadow_log`

| Métrica | Valor |
|---------|-------|
| Antes (pre-smoke exitoso) | **0** |
| Después (preflight + 6 casos) | **7** |
| `provider` | `fake` en las 7 filas |
| `mode` | `shadow` en las 7 filas |
| `llm_error` | `null` en las 7 filas |

### Últimos registros (orden cronológico inverso)

| Hora (UTC) | `wa_intent` | `academic_intent` | Guardrails |
|------------|-------------|-------------------|------------|
| 18:26:49 | `ambiguo` | `fallback` | 4 (caso `SHADOW_INVENT_TEST`) |
| 18:26:48 | `humano` | `fallback` | 0 |
| 18:26:47 | `no_se_que_estudiar` | `fallback` | 0 |
| 18:26:46 | `beca` | `scholarship` | 0 |
| 18:26:46 | `carrera_interes` | `career_detail` | 0 |
| 18:26:45 | `carreras_disponibles` | `career_list` | 0 |
| 18:26:44 | `ambiguo` | `fallback` | 0 (preflight) |

**Caso guardrail (SQL):** `final_response = factual_response` ✅, `suggested_response` con claims inventados detectados, no enviados al usuario.

```sql
-- Verificación
SELECT count(*)::int FROM wa_llm_shadow_log;
-- → 7

SELECT wa_intent, provider, mode, guardrail_warnings, llm_error
FROM wa_llm_shadow_log ORDER BY created_at DESC LIMIT 10;
```

---

## 5. `wa_errors`

| Ventana | Total | Críticos | No críticos |
|---------|------:|---------:|-------------|
| Últimos 30 min | 17 | **0** | 17 `phone_normalization_failed` |

Todos los errores son `phone_normalization_failed` / `Could not normalize incoming phone` — teléfono fixture con formato no estándar; el handler continúa con fallback y los smokes pasan. **Sin errores LLM, outbound, GHL ni academic.**

```sql
SELECT count(*)::int FROM wa_errors
WHERE created_at > NOW() - INTERVAL '30 minutes'
  AND error_type != 'phone_normalization_failed';
-- → 0
```

---

## 6. Confirmaciones de restricciones

| Restricción | Estado |
|-------------|--------|
| No outbound real WhatsApp | ✅ |
| No GHL live | ✅ |
| No OpenAI real | ✅ |
| No `LLM_MODE=rewrite` | ✅ |
| `final_response` al usuario = factual | ✅ |
| EVA Test / calculadora / Pekín / Supabase | ✅ no tocados |

---

## 7. Archivos relevantes

| Archivo | Rol |
|---------|-----|
| `insforge/functions/lib/eva-llm/index.js` | Shadow + hotfix `loggedProvider` |
| `insforge/functions/ycloud-wa-inbound.js` | `applyEvaLlmLayer` fail-safe |
| `tests/run-phase7g1d-insforge-shadow.mjs` | Smoke InsForge |
| `tests/payloads/phase7g1d-insforge-shadow.json` | 6 casos |
| `insforge/sql/wa_llm_shadow_log.sql` | DDL tabla |

---

## 8. Pendiente 7G.2

- Revisión humana de calidad `suggested_response` vs `factual_response` (muestra desde `wa_llm_shadow_log`)
- `OPENAI_API_KEY` + `LLM_PROVIDER=openai` solo en staging controlado
- Modo rephrase/live con autorización explícita de Leandro
- Opcional: corregir teléfono fixture a E.164 válido para eliminar `phone_normalization_failed` en smokes
