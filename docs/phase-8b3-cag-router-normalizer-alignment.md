# Phase 8B.3 — CAG Router + Eva Normalizer Alignment

**Estado:** PASS  
**Fecha:** 2026-06-27  
**Commit base:** `efbc1af` — `test: add eva cag shadow replay`  
**Repo:** `wa-agent-unilatino`

---

## Contexto 8B.1 / 8B.2

| Fase | Entregable |
|------|------------|
| 8B.1 | Knowledge pack estático, cache CAG, `getKnowledgeContext` |
| 8B.2 | `cagShadowEvaluator`, replay shadow 15 mensajes, sin cambiar respuestas |

**Métricas 8B.2 (antes):**

| Métrica | Valor |
|---------|-------|
| CAG useful | 11/15 |
| CAG NONE correcto | 4/15 |
| finalResponseModified | 0/15 |

**Gaps detectados:**

1. `en que unicacion estan?` — intent determinístico OK, CAG NONE (typo no normalizado en router).
2. `esta cara no?` — objeción precio OK, CAG NONE (frase coloquial no matcheaba).
3. `que promociones tienen?` — correctamente humano, pero router bloqueaba CAG general de becas.

---

## Decisión técnica

**Opción A parcial:** import seguro de `applyTypoCorrections` desde `eva-text-normalizer.js`.

**Opción B:** helper dedicado `cagQueryNormalizer.js` con:

- `normalizeCagQuery()` — typos Eva + lowercasing + NFD
- `classifyCagQuery()` — categorías CAG/NONE determinísticas

**Razón:** evitar import circular con `ycloud-wa-inbound.js` y mantener router CAG aislado, reutilizando solo el módulo de typos ya compartido.

**No se modificó:** `ycloud-wa-inbound.js`, flags, secrets, InsForge.

---

## Archivos creados / modificados

| Archivo | Acción |
|---------|--------|
| `insforge/functions/lib/knowledge/cagQueryNormalizer.js` | **Creado** |
| `insforge/functions/lib/knowledge/getKnowledgeContext.js` | **Actualizado** — category, reason, normalizedQuery |
| `insforge/functions/lib/knowledge/cagShadowEvaluator.js` | **Actualizado** — recommendations por category |
| `tests/run-phase8b1-knowledge-context.mjs` | **Actualizado** — casos 8B.3 |
| `tests/run-phase8b2-cag-shadow-replay.mjs` | **Actualizado** — expectativas post-alignment |
| `tests/run-phase8b3-cag-router-normalizer-alignment.mjs` | **Creado** |
| `docs/phase-8b3-cag-router-normalizer-alignment.md` | **Creado** |

---

## Tabla de categorías CAG

| category | mode | Ejemplo query |
|----------|------|---------------|
| `location` | CAG | `en que unicacion estan?`, `ubicasion?` |
| `price_objection` | CAG | `esta cara no?`, `se me hace caro` |
| `scholarships` | CAG | `tienen descuento?`, `becas` |
| `promotions_general` | CAG | `que promociones tienen?` |
| `revalidation_general` | CAG | `Tienen revalidación?` |
| `rvoe` | CAG | `reconocimiento oficial` |
| `online_programs` | CAG | `carreras online?` |
| `not_offered` | CAG | `medicida tienen?` |
| `non_primary_levels` | CAG | `tienen maestrias?` |
| `programs` | CAG | `negocios internacionales` |
| `dynamic` | NONE | `promoción de hoy?`, `descuento vigente este mes` |
| `personalized` | NONE | `revalidar 8 materias`, `beca exacta` |
| `unknown_or_greeting` | NONE | `hola` |

---

## Política promociones

| Tipo | Router | Shadow recommendation |
|------|--------|----------------------|
| **General** (`que promociones tienen?`) | CAG `promotions_general` | `useful_with_human_followup` — becas/descuentos oficiales; vigentes requieren asesor |
| **Vigente/dinámica** (`promoción de hoy?`) | NONE `dynamic` | `requires_dynamic` |

---

## Shadow evaluator — recommendations

| Valor | Cuándo |
|-------|--------|
| `useful` | CAG location, price_objection, scholarships, etc. |
| `useful_with_human_followup` | promotions_general, revalidation_general + intent humano |
| `requires_dynamic` | category dynamic |
| `requires_human` | category personalized |
| `not_applicable` | greeting / menú |
| `missing_cache` | sin cache |

Siempre: `finalResponseModified = false`.

---

## Métricas antes / después (replay piloto)

| Métrica | 8B.2 | 8B.3 |
|---------|------|------|
| CAG useful (+ followup) | 11/15 | **14/15** |
| CAG NONE | 4/15 | **1/15** (solo `hola`) |
| Shadow replay PASS | 15/15 | **15/15** |
| finalResponseModified | 0/15 | **0/15** |

**Cambios clave en replay:**

| Msg | 8B.2 | 8B.3 |
|-----|------|------|
| 5 `esta cara no?` | NONE | **CAG / price_objection** |
| 7 `unicacion` typo | NONE | **CAG / location** |
| 11 `hola` | NONE not_needed | **NONE not_applicable** |
| 13 `promociones` | NONE requires_human | **CAG promotions_general + useful_with_human_followup** |

---

## Resultados tests

| Suite | Resultado |
|-------|-----------|
| `run-phase8b1-cag-cache-build.mjs` | 22/22 PASS |
| `run-phase8b1-knowledge-context.mjs` | 142/142 PASS |
| `run-phase8b2-cag-shadow-replay.mjs` | 15/15 PASS |
| `run-phase8b3-cag-router-normalizer-alignment.mjs` | 48/48 PASS |
| `run-phase7g7c7a-pilot-conversation-hotfix.mjs` | 13/13 PASS |
| `run-phase7g7c7b-pilot-conversation-replay.mjs` | 15/15 PASS |

---

## Confirmaciones

| Restricción | Estado |
|-------------|--------|
| Respuesta final no modificada | ✅ 15/15 |
| `ycloud-wa-inbound.js` | ✅ No modificado |
| LLM off | ✅ |
| RAG productivo off | ✅ Comentario en módulos |
| Live / deploy | ✅ No |
| InsForge writes | ✅ No |
| Secrets | ✅ No tocados |

---

## Riesgos

1. **Duplicación parcial de matchers** entre `cagQueryNormalizer` e intent engine — mantener sincronizados en fases futuras o extraer matchers compartidos.
2. **promotions_general** puede confundirse con dynamic si no se evalúan patrones vigentes antes.
3. **responseChangeRisk** sigue alto en ubicación/promociones/revalidación al integrar CAG productivamente.

---

## Recomendación siguiente

**8B.4 — Optional handler shadow logging (mock only)**

- Log estructurado de `evaluateCagShadow` en handler mock/dry_run
- Comparación side-by-side en replay extendido
- Sin inyectar CAG en respuesta al usuario
- Sin LLM/RAG/live

---

**Fase 8B.3: PASS**
