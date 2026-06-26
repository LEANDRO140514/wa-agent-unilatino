# 7G.7C.4-UI-CHECK — Revisión manual GHL UI/API (3 contactos piloto)

**Estado:** ✅ **APROBADO** — GHL UI/API confirma efectos correctos del piloto 7G.7C.4  
**Fecha:** 2026-06-26  
**Base:** `843e06e` — reporte piloto 7G.7C.4  
**Método:** lectura GHL API (contacto, tags, notes, tasks, custom fields, opportunities) + probe runtime remoto  
**Sin cambios:** código, deploy, flags, secrets, schema, `GHL_WA_FIELD_MAP`

---

## Alcance

Validar en GHL que el piloto **7G.7C.4** (GHL live + WA mock, 3 teléfonos, guion M1–M5) dejó el estado esperado en CRM.

| Teléfono | Participante | GHL contact ID |
|----------|--------------|----------------|
| `+529991525583` | Leandro / owner tester | `ZPqb7Jit2zn64uaME9Cp` |
| `+529993314831` | Admisiones 1 | `LxSpYSe41hBpnA6iiLSp` |
| `+529996428094` | Admisiones 2 | `W0n06gpVjIM4cRSthsHa` |

Ventana piloto 7G.7C.4 referencia: `2026-06-26T06:06:38Z` – `2026-06-26T06:08:22Z`.

---

## 1. Contacto único por teléfono

| Teléfono | `contacts/search` count | ID encontrado | ID esperado | Match |
|----------|-------------------------|---------------|-------------|-------|
| `+529991525583` | **1** | `ZPqb7Jit2zn64uaME9Cp` | `ZPqb7Jit2zn64uaME9Cp` | ✅ |
| `+529993314831` | **1** | `LxSpYSe41hBpnA6iiLSp` | `LxSpYSe41hBpnA6iiLSp` | ✅ |
| `+529996428094` | **1** | `W0n06gpVjIM4cRSthsHa` | `W0n06gpVjIM4cRSthsHa` | ✅ |

Teléfono en ficha GHL coincide con E.164 en los 3 casos.

---

## 2. Sin duplicados

- Búsqueda por teléfono devuelve **exactamente 1 contacto** por número.
- `action=update_contact` en syncs live (no `create_contact` duplicado).
- **✅ Sin duplicados detectados.**

---

## 3. Tags correctos

Tags presentes en los 3 contactos (relevantes para 7G.7C.4):

| Tag | P1 Leandro | P2 Adm. 1 | P3 Adm. 2 | Esperado 7G.7C.4 |
|-----|------------|-----------|-----------|------------------|
| `eva-wa` | ✅ | ✅ | ✅ | Sí |
| `wa_interes_carrera` | ✅ | ✅ | ✅ | Sí (M2/M3) |
| `wa_requiere_asesor` | ✅ | ✅ | ✅ | Sí (M4) |

**Nota operativa:** los 3 contactos conservan tags de pilotos anteriores (`wa_interes_beca`, `wa_interes_test`, `wa_interes_info`, `wa_interes_carreras`). Son acumulación histórica en contactos tester; **no** indican fallo del guion 7G.7C.4. Los tags del piloto están presentes.

---

## 4. Notes según casos calificados

### Ventana 7G.7C.4 — notes creadas (M2–M4)

| Teléfono | M2 carrera | M3 costo | M4 asesor | Marcador `[Eva WA — qualified_only]` |
|----------|------------|----------|-----------|--------------------------------------|
| P1 `+529991525583` | `06:06:48Z` | `06:07:00Z` | `06:07:10Z` | ✅ en las 3 |
| P2 `+529993314831` | `06:07:32Z` | `06:07:39Z` | `06:07:46Z` | ✅ en las 3 |
| P3 `+529996428094` | `06:08:02Z` | `06:08:08Z` | `06:08:16Z` | ✅ en las 3 |

### Casos no calificados (M1, M5)

- **M1 Hola:** sin note en GHL (`policy_blocked`) — ✅
- **M5 Gracias:** sin note en GHL (`post_escalation_closure_no_sync`) — ✅

Contenido reciente incluye routing esperado: `high_value_intent_exception`, `cost_signal_requires_human_validation`, `human_handoff`.

---

## 5. Tasks solo donde correspondía

### Tasks nuevas en ventana 7G.7C.4 (por teléfono)

| Teléfono | M2 carrera | M3 costo | M4 asesor |
|----------|------------|----------|-----------|
| P1 | — | `Validar costo/colegiatura — lead WhatsApp` (`06:06:50Z`) | `Atender lead WhatsApp — Solicita asesor` (`06:07:05Z`) |
| P2 | — | `Validar costo/colegiatura — lead WhatsApp` (`06:07:34Z`) | `Atender lead WhatsApp — Solicita asesor` (`06:07:43Z`) |
| P3 | — | `Validar costo/colegiatura — lead WhatsApp` (`06:08:05Z`) | `Atender lead WhatsApp — Solicita asesor` (`06:08:13Z`) |

- **M2:** sin task — ✅
- **M3:** task costo con título hotfix 7G.7C.3.1 — ✅
- **M4:** task asesor — ✅

### Correlación `wa_ghl_sync_log` (15 filas ventana piloto)

