# Phase 7G.4R — Entrega real WhatsApp (inbound iniciado por usuario)

**Estado:** ✅ **CERRADO** — 7G.4R completado; checkpoint local pendiente de commit  
**Rollback:** ✅ `WA_AGENT_MODE=mock` confirmado  
**Smoke seguridad:** ✅ 7G.3A **14/14 PASS** (2026-06-24, post-rollback)  
**Última actualización:** 2026-06-24  
**Commit base previo:** `95d339767a8903a844272785c86979209a062702`  
**Próxima fase:** 7G.5 — **no iniciar** sin autorización de Leandro

---

## Resumen ejecutivo

| Pregunta | Resultado |
|----------|-----------|
| Inbound real en InsForge | **Sí** (4 casos sesión live) |
| Outbound real enviado a YCloud | **Sí** (`accepted`, `provider_response_id` en todos) |
| Entrega WhatsApp (humano) | **Sí** — confirmado por Leandro |
| GHL live | **No** — `dry_run` en todos |
| Rewrite allowlist | **Intacta** — rewrite en allowlist; beca bloqueada |
| `wa_errors` críticos (sesión live) | **0** |
| Rollback mock + smoke 7G.3A | **PASS** (14/14) |

**Lección 7G.4 vs 7G.4R:** inbound iniciado por usuario real abre ventana 24h; `accepted` en API + confirmación visual = entrega validada end-to-end.

### `accepted` vs entrega visual

| Capa | 7G.4R sesión live |
|------|-------------------|
| YCloud API | `outbound_status=accepted` + `provider_response_id` en 5 inbounds live |
| Webhook `delivered` | No verificado en esta fase |
| Confirmación humana | **Sí** — Leandro vio respuestas en WhatsApp (casos 1–4 + reintento carreras) |

En 7G.4R la entrega se validó por **recepción visual**, no por webhook de delivery.

---

## Flags finales (post-cierre)

