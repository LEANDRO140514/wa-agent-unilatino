# 7G.7C.4-PREFLIGHT — Controlled Organic 2–3 Phones

**Estado:** ✅ **PREFLIGHT APROBADO** — listo para autorizar ejecución 7G.7C.4; **sin cambios de flags en esta fase**  
**Fecha:** 2026-06-26  
**Base:** `582bc16` — `fix(7G.7C.3): resolve GHL task title for cost handoff`  
**Deploy activo:** `ycloud-wa-inbound` · `updatedAt=2026-06-26T05:35:31.581Z`  
**Fases previas cerradas:** 7G.7C-SPEC · 7G.7C.1 · 7G.7C.2 · 7G.7C.3-PREFLIGHT · 7G.7C.3 · 7G.7C.3.1

---

## 1. Estado git

| Check | Resultado |
|-------|-----------|
| **HEAD** | `582bc166e26e846cd0f3cea19b2ab9fab3cfee02` (`582bc16`) |
| **Último commit funcional esperado** | ✅ `582bc16` — hotfix `resolveGhlTaskTitle` |
| Working tree | Pendientes no relacionados **sin commit** ✅ |
| Deploy nuevo en preflight | ❌ No ejecutado (autorización explícita requerida) |

### Pendientes locales excluidos (no mezclados)

```txt
docs/phase-7g3a-classifier-hotfix-report.md (M)
docs/phase-7g6c-admissions-test-script.md (M)
docs/phase-7g6c-prep-admissions-pilot.md (M)
docs/phase-7g7b1-shadow-decision-review.md (M)
docs/phase-7g6c-organic-limited-go-live-report.md (??)
docs/phase-7g6c-runtime-probe.md (??)
docs/phase-7g6d-organic-limited-prep.md (??)
docs/phase-7g8-meta-ads-controlled-plan.md (??)
tests/run-phase7g6c-admissions-pilot*.mjs (??)
tests/run-phase7g7c2-qualified-sync-remote.mjs (??, local)
tests/run-phase7g7c3-ghl-live-allowlist.mjs (??, local)
```

---

## 2. Runtime actual InsForge

Verificado vía probe POST remoto + lectura secret `GHL_LIVE_ALLOWED_PHONES` (solo conteo/E.164, sin exponer otros secrets):

| # | Check preflight | Valor efectivo | Objetivo seguro preflight |
|---|-----------------|----------------|---------------------------|
| 1 | `WA_AGENT_MODE` | **`mock`** | `mock` ✅ |
| 2 | `GHL_SYNC_MODE` | **`dry_run`** | `dry_run` ✅ |
| 3 | `GHL_SYNC_POLICY` | **`qualified_only`** | `qualified_only` ✅ |
| 4 | `GHL_WRITE_CUSTOM_FIELDS` | **`false`** | `false` ✅ |
| 5 | `GHL_LIVE_ALLOWED_PHONES` | **`+529991525583`** (count=1) | sin ampliar ✅ |

### Probe remoto (2026-06-26, post-rollback 7G.7C.3)

POST `+529991525583` / saludo (`Hola`):

```json
{
  "ok": true,
  "mode": "mock",
  "ghl_sync_mode": "dry_run",
  "ghl_live": false,
  "ghl_dry_run": true,
  "outbound_real": false,
  "cf": false,
  "cf_written": false,
  "policy": "qualified_only",
  "ghl_policy_blocked": true,
  "ghl_allowed_phones_count": null
}
```

**Confirmación:** GHL live **no** abierto. WhatsApp real **no** enviado. Allowlist **no** ampliada.

### `wa_errors` críticos

| Ventana | `function_error` | `ghl_live_failed` | `outbound_live_failed` | `ghl_sync_failed` |
|---------|------------------|-------------------|------------------------|-------------------|
| Últimos **15 min** | 0 | 0 | 0 | 0 |
| Últimos **60 min** | 0 | **1** (histórico) | 0 | 0 |

**Nota histórica (no bloqueante):** `ghl_live_failed` a las `2026-06-26T05:33:20Z` durante 7G.7C.3 caso C3 (`title must be a string`) — resuelto por hotfix `582bc16` y redeploy `05:34:44Z`. Sin errores críticos nuevos desde rollback `05:35:31Z`.

---

## 3. Deploy activo

