# Phase 7C — Deploy Checklist (InsForge mock/dry_run)

## Estado

| Paso | Estado |
|---|---|
| Bundle academic-engine + handler | ✅ |
| Deploy `ycloud-wa-inbound` | ✅ `2026-06-22T18:42:05Z` |
| Secrets en modo seguro | ❌ **PENDIENTE dashboard** |
| Smoke tests 10 casos | ⏸️ Bloqueado por secrets |
| Reporte final | `docs/phase-7c-insforge-controlled-deploy-report.md` |

## Archivos desplegados (bundle esbuild)

Origen local → artefacto `insforge/functions/dist/ycloud-wa-inbound.deploy.js` (~154 KB):

- `insforge/functions/ycloud-wa-inbound.js` (handler + academic pipeline)
- `insforge/functions/lib/academic-engine/*` (incl. `source-of-truth.js`)
- `insforge/functions/lib/eva-llm/*` (stub pass-through)
- `insforge/functions/lib/test/mock-insforge-client.js` (inactivo en runtime: solo si `WA_E2E_MOCK_DB=true`)

**No desplegado:** tests, docs, scripts (solo se usan localmente).

## Rebuild + redeploy

```bash
node scripts/bundle-ycloud-wa-deploy.mjs
# Luego MCP update-function con slug ycloud-wa-inbound y codeFile del .deploy.js
```

## Secrets requeridos (InsForge Dashboard → Function secrets)

| Secret | Valor obligatorio 7C | Estado actual (inferido) |
|---|---|---|
| `WA_AGENT_MODE` | `mock` | ⚠️ `live_outbound` |
| `GHL_SYNC_MODE` | `dry_run` | ⚠️ `live` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` | ⚠️ `true` (CF escritos) |
| `ACADEMIC_ENGINE_ENABLED` | `true` | ❌ no existe en secrets |
| `EVA_LLM_ENABLED` | `false` | ❌ no existe en secrets |

**No tocar:** `YCLOUD_API_KEY`, `GHL_API_KEY`, `GHL_LOCATION_ID`, `GHL_WA_FIELD_MAP`, `YCLOUD_WEBHOOK_SECRET`, `YCLOUD_BUSINESS_NUMBER`.

**No crear:** `OPENAI_API_KEY`

## Confirmaciones pre-smoke

- [ ] `WA_AGENT_MODE=mock`
- [ ] `GHL_SYNC_MODE=dry_run`
- [ ] `GHL_WRITE_CUSTOM_FIELDS=false`
- [ ] `ACADEMIC_ENGINE_ENABLED=true`
- [ ] `EVA_LLM_ENABLED=false`
- [ ] Leandro confirma secrets en dashboard

## Smoke post-secrets

```bash
node tests/run-phase7c-insforge-smoke.mjs
```

El runner hace **preflight** y aborta si detecta `live_outbound` / `ghl_live`.

## Validación SQL (post-smoke)

```sql
-- wa_errors últimos 10 min
SELECT count(*) FROM wa_errors WHERE created_at > NOW() - INTERVAL '10 minutes';

-- últimos inbound/outbound del smoke
SELECT id, message_text, status, received_at
FROM wa_inbound_messages
ORDER BY received_at DESC LIMIT 10;

SELECT id, status, raw_response->>'outbound_real' AS outbound_real,
       raw_response->>'academic_engine_enabled' AS academic_engine
FROM wa_outbound_messages
ORDER BY sent_at DESC LIMIT 10;

-- ghl dry_run
SELECT id, sync_mode, status, intent FROM wa_ghl_sync_log
ORDER BY created_at DESC LIMIT 10;
```

## Incidente durante preparación 7C

Un POST de verificación previo al preflight guard ejecutó **1 interacción live** porque los secrets aún estaban en modo producción:

- Teléfono prueba: `+525551007001`
- `outbound_real=true`, `ghl_sync_mode=live`, `custom_fields_written=true`
- `wa_ghl_sync_log`: `74dc7579-5cad-48ce-a279-7952ed84958e`
- Respuesta **sin** academic-engine (secret no existía)

**Acción:** corregir secrets antes de cualquier nuevo POST al endpoint.
