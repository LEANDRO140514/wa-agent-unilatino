# 7G.7A — GHL Relevance Gate + Qualified Sync Policy

**Estado:** 📋 **SPEC ONLY** — sin cambios de código, secrets, deploy ni runtime  
**Fecha:** 2026-06-25  
**Checkpoint base:** `6009ebe` (replay script) · hotfix desplegado `92ef181`  
**Precondición para:** 7G.7B shadow mode · 7G.7C allowlist qualified · 7G.7D organic · 7G.8 Meta Ads controlled

---

## 1. Título y estado

| Campo | Valor |
|-------|-------|
| Fase | **7G.7A** — GHL Relevance Gate + Qualified Sync Policy |
| Tipo | Especificación técnica-operativa |
| Implementación | **No autorizada** en este documento |
| Runtime productivo | Seguro: `mock` / `dry_run` / `CF=false` / allowlist Leandro |

**Alcance de este entregable:** únicamente `docs/phase-7g7a-ghl-relevance-gate-spec.md`.

---

## 2. Problema

Universidad Latino opera Eva WA en temporada de **inscripciones**. WhatsApp es el canal conversacional; GHL es la **cabina comercial** de admisiones.

### Síntomas

- El **~95%** del tráfico WA puede ser ruido conversacional: saludos, gracias, bye, emojis, media sin texto, spam, mensajes equivocados, ambigüedad sin intención comercial.
- Enviar **todo** a GHL contamina: contactos, notas, tasks, custom fields `wa_*` y tiempo de asesores.
- **Meta Ads Click-to-WhatsApp** multiplicará mensajes fríos (“Hola” desde anuncio) sin señal comercial.
- Admisiones necesitan **señales accionables**, no un log crudo de WhatsApp.

### Necesidad

Separar cuatro capas:

1. **Conversación** (WhatsApp — Eva responde lo razonable).
2. **Trazabilidad técnica** (InsForge — inbound/outbound, intents, scoring, decisiones simuladas).
3. **Lead calificado** (GHL — solo cuando hay valor comercial o handoff).
4. **Handoff humano** (task + contexto estructurado, sin duplicados).

### Regla madre adoptada

> **WhatsApp conversa. InsForge registra. GHL solo recibe leads calificados o casos que requieren seguimiento humano.**

---

## 3. Principio operativo adoptado

| Capa | Responsabilidad |
|------|-----------------|
| **WhatsApp (YCloud)** | Responder casi todo lo razonable; no silenciar bot post-handoff sin evaluación adicional (hotfix 7G.6D vigente). |
| **InsForge** | Registrar trazabilidad: mensajes, intents, lead score, routing decision, `would_sync_*` en shadow. |
| **GHL** | Contacto / nota / task / `wa_*` **solo** si el Relevance Gate aprueba. |
| **Humano (admisiones)** | Entra por solicitud directa, alta intención, fuera de knowledge, tema sensible, dato no validado, post-test, queja, riesgo de alucinación. |

**No inventar** precios, becas, fechas ni políticas fuera de `source-of-truth` / academic engine.

**Consenso multi-modelo (5 propuestas externas):**

1. No mandar todo WhatsApp a GHL.
2. Implementar `GHL_SYNC_POLICY=qualified_only` **antes** de Meta Ads.
3. Registrar trazabilidad en InsForge.
4. GHL solo con señal comercial.
5. No crear contacto por saludo aislado ni primer “Hola” de Meta Ads.
6. Lead scoring simple e interpretable.
7. Escalar a humano cuando Eva no debe resolver.
8. No pegar transcript crudo en GHL.
9. No duplicar tasks.
10. **Shadow mode primero** (7G.7B) antes de tocar GHL real con la política nueva.

---

## 4. Arquitectura lógica propuesta

Compatible con `ycloud-wa-inbound.js` actual — **extensión**, no reemplazo.

