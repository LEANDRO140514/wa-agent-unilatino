# ENG-0C — Replay 7G.7C.7-B + classifyIntent regression

**Date:** 2026-07-03  
**Phase:** ENG-0C  
**Base commit:** `9e60b68` (post OPS-0C)  
**Endpoint:** https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound  
**Run ID:** `mr5be0hw`  
**Mode:** mock / dry_run (sin live)

---

## 1. Objetivo

Validar que los cambios recientes (ENG-0A-bis `academic_state`, ENG-0B idempotencia, `shouldShowAmbiguoMenu`) no hayan roto la lógica conversacional del handler:

- `classifyIntent`
- `fallback_inteligente` / menú ambiguo
- `academic_state` multi-turn
- Idempotencia por `ycloud_message_id`
- Academic-engine enrichment

Fase de **regresión segura** — sin deploy, sin live, sin commit.

---

## 2. Casos probados

| Grupo | Casos | Descripción |
|-------|------:|-------------|
| A | 5 | Menú / ambiguo / fallback |
| B | 5 | Intents core |
| C | 3 | Carrera específica / academic-engine |
| D | 3 | Multi-turn `academic_state` (mismo teléfono) |
| E | 1 | Idempotencia + `classifyIntent` |
| **Total** | **17** | |

**Runner:** `tests/run-phase-eng-0c-classify-intent-replay.mjs`  
**Payloads:** `tests/payloads/phase-eng-0c-classify-intent-replay.json`  
**Evidencia JSON:** `tests/.phase-eng-0c-replay-results.json`

Teléfonos únicos por run (`RUN_ID`) para evitar contaminación de `wa_contacts_state`.

---

## 3. Resultados replay

**Resumen:** **15/17 PASS**

| Grupo | Resultado | Detalle |
|-------|-----------|---------|
| A | **5/5 PASS** | Menú ambiguo en primer saludo; fallback en casos específicos |
| B | **4/5 PASS** | **B7 FAIL** — ver §9 |
| C | **3/3 PASS** | Carreras reales enriquecidas; sin fantasmas |
| D | **2/3 PASS** | **D3 FAIL** — ver §9 |
| E | **1/1 PASS** | Idempotencia no interfiere con intent |

### Grupo A — Menú / ambiguo / fallback

| ID | Input | WA intent | Result |
|----|-------|-----------|--------|
| A1 | Hola | ambiguo | PASS (menú mostrado) |
| A2 | Info | ambiguo | PASS |
| A3 | ¿Tienen meses sin intereses? | fallback_inteligente | PASS |
| A4 | ¿Cuál es su WhatsApp? | fallback_inteligente | PASS |
| A5 | Gracias | agradecimiento | PASS |

`shouldShowAmbiguoMenu`: OK en contacto nuevo (A1/A2 → menú numerado).

### Grupo B — Intents core

| ID | Input | Esperado | Observado | Result |
|----|-------|----------|-----------|--------|
| B6 | No sé qué estudiar | no_se_que_estudiar | no_se_que_estudiar | PASS |
| B7 | Quiero ver carreras | carreras_disponibles | fallback_inteligente | **FAIL** |
| B8 | Tengo promedio 9.3… | beca | beca | PASS |
| B9 | Quiero hablar con un asesor | humano | humano | PASS |
| B10 | Se trabó el test | duda_test | duda_test | PASS |

### Grupo C — Carrera / academic-engine

| ID | Input | WA intent | Academic | Result |
|----|-------|-----------|----------|--------|
| C11 | Me interesa Derecho online | carrera_interes | career_detail | PASS |
| C12 | Enfermería presencial | carrera_interes | career_detail | PASS |
| C13 | Psicología sabatina | carrera_interes | enriched | PASS |

---

## 4. Multi-turn academic_state

Teléfono: `+52555e0hw8000` (único por run)

