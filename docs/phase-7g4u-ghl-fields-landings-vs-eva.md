# Phase 7G.4U — Auditoría cruzada campos GHL: Landings Orchids vs Eva WA

**Estado:** ✅ **AUDITORÍA COMPLETA** — solo lectura, sin cambios en producción  
**Fecha:** 2026-06-24  
**Checkpoint Eva WA:** `c9ff7bef5d6e8900a8bee920cee7f773ea46c3e4` (+ `docs/phase-7g4s-ghl-live-safety-preflight.md` sin commit)

---

## Resumen ejecutivo

| Pregunta | Respuesta |
|----------|-----------|
| ¿Se activó GHL live? | **No** |
| ¿Se escribió en GHL? | **No** |
| ¿Se modificó código? | **No** |
| Integración landings → GHL | **Webhook inbound** (`GHL_WEBHOOK_URL` / `VITE_GHL_WEBHOOK_URL`) |
| Integración Eva WA → GHL | **API v2 REST** (`services.leadconnectorhq.com`) |
| ¿Colisión de namespaces? | **Sí, riesgo** — landings escriben campos vocacional/beca; Eva WA tiene `wa_*` separados + lista protegida |
| Campos solo GHL (no DB propia) | **Confirmados** — ver §8 (atribución + metadatos campaña en carreras landing) |

**Respuesta clave (3–4 campos):** En **magenta-kangaroo** (`MiBeca`), los campos de **atribución de campaña** van a GHL pero **no** a Supabase `leads`: **`fbclid`**, **`gclid`**, **UTM pack** (`utm_source`…`utm_term`), y **`landing_source` / `first_page_seen` / `last_page_seen`**. En **orchids-landing-page-test**, esos mismos campos **sí** entran a DB embebidos en `responses._tracking`, pero **no** como columnas dedicadas; además GHL recibe **`dictamen_url`**, **`test_version`** y **`test_completed_at`** sin columna propia equivalente.

---

## 1. Repos analizados

| Repo | Ruta | Branch | Git status |
|------|------|--------|------------|
| Eva WA | `C:\Users\vonde\Proyectos\wa-agent-unilatino` | `main` | `?? docs/phase-7g4s-ghl-live-safety-preflight.md` |
| Carreras PWA | `C:\Users\vonde\orchids-projects\magenta-kangaroo` | `main` | limpio |
| Test vocacional | `C:\Users\vonde\orchids-projects\orchids-landing-page-test` | `main` | limpio |

---

## 2. Archivos clave revisados

### magenta-kangaroo

| Archivo | Rol |
|---------|-----|
| `src/lib/ghl.ts` | `sendToGHL()`, `captureProspect()` — webhook + Supabase paralelo |
| `src/lib/supabase.ts` | `insertLead()` → tabla `leads` (6 campos) |
| `src/lib/utm.ts` | Captura UTM/fbclid/gclid/páginas |
| `src/pages/MiBeca.tsx` | Formulario beca + payload GHL enriquecido |
| `docs/ghl-payload-carreras.md` | Documentación payload webhook |

### orchids-landing-page-test

| Archivo | Rol |
|---------|-----|
| `src/app/api/test/submit/route.ts` | EVA engine + Supabase + webhook GHL |
| `src/lib/tracking.ts` | UTM/fbclid/gclid en session/localStorage |
| `src/components/TypebotChat.tsx` | Flujo captura + POST submit |
| `CONFIGURACION.md` | Env vars (`GHL_WEBHOOK_URL`, etc.) |

### Eva WA (wa-agent-unilatino)

| Archivo | Rol |
|---------|-----|
| `insforge/functions/ycloud-wa-inbound.js` | GHL live/dry_run, tags, notes, tasks, CF gate |
| `docs/ghl-phase-3-plan.md` | Arquitectura CRM |
| `docs/ghl-phase-3c-custom-fields.md` | 8 campos `wa_*` |
| `docs/phase-7g4s-ghl-live-safety-preflight.md` | Preflight 7G.5A/7G.5B |

---

## 3. Modelo de integración por canal

