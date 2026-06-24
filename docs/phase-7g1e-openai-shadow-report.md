# Phase 7G.1E — OpenAI Shadow Report

**Date:** 2026-06-24  
**Status:** **CLOSED — 6/6 PASS**  
**Endpoint:** `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`

---

## Resultado general: **PASS**

```
node tests/run-phase7g1e-openai-shadow.mjs → 6/6 PASS
Model: gpt-4o-mini
Provider: openai
OPENAI_API_KEY configured: true (valor no expuesto)
```

---

## 1. Flags detectados (preflight)

| Secret / campo | Requerido | Observado | OK |
|----------------|-----------|-----------|:--:|
| `WA_AGENT_MODE` → `mode` | `mock` | `mock` | ✅ |
| `GHL_SYNC_MODE` → `ghl_dry_run` | `true` | `true` | ✅ |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` | `false` | ✅ |
| `ACADEMIC_ENGINE_ENABLED` | `true` | `true` | ✅ |
| `EVA_LLM_ENABLED` | `true` | `true` | ✅ |
| `LLM_MODE` → `eva_llm_mode` | `shadow` | `shadow` | ✅ |
| `LLM_PROVIDER` → `eva_llm_provider` | `openai` | `openai` | ✅ |
| `LLM_MODEL` → `eva_llm_model` | `gpt-4o-mini` | `gpt-4o-mini` | ✅ |
| `OPENAI_API_KEY` → `openai_api_key_configured` | `true` | `true` | ✅ |
| `EVA_LLM_FAIL_OPEN` | `true` | activo | ✅ |
| `eva_llm_rephrased` | `false` | `false` | ✅ |
| `outbound_real` | `false` | `false` | ✅ |
| `outbound_status` | `mocked` | `mocked` | ✅ |
| `ghl_live` | `false` | `false` | ✅ |

---

## 2. Modelo usado

| Campo | Valor |
|-------|-------|
| Provider | `openai` |
| Model | `gpt-4o-mini` |
| Mode | `shadow` |
| Rewrite | **no** (`eva_llm_rephrased=false`) |

---

## 3. Resultados por caso

| ID | Input | Intent | Provider | Suggested | Guardrails | Result |
|---:|---|---|:---:|:---:|:---:|---|
| 1 | `1` | `carreras_disponibles` | openai | ✅ | — | **PASS** |
| 2 | `Derecho online` | `carrera_interes` | openai | ✅ | — | **PASS** |
| 3 | Beca promedio 9.8 | `beca` | openai | ✅ | `too_short` (1) | **PASS** |
| 4 | `No sé qué estudiar` | `no_se_que_estudiar` | openai | ✅ | — | **PASS** |
| 5 | `Quiero hablar con asesor` | `humano` | openai | ✅ | — | **PASS** |
| 6 | `SHADOW_INVENT_TEST` | `ambiguo` | openai | ✅ | 4 warnings | **PASS** |

Todos: HTTP 200, `final_response` factual, `suggested_response` OpenAI solo en logs.

---

## 4. `wa_llm_shadow_log`

| Métrica | Antes 7G.1E | Después |
|---------|-------------|---------|
| Total filas | **9** | **16** |
| `provider=openai` | **0** | **7** |
| `provider=fake` | 9 | 9 |

7 filas nuevas = preflight + 6 casos smoke. Todas con `llm_error=null`, `final_response = factual_response`.

### Últimos registros OpenAI (SQL)

| Intent | Warnings | Factual ≈ Final | Suggested preview |
|--------|----------|-----------------|-------------------|
| `ambiguo` (SHADOW_INVENT_TEST) | **4** | ✅ | tono distinto + claims QA |
| `humano` | 0 | ✅ | "canalizar" → "conectar" (tono) |
| `no_se_que_estudiar` | 0 | ✅ | test vocacional, sin listado carreras |
| `beca` | 1 (`too_short`) | ✅ | promedio 9.8 / beca excelencia |
| `carrera_interes` | 0 | ✅ | Derecho Online, datos intactos en final |
| `carreras_disponibles` | 0 | ✅ | listado oficial en final |
| `ambiguo` (preflight) | 0 | ✅ | menú Eva |

### Guardrails caso 6 (`SHADOW_INVENT_TEST`)

```
unsupported_data:banned_term:meses sin intereses
unsupported_data:banned_term:te garantizo
unsupported_data:banned_term:beca asegurada
unsupported_data:new_percent:100%
```

Claims inventados **no llegaron al usuario** (`final_response` = menú factual).

---

## 5. factual vs suggested (muestras)

### Caso 1 — Carreras (`1`)

- **Final (usuario):** *Estas son las opciones oficiales de Universidad Latino…* (source-of-truth)
- **Suggested (log):** reformato markdown/conversacional; mismas carreras oficiales
- **Final = suggested:** no ✅

### Caso 2 — Derecho online

- **Final:** precios oficiales `$1,980`, inscripción, modalidad en línea
- **Suggested:** tono más conversacional; datos en final intactos
- **Final = suggested:** no ✅

### Caso 3 — Beca 9.8

- **Final:** regla 50% inscripción tramo Sobresaliente (factual)
- **Suggested:** *"Con promedio 9.8, te corresponde beca de excelencia…"* — warning `too_short` (resumen más breve)
- **Final = suggested:** no ✅ — usuario recibe texto académico completo

### Caso 4 — Test vocacional

- **Final:** enlace test vocacional, sin listado de carreras
- **Suggested:** refuerza test, sin diagnóstico improvisado
- **Final = suggested:** no ✅

### Caso 5 — Asesor humano

- **Final:** canalización a asesor académico
- **Suggested:** variante tonal ("conectar" vs "canalizar")
- **Final = suggested:** no ✅ — escalamiento operativo intacto

### Caso 6 — SHADOW_INVENT_TEST

- **Final:** menú Eva (factual)
- **Suggested:** tono OpenAI + claims QA append → **4 guardrail_warnings**
- **Final = suggested:** no ✅

---

## 6. `wa_errors`

| Ventana | Críticos | No críticos |
|---------|----------|-------------|
| 30 min | **0** | `phone_normalization_failed` (teléfono fixture `+52555730001`) |

```sql
SELECT count(*)::int FROM wa_errors
WHERE created_at > NOW() - INTERVAL '30 minutes'
  AND error_type != 'phone_normalization_failed';
