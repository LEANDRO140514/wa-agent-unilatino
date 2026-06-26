# 7G.7C.6-C — Kickoff piloto admisiones (allowlist confirmada)

**Estado:** ✅ **KICKOFF DOCUMENTADO** — activación live **NO autorizada**  
**Fecha:** 2026-06-26  
**Base:** `3906f94` — 7G.7C.6-B admissions briefing  
**Alcance:** solo documentación operativa · sin cambios en secrets, flags, InsForge ni GHL

---

## 1. Teléfonos allowlist confirmados (piloto admisiones)

Allowlist piloto **confirmada** — exactamente **3** números E.164:

| E.164 | Rol | GHL contact ID | Responsabilidad en piloto |
|-------|-----|----------------|---------------------------|
| `+529991525583` | **Leandro** — owner / GO-rollback / monitoreo | `ZPqb7Jit2zn64uaME9Cp` | Decisión GO/NO-GO, monitoreo InsForge + GHL, rollback, canal de stop |
| `+529993314831` | **Admisiones 1** — asesor | `LxSpYSe41hBpnA6iiLSp` | Lead controlado, envío guion WA, revisión GHL |
| `+529996428094` | **Admisiones 2** — asesor | `W0n06gpVjIM4cRSthsHa` | Lead controlado, envío guion WA, revisión GHL |

```txt
GHL_LIVE_ALLOWED_PHONES (propuesto al activar live — NO aplicado aún):
+529991525583,+529993314831,+529996428094
```

**WhatsApp business Eva (destino):** `+529994538421` — número oficial al que escriben los participantes; **no** forma parte de la allowlist.

**Runtime InsForge actual (sin cambio):** `GHL_LIVE_ALLOWED_PHONES=+529991525583` (count=1).

---

## 2. Ventana piloto

| Campo | Valor |
|-------|-------|
| **Horario** | **9:30 – 10:30 am** |
| **Duración** | 60 minutos |
| **Alcance** | Máximo 3 participantes allowlist; guion `phase-7g6c-admissions-test-script.md` |

---

## 3. Canal interno

| Canal | Detalle |
|-------|---------|
| **WhatsApp grupo temporal** | **“Piloto Eva WA — Admisiones”** |
| **Uso** | Coordinación sesión, reporte de incidentes, confirmación de cierre |

**Canal de stop:** Leandro `+529991525583` + grupo WA durante ventana.

---

## 4. Responsables confirmados

| Rol | Responsable |
|-----|-------------|
| Monitoreo InsForge | **Leandro** |
| Monitoreo GHL | **Leandro** |
| Rollback owner | **Leandro** |
| Decisión GO / NO-GO | **Leandro** |
| Asesores en sesión | Admisiones 1 y 2 (`+529993314831`, `+529996428094`) |

---

## 5. Advertencia — números fuera de allowlist

```txt
⚠️ Ningún teléfono fuera de los 3 E.164 documentados debe usarse en el piloto admisiones.
```

| Regla | Detalle |
|-------|---------|
| No ampliar allowlist | Sin autorización explícita de Leandro |
| No probar con números desconocidos | Sin sync GHL live ni tráfico no controlado |
| No compartir número Eva públicamente | Sin Meta Ads ni difusión masiva (7G.8 no autorizado) |
| No usar leads externos | Solo los 3 participantes documentados |

---

## 6. Estado — sin activación productiva

| Control | Estado |
|---------|--------|
| WA live (`live_outbound`) | ❌ **NO autorizado todavía** |
| GHL live | ❌ **NO autorizado todavía** |
| Custom fields live (`GHL_WRITE_CUSTOM_FIELDS=true`) | ❌ **NO autorizado todavía** |
| Cambio de secrets en InsForge | ❌ **NO autorizado todavía** |
| Runtime InsForge | **Sin cambio** — modo seguro activo |
| Allowlist técnica InsForge | **Sin cambio** (`+529991525583` hasta activación explícita posterior) |
| WhatsApp real outbound | ❌ **NO** |
| Llamadas GHL live | ❌ **NO** |
| Modificación función InsForge | ❌ **NO** |

**Runtime seguro vigente:**

```txt
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
GHL_SYNC_POLICY=qualified_only
GHL_LIVE_ALLOWED_PHONES=+529991525583
EVA_LLM_ENABLED=false
LLM_MODE=off
ACADEMIC_ENGINE_ENABLED=true
```

---

## 7. Activación temporal — condición

> **La activación temporal** (ampliar allowlist, GHL live, CF live, WA `live_outbound`) **solo podrá ocurrir después del checklist final y GO explícito de Leandro** en fase posterior (7G.7C.6-D o equivalente).

Pre-requisitos antes de cualquier switch:

- [ ] Ventana 9:30–10:30 am confirmada con asesores presentes
- [ ] Briefing realizado (`phase-7g7c6b-admissions-briefing.md`)
- [ ] Re-verificación flags: `mock` + `dry_run` + LLM off **inmediatamente antes** del cambio
- [ ] GO verbal/escrito de Leandro para WA live y/o GHL live
- [ ] Rollback owner y grupo WA activos
- [ ] Monitoreo InsForge + GHL asignado

---

## Referencias

- Briefing admisiones: `docs/phase-7g7c6b-admissions-briefing.md`
- Guion sesión: `docs/phase-7g6c-admissions-test-script.md`
- Piloto orgánico 3 teléfonos validado: `docs/phase-7g7c4-controlled-organic-live-report.md`

---

*Documento interno — Universidad Latino / Eva WA — Fase 7G.7C.6-C*