```
Inbound WhatsApp (YCloud webhook)
    │
    ▼
Normalización (teléfono E.164, texto, tipo mensaje)
    │
    ▼
Lectura wa_contacts_state (wa_stage, wa_needs_human, wa_last_intent)
    │
    ▼
classifyIntent(rawText, config, contactContext)   ← hotfix 7G.6D
    │
    ▼
buildIntentDecision + enrichDecisionWithOperational
    │
    ▼
Extracción señales comerciales (carrera, beca, inscripción, urgencia, fuente Meta)
    │
    ▼
Academic engine / KB (si shouldEnrichAcademic) — source-of-truth
    │
    ▼
LLM rewrite limitado (shouldUseLLM + allowlist) — no fuente de verdad
    │
    ▼
computeLeadScore() + evaluateGhlRelevance()   ← NUEVO (7G.7B+)
    │
    ├─── A) Solo WhatsApp + InsForge log
    ├─── B) GHL contact + note
    ├─── C) GHL contact + note + task
    ├─── D) Human handoff (task si gate aprueba)
    └─── E) ignore GHL (responder WA, no CRM)

    ▼
resolveGhlLiveAllowlist()  ← existente; no abrir sin allowlist en prod controlada
    │
    ▼
syncGHLContact() — solo si policy + gate + allowlist + live flags lo permiten
    │
    ▼
upsertContactState + outbound YCloud
```

**Punto de inserción en código futuro:** inmediatamente **antes** de `syncGHLContact()` en el handler, después de `applyAcademicAndLlmEnrichment()`.

---

## 5. Variables propuestas (documentación — no implementar en 7G.7A)

| Variable | Valores / default propuesto | Propósito |
|----------|----------------------------|-----------|
| `GHL_SYNC_POLICY` | `none` \| `qualified_only` \| `all` | Política maestra de escritura GHL. Default futuro recomendado: `qualified_only` en prod comercial. |
| `GHL_LEAD_SCORE_THRESHOLD` | `45` (default) | Umbral mínimo para sync GHL contact+note en `qualified_only`. |
| `GHL_META_ADS_LEAD_SCORE_THRESHOLD` | `50` (inicial), `55` si ruido | Umbral más alto para tráfico Meta (mensajes fríos). |
| `GHL_RELEVANCE_SHADOW_MODE` | `true` en 7G.7B | Calcula `would_sync_*` sin alterar sync real. |
| `META_ADS_FIRST_MESSAGE_NO_SYNC` | `true` | Primer mensaje desde campaña Meta no crea contacto GHL. |
| `META_ADS_REQUIRE_QUALIFICATION` | `true` | Exige señal comercial post-saludo antes de sync. |
| `GHL_IGNORE_INTENTS` | ver lista §5.1 | Intents que por defecto no sincronizan GHL. |
| `GHL_RELEVANT_INTENTS` | ver lista §5.2 | Intents con señal comercial potencial. |
| `HUMAN_ESCALATION_INTENTS` | ver lista §5.3 | Intents que disparan handoff / task. |

### 5.1 `GHL_IGNORE_INTENTS` (propuesta)

```
saludo,agradecimiento,despedida,sin_texto,spam,emoji,wrong_number,media_no_text
```

**Nota:** `agradecimiento` y `despedida` ya existen en código (`92ef181`). En gate futuro: **nunca GHL**, pero **sí WA** con hotfix post-escalación.

### 5.2 `GHL_RELEVANT_INTENTS` (propuesta)

```
carrera_interes,carreras_disponibles,beca,costo,inscripcion,documentos,modalidad,
no_se_que_estudiar,test_vocacional,post_test,humano,duda_test
```

**Mapeo código actual:** `no_se_que_estudiar` ≈ test vocacional; `costo` / `inscripcion` / `documentos` / `modalidad` vía academic engine o intents futuros.

### 5.3 `HUMAN_ESCALATION_INTENTS` (propuesta)

```
humano,inscripcion,duda_test,post_test,fuera_de_knowledge,queja,costo_no_validado,beca_no_validada
```

### 5.4 Campos `wa_*` candidatos (fase posterior — no implementar en 7G.7A)

| Campo candidato | Tipo sugerido | Uso |
|-----------------|---------------|-----|
| `wa_lead_score` | Number | Último score calculado |
| `wa_sync_policy` | Text | `none` / `qualified_only` / `all` aplicada |
| `wa_last_routing_decision` | Text | `no_sync`, `sync_qualified`, `sync_with_task`, etc. |
| `wa_qualified_for_ghl` | Checkbox | `true` si gate aprobó |

