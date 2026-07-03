# ENG-0A-bis — Fix persistencia `academic_state` en runtime

**Fecha:** 2026-07-03  
**Commit base:** `0faf65b` (código local; sin commit/push de este fix)  
**Endpoint:** `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`  
**Modo runtime:** mock / dry_run (sin live)

---

## 1. Preflight

| Check | Resultado |
|-------|-----------|
| Branch | `main` |
| HEAD | `0faf65b` |
| Runtime seguro | mock, dry_run, CF=false, academic_engine=true, eva_llm=false |
| Columna remota | `wa_contacts_state.academic_state` JSONB — confirmada |
| REST externo PATCH/GET | OK (OPS-0A) |

---

## 2. Diagnóstico

### Síntoma

Tras OPS-0A (migración + deploy `0faf65b`), el handler enriquecía respuestas académicas pero `academic_state` permanecía `null` en DB tras cada turno.

### Causas identificadas (en cadena)

1. **Schema cache SDK/PostgREST:** `@insforge/sdk` no lee/escribe la columna nueva `academic_state` en SELECT/UPDATE de `wa_contacts_state`, aunque la columna exista en Postgres.
2. **Deploy fallido (bundle Deno):** los intentos de deploy con bundle esbuild dejaban `success: false` (`require is not defined`, `__dirname is not defined` en módulos CAG). El runtime seguía en código anterior sin fix.
3. **REST fetch desde edge → HTTP 508:** un primer intento ENG-0A-bis con `fetch` a `/api/database/records/...` usando el origin del webhook provocó `508 Loop Detected` (recursión al mismo deployment).

### Solución adoptada

**RPC Postgres vía SDK** (misma ruta interna que ya persiste `wa_stage`, etc.):

| Función SQL | Uso |
|-------------|-----|
| `get_wa_contact_academic_state(text)` | Lectura multi-turno al inicio del handler |
| `patch_wa_contact_academic_state(text, jsonb)` | Escritura tras `applyAcademicAndLlmEnrichment` |

Migración: `insforge/sql/wa_contacts_state_academic_state_rpc.sql` (aplicada vía MCP `run-raw-sql`).

Helpers JS (sin refactor del handler):

- `readContactAcademicStateDirect()` → `client.database.rpc('get_wa_contact_academic_state', …)`
- `patchContactAcademicStateDirect()` → `client.database.rpc('patch_wa_contact_academic_state', …)`
- `shouldUseAcademicStateRestDirect()` → true en runtime real; false con `WA_E2E_MOCK_DB=true` (mock DB usa columna SDK)

### Bundle deploy (Deno-safe)

- `scripts/bundle-ycloud-wa-deploy.mjs`: `--platform=neutral` + shims `scripts/edge-fs-shim.js` / `scripts/edge-path-shim.js`
- `insforge/functions/lib/knowledge/getKnowledgeContext.js`: sin `__dirname`/`path` en init (CAG cache no disponible en edge; modo NONE)

---

## 3. Prueba multi-turno (runtime mock)

Teléfono: `+525559990107`

| Turno | Input | Intent | `academic_state.last_career` | Respuesta |
|-------|-------|--------|------------------------------|-----------|
| 1 | Me interesa Derecho online | `carrera_interes` | **Derecho Online** | Ficha Derecho Online $1,980/mes |
| 2 | Cuanto cuesta? | `fallback_inteligente` | **Derecho Online** (persistido) | Colegiaturas con contexto en línea desde $1,980 |

Memoria multi-turno: **OK** (lectura + escritura vía RPC).

---

## 4. Smoke 7C

```bash
node tests/run-phase7c-insforge-smoke.mjs
→ 10/10 PASS
```

| Seguridad | Confirmado |
|-----------|------------|
| `outbound_real=false` | Sí |
| `ghl_live=false` | Sí |
| `custom_fields_written=false` | Sí |
| `eva_llm_enabled=false` | Sí |
| `academic_engine_enabled=true` | Sí |

---

## 5. Archivos tocados (sin commit)

| Archivo | Cambio |
|---------|--------|
| `insforge/functions/ycloud-wa-inbound.js` | Helpers RPC read/patch; upsert con re-fetch id |
| `insforge/sql/wa_contacts_state_academic_state_rpc.sql` | **Nuevo** — funciones RPC |
| `insforge/functions/lib/knowledge/getKnowledgeContext.js` | Edge-safe init (deploy Deno) |
| `scripts/bundle-ycloud-wa-deploy.mjs` | Shims fs/path + platform neutral |
| `scripts/edge-fs-shim.js`, `scripts/edge-path-shim.js` | **Nuevo** — shims bundle |
| `scripts/check-bundle-require.mjs` | **Nuevo** — verificación bundle |
| `docs/phase-eng-0a-bis-academic-state-runtime-fix.md` | **Nuevo** — este reporte |
| `docs/phase-7c-insforge-controlled-deploy-report.md` | Regenerado por smoke |
| `tests/payloads/phase7c-insforge-smoke.json` | Casos 6–7 (OPS-0A, pendiente commit) |

---

## 6. Estado

| Item | Estado |
|------|--------|
| Persistencia `academic_state` runtime | **RESUELTO** |
| Memoria multi-turno end-to-end | **OK** |
| Smoke 7C | **10/10 PASS** |
| Deploy InsForge | **success: true** (RPC + bundle Deno-safe) |
| Commit / push | **Pendiente aprobación usuario** |

### Notas

- No activar live (WA/GHL/LLM) — preflight respetado.
- REST directo desde edge no es viable (508 loop); RPC es el workaround quirúrgico equivalente.
- Test local: `WA_E2E_MOCK_DB=true node tests/run-academic-state-persistence.mjs` → PASS.
