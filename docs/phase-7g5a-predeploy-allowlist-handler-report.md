# Phase 7G.5A-PREDEPLOY — Deploy handler con GHL allowlist guard

**Estado:** ✅ **COMPLETADO** — handler desplegado; GHL live **no** activado  
**Fecha:** 2026-06-24  
**Commit desplegado:** `4e70e3f9c85e9d09b0e03d4ff4c90c925434a5ef` (`feat: add ghl live allowlist guard`)

---

## Resumen ejecutivo

| Pregunta | Resultado |
|----------|-----------|
| Deploy realizado | **Sí** |
| GHL live activado | **No** |
| WhatsApp live | **No** |
| Escritura GHL real | **No** |
| Allowlist guard en runtime | **Sí** (código desplegado) |
| Secret `GHL_LIVE_ALLOWED_PHONES` | **Pendiente** — Dashboard InsForge (MCP no escribe secrets) |
| Smoke 7G.3A post-deploy | **14/14 PASS** |
| Test 7G.4T (local) | **8/8 PASS** |
| Autorización 7G.5A GHL live | **Pendiente** Leandro |

---

## Preflight local

| Check | Resultado |
|-------|-----------|
| Repo | `C:/Users/vonde/Proyectos/wa-agent-unilatino` |
| HEAD | `4e70e3f` → `6b4554c` → `c9ff7be` |
| Working tree | Limpio |

---

## Preflight InsForge (pre-deploy)

| Flag | Valor confirmado |
|------|------------------|
| `WA_AGENT_MODE` | **`mock`** |
| `GHL_SYNC_MODE` | `dry_run` (inferido) |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` |
| GHL live / WA live_outbound | **No** activos |

Endpoint: `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`

---

## Bundle y deploy

| Campo | Valor |
|-------|-------|
| Script | `node scripts/bundle-ycloud-wa-deploy.mjs` |
| Artefacto | `insforge/functions/dist/ycloud-wa-inbound.deploy.js` |
| Tamaño | **177.1 KB** |
| Función | `ycloud-wa-inbound` |
| Método | MCP `update-function` |
| Status | `active` |
| **updatedAt** | **`2026-06-24T18:59:04.173Z`** |
| Resultado MCP | `success` |

Código desplegado incluye: `parseGhlLiveAllowedPhones`, `resolveGhlLiveAllowlist`, `blocked_allowlist_*`.

---

## Secret allowlist

| Secret | Estado |
|--------|--------|
| `GHL_LIVE_ALLOWED_PHONES` | **Pendiente configurar en InsForge Dashboard** |

Valor recomendado para 7G.5A:

```
GHL_LIVE_ALLOWED_PHONES=+529991525583
```

**Nota:** Configurar este secret **no** activa GHL live. Solo prepara la barrera cuando `GHL_SYNC_MODE=live`.

Evidencia runtime (sin secret): smoke inbound devolvió `ghl_allowed_phones_count: 0`.

---

## Flags InsForge — sin cambios

| Flag | Antes | Después |
|------|-------|---------|
| `WA_AGENT_MODE` | `mock` | `mock` |
| `GHL_SYNC_MODE` | `dry_run` | `dry_run` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` | `false` |

---

## Smoke post-deploy

### 7G.3A — InsForge runtime

```
node tests/run-phase7g3a-classifier-hotfix.mjs
→ 14/14 PASS | Rewrites: 9
```

| Check | OK |
|-------|-----|
| `mode=mock` | ✅ |
| `outbound_real=false` | ✅ |
| `ghl_dry_run=true` | ✅ |
| `ghl_live=false` | ✅ |
| Beca `scholarship_blocked` | ✅ |
| Allowlist no rompe dry_run | ✅ |

### 7G.4T — local (no valida InsForge live)

```
node tests/run-phase7g4t-ghl-live-allowlist.mjs
→ 8/8 PASS
```

- GHL API **stubbed** (`leadconnectorhq.com`)
- Sin llamadas reales externas
- **No** ejercita `GHL_SYNC_MODE=live` en InsForge remoto

### Runtime allowlist metadata — InsForge

POST inbound simulado (`+529991525583`, `"1"`):

```json
{
  "ok": true,
  "mode": "mock",
  "outbound_real": false,
  "ghl_sync_mode": "dry_run",
  "ghl_dry_run": true,
  "ghl_live": false,
  "ghl_synced": false,
  "ghl_sync_status": "dry_run",
  "ghl_allowlist_enabled": false,
  "ghl_allowlist_matched": null,
  "ghl_block_reason": null,
  "ghl_allowed_phones_count": 0,
  "custom_fields_written": false,
  "intent": "carreras_disponibles"
}
```

Interpretación dry_run:
- `ghl_allowlist_enabled: false` — allowlist no bloquea en dry_run ✅
- `ghl_block_reason: null` — sin bloqueo ✅
- `ghl_allowed_phones_count: 0` — secret aún no configurado

---

## wa_errors (post-deploy ~15 min)

Solo `phone_normalization_failed` en payloads de test 7G.3A (`+52555740001` fixture).  
**Sin errores críticos** GHL/outbound/live.

---

## Confirmaciones de seguridad

- [x] No `GHL_SYNC_MODE=live`
- [x] No `GHL_WRITE_CUSTOM_FIELDS=true`
- [x] No `WA_AGENT_MODE=live_outbound`
- [x] No POST real a GHL
- [x] No contactos/tags/notes/tasks reales
- [x] No deploy Orchids / Meta Ads
- [x] No push remoto

---

## Recomendación para 7G.5A (siguiente fase — no iniciar aún)

1. **Leandro:** configurar en InsForge Dashboard:
   ```
   GHL_LIVE_ALLOWED_PHONES=+529991525583
   ```
2. Verificar preflight: `ghl_allowed_phones_count: 1` (inbound dry_run de prueba).
3. **Autorización explícita** para activar temporalmente:
   ```
   GHL_SYNC_MODE=live
   ```
   Mantener: `GHL_WRITE_CUSTOM_FIELDS=false`, `WA_AGENT_MODE=mock` o `live_outbound` según acuerdo.
4. Piloto 3–5 mensajes solo desde `+529991525583`.
5. Validar `wa_ghl_sync_log` + GHL UI.
6. Rollback inmediato: `GHL_SYNC_MODE=dry_run` + smoke 7G.3A.

**Sin `GHL_LIVE_ALLOWED_PHONES` configurado, `GHL_SYNC_MODE=live` bloqueará todo** (`blocked_allowlist_missing`) — comportamiento seguro.

---

## Commit docs

Este reporte: commit local `docs: add 7g5a predeploy allowlist handler report`
