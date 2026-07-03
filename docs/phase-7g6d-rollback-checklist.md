# 7G.6D — Checklist rollback

**Fase:** 7G.6D — Rollback de sesión live (7G.6E) a modo seguro  
**Tiempo objetivo:** ≤1 minuto  
**Cuándo usar:** Fin de sesión programada · incidente · stop criteria activado

---

## 1. Disparadores de rollback inmediato

Detener sesión y ejecutar este checklist si ocurre **cualquiera**:

- Respuesta duplicada en WhatsApp
- WhatsApp no responde **2 veces seguidas** al mismo tester
- GHL crea contacto duplicado
- Task incorrecta, faltante o excesiva
- Beca con datos incorrectos
- Campo protegido modificado en GHL
- Custom field fuera de whitelist `wa_*`
- Error YCloud o GHL 4xx/5xx
- `wa_errors` crítico nuevo
- `allowlist_matched=false` en número autorizado
- Comportamiento extraño reportado por asesor
- Fin de ventana 45–60 min (rollback programado)

---

## 2. Pasos de rollback (InsForge secrets)

Ejecutar **en este orden**:

| Paso | Secret | Valor rollback | OK |
|:----:|--------|----------------|:--:|
| 1 | `WA_AGENT_MODE` | **`mock`** | ☐ |
| 2 | `GHL_WRITE_CUSTOM_FIELDS` | **`false`** | ☐ |
| 3 | `GHL_SYNC_MODE` | **`dry_run`** | ☐ |
| 4 | `GHL_LIVE_ALLOWED_PHONES` | **solo owner mínimo** (count=1) | ☐ |
| 5 | Confirmar `EVA_LLM_ENABLED` | **`false`** (no cambiar a true) | ☐ |
| 6 | Redeploy function | Solo si secrets no hot-reload | ☐ |

**NO tocar:** YCloud webhook · Meta Ads · EVA Test · calculadora · Supabase.

---

## 3. Verificación post-rollback (runtime)

Probe endpoint o readiness parcial:

| Flag | Esperado | OK | Actual |
|------|----------|:--:|--------|
| `mode` / `WA_AGENT_MODE` | `mock` | ☐ | |
| `ghl_sync_mode` / `GHL_SYNC_MODE` | `dry_run` | ☐ | |
| `custom_fields_written` | `false` | ☐ | |
| `outbound_real` | `false` | ☐ | |
| `ghl_live` | `false` | ☐ | |
| `eva_llm_enabled` | `false` | ☐ | |
| `academic_engine_enabled` | `true` | ☐ | |

```powershell
node tests/run-phase-7g6d-live-readiness.mjs
```

Esperado: **PASS** en probe flags + suites.

---

## 4. Validación suites post-rollback

| Suite | Esperado | OK |
|-------|----------|:--:|
| 7G.6C | 7/7 PASS | ☐ |
| VAL-0 | 7/7 PASS | ☐ |
| ENG-0C | 17/17 PASS | ☐ |
| ENG-0B | 4/4 PASS | ☐ |
| Smoke 7C | 10/10 PASS | ☐ |

---

## 5. wa_errors post-rollback

| Check | OK | Notas |
|-------|:--:|-------|
| Críticos últimos 15 min = 0 | ☐ | |
| Incidente documentado si aplica | ☐ | |

---

## 6. Comunicación

| Acción | OK |
|--------|:--:|
| Asesores notificados: sesión terminada, no enviar más mensajes de prueba | ☐ |
| Leandro informado del resultado rollback | ☐ |
| Monitoreo template actualizado con hora rollback | ☐ |

---

## 7. Estado final esperado

```
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
EVA_LLM_ENABLED=false
ACADEMIC_ENGINE_ENABLED=true
outbound_real=false
ghl_live=false
custom_fields_written=false
```

---

## 8. Decisión post-rollback

| Opción | Descripción |
|--------|-------------|
| **A** | Repetir piloto live (7G.6E) tras corrección |
| **B** | Volver a mock/dry_run y continuar prep |
| **C** | Escalar incidente antes de reintentar |

Documentar en reporte de sesión live (fase posterior a 7G.6E).

---

**Ejecutado por:** _________________ · **Hora rollback:** _________________ · **Duración:** _______ min
