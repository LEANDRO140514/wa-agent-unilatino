# 7G.7C.2 — Qualified Sync Dry-Run Deploy Report

**Estado:** ✅ **COMPLETADO** — deploy + validación remota; sin GHL live, sin WhatsApp real  
**Fecha:** 2026-06-26  
**Commit desplegado:** `76d60a7` — feat(7G.7C.1): wire qualified sync policy to ghl relevance gate  
**Endpoint:** `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`

---

## 1. Preflight

| Check | Resultado |
|-------|-----------|
| `git HEAD` | `76d60a7` ✅ |
| Working tree | Pendientes no relacionados presentes; **excluidos del deploy** ✅ |
| Cambios deployables | Solo artefacto de 7G.7C.1 (`ghl-sync-policy.js` + wiring handler) ✅ |
| Secrets nuevos | **No** creados ✅ |
| `GHL_WA_FIELD_MAP` | **No tocado** ✅ |
| DB schema | **No tocado** ✅ |
| GHL live | **Bloqueado** (`GHL_SYNC_MODE=dry_run`) ✅ |
| WhatsApp real | **Bloqueado** (`WA_AGENT_MODE=mock`) ✅ |
| Rollback | Disponible vía flags (sección 16) ✅ |

### Pendientes no relacionados preservados (fuera del deploy)

- `docs/phase-7g6c-*`, `docs/phase-7g8-*`, `docs/phase-7g6d-organic-limited-prep.md`
- `tests/run-phase7g6c-admissions-pilot*.mjs`
- Modificaciones locales en reportes 7G.3A / 7G.6C / 7G.7B.1

---

## 2. Commit desplegado

```
76d60a7 feat(7G.7C.1): wire qualified sync policy to ghl relevance gate
```

Archivos incluidos en el bundle:

- `insforge/functions/lib/ghl-sync-policy.js`
- `insforge/functions/ycloud-wa-inbound.js` (wiring policy gate → sync)
- Dependencias existentes (academic-engine, eva-llm, ghl-relevance-gate)

---

## 3. Bundle desplegado

| Campo | Valor |
|-------|-------|
| Script | `node scripts/bundle-ycloud-wa-deploy.mjs` |
| Artefacto | `insforge/functions/dist/ycloud-wa-inbound.deploy.js` |
| Tamaño | **222.1 KB** |
| Función | `ycloud-wa-inbound` |

---

## 4. Método de deploy

| Campo | Valor |
|-------|-------|
| Herramienta | MCP InsForge `update-function` |
| Slug | `ycloud-wa-inbound` |
| Status | `active` |
| **updatedAt** | **`2026-06-26T05:07:29.604Z`** |
| Resultado | `success: true` |

Solo se actualizó `ycloud-wa-inbound`. Ninguna otra function modificada.

---

## 5. Runtime efectivo

Verificado vía `ghl_relevance_shadow.policy` y probes POST:

