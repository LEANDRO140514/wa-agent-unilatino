# 7G.7C-SPEC — Qualified Sync Allowlist Plan

**Estado:** 📋 **SPEC ONLY** — sin código, deploy, secrets ni cambio de flags  
**Fecha:** 2026-06-26  
**Checkpoint shadow gate:** `0883325` — fix: make ghl shadow gate academic-aware  
**Deploy InsForge:** `ycloud-wa-inbound` · `updatedAt=2026-06-26T02:21:01.179Z` · `status=active`  
**Precondición:** 7G.7B completo (7G.7A → 7G.7B.4) validado remotamente

---

## 1. Estado inicial y precondiciones

### 1.1 Qué está listo (7G.7B)

| Componente | Estado |
|------------|--------|
| `evaluateGhlRelevance()` en `insforge/functions/lib/ghl-relevance-gate.js` | ✅ Calibrado + academic-aware |
| `ghl_relevance_shadow` en respuesta webhook | ✅ Desplegado |
| Scoring + `score_breakdown` interpretable | ✅ |
| Meta Ads primer saludo fail-safe | ✅ `meta_ads_first_message_no_sync` |
| Costo sin KB explícita → task/handoff shadow | ✅ `cost_signal_requires_human_validation` |
| Post-escalación gracias/bye (7G.6D) | ✅ `post_escalation_closure_no_sync` |
| Parser `source` / `first_message` | ✅ En `ycloud-wa-inbound.js` (7G.7B.2) |

### 1.2 Validación remota (post 7G.7B.4)

| Runner | Resultado |
|--------|-----------|
| `run-phase7g7b-ghl-relevance-shadow.mjs` | **22/22 PASS** |
| `run-phase7g7b1-shadow-decision-review.mjs` | **PASS 17 / REVIEW 3 / FAIL 0** |
| `run-phase7g6d-conversation-hotfix.mjs` | **4/4 PASS** |
| `run-phase7g6d-replay-mock.mjs` | **3/3 PASS** |
| `run-phase7g3a-classifier-hotfix.mjs` | **14/14 PASS** |
| `run-phase7g5b-custom-fields-preflight.mjs` | **9/9 PASS** |
| `wa_errors` críticos (30 min) | **0** |

**REVIEW residuales aceptados:**

| ID | Nota |
|----|------|
| 05 | Carrera concreta, score 40 &lt; 45 — sync correcto vía `high_value_intent_exception` |
| 08 | Asesor humano, score 20 &lt; 45 — task correcto vía `human_handoff` |
| 19 | Meta Ads + carrera, score 30 &lt; umbral Meta 50 — sync correcto vía excepción |

### 1.3 Runtime seguro actual

