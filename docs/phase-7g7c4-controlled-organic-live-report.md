# 7G.7C.4 — Controlled Organic GHL Live + WA Mock Pilot Report

**Estado:** ✅ **APROBADO** — piloto orgánico controlado 3 teléfonos completado; rollback confirmado  
**Fecha:** 2026-06-26  
**Base:** `c6bde12` — 7G.7C.4-PREFLIGHT  
**Endpoint:** `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`  
**Opción ejecutada:** A — GHL live + WA mock

---

## 1. Preflight

| Check | Resultado |
|-------|-----------|
| `git HEAD` | `c6bde1213b774388705b188f14f7e630a77e1f4c` (`c6bde12`) ✅ |
| Pendientes no relacionados | Excluidos del commit ✅ |
| `wa_errors` críticos pre-piloto (30 min) | **0** ✅ |
| Allowlist pre-piloto | **count=1** esperado en doc base; **encontrado count=3** ya configurado (ver nota) |
| E.164 participantes | `+529991525583`, `+529993314831`, `+529996428094` ✅ |
| WhatsApp real bloqueado | `WA_AGENT_MODE=mock` confirmado ✅ |
| Rollback plan | Documentado y listo ✅ |

### Nota pre-piloto — runtime ya en objetivo live

Al iniciar 7G.7C.4, los secrets InsForge **ya estaban** en el runtime temporal objetivo (posible pre-posicionamiento previo a esta sesión):

```txt
WA_AGENT_MODE=mock
GHL_SYNC_MODE=live
GHL_SYNC_POLICY=qualified_only
GHL_WRITE_CUSTOM_FIELDS=true
GHL_LIVE_ALLOWED_PHONES=+529991525583,+529993314831,+529996428094
```

No fue necesario re-aplicar flags de activación. Se validó con smoke probe calificado (`cf_enabled=true`, `cf_written=true`, `outbound_real=false`) y se procedió al guion completo.

---

## 2. Runtime temporal live

### Runtime efectivo durante piloto

```txt
WA_AGENT_MODE=mock
GHL_SYNC_MODE=live
GHL_SYNC_POLICY=qualified_only
GHL_WRITE_CUSTOM_FIELDS=true
GHL_LIVE_ALLOWED_PHONES=+529991525583,+529993314831,+529996428094
```

### Evidencia global (todos los casos calificados)

| Campo | Valor |
|-------|-------|
| `mode` | `mock` |
| `outbound_real` | `false` |
| `outbound_status` | `mocked` |
| `ghl_sync_mode` | `live` |
| `ghl_live` | `true` |
| `ghl_allowlist_enabled` | `true` (en syncs calificados) |
| `ghl_allowlist_matched` | `true` (en syncs calificados) |
| `ghl_allowed_phones_count` | `3` (en syncs calificados) |
| `custom_fields_enabled` | `true` (M2–M4 calificados) |
| `custom_fields_written` | `true` (M2–M4 calificados) |

**Deploy durante piloto:** sin redeploy de activación (código 7G.7C.1 + hotfix `582bc16` ya activo desde `05:35:31Z`).

---

## 3. Allowlist temporal

```txt
GHL_LIVE_ALLOWED_PHONES=+529991525583,+529993314831,+529996428094
```

Solo estos 3 E.164. Ningún otro teléfono probado ni autorizado.

---

## 4. Participantes

| ID | Nombre | E.164 | Rol | GHL contact ID |
|----|--------|-------|-----|----------------|
| P1 | Leandro | `+529991525583` | Owner / tester | `ZPqb7Jit2zn64uaME9Cp` |
| P2 | Admisiones 1 | `+529993314831` | Asesor | `LxSpYSe41hBpnA6iiLSp` |
| P3 | Admisiones 2 | `+529996428094` | Asesor | `W0n06gpVjIM4cRSthsHa` |

---

## 5. Casos ejecutados por teléfono

Guion: 5 mensajes × 3 teléfonos = **15 casos**. Ventana piloto ~`06:06:38Z`–`06:08:22Z`.

| Teléfono | M1 Hola | M2 Carrera | M3 Costo | M4 Asesor | M5 Gracias |
|----------|---------|------------|----------|-----------|------------|
| P1 Leandro | ✅ | ✅ | ✅ | ✅ | ✅ |
| P2 Admisiones 1 | ✅ | ✅ | ✅ | ✅ | ✅ |
| P3 Admisiones 2 | ✅ | ✅ | ✅ | ✅ | ✅ |

**Resultado runner local:** `15/15 PASS` (`tests/run-phase7g7c4-controlled-organic-live.mjs`, no commiteado).

---

## 6. Resultado por caso

### M1 — Hola