**Campos validados hoy (8):** `wa_last_intent`, `wa_last_message_at`, `wa_stage`, `wa_needs_human`, `wa_summary`, `wa_source`, `wa_last_inbound_text`, `wa_last_outbound_text` — ver `ghl-phase-3c-custom-fields.md`.

---

## 6. Modos de `GHL_SYNC_POLICY`

### `none`

| Aspecto | Comportamiento |
|---------|----------------|
| GHL | **No escribe** (equivalente operativo a `GHL_SYNC_MODE=dry_run` o gate siempre `no_sync`). |
| WhatsApp | Puede responder (`mock` o `live_outbound`). |
| InsForge | Registra inbound/outbound + shadow metrics. |
| Uso | Emergencia, rollback, 7G.7B shadow puro, pruebas sin CRM. |

### `qualified_only` (recomendado producción comercial)

| Aspecto | Comportamiento |
|---------|----------------|
| GHL | Solo si `evaluateGhlRelevance()` → `shouldSync=true` **y** allowlist **y** `GHL_SYNC_MODE=live`. |
| WhatsApp | Responde según intent actual. |
| InsForge | Siempre log; en shadow también `would_sync_*`. |
| Uso | 7G.7D organic limited · 7G.8 Meta Ads controlled. |

### `all`

| Aspecto | Comportamiento |
|---------|----------------|
| GHL | Sincroniza todo lo permitido por allowlist + flags actuales (comportamiento cercano a piloto 7G.6C). |
| Uso | **Solo** pruebas internas muy controladas. **No** Meta Ads. **No** tráfico público. |

**Compatibilidad flags actuales:** `GHL_SYNC_POLICY` es **capa adicional** sobre `GHL_SYNC_MODE` + `GHL_LIVE_ALLOWED_PHONES`. No reemplaza allowlist.

---

## 7. Lead scoring v1

Score simple, interpretable, auditable en InsForge (tabla log o columna futura).

### Señales positivas

| Señal | Puntos |
|-------|--------|
| Inscripción explícita (“inscribirme”, “quiero inscribirme”, “proceso de inscripción” con intención) | +40 |
| Carrera mencionada concreta (entity academic / `carrera_interes`) | +30 |
| Beca / costo / “cuánto cuesta” | +25 |
| Solicitud asesor humano (`humano`) | +20 |
| Urgencia (“hoy”, “antes de”, “cierre de inscripción”) | +15 |
| Modalidad / horario / campus | +10 |
| Test vocacional / `no_se_que_estudiar` | +10 |
| Padre/madre/tutor mencionado | +5 |

### Señales negativas

| Señal | Puntos |
|-------|--------|
| Ambigüedad / fuera de contexto / ruido | −10 |
| Spam / wrong_number / emoji solo | −20 (opcional cap en 0) |

### Umbrales de routing (propuesta)

| Rango | Acción GHL |
|-------|------------|
| **0–29** | Solo WhatsApp + InsForge. **No GHL.** |
| **30–44** | No GHL salvo intent de alto valor (`humano`, `inscripcion`, `post_test`, `duda_test`). Shadow: `would_sync=false` salvo excepción. |
| **45–59** | GHL contact + note. Task solo si regla específica (ej. `humano`). |
| **60+** | GHL contact + note + task si aplica handoff. |

### Meta Ads

- Threshold inicial: **50** (`GHL_META_ADS_LEAD_SCORE_THRESHOLD`).
- Si mucho ruido en primeras 48–72 h: subir a **55**.
- Primer mensaje campaña: **no sync** aunque score bajo por saludo (`META_ADS_FIRST_MESSAGE_NO_SYNC`).

---

## 8. Matriz de intents y acciones

Leyenda: ✅ sí · ❌ no · ⚠️ condicional · — N/A