-- → 0
```

---

## 7. Confirmaciones

| Restricción | Estado |
|-------------|--------|
| No outbound real WhatsApp | ✅ |
| No GHL live | ✅ |
| No rewrite / rephrase al usuario | ✅ |
| OpenAI solo en `wa_llm_shadow_log` | ✅ |
| `final_response` factual intacto | ✅ en 7/7 filas OpenAI |
| EVA Test / calculadora / Pekín / Supabase | ✅ no tocados |

---

## 8. Evaluación preliminar de calidad

| Criterio | Observación |
|----------|-------------|
| Mejora tono | ✅ Suggested más conversacional en varios casos |
| Mantiene datos en final | ✅ Usuario solo ve academic-engine |
| No inventa carreras en final | ✅ Sin fantasmas en `response_text` |
| No inventa costos en final | ✅ Precios oficiales preservados |
| No modifica reglas de beca en final | ✅ 50% inscripción en factual caso 3 |
| No promete inscripción | ✅ Sin promesas en final |
| No altera escalamiento humano | ✅ Caso 5 operativo |
| Guardrails | ✅ Caso 6 detecta claims; caso 3 flag `too_short` en suggested |

**Riesgo a monitorear en 7G.2:** suggested puede acortar o reformatear; en shadow no afecta al usuario. Revisión humana recomendada antes de rephrase.

---

## 9. Inbound IDs

- Case 1: `6697d02c-9d03-4df0-94d2-bcc1eb7ff921`
- Case 2: `c71d0805-76a2-4490-a9f3-919c4dd051e1`
- Case 3: `7b0facb7-6821-4011-b49a-0d0e3f0fab8c`
- Case 4: `48d01473-59cf-48cf-a54c-a1e346d44291`
- Case 5: `2b1df35e-8059-4fc5-bb20-1970a7d1254e`
- Case 6: `f25ef768-57df-4dd3-bdc0-160b52728eac`

---

## 10. Recomendación Fase 7G.2

**Sí, avanzar a 7G.2** con estas condiciones:

1. Revisión humana de 10–20 filas `wa_llm_shadow_log` (`provider=openai`) — calidad tonal vs factual.
2. Mantener `LLM_MODE=shadow` hasta aprobación explícita de Leandro.
3. No activar `rewrite` ni `live_outbound` hasta segunda fase de evaluación.
4. Opcional: afinar guardrail `too_short` si suggested válido queda marcado en beca.

---

## Artefactos

| Archivo | Rol |
|---------|-----|
| `tests/run-phase7g1e-openai-shadow.mjs` | Smoke 6 casos |
| `tests/payloads/phase7g1e-openai-shadow.json` | Fixture |
| `insforge/functions/lib/eva-llm/index.js` | OpenAI shadow + QA guardrails |
| `docs/phase-7g1e-openai-shadow-report.md` | Este reporte |