| Campo | Esperado | Observado (3/3) |
|-------|----------|-----------------|
| `ghl_policy_blocked` | `true` | ✅ |
| `ghl_synced` | `false` | ✅ |
| `ghl_task_created` | `false` | ✅ |
| `custom_fields_written` | `false` | ✅ |
| `outbound_real` | `false` | ✅ |
| `routing` | `ignored_intent` o `below_threshold` | ✅ |

### M2 — Me interesa Derecho en línea

| Campo | Esperado | Observado (3/3) |
|-------|----------|-----------------|
| `ghl_synced` | `true` | ✅ |
| `ghl_contact_id` | ID conocido por teléfono | ✅ |
| `ghl_note_created` | `true` | ✅ |
| `custom_fields_written` | `true` | ✅ |
| `would_task` / task | sin task | ✅ |
| `routing` | `high_value_intent_exception` | ✅ |
| `outbound_real` | `false` | ✅ |

### M3 — Cuánto cuesta Derecho en línea?

| Campo | Esperado | Observado (3/3) |
|-------|----------|-----------------|
| `ghl_synced` | `true` | ✅ |
| `routing` | `cost_signal_requires_human_validation` | ✅ |
| `handoff` | `cost_or_tuition_requires_validation` | ✅ |
| `ghl_task_created` | `true` | ✅ |
| `custom_fields_written` | `true` | ✅ |
| Task title (hotfix 7G.7C.3.1) | no vacío | ✅ (task creada sin error 422) |
| `outbound_real` | `false` | ✅ |

### M4 — Quiero hablar con asesor

| Campo | Esperado | Observado (3/3) |
|-------|----------|-----------------|
| `ghl_synced` | `true` | ✅ |
| `intent` | `humano` | ✅ |
| `routing` | `human_handoff` | ✅ |
| `ghl_task_created` | `true` | ✅ |
| `custom_fields_written` | `true` | ✅ |
| `outbound_real` | `false` | ✅ |

### M5 — Gracias

| Campo | Esperado | Observado (3/3) |
|-------|----------|-----------------|
| `ghl_policy_blocked` | `true` | ✅ |
| `ghl_synced` | `false` | ✅ |
| `routing` | `post_escalation_closure_no_sync` | ✅ |
| `would_task` | `false` | ✅ |
| Sin task duplicada | sí | ✅ |
| `outbound_real` | `false` | ✅ |

---

## 7. Evidencia GHL live allowlist

En syncs calificados (M2–M4):

- `ghl_live=true`
- `ghl_allowlist_enabled=true`
- `ghl_allowlist_matched=true`
- `ghl_allowed_phones_count=3`
- `ghl_sync_status=ok`
- `action=update_contact` en `wa_ghl_sync_log`

Contact IDs devueltos coinciden con contactos conocidos por teléfono (sin crear duplicados).

---

## 8. Evidencia de blocked cases

| Caso | `action` en log | `status` |
|------|-----------------|----------|
| M1 Hola | `policy_blocked` | `ignored_intent` / `below_threshold` |
| M5 Gracias | `policy_blocked` | `post_escalation_closure_no_sync` |

`ghl_synced=false`, `ghl_contact_id=null`, sin notes/tasks/CF en blocked.

---

## 9. Validación contacto único por teléfono

| Teléfono | GHL contact ID (M2–M4) | Duplicado |
|----------|------------------------|-----------|
| `+529991525583` | `ZPqb7Jit2zn64uaME9Cp` | No |
| `+529993314831` | `LxSpYSe41hBpnA6iiLSp` | No |
| `+529996428094` | `W0n06gpVjIM4cRSthsHa` | No |

`action=update_contact` en todos los syncs OK — actualización sobre contacto existente.

---

## 10. Tags

Desde `wa_ghl_sync_log.would_add_tags` (ventana 7G.7C.4):

| Intent / caso | Tags |
|---------------|------|
| `carrera_interes` (M2, M3) | `eva-wa`, `wa_interes_carrera` |
| `humano` (M4) | `eva-wa`, `wa_requiere_asesor` |
| Blocked (M1, M5) | `null` |

---

## 11. Notes

- `ghl_note_created=true` en M2, M3, M4 para los 3 teléfonos (9 notes live en ventana piloto).
- Sin notes en casos `policy_blocked`.

---

## 12. Tasks

| Caso | Task esperada | Observado |
|------|---------------|-----------|
| M2 | No | ✅ `ghl_task_created=false` |
| M3 | Sí (costo) | ✅ `ghl_task_created=true` × 3 |
| M4 | Sí (asesor) | ✅ `ghl_task_created=true` × 3 |
| M5 | No / no duplicar | ✅ `would_task=false`, sin sync |

Hotfix 7G.7C.3.1: tasks de costo creadas sin error 422 (`title must be a string`).

---

## 13. Custom fields 7G.5B

Escritura confirmada vía API (`custom_fields_written=true`) en M2–M4 para los 3 teléfonos.

Keys permitidas (sin campos nuevos):

