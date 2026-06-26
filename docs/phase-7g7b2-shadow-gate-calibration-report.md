# Phase 7G.7B.2 — Shadow Gate Calibration

**Generated:** 2026-06-26  
**Repo:** `wa-agent-unilatino`  
**Base commits:** `dcfe6a9` (spec) → `cb0134f` (shadow gate) → `9c60642` (7G.7B.1 review)  
**Phase:** 7G.7B.2 — calibración local; **sin deploy**

## Objetivo

Ajustar el GHL Relevance Gate Shadow según hallazgos de 7G.7B.1, sin conectar el gate al sync real de GHL ni avanzar a 7G.7C.

## Cambios realizados

### `insforge/functions/lib/ghl-relevance-gate.js`

- **Scoring ampliado** con `score_breakdown` interpretable:
  - `explicit_enrollment_intent` +40 (frases de inscripción / proceso / apartar lugar)
  - `vocational_test` +25
  - `orientation_signal` +20 (incl. “qué carrera **le** conviene” para padres/tutores)
  - `documents_or_requirements` +20
  - `parent_or_guardian` +5
  - `urgency` +15 (esta semana, hoy, urgente, ya, etc.)
  - `modality` +10 (online, presencial, sabatino, etc.)
  - Mantiene `career_interest` +30, `scholarship_or_cost` +25, `advisor_request` +20
- **Excepciones high-value** con `routing_reason` explícito:
  - `explicit_enrollment_intent`, `vocational_test_lead`, `orientation_lead`, `documents_enrollment_signal`, `high_value_intent_exception`
- **Human handoff override:** `humano` / asesor / llamada → sync + task aunque score &lt; threshold
- **Inscripción explícita desde `messageText`:** no depende del classifier principal (`intent=ambiguo` aceptable)
- **Meta Ads:** `resolveFirstMessage()` + regla `meta_ads_first_message_no_sync` para saludo ambiguo
- **Hotfix 7G.6D preservado:** `post_escalation_closure_no_sync` en agradecimiento/despedida post-escalación
- **Exports** para tests/parser: `normalizeTrafficSource`, `extractTrafficSourceFromPayload`, `extractFirstMessageFlag`

### `insforge/functions/ycloud-wa-inbound.js`

- `parseInboundPayload()` propaga `source`, `first_message`, `referral_ad_id`, `referral_campaign_id`
- Acepta alias: `channel_source`, `origin`, `referral`, `context.source`, `context.referral`, etc.
- `computeGhlRelevanceShadow` pasa `firstMessage` al gate
- **No modifica** rutas de sync real (`GHL_SYNC_MODE`, `GHL_WRITE_CUSTOM_FIELDS`, etc.)

### Tests

- `tests/run-phase7g7b-ghl-relevance-shadow.mjs` — casos K–O + Meta Ads H/I con `firstMessage`
- `tests/run-phase7g7b1-shadow-decision-review.mjs` — evaluadores estrictos para casos 09–13, 17, 18; payload con `source` / `first_message`

## REVIEW de 7G.7B.1 corregidos (evaluación local post-calibración)

| ID | Mensaje | Antes (cb0134f remoto) | Después (local 7G.7B.2) |
|----|---------|------------------------|---------------------------|
| 09 | Quiero inscribirme esta semana | score 40, sync=N, reason=watch_only | score **55**, sync=Y, task=Y, reason=`explicit_enrollment_intent`, handoff=`explicit_enrollment_intent` |
| 10 | No sé qué estudiar, me pueden orientar? | score 10, sync=N | score **20**, sync=Y, task=N, reason=`orientation_lead` |
| 11 | Quiero hacer el test vocacional | score 10, sync=N | score **45**, sync=Y, task=N, reason=`vocational_test_lead` |
| 13 | Qué documentos necesito para inscribirme? | score 40, sync=N | score **60**, sync=Y, task=N, reason=`documents_enrollment_signal` |
| 17 | Soy mamá de un alumno… qué carrera le conviene | score 0, sync=N | score **55**, sync=Y, task=N, breakdown: career +30, orientation +20, parent +5, reason=`orientation_lead` |
| 18 | Hola (Meta Ads, first_message) | source=organic, reason=below_threshold | source=meta_ads, sync=N, reason=`meta_ads_first_message_no_sync` |

