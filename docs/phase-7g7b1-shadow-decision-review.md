# Phase 7G.7B.1 — Shadow Decision Review

**Generated:** 2026-06-26 (post-run)  
**Endpoint:** `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`  
**Commit desplegado:** `cb0134f` — feat: add ghl relevance shadow gate  
**Runner:** `tests/run-phase7g7b1-shadow-decision-review.mjs`

## Runtime flags (primer caso exitoso)

| Flag | Valor |
|------|-------|
| `mode` | `mock` |
| `ghl_sync_mode` | `dry_run` |
| `custom_fields_enabled` | `false` |
| `outbound_real` | `false` |
| `ghl_live` | `false` |
| `ghl_relevance_shadow.enabled` | `true` |

## Resumen

| Verdict | Count |
|---------|-------|
| **PASS** | 10 |
| **REVIEW** | 10 |
| **FAIL** | 0 |

**Criterio duro:** ningún caso con `outbound_real=true`, `ghl_live=true`, ni shadow ausente.

## Tabla de 20 casos

| ID | Mensaje | Intent | Score | Sync | Contact | Note | Task | routing_reason | handoff | Verdict |
|----|---------|--------|-------|------|---------|------|------|----------------|---------|---------|
| 01 | Hola | ambiguo | 0 | N | N | N | N | below_threshold | - | PASS |
| 02 | Gracias | agradecimiento | 0 | N | N | N | N | ignored_intent | - | PASS |
| 03 | Bye | despedida | 0 | N | N | N | N | ignored_intent | - | PASS |
| 04 | Qué carreras tienen? | carreras_disponibles | 0 | N | N | N | N | below_threshold | - | PASS |
| 05 | Me interesa Derecho online | carrera_interes | 40 | Y | Y | Y | N | high_value_intent_exception | - | REVIEW |
| 06 | Tengo promedio 9.2, qué beca… | beca | 45 | Y | Y | Y | Y | human_handoff | intent_beca_task | PASS |
| 07 | Cuánto cuesta Derecho en línea? | carrera_interes | 65 | Y | Y | Y | Y | lead_score_high_with_task | - | REVIEW |
| 08 | Quiero hablar con un asesor | humano | 20 | Y | Y | Y | Y | human_handoff | intent_humano | REVIEW |
| 09 | Quiero inscribirme esta semana | ambiguo | 40 | N | N | N | N | watch_only_or_high_value_exception | - | REVIEW |
| 10 | No sé qué estudiar… | no_se_que_estudiar | 10 | N | N | N | N | below_threshold | - | REVIEW |
| 11 | Quiero hacer el test vocacional | no_se_que_estudiar | 10 | N | N | N | N | below_threshold | - | REVIEW |
| 12 | Ya hice el test pero no entiendo… | post_test | 10 | Y | Y | Y | Y | human_handoff | intent_post_test | PASS |
| 13 | Qué documentos necesito… | ambiguo | 40 | N | N | N | N | watch_only_or_high_value_exception | - | REVIEW |
| 14 | [MEDIA_ATTACHMENT] | sin_texto | 0 | N | N | N | N | ignored_intent | - | PASS |
| 15 | Gana dinero rápido… | ambiguo | 0 | N | N | N | N | ignored_intent | - | PASS |
| 16 | Quién ganó el partido… | ambiguo | 0 | N | N | N | N | below_threshold | - | PASS |
| 17 | Soy mamá de un alumno… | ambiguo | 0 | N | N | N | N | below_threshold | - | REVIEW |
| 18 | Hola (meta_ads, tel. aislado) | ambiguo | 0 | N | N | N | N | below_threshold | - | REVIEW |
| 19 | Psicología (meta_ads, 2º msg) | carrera_interes | 30 | Y | Y | Y | N | high_value_intent_exception | - | REVIEW |
| 20 | Info | ambiguo | 0 | N | N | N | N | below_threshold | - | PASS |