| intent | WA responder | log backend | GHL contact | GHL note | GHL task | update wa_* | human handoff | ignore GHL | observación |
|--------|:------------:|:-----------:|:-----------:|:--------:|:--------:|:-----------:|:-------------:|:----------:|-------------|
| saludo | ✅ | ✅ | ❌ | ❌ | ❌ | ⚠️ solo stage | ❌ | ✅ | No GHL salvo saludo + señal comercial en mismo hilo (score≥45). |
| agradecimiento | ✅ | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ✅ | Hotfix 7G.6D: post-escalación preserva stage/needs_human; **no task**. |
| despedida | ✅ | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ✅ | Idem agradecimiento. |
| ambiguo | ✅ menú | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ✅ | Primer contacto Meta: pregunta calificación, no GHL. |
| sin_texto | ✅ pedir texto | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ✅ | |
| spam | ⚠️ mínima | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | |
| emoji | ✅ breve | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | |
| wrong_number | ✅ aclarar | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | |
| media_no_text | ✅ pedir texto | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Audio/imagen sin caption. |
| carreras_disponibles | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ✅ | ❌ | ⚠️ | GHL si score≥45 o segundo mensaje con interés. |
| carrera_interes | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | ❌ | Contact+note si carrera concreta. Task si pide asesor/inscripción. |
| beca | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | ❌ | Task si dato no validado o rewrite bloqueado. |
| costo | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | ❌ | Academic factual; task si `costo_no_validado`. |
| inscripcion | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | Alta intención — siempre handoff path. |
| documentos | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | GHL si score≥45. |
| modalidad | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ✅ | ❌ | ⚠️ | |
| no_se_que_estudiar | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ✅ | ❌ | ⚠️ | Link test; GHL si score≥45 o retorno post-test. |
| test_vocacional | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ✅ | ❌ | ⚠️ | Alias operativo de test. |
| post_test | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | |
| humano | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | Allowlist + gate; task única 24h. |
| duda_test | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | |
| fuera_de_knowledge | ✅ institucional | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | Task si valor comercial; no GHL si ruido. |
| queja | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | Siempre escalar. |

**Intents en código hoy:** `ambiguo`, `carrera_interes`, `carreras_disponibles`, `no_se_que_estudiar`, `beca`, `humano`, `duda_test`, `post_test`, `sin_texto`, `agradecimiento`, `despedida`.

**Intents spec futuros / vía academic:** `saludo`, `spam`, `emoji`, `wrong_number`, `media_no_text`, `costo`, `inscripcion`, `documentos`, `modalidad`, `test_vocacional`, `fuera_de_knowledge`, `queja`.

---

## 9. Reglas GHL

### Contacto

- Upsert por **teléfono E.164** normalizado (`normalizePhoneMX`).
- **No** usar email como llave primaria.
- **No** crear contacto por: saludo aislado, primer “Hola” Meta Ads, gracias/bye/emoji/media sin texto.
- Respetar **`GHL_LIVE_ALLOWED_PHONES`** — sin apertura pública sin 7G.8 public limited mode.
- Respetar **`GHL_PROTECTED_FIELDS`** — landings / MiBeca / test vocacional (ver `phase-7g4u`).

### Notes

- **No** una nota por cada mensaje.
- Crear nota ante **cambio significativo**: nuevo intent calificado, escalación, carrera identificada, score cruza umbral.
- **No** transcript crudo.
- Formato estructurado sugerido:

```
Eva WA — [intent] | score: NN
Teléfono: +52...
Etapa: wa_stage
Carrera: ...
Acción: sync_qualified | human_handoff
Resumen: (máx 2–3 líneas)
Fuente: YCloud / Eva WA | meta_ads (si aplica)
```

- Agrupación temporal de mensajes: fase posterior (debounce 2–5 min).

### Tasks

- Solo handoff real o alta intención.
- **No duplicar** task mismo tipo en **24 h** (humano, inscripción, beca, post_test, duda_test, queja, fuera_de_knowledge comercial).
- Títulos existentes 4B: `EVA_INTENT_TASK_TITLES` en handler — reutilizar.

### Custom fields `wa_*`

- Actualizar solo con dato útil.
- No sobrescribir con vacío.
- No guardar texto libre largo en CF (usar note estructurada).
- **A)** 8 campos validados — usar en sync aprobado.
- **B)** 4 candidatos §5.4 — solo tras confirmar IDs en `GHL_WA_FIELD_MAP`.

---

## 10. Meta Ads Click-to-WhatsApp

**Precondiciones:** 7G.7B shadow PASS · `qualified_only` · rollback probado · **no** activar en 7G.7A.

