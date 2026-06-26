# 7G.7C.3-PREFLIGHT — GHL Live Allowlist Single Phone

**Estado:** ✅ **PREFLIGHT APROBADO** — listo para autorizar 7G.7C.3 live; **sin cambios de flags en esta fase**  
**Fecha:** 2026-06-26  
**Base:** `30ff5e4` → `76d60a7` → `7af73b0`  
**Deploy activo:** `ycloud-wa-inbound` · `updatedAt=2026-06-26T05:07:29.604Z`

---

## 1. Estado git

| Check | Resultado |
|-------|-----------|
| **HEAD** | `30ff5e486c439755fb125ce7ec74e3ca9c69340f` |
| **7G.7C.1** | `76d60a7` — wiring qualified sync ✅ |
| **7G.7C.2** | `30ff5e4` — reporte deploy dry_run ✅ |
| Working tree | Pendientes no relacionados **sin commit** ✅ |

### Pendientes locales excluidos (no mezclados)

```txt
docs/phase-7g6c-*
docs/phase-7g8-*
docs/phase-7g6d-organic-limited-prep.md
reportes 7G.3A / 7G.6C / 7G.7B.1 regenerados
tests/run-phase7g6c-admissions-pilot*.mjs
tests/run-phase7g7c2-qualified-sync-remote.mjs  (local, sin commit)
```

---

## 2. Runtime actual InsForge

Verificado vía probes POST + `ghl_relevance_shadow.policy` + `system.secrets` (keys only):

| Flag / secret | Valor efectivo actual | Objetivo 7G.7C.3 (futuro) |
|---------------|----------------------|---------------------------|
| `WA_AGENT_MODE` | **`mock`** | `mock` |
| `GHL_SYNC_MODE` | **`dry_run`** | `live` ← no cambiado en preflight |
| `GHL_SYNC_POLICY` | **`qualified_only`** | `qualified_only` |
| `GHL_WRITE_CUSTOM_FIELDS` | **`false`** | `true` ← no cambiado en preflight |
| `GHL_LIVE_ALLOWED_PHONES` | **Configurado** (1 teléfono) | `+529991525583` |

### Probe remoto (runtime seguro confirmado)

POST `+529991525583` / carrera calificada:

```json
{
  "mode": "mock",
  "ghl_sync_mode": "dry_run",
  "outbound_real": false,
  "ghl_live": false,
  "ghl_synced": false,
  "ghl_dry_run": true,
  "custom_fields_enabled": false,
  "custom_fields_written": false,
  "policy": "qualified_only",
  "ghl_allowed_phones_count": 1,
  "custom_fields_config_loaded": true,
  "custom_fields_map_valid": true
}
```

**Confirmación:** GHL live **no** abierto en este preflight. WhatsApp real **no** enviado.

### Secrets prerequisito live (existen, no modificados)

| Secret | `is_active` |
|--------|-------------|
| `GHL_API_KEY` | ✅ |
| `GHL_LOCATION_ID` | ✅ |
| `GHL_WA_FIELD_MAP` | ✅ |
| `GHL_LIVE_ALLOWED_PHONES` | ✅ |

---

## 3. Deploy activo

| Campo | Valor |
|-------|-------|
| Function | `ycloud-wa-inbound` |
| Código | 7G.7C.1 (`ghl-sync-policy.js` + handler wiring) |
| **updatedAt** | `2026-06-26T05:07:29.604Z` |
| Status | `active` |
| Deploy nuevo en preflight | **No** |

---

## 4. Validación gate `qualified_only`

Código desplegado (`insforge/functions/lib/ghl-sync-policy.js` + handler) soporta:

| Capacidad | Evidencia |
|-----------|-----------|
| `policy none` | Test A/O — legacy dry_run; live bloqueado |
| `policy all` | Test K — legacy + allowlist en live |
| `policy qualified_only` | Tests C–J + remoto 7G.7C.2 |
| Allowlist live | `resolveGhlSyncAuthorization` L100–106 + `syncGHLContactLive` L1412 |
| `ignored_for_ghl` | Bloqueo `policy_blocked` |
| `would_sync_to_ghl` | Gate obligatorio en qualified_only |
| `qualified_for_ghl` | Check `isQualifiedForGhlSync()` |
| High-value exception | `HIGH_VALUE_ROUTING_REASONS` (cost, human_handoff, enrollment, etc.) |
| `policy_blocked` | `insertGhlPolicyBlockedResult` → `wa_ghl_sync_log` |

Flujo handler (ya desplegado):

```
evaluateGhlRelevance → resolveGhlSyncAuthorization → syncGHLContact | policy_blocked
```

---

## 5. Validación allowlist

| Check | Resultado |
|-------|-----------|
| Teléfono piloto | **`+529991525583`** |
| Único en allowlist | Confirmado `ghl_allowed_phones_count: 1` en sync calificado |
| Fuera de allowlist | Test F — `blocked_allowlist_phone` en live |
| Allowlist en dry_run | No bloquea (`applies: false`) — comportamiento esperado |
| Doble barrera live | Policy gate + `syncGHLContactLive` allowlist check |

---

## 6. Validación custom fields (7G.5B)

**No se crean campos nuevos.** Solo las 8 keys validadas en código:

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

| Check | Resultado |
|-------|-----------|
| `GHL_WA_FIELD_MAP` tocado en preflight | **No** |
| Mapa remoto válido | `custom_fields_map_valid: true` en sync calificado |
| Write live gated | `resolveCustomFieldsWriteDecision` exige `live` + `GHL_WRITE_CUSTOM_FIELDS=true` + mapa válido |
| Campos protegidos | `GHL_PROTECTED_FIELDS` excluidos del PUT |
| Keys prohibidas | `promedio`, `wa_test_checkbox_a`, id `yBz675YEp1pdvwnvloXP` rechazados (7G.5B) |

