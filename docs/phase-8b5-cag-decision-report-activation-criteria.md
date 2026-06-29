# Phase 8B.5 — CAG Decision Report + Activation Criteria

**Estado:** PASS (decisión documental — sin activación CAG)  
**Fecha:** 2026-06-27  
**Commit base:** `8e0bec2` — `feat: add mock cag shadow logging to handler`  
**Repo:** `wa-agent-unilatino`

---

## 3.1 Resumen ejecutivo

- **CAG está listo para continuar en modo shadow** (observación, logging, replay, métricas).
- **CAG todavía NO debe activarse para modificar respuestas** al usuario en esta fase ni en producción sin aprobación explícita.
- La **siguiente activación** debe ser **controlada, por categorías**, con **flag nuevo default-off** (`EVA_CAG_RESPONSE_ENABLED=false`), solo mock primero, sin LLM/RAG/live.

**Decisión 8B.5:** APROBAR continuar a fase **8B.6 — CAG assistive response prototype mock only** bajo los criterios de esta matriz. No activar en InsForge ni en live hasta cumplir gates y aprobación admisiones.

---

## 3.2 Estado técnico actual

| Fase | Entregable | Rol |
|------|------------|-----|
| **8B.1** | Knowledge pack estático, `eva-cache-v1.json`, `getKnowledgeContext` | Scaffold + cache versionado |
| **8B.2** | `cagShadowEvaluator`, replay 15 mensajes piloto | Comparar determinístico vs CAG sin cambiar respuesta |
| **8B.3** | `cagQueryNormalizer`, router alineado con `eva-text-normalizer` | Typos WhatsApp + categorías CAG/NONE |
| **8B.4** | `cagShadowLogging.js`, hook en handler `default-off` | Diagnóstico mock-only en handler real |

**Runtime actual:** respuesta final = `enrichedDecision.responseText` (determinístico + academic-engine). CAG no se inyecta al usuario.

---

## 3.3 Métricas actuales (evidencia 8B.1–8B.4)

| Métrica / suite | Resultado |
|-----------------|-----------|
| CAG useful (replay piloto) | **14/15** |
| CAG NONE correcto | **1/15** (`hola` → menú) |
| `finalResponseModified` | **0/15** |
| `run-phase8b1-cag-cache-build.mjs` | 22/22 PASS |
| `run-phase8b1-knowledge-context.mjs` | 142/142 PASS |
| `run-phase8b2-cag-shadow-replay.mjs` | 15/15 PASS |
| `run-phase8b3-cag-router-normalizer-alignment.mjs` | 48/48 PASS |
| `run-phase8b4-handler-cag-shadow-logging.mjs` | 42/42 PASS |
| `run-phase7g7c7a-pilot-conversation-hotfix.mjs` | 13/13 PASS |
| `run-phase7g7c7b-pilot-conversation-replay.mjs` | 15/15 PASS |

**Gates shadow handler (8B.4):** `EVA_CAG_SHADOW_LOGGING=true` + `WA_AGENT_MODE=mock` + LLM off. Bloqueado en `live_outbound` y LLM on.

---

## 3.4 Matriz de categorías CAG