| Regla | Detalle |
|-------|---------|
| Primer saludo anuncio | **No sync GHL** (`META_ADS_FIRST_MESSAGE_NO_SYNC=true`). |
| Pregunta calificación | “¿Te interesa alguna carrera en específico, quieres información de becas o prefieres hacer el test vocacional?” |
| Sync GHL | Solo respuesta con señal comercial (carrera, beca, test, asesor, inscripción) y score ≥ umbral Meta. |
| Tag sugerido | `meta_ads_lead` **solo** al cruzar gate (además de `eva-wa`). |
| Threshold | 50 inicial → 55 si ruido. |
| Monitoreo | Diario: inbounds, `would_sync`, tasks, `wa_errors`, costo OpenAI. |
| Prefill conocido | `Hola, quiero hacer el test vocacional` → `no_se_que_estudiar` (5A) — aún así **no** sync en primer mensaje si política Meta activa. |

Referencia plan Meta: `phase-7g8-meta-ads-controlled-plan.md`.

---

## 11. Human handoff

### Escalar cuando

- Usuario pide asesor (`humano`).
- Quiere inscribirse (`inscripcion`).
- Beca/costo **no validado** en source-of-truth.
- `post_test` o `duda_test`.
- Queja.
- `fuera_de_knowledge` **con** valor comercial.
- Baja confianza académica repetida.
- Frustración detectada (fase posterior).
- Tema sensible (menores, quejas formales, datos personales extensos).
- Eva no debe inventar.

### Al escalar

- Respuesta institucional (canalización 4B).
- Task GHL **si** gate + allowlist + live lo permiten.
- `wa_needs_human=true`, `wa_stage` coherente (`asesor_requerido`, etc.).
- **No** duplicar tasks (ventana 24 h).
- **Respetar hotfix 7G.6D:** Gracias/Bye post-escalación **no** reabren menú **ni** crean task.

---

## 12. Out-of-knowledge

### Condiciones

- Academic engine / KB sin match.
- `confidence` < umbral (ej. 0.5).
- Pregunta fuera de `source-of-truth.js` / CSV institucional.
- Costos, becas, fechas, documentos **no validados** (`pending_validation`).

### Regla

- **No inventar.**
- **No** completar con suposiciones ni LLM rewrite en beca/costos sensibles.
- Respuesta institucional:

> Para no darte información incorrecta, voy a canalizar tu duda con admisiones.

- Valor comercial o sensible → task/handoff + GHL si gate aprueba.
- Fuera de contexto sin valor → solo WA + InsForge, **ignore GHL**.

---

## 13. Pseudocódigo compatible con handler actual

Orientativo — **no implementación**. Insertar antes de `syncGHLContact()`.

```javascript
// Después de applyAcademicAndLlmEnrichment() y antes de syncGHLContact()

const policy = config.ghlSyncPolicy || "all"; // futuro: env GHL_SYNC_POLICY
const shadow = config.ghlRelevanceShadowMode === true; // GHL_RELEVANCE_SHADOW_MODE

const relevance = evaluateGhlRelevance({
  intent: enrichedDecision.intent,
  decision: enrichedDecision,
  contactContext,
  messageText: parsed.message_text,
  source: detectTrafficSource(payload), // organic | meta_ads | allowlist_pilot
  academicResult: enrichResult.academicMeta,
  leadScore: computeLeadScore({ intent, messageText, contactContext, academicResult }),
  policy,
  thresholds: {
    default: config.ghlLeadScoreThreshold ?? 45,
    metaAds: config.ghlMetaAdsLeadScoreThreshold ?? 50,
  },
});

// Shadow 7G.7B: siempre loggear, no cambiar sync si shadow=true
await logGhlRelevanceDecision(client, {
  inboundId,
  normalizedPhone,
  ...relevance,
  shadow,
});

if (shadow) {
  // No alterar syncGHLContact — comportamiento actual
} else if (!relevance.shouldSync) {
  // Skip GHL API — WhatsApp ya respondió
  ghlSync = dryRunSkip(relevance.reason);
} else {
  // syncGHLContact con flags relevance.shouldCreateNote / shouldCreateTask
}

// Siempre después:
await resolveGhlLiveAllowlist(config, normalizedPhone); // existente
```