```
┌─────────────────────┐     webhook POST      ┌──────────────┐
│ magenta-kangaroo    │ ───────────────────────►│ GHL Workflow │
│ orchids test submit │     (flat JSON)         │  (inbound)   │
└─────────┬───────────┘                         └──────────────┘
          │
          ▼ Supabase `leads` (subset de campos)

┌─────────────────────┐     API v2 REST         ┌──────────────┐
│ Eva WA (InsForge)   │ ───────────────────────►│ GHL Contacts │
│ ycloud-wa-inbound   │  search/tags/notes/   │  API         │
└─────────────────────┘  tasks/PUT customFields └──────────────┘
          │
          ▼ InsForge `wa_*` tables (no Supabase landings)
```

**Implicación:** Landings mapean campos planos en **workflow webhook** de GHL. Eva WA usa **Contact API** con tags/notes/tasks y custom fields por ID. Los nombres pueden coincidir conceptualmente pero el **mecanismo de escritura es distinto**.

---

## 4. magenta-kangaroo — MiBeca (`/mi-beca`)

### 4.1 Campos capturados en UI

| Campo UI | Variable |
|----------|----------|
| Nombre | `firstName` |
| Apellido | `lastName` |
| Email | `email` |
| Teléfono | `phone` |
| Carrera (preseleccionada o override) | `career` / `selectedCareer` |
| Nivel beca (selector promedio) | `selectedLevel` → `BECA_LEVELS` |

Hidden / calculados: precios (`tuition_*`, `enrollment_*`), tags, atribución UTM (`getAttributionData()`).

### 4.2 Escritura Supabase `leads` (`insertLead`)

Solo estos campos — `src/lib/ghl.ts` líneas 91–98:

| DB column | Origen |
|-----------|--------|
| `nombre` | `firstName` + `lastName` concatenados |
| `email` | `email` |
| `telefono` | `phone` |
| `career` | `career` |
| `source` | `source` (`pwa-mi-beca`) |
| `tags` | `tags` (array) |

### 4.3 Payload GHL webhook (completo)

Ver `docs/ghl-payload-carreras.md` y `MiBeca.tsx` handleSubmit.

**Contacto:** `firstName`, `lastName`, `email`, `phone`, `career`, `source`, `tags`, `tags_string`, `timestamp`

**Segmentación campaña:** `origen`, `lead_type`, `funnel`, `interest`, `wa_stage`

**Carrera/beca:** `career_name`, `career_id`, `modality`, `average_range`, `scholarship_level`, `scholarship_percent`, `enrollment_discount_percent`, `tuition_base`, `enrollment_base`, `tuition_final`, `enrollment_final`

**Atribución:** `utmSource`…`utmTerm`, `fbclid`, `gclid`, `landingSource`, `firstPageSeen`, `lastPageSeen`

### 4.4 Matriz magenta-kangaroo

| Campo | UI | DB `leads` | GHL webhook |
|-------|:--:|:----------:|:-----------:|
| nombre / firstName+lastName | ✅ | ✅ (`nombre`) | ✅ |
| email | ✅ | ✅ | ✅ |
| telefono / phone | ✅ | ✅ | ✅ |
| career | ✅ | ✅ | ✅ |
| source | ✅ | ✅ | ✅ |
| tags | ✅ | ✅ | ✅ (+ `tags_string`) |
| lastName (separado) | ✅ | ❌ (fusionado) | ✅ |
| origen, lead_type, funnel, interest | calc | ❌ | ✅ |
| career_id, modality, beca/pricing | calc | ❌ | ✅ |
| wa_stage | calc | ❌ | ✅ |
| utm_* (5 campos) | hidden | ❌ | ✅ |
| fbclid | hidden | ❌ | ✅ |
| gclid | hidden | ❌ | ✅ |
| landing_source | hidden | ❌ | ✅ |
| first/last_page_seen | hidden | ❌ | ✅ |
| timestamp | auto | ❌ | ✅ |

---

## 5. orchids-landing-page-test — Test vocacional

### 5.1 Campos capturados (Typebot)

| Campo | Variable |
|-------|----------|
| Nombre | `nombre` |
| Email | `email` |
| WhatsApp | `telefono` |
| Promedio | `promedio` |
| Urgencia | `urgencia` |
| Respuestas Likert | `Q01`…`Q40` |
| Abiertas | `Q36`, `Q37`, `Q38` |
| UTM/tracking | merge `getAllUtmParams()` al submit |

### 5.2 Escritura Supabase `leads`

Columnas dedicadas (`route.ts` `leadData`):