| Categoría | Descripción | Ejemplos | Modo actual | Riesgo | Candidata activación | Condición |
|-----------|-------------|----------|-------------|--------|----------------------|-----------|
| `location` | Campus y dirección oficial | `ubicacion?`, `unicacion` | CAG shadow | Medio (asesor/visita) | **Sí** | Static cache; sin task/asesor |
| `price_objection` | Objeción coloquial de precio | `esta cara no?` | CAG shadow | Medio (prometer beca) | **Sí** | Solo tabla becas oficial |
| `scholarships` | Becas/descuentos generales | `tienen becas?` | CAG shadow | Medio | **Sí** | No beca exacta personalizada |
| `promotions_general` | Promociones sin vigencia | `que promociones tienen?` | CAG + human followup | Alto | **Parcial** | Becas oficiales + asesor vigentes |
| `rvoe` | Reconocimiento oficial | `reconocimiento oficial?` | CAG shadow | Medio (RVOE inventado) | **Sí** | Solo RVOE documentado |
| `programs` | Carreras/costos catálogo | `negocios internacionales` | CAG shadow | Medio | **Sí** | source-of-truth only |
| `online_programs` | Modalidad en línea | `carreras online?` | CAG shadow | Bajo | **Sí** | Lista oficial online |
| `revalidation_general` | Proceso general | `Tienen revalidación?` | CAG shadow | Alto (prometer materias) | **Sí** | General + escalamiento humano |
| `non_primary_levels` | Prepa/posgrados | `tienen maestrias?` | CAG shadow | Medio | **Sí** | Existencia; detalle → asesor |
| `not_offered` | Carrera no ofertada | `medicida?` | CAG shadow | Bajo | **Sí** | Alternativas salud oficiales |
| `faqs` | FAQs institucionales | menú, test vocacional | CAG shadow | Bajo | **Sí** | FAQs autorizadas |
| `dynamic` | Vigente/cupo/fecha | `promoción de hoy?` | NONE | Alto | **No** | Requiere validación dinámica |
| `personalized` | Caso individual | `revalidar 8 materias` | NONE | Alto | **No** | Revisión académica humana |
| `unknown_or_greeting` | Saludo/vago | `hola` | NONE | Bajo | **No** | Menú determinístico suficiente |
| `missing_cache` | Sin cache | — | NONE | Alto | **No** | Rebuild + aprobación |

---

## 3.5 Categorías candidatas a activación futura (bajo riesgo)

Candidatas de **bajo/medio riesgo controlado:**

```txt
location
rvoe
online_programs
not_offered
non_primary_levels
revalidation_general
scholarships
price_objection
programs
faqs
```

**Condiciones obligatorias (todas):**

```txt
source = cache
knowledgeVersion = eva-unilatino-cag-v1
confidence = static
category en allowlist EVA_CAG_RESPONSE_ALLOWED_CATEGORIES
finalResponseModified test = false antes de activar
respuesta determinística no degradada en replay
sin LLM (EVA_LLM_ENABLED=false, LLM_MODE=off)
sin RAG productivo
sin live hasta fase autorizada explícitamente
WA_AGENT_MODE=mock en primera activación
EVA_CAG_RESPONSE_ENABLED=true (flag futuro, default false hoy)
```

---

## 3.6 Categorías NO candidatas todavía

```txt
dynamic
personalized
missing_cache
unknown_or_greeting
promoción vigente específica
cupo actual
beca exacta personalizada
revisión documental
equivalencias de materias específicas
casos legales/acreditación no documentada
```

**Razón:** requieren validación humana, datos dinámicos o documentación oficial no presente en cache estático.

---

## 3.7 Política de promociones

| Tipo | Política CAG |
|------|----------------|
| **Generales** (`que promociones tienen?`) | CAG puede usar becas/descuentos oficiales; `useful_with_human_followup`; **no** afirmar promoción vigente |
| **Vigentes** (`promoción de hoy?`) | NONE / `dynamic` / `requires_dynamic` o asesor; **nunca** respuesta definitiva desde cache |

---

## 3.8 Política de revalidación

| Tipo | Política |
|------|----------|
| **General** | CAG puede indicar que existe proceso de revalidación institucional |
| **Específica** (`cuántas materias`, `mi kardex`) | NONE / `personalized`; escalar a revisión académica; no resolver equivalencias |

---

## 3.9 Política de objeción de precio

- CAG puede aportar contexto de **becas/descuentos oficiales** (tabla excelencia).
- **No** prometer beca exacta.
- **No** inventar promoción.
- **No** modificar costos validados en source-of-truth.

---

## 3.10 Política de ubicación

- CAG puede aportar ubicación oficial (dirección, horario, Maps).
- **No** disparar asesor.
- **No** ofrecer visita.
- **No** crear task.
- **No** marcar `wa_requiere_asesor`.
- Solo tag `wa_ubicacion` (comportamiento determinístico actual).

