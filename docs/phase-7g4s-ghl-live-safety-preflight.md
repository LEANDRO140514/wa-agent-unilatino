# Phase 7G.4S — GHL Live Safety Preflight (preparación 7G.5)

**Estado:** ✅ **DIAGNÓSTICO COMPLETO** — sin cambios en producción  
**Fecha:** 2026-06-24  
**Checkpoint base:** `c9ff7bef5d6e8900a8bee920cee7f773ea46c3e4` (7G.4R)  
**Estado:** ✅ **IMPLEMENTADO** — allowlist en código; 7G.5A pendiente autorización  
**Próxima fase:** 7G.5A — activar `GHL_SYNC_MODE=live` solo con `GHL_LIVE_ALLOWED_PHONES` configurado

---

## Resumen ejecutivo

| Pregunta | Resultado |
|----------|-----------|
| ¿Se activó GHL live? | **No** |
| ¿Se activó WhatsApp live? | **No** |
| ¿Se escribió en GHL? | **No** |
| ¿Entorno seguro? | **Sí** — `mock` + `dry_run` |
| ¿Listo para 7G.5A? | **Condicional** — falta **allowlist en código** |

**Decisión recomendada:** implementar `GHL_LIVE_ALLOWED_PHONES` (o equivalente) **antes** de activar `GHL_SYNC_MODE=live`. Sin allowlist, cualquier inbound real con GHL live escribiría en CRM.

---

## 1. Estado Git

```
git status --short → (vacío)
HEAD → c9ff7bef5d6e8900a8bee920cee7f773ea46c3e4
```

Working tree limpio. Checkpoint 7G.4R presente en historia.

---

## 2. Flags actuales (preflight 2026-06-24)

| Secret | Valor confirmado | Método |
|--------|------------------|--------|
| `WA_AGENT_MODE` | **`mock`** | POST non-inbound → `mode: mock` |
| `GHL_SYNC_MODE` | `dry_run` | inferido de logs + diseño |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` | `custom_fields_skipped_reason` en logs |
| `ACADEMIC_ENGINE_ENABLED` | `true` | runtime 7G.4R |
| `EVA_LLM_ENABLED` | `true` | shadow log rewrite |
| `LLM_PROVIDER` | `openai` | shadow log |
| `LLM_MODEL` | `gpt-4o-mini` | fases previas |
| `LLM_MODE` | `rewrite` | shadow log |
| `EVA_LLM_FAIL_OPEN` | `true` | config declarada |

**No se modificó ningún secret en esta fase.**

---

## 3. Resumen integración GHL

### Arquitectura

```
YCloud inbound → ycloud-wa-inbound.js (InsForge)
  → clasificador + academic engine + LLM rewrite
  → wa_inbound_messages / wa_outbound_messages
  → syncGHLContact()
       ├─ GHL_SYNC_MODE=dry_run → syncGHLContactDryRun() → wa_ghl_sync_log
       └─ GHL_SYNC_MODE=live   → syncGHLContactLive()   → GHL API + wa_ghl_sync_log
```

### Archivos clave

| Archivo | Rol |
|---------|-----|
| `insforge/functions/ycloud-wa-inbound.js` | **Implementación activa** — dry_run, live, tags, notes, tasks, custom fields gate |
| `insforge/functions/lib/sync-ghl-contact.js` | Legacy / tests — mapa tags **incompleto** (sin `carreras_disponibles` / `carrera_interes`); no usar como fuente de verdad |
| `docs/ghl-phase-3-plan.md` | Plan CRM-only, modos dry_run/live |
| `docs/ghl-phase-3c-custom-fields.md` | 8 custom fields WA + gate `GHL_WRITE_CUSTOM_FIELDS` |
| `docs/phase-7e-wa-live-ghl-live-academic-report.md` | Última prueba GHL live (2026-06-23, **con** custom fields) |
| `tests/run-phase7e-wa-live-ghl-live.mjs` | Runner live — **no ejecutar** en 7G.4S |

### Principio rector

**GHL es CRM, no canal WhatsApp.** WhatsApp solo por YCloud. GHL recibe contacto, tags, notes, tasks y (opcionalmente) custom fields WA.

---

## 4. Endpoints GHL (live)

**Base URL:** `GHL_API_BASE_URL` → default `https://services.leadconnectorhq.com`  
**Auth:** `Authorization: Bearer <GHL_API_KEY>` + `Version: 2021-07-28`

