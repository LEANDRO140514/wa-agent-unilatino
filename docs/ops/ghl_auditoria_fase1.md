# Auditoría GHL — Fase 1.5 (solo lectura)

**Fecha:** 2026-07-05  
**Location:** UNIVERSIDAD LATINO (`uPgYlVj3v4nLWNRc5SQq`)  
**MCP:** `user-jewel-ghl-readonly` — **sin escrituras**  
**Estado:** ⏸ **DETENIDO** — esperando tu aprobación antes de Parte C/D.

---

## Metodología

| Fuente | Herramienta MCP | Resultado |
|---|---|---|
| Tags location | `get_location_tags` + `audit_location_ads_setup` | 8 tags en biblioteca |
| Workflows | `ghl_get_workflows`, `crm_automation_workspace` | 0 workflows (API pública) |
| Workflows (detalle) | `ghl_list_workflows_full` | **No disponible** — falta `GHL_REFRESH_TOKEN` / Firebase tokens en el servidor MCP |
| Campañas email/SMS | `get_campaigns`, `get_email_campaigns` | 0 campañas activas/programadas |

> GHL solo expone en `/locations/{id}/tags` los tags **pre-creados** en la biblioteca. Los tags aplicados ad hoc a contactos pueden existir en contactos sin aparecer aquí. Esta auditoría refleja la biblioteca oficial de la location.

---

## B1 — Taxonomía de tags (código vs GHL)

Tags extraídos del código Fase 1 (`sync-ghl-contact.js`, `escalation-payload.js`, `notOfferedResolver.js`, `opt-out-handler.js`, `fallbacks-lite.js`, `ycloud-wa-inbound.js`).

### Mínimo operativo (solicitado)

| Tag | Emisor (módulo) | Estado GHL | Notas |
|---|---|---|---|
| `wa_no_contact` | `opt-out-handler.js` | **FALTA** | Opt-out §10; crítico para C2 |
| `wa_no_call` | `escalation-payload.js` (solo lectura P6) | **FALTA** | No se emite en F1; pre-crear evita divergencia F2 |
| `wa_needs_human` | `escalation-payload.js` | **FALTA** | Escalación §13 |
| `wa_low_confidence` | `escalation-payload.js`, `fallbacks-lite.js` | **FALTA** | Fallbacks §12 nivel 3 |
| `wa_ready_to_enroll` | `escalation-payload.js` | **FALTA** | Escalación §13 |
| `wa_career_not_offered` | `notOfferedResolver.js` | **FALTA** | §11.1 |
| `wa_market_signal_career_demand` | `notOfferedResolver.js` | **FALTA** | §11.1 señal mercado |
| `wa_requested_unknown_career` | `notOfferedResolver.js` | **FALTA** | Carrera desconocida |
| `wa_requested_invalid_modality` | `notOfferedResolver.js` | **FALTA** | Modalidad inválida |
| `wa_needs_human_career_not_offered` | `notOfferedResolver.js` | **FALTA** | Insistencia + carrera no ofertada |
| `wa_document_received` | Spec/maestro (F2); **no emitido en F1** | **FALTA** | Pre-crear para alinear con spec v4.1 |

### Legacy `wa_interes_*` (D3 — deben seguir)

| Tag | Emisor | Estado GHL |
|---|---|---|
| `eva-wa` | Universal (todos los sync) | **EXISTE** |
| `wa_interes_info` | `sync-ghl-contact`, `fallbacks-lite`, default intent | **EXISTE** |
| `wa_interes_beca` | Intent `beca`, objeción/promo | **EXISTE** |
| `wa_interes_carrera` | Intent `carrera_interes` | **EXISTE** |
| `wa_interes_carreras` | `carreras_disponibles`, `carreras_online` | **EXISTE** |
| `wa_interes_test` | Intent `no_se_que_estudiar` | **EXISTE** |
| `wa_requiere_asesor` | Intent `humano`, fallbacks L3 | **EXISTE** |
| `wa_sin_texto` | Intent `sin_texto` | **EXISTE** |
| `wa_post_test` | Intent `post_test` | **FALTA** |
| `wa_duda_test` | Intent `duda_test` | **FALTA** |
| `wa_interes_promocion` | Intent `promociones_descuentos` | **FALTA** |
| `wa_revalidacion` | Intent `revalidacion_estudios` | **FALTA** |
| `wa_nivel_no_principal` | Intent `niveles_no_principales` | **FALTA** |
| `wa_ubicacion` | Intent `ubicacion_campus` | **FALTA** |
| `wa_rvoe` | Intent `rvoe_reconocimiento` | **FALTA** |
| `wa_objecion_precio` | Intent `objecion_precio` | **FALTA** |
| `wa_carrera_no_ofertada` | Intent `carrera_no_ofertada` | **FALTA** |
| `wa_salud` | Extra tag carrera no ofertada (salud) | **FALTA** |
| `wa_preparatoria` | Gate nivel preparatoria | **FALTA** |
| `wa_posgrado` | Gate nivel posgrado | **FALTA** |

### Escalación §13 — wired F1 vs F2

| Tag | Wired F1 | Estado GHL |
|---|---|---|
| `wa_revalidation` | Sí (revalidación) | **FALTA** |
| `wa_scholarship_special` | Sí (beca especial) | **FALTA** |
| `wa_payment_intent` | No (F2) | **FALTA** |
| `wa_urgent` | No (F2) | **FALTA** |
| `wa_docs_incomplete` | No (F2) | **FALTA** |
| `wa_rvoe_escalation` | No (F2) | **FALTA** |
| `wa_complaint` | No (F2) | **FALTA** |
| `wa_minor` | No (F2) | **FALTA** |
| `wa_parent` | No (F2) | **FALTA** |
| `wa_price_negotiation` | No (F2) | **FALTA** |
| `wa_appointment` | No (F2) | **FALTA** |
| `wa_requested_invalid_level` | Sí (`notOfferedResolver`) | **FALTA** |

