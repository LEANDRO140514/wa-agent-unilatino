# Phase 7G.3 — Rewrite Pilot Mock/Dry_run Report

**Date:** 2026-06-24  
**Status:** **PASS (24/24)** — piloto mock/dry_run  
**Endpoint:** https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound

## Flags (preflight)

| Flag | Valor |
|------|-------|
| mode | mock |
| eva_llm_mode | rewrite |
| eva_llm_provider | openai |
| eva_llm_model | gpt-4o-mini |
| outbound_real | false |
| outbound_status | mocked |
| ghl_live | false |
| ghl_dry_run | true |

## Resumen

- **Total casos:** 24
- **PASS:** 24 | **FAIL:** 0
- **Rewrites aplicados:** 14
- **Bloqueos (block_reason):** 10
- **Calidad good (better_tone + same_quality):** 14/14 (100%)
- **Costo estimado OpenAI:** ~$0.0040 USD (~23 calls × ~630 tokens (estimado))

## block_reasons

- `(none)`: 14
- `blocked_intent`: 8
- `scholarship_blocked`: 1
- `skipped_intent`: 1

## Casos

| ID | Grupo | Input | Intent | Rephrased | block_reason | Calidad | Result |
|---:|---|---|---|:---:|:---:|---|---|
| A1 | carreras_disponibles | 1 | carreras_disponibles | yes | — | same_quality | PASS |
| A2 | carreras_disponibles | Qué carreras tienen | ambiguo | no | blocked_intent | — | PASS |
| A3 | carreras_disponibles | Me puedes decir sus li… | ambiguo | no | blocked_intent | — | PASS |
| A4 | carreras_disponibles | Carreras disponibles | carreras_disponibles | yes | — | same_quality | PASS |
| A5 | carreras_disponibles | Oferta académica | ambiguo | no | blocked_intent | — | PASS |
| B1 | carrera_interes | Derecho online | carrera_interes | yes | — | same_quality | PASS |
| B2 | carrera_interes | Me interesa Psicología | carrera_interes | yes | — | same_quality | PASS |
| B3 | carrera_interes | Tienen Enfermería | carrera_interes | yes | — | same_quality | PASS |
| B4 | carrera_interes | Quiero estudiar Admini… | carrera_interes | yes | — | same_quality | PASS |
| B5 | carrera_interes | Arquitectura presencia… | carrera_interes | yes | — | same_quality | PASS |
| C1 | no_se_que_estudiar | No sé qué estudiar | no_se_que_estudiar | yes | — | same_quality | PASS |
| C2 | no_se_que_estudiar | No sé qué carrera eleg… | no_se_que_estudiar | yes | — | same_quality | PASS |
| C3 | no_se_que_estudiar | Quiero hacer el test | no_se_que_estudiar | yes | — | same_quality | PASS |
| C4 | no_se_que_estudiar | Me puedes orientar | ambiguo | no | blocked_intent | — | PASS |
| C5 | no_se_que_estudiar | Estoy indeciso | no_se_que_estudiar | yes | — | same_quality | PASS |
| D1 | humano | Quiero hablar con ases… | humano | yes | — | same_quality | PASS |
| D2 | humano | Me puede llamar alguie… | ambiguo | no | blocked_intent | — | PASS |
| D3 | humano | Necesito que me atiend… | humano | yes | — | same_quality | PASS |
| D4 | humano | Quiero informes por un… | humano | yes | — | same_quality | PASS |
| E1 | blocked | Tengo promedio 9.8, qu… | beca | no | scholarship_blocked | — | PASS |
| E2 | blocked | Ya hice el test | post_test | no | blocked_intent | — | PASS |
| E3 | blocked | Se trabó el test | duda_test | no | blocked_intent | — | PASS |
| E4 | blocked | (image) | sin_texto | no | skipped_intent | — | PASS |
| E5 | blocked | SHADOW_INVENT_TEST | ambiguo | no | blocked_intent | — | PASS |

## Evaluación de calidad (solo rephrased)

- **better_tone:** 0
- **same_quality:** 14
- **worse:** 0
- **too_short:** 0
- **added_claims:** 0
- **changed_meaning:** 0
- **missing_link:** 0
- **changed_escalation:** 0
- **markdown_or_format_issue:** 0

