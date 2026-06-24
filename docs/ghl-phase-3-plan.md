# Fase 3 — GHL como CRM (plan controlado)

## Principio rector

**GHL es CRM, no canal WhatsApp.**

- WhatsApp entra/sale solo por **YCloud** (InsForge Edge Function).
- GHL recibe contexto, notas, tags, tasks y campos WA.
- GHL **no** envía ni recibe mensajes de WhatsApp en esta fase.

## Estado previo requerido

| Fase | Estado |
|---|---|
| 2A Inbound YCloud real | ✅ |
| 2B Outbound YCloud real | ✅ (`accepted`) |
| `WA_AGENT_MODE` | Debe estar en `mock` salvo pruebas explícitas |

## Objetivo Fase 3

Tras cada inbound/outbound WA procesado, sincronizar con GHL de forma **segura y reversible**:

1. Buscar contacto por teléfono normalizado (E.164 MX).
2. Si no existe → crear contacto mínimo.
3. Si existe → **upsert parcial** sin pisar datos del test vocacional.
4. Escribir solo: notas, tags, tasks y campos WA dedicados.
5. Guardar `ghl_contact_id` en `wa_contacts_state`.

---

## Arquitectura

```
YCloud inbound → ycloud-wa-inbound (InsForge)
  → wa_inbound_messages
  → intent + respuesta YCloud
  → wa_outbound_messages
  → wa_contacts_state
  → syncGHLContact (nuevo, Fase 3)
      → GHL API (CRM only)
  → wa_ghl_sync_log (nueva tabla, recomendada)
```

---

## Modos de operación

| Modo | Variable | Comportamiento |
|---|---|---|
| Dry-run (default Fase 3A) | `GHL_SYNC_MODE=dry_run` | Calcula payload GHL, no llama API |
| Live CRM | `GHL_SYNC_MODE=live` | Llama GHL API con upsert controlado |

Independiente de `WA_AGENT_MODE` (mock / live_outbound para WhatsApp).

---

## Secrets esperados (InsForge Function)

| Variable | Uso |
|---|---|
| `GHL_API_KEY` | Bearer / API key GHL |
| `GHL_LOCATION_ID` | Location/sub-account |
| `GHL_SYNC_MODE` | `dry_run` \| `live` |
| `GHL_API_BASE_URL` | Opcional (default API v2 GHL) |

No commitear. Configurar solo en InsForge secrets.

---

## Upsert por teléfono normalizado

### Clave de búsqueda

- `normalized_phone` en `wa_contacts_state` (InsForge)
- `phone` E.164 en GHL (`+52XXXXXXXXXX`)

### Flujo

1. Normalizar con `normalizePhoneMX(from)`.
2. `GET /contacts/search?phone=...` (o equivalente GHL v2).
3. Si 0 resultados → `POST /contacts/` con datos mínimos.
4. Si 1 resultado → actualizar solo campos permitidos.
5. Si >1 → log `wa_errors`, no auto-merge, flag `wa_needs_human=true`.

---

## Campos permitidos vs prohibidos

### ✅ Escribir (Fase 3)

| Destino GHL | Contenido |
|---|---|
| **Tags** | `eva-wa`, `intent-{intent}`, `wa-needs-human` (si aplica) |
| **Notes** | Resumen inbound + intent + timestamp + enlace test si aplica |
| **Tasks** | Solo intents `humano`, `duda_test` → "Seguimiento WA Eva" |
| **Custom fields WA** | `wa_stage`, `wa_last_intent`, `wa_last_message_at`, `wa_summary` |
| **Contact base** | `phone`, `firstName`/`lastName` solo si vacíos en GHL |

### ❌ No sobrescribir (protección test vocacional)

| Campo GHL | Motivo |
|---|---|
| `beca_elegible` | Resultado post-test — solo lectura |
| Campos de test vocacional / EVA | No tocar |
| `email` | No sobrescribir si ya existe |
| `firstName` / `lastName` | No sobrescribir si ya tienen valor |
| Pipeline stage / opportunity | No mover en Fase 3 |
| Cualquier custom field no listado como WA | Ignorar |

Regla: **merge conservador** — solo rellenar vacíos; nunca `PUT` full contact.

---

## Tabla `wa_ghl_sync_log` (Fase 3A — creada)

```sql
wa_ghl_sync_log (
  id uuid PK default gen_random_uuid(),
  inbound_message_id uuid nullable references wa_inbound_messages(id),
  normalized_phone text,
  intent text,
  sync_mode text not null default 'dry_run',
  action text,
  payload jsonb,
  protected_fields jsonb,
  would_create_contact boolean default false,
  would_update_contact boolean default false,
  would_create_task boolean default false,
  would_add_tags text[],
  would_add_note text,
  status text not null default 'dry_run',
  error_message text nullable,
  created_at timestamptz default now()
)
```

---

## Helper: `syncGHLContactDryRun`

Archivo: `insforge/functions/lib/sync-ghl-contact.js` (referencia; desplegado inline en `ycloud-wa-inbound.js`)

```javascript
// Fase 3A — solo dry-run, sin fetch/POST a GHL
async function syncGHLContactDryRun(client, context) {
  // buildGHLDryRunPayload → insert wa_ghl_sync_log → return { dry_run: true, ... }
}
```

---

## Helper propuesto: `syncGHLContact` (Fase 3B live)

Archivo futuro: `insforge/functions/lib/sync-ghl-contact.js`

