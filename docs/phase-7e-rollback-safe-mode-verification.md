# Phase 7E — Rollback a modo seguro (verificación)

**Fecha:** 2026-06-17  
**Endpoint:** `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`  
**Contexto:** Tras 7E 5/5 PASS, regresar runtime a mock/dry_run sin GHL live ni LLM.

## Flags objetivo (Dashboard → Function secrets)

| Secret | Valor seguro |
|--------|----------------|
| `WA_AGENT_MODE` | `mock` |
| `GHL_SYNC_MODE` | `dry_run` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` |
| `ACADEMIC_ENGINE_ENABLED` | `true` |
| `EVA_LLM_ENABLED` | `false` |

## Verificación runtime (POST preflight)

Un único POST de control (`rollback-verify`) devolvió:

| Campo | Esperado | Observado |
|-------|----------|-----------|
| `mode` | `mock` | `mock` |
| `outbound_real` | `false` | `false` |
| `ghl_live` | `false` | `false` |
| `ghl_dry_run` | `true` | `true` |
| `custom_fields_written` | `false` | `false` |
| `academic_engine_enabled` | `true` | `true` |
| `eva_llm_enabled` | `false` | `false` |

## Smoke 7C (sin WA/GHL live)

```
node tests/run-phase7c-insforge-smoke.mjs
→ 10/10 PASS
```

## Salud DB

- `wa_errors` últimos 10 min: **0**

## Restricciones vigentes

- No ejecutar `run-phase7e-wa-live-ghl-live.mjs` hasta autorización explícita de Leandro.
- No activar `EVA_LLM_ENABLED` ni `OPENAI_API_KEY`.
- No volver a `GHL_SYNC_MODE=live` sin autorización explícita.

## Resultado

**Rollback verificado.** Runtime en modo seguro; academic-engine activo; sin outbound real, sin GHL live, sin custom fields escritos, sin LLM.
