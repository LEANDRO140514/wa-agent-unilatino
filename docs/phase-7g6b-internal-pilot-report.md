# Phase 7G.6B — Piloto interno ampliado (3 teléfonos)

**Estado:** ✅ **COMPLETADO** — 3 testers, flujo E2E validado; rollback pendiente confirmación final  
**Fecha:** 2026-06-24  
**Ventana piloto:** ~22:34–22:41 UTC  
**Checkpoint base:** `5e6b268` (7G.6A)

---

## Resumen ejecutivo

| Pregunta | Resultado |
|----------|-----------|
| WA live temporal | **Sí** (`live_outbound`) |
| GHL live temporal | **Sí** |
| CF `wa_*` temporal | **Sí** |
| Testers | **3/3** |
| Mensajes piloto (ventana core) | **13** |
| Recepción visual WhatsApp | **Sí** — los 3 confirmaron respuesta |
| Outbound `accepted` | **13/13** |
| GHL sync `ok` + CF | **13/13** |
| Contactos GHL únicos | **3** (sin duplicados) |
| CF fuera whitelist | **No** |
| `wa_errors` críticos | **0** |
| Meta Ads | **No** |

---

## Teléfonos autorizados

| Tester | E.164 | Contacto GHL | Acción GHL |
|--------|-------|--------------|------------|
| Leandro | `+529991525583` | `ZPqb7Jit2zn64uaME9Cp` | **Update** (existente) |
| Tester 1 | `+529993314831` | `LxSpYSe41hBpnA6iiLSp` | **Create/update** (nuevo en piloto) |
| Tester 2 | `+529996428094` | `W0n06gpVjIM4cRSthsHa` | **Create/update** (nuevo en piloto) |

**Allowlist:** `+529991525583,+529993314831,+529996428094` (`allowed_phones_count=3`)

---

## Flags runtime

### Antes

