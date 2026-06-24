# Eva WA en InsForge — Implementacion

## Estado general

| Fase | Estado |
|---|---|
| Fase 1 | ✅ Mock/controlado |
| Fase 2A | ✅ Inbound real YCloud confirmado |
| Fase 2B | 🟡 Desplegado — outbound real pendiente de `live_outbound` |

- Proyecto InsForge: operativo.
- Edge Function: `ycloud-wa-inbound` activa.
- **Inbound YCloud real:** confirmado (2026-06-18).
- **Outbound:** mock (`WA_AGENT_MODE=mock`).
- **GHL:** no conectado.

## Inbound real confirmado (Fase 2A)

Primer mensaje real registrado:

| Campo | Valor |
|---|---|
| `event type` | `whatsapp.inbound_message.received` |
| `message_text` | Hola prueba webhook |
| `from` | `+529991525583` |
| `to` (business) | `+529994538421` |
| `wabaId` | `1030437279324035` |
| `ycloud_message_id` | `6a3374c553bdfa4eb63b792a` |
| `status` | `processed_inbound_mock` |
| `raw_payload` | Real YCloud ✅ |
| `inbound_id` | `904a814e-0f82-4e0a-bb47-eaab8174ba96` |

Fixture sanitizado: `tests/payloads/ycloud-real-inbound-sanitized.json`

## Número WhatsApp Business YCloud (documentado)

- **Número business (`from` outbound / `to` inbound):** `+529994538421`
- **WABA ID:** `1030437279324035`

## Tablas

- `wa_inbound_messages`
- `wa_outbound_messages`
- `wa_contacts_state`
- `wa_errors`

## Edge Function

- Slug: `ycloud-wa-inbound`
- Endpoint: `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`
- Fuente: `insforge/functions/ycloud-wa-inbound.js`
- Helper outbound (prep): `insforge/functions/lib/send-ycloud-message.js`

## Flujo actual (Fase 2A → 2B prep)

```
YCloud webhook → ycloud-wa-inbound → parse/normalize → wa_inbound_messages
  → classify intent → sendYCloudMessage (dry-run si mock)
  → wa_outbound_messages (status=mocked) → wa_contacts_state → HTTP 200
```

## Variables de entorno

| Variable | Estado | Uso |
|---|---|---|
| `WA_AGENT_MODE` | `mock` | Gate outbound real |
| `YCLOUD_WEBHOOK_SECRET` | configurar en InsForge | Firma inbound |
| `YCLOUD_BUSINESS_NUMBER` | documentado `+529994538421` | `from` outbound / skip propios |
| `YCLOUD_WABA_ID` | documentado `1030437279324035` | Referencia |
| `YCLOUD_API_KEY` | pendiente Fase 2B | Outbound real |
| `EVA_TEST_URL` | default OK | Links respuestas |
| `LANDING_CARRERAS_URL` | default OK | Links respuestas |

## Documentacion relacionada

- Webhook inbound: `docs/ycloud-webhook-setup.md`
- Outbound Fase 2B: `docs/ycloud-outbound-setup.md`
- Pruebas: `docs/testing-plan.md`

## Fase 2B — Cerrada ✅

- Outbound real YCloud validado (`status: accepted`)
- 1 mensaje real enviado y confirmado
- **Acción seguridad:** volver `WA_AGENT_MODE=mock` en InsForge dashboard

## Fase 3 — Siguiente

Ver `docs/ghl-phase-3-plan.md` — GHL como CRM, dry-run primero, upsert por teléfono sin pisar campos del test.
