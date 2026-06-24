# Fase 7B.2 — Academic Engine Report

> **Generado:** 2026-06-22T18:36:22.147Z
> **Estado:** PASS

## Archivos creados

### academic-engine
- `insforge/functions/lib/academic-engine/truth.js`
- `insforge/functions/lib/academic-engine/normalizer.js`
- `insforge/functions/lib/academic-engine/entityExtractor.js`
- `insforge/functions/lib/academic-engine/intentEngine.js`
- `insforge/functions/lib/academic-engine/responseBuilder.js`
- `insforge/functions/lib/academic-engine/stateManager.js`
- `insforge/functions/lib/academic-engine/index.js`
- `insforge/functions/lib/academic-engine/adapter.js`
- `insforge/functions/lib/academic-engine/README.md`

### eva-llm (stub)
- `insforge/functions/lib/eva-llm/index.js`
- `insforge/functions/lib/eva-llm/shouldUseLLM.js`
- `insforge/functions/lib/eva-llm/guardrails.js`
- `insforge/functions/lib/eva-llm/prompts.js`
- `insforge/functions/lib/eva-llm/README.md`

### tests
- `tests/payloads/phase7b-academic-engine-cases.json`
- `tests/run-phase7b-academic.mjs`

## Pruebas ejecutadas

| # | Input | Intent | Summary | Pass |
|---|---|---|---|:---:|
| 1 | 1 | career_list | Estas son las opciones oficiales de Universidad Latino: Derecho: • Derecho — Presencial • Derecho Online — En línea Salu… | ✅ |
| 2 | Carreras disponibles | career_list | Estas son las opciones oficiales de Universidad Latino: Derecho: • Derecho — Presencial • Derecho Online — En línea Salu… | ✅ |
| 3 | ¿Cuántas carreras tienen? | career_list | Estas son las opciones oficiales de Universidad Latino: Derecho: • Derecho — Presencial • Derecho Online — En línea Salu… | ✅ |
| 4 | ¿Son 12 carreras diferentes? | career_list | En Universidad Latino hay 9 programas académicos únicos ofrecidos en 12 combinaciones de carrera y modalidad (por ejempl… | ✅ |
| 5 | Quiero estudiar Psicología | career_detail | Psicología • Modalidad: Presencial • Duración: 4 años + S.S. • Mensualidad: $4,650 • Inscripción: $8,000 • Campus: Campu… | ✅ |
| 6 | Derecho online | career_detail | Derecho Online • Modalidad: En línea • Duración: 3 años • Mensualidad: $1,980 • Inscripción: $3,600 • Campus: Virtual • … | ✅ |
| 7 | ¿Cuánto cuesta Derecho online? | career_detail | Derecho Online • Modalidad: En línea • Duración: 3 años • Mensualidad: $1,980 • Inscripción: $3,600 • Campus: Virtual • … | ✅ |
| 8 | Carreras en línea | modality_filter | Carreras en modalidad En línea: • Derecho Online — $1,980/mes \| Inscripción $3,600 • Administración y Desarrollo Empresa… | ✅ |
| 9 | Tengo promedio 9.8, ¿qué beca me toca? | scholarship | Becas de excelencia por promedio de bachillerato: • Sobresaliente (9.6–10): 50% en colegiaturas y 50% de descuento en in… | ✅ |
| 10 | Tengo promedio 8.2, ¿qué apoyo tengo? | scholarship | Becas de excelencia por promedio de bachillerato: • Sobresaliente (9.6–10): 50% en colegiaturas y 50% de descuento en in… | ✅ |
| 11 | ¿Tienen meses sin intereses? | payment | Formas de pago documentadas: • Pago en mensualidades • Pago anual con descuento: disponible; Monto del descuento: pendie… | ✅ |
| 12 | ¿Qué documentos necesito? | documents | Documentos para inscripción: • Acta de nacimiento • Certificado de bachillerato (original y copia) (Se puede iniciar con… | ✅ |
| 13 | ¿Cómo me inscribo? | admission | Proceso de admisión: 1. Orientación: Orientación sobre la carrera de interés 2. Revisión documental: Revisión de requisi… | ✅ |
| 14 | ¿Qué horarios tienen? | schedule | Modalidades y horarios: • Presencial: Lunes a viernes • En línea: Martes y jueves 20:00-22:00 hrs + plataforma 24/7 100%… | ✅ |
| 15 | ¿Cuál es su WhatsApp? | contact | Departamento de Admisiones 📍 Calle 7 Tablaje Catastral 15542 x 4 y 6, Colonia Santa Rita Cholul, Mérida, Yucatán, C.P. … | ✅ |
| 16 | ¿Tienen prácticas profesionales? | faq | Sí, Universidad Latino cuenta con prácticas profesionales garantizadas como parte de la formación institucional. Algunas… | ✅ |
| 17 | ¿En Enfermería piden campos clínicos? | career_detail | Algunas carreras pueden requerir prácticas, servicio social o requisitos específicos. Te puedo canalizar con un asesor p… | ✅ |
| 18 | NASA | fallback | Puedo ayudarte con: • Carreras disponibles • Costos y becas • Requisitos de inscripción • Modalidades y horarios • Conta… | ✅ |
| 19 | No sé qué estudiar | fallback | Puedo ayudarte con: • Carreras disponibles • Costos y becas • Requisitos de inscripción • Modalidades y horarios • Conta… | ✅ |
| 20 | Quiero hablar con un asesor | fallback | Puedo ayudarte con: • Carreras disponibles • Costos y becas • Requisitos de inscripción • Modalidades y horarios • Conta… | ✅ |

**Total:** 20/20 pass

## Fallos

- (ninguno)

## LLM stub

- rephraseForWhatsApp pass-through: ✅
- validateRephrase rejects invented amount: ✅

## Warnings / limitaciones

- Detalle por carrera de servicio social, prácticas y documentos extra usa respuesta segura cuando `pending_validation`.
- `Resumen IA` y claims marketing nunca se emiten.
- Horario presencial detallado por carrera sigue pendiente.
- Montos de descuento pago anual/semestral: pendiente_validacion.
- **adapter.js no conectado** a `ycloud-wa-inbound.js`.

## Confirmaciones

- ✅ `ycloud-wa-inbound.js` **no modificado**
- ✅ Sin WhatsApp real / sin deploy live
- ✅ Sin LLM real (`EVA_LLM_ENABLED=false`)
- ✅ Sin cambios GHL / YCloud / secrets

## Recomendación Fase 7B.3

Integrar `adapter.enrichWaDecisionFromText` en `ycloud-wa-inbound.js` detrás de `ACADEMIC_ENGINE_ENABLED=true`, manteniendo `WA_AGENT_MODE=mock` y `GHL_SYNC_MODE=dry_run`.