**Resumen B1:** 8 EXISTE / **35+ FALTA** en biblioteca de tags.

---

## B2 — Workflows y campañas outbound (WhatsApp / SMS)

### Campañas

| Nombre | Canal | Trigger | Filtro `wa_no_contact` | Filtro DND | Cobertura |
|---|---|---|---|---|---|
| *(ninguna)* | — | — | — | — | API: 0 campañas `running`/`scheduled` |

### Workflows

| Nombre | ID | Trigger | Envía WA/SMS | Excluye `wa_no_contact` | Excluye DND | Cobertura |
|---|---|---|---|---|---|---|
| *(ninguno)* | — | — | — | — | — | API pública: 0 workflows |

**Limitación API:** `ghl_list_workflows_full` (detalle de nodos/triggers) no pudo ejecutarse por credenciales internas ausentes en el servidor MCP. Si existen workflows creados manualmente en UI que el API no lista, requiere verificación visual en GHL → Automation → Workflows.

**Interpretación:** En el estado actual detectable por API, **no hay workflows/campañas outbound descubiertos** que requieran parche C3. La capa primaria de no-contact (C2: DND nativo vía workflow) sigue siendo **necesaria** antes de activar cualquier automatización futura.

---

## B3 — Tags de origen GHL (E8 / SALUDO_INICIAL)

Tags que el handler **lee** del CRM (sin prefijo `wa_`) según spec v4.1 y maestro v2.1:

| Tag origen | Uso esperado | Estado biblioteca GHL |
|---|---|---|
| `interes_beca` | Sesgar apertura a becas | **FALTA** |
| `interes_info` | Información general | **FALTA** |
| `interes_visita` | Agendar visita | **FALTA** |
| `post_test` | Ya hizo test; no reofrecer | **FALTA** |

> Estos tags suelen venir de landings/workflows de captación (p. ej. MiBeca). No están en la biblioteca Eva-WA actual. **Recomendación C1:** pre-crearlos con nombre exacto para que coincidan con lo que emiten formularios/integraciones existentes.

---

## Cambios propuestos (Parte C — pendiente tu OK)

### C1 — Pre-crear tags FALTANTES

Crear en GHL → Settings → Tags, con **nombre exacto** (case-sensitive):

```
wa_no_contact
wa_no_call
wa_needs_human
wa_low_confidence
wa_ready_to_enroll
wa_career_not_offered
wa_market_signal_career_demand
wa_requested_unknown_career
wa_requested_invalid_modality
wa_needs_human_career_not_offered
wa_document_received
wa_post_test
wa_duda_test
wa_interes_promocion
wa_revalidacion
wa_nivel_no_principal
wa_ubicacion
wa_rvoe
wa_objecion_precio
wa_carrera_no_ofertada
wa_salud
wa_preparatoria
wa_posgrado
wa_revalidation
wa_scholarship_special
wa_requested_invalid_level
interes_beca
interes_info
interes_visita
post_test
```

Tags F2 (opcional pre-crear ahora o en F2): `wa_payment_intent`, `wa_urgent`, `wa_docs_incomplete`, `wa_rvoe_escalation`, `wa_complaint`, `wa_minor`, `wa_parent`, `wa_price_negotiation`, `wa_appointment`.

### C2 — Workflows DND (mecanismo preferido)

| Workflow | Trigger | Acciones |
|---|---|---|
| **WA Opt-Out → DND** | Tag added = `wa_no_contact` | Activar DND (WhatsApp + SMS; total si la location lo permite) + remover de workflows activos |
| **WA Re-Opt-In** | Tag removed = `wa_no_contact` | Desactivar DND |

### C3 — Exclusión en campañas/workflows existentes

**N/A por ahora** — 0 workflows/campañas WA/SMS detectados vía API. Cuando se creen automatizaciones outbound, agregar condición: *contact does not have tag `wa_no_contact`* como segunda capa tras DND nativo.

### C4 — Limitación MCP escritura

El MCP configurado es **readonly**. Creación/edición de workflows **no es ejecutable por agente** → generar `docs/ops/ghl_no_contact_setup.md` con guía manual paso a paso (marcado PENDIENTE MANUAL) en Parte C.

---

## Parte A — Repo (completada)

| Tarea | Estado | Evidencia |
|---|---|---|
| A1 | ✅ | Commit `baf47bf` — `docs(eva): knowledge base v2.1` |
| A2 | ✅ | `docs/migracion/cierre_fase1.md` — SQL orden: `fsm_state` → `closed_by_agent+backfill` → `fallback_count`; tabla 5 flags con default ON |
| A3 | ✅ | Push `origin/main` hasta `c0a1210` |

---

## Siguiente paso

**Confirma o ajusta la lista de cambios C1–C3.** Tras tu OK:

1. Parte C (tags + guía manual workflows si MCP no escribe)
2. Parte D (smoke test con contacto `TEST EVA — NO LEAD` — necesitaré tu número de pruebas si no está en env)
3. Parte E (`ghl_fase1_ops.md`, commit `ops(ghl): no_contact DND + tag taxonomy (Fase 1.5)`)

### Recordatorio — pasos que no automatizo

1. Correr las **3 migraciones SQL** en InsForge **antes** del deploy del handler  
2. Deploy del handler con flags en **default ON**  
3. Verificación **post-deploy** con tráfico real
