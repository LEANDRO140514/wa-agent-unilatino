# Phase 7F — Go-Live Checklist (Eva WA, producción controlada)

**Estado del documento:** preparación operativa — **no activar producción hasta autorización explícita de Leandro.**  
**Última validación previa:** Fase 7E cerrada + rollback verificado (`docs/phase-7e-rollback-safe-mode-verification.md`).

---

## Referencias rápidas

| Recurso | Valor |
|---------|-------|
| Endpoint InsForge | `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound` |
| Función | `ycloud-wa-inbound` |
| WhatsApp business (oficial) | `+52 999 453 8421` (`+529994538421`) |
| Número controlado pruebas | `+529991525583` |
| GHL location | `uPgYlVj3v4nLWNRc5SQq` |
| Smoke seguro | `node tests/run-phase7c-insforge-smoke.mjs` |
| Runner live 7E (solo post-autorización) | `node tests/run-phase7e-wa-live-ghl-live.mjs` |
| Plantilla monitoreo | `docs/phase-7f-go-live-monitoring-template.md` |

---

## 1. Estado actual seguro

Confirmar **antes** de cualquier paso hacia Go-Live.

### 1.1 Flags en InsForge Dashboard → Function secrets

| Secret | Valor actual esperado | Confirmado |
|--------|----------------------|:----------:|
| `WA_AGENT_MODE` | `mock` | ☐ |
| `GHL_SYNC_MODE` | `dry_run` | ☐ |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` | ☐ |
| `ACADEMIC_ENGINE_ENABLED` | `true` | ☐ |
| `EVA_LLM_ENABLED` | `false` | ☐ |

**Secrets que no deben cambiarse en Go-Live:** `YCLOUD_API_KEY`, `GHL_API_KEY`, `GHL_LOCATION_ID`, `GHL_WA_FIELD_MAP`, `YCLOUD_WEBHOOK_SECRET`, `YCLOUD_BUSINESS_NUMBER`.  
**No crear:** `OPENAI_API_KEY`.

### 1.2 Endpoint activo

- [ ] `GET`/`POST` al endpoint responde sin error de función.
- [ ] Preflight POST de control devuelve `mode=mock`, `outbound_real=false`, `ghl_live=false`, `ghl_dry_run=true`.

Ejemplo preflight (PowerShell):

```powershell
$body = '{"event_type":"whatsapp.inbound_message.received","from":"+525551009902","to":"+529994538421","message_id":"7f-preflight","message_type":"text","message_text":"7f-safe-check","timestamp":"' + (Get-Date).ToUniversalTime().ToString("o") + '"}'
Invoke-RestMethod -Uri "https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound" -Method POST -ContentType "application/json" -Body $body
```

### 1.3 Smoke 7C

```bash
node tests/run-phase7c-insforge-smoke.mjs
```

- [ ] Resultado: **10/10 PASS**
- [ ] El runner no aborta por preflight (confirma que runtime sigue en mock/dry_run).

### 1.4 Salud de errores

```sql
SELECT count(*)::int AS errors_10m
FROM wa_errors
WHERE created_at > NOW() - INTERVAL '10 minutes';
```

- [ ] `wa_errors` = **0**

### 1.5 Evidencia de fases previas

| Fase | Resultado | Referencia |
|------|-----------|------------|
| 7E WA + GHL live + CF | 5/5 PASS | `docs/phase-7e-wa-live-ghl-live-academic-report.md` |
| Rollback modo seguro | Verificado | `docs/phase-7e-rollback-safe-mode-verification.md` |
| Smoke post-rollback | 10/10 PASS | §1.3 arriba |

---

## 2. Switch de producción controlada

Flags para activar cuando Leandro autorice Go-Live:

| Secret | Valor Go-Live |
|--------|---------------|
| `WA_AGENT_MODE` | `live_outbound` |
| `GHL_SYNC_MODE` | `live` |
| `GHL_WRITE_CUSTOM_FIELDS` | `true` |
| `ACADEMIC_ENGINE_ENABLED` | `true` |
| `EVA_LLM_ENABLED` | `false` |

**Cambio únicamente vía InsForge Dashboard** (los secrets están cifrados; MCP no puede escribirlos).

---

## 3. Condiciones previas antes de activar

Marcar todas antes de cambiar flags a Go-Live.

### Operación y negocio

- [ ] Meta Ads: campaña lista **o** ventana de prueba interna definida (sin tráfico masivo inesperado).
- [ ] Asesor humano disponible para revisar contactos, tasks y respuestas en GHL.
- [ ] Ventana de activación acordada (fecha/hora + responsable).

### Accesos

- [ ] Acceso a **GHL** (location `uPgYlVj3v4nLWNRc5SQq`) confirmado.
- [ ] Acceso a **InsForge Dashboard** (Function secrets) confirmado.
- [ ] Acceso a teléfono **controlado** `+529991525583` para prueba post-activación.

### Capacidad de respuesta

- [ ] **Rollback inmediato** documentado y practicable (ver §10).
- [ ] Número oficial WhatsApp confirmado: **+52 999 453 8421** (`+529994538421`).

### Restricciones explícitas (no negociables en 7F)

- [ ] **No activar LLM** (`EVA_LLM_ENABLED=false`; sin `OPENAI_API_KEY`).
- [ ] **No cambiar** source-of-truth académico (`scripts/build-source-of-truth.js` / CSVs) el día del Go-Live.
- [ ] **No cambiar** GHL pipeline ni opportunities.
- [ ] **No tocar** EVA Test (calculadora / flujo vocacional existente).
- [ ] **No ejecutar** tests masivos ni números no autorizados.

---

## 4. Smoke pre-Go-Live

Ejecutar **inmediatamente antes** de cambiar secrets a live. Si falla, **no activar**.

```bash
node tests/run-phase7c-insforge-smoke.mjs
```

| Criterio | Esperado |
|----------|----------|
| Casos smoke | **10/10 PASS** |
| Preflight | `mode=mock`, sin `live_outbound` |
| `wa_errors` (10 min) | **0** |

```sql
SELECT count(*)::int FROM wa_errors WHERE created_at > NOW() - INTERVAL '10 minutes';
```

---

## 5. Activación Go-Live

**Solo con autorización explícita de Leandro.**

### 5.1 Cambiar en InsForge Dashboard → Function secrets

```
WA_AGENT_MODE=live_outbound
GHL_SYNC_MODE=live
GHL_WRITE_CUSTOM_FIELDS=true
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=false
```

### 5.2 Confirmación inmediata (sin esperar tráfico real)

Un POST de verificación desde número no productivo o el preflight del runner 7E:

- [ ] `mode=live_outbound`
- [ ] `outbound_real=true`
- [ ] `ghl_live=true`
- [ ] `ghl_dry_run=false`
- [ ] `custom_fields_written=true` (cuando hay sync)
- [ ] `academic_engine_enabled=true`
- [ ] `eva_llm_enabled=false`

### 5.3 Registrar activación

Completar `docs/phase-7f-go-live-monitoring-template.md` con hora exacta y responsable.

---

## 6. Prueba post-activación

Enviar **desde el número controlado** `+529991525583` al business `+529994538421` (WhatsApp real o runner 7E autorizado).

### 6.1 Mensajes de prueba (5 casos — mismos que 7E)

| # | Mensaje | Intent esperado | Tag GHL esperado | Task |
|---|---------|-----------------|------------------|:----:|
| 1 | `1` | `carreras_disponibles` | `wa_interes_carreras` | no |
| 2 | `Derecho online` | `carrera_interes` | `wa_interes_carrera` | no |
| 3 | `Tengo promedio 9.8, qué beca me toca` | `beca` | `wa_interes_beca` | **sí** |
| 4 | `No sé qué estudiar` | `no_se_que_estudiar` | `wa_interes_test` | no |
| 5 | `Quiero hablar con asesor` | `humano` | `wa_requiere_asesor` | **sí** |

Runner automatizado (solo si flags ya están en live y Leandro autoriza):

```bash
node tests/run-phase7e-wa-live-ghl-live.mjs
```

### 6.2 Validaciones por mensaje

- [ ] `outbound_status=accepted`
- [ ] `provider_response_id` presente (top-level o en `raw_response`)
- [ ] `ghl_live=true`
- [ ] `ghl_synced=true`
- [ ] `custom_fields_written=true`
- [ ] `wa_errors=0` (global, no solo por mensaje)
- [ ] **Un solo** `ghl_contact_id` para `+529991525583` (sin duplicados)
- [ ] Tags correctos según tabla §6.1
- [ ] Tasks creadas solo en casos 3 y 5 (`would_create_task=true` en `wa_ghl_sync_log`)
- [ ] Caso 4: respuesta de **test vocacional** — sin override académico (sin listado de carreras oficiales)
- [ ] Caso 5: canalización a **asesor humano** — sin override académico
- [ ] Sin **carreras fantasma**: contaduría, arquitectura, criminología, diseño, educación, etc.
- [ ] Sin **claims no validados**: NASA, Space Apps, “7 países”, etc.

### 6.3 Custom fields WA en GHL

Verificar escritura de:

`wa_last_intent`, `wa_last_message_at`, `wa_stage`, `wa_needs_human`, `wa_summary`, `wa_source`, `wa_last_inbound_text`, `wa_last_outbound_text`

### 6.4 SQL útil post-prueba

```sql
-- Errores recientes
SELECT count(*)::int FROM wa_errors WHERE created_at > NOW() - INTERVAL '30 minutes';

