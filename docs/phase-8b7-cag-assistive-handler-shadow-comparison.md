# Phase 8B.7 — CAG Assistive Handler Shadow Comparison (Mock Only)

**Estado:** PASS (shadow comparison mock — sin activación productiva)  
**Fecha:** 2026-06-24  
**Commit base:** `2c0c91f` — `feat: add mock cag assistive response prototype`  
**Repo:** `wa-agent-unilatino`

---

## Contexto

Fase **8B.7** conecta el prototipo assistive CAG (8B.6) al handler real en modo **shadow comparison**. El handler observa y compara respuesta determinística vs propuesta assistive, pero **nunca sustituye** `enrichedDecision.responseText`.

Principio central:

```txt
CAG assistive comparison observa.
CAG assistive comparison compara.
CAG assistive comparison loggea.
CAG assistive comparison NO decide.
CAG assistive comparison NO modifica responseText.
```

---

## Objetivo

Comparar en handler (mock-only):

1. Respuesta determinística final actual  
2. Resultado CAG (categoría)  
3. Respuesta asistida propuesta  
4. Decisión de uso potencial (`recommendation`)  
5. Riesgos / safeguards  

Sin activación productiva, sin outbound assistive, sin LLM/RAG/live.

---

## Qué se modificó

| Archivo | Cambio |
|---------|--------|
| `insforge/functions/lib/knowledge/cagAssistiveShadowComparison.js` | **Nuevo** — helper shadow comparison |
| `insforge/functions/ycloud-wa-inbound.js` | Hook después de `maybeLogCagShadow`, antes de LLM/GHL/outbound |
| `tests/run-phase8b7-handler-cag-assistive-shadow-comparison.mjs` | Tests gates A–G |
| `tests/run-phase8b7-cag-assistive-handler-replay.mjs` | Replay 15 mensajes piloto |
| `docs/phase-8b7-cag-assistive-handler-shadow-comparison.md` | Este reporte |

### Hook en handler

```txt
classifyIntent
applyAcademicAndLlmEnrichment
maybeLogCagShadow(...)           ← 8B.4
maybeLogCagAssistiveComparison(...) ← 8B.7 (nuevo)
LLM shadow / GHL sync / sendYCloudMessage(enrichedDecision.responseText)
```

**Garantía:** `sendYCloudMessage` sigue usando `enrichedDecision.responseText`. No se modifica `responseText` ni se usa `assistiveResponse` para outbound.

---

## Flags

### `EVA_CAG_ASSISTIVE_SHADOW` (nuevo, default-off)

| Valor | Comportamiento |
|-------|----------------|
| ausente / `false` / otro | Shadow comparison desactivado |
| `true` (exacto) | Candidato a log comparison si pasan gates |

### `EVA_CAG_RESPONSE_ENABLED` (8B.6, default-off)

Requerido para generar propuesta assistive usable. Si está off, el comparison puede loggear estado `disabled` pero `assistiveResponseAvailable=false`.

---

## Gates de seguridad

`isCagAssistiveShadowComparisonEnabled()` retorna `true` solo si:

```txt
EVA_CAG_ASSISTIVE_SHADOW === "true"
WA_AGENT_MODE === "mock"
EVA_LLM_ENABLED !== "true"
LLM_MODE === "off" o vacío
GHL_SYNC_MODE !== "live"
```

Bloqueado: `live`, `live_outbound`, LLM on, `GHL_SYNC_MODE=live`.

---

## Qué se loggea (`eva_cag_assistive_shadow`)

```txt
event
enabled
mode
category
shouldUseAssistiveResponse
assistiveResponseAvailable
assistiveResponsePreviewLength
deterministicResponsePreviewLength
recommendation
reason
risks
safeguards
finalResponseModified (siempre false)
```

## Qué NO se loggea

```txt
teléfono completo
email / documentos personales
context CAG completo
respuesta completa (solo longitudes)
secrets / tokens / API keys
headers / payloads YCloud o GHL completos
```

Errores se capturan con `console.warn` seguro; el flujo determinístico continúa.

---

## Resultados tests

| Suite | Resultado |
|-------|-----------|
| `run-phase8b7-handler-cag-assistive-shadow-comparison.mjs` | Gates A–G PASS |
| `run-phase8b7-cag-assistive-handler-replay.mjs` | 15/15 PASS |
| Regresión 8B.1–8B.6 + 7G.7C.7 | PASS |

### Replay 15 mensajes

- **14/14** allowed/partial → `assistiveResponseAvailable=true`  
- **1/1** `hola` → blocked, `assistiveResponseAvailable=false`  
- **`finalResponseModified=false` 15/15**  
- **`responseText` determinístico sin cambio 15/15**  
- Logs seguros: sin secrets, sin teléfono completo, sin contexto bruto  

---

## Confirmaciones de restricciones

| Restricción | Estado |
|-------------|--------|
| `responseText` no modificado | ✅ |
| `finalResponseModified=false` siempre | ✅ |
| Sin activación productiva CAG | ✅ |
| Sin deploy / live / GHL live / WA real | ✅ |
| Sin LLM / RAG productivo | ✅ |
| Sin InsForge writes | ✅ |
| Sin secrets en logs | ✅ |

---

## Riesgos

1. **Dos flags** — operadores deben entender `EVA_CAG_ASSISTIVE_SHADOW` (log) vs `EVA_CAG_RESPONSE_ENABLED` (builder).  
2. **Divergencia texto** — comparison expone diferencias; no implica sustitución.  
3. **`promotions_general`** — partial con human followup; riesgo si se activara sin safeguards.

---

## Siguiente fase recomendada

**8B.8 — CAG assistive response acceptance report + console handoff**

Preparar handoff a `algorithmus-wa-console` con métricas de comparison shadow.

Si aparece riesgo de redacción:

**8B.7-HARDEN — assistive shadow redaction hardening**

---

## Runtime seguro (sin cambios)

```txt
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
EVA_LLM_ENABLED=false
LLM_MODE=off
EVA_CAG_ASSISTIVE_SHADOW=false   (propuesto, default-off)
EVA_CAG_RESPONSE_ENABLED=false  (propuesto, default-off)
```