| Flag | Valor |
|------|-------|
| `WA_AGENT_MODE` | `mock` |
| `GHL_SYNC_MODE` | `dry_run` |
| `GHL_SYNC_POLICY` | `none` (default; no gobierna sync real aún) |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` |
| `GHL_LIVE_ALLOWED_PHONES` | `+529991525583` |
| `GHL_RELEVANCE_SHADOW_MODE` | `true` |
| `outbound_real` | `false` |
| `ghl_live` | `false` |

### 1.4 Brecha actual (por qué existe 7G.7C)

Hoy `syncGHLContact()` se invoca **sin** consultar `evaluateGhlRelevance()`:

- En `dry_run`: construye payload con `buildGHLDryRunPayload()` + reglas legacy (`shouldCreateTaskDryRun` / `EVA_TASK_INTENTS`).
- En `live`: idem con `shouldCreateTaskLive(intent)` basado solo en intent del classifier.
- `GHL_SYNC_POLICY` se lee en config pero **no bloquea** el sync real.
- El shadow gate solo informa `would_sync_*` en la respuesta; **no gobierna** GHL.

### 1.5 Restricciones de alcance 7G.7C

- **No** abrir tráfico público masivo.
- **No** activar Meta Ads masivo en la primera subfase.
- **No** modificar `GHL_WA_FIELD_MAP`, DB schema, academic adapter, `shouldUseLLM`, Orchids, EVA Test, landings.
- **No** mezclar pendientes 7G.6C / 7G.8.

---

## 2. Objetivo de 7G.7C

Conectar el resultado de `ghl_relevance_shadow` / `evaluateGhlRelevance()` al **sync real de GHL**, bajo modo controlado con allowlist.

### Condiciones simultáneas para escritura GHL real

Todas deben cumplirse:

1. `GHL_SYNC_POLICY=qualified_only`
2. `GHL_SYNC_MODE=live`
3. `GHL_WRITE_CUSTOM_FIELDS=true` (si se desea escribir `wa_*` validados en 7G.5B)
4. Teléfono normalizado ∈ `GHL_LIVE_ALLOWED_PHONES`
5. `relevanceDecision.would_sync_to_ghl === true`
6. `relevanceDecision.ignored_for_ghl !== true`
7. `routing_reason` no es de bloqueo (`ignored_intent`, `below_threshold`, `meta_ads_first_message_no_sync`, `post_escalation_closure_no_sync`, etc.)
8. No es saludo / gracias / bye / spam / media sin texto / off-topic aislado

**Excepciones high-value documentadas** (del gate 7G.7B) pueden sincronizar aunque `lead_score` &lt; threshold, siempre que `would_sync_to_ghl=true` y no `ignored_for_ghl`.

### Resultado esperado

- GHL recibe **solo leads calificados** o casos con handoff humano justificado.
- WhatsApp sigue respondiendo (mock o live_outbound según fase).
- InsForge registra decisión shadow + sync log (`wa_ghl_sync_log`).
- Rollback inmediato vía flags sin redeploy de código (tras wiring desplegado).

---

## 3. Política final propuesta

### `GHL_SYNC_POLICY=none`

| Aspecto | Comportamiento |
|---------|----------------|
| Sync GHL real | **Prohibido** — gate no autoriza aunque `would_sync=true` |
| `GHL_SYNC_MODE` | Puede ser `dry_run` o `live`; con `none` el gate bloquea antes de API GHL |
| WhatsApp | Mock o live_outbound según `WA_AGENT_MODE` |
| InsForge | Inbound/outbound + `ghl_relevance_shadow` |
| Uso | Estado actual seguro, rollback, shadow puro |

### `GHL_SYNC_POLICY=qualified_only` (recomendado)

| Aspecto | Comportamiento |
|---------|----------------|
| Sync GHL real | Solo si `evaluateGhlRelevance()` aprueba **y** allowlist **y** `live` |
| Acciones | Contact / note / task / CF según `relevanceDecision` |
| Uso | 7G.7C allowlist single phone → organic 2–3 → Meta Ads controlado |

### `GHL_SYNC_POLICY=all`

| Aspecto | Comportamiento |
|---------|----------------|
| Sync GHL real | Comportamiento legacy: sync por intent existente + allowlist |
| Riesgo | Saludos y ruido pueden entrar a GHL |
| Uso | **No recomendado producción** — solo pruebas internas muy controladas |

**Jerarquía de decisión:**

```
GHL_SYNC_POLICY=none          → nunca sync real
GHL_SYNC_POLICY=qualified_only → sync solo si gate + allowlist + live
GHL_SYNC_POLICY=all           → sync legacy (allowlist sigue aplicando en live)
```

---

## 4. Gate de sync real (pseudocódigo)

Punto de inserción: **después** de `applyAcademicAndLlmEnrichment()` y **antes** de `syncGHLContact()` en `ycloud-wa-inbound.js` (hoy `computeGhlRelevanceShadow` ya corre en ese tramo).

```text
FUNCTION handleInbound(payload):
  config ← getConfig()
  parsed ← parseInboundPayload(payload)
  normalizedPhone ← normalizePhoneMX(parsed.from)
  contactContext ← loadContactContext(normalizedPhone)

  intentDecision ← classifyIntent(parsed.message_text, config, contactContext)
  enrichResult ← applyAcademicAndLlmEnrichment(intentDecision, parsed.message_text, config, ...)
  enrichedDecision ← enrichResult.decision
  academicMeta ← enrichResult.academicMeta

  source ← resolveInboundTrafficSource(parsed, contactContext)

  relevanceDecision ← evaluateGhlRelevance({
    intent: enrichedDecision.intent,
    intentDecision: enrichedDecision,
    contactContext,
    messageText: parsed.message_text,
    messageType: parsed.message_type,
    source,
    firstMessage: parsed.first_message,
    academicResult: academicMeta,
    config: buildGhlRelevanceConfigFromHandlerConfig(config),
  })

  ghl_relevance_shadow ← formatGhlRelevanceShadowPayload(relevanceDecision)

  // --- NUEVO 7G.7C: autorización de sync real ---
  allowlist ← resolveGhlLiveAllowlist(config, normalizedPhone)

  shouldSyncGhlReal ← false
  syncBlockReason ← null

  IF config.ghlSyncPolicy === "none":
    shouldSyncGhlReal ← false
    syncBlockReason ← "policy_none"

  ELSE IF config.ghlSyncPolicy === "qualified_only":
    IF config.ghlSyncMode !== "live":
      shouldSyncGhlReal ← false
      syncBlockReason ← "sync_mode_not_live"
    ELSE IF NOT allowlist.allowed:
      shouldSyncGhlReal ← false
      syncBlockReason ← allowlist.block_reason
    ELSE IF relevanceDecision.ignored_for_ghl === true:
      shouldSyncGhlReal ← false
      syncBlockReason ← relevanceDecision.routing_reason
    ELSE IF relevanceDecision.would_sync_to_ghl !== true:
      shouldSyncGhlReal ← false
      syncBlockReason ← relevanceDecision.routing_reason || "gate_no_sync"
    ELSE:
      shouldSyncGhlReal ← true

  ELSE IF config.ghlSyncPolicy === "all":
    // Legacy: mantener reglas actuales + allowlist en live
    shouldSyncGhlReal ← (config.ghlSyncMode === "live" AND allowlist.allowed)
    // Opcional: aún bloquear ignored intents más graves

  // Respuesta WA + outbound (sin cambio de fase)
  ycloudSend ← sendYCloudMessage(...)

  ghlSync ← null
  IF config.ghlSyncMode === "dry_run":
    IF shouldSyncGhlReal:
      // dry_run con payload del GATE (would_* reales del gate)
      ghlSync ← syncGHLContactDryRun(client, config, buildContextFromGate(...))
    ELSE:
      ghlSync ← syncGHLContactDryRunSkipped(...) // log policy_block sin API GHL

  ELSE IF config.ghlSyncMode === "live":
    IF shouldSyncGhlReal:
      ghlSync ← syncGHLContactLive(client, config, buildContextFromGate(...))
    ELSE:
      ghlSync ← insertGhlPolicyBlockedLog(...) // sin API GHL

  RETURN webhookResponse({ ..., ghl_relevance_shadow, ghl_sync: ghlSync })