| Paso | Método | Path | Cuándo |
|------|--------|------|--------|
| Buscar contacto | `POST` | `/contacts/search` | Siempre primero (`locationId` + `query: phone`) |
| Crear contacto | `POST` | `/contacts/` | Si 0 resultados (`phone`, `locationId`, `source`) |
| Agregar tags | `POST` | `/contacts/{id}/tags` | Siempre (`tags: ["eva-wa", ...]`) |
| Crear nota | `POST` | `/contacts/{id}/notes` | Siempre (`body: noteBody`) |
| Crear task | `POST` | `/contacts/{id}/tasks` | Solo intents en `EVA_TASK_INTENTS` |
| Custom fields | `PUT` | `/contacts/{id}` | Solo si `GHL_SYNC_MODE=live` **y** `GHL_WRITE_CUSTOM_FIELDS=true` **y** mapa válido |

**No implementado en live sync:**
- Pipeline / opportunity / stage
- Webhook saliente hacia GHL (pull model — Eva llama API GHL)
- Merge automático si >1 contacto (falla con `skip_duplicate`)

---

## 5. Payload dry_run — ejemplos por intent

Fuente: `wa_ghl_sync_log` + código `buildGHLDryRunPayload()` / `syncGHLContactLive()`.

**Leandro (`+529991525583`, sesión 7G.4R):** contacto ya existe en `wa_contacts_state` → `would_update_contact` (no create).  
**Smoke 7G.3A (`+52555740001`):** sin `ghl_contact_id` → `would_create_contact`.

En ambos casos: `custom_fields_written=false`, `custom_fields_skipped_reason=ghl_sync_mode_not_live`.

### Contacto base (create vs update)

**Create** (sin `ghl_contact_id` en `wa_contacts_state`):

```json
{
  "phone": "+529991525583",
  "source": "YCloud / Eva WA",
  "tags": ["eva-wa", "<intent_tag>"],
  "customFields": { "<wa_field_keys>": "..." }
}
```

**Update** (con `ghl_contact_id` existente — caso Leandro):

```json
{
  "id": "<ghl_contact_id>",
  "phone": "+529991525583",
  "tags_to_add": ["eva-wa", "<intent_tag>"],
  "customFields": { "<preview only in dry_run>" }
}
```

> En **live 7G.5A** con `GHL_WRITE_CUSTOM_FIELDS=false`, el `PUT` de custom fields **no se ejecuta**. Tags/notes/tasks sí.

### Tabla acciones por intent

| Intent | Tags (`eva-wa` +) | Task | Pipeline | Custom fields (7G.5A) | Prioridad | Escalación |
|--------|-------------------|:----:|:--------:|:---------------------:|-----------|------------|
| `carreras_disponibles` | `wa_interes_carreras` | No | No | OFF | Baja | No |
| `carrera_interes` | `wa_interes_carrera` | No | No | OFF | Baja | No |
| `no_se_que_estudiar` | `wa_interes_test` | No | No | OFF | Baja | No |
| `humano` | `wa_requiere_asesor` | **Sí** | No | OFF | Alta | Sí |
| `beca` | `wa_interes_beca` | **Sí** | No | OFF | Media | Sí |
| `post_test` | `wa_post_test` | **Sí** | No | OFF | Media | Sí |
| `duda_test` | `wa_duda_test` | **Sí** | No | OFF | Alta | Sí |
| `ambiguo` | `wa_interes_info` | No | No | OFF | Baja | No |
| `sin_texto` | `wa_sin_texto` | No | No | OFF | Baja | No |