**Notas Meta:** casos 18/19 usan teléfonos aislados `+529991525586` / `+529991525587` con `source=meta_ads` en payload POST.

## Observaciones de scoring

1. **Saludos / cierre / spam / off-topic / media** — comportamiento conservador correcto (no sync, no task).
2. **High-value intent exception** — `carrera_interes` con score 30–40 aún marca `would_sync_to_ghl=true` vía excepción (casos 05, 19). Útil para admisiones pero revisar umbral en 7G.7C.
3. **Humano con score bajo (20)** — `human_handoff` fuerza sync+task aunque score < 45 (caso 08). Correcto para operaciones.
4. **Inscripción explícita (09)** — score 40, no sync; falta intent `inscripcion` en clasificador WA (cae en `ambiguo`). Candidato a ajuste pre-7G.7C.
5. **Orientación / test vocacional (10–11)** — score 10, no sync; `no_se_que_estudiar` no suma suficiente sin keywords adicionales.
6. **Post-test (12)** — handoff correcto con task aunque score bajo (10); prioriza intent sobre score.
7. **Costo (07)** — clasificado `carrera_interes` (mención Derecho), score 65, task=true; `human_handoff_reason` null (academic engine puede haber validado costo).

## Falsos positivos detectados

| Caso | Observación |
|------|-------------|
| 05 | Sync=true con score 40 (<45) por `high_value_intent_exception` — aceptable si política admite carrera_interes |
| 19 | Sync=true con score 30 en contexto meta (umbral ideal 50) — misma excepción high-value |
| 07 | Task=true sin `human_handoff_reason` — task por score≥60, no por handoff explícito |

## Falsos negativos detectados

| Caso | Observación |
|------|-------------|
| 09 | Inscripción urgente no sync — score 40 sin intent `inscripcion` |
| 10–11 | Interés orientación/test sin calificar — score bajo |
| 13 | Documentos/inscripción score 40 sin sync |
| 17 | Mamá + orientación score 0 — no detectó `parent_or_guardian` ni señal comercial |
| 18 | Meta primer Hola no aplicó `meta_ads_first_message_no_sync` |

## Hallazgo técnico Meta Ads (importante)

`parseInboundPayload()` **no propaga** `source` / `traffic_source` del body webhook al objeto `parsed`.  
`resolveInboundTrafficSource()` lee `parsed.source`, pero ese campo no se rellena hoy → **todo inbound remoto se trata como `organic`** aunque el POST incluya `source=meta_ads`.

**Implicación:** reglas Meta (casos 18–19) no se ejercitan en producción hasta cablear source (7G.7C o hotfix parser). El caso 18 REVIEW es esperado con código actual.

## Recomendaciones antes de 7G.7C

1. **Parser:** añadir `source` / `traffic_source` en `parseInboundPayload` (fuera de alcance 7G.7B.1).
2. **Scoring:** +puntos para `no_se_que_estudiar`, test vocacional explícito, padre/madre con intención comercial.
3. **Clasificador:** intent `inscripcion` / `documentos` / `costo` para mensajes explícitos.
4. **Política qualified_only:** definir si `high_value_intent_exception` puede sync con score < umbral (hoy sí para `carrera_interes`).
5. **Meta threshold 50:** cuando source funcione, validar de nuevo casos 18–19.

## Confirmaciones

- **GHL real no tocado** — `ghl_live=false`, `ghl_synced=false` en todos los casos.
- **WhatsApp real no enviado** — `outbound_real=false`, `outbound_status=mocked`.
- **Sin deploy / secrets / flags** en esta fase de revisión.
- **wa_errors críticos post-run (30 min):** 0 (`function_error`, `outbound_failed`, `ghl_live_failed`, `ghl_dry_run_failed`).

## Siguiente paso

Revisión humana de casos REVIEW → autorizar **7G.7C** (qualified_only en allowlist) con ajustes acordados.