---

## 3.11 Gates requeridos para futura activación (propuesta — no implementados en 8B.5)

```txt
EVA_CAG_RESPONSE_ENABLED=false          # default; rollback = false
EVA_CAG_RESPONSE_ALLOWED_CATEGORIES=location,rvoe,online_programs,not_offered
EVA_CAG_RESPONSE_MODE=assistive         # no replace; enrich/compare only en 8B.6
```

**Reglas:**

| Regla | Valor |
|-------|-------|
| Default | `false` |
| Primera activación | Solo `WA_AGENT_MODE=mock` |
| Live | No sin autorización explícita |
| LLM / RAG | Prohibidos |
| GHL tasks/tags/custom fields | Sin cambio por CAG |
| Rollback | `EVA_CAG_RESPONSE_ENABLED=false` |

**Shadow logging existente (8B.4):** `EVA_CAG_SHADOW_LOGGING` permanece separado; observación continúa aunque response esté off.

---

## 3.12 Matriz de riesgo

| Riesgo | Mitigación |
|--------|------------|
| Sobre-respuesta con info no aprobada | `allowed categories`, admissions approval, static only |
| Promociones obsoletas | `dynamic` bloqueado; human followup en `promotions_general` |
| RVOE incompleto | Solo RVOE en source-of-truth; escalar si no documentado |
| Revalidación personalizada mal respondida | `personalized` bloqueado |
| Logs con datos sensibles | Redacción 8B.4; no context completo |
| Confusión CAG support vs respuesta final | `assistive` mode; tests `finalResponseModified` |
| Cache stale | `contentHash` + rebuild script; invalidación explícita |
| knowledgeVersion sin aprobar admisiones | `metadata.validation.requiresAdmissionsApproval` |

---

## 3.13 Criterios mínimos antes de activación futura

```txt
☑ 100% PASS en suites 8B.1–8B.5 (incl. policy test)
☑ 0 finalResponseModified no esperado en replay
☑ 0 leaks en logs shadow (context completo, teléfono, secrets)
☑ knowledge pack aprobado por admisiones (metadata.approvedBy)
☑ categorías permitidas documentadas en allowlist
☑ rollback por flag probado (EVA_CAG_RESPONSE_ENABLED=false)
☑ handler shadow en mock estable (8B.4)
☐ EVA_CAG_RESPONSE_ENABLED implementado (fase 8B.6+)
☐ Prototype assistive mock sin degradar 7G.7C.7 replay
```

---

## 3.14 Plan de fase siguiente

### Recomendación principal (aprobada por 8B.5)

**8B.6 — CAG assistive response prototype mock only**

- Implementar `EVA_CAG_RESPONSE_ENABLED` (default false) en código mock.
- Modo `assistive`: comparar/enriquecer lado a lado sin reemplazar `responseText` al usuario en primera iteración.
- Replay ampliado por categoría allowlist.
- Sin deploy/live/LLM/RAG.

### Alternativa conservadora (si surge riesgo en 8B.6)

**8B.5-HARDEN — log redaction and category gate hardening**

- Reforzar redacción de logs.
- Tests adicionales de categorías límite.
- Sin prototipo de respuesta aún.

---

## Archivos creados en 8B.5

| Archivo | Acción |
|---------|--------|
| `docs/phase-8b5-cag-decision-report-activation-criteria.md` | Creado |
| `tests/run-phase8b5-cag-activation-policy.mjs` | Creado |

**No modificado:** `ycloud-wa-inbound.js`, flags InsForge, secrets, runtime live.

---

## Confirmaciones 8B.5

| Restricción | Estado |
|-------------|--------|
| Activación CAG respuesta | **No** — solo decisión documental |
| Handler modificado | **No** |
| LLM / RAG productivo | Off / no integrado |
| Live / deploy / InsForge writes | No |
| Commit | No (por instrucción) |

---

**Fase 8B.5: PASS — decisión documental lista para revisión humana**
