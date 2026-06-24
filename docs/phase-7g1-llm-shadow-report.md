# Phase 7G.1 — EVA LLM Shadow Mode Report

**Date:** 2026-06-23
**Result:** 18/18 PASS
**wa_errors (mock):** 0

## Environment

```
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=true
LLM_MODE=shadow
LLM_PROVIDER=fake
WA_E2E_MOCK_DB=true
INSFORGE_BASE_URL=http://mock-insforge.local
ANON_KEY=mock-anon-key
YCLOUD_BUSINESS_NUMBER=+529994538421
GHL_WA_FIELD_MAP={"wa_last_intent":"mockFld01","wa_last_message_at":"mockFld02","wa_stage":"mockFld03","wa_needs_human":"mockFld04","wa_summary":"mockFld05","wa_source":"mockFld06","wa_last_inbound_text":"mockFld07","wa_last_outbound_text":"mockFld08"}
```

## Confirmations

- final_response unchanged vs academic-engine baseline: **verified per case**
- suggested_response generated (fake provider): **yes**
- LLM not sent to user (shadow): **yes**
- Production not activated: **yes** (mock/dry_run only)
- Pekín / EVA Test / calculadora: **not touched**
- OPENAI_API_KEY: **not required** (fake provider)

## Unit tests

| ID | Test | Result |
|:---:|---|:---:|
| U1 | detects invented claims | PASS |
| U2 | detects ghost career | PASS |
| U3 | identical text has no warnings | PASS |
| U4 | shadow keeps final_response factual | PASS |
| U5 | shadow generates suggested_response | PASS |
| U6 | LLM disabled does not suggest | PASS |
| U7 | isShadowMode detects shadow | PASS |
| U8 | LLM failure does not change final response | PASS |

## Handler integration (7 cases)

| ID | Input | WA intent | Same baseline | Suggested | Guardrails | Result |
|---:|---|---|:---:|:---:|:---:|---|
| 1 | 1 | carreras_disponibles | yes | yes | — | PASS |
| 2 | Derecho online | carrera_interes | yes | yes | — | PASS |
| 3 | Tengo promedio 9.8, qué beca me toc… | beca | yes | yes | — | PASS |
| 4 | No sé qué estudiar | no_se_que_estudiar | yes | yes | — | PASS |
| 5 | Quiero hablar con asesor | humano | yes | yes | — | PASS |
| 6 | ¿Tienen programa con NASA y Space A… | ambiguo | yes | yes | — | PASS |
| 7 | SHADOW_INVENT_TEST Confírmame beca … | beca | yes | yes | unsupported_data:banned_term:meses sin intereses; unsupported_data:banned_term:te garantizo; unsupported_data:banned_term:beca asegurada; unsupported_data:new_percent:100%; unsupported_claim:scholarship_100_percent | PASS |

## E2E mock (sample)

| ID | Shadow logs | outbound_real | Result |
|:---:|---:|:---:|:---:|
| E2E-1 | 1 | false | PASS |
| E2E-2 | 1 | false | PASS |
| E2E-3 | 1 | false | PASS |

## Files modified

- `insforge/functions/lib/eva-llm/index.js`
- `insforge/functions/lib/eva-llm/shouldUseLLM.js`
- `insforge/functions/lib/eva-llm/guardrails.js`
- `insforge/functions/lib/eva-llm/prompts.js`
- `insforge/functions/lib/eva-llm/README.md`
- `insforge/functions/ycloud-wa-inbound.js`
- `insforge/functions/lib/test/mock-insforge-client.js`
- `insforge/sql/wa_llm_shadow_log.sql`
- `tests/run-phase7g1-llm-shadow.mjs`
- `tests/payloads/phase7g1-llm-shadow.json`

## Pending 7G.2

- Crear tabla `wa_llm_shadow_log` en InsForge (SQL listo)
- Evaluación humana de suggested vs factual
- Modo rephrase/live con autorización Leandro
- OPENAI_API_KEY en staging controlado

## Failures

None.