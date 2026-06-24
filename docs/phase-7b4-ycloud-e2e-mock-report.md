# Phase 7B.4 — YCloud E2E Mock Report

**Date:** 2026-06-22
**Result:** 20/20 cases PASS | contact reuse: PASS | wa_errors(10m): 0

## Archivos

| Archivo | Acción |
|---|---|
| `tests/payloads/phase7b4-ycloud-e2e-mock.json` | Creado |
| `tests/run-phase7b4-ycloud-e2e-mock.mjs` | Creado |
| `insforge/functions/lib/test/mock-insforge-client.js` | Creado |
| `insforge/functions/ycloud-wa-inbound.js` | Modificado (`WA_E2E_MOCK_DB` en `getClient`) |
| `insforge/functions/lib/academic-engine/entityExtractor.js` | Modificado (promedio `8.2` tras normalización) |
| `insforge/functions/lib/academic-engine/intentEngine.js` | Modificado (promedio solo → scholarship) |
| `docs/phase-7b4-ycloud-e2e-mock-report.md` | Generado |

## Flags

```
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=false
WA_E2E_MOCK_DB=true
YCLOUD_BUSINESS_NUMBER=+529994538421
GHL_WA_FIELD_MAP={"wa_last_intent":"mockFld01","wa_last_message_at":"mockFld02","wa_stage":"mockFld03","wa_needs_human":"mockFld04","wa_summary":"mockFld05","wa_source":"mockFld06","wa_last_inbound_text":"mockFld07","wa_last_outbound_text":"mockFld08"}
```

## Tabla por caso

| ID | Input | WA intent | Academic intent | Enriched | outbound_real | ghl_live | CF written | Result |
|---:|---|---|---|:---:|---|---|---|---|
| 1 | 1 | carreras_disponibles | career_list | yes | false | false | false | PASS |
| 2 | Carreras disponibles | carreras_disponibles | career_list | yes | false | false | false | PASS |
| 3 | ¿Cuántas carreras tienen? | ambiguo | career_list | yes | false | false | false | PASS |
| 4 | Quiero estudiar Psicología | carrera_interes | career_detail | yes | false | false | false | PASS |
| 5 | Derecho online | carrera_interes | career_detail | yes | false | false | false | PASS |
| 6 | ¿Cuánto cuesta Derecho online? | carrera_interes | career_detail | yes | false | false | false | PASS |
| 7 | Carreras en línea | ambiguo | modality_filter | yes | false | false | false | PASS |
| 8 | Tengo promedio 9.8, qué beca me toca | beca | scholarship | yes | false | false | false | PASS |
| 9 | Tengo promedio 8.2 | beca | scholarship | yes | false | false | false | PASS |
| 10 | ¿Tienen meses sin intereses? | ambiguo | payment | yes | false | false | false | PASS |
| 11 | ¿Qué documentos necesito? | ambiguo | documents | yes | false | false | false | PASS |
| 12 | ¿Cómo me inscribo? | ambiguo | admission | yes | false | false | false | PASS |
| 13 | ¿Qué horarios tienen? | ambiguo | schedule | yes | false | false | false | PASS |
| 14 | ¿Cuál es su WhatsApp? | ambiguo | contact | yes | false | false | false | PASS |
| 15 | ¿Tienen prácticas profesionales? | ambiguo | faq | yes | false | false | false | PASS |
| 16 | ¿En Enfermería piden campos clínicos… | carrera_interes | career_detail | yes | false | false | false | PASS |
| 17 | NASA | ambiguo | fallback | no | false | false | false | PASS |
| 18 | No sé qué estudiar | no_se_que_estudiar | fallback | no | false | false | false | PASS |
| 19 | Quiero hablar con asesor | humano | fallback | no | false | false | false | PASS |
| 20 | Se trabó el test | duda_test | fallback | no | false | false | false | PASS |

## Mock DB totals

- wa_inbound_messages: 21
- wa_outbound_messages: 21
- wa_contacts_state: 20
- wa_ghl_sync_log: 21 (all dry_run)
- wa_errors (last 10 min): 0

## Contact state reuse

- Phone reused from case 1
- Follow-up: "2" → intent `beca`
- Contacts for phone: 1
- Result: PASS