**Nota 7G.7C.3:** activar `GHL_WRITE_CUSTOM_FIELDS=true` solo tras confirmar mapa en Dashboard; el código ya valida antes de PUT.

---

## 7. Validación tasks

| Regla | Evidencia |
|-------|-----------|
| No task duplicada post-escalación | 7G.6D 4/4 + remoto C2 `post_escalation_closure_no_sync` |
| Task gobernada por gate | `shouldCreateTaskLive` → `ghlWouldCreateTask` si `ghlSyncGovernedByGate` |
| Costo sin validación → task | Test E + remoto C3 `cost_signal_requires_human_validation` |
| Asesor → task/handoff | Test J/C4 `human_handoff` / `explicit_human_handoff` |
| Carrera calificada sin task | Test D + remoto C6 |

---

## 8. Validación bloqueos

| Caso | Bloquea sync | Evidencia |
|------|--------------|-----------|
| Saludo simple | ✅ | Remoto C1, Test C |
| Gracias post-escalación | ✅ | Remoto C2, Test H |
| Bye post-escalación | ✅ | Remoto C2, 7G.6D |
| Spam | ✅ | 7G.7B Test J |
| Media sin texto | ✅ | 7G.7B Test G |
| Off-topic | ✅ | Remoto C7 |
| Meta Ads first saludo | ✅ | Remoto C5, Test I |
| Teléfono fuera allowlist (live) | ✅ | Test F |
| Costo sin validación | Sync **con** task/handoff (no bloqueo total) | Test E, remoto C3 |

---

## 9. Resultados de suites

| Runner | Resultado |
|--------|-----------|
| `run-phase7g7c-qualified-sync.mjs` | **15/15 PASS** |
| `run-phase7g7b-ghl-relevance-shadow.mjs` | **22/22 PASS** |
| `run-phase7g6d-conversation-hotfix.mjs` | **4/4 PASS** |
| `run-phase7g3a-classifier-hotfix.mjs` | **14/14 PASS** |
| `run-phase7g5b-custom-fields-preflight.mjs` | **9/9 PASS** |
| `run-phase7g7c2-qualified-sync-remote.mjs` (local, sin commit) | **8/8 PASS** |

---

## 10. Riesgos

| ID | Riesgo | Mitigación |
|----|--------|------------|
| R1 | Primera escritura GHL real en contacto `+529991525583` | Piloto acotado 3–5 mensajes; matriz 7G.7C |
| R2 | `GHL_WRITE_CUSTOM_FIELDS=true` escribe en GHL UI | Activar solo tras mapa válido; verificar en GHL post-sync |
| R3 | Live no probado end-to-end aún | Solo dry_run + policy validados; 7G.7C.3 es piloto controlado |
| R4 | Contactos duplicados en GHL | `syncGHLContactLive` aborta si >1 contacto por teléfono |
| R5 | Redeploy puede requerirse tras cambio secrets | Documentado en 7G.5A — verificar smoke tras flip flags |
| R6 | Saludo en allowlist phone con menú `"1"` | Ahora `policy_blocked` (qualified_only) — no sync legacy |

**wa_errors críticos** (últimos 60 min: `function_error`, `ghl_live_failed`, `outbound_live_failed`, `ghl_sync_failed`): **0**

---

## 11. Rollback

Orden acordado (sin ejecutar en preflight):

```txt
1. WA_AGENT_MODE=mock
2. GHL_WRITE_CUSTOM_FIELDS=false
3. GHL_SYNC_MODE=dry_run
4. GHL_SYNC_POLICY=none
5. GHL_LIVE_ALLOWED_PHONES=+529991525583
```

Smoke post-rollback: probe `"1"` o `run-phase7g7c2-qualified-sync-remote.mjs`.

Código soporta rollback sin redeploy (`GHL_SYNC_POLICY=none` restaura legacy dry_run).

---

## 12. Decisión: ¿listo para 7G.7C.3 live?

### Veredicto: **SÍ — LISTO PARA AUTORIZAR 7G.7C.3 LIVE**

Condiciones cumplidas en preflight:

- Runtime sigue seguro (`mock` + `dry_run` + `qualified_only` + `CF=false`)
- No se abrió GHL live ni WhatsApp real en esta fase
- No se tocaron secrets, `GHL_WA_FIELD_MAP`, ni DB schema
- Todas las suites pasan
- Rollback documentado y soportado por código
- Allowlist single phone confirmado
- Mapa CF válido en runtime remoto
- Gate `qualified_only` gobierna sync (validado dry_run remoto)

### Secuencia propuesta para 7G.7C.3 (requiere autorización explícita)

```txt
1. Confirmar GHL_SYNC_POLICY=qualified_only (ya activo)
2. GHL_SYNC_MODE=live
3. GHL_WRITE_CUSTOM_FIELDS=true
4. Mantener WA_AGENT_MODE=mock
5. Mantener GHL_LIVE_ALLOWED_PHONES=+529991525583
6. Redeploy si runtime no recarga secrets (smoke inmediato)
7. Piloto 3–5 mensajes: carrera, costo/task, asesor
8. Validar wa_ghl_sync_log + GHL UI
9. Rollback a dry_run tras piloto
```

**No iniciar 7G.7C.3 live sin autorización explícita de Leandro.**