| Caso | `would_create_task` | Observado GHL |
|------|---------------------|---------------|
| M1 Hola | `false` | sin task |
| M2 carrera | `false` | sin task |
| M3 costo | `true` | task costo |
| M4 asesor | `true` | task asesor |
| M5 Gracias | `false` | sin task |

---

## 6. No task duplicada en “Gracias”

- **M5** en los 3 teléfonos: `intent=agradecimiento`, `action=policy_blocked`, `would_create_task=false`.
- Ninguna task con timestamp posterior a M4 atribuible a M5.
- **✅ Sin task duplicada por “Gracias”.**

---

## 7. Custom fields 7G.5B actualizados

Estado final en GHL (refleja último sync calificado M4 — asesor):

| Key | P1 | P2 | P3 | OK |
|-----|----|----|-----|-----|
| `wa_last_intent` | `humano` | `humano` | `humano` | ✅ |
| `wa_last_message_at` | `2026-06-26` | `2026-06-26` | `2026-06-26` | ✅ |
| `wa_stage` | `asesor_requerido` | `asesor_requerido` | `asesor_requerido` | ✅ |
| `wa_needs_human` | `true` | `true` | `true` | ✅ |
| `wa_summary` | intent humano + escalación | idem | idem | ✅ |
| `wa_source` | `YCloud / Eva WA` | idem | idem | ✅ |
| `wa_last_inbound_text` | `Quiero hablar con asesor` | idem | idem | ✅ |
| `wa_last_outbound_text` | respuesta canalización asesor | idem | idem | ✅ |

**8/8 keys** presentes en los 3 contactos. `wa_needs_human` se muestra en API GHL como array `["true"]` — valor semántico correcto.

---

## 8. No campos nuevos

- Mapa `GHL_WA_FIELD_MAP`: 8 keys (`wa_*` permitidas).
- Lectura API: **`unexpected_custom_fields: []`** en los 3 contactos.
- Sin campos académicos protegidos ni keys fuera de whitelist.

---

## 9. No opportunity/pipeline inesperado

| Contacto | `opportunities_count` |
|----------|----------------------|
| P1 | **0** |
| P2 | **0** |
| P3 | **0** |

**✅ Sin opportunities creadas por Eva WA.**

---

## 10. Runtime remoto seguro (post-rollback 7G.7C.4)

### Secrets InsForge (lectura)

```txt
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_SYNC_POLICY=qualified_only
GHL_WRITE_CUSTOM_FIELDS=false
GHL_LIVE_ALLOWED_PHONES=+529991525583
```

### Probe remoto (`Hola`, `+529991525583`)

```json
{
  "mode": "mock",
  "ghl_sync_mode": "dry_run",
  "outbound_real": false,
  "ghl_live": false,
  "ghl_dry_run": true,
  "cf": false,
  "policy": "qualified_only",
  "ghl_policy_blocked": true
}
```

**✅ Runtime seguro confirmado.** Sin GHL live nuevo durante esta revisión.

---

## Observaciones (no bloqueantes)

1. **Leandro (P1)** acumula **22 tasks** y **62 notes** por historial de pilotos 7G.5C, 7G.7C.3, 7G.7C.4 y pruebas previas. En la ventana 7G.7C.4 solo se añadieron **2 tasks** (costo + asesor) y **3 notes** (M2–M4), coherente con el guion.
2. **Admisiones 1 y 2** tienen tasks/notes de sesiones 7G.6B/7G.6C previas; en 7G.7C.4 se añadieron exactamente 2 tasks + 3 notes cada uno.
3. Recomendación operativa: cerrar o archivar tasks históricas de tester en GHL UI cuando convenga (fuera de alcance técnico Eva).

---

## Checklist validación

| # | Criterio | Resultado |
|---|----------|-----------|
| 1 | Contacto único por teléfono | ✅ |
| 2 | Sin duplicados | ✅ |
| 3 | Tags correctos | ✅ |
| 4 | Notes en casos calificados | ✅ |
| 5 | Tasks costo + asesor donde correspondía | ✅ |
| 6 | Sin task en “Gracias” | ✅ |
| 7 | 8 custom fields `wa_*` | ✅ |
| 8 | Sin campos nuevos | ✅ |
| 9 | Sin opportunity/pipeline | ✅ |
| 10 | Runtime remoto seguro | ✅ |

---

## Veredicto

**✅ 7G.7C.4-UI-CHECK APROBADO**

GHL UI/API confirma que el piloto orgánico controlado dejó:

- contactos únicos sin duplicados,
- notes/tags/tasks coherentes con `qualified_only` y guion M1–M5,
- custom fields 7G.5B actualizados,
- sin side-effects en opportunities,
- runtime post-rollback seguro.

**Listo para considerar 7G.7C.5** (WA `live_outbound` controlado) tras autorización explícita.

---

## Evidencia

- Fuente: GHL API `GET /contacts/{id}`, `/notes`, `/tasks`; `POST /contacts/search`; `GET /opportunities/search`
- Correlación: `wa_ghl_sync_log` ventana `06:06:38Z`–`06:08:22Z` (15 filas)
- Piloto API previo: `docs/phase-7g7c4-controlled-organic-live-report.md`
