# Phase 7G.5A PROPER — GHL live controlado (solo Leandro, CF OFF)

**Estado:** ✅ **COMPLETADO** — GHL live temporal validado; rollback a `dry_run` confirmado  
**Fecha:** 2026-06-24  
**Endpoint:** `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`  
**Teléfono piloto:** `+529991525583` (Leandro)  
**Contacto GHL:** `ZPqb7Jit2zn64uaME9Cp`

---

## Resumen ejecutivo

| Pregunta | Resultado |
|----------|-----------|
| GHL live activado temporalmente | **Sí** |
| Pruebas positivas ejecutadas | **4/4 PASS** |
| Prueba negativa allowlist | **PASS** (`blocked_allowlist_phone`) |
| WhatsApp real | **No** (`mock` / `mocked`) |
| Custom fields escritos | **No** (`custom_fields_written=false`) |
| Contacto duplicado | **No** — mismo `ZPqb7Jit2zn64uaME9Cp` |
| Campos protegidos landings | **No tocados** |
| `wa_errors` críticos (30 min) | **0** |
| Rollback `GHL_SYNC_MODE=dry_run` | **Confirmado** |
| Smoke 7G.3A post-rollback | **14/14 PASS** |

---

## Preflight local

| Check | Resultado |
|-------|-----------|
| Repo | `C:/Users/vonde/Proyectos/wa-agent-unilatino` |
| HEAD | `92eb5ff` → `4e70e3f` → `6b4554c` → `c9ff7be` |
| Working tree | Limpio (pre-fase) |

---

## Flags runtime

### Antes (7G.5A-ALLOWLIST-SECRET)

| Flag | Valor |
|------|-------|
| `WA_AGENT_MODE` | `mock` |
| `GHL_SYNC_MODE` | `dry_run` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` |
| `GHL_LIVE_ALLOWED_PHONES` | configurado (`allowed_phones_count: 1`) |

### Durante (piloto GHL live)

| Flag | Valor |
|------|-------|
| `WA_AGENT_MODE` | **`mock`** |
| `GHL_SYNC_MODE` | **`live`** |
| `GHL_WRITE_CUSTOM_FIELDS` | **`false`** |
| `ghl_allowlist_enabled` | `true` |
| `ghl_allowlist_matched` | `true` (Leandro) / `false` (negativo) |
| `outbound_real` | `false` |
| `outbound_status` | `mocked` |

> Tras cambiar `GHL_SYNC_MODE=live` en Dashboard, fue necesario **redeploy** de `ycloud-wa-inbound` (mismo bundle `4e70e3f`) para que el runtime recargara secrets (`updatedAt: 2026-06-24T19:16:45.474Z`).

### Después (rollback)

| Flag | Valor |
|------|-------|
| `WA_AGENT_MODE` | `mock` |
| `GHL_SYNC_MODE` | **`dry_run`** |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` |
| `ghl_live` | `false` |
| `ghl_dry_run` | `true` |

---

## Pruebas ejecutadas

### Positivas — `+529991525583`

| # | Mensaje | Intent | GHL synced | Contacto | Tags | Note | Task | CF | Allowlist |
|---|---------|--------|:----------:|----------|------|:----:|:----:|:--:|-----------|
| 1 | `1` | `carreras_disponibles` | ✅ | `ZPqb7Jit2zn64uaME9Cp` | `eva-wa`, `wa_interes_carreras` | ✅ | — | ❌ | matched |
| 2 | `Derecho online` | `carrera_interes` | ✅ | mismo | `eva-wa`, `wa_interes_carrera` | ✅ | — | ❌ | matched |
| 3 | `Quiero hablar con asesor` | `humano` | ✅ | mismo | `eva-wa`, `wa_requiere_asesor` | ✅ | ✅ | ❌ | matched |
| 4 | `Tengo promedio 9.8, qué beca me toca` | `beca` | ✅ | mismo | `eva-wa`, `wa_interes_beca` | ✅ | ✅ | ❌ | matched |

**Acción GHL:** `update_contact` en los 4 casos (contacto existente; sin `create_contact` duplicado).

**Beca / LLM:** `eva_llm_rephrased=false`, `eva_llm_block_reason=scholarship_blocked` — factual intacto (9.8 / Sobresaliente / 50%).

### Negativa allowlist — `+521111111111`

| Campo | Valor |
|-------|-------|
| `ghl_synced` | `false` |
| `ghl_contact_id` | `null` |
| `ghl_block_reason` | `blocked_allowlist_phone` |
| `status` (log) | `blocked_allowlist_phone` |
| POST GHL | **No** |
| `outbound_status` | `mocked` |

`wa_ghl_sync_log` id: `79208fcd-d232-4bee-857f-5cd24779029c`

---

## `wa_ghl_sync_log` (casos piloto)

| sync_log_id | intent | sync_mode | status | phone | tags | task | CF |
|-------------|--------|-----------|--------|-------|------|:----:|:--:|
| `c2a30590-…` | carreras_disponibles | live | ok | +529991525583 | eva-wa, wa_interes_carreras | no | false |
| `8eed84d5-…` | carrera_interes | live | ok | +529991525583 | eva-wa, wa_interes_carrera | no | false |
| `98aa7deb-…` | humano | live | ok | +529991525583 | eva-wa, wa_requiere_asesor | sí | false |
| `1e12e0e9-…` | beca | live | ok | +529991525583 | eva-wa, wa_interes_beca | sí | false |
| `79208fcd-…` | carreras_disponibles | live | blocked_allowlist_phone | +521111111111 | (no aplicados) | no | — |

Todos los casos Leandro: `allowlist_enabled=true`, `allowlist_matched=true`, `block_reason=null`.

---

## Validaciones de seguridad

| Check | Resultado |
|-------|-----------|
| GHL live sin WA live | ✅ |
| Allowlist activa en `live` | ✅ |
| Solo `+529991525583` escribió en GHL | ✅ |
| `GHL_WRITE_CUSTOM_FIELDS=false` | ✅ |
| Campos protegidos landings | No escritos (`GHL_PROTECTED_FIELDS` excluidos) |
| UTM / fbclid / gclid | No tocados |
| `wa_errors` críticos (excl. phone_normalization) | **0** |

---

## Smoke post-rollback

```
node tests/run-phase7g3a-classifier-hotfix.mjs
→ 14/14 PASS
```

Flags smoke: `mock`, `ghl_dry_run=true`, `ghl_live=false`, `outbound_real=false`, beca `scholarship_blocked`.

---

## Recomendación siguiente fase

**B) Avanzar a 7G.5B — custom fields controlado**

Rationale:
- GHL live con tags/notes/tasks funciona correctamente en allowlist.
- Custom fields permanecen OFF sin incidentes.
- Allowlist negativa bloquea escritura fuera de Leandro.
- Rollback y smoke post-piloto estables.

Antes de 7G.5B:
- Mantener `GHL_LIVE_ALLOWED_PHONES=+529991525583`.
- Activar `GHL_WRITE_CUSTOM_FIELDS=true` solo con `GHL_WA_FIELD_MAP` validado (`wa_*` namespace).
- Validar en GHL UI que ningún campo protegido de landings fue alterado durante 7G.5A.

---

## Commit docs

`docs: add ghl live controlled pilot report`
