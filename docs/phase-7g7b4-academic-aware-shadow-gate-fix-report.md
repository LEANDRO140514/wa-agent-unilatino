# Phase 7G.7B.4 — Academic-aware Shadow Gate Fix

**Generated:** 2026-06-26  
**Base:** `5ee8d98` (7G.7B.3 micro-fix)  
**Status:** Implemented locally — **no deploy** (awaiting explicit authorization)

## Causa raíz (post-deploy 7G.7B.3)

| Caso | Síntoma remoto | Causa |
|------|----------------|-------|
| 18 Meta Hola | `meta_ads_below_threshold` | `academic_intent=greeting` hacía `hasBusinessSignal()=true` |
| 07 Costo Derecho | `high_value_intent_exception`, sin task | `academic_confidence=1` + `career_detail` pasaba `isAcademicKbValidated()` |

Los tests locales de 7G.7B.3 no pasaban `academicResult`; el handler remoto sí (`ACADEMIC_ENGINE_ENABLED=true`).

## Cambios realizados

### `isNonCommercialAcademicIntent(academicIntent)`

No comerciales: `greeting`, `saludo`, `farewell`, `despedida`, `thanks`, `agradecimiento`, `small_talk`, `fallback`, `ambiguous`, `ambiguo`, `none`, null/undefined.

### `hasBusinessSignal()` — academic-aware

- `academic_enriched=true` solo cuenta si `academic_intent` es comercial.
- `academic_intent` solo cuenta si **no** es no comercial.

### `isCostOrTuitionExplicitlyValidated(academicResult)`

Reemplaza el uso de confidence genérico en `requiresCostHumanValidation()`.

Validación explícita requerida:

- `cost_validated`, `tuition_validated`, `pricing_validated`, `has_cost_info`, `contains_cost`
- `academic_intent` cost/tuition/pricing/colegiatura/mensualidad + `kb_hit`/`validated`
- `kb_hit=true` + topic de costo/precio/colegiatura/mensualidad

**No basta:** `career_detail` + `academic_confidence=1`.

## Casos locales nuevos

| ID | Escenario | Resultado |
|----|-----------|-----------|
| Q | Meta Hola + `academic_intent=greeting` | `meta_ads_first_message_no_sync`, ignored=Y |
| R | Costo + `career_detail` confidence 1 | `cost_signal_requires_human_validation`, task=Y |
| S | Costo + `cost_validated` + `kb_hit` | sync=Y, task=N, sin cost routing |
| I2 | Meta carrera + `career_detail` | sync=Y |

## Resultados de tests

| Runner | Resultado |
|--------|-----------|
| `run-phase7g7b-ghl-relevance-shadow.mjs` | **22/22 PASS** |
| `run-phase7g7b1-shadow-decision-review.mjs` (remoto 7G.7B.3) | PASS 15 / REVIEW 5 / FAIL 0 — esperado pre-deploy |
| `run-phase7g6d-conversation-hotfix.mjs` | **4/4 PASS** |
| `run-phase7g6d-replay-mock.mjs` | **3/3 PASS** |
| `run-phase7g3a-classifier-hotfix.mjs` | **14/14 PASS** |
| `run-phase7g5b-custom-fields-preflight.mjs` | **9/9 PASS** |

## Confirmaciones de alcance

| Ítem | Estado |
|------|--------|
| Gate gobierna sync real | **No** |
| Deploy | **No** |
| Secrets / flags / Dashboard | **No tocados** |
| GHL live / WA real | **No** |
| `ycloud-wa-inbound.js` | **No modificado** |
| 7G.7C | **No iniciado** |

## Riesgos restantes

| ID | Nota |
|----|------|
| 05 | `lead_score=40<45` — sync OK |
| 08 | `lead_score=20<45` — handoff OK |
| 19 | Meta umbral 50 — sync OK |
| Futuro | Si academic engine añade `cost_validated` en runtime real, el shadow omitirá task correctamente |

## Recomendaciones

| Pregunta | Veredicto |
|----------|-----------|
| ¿Deploy 7G.7B.4? | **Sí** — casos Q/R reproducen causas remotas; listo tras autorización |
| ¿7G.7C? | **Casi** — tras deploy + 7G.7B.1 remoto con 07/18 PASS; revisar REVIEW 05/08/19 |
