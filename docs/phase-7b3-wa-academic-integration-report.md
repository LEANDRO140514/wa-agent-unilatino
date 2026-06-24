# Phase 7B.3 — WA Academic Integration Report

**Date:** 2026-06-23
**Result:** 20/20 PASS

## Environment

```
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=false
```

## Summary

| ID | Input | WA intent | Academic | Enriched | Result |
|---:|---|---|---|:---:|---|
| 1 | 1 | carreras_disponibles | career_list | yes | PASS |
| 2 | Carreras disponibles | carreras_disponibles | career_list | yes | PASS |
| 3 | ¿Cuántas carreras tienen? | ambiguo | career_list | yes | PASS |
| 4 | 2 | beca | scholarship | yes | PASS |
| 5 | Quiero estudiar Psicología | carrera_interes | career_detail | yes | PASS |
| 6 | Derecho online | carrera_interes | career_detail | yes | PASS |
| 7 | ¿Cuánto cuesta Derecho online? | carrera_interes | career_detail | yes | PASS |
| 8 | Tengo promedio 9.8, ¿qué beca me toca? | beca | scholarship | yes | PASS |
| 9 | Tengo promedio 8.2, ¿qué apoyo tengo? | beca | scholarship | yes | PASS |
| 10 | ¿Tienen meses sin intereses? | ambiguo | payment | yes | PASS |
| 11 | ¿Qué documentos necesito? | ambiguo | documents | yes | PASS |
| 12 | ¿Cómo me inscribo? | ambiguo | admission | yes | PASS |
| 13 | ¿Qué horarios tienen? | ambiguo | schedule | yes | PASS |
| 14 | ¿Cuál es su WhatsApp? | ambiguo | contact | yes | PASS |
| 15 | ¿Tienen prácticas profesionales? | ambiguo | faq | yes | PASS |
| 16 | ¿En Enfermería piden campos clínicos? | carrera_interes | career_detail | yes | PASS |
| 17 | Hola | ambiguo | greeting | no | PASS |
| 18 | No sé qué estudiar | no_se_que_estudiar | fallback | no | PASS |
| 19 | Quiero hablar con un asesor | humano | fallback | no | PASS |
| 20 | Se trabó el test | duda_test | fallback | no | PASS |

## Details

### Case 1: 1

- WA intent: `carreras_disponibles`
- Academic intent: `career_list`
- Enriched: true, skipped: false
- Response: Estas son las opciones oficiales de Universidad Latino: Derecho: • Derecho — Presencial • Derecho On…

### Case 2: Carreras disponibles

- WA intent: `carreras_disponibles`
- Academic intent: `career_list`
- Enriched: true, skipped: false
- Response: Estas son las opciones oficiales de Universidad Latino: Derecho: • Derecho — Presencial • Derecho On…

### Case 3: ¿Cuántas carreras tienen?

- WA intent: `ambiguo`
- Academic intent: `career_list`
- Enriched: true, skipped: false
- Response: Estas son las opciones oficiales de Universidad Latino: Derecho: • Derecho — Presencial • Derecho On…

### Case 4: 2

- WA intent: `beca`
- Academic intent: `scholarship`
- Enriched: true, skipped: false
- Response: Becas de excelencia por promedio de bachillerato: • Sobresaliente (9.6–10): 50% en colegiaturas y 50…

### Case 5: Quiero estudiar Psicología

- WA intent: `carrera_interes`
- Academic intent: `career_detail`
- Enriched: true, skipped: false
- Response: Psicología • Modalidad: Presencial • Duración: 4 años + S.S. • Mensualidad: $4,650 • Inscripción: $8…

### Case 6: Derecho online

- WA intent: `carrera_interes`
- Academic intent: `career_detail`
- Enriched: true, skipped: false
- Response: Derecho Online • Modalidad: En línea • Duración: 3 años • Mensualidad: $1,980 • Inscripción: $3,600 …

### Case 7: ¿Cuánto cuesta Derecho online?

- WA intent: `carrera_interes`
- Academic intent: `career_detail`
- Enriched: true, skipped: false
- Response: Derecho Online • Modalidad: En línea • Duración: 3 años • Mensualidad: $1,980 • Inscripción: $3,600 …

