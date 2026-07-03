# 7G.6E — Runbook activación / rollback (live controlado)

**Fase:** 7G.6E-PREP  
**Estado:** Documentación únicamente — **NO EJECUTAR SIN AUTORIZACIÓN FIRMADA**

> ⚠️ **NO EJECUTAR** ningún paso de activación hasta que Leandro firme `phase-7g6e-live-authorization-template.md` y `run-phase-7g6e-live-readiness-strict.mjs` reporte **PASS** con working tree clean.

---

## 1. Matriz GO / NO-GO

### GO (proceder a activación)

| # | Criterio |
|---|----------|
| G1 | Autorización firmada con perfil A/B/C marcado |
| G2 | `run-phase-7g6e-live-readiness-strict.mjs` **PASS** |
| G3 | `phase-7g6d-pre-live-checklist.md` completado |
| G4 | Allowlist E.164 cargada en InsForge (valores reales, no repo) |
| G5 | Asesores + monitoreo + rollback owner presentes |
| G6 | `wa_errors` críticos = 0 (30 min) |
| G7 | Runtime actual = mock/dry_run antes de cambiar flags |

### NO-GO (abortar activación)

| # | Criterio |
|---|----------|
| N1 | Cualquier suite de regresión falla |
| N2 | Flag live detectado sin autorización previa |
| N3 | Autorización no firmada o expirada |
| N4 | Allowlist vacía o E.164 en repo |
| N5 | Asesor / rollback owner no disponible |
| N6 | Incidente abierto sin cerrar |

---

## 2. Perfiles de activación

### Perfil A — Solo WhatsApp live, GHL dry_run (recomendado primero)

| Secret | Valor |
|--------|-------|
| `WA_AGENT_MODE` | `live_outbound` |
| `GHL_SYNC_MODE` | `dry_run` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` |
| `EVA_LLM_ENABLED` | `false` |
| `GHL_LIVE_ALLOWED_PHONES` | CSV E.164 allowlist |

**Validar post-activación:** `outbound_real=true`, `ghl_live=false`, `ghl_sync_mode=dry_run`.

### Perfil B — WhatsApp live + GHL live, sin custom fields

| Secret | Valor |
|--------|-------|
| `WA_AGENT_MODE` | `live_outbound` |
| `GHL_SYNC_MODE` | `live` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` |
| `EVA_LLM_ENABLED` | `false` |
| `GHL_LIVE_ALLOWED_PHONES` | CSV E.164 allowlist |

**Validar:** `ghl_live=true`, `ghl_synced=true`, `custom_fields_written=false`.

### Perfil C — WhatsApp live + GHL live + custom fields

| Secret | Valor |
|--------|-------|
| `WA_AGENT_MODE` | `live_outbound` |
| `GHL_SYNC_MODE` | `live` |
| `GHL_WRITE_CUSTOM_FIELDS` | `true` |
| `EVA_LLM_ENABLED` | `false` |
| `GHL_LIVE_ALLOWED_PHONES` | CSV E.164 allowlist |

**Validar:** tags, notes, tasks, campos `wa_*` en GHL para allowlist.

---

## 3. Activación — pasos exactos

**NO EJECUTAR SIN AUTORIZACIÓN**

### Pre-activación (obligatorio)

```powershell
# Working tree must be clean
git status
git rev-parse HEAD
git rev-parse origin/main

$env:PHASE_7G6D_STRICT_GIT="1"
node tests/run-phase-7g6e-live-readiness-strict.mjs
```

### Secuencia común (todos los perfiles)

| Paso | Acción | NO EJECUTAR sin GO |
|:----:|--------|:--------------------:|
| 1 | Confirmar autorización firmada | ☐ |
| 2 | Cargar `GHL_LIVE_ALLOWED_PHONES` en InsForge | ☐ |
| 3 | Perfil A/B/C: ajustar `GHL_SYNC_MODE` si aplica | ☐ |
| 4 | Redeploy `ycloud-wa-inbound` si secrets no hot-reload | ☐ |
| 5 | Perfil B/C: confirmar GHL connectivity | ☐ |
| 6 | Perfil C: `GHL_WRITE_CUSTOM_FIELDS=true` | ☐ |
| 7 | `WA_AGENT_MODE=live_outbound` | ☐ |
| 8 | Probe desde `+52XXXXXXXXXX_TEST_1` | ☐ |

### Probe post-activación (desde terminal local — NO commitear teléfono real)

```powershell
# Reemplazar placeholders con E.164 real en sesión local solamente
$env:PHASE7G6E_FROM="+52XXXXXXXXXX_TEST_1"
node -e "
fetch('https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound', {
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body: JSON.stringify({
    event_type:'whatsapp.inbound_message.received',
    from: process.env.PHASE7G6E_FROM,
    to:'+529994538421',
    message_id:'7g6e-probe-'+Date.now(),
    message_type:'text',
    message_text:'1',
    timestamp:new Date().toISOString()
  })
}).then(r=>r.json()).then(console.log)
"
```

**Esperado (allowlist):** `ok=true`, `mode=live_outbound`, `outbound_real=true`, `ghl_allowlist_matched=true`.

### During-live (primera hora)

Ver `phase-7g6d-controlled-live-activation-plan.md` §12 y guion `phase-7g6c-admissions-operator-script.md`.

---

## 4. Rollback — pasos exactos

**NO EJECUTAR** salvo fin de sesión, revocación o incidente.

| Paso | Secret | Valor rollback |
|:----:|--------|----------------|
| 1 | `WA_AGENT_MODE` | **`mock`** |
| 2 | `GHL_WRITE_CUSTOM_FIELDS` | **`false`** |
| 3 | `GHL_SYNC_MODE` | **`dry_run`** |
| 4 | `GHL_LIVE_ALLOWED_PHONES` | owner-only mínimo |
| 5 | Redeploy si aplica | |
| 6 | Verificar flags | ver §5 |

### Verificación post-rollback

```powershell
node tests/run-phase-7g6d-live-readiness.mjs
node tests/run-phase-7g6c-controlled-admissions-pilot.mjs
```

**Esperado:**

```
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
EVA_LLM_ENABLED=false
outbound_real=false
ghl_live=false
custom_fields_written=false
```

Detalle operativo: `phase-7g6d-rollback-checklist.md`.

---

## 5. Stop criteria (rollback inmediato)

- Respuesta WA duplicada
- Sin respuesta WA 2× seguidas
- Contacto duplicado GHL
- Task incorrecta / beca incorrecta
- Campo protegido modificado
- Error 4xx/5xx YCloud/GHL
- `wa_errors` crítico
- `allowlist_matched=false` en número autorizado

---

## 6. Recomendación de secuencia

| Orden | Perfil | Cuándo |
|:-----:|--------|--------|
| 1 | **A** | Primera sesión live — validar WA outbound real |
| 2 | **B** | Tras A PASS — validar GHL tags/notes/tasks |
| 3 | **C** | Tras B PASS — validar custom fields `wa_*` |

**Recomendación inicial:** **Perfil A primero.**

---

## Referencias

| Documento | Uso |
|-----------|-----|
| `phase-7g6e-live-authorization-template.md` | Autorización firmada |
| `phase-7g6e-secrets-allowlist-checklist.md` | Secrets gate |
| `phase-7g6d-pre-live-checklist.md` | Pre-live |
| `phase-7g6d-rollback-checklist.md` | Rollback operativo |