| Campo | Valor |
|-------|-------|
| **Function** | `ycloud-wa-inbound` |
| **Endpoint** | `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound` |
| **updatedAt** | `2026-06-26T05:35:31.581Z` |
| **description** | Eva WA 7G.7C.3 — post-rollback reload (mock/dry_run/qualified_only) |
| **Código efectivo** | 7G.7C.1 qualified sync + hotfix `resolveGhlTaskTitle` (7G.7C.3.1) |
| **Redeploy en preflight** | ❌ No |

---

## 4. Participantes propuestos (7G.7C.4)

**Regla:** máximo 2–3 teléfonos, E.164 `+52XXXXXXXXXX`, explícitamente autorizados, sin números desconocidos.  
**Estado preflight:** solo documentados — **allowlist NO ampliada** (`count=1`).

### Participante 1

```txt
Nombre: Leandro
Teléfono E.164: +529991525583
Rol: Owner / tester técnico
Uso: Coordinación piloto, validación GHL UI, canal de stop
GHL contact ID: ZPqb7Jit2zn64uaME9Cp
Autorizado para GHL live: Sí (validado 7G.7C.3)
```

### Participante 2

```txt
Nombre: Admisiones 1 (asesor — confirmar nombre en sesión)
Teléfono E.164: +529993314831
Rol: Asesor admisiones
Uso: Flujo orgánico controlado carrera/costo/asesor desde WhatsApp personal
GHL contact ID: LxSpYSe41hBpnA6iiLSp
Autorizado para GHL live: Sí (validado 7G.6B / 7G.6C prep)
```

### Participante 3

```txt
Nombre: Admisiones 2 (asesor — confirmar nombre en sesión)
Teléfono E.164: +529996428094
Rol: Asesor admisiones
Uso: Segundo tester paralelo; validar no-duplicados y policy_blocked independiente
GHL contact ID: W0n06gpVjIM4cRSthsHa
Autorizado para GHL live: Sí (validado 7G.6B / 7G.6C prep)
```

**Allowlist propuesta para 7G.7C.4 (solo al ejecutar, no aplicada ahora):**

```txt
GHL_LIVE_ALLOWED_PHONES=+529991525583,+529993314831,+529996428094
```

**No incluir:** Meta Ads, tráfico público, números fuera de la matriz anterior.

---

## 5. Runtime recomendado para 7G.7C.4

### Opción A — GHL live, WA mock (RECOMENDADA)

```txt
WA_AGENT_MODE=mock
GHL_SYNC_MODE=live
GHL_SYNC_POLICY=qualified_only
GHL_WRITE_CUSTOM_FIELDS=true
GHL_LIVE_ALLOWED_PHONES=+529991525583,+529993314831,+529996428094
```

**Uso:** Primera prueba orgánica extendida (2–3 teléfonos) validando GHL live + custom fields `wa_*` **sin** enviar WhatsApp real. Replica el patrón exitoso de 7G.7C.3 con más participantes.

### Opción B — WA live_outbound + GHL live

```txt
WA_AGENT_MODE=live_outbound
GHL_SYNC_MODE=live
GHL_SYNC_POLICY=qualified_only
GHL_WRITE_CUSTOM_FIELDS=true
GHL_LIVE_ALLOWED_PHONES=+529991525583,+529993314831,+529996428094
```

**Uso:** Solo con autorización explícita de WhatsApp real. Introduce riesgo de outbound no deseado y requiere ventana operativa con admisiones presentes.

### Recomendación

**Opción A** para 7G.7C.4. La validación pendiente es GHL multi-teléfono bajo `qualified_only`; el outbound real puede diferirse a una fase posterior con autorización explícita.

### Secuencia de activación (solo al autorizar 7G.7C.4, no en preflight)

1. Confirmar nombres/roles de Admisiones 1 y 2 con Leandro.
2. Ampliar `GHL_LIVE_ALLOWED_PHONES` a los 3 E.164.
3. `GHL_WRITE_CUSTOM_FIELDS=true`.
4. `GHL_SYNC_MODE=live` (mantener `qualified_only`).
5. Redeploy `ycloud-wa-inbound` si InsForge no recarga secrets automáticamente.
6. Probe pre-vuelo por teléfono (saludo → `policy_blocked`; carrera → sync).
7. Ejecutar guion de mensajes (máx. 5 por teléfono).
8. Validar GHL UI + logs.
9. Rollback inmediato al cerrar ventana.

