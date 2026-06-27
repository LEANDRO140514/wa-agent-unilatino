# 7G.7C.7-A — Pilot conversation coverage hotfix

**Estado:** ✅ **IMPLEMENTADO** (local) — sin deploy, sin secrets, sin live  
**Fecha:** 2026-06-26  
**Base:** commit `d2e7cca` (7G.7C.6-D/E cerrados, runtime seguro)

---

## 1. Contexto del piloto 7G.7C.6-E

Eva funcionó técnicamente (36/36 inbound-outbound, 0 críticos), pero falló en **cobertura conversacional**:

| Problema piloto | Síntoma |
|-----------------|---------|
| Fallback menú | Repetía menú 1–4 ante preguntas concretas |
| Revalidación | No reconocida |
| Maestrías/posgrados | No reconocidos |
| Preparatoria | Confundida con lista de licenciaturas |
| Objeción precio | "está cara" → menú |
| Typo `unicacion` | No interpretado como ubicación |
| RVOE / reconocimiento | No respondido |
| Promociones | Escalaba sin orientar becas oficiales |
| `medicida` | No manejado como medicina no ofertada |

---

## 2. Objetivo 7G.7C.7-A

Hotfix **determinístico** (sin LLM):

1. Prompt/guardrails documentados
2. Nuevos intents WA + respuestas modelo
3. Normalización de typos
4. Fallback inteligente (sin menú en preguntas concretas)
5. Tags GHL dry_run
6. Tests con mensajes reales del piloto

---

## 3. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `insforge/functions/ycloud-wa-inbound.js` | Intents, respuestas, clasificador, fallback, tags GHL |
| `insforge/functions/lib/eva-text-normalizer.js` | **Nuevo** — correcciones typo determinísticas |
| `insforge/functions/lib/academic-engine/adapter.js` | Enrich `carreras_online`, `fallback_inteligente`; bloquear intents con respuesta WA fija |
| `insforge/functions/lib/academic-engine/intentEngine.js` | `carreras online` → `modality_filter` |
| `prompts/eva-wa-principal.md` | **Nuevo** — prompt principal documentado |
| `tests/run-phase7g7c7a-pilot-conversation-hotfix.mjs` | **Nuevo** — 13 casos piloto |

**No modificados:** secrets, flags InsForge, deploy bundle, EVA Test, calculadora, Meta Ads.

---

## 4. Intents nuevos / reforzados

| Intent | Triggers clave |
|--------|----------------|
| `revalidacion_estudios` | revalidación, equivalencias, kardex, traslado… |
| `niveles_no_principales` | preparatoria, maestría, posgrado, doctorado… |
| `ubicacion_campus` | ubicación, dirección, campus, `unicacion`… |
| `rvoe_reconocimiento` | RVOE, reconocimiento, acreditación, SEP |
| `objecion_precio` | caro, cara, no me alcanza… (+ contexto carrera) |
| `promociones_descuentos` | promoción, ofertas vigentes |
| `carrera_no_ofertada` | medicina, medicida, médico, doctor |
| `carreras_online` | carreras online/en línea (enriquecido academic) |
| `fallback_inteligente` | default no vago (reemplaza menú en ambiguo) |
| `ambiguo` | solo saludos vagos (`hola`, `info`, etc.) |

---

## 5. Fallback

| Antes | Después |
|-------|---------|
| Todo no clasificado → menú 1–4 | Saludo vago → menú |
| | Pregunta concreta no clasificada → fallback inteligente |
| | Academic-engine puede enriquecer `fallback_inteligente` si detecta intent factual |

**Texto fallback:**

> Con gusto te ayudo 😊 ¿Me preguntas por carreras, becas, ubicación, costos, revalidación o quieres hablar con un asesor?

---

## 6. Typos soportados

`unicacion`→ubicación, `ubicasion`→ubicación, `medicida`→medicina, `maestrias`→maestría, `uiversidad`→universidad, `revalidacion`, `acreditacion`, `promocion`, `convalidacion`, `posgrado`/`postgrado`.

Archivo: `lib/eva-text-normalizer.js` — aplicado en `classifyIntent()` antes de matching.

---

## 7. GHL tags (dry_run)

`getIntentTags()` retorna tags múltiples por intent:

- `wa_revalidacion`, `wa_requiere_asesor`
- `wa_nivel_no_principal`, `wa_preparatoria`, `wa_posgrado`
- `wa_ubicacion` (solo en `ubicacion_campus`; sin `wa_interes_visita` ni `wa_requiere_asesor` en esa respuesta)
- `wa_rvoe`, `wa_objecion_precio`, `wa_interes_beca`
- `wa_interes_promocion`, `wa_carrera_no_ofertada`, `wa_salud`

Validado en tests locales vía `handler.getIntentTags()`.

---

## 8. Tests ejecutados

| Suite | Resultado |
|-------|-----------|
| `tests/run-phase7g7c7a-pilot-conversation-hotfix.mjs` | **13/13 PASS** |
| `tests/run-phase7g6d-conversation-hotfix.mjs` (regresión) | **4/4 PASS** |

### Casos piloto cubiertos

1. Revalidación de estudios  
2. Maestrías  
3. Preparatoria vista  
4. Objeción precio post-carrera  
5. Ubicación typo `unicacion`  
6. Reconocida y acreditada  
7. Reconocimiento oficial  
8. Promociones  
9. Medicida  
10. Carreras online (academic enriched)  
11. Ubicación simple  
12. Hola (menú permitido)  
13. Fallback inteligente  

**No ejecutado:** `run-phase7g3a-classifier-hotfix.mjs` (remote; requiere LLM on para rewrite — fuera de scope con LLM off).

---

## 9. Confirmaciones de restricciones

| Control | Estado |
|---------|--------|
| WA live | ❌ no |
| GHL live | ❌ no |
| Secrets / flags | ❌ no tocados |
| Deploy InsForge | ❌ no |
| LLM | ❌ off (sin cambio) |
| Meta Ads | ❌ no |
| Borrado datos | ❌ no |
| EVA Test / calculadora | ❌ no |

**Runtime esperado sin cambio:**

```txt
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=false
LLM_MODE=off
```

---

## 10. Riesgos restantes

1. **Contexto carrera multi-turno:** `objecion_precio` usa `wa_stage`/`wa_last_intent` en `wa_contacts_state`; no hay `wa_last_career` persistido — seguimiento fino depende de stage.
2. **RVOE por carrera en contexto:** respuesta general implementada; RVOE específico requiere carrera en el mismo mensaje o enriquecimiento academic.
3. **Deploy pendiente:** cambios solo en repo local hasta bundle + deploy autorizado.
4. **7G.3A remote:** puede fallar con LLM off (esperado).

---

## 11. Recomendación siguiente

1. **7G.7C.7-B** — bundle + deploy controlado a InsForge (mock/dry_run), smoke remoto con runner 7G.7C.7-A adaptado a endpoint.
2. Re-ejecutar `run-phase7g6d` + `run-phase7g7c31` post-deploy.
3. Retrospectiva admisiones GHL UI (pendiente de 7G.7C.6-E).
4. Evaluar persistir `wa_last_career` en `wa_contacts_state` para objeciones/RVOE multi-turno.

---

## 12. Working tree (post-implementación, pre-commit)

Cambios productivos locales **sin commit** (según instrucción 7G.7C.7-A).

---

*Documento interno — Universidad Latino / Eva WA — Fase 7G.7C.7-A*
