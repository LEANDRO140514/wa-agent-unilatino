# VAL-0 — Piloto admisiones en modo seguro

**Date:** 2026-07-03  
**Phase:** VAL-0  
**Base commit:** `0c36c29` (post OPS-0D report)  
**Runtime deployado:** ENG-0D (`2dabd21`)  
**Endpoint:** https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound  
**Run NUM:** `07527760`

---

## 1. Objetivo

Validar piloto de admisiones **sin activar live**, contra el runtime remoto ya deployado (mock/dry_run), confirmando:

- Flujo conversacional realista (lead frío → carrera → costos/duración)
- Respuestas académicas desde source-of-truth
- Becas, humano/asesor, documentos, test vocacional
- Multi-turn `academic_state`
- Idempotencia
- Sin alucinación ni modo live

---

## 2. Preflight

| Check | Resultado |
|-------|-----------|
| Git | `main`, HEAD = origin = `0c36c29`, tree clean |
| Endpoint | `ycloud-wa-inbound` active |
| Preflight flags | **OK** — mock / dry_run |

| Flag | Valor |
|------|-------|
| `mode` | `mock` |
| `ghl_sync_mode` | `dry_run` |
| `outbound_real` | `false` |
| `ghl_live` | `false` |
| `custom_fields_written` | `false` |
| `academic_engine_enabled` | `true` |
| `eva_llm_enabled` | `false` |

---

## 3. Conversaciones probadas

| # | Nombre | Turnos | Teléfono test |
|---|--------|-------:|---------------|
| 1 | Lead frío / menú | 3 | `+525507521001` |
| 2 | Costos + duración | 3 | `+525507521002` |
| 3 | Beca | 1 | `+525507521003` |
| 4 | No sabe qué estudiar | 1 | `+525507521004` |
| 5 | Humano / asesor | 1 | `+525507521005` |
| 6 | Requisitos/documentos | 1 | `+525507521006` |
| 7 | Idempotencia | replay | `+525507521007` |

**Runner:** `tests/run-phase-val-0-admissions-pilot-safe.mjs`  
**Payloads:** `tests/payloads/phase-val-0-admissions-pilot-safe.json`  
**Evidencia:** `tests/.phase-val-0-admissions-pilot-results.json`

---

## 4. Resultados por conversación

| Conv | Resultado | Highlights |
|------|-----------|------------|
| **1** | **PASS** | Hola → menú ambiguo; carreras list; Derecho Online enriquecido |
| **2** | **PASS** | Costo y duración (3 años) desde `academic_state` |
| **3** | **PASS** | Beca 50% tramo 9.3; sin claims prohibidos |
| **4** | **PASS** | `no_se_que_estudiar` → test vocacional; sin listado carreras |
| **5** | **PASS** | `humano`, `wa_needs_human=true`, task dry_run, GHL no live |
| **6** | **PASS** | `academic_intent=documents`, "Documentos para inscripción" |
| **7** | **PASS** | Replay `skipped/idempotent`, mismo `inbound_id` |

**VAL-0 total: 7/7 PASS**

---

## 5. Validación multi-turn academic_state

Conversación 2 (turnos costo + duración):

| Turno | Input | Academic enriched | Respuesta clave |
|-------|-------|-----------------|-----------------|
| T1 | Me interesa Derecho online | true | Derecho Online, $1,980/mes |
| T2 | Cuanto cuesta? | true | Precios Derecho Online |
| T3 | Y cuanto dura? | true | **Duración: 3 años** |

**Multi-turn academic_state:** **PASS**

---

## 6. Validación becas

Conversación 3: promedio 9.3 → tramo Sobresaliente, **50% colegiaturas**, mensaje de validación admisiones. Sin datos inventados (NASA, 7 países, etc.).

---

## 7. Validación humano/asesor dry_run

Conversación 5:

- `intent=humano`
- `wa_needs_human=true`
- `ghl_would_create_task=true` (shadow/dry_run)
- `ghl_live=false`
- Respuesta incluye canalización a asesor

---

## 8. Validación idempotencia

Conversación 7: `val0-idem-001-{RUN_NUM}`

- Primer evento: `no_se_que_estudiar`, procesado
- Replay: `skipped=true`, `idempotent=true`, `reason=duplicate_ycloud_message_id`

---

## 9. Regresiones ENG-0C / ENG-0B / Smoke 7C

| Suite | Resultado |
|-------|-----------|
| ENG-0C replay remoto | **17/17 PASS** |
| ENG-0B idempotency (mock) | **4/4 PASS** |
| Smoke 7C | **10/10 PASS** |

---

## 10. Flags seguros confirmados

Todas las conversaciones y regresiones confirmaron:

```
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=false
outbound_real=false
ghl_live=false
custom_fields_written=false
```

---

## 11. wa_errors recientes

| Ventana | Resultado |
|---------|-----------|
| Últimos 5 min (no normalization) | **0 errores críticos** |
| Últimos 30 min | 38× `phone_normalization_failed` — fixtures históricos replay anterior (no crítico) |

VAL-0 usó teléfonos numéricos válidos; sin errores nuevos en la sesión.

---

## 12. Riesgos pendientes

1. **Piloto humano real (7G.6C)** — requiere allowlist GHL live; fuera de scope VAL-0.
2. **wa_errors históricos** `phone_normalization_failed` — limpieza opcional.
3. **Smoke 7C** regenera reporte 7C — revertir antes de commit si no se desea.

---

## 13. Recomendación de siguiente fase

| Acción | Recomendación |
|--------|---------------|
| **Commit** | Sí — runner VAL-0 + payloads + este reporte |
| **Mensaje sugerido** | `test(eva): add val 0 admissions pilot safe runner and report` |
| **Push** | Tras aprobación |
| **Siguiente fase** | **7G.6C piloto humano con admisiones** (allowlist + sesión guiada) o **Fase 1** (response_source + gating) según roadmap |

---

## Resumen ejecutivo

| Item | Resultado |
|------|-----------|
| VAL-0 conversaciones | **7/7 PASS** |
| Multi-turn academic_state | **PASS** |
| Idempotencia piloto | **PASS** |
| ENG-0C remoto | **17/17 PASS** |
| ENG-0B | **4/4 PASS** |
| Smoke 7C | **10/10 PASS** |
| Modo live | **No activado** |
