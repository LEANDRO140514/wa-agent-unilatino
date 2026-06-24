# Fase 3C-prep — Custom fields WA en GHL

> **Estado:** preparación documental. Sin llamadas GHL live. Sin creación automática de campos.
>
> **Prerrequisitos validados:** Fase 3B-1 (create live) ✅ | Fase 3B-2 (update live) ✅  
> **Estado seguro actual:** `WA_AGENT_MODE=mock` | `GHL_SYNC_MODE=dry_run`

---

## Objetivo Fase 3C

Escribir **solo** custom fields WA dedicados en contactos GHL, sin tocar campos del test vocacional EVA ni datos base del contacto (email, nombre).

Fase 3C-prep define tipos, nombres, mapeo API y cambios de código. **Fase 3C-live** se ejecutará después, con 1 contacto de prueba.

---

## Cómo GHL maneja custom fields (API v2)

### Descubrir / mapear field IDs

GHL **no acepta** keys lógicas (`wa_last_intent`) en `POST/PUT` de contactos. Requiere el **ID interno** del campo creado en la location.

| Método | Endpoint | Uso |
|---|---|---|
| Listar campos (read-only) | `GET /locations/:locationId/customFields` | Obtener `id`, `name`, `fieldKey`, `dataType` |
| Crear campo | `POST /locations/:locationId/customFields` | **Manual en UI** (recomendado Fase 3C) — no desde código Eva WA |
| Escribir en contacto | `PUT /contacts/:contactId` | Body con `customFields: [{ id, value }]` |
| Crear contacto con CF | `POST /contacts/` | Opcional: mismo array en create |

**Headers (igual que Fase 3B):**

```http
Authorization: Bearer <GHL_API_KEY>
Version: 2021-07-28
Content-Type: application/json
```

