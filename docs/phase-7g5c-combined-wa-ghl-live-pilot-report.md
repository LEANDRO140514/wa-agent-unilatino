# Phase 7G.5C — Piloto cerrado combinado WA live + GHL live + CF ON

**Estado:** ✅ **COMPLETADO** — flujo end-to-end validado; rollback confirmado  
**Fecha:** 2026-06-24  
**Teléfono piloto:** `+529991525583` (Leandro) → Eva `+529994538421`  
**Contacto GHL:** `ZPqb7Jit2zn64uaME9Cp`

---

## Resumen ejecutivo

| Pregunta | Resultado |
|----------|-----------|
| WA live (`live_outbound`) temporal | **Sí** |
| GHL live temporal | **Sí** |
| `GHL_WRITE_CUSTOM_FIELDS=true` temporal | **Sí** |
| Mensajes WhatsApp real (Leandro) | **4/4** |
| Recepción visual WhatsApp | **Sí** (confirmado Leandro) |
| Outbound `accepted` + `provider_response_id` | **4/4** |
| GHL sync live + CF 8 keys | **4/4** |
| Allowlist matched | **Sí** |
| CF fuera de whitelist | **No** |
| Contacto duplicado | **No** |
| `wa_errors` críticos | **0** |
| Rollback completo | **Confirmado** |
| Smoke 7G.3A | **14/14 PASS** |
| Smoke 7G.5B preflight | **9/9 PASS** |

---

## Preflight local

| Check | Resultado |
|-------|-----------|
| Repo | `C:/Users/vonde/Proyectos/wa-agent-unilatino` |
| HEAD | `7eae51e` → `1731707` → `e09bb9e` |
| Working tree (pre-fase) | Limpio |

---

## Flags runtime

### Antes

| Flag | Valor |
|------|-------|
| `WA_AGENT_MODE` | `mock` |
| `GHL_SYNC_MODE` | `dry_run` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` |

### Durante (piloto combinado)

| Flag | Valor |
|------|-------|
| `WA_AGENT_MODE` | **`live_outbound`** |
| `GHL_SYNC_MODE` | **`live`** |
| `GHL_WRITE_CUSTOM_FIELDS` | **`true`** |
| `GHL_LIVE_ALLOWED_PHONES` | `+529991525583` (count=1) |

Activación Dashboard (orden): `GHL_SYNC_MODE=live` → `GHL_WRITE_CUSTOM_FIELDS=true` → `WA_AGENT_MODE=live_outbound`.

### Después (rollback)

| Flag | Valor |
|------|-------|
| `WA_AGENT_MODE` | **`mock`** |
| `GHL_WRITE_CUSTOM_FIELDS` | **`false`** |
| `GHL_SYNC_MODE` | **`dry_run`** |
| `ghl_live` | `false` |
| `outbound_real` | `false` (smoke) |

Rollback Dashboard (orden): `WA_AGENT_MODE=mock` → `GHL_WRITE_CUSTOM_FIELDS=false` → `GHL_SYNC_MODE=dry_run`.

---

## Snapshot previo GHL

Último sync live pre-piloto (7G.5B, beca): contacto `ZPqb7Jit2zn64uaME9Cp`, `wa_stage=beca_interes`, 8 CF lógicos preview.

---

## Mensajes WhatsApp real — Leandro

| # | Mensaje enviado | Intent | Inbound status | Outbound | provider_response_id |
|---|-----------------|--------|----------------|----------|----------------------|
| 1 | `1` | `carreras_disponibles` | `processed_inbound_live` | `accepted` | `6a3c3627168094155d5ad1b1` |
| 2 | `Derecho online` | `carrera_interes` | `processed_inbound_live` | `accepted` | `6a3c36374a8ee306a638930d` |
| 3 | `Quiero hablar con un asesor` | `humano` | `processed_inbound_live` | `accepted` | `6a3c365520bb2b792f908fb2` |
| 4 | `Tengo promedio 9.8, que beca me toca` | `beca` | `processed_inbound_live` | `accepted` | `6a3c3684260ad500375a0435` |

**Inbound IDs:** `b3268a43-…`, `d1cebb9f-…`, `41648ff2-ba59-4ba6-8dc9-e4ba95963ec1`, `0fea9453-…`

**Recepción visual:** confirmada por Leandro (4 respuestas visibles en WhatsApp).

**Beca factual (outbound):** 9.8 → Sobresaliente → 50% colegiatura / 50% inscripción (sin rewrite LLM en beca).

---

## GHL sync (`wa_ghl_sync_log`)

| Intent | status | contact_id | CF written | count | tags | task |
|--------|--------|------------|:----------:|:-----:|------|:----:|
| carreras_disponibles | ok | `ZPqb7Jit2zn64uaME9Cp` | true | 8 | eva-wa, wa_interes_carreras | — |
| carrera_interes | ok | mismo | true | 8 | eva-wa, wa_interes_carrera | — |
| humano | ok | mismo | true | 8 | eva-wa, wa_requiere_asesor | ✅ |
| beca | ok | mismo | true | 8 | eva-wa, wa_interes_beca | ✅ |

Allowlist: `enabled=true`, `matched=true`, `block_reason=null` en los 4 casos.

**Sync log IDs:** `39117f53-…`, `04bc7198-…`, `00595f8e-…`, `083019ca-…`

---

## Custom fields `wa_*` (último caso = beca)

| Key | Valor |
|-----|-------|
| `wa_last_intent` | `beca` |
| `wa_stage` | `beca_interes` |
| `wa_needs_human` | `true` |
| `wa_source` | `YCloud / Eva WA` |
| `wa_last_inbound_text` | `Tengo promedio 9.8, que beca me toca` |
| `wa_last_outbound_text` | Factual Sobresaliente / 50% |

**Keys escritas:** exactamente 8 whitelist — sin `promedio`, `beca_elegible`, test vocacional, UTM.

### `wa_stage` por intent

| Intent | `wa_stage` |
|--------|------------|
| carreras_disponibles | `carreras_exploracion` |
| carrera_interes | `carrera_interes` |
| humano | `asesor_requerido` |
| beca | `beca_interes` |

---

## Seguridad

| Check | Resultado |
|-------|-----------|
| Solo Leandro en allowlist | ✅ |
| CF solo whitelist `wa_*` | ✅ |
| Campos protegidos en PUT | **Ausentes** (código) |
| UTM / fbclid / gclid | **No** en payload |
| Meta Ads | **No** activado |
| Prueba negativa allowlist | Omitida (ya validada 7G.5A/7G.5B) |
| `wa_errors` críticos post-piloto | **0** |

Validación UI GHL de campos protegidos: revisión manual recomendada en contacto Leandro.

---

## Smoke post-rollback

```
node tests/run-phase7g3a-classifier-hotfix.mjs → 14/14 PASS
node tests/run-phase7g5b-custom-fields-preflight.mjs → 9/9 PASS
```

---

## Recomendación siguiente fase

**D) Pasar a checklist go-live 7G.6**

Rationale:
- Pipeline completo validado: YCloud inbound real → Eva → YCloud outbound real → GHL live (tags/notes/tasks/CF).
- Allowlist + rollback estables.
- Sin incidentes en piloto cerrado.

Antes de ampliar:
- Checklist monitoreo (`wa_errors`, duplicados GHL, loops WA).
- Considerar **C) `wa_eva_stage`** si contactos landing+WA son frecuentes.
- **No** Meta Ads hasta 7G.6 aprobado.
- Piloto 2–3 teléfonos internos solo tras checklist 7G.6.

---

## Commit docs

`docs: add combined wa and ghl live pilot report`
