# ENG-0D — Fix carreras_disponibles phrase + duration follow-up via academic_state

**Date:** 2026-07-03  
**Phase:** ENG-0D  
**Base commit:** `2e92894` (post ENG-0C publish)  
**Mode:** local fixes + mock validation — **sin deploy**

---

## 1. Problemas corregidos

| ID | Problema | Fix |
|----|----------|-----|
| **B7** | `"Quiero ver carreras"` → `fallback_inteligente` | Patrones añadidos en `matchesCarrerasDisponibles()` |
| **D3** | `"¿Y cuánto dura?"` ignoraba `academic_state.current_career` | `pregunta_duracion` + resolución de carrera desde state en academic-engine |

---

## 2. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `insforge/functions/ycloud-wa-inbound.js` | Patrones B7 en `matchesCarrerasDisponibles` |
| `insforge/functions/lib/academic-engine/entityExtractor.js` | Flag `pregunta_duracion` |
| `insforge/functions/lib/academic-engine/intentEngine.js` | Follow-up duración/costo con `current_career` / `last_career` |
| `insforge/functions/lib/academic-engine/responseBuilder.js` | Duración desde state; clarificación si no hay carrera |
| `tests/run-phase-eng-0c-classify-intent-replay.mjs` | Modo local mock (`PHASE_ENG0C_LOCAL=1`) para validar sin deploy |

**Creado:** `docs/phase-eng-0d-classify-duration-fix-report.md`

---

## 3. Cambios en classifyIntent (B7)

Nuevos patrones en `matchesCarrerasDisponibles()`:

```txt
quiero ver carreras
ver carreras
quiero conocer las carreras
quiero conocer carreras
carreras disponibles
```

**No rompe** (validado en replay): `Me interesa Derecho online`, `No sé qué estudiar`, beca, humano, duda_test.

**Fix B7:** **PASS** (local mock)

---

## 4. Cambios en academic_state / duration follow-up (D3)

### entityExtractor

`pregunta_duracion` detecta:

```txt
cuanto dura / cuánto dura
cuantos años / cuántos años
duracion / duración
dura + cuanto/tiempo
```

### intentEngine

- `careerFromContext()` usa `entities.careerName || state.current_career || state.last_career`
- Si `pregunta_duracion` + carrera en contexto → `career_detail`
- Si `pregunta_duracion` sin carrera → `faq` con mensaje de clarificación
- Cost follow-up con carrera en state → `career_detail` (mejora alineada con D2)

### responseBuilder

- `renderCareerDetail` resuelve carrera desde `academic_state` cuando el turno no la repite
- Respuesta focalizada duración: `{nombre}\n• Duración: {duration}\n• Modalidad: …`
- Sin carrera: `"¿De qué carrera te gustaría saber la duración?"`

**Fix D3:** **PASS** (local mock, secuencia D1→D2→D3)

---

## 5. Resultado ENG-0C replay

```powershell
$env:PHASE_ENG0C_LOCAL="1"
node tests/run-phase-eng-0c-classify-intent-replay.mjs
```

| Resultado | Valor |
|-----------|-------|
| **ENG-0C replay (local mock)** | **17/17 PASS** |
| Multi-turn academic_state | **PASS** |
| Idempotencia + classifyIntent | **PASS** |

**Nota:** Replay remoto (sin deploy) sigue en **15/17** hasta OPS deploy del handler. Validación ENG-0D usa handler local con mock DB.

---

## 6. Resultado ENG-0B idempotency

```
ENG-0B: 4/4 PASS (mock DB)
```

Sin regresión en idempotencia.

---

## 7. Resultado smoke 7C

```
Phase 7C smoke: 10/10 PASS
```

Runtime remoto sin cambios (pre-deploy ENG-0D) — flags seguros intactos.

---

## 8. Flags seguros

| Flag | Valor |
|------|-------|
| mode | mock |
| ghl_sync_mode | dry_run |
| outbound_real | false |
| ghl_live | false |
| custom_fields_written | false |
| academic_engine_enabled | true |
| eva_llm_enabled | false |

---

## 9. wa_errors recientes

Consulta remota últimos 30 min: **10 entradas** `phone_normalization_failed` — causadas por teléfonos de prueba alfanuméricos en replay remoto ENG-0C anterior (`RUN_ID` con letras). Runner corregido a `RUN_NUM` solo dígitos. No relacionadas con fixes B7/D3.

---

## 10. Riesgos pendientes

1. **Deploy pendiente:** fixes B7/D3 solo en repo local; InsForge remoto aún sin ENG-0D.
2. **Replay remoto:** ejecutar `PHASE_ENG0C_REMOTE=1 node tests/run-phase-eng-0c-classify-intent-replay.mjs` post-deploy; esperado 17/17.
3. **Duración sin carrera:** responde clarificación (no inventa datos) — comportamiento esperado.
4. **Bundle deploy:** regenerar con `scripts/bundle-ycloud-wa-deploy.mjs` en OPS siguiente.

---

## 11. Recomendación commit/push

| Acción | Recomendación |
|--------|---------------|
| **Commit** | Sí — handler + academic-engine + runner local mode + reporte ENG-0D |
| **Mensaje sugerido** | `fix(eva): carreras list phrases and duration follow-up from academic state` |
| **Push** | Tras aprobación |
| **Siguiente fase** | **OPS-0D** — deploy controlado ENG-0D + replay remoto 17/17 |

---

## Resumen ejecutivo

| Item | Resultado |
|------|-----------|
| Fix B7 | **PASS** |
| Fix D3 | **PASS** |
| ENG-0C local | **17/17 PASS** |
| ENG-0B | **4/4 PASS** |
| Smoke 7C | **10/10 PASS** |
| Deploy | **No ejecutado** |
