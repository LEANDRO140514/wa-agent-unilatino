# YCloud Outbound Setup — Eva WA (Fase 2B)

## Estado actual

| Item | Estado |
|---|---|
| Función desplegada con `sendYCloudMessage` | ✅ |
| `WA_AGENT_MODE` en runtime | `mock` (default) |
| Outbound real enviado | ⏳ pendiente activación `live_outbound` |
| GHL | no conectado |

## Número WhatsApp Business YCloud (documentado)

| Campo | Valor |
|---|---|
| Número business (`from` outbound / `to` inbound) | `+529994538421` |
| WABA ID | `1030437279324035` |

## Activar prueba live controlada (Leandro)

1. Confirmar secrets en InsForge Function `ycloud-wa-inbound`:
   - `YCLOUD_API_KEY`
   - `YCLOUD_BUSINESS_NUMBER=+529994538421`
   - `YCLOUD_WEBHOOK_SECRET`
   - `YCLOUD_WABA_ID=1030437279324035`
   - `YCLOUD_API_BASE_URL=https://api.ycloud.com/v2`
2. Cambiar temporalmente: `WA_AGENT_MODE=live_outbound`
3. Enviar máximo 3 WhatsApp al `+529994538421`:
   - `Hola, quiero información`
   - `No sé qué estudiar`
   - `Tengo promedio 9.3, qué beca me toca`
4. Verificar `wa_outbound_messages.status` = `accepted`/`sent`
5. Volver a `WA_AGENT_MODE=mock` tras validar

## Evidencia mock post-deploy (2026-06-18)

- `outbound_real=false`, `dry_run=true`, `status=mocked`
- Sin llamada a `api.ycloud.com`

## Endpoint YCloud outbound confirmado

### Recomendado (async, cola)

```
POST https://api.ycloud.com/v2/whatsapp/messages
```

### Alternativa (sync, OTP/instant)

```
POST https://api.ycloud.com/v2/whatsapp/messages/sendDirectly
```

Base URL configurable con `YCLOUD_API_BASE_URL` (default: `https://api.ycloud.com/v2`).

## Headers requeridos

```
Content-Type: application/json
X-API-Key: <YCLOUD_API_KEY>
```

## Payload requerido (text message)

```json
{
  "from": "+529994538421",
  "to": "+529991525583",
  "type": "text",
  "text": {
    "body": "Respuesta de Eva WA",
    "preview_url": false
  }
}
```

### Campos obligatorios según API YCloud

| Campo | Requerido | Notas |
|---|---|---|
| `from` | Sí | Número business E.164 (`+529994538421`) |
| `to` | Sí | Destinatario E.164 |
| `type` | Sí | `text` para mensajes libres |
| `text.body` | Sí (si type=text) | Contenido del mensaje |
| `wabaId` | **No en request** | YCloud lo infiere del `from`; aparece en la respuesta |
| `channelId` | **No** | No aplica en API WhatsApp Messages de YCloud |

## Secrets / variables necesarias

| Variable | Fase 2B | Uso |
|---|---|---|
| `WA_AGENT_MODE` | `mock` → luego `live_outbound` | Gate de envío real |
| `YCLOUD_API_KEY` | Requerida para live | Header `X-API-Key` |
| `YCLOUD_BUSINESS_NUMBER` | Requerida para live | Campo `from` (`+529994538421`) |
| `YCLOUD_WABA_ID` | Opcional | Referencia/logging (`1030437279324035`) |
| `YCLOUD_WEBHOOK_SECRET` | Ya en uso inbound | Validación firma webhook |
| `YCLOUD_API_BASE_URL` | Opcional | Default `https://api.ycloud.com/v2` |

## Helper implementado (sin activar)

Archivo: `insforge/functions/lib/send-ycloud-message.js`

Comportamiento:

- Si `WA_AGENT_MODE !== live_outbound` → **dry-run**, no llama YCloud.
- Retorna `{ sent: false, outbound_real: false, reason: "outbound_disabled" }`.
- Incluye `request` preview del payload que se enviaría.

## Pasos para activar `live_outbound` de forma controlada

1. **Verificar inbound estable** — al menos 1 mensaje real en `wa_inbound_messages` (✅ hecho).
2. **Configurar secrets en InsForge** (sin commitear):
   - `YCLOUD_API_KEY`
   - `YCLOUD_BUSINESS_NUMBER=+529994538421`
   - `YCLOUD_WABA_ID=1030437279324035` (opcional)
   - Mantener `YCLOUD_WEBHOOK_SECRET`
3. **Probar dry-run** — confirmar que con `WA_AGENT_MODE=mock` no hay llamadas a `api.ycloud.com`.
4. **Prueba controlada única:**
   - Cambiar temporalmente a `WA_AGENT_MODE=live_outbound`
   - Enviar 1 mensaje de prueba a número autorizado
   - Verificar en `wa_outbound_messages`:
     - `status` ≠ `mocked`
     - `provider_response_id` poblado
     - `raw_response.outbound_real = true`
5. **Monitorear webhooks** — `whatsapp.message.updated` para confirmar `sent`/`delivered`.
6. **Rollback inmediato** si falla — volver a `WA_AGENT_MODE=mock`.

## Ventana de servicio WhatsApp

- Mensajes `type: text` libres solo dentro de la ventana de 24h tras último mensaje del usuario.
- Fuera de ventana → usar templates aprobados (`type: template`).

## Fixture inbound real sanitizado

`tests/payloads/ycloud-real-inbound-sanitized.json`

- PII redactada (`wamid`, `fromUserId`, `customerProfile.name`).
- Conserva estructura real YCloud para regresión del parser.
