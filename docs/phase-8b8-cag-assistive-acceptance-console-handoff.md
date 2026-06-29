# Phase 8B.8 — CAG Assistive Acceptance Report + Console Handoff

**Estado:** PASS (cierre documental línea 8B — sin activación productiva)  
**Fecha:** 2026-06-24  
**Commit base:** `5b2328c` — `feat: add cag assistive handler shadow comparison`  
**Repo:** `wa-agent-unilatino`  
**GitHub:** https://github.com/LEANDRO140514/wa-agent-unilatino

---

## 3.1 Resumen ejecutivo

La línea **8B** deja a Eva WA con **CAG asistivo en estado shadow/mock**, sin activación productiva.

El agente puede:

- cargar knowledge pack estático;
- construir cache CAG (`eva-cache-v1.json`);
- clasificar queries CAG (`cagQueryNormalizer`);
- evaluar CAG en shadow (`cagShadowEvaluator`);
- generar respuesta asistiva mock (`cagAssistiveResponse`);
- comparar respuesta determinística vs asistiva desde handler (`cagAssistiveShadowComparison`);
- loggear metadatos seguros (`eva_cag_shadow`, `eva_cag_assistive_shadow`);
- mantener **`responseText` determinístico** en todo el flujo outbound.
- garantía explícita: **responseText determinístico** — outbound = `enrichedDecision.responseText`.

**Explícitamente NO activo:**

```txt
CAG response injection sigue NO activo.
RAG productivo sigue NO activo.
LLM sigue apagado.
Live sigue NO activo.
```

**Decisión de aceptación 8B:** La línea 8B CAG Assistive se considera **cerrada en PASS** para shadow/mock dentro de `wa-agent-unilatino`. No se autoriza paso a response injection ni live sin fases posteriores, approval de admisiones y consola.

**Arquitectura:** No usar `curdeeclau-monorepo`. Dos repos: `wa-agent-unilatino` (vertical) + `whatsapp-saas` → `algorithmus-wa-console` (control plane futuro).

---

## 3.2 Línea de tiempo 8B

| Fase | Commit | Entregable | Estado |
|------|--------|------------|--------|
| 8B.1 | `4132fdb` | Knowledge onboarding + CAG scaffold | PASS |
| 8B.2 | `efbc1af` | Shadow replay | PASS |
| 8B.3 | `807e3b8` | Router + normalizer alignment | PASS |
| 8B.4 | `8e0bec2` | Handler shadow logging | PASS |
| 8B.5 | `2af173e` | Activation criteria | PASS |
| 8B.6 | `2c0c91f` | Assistive response prototype | PASS |
| 8B.7 | `5b2328c` | Handler assistive shadow comparison | PASS |
| **8B.8** | *(pendiente commit)* | Acceptance report + console handoff | PASS |

---

## 3.3 Capacidades implementadas

| Capacidad | Módulo / artefacto | Fase |
|-----------|-------------------|------|
| Knowledge pack estático | `docs/knowledge/static/*`, `metadata.json` | 8B.1 |
| CAG cache local | `docs/knowledge/cache/eva-cache-v1.json` | 8B.1 |
| Knowledge metadata | `docs/knowledge/metadata.json` | 8B.1 |
| `getKnowledgeContext` | `insforge/functions/lib/knowledge/getKnowledgeContext.js` | 8B.1 |
| CAG router normalizado | `cagQueryNormalizer.js` | 8B.3 |
| CAG shadow evaluator | `cagShadowEvaluator.js` | 8B.2 |
| CAG shadow logging en handler | `cagShadowLogging.js` + hook handler | 8B.4 |
| CAG activation policy | `phase-8b5` + test policy | 8B.5 |
| CAG assistive response builder | `cagAssistiveResponse.js` | 8B.6 |
| CAG assistive replay | `run-phase8b6-cag-assistive-replay.mjs` | 8B.6 |
| CAG assistive handler shadow comparison | `cagAssistiveShadowComparison.js` + hook handler | 8B.7 |

**Outbound real:** sigue siendo `enrichedDecision.responseText` (determinístico + academic-engine). CAG no sustituye respuesta al usuario.

---

## 3.4 Flags y estado

