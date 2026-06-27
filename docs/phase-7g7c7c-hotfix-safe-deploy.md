# 7G.7C.7-C — Hotfix conversacional Eva WA (deploy seguro)

**Estado:** ✅ **DEPLOY COMPLETADO** — runtime seguro confirmado post-deploy  
**Fecha:** 2026-06-27  
**Tipo:** deploy de código únicamente · **sin** activación live · **sin** segundo piloto

---

## 1. Resumen ejecutivo

| Pregunta | Resultado |
|----------|-----------|
| Deploy realizado | **Sí** |
| Secrets modificados | **No** (solo lectura) |
| Flags en live | **No** |
| Predeploy tests | **13/13 + 15/15 PASS** |
| Post-deploy probes (UTF-8) | **4/4 PASS** |
| `wa_errors` críticos (15 min) | **0** |
| Veredicto | **PASS** |

---

## 2. HEAD y commits base

| Campo | Valor |
|-------|-------|
| **HEAD desplegado** | `383a9050fa30ace4c2b958ed6e9c0ae6e1291a85` |
| Commit hotfix | `ad70bcb` — `fix: improve eva wa pilot conversation intents` |
| Commit replay | `383a905` — `test: add eva wa pilot conversation replay` |

**Working tree al desplegar:** pendientes antiguos presentes (7G.3A, 7G.6C, 7G.7B.1, runners viejos) — **no incluidos** en deploy.

---

## 3. Preflight

### Secrets (lectura GET, sin cambios)

| Secret | Valor pre/post |
|--------|----------------|
| `WA_AGENT_MODE` | `mock` |
| `GHL_SYNC_MODE` | `dry_run` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` |
| `ACADEMIC_ENGINE_ENABLED` | `true` |
| `EVA_LLM_ENABLED` | `false` |
| `LLM_MODE` | `off` |
| `GHL_LIVE_ALLOWED_PHONES` | `+529991525583` |

### Probe pre-deploy (`Hola`)

| Campo | Valor |
|-------|-------|
| `mode` | `mock` |
| `outbound_real` | `false` |
| `ghl_live` | `false` |
| `ghl_dry_run` | `true` |
| `eva_llm_enabled` | `false` |
| `eva_llm_mode` | `off` |

### Función pre-deploy

| Campo | Valor |
|-------|-------|
| `updatedAt` (antes) | `2026-06-26T16:33:59.124Z` |

---

## 4. Tests predeploy (local)

| Suite | Resultado |
|-------|-----------|
| `tests/run-phase7g7c7a-pilot-conversation-hotfix.mjs` | **13/13 PASS** |
| `tests/run-phase7g7c7b-pilot-conversation-replay.mjs` | **15/15 PASS** |

---

## 5. Deploy

| Campo | Valor |
|-------|-------|
| **Función** | `ycloud-wa-inbound` |
| **Método** | `node scripts/bundle-ycloud-wa-deploy.mjs` (esbuild) → InsForge MCP `update-function` |
| **Artefacto** | `insforge/functions/dist/ycloud-wa-inbound.deploy.js` (235.6 KB) |
| **Descripción deploy** | `7G.7C.7-C hotfix conversacional Eva WA (mock/dry_run safe deploy)` |
| **updatedAt** (después) | **`2026-06-27T06:12:04.813Z`** |
| Secrets tocados | **Ninguno** |

---

## 6. Probes post-deploy (endpoint remoto, UTF-8)

Endpoint: `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`  
Teléfono probe: `+529991525583`

| # | Mensaje | Intent | Menu | Asesor/visita en respuesta | Runtime | Resultado |
|---|---------|--------|------|---------------------------|---------|-----------|
| 1 | Tienen revalidación de estudios? | `revalidacion_estudios` | no | sí (oferta revisión — esperado) | mock/dry_run/LLM off | **PASS** |
| 2 | en que unicacion estan? | `ubicacion_campus` | no | **no** | mock/dry_run/LLM off | **PASS** |
| 3 | tienen reconocimiento oficial? | `rvoe_reconocimiento` | no | no | mock/dry_run/LLM off | **PASS** |
| 4 | medicida tienen? | `carrera_no_ofertada` | no | no | mock/dry_run/LLM off | **PASS** |

### Flags comunes post-probe

| Campo | Valor |
|-------|-------|
| `outbound_real` | **`false`** |
| `outbound_status` | `mocked` |
| `ghl_live` | **`false`** |
| `ghl_dry_run` | **`true`** |
| `eva_llm_enabled` | **`false`** |
| `eva_llm_mode` | **`off`** |
| `custom_fields_written` | `false` |
| `academic_engine_enabled` | `true` |

### GHL dry_run (muestra ubicación)

- `ghl_sync_mode=dry_run`
- `ghl_would_create_task=false`
- Sin escritura GHL live

**Nota tooling:** un probe inicial vía PowerShell con acentos devolvió `fallback_inteligente` por corrupción de encoding en el body JSON. Reproducción con Node/fetch UTF-8 confirmó intents correctos — no es regresión de runtime.

---

## 7. Errores críticos

| Ventana | `wa_errors` críticos |
|---------|---------------------|
| Post-deploy (15 min) | **0** |

Tipos: `function_error`, `outbound_failed`, `ghl_live_failed`, `ghl_dry_run_failed`

---

## 8. Flags antes / después

| Flag | Antes | Después |
|------|-------|---------|
| `WA_AGENT_MODE` | `mock` | `mock` |
| `GHL_SYNC_MODE` | `dry_run` | `dry_run` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` | `false` |
| `ACADEMIC_ENGINE_ENABLED` | `true` | `true` |
| `EVA_LLM_ENABLED` | `false` | `false` |
| `LLM_MODE` | `off` | `off` |
| `GHL_LIVE_ALLOWED_PHONES` | `+529991525583` | `+529991525583` |

---

## 9. Confirmaciones operativas

| Control | Estado |
|---------|--------|
| WA live | ❌ no |
| GHL live | ❌ no |
| WhatsApp real | ❌ no |
| LLM | ❌ off |
| Meta Ads | ❌ no tocado |
| Test vocacional / calculadora | ❌ no tocados |
| Segundo piloto | ❌ no autorizado |
| Commit en esta fase | ❌ no (solo reporte) |

---

## 10. Riesgos restantes

1. **Encoding en clientes probe:** usar UTF-8 explícito (Node/fetch) en runners remotos; evitar PowerShell sin `-Encoding utf8` para mensajes con acentos.
2. **`ghl_would_add_tags` null en response:** policy `qualified_only` puede bloquear sync en saludos/ambiguo; esperado en modo seguro.
3. **Código desplegado ≠ commit automático:** artefacto bundle generado localmente desde HEAD `383a905`; no hay redeploy de secrets — si runtime no recargara secrets tras cambio futuro, aplicar redeploy.
4. **Pendientes locales** (7G.3A, 7G.6C, etc.) siguen fuera de control de versiones.

---

## 11. Recomendación siguiente

1. **7G.7C.7-D** — smoke remoto del replay completo (15 msgs) contra endpoint post-deploy.
2. Opcional: commit de este reporte cuando Leandro autorice.
3. Retrospectiva GHL UI piloto 7G.7C.6-E (sin activar live).
4. Antes de cualquier piloto live futuro: nuevo GO explícito + checklist 7G.7C.6-D.

---

*Documento interno — Universidad Latino / Eva WA — Fase 7G.7C.7-C*
