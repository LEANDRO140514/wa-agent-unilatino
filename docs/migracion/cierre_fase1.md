# Cierre Fase 1 — Eva WA (motor determinístico)

**Fecha cierre:** 2026-07-05  
**Documento maestro:** `docs/knowledge/eva_wa_prompt_maestro.md` v2.1  
**Gap analysis:** `docs/migracion/gap_fase1.md`

---

## Resumen

Fase 1 porta reglas de negocio del Prompt Maestro al handler `ycloud-wa-inbound.js` y módulos `lib/*` sin LLM clasificador ni RAG. Los siete ítems (0–6) están implementados, con regresión automatizada en verde.

| Ítem | Entregable | Tests |
|---|---|---|
| 0 | Catálogo SoT §4.1 + guardrail fantasmas | 30/30 |
| 1 | Idempotencia insert-first (ENG-0B) | 23/23 |
| 2 | OPT-OUT / NO_CONTACT (`FF_NO_CONTACT`) | 25/25 |
| 3 | FSM lite (`FF_FSM`) | 39/39 |
| 4 | notOfferedResolver §11.1 (`FF_NOT_OFFERED`) | 44/44 |
| 5 | Fallbacks §12 + memoria (`FF_FALLBACKS`) | 18/18 |
| 6 | EscalationPayload §13 (`FF_ESCALATION_V2`) | 10/10 |
| — | ENG-0B replay idempotencia | 4/4 |
| — | ENG-0C classify + academic_state | 17/17 |

**Total suites Fase 1:** 189 escenarios + 21 ENG = **210 PASS** (última corrida local 2026-07-05).

---

## Deploy checklist (InsForge)

Ejecutar SQL en orden (si no aplicados en el entorno):

1. `insforge/sql/wa_contacts_state_academic_state_rpc.sql` (ENG-0A-bis, si aplica)
2. `insforge/sql/wa_contacts_state_fsm_state.sql` / ítem 2–3 FSM
3. `insforge/sql/wa_contacts_state_fallback_count_fase1_item5.sql`

Desplegar edge function `ycloud-wa-inbound` tras validar dry_run.

Variables de entorno recomendadas:

| Variable | Valor recomendado Fase 1 |
|---|---|
| `GHL_SYNC_MODE` | `dry_run` hasta validación CRM; luego `live` con allowlist |
| `FF_NO_CONTACT` | omitir o `true` |
| `FF_FSM` | omitir o `true` |
| `FF_NOT_OFFERED` | omitir o `true` |
| `FF_FALLBACKS` | omitir o `true` |
| `FF_ESCALATION_V2` | omitir o `true` |
| `ACADEMIC_ENGINE_ENABLED` | según rollout enrichment |
| `EVA_LLM_ENABLED` | `false` en Fase 1 |

---

## Feature flags — rollback rápido

Flags ítems 2–6: **default ON** si la variable no es `"false"`.

| Flag | Efecto al `=false` |
|---|---|
| `FF_NO_CONTACT` | Sin matcher opt-out / sin `NO_CONTACT` FSM |
| `FF_FSM` | Sin transiciones `fsm_state` ni gate HUMANO |
| `FF_NOT_OFFERED` | Pipeline §11.1 desactivado |
| `FF_FALLBACKS` | Sin niveles §12 / D23 |
| `FF_ESCALATION_V2` | Títulos/tags GHL legacy; sin `escalation_reason` en log |

Idempotencia (ítem 1): **always-on**, sin flag.

---

## Ítem 6 — notas operativas

- **Zona dedupe:** `America/Merida` (UTC-6 fijo). Día calendario para `(phone, reason, día)` no usa UTC.
- **Query dedupe:** `wa_ghl_sync_log` con `normalized_phone` y `created_at >= inicio del día Merida`.
- **F5:** contacto ya en `HUMANO` al inicio del turno no recibe nueva task.
- **P6 `wa_no_call`:** `applyNoCallTitle` listo; matcher `lead_no_call` → Fase 2.

---

## Deuda Fase 2

| Área | Contenido |
|---|---|
| Escalación §13 | 9 reasons `wired: false` (pago, urgencia, queja, cita, menor, padre, negociación, RVOE, docs) |
| Clasificador | Paso 0 spec v4.1 / LLM intentId |
| RAG / Fable 5 | Fuera alcance F1 |
| Tests maestro | T07, T08, T13, T17, T22, T23, T24, T27 |
| OPS | Exclusión GHL tag `wa_no_contact` (O5) |

---

## Regresión completa

```bash
node tests/run-phase-fase1-item0-catalog-sot.mjs
node tests/run-phase-fase1-item1-idempotency.mjs
node tests/run-phase-fase1-item2-optout.mjs
node tests/run-phase-fase1-item3-fsm.mjs
node tests/run-phase-fase1-item4-notoffered.mjs
node tests/run-phase-fase1-item5-fallbacks.mjs
node tests/run-phase-fase1-item6-escalation.mjs
node tests/run-phase-eng-0b-idempotency.mjs
node tests/run-phase-eng-0c-classify-intent-replay.mjs
```
