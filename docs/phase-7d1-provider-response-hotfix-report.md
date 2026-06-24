# Phase 7D.1 — provider_response_id Hotfix Report

**Date:** 2026-06-23  
**Status:** ✅ COMPLETE

## Objetivo

Exponer `provider_response_id` en la respuesta HTTP del webhook (`webhookResponse`), alineado con lo que YCloud devuelve y lo que ya se persistía en `wa_outbound_messages`.

## Cambios

### `insforge/functions/ycloud-wa-inbound.js`

1. Nueva función `resolveProviderResponseId(ycloudSend)`:
   - `ycloudSend.provider_response_id` (desde `responseBody.id` en `sendYCloudMessage`)
   - fallback: `raw_response.id` o `raw_response.response.id`

2. `webhookResponse` incluye:
   ```javascript
   provider_response_id: resolveProviderResponseId(ycloudSend)
   ```

3. Insert `wa_outbound_messages` usa el mismo resolver.

### Deploy

| Campo | Valor |
|---|---|
| Artefacto | `insforge/functions/dist/ycloud-wa-inbound.deploy.js` (~154 KB) |
| Método | MCP `update-function` |
| Slug | `ycloud-wa-inbound` |
| Resultado | `updated successfully` |

## Cadena del ID YCloud

```
YCloud POST /whatsapp/messages
  → response.id
    → sendYCloudMessage().provider_response_id
      → raw_response.response.id (storage)
        → wa_outbound_messages.provider_response_id
          → webhookResponse.provider_response_id
```

En modo `mock`: el campo está presente en el webhook con valor `null`.

## Validación post-deploy (sin WhatsApp real)

| Prueba | Resultado |
|---|---|
| `node tests/run-phase7c-insforge-smoke.mjs` | **10/10 PASS** |
| `node tests/run-phase7d-wa-live-academic.mjs --recalculate` | **5/5 PASS** |
| Mock POST verificación 7D.1 | `mode=mock`, `outbound_real=false`, `has_provider_response_id_key=true`, `ghl_live=false` |

**No** se enviaron mensajes WhatsApp reales nuevos (solo smoke mock 7C + 1 POST mock de verificación de campo).

## Flags runtime confirmados

```
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run (ghl_dry_run=true)
GHL_WRITE_CUSTOM_FIELDS=false (custom_fields_written=false)
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=false
```

## Archivos actualizados

- `insforge/functions/ycloud-wa-inbound.js`
- `insforge/functions/dist/ycloud-wa-inbound.deploy.js` (bundle)
- `tests/fixtures/phase7d-recorded-run.json` (webhook con provider_response_id post-hotfix)
- `docs/phase-7d-provider-response-id-investigation.md`
- `docs/phase-7d-wa-live-academic-report.md`
- `docs/phase-7d1-provider-response-hotfix-report.md`

## Recomendación

Mantener `WA_AGENT_MODE=mock` hasta autorización explícita de Leandro para próxima prueba live o GHL live.
