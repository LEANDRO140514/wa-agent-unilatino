# Contrato de atribución de leads (v1, EVA-CJ-1)

Capa lógica NUEVA; no reemplaza source/wa_source/wa_stage/wa_last_intent.
Enums canónicos en `lib/customer-journey/constants.js` (fuente única).

| Campo | Inmutable | Quién escribe | Valores |
| --- | --- | --- | --- |
| eva_fuente_lead | SÍ (tras ≠desconocido) | primer módulo con evidencia | eva_wa, landing_carreras, test_vocacional, desconocido |
| eva_metodo_captura | SÍ (primer método) | idem | whatsapp_directo, whatsapp_cta, meta_click_to_whatsapp, formulario_landing, calculadora_becas, registro_test, finalizacion_test, desconocido |
| eva_contexto_entrada | SÍ | idem | contacto_directo, exploracion_carreras, carrera_especifica, calculadora_becas, costos_promocion, orientacion_vocacional, duda_test, post_test, inscripcion, asesor, desconocido |
| eva_ultimo_touch | NO (se actualiza) | cada interacción confirmada | whatsapp, landing_carreras, calculadora_becas, test_vocacional, asesor, desconocido |
| eva_tema_atencion | NO | navegación de menú / intents | carreras, orientacion_vocacional, becas_promocion, requisitos, modalidades_horarios, inscripcion, ubicacion_visita, otra_duda, asesor |
| eva_estado_journey | NO, pero SIN downgrade | merge | ver constants.JOURNEY_STATES |
| eva_siguiente_accion | NO | navegación | ver constants.NEXT_ACTIONS |

## Precedencia (§7)
1. Inmutables: escribir solo si vacío/desconocido; landing/test NUNCA se
   degradan a whatsapp.
2. Vacíos (null/undefined/""/placeholder) jamás sobrescriben valores válidos.
3. Protegidos del test (carrera_recomendada, match_percent, sector_principal,
   dictamen_url, test_completed_at, test_version, respuestas crudas,
   dictamen_text, top_programs, oq_resumen): solo `authorizedTestSource`.
   La calculadora aporta promedio/carrera_interes/modalidad/beca_estimada
   pero NO resultados vocacionales. Eva lee, no recalcula.
4. Sin downgrade dentro de cadenas de journey.

## Casos ambiguos
Sin evidencia de origen → eva_wa/contacto_directo (verificable) o
desconocido; jamás inventar landing. Ejemplos completos ejecutables en
tests/payloads/eva-cj1-three-sources.json y la suite F31–F37/H42–H45.