**Documentación:** [Get Custom Fields](https://marketplace.gohighlevel.com/docs/ghl/locations/get-custom-fields) | [Update Contact](https://marketplace.gohighlevel.com/docs/ghl/contacts/update-contact/)

### Forma API vs forma dry-run actual

| Capa | Formato actual | Formato GHL real |
|---|---|---|
| Dry-run (código) | Objeto plano `{ wa_last_intent: "humano" }` | Simulación — no es payload API |
| Live (Fase 3B) | **No envía custom fields** | N/A |
| Live (Fase 3C) | Debe convertir a array `[{ id: "abc123", value: "humano" }]` | Obligatorio |

---

## Lista de campos WA requeridos

| # | Key lógico (código) | Nombre visible en GHL | Tipo GHL recomendado | Valor ejemplo (no escribir en prep) | Riesgo |
|---|---|---|---|---|---|
| 1 | `wa_last_intent` | WA — Última intención | **Single Line Text** | `humano` | Bajo — enum interno conocido |
| 2 | `wa_last_message_at` | WA — Fecha último mensaje | **Date / Time** | `2026-06-18T05:19:46.310Z` | Medio — GHL puede esperar formato distinto a ISO; validar en UI |
| 3 | `wa_stage` | WA — Etapa | **Single Line Text** (o Dropdown fijo) | `humano` / `fase_3c` | Bajo — si Dropdown, valores deben existir en GHL |
| 4 | `wa_needs_human` | WA — Requiere asesor | **Checkbox** | `true` / `false` | Medio — API a veces exige string `"true"`; probar en 3C-live |
| 5 | `wa_summary` | WA — Resumen Eva | **Large Text** / Multi-line | `Intent: humano — Quiero hablar...` | Bajo — truncar a 500 chars |
| 6 | `wa_source` | WA — Fuente | **Single Line Text** | `YCloud / Eva WA` | Bajo — constante |
| 7 | `wa_last_inbound_text` | WA — Último mensaje entrante | **Large Text** | `No sé qué estudiar` | **Alto** — PII; truncar; no loguear payload completo en notas |
| 8 | `wa_last_outbound_text` | WA — Última respuesta Eva | **Large Text** | `Claro 😊 Si todavía no sabes...` | Medio — longitud; emojis OK en Large Text |

### Keys esperados (convención)

Usar **exactamente** estos identificadores lógicos en código InsForge. En GHL UI, al crear el campo, si la UI permite **Unique Key** / **Field Key**, configurar el mismo slug:

```
wa_last_intent
wa_last_message_at
wa_stage
wa_needs_human
wa_summary
wa_source
wa_last_inbound_text
wa_last_outbound_text
```

El **field ID** (ej. `6sHZt2Xc6Yh8p9qR1mNv`) lo entrega GHL al crear el campo — Leandro debe copiarlo para secrets o mapa JSON.

### Campos EVA / test — NUNCA escribir

Ya protegidos en código (`GHL_PROTECTED_FIELDS`):

`carrera_recomendada`, `match_percent`, `sector_principal`, `dictamen_url`, `test_completed_at`, `test_version`, `beca_elegible`, `lead_score`, `lead_class`, `promedio`, `email`, `firstName`, `lastName`

---

## Análisis del código actual

### Dry-run — **sí** incluye customFields (parcial)

Archivos: `insforge/functions/ycloud-wa-inbound.js`, `insforge/functions/lib/sync-ghl-contact.js`

Función `buildGHLDryRunPayload()` genera:

```javascript
customFields: {
  wa_last_intent: context.intent,
  wa_last_message_at: context.timestamp,
  wa_stage: context.waStage || "fase_3a_dry_run",
  wa_needs_human: context.needsHuman,
  wa_summary: context.waSummary,
}
```

Persistido en `wa_ghl_sync_log.payload.customFields` y `payload.contact.customFields`.

| Campo requerido 3C | En dry-run hoy |
|---|---|
| `wa_last_intent` | ✅ |
| `wa_last_message_at` | ✅ |
| `wa_stage` | ✅ |
| `wa_needs_human` | ✅ |
| `wa_summary` | ✅ |
| `wa_source` | ❌ falta |
| `wa_last_inbound_text` | ❌ falta |
| `wa_last_outbound_text` | ❌ falta |

`GHL_WA_WRITABLE_FIELDS` lista solo 5 campos — hay que ampliar a 8 en Fase 3C implementación.

### Live — **no** escribe custom fields (confirmado)

Evidencia código `syncGHLContactLive()`:

- `createGHLContactMinimal()` → solo `locationId`, `phone`, `source`
- Rama update → **sin** `PUT /contacts/:id`
- `protected_fields.phase_3b: "no_custom_fields_written"`
- Flujo live: search → create (mínimo) | reuse → tags → note → task

Evidencia DB (Fase 3B-1, registro `dcd31cb8-...`):

```json
"customFields": []
```

en respuesta GHL de create. Fase 3B-2 update tampoco incluyó PUT de contacto.

**Conclusión:** Live actual es seguro respecto a custom fields — **ningún valor WA se escribió en GHL**.

---

## Payload de update propuesto (NO ejecutar)

### PUT `/contacts/ZPqb7Jit2zn64uaME9Cp`

Simulación para intent `no_se_que_estudiar`, contacto existente:

```json
{
  "customFields": [
    { "id": "{{GHL_CF_ID_WA_LAST_INTENT}}", "value": "no_se_que_estudiar" },
    { "id": "{{GHL_CF_ID_WA_LAST_MESSAGE_AT}}", "value": "2026-06-18T05:36:54.000Z" },
    { "id": "{{GHL_CF_ID_WA_STAGE}}", "value": "no_se_que_estudiar" },
    { "id": "{{GHL_CF_ID_WA_NEEDS_HUMAN}}", "value": "false" },
    { "id": "{{GHL_CF_ID_WA_SUMMARY}}", "value": "Intent: no_se_que_estudiar — No sé qué estudiar" },
    { "id": "{{GHL_CF_ID_WA_SOURCE}}", "value": "YCloud / Eva WA" },
    { "id": "{{GHL_CF_ID_WA_LAST_INBOUND_TEXT}}", "value": "No sé qué estudiar" },
    { "id": "{{GHL_CF_ID_WA_LAST_OUTBOUND_TEXT}}", "value": "Claro 😊 Si todavia no sabes que estudiar..." }
  ]
}
```

**Reglas:**

- Solo campos WA del array — nunca mezclar campos EVA
- Truncar textos largos: inbound/outbound/summary → max **500** caracteres
- `wa_needs_human`: enviar como string `"true"` / `"false"` si Checkbox falla en prueba
- Ejecutar **después** de tags/nota en el mismo sync, o en el mismo PUT si se integra al flujo
- Si un field ID falta en config → omitir ese campo + log warning (no fallar todo el sync)

### Create contact con custom fields (contacto nuevo)

```json
{
  "locationId": "{{GHL_LOCATION_ID}}",
  "phone": "+52XXXXXXXXXX",
  "source": "Eva WA / YCloud",
  "customFields": [
    { "id": "{{GHL_CF_ID_WA_LAST_INTENT}}", "value": "humano" }
  ]
}
```

Mismo array de 8 campos; IDs obligatorios.

---

## Pasos manuales — crear campos en GHL UI

**Location:** `uPgYlVj3v4nLWNRc5SQq` (Universidad Latino — verificar con Leandro)

1. Ir a **Settings → Custom Fields → Contact**
2. Por cada fila de la tabla anterior, clic **Add Field**
3. Configurar:
   - **Name:** nombre visible (columna "Nombre visible")
   - **Type:** tipo recomendado
   - **Unique Key / Field Key:** key lógico (si la UI lo permite)
   - **Folder (opcional):** `Eva WA` o `WhatsApp` para agrupar
4. Guardar y copiar el **Field ID** de cada campo (desde lista de custom fields o vía GET API manual fuera de Eva WA)
5. Entregar a desarrollo un mapa:

```json
{
  "wa_last_intent": "PASTE_ID_HERE",
  "wa_last_message_at": "PASTE_ID_HERE",
  "wa_stage": "PASTE_ID_HERE",
  "wa_needs_human": "PASTE_ID_HERE",
  "wa_summary": "PASTE_ID_HERE",
  "wa_source": "PASTE_ID_HERE",
  "wa_last_inbound_text": "PASTE_ID_HERE",
  "wa_last_outbound_text": "PASTE_ID_HERE"
}
```

6. **No** reutilizar ni renombrar campos del test vocacional existentes
7. Verificar que ningún key WA colisione con `carrera_recomendada`, `beca_elegible`, etc.

### Verificación manual (sin Eva WA)

En GHL, abrir contacto de prueba `ZPqb7Jit2zn64uaME9Cp` → pestaña Custom Fields → confirmar que los 8 campos aparecen vacíos antes de 3C-live.

---

## Cambios de código necesarios (Fase 3C implementación)

> No implementados en prep — lista para cuando Leandro entregue field IDs.

### 1. Ampliar constantes

```javascript
const GHL_WA_WRITABLE_FIELDS = [
  "wa_last_intent",
  "wa_last_message_at",
  "wa_stage",
  "wa_needs_human",
  "wa_summary",
  "wa_source",
  "wa_last_inbound_text",
  "wa_last_outbound_text",
];

const WA_SOURCE_VALUE = "YCloud / Eva WA";
const WA_TEXT_MAX_LEN = 500;
```

### 2. Función `buildWACustomFieldValues(context)`

```javascript
function buildWACustomFieldValues(context) {
  return {
    wa_last_intent: context.intent,
    wa_last_message_at: context.timestamp,
    wa_stage: context.waStage || context.intent,
    wa_needs_human: context.needsHuman,
    wa_summary: truncate(context.waSummary, WA_TEXT_MAX_LEN),
    wa_source: WA_SOURCE_VALUE,
    wa_last_inbound_text: truncate(context.messageText, WA_TEXT_MAX_LEN),
    wa_last_outbound_text: truncate(context.responseText, WA_TEXT_MAX_LEN),
  };
}
```

### 3. Mapa key → GHL field ID (secrets)

Opción A — JSON único en secret InsForge:

```
GHL_WA_FIELD_MAP={"wa_last_intent":"id1","wa_last_message_at":"id2",...}
```

Opción B — secrets individuales:

```
GHL_CF_WA_LAST_INTENT_ID=...
GHL_CF_WA_LAST_MESSAGE_AT_ID=...
...
```

Opción C — fetch en cold start `GET /locations/:id/customFields` y match por `fieldKey` (más dinámico, 1 request extra por sync — no recomendado en v1)

### 4. Convertir a payload API

```javascript
function toGHLCustomFieldsArray(fieldMap, values) {
  return Object.entries(values)
    .filter(([key]) => fieldMap[key])
    .map(([key, value]) => ({
      id: fieldMap[key],
      value: formatGHLValue(key, value),
    }));
}
```

### 5. Nueva función live

```javascript
async function updateGHLContactCustomFields(config, contactId, customFieldsArray) {
  if (!customFieldsArray.length) return null;
  return ghlFetch(config, `/contacts/${contactId}`, {
    method: "PUT",
    body: JSON.stringify({ customFields: customFieldsArray }),
  });
}
```

Integrar en `syncGHLContactLive()` **después** de resolver `contactId`, **antes o después** de tags/nota (recomendado: después de tags, antes de nota).

### 6. Feature flag Fase 3C

```
GHL_WRITE_CUSTOM_FIELDS=true   # solo para 3C-live; default false
```

Si `false` → comportamiento Fase 3B (sin PUT custom fields).

### 7. Dry-run ampliado

Incluir en log:

```json
{
  "customFields_logical": { "...": "..." },
  "customFields_ghl_api_shape": [{ "id": "[REDACTED_OR_MAPPED]", "value": "..." }]
}
```

### 8. Archivos a tocar

| Archivo | Cambio |
|---|---|
| `insforge/functions/ycloud-wa-inbound.js` | Lógica live + dry-run ampliado |
| `insforge/functions/lib/sync-ghl-contact.js` | Mantener referencia alineada |
| `tests/payloads/ghl-phase3c-custom-fields-dry-run.json` | Fixture offline |
| `docs/ghl-phase-3-plan.md` | Enlace a 3C |

---

## Plan seguro — Fase 3C-live (posterior)

### Pre-requisitos

- [ ] 8 custom fields creados manualmente en GHL UI
- [ ] Mapa de field IDs entregado por Leandro
- [ ] `GHL_WA_FIELD_MAP` (o equivalente) en InsForge secrets
- [ ] `WA_AGENT_MODE=mock` confirmado
- [ ] `GHL_SYNC_MODE=dry_run` hasta momento de prueba
- [ ] Código 3C implementado + desplegado con `GHL_WRITE_CUSTOM_FIELDS=false` primero

### Protocolo prueba única

| Paso | Acción |
|---|---|
| 1 | Dry-run con payload humano → verificar 8 campos en `wa_ghl_sync_log` |
| 2 | Leandro: `GHL_SYNC_MODE=live` + `GHL_WRITE_CUSTOM_FIELDS=true` |
| 3 | **Un** POST: `+529991525583` / `"Quiero hablar con un asesor"` |
| 4 | Validar: tags + nota + task + **8 custom fields** en GHL UI contacto `ZPqb7Jit2zn64uaME9Cp` |
| 5 | Confirmar campos EVA (`carrera_recomendada`, `beca_elegible`, etc.) **sin cambios** |
| 6 | `outbound_real=false`, `wa_ghl_sync_log status=ok` |
| 7 | Revertir: `GHL_SYNC_MODE=dry_run`, `GHL_WRITE_CUSTOM_FIELDS=false` |

### Rollback

- Desactivar `GHL_WRITE_CUSTOM_FIELDS` → vuelve a comportamiento 3B
- Custom fields ya escritos en GHL permanecen — solo dejan de actualizarse

### Riesgos abiertos Fase 3C

| Riesgo | Mitigación |
|---|---|
| 422 por tipo de dato incorrecto | Probar `wa_needs_human` y `wa_last_message_at` primero en UI manual |
| Field ID incorrecto | Validar mapa con GET custom fields antes de live |
| Sobrescribir campo EVA homónimo | Keys únicos `wa_*`; lista `GHL_PROTECTED_FIELDS` en código |
| PII en `wa_last_inbound_text` | Truncar; no duplicar en notas si ya está en CF |
| PUT reemplaza tags | **No** enviar `tags` en mismo PUT que custom fields — endpoints separados (ya así en 3B) |

---

## Fixture dry-run (offline)

Ver: `tests/payloads/ghl-phase3c-custom-fields-dry-run.json`

Ejemplo de valores lógicos para intent `humano` — **no contiene field IDs reales ni llamadas API**.

---

## Referencia rápida — estado por fase

| Fase | Custom fields en GHL |
|---|---|
| 3A dry-run | Simulados en log InsForge |
| 3B live | **No escritos** ✅ |
| 3C-prep | Documentación + fixture |
| 3C-live | PUT con IDs — pendiente autorización |

---

## Qué necesita Leandro para Fase 3C-live

1. Crear 8 custom fields en GHL UI (tabla arriba)
2. Exportar mapa `key → field ID` (JSON)
3. Confirmar que campos EVA/test no se modificaron ni comparten keys
4. Autorizar implementación código + deploy
5. Ejecutar protocolo de 1 prueba con `GHL_SYNC_MODE=live` temporal
6. Revertir a `dry_run` tras validación UI
