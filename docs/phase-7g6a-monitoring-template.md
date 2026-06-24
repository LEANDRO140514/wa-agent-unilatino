# Phase 7G.6A — Plantilla de monitoreo operativo Eva WA

**Uso:** completar durante 7G.6B o cualquier piloto live controlado.  
**No activa producción.** Copiar por sesión de prueba.

---

## 1. Fecha / hora de prueba

| Campo | Valor |
|-------|-------|
| Fase | ☐ 7G.6B interno ☐ Otro: ________ |
| Fecha | __________ |
| Hora inicio | __________ |
| Hora fin | __________ |
| Responsable técnico | __________ |
| Responsable GHL | __________ |
| Responsable YCloud | __________ |

---

## 2. Configuración activa (durante piloto)

| Flag | Valor |
|------|-------|
| `WA_AGENT_MODE` | __________ |
| `GHL_SYNC_MODE` | __________ |
| `GHL_WRITE_CUSTOM_FIELDS` | __________ |
| `GHL_LIVE_ALLOWED_PHONES` count | __________ |
| `ACADEMIC_ENGINE_ENABLED` | __________ |
| `EVA_LLM_ENABLED` / `LLM_MODE` | __________ |

**Endpoint:** `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`

---

## 3. Teléfonos autorizados

| Nombre | E.164 | Contacto GHL (si conocido) |
|--------|-------|----------------------------|
| | | |
| | | |
| | | |

---

## 4. Casos enviados

| Hora (UTC) | Teléfono | Mensaje | Intent | WA recibido (visual) | YCloud status | GHL status | CF written | Task | Error | Observaciones |
|------------|----------|---------|--------|:--------------------:|---------------|--------------|:----------:|:----:|:-----:|---------------|
| | | | | ☐ | | | ☐ | ☐ | | |
| | | | | ☐ | | | ☐ | ☐ | | |
| | | | | ☐ | | | ☐ | ☐ | | |
| | | | | ☐ | | | ☐ | ☐ | | |
| | | | | ☐ | | | ☐ | ☐ | | |
| | | | | ☐ | | | ☐ | ☐ | | |
| | | | | ☐ | | | ☐ | ☐ | | |
| | | | | ☐ | | | ☐ | ☐ | | |
| | | | | ☐ | | | ☐ | ☐ | | |
| | | | | ☐ | | | ☐ | ☐ | | |
| | | | | ☐ | | | ☐ | ☐ | | |
| | | | | ☐ | | | ☐ | ☐ | | |

**Referencias útiles por fila:**

- Inbound ID: __________
- Outbound `provider_response_id`: __________
- `wa_ghl_sync_log` id: __________
- `wa_stage` escrito: __________

---

## 5. Métricas rápidas (fin de sesión)

| Métrica | Valor |
|---------|------:|
| Total inbounds | |
| Outbounds accepted | |
| Outbounds mocked / failed | |
| GHL sync ok | |
| GHL blocked / failed | |
| CF escritos (count=8) | |
| Tasks creadas | |
| Intents: carreras | |
| Intents: carrera_interes | |
| Intents: beca | |
| Intents: humano | |
| Intents: no_se_que_estudiar | |
| Intents: otros | |
| `wa_errors` críticos | |
| Tiempo respuesta promedio (est.) | |

---

## 6. Incidentes

| # | Hora | Severidad | Descripción | Acción tomada | Resuelto |
|---|------|-----------|-------------|---------------|:--------:|
| 1 | | ☐ baja ☐ media ☐ alta | | | ☐ |
| 2 | | | | | ☐ |

---

## 7. Acciones correctivas

| Acción | Responsable | Hora | Resultado |
|--------|-------------|------|-----------|
| | | | |
| | | | |

---

## 8. Rollback ejecutado

| Check | Sí / No |
|-------|:-------:|
| `WA_AGENT_MODE=mock` | ☐ |
| `GHL_WRITE_CUSTOM_FIELDS=false` | ☐ |
| `GHL_SYNC_MODE=dry_run` | ☐ |
| Smoke 7G.3A PASS | ☐ |
| Preflight 7G.5B PASS | ☐ |

**Hora rollback:** __________

---

## 9. Decisión final

☐ **PASS** — Avanzar a siguiente fase (especificar): __________  
☐ **REPETIR** — Corregir y re-ejecutar piloto  
☐ **DETENER** — Mantener modo seguro; revisar incidentes  

**Firma / responsable:** __________  
**Fecha:** __________

---

## Anexo — Comandos rápidos

```bash
# Smoke post-sesión
node tests/run-phase7g3a-classifier-hotfix.mjs
node tests/run-phase7g5b-custom-fields-preflight.mjs
```

```sql
-- Errores recientes
SELECT error_type, error_message, created_at
FROM wa_errors
WHERE created_at > NOW() - INTERVAL '30 minutes'
  AND error_type NOT IN ('phone_normalization', 'phone_normalization_failed')
ORDER BY created_at DESC;

-- Sync GHL reciente
SELECT intent, status, payload->>'custom_fields_written' AS cf, created_at
FROM wa_ghl_sync_log
WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;
```
