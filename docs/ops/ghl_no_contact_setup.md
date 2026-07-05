# GHL — Guía manual: tags, no_contact DND y smoke test

**Location:** UNIVERSIDAD LATINO (`uPgYlVj3v4nLWNRc5SQq`)  
**Fase:** 1.5  
**Estado MCP:** `user-jewel-ghl-readonly` — **sin escritura** (tags, workflows y contactos: manual en UI)  
**Auditoría base:** [`ghl_auditoria_fase1.md`](ghl_auditoria_fase1.md)

---

## 1. Pre-crear tags (C1) — PENDIENTE MANUAL

Ir a **Settings → Tags** (o **Contacts → Tags**) y crear cada tag con **nombre exacto** (minúsculas, guiones bajos, sin espacios).

### Grupo (a) — EMITIDOS POR CÓDIGO F1

Tags que Eva WA **escribe** al sincronizar contacto (`sync-ghl-contact`, `opt-out-handler`, `fallbacks-lite`, `notOfferedResolver`, `escalation-payload`, `ycloud-wa-inbound`).

**Ya existen en GHL (no recrear):** `eva-wa`, `wa_interes_info`, `wa_interes_beca`, `wa_interes_carrera`, `wa_interes_carreras`, `wa_interes_test`, `wa_requiere_asesor`, `wa_sin_texto`.

**Copy-paste — crear los faltantes:**

```
wa_no_contact
wa_needs_human
wa_low_confidence
wa_ready_to_enroll
wa_career_not_offered
wa_market_signal_career_demand
wa_requested_unknown_career
wa_requested_invalid_modality
wa_needs_human_career_not_offered
wa_requested_invalid_level
wa_revalidation
wa_scholarship_special
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
```

### Grupo (b) — LEÍDOS POR CÓDIGO (no los emite Eva)

| Tag | Quién lo usa | Quién debe aplicarlo |
|---|---|---|
| `wa_no_call` | `escalation-payload.js` P6 — modifica título de task si el contacto ya tiene el tag | **Asesor manual** en GHL cuando el lead pide no llamadas |
| `interes_beca` | E8 / `SALUDO_INICIAL` — sesga apertura a becas | Marketing / captación (ver C5) |
| `interes_info` | E8 — información general | Marketing / captación |
| `interes_visita` | E8 — agendar visita | Marketing / captación |
| `post_test` | E8 — suprime reoferta de test vocacional | Marketing / captación (test vocacional) |

**Copy-paste — pre-crear en biblioteca:**

```
wa_no_call
interes_beca
interes_info
interes_visita
post_test
```

### Grupo (c) — FASE 2 (spec / enum en código, `wired: false` o no implementado)

**Copy-paste — crear ahora o al abrir F2:**

```
wa_document_received
wa_payment_intent
wa_urgent
wa_docs_incomplete
wa_rvoe_escalation
wa_complaint
wa_minor
wa_parent
wa_price_negotiation
wa_appointment
```

> GHL también auto-crea tags al primer uso vía API; pre-crearlos evita typos y divergencias de escritura.

---

## 2. Workflow "WA Opt-Out → DND" (C2) — PENDIENTE MANUAL

### 2.1 Crear el workflow

1. **Automation → Workflows → Create Workflow**
2. Nombre: `WA Opt-Out → DND`
3. Carpeta sugerida: `Eva WA` (opcional)
4. Estado: **Published** al terminar

### 2.2 Trigger

1. **Add Trigger → Contact Tag**
2. Condición: **Tag Added**
3. Tag: `wa_no_contact` (exacto)
4. Filtro adicional (opcional): contacto tiene tag `eva-wa` — solo si quieres acotar a leads Eva; **no obligatorio** (opt-out debe cubrir cualquier contacto)

### 2.3 Acciones (en orden)

**Acción 1 — Do Not Disturb**

1. **Add Action → Contact → Enable DND** (o *Update Contact* → DND)
2. Canales: marcar **SMS** y **WhatsApp** (y **Email** si aplica a tu política de opt-out total)
3. Si la location ofrece **DND All** / pausa global de outbound: activarlo como capa primaria

**Acción 2 — Remover de workflows activos**

1. **Add Action → Workflow → Remove from All Workflows** (o *Remove from Workflow* por cada workflow outbound conocido)
2. Esto evita que secuencias ya enroladas sigan enviando pasos pendientes

**Acción 3 — Nota interna (opcional, recomendado)**

1. **Add Action → Internal Notification** o **Add Note**
2. Texto sugerido: `Opt-out WhatsApp detectado (wa_no_contact). DND activado por workflow Eva WA.`

### 2.4 Guardar y publicar

- Revisar que el trigger sea **Tag Added** (no Tag Present en contacto nuevo con tag heredado — Tag Added es el correcto para sync de Eva)
- **Save → Publish**

---

## 3. Workflow "WA Re-Opt-In" (C2) — PENDIENTE MANUAL

### 3.1 Crear el workflow

1. **Automation → Workflows → Create Workflow**
2. Nombre: `WA Re-Opt-In`

### 3.2 Trigger

1. **Add Trigger → Contact Tag**
2. Condición: **Tag Removed**
3. Tag: `wa_no_contact`

### 3.3 Acciones

**Acción 1 — Desactivar DND**

1. **Add Action → Contact → Disable DND** (o *Update Contact* → quitar DND en SMS + WhatsApp + Email según lo activado en opt-out)

**Acción 2 — Nota interna (opcional)**

