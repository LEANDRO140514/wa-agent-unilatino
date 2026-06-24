# Phase 7E — WA Live + GHL Live + Academic Report

**Date:** 2026-06-23
**Result:** 5/5 PASS
**Channel:** +529991525583 → +529994538421

## Runtime (preflight)

| Flag | Valor |
|---|---|
| mode | live_outbound |
| ghl_sync_mode | live |
| academic_engine_enabled | true |
| eva_llm_enabled | false |

## Validación SQL post-ejecución

| Check | Resultado |
|---|---|
| `wa_errors` (10 min) | **0** |
| Contactos `+529991525583` en `wa_contacts_state` | **1** (sin duplicados) |
| `ghl_contact_id` | `ZPqb7Jit2zn64uaME9Cp` (consistente en 5 casos) |
| `wa_ghl_sync_log.sync_mode` | `live` / `status=ok` en 5 registros |
| `custom_fields_written` en logs GHL | **true** en los 5 casos |

### Tasks GHL (wa_ghl_sync_log)

| Caso | intent | would_create_task |
|---:|---|:---:|
| 1 | carreras_disponibles | false |
| 2 | carrera_interes | false |
| 3 | beca | **true** |
| 4 | no_se_que_estudiar | false |
| 5 | humano | **true** |

## Flags runtime detectados

```
WA_AGENT_MODE=live_outbound
GHL_SYNC_MODE=live
GHL_WRITE_CUSTOM_FIELDS=true (custom_fields_written=true)
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=false
```

## Contacto GHL

- contact_ids únicos: 1 (`ZPqb7Jit2zn64uaME9Cp`)
- duplicados: no detectados en respuestas

## Tabla por caso

| ID | Input | WA | Academic | Enriched | outbound | provider_id | ghl_live | synced | CF | task | Result |
|---:|---|---|---|:---:|---|---|---|:---:|:---:|---:|---|
| 1 | 1 | carreras_disponibles | career_list | yes | accepted | yes | true | true | true | no | PASS |
| 2 | Derecho online | carrera_interes | career_detail | yes | accepted | yes | true | true | true | no | PASS |
| 3 | Tengo promedio 9.8, qué … | beca | scholarship | yes | accepted | yes | true | true | true | yes | PASS |
| 4 | No sé qué estudiar | no_se_que_estudiar | fallback | no | accepted | yes | true | true | true | no | PASS |
| 5 | Quiero hablar con asesor | humano | fallback | no | accepted | yes | true | true | true | yes | PASS |

## Detalle

### Case 1: 1

- inbound_id: `2a9e0fd8-be30-48ef-9894-9054e63a297f`
- outbound_id: `9d980a8d-71bd-44d9-868d-24ac6d1d03e5`
- provider_response_id: `6a39df5318064e59731c3395`
- ghl_contact_id: `ZPqb7Jit2zn64uaME9Cp`
- ghl_sync_log_id: `8c7bed14-ac09-4942-8a62-ad60092ddf6a`
- tags: eva-wa, wa_interes_carreras
- Response: Estas son las opciones oficiales de Universidad Latino: Derecho: • Derecho — Presencial • Derecho On…



### Case 2: Derecho online

- inbound_id: `be7ff93d-3007-48d2-82ce-2833f84a15b7`
- outbound_id: `e0a54086-eca4-430c-b1fd-a05275cad0bc`
- provider_response_id: `6a39df58ea37435232ae6240`
- ghl_contact_id: `ZPqb7Jit2zn64uaME9Cp`
- ghl_sync_log_id: `8a04e827-c69c-488e-b544-a96fab3da140`
- tags: eva-wa, wa_interes_carrera
- Response: Derecho Online • Modalidad: En línea • Duración: 3 años • Mensualidad: $1,980 • Inscripción: $3,600 …



### Case 3: Tengo promedio 9.8, qué beca me toca

- inbound_id: `d0b5fb58-7e80-461e-b319-38e28d70455c`
- outbound_id: `944f53c6-fa9c-4542-96c8-03a1686ef2c4`
- provider_response_id: `6a39df5eea37435232ae62d9`
- ghl_contact_id: `ZPqb7Jit2zn64uaME9Cp`
- ghl_sync_log_id: `146ab227-5921-45ce-93dc-fca501ceccc5`
- tags: eva-wa, wa_interes_beca
- Response: Becas de excelencia por promedio de bachillerato: • Sobresaliente (9.6–10): 50% en colegiaturas y 50…



### Case 4: No sé qué estudiar

- inbound_id: `0c08de5b-da4c-47f2-8671-94341d293c38`
- outbound_id: `c7e81cde-dbf4-4f93-9e7e-93916d34d7a3`
- provider_response_id: `6a39df66c140b54d5e931326`
- ghl_contact_id: `ZPqb7Jit2zn64uaME9Cp`
- ghl_sync_log_id: `1e2f2b81-de46-4a77-8087-8447e1ebbd4c`
- tags: eva-wa, wa_interes_test
- Response: No te preocupes, para eso tenemos nuestro test vocacional 😊 Te ayuda a identificar qué carreras pue…



### Case 5: Quiero hablar con asesor

- inbound_id: `9a8f4015-e35e-4a63-8eed-7bf4586249c8`
- outbound_id: `cd9299e5-1c47-4cd8-a3e7-92830538a8b2`
- provider_response_id: `6a39df6b18064e59731c3459`
- ghl_contact_id: `ZPqb7Jit2zn64uaME9Cp`
- ghl_sync_log_id: `8f551819-7c0a-4d17-befc-fc0681419e4d`
- tags: eva-wa, wa_requiere_asesor
- Response: Claro 😊 Te voy a canalizar con un asesor académico para continuar tu proceso por WhatsApp. En breve…



## Recomendación final

1. **Rollback inmediato en Dashboard** (producción no debe quedar en live sin autorización):
   ```
   WA_AGENT_MODE=mock
   GHL_SYNC_MODE=dry_run
   GHL_WRITE_CUSTOM_FIELDS=false
   ACADEMIC_ENGINE_ENABLED=true
   EVA_LLM_ENABLED=false
   ```
2. Fase 7E validó: academic-engine + WA real + GHL live + custom fields en canal controlado.
3. No activar LLM real sin autorización de Leandro.
4. Preflight envió 1 mensaje adicional (`__phase7e_preflight__`) — revisar en teléfono si aplica.

## Archivos

- `tests/payloads/phase7e-wa-live-ghl-live.json`
- `tests/run-phase7e-wa-live-ghl-live.mjs`
- `docs/phase-7e-wa-live-ghl-live-academic-report.md`