---

## 6. Mensajes de prueba propuestos

**Máximo 5 por teléfono.** Enviar desde WhatsApp personal **a Eva** (`+529994538421`). **No ejecutar en preflight.**

### Set mínimo (obligatorio)

| # | Mensaje | Intent esperado | GHL esperado (Opción A) |
|---|---------|-----------------|-------------------------|
| 1 | `Hola` | saludo | `policy_blocked` — sin sync |
| 2 | `Me interesa Derecho en línea` | carrera_interes | contacto + note + tags; sin task |
| 3 | `Cuánto cuesta Derecho en línea?` | costo + handoff | contacto + note + **task** título costo |
| 4 | `Quiero hablar con asesor` | humano | contacto + note + task asesor |
| 5 | `Gracias` | agradecimiento post-escalación | `policy_blocked` — sin task duplicada |

### Set opcional (si se requiere cobertura extra)

| # | Mensaje | Notas |
|---|---------|-------|
| 6 | `No sé qué estudiar` | orientación / vocacional |
| 7 | `Me interesa una beca` | beca |
| 8 | `me gusta el fútbol` | off-topic → `policy_blocked` |

**Orden sugerido:** 1 → 2 → 3 → 4 → 5 por participante; opcionales solo tras validar set mínimo en los 3 teléfonos.

---

## 7. Validaciones esperadas en 7G.7C.4

### Por teléfono (GHL UI)

| Validación | Criterio |
|------------|----------|
| Contacto único | Un contacto GHL por E.164; sin duplicados |
| Tags | Coherentes con intent calificado (`carrera`, `costo`, `humano`, etc.) |
| Notes | Resumen EVA / contexto conversación en sync calificado |
| Tasks | Solo donde corresponde (costo, asesor, inscripción); **sin duplicados** post-escalación |
| Custom fields (si CF=true) | Solo keys 7G.5B permitidas |
| `policy_blocked` | Saludos, off-topic, gracias post-escalación **no** sincronizan |

### Custom fields permitidos (sin campos nuevos)

```txt
wa_last_intent
wa_last_message_at
wa_stage
wa_needs_human
wa_summary
wa_source
wa_last_inbound_text
wa_last_outbound_text
```

**No tocar:** `GHL_WA_FIELD_MAP`, schema DB, campos académicos protegidos.

### Por teléfono (logs / respuesta API)

| Validación | Criterio |
|------------|----------|
| `mode` | `mock` (Opción A) |
| `outbound_real` | `false` (Opción A) |
| `ghl_live` | `true` solo en mensajes calificados allowlist |
| `ghl_policy_blocked` | `true` en saludo/off-topic/post-escalación |
| `custom_fields_written` | `true` solo en sync calificado con CF=true |
| Task title costo | `"Validar costo/colegiatura — lead WhatsApp"` (hotfix 7G.7C.3.1) |
| `wa_errors` críticos | 0 durante ventana activa |

### Comparación vs 7G.7C.3

Comportamiento debe ser **idéntico en lógica** al piloto single-phone; la única diferencia esperada es multi-teléfono en allowlist y volumen de casos (3×5 mensajes).

---

## 8. Criterios de stop (inmediato)

Detener piloto y ejecutar rollback si ocurre **cualquiera**:

1. WhatsApp real se envía sin autorización (`outbound_real=true` o `WA_AGENT_MODE=live_outbound` no autorizado).
2. GHL live escribe fuera de allowlist.
3. Se crea contacto duplicado en GHL.
4. Se crea task duplicada (especialmente post-escalación / `Gracias`).
5. Se escriben campos fuera de `GHL_WA_FIELD_MAP` / keys no permitidas.
6. `GHL_SYNC_POLICY=qualified_only` no bloquea saludo u off-topic.
7. `wa_errors` crítico > 0 durante ventana activa (`function_error`, `ghl_live_failed`, `outbound_live_failed`, `ghl_sync_failed`).
8. Se toca DB schema.
9. Se modifica secret no autorizado.
10. Comportamiento distinto al validado en 7G.7C.3 (salvo multi-teléfono documentado).

**Canal de stop:** Leandro `+529991525583` + responsable técnico en sesión.

---

## 9. Rollback

### Rollback inmediato (post-piloto o stop)