## Muestras factual vs final

> Cuando `rephrased=true`, `final` = suggested. Cuando bloqueado, `final` = factual (suggested solo en logs).

### A1 — 1

- **Intent:** carreras_disponibles | **Rephrased:** true | **Calidad:** same_quality
- **Final:** Estas son las opciones oficiales de Universidad Latino: Derecho: • Derecho — Presencial • Derecho On…
- **Suggested:** Estas son las opciones oficiales de Universidad Latino: Derecho: • Derecho — Presencial • Derecho On…

### A4 — Carreras disponibles

- **Intent:** carreras_disponibles | **Rephrased:** true | **Calidad:** same_quality
- **Final:** Estas son las opciones oficiales de Universidad Latino: Derecho: • Derecho — Presencial • Derecho On…
- **Suggested:** Estas son las opciones oficiales de Universidad Latino: Derecho: • Derecho — Presencial • Derecho On…

### B1 — Derecho online

- **Intent:** carrera_interes | **Rephrased:** true | **Calidad:** same_quality
- **Final:** Derecho Online • Modalidad: En línea • Duración: 3 años • Mensualidad: $1,980 • Inscripción: $3,600 …
- **Suggested:** Derecho Online • Modalidad: En línea • Duración: 3 años • Mensualidad: $1,980 • Inscripción: $3,600 …

### B2 — Me interesa Psicología

- **Intent:** carrera_interes | **Rephrased:** true | **Calidad:** same_quality
- **Final:** Psicología • Modalidad: Presencial • Duración: 4 años + S.S. • Mensualidad: $4,650 • Inscripción: $8…
- **Suggested:** Psicología • Modalidad: Presencial • Duración: 4 años + S.S. • Mensualidad: $4,650 • Inscripción: $8…

### B3 — Tienen Enfermería

- **Intent:** carrera_interes | **Rephrased:** true | **Calidad:** same_quality
- **Final:** Enfermería • Modalidad: Presencial • Duración: 4 años + S.S. • Mensualidad: $4,650 • Inscripción: $8…
- **Suggested:** Enfermería • Modalidad: Presencial • Duración: 4 años + S.S. • Mensualidad: $4,650 • Inscripción: $8…

### B4 — Quiero estudiar Administración

- **Intent:** carrera_interes | **Rephrased:** true | **Calidad:** same_quality
- **Final:** Administración está disponible en estas opciones: • Sabatina — $3,960/mes | Inscripción $3,600 | 3 a…
- **Suggested:** Administración está disponible en estas opciones: • Sabatina — $3,960/mes | Inscripción $3,600 | 3 a…

### B5 — Arquitectura presencial

- **Intent:** carrera_interes | **Rephrased:** true | **Calidad:** same_quality
- **Final:** Carreras en modalidad Presencial: • Derecho — $4,650/mes | Inscripción $8,000 • Psicología — $4,650/…
- **Suggested:** Carreras en modalidad Presencial: • Derecho — $4,650/mes | Inscripción $8,000 • Psicología — $4,650/…

### C1 — No sé qué estudiar

- **Intent:** no_se_que_estudiar | **Rephrased:** true | **Calidad:** same_quality
- **Final:** No te preocupes, para eso tenemos nuestro test vocacional 😊 Te ayuda a identificar qué carreras pue…
- **Suggested:** No te preocupes, para eso tenemos nuestro test vocacional 😊 Te ayuda a identificar qué carreras pue…

### C2 — No sé qué carrera elegir

- **Intent:** no_se_que_estudiar | **Rephrased:** true | **Calidad:** same_quality
- **Final:** No te preocupes, para eso tenemos nuestro test vocacional 😊 Te ayuda a identificar qué carreras pue…
- **Suggested:** No te preocupes, para eso tenemos nuestro test vocacional 😊 Te ayuda a identificar qué carreras pue…

### C3 — Quiero hacer el test

- **Intent:** no_se_que_estudiar | **Rephrased:** true | **Calidad:** same_quality
- **Final:** No te preocupes, para eso tenemos nuestro test vocacional 😊 Te ayuda a identificar qué carreras pue…
- **Suggested:** No te preocupes, para eso tenemos nuestro test vocacional 😊 Te ayuda a identificar qué carreras pue…

