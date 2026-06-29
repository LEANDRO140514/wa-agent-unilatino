# Phase 8B.4 — Handler CAG Shadow Logging (Mock Only)

**Estado:** PASS  
**Fecha:** 2026-06-27  
**Commit base:** `807e3b8` — `fix: align eva cag router with normalizer`  
**Repo:** `wa-agent-unilatino`

---

## Contexto

Tras 8B.1–8B.3, el router CAG está alineado con el normalizer Eva y el shadow replay alcanza **14/15 CAG useful** sin modificar respuestas.

8B.4 conecta la evaluación shadow al handler real como **diagnóstico interno**, sin inyectar CAG al usuario.

---

## Objetivo

Durante ejecución mock/local con flag explícito, el handler registra:

- mensaje → intent → preview respuesta determinística
- CAG/NONE, category, recommendation
- `contextAvailable`, `contextPreviewLength` (no context completo)
- `finalResponseModified: false` (siempre)

**Principio:** CAG shadow observa. No decide. No modifica respuesta.

---

## Qué se modificó en handler

**Archivo:** `insforge/functions/ycloud-wa-inbound.js`

**Punto de inserción:** después de `applyAcademicAndLlmEnrichment`, **antes** de LLM shadow log / GHL / outbound YCloud.

```txt
classifyIntent → applyAcademicAndLlmEnrichment → maybeLogCagShadow → (resto sin cambios)
```

**Nuevo módulo:** `insforge/functions/lib/knowledge/cagShadowLogging.js`

| Export | Rol |
|--------|-----|
| `isCagShadowLoggingEnabled` | Gate de seguridad |
| `redactCagShadowLog` | Redacción de log |
| `maybeLogCagShadow` | Evalúa + loggea JSON seguro |

**Config:** `getConfig()` incluye `evaCagShadowLogging` (lectura de env, default false).

---

## Flag `EVA_CAG_SHADOW_LOGGING`

| Valor | Comportamiento |
|-------|----------------|
| no definido | **false** |
| `"false"` | false |
| cualquier otro | false |
| `"true"` | candidato a shadow (requiere gate completo) |

**8B.4:** no se activa en InsForge. Solo lectura segura en código.

---

## Gate de seguridad

Shadow solo corre si **todas** se cumplen:

```txt
EVA_CAG_SHADOW_LOGGING === "true"
WA_AGENT_MODE === "mock"
EVA_LLM_ENABLED !== "true"
LLM_MODE === "off" (o vacío)
```

**Bloqueos explícitos 8B.4:**

- `live_outbound` → no shadow
- `EVA_LLM_ENABLED=true` → no shadow
- `LLM_MODE=rewrite` → no shadow

---

## Qué se loggea

Evento JSON: `event: "eva_cag_shadow"`

```txt
shadowEnabled, knowledgeMode, knowledgeSource, knowledgeVersion
category, recommendation, contextAvailable, contextPreviewLength
deterministicIntent, finalResponseModified, notes (max 5)
```

## Qué NO se loggea

```txt
teléfono completo
email / documentos personales
context CAG completo
respuesta completa larga
secrets / tokens / API keys
payload YCloud / GHL completo
```

Errores CAG: `[eva_cag_shadow_error]` warning truncado; flujo determinístico continúa.

---

## Archivos creados / modificados

| Archivo | Acción |
|---------|--------|
| `insforge/functions/lib/knowledge/cagShadowLogging.js` | Creado |
| `insforge/functions/ycloud-wa-inbound.js` | Modificado (shadow hook + exports) |
| `tests/run-phase8b4-handler-cag-shadow-logging.mjs` | Creado |
| `docs/phase-8b4-handler-cag-shadow-logging.md` | Creado |

**Sin cambios:** GHL sync, tasks, outbound text, flags InsForge, secrets.

---

## Resultados tests

| Suite | Resultado |
|-------|-----------|
| `run-phase8b1-cag-cache-build.mjs` | 22/22 PASS |
| `run-phase8b1-knowledge-context.mjs` | 142/142 PASS |
| `run-phase8b2-cag-shadow-replay.mjs` | 15/15 PASS |
| `run-phase8b3-cag-router-normalizer-alignment.mjs` | 48/48 PASS |
| `run-phase8b4-handler-cag-shadow-logging.mjs` | PASS (cases A–E) |
| `run-phase7g7c7a-pilot-conversation-hotfix.mjs` | 13/13 PASS |
| `run-phase7g7c7b-pilot-conversation-replay.mjs` | 15/15 PASS |

**Case C (flag on):** 4 mensajes con log seguro, `finalResponseModified=false`, respuesta determinística sin cambio.

---

## Confirmaciones

| Restricción | Estado |
|-------------|--------|
| Respuesta final no modificada | ✅ |
| LLM off (runtime esperado) | ✅ Gate bloquea LLM on |
| RAG productivo off | ✅ |
| Live / deploy | ✅ No |
| InsForge writes | ✅ No |
| Secrets en logs | ✅ 0 |

---

## Riesgos

1. Log JSON en `console.log` — en producción futura migrar a structured logging con redacción.
2. Duplicación gate env vs config — mantener `isCagShadowLoggingEnabled` como única fuente.
3. Activación accidental en InsForge — default-off; documentar en runbook antes de habilitar.

---

## Recomendación siguiente

**8B.5 — CAG decision report + activation criteria**

Criterios para cuándo pasar de shadow logging a integración controlada (aún sin LLM/RAG/live).

Alternativa si aparece riesgo en redacción:

**8B.4-HARDEN — shadow logging redaction hardening**

---

**Fase 8B.4: PASS**
