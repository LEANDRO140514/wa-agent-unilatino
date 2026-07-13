# Customer Journey — Tres fuentes de leads (v1, EVA-CJ-1)

## Las tres fuentes

| Fuente (`eva_fuente_lead`) | Qué es | Métodos de captura posibles |
| --- | --- | --- |
| `eva_wa` | Eva WA directa (+52 999 453 8421) | whatsapp_directo, meta_click_to_whatsapp, qr_whatsapp, enlace_directo_whatsapp |
| `landing_carreras` | carreras.unilatino.algorithmus.io (incluye calculadora de becas como CONTEXTO, no cuarta fuente) | formulario_landing, calculadora_becas, whatsapp_cta |
| `test_vocacional` | testunilatino.algorithmus.io | registro_test, finalizacion_test, whatsapp_cta |

## Regla esencial: fuente ≠ método ≠ canal ≠ tema

Recorrido tipo (sin formulario):
```
Landing carreras → navega → NO llena formulario → pulsa icono WhatsApp
→ envía prefill → PRIMER mensaje en Eva WA
```
Resultado: `eva_fuente_lead=landing_carreras` · `eva_metodo_captura=whatsapp_cta`
· `eva_contexto_entrada=exploracion_carreras` · `eva_ultimo_touch=whatsapp`.
NUNCA se registra solo como source=whatsapp.

## Flujo del turno (con EVA_GUIDED_JOURNEY_ENABLED=true)

```
webhook YCloud → parser → idempotencia → E.164 → opt-out (§FF_NO_CONTACT)
→ [EVA-CJ-1: sourceDetector + menuRouter]           ← nuevo, antes de not-offered
   handled? → decisión de navegación / delegación a intent operativo
   no handled? ↓
→ not-offered → context-memory → classifyIntent → academic-engine
→ [EVA-CJ-1: atribución first-contact SIEMPRE]      ← independiente de quién resolvió
→ fallbacks → escalation → outbound → GHL dry_run → upsert state (+campos journey)
```

## Estado conversacional (§14)

menu_state ∈ {root, info_catalog, from_careers, from_calculator, from_test,
career_options, modality_options, requirements_options, enrollment_options,
location_options} · TTL 24h → vencido regresa a root · comandos globales
(0/menú/inicio/volver) y permanentes (asesor/carreras/beca/test/inscripcion/
requisitos/ubicacion) siempre activos · número sin estado válido → mapa
legacy (1 carreras, 2 beca, 3 test, 4 humano) · texto libre → classifyIntent,
nunca "opción inválida".

## Merge y dedupe

mergeJourneyState: primera fuente inmutable, último touch actualizable,
campos del test protegidos (solo fuente autorizada), sin downgrade dentro de
cadenas (test_recomendado→iniciado→completado; beca consultada→calculada;
asesor solicitado→asignado), vacíos jamás sobrescriben. Identidad: E.164 →
contact_id → email; nunca por nombre.

## Siguiente mejor acción

`eva_siguiente_accion` se actualiza por navegación (consultar_carrera,
completar_test, calcular_beca, confirmar_beneficio, iniciar_inscripcion,
contactar_asesor…) y alimenta el task body cuando aplica task.