```javascript
// Pseudocódigo — Fase 3A dry-run
async function syncGHLContact({ config, contact, intent, inbound, outbound }) {
  if (config.ghlSyncMode !== 'live') {
    return {
      synced: false,
      dry_run: true,
      action: 'would_upsert',
      payload: buildGHLPayload(contact, intent, inbound, outbound),
    };
  }
  // Fase 3B: search → create|patch → log
}
```

---

## Fases internas

### Fase 3A — Dry-run ✅ (2026-06-18)

- [x] Crear `syncGHLContactDryRun` con `GHL_SYNC_MODE=dry_run` (default si no está configurado)
- [x] Crear `wa_ghl_sync_log`
- [x] Integrar después de `wa_contacts_state` update en `ycloud-wa-inbound`
- [x] Probar 6 casos simulados (`tests/payloads/ycloud-phase3a-ghl-dry-run.json`)
- [x] Verificar: `ghl_dry_run=true`, payload en log, **sin llamada GHL**

Helper: `insforge/functions/lib/sync-ghl-contact.js` (referencia local; lógica desplegada inline en edge function).

#### Tags por intent (dry-run)

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

Siempre se agrega tag base `eva-wa`.

#### Tasks dry-run (cuando aplica)

- `humano`, `duda_test`, `beca`, `sin_texto`, media no-texto
- Título: `Atender lead WhatsApp — Universidad Latino`

#### Campos protegidos (nunca sobrescribir)

`carrera_recomendada`, `match_percent`, `sector_principal`, `dictamen_url`, `test_completed_at`, `test_version`, `beca_elegible`, `lead_score`, `lead_class`, `promedio`, `email`, `firstName`, `lastName`

#### Secrets Fase 3A

| Variable | Valor recomendado |
|---|---|
| `WA_AGENT_MODE` | `mock` (obligatorio salvo prueba explícita) |
| `GHL_SYNC_MODE` | `dry_run` (opcional: default en código) |
| `GHL_API_KEY` | **No requerido** en 3A |

## Fase 3B — Live mínimo (implementado 2026-06-18)

- [x] Rama `syncGHLContactLive` en `ycloud-wa-inbound.js`
- [x] Sin custom fields en create/update (fase mínima)
- [x] Tags + nota + task (humano/duda_test/beca)
- [x] Log `wa_ghl_sync_log` con `sync_mode=live`
- [ ] Prueba live 1 contacto — **pendiente** hasta `GHL_SYNC_MODE=live` en dashboard

Payload prueba: `tests/payloads/ycloud-phase3b-ghl-live-single.json`  
Teléfono: `+529991525583` | Mensaje: `Quiero hablar con un asesor`

### Fase 3B — Live CRM controlado

- [ ] Configurar `GHL_API_KEY` + `GHL_LOCATION_ID`
- [ ] Cambiar a `GHL_SYNC_MODE=live`
- [ ] 1 contacto de prueba conocido (`+529991525583`)
- [ ] Verificar tags/notas/tasks creados
- [ ] Confirmar `ghl_contact_id` en `wa_contacts_state`
- [ ] Confirmar que `beca_elegible` y campos test no cambiaron

### Fase 3C — Custom fields WA (prep)

Ver `docs/ghl-phase-3c-custom-fields.md` — 8 campos WA, mapeo field IDs, payload PUT propuesto, plan live seguro.

- [ ] Leandro crea 8 custom fields en GHL UI
- [ ] Entrega mapa `key → field ID`
- [ ] Implementar `GHL_WRITE_CUSTOM_FIELDS` + PUT en live
- [ ] Prueba única 3C-live con contacto `ZPqb7Jit2zn64uaME9Cp`

### Fase 3C — Automatización intents (histórico)

- [ ] Task auto en `humano` y `duda_test`
- [ ] Tag `intent-*` por mensaje
- [ ] Nota con historial resumido (últimos N mensajes)

---

## Pruebas Fase 3 (máximo controlado)

| # | Escenario | Esperado |
|---|---|---|
| 1 | Contacto nuevo, dry-run | Log `would_create`, sin API |
| 2 | Contacto existente con test, dry-run | Payload sin campos prohibidos |
| 3 | Contacto existente, live | Solo tags/notas/WA fields |
| 4 | Intent `humano`, live | Task creada + `wa_needs_human` |
| 5 | Teléfono duplicado en GHL | Skip + error log, no merge |

---

## Scope prohibido Fase 3

- No usar GHL Conversations / SMS / WhatsApp channel
- No activar workflows GHL automáticos masivos
- No IA generativa
- No tocar EVA Test ni calculadora
- No Supabase / monorepo core
- No borrar registros WA existentes

---

## Criterios de cierre Fase 3

- [ ] Dry-run 5/5 casos sin llamada GHL
- [ ] Live 1 contacto verificado manualmente en GHL
- [ ] `ghl_contact_id` persistido
- [ ] Campos test intactos (screenshot o API diff)
- [ ] `wa_errors` sin críticos
- [ ] Documentación `tools/ghl-mcp-tools.md` actualizada

---

## Datos que necesita Leandro (GHL)

1. `GHL_API_KEY` (Private Integration Token o API key v2)
2. `GHL_LOCATION_ID` de Universidad Latino
3. Lista de **custom field keys** WA permitidos en GHL
4. Confirmación de campos test a proteger (`beca_elegible`, etc.)
5. Usuario/owner ID para asignar tasks (opcional Fase 3B)

---

## Acción inmediata post Fase 2B

**Volver `WA_AGENT_MODE=mock` en InsForge** (dashboard → Function secrets) salvo que se autoricen máximo 2 pruebas WA adicionales.

MCP InsForge no expone API para cambiar secrets; debe hacerse manualmente en el dashboard.
