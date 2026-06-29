# Phase 8B.2 — CAG Shadow Integration + Eva WA Replay

**Estado:** PASS  
**Fecha:** 2026-06-27  
**Commit base:** `4132fdb` — `feat: add eva knowledge onboarding cag scaffold`  
**Repo:** `wa-agent-unilatino`

---

## Contexto

8B.1 dejó el knowledge pack estático, metadata, cache CAG y `getKnowledgeContext` aislado.  
8B.2 integra **evaluación shadow** que compara la respuesta determinística actual vs contexto CAG disponible, **sin modificar la respuesta final** ni activar LLM/RAG/live.

---

## Objetivo

Para cada mensaje del replay piloto (7G.7C.7-B):

1. Obtener intent + respuesta determinística (mock/dry_run)
2. Evaluar CAG/NONE vía `getKnowledgeContext`
3. Emitir recomendación shadow (`useful`, `not_needed`, `requires_human`, etc.)
4. Confirmar que la respuesta al usuario **no cambia**

---

## Arquitectura shadow

```
Mensaje usuario
    │
    ├─► ycloud-wa-inbound (classify + enrich) ──► respuesta determinística (sin cambios)
    │
    └─► cagShadowEvaluator.evaluateCagShadow()
            │
            └─► getKnowledgeContext() ──► cache eva-cache-v1.json
                    │
                    ├─ CAG  → contextPreview + recommendation: useful
                    └─ NONE → recommendation: not_needed | requires_human | requires_dynamic
```

**Principios:**

- Shadow-only: evaluador usado en tests/replay, no en handler productivo
- RAG desactivado (comentario explícito en módulos 8B.1/8B.2)
- Sin LLM, APIs externas, InsForge, GHL tasks nuevas por CAG
- `finalResponseModified: false` en todos los pasos

---

## Archivos creados / modificados

| Archivo | Acción |
|---------|--------|
| `insforge/functions/lib/knowledge/cagShadowEvaluator.js` | **Creado** — evaluador shadow |
| `tests/run-phase8b2-cag-shadow-replay.mjs` | **Creado** — replay 15 mensajes |
| `tests/.phase8b2-cag-shadow-replay-results.json` | **Generado** — resultados JSON |
| `docs/phase-8b2-cag-shadow-replay.md` | **Creado** — este reporte |
| `docs/knowledge/cache/eva-cache-v1.json` | **Regenerado** (solo `generatedAt`; mismo `contentHash`) |
| `insforge/functions/ycloud-wa-inbound.js` | **No modificado** |
| `getKnowledgeContext.js` | **No modificado** |

---

## Tabla mensaje por mensaje

| # | Mensaje | Intent | Det. | CAG | Recommendation | CAG útil | Resp. sin cambio |
|---|---------|--------|------|-----|----------------|----------|------------------|
| 1 | Tienen revalidación de estudios? | revalidacion_estudios | PASS | CAG | useful | ✅ | ✅ |
| 2 | tienen maestrias? | niveles_no_principales | PASS | CAG | useful | ✅ | ✅ |
| 3 | veo que tienen preparatoria | niveles_no_principales | PASS | CAG | useful | ✅ | ✅ |
| 4 | negocios internacionales, dudas | fallback_inteligente | PASS | CAG | useful | ✅ | ✅ |
| 5 | esta cara no? | objecion_precio | PASS | NONE | not_needed | — | ✅ |
| 6 | tienen descuento? | beca | PASS | CAG | useful | ✅ | ✅ |
| 7 | en que unicacion estan? | ubicacion_campus | PASS | NONE | not_needed | — | ✅ |
| 8 | Ubicacion? | ubicacion_campus | PASS | CAG | useful | ✅ | ✅ |
| 9 | reconocida y acreditada | rvoe_reconocimiento | PASS | CAG | useful | ✅ | ✅ |
| 10 | reconocimiento oficial? | rvoe_reconocimiento | PASS | CAG | useful | ✅ | ✅ |
| 11 | hola | ambiguo | PASS | NONE | not_needed | — | ✅ |
| 12 | reconocimiento oficial? | rvoe_reconocimiento | PASS | CAG | useful | ✅ | ✅ |
| 13 | que promociones tienen? | promociones_descuentos | PASS | NONE | requires_human | — | ✅ |
| 14 | carreras online? | carreras_online | PASS | CAG | useful | ✅ | ✅ |
| 15 | medicida tienen? | carrera_no_ofertada | PASS | CAG | useful | ✅ | ✅ |

