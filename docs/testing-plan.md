# Plan y evidencia de pruebas — Eva WA InsForge

## Fase 2A — Objetivo

Validar inbound YCloud real (parser flexible) con outbound mock:

- HTTP 200 rapido para YCloud
- `raw_payload` guardado completo
- sin outbound WhatsApp real
- sin GHL real
- modo `mock` conservado

## Endpoint bajo prueba

`POST https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`

## Suites de prueba

### Fase 2A — Cerrada

Inbound real confirmado. Fixture: `tests/payloads/ycloud-real-inbound-sanitized.json`

## Fase 2B — Preparación

- Helper: `insforge/functions/lib/send-ycloud-message.js`
- Docs: `docs/ycloud-outbound-setup.md`
- `WA_AGENT_MODE=mock` (sin envío real)

## Suite A — Regresion Fase 1 (7 casos)

Archivo: `tests/payloads/ycloud-test-cases.json`

| Caso | Mensaje | Intent esperado |
|---|---|---|
| 01 | Hola, quiero informacion | `ambiguo` |
| 02 | No se que estudiar | `no_se_que_estudiar` |
| 03 | Tengo promedio 9.3, que beca me toca | `beca` |
| 04 | Me interesa Derecho | `ambiguo` |
| 05 | Ya hice el test | `post_test` |
| 06 | Quiero hablar con un asesor | `humano` |
| 07 | Se trabo el test | `duda_test` |

### Suite B — Payload flexible YCloud (5 casos)

Archivo: `tests/payloads/ycloud-flex-test-cases.json`

| Caso | Escenario | Resultado esperado |
|---|---|---|
| flex-01 | Mock plano (regresion) | `200`, intent `ambiguo`, inbound insertado |
| flex-02 | Nested `whatsappInboundMessage.text.body` | `200`, intent `no_se_que_estudiar` |
| flex-03 | Sin texto (tipo `image`) | `200`, intent `sin_texto` |
| flex-04 | Evento `whatsapp.message.updated` | `200`, `skipped: true`, sin inbound |
| flex-05 | Numero propio de negocio | `200`, `skipped: true` si `YCLOUD_BUSINESS_NUMBER` configurado |

## Criterios de validacion

- HTTP 200 en casos webhook
- `ok: true` cuando procesa inbound
- `mode: "mock"` y `provider: "ycloud"`
- `inbound_id` y `outbound_id` presentes cuando inserta
- `wa_inbound_messages.raw_payload` completo
- `wa_outbound_messages.status = mocked`
- `wa_errors` solo para warnings/errores esperados
- sin llamadas externas reales

## Comandos de prueba manual

```powershell
# Caso individual
$payload = Get-Content -Raw "tests/payloads/ycloud-sample-inbound.json"
Invoke-RestMethod -Method Post `
  -Uri "https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound" `
  -ContentType "application/json" -Body $payload

# Suite completa Fase 1
$cases = Get-Content -Raw "tests/payloads/ycloud-test-cases.json" | ConvertFrom-Json
foreach ($c in $cases) {
  $body = $c.payload | ConvertTo-Json -Depth 10 -Compress
  Invoke-RestMethod -Method Post `
    -Uri "https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound" `
    -ContentType "application/json" -Body $body
}

# Suite flexible Fase 2A
$flex = Get-Content -Raw "tests/payloads/ycloud-flex-test-cases.json" | ConvertFrom-Json
foreach ($c in $flex) {
  $body = $c.payload | ConvertTo-Json -Depth 10 -Compress
  Invoke-RestMethod -Method Post `
    -Uri "https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound" `
    -ContentType "application/json" -Body $body
}
```

## Consultas SQL de verificacion

```sql
select count(*) from wa_inbound_messages;
select count(*) from wa_outbound_messages where status = 'mocked';
select count(*) from wa_errors;
select normalized_phone, wa_last_intent, wa_stage from wa_contacts_state order by updated_at desc limit 10;
```

## Fase 3A — GHL dry-run ✅

Archivo: `tests/payloads/ycloud-phase3a-ghl-dry-run.json`

| Caso | Mensaje | Intent | Tag esperado | Task dry-run |
|---|---|---|---|---|
| 01 | Hola, quiero información | `ambiguo` | `wa_interes_info` | No |
| 02 | No sé qué estudiar | `no_se_que_estudiar` | `wa_interes_test` | No |
| 03 | Tengo promedio 9.3, qué beca me toca | `beca` | `wa_interes_beca` | Sí |
| 04 | Quiero hablar con un asesor | `humano` | `wa_requiere_asesor` | Sí |
| 05 | Se trabó el test | `duda_test` | `wa_duda_test` | Sí |
| 06 | Imagen sin texto | `sin_texto` | `wa_sin_texto` | Sí |

Criterios adicionales:

- `ghl_dry_run: true`, `ghl_sync_log_id` presente
- `outbound_real: false`, `mode: mock`
- Registro en `wa_ghl_sync_log` con `protected_fields`
- Sin llamadas GHL reales

```sql
select intent, would_create_task, would_add_tags, status
from wa_ghl_sync_log
order by created_at desc limit 10;
```

## Limites conocidos (Fase 3A)

- GHL API no llamada (solo dry-run).
- `GHL_SYNC_MODE` default `dry_run` en código si no está en secrets.
- `GHL_API_KEY` no requerido en 3A.
- MCP InsForge no puede leer/escribir function secrets; confirmar `WA_AGENT_MODE=mock` en dashboard.

## Siguiente paso (Fase 3B)

1. Configurar `GHL_API_KEY` + `GHL_LOCATION_ID`.
2. Mapear custom field keys WA en GHL.
3. Cambiar a `GHL_SYNC_MODE=live` con 1 contacto de prueba.
4. Verificar campos test protegidos intactos.