`nombre`, `email`, `telefono`, `urgencia`, `promedio`, `responses` (jsonb con raw + `_tracking` + `_eva`), `dimensions`, `sector_primary`, `sector_secondary`, `score`, `lead_class`, `classification`, `tags`, `dictamen_text`, `beca_elegible`, `cta_primary`, `top_programs`, `oq01_contexto`, `oq02_intereses`, `oq03_vision`

**Tracking en DB:** `responses._tracking` contiene `utm_source`…`gclid`, `landing_source`, `first_page_seen`, `last_page_seen`.

### 5.3 Payload GHL webhook

Flat JSON en `route.ts` líneas 165–198:

**Contacto:** `firstName`, `lastName`, `email`, `phone`, `tags` (string CSV)

**Custom fields vocacional (webhook keys):** `sector_principal`, `carrera_recomendada`, `match_percent`, `modalidad`, `lead_score`, `lead_class`, `beca_elegible`, `promedio`, `urgencia`, `oq_resumen`, `dictamen_url`, `test_completed_at`, `test_version`, `source`

**Tracking:** `utm_source`…`utm_term`, `fbclid`, `gclid`, `landing_source`, `first_page_seen`, `last_page_seen`

### 5.4 Matriz orchids-landing-page-test

| Campo conceptual | UI | DB columna | DB jsonb | GHL webhook |
|----------------|:--:|:----------:|:--------:|:-----------:|
| nombre | ✅ | ✅ | — | ✅ (first/last split) |
| email, telefono | ✅ | ✅ | — | ✅ |
| promedio, urgencia | ✅ | ✅ | — | ✅ |
| sector/carrera/score/class | calc | ✅ | `_eva` | ✅ |
| beca_elegible | calc | ✅ | — | ✅ |
| dictamen (texto) | calc | ✅ `dictamen_text` | — | ❌ (texto no enviado) |
| dictamen URL | calc | ❌ | ❌ | ✅ `dictamen_url` |
| oq resumen | calc | parcial (3 cols) | — | ✅ `oq_resumen` |
| test_completed_at | auto | ❌ | ❌ | ✅ |
| test_version | const | ❌ | ❌ | ✅ |
| utm/fbclid/gclid | hidden | ❌ col | ✅ `_tracking` | ✅ |
| landing/first/last page | hidden | ❌ col | ✅ `_tracking` | ✅ |
| tags | calc | ✅ array | — | ✅ CSV string |

---

## 6. Eva WA — mapa GHL preparado

### 6.1 Modo actual (seguro)