| Flag | Propósito | Estado actual | Default | Live permitido (8B) |
|------|-----------|---------------|---------|---------------------|
| `EVA_CAG_SHADOW_LOGGING` | Shadow CAG simple en handler | Disponible (logic) | `false` | No |
| `EVA_CAG_RESPONSE_ENABLED` | Respuesta asistiva mock (builder) | Propuesto / logic only | `false` | No |
| `EVA_CAG_ASSISTIVE_SHADOW` | Comparación asistiva en handler | Disponible (logic) | `false` | No |
| `EVA_LLM_ENABLED` | LLM | `false` | `false` | No |
| `LLM_MODE` | Modo LLM | `off` | `off` | No |
| `WA_AGENT_MODE` | Modo agente | `mock` (seguro) | — | No CAG en live |
| `GHL_SYNC_MODE` | Sync GHL | `dry_run` (seguro) | — | No CAG con `live` |

Solo el valor exacto `"true"` activa flags CAG. Ausente, `false` u otro valor → desactivado.

---

## 3.5 Gates de seguridad

```txt
WA_AGENT_MODE debe ser mock (para shadow/assistive).
GHL_SYNC_MODE no debe ser live.
EVA_LLM_ENABLED no debe ser true.
LLM_MODE debe ser off o vacío.
Flags CAG deben ser "true" exacto.
Default off en todos los flags CAG.
live / live_outbound bloqueados.
finalResponseModified=false siempre en 8B.
responseText no se modifica por CAG.
```

Eventos de log seguros: `eva_cag_shadow`, `eva_cag_assistive_shadow` — sin teléfono completo, sin context bruto, sin secrets.

---

## 3.6 Categorías

| Categoría | Estado | Uso permitido (8B) | Riesgo | Requiere humano |
|-----------|--------|-------------------|--------|-----------------|
| `location` | Allowed | Shadow + assistive mock | Medio (asesor/visita) | No |
| `rvoe` | Allowed | Shadow + assistive mock | Medio (RVOE inventado) | Solo doc legal |
| `online_programs` | Allowed | Shadow + assistive mock | Bajo | No |
| `not_offered` | Allowed | Shadow + assistive mock | Bajo | No |
| `non_primary_levels` | Allowed | Shadow + assistive mock | Medio | Detalle → admisiones |
| `revalidation_general` | Allowed | Shadow + assistive mock | Alto (equivalencias) | Sí (caso académico) |
| `scholarships` | Allowed | Shadow + assistive mock | Medio (beca exacta) | Validación admisiones |
| `price_objection` | Allowed | Shadow + assistive mock | Medio | No prometer beca |
| `programs` | Allowed | Shadow + assistive mock | Medio | No |
| `faqs` | Allowed | Shadow + assistive mock | Bajo | No |
| `promotions_general` | **Partial** | Assistive con safeguards | Alto (vigente) | **Sí** |
| `dynamic` | **Blocked** | NONE / blocked | Alto | Sí |
| `personalized` | **Blocked** | NONE / blocked | Alto | Sí |
| `missing_cache` | **Blocked** | NONE | Alto | Rebuild + approval |
| `unknown_or_greeting` | **Blocked** | Menú determinístico | Bajo | No |

**Allowed:** `location`, `rvoe`, `online_programs`, `not_offered`, `non_primary_levels`, `revalidation_general`, `scholarships`, `price_objection`, `programs`, `faqs`

**Partial:** `promotions_general`

**Blocked:** `dynamic`, `personalized`, `missing_cache`, `unknown_or_greeting`

---

## 3.7 Criterios de aceptación cumplidos

| Criterio | Evidencia |
|----------|-----------|
| Suite 8B.1–8B.7 PASS | Tests automatizados (ver §3.15) |
| Replay 15 mensajes PASS | 8B.2, 8B.6, 8B.7 |
| `finalResponseModified=false` | 0/15 en todos los replays |
| `responseText` determinístico sin cambio | Handler + replays |
| `responseText` determinístico | Outbound = enrichedDecision.responseText |
| CAG useful shadow | 14/15 (solo `hola` → NONE) |
| Assistive available | 14/15 (`hola` blocked) |
| No secrets en logs | Tests 8B.4, 8B.7 |
| No teléfono completo en logs | Tests redaction |
| No context bruto en logs | Solo longitudes / metadata |
| No live / deploy / InsForge writes | Restricciones de fase respetadas |
| No LLM / RAG productivo | Gates + runtime seguro |
| No GHL side effects | `dry_run`, sin tasks/tags/CF por CAG |