**Shadow replay:** 15 PASS / 0 WARN / 0 FAIL  
**CAG useful:** 11/15 | **CAG NONE:** 4/15

---

## Casos donde CAG aporta

- Revalidación **general** (msg 1) — contexto estático alineado; escalamiento humano se mantiene
- Preparatoria / posgrados / maestrías (msg 2–3)
- Negocios Internacionales + costos/RVOE (msg 4)
- Becas / descuentos tabulados (msg 6)
- Ubicación campus (msg 8)
- RVOE / reconocimiento (msg 9–10, 12)
- Carreras online (msg 14)
- Medicina no ofertada + alternativas salud (msg 15)

---

## Casos donde CAG no debe intervenir (NONE correcto)

| Msg | Razón |
|-----|-------|
| 5 | Objeción coloquial "esta cara" — router no matchea; respuesta determinística ya cubre becas |
| 7 | Typo `unicacion` — router CAG no normaliza; intent engine sí (eva-text-normalizer) |
| 11 | Saludo inicial — menú suficiente, CAG innecesario |
| 13 | Promociones vigentes — requiere humano; router evita CAG estático |

Validación adicional (8B.1 router, no en replay):  
`me pueden revalidar 8 materias?` → NONE / requires_human ✅

---

## Confirmaciones

| Restricción | Estado |
|-------------|--------|
| Respuesta final no modificada | ✅ 15/15 `response_unchanged: true` |
| LLM off | ✅ `evaLlmEnabled: false`, `LLM_MODE=off` |
| RAG off | ✅ Sin implementación RAG |
| Live / deploy | ✅ No |
| InsForge writes | ✅ No |
| Secrets | ✅ No tocados |
| `ycloud-wa-inbound.js` | ✅ No modificado |

---

## Resultado tests

| Suite | Resultado |
|-------|-----------|
| `run-phase8b1-cag-cache-build.mjs` | 22/22 PASS |
| `run-phase8b1-knowledge-context.mjs` | 52/52 PASS |
| `run-phase8b2-cag-shadow-replay.mjs` | 15/15 PASS |
| `run-phase7g7c7a-pilot-conversation-hotfix.mjs` | 13/13 PASS |
| `run-phase7g7c7b-pilot-conversation-replay.mjs` | 15/15 PASS |

---

## Riesgos

1. **Router CAG vs normalizer Eva:** typos (`unicacion`) y frases coloquiales (`esta cara`) no activan CAG aunque el intent engine responde bien — unificar normalización en 8B.3.
2. **responseChangeRisk en revalidación/ubicación:** inyectar CAG en futuro no debe quitar escalamiento humano ni reglas ubicación (sin asesor/visita).
3. **Doble source-of-truth:** academic-engine + CAG cache pueden divergir si no se sincronizan en integración productiva.
4. **Promociones generales:** router devuelve NONE; deterministic ya orienta a becas + asesor — correcto pero conviene documentar en router explícitamente.

---

## Recomendación siguiente

**8B.3 — CAG router alignment + optional handler shadow logging**

- Compartir normalización de typos entre intent engine y `isQuerySuitableForCAG`
- Patrones para objeción de precio coloquial
- Log shadow opcional en handler (mock only, sin cambiar respuesta)
- Validar con replay ampliado + casos personalizados explícitos

---

**Fase 8B.2: PASS**
