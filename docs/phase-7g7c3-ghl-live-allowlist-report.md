# 7G.7C.3 — GHL Live Allowlist Single Phone Pilot Report

**Estado:** ✅ **APROBADO** — piloto live allowlist completado; rollback confirmado  
**Fecha:** 2026-06-26  
**Base:** `abe538c` — 7G.7C.3-PREFLIGHT  
**Teléfono piloto:** `+529991525583` (único allowlist)  
**Contacto GHL:** `ZPqb7Jit2zn64uaME9Cp`  
**Endpoint:** `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`

---

## 1. Preflight

| Check | Resultado |
|-------|-----------|
| `git HEAD` | `abe538c` ✅ |
| Pendientes no relacionados | Excluidos del commit ✅ |
| Runtime pre-piloto (secrets) | `mock` + `live` + `qualified_only` + `CF=true` (ya configurado) |
| `wa_errors` críticos pre-piloto (60 min) | **0** ✅ |
| Contacto GHL conocido | `ZPqb7Jit2zn64uaME9Cp` (7G.5A/7G.5C) ✅ |
| Redeploy para recargar secrets | Requerido y ejecutado ✅ |

---

## 2. Runtime temporal live

### Secrets aplicados (orden)

```txt
1. WA_AGENT_MODE=mock          (confirmado)
2. GHL_SYNC_POLICY=qualified_only (confirmado)
3. GHL_SYNC_MODE=live          (ya activo)
4. GHL_WRITE_CUSTOM_FIELDS=true (ya activo)
5. GHL_LIVE_ALLOWED_PHONES=+529991525583 (confirmado)
```

### Deploys durante piloto

| Evento | `updatedAt` |
|--------|-------------|
| Reload secrets (bundle 7G.7C.1) | `2026-06-26T05:32:17.503Z` |
| Hotfix cost task title | `2026-06-26T05:34:44.211Z` |
| Post-rollback reload | `2026-06-26T05:35:31.581Z` |

### Evidencia runtime live (post-reload)

- `mode=mock`, `outbound_real=false`, `outbound_status=mocked`
- `ghl_sync_mode=live`, `ghl_live=true`
- `ghl_allowlist_enabled=true`, `ghl_allowlist_matched=true`
- `custom_fields_enabled=true` en syncs calificados
- `policy=qualified_only` en shadow

**WhatsApp real:** no enviado en ningún caso.

---

## 3. Casos ejecutados (5 mensajes allowlist)

| ID | Mensaje | Resultado | Evidencia clave |
|----|---------|-----------|----------------|
| C1 | `Hola` | ✅ PASS | `ghl_policy_blocked=true`, `ghl_synced=false` |
| C2 | `Me interesa Derecho en línea` | ✅ PASS | `ghl_synced=true`, note+tags+8 CF, sin task |
| C3 | `Cuánto cuesta Derecho en línea?` | ✅ PASS (tras hotfix) | task+handoff costo, 8 CF |
| C4 | `Quiero hablar con asesor` | ✅ PASS | task live, tags `wa_requiere_asesor`, 8 CF |
| C5 | `me gusta el fútbol` | ✅ PASS | `policy_blocked`, sin sync |

**Nota C3:** primer intento falló (`GHL create task failed 422: title must be a string`) porque el gate creó task con intent `carrera_interes` sin título EVA. Hotfix mínimo `resolveGhlTaskTitle()` desplegado; reintento **PASS**.

---

## 4. Evidencia GHL live allowlist

Syncs live exitosos (`status=ok`, `contact_id=ZPqb7Jit2zn64uaME9Cp`):

| sync_log_id | intent | action | CF |
|-------------|--------|--------|:--:|
| `37f201aa-…` | carrera_interes | update_contact | ✅ |
| `65208e08-…` | humano | update_contact + task | ✅ |
| `72d5c58f-…` | carrera_interes (costo) | update_contact + task | ✅ |

Allowlist en todos los syncs live: `allowlist_enabled=true`, `allowlist_matched=true`, `allowed_phones_count=1`.

---

## 5. Evidencia blocked cases

| Caso | `action` | `status` |
|------|----------|----------|
| C1 Hola | `policy_blocked` | `ignored_intent` |
| C5 off-topic | `policy_blocked` | `below_threshold` |
| Menú `1` (probe) | `policy_blocked` | `ignored_intent` |

`qualified_only` bloqueó correctamente mensajes no calificados en modo live.

---

## 6. Validación contacto único

- **Un solo contacto GHL:** `ZPqb7Jit2zn64uaME9Cp`
- **Sin duplicados** en búsqueda por teléfono durante piloto
- Acción predominante: `update_contact` (contacto preexistente 7G.5A/7G.5C)

---

## 7. Tags

| Caso | Tags aplicados |
|------|----------------|
| C2 carrera | `eva-wa`, `wa_interes_carrera` |
| C4 asesor | `eva-wa`, `wa_requiere_asesor` |
| C3 costo | sync ok (tags en payload GHL acumulados) |

---

## 8. Notes