| Secret | Valor confirmado |
|--------|------------------|
| `WA_AGENT_MODE` | **`mock`** (preflight) |
| `GHL_SYNC_MODE` | `dry_run` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` |
| `ACADEMIC_ENGINE_ENABLED` | `true` |
| `EVA_LLM_ENABLED` | `true` |
| `LLM_PROVIDER` | `openai` |
| `LLM_MODEL` | `gpt-4o-mini` |
| `LLM_MODE` | `rewrite` |
| `EVA_LLM_FAIL_OPEN` | `true` |

---

## Confirmación visual Leandro

Leandro confirmó recepción en WhatsApp real de:

| # | Mensaje enviado | Contenido visible (resumen) | Confirmado |
|---|-----------------|----------------------------|------------|
| 1 | `1` | Listado carreras | ✅ |
| 2 | `Derecho online` | Modalidad, duración, mensualidad, inscripción, campus, RVOE, prácticas | ✅ |
| 3 | `No sé que estudiar` | Test vocacional + link correcto | ✅ |
| 4 | `Tengo promedio 9.8, que beca me toca?` | Tabla factual, tramo Sobresaliente, 50% colegiatura + 50% inscripción, **sin rewrite** | ✅ |

---

## Participantes

| Rol | Número |
|-----|--------|
| Usuario prueba (Leandro) | **`+529991525583`** |
| Eva / negocio YCloud | `+529994538421` |

---

## Casos de prueba — detalle DB

### Caso 1 — `1` (carreras_disponibles)

| Campo | Valor |
|-------|-------|
| **inbound_id** | `b074016f-af2c-4a03-8086-34752525c1a0` |
| **received_at** | `2026-06-24T07:23:21.005Z` |
| **status** | `processed_inbound_live` |
| **wa_intent** | `carreras_disponibles` |
| **outbound_id** | `4b4627d3-ac59-42b6-b422-2c7c04950cf1` |
| **outbound_status** | `accepted` |
| **provider_response_id** | `6a3b85ee9eeda3194f2e1c45` |
| **outbound_real** | `true` (implícito: `status≠mocked`, `provider_response_id` presente) |
| **rewrite** | `eva_llm_rephrased=true`, `block_reason=null` |
| **GHL** | `dry_run`, `would_create_task=false` |

### Caso 2 — `Derecho online` (carrera_interes)

| Campo | Valor |
|-------|-------|
| **inbound_id** | `b8bc1def-532f-49fd-91cb-bfe44d2a8994` |
| **received_at** | `2026-06-24T07:28:13.673Z` |
| **status** | `processed_inbound_live` |
| **wa_intent** | `carrera_interes` |
| **outbound_id** | `4d3631cd-ccee-4dd6-bed1-404eaa220b10` |
| **outbound_status** | `accepted` |
| **provider_response_id** | `6a3b871320bb2b792f8cc751` |
| **rewrite** | `eva_llm_rephrased=true`, `block_reason=null` |
| **GHL** | `dry_run`, tags `eva-wa`, `wa_interes_carrera` |

### Caso 3 — `No sé que estudiar` (no_se_que_estudiar)

| Campo | Valor |
|-------|-------|
| **inbound_id** | `4e1dbd35-75ce-49b0-8600-7d9182a04597` |
| **received_at** | `2026-06-24T07:28:36.184Z` |
| **status** | `processed_inbound_live` |
| **wa_intent** | `no_se_que_estudiar` |
| **outbound_id** | `fc4d72a1-27b9-43c8-9fc3-c9580a7c9151` |
| **outbound_status** | `accepted` |
| **provider_response_id** | `6a3b8727260ad50037563091` |
| **rewrite** | `eva_llm_rephrased=true`, `block_reason=null` |
| **GHL** | `dry_run`, tags `eva-wa`, `wa_interes_test` |

### Caso 4 — `Tengo promedio 9.8, que beca me toca?` (beca)

| Campo | Valor |
|-------|-------|
| **inbound_id** | `cfdc30c7-23f2-4a39-a915-7f94188dc7e5` |
| **received_at** | `2026-06-24T07:29:16.391Z` |
| **status** | `processed_inbound_live` |
| **wa_intent** | `beca` |
| **outbound_id** | `32858439-36d6-4f3b-9f07-eb3861f4ad46` |
| **outbound_status** | `accepted` |
| **provider_response_id** | `6a3b8750d5cb30136e051b5e` |
| **rewrite** | `eva_llm_rephrased=**false**`, `block_reason=**scholarship_blocked**` |
| **factual intacto** | Outbound = factual (tabla becas, 50% Sobresaliente) |
| **GHL** | `dry_run`, `would_create_task=true` (solo simulado, no live) |

### Caso extra (sesión previa) — reintento carreras

| Campo | Valor |
|-------|-------|
| **Mensaje** | `Buenas noches que carreras tienen?` |
| **inbound_id** | `c7bb3fac-c53e-4cf5-a657-c79312401ed8` |
| **outbound_status** | `accepted` |
| **provider_response_id** | `6a3b848438367113314bd66d` |

---

## Validación LLM (sesión live)

| Check | Resultado |
|-------|-----------|
| `LLM_MODE` | `rewrite` |
| `provider` | `openai` |
| Rewrite en allowlist (1, Derecho, orientación) | ✅ `eva_llm_rephrased=true` |
| Beca bloqueada | ✅ `scholarship_blocked`, factual intacto |
| `wa_errors` críticos (>07:23 UTC) | **0** |

---

## Validación GHL

| Check | Resultado |
|-------|-----------|
| `sync_mode` | `dry_run` (todos los casos) |
| `ghl_live` | `false` |
| Custom fields live | **No** |
| Task live | **No** (beca: `would_create_task=true` solo en dry_run) |

---

## Rollback a mock + smoke de seguridad

| Paso | Estado |
|------|--------|
| `WA_AGENT_MODE=mock` en Dashboard | ✅ Confirmado (preflight `mode: mock`) |
| `node tests/run-phase7g3a-classifier-hotfix.mjs` | ✅ **14/14 PASS** |
| Post-rollback checks | `outbound_real=false`, `outbound_status=mocked`, `ghl_dry_run=true`, beca `scholarship_blocked` |

**Smoke 7G.3A (cierre 2026-06-24):**

| Flag / check | Valor |
|--------------|-------|
| `mode` | `mock` |
| `eva_llm_mode` | `rewrite` |
| `outbound_real` | `false` |
| `outbound_status` | `mocked` |
| `ghl_live` | `false` |
| `ghl_dry_run` | `true` |
| Rewrite allowlist | intacta (9 rewrites) |
| Beca bloqueada | `scholarship_blocked` |
| `wa_errors` críticos (smoke) | **0** |

**Nota `wa_errors`:** tras 07:17 UTC aparecen `phone_normalization_failed` solo en payloads del runner mock (`+52555740001`); no afectan inbounds reales de Leandro ni la sesión 7G.4R.

---

## Diagnóstico previo (referencia)

Primer inbound real con `WA_AGENT_MODE=mock` → sin respuesta visible:

| inbound_id | `84af878b-08a9-400b-bc9f-9594bb88b08c` |
| status | `processed_inbound_mock` |
| Causa | Outbound `mocked`, nunca enviado a YCloud |

---

## Circuito validado

```
WhatsApp Leandro (+529991525583)
  → YCloud inbound (whatsapp.inbound_message.received)
  → InsForge ycloud-wa-inbound (processed_inbound_live)
  → Eva: clasificador + academic engine + rewrite (allowlist)
  → GHL dry_run (sin escritura live)
  → YCloud outbound API (accepted, provider_response_id)
  → WhatsApp Leandro  [CONFIRMADO por Leandro — 4 casos]
