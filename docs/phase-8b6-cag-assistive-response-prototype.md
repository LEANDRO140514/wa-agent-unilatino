# Phase 8B.6 — CAG Assistive Response Prototype (Mock Only)

**Estado:** PASS (prototipo mock — sin activación productiva)  
**Fecha:** 2026-06-24  
**Commit base:** `2af173e` — `docs: add cag activation decision criteria`  
**Repo:** `wa-agent-unilatino`

---

## Contexto

Fase **8B.6** implementa un prototipo **mock-only** de respuesta asistida por CAG. El módulo puede generar una **propuesta** de respuesta asistida para categorías permitidas, pero **no modifica** la respuesta enviada al usuario (`finalResponseModified` siempre `false`).

Compara en tests:

1. Respuesta determinística actual  
2. Contexto CAG (categoría / cache)  
3. Respuesta asistida propuesta  
4. Decisión implícita: usar / no usar / requiere humano / dinámica (solo observación)

**Política fuente de verdad:** `docs/phase-8b5-cag-decision-report-activation-criteria.md` + `tests/run-phase8b5-cag-activation-policy.mjs`

---

## Objetivo

Permitir comparar respuesta determinística vs propuesta CAG asistida en **mock/tests** sin:

- Activación productiva  
- Live WhatsApp / GHL  
- LLM  
- RAG productivo  
- Writes InsForge  
- Cambio de outbound real  

---

## Qué se creó

| Archivo | Rol |
|---------|-----|
| `insforge/functions/lib/knowledge/cagAssistiveResponse.js` | Builder assistive mock-only |
| `tests/run-phase8b6-cag-assistive-response-prototype.mjs` | Gates, allowlist, blocked, secrets |
| `tests/run-phase8b6-cag-assistive-replay.mjs` | Replay 15 mensajes piloto |
| `docs/phase-8b6-cag-assistive-response-prototype.md` | Este reporte |

**No se modificó** `insforge/functions/ycloud-wa-inbound.js`.

---

## Flag propuesto: `EVA_CAG_RESPONSE_ENABLED`

| Valor | Comportamiento |
|-------|----------------|
| *(ausente)* | Desactivado |
| `false` | Desactivado |
| cualquier otro | Desactivado |
| `true` (exacto) | Candidato a assistive **solo si** pasan todos los gates |

Default: **false** (no activo en runtime productivo 8B.6).

---

## Gates de seguridad (`isCagAssistiveResponseEnabled`)

Retorna `true` solo si **todas** se cumplen:

```txt
EVA_CAG_RESPONSE_ENABLED === "true"
WA_AGENT_MODE === "mock"
EVA_LLM_ENABLED !== "true"
LLM_MODE === "off" o vacío
GHL_SYNC_MODE !== "live"
```

Bloqueado explícitamente en 8B.6:

```txt
WA_AGENT_MODE=live | live_outbound
EVA_LLM_ENABLED=true
LLM_MODE=rewrite (u otro distinto de off/vacío)
GHL_SYNC_MODE=live
```

---

## Allowlist de categorías (mock)

**Permitidas (respuesta assistive completa):**

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

**Parcial:**

```txt
promotions_general
```

- Puede generar respuesta assistive con becas/descuentos oficiales  
- Debe incluir safeguard `human_followup_required`  
- No afirmar promoción vigente ni “hoy”  

**Bloqueadas siempre:**

```txt
dynamic
personalized
missing_cache
unknown_or_greeting
```

---

## Políticas por categoría (determinísticas, sin LLM)

| Categoría | Regla assistive |
|-----------|-----------------|
| `location` | Dirección oficial + horario + Maps; sin asesor/visita/task |
| `rvoe` | RVOE según programa; no inventar; documento legal → asesor |
| `online_programs` | Solo 3 carreras online validadas + precios oficiales |
| `not_offered` | Medicina no ofertada; alternativas Salud oficiales |
| `non_primary_levels` | Prepa/posgrados existen; detalle → admisiones |
| `revalidation_general` | Proceso sí; caso por caso; sin contar materias |
| `scholarships` | Tabla becas excelencia; sujeto a admisiones |
| `price_objection` | Reconocer objeción; becas según promedio; sin beca exacta |
| `programs` | Catálogo oficial; NI con costos si aplica |
| `promotions_general` | Becas oficiales; vigentes → admisiones |

---

## Resultado del builder

```js
{
  enabled: boolean,
  mode: "assistive_mock" | "disabled" | "blocked",
  category: string | null,
  shouldUseAssistiveResponse: boolean,
  deterministicResponse: string,
  assistiveResponse: string,
  reason: string,
  risks: string[],
  safeguards: string[],
  finalResponseModified: false  // siempre en 8B.6
}
```

---

## Resultados tests

### `run-phase8b6-cag-assistive-response-prototype.mjs`

- Gate off / flag missing  
- Flag on + mock: categorías allowed  
- `promotions_general` partial + human followup  
- `dynamic` / `personalized` blocked  
- Live / GHL live / LLM on blocked  
- Sin secrets ni contexto bruto en `assistiveResponse`  

### `run-phase8b6-cag-assistive-replay.mjs` (15 mensajes)

| # | Mensaje | CAG | Assistive |
|---|---------|-----|-----------|
| 1–10, 12–15 | Piloto 8B.2/8B.3 | Categoría esperada | `shouldUse=true`, texto no vacío |
| 11 | `hola` | `unknown_or_greeting` | `blocked`, `shouldUse=false` |

- **14/14** casos allowed/partial producen `assistiveResponse`  
- **1/1** `hola` blocked  
- **`finalResponseModified=false` en 15/15**

---

## Confirmaciones de restricciones

| Restricción | Estado |
|-------------|--------|
| `finalResponseModified=false` siempre | ✅ |
| Sin cambio en handler (`ycloud-wa-inbound.js`) | ✅ |
| Sin live / deploy | ✅ |
| Sin LLM (`EVA_LLM_ENABLED` sin cambio) | ✅ |
| Sin RAG productivo / embeddings | ✅ |
| Sin InsForge writes | ✅ |
| Sin secrets en assistive | ✅ |
| Sin cambio flags reales InsForge | ✅ |

---

## Riesgos identificados

1. **Divergencia texto assistive vs determinístico** — esperado en prototipo; 8B.7 comparará en shadow handler.  
2. **`promotions_general`** — riesgo alto si se activara sin human followup.  
3. **`revalidation_general`** — no prometer equivalencias; deterministic ya escala humano.  
4. **Flag futuro** — `EVA_CAG_RESPONSE_ENABLED=true` debe permanecer default-off hasta 8B.7+.

---

## Siguiente fase recomendada

**8B.7 — CAG assistive handler shadow comparison mock only**

Integrar comparación determinístico vs assistive en el handler con logging shadow (similar a 8B.4), sin modificar `responseText` enviado.

Si aparece riesgo de fuga o gate bypass en revisión:

**8B.6-HARDEN — assistive response safety hardening**

---

## Runtime seguro (sin cambios)

```txt
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=false
LLM_MODE=off
EVA_CAG_RESPONSE_ENABLED=false  (propuesto, default-off)
```