## Ejemplos de respuestas finales

### Case 1: 1

```
Estas son las opciones oficiales de Universidad Latino:

Derecho:
• Derecho — Presencial
• Derecho Online — En línea

Salud:
• Psicología — Presencial
• Enfermería — Presencial
• Nutrición — Presencial

Tecnología:
• Ingeniería en Sistemas Computacionales — Presencial

Negocios:
• Administración Sabatina — Sabatina
• Administración y Desarrollo Empresarial Online — En línea
• Ventas y Mercadotecnia — Presencial
• Ventas y Mercadotecnia Online — En línea
• Negocios Internacionales — Presencial

Gastronomía:
• Gastronomía — Presencial

Contamos con 9 programas académicos únicos en 12 combinaciones de carrera y modalidad.

¿Te interesa alguna en particular?
```

### Case 8: Tengo promedio 9.8, qué beca me toca

```
Becas de excelencia por promedio de bachillerato:

• Sobresaliente (9.6–10): 50% en colegiaturas y 50% de descuento en inscripción
• Muy alto (9–9.59): 40% en colegiaturas y 50% de descuento en inscripción
• Alto (8.5–8.99): 30% en colegiaturas y 50% de descuento en inscripción
• Base (7–8.49): sin beca en colegiaturas y 50% de descuento en inscripción
• Menor a 7.00: sin beca automática — un asesor puede revisar alternativas

Sujeto a validación del área de admisiones.

Con promedio 9, tu tramo sería: Muy alto.
Beca estimada en colegiatura: 40%.
Descuento estimado en inscripción: 50%.
```

### Case 10: ¿Tienen meses sin intereses?

```
Formas de pago documentadas:

• Pago en mensualidades
• Pago anual con descuento: disponible; Monto del descuento: pendiente_validacion
• Pago semestral con descuento: disponible; Monto del descuento: pendiente_validacion
• Meses sin intereses con tarjeta: no está documentado como opción institucional.

¿Te gustaría que un asesor te ayude a revisar la mejor opción para tu caso?
```

### Case 17: NASA

```
¡Hola! Soy Eva, asistente de Universidad Latino 😊

Con gusto te ayudo. ¿Qué te gustaría conocer?

1. Carreras disponibles
2. Becas
3. Hacer el test vocacional
4. Hablar con un asesor
```

### Case 18: No sé qué estudiar

```
No te preocupes, para eso tenemos nuestro test vocacional 😊

Te ayuda a identificar qué carreras pueden ir mejor contigo según tus intereses y habilidades.

Puedes hacerlo aquí:
https://testunilatino.algorithmus.io

Cuando termines, podrás compartir tu resultado para recibir orientación.
```

### Case 20: Se trabó el test

```
Gracias por avisarme. Voy a marcar tu caso para que puedan ayudarte con el test vocacional.

Mientras tanto, puedes intentar abrirlo nuevamente desde este enlace:
https://testunilatino.algorithmus.io
```

## Confirmaciones

- **WhatsApp real:** NO — `WA_AGENT_MODE=mock`, `outbound_real=false` en todos los casos.
- **GHL live:** NO — `GHL_SYNC_MODE=dry_run`, `ghl_live=false`, logs `sync_mode=dry_run`.
- **Custom fields live:** NO — `GHL_WRITE_CUSTOM_FIELDS=false`, `custom_fields_written=false`.
- **LLM real:** NO — `EVA_LLM_ENABLED=false`, sin `OPENAI_API_KEY`.
- **wa_errors:** 0 en ventana de 10 minutos (mock DB).

## Recomendación deploy controlado

1. Desplegar edge function con `ACADEMIC_ENGINE_ENABLED=true` y `EVA_LLM_ENABLED=false`.
2. Mantener `WA_AGENT_MODE=mock` y `GHL_SYNC_MODE=dry_run` en el primer despliegue.
3. Ejecutar 5–10 mensajes reales de prueba interna; validar `wa_outbound_messages.raw_response.academic_*`.
4. Solo con autorización de Leandro: `WA_AGENT_MODE=live_outbound` y/o `GHL_SYNC_MODE=live`.

## Fallos

_Ninguno._