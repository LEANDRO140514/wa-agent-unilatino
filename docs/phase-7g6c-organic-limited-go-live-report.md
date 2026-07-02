# Phase 7G.6C — Reporte piloto admisiones + ruta orgánico limitado

**Estado:** ✅ **7G.6C COMPLETADO** — rollback post-sesión **CONFIRMADO** (2026-06-25 ~23:02 UTC)  
**Fecha sesión:** 2026-06-25 · ventana **22:32–22:34 UTC**  
**Checkpoint:** `7bb05b3`  
**Runner:** `tests/run-phase7g6c-admissions-pilot.mjs`

---

## 1. Resumen ejecutivo

| Pregunta | Resultado |
|----------|-----------|
| WA live temporal | **Sí** (`live_outbound`) |
| GHL live temporal | **Sí** |
| CF `wa_*` temporal | **Sí** |
| Participantes | **3/3** |
| Mensajes piloto | **15/15 PASS** |
| Outbound `accepted` | **15/15** |
| GHL sync `ok` + CF | **15/15** |
| `allowlist_matched=true` | **15/15** |
| Contactos GHL únicos | **3** (sin duplicados) |
| Tasks GHL (humano/beca) | **6** creadas (payload `task_response`) |
| Notes GHL | **15** creadas |
| `wa_errors` críticos | **0** |
| Meta Ads | **No** |
| Rollback | ✅ **Confirmado** — ver §6 |

---

## 2. Configuración durante sesión

| Flag | Valor detectado |
|------|-----------------|
| `WA_AGENT_MODE` | `live_outbound` |
| `GHL_SYNC_MODE` | `live` |
| `GHL_WRITE_CUSTOM_FIELDS` | `true` |
| `ghl_allowed_phones_count` | **4** (3 piloto + 1 extra en InsForge) |

---

## 3. Teléfonos y contactos GHL

| Rol | E.164 | contact_id | Msgs |
|-----|-------|------------|-----:|
| Leandro | `+52******5583` | contacto GHL redactado | 5 |
| Admisiones 1 | `+52******4831` | contacto GHL redactado | 5 |
| Admisiones 2 | `+52******8094` | contacto GHL redactado | 5 |

---

## 4. Resultados por mensaje (DB)

| Hora (UTC) | Teléfono | Mensaje | Intent | OB | GHL | CF | Allowlist |
|------------|----------|---------|--------|:--:|:---:|:--:|:---------:|
| 22:32:26 | Leandro | `1` | carreras_disponibles | ✅ | ok | ✅ | true |
| 22:32:45 | Leandro | Derecho online | carrera_interes | ✅ | ok | ✅ | true |
| 22:32:51 | Leandro | No sé qué estudiar | no_se_que_estudiar | ✅ | ok | ✅ | true |
| 22:32:59 | Leandro | promedio 9.2 beca | beca | ✅ | ok | ✅ | true |
| 22:33:09 | Leandro | Quiero hablar con asesor | humano | ✅ | ok | ✅ | true |
| 22:33:17 | Adm. 1 | `1` | carreras_disponibles | ✅ | ok | ✅ | true |
| 22:33:24 | Adm. 1 | Derecho online | carrera_interes | ✅ | ok | ✅ | true |
| 22:33:30 | Adm. 1 | No sé qué estudiar | no_se_que_estudiar | ✅ | ok | ✅ | true |
| 22:33:37 | Adm. 1 | promedio 9.2 beca | beca | ✅ | ok | ✅ | true |
| 22:33:48 | Adm. 1 | Quiero hablar con asesor | humano | ✅ | ok | ✅ | true |
| 22:34:01 | Adm. 2 | `1` | carreras_disponibles | ✅ | ok | ✅ | true |
| 22:34:08 | Adm. 2 | Derecho online | carrera_interes | ✅ | ok | ✅ | true |
| 22:34:14 | Adm. 2 | No sé qué estudiar | no_se_que_estudiar | ✅ | ok | ✅ | true |
| 22:34:21 | Adm. 2 | promedio 9.2 beca | beca | ✅ | ok | ✅ | true |
| 22:34:31 | Adm. 2 | Quiero hablar con asesor | humano | ✅ | ok | ✅ | true |

**Beca 9.2:** tramo **Muy alto / 40%** colegiatura + 50% inscripción (factual, sin rewrite).

---

## 5. Validación GHL

| Check | Esperado | Resultado |
|-------|----------|:---------:|
| Contacto único por teléfono | 3 contactos | ✅ |
| Tags | `eva-wa` + intent | ✅ |
| Notes | resumen en payload | ✅ |
| Tasks | humano + beca (6 total) | ✅ |
| 8 campos `wa_*` | escritos live | ✅ |
| `allowlist_matched` | `true` | ✅ |
| Campos protegidos | no en PUT | ✅ (solo `wa_*`) |
| `wa_errors` críticos | 0 | ✅ |

**Validación UI GHL recomendada:** revisar contactos de los 3 teléfonos en consola admisiones.

---

## 6. Rollback — CONFIRMADO (2026-06-25 ~23:02 UTC)

| Flag | Esperado | Detectado |
|------|----------|:---------:|
| `WA_AGENT_MODE` | `mock` | ✅ |
| `GHL_SYNC_MODE` | `dry_run` | ✅ |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` | ✅ |
| `outbound_real` | `false` | ✅ |
| 7G.3A smoke | 14/14 | ✅ |
| 7G.5B preflight | 9/9 | ✅ |

**Nota opcional:** `ghl_allowed_phones_count=4` (allowlist no reducida a solo Leandro). No afecta modo seguro mientras `GHL_SYNC_MODE=dry_run`. Reducir a **owner autorizado** antes del próximo piloto si se desea.

**Incidente ventana live (no bloqueante rollback):** 1× `ghl_live_failed` en `+52******9307` — GHL 400 duplicado de contacto (location no permite duplicados). Revisar contacto existente en GHL UI si ese lead es relevante.

---

## 7. Decisión go/no-go

| Opción | Recomendación |
|--------|---------------|
| **A** Repetir 7G.6C | No necesario — 15/15 PASS |
| **B** Avanzar **7G.6D** orgánico limitado | ✅ **Recomendado** |
| **C** Preparar **7G.8** Meta Ads mínimo | Tras 7G.6D |
| **D** Detener | No — piloto exitoso |

**Siguiente paso:** rollback §6 → `phase-7g6d-organic-limited-prep.md`

---

## 8. Ruta comercial (3 pasos)

| Paso | Fase | Estado |
|:----:|------|--------|
| 1 | 7G.6C Admisiones | ✅ **COMPLETADO** |
| 2 | 7G.6D Orgánico limitado | 📋 Prep listo |
| 3 | 7G.8 Meta Ads mínimo | 📋 Plan listo (no activar) |

---

## Referencias

| Documento | Uso |
|-----------|-----|
| `phase-7g6c-prep-admissions-pilot.md` | Prep sesión |
| `phase-7g6d-organic-limited-prep.md` | Siguiente fase |
| `phase-7g8-meta-ads-controlled-plan.md` | Meta controlado |
