# YCloud Webhook Setup — Eva WA

## Fase 2A — Cerrada ✅

Inbound real confirmado el **2026-06-18**:

- Event: `whatsapp.inbound_message.received`
- Business number (`to`): `+529994538421`
- WABA ID: `1030437279324035`
- Fixture: `tests/payloads/ycloud-real-inbound-sanitized.json`

## Endpoint webhook

```
POST https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound
```

## Modo actual

- **Inbound:** acepta payload real de YCloud y lo guarda en `wa_inbound_messages`.
- **Outbound:** sigue en modo **mock** (`WA_AGENT_MODE=mock`).
- **GHL:** no conectado.
- **WhatsApp real:** no se envían mensajes salientes.

## Pasos en YCloud Console

1. Ingresar a **Developers → Webhook**.
2. Click **Add Endpoints**.
3. Configurar:
   - **URL:** `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`
   - **Method:** `POST`
   - **Events:** suscribir al menos:
     - `whatsapp.inbound.message` (mensajes entrantes)
   - Opcional para monitoreo (se ignoran en procesamiento):
     - `whatsapp.message.updated`
4. Guardar el **webhook secret** (`whsec_...`) de forma segura.
5. Copiar ese secret a InsForge como variable `YCLOUD_WEBHOOK_SECRET`.

## Variables de entorno esperadas (InsForge Function)

| Variable | Requerida Fase 2A | Valor sugerido | Uso |
|---|---|---|---|
| `WA_AGENT_MODE` | No (default `mock`) | `mock` | Bloquea outbound real |
| `YCLOUD_WEBHOOK_SECRET` | Recomendada | `whsec_...` | Validar firma `YCloud-Signature` |
| `YCLOUD_BUSINESS_NUMBER` | Recomendada | `+529994538421` | Ignorar mensajes propios / outbound `from` |
| `YCLOUD_WABA_ID` | Opcional | `1030437279324035` | Referencia WABA |
| `EVA_TEST_URL` | Opcional | `https://testunilatino.algorithmus.io` | Links en respuestas mock |
| `LANDING_CARRERAS_URL` | Opcional | `https://magenta-kangaroo.vercel.app` | Links en respuestas mock |

### Reglas de comportamiento

- Si `WA_AGENT_MODE=mock` → nunca envía WhatsApp real.
- Si falta `YCLOUD_WEBHOOK_SECRET` → registra warning en `wa_errors`, no rompe en mock.
- Si existe secret + header `YCloud-Signature` → valida HMAC-SHA256 (`{timestamp}.{raw_body}`).
- Si falta `YCLOUD_BUSINESS_NUMBER` → no bloquea; solo usa skip cuando esté definido.

## Validación de firma (YCloud)

Header esperado:

```
YCloud-Signature: t=1654084800,s=8eb70f2a...
```

Algoritmo:

1. Extraer `t` (timestamp) y `s` (signature).
2. Construir `signed_payload = "{t}.{raw_request_body}"`.
3. Calcular `HMAC-SHA256(signed_payload, YCLOUD_WEBHOOK_SECRET)`.
4. Comparar con `s`.

## Cómo validar que llegó un mensaje real

1. Enviar WhatsApp de prueba al número conectado en YCloud.
2. Revisar respuesta HTTP 200 del webhook.
3. Consultar tablas:

```sql
-- Ultimos inbound
select id, ycloud_message_id, normalized_phone, message_text, status, received_at
from wa_inbound_messages
order by received_at desc
limit 20;

-- Ultimos outbound mock
select id, inbound_message_id, status, raw_response, sent_at
from wa_outbound_messages
order by sent_at desc
limit 20;

-- Estado de contacto
select normalized_phone, wa_last_intent, wa_needs_human, wa_last_message_at
from wa_contacts_state
order by wa_last_message_at desc
limit 20;

-- Errores/warnings
select error_type, error_message, created_at
from wa_errors
order by created_at desc
limit 20;
```

## Eventos ignorados (por diseño)

- `whatsapp.message.updated` y similares de status → responde `200` con `skipped: true`.
- Mensajes cuyo `from` coincide con `YCLOUD_BUSINESS_NUMBER` → `skipped: true`.

## Pendientes para Fase 2B

Ver `docs/ycloud-outbound-setup.md`:

- Configurar `YCLOUD_API_KEY` en InsForge.
- Configurar `YCLOUD_BUSINESS_NUMBER=+529994538421`.
- Activar outbound real solo con `WA_AGENT_MODE=live_outbound`.
