# Fase 3B-prep — GHL CRM live (referencia, sin implementar)

> **Estado:** preparación documental. No desplegado. No llamadas GHL reales.
> Código live pendiente de autorización explícita y verificación de secrets en dashboard.

## Pre-requisitos de configuración (InsForge secrets)

| Variable | Requerido 3B | Verificación |
|---|---|---|
| `WA_AGENT_MODE` | `mock` (mantener hasta prueba WA aparte) | Runtime ✅ |
| `GHL_SYNC_MODE` | `dry_run` hasta prueba live de 1 contacto | Runtime ✅ |
| `GHL_API_KEY` | Private Integration Token (scope `contacts`) | Dashboard manual |
| `GHL_LOCATION_ID` | Location/sub-account Universidad Latino | Dashboard manual |
| `GHL_API_BASE_URL` | Opcional, default abajo | — |
| `GHL_TASK_ASSIGNED_TO` | Opcional, userId para tasks | Dashboard manual |

**Base URL GHL API v2:** `https://services.leadconnectorhq.com`

**Headers obligatorios en todas las llamadas:**

```http
Authorization: Bearer {GHL_API_KEY}
Version: 2021-07-28
Content-Type: application/json
```

---

## Flujo live propuesto (`syncGHLContactLive`)

```
1. Si GHL_SYNC_MODE !== 'live' → delegar a syncGHLContactDryRun (3A)
2. Validar GHL_API_KEY + GHL_LOCATION_ID presentes
3. Buscar contacto por teléfono normalizado (E.164 +52...)
4. Si 0 resultados → POST /contacts/ (mínimo: phone, locationId, source)
5. Si 1 resultado → PATCH parcial (solo campos WA permitidos)
6. Si >1 resultados → log error, wa_needs_human=true, NO auto-merge
7. POST tags (add only, idempotente)
8. POST note (append)
9. POST task si aplica (humano, duda_test, beca baja confianza, etc.)
10. Guardar ghl_contact_id en wa_contacts_state
11. Insert wa_ghl_sync_log (sync_mode=live, status=ok|failed)
```

**Prohibido en cualquier paso:** Conversations API, SMS, WhatsApp channel GHL, pipelines/opportunities.

---

## Endpoints GHL necesarios

| Paso | Método | Endpoint | Notas |
|---|---|---|---|
| Buscar contacto | `POST` | `/contacts/search` | Body: `locationId`, `pageLimit`, `query` (teléfono) |
| Crear contacto | `POST` | `/contacts/` | Solo campos mínimos + customFields WA |
| Actualizar contacto | `PUT` | `/contacts/:contactId` | **Patch conservador** — nunca full replace |
| Agregar tags | `POST` | `/contacts/:contactId/tags` | Body: `{ "tags": ["eva-wa", "wa_interes_info"] }` |
| Crear nota | `POST` | `/contacts/:contactId/notes` | Body: `{ "body": "..." }` |
| Crear task | `POST` | `/contacts/:contactId/tasks` | title, body, dueDate, assignedTo opcional |
| Obtener contacto | `GET` | `/contacts/:contactId` | Pre-update diff para proteger campos test |