| Flag | Valor |
|------|-------|
| `WA_AGENT_MODE` | `mock` |
| `GHL_SYNC_MODE` | `dry_run` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` |
| Allowlist | 1 teléfono (Leandro) |

### Durante

| Flag | Valor |
|------|-------|
| `WA_AGENT_MODE` | **`live_outbound`** |
| `GHL_SYNC_MODE` | **`live`** |
| `GHL_WRITE_CUSTOM_FIELDS` | **`true`** |
| Allowlist | **3 teléfonos** |

Activación: `GHL_SYNC_MODE=live` → `GHL_WRITE_CUSTOM_FIELDS=true` → `WA_AGENT_MODE=live_outbound`.

### Después (rollback — confirmar en Dashboard)

| Flag | Valor esperado |
|------|----------------|
| `WA_AGENT_MODE` | **`mock`** |
| `GHL_WRITE_CUSTOM_FIELDS` | **`false`** |
| `GHL_SYNC_MODE` | **`dry_run`** |
| Allowlist recomendada | `+529991525583` solo |

Orden rollback: WA mock → CF false → GHL dry_run.

---

## Mensajes por tester (ventana piloto 7G.6B)

### Leandro — `+529991525583`

| Hora (UTC) | Mensaje | Intent | provider_response_id | CF | Task |
|------------|---------|--------|----------------------|:--:|:----:|
| 22:33:57 | `1` | carreras_disponibles | `6a3c5b5bd5cb30136e0978be` | ✅ | — |
| 22:35:30 | `Derecho online` | carrera_interes | `6a3c5bb5260ad500375a6770` | ✅ | — |
| 22:35:47 | `Quiero hablar con un asesor` | humano | `6a3c5bc63836711331501256` | ✅ | ✅ |
| 22:36:21 | `Tengo promedio de 9.8, que beca me toca` | beca | `6a3c5bead5cb30136e097a2d` | ✅ | ✅ |

**Beca:** factual Sobresaliente / 50% / 50% inscripción (9.8).

### Tester 2 — `+529996428094`

| Hora (UTC) | Mensaje | Intent | provider_response_id | CF | Task |
|------------|---------|--------|----------------------|:--:|:----:|
| 22:37:27 | `1` | carreras_disponibles | `6a3c5c2d260ad500375a6895` | ✅ | — |
| 22:38:50 | `Derecho online` | carrera_interes | `6a3c5c7d260ad500375a6987` | ✅ | — |
| 22:39:11 | `Quiero hablar con un asesor` | humano | `6a3c5c91260ad500375a69aa` | ✅ | ✅ |
| 22:39:41 | `Tengo promedio de 9.8, que beca me toca` | beca | `6a3c5cb220bb2b792f90f427` | ✅ | ✅ |

### Tester 1 — `+529993314831`

| Hora (UTC) | Mensaje | Intent | provider_response_id | CF | Task |
|------------|---------|--------|----------------------|:--:|:----:|
| 22:39:06 | `1` | carreras_disponibles | `6a3c5c8d20bb2b792f90f397` | ✅ | — |
| 22:39:37 | `2` (menú becas) | beca | `6a3c5cad20bb2b792f90f419` | ✅ | ✅ |
| 22:40:03 | `3` (menú test) | no_se_que_estudiar | `6a3c5cc4d5cb30136e097cb9` | ✅ | — |
| 22:40:18 | `4` (menú asesor) | humano | `6a3c5cd3168094155d5b363f` | ✅ | ✅ |
| 22:40:58 | Mensaje compuesto (lista) | humano | `6a3c5cfb260ad500375a6a94` | ✅ | ✅ |

**Nota Tester 1:** usó opciones numéricas del menú Eva (`1`–`4`) en lugar de texto libre en algunos casos — comportamiento válido; intents correctos.

---

## Validaciones por intent

| Intent | Resultado | Notas |
|--------|-----------|-------|
| carreras_disponibles | ✅ | `wa_stage=carreras_exploracion`, rewrite OK |
| carrera_interes | ✅ | Datos académicos Derecho online |
| no_se_que_estudiar | ✅ | Link test vocacional; sin CF test protegidos |
| beca | ✅ | Factual intacto; 9.8 → Sobresaliente / 50% |
| humano | ✅ | `wa_needs_human=true`, task GHL |

**Campos protegidos:** no incluidos en PUT (solo 8 `wa_*`). Validación UI GHL recomendada manualmente.

---

## `wa_stage` observados

| Intent | `wa_stage` |
|--------|------------|
| carreras_disponibles | `carreras_exploracion` |
| carrera_interes | `carrera_interes` |
| no_se_que_estudiar | `test_recomendado` |
| beca | `beca_interes` |
| humano | `asesor_requerido` |

---

## Métricas piloto (ventana core)

| Métrica | Valor |
|---------|------:|
| Inbounds live | 13 |
| Outbounds accepted | 13 |
| GHL sync ok | 13 |
| CF escritos (8 keys) | 13 |
| Tasks (humano/beca) | 8 |
| Contactos GHL únicos | 3 |
| Errores críticos | 0 |
| Duplicados GHL | 0 |
| Testers con WA visual | 3/3 |

**Costo OpenAI:** no cuantificado en esta fase (estimación manual en Dashboard OpenAI si aplica).

---

## Observaciones

1. **Recepción WhatsApp:** los 3 testers confirmaron respuestas visuales.
2. **Tester 1** usó menú numérico — cubre intents clave sin texto libre completo.
3. **Mensaje compuesto** (22:40:58) clasificado como `humano` — esperado para texto multi-intent.
4. **Preflight técnico** previo al piloto envió 1 outbound real accidental a Leandro (`22:29`) — excluido de conteo formal piloto.

---

## Rollback y smoke post-piloto

**Acción requerida en InsForge Dashboard:**

1. `WA_AGENT_MODE=mock`
2. `GHL_WRITE_CUSTOM_FIELDS=false`
3. `GHL_SYNC_MODE=dry_run`
4. (Opcional) allowlist → solo `+529991525583`

**Smoke post-rollback:**

```bash
node tests/run-phase7g3a-classifier-hotfix.mjs
node tests/run-phase7g5b-custom-fields-preflight.mjs
```

Esperado: 14/14 + 9/9 PASS, `outbound_real=false`, `ghl_live=false`.

---

## Recomendación siguiente fase

**C) Preparar go-live limitado orgánico**

Rationale:
- Piloto interno 3 teléfonos **PASS** sin incidentes.
- GHL + CF + WA combinados estables.
- Allowlist probada multi-número.

Antes de go-live limitado:
- Confirmar rollback + smoke post-piloto.
- Checklist 7G.6A §15 completo.
- Definir horario soporte admisiones.
- Meta Ads **siguen OFF**.
- Evaluar **D) `wa_eva_stage`** si contactos landing+WA son frecuentes.

**No autorizado:** go-live masivo, quitar allowlist, Meta Ads.

---

## Commit docs

`docs: add internal pilot report for eva wa`