-- Contacto único
SELECT phone_e164, ghl_contact_id, count(*) OVER (PARTITION BY phone_e164) AS dup
FROM wa_contacts_state
WHERE phone_e164 = '+529991525583';

-- Últimos sync GHL
SELECT id, intent, sync_mode, status, custom_fields_written, would_create_task, created_at
FROM wa_ghl_sync_log
ORDER BY created_at DESC LIMIT 10;

-- Outbound con provider id
SELECT id, status, provider_response_id, sent_at
FROM wa_outbound_messages
ORDER BY sent_at DESC LIMIT 10;
```

---

## 7. Monitoreo primera hora

Revisar **cada 15 minutos** durante la primera hora post-activación (T+0, T+15, T+30, T+45, T+60).

Usar plantilla: `docs/phase-7f-go-live-monitoring-template.md`.

### 7.1 InsForge / DB

| Tabla / métrica | Qué revisar |
|-----------------|-------------|
| `wa_errors` | Cualquier fila nueva = alerta |
| `wa_inbound_messages` | Volumen, intents, teléfonos esperados |
| `wa_outbound_messages` | `status=accepted`, `provider_response_id` |
| `wa_ghl_sync_log` | `sync_mode=live`, `status=ok`, CF escritos |
| `wa_contacts_state` | Un contacto por teléfono; `ghl_contact_id` estable |

### 7.2 GHL (UI)

- Contactos creados/actualizados desde WA
- Duplicados por teléfono
- Tasks nuevas (beca, humano)
- Tags (`eva-wa`, `wa_interes_*`, `wa_requiere_asesor`)
- Custom fields WA poblados

### 7.3 WhatsApp (YCloud / teléfono business)

- Mensajes salientes llegan al usuario
- Sin cola atascada ni errores de entrega

---

## 8. Criterios para mantener producción activa

Mantener flags en Go-Live (§2) si **todas** se cumplen de forma sostenida:

- [ ] `wa_errors = 0` (o solo warnings no críticos documentados)
- [ ] `outbound_status = accepted` de forma consistente
- [ ] GHL sync correcto (`ghl_synced`, custom fields, tags)
- [ ] Sin duplicados de contacto por teléfono
- [ ] Respuestas académicas alineadas al source-of-truth
- [ ] Flujos especiales OK: humano, test vocacional, beca con task
- [ ] Asesor humano al día con leads entrantes
- [ ] Tráfico Meta / inbound dentro de lo planificado

---

## 9. Criterios para rollback inmediato

Ejecutar rollback (§10) **sin esperar** si ocurre cualquiera de:

| Trigger | Acción |
|---------|--------|
| `wa_errors > 0` críticos | Rollback + investigar |
| Mensajes no salen por WhatsApp | Rollback |
| GHL crea duplicados | Rollback |
| Custom fields fallan en bloque | Rollback |
| Eva responde carreras fantasma | Rollback |
| `EVA_LLM_ENABLED` activo por error | Rollback + quitar `OPENAI_API_KEY` si existe |
| GHL live escribe datos incorrectos | Rollback |
| Meta genera tráfico inesperado sin asesor | Rollback o pausar campaña + evaluar |

---

## 10. Rollback

### 10.1 Regresar flags en InsForge Dashboard

```
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=false
```

### 10.2 Verificación post-rollback

```bash
node tests/run-phase7c-insforge-smoke.mjs
```

- [ ] **10/10 PASS**
- [ ] Preflight confirma `mock` / `dry_run`
- [ ] `wa_errors` = 0

Documentar en `docs/phase-7e-rollback-safe-mode-verification.md` o nueva nota con fecha/hora.

---

## 11. Estado LLM

| Item | Política 7F |
|------|-------------|
| `EVA_LLM_ENABLED` | **`false`** — obligatorio |
| `OPENAI_API_KEY` | **No crear / no usar** |
| Comportamiento actual | Stub pass-through (`insforge/functions/lib/eva-llm/`) |
| Fase futura | LLM real en fase separada, con autorización y pruebas propias |

---

## 12. Reporte final de Go-Live

Al cerrar la ventana de monitoreo (primera hora o fin de día):

1. Completar `docs/phase-7f-go-live-monitoring-template.md`
2. Decisión documentada: **mantener live** o **rollback**
3. Si rollback: adjuntar evidencia smoke 7C post-rollback
4. Compartir resumen con Leandro antes de dejar producción activa overnight

---

## Checklist resumen (una página)

```
PRE-GO-LIVE
  ☐ Flags seguros (mock/dry_run) confirmados
  ☐ Smoke 7C → 10/10 PASS
  ☐ wa_errors = 0
  ☐ Condiciones §3 completas
  ☐ Autorización Leandro

ACTIVACIÓN
  ☐ Secrets → live_outbound / live / CF=true / academic=true / LLM=false
  ☐ Post-activación 5 mensajes §6 → PASS
  ☐ Monitoreo T+0..T+60 cada 15 min

CIERRE
  ☐ Plantilla monitoreo completada
  ☐ Decisión: mantener live | rollback
  ☐ Si rollback → flags seguros + smoke 7C 10/10
```

**Este documento no activa producción.** Es la guía operativa para cuando Leandro autorice el switch.