Notes creadas con bloque `[Eva WA — qualified_only]` incluyendo lead score, routing, policy en C2/C3/C4.

Ejemplo C2: note id `PV1aHyeh2xasSwD050wl` — routing `high_value_intent_exception`, score 40.

---

## 9. Tasks

| Caso | Task | Título |
|------|:----:|--------|
| C2 carrera | No | — |
| C3 costo | ✅ | `Validar costo/colegiatura — lead WhatsApp` |
| C4 asesor | ✅ | `Atender lead WhatsApp — Solicita asesor` |

Task C4 id: `zMBqqtV8M7GwNcvnHrfe`.

---

## 10. Custom fields 7G.5B

8 keys escritas en syncs calificados (`custom_fields_written=true`, `custom_fields_count=8`):

```txt
wa_last_intent, wa_last_message_at, wa_stage, wa_needs_human,
wa_summary, wa_source, wa_last_inbound_text, wa_last_outbound_text
```

Sin campos nuevos. Sin tocar `GHL_WA_FIELD_MAP`. Sin keys protegidas landings.

---

## 11. Evidencia `outbound_real=false`

Todos los probes y casos: `outbound_real=false`, `outbound_status=mocked`, `mode=mock`.

---

## 12. WhatsApp real no enviado

Confirmado en respuesta HTTP y `wa_outbound_messages` (mock/dry_run outbound).

---

## 13. wa_errors críticos

| Ventana | Resultado |
|---------|-----------|
| Durante piloto | 1× `ghl_live_failed` (C3 intento 1 — task title vacío) |
| Post-hotfix + rollback | **0** nuevos `function_error` / `ghl_live_failed` |
| Post-rollback suites | Sin incidentes |

El error C3 quedó resuelto con hotfix; no bloquea veredicto.

---

## 14. Rollback aplicado

Orden ejecutado:

```txt
1. GHL_WRITE_CUSTOM_FIELDS=false
2. GHL_SYNC_MODE=dry_run
3. GHL_SYNC_POLICY=qualified_only (mantenido)
4. WA_AGENT_MODE=mock (ya estaba)
5. GHL_LIVE_ALLOWED_PHONES=+529991525583 (sin cambio)
```

Redeploy post-rollback: `updatedAt=2026-06-26T05:35:31.581Z`.

---

## 15. Runtime final seguro

Probe post-rollback (`Hola`):

```json
{
  "mode": "mock",
  "ghl_sync_mode": "dry_run",
  "ghl_live": false,
  "ghl_dry_run": true,
  "outbound_real": false,
  "custom_fields_enabled": false,
  "policy": "qualified_only",
  "ghl_policy_blocked": true
}
```

---

## 16. Suites post-rollback

| Runner | Resultado |
|--------|-----------|
| `run-phase7g7c-qualified-sync.mjs` | **15/15 PASS** |
| `run-phase7g7b-ghl-relevance-shadow.mjs` | **22/22 PASS** |
| `run-phase7g6d-conversation-hotfix.mjs` | **4/4 PASS** |
| `run-phase7g3a-classifier-hotfix.mjs` | **14/14 PASS** |
| `run-phase7g5b-custom-fields-preflight.mjs` | **9/9 PASS** |

---

## 17. Pendientes no relacionados preservados

Sin commit de docs 7G.6C/7G.8, runners locales (`run-phase7g7c2-*`, `run-phase7g7c3-*`), ni fix handler (ver §19).

---

## 18. Veredicto

**7G.7C.3 APROBADO**

| Criterio | Estado |
|----------|--------|
| GHL live solo `+529991525583` | ✅ |
| `qualified_only` bloquea no calificados | ✅ |
| Sync calificados en live | ✅ |
| CF 7G.5B escritos | ✅ |
| Tasks cuando corresponde | ✅ (tras hotfix costo) |
| Sin duplicados contacto | ✅ |
| WhatsApp real no enviado | ✅ |
| Meta Ads no tocado | ✅ |
| Rollback runtime seguro | ✅ |
| Suites post-rollback | ✅ |

---

## 19. Hotfix desplegado (pendiente commit código)

Durante piloto se desplegó fix mínimo en `ycloud-wa-inbound.js`:

- `resolveGhlTaskTitle()` — título para tasks gobernadas por gate cuando `human_handoff_reason=cost_or_tuition_requires_validation`

**Estado:** desplegado en InsForge; **no commiteado** en repo (solo reporte en este commit).

---

## 20. Recomendación para 7G.7C.4

1. **Commit hotfix** `resolveGhlTaskTitle` como `7G.7C.3.1` (código + test unitario opcional).
2. Mantener `GHL_SYNC_POLICY=qualified_only` como default dry_run (actual).
3. **No abrir** Meta Ads ni allowlist adicional sin nueva fase.
4. Opcional: piloto `WA_AGENT_MODE=live_outbound` combinado (7G.5C-style) solo con autorización explícita.
5. Formalizar runner `run-phase7g7c3-ghl-live-allowlist.mjs` si se desea repetibilidad.
