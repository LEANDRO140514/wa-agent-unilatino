# Phase 7G.6B — Plan piloto interno ampliado (NO ejecutar sin autorización)

**Estado:** 📋 **PLAN** — documentación únicamente  
**Prerequisito:** 7G.6A checklist + autorización explícita Leandro  
**Checkpoint base:** `0060b3a` (7G.5C PASS)

---

## Objetivo

Validar Eva WA en flujo completo (WhatsApp real + GHL live + CF `wa_*`) con **2–3 teléfonos internos** de admisiones/equipo, supervisión manual y duración acotada (30–60 min).

**No es go-live masivo.** Meta Ads permanecen apagados.

---

## Teléfonos necesarios

| # | Rol | E.164 | Estado |
|---|-----|-------|--------|
| 1 | Leandro (owner) | `+529991525583` | ✅ Validado 7G.5C |
| 2 | Asesor / admisiones 1 | `+52___________` | ☐ Pendiente definir |
| 3 | Asesor / admisiones 2 | `+52___________` | ☐ Pendiente definir |

**Allowlist propuesta (ejemplo — NO activar hasta números reales):**

```
GHL_LIVE_ALLOWED_PHONES=+529991525583,+52XXXXXXXXXX,+52YYYYYYYYYY
```

---

## Configuración propuesta (temporal)

| Secret | Valor |
|--------|-------|
| `WA_AGENT_MODE` | `live_outbound` |
| `GHL_SYNC_MODE` | `live` |
| `GHL_WRITE_CUSTOM_FIELDS` | `true` |
| `GHL_LIVE_ALLOWED_PHONES` | 3–4 E.164 autorizados |
| Resto | Sin cambios (`ACADEMIC_ENGINE_ENABLED=true`, `LLM_MODE=rewrite`, etc.) |

**Orden activación:** GHL live → CF true → WA live_outbound  
**Orden rollback:** WA mock → CF false → GHL dry_run

---

## Duración y ventana

| Parámetro | Valor |
|-----------|-------|
| Duración máxima | 60 minutos |
| Mensajes por tester | 4–5 |
| Total mensajes objetivo | ≥ 12 |
| Supervisión | Técnico + GHL + YCloud en paralelo |

---

## Roles

| Rol | Responsabilidad |
|-----|-----------------|
| Leandro | Autorización, tester 1, decisión go/no-go |
| Tester interno 2–3 | Enviar mensajes desde WhatsApp personal |
| Responsable técnico | Monitoreo InsForge, SQL, rollback |
| Responsable GHL | Validar contacto, tags, notes, tasks, CF en UI |
| Responsable YCloud | Delivery logs, ventana 24h si aplica |

---

## Mensajes sugeridos por tester

Cada tester envía **desde su WhatsApp real** al número Eva `+529994538421`, **uno por uno**, esperando respuesta visible:

| Orden | Mensaje | Intent esperado | Notas |
|:-----:|---------|-----------------|-------|
| 1 | `1` | `carreras_disponibles` | Lista académica oficial |
| 2 | `Derecho online` | `carrera_interes` | Detalle carrera + precios |
| 3 | `No sé qué estudiar` | `no_se_que_estudiar` | Link test vocacional |
| 4 | `Tengo promedio 9.2, qué beca me toca` | `beca` | Rewrite bloqueado; factual |
| 5 | `Quiero hablar con asesor` | `humano` | Task GHL esperada |

**Variación opcional tester 2:** cambiar carrera en paso 2 (ej. `Psicología presencial`).

---

## Validaciones por mensaje

- [ ] `processed_inbound_live`
- [ ] Outbound `accepted` + `provider_response_id`
- [ ] Respuesta visible en WhatsApp
- [ ] `ghl_sync_mode=live`, `status=ok`
- [ ] `custom_fields_written=true`, 8 keys
- [ ] Allowlist matched
- [ ] Sin campos protegidos en PUT
- [ ] `wa_errors` críticos = 0

Plantilla registro: `docs/phase-7g6a-monitoring-template.md`

---

## Rollback (obligatorio al terminar)

1. `WA_AGENT_MODE=mock`
2. `GHL_WRITE_CUSTOM_FIELDS=false`
3. `GHL_SYNC_MODE=dry_run`

Verificar + smoke:

```bash
node tests/run-phase7g3a-classifier-hotfix.mjs
node tests/run-phase7g5b-custom-fields-preflight.mjs
```

---

## Criterios de éxito

| Criterio | Umbral |
|----------|--------|
| Testers completos | 2–3 internos |
| Mensajes totales | ≥ 12 |
| Errores críticos | 0 |
| Duplicados GHL | 0 |
| CF fuera whitelist | 0 |
| Campos protegidos tocados | 0 |
| Rollback confirmado | 100% |
| Feedback admisiones | Positivo / accionable |

---

## Criterios de fallo (abortar y rollback)

Ver `phase-7g6a-go-live-readiness-checklist.md` §11 — interrupción inmediata.

---

## Reporte esperado (post-7G.6B)

Crear: `docs/phase-7g6b-internal-pilot-report.md`

Debe incluir:

- Flags antes / durante / después
- Tabla testers + mensajes + provider_response_id
- Contactos GHL usados
- CF `wa_stage` por intent
- Incidentes (si hubo)
- Rollback + smoke
- Recomendación: go-live limitado vs repetir vs detener

Commit sugerido: `docs: add internal pilot report 7g6b`

---

## Preflight obligatorio (día 7G.6B)

```bash
git status --short          # limpio
node tests/run-phase7g3a-classifier-hotfix.mjs    # 14/14
node tests/run-phase7g5b-custom-fields-preflight.mjs  # 9/9
```

Runtime seguro antes de activar: `mock`, `dry_run`, `CF=false`.

---

## Lo prohibido en 7G.6B

- Meta Ads
- Números no listados en allowlist
- Duración > 60 min sin re-autorización
- Deploy de código nuevo durante piloto
- Quitar allowlist
- Prueba negativa por WhatsApp real (ya cubierta en 7G.5A/7G.5B)

---

**Autorización requerida:** Leandro — explícita antes de cambiar cualquier secret en InsForge.