### Task titles (live)

| Intent | Título task |
|--------|-------------|
| `humano` | Atender lead WhatsApp — Solicita asesor |
| `duda_test` | Atender lead WhatsApp — Soporte test vocacional |
| `beca` | Atender lead WhatsApp — Interés en beca |
| `post_test` | Atender lead WhatsApp — Revisar resultado test |

### Note (dry_run vs live)

- **Dry-run prefix:** `[Eva WA dry-run] <timestamp>`
- **Live prefix:** `Eva WA — interacción WhatsApp` + `Modo WhatsApp: <WA_AGENT_MODE>`

Campos en nota: teléfono, intent, prioridad, escalamiento, responsable, horario, mensaje, respuesta Eva, `wa_stage`, `wa_needs_human`, resumen, timestamp, fuente.

### Ejemplos Leandro 7G.4R (dry_run real)

| Mensaje | Intent | Action | Tags | Task |
|---------|--------|--------|------|:----:|
| `1` | carreras_disponibles | would_update_contact | eva-wa, wa_interes_carreras | No |
| `Derecho online` | carrera_interes | would_update_contact | eva-wa, wa_interes_carrera | No |
| `No sé que estudiar` | no_se_que_estudiar | would_update_contact | eva-wa, wa_interes_test | No |
| `Tengo promedio 9.8, que beca me toca?` | beca | would_update_contact | eva-wa, wa_interes_beca | **Sí** |

### Estado contacto Leandro

| Campo | Valor |
|-------|-------|
| `normalized_phone` | `+529991525583` |
| `ghl_contact_id` | `ZPqb7Jit2zn64uaME9Cp` (desde fase 7E previa) |
| Implicación 7G.5A | `update_contact` — **no** crear contacto nuevo; agregar tags + notes (+ 1 task en beca) |

---

## 6. Custom fields — estado OFF (7G.5A)

### Gate en código (`resolveCustomFieldsWriteDecision`)

Custom fields **solo** se escriben si **las tres** condiciones:

1. `GHL_SYNC_MODE=live`
2. `GHL_WRITE_CUSTOM_FIELDS=true`
3. `GHL_WA_FIELD_MAP` válido (8 keys)

Con configuración actual (`GHL_WRITE_CUSTOM_FIELDS=false`):

- `skippedReason`: **`ghl_write_custom_fields_disabled`**
- `custom_fields_written`: **false**

### 8 campos WA (reservados para 7G.5B)

| Key lógico | Uso |
|------------|-----|
| `wa_last_intent` | Último intent clasificado |
| `wa_last_message_at` | Timestamp ISO |
| `wa_stage` | Etapa WA (ej. `beca_interes`, `carrera_interes`) |
| `wa_needs_human` | `true`/`false` |
| `wa_summary` | Resumen operativo |
| `wa_source` | `YCloud / Eva WA` |
| `wa_last_inbound_text` | Último mensaje usuario (PII) |
| `wa_last_outbound_text` | Última respuesta Eva |

### Campos protegidos (nunca sobrescribir)

`carrera_recomendada`, `match_percent`, `sector_principal`, `dictamen_url`, `test_completed_at`, `test_version`, `beca_elegible`, `lead_score`, `lead_class`, `promedio`, `email`, `firstName`, `lastName`

**7G.5A:** custom fields **OFF** — confirmado por diseño y flags actuales.

---

## 7. Allowlist — gap crítico

### Estado actual

**No existe** variable `GHL_LIVE_ALLOWED_PHONES` ni chequeo de teléfono en `syncGHLContactLive()`.

Si Leandro activa `GHL_SYNC_MODE=live` hoy, **cualquier** inbound procesado (incl. números fuera de piloto) dispararía escritura GHL.