```txt
wa_last_intent
wa_last_message_at
wa_stage
wa_needs_human
wa_summary
wa_source
wa_last_inbound_text
wa_last_outbound_text
```

`GHL_WA_FIELD_MAP` no modificado.

---

## 14. Evidencia outbound_real=false

**15/15 casos:** `outbound_real=false`, `outbound_status=mocked`, `mode=mock`.

---

## 15. Evidencia WhatsApp real no enviado

- `WA_AGENT_MODE=mock` en toda la ventana.
- Sin `outbound_live_failed` en `wa_errors`.
- Sin activación de `live_outbound`.

---

## 16. wa_errors críticos

| Ventana | Críticos |
|---------|----------|
| Piloto (`06:05`–`06:10` UTC) | **0** |
| Post-rollback probe | **0** |

Tipos monitoreados: `function_error`, `ghl_live_failed`, `outbound_live_failed`, `ghl_sync_failed`.

---

## 17. Stop criteria

Ningún criterio de stop activado durante 7G.7C.4.

---

## 18. Rollback aplicado

Orden ejecutado vía InsForge REST API:

```txt
1. GHL_WRITE_CUSTOM_FIELDS=false
2. GHL_SYNC_MODE=dry_run
3. GHL_SYNC_POLICY=qualified_only
4. WA_AGENT_MODE=mock
5. GHL_LIVE_ALLOWED_PHONES=+529991525583
```

**Redeploy justificado** (secrets no recargados hasta reload):

| Evento | `updatedAt` |
|--------|-------------|
| Post-rollback reload | `2026-06-26T06:09:04.170Z` |
| description | Eva WA 7G.7C.4 — post-rollback reload (mock/dry_run/qualified_only) |

---

## 19. Runtime final seguro

Probe post-rollback (`Hola`, `+529991525583`):

```json
{
  "mode": "mock",
  "ghl_sync_mode": "dry_run",
  "outbound_real": false,
  "ghl_live": false,
  "ghl_dry_run": true,
  "cf": false,
  "policy": "qualified_only",
  "ghl_policy_blocked": true
}
```

Secrets confirmados:

```txt
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_SYNC_POLICY=qualified_only
GHL_WRITE_CUSTOM_FIELDS=false
GHL_LIVE_ALLOWED_PHONES=+529991525583
```

---

## 20. Suites post-rollback

| Suite | Resultado |
|-------|-----------|
| `run-phase7g7c31-task-title-hotfix.mjs` | **8/8 PASS** |
| `run-phase7g7c-qualified-sync.mjs` | **15/15 PASS** |
| `run-phase7g7b-ghl-relevance-shadow.mjs` | **22/22 PASS** |
| `run-phase7g6d-conversation-hotfix.mjs` | **4/4 PASS** |
| `run-phase7g3a-classifier-hotfix.mjs` | **14/14 PASS** |
| `run-phase7g5b-custom-fields-preflight.mjs` | **9/9 PASS** |

**Total:** 72/72 PASS

---

## 21. Pendientes no relacionados preservados

Sin commit de:

```txt
docs/phase-7g6c-*, phase-7g8-*, phase-7g6d-organic-limited-prep.md
tests/run-phase7g6c-*, run-phase7g7c2-*, run-phase7g7c3-*, run-phase7g7c4-* (local)
insforge/functions/dist/ycloud-wa-inbound.deploy.js (artefacto build local)
```

---

## 22. Veredicto

**✅ 7G.7C.4 APROBADO**

| Criterio | Estado |
|----------|--------|
| GHL live solo allowlist 3 teléfonos | ✅ |
| `qualified_only` bloquea no calificados | ✅ |
| `qualified_only` permite comerciales calificados | ✅ |
| Custom fields 7G.5B escritos en sync calificado | ✅ |
| Tasks solo donde corresponde | ✅ |
| Sin duplicados contacto/task | ✅ |
| WhatsApp real no enviado | ✅ |
| Meta Ads no tocado | ✅ |
| `wa_errors` críticos = 0 en ventana | ✅ |
| Rollback runtime seguro | ✅ |
| Suites post-rollback | ✅ 72/72 |
| Reporte commiteado limpio | ✅ (este doc) |

---

## 23. Recomendación para 7G.7C.5

1. **Validación UI GHL** (manual, admisiones): revisar en consola los 3 contactos — notes, tags, tasks de costo/asesor y campos `wa_*` tras este piloto API.
2. **Siguiente fase sugerida — 7G.7C.5 WA live_outbound controlado:** mantener `GHL_SYNC_MODE=live`, `qualified_only`, allowlist 3 teléfonos, sesión con admisiones presentes; activar `WA_AGENT_MODE=live_outbound` **solo** con autorización explícita y ventana acotada.
3. **No abrir** Meta Ads ni tráfico público hasta completar 7G.7C.5 o fase equivalente de outbound real.
4. **Repetir patrón rollback** documentado al cerrar cualquier ventana live.
