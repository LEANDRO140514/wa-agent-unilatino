# Phase 7F — Plantilla de monitoreo Go-Live (Eva WA)

Copiar este archivo o completar inline durante la ventana de activación.  
**No activar producción** hasta autorización de Leandro y checklist `docs/phase-7f-go-live-checklist.md`.

---

## Metadatos de activación

| Campo | Valor |
|-------|-------|
| Fecha | |
| Hora de activación (timezone) | |
| Responsable activación | |
| Autorizado por (Leandro) | |
| Endpoint | `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound` |
| WhatsApp business | `+52 999 453 8421` (`+529994538421`) |
| Ventana monitoreo | Primera hora: cada 15 min / extendido: |

### Flags al activar

| Secret | Valor |
|--------|-------|
| `WA_AGENT_MODE` | `live_outbound` |
| `GHL_SYNC_MODE` | `live` |
| `GHL_WRITE_CUSTOM_FIELDS` | `true` |
| `ACADEMIC_ENGINE_ENABLED` | `true` |
| `EVA_LLM_ENABLED` | `false` |

- [ ] Confirmado en Dashboard post-cambio
- [ ] Preflight POST: `outbound_real=true`, `ghl_live=true`, `eva_llm_enabled=false`

---

## Prueba post-activación (5 mensajes controlados)

Número origen: `+529991525583` → business `+529994538421`

| # | Hora envío | Mensaje | outbound accepted | provider_response_id | ghl_synced | CF written | Tag OK | Task OK | Notas |
|---|------------|---------|:-----------------:|:--------------------:|:----------:|:----------:|:------:|:-------:|-------|
| 1 | | `1` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 2 | | `Derecho online` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 3 | | `Tengo promedio 9.8, qué beca me toca` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 4 | | `No sé qué estudiar` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 5 | | `Quiero hablar con asesor` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |

**ghl_contact_id** observado (debe ser único):  
**Duplicados detectados:** sí / no — detalle:

---

## Monitoreo por intervalo (cada 15 min)

### T+0 — __:__ (activación)

| Métrica | Valor | OK |
|---------|-------|:--:|
| `wa_errors` (últimos 15 min) | | ☐ |
| Inbound count (15 min) | | ☐ |
| Outbound `accepted` (15 min) | | ☐ |
| GHL sync `ok` (15 min) | | ☐ |
| Contactos nuevos GHL | | ☐ |
| Duplicados | | ☐ |
| Tasks creadas | | ☐ |
| Tags correctos | | ☐ |
| Custom fields poblados | | ☐ |

**Observaciones:**

---

### T+15 — __:__

| Métrica | Valor | OK |
|---------|-------|:--:|
| `wa_errors` (últimos 15 min) | | ☐ |
| Inbound count (15 min) | | ☐ |
| Outbound `accepted` (15 min) | | ☐ |
| GHL sync `ok` (15 min) | | ☐ |
| Contactos nuevos GHL | | ☐ |
| Duplicados | | ☐ |
| Tasks creadas | | ☐ |
| Tags correctos | | ☐ |
| Custom fields poblados | | ☐ |

**Observaciones:**

---

### T+30 — __:__

| Métrica | Valor | OK |
|---------|-------|:--:|
| `wa_errors` (últimos 15 min) | | ☐ |
| Inbound count (15 min) | | ☐ |
| Outbound `accepted` (15 min) | | ☐ |
| GHL sync `ok` (15 min) | | ☐ |
| Contactos nuevos GHL | | ☐ |
| Duplicados | | ☐ |
| Tasks creadas | | ☐ |
| Tags correctos | | ☐ |
| Custom fields poblados | | ☐ |

**Observaciones:**

---

### T+45 — __:__

| Métrica | Valor | OK |
|---------|-------|:--:|
| `wa_errors` (últimos 15 min) | | ☐ |
| Inbound count (15 min) | | ☐ |
| Outbound `accepted` (15 min) | | ☐ |
| GHL sync `ok` (15 min) | | ☐ |
| Contactos nuevos GHL | | ☐ |
| Duplicados | | ☐ |
| Tasks creadas | | ☐ |
| Tags correctos | | ☐ |
| Custom fields poblados | | ☐ |

**Observaciones:**

---

### T+60 — __:__

| Métrica | Valor | OK |
|---------|-------|:--:|
| `wa_errors` (últimos 15 min) | | ☐ |
| Inbound count (15 min) | | ☐ |
| Outbound `accepted` (15 min) | | ☐ |
| GHL sync `ok` (15 min) | | ☐ |
| Contactos nuevos GHL | | ☐ |
| Duplicados | | ☐ |
| Tasks creadas | | ☐ |
| Tags correctos | | ☐ |
| Custom fields poblados | | ☐ |

**Observaciones:**

---

## Mensajes recibidos (resumen)

| Hora | Teléfono | Intent | Academic enriched | Respuesta OK | Incidencia |
|------|----------|--------|:-----------------:|:------------:|------------|
| | | | | ☐ | |
| | | | | ☐ | |
| | | | | ☐ | |

**Total inbound (ventana):**  
**Total outbound accepted:**  
**Total con academic-engine:**  

---

## Leads en GHL

| Hora | Teléfono | ghl_contact_id | Nuevo/actualizado | Tags | Task | CF OK | Notas |
|------|----------|----------------|-------------------|------|:----:|:-----:|-------|
| | | | | | ☐ | ☐ | |
| | | | | | ☐ | ☐ | |

**Total leads tocados:**  
**Duplicados:**  

---

## Errores

```sql
SELECT id, error_type, message, created_at
FROM wa_errors
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

| ID | Tipo | Mensaje | Hora | Resuelto |
|----|------|---------|------|:--------:|
| | | | | ☐ |

**Total errores críticos:**  
**wa_errors = 0:** sí / no

---

## Tareas creadas (GHL)

| Hora | ghl_contact_id | Intent | Task title / ref | OK |
|------|----------------|--------|------------------|:--:|
| | | `beca` | | ☐ |
| | | `humano` | | ☐ |

---

## Observaciones de respuestas

### Calidad académica

- [ ] Listados de carreras alineados al source-of-truth
- [ ] Sin carreras fantasma (contaduría, arquitectura, criminología, diseño, educación…)
- [ ] Sin claims no validados (NASA, Space Apps, “7 países”…)
- [ ] Beca: porcentajes y validación correctos
- [ ] Test vocacional (caso 4): sin override con listado de carreras
- [ ] Humano (caso 5): canalización correcta, sin override académico

### Comentarios cualitativos

_(Respuestas fuera de tono, latencia, quejas de usuarios, etc.)_

---

## Decisión final

| Opción | Marcar |
|--------|:------:|
| **Mantener live** — criterios §8 del checklist cumplidos | ☐ |
| **Rollback inmediato** — trigger §9 del checklist | ☐ |

### Si rollback

| Campo | Valor |
|-------|-------|
| Hora rollback | |
| Flags restaurados | mock / dry_run / CF=false / academic=true / LLM=false |
| Smoke 7C post-rollback | /10 PASS |
| Responsable | |

### Resumen ejecutivo (3–5 líneas)

_(Para Leandro: qué pasó, volumen, incidencias, decisión.)_

---

## Referencias

- Checklist: `docs/phase-7f-go-live-checklist.md`
- Evidencia 7E: `docs/phase-7e-wa-live-ghl-live-academic-report.md`
- Rollback previo: `docs/phase-7e-rollback-safe-mode-verification.md`
- Smoke seguro: `node tests/run-phase7c-insforge-smoke.mjs`
- Runner live (autorizado): `node tests/run-phase7e-wa-live-ghl-live.mjs`
