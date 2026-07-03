# OPS-0C — Deploy controlado ENG-0B + dedup + índice idempotencia

**Date:** 2026-07-03  
**Phase:** OPS-0C  
**Target commit:** `8fe3587` — `feat(eva): idempotent webhook handling by ycloud_message_id`  
**Endpoint:** https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound

---

## 1. Resultado del push ENG-0B

| Check | Resultado |
|-------|-----------|
| Push | **OK** — `93bc987..8fe3587 main -> main` |
| Commit publicado | `8fe358781fb97657cb13cdfedad97b92f15287ba` |
| `origin/main` | `8fe3587` (sync con HEAD local) |
| Working tree post-push | clean, up to date with `origin/main` |

**`git log --oneline -5` post-push:**

```
8fe3587 feat(eva): idempotent webhook handling by ycloud_message_id
93bc987 fix(eva): persist academic_state at runtime via RPC and Deno-safe deploy
0faf65b feat(eva): persist academic_state in wa_contacts_state for multi-turn memory
52716fc feat(eva): add shouldShowAmbiguoMenu to prevent repeated menu on vague greetings
c5db25f chore: ignore temporary phase result artifacts
```

---

## 2. Preflight remoto

### Git local (OPS-0C inicio)

- HEAD = origin/main = `8fe3587`
- Working tree clean

### Función InsForge

| Campo | Valor |
|-------|-------|
| Slug | `ycloud-wa-inbound` |
| Status | **active** |
| Endpoint | `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound` |
| Código pre-deploy | Bundle anterior (`93bc987` era) — **sin** `duplicate_ycloud_message_id` |
| Código post-deploy | Bundle `8fe3587` — **con** idempotencia ENG-0B |

### Flags seguros confirmados (preflight runtime)

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

## 3. Bundle / deploy

| Paso | Resultado |
|------|-----------|
| `node scripts/bundle-ycloud-wa-deploy.mjs` | **OK** — `284.6 KB` |
| `node scripts/check-bundle-require.mjs` | **OK** — `require("fs")`: 0, `require("path")`: 0 |
| MCP `update-function` | **OK** — `success: true`, status `active` |
| Secrets / env vars | **No modificados** |

---

## 4. Validación idempotencia real (replay remoto)

Teléfono test: `+525559990200`

### Caso A — primer evento (`ops0c-idem-001`)

- Input: `Hola, quiero información`
- Resultado: `ok=true`, `skipped=false`, `outbound_real=false`, `ghl_live=false`
- `inbound_id`: `5d503acb-b90e-424f-82d3-153a1918641e`
- `outbound_id`: `473a4c10-b120-4000-a48c-fc9f0ff0c43d`

### Caso B — replay exacto (`ops0c-idem-001`)

- Resultado: **PASS**
  - `ok=true`, `skipped=true`, `idempotent=true`
  - `reason=duplicate_ycloud_message_id`
  - `inbound_id` = mismo que Caso A (sin side effects)

### Caso C — mismo teléfono, nuevo ID (`ops0c-idem-002`)

- Input: `No sé qué estudiar`
- Resultado: `ok=true`, `skipped=false`, procesamiento normal
- `inbound_id`: `4ed48a6e-77ae-4696-a820-b42072a3a668`

**Replay idempotente real:** **PASS**

---

## 5. Conteos antes/después replay

| Tabla | Antes replay | Después replay (incl. preflight) | Delta replay |
|-------|-------------|----------------------------------|--------------|
| `wa_inbound_messages` | 1316 | 1319 | **+3** (preflight + A + C; B skipped) |
| `wa_outbound_messages` | 1316 | 1319 | **+3** |
| `wa_ghl_sync_log` | 1287 | 1290 | **+3** |

Verificación: `COUNT(*) WHERE ycloud_message_id IN ('ops0c-idem-001','ops0c-idem-002','ops0c-preflight-flags')` = **3** (solo un registro por ID).

---

## 6. Duplicados históricos encontrados

Consulta: `ycloud_message_id IS NOT NULL HAVING COUNT(*) > 1`

| `ycloud_message_id` | Count | Teléfonos | Origen |
|---------------------|------:|-----------|--------|
| `msg-case-01` | 2 | `+525512345678` | Fixture E2E 2026-06-17 |
| `msg-case-02` | 2 | `+525512345678` | Fixture E2E |
| `msg-case-03` | 2 | `+525576543210` | Fixture E2E |
| `msg-case-04` | 2 | `+525544455566` | Fixture E2E |
| `msg-case-05` | 2 | `+525522244466` | Fixture E2E |
| `msg-case-06` | 2 | `+525533344455` | Fixture E2E |
| `msg-case-07` | 2 | `+525511998877` | Fixture E2E |

**Total:** 7 grupos, 14 filas (7 duplicadas). Todos son fixtures de prueba con IDs `msg-case-*`; no hay teléfonos de producción real en estos grupos.

---

## 7. Dedup aplicado