```

### `buildContextFromGate(relevanceDecision, enrichedDecision, ...)`

El contexto pasado a `syncGHLContact*` debe tomar de **relevanceDecision**, no solo del classifier:

| Campo contexto | Fuente |
|----------------|--------|
| `would_create_contact` | `relevanceDecision.would_create_contact` |
| `would_add_note` | `relevanceDecision.would_create_note` |
| `would_create_task` | `relevanceDecision.would_create_task` |
| `human_handoff_reason` | `relevanceDecision.human_handoff_reason` |
| `routing_reason` | `relevanceDecision.routing_reason` |
| `lead_score` | `relevanceDecision.lead_score` |
| `score_breakdown` | `relevanceDecision.score_breakdown` |
| `source` | inbound `source` (organic / meta_ads) |

**Regla:** reemplazar `shouldCreateTaskLive(intent)` por `relevanceDecision.would_create_task` cuando `policy=qualified_only`.

---

## 5. Matriz de acciones GHL

Comportamiento objetivo bajo `qualified_only` (alineado con shadow 7G.7B.4):

| Tipo / escenario | Contact | Note | Task | routing_reason típico |
|------------------|---------|------|------|------------------------|
| Saludo simple | ❌ | ❌ | ❌ | `ignored_intent` / `below_threshold` |
| Gracias / bye simple | ❌ | ❌ | ❌ | `ignored_intent` |
| Gracias / bye post-escalación | ❌ | ❌ | ❌ | `post_escalation_closure_no_sync` |
| Carrera concreta (“Me interesa Derecho online”) | ✅ | ✅ | ❌ | `high_value_intent_exception` |
| Catálogo general (“Qué carreras tienen?”) | ⚠️ | ⚠️ | ❌ | Excepción o no sync según score — revisar en QA |
| Beca / promedio | ✅ | ✅ | ✅ | `human_handoff` / `intent_beca_task` |
| Costo / precio / colegiatura sin validación explícita | ✅ | ✅ | ✅ | `cost_signal_requires_human_validation` |
| Asesor / humano | ✅ | ✅ | ✅ | `human_handoff` / `explicit_human_handoff` |
| Inscripción explícita | ✅ | ✅ | ✅ | `explicit_enrollment_intent` |
| Documentos / requisitos inscripción | ✅ | ✅ | ❌* | `documents_enrollment_signal` |
| Orientación (“no sé qué estudiar”) | ✅ | ✅ | ❌ | `orientation_lead` |
| Test vocacional inicial | ✅ | ✅ | ❌ | `vocational_test_lead` |
| Post-test / duda test | ✅ | ✅ | ✅ | `human_handoff` |
| Meta Ads primer saludo | ❌ | ❌ | ❌ | `meta_ads_first_message_no_sync` |
| Meta Ads + carrera / beca / asesor | ✅ | ✅ | según gate | `high_value_intent_exception` / handoff |
| Spam / media sin texto / off-topic | ❌ | ❌ | ❌ | `ignored_intent` / `below_threshold` |
| Teléfono fuera de allowlist | ❌ | ❌ | ❌ | `blocked_allowlist_phone` (sin API GHL) |

\* Task en documentos solo si fuera de KB o solicitud humana explícita (gate actual: sin task por defecto).

---

## 6. Custom fields

### Alcance 7G.7C

- Escribir **únicamente** los custom fields ya validados en **7G.5B** vía `GHL_WA_FIELD_MAP`.
- **No crear** campos nuevos en GHL.
- **No modificar** `GHL_WA_FIELD_MAP` en esta fase.
- Mantener protección de campos sensibles (`promedio`, etc.) según 7G.5B.

### Campos shadow vs GHL

| Dato | InsForge / respuesta | GHL CRM |
|------|----------------------|---------|
| `lead_score` | ✅ shadow + note | Opcional futuro — **no en 7G.7C** |
| `score_breakdown` | ✅ shadow + note resumida | ❌ no CF nuevos |
| `routing_reason` | ✅ shadow + note | ❌ no CF nuevos |
| `human_handoff_reason` | ✅ shadow + note | ❌ no CF nuevos |
| `wa_stage`, `wa_intent`, etc. | ✅ vía mapa 7G.5B | ✅ si `GHL_WRITE_CUSTOM_FIELDS=true` |

### Escritura

- `resolveCustomFieldsWriteDecision()` existente sigue aplicando.
- En `qualified_only` + `live` + allowlist: PUT custom fields solo si gate aprueba sync y mapa válido.

---

## 7. Tasks

### Crear task cuando `relevanceDecision.would_create_task === true`

Mapeo de `human_handoff_reason` / `routing_reason` a task:

| Señal | handoff / reason | Task |
|-------|------------------|------|
| Solicitud asesor | `explicit_human_request` / `human_handoff` | ✅ |
| Inscripción explícita | `explicit_enrollment_intent` | ✅ |
| Costo sin validación KB | `cost_or_tuition_requires_validation` | ✅ |
| Beca sin validación | `beca_no_validada` / `intent_beca_task` | ✅ |
| Post-test / duda test | `intent_post_test` / `intent_duda_test` | ✅ |
| Fuera de knowledge comercial | `fuera_de_knowledge_commercial` | ✅ |
| Queja / frustración | `frustration_or_complaint` | ✅ |

### No crear task

| Escenario | Motivo |
|-----------|--------|
| Saludo / gracias / bye aislados | `ignored_for_ghl` |
| Post-escalación cierre | `post_escalation_closure_no_sync` |
| Carrera concreta sin handoff | `high_value_intent_exception` — note only |
| Test vocacional inicial | `vocational_test_lead` |
| Orientación | `orientation_lead` |
| Documentos con KB adecuada | `documents_enrollment_signal` |
| Meta Ads primer saludo | `meta_ads_first_message_no_sync` |
| Spam / off-topic / media | `ignored_intent` |

### Anti-duplicación

- No crear task si ya existe task abierta reciente para el mismo contacto (revisar en 7G.7C.1 — puede ser fase posterior).
- Post-escalación: gracias/bye **no** nueva task (7G.6D + gate).

---

## 8. Notes

Crear nota GHL cuando `would_create_note === true`.

### Contenido mínimo de la nota

```text
[Eva WA — qualified_only]
Intent: {intent}
Lead score: {lead_score}
Routing: {routing_reason}
Handoff: {human_handoff_reason || "—"}
Source: {source}
Meta: first_message={firstMessage} ad_id={referral_ad_id}

