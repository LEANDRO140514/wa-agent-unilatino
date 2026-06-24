# Phase 7G.5B PROPER — Custom fields GHL controlado (solo Leandro)

**Estado:** ✅ **COMPLETADO** — CF `wa_*` escritos en GHL live; rollback confirmado  
**Fecha:** 2026-06-24  
**Teléfono piloto:** `+529991525583` (Leandro)  
**Contacto GHL:** `ZPqb7Jit2zn64uaME9Cp`

---

## Resumen ejecutivo

| Pregunta | Resultado |
|----------|-----------|
| GHL live activado temporalmente | **Sí** |
| `GHL_WRITE_CUSTOM_FIELDS=true` temporalmente | **Sí** |
| Pruebas positivas | **4/4 PASS** |
| Prueba negativa allowlist | **PASS** |
| WhatsApp real | **No** (`mock` / `mocked`) |
| Custom fields escritos (Leandro) | **Sí** — 8 keys `wa_*` |
| CF fuera de whitelist | **No** |
| Campos protegidos (código) | **No incluidos en PUT** |
| Contacto duplicado | **No** |
| `wa_errors` críticos (30 min) | **0** |
| Rollback CF + dry_run | **Confirmado** |
| Smoke 7G.3A post-rollback | **14/14 PASS** |
| Preflight 7G.5B post-rollback | **9/9 PASS** |

---

## Preflight local

| Check | Resultado |
|-------|-----------|
| Repo | `C:/Users/vonde/Proyectos/wa-agent-unilatino` |
| HEAD | `1731707` → `e09bb9e` → `92eb5ff` → `4e70e3f` |
| Working tree (pre-fase) | Limpio |

---

## Flags runtime

### Antes (esperado / pre-activación documental)

