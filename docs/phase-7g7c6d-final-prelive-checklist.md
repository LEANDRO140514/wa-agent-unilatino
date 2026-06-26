# 7G.7C.6-D — Final pre-live checklist (piloto admisiones)

**Estado:** 📋 **CHECKLIST EMITIDO** — decisión pre-switch documentada · **sin cambios en esta fase**  
**Fecha:** 2026-06-26  
**Base:** `dfd9092` — 7G.7C.6-C admissions kickoff allowlist  
**Ventana piloto:** **9:30 – 10:30 am**  
**Modo 7G.7C.6-D:** solo lectura + documentación (sin activar live en esta fase)

### Fases previas cerradas (commits)

| Fase | Commit |
|------|--------|
| 7G.7C.5 — Readiness | `712bb2e` |
| 7G.7C.6-A — LLM alignment | `e134f6a` |
| 7G.7C.6-B — Briefing admisiones | `3906f94` |
| 7G.7C.6-C — Kickoff allowlist | `dfd9092` |

---

## Aviso — estado runtime al emitir este documento

**Validación pre-switch (§2)** se realizó cuando el runtime estaba en **modo seguro** (`mock` + `dry_run`).

**Lectura read-only al cerrar redacción 7G.7C.6-D (sin modificar secrets en esta tarea):** InsForge puede mostrar piloto **ya activado** por fase posterior **7G.7C.6-E** (`live_outbound` + GHL live) si Leandro emitió GO textual después del checklist. Eso **no invalida** este checklist pre-live; confirma que el GO fue ejecutado en fase separada.

**Esta fase 7G.7C.6-D:** cero writes, cero probes POST, cero cambios de secrets/flags/deploy.

---

## 1. Estado esperado antes del switch

```txt
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=false
LLM_MODE=off
GHL_SYNC_POLICY=qualified_only
```

---

## 2. Validación read-only pre-switch (baseline GO)

Snapshot tomado **antes** de cualquier activación live (secrets + DB, sin POST).

### 2.1 Flags / secrets observados (pre-switch)

