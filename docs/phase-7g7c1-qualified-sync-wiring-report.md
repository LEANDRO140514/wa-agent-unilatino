# 7G.7C.1 — Qualified Sync Wiring Report

**Estado:** ✅ **LOCAL ONLY** — wiring + tests; sin deploy, sin flags, sin GHL live  
**Fecha:** 2026-06-26  
**Base:** `7af73b0` — docs: specify qualified sync allowlist phase  
**Spec:** `docs/phase-7g7c-qualified-sync-allowlist-spec.md`

---

## 1. Objetivo cumplido

Conectar localmente el resultado del shadow gate (`evaluateGhlRelevance` / `ghl_relevance_shadow`) al sync real de GHL bajo `GHL_SYNC_POLICY=qualified_only`, respetando allowlist, `ignored_for_ghl`, `would_sync_to_ghl`, excepciones high-value y bloqueos de mensajes no comerciales.

**Runtime seguro sin cambios:** `GHL_SYNC_POLICY` default `none` + `GHL_SYNC_MODE=dry_run` conserva el comportamiento legacy actual.

---

## 2. Archivos entregados

| Archivo | Rol |
|---------|-----|
| `insforge/functions/lib/ghl-sync-policy.js` | Lógica pura: `normalizeGhlSyncPolicy`, `resolveGhlSyncAuthorization`, `enrichGhlSyncContext`, high-value exceptions |
| `insforge/functions/ycloud-wa-inbound.js` | Wiring handler: auth antes de `syncGHLContact`, `policy_blocked` log, dry_run/live payload gobernado por gate |
| `tests/run-phase7g7c-qualified-sync.mjs` | Suite 7G.7C.1 (15 casos) |
| `docs/phase-7g7c1-qualified-sync-wiring-report.md` | Este reporte |

**No tocado:** `ghl-relevance-gate.js`, `GHL_WA_FIELD_MAP`, DB schema, secrets, flags InsForge, pendientes 7G.6C / 7G.8.

---

## 3. Comportamiento por política

### `GHL_SYNC_POLICY=none` (default)

| Modo | Sync |
|------|------|
| `dry_run` | Legacy sin gate — **sin cambio** respecto a pre-7G.7C.1 |
| `live` | Bloqueado (`policy_none`) |

### `GHL_SYNC_POLICY=all`

| Modo | Sync |
|------|------|
| `dry_run` | Legacy sin gate |
| `live` | Legacy; allowlist aplica si `GHL_LIVE_ALLOWED_PHONES` configurado |

### `GHL_SYNC_POLICY=qualified_only`

Sync solo si **todas** aplican:

1. `relevanceDecision.would_sync_to_ghl === true`
2. `relevanceDecision.ignored_for_ghl !== true`
3. `qualified_for_ghl === true` **o** `routing_reason` high-value válido
4. En `live`: teléfono ∈ `GHL_LIVE_ALLOWED_PHONES`
5. Task/note/contact según flags del gate (`ghlWouldCreate*`)

Bloqueados: saludos, gracias/bye post-escalación, spam, media sin texto, Meta Ads primer saludo, off-topic, score bajo sin excepción.

**Costo sin validación explícita:** sync autorizado con `would_create_task=true` y `human_handoff_reason=cost_or_tuition_requires_validation` — sin inventar datos de costo.

**Post-escalación:** gracias/bye no duplican task (`would_create_task=false`, `post_escalation_closure_no_sync`).

---

## 4. Flujo en handler

```
evaluateGhlRelevance() → ghl_relevance_shadow
        ↓
resolveGhlSyncAuthorization(config, shadow, allowlist)
        ↓
  shouldSync? ──no──→ insertGhlPolicyBlockedResult (wa_ghl_sync_log: policy_blocked)
        │
       yes
        ↓
enrichGhlSyncContext(base, shadow, auth)  → ghlSyncGovernedByGate=true
        ↓
syncGHLContact (dry_run | live) con would_create_* del gate
```

`buildGHLDryRunPayload` / `shouldCreateTaskDryRun` / `buildGHLNoteBody` respetan `ghlSyncGovernedByGate` cuando la política gobierna.

---

## 5. Resultados de tests

### Suite nueva 7G.7C.1

```bash
node tests/run-phase7g7c-qualified-sync.mjs
```

**15/15 PASS**

| ID | Caso |
|----|------|
| A | `none` + `dry_run` → legacy sin gate |
| B | `none` + `live` → bloqueo `policy_none` |
| C | `qualified_only` + saludo → bloqueo |
| D | `qualified_only` + carrera → sync, sin task |
| E | `qualified_only` + costo → task/handoff |
| F | `qualified_only` + `live` sin allowlist → bloqueo |
| G | `qualified_only` + `live` + allowlist + carrera → sync |
| H | Post-escalación gracias → no sync, sin task duplicada |
| I | Meta Ads primer saludo → no sync |
| J | Inscripción explícita → task |
| K | `all` + `live` sin allowlist → bloqueo |
| L | Integración dry_run carrera calificada |
| M–N | `policy_blocked` en log/DB |
| O | Default `none`+`dry_run` legacy intacto |

### Regresión

| Runner | Resultado |
|--------|-----------|
| `run-phase7g7b-ghl-relevance-shadow.mjs` | **22/22 PASS** |
| `run-phase7g6d-conversation-hotfix.mjs` | **4/4 PASS** |
| `run-phase7g3a-classifier-hotfix.mjs` | **14/14 PASS** |
| `run-phase7g5b-custom-fields-preflight.mjs` | **9/9 PASS** |

---

## 6. Fuera de alcance (7G.7C.2+)

- Deploy a InsForge
- Activar `GHL_SYNC_POLICY=qualified_only` en producción
- `GHL_SYNC_MODE=live` real
- Cambio de flags runtime
- Meta Ads masivo / tráfico público

---

## 7. Criterios mínimos — checklist

| Criterio | Estado |
|----------|--------|
| `policy none` bloquea sync en live | ✅ |
| `policy all` conserva legacy + allowlist en live | ✅ |
| `qualified_only` exige gate + allowlist + flags live | ✅ |
| Saludos/gracias/bye/spam/media/off-topic no sincronizan | ✅ |
| Costo sin validación → task/handoff según spec | ✅ |
| No duplicar tasks post-escalación | ✅ |
| Runtime seguro default intacto | ✅ |
