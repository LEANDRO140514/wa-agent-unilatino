# 7G.7C.6-E — Live pilot session report (admisiones)

**Estado:** ✅ **ROLLBACK + HARDENING COMPLETADOS** — runtime seguro post-piloto  
**Fecha:** 2026-06-26  
**Ventana documentada:** 9:30 – 10:30 am (piloto admisiones)  
**GO autorización:** Leandro — texto explícito 7G.7C.6-D  
**Rollback ejecutado:** 2026-06-26T16:33:59Z (post-sesión)  
**Hardening allowlist:** 2026-06-26T16:37:09Z (solo Leandro)

---

## 1. Resumen ejecutivo

| Pregunta | Resultado |
|----------|-----------|
| Activación temporal WA + GHL + CF | **Sí** |
| LLM apagado durante piloto | **Sí** (`eva_llm_enabled=false`) |
| Allowlist 3 teléfonos | **Sí** |
| `wa_errors` críticos en ventana live | **0** |
| Rollback aplicado | **Sí** |
| Hardening allowlist (solo Leandro) | **Sí** |
| Runtime post-rollback seguro | **Sí** |
| Flags finales seguros confirmados | **Sí** |

---

## 2. Autorización GO

```txt
Autorizo activación temporal del piloto Eva WA de 9:30 a 10:30 am, solo para allowlist,
con WA live, GHL live y custom fields activos, LLM apagado, rollback inmediato al terminar.
```

---

## 3. Activación temporal (7G.7C.6-E)

### Secrets aplicados

```txt
GHL_LIVE_ALLOWED_PHONES=+529991525583,+529993314831,+529996428094
GHL_SYNC_MODE=live
GHL_WRITE_CUSTOM_FIELDS=true
GHL_SYNC_POLICY=qualified_only
WA_AGENT_MODE=live_outbound
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=false
LLM_MODE=off
```

**Deploy activación:** `ycloud-wa-inbound` · `updatedAt=2026-06-26T15:33:15.659Z`

### Preflight post-activación

| Probe | Resultado |
|-------|-----------|
| `Hola` | `live_outbound`, `outbound_real=true`, `ghl_policy_blocked=true`, `ghl_synced=false` |
| `Me interesa Derecho en línea` | `outbound_real=true`, `accepted`, `ghl_live=true`, `ghl_synced=true`, `cf_written=true` |
| LLM | `eva_llm_enabled=false`, `eva_llm_mode=off` |

---

## 4. Actividad de sesión (telemetría DB)

Ventana telemetría: `created_at` / `received_at` **> 2026-06-26T15:33:00Z**

| Métrica | Total |
|---------|------:|
| `wa_inbound_messages` (`processed_inbound_live`) | **36** |
| `wa_outbound_messages` (`status=accepted`) | **36** |
| `wa_ghl_sync_log` (`sync_mode=live`) | **36** |
| `wa_errors` críticos | **0** |

### Inbound por teléfono (allowlist)

| Teléfono | Rol | Mensajes inbound |
|----------|-----|-----------------:|
| `+529991525583` | Leandro | **29** |
| `+529996428094` | Admisiones 2 | **6** |
| `+529993314831` | Admisiones 1 | **1** |

### GHL live `update_contact` por teléfono

| Teléfono | Syncs calificados (`action=update_contact`) |
|----------|---------------------------------------------|
| `+529991525583` | **3** |
| `+529996428094` | **4** |
| `+529993314831` | **1** |

### Eventos GHL live destacados

| Teléfono | Intent / status | Notas |
|----------|-----------------|-------|
| `+529991525583` | `carrera_interes` → ok | Preflight + sesión |
| `+529991525583` | `humano` → ok + task | |
| `+529991525583` | `beca` → ok + task | |
| `+529991525583` | `agradecimiento` → `post_escalation_closure_no_sync` | Sin sync post-escalación ✅ |
| `+529996428094` | `carrera_interes`, `humano` → ok + tasks | |
| `+529993314831` | `carrera_interes` → ok | |
| Varios | `policy_blocked` (saludos / ambiguo) | `qualified_only` activo ✅ |

---

## 5. Rollback ejecutado

### Secrets cambiados (orden)

```txt
1. WA_AGENT_MODE=mock
2. GHL_SYNC_MODE=dry_run
3. GHL_WRITE_CUSTOM_FIELDS=false
```

### Mantenidos sin cambio

```txt
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=false
LLM_MODE=off
GHL_SYNC_POLICY=qualified_only
GHL_LIVE_ALLOWED_PHONES=+529991525583,+529993314831,+529996428094
```