| Flag | Valor |
|------|-------|
| `WA_AGENT_MODE` | `mock` |
| `GHL_SYNC_MODE` | `dry_run` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` |

> **Nota:** Al iniciar la sesión de pruebas, el runtime ya reportó `live` + `custom_fields_written=true` (posible activación previa en Dashboard sin rollback completo tras 7G.5A). Las 4 pruebas formales se ejecutaron con CF live activo.

### Durante (piloto CF)

| Flag | Valor |
|------|-------|
| `WA_AGENT_MODE` | **`mock`** |
| `GHL_SYNC_MODE` | **`live`** |
| `GHL_WRITE_CUSTOM_FIELDS` | **`true`** (efectivo) |
| `ghl_allowlist_enabled` | `true` |
| `ghl_allowlist_matched` | `true` (Leandro) |
| `outbound_real` | `false` |

### Después (rollback confirmado)

| Flag | Valor |
|------|-------|
| `WA_AGENT_MODE` | `mock` |
| `GHL_SYNC_MODE` | **`dry_run`** |
| `GHL_WRITE_CUSTOM_FIELDS` | **`false`** |
| `ghl_live` | `false` |
| `custom_fields_written` | `false` |

Orden rollback Dashboard: `GHL_WRITE_CUSTOM_FIELDS=false` → `GHL_SYNC_MODE=dry_run`.

---

## Snapshot `wa_*` antes / después

### Antes (último dry_run pre-piloto — `wa_ghl_sync_log`)

Último registro dry_run Leandro (`carrera_interes`, 2026-06-24T19:27:50Z): CF **no** escritos en GHL (`custom_fields_written=false`); valores lógicos preview:

| Key | Valor preview |
|-----|---------------|
| `wa_last_intent` | `carrera_interes` |
| `wa_stage` | `carrera_interes` |
| `wa_needs_human` | `false` |
| `wa_source` | `YCloud / Eva WA` |

### Después (último caso piloto — beca, sync_log `caf62537-…`)

| Key | Valor escrito |
|-----|---------------|
| `wa_last_intent` | `beca` |
| `wa_stage` | `beca_interes` |
| `wa_needs_human` | `true` |
| `wa_summary` | `Intent: beca \| Prioridad: medium \| escalación sí \| Tengo promedio 9.8…` |
| `wa_source` | `YCloud / Eva WA` |
| `wa_last_inbound_text` | `Tengo promedio 9.8, qué beca me toca` |
| `wa_last_outbound_text` | Factual 9.8 / Sobresaliente / 50% (sin rewrite LLM) |

**Validación UI GHL:** pendiente revisión manual Leandro — código solo envía 8 IDs del mapa `GHL_WA_FIELD_MAP`; campos protegidos no están en whitelist PUT.

---

## Pruebas ejecutadas

### Positivas — `+529991525583`

| # | Mensaje | Intent | CF written | Contacto | Tags/notes/tasks | `wa_stage` |
|---|---------|--------|:----------:|----------|------------------|------------|
| 1 | `1` | `carreras_disponibles` | ✅ (8) | `ZPqb7Jit2zn64uaME9Cp` | note ✅ | `carreras_exploracion` |
| 2 | `Derecho online` | `carrera_interes` | ✅ (8) | mismo | note ✅ | `carrera_interes` |
| 3 | `Quiero hablar con asesor` | `humano` | ✅ (8) | mismo | note + task ✅ | `asesor_requerido` |
| 4 | `Tengo promedio 9.8, qué beca me toca` | `beca` | ✅ (8) | mismo | note + task ✅ | `beca_interes` |

**Keys escritas (todas las pruebas):** exactamente las 8 de whitelist — sin `promedio`, `beca_elegible`, `carrera_recomendada`, UTM, etc.

**Beca:** `eva_llm_rephrased=false`, `eva_llm_block_reason=scholarship_blocked` — promedio 9.8 en **inbound text** y **outbound factual**, no en CF protegido `promedio`.

### Negativa allowlist — `+521111111111`

| Campo | Valor |
|-------|-------|
| `ghl_synced` | `false` |
| `custom_fields_written` | `false` |
| `ghl_block_reason` | `blocked_allowlist_phone` |
| PUT GHL | **No** |

`wa_ghl_sync_log`: `5815820e-9d03-4c22-af2b-a6ac90c24793`

---

## `wa_ghl_sync_log` (casos piloto)

| sync_log_id | intent | status | phone | cf_written | cf_count | allowlist |
|-------------|--------|--------|-------|:----------:|:--------:|-----------|
| `af49c42e-…` | carreras_disponibles | ok | +529991525583 | true | 8 | matched |
| `d7876187-…` | carrera_interes | ok | +529991525583 | true | 8 | matched |
| `0c4686b3-…` | humano | ok | +529991525583 | true | 8 | matched |
| `caf62537-…` | beca | ok | +529991525583 | true | 8 | matched |
| `5815820e-…` | carreras_disponibles | blocked_allowlist_phone | +521111111111 | — | — | not matched |

---

## Seguridad

| Check | Resultado |
|-------|-----------|
| Solo 8 `wa_*` en PUT | ✅ (whitelist código) |
| CF `promedio` / `beca_elegible` / test vocacional | **No** en payload |
| UTM / fbclid / gclid | **No** en payload |
| `firstName` / `lastName` / `email` | **No** en PUT CF |
| Allowlist activa | ✅ |
| WA live | **No** |
| `wa_errors` críticos | **0** |

---

## Valores `wa_stage` observados (riesgo magenta)

| Intent | `wa_stage` Eva |
|--------|----------------|
| `carreras_disponibles` | `carreras_exploracion` |
| `carrera_interes` | `carrera_interes` |
| `humano` | `asesor_requerido` |
| `beca` | `beca_interes` |

Magenta usa `interes_beca` en el mismo CF — **sin conflicto de valor en este piloto**; monitorear en contactos mixtos landing+WA.

---

## Smoke post-rollback

```
node tests/run-phase7g3a-classifier-hotfix.mjs → 14/14 PASS
node tests/run-phase7g5b-custom-fields-preflight.mjs → 9/9 PASS
```

---

## Riesgos restantes

1. **`wa_stage` compartido** con magenta — considerar `wa_eva_stage` en fase posterior.
2. **Validación UI GHL** de campos protegidos — confirmar manualmente en contacto Leandro.
3. **Rollback previo incompleto** — verificar siempre `live`+`CF=false` tras cada piloto.

---

## Recomendación siguiente fase

**D) Piloto cerrado WA live + GHL live** — solo con autorización explícita:

- Secuencia: mantener `GHL_SYNC_MODE=live` + `CF=true` + allowlist → activar temporalmente `WA_AGENT_MODE=live_outbound` → 3–5 mensajes Leandro → rollback WA primero, luego GHL.
- **No** Meta Ads ni go-live masivo hasta estabilizar monitoreo 7G.6.

Alternativa **B)** si contactos landing+WA frecuentes: crear `wa_eva_stage` antes de escala.

---

## Commit docs

`docs: add ghl custom fields controlled pilot report`