| Turno | Input | WA intent | Academic enriched | Result |
|-------|-------|-----------|-------------------|--------|
| D1 | Me interesa Derecho online | carrera_interes | true | PASS |
| D2 | ¿Cuánto cuesta? | fallback_inteligente | true (costos) | PASS |
| D3 | ¿Y cuánto dura? | fallback_inteligente | **false** | **FAIL** |

**D3 observado:** respuesta genérica tipo “¡Hola de nuevo!…” sin duración (años/semestres).

**Estado DB post-D2:** `academic_state` sí persiste (`current_career: Derecho Online`, `current_modality: en_linea`) — la memoria escribe, pero el academic-engine no enriquece la pregunta de duración en turno 3.

**Multi-turn academic_state:** **FAIL** (falla en follow-up de duración).

---

## 5. Idempotencia + classifyIntent

Teléfono: `+52555e0hw8001`  
Message ID: `eng0c-idem-001-mr5be0hw`

| Evento | Resultado |
|--------|-----------|
| Primer POST | `ok=true`, `intent=no_se_que_estudiar`, `skipped=false` |
| Replay exacto | `ok=true`, `skipped=true`, `idempotent=true`, `reason=duplicate_ycloud_message_id`, mismo `inbound_id` |

**Idempotencia + classifyIntent:** **PASS**

---

## 6. Smoke 7C

```
Phase 7C smoke: 10/10 PASS
```

| Flag | Valor |
|------|-------|
| outbound_real | false |
| ghl_live | false |
| custom_fields_written | false |
| eva_llm_enabled | false |
| academic_engine_enabled | true |

---

## 7. Flags seguros confirmados

Preflight y todos los casos replay confirmaron runtime en:

```
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=false
outbound_real=false
ghl_live=false
```

---

## 8. wa_errors recientes

Consulta InsForge `wa_errors` últimos 30 min: **0 errores**.

---

## 9. Riesgos pendientes / hallazgos

### P1 — B7: “Quiero ver carreras” no matchea `carreras_disponibles`

`matchesCarrerasDisponibles()` no incluye variantes “quiero ver carreras”. Caída a `fallback_inteligente`.  
**Fix sugerido:** ampliar patrones en `classifyIntent` (ENG-0C hardening o fase posterior).

### P1 — D3: follow-up “¿Y cuánto dura?” sin enrichment

Tras D1+D2 con contexto de Derecho Online, turno 3 no obtiene `academic_enriched=true` ni duración documentada.  
**Fix sugerido:** academic-engine — resolver `duration` desde `academic_state.current_career`.

### P2 — message_id fijo en tests repetidos

`eng0c-idem-001` sin sufijo de run falla en re-ejecuciones (idempotencia remota). Runner usa `${message_id}-${RUN_ID}`.

### P3 — Teléfonos fijos reutilizados

Runs anteriores con `+52555999XXXX` contaminaban `wa_contacts_state`. Runner corregido con `RUN_ID` único.

---

## 10. Recomendación de commit/push

| Archivo | Acción recomendada |
|---------|-------------------|
| `tests/run-phase-eng-0c-classify-intent-replay.mjs` | Commit — runner ENG-0C |
| `tests/payloads/phase-eng-0c-classify-intent-replay.json` | Commit — fixtures |
| `docs/phase-eng-0c-classify-intent-replay-report.md` | Commit — este reporte |
| `tests/.phase-eng-0c-replay-results.json` | No commit (artefacto local) |
| `docs/phase-7c-insforge-controlled-deploy-report.md` | Revertir si smoke lo regenera |

**Mensaje sugerido:** `test(eva): add eng-0c classifyIntent replay runner and report`

**Siguiente trabajo:** corregir B7 + D3 antes de piloto admisiones; opcional re-ejecutar `run-phase7g7c7b-pilot-conversation-replay.mjs` local como regresión adicional.

---

## Resumen ejecutivo

| Item | Resultado |
|------|-----------|
| Replay ENG-0C | **15/17 PASS** |
| Multi-turn academic_state | **FAIL** (D3 duración) |
| Idempotencia + classifyIntent | **PASS** |
| Smoke 7C | **10/10 PASS** |
| Deploy / live | **No ejecutado** |