### REVIEW de 7G.7B.1 que permanecen como REVIEW aceptable (no objetivo de esta fase)

| ID | Nota |
|----|------|
| 05 | `high_value_intent_exception` con score 40 &lt; 45 — sync correcto, REVIEW por score bajo |
| 07 | sync + task correctos; REVIEW por ausencia de `human_handoff_reason` (costo/carrera) |
| 08 | human handoff correcto; REVIEW por score 20 &lt; 45 |
| 19 | Meta Ads carrera sync=Y; REVIEW por score 30 &lt; umbral meta 50 |

## Resultado de tests (local, 2026-06-26)

| Runner | Resultado |
|--------|-----------|
| `run-phase7g7b-ghl-relevance-shadow.mjs` | **16/16 PASS** |
| `run-phase7g7b1-shadow-decision-review.mjs` (remoto cb0134f) | PASS 10 / REVIEW 10 / FAIL 0 — **esperado hasta deploy** |
| `run-phase7g6d-conversation-hotfix.mjs` | **4/4 PASS** |
| `run-phase7g6d-replay-mock.mjs` | **3/3 PASS** |
| `run-phase7g3a-classifier-hotfix.mjs` | **14/14 PASS** |
| `run-phase7g5b-custom-fields-preflight.mjs` | **9/9 PASS** |

> El runner 7G.7B.1 contra InsForge sigue ejecutando `cb0134f` (pre-calibración). Los casos 09–13, 17 y 18 aparecerán como REVIEW remoto hasta autorizar deploy de 7G.7B.2.

## Runtime / flags (sin cambios)

| Flag | Valor |
|------|-------|
| `WA_AGENT_MODE` | `mock` |
| `GHL_SYNC_MODE` | `dry_run` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` |
| `GHL_LIVE_ALLOWED_PHONES` | count=1 |
| `outbound_real` | `false` |
| `ghl_live` | `false` |

## Confirmaciones de alcance

| Ítem | Estado |
|------|--------|
| Gate gobierna sync real GHL | **No** — solo `ghl_relevance_shadow` en respuesta |
| `GHL_SYNC_MODE` modificado | **No** |
| `qualified_only` real activado | **No** |
| GHL live / WhatsApp real | **No** |
| Secrets / flags productivos | **No tocados** |
| `GHL_WA_FIELD_MAP` | **No tocado** |
| Campos nuevos en GHL | **No creados** |
| Deploy InsForge | **No realizado** |
| Pendientes 7G.6C / 7G.8 | **No mezclados** en este commit |

## Riesgos pendientes

1. **Deploy gap:** calibración solo en working tree hasta deploy autorizado; remoto sigue con scoring pre-7G.7B.2.
2. **Caso 09 score 55 vs ideal ≥60:** cumple umbral operativo y excepción `explicit_enrollment_intent`; podría subir con señal `business_signal` adicional si se desea en 7G.7C.
3. **Classifier principal sin cambios:** algunos mensajes siguen con `intent=ambiguo` / `no_se_que_estudiar`; el gate compensa por `messageText`.
4. **Meta Ads:** depende de que YCloud/webhook envíe `source` o estructura `referral`; parser acepta múltiples alias pero falta validación en tráfico real post-deploy.

## Recomendaciones

| Pregunta | Recomendación |
|----------|---------------|
| ¿Listo para deploy 7G.7B.2? | **Sí** — tests locales y regresión 7G.6D/7G.3A/7G.5B en verde; deploy solo tras autorización explícita |
| ¿Listo para 7G.7C? | **No** — requiere deploy 7G.7B.2, re-ejecución remota 7G.7B.1 post-deploy, y revisión humana de REVIEW residuales (05, 07, 08, 19) |