### Case 8: Tengo promedio 9.8, ¿qué beca me toca?

- WA intent: `beca`
- Academic intent: `scholarship`
- Enriched: true, skipped: false
- Response: Becas de excelencia por promedio de bachillerato: • Sobresaliente (9.6–10): 50% en colegiaturas y 50…

### Case 9: Tengo promedio 8.2, ¿qué apoyo tengo?

- WA intent: `beca`
- Academic intent: `scholarship`
- Enriched: true, skipped: false
- Response: Becas de excelencia por promedio de bachillerato: • Sobresaliente (9.6–10): 50% en colegiaturas y 50…

### Case 10: ¿Tienen meses sin intereses?

- WA intent: `ambiguo`
- Academic intent: `payment`
- Enriched: true, skipped: false
- Response: Formas de pago documentadas: • Pago en mensualidades • Pago anual con descuento: disponible; Monto d…

### Case 11: ¿Qué documentos necesito?

- WA intent: `ambiguo`
- Academic intent: `documents`
- Enriched: true, skipped: false
- Response: Documentos para inscripción: • Acta de nacimiento • Certificado de bachillerato (original y copia) (…

### Case 12: ¿Cómo me inscribo?

- WA intent: `ambiguo`
- Academic intent: `admission`
- Enriched: true, skipped: false
- Response: Proceso de admisión: 1. Orientación: Orientación sobre la carrera de interés 2. Revisión documental:…

### Case 13: ¿Qué horarios tienen?

- WA intent: `ambiguo`
- Academic intent: `schedule`
- Enriched: true, skipped: false
- Response: Modalidades y horarios: • Presencial: Lunes a viernes • En línea: Martes y jueves 20:00-22:00 hrs + …

### Case 14: ¿Cuál es su WhatsApp?

- WA intent: `ambiguo`
- Academic intent: `contact`
- Enriched: true, skipped: false
- Response: Departamento de Admisiones 📍 Calle 7 Tablaje Catastral 15542 x 4 y 6, Colonia Santa Rita Cholul, Mé…

### Case 15: ¿Tienen prácticas profesionales?

- WA intent: `ambiguo`
- Academic intent: `faq`
- Enriched: true, skipped: false
- Response: Sí, Universidad Latino cuenta con prácticas profesionales garantizadas como parte de la formación in…

### Case 16: ¿En Enfermería piden campos clínicos?

- WA intent: `carrera_interes`
- Academic intent: `career_detail`
- Enriched: true, skipped: false
- Response: Algunas carreras pueden requerir prácticas, servicio social o requisitos específicos. Te puedo canal…

### Case 17: Hola

- WA intent: `ambiguo`
- Academic intent: `greeting`
- Enriched: false, skipped: true
- Response: ¡Hola! Soy Eva, asistente de Universidad Latino 😊 Con gusto te ayudo. ¿Qué te gustaría conocer? 1. …

### Case 18: No sé qué estudiar

- WA intent: `no_se_que_estudiar`
- Academic intent: `fallback`
- Enriched: false, skipped: true
- Response: No te preocupes, para eso tenemos nuestro test vocacional 😊 Te ayuda a identificar qué carreras pue…

### Case 19: Quiero hablar con un asesor

- WA intent: `humano`
- Academic intent: `fallback`
- Enriched: false, skipped: true
- Response: Claro 😊 Te voy a canalizar con un asesor académico para continuar tu proceso por WhatsApp. En breve…

### Case 20: Se trabó el test

- WA intent: `duda_test`
- Academic intent: `fallback`
- Enriched: false, skipped: true
- Response: Gracias por avisarme. Voy a marcar tu caso para que puedan ayudarte con el test vocacional. Mientras…

## Integration notes

- Hook: `classifyIntent` → `applyAcademicAndLlmEnrichment` → outbound/GHL
- `classifyIntent` / `buildIntentDecision` unchanged
- Academic metadata on outbound `raw_response` and webhook response
- No live deploy, mock/dry_run only