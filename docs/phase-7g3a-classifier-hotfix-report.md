# Phase 7G.3A — Classifier Hotfix Report

**Date:** 2026-06-24
**Status:** **PASS** (14/14)
**Endpoint:** https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound

## Flags (preflight)

| mode | mock |
| eva_llm_mode | rewrite |
| outbound_real | false |
| ghl_live | false |
| ghl_dry_run | true |

## Resumen

- **Total casos:** 14
- **PASS:** 14 | **FAIL:** 0
- **Rewrites aplicados:** 9
- **Bloqueos correctos:** 5

## Hotfix — intents antes/después (5 casos)

| ID | Input | Antes | Ahora | Rephrased | Result |
|---:|---|---|:---:|:---:|---|
| A1 | Qué carreras tienen | ambiguo | carreras_disponibles | yes | PASS |
| A2 | Me puedes decir sus licencia… | ambiguo | carreras_disponibles | yes | PASS |
| A3 | Oferta académica | ambiguo | carreras_disponibles | yes | PASS |
| A4 | Me puedes orientar | ambiguo | no_se_que_estudiar | yes | PASS |
| A5 | Me puede llamar alguien | ambiguo | humano | yes | PASS |

## Todos los casos

| ID | Sección | Input | Intent | Rephrased | block_reason | Result |
|---:|---|---|---|:---:|:---:|---|
| A1 | hotfix | Qué carreras tienen | carreras_disponibles | yes | — | PASS |
| A2 | hotfix | Me puedes decir sus lice… | carreras_disponibles | yes | — | PASS |
| A3 | hotfix | Oferta académica | carreras_disponibles | yes | — | PASS |
| A4 | hotfix | Me puedes orientar | no_se_que_estudiar | yes | — | PASS |
| A5 | hotfix | Me puede llamar alguien | humano | yes | — | PASS |
| B1 | blocked | Tengo promedio 9.8, qué … | beca | no | scholarship_blocked | PASS |
| B2 | blocked | Ya hice el test | post_test | no | blocked_intent | PASS |
| B3 | blocked | Se trabó el test | duda_test | no | blocked_intent | PASS |
| B4 | blocked | (image) | sin_texto | no | skipped_intent | PASS |
| B5 | blocked | SHADOW_INVENT_TEST | ambiguo | no | blocked_intent | PASS |
| C1 | allowlist | 1 | carreras_disponibles | yes | — | PASS |
| C2 | allowlist | Derecho online | carrera_interes | yes | — | PASS |
| C3 | allowlist | No sé qué estudiar | no_se_que_estudiar | yes | — | PASS |
| C4 | allowlist | Quiero hablar con asesor | humano | yes | — | PASS |

## Confirmaciones

- WhatsApp real: **NO** (`outbound_real=false`, `outbound_status=mocked`)
- GHL live: **NO** (`ghl_live=false`, `ghl_dry_run=true`)
- Allowlist sin cambios (beca/post_test/duda_test/sin_texto/ambiguo siguen bloqueados para rewrite)
- `wa_errors` críticos LLM/outbound: **0** (solo `phone_normalization_failed` en payloads de prueba)

## Impacto vs 7G.3

Los 5 mensajes que caían en `ambiguo` ahora clasifican correctamente y **reciben rewrite** cuando aplica:

| Mensaje | 7G.3 | 7G.3A |
|---------|------|-------|
| Qué carreras tienen | ambiguo, sin rewrite | carreras_disponibles, rewrite |
| Me puedes decir sus licenciaturas | ambiguo, sin rewrite | carreras_disponibles, rewrite |
| Oferta académica | ambiguo, sin rewrite | carreras_disponibles, rewrite |
| Me puedes orientar | ambiguo, sin rewrite | no_se_que_estudiar, rewrite |
| Me puede llamar alguien | ambiguo, sin rewrite | humano, rewrite |

Regresión 7G.3: beca, post_test, duda_test, sin_texto, SHADOW_INVENT_TEST y allowlist base **sin cambios**.

## Cambios en clasificador

- `matchesCarrerasDisponibles()` — carreras/licenciaturas/oferta académica/qué ofrecen
- `matchesNoSeQueEstudiar()` — orientar/orientación
- `matchesHumano()` — llamar/llamada/contacte alguien

## Recomendación 7G.4

Clasificador listo. Avanzar a **7G.4 live_outbound controlado** con autorización explícita; mantener `GHL_SYNC_MODE=dry_run` en primer sub-paso.