Mensaje inbound:
{message_text truncado}

Score breakdown:
- {rule}: +{points}
- ...

Resumen operativo:
{waSummary}
```

### Reglas

- Incluir que fue procesado bajo `GHL_SYNC_POLICY=qualified_only`.
- **No** pegar transcript completo de conversación.
- Truncar mensaje largo (p. ej. 500–800 chars).
- Si sync bloqueado por policy, opcional: log en `wa_ghl_sync_log` con `action=policy_blocked` sin nota en GHL.

---

## 9. Allowlist

### Regla maestra

Aunque el gate califique (`would_sync_to_ghl=true`), si el teléfono **no** está en `GHL_LIVE_ALLOWED_PHONES`:

- **No** llamar API GHL.
- Registrar en `wa_ghl_sync_log` con `action=blocked_allowlist` (patrón existente en `insertGhlAllowlistBlockedLog`).
- Respuesta webhook: `ghl_live=false` o `blocked=true` según modo.

### Estado actual

- Allowlist: `+529991525583` (Leandro) — count=1.
- `resolveGhlLiveAllowlist()` ya implementado; solo aplica cuando `GHL_SYNC_MODE=live`.

### Expansión controlada (fases posteriores)

| Fase | Allowlist |
|------|-----------|
| 7G.7C.3 | 1 teléfono (Leandro) |
| 7G.7C.4 | 2–3 teléfonos organic |
| 7G.7C.5 | Meta Ads test numbers aislados |

---

## 10. Rollback

Orden obligatorio (sin redeploy si el wiring ya está desplegado):

| Paso | Variable | Valor seguro |
|------|----------|--------------|
| 1 | `WA_AGENT_MODE` | `mock` |
| 2 | `GHL_WRITE_CUSTOM_FIELDS` | `false` |
| 3 | `GHL_SYNC_MODE` | `dry_run` |
| 4 | `GHL_SYNC_POLICY` | `none` |
| 5 | `GHL_LIVE_ALLOWED_PHONES` | `+529991525583` |

**Verificación post-rollback:**

- Probe: `mode=mock`, `ghl_sync_mode=dry_run`, `ghl_live=false`, `outbound_real=false`.
- `ghl_relevance_shadow` sigue presente (shadow no se desactiva en rollback).
- Re-ejecutar runners 7G.7B + 7G.6D + 7G.3A + 7G.5B.
- `wa_errors` críticos = 0.

**Nota:** Si el código 7G.7C está desplegado pero flags en `none` + `dry_run`, el comportamiento debe ser **idéntico** al pre-7G.7C.

---

## 11. Variables propuestas

| Variable | Valores | Default actual | Uso 7G.7C |
|----------|---------|----------------|-----------|
| `GHL_SYNC_POLICY` | `none` \| `qualified_only` \| `all` | `none` | `qualified_only` en live controlado |
| `GHL_RELEVANCE_SHADOW_MODE` | `true` \| `false` | `true` | Mantener `true` siempre en 7G.7C |
| `GHL_LEAD_SCORE_THRESHOLD` | number | `45` | Umbral organic |
| `GHL_META_ADS_LEAD_SCORE_THRESHOLD` | number | `50` | Umbral Meta |
| `META_ADS_FIRST_MESSAGE_NO_SYNC` | `true` \| `false` | `true` (fail-safe en código) | Documentación; gate ya no depende solo del flag |
| `META_ADS_REQUIRE_QUALIFICATION` | `true` \| `false` | `true` | Meta bajo umbral → no sync |
| `GHL_SYNC_MODE` | `dry_run` \| `live` | `dry_run` | `live` solo en 7G.7C.3+ |
| `GHL_WRITE_CUSTOM_FIELDS` | `true` \| `false` | `false` | `true` solo con allowlist |
| `GHL_LIVE_ALLOWED_PHONES` | CSV E.164 | `+529991525583` | Allowlist |
| `WA_AGENT_MODE` | `mock` \| `live_outbound` | `mock` | `mock` en 7G.7C.3 (GHL sin WA real) |

### Configuración objetivo 7G.7C.3 (single phone GHL live)

```env
GHL_SYNC_POLICY=qualified_only
GHL_SYNC_MODE=live
GHL_WRITE_CUSTOM_FIELDS=true
GHL_LIVE_ALLOWED_PHONES=+529991525583
GHL_RELEVANCE_SHADOW_MODE=true
WA_AGENT_MODE=mock
```

`WA_AGENT_MODE=mock` evita WhatsApp real mientras se valida GHL live con allowlist.

---

## 12. Plan de implementación futuro

### 7G.7C.1 — Code wiring local

- Añadir `shouldSyncGhlReal(config, relevanceDecision, allowlist)` en handler.
- Pasar flags del gate a `syncGHLContact*`.
- Reemplazar `shouldCreateTaskLive(intent)` por `relevanceDecision.would_create_task` bajo `qualified_only`.
- Tests locales nuevos: `run-phase7g7c-qualified-sync.mjs`.
- **Sin deploy.**

### 7G.7C.2 — Deploy mock/dry_run

- Deploy código con `GHL_SYNC_POLICY=none` + `GHL_SYNC_MODE=dry_run`.
- Validar que comportamiento remoto **no cambia** vs 7G.7B.4.
- Shadow + dry_run logs reflejan decisiones del gate.

### 7G.7C.3 — GHL live allowlist single phone

- Flags: ver §11.
- `WA_AGENT_MODE=mock` — sin WhatsApp real.
- QA manual + runners sobre teléfono Leandro.
- Verificar contact/note/task en GHL Dashboard (humano).

### 7G.7C.4 — Controlled organic 2–3 phones

- Ampliar `GHL_LIVE_ALLOWED_PHONES` (autorización explícita).
- `WA_AGENT_MODE=live_outbound` solo si se autoriza en fase separada.

### 7G.7C.5 — Meta Ads controlled test

- Solo después de:
  - Security preflight DB
  - Rollback probado
  - 7G.7C.4 estable
  - Casos Meta 18/19 validados en shadow **y** live

---

## 13. QA requerido para 7G.7C

Casos mínimos (shadow + live allowlist):

| # | Mensaje / condición | GHL esperado |
|---|---------------------|--------------|
| 1 | Hola | No contact / note / task |
| 2 | Gracias | No GHL |
| 3 | Bye | No GHL |
| 4 | Me interesa Derecho online | Contact + note, no task |
| 5 | Cuánto cuesta Derecho en línea? | Contact + note + task |
| 6 | Tengo promedio 9.2, qué beca me toca? | Contact + note + task |
| 7 | Quiero hablar con un asesor | Contact + note + task |
| 8 | Quiero inscribirme esta semana | Contact + note + task |
| 9 | Quiero hacer el test vocacional | Contact + note, no task |
| 10 | Ya hice el test pero no entiendo mi resultado | Contact + note + task |
| 11 | Meta Ads Hola + first_message | No GHL |
| 12 | Meta Ads Quiero información de Psicología | Contact + note |
| 13 | Gana dinero rápido… | No GHL |
| 14 | Quién ganó el partido… | No GHL |
| 15 | Teléfono **no** en allowlist + carrera | No GHL aunque gate califique |
| 16 | Gracias post `wa_needs_human=true` | No GHL / no task |

Runners a ejecutar en cada subfase:

- `run-phase7g7b-ghl-relevance-shadow.mjs`
- `run-phase7g7b1-shadow-decision-review.mjs`
- `run-phase7g7c-qualified-sync.mjs` (nuevo)
- `run-phase7g6d-conversation-hotfix.mjs`
- `run-phase7g5b-custom-fields-preflight.mjs`

---

## 14. Stop criteria

Detener inmediatamente y ejecutar rollback (§10) si:

| # | Condición |
|---|-----------|
| 1 | `outbound_real=true` sin autorización |
| 2 | `ghl_live=true` fuera de ventana autorizada |
| 3 | Contacto GHL creado por saludo / gracias / bye / spam |
| 4 | Task duplicada para mismo evento |
| 5 | Custom fields PUT falla repetidamente |
| 6 | `wa_errors` críticos &gt; 0 (`function_error`, `outbound_failed`, `ghl_live_failed`, `ghl_dry_run_failed`) |
| 7 | Teléfono fuera de allowlist sincroniza a GHL |
| 8 | Meta Ads “Hola” primer mensaje entra a GHL |
| 9 | Cambio no autorizado de `GHL_WA_FIELD_MAP` |
| 10 | `GHL_SYNC_POLICY=all` activado en producción sin autorización |

---

## 15. Entregable y referencias

### Este documento

- **Único artefacto de 7G.7C-SPEC:** `docs/phase-7g7c-qualified-sync-allowlist-spec.md`
- **Sin código, deploy, secrets ni flags.**

### Referencias código actual

| Módulo | Rol |
|--------|-----|
| `insforge/functions/lib/ghl-relevance-gate.js` | `evaluateGhlRelevance()` — fuente de verdad shadow |
| `insforge/functions/ycloud-wa-inbound.js` | Handler, `syncGHLContact*`, allowlist, CF 7G.5B |
| `docs/phase-7g7a-ghl-relevance-gate-spec.md` | Spec madre 7G.7A |
| `docs/phase-7g7b4-academic-aware-shadow-gate-fix-report.md` | Estado desplegado |
| `tests/run-phase7g7b-ghl-relevance-shadow.mjs` | 22 casos unitarios |
| `tests/run-phase7g7b1-shadow-decision-review.mjs` | 20 casos remotos |

### Próximo paso autorizable

**7G.7C.1** — wiring local + tests, sin deploy, sin cambio de flags.

---

## Confirmaciones de esta fase (7G.7C-SPEC)

| Ítem | Estado |
|------|--------|
| Código implementado | ❌ No |
| Deploy | ❌ No |
| Secrets / flags | ❌ No tocados |
| GHL live / WA real | ❌ No activados |
| `GHL_WA_FIELD_MAP` | ❌ No modificado |
| DB schema | ❌ No modificado |
| 7G.6C / 7G.8 | ❌ No mezclados |
