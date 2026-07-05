# GHL — Cierre operativo Fase 1.5

**Fecha:** 2026-07-05  
**Location:** UNIVERSIDAD LATINO (`uPgYlVj3v4nLWNRc5SQq`)  
**Auditoría:** [`ghl_auditoria_fase1.md`](ghl_auditoria_fase1.md) (B4 aprobada)  
**Guía manual:** [`ghl_no_contact_setup.md`](ghl_no_contact_setup.md)

---

## Resumen ejecutivo

| Área | Resultado agente | Acción humana |
|---|---|---|
| Tags taxonomía (C1) | Documentado en 3 grupos | **PENDIENTE** — crear en UI §1 de guía |
| Workflows DND (C2) | No ejecutable (MCP readonly) | **PENDIENTE** — §2–3 de guía |
| Exclusión outbound (C3) | API: 0 detectados; UI **NO VERIFICADO** | **PENDIENTE** — checklist §4 de guía |
| Smoke test (D) | Checklist manual | **PENDIENTE** — §5 con `{{NUMERO_PRUEBAS}}` |
| Productores origen (C5) | Documentado abajo | **Marketing/Ops** — no es código |

---

## C1 — Tags (aprobado, pendiente manual)

MCP `user-jewel-ghl-readonly` **no expone creación de tags**. Listas copy-paste en [`ghl_no_contact_setup.md`](ghl_no_contact_setup.md) §1.

### Grupo (a) — EMITIDOS POR CÓDIGO F1

24 tags a crear + 8 ya existentes. Emisión desde: `opt-out-handler`, `fallbacks-lite`, `notOfferedResolver`, `escalation-payload`, `ycloud-wa-inbound`, `sync-ghl-contact`.

### Grupo (b) — LEÍDOS POR CÓDIGO

5 tags a pre-crear: `wa_no_call`, `interes_beca`, `interes_info`, `interes_visita`, `post_test`. Eva **no los escribe**; los lee E8 o P6.

### Grupo (c) — FASE 2

10 tags spec/enum (`wired: false` o media handler F2): `wa_document_received`, `wa_payment_intent`, `wa_urgent`, `wa_docs_incomplete`, `wa_rvoe_escalation`, `wa_complaint`, `wa_minor`, `wa_parent`, `wa_price_negotiation`, `wa_appointment`.

**Estado C1:** ⏳ **PENDIENTE MANUAL** — 39 tags a crear (24+5+10); 8 ya en biblioteca.

---

## C2 — Workflows DND

| Workflow | Trigger | Estado |
|---|---|---|
| `WA Opt-Out → DND` | Tag **added** `wa_no_contact` → DND + remove workflows | ⏳ PENDIENTE MANUAL |
| `WA Re-Opt-In` | Tag **removed** `wa_no_contact` → disable DND | ⏳ PENDIENTE MANUAL |

Instrucciones pantalla por pantalla: [`ghl_no_contact_setup.md`](ghl_no_contact_setup.md) §2–3.

**Prioridad:** DND nativo es la **capa primaria**; filtro por tag `wa_no_contact` en campañas es **segunda capa** (C3).

---

## C3 — Exclusión outbound

| Fuente | Workflows/campañas WA-SMS | Cobertura |
|---|---|---|
| API pública MCP | 0 | — |
| API interna (`ghl_list_workflows_full`) | No disponible (tokens) | — |
| UI GHL | **NO VERIFICADO** | Checklist §4 guía |

**Estado C3:** ⚠️ **NO VERIFICADO** — no asumir “N/A”. Revisar manualmente Automation + Campaigns antes de activar captación masiva.

---

## C4 — Limitación MCP

- Servidor: `user-jewel-ghl-readonly`
- Escritura bloqueada: tags, workflows, contactos, mensajes
- Entregable: [`ghl_no_contact_setup.md`](ghl_no_contact_setup.md) (guía completa C1–D)

---

## C5 — Dependencia: productores de tags de origen (E8)

Los tags de origen **no tienen hoy ningún proceso automatizado** que los aplique en esta location. El handler Eva **lee** estos tags en `SALUDO_INICIAL` (spec E8 / maestro v2.1), pero **E8 no operará** hasta que marketing/captación los asignen al crear o actualizar contactos.

| Tag origen | Productor esperado | Estado actual |
|---|---|---|
| `interes_beca` | Landing/formulario MiBeca (`magenta-kangaroo`), workflow post-submit GHL, o tag manual en campaña de becas | **SIN PRODUCTOR** |
| `interes_info` | Landing genérica Universidad Latino, formulario “quiero información”, workflow de captación | **SIN PRODUCTOR** |
| `interes_visita` | Formulario agendar visita / workflow de citas campus | **SIN PRODUCTOR** |
| `post_test` | Test vocacional (`testunilatino.algorithmus.io` / Orchids) al completar test → webhook o workflow GHL | **SIN PRODUCTOR** |

**Responsable:** Marketing / Ops GHL — **no es tarea de código Eva F1**.

Acciones sugeridas (fuera de scope dev):

1. Mapear cada landing/form existente → tag de origen en acción “Add Tag” del workflow de captación
2. Validar que el nombre del tag coincida **exactamente** (sin prefijo `wa_`)
3. Probar con contacto ficticio antes de campañas pagadas

---

## D — Smoke test

Convertido a checklist manual en [`ghl_no_contact_setup.md`](ghl_no_contact_setup.md) §5.

| Paso | Estado |
|---|---|
| Crear contacto `TEST EVA — NO LEAD` | ⏳ Pendiente (`{{NUMERO_PRUEBAS}}`) |
| Tag `wa_no_contact` → DND ON | ⏳ Pendiente |
| Remove tag → DND OFF | ⏳ Pendiente |
| Task escalación (título §13) | ⏳ Post-deploy |
| Limpieza tags negocio | ⏳ Pendiente |

> Al ejecutar el smoke test, solicitar `{{NUMERO_PRUEBAS}}` a Leandro — no inferir de contactos reales ni del repo.

---

## Evidencia repo (Parte A)

| Commit | Mensaje |
|---|---|
| `baf47bf` | `docs(eva): knowledge base v2.1` |
| `c0a1210` | `docs(eva): fix cierre_fase1 SQL order and flag defaults table` |
| `3d8fae7` | `docs(ops): GHL readonly audit Fase 1.5 (B1-B3)` |
| *(este)* | `ops(ghl): tag taxonomy + no_contact setup guide (Fase 1.5)` |

---

## Pendientes antes de go-live Eva

1. **SQL InsForge** — 3 migraciones en orden (`fsm_state` → `closed_by_agent+backfill` → `fallback_count`)
2. **GHL manual** — C1 tags + C2 workflows + C3 UI audit + D smoke test
3. **Deploy handler** — flags F1 default ON (`FF_*` omitidos = ON)
4. **C5 marketing** — cablear productores de tags origen (paralelo, no bloquea opt-out)
5. **Post-deploy** — tráfico real allowlist + verificación task escalación

---

## Pasos que ejecuta Leandro (no automatizables por agente)

1. Correr las **3 migraciones SQL** en InsForge **antes** del deploy del handler  
2. **Deploy** de `ycloud-wa-inbound` con feature flags en default ON  
3. **Verificación post-deploy** con tráfico real (allowlist) y task §13 en GHL