1. Texto: `Re-opt-in WhatsApp (wa_no_contact removido). DND desactivado.`

### 3.4 Guardar y publicar

- **Save → Publish**
- Verificar que no exista otro workflow que vuelva a activar DND al quitar tags de forma masiva

---

## 4. Checklist C3 — Outbound NO VERIFICADO en UI

La API pública reportó **0 workflows** y **0 campañas** activas; el API interno de detalle no estuvo disponible. **C3 = NO VERIFICADO** — puede haber automatizaciones solo visibles en UI.

### 4.1 Dónde buscar

| Área GHL | Ruta UI | Qué buscar |
|---|---|---|
| Workflows | Automation → Workflows | Cualquier workflow **Published** con acciones Send SMS, Send WhatsApp, Send Review Request, Conversation AI outbound |
| Campañas | Marketing → Campaigns / Email/SMS campaigns | Campañas **Scheduled**, **Running** o **Paused** con canal SMS/WhatsApp |
| Bulk actions | Conversations → Bulk Actions | Envíos masivos programados |
| Triggers legacy | Automation → Triggers | Triggers sueltos que envíen SMS/WA al crear contacto |

### 4.2 Por cada workflow/campaña outbound encontrado

Completar esta tabla (copiar filas según necesites):

| Nombre | Trigger / audiencia | Canal | ¿Excluye tag `wa_no_contact`? | ¿Respeta DND nativo? | Acción |
|---|---|---|---|---|---|
| | | WA / SMS | ☐ Sí ☐ No | ☐ Sí ☐ No | |

### 4.3 Cómo agregar exclusión `wa_no_contact` (segunda capa)

**En Workflow (antes del primer envío outbound):**

1. Abrir workflow → primer nodo después del trigger (o crear rama **If/Else**)
2. **Condition → Contact Tags**
3. Regla: **Contact does NOT have tag** → `wa_no_contact`
4. Rama **Yes** → continúa la secuencia outbound  
5. Rama **No** → **End Workflow** (o ruta sin envío)

**En Campaña SMS/WhatsApp:**

1. Editar audiencia / filtros de la campaña
2. **Exclude contacts with tag:** `wa_no_contact`
3. Confirmar que la campaña también excluye contactos en **DND** (GHL suele hacerlo por defecto en campañas; verificar en preview)

### 4.4 Criterio de cobertura

| Estado | Significado |
|---|---|
| **CUBIERTO** | DND nativo activo (C2) **y** filtro explícito `wa_no_contact` en el workflow/campaña |
| **DESCUBIERTO** | Envía WA/SMS sin filtro `wa_no_contact` — agregar condición §4.3 |
| **NO VERIFICADO** | No revisado en UI aún (estado actual de esta auditoría API) |

---

## 5. Smoke test manual (D) — PENDIENTE MANUAL

Usar **solo** el contacto de prueba. **Nunca** aplicar a leads reales.

### 5.1 Preparar contacto

- [ ] **Contacts → Add Contact**
- [ ] Nombre: `TEST EVA — NO LEAD`
- [ ] Teléfono: `{{NUMERO_PRUEBAS}}` *(solicitar a Leandro al ejecutar; no usar números de leads reales)*
- [ ] Email: opcional, ficticio (`test-eva-no-lead@example.invalid`)
- [ ] Tag inicial opcional: `eva-wa` (simula lead Eva)

### 5.2 Opt-out → DND ON

- [ ] En el contacto → **Tags → Add** → `wa_no_contact`
- [ ] Esperar 1–2 min (ejecución workflow)
- [ ] Verificar en ficha contacto: **DND activo** (SMS / WhatsApp / All según configuraste en §2)
- [ ] Verificar en **Workflow → Execution Logs** que `WA Opt-Out → DND` corrió sin error
- [ ] *(Opcional)* Intentar enviar SMS/WA manual al contacto desde Conversations — debe bloquearse o advertir DND

### 5.3 Re-opt-in → DND OFF

- [ ] **Tags → Remove** → `wa_no_contact`
- [ ] Esperar 1–2 min
- [ ] Verificar **DND desactivado** en ficha contacto
- [ ] Verificar execution log de `WA Re-Opt-In`

### 5.4 Task de escalación (verificación post-deploy)

No hay modo dry-run seguro en GHL para simular `escalation-payload` sin tráfico real.

- [ ] **Marcar post-deploy:** enviar mensaje de prueba al `{{NUMERO_PRUEBAS}}` con intent `humano` (handler en dry_run/live allowlist)
- [ ] Verificar en GHL → **Tasks** que aparece título esperado (p. ej. `Contactar lead — pidió asesor` o variante `wa_no_call`)
- [ ] Estado hasta deploy: **pendiente verificación post-deploy**

### 5.5 Limpieza

- [ ] Remover tags de negocio del contacto de prueba (`wa_no_contact`, `wa_needs_human`, `wa_interes_*`, etc.)
- [ ] Dejar solo `eva-wa` o sin tags, según prefieras para próximas pruebas
- [ ] Confirmar DND **off**
- [ ] No borrar el contacto (reutilizable)

---

## 6. Orden de ejecución recomendado

1. §1 — Crear tags grupos (a), (b), (c)  
2. §2 + §3 — Publicar workflows DND  
3. §4 — Auditar UI outbound (C3)  
4. §5 — Smoke test con `{{NUMERO_PRUEBAS}}`  
5. Deploy handler Eva (después de migraciones SQL) — ver [`ghl_fase1_ops.md`](ghl_fase1_ops.md)