### C5 — Estoy indeciso

- **Intent:** no_se_que_estudiar | **Rephrased:** true | **Calidad:** same_quality
- **Final:** No te preocupes, para eso tenemos nuestro test vocacional 😊 Te ayuda a identificar qué carreras pue…
- **Suggested:** No te preocupes, para eso tenemos nuestro test vocacional 😊 Te ayuda a identificar qué carreras pue…

### D1 — Quiero hablar con asesor

- **Intent:** humano | **Rephrased:** true | **Calidad:** same_quality
- **Final:** Claro 😊 Te voy a canalizar con un asesor académico para continuar tu proceso por WhatsApp. En breve…
- **Suggested:** Claro 😊 Te voy a canalizar con un asesor académico para continuar tu proceso por WhatsApp. En breve…

## Hallazgos del clasificador

Mensajes del grupo A/C/D que caen en `ambiguo` (rewrite bloqueado por diseño):
- `A2` "Qué carreras tienen" → ambiguo (considerar ampliar menú/clasificador en fase futura, no en 7G.3)
- `A3` "Me puedes decir sus licenciaturas" → ambiguo (considerar ampliar menú/clasificador en fase futura, no en 7G.3)
- `A5` "Oferta académica" → ambiguo (considerar ampliar menú/clasificador en fase futura, no en 7G.3)
- `C4` "Me puedes orientar" → ambiguo (considerar ampliar menú/clasificador en fase futura, no en 7G.3)
- `D2` "Me puede llamar alguien" → ambiguo (considerar ampliar menú/clasificador en fase futura, no en 7G.3)

## Criterios de aprobación

- HTTP 200 + mock/dry_run: OK
- 0 rewrite en beca/post_test/duda_test/sin_texto/ambiguo: OK
- 0 added_claims/changed_meaning en finales rephrased: OK
- ≥80% better_tone/same_quality: OK

## Confirmaciones de seguridad

- WhatsApp real: **NO** (`outbound_real=false`, `outbound_status=mocked`)
- GHL live: **NO** (`ghl_live=false`, `ghl_dry_run=true`)
- Rewrite en beca/post_test/duda_test/sin_texto/ambiguo: **0 casos**
- `wa_errors` críticos LLM/outbound: **0** (solo `phone_normalization_failed` en payloads de prueba)
- Logs `wa_llm_shadow_log` con `mode=rewrite` en DB: **69** total (incluye 7G.2 + piloto)

## Propuestas de ajuste (no aplicadas en 7G.3)

1. **Clasificador WA:** 5 mensajes “reales” caen en `ambiguo` sin rewrite — ampliar `detectMenuOption` / frases en fase futura (fuera de scope 7G.3).
2. **Prompts:** El modelo es muy conservador (14/14 `same_quality`); si se desea más `better_tone`, subir ligeramente `temperature` o reforzar instrucciones de calidez sin relajar guardrails.
3. **Arquitectura:** Carrera fantasma en catálogo; `Arquitectura presencial` devuelve listado presencial genérico — documentar en FAQ, no tocar academic-engine en esta fase.
4. **Guardrails:** Sin cambios urgentes; `SHADOW_INVENT_TEST` sigue bloqueado correctamente con warnings.

## Errores

- Ninguno

## Recomendación

**Candidato a 7G.4 `live_outbound` controlado** — solo con autorización explícita de Leandro.

Condiciones sugeridas para 7G.4:
- Mantener `GHL_SYNC_MODE=dry_run` en primer sub-paso
- Mantener allowlist actual (sin beca/post_test)
- Números de prueba acotados (1–2 contactos)
- Monitorear `wa_llm_shadow_log` + `wa_errors` en las primeras 24h

Si no hay autorización para live: **mantener rewrite en mock/dry_run**; el piloto ya validó seguridad y consistencia.

## SQL (logs InsForge)

```sql
SELECT count(*)::int FROM wa_llm_shadow_log WHERE mode = 'rewrite';
SELECT wa_intent, eva_llm_rephrased, block_reason, left(final_response,60)
FROM wa_llm_shadow_log WHERE mode = 'rewrite' ORDER BY created_at DESC LIMIT 24;
```