```javascript
function evaluateGhlRelevance(ctx) {
  const { intent, decision, contactContext, messageText, source, academicResult, policy, thresholds } = ctx;
  const leadScore = ctx.leadScore ?? computeLeadScore(ctx);

  const ignored = isIgnoredIntent(intent) && !hasBusinessSignal(messageText, contactContext, academicResult);
  const highValue = isHighValueIntent(intent) || leadScore >= thresholds.default;
  const metaFirst = source === "meta_ads" && isFirstMessage(contactContext) && META_ADS_FIRST_MESSAGE_NO_SYNC;
  const outOfKnowledgeCommercial =
    academicResult?.outOfKnowledge === true && hasBusinessSignal(messageText, contactContext, academicResult);

  if (policy === "none") return noSync("policy_none", leadScore);
  if (ignored) return noSync("ignored_intent", leadScore);
  if (metaFirst) return noSync("meta_ads_first_message", leadScore);

  if (requiresHuman(intent, decision) || outOfKnowledgeCommercial) {
    return syncWithTask("human_handoff", leadScore);
  }

  if (policy === "qualified_only" && highValue) {
    return syncQualified({ note: true, task: leadScore >= 60 || requiresTask(intent) }, leadScore);
  }

  if (policy === "all") return syncAllAllowed(leadScore);

  return noSync("not_qualified", leadScore);
}
```

**Funciones existentes a preservar:**

- `classifyIntent` + `contactContext` (7G.6D).
- `resolveGhlLiveAllowlist` / `syncGHLContactLive`.
- `GHL_PROTECTED_FIELDS` / whitelist 8 `wa_*`.
- `shouldEnrichAcademic` / `shouldUseLLM` — bloqueos `agradecimiento`/`despedida`.

---

## 14. QA y tests requeridos (fases futuras)

| # | Caso | Esperado |
|---|------|----------|
| 1 | Saludo aislado | No GHL |
| 2 | Gracias | No GHL |
| 3 | Bye | No GHL |
| 4 | Gracias post-escalación | No menú; no task duplicada; `wa_needs_human` preservado |
| 5 | Bye post-escalación | Idem |
| 6 | Media sin texto | Pedir aclaración; no GHL |
| 7 | Derecho online | Califica; contact+note (score≥45) |
| 8 | Beca 9.2 | Califica; note; task según política beca |
| 9 | Quiero asesor | Handoff; task |
| 10 | Meta Ads “Hola” | No sync primer mensaje |
| 11 | Meta Ads + carrera | Sync si score≥50 |
| 12 | Costo no validado | Escala; no inventar |
| 13 | Fuera KB sensible comercial | Task; no alucinar |
| 14 | Spam | No GHL |
| 15 | Inscripción explícita | Contact+note+task |
| 16 | Regression 7G.3A | 14/14 PASS |
| 17 | Regression 7G.5B | 9/9 PASS |
| 18 | Regression 7G.6D hotfix | 4/4 PASS |
| 19 | Replay mock | 3/3 PASS (`run-phase7g6d-replay-mock.mjs`) |

**Nuevos runners propuestos (7G.7B):** `run-phase7g7b-relevance-shadow.mjs` — fixture + mock DB, sin GHL API live.

---

## 15. Plan de implementación por fases

| Fase | ID | Entregable | GHL real |
|------|-----|------------|:--------:|
| Spec | **7G.7A-SPEC** | Este documento | ❌ |
| Shadow | **7G.7B-SHADOW** | `computeLeadScore`, `evaluateGhlRelevance`, log `would_sync_*` | ❌ |
| Allowlist qualified | **7G.7C-ALLOWLIST** | `qualified_only` en teléfonos controlados | ⚠️ piloto |
| Organic | **7G.7D-ORGANIC** | Tráfico orgánico limitado; FP/FN review | ⚠️ ventana |
| Meta prep | **7G.8-PREP** | Public limited mode + seguridad DB | ❌ |
| Meta Ads | **7G.8** | Campaña bajo presupuesto; threshold 50–55 | ⚠️ controlado |

**Orden obligatorio:** 7G.7A → 7G.7B → 7G.7C → 7G.7D → 7G.8-PREP → 7G.8.