---

## 3.8 Criterios NO cumplidos para producción

```txt
No hay aprobación formal de admisiones sobre knowledge pack final.
No hay consola visual aún (algorithmus-wa-console).
No hay auditoría de whatsapp-saas completada.
No hay validación multi-tenant.
No hay rollback real probado en entorno live para response injection.
No hay RAG productivo.
No hay observabilidad visual centralizada.
No hay QA humano sistemático de respuestas asistivas.
No hay response injection activo ni probado en outbound real.
```

---

## 3.9 Política de activación futura

CAG solo puede pasar a **uso controlado** si se cumplen **todas** las condiciones:

```txt
1. Sigue en mock primero (WA_AGENT_MODE=mock).
2. Se activa por flag default-off (explícito "true").
3. Se limita a categorías allowed (allowlist).
4. Se mantiene LLM off (EVA_LLM_ENABLED=false, LLM_MODE=off).
5. Se mantiene RAG off (sin embeddings productivos).
6. Se mantiene GHL dry_run hasta approval explícita.
7. Se prueba rollback por flag (desactivar → respuesta determinística inmediata).
8. Se revisan logs shadow/assistive sin fugas.
9. Admisiones aprueba knowledge pack y categorías sensibles.
10. Se valida con replay extendido (>15 mensajes, casos edge).
11. algorithmus-wa-console muestra estado y approval workflow.
12. No live sin autorización explícita documentada.
```

**No activar live directamente.** No deploy inmediato. No entrar a `curdeeclau-monorepo`.

---

## 3.10 Handoff hacia algorithmus-wa-console

La futura consola (`whatsapp-saas` → `algorithmus-wa-console`) debería operar:

### 1. Verticales conectados
- Listar verticales (primer vertical: Eva WA / `eva-wa-unilatino`).

### 2. Knowledge version
- Mostrar `knowledgeVersion`, `contentHash`, `generatedAt`, estado de cache.

### 3. Estado CAG (modelo conceptual)
```txt
off                  — sin flags CAG
shadow               — EVA_CAG_SHADOW_LOGGING
assistive_shadow     — EVA_CAG_ASSISTIVE_SHADOW (+ comparison logs)
response_enabled_mock — EVA_CAG_RESPONSE_ENABLED en mock (aún sin injection outbound)
future_live_candidate — solo tras approval; no implementado en 8B
```

### 4. Categorías
- Matriz allowed / partial / blocked con riesgo y human followup.

### 5. Flags visibles (read-only inicialmente)
- `EVA_CAG_SHADOW_LOGGING`
- `EVA_CAG_ASSISTIVE_SHADOW`
- `EVA_CAG_RESPONSE_ENABLED`
- `WA_AGENT_MODE`, `GHL_SYNC_MODE`, `EVA_LLM_ENABLED`, `LLM_MODE`

### 6. Métricas sugeridas
- `assistiveAvailable` count / rate
- `blockedCategory` count (dynamic, personalized, greeting)
- `finalResponseModified` count (**debe ser 0**)
- Log redaction status (PASS/FAIL de tests)
- Replay PASS/FAIL por suite
- CAG useful rate (14/15 baseline piloto)

### 7. Approval workflow knowledge
- Revisión admisiones antes de cambiar cache o activar categorías sensibles.

### 8. Riesgos visibles
- Promociones vigentes, RVOE, revalidación personalizada, knowledge stale.

### 9. Regla de oro
- **Nunca activar live sin autorización explícita** en consola + registro de approval.

---

## 3.11 Contrato conceptual vertical ↔ console

**`wa-agent-unilatino` expone / cuenta con:**

```txt
verticalId: eva-wa-unilatino
tenantId: universidad-latino
knowledgeVersion: eva-unilatino-cag-v1
CAG status (derivado de flags)
allowed / partial / blocked categories
shadow logs (eva_cag_shadow)
assistive comparison metadata (eva_cag_assistive_shadow)
health / test status (suites 8B.x PASS)
contentHash del cache
```

