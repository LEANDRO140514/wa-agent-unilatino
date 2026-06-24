# Phase 7G.5B-PREFLIGHT — Auditoría custom fields `wa_*` antes de escritura real

**Estado:** ✅ **COMPLETADO** — auditoría + tests mock; **sin** escritura CF real  
**Fecha:** 2026-06-24  
**Checkpoint:** `e09bb9e` (7G.5A proper)

---

## Resumen ejecutivo

| Pregunta | Resultado |
|----------|-----------|
| GHL live activado | **No** (`dry_run`) |
| `GHL_WRITE_CUSTOM_FIELDS` activado | **No** (`false`) |
| Custom fields escritos en runtime | **No** (`custom_fields_written=false`) |
| Mapa `GHL_WA_FIELD_MAP` en InsForge | **Cargado y válido** (8 keys, IDs enmascarados) |
| Colisión con campos landings/test | **Mitigada** por whitelist `wa_*` + `GHL_PROTECTED_FIELDS` |
| Riesgo `wa_stage` | **Medio-alto** — mismo key GHL que magenta; valores distintos |
| Tests 7G.5B preflight (mock) | **9/9 PASS** |
| Smoke 7G.3A post-auditoría | **14/14 PASS** |

---

## Preflight local

| Check | Resultado |
|-------|-----------|
| Repo | `C:/Users/vonde/Proyectos/wa-agent-unilatino` |
| HEAD | `e09bb9e` → `92eb5ff` → `4e70e3f` → `6b4554c` |
| Working tree (pre-commit) | Limpio |

---

## Preflight InsForge (runtime, sin secrets)

POST dry_run `+529991525583` / `"Derecho online"`:

