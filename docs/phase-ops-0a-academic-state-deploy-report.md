# OPS-0A — Alinear InsForge con main 0faf65b (academic_state)

**Fecha:** 2026-07-03  
**Commit objetivo:** `0faf65b` — `feat(eva): persist academic_state in wa_contacts_state for multi-turn memory`  
**Endpoint:** `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`  
**Modo runtime:** mock / dry_run (sin live)

---

## 1. Preflight

| Check | Resultado |
|-------|-----------|
| Branch | `main` |
| HEAD | `0faf65b4403e9fc63604b805f5123e245e3a7ec0` |
| Sync `origin/main` | Sí |
| Git status inicial | 1 modificado: `docs/phase-7c-insforge-controlled-deploy-report.md` (smoke previo) |
| SQL local | `insforge/sql/wa_contacts_state_academic_state.sql` — OK |
| Handler local | `insforge/functions/ycloud-wa-inbound.js` — OK |

### Flags remotos (POST preflight)

| Flag | Esperado | Observado |
|------|----------|-----------|
| `mode` | `mock` | `mock` |
| `outbound_real` | `false` | `false` |
| `ghl_live` | `false` | `false` |
| `custom_fields_written` | `false` | `false` |
| `academic_engine_enabled` | `true` | `true` |
| `eva_llm_enabled` | `false` | `false` |
| `ghl_sync_mode` | `dry_run` | `dry_run` |

**Abort live:** no aplicó — runtime seguro confirmado.

---

## 2. Migración SQL

| Item | Resultado |
|------|-----------|
| Migración aplicada | **Sí** — MCP `run-raw-sql` (idempotente `ADD COLUMN IF NOT EXISTS`) |
| Columna confirmada | **Sí** — MCP `get-table-schema` |
| Tipo detectado | `jsonb`, nullable, default `NULL` |

Schema post-migración incluye `academic_state` en `wa_contacts_state`.

---

## 3. Deploy handler

| Item | Resultado |
|------|-----------|
| Bundle | `insforge/functions/dist/ycloud-wa-inbound.deploy.js` (~276 KB) vía esbuild `--platform=node` |
| Deploy | **Sí** — MCP `update-function` slug `ycloud-wa-inbound`, status `active` |
| Descripción remota | `OPS-0A: academic_state multi-turn memory (0faf65b) mock/dry_run safe` |
| Código remoto contiene `parseAcademicStateFromContact` / `academic_state` | **Sí** — verificado en payload de función |

**Nota bundle:** `node scripts/bundle-ycloud-wa-deploy.mjs` falla con `--platform=neutral` (dependencia `fs` en CAG). Deploy OPS-0A usó esbuild `--platform=node` manual. Actualizar script en ticket posterior.

Secrets / flags live: **no modificados**.

---

## 4. Smoke post-deploy

```bash
node tests/run-phase7c-insforge-smoke.mjs
→ 10/10 PASS
```

Fixture actualizado: casos 6 y 7 esperan `fallback_inteligente` (hotfix 7G.7C.7-A).

| Seguridad | Confirmado |
|-----------|------------|
| `outbound_real=false` | Sí (todos los casos) |
| `ghl_live=false` | Sí |
| `custom_fields_written=false` | Sí |
| `eva_llm_enabled=false` | Sí |
| `academic_engine_enabled=true` | Sí |
| `wa_errors` últimos 10 min post-ops | **0** |

---

## 5. Prueba multi-turno academic_state

### Caso A — flujo handler completo (tel. `+525559990090`)

| Turno | Input | Intent | Respuesta (preview) |
|-------|-------|--------|---------------------|
| 1 | Me interesa Derecho online | `carrera_interes` | Derecho Online, $1,980/mes, RVOE… |
| 2 | Cuanto cuesta? | `fallback_inteligente` | Colegiaturas genéricas + “¿Sobre qué carrera…?” |

| DB `academic_state` tras turno 1 | `null` |
| DB `academic_state` tras turno 2 | `null` |
| Memoria usada | **No** (persistencia vía handler) |

### Caso B — lectura con state sembrado vía REST API (tel. `+525559990093`)

1. Turno 1 handler → crea fila (`academic_state` null).
2. PATCH REST `academic_state` con `{ last_career: "Derecho Online", … }` → **OK en DB**.
3. Turno 2 handler “Cuanto cuesta?” → respuesta aún genérica; state en DB **se conserva** (no borrado).

### Diagnóstico

- **REST API** (`PATCH`/`GET /api/database/records/wa_contacts_state`) lee y escribe `academic_state` correctamente.
- **Handler vía `@insforge/sdk`** no persiste ni aparentemente consume `academic_state` aunque el SELECT en código incluye la columna.
- Hipótesis: cliente SDK / caché de schema PostgREST no expone aún la columna nueva al runtime de la función (column added after client metadata cached).
- Acciones intentadas: `NOTIFY pgrst, 'reload schema'` — sin efecto observable en handler.

**Estado OPS-0A memoria multi-turno:** migración + deploy **OK**; **funcionalidad end-to-end bloqueada** hasta fix SDK/schema o workaround REST en handler.

---

## 6. Archivos modificados localmente

| Archivo | Cambio | Recomendación commit |
|---------|--------|----------------------|
| `tests/payloads/phase7c-insforge-smoke.json` | Casos 6–7 → `fallback_inteligente` | Commit separado post-aprobación |
| `docs/phase-7c-insforge-controlled-deploy-report.md` | Regenerado por smoke (IDs/fecha) | **Revertir** o commit evidencia aparte |
| `docs/phase-ops-0a-academic-state-deploy-report.md` | **Nuevo** — este reporte | Commit con OPS-0A |
| `insforge/functions/dist/ycloud-wa-inbound.deploy.js` | Artefacto bundle (gitignored) | No commitear |

---

## 7. Riesgos / hallazgos

1. **Blocker:** `academic_state` no persiste vía handler SDK pese a columna + código deployados.
2. **Bundle script roto** con `platform=neutral` — riesgo en redeploys futuros si no se usa `--platform=node`.
3. Teléfonos de prueba OPS-0A en DB (`+525559990088` … `093`) — datos mock, no borrados (scope prohibía delete).
4. Runtime sigue **seguro** — ningún flag live activado.

---

## 8. Recomendación siguiente

| Prioridad | Ticket | Acción |
|-----------|--------|--------|
| P0 | **ENG-0A-bis** | Fix persistencia: raw REST para `academic_state` read/write, o refresh schema SDK InsForge |
| P1 | **ENG-0B** | Idempotencia webhook `ycloud_message_id` |
| P2 | **OPS-0B** | Actualizar `scripts/bundle-ycloud-wa-deploy.mjs` → `--platform=node` |
| P3 | **VAL-0** | Piloto admisiones tras ENG-0A-bis verificado |

**Rollback:** no requerido — runtime mock/dry_run intacto. Revertir deploy solo si ENG-0A-bis no resuelve en 24h.

---

## Resumen ejecutivo

| Entregable | Estado |
|------------|--------|
| Migración `academic_state` | ✅ |
| Deploy `0faf65b` | ✅ |
| Runtime seguro | ✅ |
| Smoke 7C | ✅ 10/10 |
| Memoria multi-turno live | ❌ Blocker SDK/schema |
| Commit/push | ⏸️ Pendiente aprobación Leandro |
