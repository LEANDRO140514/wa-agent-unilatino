# OPS-0D — Deploy controlado ENG-0D + replay remoto 17/17

**Date:** 2026-07-03  
**Phase:** OPS-0D  
**Commit desplegado:** `2dabd21` — `fix(eva): carreras list phrases and duration follow-up from academic state`  
**Endpoint:** https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound

---

## 1. Commit ENG-0D publicado

| Item | Valor |
|------|-------|
| Commit local/remoto | `2dabd212386bb482de0a472e5b82a8ee9bd27178` |
| Push | `2e92894..2dabd21 main -> main` |
| Mensaje | `fix(eva): carreras list phrases and duration follow-up from academic state` |

---

## 2. Preflight local/remoto

### Git (post-push ENG-0D)

- Branch: `main`
- HEAD = origin/main = `2dabd21`
- Working tree: clean

### Función InsForge

| Campo | Valor |
|-------|-------|
| Slug | `ycloud-wa-inbound` |
| Status | **active** |
| Endpoint | `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound` |

### Flags seguros (preflight replay)

| Flag | Valor | Esperado |
|------|-------|----------|
| `mode` | `mock` | `mock` |
| `ghl_sync_mode` | `dry_run` | `dry_run` |
| `outbound_real` | `false` | `false` |
| `ghl_live` | `false` | `false` |
| `custom_fields_written` | `false` | `false` |
| `academic_engine_enabled` | `true` | `true` |
| `eva_llm_enabled` | `false` | `false` |

**Abort condition:** ningún flag live detectado.

---

## 3. Bundle y verificación Deno-safe

| Paso | Resultado |
|------|-----------|
| `node scripts/bundle-ycloud-wa-deploy.mjs` | **OK** — 286.2 KB |
| `node scripts/check-bundle-require.mjs` | **OK** — `require("fs")`: 0, `require("path")`: 0 |
| Código ENG-0D en bundle | Confirmado (`pregunta_duracion`, `careerFromContext`) |

---

## 4. Deploy InsForge

| Item | Resultado |
|------|-----------|
| MCP `update-function` | **OK** — `success: true` |
| Status post-deploy | **active** |
| Secrets / env vars | **No modificados** |
| Runtime | mock / dry_run confirmado post-deploy |

---

## 5. Replay ENG-0C remoto 17/17

**Comando:** `node tests/run-phase-eng-0c-classify-intent-replay.mjs` (sin `PHASE_ENG0C_LOCAL`)  
**Run NUM:** `06876879`  
**Modo:** remote

| Grupo | Resultado |
|-------|-----------|
| A (menú/ambiguo) | 5/5 PASS |
| B (intents core) | 5/5 PASS |
| C (carrera/academic) | 3/3 PASS |
| D (multi-turn) | 3/3 PASS |
| E (idempotencia) | 1/1 PASS |
| **Total** | **17/17 PASS** |

### Fixes ENG-0D en remoto

| Caso | Resultado | Detalle |
|------|-----------|---------|
| **B7** | **PASS** | `"Quiero ver carreras"` → `carreras_disponibles` |
| **D3** | **PASS** | `"¿Y cuánto dura?"` → `academic_enriched=true`, duración desde contexto |

Evidencia: `tests/.phase-eng-0c-replay-results.json`

---

## 6. ENG-0B idempotency

```
ENG-0B: 4/4 PASS (mock DB)
```

Sin regresión en idempotencia local.

---

## 7. Smoke 7C

```
Phase 7C smoke: 10/10 PASS
```

| Flag | Valor |
|------|-------|
| outbound_real | false |
| ghl_live | false |
| custom_fields_written | false |
| eva_llm_enabled | false |
| academic_engine_enabled | true |

---

## 8. Flags seguros confirmados (post-OPS-0D)

Runtime remoto permanece en:

```
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=false
```

---

## 9. wa_errors recientes (últimos 30 min)

| Tipo | Count | Notas |
|------|------:|-------|
| `phone_normalization_failed` | 19 | Fixtures de replay remoto **anterior** (teléfonos alfanuméricos pre-fix `RUN_NUM`). **No crítico.** |
| Errores nuevos post-deploy OPS-0D | **0** | Replay 17/17 completó sin fallos de normalización |

El replay OPS-0D usó teléfonos numéricos (`+52550687XXXX`) — sin nuevos errores críticos.

---

## 10. Riesgos pendientes

1. **wa_errors históricos** `phone_normalization_failed` — limpieza opcional; no afectan runtime.
2. **Smoke 7C** regenera `docs/phase-7c-insforge-controlled-deploy-report.md` — revertir antes de commit si no se desea incluir.
3. **Piloto admisiones (VAL-0)** — siguiente hito con runtime alineado ENG-0D.

---

## 11. Recomendación siguiente

| Acción | Recomendación |
|--------|---------------|
| **Commit** | Sí — incluir `docs/phase-ops-0d-eng0d-deploy-replay-report.md` |
| **Mensaje sugerido** | `docs(eva): close ops 0d eng0d deploy and remote replay 17/17` |
| **Push** | Tras aprobación del reporte |
| **Siguiente fase** | **VAL-0** — piloto estricto con admisiones (mock/dry_run hasta go-live checklist) |

---

## Resumen ejecutivo

| Item | Resultado |
|------|-----------|
| Deploy ENG-0D | **OK** |
| Replay remoto ENG-0C | **17/17 PASS** |
| Fix B7 remoto | **PASS** |
| Fix D3 remoto | **PASS** |
| ENG-0B | **4/4 PASS** |
| Smoke 7C | **10/10 PASS** |
| Modo live | **No activado** |
