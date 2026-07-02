# Phase 7G.6C — Runtime probe (auto-generated)

**Generated:** 2026-06-25T23:20:50.723Z

## Runtime flags

| Flag | Esperado (seguro) | Detectado | OK |
|------|-------------------|-----------|:--:|
| WA_AGENT_MODE | `mock` | `mock` | ✅ |
| GHL_SYNC_MODE | `dry_run` | `dry_run` | ✅ |
| GHL_WRITE_CUSTOM_FIELDS | `false` | `false` | ✅ |
| ghl_allowed_phones_count | 1 (seguro) | 1 | ✅ |
| outbound_real (probe) | false | false | ✅ |

**Modo detectado:** SEGURO ✅

## Allowlist piloto 7G.6C

```
GHL_LIVE_ALLOWED_PHONES=<E.164_ALLOWLIST_7G6C>
```

| Teléfono | Rol |
|----------|-----|
| `+52******5583` | Leandro (owner) |
| `+52******4831` | Admisiones 1 |
| `+52******8094` | Admisiones 2 |

## Mensajes guion (por participante)

| # | Mensaje | Intent | Task |
|:--:|---------|--------|:----:|
| 1 | `1` | carreras_disponibles | — |
| 2 | `Derecho online` | carrera_interes | — |
| 3 | `No sé qué estudiar` | no_se_que_estudiar | — |
| 4 | `Tengo promedio 9.2, qué beca me toca` | beca | — |
| 5 | `Quiero hablar con asesor` | humano | sí |

## Validación GHL post-sesión (manual + SQL)

- [ ] Contacto creado/actualizado sin duplicado
- [ ] Tags `eva-wa` + intent
- [ ] Note con resumen
- [ ] Task en humano/beca cuando aplica
- [ ] 8 campos `wa_*` escritos
- [ ] `allowlist_matched=true` en logs live
- [ ] Campos protegidos intactos
- [ ] `wa_errors` críticos = 0

## SQL monitoreo (InsForge MCP)

```sql
SELECT i.received_at, i.normalized_phone, i.message_text, i.status,
  o.status AS outbound_status, o.provider_response_id,
  l.sync_mode, l.status AS ghl_status, l.intent,
  l.payload->>'allowlist_matched' AS allowlist_matched,
  l.payload->>'custom_fields_written' AS cf_written,
  l.would_create_task
FROM wa_inbound_messages i
LEFT JOIN wa_outbound_messages o ON o.inbound_message_id = i.id
LEFT JOIN wa_ghl_sync_log l ON l.inbound_message_id = i.id
WHERE i.normalized_phone = ANY(ARRAY['<OWNER_E.164>','<ADM1_E.164>','<ADM2_E.164>'])
  AND i.status = 'processed_inbound_live'
  AND i.received_at > NOW() - INTERVAL '2 hours'
ORDER BY i.received_at ASC;
```
