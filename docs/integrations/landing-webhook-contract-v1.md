# Contrato de integración landings → GHL/Eva (v1, EVA-CJ-1)

## Auditoría de payloads REALES (repos clonados 2026-07-13)

### Test vocacional — repo `universidad-latino-landing` (nombre cruzado: es el TEST)
- `src/app/api/test/submit/route.ts` → POST directo a `GHL_WEBHOOK_URL` (fire & forget)
- Payload FLAT: firstName, lastName, email, phone, tags(csv), sector_principal,
  **carrera_recomendada, match_percent**, modalidad, lead_score, lead_class,
  beca_elegible, source(utm_source||data.source||"landing"), **test_completed_at,
  test_version, dictamen_url**, urgencia, promedio, oq_resumen, UTM completos.
- Contiene los CAMPOS PROTEGIDOS del test → este webhook es la ÚNICA fuente
  autorizada de esos campos (authorizedTestSource=true).
- CTA WhatsApp: `src/components/WhatsAppWidget.tsx`
  · ⚠️ número `529993226393` ≠ oficial `+529994538421` (BLOQUEO B-1)
  · prefill actual: "Hola! Me gustaría recibir más información sobre las
    carreras…" — habla de CARRERAS desde el sitio del TEST (atribución sucia).

### Landing carreras — repo `pwa-base-setup` (nombre cruzado: es CARRERAS)
- `src/lib/ghl.ts` → vía Supabase Edge Function proxy (server-to-server).
- `ProspectPayload`: firstName, lastName?, email, phone?, career?, source,
  tags, customFields, y flat: origen, lead_type, funnel, interest, career_name,
  career_id, modality, average_range, scholarship_level, scholarship_percent,
  enrollment/tuition base+final, wa_stage, tags_string, UTM camelCase.
- Calculadora: `src/pages/MiBeca.tsx` (promedio → beca) → mismo proxy.
- CTAs WhatsApp: WhatsAppFAB (waNumber de AdminContext), EvaCareerWidget,
  Intro, Inicio, CarreraDetalle. Prefills actuales genéricos o por carrera.

## Mapeo canónico ADITIVO (no romper campos existentes)

| Canónico (evento) | Test (flat actual) | Carreras (ProspectPayload) |
| --- | --- | --- |
| event_type | (nuevo) "test_completed" | (nuevo) "lead_submitted" / "scholarship_calculated" |
| event_id | (nuevo) uuid | (nuevo) uuid |
| source | source | origen/source → "test_vocacional" / "landing_carreras" |
| capture_method | (nuevo) "finalizacion_test" | (nuevo) "formulario_landing" / "calculadora_becas" |
| entry_context | (nuevo) "post_test" | (nuevo) "exploracion_carreras" / "calculadora_becas" |
| contact.phone (E.164) | phone | phone |
| journey.status | (nuevo) "test_completado" | (nuevo) "lead_capturado" / "beca_calculada" |

Regla: agregar campos nuevos AL LADO de los existentes; GHL sigue recibiendo
lo que ya mapea. La normalización E.164 en recepción usa la misma regla del
agente (+521→+52).

## Snippets de prefill (§13) — LISTOS PARA APLICAR (no aplicados en esta fase)

### Test vocacional — `src/components/WhatsAppWidget.tsx`
```tsx
const phoneNumber = "529994538421"; // ⚠️ corrige 529993226393
const message = "Hola Eva, vengo del test vocacional y necesito orientación.";
```
Página de resultados (`/resultados/[id]`): CTA post-test →
`"Hola Eva, ya hice el test vocacional y quiero revisar mi resultado."`

### Landing carreras — `src/components/WhatsAppFAB.tsx`
```tsx
const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(
  "Hola Eva, vengo de la página de carreras y quiero información."
)}`
```
Sección calculadora (MiBeca / CTA beca):
`"Hola Eva, estoy revisando la calculadora de becas y quiero ayuda."`
Detalle de carrera (opcional, conserva atribución + precisión):
`"Hola Eva, vengo de la página de carreras y quiero información sobre {carrera}."`
(El detector matchea por señales: el sufijo de carrera no rompe la detección.)

Nota: el detector tolera variantes/ediciones del usuario (señales, no texto
exacto); sin señales suficientes cae a eva_wa/contacto_directo — nunca inventa.
