# Phase 7G.2 — Rewrite Mock/Dry_run Report

**Date:** 2026-06-24  
**Status:** **PASS (8/8)**  
**Endpoint:** `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`

## Objetivo

Validar `LLM_MODE=rewrite` en entorno seguro (`WA_AGENT_MODE=mock`, `GHL_SYNC_MODE=dry_run`) con allowlist de intents y fallback automático a `factual_response` ante riesgo.

## Flags detectados (preflight)

| Flag | Valor |
|------|-------|
| `WA_AGENT_MODE` | `mock` |
| `GHL_SYNC_MODE` | `dry_run` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` (custom_fields_written=false) |
| `ACADEMIC_ENGINE_ENABLED` | `true` |
| `EVA_LLM_ENABLED` | `true` |
| `LLM_PROVIDER` | `openai` |
| `LLM_MODEL` | `gpt-4o-mini` |
| `LLM_MODE` | `rewrite` |
| `EVA_LLM_FAIL_OPEN` | `true` (inferido por fallback en timeout/error) |
| `openai_api_key_configured` | `true` |
| `outbound_real` | `false` |
| `outbound_status` | `mocked` |
| `ghl_live` | `false` |
| `ghl_dry_run` | `true` |

## Resultado por caso

| ID | Input | Intent | Rewrite | `eva_llm_rephrased` | `block_reason` | Result |
|---:|---|---|:---:|:---:|:---:|---|
| 1 | `1` | carreras_disponibles | permitido | **true** | — | PASS |
| 2 | `Derecho online` | carrera_interes | permitido | **true** | — | PASS |
| 3 | `No sé qué estudiar` | no_se_que_estudiar | permitido | **true** | — | PASS |
| 4 | `Quiero hablar con asesor` | humano | permitido | **true** | — | PASS |
| 5 | `Tengo promedio 9.8, qué beca me toca` | beca | **bloqueado** | false | `scholarship_blocked` | PASS |
| 6 | `SHADOW_INVENT_TEST` | ambiguo | **bloqueado** | false | `blocked_intent` | PASS |
| 7 | `Ya hice el test` | post_test | **bloqueado** | false | `blocked_intent` | PASS |
| 8 | imagen sin texto | sin_texto | **bloqueado** | false | `skipped_intent` | PASS |

### Casos con rewrite aplicado (4)

- carreras_disponibles, carrera_interes, no_se_que_estudiar, humano → `eva_llm_rephrased=true`, `final_response` = `suggested_response` (validateRewrite PASS).

### Casos bloqueados (4)

| Caso | Motivo |
|------|--------|
| beca | `scholarship_blocked` — fuera de allowlist |
| SHADOW_INVENT_TEST | `blocked_intent` (ambiguo) + guardrails en suggested |
| post_test | `blocked_intent` |
| sin_texto | `skipped_intent` — LLM no invocado |

## Guardrail warnings (caso 6 — último run en DB)

```
unsupported_data:banned_term:meses sin intereses
unsupported_data:banned_term:te garantizo
unsupported_data:banned_term:beca asegurada
unsupported_data:new_percent:100%
unsupported_data:too_long
```

`final_response` permaneció factual; rewrite no aplicado.

## Muestras factual vs final

| Caso | Nota |
|------|------|
| 1 | Lista de carreras oficial; tono reescrito, datos intactos |
| 2 | Derecho online $1,980 preservado |
| 3 | Test vocacional / testunilatino preservado |
| 4 | Escalamiento a asesor preservado (`wa_needs_human`, `createTask`) |
| 5 | Tramo Sobresaliente 50% con promedio **9.8** (hotfix aplicado) |
| 6 | Menú Eva factual; suggested con claims inventados bloqueado |
| 7 | Respuesta post-test factual |
| 8 | Mensaje sin texto factual |

## Logs `wa_llm_shadow_log` (`mode=rewrite`)

- **Total filas rewrite en DB:** 18 (incluye runs previos de esta fase)
- **Últimas 8 filas:** coinciden con smoke 7G.2 (4 rephrased, 4 blocked)
- **Provider/model:** `openai` / `gpt-4o-mini`

## wa_errors

- Última hora: 25 entradas `phone_normalization_failed` (preflight `__phase7g2_preflight__` y payloads de prueba)
- **Errores críticos LLM/outbound/GHL:** 0 en el smoke 7G.2

## Confirmaciones de seguridad

- WhatsApp real: **NO** (`outbound_real=false`, `outbound_status=mocked`)
- GHL live: **NO** (`ghl_live=false`, `ghl_dry_run=true`)
- Rewrite en beca: **NO**
- Rewrite con guardrail_warnings activos en allowlist: **NO** (SHADOW bloqueado por intent + factual intacto)
- `final_response` solo cambia cuando allowlist + `validateRewrite` PASS

## Implementación entregada

| Archivo | Cambio |
|---------|--------|
| `insforge/functions/lib/eva-llm/index.js` | Flujo rewrite, `block_reason`, fallback |
| `insforge/functions/lib/eva-llm/shouldUseLLM.js` | `REWRITE_ALLOWLIST`, `isRewriteAllowed` |
| `insforge/functions/lib/eva-llm/guardrails.js` | `validateRewrite` |
| `insforge/functions/lib/eva-llm/prompts.js` | `buildRewriteUserPrompt` |
| `insforge/functions/lib/eva-llm/README.md` | Documentación 7G.2 |
| `insforge/functions/ycloud-wa-inbound.js` | Meta webhook + logging `block_reason` |
| `insforge/functions/lib/academic-engine/entityExtractor.js` | Hotfix promedio `9.8` |
| `insforge/sql/wa_llm_shadow_log.sql` | Columnas `block_reason`, `eva_llm_rephrased` |
| `tests/run-phase7g2-llm-rewrite-mock.mjs` | Smoke 8 casos |
| `tests/payloads/phase7g2-llm-rewrite-mock.json` | Fixture |

### Ajustes de runtime durante validación

- Timeout OpenAI default: **3s → 12s** (`EVA_LLM_TIMEOUT_MS`, evita `AbortError` en edge)
- Orden `block_reason`: intent bloqueado (beca/post_test) antes que `llm_error`

## Nota — issue promedio 9.8 (7G.1F)

**Diagnóstico:** El normalizador de texto convierte `9.8` → `9 8`. El regex de `entityExtractor` capturaba solo el primer dígito (`9`), asignando tramo incorrecto.

**Hotfix aplicado:** Priorizar patrón `promedio N M` (decimales separados por espacio) antes del patrón de un solo número.

**Verificación:** `resolveAcademicMessage('Tengo promedio 9.8…')` → `entities.promedio = 9.8`, respuesta incluye tramo Sobresaliente / 50%.

## Recomendación para 7G.3

**Avanzar con condiciones:**

1. Mantener `mock` + `dry_run` hasta revisión humana de muestras rewrite (4 casos allowlist).
2. Monitorear `wa_llm_shadow_log` con `mode=rewrite` y `block_reason` en cada deploy.
3. No ampliar allowlist a `beca` / `post_test` sin reglas de beca endurecidas.
4. Considerar `EVA_LLM_TIMEOUT_MS=12000` como default en Dashboard.
5. Siguiente paso natural: 7G.3 — rewrite extendido o piloto controlado solo tras OK de Leandro (sin activar WA/GHL live).

## Cómo reproducir

```bash
node tests/run-phase7g2-llm-rewrite-mock.mjs
```

Requisitos InsForge Dashboard: flags listados arriba + `OPENAI_API_KEY` configurado.