| Flag / secret | Valor efectivo |
|---------------|----------------|
| `WA_AGENT_MODE` | `mock` |
| `GHL_SYNC_MODE` | `dry_run` |
| `GHL_SYNC_POLICY` | **`qualified_only`** (secret ya configurado; no requirió cambio en esta fase) |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` |
| `GHL_LIVE_ALLOWED_PHONES` | Configurado (`allowed_phones_count: 1`) |

**Nota:** `GHL_SYNC_POLICY` existía en `system.secrets` desde antes del deploy. El shadow reporta `policy: "qualified_only"` sin modificar secrets en 7G.7C.2.

---

## 6. Post-deploy probe

POST controlado (`Hola`, teléfono de prueba):

```json
{
  "ok": true,
  "mode": "mock",
  "ghl_sync_mode": "dry_run",
  "outbound_real": false,
  "ghl_live": false,
  "ghl_synced": false,
  "ghl_dry_run": true,
  "ghl_policy_blocked": true,
  "ghl_sync_status": "ignored_intent",
  "custom_fields_enabled": false,
  "custom_fields_written": false,
  "policy": "qualified_only",
  "would_sync": false,
  "ignored": true,
  "routing": "ignored_intent"
}
```

**Cambio observable vs pre-deploy (7G.7B.4 sin wiring):** saludo pasó de `ghl_sync_status: "dry_run"` (legacy sync) a `ghl_policy_blocked: true` — el gate gobierna dry_run bajo `qualified_only`.

---

## 7. Casos remotos ejecutados

Runner: `node tests/run-phase7g7c2-qualified-sync-remote.mjs`  
**8/8 PASS** (preflight + 7 casos)

| ID | Input | Resultado clave |
|----|-------|----------------|
| PREFLIGHT | `"1"` allowlist phone | `policy=qualified_only`, flags seguros ✅ |
| C1 | `Hola` | `ignored_for_ghl`, `ghl_policy_blocked`, no live ✅ |
| C2 | Asesor → `Gracias` / `Bye` | `post_escalation_closure_no_sync`, sin task duplicada ✅ |
| C3 | `Cuánto cuesta Derecho en línea?` | `cost_signal_requires_human_validation`, task dry_run ✅ |
| C4 | `Quiero hablar con asesor` | `human_handoff`, task dry_run, no live ✅ |
| C5 | Meta `Hola` + `first_message` | `meta_ads_first_message_no_sync`, `policy_blocked` ✅ |
| C6 | `Me interesa Derecho en línea` | `would_sync_to_ghl`, `ghl_dry_run`, sin task ✅ |
| C7 | `me gusta el fútbol` | `would_sync_to_ghl=false`, `policy_blocked` ✅ |

### Evidencia `wa_ghl_sync_log` (policy_blocked)

Últimos registros post-deploy:

| action | status | intent |
|--------|--------|--------|
| `policy_blocked` | `ignored_intent` | `ambiguo` |
| `policy_blocked` | `post_escalation_closure_no_sync` | `agradecimiento` |
| `policy_blocked` | `post_escalation_closure_no_sync` | `despedida` |
| `policy_blocked` | `meta_ads_first_message_no_sync` | `ambiguo` |
| `policy_blocked` | `below_threshold` | `ambiguo` |

---

## 8. Resultados de suites

| Runner | Resultado |
|--------|-----------|
| `run-phase7g7c-qualified-sync.mjs` | **15/15 PASS** |
| `run-phase7g7b-ghl-relevance-shadow.mjs` | **22/22 PASS** |
| `run-phase7g6d-conversation-hotfix.mjs` | **4/4 PASS** |
| `run-phase7g3a-classifier-hotfix.mjs` | **14/14 PASS** |
| `run-phase7g5b-custom-fields-preflight.mjs` | **9/9 PASS** |
| `run-phase7g7c2-qualified-sync-remote.mjs` | **8/8 PASS** |

---

## 9–12. Evidencia de runtime seguro

| Métrica | Valor en todos los casos remotos |
|---------|----------------------------------|
| `outbound_real` | **`false`** |
| `ghl_live` | **`false`** |
| `ghl_synced` | **`false`** |
| `custom_fields_enabled` | **`false`** |
| `custom_fields_written` | **`false`** |

GHL API real no invocada. WhatsApp real no enviado.

---

## 13. Evidencia de que `qualified_only` gobierna dry_run

1. Saludo simple: pre-deploy hacía dry_run legacy; post-deploy → `ghl_policy_blocked: true`.
2. Carrera calificada: `ghl_dry_run: true` + `would_sync_to_ghl: true` (sync gobernado permitido).
3. Costo: dry_run con `would_create_task` según gate (no legacy `EVA_TASK_INTENTS` aislado).
4. `wa_ghl_sync_log.action = policy_blocked` para casos no calificados.

---

## 14. wa_errors críticos

Consulta últimos 30 min (`function_error`, `ghl_live_failed`, `outbound_live_failed`, `ghl_sync_failed`):

**0 filas** — sin errores críticos.

---

## 15. Pendientes no relacionados preservados

Sin commit ni deploy de 7G.6C / 7G.8. Working tree mantiene docs/runners pendientes fuera de este commit.

---

## 16. Rollback disponible

Si se requiere revertir comportamiento de sync a legacy dry_run:

```txt
1. WA_AGENT_MODE=mock
2. GHL_WRITE_CUSTOM_FIELDS=false
3. GHL_SYNC_MODE=dry_run
4. GHL_SYNC_POLICY=none
5. GHL_LIVE_ALLOWED_PHONES=+529991525583
```

Smoke mínimo post-rollback: `node tests/run-phase7c-insforge-smoke.mjs` o probe `"1"` → `ghl_policy_blocked` ausente en saludo legacy.

Código 7G.7C.1 en runtime es compatible con `GHL_SYNC_POLICY=none` (comportamiento legacy preservado en código).

---

## 17. Veredicto

**7G.7C.2 APROBADO**

- Wiring 7G.7C.1 desplegado y activo en InsForge.
- `GHL_SYNC_POLICY=qualified_only` gobierna sync dry_run remotamente.
- Runtime seguro intacto: mock + dry_run + sin CF live + sin GHL live + sin WA real.
- Todas las suites obligatorias en verde.
- `wa_errors` críticos = 0.

---

## 18. Recomendación para 7G.7C.3

**Siguiente fase sugerida:** piloto `GHL_SYNC_MODE=live` + `qualified_only` **solo** en `GHL_LIVE_ALLOWED_PHONES=+529991525583`, manteniendo:

- `GHL_WRITE_CUSTOM_FIELDS=false` (inicialmente)
- `WA_AGENT_MODE=mock` o `live_outbound` según acuerdo operativo
- 3–5 mensajes de matriz 7G.7C (carrera, costo/task, asesor)
- Validación `wa_ghl_sync_log` + GHL UI
- Rollback inmediato a `GHL_SYNC_MODE=dry_run` tras piloto

**No iniciar 7G.7C.3** sin autorización explícita de Leandro.