### Propuesta para 7G.5A (implementar antes de live)

```
GHL_LIVE_ALLOWED_PHONES=+529991525583
```

Comportamiento sugerido en `syncGHLContact()` o inicio de `syncGHLContactLive()`:

1. Si `GHL_SYNC_MODE !== live` → dry_run (actual).
2. Si `live` y teléfono **no** en allowlist → log `wa_ghl_sync_log` con `status=skipped_allowlist`, **sin** llamada GHL API.
3. Si `live` y teléfono en allowlist → flujo live actual.

Formato: lista separada por comas, E.164, normalizar con `normalizePhoneMX`.

**Alternativa temporal (no recomendada):** mantener `WA_AGENT_MODE=mock` para bloquear inbound real mientras se prueba GHL — insuficiente si hay POST/runner accidental.

---

## 8. Propuesta 7G.5A — GHL live controlado (sin custom fields)

| Parámetro | Valor propuesto |
|-----------|-----------------|
| `WA_AGENT_MODE` | `mock` (recomendado) **o** `live_outbound` si Leandro quiere WA+GHL juntos |
| `GHL_SYNC_MODE` | `live` |
| `GHL_WRITE_CUSTOM_FIELDS` | **`false`** |
| `LLM_MODE` | `rewrite` (estado actual) |
| Allowlist | `GHL_LIVE_ALLOWED_PHONES=+529991525583` (**requiere implementación**) |
| Participante | Solo Leandro |
| Volumen | Máx. **3–5** mensajes, uno por uno |
| Custom fields | **No** |
| Meta Ads | **No** |

### Casos sugeridos (mínimo)

| # | Mensaje | Intent | GHL esperado |
|---|---------|--------|--------------|
| 1 | `1` | carreras_disponibles | tags + note |
| 2 | `Derecho online` | carrera_interes | tags + note |
| 3 | `No sé qué estudiar` | no_se_que_estudiar | tags + note |
| 4 | `Tengo promedio 9.8, qué beca me toca` | beca | tags + note + **task** |

Opcional 5: `Quiero hablar con asesor` → task alta prioridad.

### Validación por caso

- [ ] `wa_ghl_sync_log.sync_mode=live`, `status=ok`
- [ ] `ghl_contact_id` = `ZPqb7Jit2zn64uaME9Cp` (update, no duplicado)
- [ ] Tags correctos en GHL UI
- [ ] Note visible con intent + mensaje
- [ ] Task solo en beca/humano/post_test/duda_test
- [ ] `custom_fields_written=false`
- [ ] `wa_errors` críticos = 0
- [ ] Ningún contacto fuera de allowlist afectado

---

## 9. Propuesta 7G.5B — Custom fields live (posterior)

| Parámetro | Valor |
|-----------|-------|
| Prerrequisito | 7G.5A PASS |
| `GHL_WRITE_CUSTOM_FIELDS` | `true` |
| `GHL_WA_FIELD_MAP` | Mapa 8 IDs validado en GHL UI |
| Allowlist | Misma o ampliada gradualmente |
| Riesgo extra | PII en `wa_last_inbound_text` / `wa_last_outbound_text` |

Referencia previa: fase 7E escribió custom fields con éxito — **no repetir** hasta 7G.5B explícito.

---

## 10. Rollback inmediato

### Dashboard InsForge

```
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
WA_AGENT_MODE=mock
```

### Validación post-rollback

```bash
node tests/run-phase7g3a-classifier-hotfix.mjs
```

Esperado: **14/14 PASS**, `mode=mock`, `outbound_real=false`, `ghl_dry_run=true`.

### Verificación SQL

```sql
SELECT sync_mode, status, count(*)
FROM wa_ghl_sync_log
WHERE created_at > now() - interval '1 hour'
GROUP BY 1, 2;
```

