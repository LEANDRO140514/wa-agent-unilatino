# 7G.7C.3.1 — resolveGhlTaskTitle Hotfix Report

**Estado:** ✅ **COMPLETADO** — hotfix commiteado; sin deploy; runtime seguro preservado  
**Fecha:** 2026-06-26  
**Base:** `49ce63b` — docs: report 7g7c3 ghl live allowlist pilot  
**Deploy previo (7G.7C.3):** `2026-06-26T05:34:44.211Z` — código alineado con repo tras este commit

---

## 1. Motivo del hotfix

En piloto **7G.7C.3 live**, el caso C3 (`Cuánto cuesta Derecho en línea?`) autorizó task vía gate (`cost_signal_requires_human_validation`) con intent `carrera_interes`, pero `getTaskTitle("carrera_interes")` devuelve `null`. GHL API rechazó la task:

```txt
GHL create task failed (422): title must be a string, title should not be empty
```

---

## 2. Fallo observado en 7G.7C.3

| Campo | Valor |
|-------|-------|
| Input | `Cuánto cuesta Derecho en línea?` |
| Intent classifier | `carrera_interes` |
| Gate | `would_create_task=true`, `routing_reason=cost_signal_requires_human_validation` |
| Error | Task title vacío en `syncGHLContactLive` |
| sync_log | `818bdbc9-…` — `action=failed` |
| Reintento post-hotfix | **PASS** — `72d5c58f-…` — task creada |

---

## 3. Cambio aplicado

Nueva función `resolveGhlTaskTitle(context)`:

1. Usa `context.task_title` si existe.
2. Usa `getTaskTitle(intent)` para intents con título EVA (`humano`, `beca`, etc.).
3. Si `cost_or_tuition_requires_validation` o `cost_signal_requires_human_validation` → `"Validar costo/colegiatura — lead WhatsApp"`.
4. Si `ghlWouldCreateTask` → fallback `"Atender lead WhatsApp — seguimiento gate"`.
5. Si no aplica → `null`.

Usada en:

- `buildGHLDryRunPayload` (dry_run task preview)
- `syncGHLContactLive` (task live)

Export en handler para tests: `handler.resolveGhlTaskTitle`.

**Sin cambios** en shadow gate, routing principal, `GHL_WA_FIELD_MAP`, DB schema, flags ni secrets.

---

## 4. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `insforge/functions/ycloud-wa-inbound.js` | `resolveGhlTaskTitle()` + wiring dry_run/live + export test |
| `tests/run-phase7g7c31-task-title-hotfix.mjs` | Suite nueva 8 casos |
| `docs/phase-7g7c31-task-title-hotfix-report.md` | Este reporte |

---

## 5. Tests ejecutados

| Runner | Resultado |
|--------|-----------|
| `run-phase7g7c31-task-title-hotfix.mjs` | **8/8 PASS** |
| `run-phase7g7c-qualified-sync.mjs` | **15/15 PASS** |
| `run-phase7g7b-ghl-relevance-shadow.mjs` | **22/22 PASS** |
| `run-phase7g6d-conversation-hotfix.mjs` | **4/4 PASS** |
| `run-phase7g3a-classifier-hotfix.mjs` | **14/14 PASS** |
| `run-phase7g5b-custom-fields-preflight.mjs` | **9/9 PASS** |

Casos clave 7G.7C.3.1:

- A/B — título costo no vacío con handoff/routing
- C — intent `humano` sin regresión
- E — `carrera_interes` sin task → `null`
- F–H — gate costo + dry_run task title definido (sin GHL live en test local)

---

## 6. GHL live no activado

No se cambiaron secrets ni `GHL_SYNC_MODE`. Runtime remoto post-commit:

```json
{
  "mode": "mock",
  "ghl_sync_mode": "dry_run",
  "ghl_live": false,
  "outbound_real": false,
  "policy": "qualified_only"
}
```

---

## 7. WhatsApp real no enviado

Tests locales sin outbound real. Probe remoto: `outbound_real=false`.

---

## 8. Runtime seguro preservado

| Flag | Valor |
|------|-------|
| `WA_AGENT_MODE` | `mock` |
| `GHL_SYNC_MODE` | `dry_run` |
| `GHL_SYNC_POLICY` | `qualified_only` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` |

**Deploy:** no requerido — código commiteado coincide con bundle desplegado en 7G.7C.3.

---

## 9. Pendientes locales no relacionados preservados

Sin commit de: `run-phase7g7c2-*`, `run-phase7g7c3-*`, docs 7G.6C/7G.8, reportes regenerados.

---

## 10. Veredicto

**7G.7C.3.1 APROBADO**

- Hotfix formalizado en repo.
- Task title ya no queda vacío en `cost_signal_requires_human_validation`.
- Suites en verde.
- Runtime seguro intacto.
- Repo alineado con InsForge desplegado.