```txt
1. GHL_WRITE_CUSTOM_FIELDS=false
2. GHL_SYNC_MODE=dry_run
3. GHL_SYNC_POLICY=qualified_only
4. WA_AGENT_MODE=mock
5. GHL_LIVE_ALLOWED_PHONES=+529991525583
6. Redeploy ycloud-wa-inbound si aplica
```

### Rollback total legacy (si se requiere)

```txt
1. WA_AGENT_MODE=mock
2. GHL_WRITE_CUSTOM_FIELDS=false
3. GHL_SYNC_MODE=dry_run
4. GHL_SYNC_POLICY=none
5. GHL_LIVE_ALLOWED_PHONES=+529991525583
6. Redeploy ycloud-wa-inbound si aplica
```

---

## 10. Suites ejecutadas

| Suite | Resultado | Notas |
|-------|-----------|-------|
| `tests/run-phase7g7c31-task-title-hotfix.mjs` | **8/8 PASS** | Hotfix cost handoff title |
| `tests/run-phase7g7c-qualified-sync.mjs` | **15/15 PASS** | Policy wiring 7G.7C.1 |
| `tests/run-phase7g7b-ghl-relevance-shadow.mjs` | **22/22 PASS** | Gate relevance |
| `tests/run-phase7g6d-conversation-hotfix.mjs` | **4/4 PASS** | Post-escalación |
| `tests/run-phase7g3a-classifier-hotfix.mjs` | **14/14 PASS** | Classifier + remote probe |
| `tests/run-phase7g5b-custom-fields-preflight.mjs` | **9/9 PASS** | CF map / protected keys |

### Runner remoto local (no commiteado)

| Runner | Resultado |
|--------|-----------|
| `tests/run-phase7g7c2-qualified-sync-remote.mjs` | **8/8 PASS** — dry_run remoto qualified_only |

**Probe remoto adicional:** saludo allowlist → `policy_blocked` ✅

---

## 11. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Escritura GHL fuera de allowlist | `qualified_only` + allowlist explícita; stop #2 |
| Task duplicada post-escalación | Validado 7G.6D + 7G.7C.1 caso H; mensaje 5 en guion |
| Task title vacío en costo | Hotfix `582bc16` desplegado; suite 7G.7C.3.1 |
| Custom fields en contactos incorrectos | Solo 8 keys `wa_*`; suite 7G.5B |
| WA real accidental | Opción A recomendada; `outbound_real` en cada probe |
| Contacto duplicado GHL | Usar contact IDs conocidos; stop #3 |
| Ventana live residual de 7G.6C | Allowlist ya reducida a 1; rollback documentado |
| Pendientes locales mezclados en commit | Commit solo de este doc |

### No tocar en 7G.7C.4 (sin autorización explícita)

```txt
Meta Ads / público
DB schema
GHL_WA_FIELD_MAP
EVA_LLM_ENABLED / OPENAI_API_KEY
academic source-of-truth
pendientes 7G.6C / 7G.8
EVA Test / Orchids / landings / calculadora
```

---

## 12. Decisión

| Criterio de éxito preflight | Estado |
|-----------------------------|--------|
| No se cambian flags | ✅ |
| No se abre GHL live | ✅ |
| No se envía WhatsApp real | ✅ |
| No se amplía allowlist | ✅ (sigue `+529991525583`) |
| No schema / map / secrets nuevos | ✅ |
| Suites pasan | ✅ 72/72 obligatorias + 8/8 remoto local |
| Participantes, mensajes, stop, rollback documentados | ✅ |

### Veredicto

**✅ LISTO para autorizar ejecución 7G.7C.4** (piloto orgánico controlado 2–3 teléfonos).

**Condiciones para pasar de PREFLIGHT → 7G.7C.4:**

1. Autorización explícita de Leandro para ampliar allowlist y `GHL_SYNC_MODE=live` + `GHL_WRITE_CUSTOM_FIELDS=true`.
2. Confirmar nombres de Admisiones 1 y 2 en sesión.
3. Adoptar **Opción A** (GHL live + WA mock) salvo autorización explícita de WA real.
4. Ventana acotada con equipo presente; guion 5 mensajes × 3 teléfonos.
5. Rollback inmediato al cerrar o ante cualquier criterio de stop.

**Este documento no activa el piloto.** La ejecución 7G.7C.4 requiere fase separada con cambio controlado de secrets + redeploy.
