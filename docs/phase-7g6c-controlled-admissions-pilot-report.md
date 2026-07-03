# 7G.6C — Piloto humano admisiones controlado (reporte)

**Date:** 2026-07-03  
**Phase:** 7G.6C — Piloto humano admisiones controlado  
**Base commit:** `906c5bb` (post VAL-0 push)  
**Runtime deployado:** ENG-0D (`2dabd21`)  
**Endpoint:** https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound  
**Run NUM 7G.6C:** `08105509`

---

## 1. Preflight

| Check | Resultado |
|-------|-----------|
| Git branch | `main` |
| HEAD | `906c5bb` |
| origin/main | `906c5bb` (HEAD = origin) |
| Working tree | Clean except 7G.6C deliverables untracked (sin commit por diseño) |
| Endpoint | `ycloud-wa-inbound` active |

---

## 2. Flags remotos confirmados

Preflight probe + todas las conversaciones 7G.6C:

| Flag | Valor | OK |
|------|-------|:--:|
| `WA_AGENT_MODE` / `mode` | `mock` | ✅ |
| `GHL_SYNC_MODE` / `ghl_sync_mode` | `dry_run` | ✅ |
| `GHL_WRITE_CUSTOM_FIELDS` / `custom_fields_written` | `false` | ✅ |
| `ACADEMIC_ENGINE_ENABLED` | `true` | ✅ |
| `EVA_LLM_ENABLED` | `false` | ✅ |
| `outbound_real` | `false` | ✅ |
| `ghl_live` | `false` | ✅ |

**No se activó live** — sin autorización explícita de Leandro.

---

## 3. Checklist creado

| Entregable | Estado |
|------------|--------|
| `docs/phase-7g6c-controlled-admissions-pilot-checklist.md` | ✅ Creado |

Incluye: objetivo, responsables, allowlist redactada, horario, casos permitidos/prohibidos, PASS/FAIL, rollback, monitoreo, activación controlada.

---

## 4. Guion creado

| Entregable | Estado |
|------------|--------|
| `docs/phase-7g6c-admissions-operator-script.md` | ✅ Creado |

Incluye: qué enviar, qué revisar en GHL, identificar lead Eva WA, humano/asesor, qué NO hacer, reporte de incidencias.

Documento previo `phase-7g6c-admissions-test-script.md` permanece como referencia histórica.

---

## 5. Runner / payloads

| Archivo | Estado |
|---------|--------|
| `tests/run-phase-7g6c-controlled-admissions-pilot.mjs` | ✅ Creado |
| `tests/payloads/phase-7g6c-controlled-admissions-pilot.json` | ✅ Creado |
| Evidencia | `tests/.phase-7g6c-controlled-admissions-pilot-results.json` |

---

## 6. Resultados por caso (7G.6C)

| # | Caso | Teléfono test | Resultado |
|---|------|---------------|-----------|
| 1 | Lead frío | `+525508102001` | **PASS** — Hola → menú; carreras list |
| 2 | Carrera específica | `+525508102002` | **PASS** — Derecho online enriquecido |
| 3 | Costo + duración multi-turn | `+525508102003` | **PASS** — costo + duración (3 años) |
| 4 | Beca | `+525508102004` | **PASS** — 50% tramo 9.3 |
| 5 | Humano / asesor | `+525508102005` | **PASS** — `wa_needs_human=true`, task dry_run |
| 6 | Documentos | `+525508102006` | **PASS** — `documents`, "Documentos para inscripción" |
| 7 | Idempotencia | `+525508102007` | **PASS** — replay skipped/idempotent |

**7G.6C total: 7/7 PASS**

---

## 7. Validación humano/asesor

Conversación 5:

- `intent=humano`
- `wa_needs_human=true`
- `ghl_would_create_task=true` (shadow/dry_run)
- `ghl_sync_mode=dry_run`
- `ghl_live=false`, `outbound_real=false`
- Respuesta incluye canalización a asesor

---

## 8. Validación GHL dry_run

Todas las conversaciones confirmaron:

- `ghl_sync_mode=dry_run`
- `ghl_live=false`
- `custom_fields_written=false`
- Task shadow en humano (`ghl_would_create_task=true`) sin escritura live

---

## 9. Validación idempotencia

Conversación 7: `7g6c-idem-001-08105509`

- Primer evento: `no_se_que_estudiar`, procesado
- Replay: `skipped=true`, `idempotent=true`, `reason=duplicate_ycloud_message_id`

---

## 10. Validación academic_state

Conversación 3 (costo + duración):

| Turno | Input | Academic enriched | Resultado |
|-------|-------|-------------------|-----------|
| T1 | Me interesa Derecho online | true | Derecho Online context |
| T2 | Cuanto cuesta? | true | Precios |
| T3 | Y cuanto dura? | true | Duración 3 años |

**Multi-turn academic_state:** **PASS**

---

## 11. Smoke 7C

| Suite | Resultado |
|-------|-----------|
| Smoke 7C | **10/10 PASS** |

---

## 12. Regresiones VAL-0 / ENG-0C / ENG-0B

| Suite | Resultado |
|-------|-----------|
| VAL-0 | **7/7 PASS** |
| ENG-0C replay remoto | **17/17 PASS** |
| ENG-0B idempotency (mock) | **4/4 PASS** |

---

## 13. wa_errors recientes

| Ventana | Tipo | Count |
|---------|------|------:|
| Últimos 30 min | `phone_normalization_failed` | 19 (histórico fixtures replay) |
| Últimos 30 min | **Críticos** (excl. normalization) | **0** |

Runners 7G.6C/VAL-0 usaron teléfonos numéricos válidos; sin errores críticos nuevos.

---

## 14. Riesgos pendientes

1. **Sesión live con admisiones** — requiere autorización Leandro + allowlist 3 E.164 + rollback plan §8 checklist.
2. **wa_errors históricos** `phone_normalization_failed` — limpieza opcional, no bloqueante.
3. **7G.6C deliverables sin commit** — por instrucción de fase; commit/push pendiente de aprobación posterior.
4. **Smoke 7C** regenera reporte 7C — revertir antes de cualquier commit futuro.

---

## 15. Recomendación

| Item | Recomendación |
|------|---------------|
| **Listo para piloto real con admisiones (modo seguro)** | **Sí** — runner 7G.6C + VAL-0 + regresiones PASS en mock/dry_run |
| **Listo para activar live WA + GHL** | **No** — requiere sesión autorizada por Leandro, checklist §10, supervisión técnica |
| **Commit/push 7G.6C** | **Corrección previa no requerida** — artefactos listos; commit cuando Leandro apruebe |

---

## Resumen ejecutivo

| Item | Resultado |
|------|-----------|
| 7G.6C conversaciones | **7/7 PASS** |
| VAL-0 | **7/7 PASS** |
| ENG-0C | **17/17 PASS** |
| ENG-0B | **4/4 PASS** |
| Smoke 7C | **10/10 PASS** |
| Flags seguros | **Confirmados** |
| wa_errors críticos (30 min) | **0** |
| Modo live | **No activado** |