| Secret / probe | Esperado | Observado pre-switch | OK |
|----------------|----------|----------------------|-----|
| `WA_AGENT_MODE` | `mock` | `mock` | ✅ |
| `GHL_SYNC_MODE` | `dry_run` | `dry_run` | ✅ |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` | `false` | ✅ |
| `ACADEMIC_ENGINE_ENABLED` | `true` | `true` | ✅ |
| `EVA_LLM_ENABLED` | `false` | `false` | ✅ |
| `LLM_MODE` | `off` | `off` | ✅ |
| `GHL_SYNC_POLICY` | `qualified_only` | `qualified_only` | ✅ |
| Probe `outbound_real` | `false` | `false` | ✅ |
| Probe `ghl_live` | `false` | `false` | ✅ |
| Probe `eva_llm_enabled` | `false` | `false` | ✅ |

**Allowlist secret (pre-switch):** `+529991525583, +529993314831, +529996428094` (3 E.164; espacios tras comas — normalizar a `+529991525583,+529993314831,+529996428094` antes del switch).

### 2.2 DB read-only (pre-switch)

| Check | Resultado pre-switch |
|-------|----------------------|
| `wa_errors` críticos (30 min) | **0** |
| Outbound `accepted` post-rollback (`>2026-06-26T06:09:00Z`) | **0** |
| `wa_ghl_sync_log` `sync_mode=live` post-rollback | **0** |
| Duplicados `wa_contacts_state` por `normalized_phone` | **0** |

**Últimos inbound (pre-switch):** `processed_inbound_mock`  
**Últimos outbound (pre-switch):** `mocked`  
**Últimos sync log (pre-switch):** `sync_mode=dry_run`

### 2.3 Lectura read-only al emitir doc (sin POST — puede reflejar post-GO)

| Check | Observado (solo SELECT, esta redacción) |
|-------|----------------------------------------|
| Secrets actuales | Pueden ser `live_outbound` + `live` si 7G.7C.6-E ya corrió |
| Outbound `accepted` post-rollback | **2** (preflight activación 7G.7C.6-E) |
| GHL `live` post-rollback | **2** |
| Críticos 30 min | **0** |
| Duplicados `wa_contacts_state` | **0** |

**Últimos 3 `wa_inbound_messages` (lectura actual):**

| `received_at` | `phone` | `status` |
|---------------|---------|----------|
| `15:34:28Z` | `+529991525583` | `processed_inbound_live` |
| `15:34:25Z` | `+529991525583` | `processed_inbound_live` |
| `15:31:00Z` | `+529991525583` | `processed_inbound_mock` |

**Últimos 3 `wa_outbound_messages`:**

| `sent_at` | `status` | `provider_id` |
|-----------|----------|---------------|
| `15:34:27Z` | `accepted` | sí |
| `15:34:25Z` | `accepted` | sí |
| `15:31:00Z` | `mocked` | no |

**Últimos 3 `wa_ghl_sync_log`:**

| `created_at` | `sync_mode` | `action` |
|--------------|-------------|----------|
| `15:34:29Z` | `live` | `update_contact` |
| `15:34:27Z` | `live` | `policy_blocked` |
| `15:31:01Z` | `dry_run` | `policy_blocked` |

---

## 3. Datos operativos confirmados

### Allowlist piloto

| E.164 | Rol |
|-------|-----|
| `+529991525583` | **Leandro** — owner / GO-rollback / monitoreo |
| `+529993314831` | **Admisiones 1** — asesor |
| `+529996428094` | **Admisiones 2** — asesor |

### Ventana

**9:30 – 10:30 am**

### Canal interno

WhatsApp grupo temporal: **“Piloto Eva WA — Admisiones”**

### Responsables

| Rol | Persona |
|-----|---------|
| Monitoreo InsForge | **Leandro** |
| Monitoreo GHL | **Leandro** |
| Rollback owner | **Leandro** |
| Decisión GO / NO-GO | **Leandro** |

**Guion:** `docs/phase-7g6c-admissions-test-script.md`  
**Eva WA:** `+529994538421`

---

## 4. Autorización explícita requerida (no ejecutada en 7G.7C.6-D)

Leandro debe escribir **después** de revisar este checklist:

```txt
Autorizo activación temporal del piloto Eva WA de 9:30 a 10:30 am, solo para allowlist, con WA live, GHL live y custom fields activos, LLM apagado, rollback inmediato al terminar.
```

### Checklist previo al switch (marcar al recibir GO)

- [ ] Texto de autorización archivado
- [ ] Ventana 9:30–10:30 confirmada
- [ ] Admisiones 1 y 2 disponibles
- [ ] Grupo WA activo
- [ ] GHL abierto
- [ ] Re-verificación: `mock` + `dry_run` + LLM off **inmediatamente antes** del cambio
- [ ] Rollback owner confirmado

**Sin GO textual → NO activar (fase 7G.7C.6-E).**

---

## 5. Plan de switch (documentado — NO ejecutado en 7G.7C.6-D)

### Activación temporal (solo tras GO — fase 7G.7C.6-E)

```txt
GHL_LIVE_ALLOWED_PHONES=+529991525583,+529993314831,+529996428094
GHL_SYNC_MODE=live
GHL_WRITE_CUSTOM_FIELDS=true
GHL_SYNC_POLICY=qualified_only
WA_AGENT_MODE=live_outbound
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=false
LLM_MODE=off
(+ redeploy ycloud-wa-inbound si secrets no recargan)
```

### Rollback (10:30 o stop)

```txt
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=false
LLM_MODE=off
GHL_SYNC_POLICY=qualified_only
GHL_LIVE_ALLOWED_PHONES=+529991525583
(+ redeploy si aplica)
```

---

## 6. Criterios de stop

| # | Criterio |
|---|----------|
| 1 | `wa_errors` crítico |
| 2 | `outbound_live_failed` |
| 3 | `ghl_live_failed` |
| 4 | Respuesta académica incorrecta |
| 5 | Contacto duplicado GHL |
| 6 | Task ilegible o título vacío |
| 7 | Asesor no ve actualización GHL |
| 8 | Mensaje / sync fuera de allowlist |
| 9 | LLM se reactiva (`EVA_LLM_ENABLED=true` o `LLM_MODE≠off`) |
| 10 | Leandro decide pausar |

---

## 7. GO / NO-GO — solicitar autorización explícita

### Al momento del checklist pre-switch (§2.1)

| Check | Estado |
|-------|--------|
| Modo seguro confirmado | ✅ |
| LLM off | ✅ |
| DB sin live post-rollback | ✅ |
| Críticos 30 min | ✅ 0 |
| Kickoff / allowlist / ventana | ✅ |
| Duplicados contacts_state | ✅ 0 |

### Veredicto 7G.7C.6-D

| Dimensión | Decisión |
|-----------|----------|
| **Sistema listo para solicitar GO a Leandro** | ✅ **GO** |
| **Activación en esta fase** | ❌ **NO** — solo documentación |
| **Cambios productivos en 7G.7C.6-D** | **Ninguno** |

---

## 8. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Allowlist con espacios en secret | Normalizar sin espacios antes del switch |
| Activar sin GO escrito | Bloquear hasta §4 |
| Confundir checklist con activación | Fases 7G.7C.6-D (doc) vs 7G.7C.6-E (switch) |
| Ventana 60 min | Guion mínimo 1-2-5 si falta tiempo |

---

## 9. Confirmación — cero cambios productivos (7G.7C.6-D)

| Control | Esta fase |
|---------|-----------|
| Secrets / flags | ❌ no modificados |
| Deploy | ❌ no |
| POST / WA real | ❌ no en esta redacción |
| GHL writes | ❌ no |
| Código / tests | ❌ no |

**Próxima fase tras GO:** **7G.7C.6-E** — activación temporal + reporte sesión + rollback.

---

## 10. Cierre post-piloto (7G.7C.6-E)

| Evento | Estado |
|--------|--------|
| Piloto live ejecutado | ✅ |
| Rollback `mock` + `dry_run` + `cf=false` | ✅ |
| Hardening allowlist → solo `+529991525583` | ✅ |
| Reporte sesión | `docs/phase-7g7c6e-live-pilot-session-report.md` |

---

*Documento interno — Universidad Latino / Eva WA — Fase 7G.7C.6-D*