---

## 16. Rollback

### Rollback runtime actual (vigente)

```
WA_AGENT_MODE=mock
GHL_WRITE_CUSTOM_FIELDS=false
GHL_SYNC_MODE=dry_run
GHL_LIVE_ALLOWED_PHONES=+529991525583
```

Smokes: `run-phase7g3a-classifier-hotfix.mjs`, `run-phase7g5b-custom-fields-preflight.mjs`, `run-phase7g6c-admissions-pilot-validate.mjs`.

### Rollback política relevance (futuro)

```
GHL_SYNC_POLICY=none
GHL_RELEVANCE_SHADOW_MODE=false
```

Comportamiento efectivo: igual a hoy (sync según `GHL_SYNC_MODE` + allowlist sin gate de calificación).

---

## 17. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Falsos positivos GHL | Ruido en CRM | `qualified_only`, score, shadow 7G.7B, notas agrupadas |
| Falsos negativos / leads perdidos | Pérdida comercial | Monitoreo FP/FN en 7G.7D; umbral ajustable; allowlist ampliada temporal |
| Exceso handoff | Carga admisiones | Task dedup 24h; score antes de task |
| Tasks duplicadas | Confusión GHL | Ventana 24h; hotfix 7G.6D; gate `shouldCreateTask` |
| Alucinación IA | Daño institucional | KB + block rewrite beca; out-of-knowledge → handoff |
| Meta Ads tráfico frío | Contaminación GHL | `META_ADS_FIRST_MESSAGE_NO_SYNC`; threshold 50–55 |
| Ruido testers internos | Métricas falsas | Excluir allowlist piloto de dashboards Meta |
| Campos GHL inexistentes | API 4xx | Confirmar `GHL_WA_FIELD_MAP` antes de nuevos `wa_*` |
| Ruptura hotfix Gracias/Bye | Regresión UX | Tests 7G.6D + replay en cada release |
| source-of-truth incompleto | out-of-knowledge | CSV `pending_validation`; escalar, no inventar |
| Abrir GHL sin allowlist | Escritura masiva | No `GHL_LIVE_REQUIRE_ALLOWLIST=false` sin 7G.8 |

---

## 18. Decisión final

**Antes de Meta Ads**, Eva WA debe implementar **7G.7B shadow mode** del GHL Relevance Gate:

1. Calcular `lead_score` y `routing_decision` en cada inbound.
2. Loggear `would_sync_to_ghl`, `would_create_note`, `would_create_task` **sin** alterar GHL real.
3. Comparar contra comportamiento actual en piloto allowlist.
4. Ajustar umbrales y matriz §8 con datos reales.

**No abrir Meta Ads público** sin:

- `GHL_SYNC_POLICY=qualified_only` validado,
- shadow validation PASS,
- rollback confirmado,
- y hotfix 7G.6D intacto.

---

## 19. Entregable y referencias

### Entregable 7G.7A

- `docs/phase-7g7a-ghl-relevance-gate-spec.md` (este archivo).

### Referencias código / docs existentes

| Artefacto | Uso |
|-----------|-----|
| `insforge/functions/ycloud-wa-inbound.js` | Handler, classifier, GHL sync, hotfix 7G.6D |
| `insforge/functions/lib/academic-engine/adapter.js` | `shouldEnrichAcademic`, `BLOCKED_WA_INTENTS` |
| `insforge/functions/lib/eva-llm/shouldUseLLM.js` | Rewrite guard |
| `docs/ghl-phase-3c-custom-fields.md` | 8 CF validados |
| `docs/phase-7g4u-ghl-fields-landings-vs-eva.md` | Campos protegidos |
| `docs/phase-7g6d-organic-limited-prep.md` | Organic allowlist |
| `docs/phase-7g8-meta-ads-controlled-plan.md` | Meta controlled |
| `tests/run-phase7g6d-replay-mock.mjs` | Replay post-escalación |
| Commits `92ef181`, `6009ebe` | Hotfix + replay |

---

**Próximo paso autorizado:** 7G.7B-SHADOW — implementación con `GHL_RELEVANCE_SHADOW_MODE=true` y sin cambios GHL live.
