# Auditoría GHL — Fase 1.5 (solo lectura)

**Fecha:** 2026-07-05  
**Location:** UNIVERSIDAD LATINO (`uPgYlVj3v4nLWNRc5SQq`)  
**MCP:** `user-jewel-ghl-readonly` — **sin escrituras**  
**Estado:** ✅ **B4 APROBADA** (2026-07-05) — Partes C–E documentadas en [`ghl_no_contact_setup.md`](ghl_no_contact_setup.md) y [`ghl_fase1_ops.md`](ghl_fase1_ops.md).

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

**Interpretación:** API pública: 0 workflows/campañas. **C3 = NO VERIFICADO** — la UI puede tener automatizaciones no listadas por API. Checklist manual en [`ghl_no_contact_setup.md`](ghl_no_contact_setup.md) §4. La capa primaria de no-contact (C2: DND nativo vía workflow) es **necesaria** independientemente de C3.

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

## C1 — Tags a pre-crear (APROBADO — 3 grupos)

MCP readonly → listas copy-paste en [`ghl_no_contact_setup.md`](ghl_no_contact_setup.md) §1. **Estado: PENDIENTE MANUAL.**

### (a) EMITIDOS POR CÓDIGO F1

Eva **escribe** estos tags al sincronizar. **8 ya EXISTEN:** `eva-wa`, `wa_interes_info`, `wa_interes_beca`, `wa_interes_carrera`, `wa_interes_carreras`, `wa_interes_test`, `wa_requiere_asesor`, `wa_sin_texto`.

| Tag | Módulo | Estado GHL |
|---|---|---|
| `wa_no_contact` | `opt-out-handler` | FALTA |
| `wa_needs_human` | `escalation-payload` | FALTA |
| `wa_low_confidence` | `escalation-payload`, `fallbacks-lite` | FALTA |
| `wa_ready_to_enroll` | `escalation-payload` | FALTA |
| `wa_career_not_offered` | `notOfferedResolver` | FALTA |
| `wa_market_signal_career_demand` | `notOfferedResolver` | FALTA |
| `wa_requested_unknown_career` | `notOfferedResolver` | FALTA |
| `wa_requested_invalid_modality` | `notOfferedResolver` | FALTA |
| `wa_needs_human_career_not_offered` | `notOfferedResolver` | FALTA |
| `wa_requested_invalid_level` | `notOfferedResolver` | FALTA |
| `wa_revalidation` | `escalation-payload` | FALTA |
| `wa_scholarship_special` | `escalation-payload` | FALTA |
| `wa_post_test` | `ycloud-wa-inbound` | FALTA |
| `wa_duda_test` | `ycloud-wa-inbound` | FALTA |
| `wa_interes_promocion` | `ycloud-wa-inbound` | FALTA |
| `wa_revalidacion` | `ycloud-wa-inbound` | FALTA |
| `wa_nivel_no_principal` | `ycloud-wa-inbound` | FALTA |
| `wa_ubicacion` | `ycloud-wa-inbound` | FALTA |
| `wa_rvoe` | `ycloud-wa-inbound` | FALTA |
| `wa_objecion_precio` | `ycloud-wa-inbound` | FALTA |
| `wa_carrera_no_ofertada` | `ycloud-wa-inbound` | FALTA |
| `wa_salud` | `ycloud-wa-inbound` (extra carrera salud) | FALTA |
| `wa_preparatoria` | `ycloud-wa-inbound` | FALTA |
| `wa_posgrado` | `ycloud-wa-inbound` | FALTA |

### (b) LEÍDOS POR CÓDIGO (no emitidos por Eva)

| Tag | Lector | Aplicador esperado | Estado GHL |
|---|---|---|---|
| `wa_no_call` | `escalation-payload` P6 (título task) | Asesor manual | FALTA |
| `interes_beca` | E8 / SALUDO_INICIAL | Marketing/captación | FALTA |
| `interes_info` | E8 | Marketing/captación | FALTA |
| `interes_visita` | E8 | Marketing/captación | FALTA |
| `post_test` | E8 (suprime TEST_INTEREST) | Test vocacional / workflow | FALTA |

Ver dependencia C5 en [`ghl_fase1_ops.md`](ghl_fase1_ops.md).

### (c) FASE 2 (spec / `wired: false`)

| Tag | Fuente | Estado GHL |
|---|---|---|
| `wa_document_received` | Spec v4.1 / maestro (media F2) | FALTA |
| `wa_payment_intent` | `escalation-payload` wired:false | FALTA |
| `wa_urgent` | `escalation-payload` wired:false | FALTA |
| `wa_docs_incomplete` | `escalation-payload` wired:false | FALTA |
| `wa_rvoe_escalation` | `escalation-payload` wired:false | FALTA |
| `wa_complaint` | `escalation-payload` wired:false | FALTA |
| `wa_minor` | `escalation-payload` wired:false | FALTA |
| `wa_parent` | `escalation-payload` wired:false | FALTA |
| `wa_price_negotiation` | `escalation-payload` wired:false | FALTA |
| `wa_appointment` | `escalation-payload` wired:false | FALTA |

---

## C2 — Workflows DND (APROBADO — PENDIENTE MANUAL)

| Workflow | Trigger | Acciones |
|---|---|---|
| **WA Opt-Out → DND** | Tag added = `wa_no_contact` | DND WhatsApp/SMS (+ total si aplica) + remover de workflows activos |
| **WA Re-Opt-In** | Tag removed = `wa_no_contact` | Desactivar DND |

Guía UI: [`ghl_no_contact_setup.md`](ghl_no_contact_setup.md) §2–3.

---

## C3 — Exclusión outbound — NO VERIFICADO

| Fuente | Resultado | Cobertura |
|---|---|---|
| API pública | 0 workflows, 0 campañas | — |
| API interna | No disponible | — |
| UI GHL | No auditada por agente | **NO VERIFICADO** |

Checklist y parche manual: [`ghl_no_contact_setup.md`](ghl_no_contact_setup.md) §4. Condición: *contact does not have tag `wa_no_contact`* como segunda capa tras DND nativo.

---

## C4 — MCP readonly

Sin escritura en GHL. Toda implementación C1–D vía guía manual.

---

## Parte A — Repo (completada)

| Tarea | Estado | Evidencia |
|---|---|---|
| A1 | ✅ | Commit `baf47bf` — `docs(eva): knowledge base v2.1` |
| A2 | ✅ | `docs/migracion/cierre_fase1.md` — SQL orden: `fsm_state` → `closed_by_agent+backfill` → `fallback_count`; tabla 5 flags con default ON |
| A3 | ✅ | Push `origin/main` hasta `c0a1210` |

---

## Entregables C–E

| Documento | Contenido |
|---|---|
| [`ghl_no_contact_setup.md`](ghl_no_contact_setup.md) | C1 copy-paste, C2 workflows, C3 checklist UI, D smoke test |
| [`ghl_fase1_ops.md`](ghl_fase1_ops.md) | Cierre, C5 productores origen, pendientes manuales |

### Recordatorio — pasos que ejecuta Leandro

1. Correr las **3 migraciones SQL** en InsForge **antes** del deploy del handler  
2. Deploy del handler con flags en **default ON**  
3. Verificación **post-deploy** con tráfico real