**Sí** — deduplicación limitada y controlada.

**Estrategia:**

- Scope: solo `msg-case-01` … `msg-case-07`
- Conservar: fila con menor `(received_at, id)` por grupo
- Eliminar: 7 filas duplicadas + sus `wa_outbound_messages` y `wa_ghl_sync_log` referenciados (FK)
- IDs eliminados: `bf2fac1c`, `5998466c`, `6a72b3cd`, `e33d44b0`, `56e0d18a`, `cab6595d`, `5a2fec45`

Post-dedup: **0 duplicados** `ycloud_message_id` no nulos.

---

## 8. Índice único aplicado

**Sí** — aplicado tras confirmar cero duplicados.

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_inbound_messages_ycloud_message_id_unique
ON wa_inbound_messages (ycloud_message_id)
WHERE ycloud_message_id IS NOT NULL;
```

**Verificación post-apply:**

```
CREATE UNIQUE INDEX idx_wa_inbound_messages_ycloud_message_id_unique
ON public.wa_inbound_messages USING btree (ycloud_message_id)
WHERE (ycloud_message_id IS NOT NULL)
```

Archivo fuente en repo: `insforge/sql/wa_inbound_messages_idempotency.sql`

---

## 9. Smoke 7C final

```
Phase 7C smoke: 10/10 PASS
```

| Flag verificado | Valor |
|-----------------|-------|
| `outbound_real` | `false` (todos los casos) |
| `ghl_live` | `false` |
| `custom_fields_written` | `false` |
| `eva_llm_enabled` | `false` |
| `academic_engine_enabled` | `true` |

Reporte auto-generado: `docs/phase-7c-insforge-controlled-deploy-report.md` (modificado por el runner; revertir antes de commit si no se desea incluir).

---

## 10. Flags seguros confirmados (post-OPS-0C)

Runtime permanece en modo seguro:

```
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=false
```

---

## 11. `wa_errors` recientes (últimos 30 min)

**0 errores** — consulta `created_at >= NOW() - INTERVAL '30 minutes'` devolvió 0 filas.

---

## 12. Conteos finales post-OPS-0C

| Tabla | Inicio OPS-0C | Final (post smoke 7C) | Delta neto |
|-------|--------------:|----------------------:|-----------:|
| `wa_inbound_messages` | 1316 | 1323 | +7 |
| `wa_outbound_messages` | 1316 | 1323 | +7 |
| `wa_ghl_sync_log` | 1287 | 1301 | +14 |

Desglose aproximado: +3 replay idempotencia + 11 smoke 7C (preflight + 10 casos) − 7 dedup inbound/outbound/ghl.

---

## 13. Archivos modificados/creados (local, sin commit)

| Archivo | Estado |
|---------|--------|
| `docs/phase-ops-0c-idempotency-deploy-report.md` | **Creado** (este reporte) |
| `docs/phase-7c-insforge-controlled-deploy-report.md` | Modificado por smoke runner |
| `insforge/functions/dist/ycloud-wa-inbound.deploy.js` | Regenerado (gitignored) |

**Remoto InsForge (sin commit):**

- Deploy función `ycloud-wa-inbound` con bundle ENG-0B
- Dedup SQL 7 filas `msg-case-*`
- Índice único parcial `idx_wa_inbound_messages_ycloud_message_id_unique`

---

## 14. Riesgos pendientes

1. **Replay sin `ycloud_message_id`:** sigue procesándose sin idempotencia (warning `missing_ycloud_message_id`; comportamiento esperado ENG-0B).
2. **Race condition:** cubierta en código (`23505` handler); índice único ahora refuerza a nivel DB.
3. **`ops0c-preflight-flags`:** fila de preflight idempotencia quedó en DB (fixture de prueba; no afecta producción).
4. **Smoke 7C regeneró** `phase-7c-insforge-controlled-deploy-report.md` — revertir si no se quiere en próximo commit.
5. **SQL remoto aplicado** (dedup + índice) no está versionado como migración ejecutada en InsForge CLI; documentado aquí para trazabilidad.

---

## 15. Recomendación siguiente fase

| Acción | Recomendación |
|--------|---------------|
| Commit | **Sí** — incluir `docs/phase-ops-0c-idempotency-deploy-report.md` |
| Revert opcional | `docs/phase-7c-insforge-controlled-deploy-report.md` si no se desea el diff del smoke |
| Push adicional | Tras aprobación del reporte OPS-0C |
| Siguiente fase | **ENG-0C** — replay 7g7c7b con `academic_state` + endurecer `classifyIntent` |

---

## Resumen ejecutivo

| Item | Resultado |
|------|-----------|
| Push ENG-0B | **OK** |
| Deploy idempotencia remota | **OK** |
| Replay idempotente | **PASS** |
| Dedup histórico | **Sí** (7 fixtures) |
| Índice único | **Sí** |
| Smoke 7C | **10/10 PASS** |
| Modo live | **No activado** |