| Flag | Valor |
|------|-------|
| `WA_AGENT_MODE` | `mock` |
| `GHL_SYNC_MODE` | `dry_run` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` (efectivo) |
| `ghl_live` | `false` |
| `ghl_allowed_phones_count` | `1` |
| `LLM_MODE` | `rewrite` |
| `LLM_PROVIDER` | `openai` |
| `custom_fields_config_loaded` | `true` |
| `custom_fields_map_valid` | `true` |
| `custom_fields_count` | `8` |
| `custom_fields_would_write` | `false` |
| `custom_fields_written` | `false` |
| `custom_fields_skipped_reason` | `ghl_sync_mode_not_live` |

**IDs GHL configurados:** 8/8 presentes (preview enmascarado `abcd...wxyz` en respuesta runtime — no se documentan IDs completos).

---

## Campos `wa_*` en código (`GHL_WA_FIELD_KEYS`)

Fuente: `insforge/functions/ycloud-wa-inbound.js` — `buildWACustomFieldValues()`, `parseGHLWAFieldMap()`.

| # | Key lógica | Tipo GHL esperado | Ejemplo valor | Intent / fuente | 7G.5B proper | Riesgo |
|---|------------|-------------------|---------------|-----------------|:------------:|--------|
| 1 | `wa_last_intent` | TEXT | `carrera_interes` | Clasificador WA | **Sí** | Bajo |
| 2 | `wa_last_message_at` | TEXT/DATETIME | ISO `2026-06-24T…` | Timestamp inbound | **Sí** | Bajo |
| 3 | `wa_stage` | TEXT | `carreras_exploracion` | `buildIntentDecision().waStage` | **Sí** | **Medio-alto** (ver §wa_stage) |
| 4 | `wa_needs_human` | TEXT (`true`/`false`) | `true` | Intent matrix | **Sí** | Bajo |
| 5 | `wa_summary` | TEXT | `Intent: beca \| Prioridad: medium \| …` | `buildOperationalWaSummary()` | **Sí** | Bajo |
| 6 | `wa_source` | TEXT | `YCloud / Eva WA` | Constante Eva | **Sí** | Bajo |
| 7 | `wa_last_inbound_text` | TEXT | `Derecho online` | Mensaje usuario | **Sí** | Bajo |
| 8 | `wa_last_outbound_text` | TEXT | Respuesta Eva (academic+LLM) | Outbound generado | **Sí** | Bajo |

**No existe** `wa_promedio_detectado` ni campo `wa_*` dedicado a promedio. El promedio de beca queda en **respuesta outbound** y **note/task**, no en CF protegido `promedio`.

### Valores `wa_stage` por intent (Eva)

| Intent | `wa_stage` Eva |
|--------|----------------|
| `carreras_disponibles` | `carreras_exploracion` |
| `carrera_interes` | `carrera_interes` |
| `no_se_que_estudiar` | `test_recomendado` |
| `humano` | `asesor_requerido` |
| `beca` | `beca_interes` |
| `ambiguo` | `inicio` |

---

## Campos protegidos (`GHL_PROTECTED_FIELDS`) — **PROHIBIDOS**

Nunca en `GHL_WA_FIELD_MAP` ni en PUT body (whitelist de 8 keys):

| Campo | Origen típico |
|-------|---------------|
| `carrera_recomendada` | Test vocacional |
| `match_percent` | Test vocacional |
| `sector_principal` | Test vocacional |
| `dictamen_url` | Test vocacional |
| `test_completed_at` | Test vocacional |
| `test_version` | Test vocacional |
| `beca_elegible` | Test vocacional |
| `lead_score` | Test vocacional |
| `lead_class` | Test vocacional |
| `promedio` | Test / Typebot |
| `email` | Landings |
| `firstName` | Landings |
| `lastName` | Landings |

**Además prohibidos (no Eva namespace):**

- UTM pack: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- Ads: `fbclid`, `gclid`
- Landings magenta: `origen`, `lead_type`, `funnel`, `interest`, `landing_source`, `first_page_seen`, `last_page_seen`
- MiBeca/pricing: `scholarship_*`, `tuition_*`, `enrollment_*`, `career_name`, `modalidad` (webhook landing)
- Map forbidden en código: key `wa_test_checkbox_a`, id `yBz675YEp1pdvwnvloXP`

---

## Riesgo `wa_stage`

| Canal | Key GHL | Valores ejemplo |
|-------|---------|-----------------|
| magenta-kangaroo MiBeca | `wa_stage` | `interes_beca` |
| Eva WA | `wa_stage` (mismo CF) | `beca_interes`, `carreras_exploracion`, `asesor_requerido`, … |

**Evaluación:** Mismo custom field ID, semántica distinta. Eva **sobrescribiría** el valor landing si el contacto pasó por MiBeca y luego escribe por WA.

**Recomendación (sin cambio de código en esta fase):**

1. **Corto plazo 7G.5B proper:** Aceptable para piloto Leandro (`+529991525583`) — documentar en GHL UI que `wa_stage` refleja último canal Eva.
2. **Mediano plazo:** Evaluar `wa_eva_stage` como CF separado en GHL dashboard + nuevo key en mapa (requiere autorización y nuevo ID).
3. **Alternativa conservadora:** Mantener stage solo en note/tag; no escribir `wa_stage` CF en 7G.5B (requiere cambio código — **no** en esta fase).

---

## Payload dry_run esperado (`GHL_WRITE_CUSTOM_FIELDS=true` hipotético)

Gate de escritura (`resolveCustomFieldsWriteDecision`):

1. `GHL_SYNC_MODE=live`
2. `GHL_WRITE_CUSTOM_FIELDS=true`
3. `GHL_WA_FIELD_MAP` válido (8 keys)
4. `contact_id` presente
5. Allowlist matched (7G.4T)

En `dry_run` actual: `custom_fields_would_write=true` si write ON, pero `custom_fields_skipped_reason=ghl_sync_mode_not_live` — **sin PUT**.

### Por intent (valores lógicos `customFields`)

#### `carreras_disponibles` — input `"1"`

```json
{
  "wa_last_intent": "carreras_disponibles",
  "wa_stage": "carreras_exploracion",
  "wa_needs_human": "false",
  "wa_source": "YCloud / Eva WA",
  "wa_last_inbound_text": "1"
}
```

#### `carrera_interes` — `"Derecho online"`

```json
{
  "wa_last_intent": "carrera_interes",
  "wa_stage": "carrera_interes",
  "wa_needs_human": "false",
  "wa_last_inbound_text": "Derecho online"
}
```

#### `humano` — `"Quiero hablar con asesor"`

```json
{
  "wa_last_intent": "humano",
  "wa_stage": "asesor_requerido",
  "wa_needs_human": "true"
}
```

Task GHL separada (no CF).

#### `beca` — `"Tengo promedio 9.8, qué beca me toca"`

```json
{
  "wa_last_intent": "beca",
  "wa_stage": "beca_interes",
  "wa_needs_human": "true",
  "wa_summary": "Intent: beca | Prioridad: medium | escalación sí | Tengo promedio 9.8…"
}
```

- **No** escribe CF `promedio` ni `beca_elegible`.
- LLM rewrite bloqueado (`scholarship_blocked`); outbound factual intacto en `wa_last_outbound_text`.

#### `no_se_que_estudiar` — `"No sé qué estudiar"`

```json
{
  "wa_last_intent": "no_se_que_estudiar",
  "wa_stage": "test_recomendado",
  "wa_needs_human": "false"
}
```

### Shape API GHL (cuando live+write)

```json
PUT /contacts/{contactId}
{
  "customFields": [
    { "id": "<GHL_WA_FIELD_MAP.wa_last_intent>", "value": "..." },
    "... 8 entries total ..."
  ]
}
```

Solo IDs del mapa `wa_*`; nunca campos protegidos.

---

## Validación `GHL_WRITE_CUSTOM_FIELDS=false` (actual)

| Check | Resultado |
|-------|-----------|
| `custom_fields_written` | `false` |
| PUT `/contacts/{id}` con `customFields` | **No ejecutado** |
| Dry-run log incluye `customFields` lógicos | **Sí** (`wa_ghl_sync_log.payload`) |
| `custom_fields_ghl_api_shape_preview` | **Sí** (runtime InsForge) |
| `protected_fields.never_overwrite` en log | **Sí** |

---

## Tests ejecutados

### `node tests/run-phase7g5b-custom-fields-preflight.mjs` — **9/9 PASS**

| Case | Descripción |
|------|-------------|
| A | CF OFF → no write, no PUT |
| B | CF ON + dry_run → `would_write`, skip `ghl_sync_mode_not_live` |
| C | Key `promedio` en map → rechazado (`extra_keys`) |
| D | Forbidden id → rechazado |
| E | Beca → solo 8 `wa_*`; sin `promedio`/`beca_elegible` |
| F | Carrera interés → sin `carrera_recomendada` |
| G | Humano → `wa_needs_human=true`, task dry_run |
| H | `no_se_que_estudiar` payload |
| I | Live+write + allowlist block → 0 API calls |

### `node tests/run-phase7g3a-classifier-hotfix.mjs` — **14/14 PASS**

---

## Lista exacta — 7G.5B proper

### Campos **permitidos** (única lista de escritura)

1. `wa_last_intent`
2. `wa_last_message_at`
3. `wa_stage` *(con riesgo documentado)*
4. `wa_needs_human`
5. `wa_summary`
6. `wa_source`
7. `wa_last_inbound_text`
8. `wa_last_outbound_text`

### Campos **prohibidos**

- Todos los de `GHL_PROTECTED_FIELDS` (§ arriba)
- UTM / fbclid / gclid / landing attribution
- Campos MiBeca / orchids test / funnel landings
- Cualquier key fuera de `GHL_WA_FIELD_KEYS`
- `wa_test_checkbox_a` y id `yBz675YEp1pdvwnvloXP`

---

## Recomendación para 7G.5B proper

**Secuencia sugerida (requiere autorización Leandro):**

1. Mantener `WA_AGENT_MODE=mock`, `GHL_LIVE_ALLOWED_PHONES=+529991525583`.
2. Activar `GHL_SYNC_MODE=live` temporalmente.
3. Activar `GHL_WRITE_CUSTOM_FIELDS=true` (mapa ya válido en InsForge).
4. Ejecutar 3–5 mensajes Leandro (mismos intents 7G.5A).
5. Validar en GHL UI: 8 CF actualizados, protegidos intactos, `wa_stage` aceptable.
6. Rollback: `GHL_WRITE_CUSTOM_FIELDS=false` → `GHL_SYNC_MODE=dry_run`.
7. Smoke 7G.3A + 7G.5B preflight.

**Criterio rollback inmediato:** cualquier CF fuera de lista permitida, `promedio`/`beca_elegible`/`carrera_recomendada` alterados, o error 4xx/5xx en PUT CF.

**No activar** 7G.5B proper sin autorización explícita.

---

## Archivos creados

| Archivo | Rol |
|---------|-----|
| `tests/payloads/phase7g5b-custom-fields-preflight.json` | Fixture mock |
| `tests/run-phase7g5b-custom-fields-preflight.mjs` | Runner 9 casos |
| `docs/phase-7g5b-custom-fields-preflight-report.md` | Este reporte |

---

## Commit

`test: add custom fields preflight for ghl live`
