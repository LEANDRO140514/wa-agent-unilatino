# Phase 7D — provider_response_id Investigation

**Date:** 2026-06-23

## Síntoma

Runner 7D marcó `0/5 FAIL` con único error: `provider_response_id missing`, pese a:

- `outbound_status=accepted`
- `outbound_real=true`
- respuestas academic correctas
- GHL dry_run

## Hallazgos (wa_outbound_messages)

Los 5 `outbound_id` de la prueba tienen **provider_response_id en DB** y en `raw_response`:

| outbound_id | provider_response_id | raw_response.response.id |
|---|---|---|
| `fe7831c1-f701-40f8-9705-f22acadf9431` | `6a39d7b1ea37435232ae0b70` | `6a39d7b1ea37435232ae0b70` |
| `eabbed02-0da9-4bc6-893f-72496e4b5500` | `6a39d7b4c140b54d5e92c15a` | `6a39d7b4c140b54d5e92c15a` |
| `aca4f48f-de49-43ab-aa09-eb52d1267a60` | `6a39d7b8ea37435232ae0b97` | `6a39d7b8ea37435232ae0b97` |
| `f618db0c-5c11-4004-b5ec-d5c08a8ff34c` | `6a39d7bbc140b54d5e92c16f` | `6a39d7bbc140b54d5e92c16f` |
| `cab557a5-64e2-44a3-b5a6-a8a68cbc9e85` | `6a39d7bfea37435232ae0bb6` | `6a39d7bfea37435232ae0bb6` |

## Campo real YCloud

`POST https://api.ycloud.com/v2/whatsapp/messages` responde JSON con:

```json
{
  "id": "6a39d7b1ea37435232ae0b70",
  "status": "accepted",
  "wabaId": "1030437279324035",
  "type": "text",
  "from": "+529994538421",
  "to": "+529991525583",
  ...
}
```

El handler ya mapeaba correctamente en `sendYCloudMessage()`:

```javascript
provider_response_id: responseBody?.id || null
```

Y persistía en `wa_outbound_messages.provider_response_id` y `raw_response.response`.

## Causa raíz del FAIL del runner

El **webhook HTTP** (`webhookResponse`) **no incluía** `provider_response_id` en el JSON de respuesta.

El runner validaba `body.provider_response_id` del POST response → siempre `undefined`.

## Correcciones aplicadas

1. **Handler** (`ycloud-wa-inbound.js`):
   - `resolveProviderResponseId(ycloudSend)` con fallback `raw_response.id`
   - `webhookResponse` incluye `provider_response_id`
   - **Hotfix 7D.1 desplegado** 2026-06-23
2. **Runner** (`run-phase7d-wa-live-academic.mjs`):
   - `extractProviderResponseId()` — webhook → raw_response → DB fallback
   - Si `outbound_status=accepted` + `outbound_id` sin id en webhook → **WARN**, no FAIL
   - `--recalculate` re-evalúa corrida grabada sin nuevos POSTs

## Recálculo

```bash
node tests/run-phase7d-wa-live-academic.mjs --recalculate
```

**Resultado post-7D.1:** `5/5 PASS` (sin WARN; fixture actualizado con `provider_response_id` en webhook).

## Notas

- No se requirieron nuevos mensajes WhatsApp para la corrección 7D.1.
- `wamid` no viene en estas respuestas YCloud; el id canónico es `id`.
- En `mock`, `webhookResponse.provider_response_id` es `null` pero el campo está presente.
