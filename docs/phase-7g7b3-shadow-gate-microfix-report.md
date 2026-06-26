# Phase 7G.7B.3 — Shadow Gate Micro-fix: Meta First Message + Cost Handoff

**Generated:** 2026-06-26  
**Base:** `8f3945f` (7G.7B.2 calibration)  
**Status:** Implemented locally — **no deploy** (awaiting explicit authorization)

## Problemas corregidos

### 1. Caso 18 — Meta Ads primer saludo

**Antes (7G.7B.2 remoto):** `routing_reason=meta_ads_below_threshold`, `ignored_for_ghl=false` cuando `source=meta_ads`, `first_message=true`, mensaje `Hola`.

**Causa:** La regla dependía de `config.metaAdsFirstMessageNoSync`; si el runtime tenía el flag en `false`, el gate caía a `meta_ads_below_threshold`.

**Después (local):** Regla fail-safe sin depender del flag. Doble cierre antes de `meta_ads_below_threshold`.

### 2. Caso 07 — Costo/carrera sin task

**Antes:** `"Cuánto cuesta Derecho en línea?"` → sync correcto pero `would_create_task=false`, sin `human_handoff_reason`.

**Después (local):** Task + handoff cuando hay señal de costo con carrera/modalidad/admisión y sin KB académica validada.

## Reglas nuevas

### `isMetaAdsNonCommercialFirstMessage` + `applyMetaAdsFirstMessageNoSync`

Si `source=meta_ads`, `firstMessage=true`, mensaje saludo/ambiguo sin señal comercial:

- `would_sync_to_ghl=false`
- `ignored_for_ghl=true`
- `routing_reason=meta_ads_first_message_no_sync`
- Prioridad sobre threshold, excepciones y `meta_ads_below_threshold`
- **No depende** de `META_ADS_FIRST_MESSAGE_NO_SYNC`

### `requiresCostHumanValidation`

Detecta costo: `costo`, `cuesta`, `precio`, `colegiatura`, `mensualidad`, `pago`, `cuánto`+`cuesta`, etc.

Con carrera concreta, modalidad, inscripción o admisiones, y **sin** `academicResult` con `kb_hit` / `validated` / `confidence ≥ 0.85`:

- `would_sync_to_ghl=true`
- `would_create_task=true`
- `human_handoff_reason=cost_or_tuition_requires_validation`
- `routing_reason=cost_signal_requires_human_validation`

## Casos antes / después (local)

| Caso | Antes (7G.7B.2) | Después (7G.7B.3 local) |
|------|-----------------|-------------------------|
| 18 Meta Hola | `meta_ads_below_threshold`, ignored=N | `meta_ads_first_message_no_sync`, ignored=Y, sync=N |
| 07 Costo Derecho | sync=Y, task=N, sin handoff | sync=Y, task=Y, `cost_or_tuition_requires_validation` |
| Meta + carrera (19) | sync=Y (sin cambio) | sync=Y (sin cambio) |
| Post-escalación gracias/bye | sync=N (sin cambio) | sync=N (sin cambio) |

## Resultados de tests

| Runner | Resultado |
|--------|-----------|
| `run-phase7g7b-ghl-relevance-shadow.mjs` | **18/18 PASS** (+ H2 flag-off, P-costo-carrera) |
| `run-phase7g7b1-shadow-decision-review.mjs` (remoto 7G.7B.2) | PASS 15 / REVIEW 5 / FAIL 0 — casos 07/18 pendientes hasta deploy |
| `run-phase7g6d-conversation-hotfix.mjs` | **4/4 PASS** |
| `run-phase7g6d-replay-mock.mjs` | **3/3 PASS** |
| `run-phase7g3a-classifier-hotfix.mjs` | **14/14 PASS** |
| `run-phase7g5b-custom-fields-preflight.mjs` | **9/9 PASS** |

## Confirmaciones de alcance

| Ítem | Estado |
|------|--------|
| Gate gobierna sync real GHL | **No** |
| Deploy InsForge | **No** |
| Secrets / flags / Dashboard | **No tocados** |
| GHL live / WhatsApp real | **No** |
| `ycloud-wa-inbound.js` | **No modificado** |
| 7G.7C | **No iniciado** |

## Riesgos restantes

| ID | Nota |
|----|------|
| 05 | `lead_score=40<45` — sync correcto vía excepción |
| 08 | `lead_score=20<45` — human handoff correcto |
| 19 | `lead_score=30<50` umbral Meta — sync=Y correcto |
| Remoto | 07/18 seguirán en REVIEW hasta deploy 7G.7B.3 |

## Recomendaciones

| Pregunta | Veredicto |
|----------|-----------|
| ¿Listo para deploy 7G.7B.3? | **Sí** — tests locales y regresión en verde; deploy solo tras autorización |
| ¿Listo para 7G.7C? | **Casi** — tras deploy 7G.7B.3, re-ejecutar 7G.7B.1 remoto; REVIEW residuales 05/08/19 son aceptables |