**Nota:** allowlist de 3 teléfonos permaneció en secret tras rollback inicial; hardening (§7) la redujo a solo Leandro.

**Deploy post-rollback:** `updatedAt=2026-06-26T16:33:59.124Z`

---

## 6. Hardening post-piloto (allowlist)

### Secret cambiado (único)

```txt
GHL_LIVE_ALLOWED_PHONES=+529991525583
```

### Sin cambio

```txt
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=false
LLM_MODE=off
GHL_SYNC_POLICY=qualified_only
```

- **Sin redeploy** — solo secret vía InsForge REST API (`PUT /api/secrets/GHL_LIVE_ALLOWED_PHONES`).
- **Sin** activación live, WA real, GHL live, LLM, Meta Ads, deploy de código ni borrado de datos.

**Secret actualizado:** `updated_at=2026-06-26T16:37:09.731Z`

---

## 7. Verificación post-rollback y post-hardening

### Secrets confirmados

| Secret | Valor |
|--------|-------|
| `WA_AGENT_MODE` | **`mock`** |
| `GHL_SYNC_MODE` | **`dry_run`** |
| `GHL_WRITE_CUSTOM_FIELDS` | **`false`** |
| `EVA_LLM_ENABLED` | **`false`** |
| `LLM_MODE` | **`off`** |
| `ACADEMIC_ENGINE_ENABLED` | **`true`** |
| `GHL_LIVE_ALLOWED_PHONES` | **`+529991525583`** (solo Leandro) |

### Probe post-hardening (`Hola`, `+529991525583`)

```json
{
  "mode": "mock",
  "ghl_sync_mode": "dry_run",
  "outbound_real": false,
  "ghl_live": false,
  "ghl_dry_run": true,
  "eva_llm_enabled": false,
  "eva_llm_mode": "off",
  "cf": false,
  "ghl_policy_blocked": true
}
```

| Check | Resultado |
|-------|-----------|
| `outbound_real=false` | ✅ |
| `ghl_live=false` | ✅ |
| LLM off | ✅ |
| `GHL_LIVE_ALLOWED_PHONES` solo Leandro | ✅ |
| `wa_errors` críticos post-rollback | **0** |

---

## 8. Observaciones

1. **Leandro** concentró mayor volumen de mensajes (29 inbound) — incluye preflight y pruebas repetidas; coherente con rol monitoreo.
2. **Admisiones 1** envió 1 mensaje calificado (`carrera_interes` sync ok).
3. **Admisiones 2** completó flujo parcial (carrera + humano + tasks).
4. **`qualified_only`** bloqueó saludos/ambiguo sin sync GHL en múltiples casos.
5. **`Gracias` post-escalación** en Leandro → `post_escalation_closure_no_sync` ✅
6. **Sin errores críticos** en toda la ventana live.
7. Hardening post-piloto redujo allowlist a **`+529991525583`** únicamente (§6).
8. Sesión sin errores críticos; telemetría conservada en DB para revisión GHL UI.

---

## 9. Veredicto sesión

| Criterio | Estado |
|----------|--------|
| WA live allowlist | ✅ |
| GHL live allowlist | ✅ |
| CF live en syncs calificados | ✅ (durante ventana) |
| LLM apagado | ✅ |
| Rollback seguro | ✅ |
| Hardening allowlist | ✅ |
| Críticos = 0 | ✅ |

**Sesión 7G.7C.6-E:** piloto admisiones ejecutado; rollback y hardening confirmados.

### Recomendación siguiente

1. **Revisión GHL UI** manual para los 3 contactos de allowlist piloto (Leandro, Adm.1, Adm.2).
2. **Retrospectiva admisiones** — feedback asesores sobre tasks, campos WA y tiempos de respuesta.
3. **Siguiente fase sugerida:** 7G.7C.7 — cierre formal piloto + decisión ampliación allowlist o piloto orgánico controlado (sin activar live hasta nuevo GO).
4. Mantener runtime en modo seguro hasta autorización explícita.

---

## 10. Flags finales (post-hardening)

```txt
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=false
LLM_MODE=off
GHL_SYNC_POLICY=qualified_only
GHL_LIVE_ALLOWED_PHONES=+529991525583
```

---

## 11. Referencias

- Kickoff: `docs/phase-7g7c6c-admissions-kickoff.md`
- Pre-live: `docs/phase-7g7c6d-final-prelive-checklist.md`
- Briefing: `docs/phase-7g7c6b-admissions-briefing.md`
- Guion: `docs/phase-7g6c-admissions-test-script.md`

---

*Documento interno — Universidad Latino / Eva WA — Fase 7G.7C.6-E*