| Flag | Valor |
|------|-------|
| `GHL_SYNC_MODE` | `dry_run` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` |
| `WA_AGENT_MODE` | `mock` |

### 6.2 Acciones GHL por intent (live)

| Acción | Detalle |
|--------|---------|
| **Tags** | `eva-wa` + intent tag (`wa_interes_carreras`, `wa_interes_carrera`, `wa_interes_test`, `wa_interes_beca`, `wa_requiere_asesor`, etc.) |
| **Note** | Cuerpo estructurado: teléfono, intent, prioridad, mensaje, respuesta Eva, `wa_stage`, timestamp |
| **Task** | Solo `beca`, `humano`, `post_test`, `duda_test` |
| **Contact** | Search by phone → create minimal o update |
| **Custom fields** | 8 keys `wa_*` — **OFF** hasta 7G.5B |

### 6.3 Custom fields Eva WA (`GHL_WA_FIELD_KEYS`)

| Key Eva WA | ¿Existe en landings? | ¿Protegido Eva? |
|------------|---------------------|-----------------|
| `wa_last_intent` | No (landings usan `interest`/`lead_type`) | Escritura Eva |
| `wa_last_message_at` | No | Escritura Eva |
| `wa_stage` | Sí (magenta envía `wa_stage`/`interes_beca`) | Escritura Eva — **posible duplicidad semántica** |
| `wa_needs_human` | No directo | Escritura Eva |
| `wa_summary` | Parcial (`oq_resumen` en test) | Escritura Eva |
| `wa_source` | Parcial (`source` landings) | Escritura Eva |
| `wa_last_inbound_text` | No | Escritura Eva |
| `wa_last_outbound_text` | No | Escritura Eva |

### 6.4 Campos protegidos Eva WA (`GHL_PROTECTED_FIELDS`) — **NO tocar**

Alineados con payload GHL del test vocacional:

`carrera_recomendada`, `match_percent`, `sector_principal`, `dictamen_url`, `test_completed_at`, `test_version`, `beca_elegible`, `lead_score`, `lead_class`, `promedio`, `email`, `firstName`, `lastName`

### 6.5 Intents Eva WA relevantes

| Intent | Tag | Task | Academic | Rewrite LLM |
|--------|-----|:----:|----------|:-------------:|
| `carreras_disponibles` | `wa_interes_carreras` | No | career list | Sí |
| `carrera_interes` | `wa_interes_carrera` | No | career detail | Sí |
| `no_se_que_estudiar` | `wa_interes_test` | No | test link | Sí |
| `humano` | `wa_requiere_asesor` | Sí | fallback | Sí |
| `beca` | `wa_interes_beca` | Sí | scholarship | **No** |
| `post_test` | `wa_post_test` | Sí | — | No |
| `duda_test` | `wa_duda_test` | Sí | — | No |

---

## 7. Tabla maestra de equivalencias

| Campo conceptual | Repo origen | Archivo | Landing key | Landing DB | Landing GHL key | Eva WA field | ¿Coincide? | Riesgo | Recomendación |
|------------------|-------------|---------|-------------|------------|-----------------|--------------|:----------:|--------|---------------|
| Nombre | ambos | ghl.ts / route.ts | firstName/nombre | `nombre` | firstName | note only | Parcial | Bajo | Eva no sobrescribe firstName |
| Apellido | magenta | MiBeca.tsx | lastName | en `nombre` | lastName | — | Parcial | Bajo | Eva no escribe |
| Email | ambos | — | email | `email` | email | protected | Parcial | **Alto** | Eva **no** PUT email |
| Teléfono | ambos | — | phone/telefono | `telefono` | phone | search key | Sí | Bajo | Clave upsert Eva |
| Carrera interés | magenta | MiBeca | career/career_name | `career` | career_name | intent `carrera_interes` | Parcial | Medio | Landings: webhook; Eva: tag+note |
| Carrera recomendada | test | route.ts | — | `top_programs` | carrera_recomendada | protected | No | **Crítico** | Solo test landing; Eva no tocar |
| Sector | test | route.ts | — | `sector_primary` | sector_principal | protected | No | **Crítico** | Exclusivo test |
| Match % | test | route.ts | — | en `_eva` | match_percent | protected | No | **Crítico** | Exclusivo test |
| Lead score/class | test | route.ts | — | `score`/`lead_class` | lead_score/lead_class | protected | No | **Crítico** | Exclusivo test |
| Promedio | test | Typebot | promedio | `promedio` | promedio | academic `beca` | Parcial | **Alto** | Eva calcula beca en chat; no PUT `promedio` CF |
| Beca elegible | test | route.ts | — | `beca_elegible` | beca_elegible | protected | No | **Crítico** | Exclusivo test |
| Beca nivel/% | magenta | MiBeca | scholarship_* | ❌ | scholarship_* | note/tag | No | Medio | Exclusivo landing beca |
| Modalidad | ambos | — | modality | ❌/calc | modalidad | academic response | Parcial | Medio | No CF en 7G.5A |
| Dictamen URL | test | route.ts | — | ❌ | dictamen_url | protected | No | Medio | Exclusivo test |
| Test version/at | test | route.ts | — | ❌ | test_version/at | protected | No | Medio | Exclusivo test |
| UTM source…term | ambos | utm.ts / tracking.ts | utm_* | ❌ / `_tracking` | utm_* / utmSource | — | No | Medio | Eva: ignorar o note opcional |
| fbclid | ambos | utm.ts | fbclid | ❌ / `_tracking` | fbclid | — | No | Medio | **No escribir Eva** — exclusivo ads |
| gclid | ambos | utm.ts | gclid | ❌ / `_tracking` | gclid | — | No | Medio | **No escribir Eva** — exclusivo ads |
| landing_source | ambos | utm.ts | landing_source | ❌ / `_tracking` | landing_source | — | No | Bajo | Exclusivo landings |
| first/last page | ambos | utm.ts | first/last_page_seen | ❌ / `_tracking` | idem | — | No | Bajo | Exclusivo landings |
| origen / lead_type | magenta | MiBeca | origen, lead_type | ❌ | ✅ | — | No | Bajo | Exclusivo carreras landing |
| funnel / interest | magenta | MiBeca | funnel, interest | ❌ | ✅ | — | No | Bajo | Exclusivo carreras landing |
| wa_stage | magenta + Eva | MiBeca / handler | interes_beca | ❌ | wa_stage | `wa_stage` CF | **Conflicto** | **Alto** | Coordinar valores; Eva usa `wa_*` namespace |
| Fuente canal | Eva | handler | — | — | — | `wa_source` CF | No | Bajo | Eva: `YCloud / Eva WA` |
| Último intent WA | Eva | handler | — | — | — | `wa_last_intent` | No | Bajo | 7G.5B |
| Resumen interacción | Eva | handler | — | — | — | `wa_summary` / note | Parcial | Bajo | 7G.5A note suficiente |
| Tags CRM | Eva | handler | — | — | tags webhook | `eva-wa` + intent | Parcial | Medio | Namespaces distintos (`pwa` vs `eva-wa`) |

---

## 8. Campos solo GHL (no DB propia dedicada)

### 8.1 magenta-kangaroo — los 4 campos clave (confirmados)

Estos **no** están en `insertLead()` ni en schema `leads`:

| # | Campo GHL | Tipo | Eva WA debe… |
|---|-----------|------|--------------|
| 1 | **`fbclid`** | Click ID Facebook | **Ignorar** — sin contexto ads en WA inbound |
| 2 | **`gclid`** | Click ID Google | **Ignorar** |
| 3 | **UTM pack** (`utmSource`…`utmTerm`) | Atribución campaña | **Ignorar** en CF; opcional mención en note si algún día hay referral |
| 4 | **`landingSource` / `firstPageSeen` / `lastPageSeen`** | Navegación landing | **Ignorar** — no aplica a WA |

**Adicionales solo GHL (magenta):** `origen`, `lead_type`, `funnel`, `interest`, `career_id`, `modality`, campos beca/pricing, `wa_stage`, `tags_string`, `timestamp`.

### 8.2 orchids-landing-page-test — solo GHL (sin columna DB)

| Campo GHL | En DB |
|-----------|-------|
| `dictamen_url` | ❌ (solo `dictamen_text`) |
| `test_completed_at` | ❌ |
| `test_version` | ❌ |
| `oq_resumen` | ❌ columna (sí oq01–03 separados) |
| `firstName`/`lastName` split | ❌ (solo `nombre`) |

**Atribución:** En DB como `responses._tracking` (jsonb), en GHL como campos planos top-level — **sí persistida** pero no queryable como columna.

### 8.3 Eva WA

No captura UTM/fbclid/gclid. Fuente implícita: `YCloud / Eva WA`. No debe inventar atribución de landings.

---

## 9. Gaps y riesgos

| Gap | Severidad | Detalle |
|-----|-----------|---------|
| Dos mecanismos GHL | Alta | Webhook (landings) vs API (Eva) — mismos contactos, distintos campos |
| `wa_stage` duplicado | Alta | magenta `interes_beca` vs Eva `carrera_interes`/`beca_interes` |
| Campos vocacional protegidos | **Crítica** | Eva tiene lista `GHL_PROTECTED_FIELDS` — **no activar escritura accidental** |
| Sin allowlist GHL Eva | **Crítica** | Ver 7G.4S — implementar antes de live |
| Tags heterogéneos | Media | `pwa`, `beca-solicitada` vs `eva-wa`, `wa_interes_*` |
| Tasks duplicadas | Media | Cada beca/humano WA crea task; landings no crean tasks vía webhook |
| PII en notes/CF | Media | `wa_last_inbound_text` en 7G.5B |
| Supabase landings ≠ InsForge Eva | Baja | Bases distintas; reconciliación solo vía GHL contacto |

---

## 10. Recomendación 7G.5A (GHL live, sin custom fields)

| Hacer | No hacer |
|-------|----------|
| `GHL_SYNC_MODE=live` + allowlist Leandro | Escribir custom fields |
| Tags `eva-wa` + intent tag | Tocar `carrera_recomendada`, `match_percent`, `sector_principal`, etc. |
| Note estructurada por interacción WA | Sobrescribir `email`, `firstName`, `lastName` |
| Task solo intents escalados | Escribir `fbclid`, `gclid`, UTM |
| Buscar contacto por teléfono existente | Crear contacto duplicado sin revisar GHL UI |
| Mantener `WA_AGENT_MODE=mock` o live_outbound según decisión | Mezclar payloads webhook landings |

**Validar en GHL UI:** contacto Leandro (`ZPqb7Jit2zn64uaME9Cp`) ya tiene datos de fase 7E — nuevas tags/notes Eva deben **añadirse**, no reemplazar campos vocacional.

---

## 11. Recomendación 7G.5B (custom fields WA)

| Campo Eva | ¿Escribir? | Notas |
|-----------|:----------:|-------|
| `wa_last_intent` | ✅ | Namespace exclusivo WA |
| `wa_last_message_at` | ✅ | ISO — validar formato GHL |
| `wa_stage` | ✅ con cuidado | No confundir con `wa_stage` webhook magenta |
| `wa_needs_human` | ✅ | |
| `wa_summary` | ✅ | Truncar 500 chars |
| `wa_source` | ✅ | Constante `YCloud / Eva WA` |
| `wa_last_inbound_text` | ⚠️ | PII — truncar; preferir note en 7G.5A |
| `wa_last_outbound_text` | ⚠️ | Idem |

**Requiere:** `GHL_WA_FIELD_MAP` con 8 IDs reales del dashboard GHL.

**Nunca escribir en 7G.5B:** campos `GHL_PROTECTED_FIELDS` + atribución ads + campos beca/pricing de magenta landing.

---

## 12. Propiedad exclusiva por canal

| Exclusivo landings (webhook) | Exclusivo Eva WA (API) |
|------------------------------|------------------------|
| UTM, fbclid, gclid | `wa_last_intent`, `wa_last_message_at` |
| origen, lead_type, funnel (magenta) | `wa_needs_human`, `wa_summary` |
| dictamen_url, test_version, test_completed_at | Tags `eva-wa`, `wa_interes_*` |
| sector_principal, match_percent, carrera_recomendada | Notes/tasks operativas WA |
| scholarship_*, tuition_* (magenta) | `wa_source`, textos último in/out (7G.5B) |
| lead_score, lead_class (test) | |

**Compartido (solo lectura / upsert por teléfono):** `phone`, contacto GHL existente, tags acumulativos.

---

## 13. Cambios futuros propuestos (sin implementar)

1. **`GHL_LIVE_ALLOWED_PHONES`** — obligatorio antes de 7G.5A (ver 7G.4S).
2. **Documentar convención `wa_stage`** — valores Eva vs magenta para evitar sobrescritura semántica.
3. **Note template** — incluir `canal=Eva WA` y `no_utm` explícito para diferenciar de landings en GHL UI.
4. **No replicar webhook landings** en Eva — mantener API v2.
5. **Opcional futuro:** tabla InsForge `wa_attribution` si Meta Ads envía referral a WA — fuera de scope 7G.5.
6. **Dashboard GHL:** reglas workflow que filtren por `origen` / `lead_type` (landings) vs tag `eva-wa` (WhatsApp).

---

## 14. Variables de entorno (nombres only)

| Repo | Variable | Uso |
|------|----------|-----|
| magenta-kangaroo | `VITE_GHL_WEBHOOK_URL` | Webhook GHL |
| magenta-kangaroo | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | DB leads |
| orchids test | `GHL_WEBHOOK_URL` | Webhook GHL |
| orchids test | `NEXT_PUBLIC_BASE_URL` | `dictamen_url` |
| Eva WA | `GHL_API_KEY`, `GHL_LOCATION_ID` | API v2 |
| Eva WA | `GHL_SYNC_MODE`, `GHL_WRITE_CUSTOM_FIELDS` | Gate |
| Eva WA | `GHL_WA_FIELD_MAP` | IDs custom fields (7G.5B) |

---

## 15. Commit sugerido (pendiente autorización)

```
docs: add ghl fields audit landings vs eva wa
```

Archivos nuevos:
- `docs/phase-7g4u-ghl-fields-landings-vs-eva.md`

**No se hizo commit** en esta fase.

---

## 16. Decisión recomendada

1. **Aprobar** este reporte y commit del doc.
2. **7G.5A:** tags + notes + tasks; **sin** custom fields; **sin** tocar campos vocacional/beca/ads de landings.
3. **7G.5B:** solo namespace `wa_*` con mapa de IDs.
4. **No** intentar que Eva WA replique `fbclid`/`gclid`/UTM — esos campos son **exclusivos de landings** y la brecha magenta→DB es intencional (solo GHL).