```

| Capa | 7G.4 (simulado) | 7G.4R |
|------|-----------------|-------|
| Inbound real usuario | No | **Sí** |
| InsForge procesamiento | PASS | **PASS** |
| YCloud API accept | PASS | **PASS** |
| Entrega teléfono | NOT VALIDATED | **PASS** |

---

## Criterios de éxito 7G.4R

- [x] Leandro confirma recepción visual (4 casos)
- [x] Casos 1–4 completados
- [x] Beca sin rewrite (`eva_llm_rephrased=false`, `scholarship_blocked`)
- [x] GHL `dry_run` en todos
- [x] `wa_errors` críticos = 0
- [x] Rollback a `mock` + 7G.3A PASS

---

## Recomendación para 7G.5 (pendiente autorización Leandro)

1. **Default operativo:** mantener `WA_AGENT_MODE=mock`.
2. **7G.5 — piloto acotado:** `live_outbound` con allowlist (`+529991525583` primero) + ventana horaria + monitoreo.
3. **Delivery webhooks:** `whatsapp.message.delivered` / `read` para validar entrega sin solo confirmación humana.
4. **GHL live:** fase separada; `GHL_WRITE_CUSTOM_FIELDS=false` hasta validar tags/tasks.
5. **Runbook:** 7G.4 (POST simulado) ≠ 7G.4R (inbound real usuario).
6. **No activar sin autorización:** Meta Ads, go-live masivo, custom fields live.

---

## Checkpoint git (cierre 7G.4R)

Archivos incluidos en commit:

- `docs/phase-7g4r-real-inbound-wa-delivery-test.md`
- `docs/phase-7g4-wa-live-rewrite-dryrun-report.md`
- `docs/phase-7g3a-classifier-hotfix-report.md` (smoke post-rollback)
- `tests/run-phase7g4-wa-live-rewrite-dryrun.mjs`
- `tests/payloads/phase7g4-wa-live-rewrite-dryrun.json`

Excluidos por `.gitignore`: `.env`, `dist/`, `*.deploy.js`, `.cursor/`, `node_modules/`.

---

## Qué NO se activó (confirmado)

- GHL live
- `GHL_WRITE_CUSTOM_FIELDS=true`
- Meta Ads
- Go-live masivo
- POST simulado / runners artificiales en 7G.4R

---

## SQL de referencia

```sql
SELECT i.message_text, i.status, i.received_at,
       o.status AS outbound_status, o.provider_response_id,
       l.wa_intent, l.eva_llm_rephrased, l.block_reason
FROM wa_inbound_messages i
LEFT JOIN wa_outbound_messages o ON o.inbound_message_id = i.id
LEFT JOIN wa_llm_shadow_log l ON l.inbound_message_id = i.id
WHERE i.normalized_phone = '+529991525583'
  AND i.received_at > '2026-06-24T07:17:00Z'
ORDER BY i.received_at ASC;
```