Docs oficiales:
- [Search Contacts Advanced](https://marketplace.gohighlevel.com/docs/ghl/contacts/search-contacts-advanced)
- [Create Contact](https://marketplace.gohighlevel.com/docs/ghl/contacts/create-contact)
- [Update Contact](https://marketplace.gohighlevel.com/docs/ghl/contacts/update-contact)

---

## Helper de referencia (no desplegado)

Archivo futuro: `insforge/functions/lib/sync-ghl-contact-live.js`

```javascript
const GHL_API_BASE = Deno.env.get("GHL_API_BASE_URL")
  || "https://services.leadconnectorhq.com";

function ghlHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  };
}

async function searchGHLContactByPhone({ apiKey, locationId, phone }) {
  const res = await fetch(`${GHL_API_BASE}/contacts/search`, {
    method: "POST",
    headers: ghlHeaders(apiKey),
    body: JSON.stringify({
      locationId,
      pageLimit: 5,
      query: phone,
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`GHL search failed (${res.status})`);
  return body?.contacts || [];
}

function pickWritableContactFields(existing, proposed) {
  const out = {};
  // Nunca tocar campos protegidos del test
  for (const [key, value] of Object.entries(proposed.customFields || {})) {
    if (GHL_WA_WRITABLE_FIELDS.includes(key)) out[key] = value;
  }
  // firstName/lastName/email solo si vacíos en GHL y fuente confiable
  if (!existing?.email && proposed.email) out.email = proposed.email;
  if (!existing?.firstName && proposed.firstName) out.firstName = proposed.firstName;
  if (!existing?.lastName && proposed.lastName) out.lastName = proposed.lastName;
  return out;
}

async function syncGHLContactLive({ client, config, context }) {
  if (config.ghlSyncMode !== "live") {
    return syncGHLContactDryRun(client, context);
  }
  if (!config.ghlApiKey || !config.ghlLocationId) {
    throw new Error("GHL_API_KEY and GHL_LOCATION_ID required for live sync");
  }
  // ... search → create|update → tags → note → task → log
}
```

Reutilizar constantes de `sync-ghl-contact.js`: `GHL_PROTECTED_FIELDS`, `INTENT_TAG_MAP`, `buildGHLDryRunPayload`.

---

## Payloads de referencia

Ver fixtures mock (sin llamadas reales): `tests/payloads/ghl-phase3b-mock-payloads.json`

### Search contact

```json
{
  "locationId": "{{GHL_LOCATION_ID}}",
  "pageLimit": 5,
  "query": "+529991525583"
}
```

### Create contact (mínimo)

```json
{
  "locationId": "{{GHL_LOCATION_ID}}",
  "phone": "+529991525583",
  "source": "YCloud / Eva WA",
  "tags": ["eva-wa", "wa_interes_info"],
  "customFields": {
    "wa_last_intent": "ambiguo",
    "wa_last_message_at": "2026-06-18T12:00:00.000Z",
    "wa_stage": "fase_3b_live",
    "wa_needs_human": false,
    "wa_summary": "Intent: ambiguo — Hola, quiero información"
  }
}
```

### Update contact (parcial — solo WA fields)

```json
{
  "customFields": {
    "wa_last_intent": "humano",
    "wa_last_message_at": "2026-06-18T12:05:00.000Z",
    "wa_stage": "humano",
    "wa_needs_human": true,
    "wa_summary": "Intent: humano — Quiero hablar con un asesor"
  }
}
```

**Nunca incluir en update:** `carrera_recomendada`, `match_percent`, `sector_principal`, `dictamen_url`, `test_completed_at`, `test_version`, `beca_elegible`, `lead_score`, `lead_class`, `promedio`, `email`, `firstName`, `lastName` si ya tienen valor.

### Add tags

```json
{
  "tags": ["eva-wa", "wa_requiere_asesor"]
}
```

### Create note

```json
{
  "body": "[Eva WA] 2026-06-18T12:05:00Z\nIntent: humano\nMensaje: Quiero hablar con un asesor\nFuente: YCloud / Eva WA"
}
```

### Create task

```json
{
  "title": "Atender lead WhatsApp — Universidad Latino",
  "body": "Teléfono: +529991525583\nÚltima intención: humano\nÚltimo mensaje: Quiero hablar con un asesor\n¿Requiere asesor?: Sí\nFuente: YCloud / Eva WA",
  "dueDate": "2026-06-18T12:05:00.000Z",
  "completed": false
}
```

---

## Tags por intent (igual que 3A)

| Intent | Tag |
|---|---|
| `ambiguo` | `wa_interes_info` |
| `no_se_que_estudiar` | `wa_interes_test` |
| `explorar_carreras` | `wa_interes_info` |
| `beca` | `wa_interes_beca` |
| `humano` | `wa_requiere_asesor` |
| `duda_test` | `wa_duda_test` |
| `post_test` | `wa_post_test` |
| `sin_texto` | `wa_sin_texto` |

Siempre agregar tag base `eva-wa`.

---

## Tasks live (más estricto que dry-run 3A)

| Condición | Crear task |
|---|---|
| `humano` | Sí |
| `duda_test` | Sí |
| `beca` con baja confianza | Sí (en 3A dry-run se simula siempre) |
| `sin_texto` repetido (≥2 en 24h) | Sí |
| Error/fallback crítico | Sí |
| `ambiguo`, `no_se_que_estudiar`, `post_test` | No |

---

## Protección campos del test vocacional

### Nunca sobrescribir

`carrera_recomendada`, `match_percent`, `sector_principal`, `dictamen_url`, `test_completed_at`, `test_version`, `beca_elegible`, `lead_score`, `lead_class`, `promedio`, `email` existente, `firstName`/`lastName` existentes.

### Solo escribir (custom fields WA)

`wa_last_intent`, `wa_last_message_at`, `wa_stage`, `wa_needs_human`, `wa_summary`

### Regla de merge

1. `GET /contacts/:id` antes de update.
2. Comparar campos protegidos — si difieren del payload propuesto, omitir del PATCH.
3. Log en `wa_ghl_sync_log.protected_fields` qué se omitió y por qué.

---

## Pruebas mock (sin llamadas GHL reales)

### A. Runtime Eva WA (ya validado 3A)

`tests/payloads/ycloud-phase3a-ghl-dry-run.json` — POST a `ycloud-wa-inbound` con `WA_AGENT_MODE=mock`.

Criterios: `ghl_dry_run=true`, `outbound_real=false`, fila en `wa_ghl_sync_log`.

### B. Fixtures GHL API (offline)

`tests/payloads/ghl-phase3b-mock-payloads.json` — request/response simulados para unit tests del helper live.

### C. Prueba live controlada (Fase 3B — 1 contacto)

Solo tras confirmar secrets en dashboard:

1. Elegir teléfono de prueba acordado (ej. `+529991525583`).
2. Verificar en GHL UI estado previo del contacto (screenshot campos test).
3. Cambiar **solo** `GHL_SYNC_MODE=live` (mantener `WA_AGENT_MODE=mock`).
4. Enviar 1 inbound simulado con ese teléfono.
5. Verificar en GHL: tags, nota, task (si aplica), custom fields WA.
6. Verificar campos test **sin cambios**.
7. Verificar `wa_ghl_sync_log` con `sync_mode=live`, `status=ok`.
8. Revertir `GHL_SYNC_MODE=dry_run` inmediatamente.

---

## Próximos pasos para prueba live de 1 contacto

1. **Leandro confirma en dashboard InsForge** que existen `GHL_API_KEY` y `GHL_LOCATION_ID` (MCP no puede leerlos).
2. Confirmar **custom field keys** WA en GHL coinciden con los del payload (`wa_last_intent`, etc.).
3. Confirmar **teléfono de prueba** y si el contacto ya existe en GHL.
4. Implementar `syncGHLContactLive` en código (rama `GHL_SYNC_MODE=live`).
5. Desplegar edge function.
6. Ejecutar protocolo C arriba con `WA_AGENT_MODE=mock`.
7. Revisar diff manual GHL antes/después.
8. Volver a `GHL_SYNC_MODE=dry_run`.