**`algorithmus-wa-console` deberá:**
- leer / mostrar / orquestar flags y métricas;
- **no reemplazar** el cerebro del vertical al inicio;
- conectar inbox, tenants, supervisión cuando el contrato API esté definido.

---

## 3.12 Estado recomendado antes de entrar a console

```txt
No entrar todavía a live CAG.
No activar response injection.
Primero auditar whatsapp-saas como base de algorithmus-wa-console.
Luego diseñar contrato console ↔ vertical.
Luego decidir si la consola solo observa o también controla flags (con approval).
```

Runtime seguro actual (sin cambios):

```txt
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=false
LLM_MODE=off
EVA_CAG_SHADOW_LOGGING=false
EVA_CAG_ASSISTIVE_SHADOW=false
EVA_CAG_RESPONSE_ENABLED=false
```

---

## 3.13 Riesgos y mitigaciones

| Riesgo | Mitigación 8B |
|--------|----------------|
| Promociones vigentes | `promotions_general` partial + human followup; blocked dynamic |
| RVOE incompleto / inventado | Solo RVOE documentado; safeguard `no_invented_rvoe` |
| Revalidación personalizada | Categoría `personalized` blocked |
| Knowledge stale | `contentHash`, rebuild script, approval workflow |
| Logs sensibles | Redaction tests; solo longitudes en assistive shadow |
| Confusión assistive vs respuesta final | `finalResponseModified=false`; outbound determinístico |
| Activación accidental en live | Gates mock + bloqueo live_outbound + default-off |
| Multi-tenant sin aislamiento | Fuera de scope 8B; console futura |
| Console controlando flags sin approval | Approval workflow requerido antes de control |

---

## 3.14 Siguiente fase recomendada

### **CONSOLE-0 — Audit whatsapp-saas for algorithmus-wa-console**

**Objetivo:**

```txt
Clonar/auditar whatsapp-saas.
No forkear todavía.
No modificar todavía.
Identificar:
- stack
- agentes existentes
- reglas
- Supabase
- auth
- inbox
- tenants
- APIs
- puntos de integración con wa-agent-unilatino
- qué se conserva
- qué se reemplaza por InsForge
- ruta para renombrarlo/convertirlo en algorithmus-wa-console
```

**No es parte de 8B.8:** auditoría de código whatsapp-saas (solo se documenta el handoff).

---

## 3.15 Resultados tests (evidencia final 8B)

| Suite | Resultado |
|-------|-----------|
| `run-phase8b1-cag-cache-build.mjs` | 22/22 PASS |
| `run-phase8b1-knowledge-context.mjs` | 142/142 PASS |
| `run-phase8b2-cag-shadow-replay.mjs` | 15/15 PASS |
| `run-phase8b3-cag-router-normalizer-alignment.mjs` | 48/48 PASS |
| `run-phase8b4-handler-cag-shadow-logging.mjs` | 42/42 PASS |
| `run-phase8b5-cag-activation-policy.mjs` | 44/44 PASS |
| `run-phase8b6-cag-assistive-response-prototype.mjs` | 87/87 PASS |
| `run-phase8b6-cag-assistive-replay.mjs` | 15/15 PASS |
| `run-phase8b7-handler-cag-assistive-shadow-comparison.mjs` | 62/62 PASS |
| `run-phase8b7-cag-assistive-handler-replay.mjs` | 15/15 PASS |
| `run-phase8b8-cag-acceptance-console-handoff.mjs` | *(este commit)* |
| `run-phase7g7c7a-pilot-conversation-hotfix.mjs` | 13/13 PASS |
| `run-phase7g7c7b-pilot-conversation-replay.mjs` | 15/15 PASS |

**Métricas piloto consolidadas:**

| Métrica | Valor |
|---------|-------|
| CAG useful (shadow) | 14/15 |
| Assistive available (8B.6/8B.7) | 14/15 |
| `finalResponseModified` | 0/15 |
| `responseText` cambiado por CAG | 0 |

---

## 3.16 Cierre formal línea 8B

**Línea 8B CAG Assistive:** **ACEPTADA** para shadow/mock en `wa-agent-unilatino`.

**Listo para handoff:** contrato conceptual hacia `algorithmus-wa-console`, fase **CONSOLE-0**.

**No listo:** response injection, live CAG, RAG productivo, LLM, multi-tenant console, approval admisiones formal.