Tras rollback, nuevos registros deben ser `dry_run` / `dry_run`.

---

## 11. Riesgos y criterios de interrupción

| Riesgo | Severidad | Acción |
|--------|-----------|--------|
| **Sin allowlist** — GHL live afecta cualquier número | **Crítica** | Rollback inmediato; no activar live sin patch |
| Contacto duplicado en GHL (`contacts.length > 1`) | Alta | Sync aborta `skip_duplicate`; revisar CRM manual |
| Task duplicada por cada mensaje beca/humano | Media | Aceptable en piloto; limpiar tasks en GHL si molesta |
| Tag incorrecto | Media | Rollback + corregir `INTENT_TAG_MAP` |
| Note con información incorrecta | Media | Rollback; notas no se editan auto |
| Custom fields escritos con flag `false` | **Crítica** | Rollback; bug en `resolveCustomFieldsWriteDecision` |
| GHL live fuera de allowlist | **Crítica** | Rollback inmediato |
| Error GHL 4xx/5xx | Alta | Rollback si persiste; revisar API key / location |
| `wa_errors` críticos (`ghl_live_failed`, etc.) | Alta | Rollback |
| Escritura a contacto que no es Leandro | **Crítica** | Rollback + auditoría `wa_ghl_sync_log` |

### Señales de rollback automático (operador)

1. Cualquier `wa_ghl_sync_log` con `normalized_phone != +529991525583` y `sync_mode=live`
2. `custom_fields_written=true` en 7G.5A
3. `status=failed` en 2+ casos consecutivos
4. Duplicado de contacto creado para Leandro

---

## 12. Checklist 7G.5A (pre-activación)

- [ ] Implementar y desplegar `GHL_LIVE_ALLOWED_PHONES`
- [ ] Confirmar `WA_AGENT_MODE=mock` (o live_outbound si acordado)
- [ ] Confirmar `GHL_WRITE_CUSTOM_FIELDS=false`
- [ ] Backup mental: `ghl_contact_id` Leandro = `ZPqb7Jit2zn64uaME9Cp`
- [ ] Leandro autoriza por escrito activación `GHL_SYNC_MODE=live`
- [ ] Ventana de prueba acotada (≤5 mensajes)
- [ ] Rollback script listo (secrets + smoke)
- [ ] Revisar GHL UI antes/después (tags, notes, tasks)
- [ ] **No** ejecutar `run-phase7e-wa-live-ghl-live.mjs` (POST simulado + CF)

---

## 13. Lo que NO se hizo en 7G.4S

- No `GHL_SYNC_MODE=live`
- No `GHL_WRITE_CUSTOM_FIELDS=true`
- No `WA_AGENT_MODE=live_outbound`
- No POST a GHL API
- No contactos/tasks/tags reales creados
- No Meta Ads
- No commit (pendiente autorización Leandro)

### Commit sugerido (cuando autorice)

```
docs: add ghl live safety preflight for eva wa
```

Archivo: `docs/phase-7g4s-ghl-live-safety-preflight.md`

---

## 14. Decisión recomendada

| Orden | Acción |
|-------|--------|
| 1 | **Aprobar reporte 7G.4S** y commit del doc |
| 2 | **Implementar allowlist** `GHL_LIVE_ALLOWED_PHONES` en handler |
| 3 | **Autorizar 7G.5A** con flags: `GHL_SYNC_MODE=live`, `GHL_WRITE_CUSTOM_FIELDS=false`, allowlist Leandro |
| 4 | Ejecutar 3–5 mensajes reales WhatsApp (si `live_outbound`) o runner mock con GHL live solo si se diseña runner dedicado |
| 5 | Rollback + smoke 7G.3A |
| 6 | **7G.5B** custom fields — fase separada, post-7G.5A PASS |

**No avanzar a 7G.5 hasta que Leandro autorice explícitamente**, preferiblemente después del patch de allowlist.
